/**
 * AI Provider Factory - Creates appropriate AI providers based on configuration
 */

import { IChatProvider, IEmbeddingProvider, IAIProviderFactory } from './ai-interfaces';
import { OpenAIChatProvider, OpenAIEmbeddingProvider } from './openai-provider';
import { OllamaChatProvider, OllamaEmbeddingProvider } from './ollama-provider';
import { GeminiEmbeddingProvider } from './gemini-provider';
import { aiConfig, AIProvider } from '../config/ai-config';
import { LoggerService } from '../services/logger-service';

export class AIProviderFactory implements IAIProviderFactory {
  private loggerService: LoggerService;
  private provider: AIProvider;

  constructor(loggerService: LoggerService) {
    this.loggerService = loggerService;
    this.provider = aiConfig.getProvider();
    
    this.loggerService.log(`AI Provider Factory initialized with provider: ${this.provider}`);
  }

  createChatProvider(): IChatProvider {
    switch (this.provider) {
      case 'openai':
        return new OpenAIChatProvider(this.loggerService);
      case 'ollama':
        return new OllamaChatProvider(this.loggerService);
      case 'gemini':
        // Gemini doesn't have chat provider yet, fall back to OpenAI or throw error
        throw new Error(`Chat provider not implemented for Gemini. Use OpenAI or Ollama for chat functionality.`);
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  createEmbeddingProvider(): IEmbeddingProvider {
    switch (this.provider) {
      case 'openai':
        return new OpenAIEmbeddingProvider(this.loggerService);
      case 'ollama':
        return new OllamaEmbeddingProvider(this.loggerService);
      case 'gemini':
        return new GeminiEmbeddingProvider(
          this.loggerService, 
          aiConfig.getGeminiApiKey(),
          aiConfig.getEmbeddingModel()
        );
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  getProviderInfo(): {
    provider: AIProvider;
    chatModel: string;
    embeddingModel: string;
    chatProvider: string;
    embeddingProvider: string;
  } {
    const chatProvider = this.createChatProvider();
    const embeddingProvider = this.createEmbeddingProvider();
    
    return {
      provider: this.provider,
      chatModel: chatProvider.getModelName(),
      embeddingModel: embeddingProvider.getModelName(),
      chatProvider: chatProvider.constructor.name,
      embeddingProvider: embeddingProvider.constructor.name,
    };
  }
}

// Export singleton instance - will be initialized with proper logger in server
let _aiProviderFactoryInstance: AIProviderFactory | null = null;

export function createAIProviderFactory(loggerService: LoggerService): AIProviderFactory {
  if (!_aiProviderFactoryInstance) {
    _aiProviderFactoryInstance = new AIProviderFactory(loggerService);
  }
  return _aiProviderFactoryInstance;
}

export const aiProviderFactory = new AIProviderFactory(new LoggerService('/tmp/ai-provider-factory.log'));