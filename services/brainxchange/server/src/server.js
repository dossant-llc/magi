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

// Simple in-memory storage
const invitations = new Map();
const connections = new Map();
const clients = new Map(); // clientId -> websocket
const users = new Map();   // clientId -> {username, nickname, clientId}

// Brain Proxy storage
const brainProxyConnectors = new Map(); // route -> {ws, lastSeen, metadata}
const pendingRequests = new Map(); // requestId -> {resolve, reject, timeout}

// Statistics tracking
const stats = {
  totalConnections: 0,
  totalMessages: 0,
  startTime: Date.now(),
  lastMessageTime: null,
  lastMessageLength: 0
};

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

// Generate 6-character invitation code
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create HTTP server and WebSocket server
const PORT = process.env.PORT || 8082;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

logMessage('info', `🚀 BrainXchange Server starting`, { 
  Port: PORT, 
  NodeVersion: process.version,
  PID: process.pid
});

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

  // Brain Proxy routes
  if (parsedUrl.pathname.startsWith('/bp/')) {
    handleBrainProxyRequest(req, res, parsedUrl);
    return;
  }

  if (parsedUrl.pathname === '/') {
    // Serve the main dashboard
    const html = getMainDashboard();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (parsedUrl.pathname === '/api/stats') {
    // Serve statistics API
    const statsData = getCurrentStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(statsData, null, 2));
  } else {
    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT);

