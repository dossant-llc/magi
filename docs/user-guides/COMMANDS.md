# 📋 AGIfor.me Command Reference

> **Complete guide to all available commands**

## 🚀 Getting Started Commands

### Primary magi Commands (Two-Layer Architecture)

| Command | Description | Layer | Example |
|---------|-------------|-------|---------|
| **`magi`** | **🎯 INTERACTIVE MODE** | **REPL** | **Primary user interface** |
| **`magi start`** | **🚀 Start background service** | **Service** | **Background MCP server** |
| `magi stop` | Stop background service | Service | Stop MCP server |
| `magi restart` | Restart background service | Service | Restart MCP server |
| `magi status` | **System health & diagnostics** | **REPL** | **Check status & troubleshoot** |
| `magi logs` | View service logs | Service | Monitor operations |

### Legacy npm Commands (Internal Use)

| Command | Description | Example |
|---------|-------------|---------|
| `npm run magi` | Internal: calls ./bin/magi | Legacy compatibility |
| `npm run setup` | Create personal memories folder | Initial setup only |
| `npm run bootstrap` | **Complete auto-setup** | Install everything automatically |
| `npm run start` | Start BrainBridge server | Internal service management |

## 🤖 AI & Memory Commands

### magi REPL Commands (Interactive Mode)
| Command | Description | Example |
|---------|-------------|---------|
| `magi` | **Interactive chat with your AI** | **Daily conversations** |
| `magi query "question"` | Search your knowledge base | Direct memory search |
| `magi save "content"` | Save knowledge to memories | Command-line quick saves |

### MCP Integration (via Claude Code)
| Wake Word Usage | Tool Called | Purpose |
|-----------------|-------------|---------|
| `magi save "content"` | `ai_save_memory` | Smart categorization |
| `magi [question]` | `ai_query_memories` | Search your knowledge |
| `magi status` | `ai_status` | Check system health |

### Internal magic Commands (Legacy)
| Command | Description | Example |
|---------|-------------|---------|
| `npm run magi` | Internal: calls ./bin/magi | Legacy compatibility |
| `npm run magic save "content"` | Internal: Save to memories | Command-line quick saves |
| `npm run magic index` | Rebuild search index | After adding many memories |
| `npm run ai:status` | Check AI models | Verify AI setup |
| `npm run ai:pull` | Download AI models | Initial setup |

## 🔧 Diagnostic & Maintenance

### System Health
| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run diag` | Complete system check (legacy) | Internal use |
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

### Daily Workflow (Two-Layer Architecture)
```bash
# Start your day
magi status                    # Quick health check & diagnostics
magi start                     # Start background MCP service

# Interactive mode
magi                           # Enter interactive REPL mode

# Or use with Claude Code MCP integration
# "magi save 'Important meeting insight...'"
# "magi what did I learn about project X?"

# End of day
magi stop                      # Stop background service
```

### Troubleshooting Workflow  
```bash
magi status                    # Identify issues with diagnostics
npm run fix-paths              # Auto-repair (internal)
magi status                    # Verify fixed
magi start                     # Back to working
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
magi status                    # See what's wrong with diagnostics
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
magi status                    # Check vector index & diagnostics
npm run fix-paths              # Fix path problems  
npm run magic index --force    # Force rebuild index
```

## 🔍 Command Categories

### 🟢 **Beginner-Friendly** (Start here)
- `magi status` - System health check & diagnostics
- `magi start` - Start background service
- `magi` - Interactive mode

### 🟡 **Daily Usage** (Once comfortable)
- `magi save "content"` - Quick saves via REPL
- `magi query "question"` - Search your knowledge
- Claude Code: `magi [question]` - MCP integration

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
magi status && echo "✅ Ready to use magi commands!"
```

### Integration Test
```bash
npm run test:mcp && echo "✅ Claude Code integration working!"
```

## 🔒 Singleton Architecture

### Why Only One Instance?
Magi uses a **singleton pattern** - only one `magi start` can run at a time. This prevents:
- **Resource conflicts** (ports, memory paths, AI configurations)
- **Inconsistent state** across multiple server instances  
- **Process leakage** and orphaned background services
- **Connection confusion** with MCP clients like Claude Code

### Smart Error Handling
When you try to start a second instance, Magi provides helpful guidance:

```bash
❌ Cannot start: Magi BrainBridge service is already running
📍 Running instance: PID 76575, started 10:16 AM, development mode

🎯 What you probably want to do:
   magi logs     # View live logs from running instance
   magi status   # Check system health & diagnostics

🛠️  Service management:  
   magi stop     # Stop the running instance
   magi restart  # Restart with same settings
```

### Mode Mismatch Detection
Magi detects when you try to start in a different mode:
- Running `--dev` but trying to start production → suggests `magi logs` or proper restart sequence
- Running production but trying `--dev` → suggests stopping first or viewing current logs

### MCP Connection Visibility  
When Claude Code connects via MCP, you'll see activity in your `magi start --dev` console:
```bash
🌉 [10:16:56 AM] MCP Bridge started for Claude Code
📡 [10:16:56 AM] Claude Code connected via MCP
🔧 [10:16:56 AM] Claude Code called: ai_query_memories
```

This unified logging helps with development and debugging.

### Architecture Reference
For detailed information about the two-layer magi CLI design and singleton architecture, see:
**[MAGI_CLI_DESIGN.md](../architecture/MAGI_CLI_DESIGN.md)**

---

**💡 Remember:** Start with `magi status` when anything doesn't work - it catches 90% of common issues and tells you exactly how to fix them!