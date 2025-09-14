# BrainCloud Platform

> 🔨 **EXPERIMENTAL** - Working but not production-ready. Needs polish before public release.
>
> **Status**: Functional core, rough edges, security hardening needed

**The unified platform for AI-powered P2P communication and collaboration.**

BrainCloud is the latest evolution of our brain-sharing ecosystem, consolidating all services into a unified platform for Brain Proxy and BrainXchange functionality.

## 🏗️ Architecture

```
BrainCloud Platform (Port 8082)
├── 🌐 Dashboard (/)
├── 🔄 BrainXchange Service (/bx)
│   ├── P2P Memory Sharing
│   ├── Expert Consultation
│   └── WebSocket Connections
├── 🔗 Brain Proxy Service (/bp/)
│   ├── ChatGPT Integration
│   ├── Route Management
│   └── Security Layer
└── 📊 Analytics & Monitoring
```

## 🚀 Local Development

### Prerequisites
- Node.js 22+
- Port 8082 available

### Start Development Server
```bash
# From project root
npm run braincloud:dev

# Or manually
cd services/braincloud
npm install
npm start
```

### Health Check
```bash
curl http://localhost:8082/health
```

## 🌐 Production Deployment

### Environment Setup
```bash
# Required environment variables
export NODE_ENV=production
export PORT=8082
export BRAINCLOUD_SECRET=your-secure-secret
export ALLOWED_ORIGINS=https://your-domain.com
```

### Process Management
```bash
# Using PM2 (recommended)
pm2 start ecosystem.config.js --only braincloud
pm2 status
pm2 logs braincloud

# Manual start
node server.js
```

### Monitoring
```bash
# Check service status
curl http://your-server.com:8082/health

# View logs
pm2 logs braincloud --lines 100

# Monitor resources
pm2 monit
```

## 🔧 Configuration

### Security Settings
- Enable HTTPS in production
- Configure CORS for allowed origins
- Set secure session secrets
- Implement rate limiting

### Service Endpoints
- **Dashboard**: `http://localhost:8082/`
- **BrainXchange**: `http://localhost:8082/bx`
- **Brain Proxy**: `http://localhost:8082/bp`
- **Health Check**: `http://localhost:8082/health`

## 🛠️ Development Notes

This is an experimental platform combining multiple AI communication services. For production use, consider:

1. **Security hardening** - Add authentication, encryption
2. **Load balancing** - Multiple instances for high availability
3. **Monitoring** - Comprehensive logging and alerting
4. **Documentation** - API documentation and user guides

---

*For detailed deployment instructions, see [DEPLOYMENT_AND_CONNECTIVITY_GUIDE.md](../deployment/DEPLOYMENT_AND_CONNECTIVITY_GUIDE.md)*