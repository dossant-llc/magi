#!/usr/bin/env node

// Simple test to verify OpenAI-powered memory search works
const { spawn } = require('child_process');
const { getProjectRoot } = require('../../src/utils/magi-paths.js');
const path = require('path');

console.log('🧪 Testing OpenAI-powered memory search...\n');

// Create MCP request for color search
const mcpRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "search_memories",
    arguments: {
      query: "favorite color",
      max_privacy: "personal",
      limit: 5
    }
  }
};

// Start the MCP server with environment variables
const projectRoot = getProjectRoot();
const env = {
  ...process.env,
  AI_PROVIDER: 'openai',
  MAGI_ROOT: projectRoot
};

const serverProcess = spawn('npm', ['run', 'bb:stdio'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: env,
  cwd: projectRoot
});

let responseData = '';

// Send the request after a short delay
setTimeout(() => {
  console.log('📤 Sending search request...');
  serverProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
}, 2000);

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  responseData += output;
  
  // Look for JSON responses
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{') && line.includes('"result"')) {
      try {
        const response = JSON.parse(line.trim());
        if (response.result && response.result.content) {
          console.log('✅ Search Response Received:');
          console.log(response.result.content[0].text);
          serverProcess.kill();
          return;
        }
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
});

serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  if (output.includes('BrainBridge MCP Server running')) {
    console.log('🚀 Server started successfully');
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - killing server');
  serverProcess.kill();
}, 30000);