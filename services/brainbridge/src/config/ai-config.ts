/**
 * AI Configuration - Centralized configuration for AI providers
 */

// Load the main config
const appConfig = require('../../../../config.js');

export type AIProvider = 'ollama' | 'openai' | 'gemini';

export type SynthesisMode = 'raw' | 'local' | 'hybrid';

export interface AIConfig {
  provider: AIProvider;
  chatModel: string;
  embeddingModel: string;
  ollamaHost?: string;
  ollamaPort?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
}

export interface ClientServiceConfig {
  chatgptSynthesisMode: SynthesisMode;
  chatgptForceMode: boolean;
}

export class AIConfigService {
  private config: AIConfig;
  private clientServiceConfig: ClientServiceConfig;

  constructor() {
    this.config = this.loadConfig();
    this.clientServiceConfig = this.loadClientServiceConfig();
    this.validateConfig();
  }

  private loadConfig(): AIConfig {
    // Get AI config from config.js (which already handles env overrides)
    const aiSettings = appConfig.getAIConfig();
    
    const config: AIConfig = {
      provider: aiSettings.provider as AIProvider,
      chatModel: aiSettings.chatModel,
      embeddingModel: aiSettings.embeddingModel,
    };

    // Ollama configuration
    if (config.provider === 'ollama') {
      config.ollamaHost = aiSettings.host || appConfig.ollama.host;
      config.ollamaPort = aiSettings.port || appConfig.ollama.port;
    }

    // OpenAI configuration
    if (config.provider === 'openai') {
      config.openaiApiKey = process.env.OPENAI_API_KEY;
    }

    // Gemini configuration
    if (config.provider === 'gemini') {
      config.geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    }

    return config;
  }

  private loadClientServiceConfig(): ClientServiceConfig {
    return {
      chatgptSynthesisMode: (appConfig.ai.chatgpt.synthesisMode || 'hybrid') as SynthesisMode,
      chatgptForceMode: appConfig.ai.chatgpt.forceMode || false,
    };
  }

  private determineChatModel(provider: AIProvider): string {
    // No longer needed - config.js handles this
    return appConfig.getAIConfig().chatModel;
  }

  private determineEmbeddingModel(provider: AIProvider): string {
    // No longer needed - config.js handles this
    return appConfig.getAIConfig().embeddingModel;
  }

  private validateConfig(): void {
    if (this.config.provider === 'openai' && !this.config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required when AI_PROVIDER=openai');
    }
    if (this.config.provider === 'gemini' && !this.config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required when AI_PROVIDER=gemini');
    }
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  getProvider(): AIProvider {
    return this.config.provider;
  }

  getChatModel(): string {
    return this.config.chatModel;
  }

  getEmbeddingModel(): string {
    return this.config.embeddingModel;
  }

  getOllamaUrl(): string {
    if (this.config.provider !== 'ollama') {
      throw new Error('Ollama URL requested but provider is not ollama');
    }
    return `http://${this.config.ollamaHost}:${this.config.ollamaPort}`;
  }

  getOpenAIApiKey(): string {
    if (this.config.provider !== 'openai') {
      throw new Error('OpenAI API key requested but provider is not openai');
    }
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    return this.config.openaiApiKey;
  }

  getGeminiApiKey(): string {
    if (this.config.provider !== 'gemini') {
      throw new Error('Gemini API key requested but provider is not gemini');
    }
    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }
    return this.config.geminiApiKey;
  }

  getIndexPath(baseIndexPath: string): string {
    return `${baseIndexPath}/${this.config.provider}`;
  }

  // Client Service Configuration Methods
  getClientServiceConfig(): ClientServiceConfig {
    return { ...this.clientServiceConfig };
  }

  getChatGPTSynthesisMode(): SynthesisMode {
    return this.clientServiceConfig.chatgptSynthesisMode;
  }

  getChatGPTForceMode(): boolean {
    return this.clientServiceConfig.chatgptForceMode;
  }
}

// Export singleton instance
export const aiConfig = new AIConfigService();