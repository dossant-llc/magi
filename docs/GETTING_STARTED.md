# 🚀 Getting Started with mAgi

> **Complete setup guide: Zero to working personal AI in 15 minutes**

## 📋 Prerequisites

Before you begin, ensure you have:
- **Node.js 22+** - Check with `node --version`
- **Git** - Check with `git --version`
- **8GB+ RAM** (recommended for local AI models)
- **Claude Code** or Claude Desktop (for MCP integration)

## ⚡ Quick Install

### 1. Clone & Setup
```bash
git clone https://github.com/dossant-llc/magi.git
cd magi
npm run magi
```

**That's it!** The `npm run magi` command automatically:
- ✅ Installs all dependencies
- ✅ Downloads AI models (Ollama)
- ✅ Creates memory folder structure
- ✅ Starts the BrainBridge service
- ✅ Launches interactive mode

### 2. Verify Installation
```bash
magi status    # Check system health
magi save "My first memory: mAgi is working!"
magi what did I just save?
```

**Expected result**: mAgi should respond with information about your saved memory.

## 🔧 Configuration Options

### AI Provider Setup

**Option A: Local AI (Privacy-First)**
```bash
# Already set up by npm run magi
magi status  # Verify Ollama models are ready
```

**Option B: Add Cloud AI (OpenAI)**
```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export OPENAI_API_KEY=your_api_key_here

# Restart terminal and verify
magi status
```

**Option C: Add Google Gemini**
```bash
export GOOGLE_API_KEY=your_api_key_here
magi status
```

### Claude Code Integration
```bash
# Set up MCP connection
magi register

# Follow prompts to configure Claude Code
```

## 🎯 First Steps

### 1. Save Some Knowledge
```bash
magi save "I prefer VS Code over other editors"
magi save "My favorite debugging approach: console.log first, then DevTools"
magi save "Team meeting: Mondays 10am, prefer async updates"
```

### 2. Query Your Knowledge
```bash
magi what's my debugging approach?
magi when are team meetings?
magi what do I prefer for coding?
```

### 3. Memory Management
```bash
magi nap           # Analyze and consolidate memories
magi logs          # View system activity
magi metrics       # Memory system statistics
```

## 📁 Understanding Your Memory Structure

mAgi organizes your knowledge into privacy levels:

```
data/memories/
├── public/          # Shareable knowledge
├── team/           # Work context
├── personal/       # Personal life
├── private/        # Local AI only
└── sensitive/      # Maximum protection
```

**How it works**: mAgi automatically categorizes content based on context, but you can always move files between folders.

## 🔍 Troubleshooting

### Common Issues

**Service won't start?**
```bash
magi status        # Check what's wrong
magi restart       # Restart services
```

**AI not responding?**
```bash
# Check AI models
curl http://localhost:11434/api/tags

# Reinstall if needed
ollama pull llama3.1:8b
ollama pull mxbai-embed-large
```

**Can't find memories?**
```bash
magi metrics       # Check memory count
ls data/memories/  # Verify files exist
```

### Getting Help

**Built-in diagnostics**:
```bash
magi status        # Comprehensive health check
magi logs          # View recent activity
```

**Self-repair**:
```bash
magi restart       # Restart all services
npm run magi       # Reinitialize if needed
```

## 🚀 What's Next?

### Basic Usage
- **Save everything**: Capture insights as you work
- **Query naturally**: Ask questions about your knowledge
- **Use "magi" wake word**: Gets personalized responses in Claude

### Advanced Features
- **Memory consolidation**: `magi nap` analyzes your knowledge
- **Claude integration**: Seamless MCP connection
- **Privacy controls**: Organize by sensitivity level

### Learning More
- **[Commands Reference](user-guides/COMMANDS.md)** - Complete command list
- **[Architecture Guide](architecture/ARCHITECTURE_SUMMARY.md)** - How it works
- **[Privacy Design](architecture/PRIVACY_DESIGN.md)** - Privacy principles

---

## 💡 Pro Tips

1. **Start simple**: Save a few memories, then query them
2. **Use natural language**: "magi how do I debug React issues?"
3. **Regular naps**: Run `magi nap` weekly to consolidate knowledge
4. **Privacy-aware**: More sensitive content goes in deeper folders

**Need help?** The system includes comprehensive diagnostics (`magi status`) and self-repair capabilities. Most issues resolve automatically.

---

*You now have a personal AI that learns from your experiences and remembers what matters to you. The more you use it, the more valuable it becomes.*