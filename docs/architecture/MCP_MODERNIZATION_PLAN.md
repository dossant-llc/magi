# MCP Server Modernization Plan
*Migration from Legacy SDK Patterns to Modern MCP Best Practices*

## 📋 Executive Summary

This document outlines a comprehensive plan to modernize the BrainBridge MCP server from legacy SDK patterns to the current recommended patterns from the official MCP TypeScript SDK documentation.

**Current Status**: Using legacy `Server` class with manual request handlers
**Target Status**: Using modern `McpServer` with `registerTool()` and `registerResource()` patterns
**Estimated Time**: 4-6 hours
**Risk Level**: Medium (requires careful testing of MCP protocol compatibility)

---

## 🔍 Current vs Recommended Patterns Analysis

### Import Patterns

**❌ Current (Legacy)**
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
```

**✅ Recommended (Modern)**
```typescript
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
```

### Server Initialization

**❌ Current (Legacy)**
```typescript
this.server = new Server(
  {
    name: 'brainbridge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);
```

**✅ Recommended (Modern)**
```typescript
const server = new McpServer({
  name: "brainbridge",
  version: "1.0.0"
});
```

### Tool Registration

**❌ Current (Legacy)**
```typescript
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!args) {
    throw new Error('Missing arguments');
  }

  switch (name) {
    case 'search_memories':
      return await this.memoryHandler.searchMemories(
        args.query as string, 
        args.category as string | undefined
      );
    // ... more cases
  }
});
```

**✅ Recommended (Modern)**
```typescript
server.registerTool("search_memories", {
  description: "Search through personal memories",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    category: z.string().optional().describe("Optional category to search within")
  })
}, async ({ query, category }) => {
  return await memoryHandler.searchMemories(query, category);
});
```

### Resource Handling

**❌ Current (Legacy)**
```typescript
this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  if (uri.startsWith('knowledge://')) {
    const filename = uri.replace('knowledge://', '');
    const content = this.memoryService.readMemoryFile(filename);
    return {
      contents: [
        {
          uri: uri,
          mimeType: 'text/markdown',
          text: content,
        },
      ],
    };
  }
  throw new Error(`Resource not found: ${uri}`);
});
```

**✅ Recommended (Modern)**
```typescript
server.registerResource(
  "knowledge",
  new ResourceTemplate("knowledge://{filename}", { list: "knowledge://" }),
  {
    title: "Knowledge Base",
    description: "Personal knowledge and memory files"
  },
  async (uri, { filename }) => {
    const content = memoryService.readMemoryFile(filename);
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/markdown',
        text: content
      }]
    };
  }
);
```

---

## 📋 Migration Action Plan

### Phase 1: Dependencies and Setup (30 minutes)

#### 1.1 Update Dependencies
```bash
cd /Users/igor/Documents/code/agiforme/brainbridge
npm install zod@latest
npm update @modelcontextprotocol/sdk
```

#### 1.2 Verify Node.js Version
- **Requirement**: Node.js 18.x or higher
- **Current Check**: `node --version`
- **Action**: Upgrade if needed

#### 1.3 Create Migration Branch
```bash
git checkout -b feature/mcp-modernization
```

### Phase 2: Core Server Modernization (2 hours)

#### 2.1 Update Main Server File (`src/server.ts`)

**Steps:**
1. Replace imports with modern MCP SDK imports
2. Add Zod import for validation
3. Replace `Server` with `McpServer`
4. Remove manual request handlers
5. Add modern tool registration
6. Add modern resource registration

**Files to Modify:**
- `src/server.ts` - Main server class
- `package.json` - Add zod dependency

#### 2.2 Create Zod Schema Definitions

**New File:** `src/schemas/tool-schemas.ts`
```typescript
import { z } from "zod";

export const SearchMemoriesSchema = z.object({
  query: z.string().min(1).describe("Search query"),
  category: z.string().optional().describe("Optional category to search within")
});

