# BrainHub Local

A Node.js-based hub for orchestrating multiple AI brain instances in a hub-and-spoke architecture without Docker.

## Why This Exists

While Docker provides excellent isolation and deployment capabilities, for local development it adds complexity:
- Container networking issues
- Volume mounting complications  
- Harder debugging
- Slower iteration cycles

This local launcher provides a simpler alternative for development.

## Features

- 🚀 **Simple Node.js launcher** - No Docker required
- 🧠 **Multiple brain instances** - Alice, Bob, Carol on different ports
- 🎨 **Color-coded logging** - Easy to distinguish between instances
- 🔄 **Auto-restart** - Instances restart automatically on crash
- 📊 **Web Dashboard** - Monitor and control all instances
- 💬 **Cross-brain communication** - Test @mention routing
- 💾 **Memory management** - Save and query memories via UI

## Prerequisites

1. **Ollama** must be running locally:
   ```bash
   ollama serve
   ```

2. **Models** must be available:
   ```bash
   ollama pull llama3.1:8b
   ollama pull mxbai-embed-large
   ```

3. **BrainBridge** must be built:
   ```bash
   cd ../brainbridge
   npm install
   npm run build
   ```

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start all brain instances:
   ```bash
   npm run start
   ```

3. In another terminal, start the dashboard:
   ```bash
   npm run dashboard
   ```

4. Open the dashboard:
   ```
   http://localhost:3000
   ```

## Available Scripts

- `npm run start` - Start all brain instances
- `npm run dashboard` - Start web dashboard
- `npm run dev` - Start both launcher and dashboard
- `npm run stop` - Stop all instances
- `npm run logs` - Tail all log files
- `npm run clean` - Clear log files

## Instance Configuration

Each brain runs on different ports:

| Instance | HTTP Port | MCP Port | Dashboard Color |
|----------|-----------|----------|-----------------|
| Alice    | 8147      | 8247     | Cyan           |
| Bob      | 8148      | 8248     | Yellow         |
| Carol    | 8149      | 8249     | Magenta        |

## Directory Structure

```
brainbridge-local/
├── launcher.js      # Main process launcher
├── dashboard.js     # Web dashboard server
├── package.json     # Dependencies and scripts
├── logs/           # Instance log files
│   ├── alice.log
│   ├── bob.log
│   └── carol.log
└── README.md       # This file
```

## Memory Storage

Memories are stored in sibling directories:
- `../data/memories/profiles/alice/`
- `../data/memories/profiles/bob/`
- `../data/memories/profiles/carol/`

## Dashboard Features

The web dashboard (http://localhost:3000) provides:

1. **Instance Status** - Real-time online/offline status
2. **Cross-Brain Queries** - Send queries with @mentions
3. **Memory Management** - Save content to any brain
4. **Live Updates** - Auto-refreshes every 5 seconds

## Differences from Docker Setup

| Feature | Docker | Local |
|---------|--------|-------|
| Isolation | Full container isolation | Process-level only |
| Networking | Bridge networks | localhost ports |
| Ollama | Per-container or shared | Single shared instance |
| Logs | Docker logs | File-based logs |
| Debugging | Attach to container | Direct Node.js debugging |
| Resource usage | Higher | Lower |
| Setup complexity | Higher | Lower |

## Development Workflow

1. Make changes to BrainBridge source
2. Rebuild: `cd ../brainbridge && npm run build`
3. Restart instances: `Ctrl+C` then `npm run start`
4. Test via dashboard or direct API calls

## Troubleshooting

### Instances won't start
- Check if Ollama is running: `curl http://localhost:11434/api/tags`
- Ensure BrainBridge is built: `cd ../brainbridge && npm run build`
- Check for port conflicts: `lsof -i :8147`

### No AI responses
- Verify models are installed: `ollama list`
- Pull required models: `ollama pull llama3.1:8b`

### Dashboard can't connect
- Ensure instances are running: `npm run start`
- Check instance logs: `npm run logs`

## API Examples

Query a brain directly:
```bash
curl -X POST http://localhost:8147/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"ai_query_memories","arguments":{"question":"What do you remember?"}}}'
```

Save a memory:
```bash
curl -X POST http://localhost:8148/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"ai_save_memory","arguments":{"content":"Bob likes jazz music"}}}'
```

## Next Steps

- Add more brain instances dynamically
- Implement peer discovery
- Add metrics and monitoring
- Support for different AI models per instance
- WebSocket support for real-time updates

## License

MIT