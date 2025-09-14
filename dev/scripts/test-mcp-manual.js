#!/usr/bin/env node

const { spawn } = require('child_process');
const { getProjectRoot } = require('./path-utils');

async function testMCPConnection() {
  console.log('🧪 Testing MCP connection manually...');

  const server = spawn('npm', ['run', 'dev:stdio', '--workspace=services/brainbridge'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: getProjectRoot(),
    env: {
      ...process.env,
      AI_PROVIDER: 'openai',
    }
  });

  let messageId = 1;
  let serverReady = false;

  // Monitor stdout
  server.stdout.on('data', (data) => {
    console.log('📤 STDOUT:', data.toString());
  });

  // Monitor stderr
  server.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('📥 STDERR:', output);

    if ((output.includes('MCP stdio connection established') || output.includes('BrainBridge MCP Server running on stdio')) && !serverReady) {
      serverReady = true;
      console.log('✅ Server ready detected, sending initialize...');

      setTimeout(() => {
        const initMessage = JSON.stringify({
          jsonrpc: "2.0",
          id: messageId++,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "mcp-test", version: "1.0.0" }
          }
        }) + '\n';

        console.log('📨 Sending initialize:', initMessage.trim());
        server.stdin.write(initMessage);
      }, 2000);
    }
  });

  setTimeout(() => {
    console.log('⏰ Test timeout, killing server');
    server.kill();
  }, 15000);
}

testMCPConnection().catch(console.error);