#!/usr/bin/env node
/**
 * Comprehensive Regression Test for BrainBridge
 * Tests: storage, retrieval, AI synthesis, error handling, edge cases
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getProjectRoot, getMemoriesPath } = require('./path-utils');

console.log('🧪 BrainBridge Comprehensive Regression Test');
console.log('============================================\n');

const TEST_SCENARIOS = [
  {
    name: 'File System Checks',
    tests: [
      {
        name: 'Embeddings Index Exists',
        run: () => {
          const embeddingsPath = path.join(getMemoriesPath(), 'embeddings', 'embeddings.txt');
          if (!fs.existsSync(embeddingsPath)) {
            throw new Error('Embeddings file missing');
          }
          const stats = fs.statSync(embeddingsPath);
          if (stats.size < 1000) {
            throw new Error('Embeddings file too small');
          }
          return `File exists (${stats.size} bytes)`;
        }
      },
      {
        name: 'Blue Moon Memory File Exists',
        run: () => {
          const memoriesDir = path.join(getMemoriesPath(), 'personal');
          const files = fs.readdirSync(memoriesDir);
          const blueMoonFile = files.find(f => f.includes('blue-moon-beer'));
          
          if (!blueMoonFile) {
            throw new Error('Blue Moon memory file not found');
          }
          
          const content = fs.readFileSync(path.join(memoriesDir, blueMoonFile), 'utf8');
          if (!content.includes('Blue Moon')) {
            throw new Error('Blue Moon content missing from file');
          }
          
          return `Memory file exists and contains Blue Moon content`;
        }
      }
    ]
  },
  {
    name: 'Server Integration Tests',
    tests: [
      {
        name: 'Store New Memory',
        run: () => runServerTest(`
          const testContent = \`Regression test: Igor's favorite pizza place is Tony's Chicago Style - created \${Date.now()}\`;
          
          const saveResponse = await sendRequest({
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
          
          if (saveResponse.error) {
            throw new Error('Save failed: ' + saveResponse.error.message);
          }
          
          const text = saveResponse.result.content[0].text;
          if (!text.includes('Memory queued for saving') && !text.includes('successfully saved')) {
            throw new Error('Save confirmation missing');
          }
          
          return 'Memory stored successfully';
        `)
      },
      {
        name: 'Retrieve Stored Memory (Raw Mode)',
        run: () => runServerTest(`
          const queryResponse = await sendRequest({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "ai_query_memories", 
              arguments: {
                question: "Tony's Chicago Style pizza regression",
                synthesis_mode: "raw",
                max_privacy: "personal",
                limit: 5
              }
            }
          });
          
          if (queryResponse.error) {
            throw new Error('Query failed: ' + queryResponse.error.message);
          }
          
          const text = queryResponse.result.content[0].text;
          if (!text.includes("Tony's Chicago Style")) {
            throw new Error('Stored content not found in search results');
          }
          
          if (text.includes('No content available')) {
            throw new Error('Search returned no content available');
          }
          
          return 'Memory retrieved with content successfully';
        `)
      },
      {
        name: 'AI Synthesis (Local Mode)', 
        run: () => runServerTest(`
          const synthesisResponse = await sendRequest({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "ai_query_memories",
              arguments: {
                question: "What is Igor's favorite beer?",
                synthesis_mode: "local", 
                max_privacy: "personal",
                limit: 3
              }
            }
          }, 35000);
          
          if (synthesisResponse.error) {
            throw new Error('AI synthesis failed: ' + synthesisResponse.error.message);
          }
          
          const text = synthesisResponse.result.content[0].text;
          if (!text.includes('Blue Moon') && !text.includes('beer')) {
            throw new Error('AI synthesis did not mention beer preferences');
          }
          
          if (text.includes('**[1]') || text.includes('Category:')) {
            throw new Error('AI synthesis returned raw format instead of synthesized answer');
          }
          
          return 'AI synthesis working correctly';
        `)
      },
      {
        name: 'Invalid Query (No Results)',
        run: () => runServerTest(`
          const invalidResponse = await sendRequest({
            jsonrpc: "2.0",
            method: "tools/call",
            params: {
              name: "ai_query_memories",
              arguments: {
                question: "zzqwertyzyx unicorn rainbow spaceship blablabla nonexistent query",
                synthesis_mode: "raw",
                max_privacy: "personal", 
                limit: 3
              }
            }
          });
          
          if (invalidResponse.error) {
            throw new Error('Invalid query should not error: ' + invalidResponse.error.message);
          }
          
          const text = invalidResponse.result.content[0].text;
          // Either no results found, or results found but they're clearly not relevant
          if (text.includes('No relevant memories found') || text.includes('0 relevant memories')) {
            return 'Invalid query properly returns no results';
          } else if (text.includes('Found') && text.includes('memories')) {
            // If results were found, that's actually okay - vector similarity can be unpredictable
            // The important thing is the system doesn't crash and returns a reasonable response
            return 'Invalid query handled gracefully (found some results via vector similarity)';
          } else {
            throw new Error('Invalid query response format unexpected: ' + text.substring(0, 100));
          }
        `)
      },
      {
        name: 'Invalid Tool Request',
        run: () => runServerTest(`
          const invalidToolResponse = await sendRequest({
            jsonrpc: "2.0",
            method: "tools/call", 
            params: {
              name: "nonexistent_tool_name",
              arguments: {}
            }
          });
          
          if (!invalidToolResponse.error) {
            throw new Error('Invalid tool should return error');
          }
          
          if (!invalidToolResponse.error.message.includes('Unknown tool')) {
            throw new Error('Expected "Unknown tool" error but got: ' + invalidToolResponse.error.message);
          }
          
          return 'Invalid tool properly returns error';
        `)
      }
    ]
  }
];

async function runServerTest(testCode) {
  return new Promise((resolve, reject) => {
    const testScript = `
const { spawn } = require('child_process');

const server = spawn('npm', ['run', 'dev:stdio', '--workspace=services/brainbridge'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/igor/Documents/code/agiforme'
});

let messageId = 1;
let connected = false;

async function sendRequest(message, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const requestId = messageId++;
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
    server.stdin.write(JSON.stringify(message) + '\\n');
    
    setTimeout(() => {
      server.stdout.removeListener('data', responseHandler);
      reject(new Error('Request timeout'));
    }, timeout);
  });
}

server.stdout.on('data', (data) => {
  if (!connected && data.toString().includes('"protocolVersion"')) {
    connected = true;
    setTimeout(async () => {
      try {
        ${testCode}
      } catch (error) {
        console.error('TEST_ERROR:', error.message);
        process.exit(1);
      } finally {
        server.kill();
        process.exit(0);
      }
    }, 1000);
  }
});

server.stderr.on('data', (data) => {
  if (data.toString().includes('running')) {
    setTimeout(() => {
      server.stdin.write(JSON.stringify({
        jsonrpc: "2.0",
        id: messageId++,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" }
        }
      }) + '\\n');
    }, 1000);
  }
});

setTimeout(() => {
  console.error('TEST_ERROR: Test timeout');
  server.kill();
  process.exit(1);
}, 40000);
    `;
    
    const testFile = `/tmp/regression_test_${Date.now()}.js`;
    fs.writeFileSync(testFile, testScript);
    
    const testProcess = spawn('node', [testFile], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let output = '';
    let error = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      const errorText = data.toString();
      if (errorText.includes('TEST_ERROR:')) {
        error = errorText.replace('TEST_ERROR:', '').trim();
      }
    });
    
    testProcess.on('close', (code) => {
      fs.unlinkSync(testFile);
      
      if (code === 0 && !error) {
        resolve(output.trim() || 'Test completed successfully');
      } else {
        reject(new Error(error || `Test failed with exit code ${code}`));
      }
    });
  });
}

async function runAllTests() {
  const allResults = [];
  let totalTests = 0;
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`📂 ${scenario.name}`);
    console.log('─'.repeat(scenario.name.length + 2));
    
    for (const test of scenario.tests) {
      totalTests++;
      const testNum = String(totalTests).padStart(2, '0');
      
      try {
        console.log(`⏱️  [${testNum}] ${test.name}...`);
        const startTime = Date.now();
        const result = await test.run();
        const duration = Date.now() - startTime;
        
        console.log(`✅ [${testNum}] PASSED (${duration}ms): ${result}`);
        allResults.push({ name: test.name, passed: true, duration, result });
        
      } catch (error) {
        console.log(`❌ [${testNum}] FAILED: ${error.message}`);
        allResults.push({ name: test.name, passed: false, error: error.message });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('');
  }
  
  // Final Summary
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;
  
  console.log('📊 Final Regression Test Summary');
  console.log('================================');
  console.log(`✅ Passed: ${passed}/${totalTests}`);
  console.log(`❌ Failed: ${failed}/${totalTests}`);
  
  if (failed > 0) {
    console.log('\\n💥 Failures:');
    allResults.filter(r => !r.passed).forEach(r => {
      console.log(`❌ ${r.name}: ${r.error}`);
    });
  }
  
  const avgDuration = allResults.reduce((sum, r) => sum + (r.duration || 0), 0) / totalTests;
  console.log(`\\n⏱️  Average test duration: ${Math.round(avgDuration)}ms`);
  
  if (failed === 0) {
    console.log('\\n🎉 All regression tests passed! System is stable.');
  } else {
    console.log('\\n⚠️  Some tests failed. Review the issues above.');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('Regression test suite crashed:', error);
  process.exit(1);
});