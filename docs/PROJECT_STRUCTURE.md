# Project Structure

## Overview

This is a monorepo with three main components:

```
personal-ai-knowledge-base/
├── mcp-server/          # MCP server for AI assistant integration
├── brain-gatekeeper/    # Your knowledge guardian, analytics & insights dashboard  
├── shared/              # Shared TypeScript types
├── knowledge/           # Privacy-organized knowledge files
└── docs/                # Design and architecture documentation
```

## Components

### 🔧 MCP Server (`mcp-server/`)
**Purpose**: Bridge between AI assistants and knowledge base
- TypeScript MCP server implementation
- Smart privacy classification
- Knowledge search and storage
- Consent request handling

**Key files**:
- `src/server.ts` - Main MCP server
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

### 🧠 Brain Gatekeeper (`brain-gatekeeper/`)
**Purpose**: Your personal knowledge guardian and analytics dashboard
- 🛡️ **Access Control**: Real-time consent request notifications and permission management
- 📔 **Knowledge Diary**: Timeline of knowledge growth, access patterns, learning insights
- 🔥 **Knowledge Heatmap**: Visualize which knowledge gets accessed most/least
- 🕳️ **Knowledge Gaps**: Detect questions that couldn't be answered, suggest areas to expand
- 📊 **Analytics**: Usage patterns, trust scores, privacy level distribution

**Key files**:
- `index.html` - Main UI layout
- `src/main.ts` - Application logic
- `vite.config.ts` - Development server config

### 🔗 Shared Types (`shared/`)
**Purpose**: Common TypeScript interfaces and types
- `types/index.ts` - Shared data structures for requests, permissions, etc.

### 📚 Knowledge (`knowledge/`)
**Purpose**: Privacy-organized knowledge storage
- `public/` - Shareable knowledge
- `team/` - Work colleagues only
- `personal/` - Close friends/family
- `private/` - Local AI only
- `sensitive/` - Maximum protection

## Development

### Quick Start
```bash
# Install all dependencies
npm install

# Start MCP server only
./start.sh

# Start both MCP server and consent UI
./start.sh --with-ui

# Or start individually:
npm run dev        # MCP server
npm run dev:ui     # Consent UI
```

### Available Scripts
- `npm run dev` - Start MCP server in development mode
- `npm run dev:ui` - Start consent UI development server
- `npm run dev:all` - Start both services concurrently
- `npm run build` - Build both components for production
- `npm run install:all` - Install dependencies in all workspaces

### URLs
- **MCP Server**: stdio communication (for local AI assistants)
- **Consent UI**: http://localhost:3001 (web dashboard)

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Assistant  │────│   MCP Server     │────│   Consent UI    │
│   (Claude, etc) │    │   (port: stdio)  │    │ (port: 3001)    │
└─────────────────┘    └──────────┬───────┘    └─────────────────┘
                                  │                      │
                       ┌──────────▼───────┐    ┌─────────▼──────────┐
                       │  Knowledge Store │    │   User Consent     │
                       │ (File System)    │    │   Management       │
                       └──────────────────┘    └────────────────────┘
```

## Development Workflow

1. **Add knowledge**: Use MCP server's `add_knowledge` tool
2. **Classify privacy**: AI suggests privacy level, user confirms if uncertain  
3. **Access requests**: AI assistants request permission via consent UI
4. **User approval**: Review and approve/deny via web dashboard
5. **Audit trail**: All access logged for review

---

*This structure supports both the current basic implementation and future smart categorization features.*