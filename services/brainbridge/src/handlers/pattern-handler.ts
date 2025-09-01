import { MemoryService } from '../services/index.js';
import { ToolResponse, OrganizationPattern } from '../types/index.js';

export class PatternHandler {
  private memoryService: MemoryService;

  constructor(memoryService: MemoryService) {
    this.memoryService = memoryService;
  }

  async getOrganizationPatterns(contentPreview?: string): Promise<ToolResponse> {
    const patterns: OrganizationPattern[] = this.memoryService.getOrganizationPatterns();

    const responseText = patterns.length > 0 
      ? `Found ${patterns.length} organizational patterns:\n\n` + 
        patterns.map(p => 
          `**${p.category}** (${p.frequency} entries)\n${p.examples.map(ex => `- ${ex}`).join('\n')}`
        ).join('\n\n')
      : 'No existing organizational patterns found. This would be your first memory entry!';

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  }
}