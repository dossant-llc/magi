import { Router } from 'express';
import { MemoryHandler, PatternHandler } from '../handlers/index.js';
import { MemoryService } from '../services/index.js';

export class McpRoutes {
  private memoryHandler: MemoryHandler;
  private patternHandler: PatternHandler;
  private memoryService: MemoryService;

  constructor(memoryService: MemoryService) {
    this.memoryService = memoryService;
    this.memoryHandler = new MemoryHandler(memoryService);
    this.patternHandler = new PatternHandler(memoryService);
  }

  getRouter(): Router {
    const router = Router();

    // Main MCP endpoint
    router.post('/mcp', async (req, res) => {
      try {
        const request = req.body;
        let response;

        switch (request.method) {
          case 'tools/list':
            response = this.getToolsList();
            break;
          case 'tools/call':
            response = await this.handleToolCall(request.params);
            break;
          case 'resources/list':
            response = this.getResourcesList();
            break;
          case 'resources/read':
            response = this.readResource(request.params.uri);
            break;
          default:
            return res.status(400).json({ error: `Unknown method: ${request.method}` });
        }

        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    return router;
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

  private async handleToolCall(params: any) {
    const { name, arguments: args } = params;

    switch (name) {
      case 'search_memories':
        return await this.memoryHandler.searchMemories(args.query, args.category);
      case 'add_memory':
        return await this.memoryHandler.addMemory(args.title, args.content, args.category);
      case 'get_organization_patterns':
        return await this.patternHandler.getOrganizationPatterns(args.content_preview);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
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
    } else {
      throw new Error(`Invalid resource URI: ${uri}`);
    }
  }
}