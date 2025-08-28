#!/usr/bin/env node

import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

import { BrainNetwork } from './orchestrator/BrainNetwork.js';
import { BrainNetworkConfig } from './types/index.js';

class BrainNetworkServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private brainNetwork: BrainNetwork;
  private config: BrainNetworkConfig;

  constructor() {
    // Load configuration
    this.config = this.loadConfig();
    
    // Initialize Express app
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Initialize BrainNetwork
    this.brainNetwork = new BrainNetwork(this.config);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupEventHandlers();
  }

  private loadConfig(): BrainNetworkConfig {
    const configPath = path.join(process.cwd(), 'config.json');
    
    let config: BrainNetworkConfig;
    
    if (fs.existsSync(configPath)) {
      console.log(`📄 Loading config from: ${configPath}`);
      const configData = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(configData);
    } else {
      console.log('⚙️  Using default configuration');
      config = {
        brainbridgePath: path.resolve('../brainbridge'),
        memoriesBasePath: path.resolve('../'),
        defaultInstanceConfig: {
          personality: 'helpful assistant',
          ollamaPort: 11434,
          environment: {
            TRACE_MODE: 'true'
          }
        },
        dashboard: {
          port: 3001,
          enableRealtimeUpdates: true,
          refreshInterval: 1000
        },
        monitoring: {
          logLevel: 'info',
          metricsRetention: 7,
          alertThresholds: {
            responseTime: 5000,
            errorRate: 10,
            memoryUsage: 80
          }
        }
      };

      // Save default config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`💾 Saved default config to: ${configPath}`);
    }

    return config;
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    // Logging
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // API Routes
    this.setupInstanceRoutes();
    this.setupMessageRoutes();
    this.setupNetworkRoutes();
  }

  private setupInstanceRoutes(): void {
    // List instances
    this.app.get('/api/instances', async (req, res) => {
      try {
        const instances = await this.brainNetwork.listInstances();
        res.json({ instances });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Create instance
    this.app.post('/api/instances', async (req, res) => {
      try {
        const { name, config, memoriesPath } = req.body;
        
        if (!name) {
          return res.status(400).json({ error: 'Instance name is required' });
        }

        const instance = await this.brainNetwork.spawnInstance({
          name,
          config: config || {},
          memoriesPath
        });

        console.log(`✅ Created instance: ${name}`);
        res.json({ instance });
      } catch (error) {
        console.error(`❌ Failed to create instance:`, error);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Start instance
    this.app.post('/api/instances/:name/start', async (req, res) => {
      try {
        await this.brainNetwork.startInstance(req.params.name);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Stop instance
    this.app.post('/api/instances/:name/stop', async (req, res) => {
      try {
        await this.brainNetwork.stopInstance(req.params.name);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Restart instance
    this.app.post('/api/instances/:name/restart', async (req, res) => {
      try {
        await this.brainNetwork.restartInstance(req.params.name);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Delete instance
    this.app.delete('/api/instances/:name', async (req, res) => {
      try {
        await this.brainNetwork.destroyInstance(req.params.name);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Stream logs from instance
    this.app.get('/api/instances/:name/logs/stream', async (req, res) => {
      const { name } = req.params;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream Docker logs
      const dockerLogs = spawn('docker', ['logs', '-f', '--tail', '50', `brainbridge-${name}`]);
      
      function cleanLog(rawLog: string): string {
        return rawLog
          .replace(/\x1b\[[0-9;]*m/g, '')  // Remove ANSI escape codes
          .replace(/\r\n/g, '\n')          // Normalize line endings
          .replace(/\r/g, '\n')            // Convert remaining \r to \n
          .trim();
      }

      dockerLogs.stdout.on('data', (data: Buffer) => {
        const cleanedLog = cleanLog(data.toString());
        if (cleanedLog) {
          res.write(`data: ${JSON.stringify({ instance: name, log: cleanedLog })}\n\n`);
        }
      });
      
      dockerLogs.stderr.on('data', (data: Buffer) => {
        const cleanedLog = cleanLog(data.toString());
        if (cleanedLog) {
          res.write(`data: ${JSON.stringify({ instance: name, log: cleanedLog })}\n\n`);
        }
      });
      
      req.on('close', () => {
        dockerLogs.kill();
      });
    });

    // Discover existing instances
    this.app.post('/api/discover', async (req, res) => {
      try {
        const discovered = await this.brainNetwork.discoverExistingInstances();
        console.log(`🔍 Discovered ${discovered.length} existing instances`);
        res.json({ discovered });
      } catch (error) {
        console.error('❌ Discovery failed:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  private setupMessageRoutes(): void {
    // Send message to brain instance
    this.app.post('/api/messages', async (req, res) => {
      try {
        const { from: target, query, trackFlow = true } = req.body;
        
        if (!target || !query) {
          return res.status(400).json({ 
            error: 'target and query are required' 
          });
        }

        // Send message to the target brain instance
        const flow = await this.brainNetwork.sendToBrainInstance({
          target,
          query,
          trackFlow
        });

        console.log(`💬 Message sent to ${target}`);
        res.json({ flow });
      } catch (error) {
        console.error('❌ Message send failed:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Broadcast message
    this.app.post('/api/broadcast', async (req, res) => {
      try {
        const { from, query } = req.body;
        
        if (!from || !query) {
          return res.status(400).json({ 
            error: 'from and query are required' 
          });
        }

        const flows = await this.brainNetwork.broadcastQuery(from, query);
        console.log(`📢 Broadcast sent from ${from} to ${flows.length} instances`);
        res.json({ flows });
      } catch (error) {
        console.error('❌ Broadcast failed:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Get message flow details
    this.app.get('/api/flows/:id', async (req, res) => {
      try {
        const flow = await this.brainNetwork.visualizeFlow(req.params.id);
        if (!flow) {
          return res.status(404).json({ error: 'Flow not found' });
        }
        res.json({ flow });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  private setupNetworkRoutes(): void {
    // Get network topology
    this.app.get('/api/topology', async (req, res) => {
      try {
        const topology = await this.brainNetwork.getNetworkTopology();
        res.json({ topology });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Health check for entire network
    this.app.get('/api/health', async (req, res) => {
      try {
        const health = await this.brainNetwork.performHealthCheck();
        res.json({ health });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // BrainXchange network status
    this.app.get('/api/brainxchange/status', async (req, res) => {
      try {
        // Get any active brain to check BX status
        const instances = await this.brainNetwork.listInstances();
        const runningInstance = instances.find(i => i.status === 'running');
        
        const status = {
          endpoint: 'wss://m3u.dossant.com',
          connected: runningInstance ? true : false,
          activeNodes: instances.filter(i => i.status === 'running').length,
          sharedMemories: instances.reduce((sum, i) => sum + (i.stats?.memoryFiles || 0), 0),
          lastSync: new Date().toISOString()
        };
        
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Send initial network state
      socket.emit('network_state', {
        instances: [],
        topology: null,
        timestamp: new Date()
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });

      // Handle real-time subscriptions
      socket.on('subscribe_topology', () => {
        socket.join('topology_updates');
      });

      socket.on('subscribe_flows', () => {
        socket.join('flow_updates');
      });

      socket.on('subscribe_logs', (instanceName) => {
        socket.join(`logs_${instanceName}`);
        
        // Start streaming logs for this instance via WebSocket
        const dockerLogs = spawn('docker', ['logs', '-f', '--tail', '10', `brainbridge-${instanceName}`]);
        
        function cleanLogForSocket(rawLog: string): string {
          return rawLog
            .replace(/\x1b\[[0-9;]*m/g, '')  // Remove ANSI escape codes
            .replace(/\r\n/g, '\n')          // Normalize line endings
            .replace(/\r/g, '\n')            // Convert remaining \r to \n
            .trim();
        }

        dockerLogs.stdout.on('data', (data: Buffer) => {
          const cleanedLog = cleanLogForSocket(data.toString());
          if (cleanedLog) {
            socket.emit('brain_log', { instance: instanceName, log: cleanedLog });
          }
        });
        
        dockerLogs.stderr.on('data', (data: Buffer) => {
          const cleanedLog = cleanLogForSocket(data.toString());
          if (cleanedLog) {
            socket.emit('brain_log', { instance: instanceName, log: cleanedLog });
          }
        });
        
        socket.on('disconnect', () => {
          dockerLogs.kill();
        });
      });

      socket.on('subscribe_bx_network', () => {
        socket.join('bx_network');
        // Send initial BX status
        socket.emit('bx_network_log', '🌐 Connected to BrainXchange Network');
        socket.emit('bx_network_log', '📡 Endpoint: wss://m3u.dossant.com');
      });
    });
  }

  private setupEventHandlers(): void {
    // Network events
    this.brainNetwork.on('network_event', (event) => {
      console.log(`📊 Network event: ${event.type} (${event.instanceName || event.messageId || 'system'})`);
      
      // Broadcast to connected clients
      this.io.emit('network_event', event);

      // Send targeted updates
      switch (event.type) {
        case 'instance_created':
        case 'instance_started':
        case 'instance_stopped':
          this.io.to('topology_updates').emit('topology_changed', event);
          break;
        case 'message_sent':
        case 'message_received':
          this.io.to('flow_updates').emit('flow_update', event);
          // Also show message flow in BX stream
          const flowInfo = event.data?.flow;
          if (flowInfo) {
            if (flowInfo.to === 'brainxchange' || flowInfo.from === 'brainxchange') {
              this.io.to('bx_network').emit('bx_network_log', 
                `🌐 ${event.type}: ${flowInfo.from} → ${flowInfo.to} via wss://m3u.dossant.com`);
            } else if (flowInfo.to !== flowInfo.from) {
              this.io.to('bx_network').emit('bx_network_log', 
                `🧠 Cross-brain: ${flowInfo.from} → ${flowInfo.to}`);
            }
          }
          break;
      }
    });

    // Periodic updates
    if (this.config.dashboard.enableRealtimeUpdates) {
      setInterval(async () => {
        try {
          const topology = await this.brainNetwork.getNetworkTopology();
          this.io.to('topology_updates').emit('topology_update', topology);
        } catch (error) {
          console.error('Failed to send periodic topology update:', error);
        }
      }, this.config.dashboard.refreshInterval);
    }
  }

  async start(): Promise<void> {
    const port = this.config.dashboard.port;
    
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(`🌐 BrainNetwork Server running on port ${port}`);
        console.log(`📊 Dashboard: http://localhost:${port}`);
        console.log(`🔗 API: http://localhost:${port}/api`);
        console.log(`⚡ WebSocket: ws://localhost:${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    console.log('🛑 Shutting down BrainNetwork Server...');
    
    // Cleanup
    await this.brainNetwork.cleanup();
    
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('✅ BrainNetwork Server stopped');
        resolve();
      });
    });
  }
}

// Main execution
async function main() {
  const server = new BrainNetworkServer();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Start server
  try {
    await server.start();
    
    console.log('\n🎉 BrainNetwork is ready!');
    console.log('🔍 Try: curl http://localhost:3001/api/discover');
    console.log('🧠 Try: curl -X POST http://localhost:3001/api/instances -d \'{"name":"alice"}\' -H "Content-Type: application/json"');
    
  } catch (error) {
    console.error('💥 Failed to start BrainNetwork:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { BrainNetworkServer };
export default BrainNetworkServer;