# 🔧 BrainBridge Diagnostics & Troubleshooting

Easy-to-remember commands to keep your BrainBridge system healthy and catch issues early.

## Quick Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run diag` | Full system health check | Daily, when things aren't working |
| `npm run fix-paths` | Auto-repair common path issues | After `diag` shows path problems |
| `npm run sys:reset` | Nuclear option - fix paths & rebuild | When everything is broken |

## 🩺 Diagnostics (`npm run diag`)

Comprehensive health check that validates:

### ✅ What it Checks
- **Ollama AI Service**: Running, models available
- **Memory Storage**: Paths exist, memories found
- **Vector Index**: Exists, recent, in correct location  
- **Processes**: BrainBridge running, no duplicates
- **Environment**: Configuration variables
- **Disk Space**: Available storage

### 📊 Sample Output
```bash
🔍 BrainBridge System Diagnostics

🤖 Checking Ollama AI Service...
✅ Ollama running with 4 models
✅ Chat model (llama3.1:8b) available
✅ Embedding model (mxbai-embed-large) available

📁 Checking Memory Storage Paths...
✅ Base memories directory exists: /Users/igor/Documents/code/memories
✅ personal: 8 memories
✅ Total memories: 8

🧠 Checking Vector Index...
✅ Vector index exists: 350KB
⚠️ Vector index is 25h old
   Suggestion: npm run magic index

📊 Diagnostic Summary
✅ Passed: 9
⚠️ Warnings: 1  
❌ Issues: 0
```

## 🔧 Auto-Repair (`npm run fix-paths`)

Automatically fixes common configuration issues:

### 🎯 What it Fixes
- **Old Vector Index**: Moves from `.index/` to `memories/embeddings/`
- **Missing Directories**: Creates all required memory directories
- **Duplicate Processes**: Kills extra BrainBridge instances
- **File Permissions**: Ensures memories are readable/writable
- **Environment Config**: Creates `.env` from template

### ⚡ Quick Recovery
```bash
npm run fix-paths    # Auto-fix common issues
npm run diag         # Verify fixes worked
npm run magi         # Back to working!
```

## 🚨 Common Issues & Solutions

### Issue: "No relevant memories found"
**Symptoms**: AI can't find your memories, search returns empty
```bash
npm run diag
# Look for: "Vector index missing" or "Old vector index found"
npm run fix-paths
```

### Issue: "Multiple BrainBridge processes"
**Symptoms**: Slow responses, conflicts, errors
```bash
npm run diag
# Look for: "X BrainBridge processes running" (>3)
npm run fix-paths
```

### Issue: "Ollama not running"  
**Symptoms**: Embedding/AI errors, timeouts
```bash
ollama serve         # Start Ollama
npm run ai:pull      # Download models
npm run diag         # Verify working
```

### Issue: "Memories in wrong location"
**Symptoms**: Empty results despite having memory files
```bash
npm run fix-paths    # Move to correct paths
npm run magic index  # Rebuild index
```

## 🔄 Recovery Workflows

### Daily Health Check
```bash
npm run diag         # Quick system check
# If all ✅ - you're good!
# If issues found - run suggested fixes
```

### Something's Not Working  
```bash
npm run diag         # Identify issues
npm run fix-paths    # Auto-repair
npm run diag         # Verify fixed
```

### Nuclear Reset (Last Resort)
```bash
npm run sys:reset    # Fix all paths + rebuild index
npm run diag         # Should be all ✅
npm run magi         # Back to working
```

## 📋 Monitoring in Production

### Automated Health Checks
Add to your crontab or monitoring system:
```bash
# Daily health check
0 9 * * * cd /path/to/agiforme && npm run diag --silent
```

### Key Metrics to Watch
- Vector index age (should be < 24h if memories change)
- Memory count vs expected
- Process count (should be 1-3 BrainBridge processes)
- Disk space (vector index can grow large)

## 🎯 Prevention Tips

1. **Regular Index Updates**: Run `npm run magic index` after adding many memories
2. **Process Cleanup**: Avoid Ctrl+C on long-running processes (use `npm run dev` instead)
3. **Path Consistency**: Always work from the project root directory
4. **Model Updates**: Periodically update Ollama models (`npm run ai:pull`)

## 🐛 Still Having Issues?

If diagnostics show all ✅ but you're still having problems:

1. **Check Logs**: `npm run bb:logs`
2. **Trace Mode**: `npm run bb:trace` 
3. **Clean Start**: `pkill -f brainbridge && npm run dev`
4. **Manual Test**: `npm run test:mcp`

The diagnostic system catches 90% of common issues. These commands make BrainBridge production-ready with self-healing capabilities!