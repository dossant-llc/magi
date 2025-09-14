/**
 * AI Service - Integrates mAGIc local AI functionality with MCP
 */

import { saveCommand } from '../magic/commands/save';
import { queryCommand } from '../magic/commands/query';
import { statusCommand } from '../magic/commands/status';
import { LoggerService } from './logger-service';
import { EmbeddingService } from './embedding-service';
import { HybridSearchService } from './hybrid-search-service';
import { IChatProvider } from '../providers/ai-interfaces';
import { aiProviderFactory } from '../providers/ai-provider-factory';
import { aiConfig } from '../config/ai-config';

export class AIService {
  private chatProvider: IChatProvider;
  private loggerService: LoggerService;
  private embeddingService: EmbeddingService;
  private hybridSearchService: HybridSearchService;

  constructor(loggerService: LoggerService) {
    this.chatProvider = aiProviderFactory.createChatProvider();
    this.loggerService = loggerService;
    this.embeddingService = new EmbeddingService(loggerService);
    this.hybridSearchService = new HybridSearchService();

    // Initialize BM25 index with existing memories
    this.initializeBM25Index();

    const providerInfo = aiProviderFactory.getProviderInfo();
    this.loggerService.log(`AI Service initialized with ${providerInfo.provider} provider (Chat: ${providerInfo.chatModel}, Embedding: ${providerInfo.embeddingModel})`);
  }