export const AddMemorySchema = z.object({
  title: z.string().min(1).describe("Title of the knowledge entry"),
  content: z.string().min(1).describe("Content to add"),
  category: z.string().min(1).describe("Category for the knowledge")
});

export const GetOrganizationPatternsSchema = z.object({
  content_preview: z.string().optional().describe("Optional preview of content to get more relevant patterns")
});
```

#### 2.3 Update Handler Interfaces

**Modify:** `src/handlers/memory-handler.ts`
- Update method signatures to use Zod-validated inputs
- Remove manual type casting
- Add proper TypeScript types for validated inputs

**Modify:** `src/handlers/pattern-handler.ts`
- Same updates as memory handler

### Phase 3: Service Layer Updates (1 hour)

#### 3.1 Update Service Return Types

**Files to Update:**
- `src/services/memory-service.ts`
- `src/types/memory-types.ts`

**Changes:**
- Ensure return types match MCP protocol expectations
- Add proper error handling for MCP context
- Update interfaces to be more explicit about MCP content types

#### 3.2 Logging Best Practices Review

**File:** `src/services/logger-service.ts`

**Verification Checklist:**
- ✅ No console.log() usage (writes to stdout)
- ✅ Using file-based logging
- ✅ Proper error logging to stderr when needed

### Phase 4: Modern Resource Implementation (1 hour)

#### 4.1 Implement Dynamic Resource Templates

**New Pattern:**
```typescript
// Static resource for listing all knowledge files
server.registerResource(
  "knowledge-list",
  "knowledge://",
  {
    title: "Knowledge Files List",
    description: "List of all available knowledge files"
  },
  async () => {
    const files = memoryService.getMemoryFiles();
    return {
      contents: [{
        uri: "knowledge://",
        mimeType: "application/json",
        text: JSON.stringify({ files }, null, 2)
      }]
    };
  }
);

// Dynamic resource for individual files
server.registerResource(
  "knowledge-file",
  new ResourceTemplate("knowledge://{filename}", { list: "knowledge://" }),
  {
    title: "Knowledge File",
    description: "Individual knowledge file content"
  },
  async (uri, { filename }) => {
    const content = memoryService.readMemoryFile(filename);
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/markdown',
        text: content
      }]
    };
  }
);
```

### Phase 5: HTTP Route Modernization (45 minutes)

#### 5.1 Update HTTP Routes to Use Modern Server

**File:** `src/routes/mcp-routes.ts`

**Changes:**
- Remove manual tool/resource handling
- Delegate to modern McpServer instance
- Simplify HTTP-to-MCP bridge
- Maintain backward compatibility

#### 5.2 Test HTTP Endpoint Compatibility

**Verification:**
- POST `/mcp` with `tools/list` still works
- POST `/mcp` with `tools/call` still works
- GET `/health` still works

### Phase 6: Testing and Validation (1.5 hours)

#### 6.1 Unit Test Updates

**Files to Update:**
- `tests/server.test.ts`
- Add new test files for modern patterns

**New Tests Needed:**
```typescript
describe('Modern MCP Server', () => {
  test('should register tools with Zod validation', async () => {
    // Test tool registration
  });

  test('should validate input schemas', async () => {
    // Test Zod validation works
  });

  test('should handle resources with templates', async () => {
    // Test resource templates
  });
});
```

#### 6.2 Integration Testing

**Test Cases:**
1. **STDIO Mode Testing**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/server.js stdio
   ```

2. **HTTP Mode Testing**
   ```bash
   curl -X POST http://localhost:8147/mcp \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/list", "params": {}}'
   ```

3. **Tool Execution Testing**
   ```bash
   curl -X POST http://localhost:8147/mcp \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/call", "params": {"name": "search_memories", "arguments": {"query": "test"}}}'
   ```

4. **Resource Access Testing**
   ```bash
   curl -X POST http://localhost:8147/mcp \
     -H "Content-Type: application/json" \
     -d '{"method": "resources/read", "params": {"uri": "knowledge://personal-preferences.md"}}'
   ```

