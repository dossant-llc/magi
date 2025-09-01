# Claude Code Setup for mAGIc Wake Words

> **Choose your setup style: Super Simple or Robust Advanced**

## 🌍 Option 1: Global Installation (SUPER SIMPLE)

**The easiest possible setup:**

```bash
npm run install:global
```

This installs `magi` as a global command, so Claude Code configuration becomes:

```json
{
  "mcpServers": {
    "magi": {
      "command": "magi"
    }
  }
}
```

**That's it!** No paths, no environment variables, just works from anywhere.

## 🔧 Option 2: Robust Local Setup (ADVANCED)

For more control and validation:

```bash
npm run setup:mcp
```

This command will:
- ✅ **Validate prerequisites** (Node.js, project location, Ollama)
- ✅ **Auto-generate configuration** with correct paths
- ✅ **Detect Claude Code location** automatically  
- ✅ **Provide system instructions** ready to copy-paste
- ✅ **Give specific next steps** for your setup

## 📋 What Gets Generated

The setup tool creates optimized configurations:

### MCP Server Configuration
- **Auto-detects project path** - no manual path editing needed
- **Sets memory location** - uses project/memories folder  
- **Environment variables** - proper NODE_ENV and MEMORIES_DIR
- **Robust command setup** - uses npm run magi:mcp

### System Instructions  
- **Wake word activation** - "magi" triggers personal AI
- **Tool mapping** - save/query/status commands
- **Privacy levels** - public, team, personal, private, sensitive

## 🔧 Manual Setup (If Needed)

If you prefer manual configuration, the generated config looks like:

```json
{
  "mcpServers": {
    "magi": {
      "command": "npm",
      "args": ["run", "magi:mcp"],
      "cwd": "/your/project/path",
      "env": {
        "MEMORIES_DIR": "~/Documents/memories",
        "NODE_ENV": "production"
      }
    }
  }
}
```

System instructions:
```
mAGIc Wake Word System:
   
   When the user uses "magi" as a wake word, activate local AI processing:
   - "magi save [content]" → Use ai_save_memory tool for AI-powered categorization
   - "magi tell me about [question]" → Use ai_query_memories tool for personalized answers  
   - "magi status" → Use ai_status tool to check local AI system
   
   Without "magi" wake word: Respond normally without accessing personal memories.
   
   Privacy Levels:
   - Default to 'personal' privacy level
   - User can specify: public, team, personal, private, sensitive
   ```

## Usage Examples

Once configured, you can use:

**Save Knowledge:**
```
User: magi save "When debugging CORS issues, check the Origin header first and ensure the server allows the specific origin, not just '*'"

Claude: [Uses ai_save_memory tool]
✅ Memory saved successfully!
**Category:** technical
**Tags:** cors, debugging, web-development
**Privacy:** personal
```

**Query Knowledge:**
```  
User: magi tell me about CORS debugging

Claude: [Uses ai_query_memories tool]  
**Answer:** When debugging CORS issues, you should check the Origin header first and ensure the server allows the specific origin, not just '*'. According to your notes in [1]...

**Sources:** cors-debugging-tip-check-origin-header.md
```

**Check Status:**
```
User: magi status

Claude: [Uses ai_status tool]
🤖 **mAGIc AI System Status**

**Local AI Models:**
✅ Ollama: Connected
  📊 Chat Model (llama3.1:8b): ✅ Available  
  🧠 Embed Model (mxbai-embed-large): ✅ Available
```

## Advanced Configuration

### Custom Privacy Levels
```
User: magi save "Our API key rotation strategy" --privacy private
```

### Category Hints  
```
User: magi save "Team uses Slack for daily standups" --category workflow
```

## Troubleshooting

**If wake words don't work:**
1. Check that BrainBridge MCP server is running
2. Verify Ollama is running: `ollama serve`  
3. Check Claude Code MCP connection status
4. Review system instructions for wake word configuration

**If AI responses are slow:**
- This is normal for local LLMs (2-30 seconds)
- Responses are private and processed locally
- No data sent to external services

## File Locations

- **Memories:** `memories/[privacy-level]/`
- **AI Index:** `.index/`  
- **Logs:** `brainbridge/logs/`

Your personal knowledge stays completely private on your machine! 🔒