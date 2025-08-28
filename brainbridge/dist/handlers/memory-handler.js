"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryHandler = void 0;
class MemoryHandler {
    memoryService;
    constructor(memoryService) {
        this.memoryService = memoryService;
    }
    async searchMemories(query, category) {
        const results = this.memoryService.searchMemories(query, category);
        const responseText = results.length > 0
            ? `Found ${results.length} file(s) with matches:\n\n` +
                results.map(r => `**${r.file}:**\n${r.matches.map(m => `- ${m}`).join('\n')}`).join('\n\n')
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
    async addMemory(title, content, category) {
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
exports.MemoryHandler = MemoryHandler;
