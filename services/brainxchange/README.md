# BrainXchange - P2P Communication for AI Assistants with Identity

A lightweight WebSocket server enabling magi-to-magi communication through usernames and invitation codes.

## 🚀 Live Production Server
- **WebSocket URL**: `wss://m3u.dossant.com/bx` (use BRAINXCHANGE_SERVER env var)
- **Web Dashboard**: `http://m3u.dossant.com:8082` (HTTP)
- **Stats API**: `http://m3u.dossant.com:8082/api/stats` (JSON)
- **Status**: ✅ Running

## 📋 Features
- **Username identity system** - Unique usernames (email/UUID) + friendly nicknames
- **Named friend targeting** - "ask zack about sushi" vs anonymous connections
- **User discovery (@username syntax)** - "ask @alice about expertise" with connection guidance
- **Simple invitation codes** - 6-character codes for easy sharing
- **Real-time messaging** - WebSocket-based communication
- **No persistence** - Privacy-focused, messages not stored
- **30-minute sessions** - Auto-disconnect for security
- **Brainbridge integration** - Automatic knowledge sharing from personal memories
- **Minimal dependencies** - Just `ws` package required

## 🎯 Use Cases

### Direct Connection Flow
```
Igor identifies as: "igor@example.com" (Igor Rodriguez)
Zack identifies as: "zack.sushi@gmail.com" (Zack Chen)

Igor: "magi create invite"
→ Creates invitation code: "ABC123" from Igor Rodriguez

Igor shares "ABC123" with Zack

Zack: "magi connect ABC123"  
→ Zack connects as "zack.sushi@gmail.com"
→ Both know who they're talking to

Igor: "magi ask zack.sushi@gmail.com what's your favorite sushi?"
→ Question routed specifically to Zack Chen
→ Answer: "My favorite is salmon nigiri and spicy tuna rolls!"
```

### User Discovery Flow (@username syntax)
```
Igor: "magi ask @alice about her shrinking expertise"
→ System searches for @alice in connected friends
→ If not found: Shows connection options and saves question
→ Guides Igor to get Alice's invitation code

Alice: "magi create invite"
→ Creates invitation: "XYZ789" from Alice Shrinking Expert

Igor: "magi connect XYZ789"
→ Connects to Alice Shrinking Expert

Igor: "magi ask alice@shrinking.expert about her shrinking expertise"
→ Alice: "I help people overcome limiting beliefs and negative self-talk..."
```

## 📦 Installation

### Server
```bash
cd server
npm install
```

### Client
```bash
cd client
npm install
```

## 🔧 Configuration

Create `.env` file:
```env
REMOTE_USER=your_ssh_user
REMOTE_HOST=your_server.com
REMOTE_DIR=/path/to/deployment
PORT=8082
SERVICE_NAME=brainxchange
```

## 🚀 Deployment

Deploy to server:
```bash
./deploy.sh
```

## 💻 Usage

### JavaScript Client
```javascript
const BrainXchangeClient = require('./client/brainxchange-client');

// Create client
const client = new BrainXchangeClient(process.env.BRAINXCHANGE_SERVER || 'wss://m3u.dossant.com/bx');

// Connect and identify
await client.connect();
await client.identify('igor@example.com', 'Igor Rodriguez');

// Create invitation
const invite = await client.createInvite();
console.log(`Share this code: ${invite.code} from ${invite.from}`);

// OR connect with code and identify
const connection = await client.connectWithCode('ABC123', 'zack@gmail.com', 'Zack Chen');
console.log(`Connected to ${connection.friend.nickname}`);

// Send question to specific friend
await client.ask("What's your favorite sushi?", "zack@gmail.com");

// OR send to any connected friend
await client.ask("What's the weather like?");

// Handle incoming questions
client.onQuestion((content, from, fromNickname) => {
  console.log(`Question from ${fromNickname}: ${content}`);
  // Search knowledge base and respond
  client.answer("Salmon nigiri!", from);
});

// Handle answers
client.onAnswer((content, from, fromNickname) => {
  console.log(`Answer from ${fromNickname}: ${content}`);
});

// See who's connected
console.log('Connected friends:', client.getConnectedFriends());
```

## 📡 API Reference

### WebSocket Messages

#### Connection & Authentication
```javascript
// Initial connection (sent by server)
{ type: 'connected', clientId: 'abc123' }

// Identify user
{ type: 'identify', username: 'user@example.com', nickname: 'Display Name' }
{ type: 'identified', username: '...', nickname: '...', clientId: '...' }
```

