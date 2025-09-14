# 🚀 BrainCloud Deployment Quick Reference

## Current Production Setup

**Server**: `user@server`  
**Directory**: `/home/igoram2/your-server.com/braincloud`  
**Public URLs**: 
- 🌥️ **Dashboard**: https://your-server.com/
- 🧠 **Brain Proxy**: https://your-server.com/bp/
- 🤝 **BrainXchange**: wss://your-server.com/bx

## Quick Deployment Commands

### Deploy New Version
```bash
cd services/braincloud
./deploy.sh
```

### Manual Service Management

**Check Status:**
```bash
ssh user@server "ps aux | grep -v grep | grep 'node.*server'"
```

**Restart Service:**
```bash
ssh user@server "
  # Stop old process
  pkill -f 'node.*server.js'
  
  # Start BrainCloud
  source ~/.nvm/nvm.sh && 
  cd /home/igoram2/your-server.com/braincloud && 
  nohup node server.js > braincloud.log 2>&1 &
"
```

**View Logs:**
```bash
ssh user@server "tail -f /home/igoram2/your-server.com/braincloud/braincloud.log"
```

**Install Dependencies (if needed):**
```bash
ssh user@server "
  source ~/.nvm/nvm.sh && 
  cd /home/igoram2/your-server.com/braincloud && 
  npm install
"
```

## PM2 Setup (Recommended for Production)

### Install PM2
```bash
ssh user@server "
  source ~/.nvm/nvm.sh && 
  npm install -g pm2
"
```

### PM2 Service Management
```bash
# Start with PM2
ssh user@server "
  source ~/.nvm/nvm.sh && 
  cd /home/igoram2/your-server.com/braincloud && 
  pm2 start server.js --name braincloud
"

# Common PM2 commands
ssh user@server "
  source ~/.nvm/nvm.sh && 
  pm2 list              # List all processes
  pm2 restart braincloud # Restart BrainCloud
  pm2 stop braincloud    # Stop BrainCloud
  pm2 logs braincloud    # View logs
  pm2 monit              # Monitor resources
"
```

### Auto-restart on Reboot
```bash
ssh user@server "
  source ~/.nvm/nvm.sh && 
  pm2 startup && 
  pm2 save
"
```

## Health Check Commands

**Quick Test:**
```bash
curl -s https://your-server.com/bp/health | jq '.status'
curl -s https://your-server.com/api/status | jq '.platform'
```

**Full Integration Test:**
```bash
node scripts/test-brain-proxy.js
```

**Dashboard Check:**
```bash
curl -s https://your-server.com/ | grep -i "braincloud"
```

## Custom GPT Setup URLs

**For ChatGPT Custom GPT configuration:**

- **OpenAPI Schema**: `https://your-server.com/bp/openapi.json`
- **Privacy Policy**: `https://your-server.com/bp/privacy`
- **Health Check**: `https://your-server.com/bp/health`

### ChatGPT Compatibility Fix (Aug 30, 2025)
**Issue**: ChatGPT Custom GPT rejected OpenAPI schema with error: `('openapi',): Input should be '3.1.1' or '3.1.0'`

**Solution**: Updated OpenAPI version in `services/braincloud/services/brainproxy.js:89`
```javascript
// Changed from:
openapi: '3.0.0',

// To:
openapi: '3.1.0',
```

**Deployment**: File was updated and deployed automatically. Verification:
```bash
curl -s https://your-server.com/bp/openapi.json | jq '.openapi'
# Returns: "3.1.0"
```

✅ **Status**: ChatGPT Custom GPT now accepts the OpenAPI schema

## Troubleshooting

### Service Won't Start
1. Check if another process is using port 8082
2. Install missing dependencies: `npm install`
3. Check logs: `tail -f braincloud.log`

### Old Service Still Running
```bash
# Find and kill old processes
ssh user@server "
  ps aux | grep node
  pkill -f 'node.*server'
"
```

### Dependencies Missing
```bash
ssh user@server "
  source ~/.nvm/nvm.sh && 
  cd /home/igoram2/your-server.com/braincloud && 
  npm install
"
```

### Can't Access NVM/Node
```bash
# Always source NVM first
ssh user@server "source ~/.nvm/nvm.sh && node --version"
```

---

## 📝 Notes

- **Port Mapping**: Internal port 8082 is proxied to standard HTTP/HTTPS ports
- **Node.js**: Accessed via NVM (`source ~/.nvm/nvm.sh`)
- **Process Management**: Currently using `nohup`, PM2 recommended for production
- **Logs**: Located at `/home/igoram2/your-server.com/braincloud/braincloud.log`
- **Auto-deployment**: `./deploy.sh` handles file upload and basic restart

## 🎯 Current Status

✅ **BrainCloud Platform**: Running successfully  
✅ **Brain Proxy**: Ready for Custom GPT integration  
✅ **BrainXchange**: P2P service operational  
✅ **All endpoints**: Accessible via HTTPS