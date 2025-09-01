# 🌥️ BrainCloud Platform Guide

**BrainCloud** is the unified cloud platform that hosts AI brain services, providing scalable infrastructure for memory sharing, GPT integration, and future brain services.

## 🏗️ Architecture Overview

```
BrainCloud Platform (m3u.dossant.com)
├── 🌥️ /          → BrainCloud Dashboard & Management
├── 🤝 /bx/        → BrainXchange Service (P2P memory sharing)
├── 🧠 /bp/        → Brain Proxy Service (GPT integration bridge)
└── 📊 /api/status → System Status API
```

## 🚀 Services

### 1. **BrainXchange** (`/bx/`)
**Purpose:** Peer-to-peer memory sharing between AI assistants

**Live Production Instance:**
- **WebSocket**: `wss://m3u.dossant.com/bx`
- **Dashboard**: `http://m3u.dossant.com:8082`
- **Status**: ✅ Running

**Features:**
- Real-time P2P messaging between AI assistants
- Invitation-based connections (6-character codes)
- Username identity system with nicknames
- 30-minute session timeouts for security
- Live monitoring dashboard with admin logs
- No message persistence (privacy-focused)

**Endpoints:**
- `wss://m3u.dossant.com/bx` - WebSocket connection
- `https://m3u.dossant.com/bx/` - BrainXchange dashboard  
- `https://m3u.dossant.com/bx/stats` - Statistics API

**Features:**
- Invitation-based connections
- Real-time message routing
- User identity management
- Connection tracking and monitoring

### 2. **Brain Proxy** (`/bp/`)
**Purpose:** Bridge between Custom GPTs and local AGIfor.me instances

**Endpoints:**
- `https://m3u.dossant.com/bp/rpc/{route}` - RPC endpoint for GPTs
- `wss://m3u.dossant.com/bp/connect` - WebSocket for local connectors
- `https://m3u.dossant.com/bp/health` - Health check
- `https://m3u.dossant.com/bp/openapi.json` - OpenAPI schema
- `https://m3u.dossant.com/bp/privacy` - Privacy policy

**Features:**
- Route-based access control
- Graceful offline mode
- Request correlation and timeouts
- Privacy-first architecture

### 3. **BrainCloud Dashboard** (`/`)
**Purpose:** Central management and monitoring interface

**Features:**
- Real-time service statistics
- Visual service overview
- Quick access links
- System health monitoring

## 📦 Deployment

### Local Development

```bash
cd services/braincloud
npm install
npm run dev
```

**Access:**
- Dashboard: http://localhost:8082/
- BrainXchange: ws://localhost:8082/bx
- Brain Proxy: http://localhost:8082/bp/

### Production Deployment

```bash
cd services/braincloud
./deploy.sh
```

**Environment Variables:**
```bash
# Optional: Configure deployment target
export REMOTE_USER="your-username"
export REMOTE_HOST="your-server.com"
export REMOTE_DIR="/path/to/deployment"
export PORT="8082"
```

## 📊 Platform Monitoring

### Live Statistics Dashboard
- **URL**: `http://m3u.dossant.com:8082`
- **Auto-refresh**: Updates every 5 seconds
- **Metrics Displayed**:
  - Connected clients across all services
  - Active connections and message throughput
  - Service uptime and health status
  - Real-time user activity (anonymized)
  - System resource usage

### Admin Access
- **Admin Panel**: Password-protected (🔧 Admin button)
- **Password**: `magi2024` (stored in localStorage)
- **Features**:
  - Live log streaming with 2-second refresh
  - Enhanced log format with visual indicators
  - Privacy-protected contextual information
  - Real-time connection monitoring

### API Endpoints for Monitoring
```bash
# Get platform statistics
curl http://m3u.dossant.com:8082/api/stats

# Admin password verification
curl -X POST -H "Content-Type: application/json" \
  -d '{"password":"magi2024"}' \
  http://m3u.dossant.com:8082/api/admin/verify

# Stream admin logs (requires Bearer auth)
curl -H "Authorization: Bearer magi2024" \
  http://m3u.dossant.com:8082/api/admin/logs?since=1234567890
```

