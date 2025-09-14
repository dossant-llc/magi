#!/usr/bin/env node
/**
 * MCP Tools Communication Test - Comprehensive Interface Validation
 * Tests the communication plumbing for all available MCP tools
 * Focus: Does each tool respond without communication errors (not full functionality)
 */

const { spawn } = require('child_process');
const { getProjectRoot } = require('./path-utils');

console.log('🔧 MCP Tools Communication Test - Interface Validation');
console.log('====================================================\n');

// Define all available MCP tools with minimal test parameters
const MCP_TOOLS = [
  {
    name: 'search_memories',
    description: 'Search through personal memories',
    testArgs: { query: 'test', category: 'personal' },
    expectError: false
  },
  {
    name: 'add_memory',
    description: 'Add new knowledge to personal memories',
    testArgs: { title: 'Test Communication', content: 'Test content for communication validation', category: 'personal' },
    expectError: false,
    cleanup: true // This will create a file, mark for cleanup
  },
  {
    name: 'get_organization_patterns',
    description: 'Get organizational patterns from existing memories',
    testArgs: { content_preview: 'test content' },
    expectError: false
  },
  {
    name: 'ai_save_memory',
    description: 'AI-powered save with categorization (ChatGPT-style)',
    testArgs: { content: 'Test AI save communication check', privacy_level: 'personal' },
    expectError: false,
    cleanup: true
  },
  {
    name: 'ai_query_memories',
    description: 'AI-powered query with synthesis (ChatGPT-style)',
    testArgs: { question: 'communication test query', synthesis_mode: 'raw', max_privacy: 'personal', limit: 1 },
    expectError: false
  },
  {
    name: 'ai_status',
    description: 'Get AI system and knowledge base status',
    testArgs: {},
    expectError: false
  },
  {
    name: 'toggle_trace_mode',
    description: 'Toggle trace mode for detailed logging',
    testArgs: { enabled: false }, // Safe to disable
    expectError: false
  },
  {
    name: 'brainxchange_command',
    description: 'Handle BrainXchange P2P communication',
    testArgs: { command: 'status' }, // Safe status command
    expectError: true // May not be configured, that's OK
  },
  {
    name: 'brain_proxy_command',
    description: 'Handle Brain Proxy connection commands',
    testArgs: { command: 'status' }, // Safe status command
    expectError: false
  }
];

