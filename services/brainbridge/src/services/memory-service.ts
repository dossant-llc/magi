import * as fs from 'fs';
import * as path from 'path';
import { MemoryEntry, SearchResult, OrganizationPattern, CategoryStats } from '../types/index.js';
import { LoggerService } from './logger-service.js';

export class MemoryService {
  private memoriesDir: string;
  private logger: LoggerService;
  private embeddingService: any; // Will be injected

  constructor(memoriesDir: string, logger: LoggerService) {
    this.memoriesDir = memoriesDir;
    this.logger = logger;
  }

  // Inject embedding service for auto-rebuild functionality
  setEmbeddingService(embeddingService: any) {
    this.embeddingService = embeddingService;
  }

  // Vector-based memory search using embeddings
  async searchMemoriesVector(query: string, category?: string, limit: number = 5, threshold: number = 0.2): Promise<SearchResult[]> {
    this.logger.log(`Vector searching memories: query="${query}", category="${category || 'any'}", limit=${limit}, threshold=${threshold}`);
    
    if (!this.embeddingService) {
      this.logger.log('EmbeddingService not available, falling back to text search', 'warn');
      return this.searchMemories(query, category);
    }

    try {
      // Use the fast vector search with lower threshold
      const vectorResults = await this.embeddingService.searchSimilarFast(query, limit, threshold);
      this.logger.log(`Vector search found ${vectorResults.length} results`);

      // Convert vector results to SearchResult format
      const searchResults: SearchResult[] = vectorResults.map(result => {
        // Filter by category if specified
        if (category && result.category.toLowerCase() !== category.toLowerCase()) {
          return null;
        }

        return {
          file: result.title,
          matches: [
            `${result.content || result.contentPreview || 'Content not available'} (similarity: ${Math.round(result.similarity * 100)}%)`
          ],
          similarity: result.similarity,
          category: result.category,
          privacy: result.privacy
        };
      }).filter(result => result !== null) as SearchResult[];

      this.logger.log(`Filtered to ${searchResults.length} results after category filter`);
      return searchResults;

    } catch (error) {
      this.logger.log(`Vector search failed: ${error}, falling back to text search`, 'error');
      return this.searchMemories(query, category);
    }
  }