### Sample Statistics Response
```json
{
  "platform": {
    "uptime": "2h 15m",
    "totalServices": 2,
    "servicesRunning": 2
  },
  "brainxchange": {
    "liveClients": 3,
    "activeConnections": 2,
    "totalMessages": 45,
    "connectedUsers": [
      {"nickname": "I***", "connections": 1},
      {"nickname": "Z***", "connections": 1}
    ]
  },
  "brainproxy": {
    "status": "running",
    "activeRoutes": 5,
    "requestsToday": 123
  }
}
```

### Enhanced Logging
Rich, contextual logs with privacy protection:

```
🔌 [00:26:51.638] INFO: New WebSocket connection • ID:abc123 • From:remote
👤 [00:27:59.460] INFO: User identified • ID:abc123 • User:john@*** • Name:J***
🎫 [00:28:15.123] INFO: Invitation created • Code:ABC123 • User:john@*** • Name:J***
🤝 [00:28:30.456] INFO: Users connected • Conn:def456 • User1:j*** • User2:j***
❓ [00:28:45.789] INFO: Question forwarded • From:j*** • To:j*** • Length:142chars
💬 [00:29:01.234] INFO: Answer forwarded • From:j*** • To:j*** • Length:89chars
🔐 [00:29:15.567] INFO: Admin login SUCCESS from localhost
```

### Health Checks
- **BrainXchange**: `ws://m3u.dossant.com:8082/bx` - WebSocket connection test
- **Brain Proxy**: `http://m3u.dossant.com:8082/bp/health` - HTTP health endpoint
- **Platform**: `http://m3u.dossant.com:8082/api/stats` - Overall platform status

### Privacy & Security
- **PII Protection**: Message content never logged or stored
- **Data Sanitization**: Only first letter of usernames/nicknames shown
- **Connection Isolation**: Users only see their own connections
- **Session Management**: 30-minute automatic timeouts
- **Admin Security**: Password-protected access to sensitive logs

## 🔧 Configuration

### BrainBridge Integration

Update your local BrainBridge `.env` file:

```env
# BrainCloud Configuration
BRAINCLOUD_URL=wss://m3u.dossant.com

# BrainXchange Configuration (P2P Memory Sharing)
BRAINXCHANGE_EMAIL=your@email.com
BRAINXCHANGE_NAME=Your Name
BRAINXCHANGE_SERVER=wss://m3u.dossant.com/bx

# Brain Proxy Configuration (Custom GPT Integration)
BRAIN_PROXY_ENABLED=true
BRAIN_PROXY_URL=wss://m3u.dossant.com:8082/bp/connect
BRAIN_PROXY_SECRET=your-unique-secret-key-min-8-chars
BRAIN_PROXY_ROUTE=your-unique-route-name
BRAIN_PROXY_LOCAL_MCP_URL=http://localhost:8147/mcp
```

### Custom GPT Setup

**OpenAPI Schema URL:**
```
https://m3u.dossant.com:8082/bp/openapi.json
```

**Privacy Policy URL:**
```
https://m3u.dossant.com:8082/bp/privacy
```

**RPC Endpoint:**
```
https://m3u.dossant.com:8082/bp/rpc/{your-route}
```

## 🧪 Testing

### Run Integration Tests

```bash
# Test against local development
BRAINCLOUD_URL=http://localhost:8082 \
node scripts/test-brain-proxy.js

# Test against production
BRAINCLOUD_URL=https://m3u.dossant.com:8082 \
node scripts/test-brain-proxy.js
```

### Manual Testing

**Test BrainCloud Dashboard:**
```bash
curl -s https://m3u.dossant.com:8082/ | grep -i braincloud
```

