/**
 * OpenAI Provider - Implementation of AI interfaces using OpenAI API
 */

import OpenAI from 'openai';
import { 
  IChatProvider, 
  IEmbeddingProvider, 
  ChatOptions, 
  ChatResponse, 
  EmbeddingOptions, 
  EmbeddingResponse,
  ChatMessage
} from './ai-interfaces';
import { aiConfig } from '../config/ai-config';
import { LoggerService } from '../services/logger-service';

export class OpenAIChatProvider implements IChatProvider {
  private client: OpenAI;
  private loggerService: LoggerService;
  private model: string;

  constructor(loggerService: LoggerService) {
    this.client = new OpenAI({
      apiKey: aiConfig.getOpenAIApiKey(),
    });
    this.loggerService = loggerService;
    this.model = aiConfig.getChatModel();
    
    this.loggerService.log(`OpenAI Chat Provider initialized with model: ${this.model}`);
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    this.loggerService.trace('OpenAI chat request', { 
      model: options.model, 
      messageCount: options.messages.length,
      stream: options.stream 
    });

    try {
      const completion = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: false, // For now, disable streaming for simplicity
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      });

      const response: ChatResponse = {
        content: completion.choices[0]?.message?.content || '',
        model: completion.model,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
      };

      this.loggerService.trace('OpenAI chat response', {
        model: response.model,
        contentLength: response.content.length,
        usage: response.usage
      });

      return response;
    } catch (error) {
      this.loggerService.error('OpenAI chat request failed', {
        error: error instanceof Error ? error.message : String(error),
        model: options.model,
        messageCount: options.messages.length
      });
      throw error;
    }
  }

  getModelName(): string {
    return this.model;
  }
}

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private client: OpenAI;
  private loggerService: LoggerService;
  private model: string;
  private dimensions: number;

  constructor(loggerService: LoggerService) {
    this.client = new OpenAI({
      apiKey: aiConfig.getOpenAIApiKey(),
    });
    this.loggerService = loggerService;
    this.model = aiConfig.getEmbeddingModel();
    
    // Set dimensions based on model
    this.dimensions = this.getModelDimensions(this.model);
    
    this.loggerService.log(`OpenAI Embedding Provider initialized with model: ${this.model} (${this.dimensions}d)`);
  }

  private getModelDimensions(model: string): number {
    switch (model) {
      case 'text-embedding-3-small':
        return 1536;
      case 'text-embedding-3-large':
        return 3072;
      case 'text-embedding-ada-002':
        return 1536;
      default:
        return 1536; // Default to small model dimensions
    }
  }

  async generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    this.loggerService.trace('OpenAI embedding request', {
      model: options.model,
      inputType: typeof options.input,
      inputLength: Array.isArray(options.input) ? options.input.length : String(options.input).length
    });

    try {
      const embedding = await this.client.embeddings.create({
        model: options.model,
        input: options.input,
        dimensions: options.dimensions || this.dimensions,
      });

      const response: EmbeddingResponse = {
        embedding: embedding.data[0].embedding,
        model: embedding.model,
        usage: embedding.usage ? {
          promptTokens: embedding.usage.prompt_tokens,
          totalTokens: embedding.usage.total_tokens,
        } : undefined,
      };

      this.loggerService.trace('OpenAI embedding response', {
        model: response.model,
        embeddingDimensions: response.embedding.length,
        usage: response.usage
      });

      return response;
    } catch (error) {
      this.loggerService.error('OpenAI embedding request failed', {
        error: error instanceof Error ? error.message : String(error),
        model: options.model,
        inputType: typeof options.input
      });
      throw error;
    }
  }

  getModelName(): string {
    return this.model;
  }

  getDimensions(): number {
    return this.dimensions;
  }
}