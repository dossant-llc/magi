#!/usr/bin/env node

/**
 * Test script to send "magi ask @alice about her shrinking expertise" 
 * command to the running brainbridge MCP server
 */

const readline = require('readline');

// Create interface to communicate with stdio MCP server
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// MCP JSON-RPC message to call brainxchange_command tool
const testMessage = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "brainxchange_command",
    arguments: {
      command: "magi ask @alice about her shrinking expertise"
    }
  }
};

console.log('🧪 Testing @alice user discovery...');
console.log('📤 Sending command to brainbridge MCP server:');
console.log(JSON.stringify(testMessage, null, 2));
console.log('');

// Send message to MCP server
process.stdout.write(JSON.stringify(testMessage) + '\n');

// Wait for response
let responseReceived = false;

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    if (response.id === 1) {
      responseReceived = true;
      console.log('📥 Response from brainbridge:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.result && response.result.content) {
        console.log('\n📋 Formatted response:');
        response.result.content.forEach(content => {
          console.log(content.text);
        });
      }
      
      console.log('\n✅ Test completed!');
      process.exit(0);
    }
  } catch (error) {
    // Ignore non-JSON lines (like logs)
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  if (!responseReceived) {
    console.log('\n⏱️ Test timeout - no response received');
    process.exit(1);
  }
}, 10000);