# magi CLI Architecture Design

> **The Two-Layer Design Pattern for Personal AI Command Interface**

## Overview

The **magi** CLI represents the primary interface for AGIfor.me, implementing a two-layer architecture that separates service management from user interaction. This design follows the "wake word" paradigm where `magi` serves as the universal entry point for all personal AI interactions.

## Core Design Principles

### 1. **Wake Word Ecosystem**
`magi` is the universal wake word and command prefix for all AI interactions:
```bash
# Direct wake word usage
magi help me plan a vacation to Italy
magi save "Always check DNS cache first when troubleshooting"
magi status

# The wake word activates your personal AI context
# Generic AI: "Help with vacation planning" → Generic travel advice  
# Personal AI: "magi help with vacation planning" → Uses your travel memories, preferences
```

### 2. **Abstraction Layer Philosophy**
- **User-facing**: Simple `magi` commands for everything
- **Internal**: Complex npm scripts and service orchestration hidden
- **Ecosystem**: `magi` wraps around all underlying systems (BrainBridge, MCP, AI providers)

## Two-Layer Architecture

### Layer 1: Service Layer (`magi start`)

**Purpose**: Background MCP service management
```bash
magi start    # Start the background MCP service
magi stop     # Stop the background service  
magi restart  # Restart the service
magi logs     # View service logs
```

**Responsibilities**:
- **MCP Server Management**: Hosts the Model Context Protocol server for AI integrations
- **Memory Indexing**: Maintains vector embeddings for fast semantic search
- **Provider Management**: Handles switching between AI providers (Ollama, OpenAI, Gemini)
- **Background Processing**: Runs continuously to serve AI assistant requests
- **Resource Management**: Manages ports, processes, and system resources

**Technical Implementation**:
- Runs BrainBridge MCP server on stdio for Claude Code integration
- Manages vector index creation and updates
- Handles provider-specific configurations and API keys
- Provides health monitoring and diagnostic capabilities

### Layer 2: REPL Layer (`magi`)

**Purpose**: Interactive command-line companion
```bash
magi             # Interactive mode - chat with your AI
magi query "..." # Direct question to your knowledge base
magi save "..."  # Quick save to memories with smart categorization
```

**Responsibilities**:
- **Interactive Chat**: Direct conversation interface with your personal AI
- **Quick Commands**: Fast access to common operations (save, query, status)
- **User Experience**: Friendly, natural language interface
- **Command Routing**: Routes commands to appropriate backend services

**Technical Implementation**:
- Interactive REPL built on top of the service layer
- Direct integration with AI providers for chat functionality
- Smart routing to MCP tools for memory operations
- User-friendly error handling and feedback

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                       │
├─────────────────────────────────────────────────────────────┤
│  magi [command]     │  Interactive REPL Layer               │
│  ├─ magi start      │  ├─ Chat interface                    │
│  ├─ magi query      │  ├─ Quick commands                    │
│  ├─ magi save       │  ├─ Status checks                     │
│  └─ magi status     │  └─ Error handling                    │
├─────────────────────────────────────────────────────────────┤
│                      SERVICE LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  magi start         │  Background MCP Service                │
│  ├─ BrainBridge     │  ├─ Memory search & save              │
│  ├─ Vector Index    │  ├─ AI provider management            │
│  ├─ MCP Server      │  ├─ Privacy-aware categorization      │
│  └─ Health Monitor  │  └─ Claude Code integration           │
├─────────────────────────────────────────────────────────────┤
│                    INTEGRATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  AI Assistants      │  Storage & Providers                   │
│  ├─ Claude Code     │  ├─ Memory files (markdown)           │
│  ├─ Claude Desktop  │  ├─ Vector embeddings                 │
│  └─ Future: Others  │  ├─ Ollama / OpenAI / Gemini          │
│                     │  └─ Privacy-level organization        │
└─────────────────────────────────────────────────────────────┘
```

## Command Hierarchy

### Primary Commands (User-Facing)
```bash
magi                    # 🎯 Primary interactive mode
magi start              # 🚀 Start background service  
magi stop               # ⏹️  Stop background service
magi restart            # 🔄 Restart service
magi status             # 📊 System health check & comprehensive diagnostics
magi query "question"   # 🔍 Search your memories
magi save "knowledge"   # 💾 Save to memories with smart categorization
magi logs               # 📋 View service logs
```

### Internal Commands (Developer/Debugging)
```bash
npm run magi            # Internal: Calls ./bin/magi
npm run start           # Internal: Starts BrainBridge server
npm run dev:stdio       # Internal: Development mode
npm run magic query     # Internal: Direct magic command
npm run magic save      # Internal: Direct magic save
npm run bb:logs         # Internal: BrainBridge logs
npm run diag            # Internal: System diagnostics (legacy)
```

## Process Management

### Service Lifecycle
1. **`magi start`**: 
   - Starts BrainBridge MCP server
   - Initializes vector indexes
   - Begins health monitoring
   - Returns control to user

2. **`magi` (REPL)**:
   - Connects to running service
   - Provides interactive interface
   - Routes commands to service layer
   - Handles user interactions

3. **Background Operation**:
   - Service runs independently
   - Serves MCP requests from AI assistants
   - Maintains indexes and configurations
   - Logs all activities

### Process Architecture
```
Terminal 1: magi start     # Background service (persistent)
         ├─ BrainBridge MCP Server
         ├─ Vector Index Manager  
         ├─ AI Provider Services
         └─ Health Monitor

