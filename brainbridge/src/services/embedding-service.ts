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
    this.indexPath = path.join(process.cwd(), '.index');
    this.embeddingsPath = path.join(this.indexPath, 'embeddings.json');
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
      this.loggerService.log(`Embedding generation failed: ${error}`, 'error');
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
   * Load existing embedding index
   */
  async loadIndex(): Promise<EmbeddingIndex> {
    try {
      await fs.mkdir(this.indexPath, { recursive: true });
      
      if (await fs.access(this.embeddingsPath).then(() => true).catch(() => false)) {
        const data = await fs.readFile(this.embeddingsPath, 'utf8');
        return JSON.parse(data);
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
   * Save embedding index to disk
   */
  async saveIndex(index: EmbeddingIndex): Promise<void> {
    index.updated = new Date().toISOString();
    index.totalEmbeddings = index.embeddings.length;
    
    await fs.writeFile(this.embeddingsPath, JSON.stringify(index, null, 2));
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
      this.loggerService.trace('Debug embedding dimensions', {
        queryEmbeddingLength: queryEmbedding.length,
        queryEmbeddingFirst5: queryEmbedding.slice(0, 5),
        indexEmbeddingsCount: index.embeddings.length,
        firstMemoryEmbeddingLength: index.embeddings[0]?.embedding?.length,
        firstMemoryEmbeddingFirst5: index.embeddings[0]?.embedding?.slice(0, 5)
      });

      const results = index.embeddings.map((memory, idx) => {
        const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
        if (idx < 3) { // Debug first 3 similarities
          this.loggerService.trace(`Similarity debug [${idx}]`, {
            memoryFile: memory.filePath,
            similarity,
            queryNorm: Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0)),
            memoryNorm: Math.sqrt(memory.embedding.reduce((sum, val) => sum + val * val, 0))
          });
        }
        return { memory, similarity };
      });

      this.loggerService.trace('Pre-filter results count', { 
        totalResults: results.length, 
        threshold,
        sampleSimilarities: results.slice(0, 3).map(r => r.similarity)
      });

      const filteredResults = results.filter(result => result.similarity >= threshold);

      this.loggerService.trace('Post-filter results count', { 
        filteredResults: filteredResults.length,
        threshold 
      });

      const finalResults = filteredResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      this.loggerService.trace('Final results debug', {
        finalResultsLength: finalResults.length,
        limit,
        topSimilarities: finalResults.slice(0, 3).map(r => r.similarity)
      });

      this.loggerService.endTimer('vector_search', {
        queryLength: query.length,
        indexSize: index.totalEmbeddings,
        resultsFound: finalResults.length,
        topSimilarity: finalResults[0]?.similarity || 0
      });

      return finalResults;
    } catch (error) {
      this.loggerService.log(`Vector search failed: ${error}`, 'error');
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