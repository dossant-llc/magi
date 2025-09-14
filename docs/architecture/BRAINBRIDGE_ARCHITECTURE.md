# BrainBridge Architecture (Consolidated)

This document consolidates the latest BrainBridge architecture from both implementation (`services/brainbridge`) and documentation (`docs/brainbridge`). It supersedes older drafts and scattered notes.

---

## Overview

BrainBridge is an **MCP (Model Context Protocol) server** that connects personal knowledge bases to AI assistants with **privacy controls**, **advanced search**, and **peer-to-peer (P2P) knowledge exchange**.

It provides:
- **Smart Memory Management** with AI categorization
- **Privacy Levels** (public → sensitive)
- **Vector Search + Keyword Fallback**
- **BrainXchange P2P** for cross-instance communication
- **Performance Metrics & Logging**
- **Dockerized Deployment**

---

## High-Level Architecture

```
+-------------------+       +-------------------+
| Claude Code MCP   | <---> | BrainBridge MCP   |
| Client            |       | Server (Node.js)  |
+-------------------+       +-------------------+
                                   |
                                   v
                        +-----------------------+
                        | Core Services Layer   |
                        | - AI Service          |
                        | - Embedding Service   |
                        | - Memory Service      |
                        | - Logger Service      |
                        | - Metrics Service     |
                        +-----------------------+
                                   |
                                   v
                        +-----------------------+
                        | Providers             |
                        | - OpenAI              |
                        | - Gemini              |
                        | - Ollama (local)      |
                        +-----------------------+
                                   |
                                   v
                        +-----------------------+
                        | BrainXchange P2P      |
                        | - WebSocket Protocol  |
                        | - Invite/Connect Flow |
                        +-----------------------+
                                   |
                                   v
                        +-----------------------+
                        | External Systems      |
                        | - BrainProxy          |
                        | - Magi Exchange       |
                        | - Dashboards/Monitoring|
                        +-----------------------+
```

---

## Detailed Component Interactions

### Request Flow (Memory Query)
1. **Claude Code MCP Client** issues `ai_query_memories`.
2. **Handlers** (`memory-handler.ts`) parse request.
3. **AI Service** orchestrates:
   - Calls **Embedding Service** to vectorize query.
   - Calls **Memory Service** to search embeddings + keyword fallback.
   - Applies **Privacy Filters** before returning.
4. **Logger Service** records structured logs.
5. **Metrics Service** tracks latency and hit/miss ratios.
6. Response returned to MCP client.

### Request Flow (BrainXchange P2P)
1. User issues `brainxchange_command` (`magi create invite`).
2. **Handlers** route to **BrainXchange Service**.
3. **BrainXchange Service**:
   - Generates invite code.
   - Establishes WebSocket connection to peer.
   - Routes messages in real-time.
4. **Memory Service** may be invoked on remote peer.
5. Responses flow back through WebSocket → BrainBridge → MCP client.

---

## Data Flow

```
[Claude Code MCP] 
     |
     v
[Handlers] --> [Services Layer] --> [Providers]
     |                |                  |
     |                |                  v
     |                |           [OpenAI/Gemini/Ollama]
     |                v
     |         [BrainXchange P2P] <--> [Remote Magi Instances]
     v
[Logs + Metrics]
```

---

## Deployment Topology

### Local Dev
- Node.js MCP server
- Optional Ollama for embeddings
- Local `.env` for BrainXchange identity

### Dockerized
- `brainbridge` container
- `ollama` container
- Volumes for `memories/` and `logs/`
- Configurable via `docker-compose.yml`

### Production
- BrainBridge MCP server behind process manager
- BrainXchange WebSocket server (`wss://.../bx`)
- Monitoring via dashboard + status API
- Logs shipped to central observability stack

---

## Core Components

### 1. **Server Layer**
- `src/server.ts` – Entry point, MCP stdio/HTTP transport
- Routes: `health-routes.ts`, `mcp-routes.ts`

### 2. **Services Layer**
- `ai-service.ts` – AI orchestration, query handling
- `embedding-service.ts` – Vector embeddings
- `memory-service.ts` – Memory CRUD + categorization
- `logger-service.ts` – Structured, emoji-rich logs
- `metrics-service.ts` – Performance tracking
- `brain-proxy-connector.ts` – Connects to BrainProxy
- `brainxchange.ts` – P2P communication logic

### 3. **Providers**
- `openai-provider.ts` – OpenAI integration
- `gemini-provider.ts` – Google Gemini integration
- `ollama-provider.ts` – Local embeddings
- `ai-provider-factory.ts` – Provider selection

### 4. **Handlers**
- `memory-handler.ts` – Memory-related MCP tools
- `pattern-handler.ts` – Categorization patterns
- `index.ts` – Tool registration

### 5. **Magic CLI**
- `magic/commands/*.ts` – CLI commands (`query`, `save`, `status`, `tunnel`, etc.)

### 6. **Integrations**
- `brainxchange-integration.ts` – P2P magi communication
- Supports **invite codes**, **connect**, **ask friend**

---

## Communication Protocols

### MCP (Local)
- **Purpose**: Connect Claude Code ↔ BrainBridge
- **Transport**: stdio or HTTP
- **Format**: JSON-RPC
- **Scope**: Single user, local machine

### BrainXchange (Global P2P)
- **Purpose**: Connect magi instances across the internet
- **Transport**: WebSocket (`wss://your-server.com/bx`)
- **Format**: JSON messages
- **Scope**: Multi-user, global
- **Workflow**:
  1. `magi create invite` → generates 6-char code
  2. Friend uses `magi connect CODE`
  3. Exchange knowledge via `magi ask friend about topic`

---

## Privacy Model

- 🌍 **public** – Open, shareable
- 👥 **team** – Work colleagues
- 👤 **personal** – Personal but not sensitive
- 🔒 **private** – Private
- 🔐 **sensitive** – Highly confidential

---

## Deployment

### Local
```bash
npm install
npm run dev:stdio
```

### Docker
- `brainbridge` – MCP server
- `ollama` – Embeddings service
- Volumes:
  - `./memories:/app/memories`
  - `./logs:/app/logs`
  - `ollama-data`

### Environment Variables
- `NODE_ENV`
- `MEMORIES_DIR`
- `LOG_FILE`
- `TRACE_MODE`
- `BRAINXCHANGE_EMAIL`
- `BRAINXCHANGE_NAME`

---

## Testing

- **Unit Tests**: `tests/services/*`
- **Integration Tests**: `tests/integration/*`
- **BrainXchange Demos**: `tests/demos/demo-alice-discovery.js`
- **End-to-End**: Connects to magi-exchange server

---

## Key Design Decisions

- **MCP-first**: All tools exposed via MCP handlers
- **Service-Oriented**: AI, memory, logging, metrics separated
- **Pluggable Providers**: OpenAI, Gemini, Ollama interchangeable
- **Privacy by Design**: Explicit levels enforced at memory save/query
- **P2P-first**: BrainXchange enables federated knowledge sharing

---

## Roadmap

- [ ] Expand provider support (Anthropic, Mistral)
- [ ] Enhanced memory graph visualization
- [ ] Offline-first mode with sync
- [ ] Stronger encryption for P2P
- [ ] Web dashboard for BrainBridge status

---

## Conclusion

BrainBridge is the **knowledge backbone** of the magi ecosystem, bridging **local AI memory management** with **global P2P knowledge exchange**, while enforcing **privacy and transparency**.
