/**
 * AI Service - Integrates mAGIc local AI functionality with MCP
 */

import { saveCommand } from '../magic/commands/save';
import { queryCommand } from '../magic/commands/query';
import { statusCommand } from '../magic/commands/status';
import { LoggerService } from './logger-service';
import { EmbeddingService } from './embedding-service';
import { IChatProvider } from '../providers/ai-interfaces';
import { aiProviderFactory } from '../providers/ai-provider-factory';
import { aiConfig } from '../config/ai-config';

export class AIService {
  private chatProvider: IChatProvider;
  private loggerService: LoggerService;
  private embeddingService: EmbeddingService;

  constructor(loggerService: LoggerService) {
    this.chatProvider = aiProviderFactory.createChatProvider();
    this.loggerService = loggerService;
    this.embeddingService = new EmbeddingService(loggerService);
    
    const providerInfo = aiProviderFactory.getProviderInfo();
    this.loggerService.log(`AI Service initialized with ${providerInfo.provider} provider (Chat: ${providerInfo.chatModel}, Embedding: ${providerInfo.embeddingModel})`);
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
      // Defensive input validation
      if (!content || typeof content !== 'string') {
        this.loggerService.error('Invalid content provided to saveMemoryWithAI', { contentType: typeof content, contentLength: content?.length });
        return {
          success: false,
          error: 'Invalid content: must be a non-empty string'
        };
      }

      const safeContent = String(content).trim();
      if (safeContent.length === 0) {
        return {
          success: false, 
          error: 'Content cannot be empty'
        };
      }

      this.loggerService.log(`AI Save request: content length=${safeContent.length}, privacy=${privacyLevel}`);
      
      // Safe content preview with multiple fallbacks
      let contentPreview = '';
      try {
        contentPreview = safeContent.slice(0, 100);
      } catch (sliceError) {
        this.loggerService.error('Error creating content preview', { error: sliceError });
        contentPreview = 'Content preview unavailable';
      }
      
      this.loggerService.trace('Starting AI save memory operation', { contentPreview });
      
      // Performance tracking
      this.loggerService.startTimer('ai_categorization');
      
      // Use AI to categorize and enhance the content
      const categorizationPrompt = `
You are helping organize personal knowledge. Analyze this content and provide:

1. A descriptive title (max 60 chars)
2. The best category (technical, business, personal, health, travel, etc.)  
3. 2-3 relevant tags
4. A brief summary (1-2 sentences)

Content: "${safeContent}"
Category hint: ${categoryHint || 'none'}

Respond in this exact JSON format:
{
  "title": "Generated title here",
  "category": "suggested category", 
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "Brief summary here"
}`;

      const response = await this.chatProvider.chat({
        model: this.chatProvider.getModelName(),
        messages: [{ role: 'user', content: categorizationPrompt }],
        stream: false,
      });
      
      // Log performance
      this.loggerService.endTimer('ai_categorization', {
        model: response.model,
        promptLength: categorizationPrompt.length,
        responseLength: response.content.length
      });

      let aiAnalysis;
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (e) {
        this.loggerService.log('AI categorization failed, using defaults');
        // Safe fallback with multiple layers of protection
        let titleFallback = 'Untitled';
        let summaryFallback = 'No content';
        
        try {
          if (safeContent && safeContent.length > 0) {
            titleFallback = safeContent.slice(0, 50);
            summaryFallback = safeContent.slice(0, 100);
          }
        } catch (fallbackError) {
          this.loggerService.error('Error creating fallback content', { error: fallbackError });
        }
        
        aiAnalysis = {
          title: titleFallback + '...',
          category: categoryHint || 'general',
          tags: ['uncategorized'],
          summary: summaryFallback + '...'
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
      
      // Simple memory path resolution
      const { getMemoriesPath } = require('../utils/magi-paths');
      const baseMemoriesDir = getMemoriesPath();
      const memoriesDir = path.join(baseMemoriesDir, privacyLevel);
      await fs.mkdir(memoriesDir, { recursive: true });
      
      const filePath = path.join(memoriesDir, filename);
      await fs.writeFile(filePath, markdownContent, 'utf8');

      this.loggerService.winston.info(`AI Save successful: ${filePath}`, {
        saveStats: {
          contentLength: content.length,
          privacyLevel: privacyLevel,
          category: aiAnalysis.category || 'uncategorized',
          filePath: filePath
        }
      });
      
      // Generate embeddings for the saved memory
      try {
        this.loggerService.trace('Generating embeddings for saved memory', { filePath });
        
        // Process the memory file to create embedding
        const embedding = await this.embeddingService.processMemoryFile(filePath);
        
        // Fix the filePath to be relative to the data directory (for consistency with content loading)
        embedding.filePath = `memories/${privacyLevel}/${filename}`;
        
        // Load existing index
        const index = await this.embeddingService.loadIndex();
        
        // Add the new embedding to the index
        index.embeddings.push(embedding);
        
        // Save the updated index
        await this.embeddingService.saveIndex(index);
        
        this.loggerService.trace('Embeddings generated and indexed successfully', { 
          embeddingStats: {
            embeddingId: embedding.id,
            vectorLength: embedding.embedding.length,
            totalEmbeddings: index.embeddings.length,
            contentLength: embedding.content?.length || 0,
            category: embedding.metadata.category || 'uncategorized',
            filePath: embedding.filePath
          }
        });
      } catch (embeddingError) {
        this.loggerService.error('Failed to generate embeddings for saved memory', { 
          filePath, 
          error: embeddingError instanceof Error ? embeddingError.message : String(embeddingError)
        });
        // Don't fail the save operation if embeddings fail
      }
      
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
      
      const memories = await this.searchMemoriesFast(question, maxPrivacy, limit);
      
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
   * Fast search memories using index data only (no file I/O)
   */
  private async searchMemoriesFast(query: string, maxPrivacy: string = 'personal', limit: number = 5): Promise<Array<{
    filename: string;
    content: string;
    category?: string;
    tags?: string;
    relevanceScore: number;
  }>> {
    this.loggerService.trace('Starting fast memory search (index-only)', { query, maxPrivacy, limit });
    
    try {
      // Use the new fast search method
      const fastResults = await this.embeddingService.searchSimilarFast(query, limit, 0.2);
      
      if (fastResults && fastResults.length > 0) {
        this.loggerService.trace('Using fast vector similarity search', { foundResults: fastResults.length });
        
        // Filter by privacy level
        const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
        const maxLevel = privacyLevels.indexOf(maxPrivacy);
        const allowedLevels = privacyLevels.slice(0, maxLevel + 1);
        
        return fastResults
          .filter(result => allowedLevels.includes(result.privacy))
          .map(result => ({
            filename: result.filePath.split('/').pop() || 'unknown',
            content: result.content || result.contentPreview || 'No content available', // Use full content if available
            category: result.category,
            tags: 'none', // Could be enhanced later
            relevanceScore: Math.round(result.similarity * 100) // Convert to 0-100 scale
          }))
          .slice(0, limit);
      }
      
      return [];
    } catch (error) {
      this.loggerService.error('Fast vector search failed', {
        error: error instanceof Error ? error.message : String(error),
        searchQuery: query,
        searchLimit: limit,
        privacy: maxPrivacy
      });
      return [];
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
        searchQuery: question,
        privacy: maxPrivacy,
        limit: limit,
        avgContentLength: memories.length > 0 ? Math.round(memories.reduce((sum, m) => sum + (m.content?.length || 0), 0) / memories.length) : 0,
        totalContentChars: memories.reduce((sum, m) => sum + (m.content?.length || 0), 0),
        memoriesWithContent: memories.filter(m => m.content && m.content.length > 0).length
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
Content: ${memory.content?.slice(0, 800) || 'No content'}${(memory.content?.length || 0) > 800 ? '...' : ''}
`).join('\n')}

Please provide a helpful answer based on this context. If you reference specific information, mention which memory it comes from (e.g., "According to your notes in [1]...").

If the memories don't contain enough information to fully answer the question, say so and suggest what additional information might be helpful.
`;

      this.loggerService.trace('Starting AI synthesis', { 
        provider: aiConfig.getProvider(),
        model: this.chatProvider.getModelName(), 
        promptLength: contextPrompt.length 
      });

      const response = await Promise.race([
        this.chatProvider.chat({
          model: this.chatProvider.getModelName(),
          messages: [{ role: 'user', content: contextPrompt }],
          stream: false,
        }),
        new Promise((_, reject) => {
          const timeoutMs = parseInt(process.env.AI_TIMEOUT || '60000'); // Default 60 seconds
          setTimeout(() => reject(new Error(`AI chat timeout after ${timeoutMs/1000} seconds`)), timeoutMs);
        })
      ]) as any;
      
      // Log performance for synthesis
      this.loggerService.endTimer('ai_synthesis', {
        model: response.model,
        promptLength: contextPrompt.length,
        responseLength: response.content.length,
        memoryCount: memories.length
      });

      this.loggerService.winston.info(`AI Query successful: found ${memories.length} memories`, {
        searchStats: {
          memoriesFound: memories.length,
          totalContentChars: memories.reduce((sum, m) => sum + (m.content?.length || 0), 0),
          avgContentLength: memories.length > 0 ? Math.round(memories.reduce((sum, m) => sum + (m.content?.length || 0), 0) / memories.length) : 0
        },
        synthesisStats: {
          model: response.model,
          promptLength: contextPrompt.length,
          responseLength: response.content.length,
          compressionRatio: contextPrompt.length > 0 ? Math.round((response.content.length / contextPrompt.length) * 100) : 0
        }
      });
      
      return {
        success: true,
        answer: response.content,
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
    provider: {
      name: string;
      connected: boolean;
      models?: any[];
    };
    memories: {
      [key: string]: number;
      total: number;
    };
    index: {
      exists: boolean;
      files: string[];
      provider?: string;
    };
  }> {
    const providerInfo = aiProviderFactory.getProviderInfo();
    const status = {
      provider: { name: providerInfo.provider, connected: false, models: [] as any[] },
      memories: { total: 0 } as { [key: string]: number; total: number },
      index: { exists: false, files: [] as string[], provider: undefined as string | undefined }
    };

    try {
      // Check provider connectivity using provider-specific methods
      if (providerInfo.provider === 'ollama') {
        // Test Ollama connectivity via direct provider check
        try {
          const { Ollama } = require('ollama');
          const ollama = new Ollama({ host: aiConfig.getOllamaUrl() });
          const models = await ollama.list();
          status.provider.connected = true;
          status.provider.models = models.models.map((m: any) => ({
            name: m.name,
            size: m.size,
            modified: m.modified_at
          }));
        } catch (ollamaError) {
          status.provider.connected = false;
          this.loggerService.log(`Ollama connectivity check failed: ${ollamaError}`);
        }
      } else if (providerInfo.provider === 'openai') {
        // For OpenAI, verify API key and optionally test connectivity
        const apiKey = aiConfig.getOpenAIApiKey();
        if (apiKey) {
          status.provider.connected = true;
          status.provider.models = [
            { name: providerInfo.chatModel, type: 'chat' },
            { name: providerInfo.embeddingModel, type: 'embedding' }
          ];
        } else {
          status.provider.connected = false;
        }
      }
    } catch (error) {
      this.loggerService.log(`${providerInfo.provider} status check failed: ${error}`);
      status.provider.connected = false;
    }

    try {
      // Check memories
      const fs = require('fs/promises');
      const path = require('path');
      const { getMemoriesPath } = require('../utils/magi-paths');
      const memoriesDir = getMemoriesPath();
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
      // Check provider-specific index
      const fs = require('fs/promises');
      const path = require('path');
      const { getMemoriesPath } = require('../utils/magi-paths');
      const baseMemoriesDir = getMemoriesPath();
      const indexPath = aiConfig.getIndexPath(path.join(baseMemoriesDir, 'embeddings'));
      const embeddingsFile = path.join(indexPath, 'embeddings.txt');
      
      const stats = await fs.stat(embeddingsFile);
      status.index.exists = true;
      status.index.files = [`embeddings.txt (${(stats.size/1024).toFixed(1)}KB)`];
      status.index.provider = aiConfig.getProvider();
    } catch (error) {
      this.loggerService.log(`Index check failed: ${error}`);
      status.index.exists = false;
      status.index.provider = aiConfig.getProvider();
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
    
    // Fallback to keyword search when vector search returns no results
    this.loggerService.log('Vector search returned no results, falling back to keyword search');
    
    const fs = require('fs/promises');
    const path = require('path');
    const glob = require('glob');
    
    // Simple memory path resolution
    const { getMemoriesPath } = require('../utils/magi-paths');
    const baseMemoriesDir = getMemoriesPath();
    const memoriesDir = baseMemoriesDir;
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