async function runToolsTest() {
  const results = {
    serverStartup: { passed: false, details: null },
    tools: {},
    communicationHealth: { passed: false, details: null }
  };

  let server = null;
  let serverStarted = false;

  console.log('⏱️  Phase 1: Server Startup...');
  try {
    server = await startServerForTesting();
    serverStarted = true;
    console.log('✅ Phase 1 PASSED: Server started successfully');
    results.serverStartup.passed = true;
  } catch (error) {
    console.log(`❌ Phase 1 FAILED: ${error.message}`);
    results.serverStartup.details = error.message;
    return await generateReport(results);
  }

  if (serverStarted && server) {
    console.log('\n⏱️  Phase 2: MCP Tools Communication Test...');

    let totalTools = 0;
    let passedTools = 0;
    let criticalFailures = 0;

    for (const tool of MCP_TOOLS) {
      totalTools++;
      console.log(`\n🔧 Testing: ${tool.name}`);
      console.log(`   ${tool.description}`);

      try {
        const result = await sendMCPRequest(server, {
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: tool.name,
            arguments: tool.testArgs
          }
        }, 10000); // 10 second timeout per tool

        if (result.error) {
          if (tool.expectError) {
            console.log(`✅ ${tool.name}: Expected error received - ${result.error.message || result.error}`);
            results.tools[tool.name] = { passed: true, details: `Expected error: ${result.error.message || result.error}` };
            passedTools++;
          } else {
            console.log(`❌ ${tool.name}: Unexpected error - ${result.error.message || result.error}`);
            results.tools[tool.name] = { passed: false, details: `Error: ${result.error.message || result.error}` };

            // Mark critical tools
            if (['ai_status', 'ai_query_memories', 'search_memories'].includes(tool.name)) {
              criticalFailures++;
            }
          }
        } else {
          // Success - tool responded without error
          const responseLength = JSON.stringify(result.result).length;
          console.log(`✅ ${tool.name}: Communication successful (${responseLength} chars response)`);
          results.tools[tool.name] = { passed: true, details: `Success: ${responseLength} chars response` };
          passedTools++;

          // Show brief preview for important tools
          if (['ai_status'].includes(tool.name) && result.result.content) {
            const preview = result.result.content[0].text.substring(0, 100);
            console.log(`   Preview: ${preview}...`);
          }
        }

      } catch (error) {
        if (tool.expectError) {
          console.log(`✅ ${tool.name}: Expected failure - ${error.message}`);
          results.tools[tool.name] = { passed: true, details: `Expected failure: ${error.message}` };
          passedTools++;
        } else {
          console.log(`❌ ${tool.name}: Communication failed - ${error.message}`);
          results.tools[tool.name] = { passed: false, details: `Communication failed: ${error.message}` };

          // Mark critical tools
          if (['ai_status', 'ai_query_memories', 'search_memories'].includes(tool.name)) {
            criticalFailures++;
          }
        }
      }
    }

    // Phase 3: Overall Communication Health Assessment
    console.log('\n⏱️  Phase 3: Communication Health Assessment...');

    const healthPercentage = Math.round((passedTools / totalTools) * 100);
    const isCommunicationHealthy = healthPercentage >= 80 && criticalFailures === 0;

    if (isCommunicationHealthy) {
      console.log(`✅ Phase 3 PASSED: Communication health is excellent (${healthPercentage}%)`);
      results.communicationHealth.passed = true;
      results.communicationHealth.details = `${passedTools}/${totalTools} tools (${healthPercentage}%) - No critical failures`;
    } else {
      console.log(`❌ Phase 3 FAILED: Communication health issues detected (${healthPercentage}%)`);
      results.communicationHealth.details = `${passedTools}/${totalTools} tools (${healthPercentage}%) - ${criticalFailures} critical failures`;

      if (criticalFailures > 0) {
        console.log(`🚨 CRITICAL: ${criticalFailures} critical tools failed`);
      }
    }

    // Cleanup server
    if (server) {
      server.kill();
    }
  }

  return await generateReport(results);
}

async function generateReport(results) {
  console.log('\n🔧 MCP TOOLS COMMUNICATION TEST RESULTS');
  console.log('========================================');

  console.log(`Server Startup: ${results.serverStartup.passed ? '✅ PASS' : '❌ FAIL'} - ${results.serverStartup.details || 'No details'}`);

  if (Object.keys(results.tools).length > 0) {
    console.log('\n📡 Individual Tool Results:');
    for (const [toolName, result] of Object.entries(results.tools)) {
      console.log(`  ${toolName}: ${result.passed ? '✅ PASS' : '❌ FAIL'} - ${result.details}`);
    }
  }

  console.log(`\nCommunication Health: ${results.communicationHealth.passed ? '✅ PASS' : '❌ FAIL'} - ${results.communicationHealth.details || 'No details'}`);

  // Decision logic
  const totalPassed = Object.values(results.tools).filter(r => r.passed).length;
  const totalTools = Object.keys(results.tools).length;
  const serverOK = results.serverStartup.passed;
  const communicationOK = results.communicationHealth.passed;

  console.log(`\n📊 Summary: Server: ${serverOK ? 'OK' : 'FAIL'}, Tools: ${totalPassed}/${totalTools}, Health: ${communicationOK ? 'OK' : 'FAIL'}`);

  if (serverOK && communicationOK) {
    console.log('\n🚀 DECISION: MCP INTERFACE GO');
    console.log('✅ All critical MCP tools responding');
    console.log('✅ Communication plumbing is healthy');
    console.log('✅ Ready for production MCP usage');

    // Special callout for ai_status fix
    if (results.tools.ai_status && results.tools.ai_status.passed) {
      console.log('✅ ai_status fix confirmed working!');
    }

    process.exit(0);
  } else {
    console.log('\n🛑 DECISION: MCP INTERFACE NO-GO');

    if (!serverOK) {
      console.log('❌ Server startup failed');
    }
    if (!communicationOK) {
      console.log('❌ Communication health issues detected');
    }

    console.log('\n📋 Next steps:');
    if (!serverOK) {
      console.log('- Fix server startup issues');
    }

    // Show failed tools
    const failedTools = Object.entries(results.tools).filter(([name, result]) => !result.passed);
    if (failedTools.length > 0) {
      console.log('- Fix communication issues in:');
      failedTools.forEach(([name, result]) => {
        console.log(`  - ${name}: ${result.details}`);
      });
    }

    console.log(`\n🔧 Test again after fixes with: node ${__filename.split('/').pop()}`);
    process.exit(1);
  }
}

