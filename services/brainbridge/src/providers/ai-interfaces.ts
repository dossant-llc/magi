/**
 * AI Provider Interfaces - Abstract interfaces for AI operations
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage?: {
    promptTokens?: number;
    totalTokens?: number;
  };
}

export interface EmbeddingOptions {
  model: string;
  input: string | string[];
  dimensions?: number;
}

/**
 * Abstract interface for AI chat operations
 */
export interface IChatProvider {
  chat(options: ChatOptions): Promise<ChatResponse>;
  getModelName(): string;
}

/**
 * Abstract interface for AI embedding operations
 */
export interface IEmbeddingProvider {
  generateEmbedding(options: EmbeddingOptions): Promise<EmbeddingResponse>;
  getModelName(): string;
  getDimensions(): number;
}

/**
 * Provider factory interface
 */
export interface IAIProviderFactory {
  createChatProvider(): IChatProvider;
  createEmbeddingProvider(): IEmbeddingProvider;
}