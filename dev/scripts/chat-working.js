#!/usr/bin/env node

const readline = require('readline');
const { spawn } = require('child_process');

console.log('🧠 BrainBridge Chat - Testing your favorite beer question...\n');

// Start the MCP server
const server = spawn('npm', ['run', 'dev:stdio', '--workspace=brainbridge'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Wait for server to start, then send init message
setTimeout(() => {
  console.log('📤 Initializing MCP connection...');
  server.stdin.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\n');
}, 3000);

// Wait a bit more, then send the beer question
setTimeout(() => {
  console.log('📤 Asking about favorite beer...');
  server.stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ai_query_memories","arguments":{"question":"what is my fav beer?","synthesis_mode":"raw"}}}\n');
}, 5000);

// Handle responses
server.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  
  lines.forEach(line => {
    if (line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1 && response.result) {
          console.log('✅ MCP Connection established!');
        } else if (response.id === 2 && response.result) {
          console.log('\n📝 Response about your favorite beer:');
          console.log('=====================================');
          
          if (response.result.content && Array.isArray(response.result.content)) {
            response.result.content.forEach(item => {
              if (item.type === 'text' && item.text) {
                console.log(item.text);
              }
            });
          } else {
            console.log('No content found in response');
            console.log('Raw response:', JSON.stringify(response.result, null, 2));
          }
          
          console.log('\n✅ Test complete! The [object Object] issue should be fixed.');
          server.kill();
          process.exit(0);
        }
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  });
});

// Auto-exit after 15 seconds
setTimeout(() => {
  console.log('\n⏰ Timeout - exiting');
  server.kill();
  process.exit(1);
}, 15000);