# Deployment and Connectivity Guide

This guide explains the **two distinct communication protocols** used in the mAGI system and how to deploy each component.

## 🔄 Communication Architecture Overview

```
Claude Code Client ──MCP──► BrainBridge ──WebSocket──► magi-exchange Server ──WebSocket──► Other BrainBridge
    (Local)              (Local Process)              (m3u.dossant.com:8082)              (Remote)
```

### Protocol 1: MCP (Model Context Protocol)
**Purpose**: Local communication between Claude Code client and BrainBridge server
- **Transport**: stdio (standard input/output) or HTTP
- **Format**: JSON-RPC structured tool calls
- **Scope**: Single machine, single user
- **Security**: Local process communication
- **Latency**: < 1ms (local)

### Protocol 2: WebSocket Network 
**Purpose**: Internet-based peer-to-peer communication between magi instances
- **Transport**: WebSocket over TCP/IP
- **Server**: m3u.dossant.com:8082
- **Format**: Real-time JSON messages
- **Scope**: Global network, multiple users
- **Security**: Invitation-based authentication
- **Latency**: ~50-200ms (network dependent)

---

## 🧠 BrainBridge Deployment

### Local Development Setup

```bash
cd brainbridge
npm install
npm run build

# Start with stdio transport (for Claude Code)
npm run dev:stdio

# Or start with HTTP transport
npm run dev
```

### Environment Configuration

Create `.env` file in `brainbridge/`:
```bash
# Memory settings
MEMORIES_DIR=/path/to/your/memories
LOG_FILE=/path/to/logs/brainbridge.log
NODE_ENV=development
TRACE_MODE=true

# BrainXchange P2P identity
BRAINXCHANGE_EMAIL=your.email@example.com
BRAINXCHANGE_NAME=Your Display Name
```

### Docker Deployment

```bash
cd brainbridge

# Production deployment
docker-compose up -d

# Development with hot reload
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f brainbridge
```

### Claude Code Integration

Add to your Claude Code MCP configuration:

**Option 1: Local Node.js**
```json
{
  "mcpServers": {
    "brainbridge": {
      "command": "node",
      "args": ["/path/to/brainbridge/dist/server.js", "stdio"],
      "env": {
        "BRAINXCHANGE_EMAIL": "your.email@example.com",
        "BRAINXCHANGE_NAME": "Your Display Name"
      }
    }
  }
}
```

**Option 2: Docker**
```json
{
  "mcpServers": {
    "brainbridge": {
      "command": "docker",
      "args": ["exec", "-i", "brainbridge-mcp", "node", "dist/server.js", "stdio"],
      "env": {
        "BRAINXCHANGE_EMAIL": "your.email@example.com", 
        "BRAINXCHANGE_NAME": "Your Display Name"
      }
    }
  }
}
```

---

## 🌐 magi-exchange Server Deployment

### Production Server (Already Running)

**Live Production Instance:**
- **WebSocket URL**: `ws://m3u.dossant.com:8082`
- **Web Dashboard**: `http://m3u.dossant.com:8082`
- **API Endpoint**: `http://m3u.dossant.com:8082/api/stats`

### Deploy Updates to Production

```bash
cd services/magi-exchange

# Deploy to production server
./deploy.sh

# Verify deployment
curl http://m3u.dossant.com:8082/api/stats
```

### Local Development Server

```bash
cd services/magi-exchange/server
npm install
node src/server.js

# Server starts on localhost:8082
```

### Production Server Configuration

Environment variables in `services/magi-exchange/.env`:
```bash
REMOTE_USER=igoram2
REMOTE_HOST=vps34824.dreamhostps.com
REMOTE_DIR=/home/igoram2/m3u.dossant.com/magi-exchange
PORT=8082
SERVICE_NAME=magi-exchange
```

---

## 🔗 Connection Flow

### 1. Local Setup (MCP Protocol)
1. **Start BrainBridge**: `npm run dev:stdio` or Docker
2. **Configure Claude Code**: Add MCP server config
3. **Test MCP tools**: Try `ai_status` or `search_memories`

### 2. P2P Network Setup (WebSocket Protocol)
1. **Auto-connection**: BrainBridge automatically connects to m3u.dossant.com:8082
2. **Check status**: Use `ai_status` tool to verify BrainXchange connection
3. **Generate invite**: Use `brainxchange_command` with `"magi create invite"`
4. **Share code**: Give 6-character code to friend
5. **Friend connects**: They use `"magi connect ABC123"`

