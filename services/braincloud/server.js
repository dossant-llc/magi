// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);

if (majorVersion < 12) {
  console.error(`❌ Node.js version 12 or higher is required. Current version: ${nodeVersion}`);
  console.error('   Please upgrade Node.js to continue.');
  process.exit(1);
}

if (majorVersion < 18) {
  console.warn(`⚠️  Node.js ${nodeVersion} detected. Version 18+ is recommended for best performance.`);
}

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const crypto = require('crypto');

// Import service modules
const BrainXchangeService = require('./services/brainxchange.js');
const BrainProxyService = require('./services/brainproxy.js');

// Enhanced logging system
const logHistory = [];
const MAX_LOG_HISTORY = 500;

function logMessage(level, message, context = {}) {
  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    timeZone: 'UTC' 
  });
  
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    context,
    time: Date.now()
  };
  
  // Add to history
  logHistory.push(logEntry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }
  
  // Enhanced console output
  const contextStr = Object.keys(context).length > 0 
    ? ` • ${Object.entries(context).map(([k,v]) => `${k}:${v}`).join(' • ')}` 
    : '';
    
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`);
}

// Create HTTP server and WebSocket server
const PORT = process.env.PORT || 8082;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

logMessage('info', `🌥️ BrainCloud Server starting`, { 
  Port: PORT, 
  NodeVersion: process.version,
  PID: process.pid
});

// Initialize services
const brainXchangeService = new BrainXchangeService(logMessage);
const brainProxyService = new BrainProxyService(logMessage, PORT);

// HTTP request handler
server.on('request', (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route to appropriate service
  if (parsedUrl.pathname.startsWith('/bx/')) {
    brainXchangeService.handleHttpRequest(req, res, parsedUrl);
  } else if (parsedUrl.pathname.startsWith('/bp/')) {
    brainProxyService.handleHttpRequest(req, res, parsedUrl);
  } else if (parsedUrl.pathname === '/') {
    // Main BrainCloud dashboard
    handleBrainCloudDashboard(req, res);
  } else if (parsedUrl.pathname === '/api/status') {
    // Overall system status
    handleSystemStatus(req, res);
  } else if (parsedUrl.pathname === '/magi-config.json') {
    // mAGI Custom GPT configuration
    const fs = require('fs');
    const path = require('path');
    try {
      const configPath = path.join(__dirname, 'static', 'magi-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(configData);
    } catch (error) {
      logMessage('error', 'Failed to serve magi-config.json', { error: error.message });
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Configuration not found' }));
    }
  } else {
    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('BrainCloud: Service not found');
  }
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  
  logMessage('info', `🔌 New WebSocket connection`, {
    Path: parsedUrl.pathname,
    IP: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'
  });
  
  // Route to appropriate service
  if (parsedUrl.pathname.startsWith('/bx') || !parsedUrl.pathname.includes('/')) {
    // BrainXchange connection (legacy support for root path)
    brainXchangeService.handleWebSocketConnection(ws, req, parsedUrl);
  } else if (parsedUrl.pathname.startsWith('/bp/')) {
    // Brain Proxy connection
    brainProxyService.handleWebSocketConnection(ws, req, parsedUrl);
  } else {
    logMessage('warn', `🚨 Unknown WebSocket path`, { Path: parsedUrl.pathname });
    ws.close(4004, 'Unknown service path');
  }
});

// BrainCloud main dashboard
function handleBrainCloudDashboard(req, res) {
  const bxStats = brainXchangeService.getStats();
  const bpStats = brainProxyService.getStats();
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌥️ BrainCloud Platform</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .header h1 { 
            font-size: 3em; 
            margin-bottom: 10px;
            background: linear-gradient(45deg, #fff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .header p { 
            font-size: 1.2em; 
            opacity: 0.9;
            margin-bottom: 20px;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #22c55e;
            margin-right: 8px;
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-bottom: 40px;
        }
        .service-card {
            background: rgba(255,255,255,0.15);
            padding: 30px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            transition: all 0.3s ease;
        }
        .service-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .service-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        .service-icon {
            font-size: 2.5em;
            margin-right: 15px;
        }
        .service-title {
            font-size: 1.5em;
            font-weight: 600;
        }
        .service-description {
            opacity: 0.8;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
        }
        .stat-item {
            text-align: center;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
        }
        .stat-number {
            font-size: 2em;
            font-weight: 700;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.85em;
            opacity: 0.7;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .quick-links {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .quick-link {
            padding: 12px 24px;
            background: rgba(255,255,255,0.2);
            border-radius: 25px;
            text-decoration: none;
            color: white;
            font-weight: 500;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .quick-link:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.3);
            transition: all 0.2s;
        }
        .refresh-btn:hover { 
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px); 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌥️ BrainCloud</h1>
            <p><span class="status-indicator"></span>Unified AI Brain Services Platform</p>
            <p>Connecting minds across the digital realm</p>
        </div>

        <div class="services-grid">
            <div class="service-card">
                <div class="service-header">
                    <div class="service-icon">🤝</div>
                    <div>
                        <div class="service-title">BrainXchange</div>
                        <div style="opacity: 0.7; font-size: 0.9em;">P2P Memory Sharing</div>
                    </div>
                </div>
                <div class="service-description">
                    Secure peer-to-peer communication between AI assistants. Share knowledge and experiences across different users and instances.
                </div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${bxStats.liveClients}</div>
                        <div class="stat-label">Live Clients</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${bxStats.activeConnections}</div>
                        <div class="stat-label">Connections</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${bxStats.totalMessages}</div>
                        <div class="stat-label">Messages</div>
                    </div>
                </div>
            </div>

            <div class="service-card">
                <div class="service-header">
                    <div class="service-icon">🧠</div>
                    <div>
                        <div class="service-title">Brain Proxy</div>
                        <div style="opacity: 0.7; font-size: 0.9em;">GPT Integration Bridge</div>
                    </div>
                </div>
                <div class="service-description">
                    Bridge between Custom GPTs and local AGIfor.me instances. Access your personal memory bank from anywhere with privacy-first architecture.
                </div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${bpStats.connectedBrains}</div>
                        <div class="stat-label">Connected Brains</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${bpStats.totalRequests}</div>
                        <div class="stat-label">Requests</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${bpStats.offlineResponses}</div>
                        <div class="stat-label">Offline Mode</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="quick-links">
            <a href="/bx" class="quick-link">🤝 BrainXchange Dashboard</a>
            <a href="/bp/health" class="quick-link">🧠 Brain Proxy Status</a>
            <a href="/bp/openapi.json" class="quick-link">📋 API Schema</a>
            <a href="/bp/privacy" class="quick-link">🔒 Privacy Policy</a>
            <a href="/api/status" class="quick-link">📊 System Status</a>
        </div>
    </div>

    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>

    <script>
        // Auto-refresh every 10 seconds
        setTimeout(() => location.reload(), 10000);
    </script>
</body>
</html>`;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

