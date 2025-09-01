# Project Structure

## Overview

**Personal AI Memory Bank** - A privacy-first system for organizing and accessing your personal knowledge through AI assistants.

```
personal-ai-knowledge-base/
├── brainbridge/         🌉 MCP server (connects memories to AIs)
├── brainkeeper/         🧠 Analytics dashboard (guards & insights) 
├── memories/            💭 Privacy-organized memory storage
├── shared/              🔗 Common TypeScript types
├── docs/                📚 Architecture and design documentation
├── start.sh            🚀 Quick start script
├── package.json        📦 Main project config
└── README.md           📖 Project overview
```

## Components

### 🌉 BrainBridge (`brainbridge/`)
**Purpose**: MCP server that connects AI assistants to your memories
- Smart privacy classification of new memories
- Search and retrieval with privacy filtering
- Consent request handling
- Memory storage and organization

**Key files**:
- `src/server.ts` - Main MCP server implementation
- `package.json` - Dependencies (MCP SDK, TypeScript)

### 🧠 BrainKeeper (`brainkeeper/`)
**Purpose**: Your personal memory guardian and analytics dashboard
- 🛡️ **Access Control**: Real-time consent requests and permissions
- 📔 **Memory Diary**: Timeline of memory growth and access patterns
- 🔥 **Knowledge Heatmap**: Visualize which memories get accessed most
- 🕳️ **Knowledge Gaps**: Detect unanswered questions, suggest areas to expand
- 📊 **Analytics**: Usage patterns, trust scores, privacy distributions

**Key files**:
- `index.html` - Web dashboard interface
- `src/main.ts` - Dashboard application logic

### 💭 Memories (`memories/`)
**Purpose**: Privacy-organized personal memory storage
```
memories/
├── public/          🌍 Shareable with anyone
├── team/           👥 Work colleagues only
├── personal/       🏠 Close friends/family context
├── private/        🔒 Local AI assistants only
├── sensitive/      🚨 Maximum protection required
└── examples/       📚 Templates and guides
```

### 🔗 Shared (`shared/`)
**Purpose**: Common TypeScript interfaces and types
- Data structures for consent requests, memory metadata
- Privacy level definitions and user preferences

### 📚 Docs (`docs/`)
**Purpose**: Architecture documentation and design decisions
- System architecture and technical design
- Privacy and consent system specifications  
- Development roadmap and implementation phases
- Real design insights from building the system

## Development

### Quick Start
```bash
# Install dependencies
npm install

# Start BrainBridge only
./start.sh

# Start both BrainBridge and BrainKeeper
./start.sh --with-ui
```

### Available Scripts
- `npm run dev` - Start BrainBridge MCP server
- `npm run dev:ui` - Start BrainKeeper dashboard  
- `npm run dev:all` - Start both services concurrently
- `npm run build` - Build both components for production

### URLs
- **BrainBridge**: stdio communication (for local AI assistants)
- **BrainKeeper**: http://localhost:3001 (web dashboard)

## The Brain Ecosystem

This project creates a cohesive ecosystem for personal knowledge management:

1. **📝 Capture**: Natural memory addition via AI assistants
2. **🧠 Classify**: Smart privacy-level classification  
3. **🛡️ Control**: User consent for all memory access
4. **📊 Analyze**: Insights into memory usage and gaps
5. **🔍 Search**: Privacy-aware memory retrieval

Each component works together to create an intelligent, privacy-first personal memory system that grows with you and adapts to your preferences over time.

---

*Clean, focused structure supporting both current functionality and future smart categorization features.*