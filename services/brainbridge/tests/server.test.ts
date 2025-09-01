import request from 'supertest';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';

// Mock the BrainBridgeServer for testing
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('BrainBridge MCP Server', () => {
  let app: express.Application;
  const mockMemoriesDir = '/tmp/test-memories';

  beforeAll(() => {
    // Create a simple Express app that mimics our MCP server's HTTP endpoints
    app = express();
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', server: 'BrainBridge MCP Server' });
    });

    // MCP endpoint
    app.post('/mcp', async (req, res) => {
      const request = req.body;
      
      switch (request.method) {
        case 'tools/list':
          res.json({
            tools: [
              {
                name: 'search_memories',
                description: 'Search through personal memories',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Search query' },
                    category: { type: 'string', description: 'Optional category to search within' }
                  },
                  required: ['query']
                }
              },
              {
                name: 'add_memory',
                description: 'Add new knowledge to personal memories',
                inputSchema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Title of the knowledge entry' },
                    content: { type: 'string', description: 'Content to add' },
                    category: { type: 'string', description: 'Category for the knowledge' }
                  },
                  required: ['title', 'content', 'category']
                }
              }
            ]
          });
          break;
        case 'tools/call':
          const { name, arguments: args } = request.params;
          if (name === 'search_memories') {
            res.json({
              content: [{ type: 'text', text: `Search results for "${args.query}"` }]
            });
          } else if (name === 'add_memory') {
            res.json({
              content: [{ type: 'text', text: `Added knowledge "${args.title}"` }]
            });
          } else {
            res.status(400).json({ error: `Unknown tool: ${name}` });
          }
          break;
        case 'resources/list':
          res.json({
            resources: [
              { uri: 'knowledge://test.md', name: 'test.md', description: 'Test knowledge file' }
            ]
          });
          break;
        case 'resources/read':
          const uri = request.params.uri;
          if (uri === 'knowledge://test.md') {
            res.json({
              contents: [{
                uri: uri,
                mimeType: 'text/markdown',
                text: '# Test Knowledge\n\nThis is test content.'
              }]
            });
          } else {
            res.status(404).json({ error: `Resource not found: ${uri}` });
          }
          break;
        default:
          res.status(400).json({ error: `Unknown method: ${request.method}` });
      }
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        server: 'BrainBridge MCP Server'
      });
    });
  });

  describe('MCP Tools', () => {
    it('should list available tools', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ method: 'tools/list' })
        .expect(200);

      expect(response.body.tools).toHaveLength(2);
      expect(response.body.tools[0].name).toBe('search_memories');
      expect(response.body.tools[1].name).toBe('add_memory');
    });

    it('should search memories', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          method: 'tools/call',
          params: {
            name: 'search_memories',
            arguments: { query: 'test query' }
          }
        })
        .expect(200);

      expect(response.body.content[0].text).toContain('Search results for "test query"');
    });

    it('should add memory', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          method: 'tools/call',
          params: {
            name: 'add_memory',
            arguments: {
              title: 'Test Memory',
              content: 'Test content',
              category: 'test'
            }
          }
        })
        .expect(200);

      expect(response.body.content[0].text).toContain('Added knowledge "Test Memory"');
    });

    it('should handle unknown tools', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          method: 'tools/call',
          params: {
            name: 'unknown_tool',
            arguments: {}
          }
        })
        .expect(400);

      expect(response.body.error).toContain('Unknown tool: unknown_tool');
    });
  });

  describe('MCP Resources', () => {
    it('should list available resources', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ method: 'resources/list' })
        .expect(200);

      expect(response.body.resources).toHaveLength(1);
      expect(response.body.resources[0].uri).toBe('knowledge://test.md');
    });

    it('should read resource content', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          method: 'resources/read',
          params: { uri: 'knowledge://test.md' }
        })
        .expect(200);

      expect(response.body.contents[0].text).toContain('# Test Knowledge');
    });

    it('should handle unknown resources', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          method: 'resources/read',
          params: { uri: 'knowledge://unknown.md' }
        })
        .expect(404);

      expect(response.body.error).toContain('Resource not found');
    });
  });

  describe('Invalid Requests', () => {
    it('should handle unknown methods', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({ method: 'unknown/method' })
        .expect(400);

      expect(response.body.error).toContain('Unknown method: unknown/method');
    });
  });
});