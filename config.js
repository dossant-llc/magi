/**
 * mAGI Configuration
 * 
 * This file contains all NON-SECRET configuration options.
 * Secrets (API keys, passwords) should go in .env file.
 * 
 * Environment variables can override any setting here.
 */

// Strong .env reader utility - bypasses process.env for consistent provider detection
function getProviderFromDotEnv() {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return 'ollama'; // default
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Look for AI_PROVIDER=value, ignore comments
      if (trimmed.startsWith('AI_PROVIDER=') && !trimmed.startsWith('#')) {
        const value = trimmed.split('=')[1]?.trim() || 'ollama';
        return value;
      }
    }
  } catch (error) {
    // If any error reading file, fall back to default
  }

  return 'ollama'; // default if not found
}

// Load preferences with fallback to defaults
function loadPreferences() {
  const fs = require('fs');
  const path = require('path');
  const prefsPath = path.join(__dirname, 'data', 'memories', 'profiles', 'default', 'preferences.json');

  try {
    if (fs.existsSync(prefsPath)) {
      const prefsContent = fs.readFileSync(prefsPath, 'utf8');
      return JSON.parse(prefsContent);
    }
  } catch (error) {
    // If any error reading/parsing preferences, return empty object
    console.warn('Could not load preferences.json:', error.message);
  }

  return {}; // Return empty object if no preferences or error
}

// Load preferences once at module load
const preferences = loadPreferences();

