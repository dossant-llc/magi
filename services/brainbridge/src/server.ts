#!/usr/bin/env node

// Load root .env configuration BEFORE any other imports
import * as path from 'path';
import * as dotenv from 'dotenv';
import { getProjectRoot } from './utils/magi-paths.js';
dotenv.config({ path: path.join(getProjectRoot(), '.env') });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { LoggerService, MemoryService, AIService, EmbeddingService } from './services/index.js';
import { MemoryHandler, PatternHandler } from './handlers/index.js';
import { McpRoutes, HealthRoutes } from './routes/index.js';
import { brainXchangeIntegration } from './integrations/brainxchange-integration.js';
import { BrainProxyConnector, BrainProxyConfig } from './services/brain-proxy-connector.js';
import { NgrokConnector, NgrokConfig } from './services/ngrok-connector.js';
import { ProviderDetectionService } from './services/provider-detection.js';
import { getLogsDir } from './utils/magi-paths.js';
import { aiConfig } from './config/ai-config.js';

class BrainBridgeServer {
  private server: Server;
  private loggerService: LoggerService;
  private memoryService: MemoryService;
  private aiService: AIService;
  private embeddingService: EmbeddingService;
  private memoryHandler: MemoryHandler;
  private patternHandler: PatternHandler;
  private providerDetectionService: ProviderDetectionService;
  private brainProxyConnector: BrainProxyConnector | null = null;
  private ngrokConnector: NgrokConnector | null = null;
  private aiConfig = aiConfig;

  constructor() {
    // Initialize services with environment configuration
    const instanceName = process.env.INSTANCE_NAME || 'default';
    const memoriesDir = require('./utils/memory-path').getMemoriesPath();
    const logFile = process.env.LOG_FILE || path.join(getLogsDir(), `brainbridge-${instanceName}.log`);
    
    this.loggerService = new LoggerService(logFile);
    this.memoryService = new MemoryService(memoriesDir, this.loggerService);
    this.aiService = new AIService(this.loggerService);
    this.embeddingService = new EmbeddingService(this.loggerService);
    
    // Inject embedding service into memory service for auto-rebuild functionality
    this.memoryService.setEmbeddingService(this.embeddingService);
    
    // Initialize provider detection service
    this.providerDetectionService = new ProviderDetectionService(this.loggerService, this.embeddingService);
    
    // Handle provider changes on startup
    this.initializeProviderDetection();
    
    // Initialize handlers
    this.memoryHandler = new MemoryHandler(this.memoryService);
    this.patternHandler = new PatternHandler(this.memoryService);

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'brainbridge',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.loggerService.winston.info('BrainBridge MCP Server initialized', { 
      component: 'BrainBridgeServer',
      action: 'initialize',
      instanceName,
      memoriesDir,
      logFile
    });
    this.setupHandlers();
    
    // FATAL ERROR CHECK: AI tools must be available
    this.verifyAIToolsOrDie();
  }

  async initializeConnections() {
    // Initialize connections sequentially to avoid WebSocket proxy conflicts
    // Initialize BrainXchange if enabled
    const brainXchangeEnabled = process.env.BRAINXCHANGE_ENABLED?.toLowerCase() !== 'false';
    if (brainXchangeEnabled) {
      await this.initializeBrainXchange();
    } else {
      console.log('🔇 BrainXchange disabled via BRAINXCHANGE_ENABLED=false');
    }
    this.initializeBrainProxy();
    await this.initializeNgrok();
  }

