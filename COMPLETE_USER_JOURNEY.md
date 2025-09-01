# 🚀 Complete AGIfor.me User Journey

> **From "What is this?" to "I'm using my memories with AI daily" - Three clear paths to get you there**

## 🎯 Choose Your Adventure

**New to AGIfor.me?** Pick the track that matches your needs:

- **🏠 Track 1: Local Expert** - Use with Claude Code, everything stays on your computer
- **💬 Track 2: ChatGPT Integration** - Access your memories from ChatGPT Custom GPT
- **🌐 Track 3: Multi-Platform Master** - Advanced setup for multiple AI platforms

---

## 🏠 Track 1: Local Expert (Recommended Start)
*Perfect for: Privacy-focused users, Claude Code users, getting started*

### What You'll Get
- ✅ **Claude Code integration** - Use `magi save "content"` and `magi query "question"`
- ✅ **Complete privacy** - Everything stays on your computer
- ✅ **Interactive CLI** - Terminal-based memory management
- ✅ **Local AI processing** - Ollama models for categorization and search

### Setup Time: ~15 minutes

### Step-by-Step Guide

#### 1. Prerequisites Check
```bash
node --version    # Need v18+
git --version     # Any recent version
```

**Required:** 
- [Claude Code](https://claude.ai/code) or Claude Desktop (for MCP support)
- 8GB+ RAM (for local AI models)

#### 2. Install & Setup
```bash
# Clone and install
git clone [repository-url] agiforme  # (Will be public soon)
cd agiforme
npm install

# Complete bootstrap setup
npm run bootstrap
```

**What bootstrap does:**
- Installs all dependencies and workspaces
- Downloads AI models (~5GB) via Ollama
- Creates your memory structure at `./data/memories/profiles/default/`
- Configures everything automatically

#### 3. Verify Everything Works
```bash
npm run diag
```

**You should see:**
- ✅ Ollama: Running (4 models)
- ✅ BrainBridge: Ready
- ✅ Memories: X indexed (./data/memories/profiles/default)

#### 4. Start Daily Usage
```bash
# Start the system (keep this running)
npm run start

# In Claude Code, try:
# "magi save 'Remember to check email before important meetings'"
# "magi what do I know about meeting preparation?"
```

### Daily Workflow
- **Save memories**: `magi save "your insight here"`
- **Query memories**: `magi tell me about X`
- **Check status**: `magi status`
- **Interactive mode**: Run `npm run magi` for CLI interface

---

## 💬 Track 2: ChatGPT Integration
*Perfect for: ChatGPT users who want to access their memories from web ChatGPT*

### What You'll Get
- ✅ **Everything from Track 1** PLUS
- ✅ **ChatGPT Custom GPT** - Access memories from ChatGPT web interface
- ✅ **Remote access** - Use your memories from anywhere
- ✅ **Graceful degradation** - Works even when your computer is off

### Setup Time: ~45 minutes
*Includes Track 1 setup + server deployment + Custom GPT creation*

### Step-by-Step Guide

#### 1. Complete Track 1 First
Follow all steps in Track 1 above. Verify local setup works before continuing.

#### 2. Configure Brain Proxy
```bash
# Copy and edit configuration
cp config/env.template .env
nano .env  # or use your preferred editor
```

**Update these settings:**
```bash
# Required for ChatGPT integration
BRAIN_PROXY_ENABLED=true
BRAIN_PROXY_ROUTE=your_unique_name  # Use your name/ID
BRAIN_PROXY_SECRET=your_secure_password_here  # 12+ characters

# Update with your server domain
AGIFORME_SERVER_DOMAIN=your-server.com
```

#### 3. Deploy Brain Proxy Server
```bash
cd services/braincloud
./deploy.sh
```

**Verify deployment:**
```bash
curl https://your-server.com:8082/bp/health
# Should show: {"status": "online", "connectedBrains": 0}
```

#### 4. Start Local Brain Connection
```bash
# Back to main directory
cd ../..
npm run start
```

**Verify connection:**
```bash
# In another terminal
curl https://your-server.com:8082/bp/health
# Should now show: {"status": "online", "connectedBrains": 1}
```

#### 5. Create ChatGPT Custom GPT
1. Go to [ChatGPT](https://chat.openai.com) → "Explore GPTs" → "Create a GPT"
2. **Name**: "My AGIfor.me Brain"
3. **Description**: "Access my personal memory bank"
4. **Instructions**: "You are my personal AI assistant with access to my knowledge base through AGIfor.me Brain Proxy."
5. **Actions**: Import from `https://your-server.com/bp/openapi.json`
6. **Authentication**: API Key
7. **API Key**: Use your `BRAIN_PROXY_SECRET` value
8. **Header Name**: `X-Brain-Key`

#### 6. Test Integration
In your Custom GPT, try:
- "What memories do I have about testing?"
- "Save this memory: ChatGPT integration working perfectly!"

### Daily Workflow
- **Local use**: Same as Track 1 (`magi save/query`)
- **ChatGPT web**: Use your Custom GPT to access memories remotely
- **Mobile access**: Your Custom GPT works on ChatGPT mobile app

---

## 🌐 Track 3: Multi-Platform Master
*Perfect for: Advanced users, developers, power users who want maximum flexibility*

### What You'll Get
- ✅ **Everything from Track 1 & 2** PLUS
- ✅ **Multiple AI platform integration** (experimental)
- ✅ **API endpoints** for custom integrations
- ✅ **Advanced configuration options**
- ✅ **P2P memory sharing** with BrainXchange

### Setup Time: 1-2 hours
*Requires technical knowledge and custom configuration*

### Current Platform Support
| Platform | Status | Access Method |
|----------|--------|---------------|
| **Claude Code** | ✅ Ready | MCP wake words |
| **ChatGPT Custom GPT** | ✅ Ready | Brain Proxy |
| **Claude.ai Web** | 🚧 Experimental | Manual copy/paste |
| **Perplexity** | 🚧 Research | API integration |
| **Anthropic API** | 🚧 Planned | Direct integration |

### Step-by-Step Guide

#### 1. Complete Track 2 First
Ensure both local and ChatGPT integration work before proceeding.

#### 2. Enable Advanced Features
```bash
# Edit configuration
nano .env
```

**Add experimental settings:**
```bash
# Enable all experimental features
BRAINXCHANGE_ENABLED=true
BRAINXCHANGE_EMAIL=your-email@example.com
BRAINXCHANGE_NAME="Your Name"

# API access (future feature)
API_ENABLED=true
API_KEY=your_api_key_here
```

#### 3. Platform-Specific Setup

##### Claude.ai Web (Manual Method)
Currently requires manual export/import:
```bash
# Export memories for Claude.ai session
npm run magic export --format=claude-context
```

Copy the output and paste into Claude.ai as context.

##### API Integration (Advanced)
```bash
# Start HTTP server for API access
npm run start -- http 8147
```

Your memories are now accessible via:
- `http://localhost:8147/mcp` - MCP protocol
- `http://localhost:8147/api/memories` - REST API (future)

#### 4. P2P Memory Sharing (Experimental)
```bash
# Share memories with trusted contacts
npm run magic share --create-invite
npm run magic connect --invite=received_invite_code
```

### Platform Integration Roadmap
- **✅ Phase 1**: Claude Code (MCP) + ChatGPT (Brain Proxy)
- **🚧 Phase 2**: Claude.ai web integration, Perplexity
- **📅 Phase 3**: Anthropic API, OpenAI API direct integration
- **📅 Phase 4**: Native mobile apps

---

## 🔧 Troubleshooting & Support

### Common Issues

#### Track 1 Issues
**"Ollama not running"**
```bash
# Start Ollama service
ollama serve
# Re-run diagnostics
npm run diag
```

**"BrainBridge not ready"**
```bash
# Kill any existing processes
npm run kill
# Restart clean
npm run start
```

**"No memories found"**
```bash
# Check memory location
npm run mem:path
# Create test memory
magi save "This is a test memory"
```

#### Track 2 Issues
**"Brain Proxy offline"**
```bash
# Check server health
curl https://your-server.com:8082/bp/health
# Restart local connection
npm run start
```

**"Custom GPT authentication failed"**
- Verify `X-Brain-Key` header matches `BRAIN_PROXY_SECRET`
- Check API endpoint URL is correct
- Ensure server is deployed and accessible

### Getting Help

1. **Check diagnostics**: `npm run diag` catches 90% of issues
2. **View logs**: `npm run bb:logs` for detailed debugging
3. **GitHub Issues**: [Report bugs](https://github.com/anthropics/claude-code/issues) (when public)
4. **Documentation**: See `docs/` folder for detailed guides

### Performance Tips

- **Local AI**: Requires 8GB+ RAM for optimal performance
- **Network**: Brain Proxy needs stable internet for remote access
- **Storage**: Each model uses ~4GB, plan accordingly

---

## 🎯 Success Metrics

### Track 1 Success
- [ ] Can save memories with `magi save "content"`
- [ ] Can query memories with `magi query "question"`
- [ ] Status command shows all green checkmarks
- [ ] Interactive CLI responds to commands

### Track 2 Success
- [ ] All Track 1 items work
- [ ] Custom GPT can access and save memories
- [ ] Works when local computer is off (graceful degradation)
- [ ] Can use from mobile ChatGPT app

### Track 3 Success
- [ ] All Track 2 items work
- [ ] Multiple platform integrations active
- [ ] API endpoints accessible
- [ ] Advanced features configured

## 🚀 What's Next?

**Just getting started?** Start with Track 1, then graduate to Track 2 when you want ChatGPT access.

**Ready for more?** Join our community and help shape the future of personal AI knowledge management.

**Want to contribute?** Check out our development guides in `docs/development/`

---

*Last updated: [Current Date] | Version: 1.0 | For support: See troubleshooting section above*