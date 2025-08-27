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
import { LoggerService, MemoryService } from './services/index.js';
import { MemoryHandler, PatternHandler } from './handlers/index.js';
import { McpRoutes, HealthRoutes } from './routes/index.js';

class BrainBridgeServer {
  private server: Server;
  private loggerService: LoggerService;
  private memoryService: MemoryService;
  private memoryHandler: MemoryHandler;
  private patternHandler: PatternHandler;

  constructor() {
    // Initialize services
    const memoriesDir = path.join(__dirname, '..', '..', 'memories');
    const logFile = path.join(__dirname, '..', 'logs', 'brainbridge-mcp.log');
    
    this.loggerService = new LoggerService(logFile);
    this.memoryService = new MemoryService(memoriesDir, this.loggerService);
    
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

    this.loggerService.log('BrainBridge MCP Server initialized');
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.loggerService.log('Received ListToolsRequest');
      return this.getToolsList();
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      this.loggerService.log('Received ListResourcesRequest');
      return this.getResourcesList();
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      this.loggerService.log(`Received ReadResourceRequest for: ${uri}`);
      return this.readResource(uri);
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      this.loggerService.log(`Received CallToolRequest: ${name} with args: ${JSON.stringify(args)}`);

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
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async runStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.loggerService.log('BrainBridge MCP Server running on stdio');
    console.error('BrainBridge MCP Server running on stdio');
  }

  async runHTTP(port: number = 8147) {
    const app = express();
    this.loggerService.log(`Starting BrainBridge MCP Server on HTTP port ${port}`);
    
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