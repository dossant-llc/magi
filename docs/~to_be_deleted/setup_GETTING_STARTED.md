# 🚀 Getting Started with AGIfor.me

> **Complete setup guide from zero to working AI assistant in ~15 minutes**

## 📋 Prerequisites Check

Before starting, make sure you have:
- ✅ **Node.js v22+** - Check: `node --version`  
- ✅ **Git** - Check: `git --version`
- ✅ **Claude Code** or Claude Desktop (MCP-compatible AI assistant)
- ✅ **8GB+ RAM** (for local AI models)

## 🎯 Step 1: Install & Setup

### Clone the Repository
```bash
# Note: This will be public soon, for now use the path you have
cd /your/desired/directory
git clone [repository-url] agiforme
cd agiforme
```

### Install Dependencies
```bash
npm install
```

### Set Up Your Memory Structure
```bash
./setup.sh
```

This creates your personal `memories/` folder with privacy levels:
- `public/` - Shareable knowledge
- `personal/` - Private but accessible to local AI
- `private/` - Maximum security
- etc.

## 🤖 Step 2: Install Local AI (Ollama)

### Install Ollama
```bash
# macOS
brew install ollama

# Or download from: https://ollama.ai
```

### Start Ollama Service
```bash
ollama serve
```
*Keep this running in a separate terminal*

### Download Required Models
```bash
# This downloads ~5GB of models - be patient!
npm run ai:pull
```

### Verify AI Setup
```bash
npm run ai:status
```
Should show:
```
🤖 Ollama Status: Running
📦 Models available: 2+
  - llama3.1:8b
  - mxbai-embed-large
```

## 🔧 Step 3: Start BrainBridge

### Start the Server
```bash
npm run dev
```

### Test Basic Functionality
```bash
# In another terminal, run diagnostics
npm run diag
```

Should show mostly ✅ green checkmarks. If not:
```bash
npm run fix-paths  # Auto-fix common issues
npm run diag       # Verify fixes
```

## 🧠 Step 4: Connect to Claude Code

### Choose Your Setup Style

**🌍 SUPER SIMPLE (Recommended):**
```bash
npm run install:global
```
Then add to Claude Code MCP settings:
```json
{ "mcpServers": { "magi": { "command": "magi" } } }
```

**🔧 ADVANCED (More control):**
```bash
npm run setup:mcp
```
Then copy the generated configuration and system instructions.

### Final Steps

1. **Add the configuration** to Claude Code MCP settings
2. **Add system instructions** (provided by either setup command)  
3. **Restart Claude Code** completely (important!)

**That's it!** Both methods handle the complexity and give you exactly what you need.

## ✅ Step 5: Test Everything Works

### Test 1: Save a Memory
In Claude Code, try:
```
magi save "My favorite coffee shop is Blue Bottle - they have the best single origin beans"
```

Should respond: `✅ Memory saved successfully!`

### Test 2: Query the Memory  
```
magi what's my favorite coffee shop?
```

Should find and return your coffee shop info.

### Test 3: Check System Status
```
magi status
```

Should show all ✅ green status indicators.

## 🎉 You're Ready!

### Quick Command Reference
| Command | Purpose |
|---------|---------|
| `npm run magi` | Interactive chat mode |
| `npm run diag` | System health check |
| `npm run fix-paths` | Auto-repair issues |
| `npm run magic save "content"` | Command-line memory saving |
| `npm run ai:status` | Check Ollama models |

### Real Usage Examples

**Save Technical Knowledge:**
```
magi save "When debugging React hooks, always check the dependency array first - missing deps cause infinite re-renders"
```

**Query for Solutions:**
```
magi help me debug a React component that's re-rendering too much
```

**Add Personal Preferences:**
```
magi save "For vacation planning, I prefer mountains over beaches and small towns over big cities"
```

**Get Personalized Recommendations:**
```
magi suggest a good vacation destination for me
```

## 🚨 Troubleshooting

### "No relevant memories found"
```bash
npm run diag              # Check for vector index issues
npm run fix-paths         # Auto-repair
npm run magic index       # Rebuild search index
```

### "Ollama connection failed"
```bash
ollama serve             # Make sure Ollama is running
npm run ai:status        # Verify models downloaded
npm run ai:pull          # Re-download if needed
```

### "MCP server not connecting"
1. Check Claude Code MCP settings path is correct
2. Make sure `npm run dev` is running
3. Restart Claude Code completely

### Still having issues?
```bash
npm run diag             # Comprehensive diagnostics
```

Follow the fix suggestions, or check [DIAGNOSTICS.md](../user-guides/DIAGNOSTICS.md) for detailed troubleshooting.

## 🔐 Privacy & Security

- ✅ **Your memories stay local** - Never uploaded anywhere
- ✅ **AI runs on your machine** - No data sent to external servers  
- ✅ **Standard file formats** - Your data in simple markdown files
- ✅ **Git ignored** - Personal memories never committed to version control
- ✅ **Granular control** - You choose what AI can access

## 📚 What's Next?

- **Explore Commands:** Try `npm run help` for full command list
- **Add More Memories:** The more you add, the smarter your personal AI becomes
- **Customize Privacy:** Move memories between privacy levels as needed
- **Share & Contribute:** Help improve the docs for the next user!

---

**🎯 Success Criteria:** You should be able to save a memory with `magi save` and retrieve it with a question. If this works, you're all set to build your personal AI knowledge base!

Need help? The system is designed to be self-diagnosing - `npm run diag` catches 90% of issues automatically.