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

// Simple in-memory storage
const invitations = new Map();
const connections = new Map();
const clients = new Map(); // clientId -> websocket
const users = new Map();   // clientId -> {username, nickname, clientId}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
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