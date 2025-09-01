# 🧠 Brain Proxy Setup Guide

Complete guide to setting up the Brain Proxy system for Custom GPT integration with your local AGIfor.me BrainBridge.

## Overview

The Brain Proxy system enables Custom GPTs to access your local AGIfor.me memory bank through a cloud proxy, providing:
- **Remote access** to your personal memories
- **Graceful degradation** when your local system is offline
- **Privacy-preserving** architecture (no data persistence on proxy)
- **Professional GPT integration** with full OpenAPI compliance

## Architecture

```
Custom GPT → HTTPS → Cloud Proxy → WebSocket → Local BrainBridge → MCP Server
   (GPT)      (m3u.dossant.com:8082/bp)     (Your Computer)      (Port 8147)
```

## Setup Steps

### 1. Deploy Enhanced Server

The Brain Proxy functionality has been added to the existing BrainXchange server at `services/brainxchange/server/src/server.js`.

**Deploy to production:**
```bash
cd services/brainxchange
./deploy.sh
```

**Verify deployment:**
```bash
curl https://m3u.dossant.com:8082/bp/health
```

Expected response:
```json
{
  "status": "online",
  "service": "AGIfor.me Brain Proxy",
  "version": "1.0.0",
  "connectedBrains": 0,
  "routes": []
}
```

### 2. Configure Local BrainBridge

**Update your `.env` file:**
```bash
# Copy template if needed
cp brainbridge/.env.template brainbridge/.env

# Edit configuration
nano brainbridge/.env
```

**Add Brain Proxy settings:**
```env
# Brain Proxy Configuration
BRAIN_PROXY_ENABLED=true
BRAIN_PROXY_URL=wss://m3u.dossant.com:8082/bp/connect
BRAIN_PROXY_SECRET=your-unique-secret-key-at-least-8-chars
BRAIN_PROXY_ROUTE=your-unique-route-name
BRAIN_PROXY_LOCAL_MCP_URL=http://localhost:8147/mcp
```

**Generate secure credentials:**
```bash
# Generate a secure secret (use this value)
openssl rand -hex 16

# Create a unique route name (use your initials + random)
echo "ig-$(openssl rand -hex 4)"
```

**Example configuration:**
```env
BRAIN_PROXY_ENABLED=true
BRAIN_PROXY_URL=wss://m3u.dossant.com:8082/bp/connect
BRAIN_PROXY_SECRET=a1b2c3d4e5f6789012345678901234567
BRAIN_PROXY_ROUTE=ig-4f2a8b9d
BRAIN_PROXY_LOCAL_MCP_URL=http://localhost:8147/mcp
```

### 3. Start Local BrainBridge

**Start in HTTP mode (required for Brain Proxy):**
```bash
cd brainbridge
npm run dev
```

**Verify connection:**
Check the logs for:
```
🧠 Brain Proxy connector initialized
   Route: ig-4f2a8b9d
   Proxy: wss://m3u.dossant.com:8082/bp/connect
🧠 Brain Proxy connected successfully
```

### 4. Test Integration

**Run the ChatGPT integration test:**
```bash
# Test the complete ChatGPT → Brain Proxy → Local Brain flow
node scripts/test-chatgpt-integration.js
```

**Expected results:**
- ✅ Brain Proxy health check passed
- ✅ Route connection verified
- ✅ AI Status Check (mimics ChatGPT status call)
- ✅ Memory Query (tests AI-powered memory search)
- ✅ Memory Search (tests direct memory search)  
- ✅ Save Memory (tests AI categorization)

**If tests fail:**
- Check your `brainbridge/.env` configuration
- Ensure BrainBridge is running (`npm run dev` in `brainbridge/`)
- Verify your route appears in Brain Proxy health check

### 5. Create Custom GPT

**Go to ChatGPT → Create GPT → Configure**

**Basic Settings:**
- **Name:** "AGIfor.me Personal Brain"
- **Description:** "Access your personal AI memory bank powered by AGIfor.me"

**Instructions:**
```
You are connected to the user's personal AGIfor.me brain - their external memory system containing their accumulated knowledge and experiences.

When the user asks questions that might benefit from their personal knowledge:
1. Use the executeBrainCommand tool with method "ai_query_memories" 
2. If their brain is offline, explain they can access personal memories when their local system is running
3. Always be helpful even when the brain is offline

For saving new information:
1. Use method "ai_save_memory" to store important insights or learnings
2. The AI will automatically categorize and tag the content

Available methods:
- search_memories: Search through saved knowledge
- ai_query_memories: Ask questions about their knowledge base with AI synthesis
- ai_save_memory: Save new information with AI categorization  
- ai_status: Check system status

Be conversational and personal - this is their external brain, so treat their memories as extensions of their knowledge.
```

