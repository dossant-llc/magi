const WebSocket = require('ws');
const url = require('url');

class BrainXchangeService {
  constructor(logMessage) {
    this.logMessage = logMessage;
    
    // Simple in-memory storage
    this.invitations = new Map();
    this.connections = new Map();
    this.clients = new Map(); // clientId -> websocket
    this.users = new Map();   // clientId -> {username, nickname, clientId}
    
    // Statistics tracking
    this.stats = {
      totalConnections: 0,
      totalMessages: 0,
      startTime: Date.now(),
      lastMessageTime: null,
      lastMessageLength: 0
    };

    this.logMessage('info', `🤝 BrainXchange Service initialized`, { 
      Component: 'BrainXchange'
    });

    // Clean up expired invitations periodically
    setInterval(() => {
      const now = Date.now();
      for (const [code, invitation] of this.invitations) {
        if (now > invitation.expires) {
          this.invitations.delete(code);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  handleHttpRequest(req, res, parsedUrl) {
    const path = parsedUrl.pathname.substring(4); // Remove /bx/ prefix
    
    if (req.method === 'GET' && (path === '' || path === '/')) {
      // BrainXchange dashboard
      this.serveBrainXchangeDashboard(req, res);
    } else if (req.method === 'GET' && path === 'stats') {
      // BrainXchange statistics API
      const statsData = this.getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(statsData, null, 2));
    } else {
      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('BrainXchange endpoint not found');
    }
  }

  handleWebSocketConnection(ws, req, parsedUrl) {
    const clientId = Math.random().toString(36).substring(7);
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const location = clientIp.includes('127.0.0.1') || clientIp.includes('::1') ? 'localhost' : 
                     clientIp.includes('192.168.') || clientIp.includes('10.') || clientIp.includes('172.') ? 'private' : 'remote';
    
    // Update stats
    this.stats.totalConnections++;
    
    // Enhanced connection logging
    this.logMessage('info', `🤝 BrainXchange connection`, { 
      ID: clientId.substring(0, 8), 
      From: location,
      IP: clientIp.substring(0, 10) + '...' 
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Track message statistics (remove PII)
        this.stats.totalMessages++;
        this.stats.lastMessageTime = Date.now();
        this.stats.lastMessageLength = data.toString().length;
        
        this.handleMessage(ws, clientId, message);
      } catch (error) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    // Send welcome message
    ws.send(JSON.stringify({ 
      type: 'connected',
      clientId 
    }));
  }

  handleMessage(ws, clientId, message) {
    switch (message.type) {
      case 'identify':
        this.handleIdentify(ws, clientId, message.username, message.nickname);
        break;
        
      case 'create_invite':
        this.handleCreateInvite(ws, clientId);
        break;
      
      case 'connect':
        this.handleConnect(ws, clientId, message.code, message.username, message.nickname);
        break;
      
      case 'ask':
        this.handleAsk(ws, clientId, message.content, message.to);
        break;
      
      case 'answer':
        this.handleAnswer(ws, clientId, message.content, message.to);
        break;
      
      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: `Unknown message type: ${message.type}` 
        }));
    }
  }

  handleIdentify(ws, clientId, username, nickname) {
    if (!username) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Username is required' 
      }));
      return;
    }

    // Check if username is already taken by another active connection
    for (const [existingClientId, userData] of this.users) {
      if (userData.username === username && existingClientId !== clientId && this.clients.has(existingClientId)) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Username already taken' 
        }));
        return;
      }
    }

    // Store user identity
    this.users.set(clientId, {
      username: username,
      nickname: nickname || username,
      clientId: clientId
    });

    // Enhanced logging with user details
    this.logMessage('info', `👤 BrainXchange user identified`, { 
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

  handleCreateInvite(ws, clientId) {
    const user = this.users.get(clientId);
    if (!user) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Please identify yourself first using the identify message' 
      }));
      return;
    }

    const code = this.generateCode();
    
    // Store invitation (expires in 30 minutes)
    this.invitations.set(code, {
      creatorId: clientId,
      creatorUsername: user.username,
      creatorNickname: user.nickname,
      createdAt: Date.now(),
      expires: Date.now() + 30 * 60 * 1000
    });
    
    // Enhanced invitation logging
    this.logMessage('info', `🎫 BrainXchange invitation created`, { 
      Code: code, 
      User: user.username,
      Name: user.nickname
    });
    
    this.clients.set(clientId, ws);
    
    // Clean up expired invitation after 30 minutes
    setTimeout(() => {
      this.invitations.delete(code);
    }, 30 * 60 * 1000);
    
    ws.send(JSON.stringify({ 
      type: 'invite_created',
      code,
      from: user.nickname,
      expiresIn: '30 minutes'
    }));
  }

  handleConnect(ws, clientId, code, username, nickname) {
    // First identify the connecting user if provided
    if (username) {
      this.handleIdentify(ws, clientId, username, nickname);
    }

    const user = this.users.get(clientId);
    if (!user) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Please identify yourself first' 
      }));
      return;
    }

    const invitation = this.invitations.get(code);
    
    if (!invitation) {
      ws.send(JSON.stringify({ 
        type: 'error',
        message: 'Invalid or expired invitation code'
      }));
      return;
    }
    
    if (Date.now() > invitation.expires) {
      this.invitations.delete(code);
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
    const creatorUser = this.users.get(invitation.creatorId);
    
    // Create bidirectional connection
    const connectionId = Math.random().toString(36).substring(7);
    this.connections.set(connectionId, {
      user1: invitation.creatorId,
      user2: clientId,
      user1Data: creatorUser,
      user2Data: user,
      createdAt: Date.now()
    });
    
    // Enhanced connection logging
    this.logMessage('info', `🤝 BrainXchange users connected`, { 
      Conn: connectionId.substring(0, 8), 
      User1: creatorUser.nickname,
      User2: user.nickname
    });
    
    // Store client websocket
    this.clients.set(clientId, ws);
    
    // Notify both parties with friend information
    ws.send(JSON.stringify({ 
      type: 'connected_to_friend',
      connectionId,
      friend: {
        username: creatorUser.username,
        nickname: creatorUser.nickname
      }
    }));
    
    const creatorWs = this.clients.get(invitation.creatorId);
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
    this.invitations.delete(code);
    
    // Auto-disconnect after 30 minutes of inactivity
    setTimeout(() => {
      this.handleDisconnect(clientId);
    }, 30 * 60 * 1000);
  }

  handleAsk(ws, fromId, content, targetUsername) {
    const fromUser = this.users.get(fromId);
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
      for (const [clientId, userData] of this.users) {
        if (userData.username === targetUsername && this.clients.has(clientId)) {
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
      const connection = this.findConnectionBetween(fromId, targetId);
      if (!connection) {
        ws.send(JSON.stringify({ 
          type: 'error',
          message: `No active connection with ${targetUser.nickname}. Create an invite first.`
        }));
        return;
      }
    } else {
      // Fall back to any active connection
      const connection = this.findConnection(fromId);
      if (!connection) {
        ws.send(JSON.stringify({ 
          type: 'error',
          message: 'No active connection. Please connect first.'
        }));
        return;
      }
      
      targetId = connection.user1 === fromId ? connection.user2 : connection.user1;
      targetUser = this.users.get(targetId);
    }
    
    const targetWs = this.clients.get(targetId);
    if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'error',
        message: `${targetUser ? targetUser.nickname : 'Friend'} is not connected`
      }));
      return;
    }
    
    // Enhanced logging for question forwarding
    this.logMessage('info', `❓ BrainXchange question forwarded`, { 
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

  handleAnswer(ws, fromId, content, targetUsername) {
    const fromUser = this.users.get(fromId);
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
      for (const [clientId, userData] of this.users) {
        if (userData.username === targetUsername && this.clients.has(clientId)) {
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
      const connection = this.findConnectionBetween(fromId, targetId);
      if (!connection) {
        ws.send(JSON.stringify({ 
          type: 'error',
          message: `No active connection with ${targetUser.nickname}`
        }));
        return;
      }
    } else {
      // Fall back to any active connection
      const connection = this.findConnection(fromId);
      if (!connection) {
        ws.send(JSON.stringify({ 
          type: 'error',
          message: 'No active connection'
        }));
        return;
      }
      
      targetId = connection.user1 === fromId ? connection.user2 : connection.user1;
      targetUser = this.users.get(targetId);
    }
    
    const targetWs = this.clients.get(targetId);
    if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'error',
        message: `${targetUser ? targetUser.nickname : 'Friend'} is not connected`
      }));
      return;
    }
    
    // Enhanced logging for answer forwarding
    this.logMessage('info', `💬 BrainXchange answer forwarded`, { 
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

  findConnection(userId) {
    for (const [id, conn] of this.connections) {
      if (conn.user1 === userId || conn.user2 === userId) {
        return conn;
      }
    }
    return null;
  }

  findConnectionBetween(userId1, userId2) {
    for (const [id, conn] of this.connections) {
      if ((conn.user1 === userId1 && conn.user2 === userId2) || 
          (conn.user1 === userId2 && conn.user2 === userId1)) {
        return conn;
      }
    }
    return null;
  }

  handleDisconnect(clientId) {
    // Remove client
    this.clients.delete(clientId);
    
    // Get user info before removing
    const user = this.users.get(clientId);
    
    // Find and notify connected friend
    const connection = this.findConnection(clientId);
    if (connection) {
      const otherId = connection.user1 === clientId ? connection.user2 : connection.user1;
      const otherWs = this.clients.get(otherId);
      
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
      for (const [id, conn] of this.connections) {
        if (conn.user1 === clientId || conn.user2 === clientId) {
          this.connections.delete(id);
        }
      }
    }
    
    // Remove user data (but keep it briefly in case of reconnection)
    setTimeout(() => {
      this.users.delete(clientId);
    }, 5000); // Keep user data for 5 seconds in case of quick reconnect
  }

  generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
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

    const connectedUsers = [];
    for (const [clientId, userData] of this.users) {
      if (this.clients.has(clientId)) {
        const connection = this.findConnection(clientId);
        connectedUsers.push({
          clientId: clientId.substring(0, 8),
          nickname: userData.nickname || userData.username || 'Unknown',
          connectedTime: 'recently', // Could track actual connect time
          hasConnection: !!connection
        });
      }
    }

    return {
      liveClients: this.clients.size,
      activeConnections: this.connections.size,
      totalConnections: this.stats.totalConnections,
      totalMessages: this.stats.totalMessages,
      uptime: uptimeStr,
      startTime: this.stats.startTime,
      connectedUsers: connectedUsers,
      lastMessage: this.stats.lastMessageTime ? {
        time: new Date(this.stats.lastMessageTime).toLocaleString(),
        length: this.stats.lastMessageLength,
        type: 'WebSocket Message'
      } : null
    };
  }

  serveBrainXchangeDashboard(req, res) {
    const currentStats = this.getStats();
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🤝 BrainXchange Dashboard</title>
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
            margin-bottom: 30px;
            padding: 30px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .header h1 { color: white; margin-bottom: 8px; font-size: 2.5em; }
        .header p { opacity: 0.8; font-size: 1.1em; }
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
            background: rgba(255,255,255,0.1);
            padding: 25px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            text-align: center;
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
        }
        .stat-label {
            opacity: 0.7;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .connections-card {
            background: rgba(255,255,255,0.1);
            padding: 25px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            margin-bottom: 20px;
        }
        .connections-card h2 {
            margin-bottom: 20px;
            color: white;
        }
        .user-list {
            display: grid;
            gap: 12px;
        }
        .user-item {
            display: flex;
            align-items: center;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            gap: 12px;
        }
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 20px;
            background: rgba(255,255,255,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
        }
        .user-info { flex: 1; }
        .user-info h4 { margin: 0; font-size: 16px; }
        .user-info p { margin: 0; opacity: 0.7; font-size: 14px; }
        .connection-badge {
            background: #30d158;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            opacity: 0.7;
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
    <div class="container">
        <a href="/" class="back-link">← Back to BrainCloud</a>
        
        <div class="header">
            <h1>🤝 BrainXchange</h1>
            <p><span class="status-indicator"></span>P2P Memory Sharing Network</p>
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
            <div class="user-list">
                ${currentStats.connectedUsers.length === 0 ? 
                  '<div class="empty-state"><h3>No users connected</h3><p>Users will appear here when they connect to BrainXchange</p></div>' :
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

    <script>
        // Auto-refresh every 5 seconds
        setTimeout(() => location.reload(), 5000);
    </script>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }
}

module.exports = BrainXchangeService;