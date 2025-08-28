"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternHandler = void 0;
class PatternHandler {
    memoryService;
    constructor(memoryService) {
        this.memoryService = memoryService;
    }
    async getOrganizationPatterns(contentPreview) {
        const patterns = this.memoryService.getOrganizationPatterns();
        const responseText = patterns.length > 0
            ? `Found ${patterns.length} organizational patterns:\n\n` +
                patterns.map(p => `**${p.category}** (${p.frequency} entries)\n${p.examples.map(ex => `- ${ex}`).join('\n')}`).join('\n\n')
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
exports.PatternHandler = PatternHandler;
