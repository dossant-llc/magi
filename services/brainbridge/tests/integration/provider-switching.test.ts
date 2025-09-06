/**
 * Provider Switching Integration Test
 * Tests switching between OpenAI and Ollama providers
 */

import { AIConfigService } from '../../src/config/ai-config';
import { aiProviderFactory } from '../../src/providers/ai-provider-factory';

// Mock the config.js module to respond to test environment variables
jest.mock('../../../../config.js', () => {
  const originalConfig = jest.requireActual('../../../../config.js');
  return {
    ...originalConfig,
    getAIConfig() {
      const provider = process.env.AI_PROVIDER || 'ollama';
      const models = originalConfig.ai.models[provider];
      
      if (!models) {
        // Default to ollama for invalid providers
        return {
          provider: 'ollama',
          chatModel: originalConfig.ai.models.ollama.chat,
          embeddingModel: originalConfig.ai.models.ollama.embedding,
          dimensions: originalConfig.ai.models.ollama.dimensions
        };
      }
      
      return {
        provider,
        chatModel: models.chat,
        embeddingModel: models.embedding,
        dimensions: models.dimensions,
        host: originalConfig.ollama.host,
        port: originalConfig.ollama.port
      };
    }
  };
});

describe('Provider Switching', () => {
  const originalProvider = process.env.AI_PROVIDER;
  let testConfig: AIConfigService;

  beforeEach(() => {
    // Create fresh config instance for each test
    testConfig = new AIConfigService();
  });

  afterEach(() => {
    // Restore original provider
    if (originalProvider) {
      process.env.AI_PROVIDER = originalProvider;
    } else {
      delete process.env.AI_PROVIDER;
    }
  });

  it('should switch to OpenAI provider correctly', () => {
    process.env.AI_PROVIDER = 'openai';
    testConfig = new AIConfigService(); // Recreate with new env
    
    const config = testConfig.getConfig();
    expect(config.provider).toBe('openai');
    expect(config.chatModel).toBe('gpt-4o-mini');
    expect(config.embeddingModel).toBe('text-embedding-3-small');
  });

  it('should switch to Ollama provider correctly', () => {
    process.env.AI_PROVIDER = 'ollama';
    testConfig = new AIConfigService(); // Recreate with new env
    
    const config = testConfig.getConfig();
    expect(config.provider).toBe('ollama');
    expect(config.chatModel).toBe('llama3.2:1b');
    expect(config.embeddingModel).toBe('mxbai-embed-large');
  });

  it('should default to ollama if no provider specified', () => {
    delete process.env.AI_PROVIDER;
    testConfig = new AIConfigService(); // Recreate with new env
    
    const config = testConfig.getConfig();
    expect(config.provider).toBe('ollama');
    expect(config.chatModel).toBe('llama3.2:1b');
    expect(config.embeddingModel).toBe('mxbai-embed-large');
  });

  it('should handle invalid provider gracefully', () => {
    process.env.AI_PROVIDER = 'invalid_provider';
    testConfig = new AIConfigService(); // Recreate with new env
    
    const config = testConfig.getConfig();
    // Should default to ollama for invalid provider
    expect(config.provider).toBe('ollama');
  });

  it('should provide correct index paths for different providers', () => {
    // Test OpenAI paths
    process.env.AI_PROVIDER = 'openai';
    testConfig = new AIConfigService();
    let indexPath = testConfig.getIndexPath('/test/base/path');
    expect(indexPath).toContain('openai');
    
    // Test Ollama paths  
    process.env.AI_PROVIDER = 'ollama';
    testConfig = new AIConfigService();
    indexPath = testConfig.getIndexPath('/test/base/path');
    expect(indexPath).toContain('ollama');
  });
});