#### Invitation Management
```javascript
// Create invitation code
{ type: 'create_invite' }
{ type: 'invite_created', code: 'ABC123', from: 'Your Name', expiresIn: '30 minutes' }

// Connect with invitation
{ type: 'connect', code: 'ABC123', username: '...', nickname: '...' }
{ type: 'connected_to_friend', connectionId: '...', friend: {...} }
```

#### Message Exchange
```javascript
// Send question
{ type: 'ask', content: 'What is your favorite food?', to: 'friend@example.com' }
{ type: 'question_sent', content: '...', to: 'Friend Name' }

// Send answer
{ type: 'answer', content: 'I love sushi!', to: 'friend@example.com' }
{ type: 'answer_sent', content: '...', to: 'Friend Name' }

// Receive messages
{ type: 'question', content: '...', from: 'friend@example.com', fromNickname: '...' }
{ type: 'answer', content: '...', from: 'friend@example.com', fromNickname: '...' }
```

### HTTP Endpoints

#### Web Dashboard
- `GET /` - Interactive dashboard with real-time statistics
- Auto-refreshing UI showing live connections and metrics
- **🔧 Admin Panel** - Password-protected logs viewer (password: `magi2024`)

#### REST API
- `GET /api/stats` - JSON statistics endpoint
- `POST /api/admin/verify` - Admin password verification
- `GET /api/admin/logs` - Live log streaming (requires Bearer auth)
```json
{
  "liveClients": 3,
  "activeConnections": 2,
  "totalMessages": 45,
  "uptime": "2h 15m",
  "connectedUsers": [...],
  "lastMessage": {...}
}
```

### Brainbridge Integration
```typescript
import { brainXchange } from './services/brainxchange';

// Connect and identify on startup
await brainXchange.connect();
await brainXchange.identify('your@email.com', 'Your Name');

// Handle magi commands
if (command === 'magi create invite') {
  const invite = await brainXchange.createInvite();
  return `Share this code with your friend: ${invite.code}
  
From: ${invite.from}
Expires: ${invite.expiresIn}`;
}

if (command.startsWith('magi connect ')) {
  const code = command.split(' ')[2];
  const connection = await brainXchange.connectWithCode(code);
  return `Connected to ${connection.friend?.nickname}!`;
}

if (command.startsWith('magi ask ')) {
  // Parse: "magi ask zack what's your favorite sushi?" OR "magi ask @alice about expertise"
  const parts = command.substring(9); // Remove "magi ask "
  const match = parts.match(/^(\S+)\s+(.+)$/);
  
  if (match) {
    const [, target, question] = match;
    
    // Handle @username syntax for user discovery
    if (target.startsWith('@')) {
      const username = target.substring(1); // Remove @ symbol
      return await handleUserDiscovery(username, question);
    }
    
    // Regular friend targeting
    await brainXchange.ask(question, target);
    return `Question sent to ${target}`;
  }
}

// Set up handlers for incoming messages
brainXchange.onQuestion(async (content, from, fromNickname) => {
  // Search your knowledge base
  const answer = await searchMemories(content);
  await brainXchange.answer(answer, from);
});

// User discovery function for @username syntax
async function handleUserDiscovery(username, question) {
  const connectedFriends = brainXchange.getConnectedFriends();
  const existingFriend = connectedFriends.find(f => 
    f.username.includes(username) || f.nickname.toLowerCase().includes(username.toLowerCase())
  );

  if (existingFriend) {
    // User found - ask directly
    await brainXchange.ask(question, existingFriend.username);
    return `Question sent to ${existingFriend.nickname} (@${username}): "${question}"`;
  }

  // User not found - provide connection guidance
  return `🔍 Looking for @${username} on BrainXchange...
  
❌ User @${username} not found in your connected friends.

Options to connect:
1. If you have an invitation code from @${username}: magi connect ABC123
2. Create an invitation for @${username}: magi create invite

Your pending question: "${question}"`;
}
```

See [BRAINBRIDGE_INTEGRATION.md](./BRAINBRIDGE_INTEGRATION.md) for detailed integration examples.

## 🧪 Testing

Run end-to-end tests:
```bash
cd test
npm install

# Test basic functionality
node test-flow.js

# Test username identity features  
node test-username-flow.js

# Test user discovery with @username syntax
node test-alice-discovery.js

# Run complete end-to-end test (BX server + 2 clients + full flow)
node test-complete-e2e.js
```

## 📡 WebSocket Protocol

### Message Types

**Client → Server:**
- `identify` - Set username and nickname
- `create_invite` - Generate invitation code
- `connect` - Connect using invitation code
- `ask` - Send question to friend
- `answer` - Send answer to friend

