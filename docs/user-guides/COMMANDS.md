# 📋 AGIfor.me Command Reference

> **Complete guide to all available commands**

## 🚀 Getting Started Commands

| Command | Description | Example |
|---------|-------------|---------|
| **`npm run magi`** | **🎯 MAIN ENTRY POINT** | **Smart setup + launch** |
| `npm run setup` | Create personal memories folder | Initial setup only |
| `npm run bootstrap` | **Complete auto-setup** | Install everything automatically |
| `npm run start` | Start BrainBridge server | Daily usage |
| `npm run diag` | **System health check** | When things don't work |

## 🤖 AI & Memory Commands

### Core mAGIc Commands
| Command | Description | Example |
|---------|-------------|---------|
| `npm run magi` | Interactive chat with your AI | Daily conversations |
| `npm run magic save "content"` | Save knowledge to memories | Command-line quick saves |
| `npm run magic index` | Rebuild search index | After adding many memories |
| `npm run ai:status` | Check Ollama models | Verify AI setup |
| `npm run ai:pull` | Download AI models | Initial setup |

### MCP Integration (via Claude Code)
| Wake Word Usage | Tool Called | Purpose |
|-----------------|-------------|---------|
| `magi save "content"` | `ai_save_memory` | Smart categorization |
| `magi [question]` | `ai_query_memories` | Search your knowledge |
| `magi status` | `ai_status` | Check system health |

## 🔧 Diagnostic & Maintenance

### System Health
| Command | Description | When to Use |
|---------|-------------|-------------|
| **`npm run diag`** | **Complete system check** | **Daily, when issues occur** |
| `npm run fix-paths` | Auto-repair common issues | After `diag` shows problems |
| `npm run sys:reset` | Nuclear option - fix everything | When everything's broken |
| `npm run sys:ports` | Check which ports are in use | Debug network issues |

### Configuration Management
| Command | Description | Example |
|---------|-------------|---------|
| `npm run mem:path` | Check current memory location | See where memories are stored |
| `npm run mem:path project` | Use project folder | Store in ./memories/ |
| `npm run mem:path documents` | Use Documents folder | Store in ~/Documents/memories/ |
| `edit .env` | Edit simple configuration | Tweak AI settings |

### Memory Management  
| Command | Description | Example |
|---------|-------------|---------|
| `npm run mem:stats` | Show memory statistics | Check knowledge base size |
| `npm run mem:backup` | Backup memories | Before major changes |
| `npm run mem:clean` | Clean up old memories | Maintenance |

## 🏗️ Development & Advanced

### BrainBridge Server
| Command | Description | Use Case |
|---------|-------------|---------|
| `npm run dev` | Start MCP server | Claude Code integration |
| `npm run dev:stdio` | Start stdio server | Direct MCP connection |
| `npm run bb:logs` | View formatted logs | Debug server issues |
| `npm run bb:trace` | Enable trace mode | Deep debugging |

### Quality & Testing  
| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run qc` | Quality check | Before commits |
| `npm run test:mcp` | Test MCP integration | Verify Claude Code works |
| `npm run test:chat` | Test chat functionality | Debug conversations |

### Multi-Instance (Advanced)
| Command | Description | Use Case |
|---------|-------------|---------|
| `npm run mb:start` | Start local multi-user | Family/team setups |
| `npm run mb:dashboard` | Multi-user dashboard | User management |
| `npm run mb:logs` | Multi-user logs | Debug multi-instance |

## 📊 Usage Examples

### Daily Workflow
```bash
# Start your day
npm run diag                    # Quick health check
./start.sh                     # Start BrainBridge

# Use with Claude Code
# "magi save 'Important meeting insight...'"
# "magi what did I learn about project X?"

# End of day
# Ctrl+C to stop server
```

### Troubleshooting Workflow  
```bash
npm run diag                    # Identify issues
npm run fix-paths              # Auto-repair
npm run diag                   # Verify fixed
./start.sh                     # Back to working
```

### Maintenance Workflow
```bash
npm run mem:stats              # Check memory usage
npm run magic index            # Rebuild search index  
npm run mem:backup             # Backup before cleanup
npm run mem:clean              # Clean old memories
```

## 🆘 Emergency Commands

### Something's Broken
```bash
npm run diag                   # See what's wrong
npm run fix-paths              # Try auto-repair
npm run sys:reset              # Nuclear option
```

### AI Not Working
```bash
npm run ai:status              # Check Ollama
ollama serve                   # Restart Ollama
npm run ai:pull                # Re-download models
npm run magic index            # Rebuild search index
```

### Memory Issues
```bash
npm run diag                   # Check vector index
npm run fix-paths              # Fix path problems  
npm run magic index --force    # Force rebuild index
```

## 🔍 Command Categories

### 🟢 **Beginner-Friendly** (Start here)
- `npm run diag` - System health check
- `./start.sh` - Start server
- `npm run magi` - Interactive mode
- `npm run ai:status` - Check AI

### 🟡 **Daily Usage** (Once comfortable)
- `npm run magic save "content"` - Quick saves
- `npm run magic index` - Refresh search
- `npm run mem:stats` - Check usage

### 🔴 **Advanced/Debug** (When needed)
- `npm run bb:trace` - Deep debugging
- `npm run test:mcp` - Integration testing  
- `npm run sys:reset` - Nuclear repair

## 💡 Pro Tips

### Command Aliases (Add to ~/.zshrc)
```bash
alias agistart='cd /path/to/agiforme && ./start.sh'
alias agidiag='cd /path/to/agiforme && npm run diag'  
alias agifix='cd /path/to/agiforme && npm run fix-paths'
```

### Quick Health Check
```bash
npm run diag && echo "✅ Ready to use magi commands!"
```

### Integration Test
```bash
npm run test:mcp && echo "✅ Claude Code integration working!"
```

---

**💡 Remember:** Start with `npm run diag` when anything doesn't work - it catches 90% of common issues and tells you exactly how to fix them!