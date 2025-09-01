#!/usr/bin/env node

// Simple MCP client to test stdio server
const { spawn } = require('child_process');

const mcpMessages = {
  initialize: {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    }
  },
  listTools: {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list"
  },
  queryMemories: {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "ai_query_memories",
      arguments: {
        question: "What do you remember?",
        synthesis_mode: "raw"
      }
    }
  }
};

function testMCP() {
  console.log('🧪 Testing MCP connection...\n');
  
  // Spawn the MCP server
  const server = spawn('npm', ['run', 'bb:stdio'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: process.cwd()
  });

  let messageId = 1;

  function sendMessage(message) {
    console.log(`📤 Sending: ${message.method}`);
    server.stdin.write(JSON.stringify(message) + '\n');
  }

  server.stdout.on('data', (data) => {
    const responses = data.toString().trim().split('\n');
    responses.forEach(response => {
      if (response.trim() && response.startsWith('{')) {
        try {
          const parsed = JSON.parse(response);
          console.log(`📥 Response:`, JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log(`📥 Raw:`, response);
        }
      }
    });
  });

  // Send test sequence
  setTimeout(() => sendMessage(mcpMessages.initialize), 1000);
  setTimeout(() => sendMessage(mcpMessages.listTools), 2000);
  setTimeout(() => sendMessage(mcpMessages.queryMemories), 3000);
  
  // Cleanup after 10 seconds
  setTimeout(() => {
    console.log('\n✅ Test complete, shutting down...');
    server.kill();
    process.exit(0);
  }, 10000);
}

if (require.main === module) {
  testMCP();
}