  getMemoryFiles(): string[] {
    if (!fs.existsSync(this.memoriesDir)) {
      fs.mkdirSync(this.memoriesDir, { recursive: true });
      return [];
    }
    
    // Recursively find all .md files in subdirectories
    const findMemoryFiles = (dir: string, relativePath: string = ''): string[] => {
      const files: string[] = [];
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
        
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory() && !item.startsWith('.')) {
            // Recursively search subdirectories (personal/, public/, private/, etc.)
            files.push(...findMemoryFiles(fullPath, itemRelativePath));
          } else if (stat.isFile() && item.endsWith('.md')) {
            files.push(itemRelativePath);
          }
        } catch (error) {
          // Skip files we can't read (permission errors, etc.)
          continue;
        }
      }
      
      return files;
    };
    
    return findMemoryFiles(this.memoriesDir).sort();
  }

  searchMemories(query: string, category?: string): SearchResult[] {
    this.logger.log(`Searching memories: query="${query}", category="${category || 'any'}", memoriesDir="${this.memoriesDir}"`);
    
    const files = this.getMemoryFiles();
    this.logger.log(`Found ${files.length} memory files: ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
    
    const results: SearchResult[] = [];

    for (const file of files) {
      if (category && !file.toLowerCase().includes(category.toLowerCase())) {
        continue;
      }

      // Handle both relative paths (personal/file.md) and top-level files (file.md)
      const filepath = path.join(this.memoriesDir, file);
      
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        
        const lines = content.split('\n');
        const matches = lines.filter(line => 
          line.toLowerCase().includes(query.toLowerCase())
        );

        if (matches.length > 0) {
          results.push({ file, matches });
          this.logger.log(`Found ${matches.length} matches in ${file}`);
        }
      } catch (error) {
        this.logger.log(`Warning: Could not read file ${file}: ${error}`);
        continue;
      }
    }

    this.logger.log(`Search complete: ${results.length} files with matches`);
    return results;
  }

  addMemory(entry: MemoryEntry): void {
    const filename = `${entry.category.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filepath = path.join(this.memoriesDir, filename);
    
    this.logger.log(`Adding memory: title="${entry.title}", category="${entry.category}", filename="${filename}", filepath="${filepath}"`);
    
    // Check if memories directory exists
    if (!fs.existsSync(this.memoriesDir)) {
      this.logger.log(`Memories directory doesn't exist, creating: ${this.memoriesDir}`);
      fs.mkdirSync(this.memoriesDir, { recursive: true });
    }
    
    let fileContent = '';
    let isNewFile = false;
    if (fs.existsSync(filepath)) {
      fileContent = fs.readFileSync(filepath, 'utf8') + '\n\n';
      this.logger.log(`Appending to existing file: ${filename}`);
    } else {
      fileContent = `# ${entry.category}\n\n`;
      isNewFile = true;
      this.logger.log(`Creating new file: ${filename}`);
    }

    const timestamp = entry.timestamp || new Date().toISOString().split('T')[0];
    fileContent += `## ${entry.title}\n${entry.content}\n\n*Added: ${timestamp}*\n`;

    try {
      fs.writeFileSync(filepath, fileContent);
      this.logger.log(`✅ Successfully ${isNewFile ? 'created' : 'updated'} memory file: ${filepath}`);
      this.logger.log(`Memory content preview: "${entry.title}" - ${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}`);
    } catch (error) {
      this.logger.log(`❌ Failed to write memory file: ${error}`);
      throw new Error(`Failed to save memory: ${error}`);
    }
  }

  async addMemoryWithAutoRebuild(entry: MemoryEntry): Promise<void> {
    // First add the memory using the existing method
    this.addMemory(entry);
    
    // Then trigger auto-rebuild of embeddings if embedding service is available
    if (this.embeddingService) {
      try {
        this.logger.log(`🔄 Auto-rebuilding embeddings after memory save...`);
        const result = await this.embeddingService.buildIndex(false); // false = only rebuild if needed
        this.logger.log(`✅ Embeddings updated: processed ${result.processed} files in ${result.duration}ms`);
      } catch (error) {
        this.logger.log(`⚠️ Auto-rebuild failed (memory saved successfully): ${error}`);
        // Don't throw - memory save was successful, embedding rebuild failure shouldn't fail the save
      }
    } else {
      this.logger.log(`💡 Embedding service not available, skipping auto-rebuild`);
    }
  }

  /**
   * Get all memories from all privacy levels for analysis
   */
  async getAllMemories(): Promise<Array<{
    filename: string;
    content: string;
    category?: string;
    privacy?: string;
    filepath: string;
  }>> {
    this.logger.log(`Loading all memories for analysis from: ${this.memoriesDir}`);

    const allMemories: Array<{
      filename: string;
      content: string;
      category?: string;
      privacy?: string;
      filepath: string;
    }> = [];

    // Define privacy levels in order
    const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];

    for (const privacyLevel of privacyLevels) {
      const privacyDir = path.join(this.memoriesDir, privacyLevel);
      this.logger.log(`Checking privacy directory: ${privacyDir}`);

      if (fs.existsSync(privacyDir)) {
        try {
          const files = fs.readdirSync(privacyDir).filter(file => file.endsWith('.md'));
          this.logger.log(`Found ${files.length} .md files in ${privacyLevel} directory`);

          for (const file of files) {
            const filepath = path.join(privacyDir, file);
            try {
              const content = fs.readFileSync(filepath, 'utf8');

              // Extract category from content if available (first heading)
              const categoryMatch = content.match(/^# (.+)$/m);
              const category = categoryMatch ? categoryMatch[1] : 'unknown';

              allMemories.push({
                filename: file,
                content,
                category,
                privacy: privacyLevel,
                filepath
              });
            } catch (fileError) {
              this.logger.log(`Failed to read memory file: ${filepath}`, 'warn');
            }
          }
        } catch (dirError) {
          // Privacy directory doesn't exist or can't be read, skip it
          this.logger.log(`Could not read privacy directory: ${privacyDir}`, 'warn');
        }
      }
    }

    this.logger.log(`Loaded ${allMemories.length} memories across all privacy levels`);
    return allMemories;
  }

  getOrganizationPatterns(): OrganizationPattern[] {
    this.logger.log('Getting organization patterns');

    const files = this.getMemoryFiles();
    const patterns: OrganizationPattern[] = [];
    const categoryStats = new Map<string, CategoryStats>();

    // Analyze existing memory files
    for (const file of files) {
      const category = file.replace('.md', '');
      const filepath = path.join(this.memoriesDir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      
      // Extract titles/sections from the file
      const titles = content.match(/^## (.+)$/gm) || [];
      const examples = titles.map(t => t.replace('## ', '')).slice(0, 3); // First 3 examples
      
      const stats = categoryStats.get(category) || { count: 0, examples: [] };
      stats.count += titles.length;
      stats.examples = [...stats.examples, ...examples].slice(0, 3);
      categoryStats.set(category, stats);
    }

    // Convert to patterns array
    for (const [category, stats] of categoryStats) {
      patterns.push({
        category,
        examples: stats.examples,
        frequency: stats.count
      });
    }

    // Sort by frequency (most used first)
    patterns.sort((a, b) => b.frequency - a.frequency);

    this.logger.log(`Organization patterns analysis complete: ${patterns.length} categories found`);
    return patterns;
  }

  readMemoryFile(filename: string): string {
    const filepath = path.join(this.memoriesDir, filename);
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, 'utf8');
    }
    throw new Error(`Memory file not found: ${filename}`);
  }
}