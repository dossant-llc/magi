#!/usr/bin/env node

import WebSocket from 'ws';
import axios from 'axios';
import { LoggerService } from './logger-service.js';

export interface BrainProxyConfig {
  enabled: boolean;
  url: string;
  secret: string;
  route: string;
  localMcpUrl: string;
}

export class BrainProxyConnector {
  private ws: WebSocket | null = null;
  private config: BrainProxyConfig;
  private logger: LoggerService;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastActivityTime = Date.now();

  constructor(config: BrainProxyConfig, logger: LoggerService) {
    this.config = config;
    this.logger = logger;

    if (config.enabled) {
      this.logger.winston.info('BrainProxyConnector initializing', {
        component: 'BrainProxyConnector',
        action: 'initialize',
        url: config.url,
        route: config.route,
        localMcpUrl: config.localMcpUrl
      });
      
      this.connect();
    } else {
      this.logger.winston.info('BrainProxyConnector disabled via configuration', {
        component: 'BrainProxyConnector',
        action: 'disabled'
      });
    }
  }

  private connect() {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Close existing connection if any
      if (this.ws && this.ws.readyState === this.ws.OPEN) {
        this.logger.winston.info('Closing existing Brain Proxy connection', {
          component: 'BrainProxyConnector',
          action: 'closing_existing',
          route: this.config.route
        });
        this.ws.close();
      }

      const connectUrl = `${this.config.url}?route=${encodeURIComponent(this.config.route)}&token=${encodeURIComponent(this.config.secret)}`;
      
      this.logger.winston.info('BrainProxyConnector connecting to proxy', {
        component: 'BrainProxyConnector',
        action: 'connecting',
        attempt: this.reconnectAttempts + 1,
        route: this.config.route
      });

      this.ws = new WebSocket(connectUrl);

      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.lastActivityTime = Date.now();
        
        this.logger.winston.info('🧠 Brain Proxy connected successfully', {
          component: 'BrainProxyConnector',
          action: 'connected',
          route: this.config.route,
          url: this.config.url
        });
        
        this.startHeartbeat();
      });

      this.ws.on('message', (data) => {
        this.handleProxyMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        this.stopHeartbeat();
        
        this.logger.winston.warn('Brain Proxy connection closed', {
          component: 'BrainProxyConnector',
          action: 'disconnected',
          code,
          reason: reason?.toString(),
          route: this.config.route
        });

        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        this.isConnected = false;
        this.stopHeartbeat();
        
        this.logger.winston.error('Brain Proxy connection error', {
          component: 'BrainProxyConnector',
          action: 'connection_error',
          error: error.message,
          route: this.config.route
        });

        this.scheduleReconnect();
      });

      this.ws.on('ping', () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.pong();
        }
      });

    } catch (error) {
      this.logger.winston.error('Brain Proxy connection setup failed', {
        component: 'BrainProxyConnector',
        action: 'connection_setup_error',
        error: error instanceof Error ? error.message : String(error),
        route: this.config.route
      });

      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.config.enabled) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.winston.error('Brain Proxy max reconnection attempts reached', {
        component: 'BrainProxyConnector',
        action: 'max_reconnects_reached',
        attempts: this.reconnectAttempts,
        route: this.config.route
      });
      return;
    }

    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
    this.reconnectAttempts++;

    this.logger.winston.info('Brain Proxy reconnecting', {
      component: 'BrainProxyConnector',
      action: 'scheduling_reconnect',
      attempt: this.reconnectAttempts,
      delayMs: delay,
      route: this.config.route
    });

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private async handleProxyMessage(data: WebSocket.Data) {
    try {
      this.lastActivityTime = Date.now();
      const message = JSON.parse(data.toString());
      
      this.logger.winston.info('Brain Proxy message received', {
        component: 'BrainProxyConnector',
        action: 'proxy_message',
        messageType: message.type,
        hasId: !!message.id,
        hasMethod: !!message.method,
        route: this.config.route
      });

      if (message.type === 'bp_connected') {
        this.logger.winston.info('Brain Proxy handshake complete', {
          component: 'BrainProxyConnector',
          action: 'handshake_complete',
          route: message.route,
          timestamp: message.timestamp
        });
        return;
      }

      // Handle RPC request from GPT (via proxy)
      if (message.id && message.method) {
        const response = await this.forwardToLocalMCP(message);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(response));
          
          this.logger.winston.info('Brain Proxy response sent', {
            component: 'BrainProxyConnector',
            action: 'response_sent',
            id: message.id.substring(0, 8),
            method: message.method,
            hasResult: !!response.result,
            hasError: !!response.error
          });
        }
      }

    } catch (error) {
      this.logger.winston.error('Brain Proxy message handling error', {
        component: 'BrainProxyConnector',
        action: 'message_error',
        error: error instanceof Error ? error.message : String(error),
        route: this.config.route
      });
    }
  }


  private async forwardToLocalMCP(request: any): Promise<any> {
    try {
      this.logger.winston.info('Forwarding request to local MCP', {
        component: 'BrainProxyConnector',
        action: 'forward_to_mcp',
        id: request.id.substring(0, 8),
        method: request.method,
        localUrl: this.config.localMcpUrl
      });

      // First, get the list of available tools to provide better error messages
      let availableTools: string[] = [];
      try {
        const toolsResponse = await axios.post(this.config.localMcpUrl, {
          method: 'tools/list'
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
        availableTools = toolsResponse.data.tools?.map((t: any) => t.name) || [];
      } catch (toolsError) {
        this.logger.winston.warn('Could not fetch available tools', {
          component: 'BrainProxyConnector',
          action: 'tools_list_failed',
          error: toolsError instanceof Error ? toolsError.message : String(toolsError)
        });
      }

      // Check if the requested tool exists
      if (availableTools.length > 0 && !availableTools.includes(request.method)) {
        this.logger.winston.info('Unknown tool requested', {
          component: 'BrainProxyConnector',
          action: 'unknown_tool',
          id: request.id.substring(0, 8),
          method: request.method,
          availableTools
        });
        
        return {
          id: request.id,
          error: `Tool '${request.method}' is not available. Available tools: ${availableTools.join(', ')}`
        };
      }

      const response = await axios.post(this.config.localMcpUrl, {
        method: 'tools/call',
        params: {
          name: request.method,
          arguments: request.params || {}
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout
      });

      const mcpResponse = response.data;
      
      this.logger.winston.info('Local MCP response received', {
        component: 'BrainProxyConnector',
        action: 'mcp_response',
        id: request.id.substring(0, 8),
        statusOk: response.status === 200,
        hasResult: !!mcpResponse.result,
        hasError: !!mcpResponse.error
      });

      // Transform MCP response to Brain Proxy format
      if (mcpResponse.error) {
        return {
          id: request.id,
          error: mcpResponse.error.message || mcpResponse.error
        };
      } else {
        // Handle direct content response (not wrapped in result)
        const result = mcpResponse.result || mcpResponse;
        return {
          id: request.id,
          result: result
        };
      }

    } catch (error) {
      this.logger.winston.error('Local MCP forwarding failed', {
        component: 'BrainProxyConnector',
        action: 'mcp_forward_error',
        id: request.id.substring(0, 8),
        error: error instanceof Error ? error.message : String(error),
        localUrl: this.config.localMcpUrl,
        method: request.method
      });

      // Handle HTTP errors from MCP server
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        const status = axiosError.response?.status;
        const responseError = axiosError.response?.data?.error || axiosError.message;
        
        this.logger.winston.info('MCP server returned error', {
          component: 'BrainProxyConnector',
          action: 'mcp_server_error',
          id: request.id.substring(0, 8),
          status,
          responseError,
          method: request.method
        });
        
        return {
          id: request.id,
          error: `Tool '${request.method}' is not available. ${responseError}`
        };
      }

      return {
        id: request.id,
        error: `Local MCP connection error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private startHeartbeat() {
    // Stop any existing heartbeat
    this.stopHeartbeat();
    
    // Start new heartbeat - log activity every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (!this.isConnected) {
        this.stopHeartbeat();
        return;
      }
      
      const timeSinceActivity = Date.now() - this.lastActivityTime;
      const minutesSinceActivity = Math.floor(timeSinceActivity / (1000 * 60));
      
      // Use dots for quiet periods, more info if there's been activity recently
      if (timeSinceActivity < 60000) { // Less than 1 minute
        console.error('🧠 ●'); // Just a dot - recent activity
      } else if (timeSinceActivity < 300000) { // Less than 5 minutes  
        console.error(`🧠 ● (${minutesSinceActivity}m quiet)`);
      } else {
        // Log more detailed status for longer quiet periods
        this.logger.winston.info('Brain Proxy heartbeat', {
          component: 'BrainProxyConnector',
          action: 'heartbeat',
          connected: this.isConnected,
          route: this.config.route,
          minutesSinceActivity,
          reconnectAttempts: this.reconnectAttempts
        });
        console.error(`🧠 ● Brain Proxy alive (${minutesSinceActivity}m quiet)`);
      }
    }, 30000); // Every 30 seconds
  }
  
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public getStatus(): { connected: boolean; route: string; attempts: number } {
    return {
      connected: this.isConnected,
      route: this.config.route,
      attempts: this.reconnectAttempts
    };
  }

  public disconnect() {
    this.config.enabled = false;
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Graceful shutdown');
      this.ws = null;
    }

    this.logger.winston.info('BrainProxyConnector disconnected', {
      component: 'BrainProxyConnector',
      action: 'disconnect',
      route: this.config.route
    });
  }
}