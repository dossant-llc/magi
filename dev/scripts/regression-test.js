#!/usr/bin/env node
/**
 * Simplified Regression Test for BrainBridge
 * Tests essential functionality to prevent regressions
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getProjectRoot, getMemoriesPath } = require('./path-utils');

console.log('🧪 BrainBridge Regression Test');
console.log('==============================\n');

async function runTest() {
  const results = [];
  let server = null;
  let serverStarted = false;
  
  // Test 1: Check embeddings file exists and has content
  console.log('⏱️  Test 1: Embeddings Index Exists...');
  try {
    const embeddingsPath = path.join(getMemoriesPath(), 'embeddings', 'embeddings.txt');
    if (!fs.existsSync(embeddingsPath)) {
      throw new Error('Embeddings file missing');
    }
    const stats = fs.statSync(embeddingsPath);
    if (stats.size < 1000) {
      throw new Error('Embeddings file too small');
    }
    console.log(`✅ Test 1 PASSED: Embeddings file exists (${stats.size} bytes)`);
    results.push({ name: 'Embeddings Index', passed: true });
  } catch (error) {
    console.log(`❌ Test 1 FAILED: ${error.message}`);
    results.push({ name: 'Embeddings Index', passed: false, error: error.message });
  }
  
  // Test 2: Check Blue Moon memory file exists
  console.log('⏱️  Test 2: Blue Moon Memory File Exists...');
  try {
    const memoriesDir = path.join(getMemoriesPath(), 'personal');
    const files = fs.readdirSync(memoriesDir);
    const blueMoonFile = files.find(f => f.includes('blue-moon-beer') || f.includes('Blue Moon'));
    
    if (!blueMoonFile) {
      throw new Error('Blue Moon memory file not found');
    }
    
    const filePath = path.join(memoriesDir, blueMoonFile);
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('Blue Moon')) {
      throw new Error('Blue Moon content not found in memory file');
    }
    
    console.log(`✅ Test 2 PASSED: Blue Moon memory exists (${blueMoonFile})`);
    results.push({ name: 'Blue Moon Memory', passed: true });
  } catch (error) {
    console.log(`❌ Test 2 FAILED: ${error.message}`);
    results.push({ name: 'Blue Moon Memory', passed: false, error: error.message });
  }
  
  // Test 3: Server startup and connection
  console.log('⏱️  Test 3: Server Startup and Connection...');
  try {
    server = await startServerForTesting();
    serverStarted = true;
    console.log(`✅ Test 3 PASSED: Server starts and responds`);
    results.push({ name: 'Server Startup', passed: true });
  } catch (error) {
    console.log(`❌ Test 3 FAILED: ${error.message}`);
    results.push({ name: 'Server Startup', passed: false, error: error.message });
  }
  
  if (serverStarted && server) {
    // Test 4: Store new memory
    console.log('⏱️  Test 4: Store New Memory...');
    try {
      const testContent = `Regression test memory about favorite pizza - created at ${new Date().toISOString()}. Igor loves pepperoni pizza from Tony's.`;
      const saveResult = await sendMCPRequest(server, {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "ai_save_memory",
          arguments: {
            content: testContent,
            privacy_level: "personal"
          }
        }
      });
      
      if (saveResult.error) {
        throw new Error(`Save failed: ${saveResult.error.message}`);
      }
      
      const responseText = saveResult.result.content[0].text;
      if (!responseText.includes('successfully saved')) {
        throw new Error('Save confirmation not found in response');
      }
      
      console.log(`✅ Test 4 PASSED: Memory saved successfully`);
      results.push({ name: 'Store Memory', passed: true, data: { content: testContent } });
      
    } catch (error) {
      console.log(`❌ Test 4 FAILED: ${error.message}`);
      results.push({ name: 'Store Memory', passed: false, error: error.message });
    }
    
    // Test 5: Retrieve stored memory (raw mode)
    console.log('⏱️  Test 5: Retrieve Stored Memory (Raw)...');
    try {
      const queryResult = await sendMCPRequest(server, {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "ai_query_memories",
          arguments: {
            question: "pizza regression test",
            synthesis_mode: "raw",
            max_privacy: "personal",
            limit: 5
          }
        }
      });
      
      if (queryResult.error) {
        throw new Error(`Query failed: ${queryResult.error.message}`);
      }
      
      const responseText = queryResult.result.content[0].text;
      if (!responseText.includes('pepperoni pizza') || !responseText.includes("Tony's")) {
        throw new Error('Stored memory content not found in search results');
      }
      
      if (responseText.includes('No content available')) {
        throw new Error('Search returned "No content available"');
      }
      
      console.log(`✅ Test 5 PASSED: Stored memory retrieved with content`);
      results.push({ name: 'Retrieve Memory (Raw)', passed: true });
      
    } catch (error) {
      console.log(`❌ Test 5 FAILED: ${error.message}`);
      results.push({ name: 'Retrieve Memory (Raw)', passed: false, error: error.message });
    }
    
    // Test 6: AI synthesis works
    console.log('⏱️  Test 6: AI Synthesis (Local)...');
    try {
      const synthesisResult = await sendMCPRequest(server, {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "ai_query_memories",
          arguments: {
            question: "What kind of pizza does Igor like?",
            synthesis_mode: "local",
            max_privacy: "personal",
            limit: 3
          }
        }
      }, 35000); // Longer timeout for AI synthesis
      
      if (synthesisResult.error) {
        throw new Error(`AI Synthesis failed: ${synthesisResult.error.message}`);
      }
      
      const responseText = synthesisResult.result.content[0].text;
      if (!responseText.includes('pepperoni') && !responseText.includes('pizza')) {
        throw new Error('AI synthesis did not mention pizza preferences');
      }
      
      // Should not contain raw format markers
      if (responseText.includes('**[1]') || responseText.includes('Category:')) {
        throw new Error('AI synthesis returned raw format instead of synthesized answer');
      }
      
      console.log(`✅ Test 6 PASSED: AI synthesis working`);
      results.push({ name: 'AI Synthesis', passed: true });
      
    } catch (error) {
      console.log(`❌ Test 6 FAILED: ${error.message}`);
      results.push({ name: 'AI Synthesis', passed: false, error: error.message });
    }
    
    // Test 7: Invalid/nonexistent query
    console.log('⏱️  Test 7: Invalid Query Handling...');
    try {
      const invalidResult = await sendMCPRequest(server, {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "ai_query_memories",
          arguments: {
            question: "xyzzy quantum flibbertigibbet spaceship galactic emperor zorblatt",
            synthesis_mode: "raw",
            max_privacy: "personal",
            limit: 3
          }
        }
      });
      
      if (invalidResult.error) {
        throw new Error(`Invalid query failed unexpectedly: ${invalidResult.error.message}`);
      }
      
      const responseText = invalidResult.result.content[0].text;
      if (responseText.includes('No relevant memories found') || responseText.includes('0 relevant memories')) {
        console.log(`✅ Test 7 PASSED: Invalid query properly returns no results`);
        results.push({ name: 'Invalid Query Handling', passed: true });
      } else {
        throw new Error('Invalid query should return no results but found something');
      }
      
    } catch (error) {
      console.log(`❌ Test 7 FAILED: ${error.message}`);
      results.push({ name: 'Invalid Query Handling', passed: false, error: error.message });
    }
    
    // Test 8: Invalid tool request
    console.log('⏱️  Test 8: Invalid Tool Request...');
    try {
      const invalidToolResult = await sendMCPRequest(server, {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "nonexistent_tool_name",
          arguments: {}
        }
      });
      
      if (!invalidToolResult.error) {
        throw new Error('Invalid tool request should return error but succeeded');
      }
      
      if (invalidToolResult.error.message.includes('Unknown tool') || invalidToolResult.error.message.includes('nonexistent_tool_name')) {
        console.log(`✅ Test 8 PASSED: Invalid tool properly returns error`);
        results.push({ name: 'Invalid Tool Handling', passed: true });
      } else {
        throw new Error(`Unexpected error message: ${invalidToolResult.error.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Test 8 FAILED: ${error.message}`);
      results.push({ name: 'Invalid Tool Handling', passed: false, error: error.message });
    }
    
    // Cleanup: Kill server
    if (server) {
      server.kill();
    }
  } else {
    // Skip server-dependent tests
    results.push({ name: 'Store Memory', passed: false, error: 'Server not available' });
    results.push({ name: 'Retrieve Memory (Raw)', passed: false, error: 'Server not available' });
    results.push({ name: 'AI Synthesis', passed: false, error: 'Server not available' });
    results.push({ name: 'Invalid Query Handling', passed: false, error: 'Server not available' });
    results.push({ name: 'Invalid Tool Handling', passed: false, error: 'Server not available' });
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\n📊 Regression Test Summary`);
  console.log(`==========================`);
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log(`\n💥 Failures:`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`❌ ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log(`\n🎉 All regression tests passed!`);
    process.exit(0);
  }
}

async function startServerForTesting() {
  return new Promise((resolve, reject) => {
    const server = spawn('npm', ['run', 'dev:stdio', '--workspace=services/brainbridge'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: getProjectRoot()
    });
    
    let connected = false;
    let messageId = 1;
    
    server.stdout.on('data', (data) => {
      const lines = data.toString().split('\\n');
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
      if (data.toString().includes('running')) {
        setTimeout(() => {
          if (server.stdin.writable) {
            server.stdin.write(JSON.stringify({
              jsonrpc: "2.0",
              id: messageId++,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05", 
                capabilities: {},
                clientInfo: { name: "regression-test", version: "1.0.0" }
              }
            }) + '\\n');
          }
        }, 1000);
      }
    });
    
    setTimeout(() => {
      if (!connected) {
        server.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 10000);
  });
}

async function sendMCPRequest(server, message, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const requestId = server.messageId++;
    message.id = requestId;
    
    const responseHandler = (data) => {
      const lines = data.toString().split('\\n');
      
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
      server.stdin.write(JSON.stringify(message) + '\\n');
    } else {
      reject(new Error('Server stdin not writable'));
      return;
    }
    
    setTimeout(() => {
      server.stdout.removeListener('data', responseHandler);
      reject(new Error('MCP request timeout'));
    }, timeout);
  });
}

// Run the test
runTest().catch(error => {
  console.error('Regression test suite failed:', error);
  process.exit(1);
});