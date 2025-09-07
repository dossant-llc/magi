/**
 * Unit Tests for Gemini Embedding Provider
 */

import { GeminiEmbeddingProvider } from '../gemini-provider';
import { LoggerService } from '../../services/logger-service';
import { EmbeddingOptions } from '../ai-interfaces';

// Mock fetch globally
global.fetch = jest.fn();

describe('GeminiEmbeddingProvider', () => {
  let provider: GeminiEmbeddingProvider;
  let mockLogger: LoggerService;
  const mockApiKey = 'test-gemini-api-key';

  beforeEach(() => {
    // Reset fetch mock
    jest.resetAllMocks();
    
    // Mock logger
    mockLogger = {
      log: jest.fn(),
      trace: jest.fn(),
      error: jest.fn(),
    } as any;

    // Create provider instance
    provider = new GeminiEmbeddingProvider(mockLogger, mockApiKey, 'text-embedding-004');
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(provider.getModelName()).toBe('text-embedding-004');
      expect(provider.getDimensions()).toBe(768);
    });

    it('should throw error when API key is missing', () => {
      expect(() => {
        new GeminiEmbeddingProvider(mockLogger, '');
      }).toThrow('GEMINI_API_KEY is required for Gemini provider');
    });

    it('should handle different models correctly', () => {
      const provider001 = new GeminiEmbeddingProvider(mockLogger, mockApiKey, 'gemini-embedding-001');
      expect(provider001.getModelName()).toBe('gemini-embedding-001');
      expect(provider001.getDimensions()).toBe(3072);
    });
  });

  describe('generateEmbedding', () => {
    const mockEmbeddingResponse = {
      embedding: {
        values: [0.1, 0.2, 0.3, 0.4, 0.5]
      }
    };

    beforeEach(() => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockEmbeddingResponse),
      });
    });

    it('should generate embedding successfully', async () => {
      const options: EmbeddingOptions = {
        model: 'text-embedding-004',
        input: 'test text'
      };

      const result = await provider.generateEmbedding(options);

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        model: 'text-embedding-004',
        usage: undefined
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('text-embedding-004:embedContent'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test text')
        })
      );
    });

    it('should handle array input by taking first element', async () => {
      const options: EmbeddingOptions = {
        model: 'text-embedding-004',
        input: ['first text', 'second text']
      };

      await provider.generateEmbedding(options);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.content.parts[0].text).toBe('first text');
    });

    it('should truncate long input text', async () => {
      const longText = 'a'.repeat(10000); // Exceeds 8000 char limit
      const options: EmbeddingOptions = {
        model: 'text-embedding-004',
        input: longText
      };

      await provider.generateEmbedding(options);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.content.parts[0].text.length).toBe(8000);
    });

    it('should handle rate limit errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded')
      });

      const options: EmbeddingOptions = {
        model: 'text-embedding-004',
        input: 'test text'
      };

      await expect(provider.generateEmbedding(options))
        .rejects.toThrow('Gemini API rate limit exceeded');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request')
      });

      const options: EmbeddingOptions = {
        model: 'text-embedding-004',
        input: 'test text'
      };

      await expect(provider.generateEmbedding(options))
        .rejects.toThrow('Gemini API error (400): Bad request');
    });

    it('should handle invalid response format', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      });

      const options: EmbeddingOptions = {
        model: 'text-embedding-004',
        input: 'test text'
      };

      await expect(provider.generateEmbedding(options))
        .rejects.toThrow('Invalid response format from Gemini API');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const options: EmbeddingOptions = {
        model: 'text-embedding-004',
        input: 'test text'
      };

      await expect(provider.generateEmbedding(options))
        .rejects.toThrow('Network error');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limiting between requests', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          embedding: { values: [0.1, 0.2, 0.3] }
        })
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Set a short delay for testing
      provider.setRequestDelay(100);

      const options: EmbeddingOptions = {
        model: 'text-embedding-004',
        input: 'test text'
      };

      const startTime = Date.now();
      await provider.generateEmbedding(options);
      await provider.generateEmbedding(options);
      const endTime = Date.now();

      // Should take at least 100ms due to rate limiting
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          embedding: { values: [0.1, 0.2, 0.3] }
        })
      });

      const isValid = await provider.validateApiKey();
      expect(isValid).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Invalid API key'));

      const isValid = await provider.validateApiKey();
      expect(isValid).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should update request delay', () => {
      provider.setRequestDelay(5000);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Updated Gemini rate limit delay to 5000ms'
      );
    });

    it('should return correct model name and dimensions', () => {
      expect(provider.getModelName()).toBe('text-embedding-004');
      expect(provider.getDimensions()).toBe(768);
    });
  });
});