// System status API
function handleSystemStatus(req, res) {
  const bxStats = brainXchangeService.getStats();
  const bpStats = brainProxyService.getStats();
  
  const systemStatus = {
    platform: 'BrainCloud',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      brainxchange: {
        status: 'online',
        liveClients: bxStats.liveClients,
        activeConnections: bxStats.activeConnections,
        totalMessages: bxStats.totalMessages
      },
      brainproxy: {
        status: 'online',
        connectedBrains: bpStats.connectedBrains,
        totalRequests: bpStats.totalRequests,
        offlineResponses: bpStats.offlineResponses
      }
    },
    endpoints: {
      brainxchange: {
        websocket: `ws://localhost:${PORT}/bx`,
        dashboard: `http://localhost:${PORT}/bx`
      },
      brainproxy: {
        websocket: `wss://localhost:${PORT}/bp/connect`,
        rpc: `https://localhost:${PORT}/bp/rpc/{route}`,
        health: `http://localhost:${PORT}/bp/health`,
        openapi: `http://localhost:${PORT}/bp/openapi.json`
      }
    }
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(systemStatus, null, 2));
}

// Start server
server.listen(PORT, () => {
  console.log(`\n🌥️ ====================================`);
  console.log(`   BrainCloud Platform Started`);
  console.log(`   ====================================`);
  console.log(`   🔗 Dashboard: http://localhost:${PORT}`);
  console.log(`   🤝 BrainXchange: ws://localhost:${PORT}/bx`);
  console.log(`   🧠 Brain Proxy: https://localhost:${PORT}/bp/`);
  console.log(`   📊 Status API: http://localhost:${PORT}/api/status`);
  console.log(`   ====================================\n`);
});

logMessage('info', `✅ BrainCloud Platform ready`, { 
  Port: PORT,
  Services: 'BrainXchange, Brain Proxy',
  Status: 'Operational'
});