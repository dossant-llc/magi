/**
 * AI Service Unit Tests
 */

import { AIService } from '../../src/services/ai-service';
import { LoggerService } from '../../src/services/logger-service';
import * as path from 'path';

describe('AIService', () => {
  let aiService: AIService;
  let loggerService: LoggerService;

  beforeEach(() => {
    const logPath = path.join(__dirname, '..', '..', 'logs', 'test.log');
    loggerService = new LoggerService(logPath);
    aiService = new AIService(loggerService);
  });

  describe('searchMemoriesOnly', () => {
    it('should search memories without AI synthesis', async () => {
      const result = await aiService.searchMemoriesOnly('beer');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.memories)).toBe(true);
    }, 10000);

    it('should find beer-related memories when searching for beer', async () => {
      const result = await aiService.searchMemoriesOnly('beer');
      
      expect(result.success).toBe(true);
      expect(result.memories.length).toBeGreaterThan(0);
      
      // Check that at least one memory contains beer-related content
      const hasBeerContent = result.memories.some(memory => 
        memory.content.toLowerCase().includes('beer') ||
        memory.content.toLowerCase().includes('blue moon')
      );
      expect(hasBeerContent).toBe(true);
    }, 10000);

    it('should respect privacy levels', async () => {
      const publicResult = await aiService.searchMemoriesOnly('beer', 'public');
      const personalResult = await aiService.searchMemoriesOnly('beer', 'personal');
      
      expect(publicResult.success).toBe(true);
      expect(personalResult.success).toBe(true);
      
      // Personal privacy level should include more or equal memories
      expect(personalResult.memories.length).toBeGreaterThanOrEqual(publicResult.memories.length);
    }, 10000);

    it('should handle empty search results gracefully', async () => {
      const result = await aiService.searchMemoriesOnly('nonexistentqueryterm12345');
      
      expect(result.success).toBe(true);
      expect(result.memories.length).toBe(0);
    }, 10000);
  });

  describe('queryMemoriesWithAI', () => {
    it('should provide AI synthesis for beer preference query', async () => {
      const result = await aiService.queryMemoriesWithAI('What is my favorite beer?');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      if (result.memoryCount && result.memoryCount > 0) {
        expect(result.answer).toBeDefined();
        expect(typeof result.answer).toBe('string');
        expect(result.answer!.length).toBeGreaterThan(0);
        expect(result.sources).toBeDefined();
        expect(Array.isArray(result.sources)).toBe(true);
        
        // Should mention Blue Moon in the answer
        expect(result.answer!.toLowerCase()).toContain('blue moon');
      } else {
        // If no memories found, should indicate that
        expect(result.answer).toContain('couldn\'t find');
      }
    }, 15000);
  });
});