async function checkExistingServer() {
  try {
    const response = await fetch('http://localhost:8147/health');
    if (response.ok) {
      console.log('✅ Found existing server running on port 8147');
      return 'existing';
    }
  } catch (e) {
    // Server not running on HTTP, continue to stdio check
  }
  return null;
}

async function startServerForTesting() {
  // First check if server is already running
  const existingServer = await checkExistingServer();
  if (existingServer === 'existing') {
    // Use existing server - simulate the stdio connection for compatibility
    return {
      stdin: { writable: true, write: () => {} }, // Mock stdin
      messageId: 1,
      kill: () => {}, // Mock kill function
      isExistingServer: true // Flag to identify this as using existing server
    };
  }

  return new Promise((resolve, reject) => {
    const server = spawn('npm', ['run', 'dev:stdio', '--workspace=services/brainbridge'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: getProjectRoot(),
      env: {
        ...process.env,
        AI_PROVIDER: 'openai', // Ensure OpenAI is used for consistency
      }
    });

    let connected = false;
    let messageId = 1;

    server.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('{') && !connected) {
          try {
            const response = JSON.parse(line);
            if (response.result && response.result.protocolVersion) {
              connected = true;
              server.messageId = messageId;
              resolve(server);
              return;
            }
          } catch (e) {}
        }
      }
    });

    server.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('MCP stdio connection established') || output.includes('BrainBridge MCP Server running on stdio')) {
        setTimeout(() => {
          if (server.stdin.writable) {
            server.stdin.write(JSON.stringify({
              jsonrpc: "2.0",
              id: messageId++,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "mcp-tools-test", version: "1.0.0" }
              }
            }) + '\n');
          }
        }, 2000); // Give it more time to initialize
      }
    });

    setTimeout(() => {
      if (!connected) {
        server.kill();
        reject(new Error('Server startup timeout after 15 seconds'));
      }
    }, 15000);
  });
}

async function sendMCPRequest(server, message, timeout = 10000) {
  // If using existing server, make HTTP request instead of stdio
  if (server.isExistingServer) {
    try {
      const response = await fetch('http://localhost:8147/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      // Convert HTTP format to MCP format for compatibility
      return {
        result: result,
        jsonrpc: "2.0",
        id: message.id || 1
      };
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  // Original stdio logic
  return new Promise((resolve, reject) => {
    const requestId = server.messageId++;
    message.id = requestId;

    const responseHandler = (data) => {
      const lines = data.toString().split('\n');

      for (const line of lines) {
        if (line.startsWith('{')) {
          try {
            const response = JSON.parse(line);
            if (response.id === requestId) {
              server.stdout.removeListener('data', responseHandler);
              resolve(response);
              return;
            }
          } catch (e) {}
        }
      }
    };

    server.stdout.on('data', responseHandler);

    if (server.stdin.writable) {
      server.stdin.write(JSON.stringify(message) + '\n');
    } else {
      reject(new Error('Server stdin not writable'));
      return;
    }

    setTimeout(() => {
      server.stdout.removeListener('data', responseHandler);
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);
  });
}

// Run the MCP Tools Communication Test
console.log(`🎯 Testing ${MCP_TOOLS.length} MCP tools for communication health`);
console.log(`🔍 Focus: Interface validation, not full functionality`);
console.log(`📋 Goal: Verify all tools respond without communication errors\n`);

runToolsTest().catch(error => {
  console.error('\n💥 MCP Tools test runner crashed:', error);
  console.log('\n🛑 DECISION: MCP INTERFACE NO-GO - Test runner failure');
  process.exit(1);
});