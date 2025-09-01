# BrainCloud Platform

**The unified platform for AI-powered P2P communication and collaboration.**

BrainCloud is the latest evolution of our brain-sharing ecosystem, consolidating all services into a single, robust platform. It replaces the individual BrainXchange and Brain Proxy deployments with a unified architecture.

## 🏗️ Architecture

```
BrainCloud Platform (Port 8082)
├── 🌐 Dashboard (/)
├── 🔄 BrainXchange Service (/bx)
│   ├── P2P Memory Sharing
│   ├── Expert Consultation
│   └── WebSocket Connections
├── 🔗 Brain Proxy Service (/bp/)
│   ├── Custom GPT Integration (/bp/connect)
│   ├── MCP Protocol Bridge (/bp/health)
│   └── OpenAPI Spec (/bp/openapi.json)
└── 📊 System APIs (/api/)
    ├── Status Monitoring (/api/status)
    └── Service Statistics (/api/stats)
```

## 🚀 Deployment

### Production Deployment
```bash
cd /Users/igor/Documents/code/agiforme/services/braincloud
./deploy.sh
```

The deployment script:
- ✅ Creates clean deployment package using rsync
- ✅ Handles proper service lifecycle (stop → start → verify)
- ✅ Installs dependencies on remote server
- ✅ Provides comprehensive logging and monitoring
- ✅ Verifies successful startup with health checks
- ✅ Automatically loads NVM environment for Node.js

### Deployment Verification
After deployment, verify all services are working:
```bash
# Check system status
curl -s https://m3u.dossant.com/api/status | jq '.status'

# Check Brain Proxy health
curl -s https://m3u.dossant.com/bp/health | jq '.status'

# Verify dashboard is accessible
curl -s https://m3u.dossant.com/ | head -n 3

# Confirm service is running
ssh igoram2@vps34824.dreamhostps.com 'pgrep -f "node server.js" && echo "✅ Running" || echo "❌ Stopped"'
```

### Service URLs (Production)
- **Dashboard**: `https://m3u.dossant.com/`
- **BrainXchange WebSocket**: `wss://m3u.dossant.com/bx`
- **Brain Proxy WebSocket**: `wss://m3u.dossant.com/bp/connect`
- **System Status**: `https://m3u.dossant.com/api/status`
- **Brain Proxy Health**: `https://m3u.dossant.com/bp/health`

### DreamHost Proxy Configuration
The service runs internally on port 8082 but is automatically proxied by DreamHost:
- **Internal**: `localhost:8082` (server-side only)
- **External**: Standard HTTP/HTTPS ports (80/443)
- **SSL Termination**: Handled by DreamHost proxy layer

**Working Services:**
- `https://m3u.dossant.com/` ✅ (Dashboard)
- `https://m3u.dossant.com/api/status` ✅ (System Status API)
- `https://m3u.dossant.com/bp/health` ✅ (Brain Proxy Health API)

**⚠️ DreamHost WebSocket Proxy Limitation:**
Per DreamHost's official policy: *"WebSockets can be used on a VPS or Dedicated Server using a non-privileged port as a local app. However, running websockets using a Proxy Server that is available to the public is not supported."*