module.exports = {
  // AI Provider Configuration
  ai: {
    // Single selector: 'ollama', 'openai', or 'gemini' from .env
    // This automatically selects the correct model bundle - no mixing possible!
    // STRONG READ: Bypasses process.env to ensure consistency across all processes
    provider: getProviderFromDotEnv(),
    
    // AI Synthesis Configuration
    // Controls whether to use the same provider for AI query synthesis
    synthesis: {
      // 'auto' = use same as main provider, 'local' = force ollama, 'cloud' = force openai
      mode: process.env.AI_SYNTHESIS_MODE || 'auto',
      // Performance: OpenAI is faster but costs money, Ollama is free but slower
      preferPerformance: process.env.AI_SYNTHESIS_PREFER_PERFORMANCE !== 'false'
    },

    // ChatGPT Query Synthesis Mode Configuration
    // Controls how ChatGPT queries are processed for demos and performance
    chatgpt: {
      // Synthesis mode for ChatGPT queries: 'raw', 'local', 'hybrid'
      // 'raw' = fastest, ChatGPT does synthesis
      // 'local' = slowest, local AI does synthesis
      // 'hybrid' = most impressive, local AI + ChatGPT synthesis
      synthesisMode: process.env.CHATGPT_SYNTHESIS_MODE || 'hybrid',
      // Force override requested mode (for demos)
      forceMode: process.env.CHATGPT_FORCE_MODE === 'true'
    },
    
    // Model configurations by provider
    // AI_PROVIDER is the ONLY selector - keeps models consistent
    models: {
      ollama: {
        chat: 'llama3.2:1b',
        embedding: 'mxbai-embed-large',
        dimensions: 1024
      },
      openai: {
        chat: 'gpt-4o-mini',
        embedding: 'text-embedding-3-small',
        dimensions: 1536
      },
      gemini: {
        chat: null, // Gemini chat not implemented yet
        embedding: 'text-embedding-004',
        dimensions: 768
      }
    }
  },

  // Ollama Configuration
  ollama: {
    host: process.env.OLLAMA_HOST || '127.0.0.1',
    port: process.env.OLLAMA_PORT || '11434'
  },

  // Memory Storage Configuration
  memories: {
    // Location: 'project' (in repo) or 'documents' (user's Documents folder)
    location: process.env.MEMORIES_LOCATION || 'project'
  },

  // Development Configuration
  development: {
    nodeEnv: process.env.NODE_ENV || 'development',
    instanceName: process.env.INSTANCE_NAME || 'local-instance',
    logFile: process.env.LOG_FILE || 'logs/brainbridge-local.log'
  },

  // Server Configuration (optional - for cloud features)
  // All cloud features are DISABLED by default for local-first experience
  server: {
    domain: process.env.AGIFORME_SERVER_DOMAIN || 'your-server.com',
    
    // BrainCloud Configuration (cloud sync)
    brainCloud: {
      enabled: process.env.BRAINCLOUD_ENABLED === 'true',  // Default: false
      url: process.env.BRAINCLOUD_URL || `wss://${process.env.AGIFORME_SERVER_DOMAIN || 'your-server.com'}`
    },

    // BrainXchange Configuration (P2P Memory Sharing)
    // Preferences override: preferences.connectionMethods.brainXchange.enabled
    brainXchange: {
      enabled: preferences.connectionMethods?.brainXchange?.enabled ?? (process.env.BRAINXCHANGE_ENABLED === 'true'),
      email: process.env.BRAINXCHANGE_EMAIL || 'user@example.com',
      name: process.env.BRAINXCHANGE_NAME || 'User Name',
      server: process.env.BRAINXCHANGE_SERVER || `ws://${process.env.AGIFORME_SERVER_DOMAIN || 'your-server.com'}:8082/bx`
    },

    // Brain Proxy Configuration (Custom GPT Integration)
    // Preferences override: preferences.connectionMethods.brainProxy.enabled
    brainProxy: {
      enabled: preferences.connectionMethods?.brainProxy?.enabled ?? (process.env.BRAIN_PROXY_ENABLED === 'true'),
      url: process.env.BRAIN_PROXY_URL || `ws://${process.env.AGIFORME_SERVER_DOMAIN || 'your-server.com'}:8082/bp/connect`,
      route: process.env.BRAIN_PROXY_ROUTE || 'default-user',
      localMcpUrl: process.env.BRAIN_PROXY_LOCAL_MCP_URL || 'http://localhost:8147/mcp'
      // Note: BRAIN_PROXY_SECRET should be in .env as it's a secret
    },

    // Ngrok Tunnel Configuration (Direct ChatGPT Connection)
    // Preferences override: preferences.connectionMethods.ngrok.enabled
    ngrok: {
      enabled: preferences.connectionMethods?.ngrok?.enabled ?? false, // Default: false (removed from .env)
      region: process.env.NGROK_REGION || 'us',        // us, eu, ap, au, sa, jp, in
      port: 8147,                                      // BrainBridge HTTP port
      subdomain: process.env.NGROK_SUBDOMAIN,          // Custom subdomain (paid feature)
      staticDomain: process.env.NGROK_STATIC_DOMAIN,   // Reserved domain (paid feature)
      // Basic Authentication (ChatGPT compatible)
      basicAuth: {
        enabled: process.env.NGROK_BASIC_AUTH_ENABLED === 'true', // Default: false
        username: process.env.NGROK_BASIC_AUTH_USER,              // Username for basic auth
        password: process.env.NGROK_BASIC_AUTH_PASS               // Password for basic auth
      },
      // Note: NGROK_AUTH_TOKEN should be in .env as it's a secret (for paid features)
    }
  },

  // Helper function to get AI-specific config
  // AI_PROVIDER is the single selector - automatically picks correct models
  getAIConfig() {
    const provider = this.ai.provider;
    const models = this.ai.models[provider];
    
    if (!models) {
      throw new Error(`Unsupported AI provider: ${provider}. Valid options: ${Object.keys(this.ai.models).join(', ')}`);
    }

    // Determine synthesis provider based on mode
    let synthesisProvider = provider; // default to main provider
    if (this.ai.synthesis.mode === 'local') {
      synthesisProvider = 'ollama';
    } else if (this.ai.synthesis.mode === 'cloud') {
      synthesisProvider = 'openai';
    }
    // 'auto' mode uses the main provider

    const config = {
      provider,
      chatModel: models.chat,
      embeddingModel: models.embedding,
      dimensions: models.dimensions,
      synthesis: {
        provider: synthesisProvider,
        mode: this.ai.synthesis.mode,
        preferPerformance: this.ai.synthesis.preferPerformance
      }
    };

    // Add provider-specific settings
    if (provider === 'ollama') {
      config.host = this.ollama.host;
      config.port = this.ollama.port;
    }

    return config;
  }
};