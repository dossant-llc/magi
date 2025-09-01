import { MemoryService } from '../services/index.js';
import { ToolResponse, SearchResult } from '../types/index.js';

export class MemoryHandler {
  private memoryService: MemoryService;

  constructor(memoryService: MemoryService) {
    this.memoryService = memoryService;
  }

  async searchMemories(query: string, category?: string): Promise<ToolResponse> {
    const results: SearchResult[] = this.memoryService.searchMemories(query, category);

    const responseText = results.length > 0 
      ? `Found ${results.length} file(s) with matches:\n\n` + 
        results.map(r => 
          `**${r.file}:**\n${r.matches.map(m => `- ${m}`).join('\n')}`
        ).join('\n\n')
      : `No matches found for "${query}"`;

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  }

  async addMemory(title: string, content: string, category: string): Promise<ToolResponse> {
    const entry = { title, content, category };
    this.memoryService.addMemory(entry);

    const filename = `${category.toLowerCase().replace(/\s+/g, '-')}.md`;
    
    return {
      content: [
        {
          type: 'text',
          text: `Added knowledge "${title}" to ${filename}`,
        },
      ],
    };
  }
}