  /**
   * Initialize BM25 index with existing memories
   */
  private async initializeBM25Index(): Promise<void> {
    try {
      this.loggerService.trace('Initializing BM25 index with existing memories');

      // Get existing memories from embedding service
      const embeddings = await this.embeddingService.getAllEmbeddings();

      for (const embedding of embeddings) {
        const doc = {
          id: embedding.filePath,
          title: embedding.metadata.title || 'Untitled',
          content: embedding.content || '',
          category: embedding.metadata.category || 'general',
          privacy: embedding.metadata.privacy || 'personal',
          filePath: embedding.filePath
        };

        this.hybridSearchService.addDocument(doc);
      }

      this.loggerService.trace('BM25 index initialization completed', {
        documentsIndexed: embeddings.length
      });
    } catch (error) {
      this.loggerService.error('Failed to initialize BM25 index', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
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
   * Hybrid search memories using both vector and BM25 with RRF fusion
   */
  private async searchMemoriesFast(query: string, maxPrivacy: string = 'personal', limit: number = 5): Promise<Array<{
    filename: string;
    content: string;
    category?: string;
    tags?: string;
    relevanceScore: number;
  }>> {
    this.loggerService.trace('Starting hybrid memory search (Vector + BM25 + RRF)', {
      query,
      maxPrivacy,
      limit,
      method: 'searchMemoriesFast',
      callStack: 'ai-service.searchMemoriesFast'
    });

    try {
      // Create vector search function for hybrid service
      const vectorSearchFn = async (query: string, topK: number) => {
        const results = await this.embeddingService.searchSimilarFast(query, topK, 0.1); // Very low threshold for RRF
        return results.map(r => ({
          id: r.filePath,
          title: r.title || 'Untitled',
          content: r.content || r.contentPreview || '',
          category: r.category || 'general',
          privacy: r.privacy || 'personal',
          filePath: r.filePath,
          similarity: r.similarity
        }));
      };

      // Run hybrid search with RRF fusion
      const hybridResults = await this.hybridSearchService.hybridSearch(query, vectorSearchFn, {
        vectorTopK: 15,
        bm25TopK: 50,
        fusedTopK: 20,
        finalResults: limit * 3 // Get more candidates for privacy filtering
      });

      this.loggerService.trace('Hybrid search results before privacy filtering', {
        foundResults: hybridResults.length,
        topResults: hybridResults.slice(0, 3).map(r => ({
          title: r.title?.substring(0, 40),
          totalScore: Math.round(r.score * 1000) / 1000,
          privacy: r.privacy
        })),
        callStack: 'ai-service.searchMemoriesFast.hybridResults'
      });

      // Filter by privacy level
      const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
      const maxLevel = privacyLevels.indexOf(maxPrivacy);
      const allowedLevels = privacyLevels.slice(0, maxLevel + 1);

      const filteredResults = hybridResults
        .filter(result => allowedLevels.includes(result.privacy))
        .map(result => ({
          filename: result.filePath.split('/').pop() || 'unknown',
          content: result.content || 'No content available',
          category: result.category,
          tags: 'hybrid', // Mark as hybrid search result
          relevanceScore: Math.round(result.score * 100) // Convert to 0-100 scale
        }))
        .slice(0, limit);

      this.loggerService.trace('Final hybrid search results after privacy filtering', {
        finalResults: filteredResults.length,
        privacyFilter: { maxPrivacy, allowedLevels },
        results: filteredResults.map(r => ({
          filename: r.filename,
          relevanceScore: r.relevanceScore,
          category: r.category,
          contentPreview: r.content.substring(0, 100)
        })),
        callStack: 'ai-service.searchMemoriesFast.final'
      });

      return filteredResults;
    } catch (error) {
      this.loggerService.error('Hybrid search failed', {
        error: error instanceof Error ? error.message : String(error),
        searchQuery: query,
        searchLimit: limit,
        privacy: maxPrivacy,
        callStack: 'ai-service.searchMemoriesFast.error'
      });
      return [];
    }
  }

  /**
   * Query memories with AI-powered synthesis
   */
  /**
   * Generate synthesis prompt based on query classification and temporal context
   */
  private generateSynthesisPrompt(
    question: string,
    memories: Array<{ filename: string; content: string; category?: string; tags?: string; relevanceScore: number }>,
    classification: { type: string; responseStyle: string; temporalSensitive: boolean }
  ): string {
    // Extract dates from filenames and sort memories chronologically
    const memoriesWithDates = memories.map((memory, index) => {
      const dateMatch = memory.filename.match(/(\d{4}-\d{2}-\d{2})/);
      return {
        ...memory,
        originalIndex: index + 1,
        extractedDate: dateMatch ? dateMatch[1] : null,
        parsedDate: dateMatch ? new Date(dateMatch[1]) : null
      };
    });

    // Sort by date if temporal sensitivity is high
    const sortedMemories = classification.temporalSensitive
      ? [...memoriesWithDates].sort((a, b) => {
          if (!a.parsedDate && !b.parsedDate) return 0;
          if (!a.parsedDate) return 1;
          if (!b.parsedDate) return -1;
          return b.parsedDate.getTime() - a.parsedDate.getTime(); // Newest first
        })
      : memoriesWithDates;

    const baseInstructions = this.getResponseStyleInstructions(classification);
    const temporalInstructions = classification.temporalSensitive
      ? this.getTemporalInstructions()
      : '';

    const memoryContext = sortedMemories.map((memory) => {
      const dateInfo = memory.extractedDate
        ? ` (${memory.extractedDate})`
        : '';

      return `[${memory.originalIndex}] ${memory.filename}${dateInfo}
Category: ${memory.category || 'unknown'}
Tags: ${memory.tags || 'none'}
Relevance Score: ${memory.relevanceScore.toFixed(3)}
Content: ${memory.content?.slice(0, 800) || 'No content'}${(memory.content?.length || 0) > 800 ? '...' : ''}`;
    }).join('\n\n');

    return `You are an AI assistant helping a user understand their personal knowledge base.
Answer their question using ONLY the provided context from their memories.

Query Type: ${classification.type}
Response Style: ${classification.responseStyle}
Temporal Sensitivity: ${classification.temporalSensitive}

Question: "${question}"

${baseInstructions}

${temporalInstructions}

Context from user's memories${classification.temporalSensitive ? ' (ordered by date, newest first)' : ''}:
${memoryContext}

Reference specific memories when citing information (e.g., "According to your notes in [1]...").

If the memories don't contain enough information to fully answer the question, say so and suggest what additional information might be helpful.`;
  }

  /**
   * Get response style instructions based on classification
   */
  private getResponseStyleInstructions(classification: { type: string; responseStyle: string }): string {
    const styleInstructions: Record<string, string> = {
      conversational: 'Provide a natural, friendly response as if talking to a friend. Be warm and personal.',
      structured: 'Organize your response clearly with headings, bullet points, or numbered lists as appropriate.',
      technical: 'Be precise and detailed. Include technical specifics and accurate terminology.'
    };

    const typeInstructions: Record<string, string> = {
      question: 'Answer the question directly and comprehensively.',
      list: 'Provide a well-organized list or summary of the requested items.',
      analytical: 'Analyze the information thoroughly and provide insights, patterns, or conclusions.',
      lookup: 'Find and present the specific information requested.'
    };

    return `Response Style: ${styleInstructions[classification.responseStyle] || styleInstructions.conversational}

Approach: ${typeInstructions[classification.type] || typeInstructions.question}`;
  }

  /**
   * Get temporal-specific instructions for handling time-sensitive queries
   */
  private getTemporalInstructions(): string {
    return `IMPORTANT - Temporal Context:
- Pay special attention to dates and chronological order
- When information conflicts across different time periods, prioritize more recent entries
- If preferences or opinions have evolved over time, acknowledge this evolution (e.g., "You initially preferred X, but more recently have shifted to Y...")
- Note any patterns or changes in thinking over time
- If information is contradictory, explain the timeline of changes`;
  }

  /**
   * Direct AI query without memory search (for analysis tasks)
   */
  async queryWithAI(prompt: string): Promise<string> {
    try {
      this.loggerService.trace('Direct AI query', { promptLength: prompt.length });

      const response = await Promise.race([
        this.chatProvider.chat({
          model: this.chatProvider.getModelName(),
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
        new Promise((_, reject) => {
          const timeoutMs = parseInt(process.env.AI_TIMEOUT || '60000');
          setTimeout(() => reject(new Error(`AI chat timeout after ${timeoutMs/1000} seconds`)), timeoutMs);
        })
      ]) as any;

      const answer = response.content.trim();
      this.loggerService.trace('Direct AI query completed', { responseLength: answer.length });

      return answer;
    } catch (error: any) {
      this.loggerService.log('Direct AI query failed', 'error');
      this.loggerService.trace('AI query error details', { error: error.message });
      throw error;
    }
  }

  /**
   * Apply temporal weighting to prioritize recent memories
   */
  private applyTemporalWeighting(memories: Array<{
    filename: string;
    content: string;
    category?: string;
    tags?: string;
    relevanceScore: number;
  }>): Array<{
    filename: string;
    content: string;
    category?: string;
    tags?: string;
    relevanceScore: number;
  }> {
    const now = Date.now();

    return memories.map(memory => {
      try {
        // Try to extract date from filename (YYYY-MM-DD format)
        let createdAt: Date | null = null;
        const dateMatch = memory.filename.match(/(\d{4}-\d{2}-\d{2})/);

        if (dateMatch) {
          createdAt = new Date(dateMatch[1]);
        } else {
          // Fallback: use file system stats if available
          // For now, assume recent if no date found
          createdAt = new Date(now - (7 * 24 * 60 * 60 * 1000)); // 1 week ago
        }

        if (createdAt && !isNaN(createdAt.getTime())) {
          const ageInDays = (now - createdAt.getTime()) / (1000 * 60 * 60 * 24);

          // Exponential decay over 90 days (newer memories get higher weight)
          const temporalWeight = Math.exp(-ageInDays / 90);

          // Apply temporal weight to relevance score
          const enhancedScore = memory.relevanceScore * (0.7 + 0.3 * temporalWeight);

          this.loggerService.trace('Applied temporal weighting', {
            filename: memory.filename,
            ageInDays: Math.round(ageInDays),
            temporalWeight: temporalWeight.toFixed(3),
            originalScore: memory.relevanceScore.toFixed(3),
            enhancedScore: enhancedScore.toFixed(3)
          });

          return {
            ...memory,
            relevanceScore: enhancedScore
          };
        }
      } catch (error: any) {
        this.loggerService.log('Error applying temporal weighting', 'error');
        this.loggerService.trace('Temporal weighting error details', {
          filename: memory.filename,
          error: error.message
        });
      }

      return memory;
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Classify query to determine optimal response style
   */
  private async classifyQuery(question: string): Promise<{
    type: 'question' | 'list' | 'analytical' | 'lookup';
    responseStyle: 'conversational' | 'structured' | 'technical';
    temporalSensitive: boolean;
  }> {
    try {
      const classificationPrompt = `Classify this user query to determine the best response style:

Query: "${question}"

Analyze the query and respond with JSON:
{
  "type": "question|list|analytical|lookup",
  "responseStyle": "conversational|structured|technical",
  "temporalSensitive": boolean
}

Guidelines:
- "question": Direct questions about preferences, facts, or opinions (What's my...?, How do I...?, Why did I...?)
- "list": Requests for multiple items (Show me all..., List my..., Give me everything about...)
- "analytical": Complex analysis requests (Analyze my..., Compare my..., What patterns...)
- "lookup": Simple information retrieval (Find notes about..., Search for...)

- "conversational": Natural, friendly responses for personal questions
- "structured": Organized, clear formatting for lists and analysis
- "technical": Precise, detailed responses for technical queries

- temporalSensitive: true if the answer might change over time (preferences, opinions, evolving thoughts)`;

      const response = await this.chatProvider.chat({
        model: this.chatProvider.getModelName(),
        messages: [{ role: 'user', content: classificationPrompt }],
        stream: false,
      });

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.content.trim();
      if (jsonStr.includes('```json')) {
        const codeBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }
      }

      // Look for JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const classification = JSON.parse(jsonStr);
      this.loggerService.trace('Query classified', { question, classification });
      return classification;
    } catch (error: any) {
      // Fallback to default classification
      this.loggerService.log('Query classification failed, using defaults', 'error');
      this.loggerService.trace('Classification error details', { error: error.message });
      return {
        type: 'question',
        responseStyle: 'conversational',
        temporalSensitive: true
      };
    }
  }

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

      // Classify the query to determine optimal response approach
      const queryClassification = await this.classifyQuery(question);

      // Performance tracking for search
      this.loggerService.startTimer('memory_search');

      // Search for relevant memories using hybrid search (Vector + BM25 + RRF)
      let memories = await this.searchMemoriesFast(question, maxPrivacy, limit);

      // Apply temporal weighting if query is temporally sensitive
      if (queryClassification.temporalSensitive && memories.length > 1) {
        memories = this.applyTemporalWeighting(memories);
      }
      
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
        // Check if indexing is in progress - this could explain why no memories were found
        const indexingStatus = await this.embeddingService.isIndexingInProgress();

        let answer = "I couldn't find any relevant memories in your knowledge base for that question.";

        if (indexingStatus.inProgress) {
          answer += "\n\n⏳ **Note**: Memory indexing is currently in progress " +
                   `(${indexingStatus.lockInfo}). Recent memories may not be searchable yet. ` +
                   "Please try again in a few moments once indexing is complete.";
        } else {
          // Check for recent memory files that might not be indexed yet
          answer += "\n\n*No relevant memories found in your knowledge base.*";
        }

        return {
          success: true,
          answer,
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
      
      // Generate enhanced synthesis prompt based on query classification
      const contextPrompt = this.generateSynthesisPrompt(question, memories, queryClassification);

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
      const vectorResults = await this.embeddingService.searchSimilar(query, limit, 0.6);
      
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