**Actions:**
1. Click "Create new action"
2. **Import from URL:** `https://m3u.dossant.com:8082/bp/openapi.json`
3. **Privacy Policy:** `https://m3u.dossant.com:8082/bp/privacy`

**CRITICAL: Configure Authentication**
After importing the OpenAPI schema, you MUST add authentication:
1. In the GPT Action editor, find the "Authentication" section
2. Select "API Key" authentication type
3. Configure as follows:
   - **Auth Type:** API Key
   - **API Key:** Your Brain Proxy secret from `.env` (e.g., `8f840af7792e4672a67dfb21754a571f`)
   - **Add to:** Header
   - **Header name:** `X-Brain-Key`

**Test the action in GPT builder:**
```json
{
  "route": "your-route-name",
  "id": "test-123",
  "method": "ai_status",
  "params": {}
}
```

If you get a 500 error or "Unauthorized" response, verify:
1. Your `X-Brain-Key` header matches your `BRAIN_PROXY_SECRET` in `.env`
2. Your route name matches your `BRAIN_PROXY_ROUTE` in `.env`
3. Your local BrainBridge is running (`npm run dev` in `brainbridge/`)

## Usage Examples

### Basic Memory Query
```
User: "What do I know about Node.js best practices?"

GPT calls:
{
  "route": "ig-4f2a8b9d",
  "id": "query-456",
  "method": "ai_query_memories", 
  "params": {
    "question": "Node.js best practices"
  }
}
```

### Save New Learning
```
User: "Remember that I learned React hooks should always be called at the top level"

GPT calls:
{
  "route": "ig-4f2a8b9d", 
  "id": "save-789",
  "method": "ai_save_memory",
  "params": {
    "content": "React hooks should always be called at the top level of components, never inside loops, conditions, or nested functions. This ensures hooks are called in the same order every time."
  }
}
```

### Check System Status
```
User: "Is my brain connected?"

GPT calls:
{
  "route": "ig-4f2a8b9d",
  "id": "status-101", 
  "method": "ai_status",
  "params": {}
}
```

## Troubleshooting

### Brain Shows as Offline
1. **Check BrainBridge is running:** `npm run dev` in `brainbridge/`
2. **Verify configuration:** Check `.env` file has correct settings
3. **Check connectivity:** Ensure no firewall blocking WebSocket connections
4. **Verify credentials:** Secret and route must match exactly

### GPT Returns "Unauthorized" or 500 Error
This is the most common issue - ChatGPT is not sending the correct authentication header.

1. **Verify authentication header:**
   ```bash
   # Test with your secret as X-Brain-Key header
   curl -X POST https://m3u.dossant.com/bp/rpc/your-route-name \
     -H "Content-Type: application/json" \
     -H "X-Brain-Key: your-brain-proxy-secret" \
     -d '{"id": "test", "method": "ai_status", "params": {}}'
   ```

2. **In ChatGPT Action Configuration:**
   - Authentication Type: API Key
   - Add to: Header
   - Header name: `X-Brain-Key`
   - API Key: Your exact `BRAIN_PROXY_SECRET` value from `.env`

3. **Common mistakes:**
   - Using wrong header name (must be `X-Brain-Key`)
   - Using route name instead of secret for authentication
   - Not configuring authentication at all in GPT Action

### GPT Not Responding
1. **Test endpoints manually:**
   ```bash
   curl https://m3u.dossant.com:8082/bp/health
   curl https://m3u.dossant.com:8082/bp/openapi.json
   ```
2. **Check GPT action configuration:** Verify OpenAPI import was successful
3. **Test with valid route:** Use your exact route name in requests

### Connection Keeps Dropping
1. **Check internet stability:** WebSocket requires stable connection
2. **Review logs:** Check BrainBridge logs for error messages
3. **Restart components:** Stop and restart both proxy and local services

### Limited Capacity Mode Always Active
1. **Verify route name:** Must exactly match between `.env` and GPT
2. **Check secret length:** Must be at least 8 characters
3. **Test local MCP:** Verify `http://localhost:8147/mcp` responds

## Security Notes

- **Route names** act as access tokens - keep them private
- **Secrets** should be cryptographically random - never use simple passwords  
- **No data persistence** - proxy server never stores your memories
- **Local control** - your memories never leave your computer except during active requests

## Monitoring

**Check proxy status:**
```bash
curl https://m3u.dossant.com:8082/bp/health
```

**Monitor logs:**
```bash
# Local BrainBridge logs
cd brainbridge && npm run logs

# Server logs (if you have access)
ssh your-server "tail -f /path/to/logs/server.log"
```

**Connection status in GPT:**
Ask your Custom GPT: "Are you connected to my brain?" It will call `ai_status` to check.

---

🎉 **Congratulations!** Your personal AI memory bank is now accessible through Custom GPTs while maintaining complete privacy and local control.