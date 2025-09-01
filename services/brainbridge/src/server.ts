#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load root .env configuration
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import express from 'express';
import { LoggerService, MemoryService, AIService } from './services/index.js';
import { MemoryHandler, PatternHandler } from './handlers/index.js';
import { McpRoutes, HealthRoutes } from './routes/index.js';
import { brainXchangeIntegration } from './integrations/brainxchange-integration.js';
import { BrainProxyConnector, BrainProxyConfig } from './services/brain-proxy-connector.js';

class BrainBridgeServer {
  private server: Server;
  private loggerService: LoggerService;
  private memoryService: MemoryService;
  private aiService: AIService;
  private memoryHandler: MemoryHandler;
  private patternHandler: PatternHandler;
  private brainProxyConnector: BrainProxyConnector | null = null;

  constructor() {
    // Initialize services with environment configuration
    const instanceName = process.env.INSTANCE_NAME || 'default';
    const memoriesDir = require('./utils/memory-path').getMemoriesPath();
    const logFile = process.env.LOG_FILE || path.join(__dirname, '..', 'logs', `brainbridge-${instanceName}.log`);
    
    this.loggerService = new LoggerService(logFile);
    this.memoryService = new MemoryService(memoriesDir, this.loggerService);
    this.aiService = new AIService(this.loggerService);
    
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
      url: process.env.BRAIN_PROXY_URL || `wss://${defaultDomain}:8082/bp/connect`,
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
      this.loggerService.winston.info('Received MCP request', {
        component: 'BrainBridgeServer',
        action: 'call_tool',
        requestType: 'CallToolRequest',
        toolName: name,
        args
      });

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
      const tools = [
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
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // AI-powered tool handlers
  private async handleAISaveMemory(args: any) {
    const { content, privacy_level = 'personal', category_hint } = args;
    
    if (!content || typeof content !== 'string') {
      throw new Error('Content is required and must be a string');
    }

    this.loggerService.winston.info('AI Save Memory request', {
      component: 'BrainBridgeServer',
      action: 'ai_save_memory',
      contentLength: content.length,
      contentPreview: content.slice(0, 100),
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
          error: error.message || error
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
  }

  private async handleAIQueryMemories(args: any) {
    const { question, max_privacy = 'personal', limit = 5, synthesis_mode = 'local' } = args;
    
    if (!question || typeof question !== 'string') {
      throw new Error('Question is required and must be a string');
    }

    this.loggerService.winston.info('AI Query Memories request', {
      component: 'BrainBridgeServer',
      action: 'ai_query_memories',
      question,
      synthesis_mode,
      max_privacy,
      limit
    });
    
    if (synthesis_mode === 'raw') {
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
        response += `**[${index + 1}] ${memory.filename}**\n`;
        response += `Category: ${memory.category || 'unknown'} | Tags: ${memory.tags || 'none'}\n`;
        response += `Content: ${memory.content.slice(0, 500)}${memory.content.length > 500 ? '...' : ''}\n`;
        response += `---\n\n`;
      });
      
      response += `*Question: "${question}"*\n\n`;
      response += `**IMPORTANT:** Please provide a direct, clean answer to the question by synthesizing the information from the memories above. Don't just list the raw content - give me a clear, conversational response.`;
      
      return {
        content: [
          {
            type: 'text',
            text: response
          }
        ]
      };
      
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
        
        return {
          content: [
            {
              type: 'text',
              text: response
            }
          ]
        };
      } else {
        throw new Error(`Failed to query memories: ${result.error}`);
      }
    }
  }

  private async handleAIStatus() {
    this.loggerService.winston.info('AI Status check requested', {
      component: 'BrainBridgeServer',
      action: 'ai_status'
    });
    
    const status = await this.aiService.getAIStatus();
    
    let response = '🤖 **mAGIc AI System Status**\n\n';
    
    // Ollama status
    response += '**Local AI Models:**\n';
    if (status.ollama.connected) {
      response += '✅ Ollama: Connected\n';
      const chatModel = status.ollama.models.find(m => m.name === 'llama3.1:8b');
      const embedModel = status.ollama.models.find(m => m.name.includes('mxbai-embed-large'));
      response += `  📊 Chat Model (llama3.1:8b): ${chatModel ? '✅ Available' : '❌ Missing'}\n`;
      response += `  🧠 Embed Model (mxbai-embed-large): ${embedModel ? '✅ Available' : '❌ Missing'}\n`;
    } else {
      response += '❌ Ollama: Not accessible\n';
      response += '   💡 Make sure Ollama is running: `ollama serve`\n';
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
      response += `✅ Index directory exists (${status.index.files.length} files)\n`;
      if (status.index.files.includes('metadata.json')) {
        response += '  📊 Metadata index ready\n';
      }
      if (status.index.files.includes('embeddings.json')) {
        response += '  🧠 Embeddings metadata ready\n';
      }
    } else {
      response += '❌ No vector index found\n';
      response += '   💡 Run `magic index` to build initial index\n';
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

  async runStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.loggerService.winston.info('BrainBridge MCP Server running', {
      component: 'BrainBridgeServer',
      action: 'start_stdio',
      transport: 'stdio'
    });
    console.error('BrainBridge MCP Server running on stdio');
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