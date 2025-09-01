import * as fs from 'fs';
import * as path from 'path';
import { MemoryEntry, SearchResult, OrganizationPattern, CategoryStats } from '../types/index.js';
import { LoggerService } from './logger-service.js';

export class MemoryService {
  private memoriesDir: string;
  private logger: LoggerService;

  constructor(memoriesDir: string, logger: LoggerService) {
    this.memoriesDir = memoriesDir;
    this.logger = logger;
  }

  getMemoryFiles(): string[] {
    if (!fs.existsSync(this.memoriesDir)) {
      fs.mkdirSync(this.memoriesDir, { recursive: true });
      return [];
    }
    
    return fs.readdirSync(this.memoriesDir)
      .filter(file => file.endsWith('.md'))
      .sort();
  }

  searchMemories(query: string, category?: string): SearchResult[] {
    this.logger.log(`Searching memories: query="${query}", category="${category || 'any'}", memoriesDir="${this.memoriesDir}"`);
    
    const files = this.getMemoryFiles();
    this.logger.log(`Found ${files.length} memory files: ${files.join(', ')}`);
    
    const results: SearchResult[] = [];

    for (const file of files) {
      if (category && !file.toLowerCase().includes(category.toLowerCase())) {
        continue;
      }

      const filepath = path.join(this.memoriesDir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      
      const lines = content.split('\n');
      const matches = lines.filter(line => 
        line.toLowerCase().includes(query.toLowerCase())
      );

      if (matches.length > 0) {
        results.push({ file, matches });
        this.logger.log(`Found ${matches.length} matches in ${file}`);
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