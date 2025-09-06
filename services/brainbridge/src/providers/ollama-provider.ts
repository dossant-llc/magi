/**
 * Ollama Provider - Implementation of AI interfaces using Ollama
 */

import { Ollama } from 'ollama';
import { 
  IChatProvider, 
  IEmbeddingProvider, 
  ChatOptions, 
  ChatResponse, 
  EmbeddingOptions, 
  EmbeddingResponse 
} from './ai-interfaces';
import { aiConfig } from '../config/ai-config';
import { LoggerService } from '../services/logger-service';

export class OllamaChatProvider implements IChatProvider {
  private client: Ollama;
  private loggerService: LoggerService;
  private model: string;

  constructor(loggerService: LoggerService) {
    this.client = new Ollama({ host: aiConfig.getOllamaUrl() });
    this.loggerService = loggerService;
    this.model = aiConfig.getChatModel();
    
    this.loggerService.log(`Ollama Chat Provider initialized with model: ${this.model} at ${aiConfig.getOllamaUrl()}`);
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    this.loggerService.trace('Ollama chat request', { 
      model: options.model, 
      messageCount: options.messages.length,
      stream: options.stream 
    });

    try {
      const response = await this.client.chat({
        model: options.model,
        messages: options.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: false,
      });

      const chatResponse: ChatResponse = {
        content: response.message.content,
        model: options.model, // Ollama doesn't return the model name in response
      };

      this.loggerService.trace('Ollama chat response', {
        model: chatResponse.model,
        contentLength: chatResponse.content.length
      });

      return chatResponse;
    } catch (error) {
      this.loggerService.error('Ollama chat request failed', {
        error: error instanceof Error ? error.message : String(error),
        model: options.model,
        messageCount: options.messages.length,
        ollamaUrl: aiConfig.getOllamaUrl()
      });
      throw error;
    }
  }

  getModelName(): string {
    return this.model;
  }
}

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
  private client: Ollama;
  private loggerService: LoggerService;
  private model: string;
  private dimensions: number;

  constructor(loggerService: LoggerService) {
    this.client = new Ollama({ host: aiConfig.getOllamaUrl() });
    this.loggerService = loggerService;
    this.model = aiConfig.getEmbeddingModel();
    
    // Set dimensions based on model
    this.dimensions = this.getModelDimensions(this.model);
    
    this.loggerService.log(`Ollama Embedding Provider initialized with model: ${this.model} (${this.dimensions}d) at ${aiConfig.getOllamaUrl()}`);
  }

  private getModelDimensions(model: string): number {
    switch (model) {
      case 'mxbai-embed-large':
        return 1024;
      case 'nomic-embed-text':
        return 768;
      case 'all-minilm':
        return 384;
      default:
        return 1024; // Default to mxbai-embed-large dimensions
    }
  }

  async generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    this.loggerService.trace('Ollama embedding request', {
      model: options.model,
      inputType: typeof options.input,
      inputLength: Array.isArray(options.input) ? options.input.length : String(options.input).length
    });

    try {
      // Handle array input by processing first item only (Ollama doesn't support batch)
      const input = Array.isArray(options.input) ? options.input[0] : options.input;
      
      const response = await this.client.embeddings({
        model: options.model,
        prompt: input,
      });

      const embeddingResponse: EmbeddingResponse = {
        embedding: response.embedding,
        model: options.model,
      };

      this.loggerService.trace('Ollama embedding response', {
        model: embeddingResponse.model,
        embeddingDimensions: embeddingResponse.embedding.length
      });

      return embeddingResponse;
    } catch (error) {
      this.loggerService.error('Ollama embedding request failed', {
        error: error instanceof Error ? error.message : String(error),
        model: options.model,
        inputType: typeof options.input,
        ollamaUrl: aiConfig.getOllamaUrl()
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