Terminal 2: magi           # Interactive REPL (on-demand)
         ├─ Chat Interface
         ├─ Command Router
         ├─ Quick Actions
         └─ Status Display

Integration: Claude Code   # MCP Client (as needed)
         ├─ MCP Protocol Connection
         ├─ Tool Invocations
         ├─ Memory Access
         └─ AI-Assisted Operations
```

## Design Benefits

### 1. **Separation of Concerns**
- **Service Layer**: Handles complex backend operations
- **REPL Layer**: Focuses on user experience and interaction
- **Clear boundaries**: Each layer has distinct responsibilities

### 2. **Scalability**
- **Background Service**: Can handle multiple concurrent AI assistant connections
- **Interactive Layer**: Lightweight, fast startup for user commands
- **Resource Efficiency**: Service runs only when needed

### 3. **Maintainability**
- **Modular Design**: Each layer can be developed and tested independently
- **Clear Interfaces**: Well-defined communication between layers
- **Debuggability**: Separate logs and monitoring for each layer

### 4. **User Experience**
- **Simple Interface**: Single `magi` command for everything
- **Fast Response**: Background service eliminates startup delays
- **Consistent Behavior**: Same interface across all operations

## Integration Points

### MCP Protocol Integration
```typescript
// Service Layer: Hosts MCP server
magi start → BrainBridge MCP Server → stdio/tcp

// AI Assistant Integration
Claude Code → MCP Protocol → BrainBridge → Memory Operations
            ↓
    ai_query_memories, ai_save_memory, ai_status tools
```

### AI Provider Integration
```bash
# Service Layer: Provider management
magi start → AI Config Service → Provider-specific services
           ├─ Ollama: Local LLM + embeddings
           ├─ OpenAI: GPT-4 + text-embedding-3
           └─ Gemini: Gemini + text-embedding-004

# REPL Layer: Direct provider access
magi → AI Service → Active Provider → Response
```

## Configuration Management

### Environment-Based Configuration
```bash
# .env file drives provider selection
AI_PROVIDER=openai     # Service layer honors this
MEMORIES_LOCATION=project   # Both layers use same config
OLLAMA_HOST=127.0.0.1  # Provider-specific settings
```

### Layer-Specific Settings
```javascript
// Service Layer: config.js
module.exports = {
  ai: { provider: getProviderFromDotEnv() },
  memories: { location: process.env.MEMORIES_LOCATION },
  // ... service configuration
};

// REPL Layer: Uses service configuration
const config = require('./config.js').getAIConfig();
```

## Singleton Architecture & Resource Management

### Problem Statement
The original implementation allowed multiple `magi start` instances to run simultaneously, causing:
- **Resource Conflicts**: Multiple servers competing for same ports and memory paths
- **Inconsistent State**: Different AI provider configurations across instances
- **Connection Confusion**: MCP connections from Claude Code weren't visible in development console
- **Process Leakage**: Accumulation of orphaned server processes

### Singleton Pattern Solution

#### File-Based Process Lock
```javascript
// Lock file: .magi-start.lock
{
  "pid": 76575,
  "started": "2025-09-06T15:16:07.000Z",
  "dev": true
}
```

**Lock Lifecycle**:
1. **Acquisition**: Check for existing lock, validate process is alive, create new lock
2. **Validation**: Signal 0 to test process existence without disrupting it
3. **Cleanup**: Automatic removal on all exit paths (SIGINT, SIGTERM, error, normal exit)
4. **Stale Detection**: Remove locks for dead processes automatically

#### Graceful Failure Handling
When singleton constraint is violated, provide comprehensive guidance:

```bash
❌ Cannot start: Magi BrainBridge service is already running
📍 Running instance details:
   PID: 76575
   Started: 9/6/2025, 10:16:07 AM
   Mode: development (--dev)

🎯 What you probably want to do:
   magi logs     # View live logs from running instance
   magi status   # Check system health & diagnostics

🛠️  Service management:
   magi stop        # Stop the running instance
   magi restart     # Restart the service
   magi status      # Full system diagnostics

