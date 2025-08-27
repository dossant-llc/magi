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
import express from 'express';
import { LoggerService, MemoryService, AIService } from './services/index.js';
import { MemoryHandler, PatternHandler } from './handlers/index.js';
import { McpRoutes, HealthRoutes } from './routes/index.js';

class BrainBridgeServer {
  private server: Server;
  private loggerService: LoggerService;
  private memoryService: MemoryService;
  private aiService: AIService;
  private memoryHandler: MemoryHandler;
  private patternHandler: PatternHandler;

  constructor() {
    // Initialize services
    const memoriesDir = path.join(process.cwd(), '..', 'memories');
    const logFile = path.join(__dirname, '..', 'logs', 'brainbridge-mcp.log');
    
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
      memoriesDir,
      logFile
    });
    this.setupHandlers();
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

  private getToolsList() {
    return {
      tools: [
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
      ],
    };
  }

  private getResourcesList() {
    const knowledgeFiles = this.memoryService.getMemoryFiles();
    return {
      resources: knowledgeFiles.map(file => ({
        uri: `knowledge://${file}`,
        name: file,
        description: `Knowledge file: ${file}`,
      })),
    };
  }

  private readResource(uri: string) {
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

  private async handleToolCall(name: string, args: any) {
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
    const { question, max_privacy = 'personal', limit = 5, synthesis_mode = 'raw' } = args;
    
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
      
      response += `*Question: "${question}"*\n`;
      response += `*Please synthesize an answer from the memories above.*`;
      
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
    const mcpRoutes = new McpRoutes(this.memoryService);
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
server.run().catch(console.error);