#### 6.3 MCP Client Testing

**Using Claude Desktop:**
1. Update MCP server configuration
2. Test all three tools work correctly
3. Test resource browsing works
4. Verify error handling is proper

---

## 🏗️ Implementation Order

### Day 1 - Core Migration (4 hours)

1. **Setup (30 min)**
   - [ ] Create migration branch
   - [ ] Update dependencies
   - [ ] Backup current working server

2. **Schema Creation (45 min)**
   - [ ] Create `src/schemas/tool-schemas.ts`
   - [ ] Define all Zod schemas
   - [ ] Export schema types

3. **Server Modernization (2 hours)**
   - [ ] Update `src/server.ts` imports
   - [ ] Replace Server with McpServer
   - [ ] Implement registerTool() for all tools
   - [ ] Implement registerResource() for resources

4. **Handler Updates (45 min)**
   - [ ] Update handlers to use validated inputs
   - [ ] Remove manual type casting
   - [ ] Update return types

### Day 2 - Testing and Finalization (2 hours)

5. **HTTP Route Updates (30 min)**
   - [ ] Update `src/routes/mcp-routes.ts`
   - [ ] Test HTTP endpoints still work

6. **Testing (1 hour)**
   - [ ] Write/update unit tests
   - [ ] Test STDIO mode
   - [ ] Test HTTP mode
   - [ ] Test with real MCP client

7. **Documentation (30 min)**
   - [ ] Update README with new patterns
   - [ ] Document any breaking changes
   - [ ] Update API documentation

---

## ⚠️ Risk Mitigation

### Backward Compatibility Risks

**Risk**: HTTP endpoints might break existing clients
**Mitigation**: 
- Test all HTTP endpoints thoroughly
- Maintain same JSON-RPC interface
- Keep health endpoint unchanged

### Protocol Compatibility Risks

**Risk**: New McpServer might have different protocol behavior
**Mitigation**:
- Test with multiple MCP clients
- Verify JSON-RPC message format unchanged
- Test both STDIO and HTTP transports

### Development Environment Risks

**Risk**: New dependencies might conflict
**Mitigation**:
- Test in isolated environment first
- Document exact dependency versions
- Maintain fallback to old version

---

## 🧪 Testing Strategy

### Unit Testing
- [ ] All handlers work with new validation
- [ ] Schemas validate correctly
- [ ] Services return expected formats

### Integration Testing
- [ ] STDIO transport works
- [ ] HTTP transport works
- [ ] Real MCP clients can connect

### Regression Testing
- [ ] All existing functionality preserved
- [ ] Performance is same or better
- [ ] Error handling is improved

---

## 📊 Success Criteria

### Functional Requirements
- [ ] All existing MCP tools work identically
- [ ] All existing resources accessible
- [ ] HTTP API maintains compatibility
- [ ] STDIO mode works with MCP clients

### Code Quality Requirements
- [ ] Modern MCP SDK patterns used throughout
- [ ] Zod validation on all inputs
- [ ] Type safety improved
- [ ] Code is more maintainable

### Performance Requirements
- [ ] No degradation in response times
- [ ] Memory usage similar or better
- [ ] Startup time unchanged

---

## 📚 Reference Documentation

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Server Quickstart](https://modelcontextprotocol.io/quickstart/server)
- [Zod Documentation](https://zod.dev/)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)

---

## 🔄 Rollback Plan

If modernization causes issues:

1. **Immediate Rollback**
   ```bash
   git checkout main
   npm run start
   ```

2. **Partial Rollback**
   - Keep schema validation, revert server pattern
   - Keep modern imports, revert registration pattern

3. **Gradual Migration**
   - Implement side-by-side with feature flags
   - Migrate one tool at a time

---

*This plan ensures a systematic, low-risk migration to modern MCP patterns while maintaining all existing functionality.*