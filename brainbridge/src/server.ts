#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

class BrainBridgeServer {
  private server: Server;
  private memoriesDir = path.join(__dirname, '..', '..', 'memories');

  constructor() {
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

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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
        ],
      };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const knowledgeFiles = this.getMemoryFiles();
      return {
        resources: knowledgeFiles.map(file => ({
          uri: `knowledge://${file}`,
          name: file,
          description: `Knowledge file: ${file}`,
        })),
      };
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      if (uri.startsWith('knowledge://')) {
        const filename = uri.replace('knowledge://', '');
        const filepath = path.join(this.memoriesDir, filename);
        
        if (fs.existsSync(filepath)) {
          const content = fs.readFileSync(filepath, 'utf8');
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
      }
      
      throw new Error(`Resource not found: ${uri}`);
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error('Missing arguments');
      }

      switch (name) {
        case 'search_memories':
          return await this.searchMemories(
            args.query as string, 
            args.category as string | undefined
          );
        case 'add_memory':
          return await this.addMemory(
            args.title as string, 
            args.content as string, 
            args.category as string
          );
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private getMemoryFiles(): string[] {
    if (!fs.existsSync(this.memoriesDir)) {
      fs.mkdirSync(this.memoriesDir, { recursive: true });
      return [];
    }
    
    return fs.readdirSync(this.memoriesDir)
      .filter(file => file.endsWith('.md'))
      .sort();
  }

  private async searchMemories(query: string, category?: string) {
    const files = this.getMemoryFiles();
    const results: Array<{ file: string; matches: string[] }> = [];

    for (const file of files) {
      if (category && !file.toLowerCase().includes(category.toLowerCase())) {
        continue;
      }

      const filepath = path.join(this.memoriesDir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      
      const lines = content.split('\n');
      const matches = lines.filter(line => 
        line.toLowerCase().includes(query.toLowerCase())
      );

      if (matches.length > 0) {
        results.push({ file, matches });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: results.length > 0 
            ? `Found ${results.length} file(s) with matches:\n\n` + 
              results.map(r => 
                `**${r.file}:**\n${r.matches.map(m => `- ${m}`).join('\n')}`
              ).join('\n\n')
            : `No matches found for "${query}"`,
        },
      ],
    };
  }

  private async addMemory(title: string, content: string, category: string) {
    const filename = `${category.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filepath = path.join(this.memoriesDir, filename);
    
    let fileContent = '';
    if (fs.existsSync(filepath)) {
      fileContent = fs.readFileSync(filepath, 'utf8') + '\n\n';
    } else {
      fileContent = `# ${category}\n\n`;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    fileContent += `## ${title}\n${content}\n\n*Added: ${timestamp}*\n`;

    fs.writeFileSync(filepath, fileContent);

    return {
      content: [
        {
          type: 'text',
          text: `Added knowledge "${title}" to ${filename}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('BrainBridge MCP Server running on stdio');
  }
}

const server = new BrainBridgeServer();
server.run().catch(console.error);