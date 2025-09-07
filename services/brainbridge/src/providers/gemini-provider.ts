/**
 * Google Gemini Provider - Implementation of embedding interfaces using Google AI Studio
 */

import { 
  IEmbeddingProvider, 
  EmbeddingOptions, 
  EmbeddingResponse 
} from './ai-interfaces';
import { LoggerService } from '../services/logger-service';

export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  private loggerService: LoggerService;
  private model: string;
  private dimensions: number;
  private apiKey: string;
  private baseUrl: string;
  private lastRequestTime: number = 0;
  private requestDelay: number = 12000; // 12 seconds for 5 RPM free tier

  constructor(loggerService: LoggerService, apiKey: string, model?: string) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for Gemini provider');
    }
    
    this.loggerService = loggerService;
    this.apiKey = apiKey;
    this.model = model || 'text-embedding-004';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    
    // Set dimensions based on model
    this.dimensions = this.getModelDimensions(this.model);
    
    this.loggerService.log(`Gemini Embedding Provider initialized with model: ${this.model} (${this.dimensions}d)`);
  }

  private getModelDimensions(model: string): number {
    switch (model) {
      case 'text-embedding-004':
        return 768;
      case 'gemini-embedding-001':
        return 3072; // Can be configured to 1536 or 768
      default:
        return 768; // Default to smaller model dimensions
    }
  }

  /**
   * Rate limiting for free tier (5 requests per minute)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      this.loggerService.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  async generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    this.loggerService.trace('Gemini embedding request', {
      model: options.model,
      inputType: typeof options.input,
      inputLength: Array.isArray(options.input) ? options.input.length : String(options.input).length
    });

    // Enforce rate limiting for free tier
    await this.enforceRateLimit();

    try {
      // Handle array input by processing first item only (Gemini API limitation)
      const input = Array.isArray(options.input) ? options.input[0] : options.input;
      
      // Truncate input if too long (2048 token limit)
      const truncatedInput = this.truncateInput(input);
      
      const requestBody = {
        model: `models/${options.model}`,
        content: {
          parts: [{
            text: truncatedInput
          }]
        }
      };

      const url = `${this.baseUrl}/${options.model}:embedContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          throw new Error(`Gemini API rate limit exceeded: ${errorText}. Consider upgrading to paid tier for higher limits.`);
        }
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as any;

      if (!data.embedding || !data.embedding.values) {
        throw new Error('Invalid response format from Gemini API');
      }

      const embeddingResponse: EmbeddingResponse = {
        embedding: data.embedding.values,
        model: options.model,
        // Gemini doesn't provide token usage in embedding API
        usage: undefined,
      };

      this.loggerService.trace('Gemini embedding response', {
        model: embeddingResponse.model,
        embeddingDimensions: embeddingResponse.embedding.length
      });

      return embeddingResponse;
    } catch (error) {
      this.loggerService.error('Gemini embedding request failed', {
        error: error instanceof Error ? error.message : String(error),
        model: options.model,
        inputType: typeof options.input
      });
      throw error;
    }
  }

  /**
   * Truncate input to stay within token limits (approximate)
   */
  private truncateInput(input: string): string {
    // Rough approximation: 1 token ≈ 4 characters
    // 2048 token limit ≈ 8192 characters
    const maxChars = 8000; // Leave some buffer
    
    if (input.length <= maxChars) {
      return input;
    }
    
    this.loggerService.log(`Truncating input from ${input.length} to ${maxChars} characters`);
    return input.substring(0, maxChars);
  }

  getModelName(): string {
    return this.model;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Set request delay for rate limiting (useful for paid tier)
   */
  setRequestDelay(delayMs: number): void {
    this.requestDelay = delayMs;
    this.loggerService.log(`Updated Gemini rate limit delay to ${delayMs}ms`);
  }

  /**
   * Check if API key is valid by making a simple request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.generateEmbedding({
        model: this.model,
        input: 'test'
      });
      return true;
    } catch (error) {
      this.loggerService.error('Gemini API key validation failed', { error });
      return false;
    }
  }
}