**Test System Status:**
```bash
curl -s https://m3u.dossant.com:8082/api/status | jq
```

**Test Brain Proxy Health:**
```bash
curl -s https://m3u.dossant.com:8082/bp/health | jq
```

**Test OpenAPI Schema:**
```bash
curl -s https://m3u.dossant.com:8082/bp/openapi.json | jq '.info'
```

## 📊 Monitoring

### Real-time Dashboard
Visit https://m3u.dossant.com:8082/ for live statistics and service overview.

### API Monitoring
```bash
# Overall system status
curl -s https://m3u.dossant.com:8082/api/status | jq '.services'

# BrainXchange statistics
curl -s https://m3u.dossant.com:8082/bx/stats | jq

# Brain Proxy health
curl -s https://m3u.dossant.com:8082/bp/health | jq '.stats'
```

### Log Monitoring
```bash
# SSH into server and monitor logs
ssh user@m3u.dossant.com
tail -f /path/to/deployment/braincloud.log
```

## 🔒 Security

### Access Control
- **Route Isolation**: Each Brain Proxy user gets unique route
- **Token Authentication**: Secure WebSocket connections
- **No Data Persistence**: Transit-only proxy architecture
- **CORS Enabled**: Safe cross-origin access

### Privacy Features
- **No Memory Storage**: Personal data never persisted
- **Local Processing**: Memories remain on user devices
- **Graceful Degradation**: Professional offline responses
- **Audit Logging**: System operations logged (no personal data)

## 🚧 Service Management

### Start/Stop Services
```bash
# Start BrainCloud Platform
ssh user@server 'cd /path/to/deployment && nohup node server.js > braincloud.log 2>&1 &'

# Stop BrainCloud Platform
ssh user@server 'pkill -f "node server.js"'

# Check status
ssh user@server 'pgrep -f "node server.js" && echo "Running" || echo "Stopped"'
```

### Process Monitoring
```bash
# Check process health
curl -s https://m3u.dossant.com:8082/api/status | jq '.status'

# Monitor resource usage
ssh user@server 'top -p $(pgrep -f "node server.js")'
```

## 🔮 Future Services

The BrainCloud architecture is designed for easy extension. Future services can be added:

```
BrainCloud Platform
├── /bx/ → BrainXchange (P2P sharing)
├── /bp/ → Brain Proxy (GPT bridge) 
├── /bs/ → BrainSync (cross-device sync)
├── /ba/ → BrainAnalytics (usage insights)
└── /bt/ → BrainTrain (model training)
```

Each service follows the same pattern:
- Namespace-based routing (`/service/`)
- Modular service architecture
- Unified logging and monitoring
- Consistent API patterns

## 📝 Migration from Legacy

### From Old BrainXchange Server

**Old URLs:**
- `ws://m3u.dossant.com:8082/` (root WebSocket)

**New URLs:**
- `wss://m3u.dossant.com/bx` (namespaced with SSL)

**Migration Steps:**
1. Deploy new BrainCloud platform
2. Update local BrainBridge configuration
3. Test connections work with new endpoints
4. Retire old server

### Backward Compatibility
The BrainCloud platform maintains backward compatibility:
- Root WebSocket connections redirect to `/bx`
- Legacy endpoints continue to work
- Gradual migration supported

---

## 🎉 Welcome to BrainCloud!

The BrainCloud platform provides a professional, scalable foundation for AI brain services. With clean service separation, unified monitoring, and extensible architecture, it's ready to power the future of personal AI systems.

**Key Benefits:**
- ✅ **Unified Platform** - One server, multiple brain services
- ✅ **Clean Architecture** - Namespace-based service isolation  
- ✅ **Professional UI** - Beautiful dashboards and monitoring
- ✅ **Scalable Design** - Easy to add new brain services
- ✅ **Privacy-First** - No data persistence, local control
- ✅ **Production Ready** - Robust deployment and monitoring