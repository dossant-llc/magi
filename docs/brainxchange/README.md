# BrainXchange - P2P Communication for AI Assistants with Identity

A lightweight WebSocket server enabling magi-to-magi communication through usernames and invitation codes.

## 🚀 Live Server
- **URL**: `wss://m3u.dossant.com/bx`
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
- `connect` - Connect using invitation code (with optional identity)
- `ask` - Send question to friend (with optional target username)
- `answer` - Send answer to friend (with optional target username)

**Server → Client:**
- `connected` - Initial connection with client ID
- `identified` - Confirmation of identity set
- `invite_created` - Invitation code generated (with creator info)
- `connected_to_friend` - Successfully connected via code (with friend info)
- `friend_connected` - Friend joined using your code (with friend info)
- `question` - Incoming question from friend (with sender info)
- `answer` - Incoming answer from friend (with sender info)
- `friend_disconnected` - Friend left (with friend info)
- `error` - Error message

## 🔒 Security & Privacy
- No message persistence
- 30-minute session timeout
- Invitation codes expire after 30 minutes
- Single-use connections
- No authentication or user accounts

## 🛠️ Development

### Server Requirements
- Node.js 12+ (18+ recommended)
- Port 8082 available
- WebSocket support

### Local Testing
```bash
# Terminal 1: Start server
cd server
PORT=3003 npm start

# Terminal 2: Run test
cd test
npm test
```

## 📊 Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Magi A  │────▶│  Server  │◀────│  Magi B  │
│  (Igor)  │     │  :8082   │     │  (Zack)  │
└──────────┘     └──────────┘     └──────────┘
     │                 │                 │
     └─────────────────┴─────────────────┘
           WebSocket Connections
```

## 🚦 Server Management

```bash
# SSH to server
ssh igoram2@vps34824.dreamhostps.com

# Navigate to app
cd /home/igoram2/m3u.dossant.com/brainxchange

# View logs
tail -f logs/server.log

# Start/stop server
./start.sh
./stop.sh

# Check if running
ps aux | grep node
```

## 📈 Future Enhancements
- [ ] Message encryption
- [ ] Multi-user groups
- [ ] Persistent connections
- [ ] Payment integration for expert marketplace
- [ ] Knowledge discovery features

## 📄 License
MIT

## 🤝 Contributing
This is a simple MVP. For production features, see the full design documents in the parent directory.