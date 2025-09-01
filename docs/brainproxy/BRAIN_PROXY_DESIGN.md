# Brain Proxy (BP) Integration Design

## Overview
Extend the existing magi-exchange server on m3u.dossant.com:8082 to support Brain Proxy functionality, enabling Custom GPTs to access local BrainBridge MCP servers via standardized HTTPS API.

## Architecture Integration
**Current**: `wss://m3u.dossant.com/bx` (BrainXchange P2P)  
**New**: `https://m3u.dossant.com:8082/bp/` (Brain Proxy GPT bridge)

### URL Structure
- `wss://m3u.dossant.com/bx` - Existing BrainXchange WebSocket (use BRAINXCHANGE_SERVER env var)
- `https://m3u.dossant.com:8082/bp/rpc/:route` - GPT RPC endpoint  
- `wss://m3u.dossant.com:8082/bp/connect` - Local connector WebSocket
- `https://m3u.dossant.com:8082/bp/health` - Health check for GPT
- `https://m3u.dossant.com:8082/bp/openapi.json` - OpenAPI schema
- `https://m3u.dossant.com:8082/bp/privacy` - Privacy policy page

## Implementation Plan

### Phase 1: Extend magi-exchange server
1. **Add Brain Proxy routes** to existing magi-exchange server
2. **Connector management** - track local BrainBridge connectors by route
3. **Request correlation** - UUID-based request/response matching with timeouts
4. **Graceful degradation** - "limited capacity" responses when local brain offline

### Phase 2: Local BrainBridge integration  
1. **Add BrainProxyConnector service** to BrainBridge server
2. **WebSocket client** connecting to `wss://m3u.dossant.com:8082/bp/connect`
3. **HTTP relay** - forward RPC calls to local MCP HTTP endpoint (port 8147)
4. **Environment config** - `BRAIN_PROXY_*` variables

### Phase 3: GPT Integration Documentation
1. **OpenAPI 3.0 schema** - proper GPT tool integration spec
2. **Privacy policy page** - required for Custom GPT approval
3. **Setup documentation** - complete GPT configuration guide
4. **Dummy responses** - professional "brain offline" messaging

## Key Features

### Smart Responses
- **Online**: Full MCP tool responses from local BrainBridge
- **Offline**: Professional "limited capacity" message:
  ```
  🧠 **AGIfor.me Brain Status: Limited Capacity**
  
  Your external brain is currently offline. I can help with:
  - General knowledge and reasoning
  - Code assistance and problem solving  
  - Writing and analysis tasks
  
  For access to your personal memories and knowledge base, 
  please ensure your local AGIfor.me system is running.
  ```

### GPT Integration Requirements
1. **OpenAPI Schema** - Complete tool definitions for GPT
2. **Privacy Policy** - Hosted at `/bp/privacy` 
3. **HTTPS Support** - Required for Custom GPT approval
4. **Error Handling** - Graceful degradation when brain offline
5. **Rate Limiting** - Protect against abuse

### Security & Privacy
- **Route isolation** - Each user gets unique route (e.g., `/bp/rpc/user123`)
- **No data persistence** - Messages never stored on proxy
- **Token-based auth** - Shared secrets for connector registration
- **Request timeout** - 30-second max response time

## Custom GPT Setup Guide

### 1. OpenAPI Schema
Complete schema at `https://m3u.dossant.com:8082/bp/openapi.json`:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "AGIfor.me Brain Proxy",
    "description": "Access your personal AI memory bank through AGIfor.me",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://m3u.dossant.com:8082/bp",
      "description": "AGIfor.me Brain Proxy"
    }
  ],
  "paths": {
    "/rpc/{route}": {
      "post": {
        "summary": "Execute brain command",
        "operationId": "executeBrainCommand",
        "parameters": [
          {
            "name": "route",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Your unique brain route identifier"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["id", "method", "params"],
                "properties": {
                  "id": {
                    "type": "string",
                    "description": "Unique request identifier"
                  },
                  "method": {
                    "type": "string",
                    "enum": [
                      "search_memories",
                      "add_memory", 
                      "ai_query_memories",
                      "ai_save_memory",
                      "ai_status"
                    ],
                    "description": "Brain operation to perform"
                  },
                  "params": {
                    "type": "object",
                    "description": "Method-specific parameters"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {"type": "string"},
                    "result": {"type": "object"},
                    "error": {"type": "string"}
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 2. Custom GPT Configuration

**Name**: "AGIfor.me Personal Brain"

**Description**: 
"Access your personal AI memory bank powered by AGIfor.me. This GPT can search through your saved memories, add new knowledge, and provide personalized responses based on your accumulated learning."

**Instructions**:
```
You are connected to the user's personal AGIfor.me brain - their external memory system. 

When the user asks questions that might benefit from their personal knowledge:
1. Use the executeBrainCommand tool with method "ai_query_memories"
2. If their brain is offline, explain they can access personal memories when their local system is running
3. Always be helpful even when the brain is offline

For saving new information:
1. Use method "ai_save_memory" to store important insights or learnings
2. The AI will automatically categorize and tag the content

Available methods:
- search_memories: Search through saved knowledge
- ai_query_memories: Ask questions about their knowledge base  
- ai_save_memory: Save new information with AI categorization
- ai_status: Check system status
```

**Privacy Policy URL**: `https://m3u.dossant.com:8082/bp/privacy`

### 3. Environment Configuration

**BrainBridge .env additions**:
```bash
# Brain Proxy Configuration
BRAIN_PROXY_ENABLED=true
BRAIN_PROXY_URL=wss://m3u.dossant.com:8082/bp/connect
BRAIN_PROXY_SECRET=your-unique-secret-key
BRAIN_PROXY_ROUTE=your-unique-route-id
```

## Implementation Files

### magi-exchange server extensions:
- Add `/bp/` routes to existing server
- Connector management and request correlation
- OpenAPI schema and privacy policy endpoints

### BrainBridge integration:
- `brainbridge/src/services/brain-proxy-connector.ts` - WebSocket client
- Environment-based configuration
- HTTP relay to local MCP endpoint

## Benefits
- **Single deployment** - Extends existing m3u.dossant infrastructure
- **Zero local complexity** - BrainBridge just adds one connector service
- **Professional GPT integration** - Full OpenAPI compliance
- **Graceful degradation** - Works whether brain is online or offline
- **Path-based routing** - Clean URL structure, no port conflicts