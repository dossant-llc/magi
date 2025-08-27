# Claude Code Setup for mAGIc Wake Words

## Quick Setup

1. **Add BrainBridge to Claude Code MCP configuration:**
   ```json
   {
     "mcpServers": {
       "brainbridge": {
         "command": "node",
         "args": ["/Users/igor/Documents/code/agiforme/brainbridge/dist/server.js", "stdio"],
         "env": {}
       }
     }
   }
   ```

2. **Add Wake Word Instructions to Claude Code:**

   In Claude Code settings, add this to your system instructions:

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