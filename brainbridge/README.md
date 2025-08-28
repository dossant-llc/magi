# BrainBridge MCP Server

BrainBridge is an MCP (Model Context Protocol) server that connects your personal knowledge base to AI assistants with smart privacy controls and advanced search capabilities.

## Features

- 🧠 **Smart Memory Management** - Store and search your personal knowledge with AI-powered categorization
- 🔒 **Privacy Levels** - Control what information is shared (public, team, personal, private, sensitive)
- 🔍 **Advanced Search** - Vector similarity search with keyword fallback
- 🪄 **BrainXchange P2P** - Connect and communicate with other magi instances across the network
- 🎨 **Beautiful Logging** - Colorful, structured logs with emojis and detailed error context
- ⚡ **Performance Tracking** - Built-in timing and performance metrics
- 🐳 **Docker Support** - Consistent deployment across environments

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start in development mode with hot reload
npm run dev:stdio

# View logs with colors
npm run logs
```

### Docker Setup

#### Production Docker

```bash
# Build and run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f brainbridge

# Stop services
docker-compose down
```

#### Development Docker (with hot reload)

```bash
# Run development environment
docker-compose -f docker-compose.dev.yml up -d

# View development logs
docker-compose -f docker-compose.dev.yml logs -f brainbridge-dev
```

### Claude Code Integration

Add to your Claude Code MCP config:

**Local (non-Docker):**
```json
{
  "mcpServers": {
    "brainbridge": {
      "command": "node",
      "args": ["/path/to/brainbridge/dist/server.js", "stdio"],
      "env": {}
    }
  }
}
```

**Docker:**
```json
{
  "mcpServers": {
    "brainbridge": {
      "command": "docker",
      "args": ["exec", "-i", "brainbridge-mcp", "node", "dist/server.js", "stdio"],
      "env": {}
    }
  }
}
```

## Docker Architecture

### Services

- **brainbridge** - Main MCP server
- **ollama** - AI embeddings service (optional but recommended)

### Volumes

- `./memories:/app/memories` - Persistent knowledge storage
- `./logs:/app/logs` - Log files for debugging
- `ollama-data` - AI model storage

### Environment Variables

- `NODE_ENV` - Environment (development/production)
- `MEMORIES_DIR` - Path to memories directory
- `LOG_FILE` - Log file location
- `TRACE_MODE` - Enable detailed logging (true/false)
- `BRAINXCHANGE_EMAIL` - Your email for BrainXchange P2P (default: user@example.com)
- `BRAINXCHANGE_NAME` - Your display name for BrainXchange (default: User)

## Usage

### Available Commands

```bash
# Development
npm run dev          # Start with hot reload
npm run dev:stdio    # Start with stdio transport
npm run trace        # Start with trace logging

# Production
npm run build        # Build TypeScript
npm run start        # Start production server
npm run start:stdio  # Start with stdio transport

# Utilities
npm run logs         # Tail log files
npm run logs:clear   # Clear log files
npm run qc           # Quality check
npm run test         # Run tests
```

### MCP Tools

#### Memory Management
- `ai_query_memories` - Search your knowledge base with AI synthesis
- `ai_save_memory` - Save new knowledge with AI categorization
- `search_memories` - Basic memory search
- `add_memory` - Add structured memory
- `get_organization_patterns` - Get categorization patterns

#### BrainXchange P2P Communication
- `brainxchange_command` - Handle peer-to-peer magi communication
  - `"magi create invite"` - Generate invitation code for friends
  - `"magi connect ABC123"` - Connect using friend's invitation code
  - `"magi ask friend about topic"` - Send questions to connected magi

#### System Management
- `ai_status` - Check AI system and BrainXchange connection status
- `toggle_trace_mode` - Toggle detailed logging

## Privacy Levels

- 🌍 **public** - Open knowledge, shareable
- 👥 **team** - Work colleagues only
- 👤 **personal** - Personal but not sensitive
- 🔒 **private** - Personal and private
- 🔐 **sensitive** - Highly confidential

## BrainXchange P2P Setup

### Configuration

Set environment variables for your identity:

```bash
export BRAINXCHANGE_EMAIL="your.email@example.com"
export BRAINXCHANGE_NAME="Your Display Name"
```

Or create a `.env` file:
```bash
BRAINXCHANGE_EMAIL=your.email@example.com
BRAINXCHANGE_NAME=Your Display Name
```

### Connecting with Friends

1. **Generate an invitation**: Ask Claude Code to run `brainxchange_command` with `"magi create invite"`
2. **Share the code**: Give the 6-character code to your friend (expires in 30 minutes)  
3. **Friend connects**: They use `"magi connect ABC123"` with your code
4. **Start communicating**: Use `"magi ask friend about topic"` to exchange knowledge

### Example Workflow

```
You: "magi create invite"
→ Share this code with your friend: ABC123 (expires in 30 minutes)

