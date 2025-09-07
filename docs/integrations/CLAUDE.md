# Claude Code MCP Installation

This document explains how to install and configure the Magi MCP server for Claude Code.

## Installation

### Quick Install (Recommended)
```bash
magi install claude
```

This installs the MCP server in **lean stdio mode** - pure JSON-RPC communication without HTTP servers or port registration.

### Manual Install
```bash
# From project root directory
claude mcp add --scope user magi \
  --env PROJECT_FOLDER=/Users/igor/Documents/code/agiforme \
  -- sh -c "cd /Users/igor/Documents/code/agiforme && npm run magi:mcp"
```

### Alternative Direct Command
```bash
# Using direct tsx binary from project
claude mcp add --scope user magi \
  -- /Users/igor/Documents/code/agiforme/node_modules/.bin/tsx \
     /Users/igor/Documents/code/agiforme/services/brainbridge/src/server.ts stdio
```

## Removal

### Quick Remove
```bash
magi remove claude
```

### Manual Remove
```bash
claude mcp remove magi
```

## Configuration Details

- **Server Name**: `magi`
- **Scope**: `user` (available globally across all projects)
- **Transport**: `stdio` (lean mode - no HTTP, no port 8147)
- **Runtime**: `tsx` (TypeScript execution)
- **Server Path**: `/Users/igor/Documents/code/agiforme/services/brainbridge/src/server.ts`
- **Server Mode**: `stdio` argument for lean JSON-RPC communication
- **Environment Variable**: `PROJECT_FOLDER` set to project root

## Usage Notes

- The server runs in **stdio mode** for clean MCP communication
- No HTTP server or port 8147 registration - pure JSON-RPC over stdio
- Must change directory to project root for proper module resolution
- Uses `npm run magi:mcp` which maps to `npm run bb:stdio`
- Global scope means the MCP server is available in all Claude Code sessions

## Troubleshooting

### Connection Issues
If the MCP server fails to connect:

1. **Check logs**: Look at `/Users/igor/Library/Caches/claude-cli-nodejs/*/mcp-logs-magi/`
2. **Verify stdio mode**: Logs should NOT show "HTTP port 8147" messages
3. **Module resolution**: The command must run from project directory for proper imports
4. **Test manually**: 
   ```bash
   cd /Users/igor/Documents/code/agiforme
   npm run magi:mcp
   # Should output: "BrainBridge MCP Server running on stdio"
   ```

### Common Fixes
- If seeing HTTP mode errors, ensure the `stdio` argument is passed
- If module errors, ensure the command changes to project directory first
- Check MCP server status: `claude mcp list | grep magi`
- View detailed logs: `ls -lt ~/Library/Caches/claude-cli-nodejs/*/mcp-logs-magi/`

## MCP Version

This installation is compatible with the latest Claude Code MCP interfacing (as of 2025).