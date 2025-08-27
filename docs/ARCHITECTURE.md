# Architecture Overview

> **Personal AI Knowledge Base with Smart Privacy Controls**

## Core Concept

Transform scattered lessons learned into an AI-accessible, privacy-aware memory bank. Users capture insights naturally; AI handles intelligent categorization and privacy protection.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Assistant  │────│   MCP Server     │────│  Smart Privacy  │
│   (Claude, etc) │    │   (TypeScript)   │    │   Classifier    │
└─────────────────┘    └──────────┬───────┘    └─────────┬───────┘
                                  │                      │
                       ┌──────────▼───────┐    ┌─────────▼──────────┐
                       │  Knowledge Store │    │   Consent Engine   │
                       │ (Privacy Levels) │    │ (User in Control)  │
                       └──────────────────┘    └────────────────────┘
```

## Privacy-First Design

### Memory Organization
```
memories/
├── public/          🌍 Anyone can access
├── team/           👥 Work colleagues only
├── personal/       🏠 Close friends/family context  
├── private/        🔒 Local AI assistants only
├── sensitive/      🚨 Maximum protection required
└── examples/       📚 Templates and learning materials
```

### Smart Categorization Flow
1. **User adds memory** - Natural language, no manual categorization
2. **AI analyzes content** - Privacy classifier with confidence scoring  
3. **Auto-categorize** (high confidence) or **Ask user** (low confidence)
4. **Learn from feedback** - Improve suggestions over time
5. **Store with metadata** - Privacy level, tags, relationships

### Consent System
- **Privacy-aware search** - Respects folder boundaries
- **Interactive consent** - User approves/denies access requests
- **Trust scores** - Reduce friction for trusted AI assistants
- **Complete audit trail** - Track all knowledge access

## Technical Components

### 1. MCP Server (`src/server.ts`)
**Purpose**: Bridge between AI assistants and memory bank
**Key features**:
- `add_memory` tool with smart categorization
- `search_memories` tool with privacy filtering
- Resource access for direct file reading
- Consent request handling

### 2. Privacy Classifier (`src/privacy/classifier.ts`)
**Purpose**: Intelligent privacy level detection
**Algorithm**:
- Rule-based scoring (keywords, patterns)
- Confidence calculation (0-100%)
- User preference learning
- Conservative bias for uncertainty

### 3. Consent Engine (`src/privacy/consent.ts`)
**Purpose**: User control over memory access
**Features**:
- Interactive CLI prompts
- Permission rule storage
- Trust score management  
- Access audit logging

### 4. Memory Store (File system)
**Purpose**: Organized, searchable memory storage
**Structure**:
- Privacy-level directories
- YAML frontmatter for metadata
- Markdown content for readability
- Git-friendly for version control

## Data Flow

### Adding Memories
```typescript
User: "Add memory: Always check WiFi network first when troubleshooting"
├─> Privacy Classifier analyzes content
├─> High confidence (92%): "public" level  
├─> Auto-generate tags: [network, troubleshooting, wifi]
├─> Store in public/network-troubleshooting.md
└─> Confirm to user: "✅ Added to public memories"
```

### Searching Memories  
```typescript
AI Assistant: "Search for network troubleshooting tips"
├─> Check AI assistant permissions
├─> Filter by accessible privacy levels
├─> Search across allowed files
├─> Return results with privacy context
└─> Log access for audit
```

### Consent Flow
```typescript
Cloud AI: "I want to access team-level memories about deployment"
├─> Generate consent request
├─> Show user: requester, intent, files needed
├─> User decision: allow/deny/modify
├─> Update permission rules
└─> Grant/deny access accordingly
```

## Key Design Principles

### 1. **Privacy by Default**
- New memories start private until classified
- Conservative bias: when uncertain, choose more restrictive
- User always has final control over categorization

### 2. **Friction-Free Capture**
- No manual categorization required
- Smart defaults based on content analysis
- Learn from user corrections over time

### 3. **Informed Consent** 
- Users see exactly what AI wants to access and why
- Granular control: file-level, topic-level, requester-level
- Complete transparency in access decisions

### 4. **Local-First Security**
- Sensitive knowledge never leaves local environment
- Consent decisions stored locally
- Optional remote access with explicit user control

## Implementation Status

### ✅ Phase 0: Foundation (Complete)
- Basic MCP server with search/add tools
- File-based memory storage
- Privacy-level directory structure
- Template system and documentation

### 📋 Phase 1: Smart Privacy (Next - 2-3 weeks)
- Smart auto-categorization with confidence scoring
- CLI consent system for access requests
- User preference learning
- Basic permission storage and audit logging

### 🔮 Phase 2: Web Dashboard (Future - 2-3 weeks)
- Web UI for consent management
- Real-time access request notifications
- Permission rule editor with bulk operations
- Access history visualization

### 🚀 Phase 3: Advanced Features (Future - 1-2 months)
- Enhanced AI classification with local LLM
- Smart content redaction
- Native OS notifications
- Third-party AI assistant integrations

---

*This architecture balances simplicity with powerful privacy controls, ensuring users maintain complete agency over their personal knowledge while enabling seamless AI assistance.*