#!/usr/bin/env node
/**
 * Enhanced Regression Test for BrainBridge
 * Tests storage, retrieval, error handling, and edge cases
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getProjectRoot, getMemoriesPath } = require('./path-utils');

console.log('🧪 BrainBridge Enhanced Regression Test');
console.log('=======================================\n');

const tests = [
  {
    name: 'Embeddings Index Exists',
    test: async () => {
      const embeddingsPath = path.join(getMemoriesPath(), 'embeddings', 'embeddings.txt');
      if (!fs.existsSync(embeddingsPath)) {
        throw new Error('Embeddings file missing');
      }
      const stats = fs.statSync(embeddingsPath);
      if (stats.size < 1000) {
        throw new Error('Embeddings file too small');
      }
      return `Embeddings file exists (${stats.size} bytes)`;
    }
  },
  {
    name: 'Blue Moon Memory Exists',
    test: async () => {
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
      
      return `Blue Moon memory exists (${blueMoonFile})`;
    }
  },
  {
    name: 'Store & Retrieve Memory Test',
    test: async () => {
      const testContent = `Regression test - Igor loves Chicago deep dish pizza from Lou Malnati's - ${Date.now()}`;
      const result = await runMCPTest('store_and_retrieve', testContent);
      return result;
    }
  },
  {
    name: 'AI Synthesis Test',
    test: async () => {
      const result = await runMCPTest('ai_synthesis', 'What is Igor\'s favorite beer?');
      return result;
    }
  },
  {
    name: 'Invalid Query Handling',
    test: async () => {
      const result = await runMCPTest('invalid_query', 'xyzzy quantum flibbertigibbet spaceship galactic emperor zorblatt');
      return result;
    }
  },
  {
    name: 'Invalid Tool Error Handling',
    test: async () => {
      const result = await runMCPTest('invalid_tool', null);
      return result;
    }
  }
];

async function runMCPTest(testType, testData) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['/tmp/test_mcp_scenario.js', testType, testData || ''], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: '/Users/igor/Documents/code/agiforme'
    });
    
    let output = '';
    let error = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    server.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(error.trim() || `Test failed with exit code ${code}`));
      }
    });
    
    setTimeout(() => {
      server.kill();
      reject(new Error('Test timeout'));
    }, 30000);
  });
}

// Create the MCP scenario test helper
const mcpTestScript = `#!/usr/bin/env node
const { spawn } = require('child_process');

const testType = process.argv[2];
const testData = process.argv[3];

const server = spawn('npm', ['run', 'dev:stdio', '--workspace=services/brainbridge'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/igor/Documents/code/agiforme'
});

let messageId = 1;
let connected = false;

function sendMessage(message) {
  if (server.stdin.writable) {
    server.stdin.write(JSON.stringify(message) + '\\n');
  }
}

server.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\\n');
  
  for (const line of lines) {
    if (line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        
        if (response.result && response.result.protocolVersion && !connected) {
          connected = true;
          executeTest();
        } else if (response.id && response.id > 1) {
          handleTestResponse(response);
        }
      } catch (e) {}
    }
  }
});

async function executeTest() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  switch(testType) {
    case 'store_and_retrieve':
      testStoreAndRetrieve(testData);
      break;
    case 'ai_synthesis':  
      testAISynthesis(testData);
      break;
    case 'invalid_query':
      testInvalidQuery(testData);
      break;
    case 'invalid_tool':
      testInvalidTool();
      break;
  }
}

function testStoreAndRetrieve(content) {
  sendMessage({
    jsonrpc: "2.0",
    id: messageId++,
    method: "tools/call",
    params: {
      name: "ai_save_memory",
      arguments: {
        content: content,
        privacy_level: "personal"
      }
    }
  });
}

function testAISynthesis(question) {
  sendMessage({
    jsonrpc: "2.0",
    id: messageId++,
    method: "tools/call",
    params: {
      name: "ai_query_memories",
      arguments: {
        question: question,
        synthesis_mode: "local",
        max_privacy: "personal"
      }
    }
  });
}

function testInvalidQuery(question) {
  sendMessage({
    jsonrpc: "2.0",
    id: messageId++,
    method: "tools/call",
    params: {
      name: "ai_query_memories", 
      arguments: {
        question: question,
        synthesis_mode: "raw",
        max_privacy: "personal"
      }
    }
  });
}

function testInvalidTool() {
  sendMessage({
    jsonrpc: "2.0",
    id: messageId++,
    method: "tools/call",
    params: {
      name: "nonexistent_tool_name",
      arguments: {}
    }
  });
}

function handleTestResponse(response) {
  if (response.error) {
    if (testType === 'invalid_tool' && response.error.message.includes('Unknown tool')) {
      console.log('Invalid tool properly returns error');
      process.exit(0);
    } else if (testType !== 'invalid_tool') {
      console.error('Test failed:', response.error.message);
      process.exit(1);
    }
  } else if (response.result) {
    const text = response.result.content[0].text;
    
    switch(testType) {
      case 'store_and_retrieve':
        if (text.includes('successfully saved')) {
          // Now test retrieval
          setTimeout(() => {
            sendMessage({
              jsonrpc: "2.0", 
              id: messageId++,
              method: "tools/call",
              params: {
                name: "ai_query_memories",
                arguments: {
                  question: "Chicago deep dish pizza Lou Malnati",
                  synthesis_mode: "raw",
                  max_privacy: "personal"
                }
              }
            });
          }, 2000);
        } else if (text.includes('Lou Malnati') && text.includes('Chicago deep dish')) {
          console.log('Store and retrieve test passed');
          process.exit(0);
        }
        break;
        
      case 'ai_synthesis':
        if (text.includes('Blue Moon') && !text.includes('**[1]')) {
          console.log('AI synthesis working correctly');
          process.exit(0);
        }
        break;
        
      case 'invalid_query':
        if (text.includes('No relevant memories found') || text.includes('0 relevant memories')) {
          console.log('Invalid query properly returns no results');  
          process.exit(0);
        }
        break;
    }
  }
  
  setTimeout(() => {
    console.error('Test did not complete as expected');
    process.exit(1);
  }, 5000);
}

server.stderr.on('data', (data) => {
  if (data.toString().includes('running')) {
    setTimeout(() => {
      sendMessage({
        jsonrpc: "2.0",
        id: messageId++,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" }
        }
      });
    }, 1000);
  }
});

setTimeout(() => {
  console.error('Test timeout');
  server.kill();
  process.exit(1);
}, 25000);
`;

// Write the helper script
fs.writeFileSync('/tmp/test_mcp_scenario.js', mcpTestScript);
fs.chmodSync('/tmp/test_mcp_scenario.js', 0o755);

async function runAllTests() {
  const results = [];
  
  console.log(`🚀 Running ${tests.length} comprehensive tests...\\n`);
  
  for (const [index, testCase] of tests.entries()) {
    const testNum = index + 1;
    console.log(`⏱️  Test ${testNum}: ${testCase.name}...`);
    
    try {
      const startTime = Date.now();
      const result = await testCase.test();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Test ${testNum} PASSED (${duration}ms): ${result}`);
      results.push({ name: testCase.name, passed: true, duration, result });
      
    } catch (error) {
      console.log(`❌ Test ${testNum} FAILED: ${error.message}`);
      results.push({ name: testCase.name, passed: false, error: error.message });
    }
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\\n📊 Enhanced Regression Test Summary`);
  console.log(`===================================`);
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log(`\\n💥 Failures:`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`❌ ${r.name}: ${r.error}`);
    });
  }
  
  const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
  console.log(`\\n⏱️  Average test duration: ${Math.round(avgDuration)}ms`);
  
  if (failed === 0) {
    console.log(`\\n🎉 All enhanced regression tests passed!`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Enhanced regression test suite failed:', error);
  process.exit(1);
});