### 3. Communication Test
```bash
# You: Generate invitation
brainxchange_command: "magi create invite"
→ "Share this code: ABC123 (expires in 30 minutes)"

# Friend: Connect with code  
brainxchange_command: "magi connect ABC123"
→ "Connected to Your Display Name!"

# You: Send question
brainxchange_command: "magi ask friend about React patterns"
→ "Question sent to friend"

# Friend receives and answers through their magi
→ "Answer from friend: I recommend using custom hooks..."
```

---

## 🛠️ Troubleshooting Connectivity

### MCP Connection Issues

**"MCP server not responding"**
- Check BrainBridge process is running: `ps aux | grep node`
- Verify MCP config path in Claude Code settings
- Check logs: `tail -f logs/brainbridge.log`

**"Tools not available"**
- Rebuild BrainBridge: `npm run build`
- Restart MCP server in Claude Code
- Check for TypeScript compilation errors

### WebSocket Network Issues

**"BrainXchange integration failed"**
```bash
# Test network connectivity
curl -i http://m3u.dossant.com:8082/

# Should return HTML dashboard, not error
# If timeout/refused, check:
# - DNS resolution: nslookup m3u.dossant.com
# - Firewall settings
# - VPN/proxy configuration
```

**"Connection timeout"**
- Check server status: `http://m3u.dossant.com:8082/api/stats`
- Verify WebSocket support: Most corporate firewalls allow WebSocket
- Test with different network (mobile hotspot)

**"Invitation codes not working"**
- Codes expire after 30 minutes
- Codes are single-use only
- Verify 6-character format (letters/numbers)
- Check server logs for validation errors

### Environment Issues

**"Environment variables not set"**
```bash
# Check current values
echo $BRAINXCHANGE_EMAIL
echo $BRAINXCHANGE_NAME

# Set temporarily
export BRAINXCHANGE_EMAIL="your.email@example.com"
export BRAINXCHANGE_NAME="Your Display Name"

# Or add to ~/.bashrc for permanent
```

---

## 📊 Monitoring and Status

### Real-time Monitoring
- **Live Dashboard**: `http://m3u.dossant.com:8082`
- **Statistics API**: `http://m3u.dossant.com:8082/api/stats`
- **Admin Logs Panel**: Password-protected live log streaming (password: `magi2024`)
- **BrainBridge Status**: Use `ai_status` MCP tool

### Log Monitoring
```bash
# BrainBridge logs
tail -f brainbridge/logs/brainbridge.log

# magi-exchange server logs (via web admin panel)
# Visit http://m3u.dossant.com:8082 -> Click "🔧 Admin" -> Enter password "magi2024"

# magi-exchange server logs (via API)
curl -H "Authorization: Bearer magi2024" \
  http://m3u.dossant.com:8082/api/admin/logs

# Docker logs
docker-compose logs -f brainbridge
```

### Health Checks
```bash
# Test MCP connectivity
echo '{"method":"list_tools"}' | node brainbridge/dist/server.js stdio

# Test WebSocket connectivity  
curl http://m3u.dossant.com:8082/api/stats

# Test P2P functionality
# Use brainxchange_command tool with "magi create invite"
```

---

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] BrainBridge builds successfully (`npm run build`)
- [ ] Environment variables configured
- [ ] Memory directory exists and accessible
- [ ] Network connectivity to m3u.dossant.com:8082 verified

### Post-deployment  
- [ ] MCP tools available in Claude Code
- [ ] `ai_status` shows BrainXchange connection successful
- [ ] Can generate invitation codes
- [ ] Web dashboard shows live statistics
- [ ] Admin logs panel accessible with password
- [ ] Logs show successful initialization with enhanced formatting

### Production Verification
- [ ] Server responds at m3u.dossant.com:8082
- [ ] WebSocket connections accepted
- [ ] Invitation system working
- [ ] Message routing functional
- [ ] No PII in server logs (sanitized with first letter only)
- [ ] Statistics updating in real-time
- [ ] Admin logs show enhanced formatting with emojis and context
- [ ] Password authentication working for admin access

---

**Protocol Summary:**
- **MCP**: Local client ↔ BrainBridge communication
- **WebSocket**: Network BrainBridge ↔ magi-exchange ↔ other magi communication