// Dashboard HTML generator
function getMainDashboard() {
  const currentStats = getCurrentStats();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BrainXchange Server</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.6;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 { color: #1d1d1f; margin-bottom: 8px; font-size: 2.5em; }
        .header p { color: #6e6e73; font-size: 1.1em; }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #30d158;
            margin-right: 8px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: 700;
            color: #1d1d1f;
            margin-bottom: 8px;
        }
        .stat-label {
            color: #6e6e73;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .connections-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .connections-card h2 {
            margin-bottom: 20px;
            color: #1d1d1f;
        }
        .user-list {
            display: grid;
            gap: 12px;
        }
        .user-item {
            display: flex;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            gap: 12px;
        }
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 20px;
            background: #007aff;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
        }
        .user-info { flex: 1; }
        .user-info h4 { margin: 0; font-size: 16px; }
        .user-info p { margin: 0; color: #6e6e73; font-size: 14px; }
        .connection-badge {
            background: #30d158;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #007aff;
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(0,122,255,0.3);
            transition: all 0.2s;
        }
        .refresh-btn:hover { background: #0056b3; transform: translateY(-2px); }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #6e6e73;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🪄 BrainXchange Server</h1>
            <p><span class="status-indicator"></span>Server is running • Real-time connection hub</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${currentStats.liveClients}</div>
                <div class="stat-label">Live Clients</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${currentStats.activeConnections}</div>
                <div class="stat-label">Active Connections</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${currentStats.totalMessages}</div>
                <div class="stat-label">Total Messages</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${currentStats.uptime}</div>
                <div class="stat-label">Uptime</div>
            </div>
        </div>

        <div class="connections-card">
            <h2>Connected Users</h2>
            <div class="user-list" id="userList">
                ${currentStats.connectedUsers.length === 0 ? 
                  '<div class="empty-state"><h3>No users connected</h3><p>Users will appear here when they connect to the server</p></div>' :
                  currentStats.connectedUsers.map(user => `
                    <div class="user-item">
                        <div class="user-avatar">${user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}</div>
                        <div class="user-info">
                            <h4>${user.nickname || 'Unknown'}</h4>
                            <p>Connected ${user.connectedTime}</p>
                        </div>
                        ${user.hasConnection ? '<span class="connection-badge">Connected</span>' : ''}
                    </div>
                  `).join('')
                }
            </div>
        </div>

        ${currentStats.lastMessage ? `
        <div class="connections-card">
            <h2>Last Message</h2>
            <p><strong>Time:</strong> ${currentStats.lastMessage.time}</p>
            <p><strong>Length:</strong> ${currentStats.lastMessage.length} characters</p>
            <p><strong>Type:</strong> ${currentStats.lastMessage.type}</p>
        </div>
        ` : ''}
    </div>

    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>

    <script>
        // Auto-refresh every 5 seconds
        setTimeout(() => location.reload(), 5000);
    </script>
</body>
</html>`;
}

// Stats generator
function getCurrentStats() {
  const now = Date.now();
  const uptimeMs = now - stats.startTime;
  const uptimeMinutes = Math.floor(uptimeMs / 60000);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  
  let uptimeStr;
  if (uptimeHours > 0) {
    uptimeStr = `${uptimeHours}h ${uptimeMinutes % 60}m`;
  } else {
    uptimeStr = `${uptimeMinutes}m`;
  }

  const connectedUsers = [];
  for (const [clientId, userData] of users) {
    if (clients.has(clientId)) {
      const connection = findConnection(clientId);
      connectedUsers.push({
        clientId: clientId.substring(0, 8),
        nickname: userData.nickname || userData.username || 'Unknown',
        connectedTime: 'recently', // Could track actual connect time
        hasConnection: !!connection
      });
    }
  }

  return {
    liveClients: clients.size,
    activeConnections: connections.size,
    totalConnections: stats.totalConnections,
    totalMessages: stats.totalMessages,
    uptime: uptimeStr,
    startTime: stats.startTime,
    connectedUsers: connectedUsers,
    lastMessage: stats.lastMessageTime ? {
      time: new Date(stats.lastMessageTime).toLocaleString(),
      length: stats.lastMessageLength,
      type: 'WebSocket Message'
    } : null
  };
}

wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Check if this is a Brain Proxy connector connection
  if (parsedUrl.pathname === '/bp/connect') {
    handleBrainProxyConnection(ws, req, parsedUrl);
    return;
  }
  
  // Check if this is a BrainXchange connection
  if (parsedUrl.pathname === '/bx' || parsedUrl.pathname === '/') {
    // Regular BrainXchange connection
  const clientId = Math.random().toString(36).substring(7);
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const location = clientIp.includes('127.0.0.1') || clientIp.includes('::1') ? 'localhost' : 
                   clientIp.includes('192.168.') || clientIp.includes('10.') || clientIp.includes('172.') ? 'private' : 'remote';
  
  // Update stats
  stats.totalConnections++;
  
  // Enhanced connection logging
  logMessage('info', `🔌 New WebSocket connection`, { 
    ID: clientId.substring(0, 8), 
    From: location,
    IP: clientIp.substring(0, 10) + '...' 
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Track message statistics (remove PII)
      stats.totalMessages++;
      stats.lastMessageTime = Date.now();
      stats.lastMessageLength = data.toString().length;
      
      handleMessage(ws, clientId, message);
    } catch (error) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  });

  ws.on('close', () => {
    handleDisconnect(clientId);
  });

  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connected',
    clientId 
  }));
});

function handleMessage(ws, clientId, message) {
  switch (message.type) {
    case 'identify':
      handleIdentify(ws, clientId, message.username, message.nickname);
      break;
      
    case 'create_invite':
      handleCreateInvite(ws, clientId);
      break;
    
    case 'connect':
      handleConnect(ws, clientId, message.code, message.username, message.nickname);
      break;
    
    case 'ask':
      handleAsk(ws, clientId, message.content, message.to);
      break;
    
    case 'answer':
      handleAnswer(ws, clientId, message.content, message.to);
      break;
    
    default:
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: `Unknown message type: ${message.type}` 
      }));
  }
}

function handleIdentify(ws, clientId, username, nickname) {
  if (!username) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Username is required' 
    }));
    return;
  }

  // Check if username is already taken by another active connection
  for (const [existingClientId, userData] of users) {
    if (userData.username === username && existingClientId !== clientId && clients.has(existingClientId)) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Username already taken' 
      }));
      return;
    }
  }

  // Store user identity
  users.set(clientId, {
    username: username,
    nickname: nickname || username,
    clientId: clientId
  });

  // Enhanced logging with user details
  logMessage('info', `👤 User identified`, { 
    ID: clientId.substring(0, 8), 
    User: username, 
    Name: nickname || username 
  });

  ws.send(JSON.stringify({ 
    type: 'identified',
    username: username,
    nickname: nickname || username,
    clientId: clientId
  }));
}

function handleCreateInvite(ws, clientId) {
  const user = users.get(clientId);
  if (!user) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Please identify yourself first using the identify message' 
    }));
    return;
  }

  const code = generateCode();
  
  // Store invitation (expires in 30 minutes)
  invitations.set(code, {
    creatorId: clientId,
    creatorUsername: user.username,
    creatorNickname: user.nickname,
    createdAt: Date.now(),
    expires: Date.now() + 30 * 60 * 1000
  });
  
  // Enhanced invitation logging
  logMessage('info', `🎫 Invitation created`, { 
    Code: code, 
    User: user.username,
    Name: user.nickname
  });
  
  clients.set(clientId, ws);
  
  // Clean up expired invitation after 30 minutes
  setTimeout(() => {
    invitations.delete(code);
  }, 30 * 60 * 1000);
  
  ws.send(JSON.stringify({ 
    type: 'invite_created',
    code,
    from: user.nickname,
    expiresIn: '30 minutes'
  }));
}

function handleConnect(ws, clientId, code, username, nickname) {
  // First identify the connecting user if provided
  if (username) {
    handleIdentify(ws, clientId, username, nickname);
  }

  const user = users.get(clientId);
  if (!user) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Please identify yourself first' 
    }));
    return;
  }

  const invitation = invitations.get(code);
  
  if (!invitation) {
    ws.send(JSON.stringify({ 
      type: 'error',
      message: 'Invalid or expired invitation code'
    }));
    return;
  }
  
  if (Date.now() > invitation.expires) {
    invitations.delete(code);
    ws.send(JSON.stringify({ 
      type: 'error',
      message: 'Invitation code has expired'
    }));
    return;
  }

  if (invitation.creatorUsername === user.username) {
    ws.send(JSON.stringify({ 
      type: 'error',
      message: 'Cannot connect to your own invitation'
    }));
    return;
  }
  
  // Get creator user info
  const creatorUser = users.get(invitation.creatorId);
  
  // Create bidirectional connection
  const connectionId = Math.random().toString(36).substring(7);
  connections.set(connectionId, {
    user1: invitation.creatorId,
    user2: clientId,
    user1Data: creatorUser,
    user2Data: user,
    createdAt: Date.now()
  });
  
  // Enhanced connection logging
  logMessage('info', `🤝 Users connected`, { 
    Conn: connectionId.substring(0, 8), 
    User1: creatorUser.nickname,
    User2: user.nickname
  });
  
  // Store client websocket
  clients.set(clientId, ws);
  
  // Notify both parties with friend information
  ws.send(JSON.stringify({ 
    type: 'connected_to_friend',
    connectionId,
    friend: {
      username: creatorUser.username,
      nickname: creatorUser.nickname
    }
  }));
  
  const creatorWs = clients.get(invitation.creatorId);
  if (creatorWs && creatorWs.readyState === WebSocket.OPEN) {
    creatorWs.send(JSON.stringify({ 
      type: 'friend_connected',
      connectionId,
      friend: {
        username: user.username,
        nickname: user.nickname
      }
    }));
  }
  
  // Clean up invitation after successful connection
  invitations.delete(code);
  
  // Auto-disconnect after 30 minutes of inactivity
  setTimeout(() => {
    handleDisconnect(clientId);
  }, 30 * 60 * 1000);
}

function handleAsk(ws, fromId, content, targetUsername) {
  const fromUser = users.get(fromId);
  if (!fromUser) {
    ws.send(JSON.stringify({ 
      type: 'error',
      message: 'Please identify yourself first'
    }));
    return;
  }

  let targetId = null;
  let targetUser = null;

  // If targetUsername is provided, find user by username
  if (targetUsername) {
    for (const [clientId, userData] of users) {
      if (userData.username === targetUsername && clients.has(clientId)) {
        targetId = clientId;
        targetUser = userData;
        break;
      }
    }
    
    if (!targetUser) {
      ws.send(JSON.stringify({ 
        type: 'error',
        message: `User '${targetUsername}' not found or not connected`
      }));
      return;
    }

    // Check if they have a connection
    const connection = findConnectionBetween(fromId, targetId);
    if (!connection) {
      ws.send(JSON.stringify({ 
        type: 'error',
        message: `No active connection with ${targetUser.nickname}. Create an invite first.`
      }));
      return;
    }
  } else {
    // Fall back to any active connection
    const connection = findConnection(fromId);
    if (!connection) {
      ws.send(JSON.stringify({ 
        type: 'error',
        message: 'No active connection. Please connect first.'
      }));
      return;
    }
    
    targetId = connection.user1 === fromId ? connection.user2 : connection.user1;
    targetUser = users.get(targetId);
  }
  
  const targetWs = clients.get(targetId);
  if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
    ws.send(JSON.stringify({ 
      type: 'error',
      message: `${targetUser ? targetUser.nickname : 'Friend'} is not connected`
    }));
    return;
  }
  
  // Enhanced logging for question forwarding
  logMessage('info', `❓ Question forwarded`, { 
    From: fromUser.nickname, 
    To: targetUser.nickname, 
    Length: `${content.length}chars` 
  });

  // Forward question to friend
  targetWs.send(JSON.stringify({ 
    type: 'question',
    content: content,
    from: fromUser.username,
    fromNickname: fromUser.nickname
  }));
  
  // Confirm to sender
  ws.send(JSON.stringify({ 
    type: 'question_sent',
    content: content,
    to: targetUser.nickname
  }));
}

function handleAnswer(ws, fromId, content, targetUsername) {
  const fromUser = users.get(fromId);
  if (!fromUser) {
    ws.send(JSON.stringify({ 
      type: 'error',
      message: 'Please identify yourself first'
    }));
    return;
  }

  let targetId = null;
  let targetUser = null;

  // If targetUsername is provided, find user by username
  if (targetUsername) {
    for (const [clientId, userData] of users) {
      if (userData.username === targetUsername && clients.has(clientId)) {
        targetId = clientId;
        targetUser = userData;
        break;
      }
    }
    
    if (!targetUser) {
      ws.send(JSON.stringify({ 
        type: 'error',
        message: `User '${targetUsername}' not found or not connected`
      }));
      return;
    }

    // Check if they have a connection
    const connection = findConnectionBetween(fromId, targetId);
    if (!connection) {
      ws.send(JSON.stringify({ 
        type: 'error',
        message: `No active connection with ${targetUser.nickname}`
      }));
      return;
    }
  } else {
    // Fall back to any active connection
    const connection = findConnection(fromId);
    if (!connection) {
      ws.send(JSON.stringify({ 
        type: 'error',
        message: 'No active connection'
      }));
      return;
    }
    
    targetId = connection.user1 === fromId ? connection.user2 : connection.user1;
    targetUser = users.get(targetId);
  }
  
  const targetWs = clients.get(targetId);
  if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
    ws.send(JSON.stringify({ 
      type: 'error',
      message: `${targetUser ? targetUser.nickname : 'Friend'} is not connected`
    }));
    return;
  }
  
  // Enhanced logging for answer forwarding
  logMessage('info', `💬 Answer forwarded`, { 
    From: fromUser.nickname, 
    To: targetUser.nickname, 
    Length: `${content.length}chars` 
  });

  // Forward answer to friend
  targetWs.send(JSON.stringify({ 
    type: 'answer',
    content: content,
    from: fromUser.username,
    fromNickname: fromUser.nickname
  }));
  
  // Confirm to sender
  ws.send(JSON.stringify({ 
    type: 'answer_sent',
    content: content,
    to: targetUser.nickname
  }));
}

function findConnection(userId) {
  for (const [id, conn] of connections) {
    if (conn.user1 === userId || conn.user2 === userId) {
      return conn;
    }
  }
  return null;
}

function findConnectionBetween(userId1, userId2) {
  for (const [id, conn] of connections) {
    if ((conn.user1 === userId1 && conn.user2 === userId2) || 
        (conn.user1 === userId2 && conn.user2 === userId1)) {
      return conn;
    }
  }
  return null;
}

function handleDisconnect(clientId) {
  // Remove client
  clients.delete(clientId);
  
  // Get user info before removing
  const user = users.get(clientId);
  
  // Find and notify connected friend
  const connection = findConnection(clientId);
  if (connection) {
    const otherId = connection.user1 === clientId ? connection.user2 : connection.user1;
    const otherWs = clients.get(otherId);
    const otherUser = users.get(otherId);
    
    if (otherWs && otherWs.readyState === WebSocket.OPEN) {
      otherWs.send(JSON.stringify({ 
        type: 'friend_disconnected',
        friend: user ? {
          username: user.username,
          nickname: user.nickname
        } : null
      }));
    }
    
    // Remove connection
    for (const [id, conn] of connections) {
      if (conn.user1 === clientId || conn.user2 === clientId) {
        connections.delete(id);
      }
    }
  }
  
  // Remove user data (but keep it briefly in case of reconnection)
  setTimeout(() => {
    users.delete(clientId);
  }, 5000); // Keep user data for 5 seconds in case of quick reconnect
  }
});  // Close BrainXchange connection handler

// Clean up expired invitations periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, invitation] of invitations) {
    if (now > invitation.expires) {
      invitations.delete(code);
    }
  }
}, 60 * 1000); // Check every minute

logMessage('info', `✅ Server ready for magi connections`, { 
  WebSocketServer: 'Ready', 
  HTTPEndpoints: '/api/stats',
  Status: 'Operational'
});

// ============================================================================
// BRAIN PROXY FUNCTIONALITY
// ============================================================================

// Brain Proxy HTTP request handler
function handleBrainProxyRequest(req, res, parsedUrl) {
  const path = parsedUrl.pathname.substring(4); // Remove /bp prefix
  
  if (req.method === 'GET' && path === 'health') {
    handleBrainProxyHealth(req, res);
  } else if (req.method === 'GET' && path === 'openapi.json') {
    handleOpenAPISchema(req, res);
  } else if (req.method === 'GET' && path === 'privacy') {
    handlePrivacyPolicy(req, res);
  } else if (req.method === 'POST' && path.startsWith('rpc/')) {
    const route = path.substring(4); // Remove 'rpc/' prefix
    handleRPCRequest(req, res, route);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Brain Proxy endpoint not found');
  }
}

// Brain Proxy health check
function handleBrainProxyHealth(req, res) {
  const connectedRoutes = Array.from(brainProxyConnectors.keys());
  const healthData = {
    status: 'online',
    service: 'AGIfor.me Brain Proxy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    connectedBrains: connectedRoutes.length,
    routes: connectedRoutes
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(healthData, null, 2));
}

// OpenAPI schema for Custom GPT integration
function handleOpenAPISchema(req, res) {
  const schema = {
    openapi: '3.0.0',
    info: {
      title: 'AGIfor.me Brain Proxy',
      description: 'Access your personal AI memory bank through AGIfor.me',
      version: '1.0.0'
    },
    servers: [
      {
        url: `https://${process.env.AGIFORME_SERVER_DOMAIN || 'your-server.com'}:${PORT}/bp`,
        description: 'AGIfor.me Brain Proxy'
      }
    ],
    paths: {
      '/rpc/{route}': {
        post: {
          summary: 'Execute brain command',
          operationId: 'executeBrainCommand',
          parameters: [
            {
              name: 'route',
              in: 'path',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Your unique brain route identifier'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'method', 'params'],
                  properties: {
                    id: {
                      type: 'string',
                      description: 'Unique request identifier'
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
                      description: 'Method-specific parameters'
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

// Privacy policy page
function handlePrivacyPolicy(req, res) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AGIfor.me Brain Proxy - Privacy Policy</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            line-height: 1.6; 
            color: #333;
        }
        h1 { color: #1d1d1f; margin-bottom: 30px; }
        h2 { color: #007aff; margin-top: 40px; margin-bottom: 20px; }
        .highlight { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
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
</body>
</html>`;
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

// RPC request handler
function handleRPCRequest(req, res, route) {
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
      
      logMessage('info', `🧠 Brain Proxy RPC request`, {
        Route: route,
        Method: request.method,
        ID: request.id.substring(0, 8)
      });
      
      const connector = brainProxyConnectors.get(route);
      
      if (!connector || connector.ws.readyState !== WebSocket.OPEN) {
        // Brain offline - return limited capacity response
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
**Time:** ${new Date().toLocaleString()}`
            }]
          }
        };
        
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(limitedResponse, null, 2));
        return;
      }
      
      // Forward to local brain connector
      const response = await forwardToBrainConnector(connector, request);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response, null, 2));
      
    } catch (error) {
      logMessage('error', `Brain Proxy RPC error: ${error.message}`, { Route: route });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        id: 'unknown',
        error: 'Internal server error' 
      }));
    }
  });
}