  private async initializeProviderDetection() {
    try {
      this.loggerService.log('🔍 Checking AI provider configuration...');
      
      const providerInfo = this.providerDetectionService.getProviderInfo();
      this.loggerService.log(`Current AI provider: ${providerInfo.provider} (Chat: ${providerInfo.chatModel}, Embedding: ${providerInfo.embeddingModel})`);
      
      const result = await this.providerDetectionService.handleProviderChange();
      
      if (result.rebuilt) {
        this.loggerService.log(`🔄 Embedding index rebuilt for ${providerInfo.provider} provider (${result.stats?.processed} files processed)`);
      } else if (result.success) {
        this.loggerService.log('✅ AI provider configuration verified, no rebuild needed');
      } else {
        this.loggerService.log(`⚠️  Provider detection warning: ${result.error}`);
      }
    } catch (error) {
      this.loggerService.error('Provider detection initialization failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private verifyAIToolsOrDie() {
    // Test if AI tools are properly registered
    const toolsList = this.getToolsList();
    const hasAIQuery = toolsList.tools.some(t => t.name === 'ai_query_memories');
    const hasAISave = toolsList.tools.some(t => t.name === 'ai_save_memory');
    
    this.loggerService.log(`🔍 Tools verification: Found ${toolsList.tools.length} tools`);
    this.loggerService.log(`AI Query tool available: ${hasAIQuery}`);
    this.loggerService.log(`AI Save tool available: ${hasAISave}`);
    
    if (!hasAIQuery || !hasAISave) {
      const error = `🚨 FATAL ERROR: AI-powered tools are not available! 
This is unacceptable - semantic search requires AI tools.
Available tools: ${toolsList.tools.map(t => t.name).join(', ')}
Expected: ai_query_memories, ai_save_memory
Ollama connection: http://${process.env.OLLAMA_HOST}:${process.env.OLLAMA_PORT}`;
      
      this.loggerService.log(error);
      throw new Error(error);
    }
    
    this.loggerService.log('✅ AI tools verification passed');
  }

  private async initializeBrainXchange() {
    // Initialize BrainXchange integration with environment variables
    const userEmail = process.env.BRAINXCHANGE_EMAIL || 'user@example.com';
    const userName = process.env.BRAINXCHANGE_NAME || 'User';
    
    try {
      this.loggerService.winston.info('Initializing BrainXchange integration', {
        component: 'BrainBridgeServer',
        action: 'initialize_brainxchange',
        userEmail,
        userName
      });
      
      await brainXchangeIntegration.initialize(userEmail, userName, this.memoryService);
      
      this.loggerService.winston.info('BrainXchange integration initialized successfully', {
        component: 'BrainBridgeServer',
        action: 'brainxchange_ready',
        userEmail,
        userName
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggerService.winston.warn('BrainXchange integration failed - continuing without', {
        component: 'BrainBridgeServer',
        action: 'brainxchange_failed',
        error: errorMessage,
        userEmail,
        userName
      });
      console.error('⚠️  BrainXchange integration failed:', errorMessage);
      console.error('   Continuing without BrainXchange support...');
    }
  }

  private initializeBrainProxy() {
    // Initialize Brain Proxy connector with environment variables
    const defaultDomain = process.env.AGIFORME_SERVER_DOMAIN || 'localhost';
    const brainProxyConfig: BrainProxyConfig = {
      enabled: process.env.BRAIN_PROXY_ENABLED === 'true',
      url: process.env.BRAIN_PROXY_URL || `wss://${defaultDomain}:9025/bp/connect`,
      secret: process.env.BRAIN_PROXY_SECRET || '',
      route: process.env.BRAIN_PROXY_ROUTE || 'default',
      localMcpUrl: process.env.BRAIN_PROXY_LOCAL_MCP_URL || 'http://localhost:8147/mcp'
    };

    if (!brainProxyConfig.enabled) {
      this.loggerService.winston.info('Brain Proxy connector disabled via configuration', {
        component: 'BrainBridgeServer',
        action: 'brain_proxy_disabled'
      });
      return;
    }

    if (!brainProxyConfig.secret || brainProxyConfig.secret.length < 8) {
      this.loggerService.winston.warn('Brain Proxy disabled - invalid or missing secret', {
        component: 'BrainBridgeServer',
        action: 'brain_proxy_invalid_secret'
      });
      console.error('⚠️  Brain Proxy disabled: BRAIN_PROXY_SECRET must be at least 8 characters');
      return;
    }

    try {
      this.loggerService.winston.info('Initializing Brain Proxy connector', {
        component: 'BrainBridgeServer',
        action: 'initialize_brain_proxy',
        url: brainProxyConfig.url,
        route: brainProxyConfig.route,
        localMcpUrl: brainProxyConfig.localMcpUrl
      });

      this.brainProxyConnector = new BrainProxyConnector(brainProxyConfig, this.loggerService);

      this.loggerService.winston.info('Brain Proxy connector initialized successfully', {
        component: 'BrainBridgeServer',
        action: 'brain_proxy_ready',
        route: brainProxyConfig.route,
        url: brainProxyConfig.url
      });
      
      console.error('🧠 Brain Proxy connector initialized');
      console.error(`   Route: ${brainProxyConfig.route}`);
      console.error(`   Proxy: ${brainProxyConfig.url}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggerService.winston.warn('Brain Proxy initialization failed - continuing without', {
        component: 'BrainBridgeServer',
        action: 'brain_proxy_failed',
        error: errorMessage,
        route: brainProxyConfig.route
      });
      console.error('⚠️  Brain Proxy initialization failed:', errorMessage);
      console.error('   Continuing without Brain Proxy support...');
    }
  }

  private async initializeNgrok() {
    // Load ngrok configuration from config.js
    const appConfig = require('../../../config.js');
    const ngrokConfig: NgrokConfig = {
      enabled: appConfig.server.ngrok.enabled,
      region: appConfig.server.ngrok.region,
      port: appConfig.server.ngrok.port,
      subdomain: appConfig.server.ngrok.subdomain,
      staticDomain: appConfig.server.ngrok.staticDomain,
      basicAuth: appConfig.server.ngrok.basicAuth,
      authToken: process.env.NGROK_AUTH_TOKEN
    };

    if (!ngrokConfig.enabled) {
      this.loggerService.winston.info('Ngrok tunnel disabled via configuration', {
        component: 'BrainBridgeServer',
        action: 'ngrok_disabled'
      });
      return;
    }

    try {
      this.loggerService.winston.info('Initializing ngrok tunnel', {
        component: 'BrainBridgeServer',
        action: 'initialize_ngrok',
        port: ngrokConfig.port,
        region: ngrokConfig.region
      });

      this.ngrokConnector = new NgrokConnector(ngrokConfig, this.loggerService);

      // Start the tunnel
      const status = await this.ngrokConnector.start();

      if (status.connected && status.url) {
        console.error('🌐 Ngrok tunnel established');
        console.error(`   Public URL: ${status.url}`);
        console.error(`   Local Port: ${ngrokConfig.port}`);
        console.error(`   Region: ${ngrokConfig.region}`);
        console.error('');
        console.error('🤖 ChatGPT Configuration:');
        console.error(`   Use this URL in ChatGPT: ${status.url}/mcp`);
        console.error('');
      } else {
        throw new Error(status.error || 'Failed to establish tunnel');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggerService.winston.warn('Ngrok initialization failed - continuing without', {
        component: 'BrainBridgeServer',
        action: 'ngrok_failed',
        error: errorMessage
      });
      console.error('⚠️  Ngrok initialization failed:', errorMessage);
      console.error('   Continuing without direct tunnel support...');
    }
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.loggerService.winston.info('Received MCP request', {
        component: 'BrainBridgeServer',
        action: 'list_tools',
        requestType: 'ListToolsRequest'
      });
      return this.getToolsList();
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      this.loggerService.winston.info('Received MCP request', {
        component: 'BrainBridgeServer',
        action: 'list_resources',
        requestType: 'ListResourcesRequest'
      });
      return this.getResourcesList();
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      this.loggerService.winston.info('Received MCP request', {
        component: 'BrainBridgeServer',
        action: 'read_resource',
        requestType: 'ReadResourceRequest',
        uri
      });
      return this.readResource(uri);
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const timestamp = new Date().toISOString();
      
      this.loggerService.winston.info('Received MCP request', {
        component: 'BrainBridgeServer',
        action: 'call_tool',
        requestType: 'CallToolRequest',
        toolName: name,
        args,
        timestamp
      });
      
      // Log stdio connection activity
      console.error(`📡 [${timestamp}] MCP tool called: ${name} via stdio connection`);

      if (!args) {
        throw new Error('Missing arguments');
      }

      return await this.handleToolCall(name, args);
    });
  }

  getToolsList() {
    try {
      this.loggerService.log('Building tools list...');
      const brainXchangeEnabled = process.env.BRAINXCHANGE_ENABLED?.toLowerCase() !== 'false';
      const tools: any[] = [
        {
          name: 'search_memories',
          description: 'Search through personal memories',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              category: {
                type: 'string',
                description: 'Optional category to search within',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'add_memory',
          description: 'Add new knowledge to personal memories',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Title of the knowledge entry',
              },
              content: {
                type: 'string',
                description: 'Content to add',
              },
              category: {
                type: 'string',
                description: 'Category for the knowledge',
              },
            },
            required: ['title', 'content', 'category'],
          },
        },
        {
          name: 'get_organization_patterns',
          description: 'Get organizational patterns from existing memories to help categorize new entries',
          inputSchema: {
            type: 'object',
            properties: {
              content_preview: {
                type: 'string',
                description: 'Optional preview of content to get more relevant patterns',
              },
            },
            required: [],
          },
        },
        // AI-powered tools (magi wake word functionality)
        {
          name: 'ai_save_memory',
          description: 'WAKE WORD: "magi save [content]" - Save content with AI-powered categorization and tagging using local LLM',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Content to save',
              },
              privacy_level: {
                type: 'string',
                description: 'Privacy level: public, team, personal, private, or sensitive',
                enum: ['public', 'team', 'personal', 'private', 'sensitive'],
                default: 'personal'
              },
              category_hint: {
                type: 'string',
                description: 'Optional hint for AI categorization',
              },
            },
            required: ['content'],
          },
        },
        {
          name: 'ai_query_memories',
          description: 'WAKE WORD: "magi tell me about [question]" - Query memories with AI synthesis and reasoning using local LLM',
          inputSchema: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'Question to ask about your knowledge base',
              },
              max_privacy: {
                type: 'string',
                description: 'Maximum privacy level to search',
                enum: ['public', 'team', 'personal', 'private', 'sensitive'],
                default: 'personal'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of memories to consider',
                default: 5
              },
              synthesis_mode: {
                type: 'string',
                description: 'How to handle response synthesis',
                enum: ['local', 'raw', 'hybrid'],
                default: 'raw'
              },
            },
            required: ['question'],
          },
        },
        {
          name: 'ai_status',
          description: 'WAKE WORD: "magi status" - Get status of local AI system and knowledge base',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'toggle_trace_mode',
          description: 'Toggle trace mode for detailed logging with performance metrics',
          inputSchema: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean',
                description: 'Enable or disable trace mode',
              },
            },
            required: [],
          },
        },
      ];

      // Add BrainXchange tools only if enabled
      if (brainXchangeEnabled) {
        tools.push({
          name: 'brainxchange_command',
          description: 'Handle BrainXchange P2P communication commands (magi create invite, magi connect, magi ask)',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'BrainXchange command to execute',
              },
            },
            required: ['command'],
          },
        });
      }

      // Add Brain Proxy command tool
      tools.push({
        name: 'brain_proxy_command',
        description: 'Handle Brain Proxy connection commands (enable, disable, status)',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Brain Proxy command to execute: enable, disable, or status',
            },
          },
          required: ['command'],
        },
      });
      
      this.loggerService.log(`Built ${tools.length} tools successfully`);
      return { tools };
      
    } catch (error) {
      const errorMsg = `🚨 FATAL ERROR building tools list: ${error}`;
      this.loggerService.log(errorMsg);
      console.error(errorMsg);
      throw new Error(errorMsg); // NO MORE FALLBACKS - FAIL HARD
    }
  }

  getResourcesList() {
    const knowledgeFiles = this.memoryService.getMemoryFiles();
    return {
      resources: knowledgeFiles.map(file => ({
        uri: `knowledge://${file}`,
        name: file,
        description: `Knowledge file: ${file}`,
      })),
    };
  }

  readResource(uri: string) {
    if (uri.startsWith('knowledge://')) {
      const filename = uri.replace('knowledge://', '');
      const content = this.memoryService.readMemoryFile(filename);
      return {
        contents: [
          {
            uri: uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    }
    
    throw new Error(`Resource not found: ${uri}`);
  }

  async handleToolCall(name: string, args: any) {
    switch (name) {
      case 'search_memories':
        return await this.memoryHandler.searchMemories(
          args.query as string, 
          args.category as string | undefined
        );
      case 'add_memory':
        return await this.memoryHandler.addMemory(
          args.title as string, 
          args.content as string, 
          args.category as string
        );
      case 'get_organization_patterns':
        return await this.patternHandler.getOrganizationPatterns(args.content_preview as string | undefined);
      
      // AI-powered tools (magi wake word functionality)
      case 'ai_save_memory':
        return await this.handleAISaveMemory(args);
      case 'ai_query_memories':
        return await this.handleAIQueryMemories(args);
      case 'ai_status':
        return await this.handleAIStatus();
      case 'toggle_trace_mode':
        return await this.handleToggleTraceMode(args);
      case 'brainxchange_command':
        return await this.handleBrainXchangeCommand(args);
      case 'brain_proxy_command':
        return await this.handleBrainProxyCommand(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // AI-powered tool handlers
  private async handleAISaveMemory(args: any) {
    try {
      const { content, privacy_level = 'personal', category_hint } = args;
      
      if (!content || typeof content !== 'string') {
        throw new Error('Content is required and must be a string');
      }

      // Safe content preview with error handling
      let contentPreview = '';
      let contentLength = 0;
      try {
        const safeContent = String(content);
        contentLength = safeContent.length;
        contentPreview = safeContent.slice(0, 100);
      } catch (previewError) {
        this.loggerService.error('Error creating content preview for save', { error: previewError });
        contentPreview = 'Content preview unavailable';
      }

      this.loggerService.winston.info('AI Save Memory request', {
        component: 'BrainBridgeServer',
        action: 'ai_save_memory',
        contentLength,
        contentPreview,
        privacy_level,
        category_hint
      });
      
      // Start async save process in background
      this.aiService.saveMemoryWithAI(content, privacy_level, category_hint)
        .then(result => {
          if (result.success) {
            this.loggerService.winston.info('Background save completed', {
              component: 'BrainBridgeServer',
              action: 'ai_save_memory_complete',
              filePath: result.filePath,
              category: result.aiAnalysis?.category,
              tags: result.aiAnalysis?.tags,
              title: result.aiAnalysis?.title
            });
          } else {
            this.loggerService.winston.error('Background save failed', {
              component: 'BrainBridgeServer',
              action: 'ai_save_memory_failed',
              error: result.error
            });
          }
        })
        .catch(error => {
          this.loggerService.winston.error('Background save error', {
            component: 'BrainBridgeServer',
            action: 'ai_save_memory_error',
            error: error instanceof Error ? error.message : String(error)
          });
        });
      
      // Return immediately with acknowledgment
      return {
        content: [
          {
            type: 'text',
            text: `✅ **Memory queued for saving!**\n\n📝 Processing with AI categorization...\n🔒 Privacy level: ${privacy_level}\n\nThe memory is being analyzed and will be saved shortly. You can continue working while this processes in the background.${category_hint ? `\n💡 Category hint: ${category_hint}` : ''}`
          }
        ]
      };
    } catch (error) {
      this.loggerService.error('AI Save Memory failed with error', { 
        error: error instanceof Error ? error.message : String(error),
        content: args.content ? 'content provided' : 'no content',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error saving memory**\n\n**Details:** ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\nPlease check your content and try again.`
          }
        ]
      };
    }
  }

  private async handleAIQueryMemories(args: any) {
    try {
      const { question, max_privacy = 'personal', limit = 5, synthesis_mode = 'local' } = args;

      // Get synthesis mode from config
      const configSynthesisMode = this.aiConfig.getChatGPTSynthesisMode();
      const forceMode = this.aiConfig.getChatGPTForceMode();
      const effectiveSynthesisMode = forceMode ? configSynthesisMode : synthesis_mode;

      if (!question || typeof question !== 'string') {
        throw new Error('Question is required and must be a string');
      }

      // Enhanced logging for expensive ChatGPT queries
      this.loggerService.winston.info('AI Query Memories request', {
        component: 'BrainBridgeServer',
        action: 'ai_query_memories',
        question,
        synthesis_mode: effectiveSynthesisMode,
        requestedMode: synthesis_mode,
        configMode: configSynthesisMode,
        forceMode,
        max_privacy,
        limit,
        fullRequestPayload: JSON.stringify({
          jsonrpc: '2.0',
          id: 'chatgpt-request',
          method: 'ai_query_memories',
          params: { question, synthesis_mode: effectiveSynthesisMode, max_privacy, limit }
        }, null, 2),
        timestamp: new Date().toISOString(),
        source: 'ChatGPT-via-BrainProxy',
        performanceMode: forceMode ? `FORCE_${configSynthesisMode.toUpperCase()}` : 'NORMAL'
      });
      
      if (effectiveSynthesisMode === 'raw') {
        // Fast mode: Just return the raw memories, let Claude do synthesis
        const rawResult = await this.aiService.searchMemoriesOnly(question, max_privacy, limit);
        
        if (rawResult.memories.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `**No relevant memories found for:** "${question}"\n\nSearched privacy levels up to: ${max_privacy}`
              }
            ]
          };
        }
        
        // Format raw memories for Claude to synthesize
        let response = `**Found ${rawResult.memories.length} relevant memories:**\n\n`;
        
        rawResult.memories.forEach((memory, index) => {
          try {
            response += `**[${index + 1}] ${memory.filename || 'Unknown file'}**\n`;
            response += `Category: ${memory.category || 'unknown'} | Tags: ${memory.tags || 'none'}\n`;
            
            // Safe content handling with multiple fallbacks
            let contentPreview = 'No content available';
            try {
              if (memory.content && typeof memory.content === 'string' && memory.content.length > 0) {
                contentPreview = memory.content.slice(0, 500);
                if (memory.content.length > 500) {
                  contentPreview += '...';
                }
              }
            } catch (contentError) {
              this.loggerService.error('Error processing memory content', { memoryIndex: index, error: contentError });
              contentPreview = 'Content processing error';
            }
            
            response += `Content: ${contentPreview}\n`;
            response += `---\n\n`;
          } catch (memoryError) {
            this.loggerService.error('Error formatting memory', { memoryIndex: index, error: memoryError });
            response += `**[${index + 1}] Error processing memory**\n---\n\n`;
          }
        });
        
        response += `*Question: "${question}"*\n\n`;
        response += `**IMPORTANT:** Please provide a direct, clean answer to the question by synthesizing the information from the memories above. Don't just list the raw content - give me a clear, conversational response.`;

        const responsePayload = {
          content: [
            {
              type: 'text',
              text: response
            }
          ]
        };

        // Enhanced response logging for ChatGPT queries (raw mode)
        this.loggerService.winston.info('AI Query Memories response (raw mode)', {
          component: 'BrainBridgeServer',
          action: 'ai_query_memories_response',
          question,
          memoriesFound: rawResult.memories.length,
          responsePayload: JSON.stringify(responsePayload, null, 2),
          responseTextLength: response.length,
          synthesis_mode,
          timestamp: new Date().toISOString(),
          source: 'BrainBridge-to-ChatGPT'
        });

        return responsePayload;
        
      } else {
      // Full mode: Use local AI synthesis (slow but private)
      const result = await this.aiService.queryMemoriesWithAI(question, max_privacy, limit);
      
      if (result.success) {
        let response = `**Answer:**\n${result.answer}\n\n`;
        
        if (result.sources && result.sources.length > 0) {
          response += `**Sources (${result.memoryCount} memories found):**\n`;
          result.sources.forEach((source, index) => {
            response += `${index + 1}. ${source}\n`;
          });
        } else {
          response += `*No relevant memories found in your knowledge base.*`;
        }

        const fullResponsePayload = {
          content: [
            {
              type: 'text',
              text: response
            }
          ]
        };

        // Enhanced response logging for ChatGPT queries (hybrid/full mode)
        this.loggerService.winston.info('AI Query Memories response (hybrid mode)', {
          component: 'BrainBridgeServer',
          action: 'ai_query_memories_response',
          question,
          memoriesFound: result.memoryCount,
          aiAnswer: result.answer,
          responsePayload: JSON.stringify(fullResponsePayload, null, 2),
          responseTextLength: response.length,
          synthesis_mode: effectiveSynthesisMode,
          requestedMode: synthesis_mode,
          configMode: configSynthesisMode,
          forceMode,
          timestamp: new Date().toISOString(),
          source: 'BrainBridge-to-ChatGPT',
          performanceMode: forceMode ? `FORCE_${configSynthesisMode.toUpperCase()}` : 'NORMAL'
        });

        return fullResponsePayload;
      } else {
        throw new Error(`Failed to query memories: ${result.error}`);
      }
    }
    } catch (error) {
      this.loggerService.error('AI Query Memories failed with error', { 
        error: error instanceof Error ? error.message : String(error),
        question: args.question,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error processing your query**: "${args.question || 'unknown'}"\n\n**Details:** ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\nPlease try again or contact support if the issue persists.`
          }
        ]
      };
    }
  }

  private async handleAIStatus() {
    this.loggerService.winston.info('AI Status check requested', {
      component: 'BrainBridgeServer',
      action: 'ai_status'
    });
    
    const status = await this.aiService.getAIStatus();
    
    let response = '🤖 **mAGIc AI System Status**\n\n';
    
    // Provider status
    const providerInfo = this.providerDetectionService.getProviderInfo();
    response += `**AI Provider:** ${providerInfo.provider.toUpperCase()}\n`;
    response += `  📊 Chat Model: ${providerInfo.chatModel}\n`;
    response += `  🧠 Embedding Model: ${providerInfo.embeddingModel}\n`;
    response += `  📁 Index Path: ${providerInfo.indexPath}\n\n`;
    
    // Provider connection status
    response += '**Connection Status:**\n';
    if (status.provider.connected) {
      response += `✅ ${status.provider.name}: Connected\n`;
      if (status.provider.models && status.provider.models.length > 0) {
        status.provider.models.forEach(model => {
          const modelInfo = typeof model.size !== 'undefined' 
            ? `${model.name} (${(model.size / 1e9).toFixed(1)}GB)` 
            : `${model.name} (${model.type || 'available'})`;
          response += `  ✅ ${modelInfo}\n`;
        });
      }
    } else {
      response += `❌ ${status.provider.name}: Not accessible\n`;
      if (providerInfo.provider === 'ollama') {
        response += '   💡 Make sure Ollama is running: `ollama serve`\n';
      } else if (providerInfo.provider === 'openai') {
        response += '   💡 Check your OPENAI_API_KEY environment variable\n';
      }
    }
    
    // Memory storage
    response += '\n**Knowledge Base:**\n';
    const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
    for (const level of privacyLevels) {
      const count = status.memories[level] || 0;
      response += `  ${level.padEnd(9)}: ${count} memories\n`;
    }
    response += `  **Total**: ${status.memories.total} memories\n`;
    
    // Index status
    response += '\n**Vector Index:**\n';
    if (status.index.exists) {
      response += `✅ ${status.index.provider?.toUpperCase() || 'Provider'} index exists (${status.index.files.length} files)\n`;
      if (status.index.files.some(f => f.includes('embeddings.txt'))) {
        response += '  🧠 Vector embeddings ready\n';
      }
    } else {
      response += `❌ No ${status.index.provider?.toUpperCase() || 'provider'} vector index found\n`;
      response += '   💡 Run `magic index` to build initial index\n';
    }

    // Connection status
    response += '\n**Connection Options:**\n';

    // Brain Proxy status
    if (this.brainProxyConnector) {
      const bpStatus = this.brainProxyConnector.getStatus();
      if (bpStatus.connected) {
        response += `✅ Brain Proxy: Connected (route: ${bpStatus.route})\n`;
      } else {
        response += `❌ Brain Proxy: Disconnected\n`;
      }
    } else {
      response += `⚪ Brain Proxy: Disabled\n`;
    }

    // Ngrok tunnel status
    if (this.ngrokConnector) {
      const ngrokStatus = this.ngrokConnector.getStatus();
      if (ngrokStatus.connected && ngrokStatus.url) {
        response += `✅ Ngrok Tunnel: Active\n`;
        response += `   🌐 Public URL: ${ngrokStatus.url}\n`;
        response += `   🤖 ChatGPT URL: ${ngrokStatus.url}/mcp\n`;
      } else {
        response += `❌ Ngrok Tunnel: ${ngrokStatus.error || 'Not connected'}\n`;
      }
    } else {
      response += `⚪ Ngrok Tunnel: Disabled\n`;
    }

    response += '\n**Available Commands:**\n';
    response += '- `ai_save_memory` - Save content with AI categorization\n';
    response += '- `ai_query_memories` - Ask questions about your knowledge\n';
    response += '- `ai_status` - Check system status\n';
    
    return {
      content: [
        {
          type: 'text',
          text: response
        }
      ]
    };
  }

  private async handleToggleTraceMode(args: any) {
    const { enabled } = args;
    const isCurrentlyEnabled = this.loggerService.isTraceModeEnabled();
    
    if (enabled !== undefined) {
      this.loggerService.setTraceMode(enabled);
    } else {
      // Toggle if no value provided
      this.loggerService.setTraceMode(!isCurrentlyEnabled);
    }
    
    const newState = this.loggerService.isTraceModeEnabled();
    
    return {
      content: [
        {
          type: 'text',
          text: `🔍 **Trace Mode ${newState ? 'Enabled' : 'Disabled'}**\n\n${
            newState 
              ? '✅ Detailed logging enabled:\n- Performance metrics (timers)\n- Trace-level details\n- Operation flow tracking\n\nCheck logs with: `npm run logs`'
              : '⚡ Standard logging mode:\n- Basic operations only\n- Better performance\n- Less log noise'
          }\n\n**Current state:** ${newState ? 'ON' : 'OFF'}`
        }
      ]
    };
  }

  private async handleBrainXchangeCommand(args: any) {
    const { command } = args;
    
    if (!command || typeof command !== 'string') {
      throw new Error('Command is required and must be a string');
    }

    this.loggerService.winston.info('BrainXchange command received', {
      component: 'BrainBridgeServer',
      action: 'brainxchange_command',
      command
    });
    
    try {
      const response = await brainXchangeIntegration.handleCommand(command);
      
      if (response) {
        return {
          content: [
            {
              type: 'text',
              text: response
            }
          ]
        };
      } else {
        // Not a BrainXchange command
        return {
          content: [
            {
              type: 'text',
              text: `❓ Unknown BrainXchange command: "${command}"\n\n${brainXchangeIntegration.getHelpText()}`
            }
          ]
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggerService.winston.error('BrainXchange command failed', {
        component: 'BrainBridgeServer',
        action: 'brainxchange_command_error',
        command,
        error: errorMessage
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ BrainXchange command failed: ${errorMessage}`
          }
        ]
      };
    }
  }

  private async handleBrainProxyCommand(args: any) {
    const { command } = args;
    
    if (!command || typeof command !== 'string') {
      throw new Error('Command is required and must be a string');
    }
    
    this.loggerService.winston.info('Brain Proxy command received', {
      component: 'BrainBridgeServer',
      action: 'brain_proxy_command',
      command
    });

    try {
      const normalizedCommand = command.toLowerCase().trim();
      
      switch (normalizedCommand) {
        case 'enable':
          if (this.brainProxyConnector) {
            this.brainProxyConnector.enable();
            return {
              content: [
                {
                  type: 'text',
                  text: '✅ BrainProxy enabled and connecting...'
                }
              ]
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: '⚠️  BrainProxy connector not initialized (check BRAIN_PROXY_SECRET and other config)'
                }
              ]
            };
          }
          
        case 'disable':
          if (this.brainProxyConnector) {
            this.brainProxyConnector.disable();
            return {
              content: [
                {
                  type: 'text',
                  text: '🔇 BrainProxy disabled'
                }
              ]
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: '⚠️  BrainProxy connector not initialized'
                }
              ]
            };
          }
          
        case 'status':
          if (this.brainProxyConnector) {
            const status = this.brainProxyConnector.getStatus();
            const statusEmoji = status.connected ? '🟢' : '🔴';
            const connectionStatus = status.connected ? 'Connected' : 'Disconnected';
            
            return {
              content: [
                {
                  type: 'text',
                  text: `${statusEmoji} BrainProxy Status: ${connectionStatus}\n` +
                        `Route: ${status.route}\n` +
                        `Reconnect attempts: ${status.attempts}`
                }
              ]
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: '🔴 BrainProxy connector not initialized'
                }
              ]
            };
          }
          
        default:
          return {
            content: [
              {
                type: 'text',
                text: `❓ Unknown BrainProxy command: "${command}"\n\n` +
                      `Available commands:\n` +
                      `• enable - Enable BrainProxy connection\n` +
                      `• disable - Disable BrainProxy connection\n` +
                      `• status - Show BrainProxy connection status`
              }
            ]
          };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggerService.winston.error('Brain Proxy command failed', {
        component: 'BrainBridgeServer',
        action: 'brain_proxy_command_error',
        command,
        error: errorMessage
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ BrainProxy command failed: ${errorMessage}`
          }
        ]
      };
    }
  }

  async runStdio() {
    const transport = new StdioServerTransport();
    
    // Log when a connection is opened
    transport.onclose = () => {
      const timestamp = new Date().toISOString();
      this.loggerService.winston.info('MCP stdio connection closed', {
        component: 'BrainBridgeServer',
        action: 'stdio_disconnect',
        timestamp
      });
      console.error(`📡 [${timestamp}] MCP stdio connection closed`);
    };
    
    await this.server.connect(transport);
    
    const timestamp = new Date().toISOString();
    this.loggerService.winston.info('BrainBridge MCP Server running', {
      component: 'BrainBridgeServer',
      action: 'start_stdio',
      transport: 'stdio',
      timestamp
    });
    console.error('BrainBridge MCP Server running on stdio');
    console.error(`📡 [${timestamp}] MCP stdio connection established - ready for Claude Code`);
    console.error('🔄 File watching enabled - server will restart on code changes');
    
    // Show AI synthesis mode based on actual provider
    const providerInfo = this.providerDetectionService.getProviderInfo();
    const synthesisModeMsg = providerInfo.provider === 'openai' 
      ? `🧠 AI Synthesis Mode: CLOUD (using ${providerInfo.chatModel} for conversational responses)`
      : `🧠 AI Synthesis Mode: LOCAL (using ${providerInfo.chatModel} for conversational responses)`;
    console.error(synthesisModeMsg);
  }

  async runHTTP(port: number = 8147) {
    const app = express();
    this.loggerService.winston.info('Starting BrainBridge MCP Server', {
      component: 'BrainBridgeServer',
      action: 'start_http',
      transport: 'http',
      port
    });
    
    app.use(express.json());
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });

    // Use route handlers
    const mcpRoutes = new McpRoutes(this);
    const healthRoutes = new HealthRoutes();
    
    app.use(mcpRoutes.getRouter());
    app.use(healthRoutes.getRouter());

    app.listen(port, () => {
      console.error(`BrainBridge MCP Server running on HTTP port ${port}`);
      console.error(`API endpoint: http://localhost:${port}/mcp`);
      console.error(`Health check: http://localhost:${port}/health`);
    });
  }

  async run() {
    const args = process.argv.slice(2);
    const mode = args[0] || 'http';
    const port = parseInt(args[1]) || 8147;

    switch (mode) {
      case 'stdio':
        await this.runStdio();
        break;
      case 'http':
      default:
        await this.runHTTP(port);
        break;
    }
  }
}

const server = new BrainBridgeServer();
// Initialize connections sequentially, then start the server
server.initializeConnections().then(() => {
  server.run().catch(console.error);
}).catch(console.error);