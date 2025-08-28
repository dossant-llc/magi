/**
 * Embedding Service - Generates and manages vector embeddings using local models
 */

import { Ollama } from 'ollama';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { LoggerService } from './logger-service';

interface MemoryEmbedding {
  id: string;
  filePath: string;
  content: string;
  embedding: number[];
  metadata: {
    title?: string;
    category?: string;
    tags?: string[];
    privacy?: string;
    created?: string;
    contentHash: string;
    embeddedAt: string;
  };
}

interface EmbeddingIndex {
  version: string;
  model: string;
  created: string;
  updated: string;
  totalEmbeddings: number;
  embeddings: MemoryEmbedding[];
}

export class EmbeddingService {
  private ollama: Ollama;
  private loggerService: LoggerService;
  private indexPath: string;
  private embeddingsPath: string;
  
  constructor(loggerService: LoggerService) {
    this.ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
    this.loggerService = loggerService;
    this.indexPath = path.join(process.cwd(), '..', 'memories', 'embeddings');
    this.embeddingsPath = path.join(this.indexPath, 'embeddings.txt');
  }

  /**
   * Generate embedding for text content
   */
  async generateEmbedding(content: string): Promise<number[]> {
    this.loggerService.trace('Generating embedding', { contentLength: content.length });
    this.loggerService.startTimer('embedding_generation');

    try {
      const response = await this.ollama.embeddings({
        model: 'mxbai-embed-large',
        prompt: content,
      });

      this.loggerService.endTimer('embedding_generation', {
        model: 'mxbai-embed-large',
        contentLength: content.length,
        embeddingDimensions: response.embedding?.length || 0
      });

      if (!response.embedding) {
        throw new Error('No embedding returned from model');
      }

      return response.embedding;
    } catch (error) {
      this.loggerService.error('Embedding generation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        contentLength: content.length,
        ollamaHost: 'http://127.0.0.1:11434',
        model: 'nomic-embed-text',
        cause: error instanceof Error && error.cause ? error.cause : 'Unknown - likely Ollama server not running or model not available'
      });
      throw error;
    }
  }

  /**
   * Extract content hash for change detection
   */
  private getContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Extract metadata from memory file content
   */
  private extractMetadata(content: string, filePath: string) {
    const metadata: any = {
      contentHash: this.getContentHash(content),
      embeddedAt: new Date().toISOString()
    };

    // Extract frontmatter metadata
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const lines = frontmatter.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
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
    }

    return metadata;
  }

  /**
   * Process a single memory file and generate its embedding
   */
  async processMemoryFile(filePath: string): Promise<MemoryEmbedding> {
    this.loggerService.trace('Processing memory file', { filePath });

    const content = await fs.readFile(filePath, 'utf8');
    const metadata = this.extractMetadata(content, filePath);
    
    // Generate embedding for the main content (without frontmatter)
    const mainContent = content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
    const embedding = await this.generateEmbedding(mainContent);

    const id = crypto.randomUUID();
    
    return {
      id,
      filePath,
      content: mainContent,
      embedding,
      metadata
    };
  }

  /**
   * Load existing embedding index from structured text format
   */
  async loadIndex(): Promise<EmbeddingIndex> {
    try {
      await fs.mkdir(this.indexPath, { recursive: true });
      
      if (await fs.access(this.embeddingsPath).then(() => true).catch(() => false)) {
        const data = await fs.readFile(this.embeddingsPath, 'utf8');
        
        // Try JSON format first for backward compatibility
        if (data.trim().startsWith('{')) {
          return JSON.parse(data);
        }
        
        // Parse structured text format
        return this.parseStructuredIndex(data);
      }
    } catch (error) {
      this.loggerService.trace('Failed to load existing index', { error });
    }

    // Return empty index
    return {
      version: '1.0.0',
      model: 'mxbai-embed-large',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      totalEmbeddings: 0,
      embeddings: []
    };
  }

  /**
   * Parse structured text format into EmbeddingIndex
   */
  private parseStructuredIndex(data: string): EmbeddingIndex {
    const lines = data.split('\n');
    const index: EmbeddingIndex = {
      version: '1.0.0',
      model: 'mxbai-embed-large',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      totalEmbeddings: 0,
      embeddings: []
    };

    let currentEmbedding: Partial<MemoryEmbedding> | null = null;
    let currentMetadata: any = {};

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('# Version:')) {
        index.version = trimmed.substring(10).trim();
      } else if (trimmed.startsWith('# Model:')) {
        index.model = trimmed.substring(8).trim();
      } else if (trimmed.startsWith('# Created:')) {
        index.created = trimmed.substring(10).trim();
      } else if (trimmed.startsWith('# Updated:')) {
        index.updated = trimmed.substring(10).trim();
      } else if (trimmed.startsWith('# Total Embeddings:')) {
        index.totalEmbeddings = parseInt(trimmed.substring(20).trim());
      } else if (trimmed.startsWith('ID:')) {
        // Start new embedding
        if (currentEmbedding && currentEmbedding.id) {
          index.embeddings.push(currentEmbedding as MemoryEmbedding);
        }
        currentEmbedding = { id: trimmed.substring(3).trim() };
        currentMetadata = {};
      } else if (trimmed.startsWith('File:')) {
        if (currentEmbedding) currentEmbedding.filePath = trimmed.substring(5).trim();
      } else if (trimmed.startsWith('Hash:')) {
        currentMetadata.contentHash = trimmed.substring(5).trim();
      } else if (trimmed.startsWith('Created:')) {
        currentMetadata.embeddedAt = trimmed.substring(8).trim();
      } else if (trimmed.startsWith('Title:')) {
        currentMetadata.title = trimmed.substring(6).trim();
      } else if (trimmed.startsWith('Category:')) {
        currentMetadata.category = trimmed.substring(9).trim();
      } else if (trimmed.startsWith('Privacy:')) {
        currentMetadata.privacy = trimmed.substring(8).trim();
      } else if (trimmed.startsWith('Tags:')) {
        currentMetadata.tags = trimmed.substring(5).trim().split(',').map(s => s.trim());
      } else if (trimmed.startsWith('Vector:')) {
        if (currentEmbedding) {
          currentEmbedding.embedding = trimmed.substring(7).trim().split(',').map(s => parseFloat(s.trim()));
          currentEmbedding.content = ''; // We'll need to extract this from the file if needed
          currentEmbedding.metadata = currentMetadata;
        }
      } else if (trimmed === '---' && currentEmbedding && currentEmbedding.id) {
        // End of current embedding
        index.embeddings.push(currentEmbedding as MemoryEmbedding);
        currentEmbedding = null;
        currentMetadata = {};
      }
    }

    // Handle last embedding if no final separator
    if (currentEmbedding && currentEmbedding.id) {
      index.embeddings.push(currentEmbedding as MemoryEmbedding);
    }

    return index;
  }

  /**
   * Save embedding index to disk in structured text format
   */
  async saveIndex(index: EmbeddingIndex): Promise<void> {
    index.updated = new Date().toISOString();
    index.totalEmbeddings = index.embeddings.length;
    
    const lines: string[] = [
      '# Embedding Index',
      `# Version: ${index.version}`,
      `# Model: ${index.model}`,
      `# Created: ${index.created}`,
      `# Updated: ${index.updated}`,
      `# Total Embeddings: ${index.totalEmbeddings}`,
      ''
    ];
    
    for (const embedding of index.embeddings) {
      lines.push(`ID: ${embedding.id}`);
      lines.push(`File: ${embedding.filePath}`);
      lines.push(`Hash: ${embedding.metadata.contentHash}`);
      lines.push(`Created: ${embedding.metadata.embeddedAt}`);
      if (embedding.metadata.title) lines.push(`Title: ${embedding.metadata.title}`);
      if (embedding.metadata.category) lines.push(`Category: ${embedding.metadata.category}`);
      if (embedding.metadata.privacy) lines.push(`Privacy: ${embedding.metadata.privacy}`);
      if (embedding.metadata.tags) lines.push(`Tags: ${embedding.metadata.tags.join(', ')}`);
      lines.push(`Vector: ${embedding.embedding.join(',')}`);
      lines.push('---');
    }
    
    await fs.writeFile(this.embeddingsPath, lines.join('\n'));
    this.loggerService.trace('Saved embedding index', { 
      totalEmbeddings: index.totalEmbeddings,
      path: this.embeddingsPath 
    });
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Search embeddings using vector similarity
   */
  async searchSimilar(query: string, limit: number = 5, threshold: number = 0.5): Promise<Array<{
    memory: MemoryEmbedding;
    similarity: number;
  }>> {
    this.loggerService.trace('Starting vector similarity search', { query, limit, threshold });
    this.loggerService.startTimer('vector_search');

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Load existing index
      const index = await this.loadIndex();
      
      // Calculate similarities
      const results = index.embeddings.map(memory => ({
        memory,
        similarity: this.cosineSimilarity(queryEmbedding, memory.embedding)
      }));

      const filteredResults = results.filter(result => result.similarity >= threshold);
      const finalResults = filteredResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      this.loggerService.endTimer('vector_search', {
        queryLength: query.length,
        indexSize: index.totalEmbeddings,
        resultsFound: finalResults.length,
        topSimilarity: finalResults[0]?.similarity || 0
      });

      return finalResults;
    } catch (error) {
      this.loggerService.error('Vector search failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        query,
        maxResults: limit,
        threshold: threshold,
        searchQuery: query,
        indexExists: require('fs').existsSync(this.embeddingsPath),
        ollamaHost: 'http://127.0.0.1:11434',
        cause: 'Likely embedding generation failed or vector index corrupted'
      });
      throw error;
    }
  }

  /**
   * Build/rebuild embeddings for all memory files
   */
  async buildIndex(force: boolean = false): Promise<{
    processed: number;
    skipped: number;
    errors: number;
    timeSpent: string;
  }> {
    this.loggerService.log('Building embedding index...');
    this.loggerService.startTimer('index_build');

    const stats = { processed: 0, skipped: 0, errors: 0, timeSpent: '' };
    
    try {
      const index = force ? {
        version: '1.0.0',
        model: 'mxbai-embed-large',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        totalEmbeddings: 0,
        embeddings: []
      } : await this.loadIndex();

      // Ensure embeddings array exists
      if (!index.embeddings) {
        this.loggerService.trace('Index missing embeddings array, initializing empty array');
        index.embeddings = [];
      }

      // Find all memory files
      const memoriesDir = path.join(process.cwd(), '..', 'memories');
      const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
      
      for (const level of privacyLevels) {
        try {
          const levelDir = path.join(memoriesDir, level);
          const files = await fs.readdir(levelDir);
          
          for (const file of files) {
            if (!file.endsWith('.md')) continue;
            
            const filePath = path.join(levelDir, file);
            const relativePath = `memories/${level}/${file}`;
            
            try {
              // Check if already processed
              const content = await fs.readFile(filePath, 'utf8');
              const contentHash = this.getContentHash(content);
              
              const existing = index.embeddings.find(e => e.filePath === relativePath);
              if (existing && existing.metadata.contentHash === contentHash && !force) {
                stats.skipped++;
                this.loggerService.trace('Skipping unchanged file', { filePath: relativePath });
                continue;
              }

              // Remove existing entry if updating
              if (existing) {
                index.embeddings = index.embeddings.filter(e => e.id !== existing.id);
              }

              // Process file
              this.loggerService.trace('Processing memory file', { filePath: relativePath });
              const memoryEmbedding = await this.processMemoryFile(filePath);
              memoryEmbedding.filePath = relativePath; // Use relative path
              
              index.embeddings.push(memoryEmbedding);
              stats.processed++;
              
            } catch (error) {
              this.loggerService.log(`Error processing ${relativePath}: ${error}`, 'error');
              stats.errors++;
            }
          }
        } catch (error) {
          // Skip directories that don't exist
          this.loggerService.trace(`Skipping directory ${level}`, { error });
        }
      }

      await this.saveIndex(index);
      
      this.loggerService.endTimer('index_build', stats);
      stats.timeSpent = 'Complete';
      
      this.loggerService.log(`Index build complete: ${stats.processed} processed, ${stats.skipped} skipped, ${stats.errors} errors`);
      
      return stats;
    } catch (error) {
      this.loggerService.log(`Index build failed: ${error}`, 'error');
      throw error;
    }
  }
}