⚠️  Instance mode mismatch:
   Running instance is in development mode, but you tried to start in production mode.
   Consider: magi logs (to view dev logs) or magi stop && magi start (production)
```

**Key Features**:
- **Context-Aware Suggestions**: Different recommendations based on dev vs production mode attempts
- **Mode Mismatch Detection**: Warns when trying to start incompatible modes
- **Architecture Education**: Explains why singleton pattern is necessary
- **Actionable Commands**: Provides exact commands to resolve the situation

### MCP Connection Visibility

#### Problem: Invisible MCP Connections
Claude Code MCP connections were creating separate server instances, making development debugging difficult:
- No logs appeared in `magi start --dev` console when Claude Code connected
- Developers couldn't see MCP tool calls or connection events
- Separate processes made resource usage unclear

#### Solution: MCP Bridge Architecture

**Bridge Script** (`dev/scripts/magi-mcp-bridge.js`):
```javascript
// Intercepts MCP connections and logs to shared file
const sharedLogFile = '.magi-mcp.log';

function logMCPEvent(event, data = {}) {
  const logEntry = { timestamp, event, pid: process.pid, ...data };
  fs.appendFileSync(sharedLogFile, JSON.stringify(logEntry) + '\n');
}
```

**Main Console Integration** (`dev/scripts/magi-start.js`):
```javascript
// Monitors shared log file for MCP events
fs.watchFile(sharedLogFile, { interval: 100 }, (curr, prev) => {
  if (curr.mtime > prev.mtime) readNewMCPLogs();
});

// Displays MCP events in main console
📡 [10:16:56 AM] Claude Code connected via MCP
🔧 [10:16:56 AM] Claude Code called: ai_query_memories
📡 [10:16:56 AM] Claude Code disconnected from MCP
```

**Architecture Benefits**:
- **Unified Development Experience**: All MCP activity visible in main console
- **Preserved MCP Semantics**: Each connection still gets its own server instance (as MCP requires)
- **Real-time Monitoring**: File watching provides immediate feedback
- **Clean Separation**: Bridge handles MCP-specific concerns, main server focuses on development experience

### Service Management Enhancements

#### New Commands
- **`magi restart`**: Intelligent restart that preserves command-line flags
- **Enhanced `magi stop`**: Cleaner process termination and lock cleanup
- **Mode-aware guidance**: Context-sensitive help based on current running state

#### Resource Cleanup
- **Lock File Management**: Automatic cleanup on all exit scenarios
- **Process Tree Cleanup**: Proper termination of child processes
- **Shared Resource Cleanup**: MCP log files and temporary resources

### Architectural Impact

This singleton enhancement solves critical operational issues while maintaining the two-layer design:

**Service Layer Benefits**:
- Guaranteed single source of truth for AI provider configuration
- Consistent memory path and embedding index access
- Predictable resource utilization

**REPL Layer Benefits**:
- Clear feedback when service unavailable
- Guidance toward correct service management commands
- Visibility into MCP connections from AI assistants

**Integration Layer Benefits**:
- Reliable MCP server availability for Claude Code
- Consistent tool availability and state
- Improved debugging and development experience

### Design Principles Maintained
1. **User-Centric**: Error messages prioritize user workflow over technical details
2. **Educational**: Failures become learning opportunities about system architecture
3. **Actionable**: Every error provides specific commands to resolve the situation
4. **Robust**: Handles edge cases like stale locks, dead processes, and mode mismatches

## Future Evolution

### Planned Enhancements
1. **Multi-Instance Support**: Multiple background services for different contexts
2. **Remote Access**: Service layer accessible over network for cloud AI
3. **Plugin Architecture**: Extension points for custom commands and integrations
4. **Advanced REPL**: Enhanced interactive features (autocomplete, history, context)

### Architectural Stability
This two-layer design provides a stable foundation that can evolve without breaking user workflows:
- **Service Layer**: Can be enhanced with new backends, providers, and capabilities
- **REPL Layer**: Can add new interactive features while preserving command interface
- **Integration Layer**: Can support new AI assistants and protocols

---

## Implementation Guidelines

### For Developers
1. **Service Layer Changes**: Modify BrainBridge services, add new MCP tools
2. **REPL Layer Changes**: Enhance interactive commands, improve user experience  
3. **Integration Changes**: Add new AI assistant support, extend MCP protocol
4. **Always preserve the `magi` interface**: Users should never need to learn new commands

### For Contributors
1. **Understand the layers**: Know which layer your changes affect
2. **Test both layers**: Ensure service and REPL work together
3. **Document new commands**: Add to both technical docs and user guides
4. **Maintain backwards compatibility**: Don't break existing workflows

---

*This architecture design establishes the foundation for AGIfor.me's command-line interface, ensuring a consistent, scalable, and maintainable system for personal AI interactions.*