/**
 * mAGIc Query Command  
 * Searches knowledge base and provides AI-powered answers
 */

import { Ollama } from 'ollama';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as glob from 'glob';

interface QueryOptions {
  privacy: string;
  limit: string;
}

interface MemoryFile {
  path: string;
  content: string;
  metadata: any;
  relevanceScore?: number;
}

export async function queryCommand(question: string, options: QueryOptions) {
  console.log(`🤖 mAGIc Query: "${question}"`);
  
  try {
    const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
    
    // Step 1: Find relevant memory files
    console.log('🔍 Searching your knowledge base...');
    const memories = await searchMemories(question, options.privacy, options);
    
    if (memories.length === 0) {
      console.log('📭 No relevant memories found.');
      return;
    }
    
    console.log(`📚 Found ${memories.length} relevant memories`);
    
    // Step 2: Use local LLM to synthesize answer from memories
    const contextPrompt = `
You are an AI assistant helping a user understand their personal knowledge base. 
Answer their question using ONLY the provided context from their memories.

Question: "${question}"

Context from user's memories:
${memories.map((memory, index) => `
[${index + 1}] File: ${path.basename(memory.path)}
Category: ${memory.metadata.category || 'unknown'}
Tags: ${memory.metadata.tags ? memory.metadata.tags.join(', ') : 'none'}
Content:
${memory.content?.slice(0, 1000) || 'No content'}${(memory.content?.length || 0) > 1000 ? '...' : ''}
`).join('\n')}

Please provide a helpful answer based on this context. If you reference specific information, mention which memory file it comes from (e.g., "According to your notes in [1]...").

If the memories don't contain enough information to fully answer the question, say so and suggest what additional information might be helpful.
`;

    console.log('🧠 Generating answer with local AI...');
    const response = await ollama.chat({
      model: 'llama3.1:8b',
      messages: [{ role: 'user', content: contextPrompt }],
      stream: false,
    });

    // Step 3: Display the answer
    console.log('\n💡 Answer:');
    console.log('─'.repeat(50));
    console.log(response.message.content);
    console.log('─'.repeat(50));
    
    // Step 4: Show source files
    console.log('\n📖 Sources:');
    memories.forEach((memory, index) => {
      console.log(`[${index + 1}] ${path.basename(memory.path)} (${memory.metadata.privacy || 'unknown'} privacy)`);
    });
    
  } catch (error) {
    console.error('❌ Error processing query:', error);
    process.exit(1);
  }
}

async function searchMemories(query: string, maxPrivacy: string, options: QueryOptions): Promise<MemoryFile[]> {
  const memoriesDir = path.join(process.cwd(), 'memories');
  const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
  const maxLevel = privacyLevels.indexOf(maxPrivacy);
  
  const searchDirs = privacyLevels.slice(0, maxLevel + 1);
  const memories: MemoryFile[] = [];
  
  // Simple text-based search for now (will be replaced with vector search later)
  for (const privacyLevel of searchDirs) {
    const dir = path.join(memoriesDir, privacyLevel);
    
    try {
      const pattern = path.join(dir, '*.md');
      const files = glob.sync(pattern);
      
      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          
          // Extract frontmatter metadata
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          let metadata = {};
          
          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            // Simple YAML parsing for basic metadata
            metadata = {
              privacy: privacyLevel,
              ...parseFrontmatter(frontmatter)
            };
          }
          
          // Simple relevance scoring based on keyword matching
          const lowerContent = content.toLowerCase();
          const lowerQuery = query.toLowerCase();
          const queryWords = lowerQuery.split(/\s+/);
          
          let relevanceScore = 0;
          queryWords.forEach(word => {
            if (word.length > 2) { // Skip very short words
              const matches = (lowerContent.match(new RegExp(word, 'g')) || []).length;
              relevanceScore += matches;
            }
          });
          
          if (relevanceScore > 0) {
            memories.push({
              path: filePath,
              content,
              metadata,
              relevanceScore
            });
          }
        } catch (fileError) {
          // Skip files that can't be read
          console.warn(`⚠️  Skipped unreadable file: ${filePath}`);
        }
      }
    } catch (dirError) {
      // Skip directories that don't exist
    }
  }
  
  // Sort by relevance score and limit results
  return memories
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, parseInt(options.limit) || 5);
}

function parseFrontmatter(frontmatter: string): any {
  const metadata: any = {};
  const lines = frontmatter.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      // Handle different value types
      if (value.startsWith('[') && value.endsWith(']')) {
        // Parse array
        metadata[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
      } else if (value.startsWith('"') && value.endsWith('"')) {
        // Parse string
        metadata[key] = value.slice(1, -1);
      } else {
        // Plain value
        metadata[key] = value;
      }
    }
  }
  
  return metadata;
}