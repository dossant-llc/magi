/**
 * AI Service - Integrates mAGIc local AI functionality with MCP
 */

import { Ollama } from 'ollama';
import { saveCommand } from '../magic/commands/save';
import { queryCommand } from '../magic/commands/query';
import { statusCommand } from '../magic/commands/status';
import { LoggerService } from './logger-service';
import { EmbeddingService } from './embedding-service';

export class AIService {
  private ollama: Ollama;
  private loggerService: LoggerService;
  private embeddingService: EmbeddingService;

  constructor(loggerService: LoggerService) {
    // Use Docker environment variables or fallback to localhost
    const ollamaHost = process.env.OLLAMA_HOST || '127.0.0.1';
    const ollamaPort = process.env.OLLAMA_PORT || '11434';
    const ollamaUrl = `http://${ollamaHost}:${ollamaPort}`;
    
    this.ollama = new Ollama({ host: ollamaUrl });
    this.loggerService = loggerService;
    this.embeddingService = new EmbeddingService(loggerService);
    
    // Log the Ollama connection info for debugging
    this.loggerService.log(`AI Service connecting to Ollama at: ${ollamaUrl}`);
  }

  /**
   * Save content with AI-powered categorization
   */
  async saveMemoryWithAI(content: string, privacyLevel: string = 'personal', categoryHint?: string): Promise<{
    success: boolean;
    filePath?: string;
    aiAnalysis?: any;
    error?: string;
  }> {
    try {
      this.loggerService.log(`AI Save request: content length=${content.length}, privacy=${privacyLevel}`);
      this.loggerService.trace('Starting AI save memory operation', { contentPreview: content.slice(0, 100) });
      
      // Performance tracking
      this.loggerService.startTimer('ai_categorization');
      
      // Use AI to categorize and enhance the content
      const categorizationPrompt = `
You are helping organize personal knowledge. Analyze this content and provide:

1. A descriptive title (max 60 chars)
2. The best category (technical, business, personal, health, travel, etc.)  
3. 2-3 relevant tags
4. A brief summary (1-2 sentences)

Content: "${content}"
Category hint: ${categoryHint || 'none'}

Respond in this exact JSON format:
{
  "title": "Generated title here",
  "category": "suggested category", 
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "Brief summary here"
}`;

      const response = await this.ollama.chat({
        model: 'llama3.1:8b',
        messages: [{ role: 'user', content: categorizationPrompt }],
        stream: false,
      });
      
      // Log performance
      this.loggerService.endTimer('ai_categorization', {
        model: 'llama3.1:8b',
        promptLength: categorizationPrompt.length,
        responseLength: response.message.content.length
      });

      let aiAnalysis;
      try {
        const jsonMatch = response.message.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (e) {
        this.loggerService.log('AI categorization failed, using defaults');
        aiAnalysis = {
          title: content.slice(0, 50) + '...',
          category: categoryHint || 'general',
          tags: ['uncategorized'],
          summary: content.slice(0, 100) + '...'
        };
      }

      // Create markdown content with metadata  
      const timestamp = new Date().toISOString();
      const filename = `${aiAnalysis.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.md`;
      
      const markdownContent = `---
title: "${aiAnalysis.title}"
category: "${aiAnalysis.category}"
privacy: "${privacyLevel}"
tags: [${aiAnalysis.tags.map((tag: string) => `"${tag}"`).join(', ')}]
created: "${timestamp}"
source: "mcp-ai"
---

# ${aiAnalysis.title}

## Summary
${aiAnalysis.summary}

## Content
${content}

---
*Saved via MCP AI integration on ${new Date().toLocaleDateString()}*
`;

      // Save to memory service
      const fs = require('fs/promises');
      const path = require('path');
      
      const memoriesDir = path.join(process.cwd(), '..', 'memories', privacyLevel);
      await fs.mkdir(memoriesDir, { recursive: true });
      
      const filePath = path.join(memoriesDir, filename);
      await fs.writeFile(filePath, markdownContent, 'utf8');

      this.loggerService.log(`AI Save successful: ${filePath}`);
      
      return {
        success: true,
        filePath: `memories/${privacyLevel}/${filename}`,
        aiAnalysis
      };

    } catch (error) {
      this.loggerService.log(`AI Save error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search memories only (fast mode - no AI synthesis)
   */
  async searchMemoriesOnly(question: string, maxPrivacy: string = 'personal', limit: number = 5): Promise<{
    success: boolean;
    memories: Array<{
      filename: string;
      content: string;
      category?: string;
      tags?: string;
      relevanceScore: number;
    }>;
    error?: string;
  }> {
    try {
      this.loggerService.log(`Fast Memory Search: "${question}", privacy=${maxPrivacy}, limit=${limit}`);
      this.loggerService.trace('Starting fast memory search (no AI synthesis)', { question, maxPrivacy, limit });
      
      // Performance tracking for search only
      this.loggerService.startTimer('memory_search_fast');
      
      const memories = await this.searchMemories(question, maxPrivacy, limit);
      
      this.loggerService.endTimer('memory_search_fast', {
        foundCount: memories.length,
        searchQuery: question,
        mode: 'fast'
      });

      this.loggerService.log(`Fast search successful: found ${memories.length} memories`);
      
      return {
        success: true,
        memories: memories.map(m => ({
          filename: m.filename,
          content: m.content,
          category: m.category,
          tags: m.tags,
          relevanceScore: m.relevanceScore
        }))
      };

    } catch (error) {
      this.loggerService.log(`Fast search error: ${error}`, 'error');
      return {
        success: false,
        memories: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Query memories with AI-powered synthesis
   */
  async queryMemoriesWithAI(question: string, maxPrivacy: string = 'personal', limit: number = 5): Promise<{
    success: boolean;
    answer?: string;
    sources?: string[];
    memoryCount?: number;
    error?: string;
  }> {
    try {
      this.loggerService.log(`AI Query request: "${question}", privacy=${maxPrivacy}, limit=${limit}`);
      this.loggerService.trace('Starting AI query operation', { question, maxPrivacy, limit });
      
      // Performance tracking for search
      this.loggerService.startTimer('memory_search');
      
      // Search for relevant memories (simplified version)
      const memories = await this.searchMemories(question, maxPrivacy, limit);
      
      this.loggerService.endTimer('memory_search', {
        foundCount: memories.length,
        searchQuery: question
      });
      
      if (memories.length === 0) {
        return {
          success: true,
          answer: "I couldn't find any relevant memories in your knowledge base for that question.",
          sources: [],
          memoryCount: 0
        };
      }

      // Performance tracking for AI synthesis
      this.loggerService.startTimer('ai_synthesis');
      this.loggerService.trace('Preparing context for AI synthesis', {
        memoryCount: memories.length,
        totalContextLength: memories.reduce((sum, m) => sum + m.content.length, 0)
      });
      
      // Use AI to synthesize answer
      const contextPrompt = `
You are an AI assistant helping a user understand their personal knowledge base. 
Answer their question using ONLY the provided context from their memories.

Question: "${question}"

Context from user's memories:
${memories.map((memory, index) => `
[${index + 1}] ${memory.filename}
Category: ${memory.category || 'unknown'}
Tags: ${memory.tags || 'none'}
Content: ${memory.content.slice(0, 800)}${memory.content.length > 800 ? '...' : ''}
`).join('\n')}

Please provide a helpful answer based on this context. If you reference specific information, mention which memory it comes from (e.g., "According to your notes in [1]...").

If the memories don't contain enough information to fully answer the question, say so and suggest what additional information might be helpful.
`;

      const response = await this.ollama.chat({
        model: 'llama3.1:8b',
        messages: [{ role: 'user', content: contextPrompt }],
        stream: false,
      });
      
      // Log performance for synthesis
      this.loggerService.endTimer('ai_synthesis', {
        model: 'llama3.1:8b',
        promptLength: contextPrompt.length,
        responseLength: response.message.content.length,
        memoryCount: memories.length
      });

      this.loggerService.log(`AI Query successful: found ${memories.length} memories`);
      
      return {
        success: true,
        answer: response.message.content,
        sources: memories.map(m => m.filename),
        memoryCount: memories.length
      };

    } catch (error) {
      this.loggerService.log(`AI Query error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get AI system status
   */
  async getAIStatus(): Promise<{
    ollama: {
      connected: boolean;
      models: any[];
    };
    memories: {
      [key: string]: number;
      total: number;
    };
    index: {
      exists: boolean;
      files: string[];
    };
  }> {
    const status = {
      ollama: { connected: false, models: [] as any[] },
      memories: { total: 0 } as { [key: string]: number; total: number },
      index: { exists: false, files: [] as string[] }
    };

    try {
      // Check Ollama
      const models = await this.ollama.list();
      status.ollama.connected = true;
      status.ollama.models = models.models.map(m => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at
      }));
    } catch (error) {
      this.loggerService.log(`Ollama check failed: ${error}`);
    }

    try {
      // Check memories
      const fs = require('fs/promises');
      const path = require('path');
      const memoriesDir = path.join(process.cwd(), '..', 'memories');
      const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
      
      for (const level of privacyLevels) {
        try {
          const dir = path.join(memoriesDir, level);
          const files = await fs.readdir(dir);
          const count = files.filter((f: string) => f.endsWith('.md')).length;
          (status.memories as any)[level] = count;
          status.memories.total += count;
        } catch (e) {
          (status.memories as any)[level] = 0;
        }
      }
    } catch (error) {
      this.loggerService.log(`Memory check failed: ${error}`);
    }

    try {
      // Check index
      const fs = require('fs/promises');
      const path = require('path');
      const indexDir = path.join(process.cwd(), '.index');
      const indexFiles = await fs.readdir(indexDir);
      status.index.exists = true;
      status.index.files = indexFiles;
    } catch (error) {
      this.loggerService.log(`Index check failed: ${error}`);
    }

    return status;
  }

  /**
   * Enhanced memory search with vector similarity when embeddings are available
   */
  private async searchMemories(query: string, maxPrivacy: string, limit: number): Promise<Array<{
    filename: string;
    content: string;
    category?: string;
    tags?: string;
    relevanceScore: number;
  }>> {
    this.loggerService.trace('Starting memory search', { query, maxPrivacy, limit });
    
    try {
      // Try vector search first (if embeddings are available)
      const vectorResults = await this.embeddingService.searchSimilar(query, limit, 0.2);
      
      if (vectorResults && vectorResults.length > 0) {
        this.loggerService.trace('Using vector similarity search', { foundResults: vectorResults.length });
        
        // Filter by privacy level
        const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
        const maxLevel = privacyLevels.indexOf(maxPrivacy);
        const allowedLevels = privacyLevels.slice(0, maxLevel + 1);
        
        return vectorResults
          .filter(result => {
            const pathParts = result.memory.filePath.split('/');
            const privacyLevel = pathParts[1]; // memories/personal/file.md -> personal
            return allowedLevels.includes(privacyLevel);
          })
          .map(result => ({
            filename: result.memory.filePath.split('/').pop() || 'unknown',
            content: result.memory.content,
            category: result.memory.metadata.category,
            tags: Array.isArray(result.memory.metadata.tags) 
              ? result.memory.metadata.tags.join(', ') 
              : result.memory.metadata.tags || 'none',
            relevanceScore: Math.round(result.similarity * 100) // Convert to 0-100 scale
          }))
          .slice(0, limit);
      }
    } catch (error) {
      this.loggerService.error('Vector search failed - NO FALLBACK', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        searchQuery: query,
        searchLimit: limit,
        privacy: maxPrivacy,
        reason: 'Ollama/embedding service unavailable'
      });
      throw new Error(`Search unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // DISABLED: Fallback to keyword search
    throw new Error('This code should not be reached - vector search should have succeeded or thrown');
    
    const fs = require('fs/promises');
    const path = require('path');
    const glob = require('glob');
    
    const memoriesDir = path.join(process.cwd(), 'memories');
    const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
    const maxLevel = privacyLevels.indexOf(maxPrivacy);
    
    const searchDirs = privacyLevels.slice(0, maxLevel + 1);
    const memories: any[] = [];
    
    for (const privacyLevel of searchDirs) {
      try {
        const dir = path.join(memoriesDir, privacyLevel);
        const pattern = path.join(dir, '*.md');
        const files = glob.sync(pattern);
        
        for (const filePath of files) {
          try {
            const content = await fs.readFile(filePath, 'utf8');
            
            // Simple relevance scoring
            const lowerContent = content.toLowerCase();
            const lowerQuery = query.toLowerCase();
            const queryWords = lowerQuery.split(/\s+/);
            
            let relevanceScore = 0;
            queryWords.forEach(word => {
              if (word.length > 2) {
                const matches = (lowerContent.match(new RegExp(word, 'g')) || []).length;
                relevanceScore += matches;
              }
            });
            
            if (relevanceScore > 0) {
              // Extract metadata
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              let category = 'unknown';
              let tags = 'none';
              
              if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[1];
                const categoryMatch = frontmatter.match(/category:\s*"([^"]+)"/);
                const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]+)\]/);
                
                if (categoryMatch) category = categoryMatch[1];
                if (tagsMatch) tags = tagsMatch[1];
              }
              
              memories.push({
                filename: path.basename(filePath),
                content,
                category,
                tags,
                relevanceScore
              });
            }
          } catch (fileError) {
            // Skip unreadable files
          }
        }
      } catch (dirError) {
        // Skip missing directories
      }
    }
    
    return memories
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }
}