[Share ABC123 with friend]

Friend: "magi connect ABC123" 
→ Connected to Your Display Name!

You: "magi ask friend about React best practices"
→ Question sent to friend

[Friend's magi searches their knowledge and responds]
→ Answer from friend: "I recommend using hooks for state management..."
```

### Communication Protocols

**Two distinct protocols power the system:**

1. **MCP (Model Context Protocol)**: 
   - **Purpose**: Local communication between Claude Code client and BrainBridge
   - **Transport**: stdio or HTTP
   - **Format**: Structured JSON-RPC tool calls
   - **Scope**: Single machine, single user

2. **WebSocket Network Protocol**:
   - **Purpose**: Internet-based peer-to-peer communication between magi instances
   - **Transport**: WebSocket over TCP/IP to m3u.dossant.com:8082
   - **Format**: Real-time JSON messages
   - **Scope**: Global network, multiple users

### Server Status

The BrainXchange network runs on:
- **Production Server**: `ws://m3u.dossant.com:8082`
- **Web Dashboard**: `http://m3u.dossant.com:8082` (live statistics)
- **Status API**: `http://m3u.dossant.com:8082/api/stats`

## Troubleshooting

### Common Issues

**"Embedding generation failed: TypeError: fetch failed"**
- Ollama service not running
- Start with: `docker-compose up ollama` or `ollama serve` locally

**"Vector search failed"**
- Missing embeddings index
- Run a few queries to build the index automatically

**Logs not colorful**
- Check TRACE_MODE environment variable
- For Docker: set in docker-compose.yml

**"BrainXchange integration failed"**
- Check network connectivity to m3u.dossant.com:8082
- Verify BRAINXCHANGE_EMAIL and BRAINXCHANGE_NAME are set
- Check server logs for WebSocket connection errors

**"magi commands not working"**
- Ensure `brainxchange_command` tool is available in MCP
- Check that BrainXchange integration initialized successfully
- Verify invitation codes are 6 characters and not expired

### Docker Troubleshooting

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs brainbridge

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up --build

# Shell into container
docker-compose exec brainbridge sh
```

## Development

### File Structure

```
src/
├── server.ts              # Main MCP server
├── services/              # Core services
│   ├── ai-service.ts      # AI and search logic
│   ├── embedding-service.ts # Vector embeddings
│   ├── memory-service.ts  # Memory management
│   └── logger-service.ts  # Enhanced logging
├── magic/                 # CLI commands
└── handlers/              # MCP request handlers
```

### Adding Features

1. Add new MCP tools in `src/handlers/`
2. Implement business logic in `src/services/`
3. Update Docker configs if needed
4. Add tests in `tests/`

## Testing

### BrainXchange Integration Tests

Test the P2P communication system:

```bash
# Test the @alice user discovery directly
node test-alice-simple.js

# Demo the complete discovery flow
node demo-alice-discovery.js

# MCP command testing (requires running server)
node test-alice-command.js
```

### End-to-End BrainXchange Tests

For complete system testing with live server:

```bash
# Test complete BrainXchange flow with real server
cd ../services/magi-exchange/test
node test-complete-e2e.js
```

This tests:
- magi-exchange server connectivity (`ws://m3u.dossant.com:8082`)
- Two-client communication via WebSocket protocol
- Invitation-based connection establishment
- Real-time message routing between magi instances
- Admin logs functionality and live monitoring dashboard

### Quality Check

Run comprehensive system checks:

```bash
npm run qc
```

## License

See LICENSE file for details.