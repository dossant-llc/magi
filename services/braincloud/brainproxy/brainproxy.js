const WebSocket = require('ws');
const url = require('url');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

class BrainProxyService {
  constructor(logMessage, port = 8082) {
    this.logMessage = logMessage;
    this.port = port;
    
    // Brain Proxy storage
    this.connectors = new Map(); // route -> {ws, lastSeen, metadata}
    this.pendingRequests = new Map(); // requestId -> {resolve, reject, timeout}
    this.authSessions = new Map(); // sessionId -> {route, secret, expires}
    
    // Statistics tracking
    this.stats = {
      totalRequests: 0,
      offlineResponses: 0,
      connectedBrains: 0,
      startTime: Date.now()
    };

    this.logMessage('info', `🧠 Brain Proxy Service initialized`, { 
      Component: 'BrainProxy',
      Port: port
    });

    // Clean up stale connections and expired sessions
    setInterval(() => {
      const now = Date.now();
      const staleTimeout = 5 * 60 * 1000; // 5 minutes
      
      for (const [route, connector] of this.connectors) {
        if (now - connector.lastSeen > staleTimeout) {
          this.logMessage('info', `🧹 Cleaning up stale Brain Proxy connector`, { Route: route });
          connector.ws.terminate();
          this.connectors.delete(route);
          this.stats.connectedBrains = this.connectors.size;
        }
      }
      
      // Clean up expired auth sessions
      for (const [sessionId, session] of this.authSessions) {
        if (now > session.expires) {
          this.logMessage('info', `🧹 Cleaning up expired auth session`, { SessionId: sessionId });
          this.authSessions.delete(sessionId);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  handleHttpRequest(req, res, parsedUrl) {
    const path = parsedUrl.pathname.substring(4); // Remove /bp/ prefix
    
    if (req.method === 'OPTIONS') {
      // Handle CORS preflight for all paths
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end();
    } else if (req.method === 'GET' && path === 'health') {
      this.handleHealthCheck(req, res);
    } else if (req.method === 'GET' && path === 'openapi.json') {
      this.handleOpenAPISchema(req, res);
    } else if (req.method === 'GET' && path === 'privacy') {
      this.handlePrivacyPolicy(req, res);
    } else if (req.method === 'GET' && path === 'claude') {
      // Claude.ai endpoint info
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        service: 'AGIfor.me Claude Interface',
        version: '1.0.0',
        usage: {
          authenticate: 'POST {"message": "magi auth [6-digit-code]"}',
          command: 'POST {"message": "magi [command]", "sessionId": "[session-id]"}'
        },
        getCode: 'Run "magi status" locally to get today\'s auth code'
      }));
    } else if (req.method === 'GET' && path === 'claude-api.json') {
      // OpenAPI spec for Claude.ai
      this.handleClaudeAPISchema(req, res);
    } else if (req.method === 'POST' && path.startsWith('rpc/')) {
      const route = path.substring(4); // Remove 'rpc/' prefix
      this.handleRPCRequest(req, res, route);
    } else if (req.method === 'POST' && path === 'mcp') {
      this.handleMCPRequest(req, res);
    } else if (req.method === 'POST' && path === 'claude') {
      this.handleClaudeRequest(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Brain Proxy endpoint not found');
    }
  }

  handleWebSocketConnection(ws, req, parsedUrl) {
    const path = parsedUrl.pathname.substring(4); // Remove /bp/ prefix
    
    if (path === 'connect') {
      this.handleBrainConnectorConnection(ws, req, parsedUrl);
    } else {
      this.logMessage('warn', `🚨 Unknown Brain Proxy WebSocket path`, { Path: parsedUrl.pathname });
      ws.close(4004, 'Unknown Brain Proxy path');
    }
  }

  handleHealthCheck(req, res) {
    const connectedRoutes = Array.from(this.connectors.keys());
    const healthData = {
      status: 'online',
      service: 'AGIfor.me Brain Proxy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      connectedBrains: connectedRoutes.length,
      routes: connectedRoutes,
      stats: this.getStats()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthData, null, 2));
  }

  handleOpenAPISchema(req, res) {
    const schema = {
      openapi: '3.1.0',
      info: {
        title: 'AGIfor.me Brain Proxy',
        description: `Access your personal AI memory bank through AGIfor.me.

**Authentication Required:**
- Header: \`Authorization: Bearer <your-personal-brain-key>\` with your personal brain access key (minimum 16 characters)
- Route: Use your unique route identifier (e.g., your username or email)
- Connection: Your local BrainBridge must be connected with matching key and route

**Setup Instructions:**
1. Generate a unique brain key (UUID or secure random string)
2. Configure your local BrainBridge with this key and your chosen route
3. Use Bearer token authentication: \`Authorization: Bearer <your-key>\`
4. Use your route identifier in the URL path: \`/rpc/{your-route}\``,
        version: '1.0.4'
      },
      servers: [
        {
          url: `${process.env.BRAINCLOUD_PROTOCOL || 'https'}://${process.env.BRAINCLOUD_DOMAIN || 'hub.m.agifor.me'}${process.env.BRAIN_PROXY_HTTP_PATH || '/bp'}`,
          description: 'AGIfor.me Brain Proxy'
        }
      ],
      components: {
        schemas: {},
        securitySchemes: {
          BrainKeyAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Your personal brain access key as Bearer token'
          }
        }
      },
      security: [
        {
          BrainKeyAuth: []
        }
      ],
      paths: {
        '/rpc/_auto': {
          post: {
            summary: 'Execute brain command',
            operationId: 'executeBrainCommand',
            'x-openai-isConsequential': false,
            description: 'Execute commands on your personal brain. The route is automatically extracted from your composite API key (format: route:secret).',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['id', 'method'],
                    properties: {
                      id: {
                        type: 'string',
                        description: 'Unique request identifier',
                        example: 'req-12345'
                      },
                      method: {
                        type: 'string',
                        enum: [
                          'search_memories',
                          'add_memory', 
                          'ai_query_memories',
                          'ai_save_memory',
                          'ai_status'
                        ],
                        description: 'Brain operation to perform'
                      },
                      params: {
                        type: 'object',
                        description: 'Method-specific parameters - include the fields relevant to your chosen method',
                        properties: {
                          // For search_memories
                          query: {
                            type: 'string',
                            description: 'Search query for memories (required for search_memories)',
                            example: 'React performance tips'
                          },
                          category: {
                            type: 'string',
                            description: 'Optional category to search within (for search_memories)',
                            example: 'programming'
                          },
                          // For ai_query_memories  
                          question: {
                            type: 'string',
                            description: 'Question to ask about your knowledge base (required for ai_query_memories)',
                            example: 'What do I know about React performance optimization?'
                          },
                          limit: {
                            type: 'number',
                            description: 'Maximum number of memories to consider (for ai_query_memories)',
                            example: 5,
                            default: 5
                          },
                          max_privacy: {
                            type: 'string',
                            enum: ['public', 'team', 'personal', 'private', 'sensitive'],
                            description: 'Maximum privacy level to search (for ai_query_memories)',
                            default: 'personal'
                          },
                          synthesis_mode: {
                            type: 'string',
                            enum: ['local', 'raw', 'hybrid'],
                            description: 'Response synthesis mode (for ai_query_memories): local=AI synthesized answer, raw=return memories for external synthesis, hybrid=both',
                            default: 'raw'
                          },
                          // For add_memory
                          title: {
                            type: 'string',
                            description: 'Title of the memory (required for add_memory)',
                            example: 'React Performance Optimization'
                          },
                          content: {
                            type: 'string',
                            description: 'Content to store (required for add_memory and ai_save_memory)',
                            example: 'Using React.memo() significantly improved component performance by preventing unnecessary re-renders.'
                          },
                          // For ai_save_memory
                          category_hint: {
                            type: 'string',
                            description: 'Optional hint for AI categorization (for ai_save_memory)',
                            example: 'programming'
                          },
                          privacy_level: {
                            type: 'string',
                            enum: ['public', 'team', 'personal', 'private', 'sensitive'],
                            description: 'Privacy level (for ai_save_memory)',
                            default: 'personal'
                          }
                        }
                      }
                    },
                    examples: [
                      {
                        summary: 'Search memories',
                        value: {
                          id: 'req-search-123',
                          method: 'search_memories',
                          params: {
                            query: 'React performance optimization',
                            category: 'programming'
                          }
                        }
                      },
                      {
                        summary: 'AI query memories',
                        value: {
                          id: 'req-ai-query-456',
                          method: 'ai_query_memories',
                          params: {
                            question: 'What have I learned about React performance?',
                            limit: 5
                          }
                        }
                      },
                      {
                        summary: 'Save memory',
                        value: {
                          id: 'req-save-789',
                          method: 'ai_save_memory',
                          params: {
                            content: 'React.memo() prevents unnecessary re-renders and improves performance.',
                            category_hint: 'programming'
                          }
                        }
                      },
                      {
                        summary: 'Check status',
                        value: {
                          id: 'req-status-101',
                          method: 'ai_status',
                          params: {}
                        }
                      }
                    ]
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        result: { type: 'object' },
                        error: { type: 'string' }
                      }
                    }
                  }
                }
              },
              '503': {
                description: 'Brain offline - limited capacity mode',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        result: {
                          type: 'object',
                          properties: {
                            content: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  type: { type: 'string' },
                                  text: { type: 'string' }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(schema, null, 2));
  }

  handleClaudeAPISchema(req, res) {
    const schema = {
      openapi: '3.1.0',
      info: {
        title: 'AGIfor.me Personal AI Assistant',
        description: 'Access your personal AI memory bank through AGIfor.me',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'https://hub.m.agifor.me/bp',
          description: 'AGIfor.me Brain Proxy'
        }
      ],
      paths: {
        '/claude': {
          post: {
            summary: 'Send commands to your personal AI assistant',
            operationId: 'sendCommand',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        description: 'Your message to the AI assistant'
                      },
                      sessionId: {
                        type: 'string',
                        description: 'Session ID from authentication (optional for auth commands)'
                      }
                    },
                    required: ['message']
                  },
                  examples: {
                    authenticate: {
                      summary: 'Authenticate with daily code',
                      value: {
                        message: 'magi auth ABC123'
                      }
                    },
                    search: {
                      summary: 'Search your memories',
                      value: {
                        message: 'magi search my favorite restaurants',
                        sessionId: 'your-session-id'
                      }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: {
                          type: 'boolean'
                        },
                        message: {
                          type: 'string'
                        },
                        sessionId: {
                          type: 'string',
                          description: 'Session ID for future requests (returned on auth)'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(schema, null, 2));
  }

  handlePrivacyPolicy(req, res) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🧠 AGIfor.me Brain Proxy - Privacy Policy</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            line-height: 1.6; 
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .content {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #1d1d1f; 
            margin-bottom: 30px; 
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        h2 { color: #667eea; margin-top: 40px; margin-bottom: 20px; }
        .highlight { 
            background: linear-gradient(135deg, #667eea20, #764ba220); 
            padding: 20px; 
            border-radius: 12px; 
            margin: 20px 0; 
            border-left: 4px solid #667eea;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            color: white;
            text-decoration: none;
            border-radius: 20px;
            transition: all 0.3s ease;
        }
        .back-link:hover {
            background: rgba(255,255,255,0.3);
        }
    </style>
</head>
<body>
    <a href="/" class="back-link">← Back to BrainCloud</a>
    
    <div class="content">
        <h1>🧠 AGIfor.me Brain Proxy - Privacy Policy</h1>
        
        <div class="highlight">
            <strong>Last Updated:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Service:</strong> AGIfor.me Brain Proxy<br>
            <strong>Purpose:</strong> Bridge between Custom GPTs and local AGIfor.me instances
        </div>

        <h2>🔒 Data Collection & Storage</h2>
        <p><strong>No Data Persistence:</strong> The Brain Proxy service acts as a real-time bridge only. We do not store, log, or persist any of your personal data, memories, or conversations.</p>
        
        <p><strong>Transit Only:</strong> Your data passes through our proxy server only during active requests and is immediately forwarded to your local AGIfor.me system. No copies are made or retained.</p>

        <h2>🛡️ Security & Privacy</h2>
        <ul>
            <li><strong>Route Isolation:</strong> Each user gets a unique route identifier for secure access</li>
            <li><strong>No Logging:</strong> Personal data and memory contents are never logged</li>
            <li><strong>Temporary Processing:</strong> Requests are processed in memory and discarded immediately</li>
            <li><strong>Local Control:</strong> Your memories remain on your local system - the proxy only facilitates access</li>
        </ul>

        <h2>📡 Technical Operation</h2>
        <p>The Brain Proxy:</p>
        <ul>
            <li>Receives HTTPS requests from Custom GPTs</li>
            <li>Forwards them to your local AGIfor.me system via WebSocket</li>
            <li>Returns the response back to the GPT</li>
            <li>Discards all data immediately after transmission</li>
        </ul>

        <h2>🎯 Limited Capacity Mode</h2>
        <p>When your local AGIfor.me system is offline, the proxy returns helpful "limited capacity" responses without accessing any personal data.</p>

        <h2>📞 Contact</h2>
        <p>For questions about this privacy policy or the Brain Proxy service, please contact us through the AGIfor.me GitHub repository.</p>

        <div class="highlight">
            <strong>Key Principle:</strong> Your memories and personal data never leave your local system except to fulfill your direct requests through Custom GPTs. The Brain Proxy is a secure, temporary bridge that respects your privacy.
        </div>
    </div>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  handleRPCRequest(req, res, route) {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const request = JSON.parse(body);
        
        if (!request.id || !request.method) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing id or method' }));
          return;
        }

        // Validate authentication - support composite key format (route:secret)
        let brainKey;
        let extractedRoute;
        let extractedSecret;
        
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          brainKey = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
        
        if (!brainKey) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            id: request.id,
            error: 'Unauthorized: Missing Authorization Bearer token' 
          }));
          return;
        }
        
        // Parse composite key format: route:secret
        if (brainKey.includes(':')) {
          const parts = brainKey.split(':');
          extractedRoute = parts[0];
          extractedSecret = parts[1];
          
          // If route is _auto, use the route from the API key
          if (route === '_auto') {
            route = extractedRoute;
            this.logMessage('info', `🔑 Auto-routing from composite API key`, {
              ExtractedRoute: extractedRoute
            });
          } else {
            // Still extract the secret for validation
            this.logMessage('info', `🔑 Using composite API key with explicit route`, {
              ExtractedRoute: extractedRoute,
              URLRoute: route
            });
          }
        } else {
          // Fallback to old format (just secret)
          extractedSecret = brainKey;
          
          if (route === '_auto') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              id: request.id,
              error: 'Bad Request: _auto route requires composite API key format (route:secret)' 
            }));
            return;
          }
        }
        
        if (!extractedSecret || extractedSecret.length < 16) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            id: request.id,
            error: 'Unauthorized: Invalid API key format or secret too short' 
          }));
          return;
        }
        
        this.stats.totalRequests++;
        
        this.logMessage('info', `🧠 Brain Proxy RPC request`, {
          Route: route,
          Method: request.method,
          ID: request.id.substring(0, 8)
        });
        
        const connector = this.connectors.get(route);
        
        // Verify the brain key matches the connector's key
        // Use extractedSecret for comparison (from composite key parsing)
        const secretToCompare = extractedSecret || brainKey;
        if (connector && connector.token !== secretToCompare) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            id: request.id,
            error: 'Forbidden: Brain key does not match registered route' 
          }));
          return;
        }
        
        if (!connector || connector.ws.readyState !== WebSocket.OPEN) {
          // Brain offline - return limited capacity response
          this.stats.offlineResponses++;
          
          const limitedResponse = {
            id: request.id,
            result: {
              content: [{
                type: 'text',
                text: `🧠 **AGIfor.me Brain Status: Limited Capacity**

Your external brain is currently offline. I can help with:
- General knowledge and reasoning  
- Code assistance and problem solving
- Writing and analysis tasks

For access to your personal memories and knowledge base, please ensure your local AGIfor.me system is running and connected.

**Status:** Brain route '${route}' is not connected
**Time:** ${new Date().toLocaleString()}
**Available via:** BrainCloud Platform`
              }]
            }
          };
          
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(limitedResponse, null, 2));
          return;
        }
        
        // Forward to local brain connector
        const response = await this.forwardToBrainConnector(connector, request);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
        
      } catch (error) {
        this.logMessage('error', `Brain Proxy RPC error: ${error.message}`, { Route: route });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          id: 'unknown',
          error: 'Internal server error' 
        }));
      }
    });
  }

  forwardToBrainConnector(connector, request) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error('Request timeout'));
      }, 30000); // 30 second timeout
      
      this.pendingRequests.set(request.id, { resolve, reject, timeout });
      
      // Send request to local brain connector
      connector.ws.send(JSON.stringify(request));
    });
  }

  handleBrainConnectorConnection(ws, req, parsedUrl) {
    const query = parsedUrl.query;
    const token = query.token;
    const route = query.route || 'default';
    
    // Simple token validation
    if (!token || token.length < 8) {
      this.logMessage('warn', `🚨 Brain Proxy connection rejected - invalid token`, { Route: route });
      ws.close(4001, 'Unauthorized: Invalid token');
      return;
    }
    
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const location = clientIp.includes('127.0.0.1') || clientIp.includes('::1') ? 'localhost' : 'remote';
    
    this.logMessage('info', `🧠 Brain Proxy connector registered`, { 
      Route: route, 
      From: location,
      Token: token.substring(0, 8) + '***'
    });
    
    // Register connector
    this.connectors.set(route, {
      ws: ws,
      lastSeen: Date.now(),
      route: route,
      token: token,
      location: location
    });
    
    this.stats.connectedBrains = this.connectors.size;
    
    // Handle messages from brain connector (responses to our RPC requests)
    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        
        if (response.id && this.pendingRequests.has(response.id)) {
          const pending = this.pendingRequests.get(response.id);
          clearTimeout(pending.timeout);
          pending.resolve(response);
          this.pendingRequests.delete(response.id);
          
          this.logMessage('info', `🧠 Brain Proxy response received`, {
            Route: route,
            ID: response.id.substring(0, 8),
            HasResult: !!response.result,
            HasError: !!response.error
          });
        }
      } catch (error) {
        this.logMessage('error', `Brain Proxy message parse error: ${error.message}`, { Route: route });
      }
    });
    
    // Handle disconnect
    ws.on('close', () => {
      this.connectors.delete(route);
      this.stats.connectedBrains = this.connectors.size;
      this.logMessage('info', `🧠 Brain Proxy connector disconnected`, { Route: route });
      
      // Reject any pending requests for this connector
      for (const [requestId, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Connector disconnected'));
        this.pendingRequests.delete(requestId);
      }
    });
    
    // Send welcome message
    ws.send(JSON.stringify({ 
      type: 'bp_connected',
      route: route,
      timestamp: new Date().toISOString()
    }));
    
    // Update last seen periodically
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const connector = this.connectors.get(route);
        if (connector) {
          connector.lastSeen = Date.now();
          ws.ping();
        }
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 30 seconds
  }

  getStats() {
    const now = Date.now();
    const uptimeMs = now - this.stats.startTime;
    const uptimeMinutes = Math.floor(uptimeMs / 60000);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    
    let uptimeStr;
    if (uptimeHours > 0) {
      uptimeStr = `${uptimeHours}h ${uptimeMinutes % 60}m`;
    } else {
      uptimeStr = `${uptimeMinutes}m`;
    }

    return {
      connectedBrains: this.connectors.size,
      totalRequests: this.stats.totalRequests,
      offlineResponses: this.stats.offlineResponses,
      uptime: uptimeStr,
      routes: Array.from(this.connectors.keys()),
      pendingRequests: this.pendingRequests.size,
      activeSessions: this.authSessions.size
    };
  }
  
  validateAuthCode(authCode) {
    // Generate today's auth code for each connected brain
    const crypto = require('crypto');
    const today = new Date().toISOString().split('T')[0];
    
    for (const [route, connector] of this.connectors) {
      const expectedCode = crypto.createHash('sha256')
        .update(`${route}:${connector.token}:${today}`)
        .digest('hex')
        .substring(0, 6)
        .toUpperCase();
      
      if (authCode === expectedCode) {
        this.logMessage('info', `🔐 Auth code validated for route ${route}`, { 
          Date: today
        });
        return { route, secret: connector.token };
      }
    }
    
    return null;
  }
  
  createAuthSession(route, secret) {
    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    this.authSessions.set(sessionId, {
      route,
      secret,
      expires,
      created: Date.now()
    });
    
    this.logMessage('info', `🔐 Created auth session for route ${route}`, { 
      SessionId: sessionId.substring(0, 8),
      ExpiresIn: '24h'
    });
    
    return sessionId;
  }

  handleClaudeRequest(req, res) {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { message, sessionId } = JSON.parse(body);
        
        // Handle "magi auth [code]" pattern
        const authMatch = message.match(/^magi auth\s+([A-Z0-9]{6})$/i);
        if (authMatch) {
          const authCode = authMatch[1].toUpperCase();
          const credentials = this.validateAuthCode(authCode);
          
          if (credentials) {
            const newSessionId = this.createAuthSession(credentials.route, credentials.secret);
            res.writeHead(200, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
              success: true,
              sessionId: newSessionId,
              message: `✅ Authenticated! You can now use magi commands for 24 hours.`
            }));
          } else {
            res.writeHead(401, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
              success: false,
              message: `❌ Invalid auth code. Get today's code with: magi status`
            }));
          }
          return;
        }
        
        // Handle "magi [command]" pattern for authenticated sessions
        const commandMatch = message.match(/^magi\s+(.+)$/i);
        if (commandMatch && sessionId) {
          const session = this.authSessions.get(sessionId);
          
          if (!session || Date.now() > session.expires) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: `❌ Session expired. Authenticate again with: magi auth [code]`
            }));
            return;
          }
          
          // Forward command to BrainBridge (simplified for now)
          const command = commandMatch[1];
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `🧙 Received command: ${command}\n\n(Command forwarding to BrainBridge coming soon)`
          }));
          return;
        }
        
        // Invalid format
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: `❓ Send "magi auth [code]" to authenticate or "magi [command]" to use.`
        }));
        
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Invalid JSON format'
        }));
      }
    });
  }

  handleMCPRequest(req, res) {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const request = JSON.parse(body);
        
        // MCP protocol validation
        if (!request.method) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            jsonrpc: '2.0',
            id: request.id || null,
            error: { code: -32600, message: 'Invalid Request: Missing method' }
          }));
          return;
        }

        // Extract authentication - support both composite key and OAuth-style
        const authHeader = req.headers.authorization;
        const url = new URL(req.url, `http://${req.headers.host}`);
        const routeFromUrl = url.searchParams.get('route');
        let brainKey, extractedRoute, extractedSecret;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          brainKey = authHeader.substring(7);
        }
        
        if (!brainKey) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            jsonrpc: '2.0',
            id: request.id || null,
            error: { code: -32000, message: 'Unauthorized: Missing Authorization Bearer token' }
          }));
          return;
        }
        
        // Check for OAuth-style: route from URL, secret from Authorization header
        if (routeFromUrl && !brainKey.includes(':')) {
          extractedRoute = routeFromUrl;
          extractedSecret = brainKey;
        }
        // Parse composite key format: route:secret (existing format)
        else if (brainKey.includes(':')) {
          const parts = brainKey.split(':');
          extractedRoute = parts[0];
          extractedSecret = parts[1];
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            jsonrpc: '2.0',
            id: request.id || null,
            error: { code: -32000, message: 'Invalid authentication. Use route:secret format or provide route in URL with secret in Authorization header' }
          }));
          return;
        }
        
        if (!extractedSecret || extractedSecret.length < 16) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            jsonrpc: '2.0',
            id: request.id || null,
            error: { code: -32000, message: 'Invalid API key or secret too short' }
          }));
          return;
        }
        
        this.stats.totalRequests++;

        // Enhanced logging for ChatGPT/MCP requests
        this.logMessage('info', `🤖 Brain Proxy MCP request`, {
          Route: extractedRoute,
          Method: request.method,
          ID: request.id ? request.id.toString().substring(0, 8) : 'none',
          RequestPayload: JSON.stringify(request, null, 2),
          Timestamp: new Date().toISOString(),
          Source: 'ChatGPT-MCP'
        });
        
        const connector = this.connectors.get(extractedRoute);
        
        // Verify the brain key matches
        if (connector && connector.token !== extractedSecret) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            jsonrpc: '2.0',
            id: request.id || null,
            error: { code: -32000, message: 'Forbidden: Invalid credentials for route' }
          }));
          return;
        }
        
        if (!connector || connector.ws.readyState !== 1) {
          this.stats.offlineResponses++;
          
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            jsonrpc: '2.0',
            id: request.id || null,
            error: { 
              code: -32000, 
              message: `Brain offline. Please ensure BrainBridge is running locally with: magi start`
            }
          }));
          return;
        }
        
        // Update last seen
        connector.lastSeen = Date.now();
        
        // Forward MCP request to BrainBridge
        const requestId = request.id || `mcp-${Date.now()}`;
        
        // Set timeout for response
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            jsonrpc: '2.0',
            id: request.id || null,
            error: { code: -32000, message: 'Request timeout' }
          }));
        }, 30000);
        
        // Store pending request
        this.pendingRequests.set(requestId, {
          resolve: (response) => {
            clearTimeout(timeout);
            this.pendingRequests.delete(requestId);

            // Enhanced response logging for ChatGPT/MCP requests
            this.logMessage('info', `🤖 Brain Proxy MCP response`, {
              Route: extractedRoute,
              ID: request.id ? request.id.toString().substring(0, 8) : 'none',
              ResponsePayload: JSON.stringify(response, null, 2),
              Timestamp: new Date().toISOString(),
              Source: 'BrainBridge-to-ChatGPT',
              HasResult: !!response.result,
              HasError: !!response.error,
              ResponseSize: JSON.stringify(response).length + ' bytes'
            });

            // Forward MCP response to Claude.ai
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            res.end(JSON.stringify(response));
          },
          reject: (error) => {
            clearTimeout(timeout);
            this.pendingRequests.delete(requestId);

            // Enhanced error logging for ChatGPT/MCP requests
            this.logMessage('error', `🤖 Brain Proxy MCP error`, {
              Route: extractedRoute,
              ID: request.id ? request.id.toString().substring(0, 8) : 'none',
              ErrorMessage: error.message || 'Internal error',
              ErrorStack: error.stack,
              Timestamp: new Date().toISOString(),
              Source: 'BrainBridge-Error'
            });

            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id: request.id || null,
              error: { code: -32000, message: error.message || 'Internal error' }
            }));
          },
          timeout
        });
        
        // Send to BrainBridge via WebSocket
        const forwardedRequest = {
          ...request,
          id: requestId
        };

        this.logMessage('info', `🤖 Brain Proxy forwarding to BrainBridge`, {
          Route: extractedRoute,
          ID: requestId.toString().substring(0, 8),
          ForwardedPayload: JSON.stringify(forwardedRequest, null, 2),
          Timestamp: new Date().toISOString(),
          Source: 'ChatGPT-to-BrainBridge'
        });

        connector.ws.send(JSON.stringify(forwardedRequest));
        
      } catch (error) {
        this.logMessage('error', `❌ Brain Proxy MCP error`, { 
          Error: error.message 
        });
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' }
        }));
      }
    });
  }
}

module.exports = BrainProxyService;