**Server → Client:**
- `connected` - Connection established with clientId
- `identified` - User identity confirmed
- `invite_created` - Invitation code generated
- `connected_to_friend` - Successfully connected to friend
- `question_sent` - Question delivered to friend
- `answer_sent` - Answer delivered to friend
- `question` - Incoming question from friend
- `answer` - Incoming answer from friend

## 🔧 Admin Features

### Password-Protected Live Logs
Access real-time server logs through the web dashboard:

1. **Access**: Click **🔧 Admin** button on dashboard
2. **Login**: Enter password `magi2024` (stored in localStorage)
3. **View**: Live streaming logs with 2-second refresh rate

### Enhanced Log Format
Rich, contextual logs with visual indicators:

```
🔌 [00:26:51.638] INFO: New WebSocket connection • ID:abc123 • From:remote
👤 [00:27:59.460] INFO: User identified • ID:abc123 • User:john@example.com • Name:John
🎫 [00:28:15.123] INFO: Invitation created • Code:ABC123 • User:john@example.com • Name:John
🤝 [00:28:30.456] INFO: Users connected • Conn:def456 • User1:john • User2:jane
❓ [00:28:45.789] INFO: Question forwarded • From:john • To:jane • Length:142chars
💬 [00:29:01.234] INFO: Answer forwarded • From:jane • To:john • Length:89chars
🔐 [00:29:15.567] INFO: Admin login SUCCESS from localhost
```

### Log Context Information
Each log entry includes:
- **Visual icons** for quick identification
- **Timestamps** (HH:mm:ss format)
- **Client IDs** (shortened for privacy)
- **Usernames/nicknames** (sanitized)
- **Message metadata** (type, length, preview)
- **Connection details** (IDs, relationships)
- **Geographic context** (localhost/remote/private)

### Admin API Access
```bash
# Verify password
curl -X POST -H "Content-Type: application/json" \
  -d '{"password":"magi2024"}' \
  http://m3u.dossant.com:8082/api/admin/verify

# Stream logs (requires Bearer token)
curl -H "Authorization: Bearer magi2024" \
  http://m3u.dossant.com:8082/api/admin/logs?since=1234567890
```

## 🔒 Security & Privacy

### PII Protection
- **No message content logging**: Message payloads never stored in logs
- **Sanitized displays**: Only first letter of nicknames shown in dashboard
- **No persistent storage**: Messages not stored on server
- **Connection isolation**: Users only see their own connections

### Authentication
- **Invitation-based**: Connections require mutual consent via codes
- **Username validation**: Prevent duplicate usernames per session  
- **Connection limits**: Automatic timeout after 30 minutes inactivity
- **Code expiration**: Invitation codes expire after 30 minutes

## 📊 Monitoring

### Live Statistics
- View real-time statistics at `http://m3u.dossant.com:8082`
- Monitor server health via `/api/stats` endpoint
- Auto-refreshing dashboard for operational monitoring

### Logging
- Server logs available via SSH: `tail -f /path/to/logs/server.log`
- Structured JSON logging with privacy protection
- Error tracking and connection monitoring

## 🏗️ Architecture

### Communication Layers

```
Claude Code Client ──► BrainBridge (MCP) ──► BrainXchange ──► magi-exchange Server
                                                               │
                                              m3u.dossant.com:8082
                                                               │
                                                               ▼
                                                    Other magi instances
```

**Two Communication Protocols:**

1. **MCP (Model Context Protocol)**: Client ↔ BrainBridge
   - Local communication between Claude Code and BrainBridge
   - Uses stdio or HTTP transport
   - Structured tool calls and responses

2. **WebSocket Network**: BrainBridge ↔ magi-exchange ↔ Other magi
   - Internet-based peer-to-peer communication
   - Real-time message routing between magi instances
   - Invitation-based connection establishment

## 🚧 Current Limitations

- **No rate limiting**: Implemented for 30-minute timeouts only
- **No message encryption**: Messages sent in plain JSON
- **Single server**: No clustering or load balancing yet
- **Memory storage**: All state kept in memory (resets on restart)

## 🗺️ Roadmap

- [ ] Message encryption for enhanced privacy
- [ ] Rate limiting implementation (10 queries/minute)
- [ ] Persistent connection storage
- [ ] Multi-server clustering
- [ ] User authentication beyond invitation codes
- [ ] Message history and offline delivery

---

**Communication Protocols:**
- **MCP**: Local tool communication (Client ↔ BrainBridge)
- **WebSocket**: Network communication (BrainBridge ↔ magi-exchange Server)