This means public WebSocket URLs are not supported:
- `wss://m3u.dossant.com/bx` ❌ (DreamHost doesn't proxy WebSockets)
- `wss://m3u.dossant.com/bp/connect` ❌ (DreamHost doesn't proxy WebSockets)

**Workaround for Development:**
For WebSocket connections, use direct port access (if available) or configure local development:
```bash
# Local development with deployed APIs
BRAINXCHANGE_SERVER=ws://localhost:8082/bx  # Local BrainCloud instance
BRAIN_PROXY_URL=ws://localhost:8082/bp/connect  # Local BrainCloud instance
```

## 📊 Service Management

### Monitor Service
```bash
# Check if service is running
ssh igoram2@vps34824.dreamhostps.com 'pgrep -f "node server.js" && echo "Running" || echo "Stopped"'

# View logs
ssh igoram2@vps34824.dreamhostps.com 'tail -f /home/igoram2/m3u.dossant.com/braincloud/braincloud.log'

# Check service health
curl -s https://m3u.dossant.com/api/status | jq
```

### Manual Service Control
```bash
# Start service
ssh igoram2@vps34824.dreamhostps.com 'cd /home/igoram2/m3u.dossant.com/braincloud && nohup node server.js > braincloud.log 2>&1 &'

# Stop service
ssh igoram2@vps34824.dreamhostps.com 'pkill -f "node server.js"'

# Restart service
ssh igoram2@vps34824.dreamhostps.com 'pkill -f "node server.js"; sleep 2; cd /home/igoram2/m3u.dossant.com/braincloud && nohup node server.js > braincloud.log 2>&1 &'
```

## 🔄 Migration from Legacy Services

### ⚠️ Deprecated Services
- **❌ BrainXchange Standalone**: `services/brainxchange/` - Now integrated into BrainCloud
- **❌ Individual Brain Proxy**: Separate deployments - Now part of unified platform

### ✅ Current Architecture
All functionality is now consolidated in **BrainCloud Platform**:

| Legacy Service | New Location | URL |
|---|---|---|
| BrainXchange Server | BrainCloud `/bx` | `wss://m3u.dossant.com/bx` |
| Brain Proxy | BrainCloud `/bp/connect` | `wss://m3u.dossant.com/bp/connect` |
| Dashboard | BrainCloud `/` | `https://m3u.dossant.com/` |

### Configuration Updates
Update your client configurations:

**Before (Deprecated)**:
```bash
BRAINXCHANGE_SERVER=ws://m3u.dossant.com:8082
BRAIN_PROXY_URL=ws://m3u.dossant.com:8082/bp/connect
```

**After (BrainCloud)**:
```bash
BRAINXCHANGE_SERVER=wss://m3u.dossant.com/bx
BRAIN_PROXY_URL=wss://m3u.dossant.com/bp/connect
```

## 🧠 Services Overview

### BrainXchange Service (`/bx`)
- **Purpose**: P2P memory sharing and expert consultation
- **Protocol**: WebSocket with JSON messaging
- **Features**:
  - User identification and friend discovery
  - Invitation-based connections
  - Real-time knowledge sharing
  - "magi ask @friend" commands

### Brain Proxy Service (`/bp/`)
- **Purpose**: Custom GPT integration and MCP protocol bridging
- **Protocol**: WebSocket + HTTP APIs
- **Features**:
  - Route-based connections (`/bp/connect`)
  - Health monitoring (`/bp/health`)
  - OpenAPI specification (`/bp/openapi.json`)
  - Secure proxy tunneling

### System APIs (`/api/`)
- **Purpose**: Platform monitoring and statistics
- **Features**:
  - Real-time connection counts
  - Service health status
  - Performance metrics
  - Operational logs

## 🛠️ Development

### Local Development
For local development, individual services can still be run separately:
```bash
# Run legacy BrainXchange for testing
cd services/brainxchange/server && npm start

# Run BrainCloud platform
cd services/braincloud && node server.js
```

### Environment Configuration
```bash
# BrainCloud Production
BRAINXCHANGE_SERVER=wss://m3u.dossant.com/bx
BRAIN_PROXY_URL=wss://m3u.dossant.com/bp/connect

# Local Development (if needed)
BRAINXCHANGE_SERVER=ws://localhost:8082/bx
BRAIN_PROXY_URL=ws://localhost:8082/bp/connect
```

---

## 🎯 Quick Start

1. **Deploy**: `./deploy.sh`
2. **Verify**: `curl https://m3u.dossant.com/api/status`
3. **Monitor**: `ssh igoram2@vps34824.dreamhostps.com 'tail -f /home/igoram2/m3u.dossant.com/braincloud/braincloud.log'`

**Welcome to BrainCloud - The unified brain-sharing platform! 🌥️🧠**