// Forward request to brain connector and wait for response
function forwardToBrainConnector(connector, request) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(request.id);
      reject(new Error('Request timeout'));
    }, 30000); // 30 second timeout
    
    pendingRequests.set(request.id, { resolve, reject, timeout });
    
    // Send request to local brain connector
    connector.ws.send(JSON.stringify(request));
  });
}

// Brain Proxy WebSocket connection handler
function handleBrainProxyConnection(ws, req, parsedUrl) {
  const query = parsedUrl.query;
  const token = query.token;
  const route = query.route || 'default';
  
  // Simple token validation (in production, use proper authentication)
  if (!token || token.length < 8) {
    logMessage('warn', `🚨 Brain Proxy connection rejected - invalid token`, { Route: route });
    ws.close(4001, 'Unauthorized: Invalid token');
    return;
  }
  
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const location = clientIp.includes('127.0.0.1') || clientIp.includes('::1') ? 'localhost' : 'remote';
  
  logMessage('info', `🧠 Brain Proxy connector registered`, { 
    Route: route, 
    From: location,
    Token: token.substring(0, 8) + '***'
  });
  
  // Register connector
  brainProxyConnectors.set(route, {
    ws: ws,
    lastSeen: Date.now(),
    route: route,
    token: token,
    location: location
  });
  
  // Handle messages from brain connector (responses to our RPC requests)
  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      
      if (response.id && pendingRequests.has(response.id)) {
        const pending = pendingRequests.get(response.id);
        clearTimeout(pending.timeout);
        pending.resolve(response);
        pendingRequests.delete(response.id);
        
        logMessage('info', `🧠 Brain Proxy response received`, {
          Route: route,
          ID: response.id.substring(0, 8),
          HasResult: !!response.result,
          HasError: !!response.error
        });
      }
    } catch (error) {
      logMessage('error', `Brain Proxy message parse error: ${error.message}`, { Route: route });
    }
  });
  
  // Handle disconnect
  ws.on('close', () => {
    brainProxyConnectors.delete(route);
    logMessage('info', `🧠 Brain Proxy connector disconnected`, { Route: route });
    
    // Reject any pending requests for this connector
    for (const [requestId, pending] of pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connector disconnected'));
      pendingRequests.delete(requestId);
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
      const connector = brainProxyConnectors.get(route);
      if (connector) {
        connector.lastSeen = Date.now();
        ws.ping();
      }
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // 30 seconds
}

// Clean up stale brain proxy connections
setInterval(() => {
  const now = Date.now();
  const staleTimeout = 5 * 60 * 1000; // 5 minutes
  
  for (const [route, connector] of brainProxyConnectors) {
    if (now - connector.lastSeen > staleTimeout) {
      logMessage('info', `🧹 Cleaning up stale Brain Proxy connector`, { Route: route });
      connector.ws.terminate();
      brainProxyConnectors.delete(route);
    }
  }
}, 60 * 1000); // Check every minute