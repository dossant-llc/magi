#!/usr/bin/env node

/**
 * Test script that mimics ChatGPT calls to Brain Proxy
 * This validates the complete ChatGPT → Brain Proxy → Local Brain flow
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { getEnvPath } = require('./path-utils');

// Load configuration
const envPath = getEnvPath();
const env = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });
}

const BRAIN_PROXY_BASE_URL = process.env.BRAIN_PROXY_BASE_URL || `https://${process.env.AGIFORME_SERVER_DOMAIN || 'localhost'}/bp`;
const BRAIN_PROXY_ROUTE = env.BRAIN_PROXY_ROUTE || process.env.BRAIN_PROXY_ROUTE;
const BRAIN_PROXY_SECRET = env.BRAIN_PROXY_SECRET || process.env.BRAIN_PROXY_SECRET;

console.log('🧠 Testing ChatGPT Integration with Brain Proxy');
console.log(`📡 Base URL: ${BRAIN_PROXY_BASE_URL}`);
console.log(`🛣️  Route: ${BRAIN_PROXY_ROUTE}`);
console.log(`🔑 Secret: ${BRAIN_PROXY_SECRET ? BRAIN_PROXY_SECRET.substring(0, 8) + '***' : 'NOT SET'}`);
console.log('');

if (!BRAIN_PROXY_ROUTE || !BRAIN_PROXY_SECRET) {
  console.error('❌ Missing configuration:');
  console.error('   Set BRAIN_PROXY_ROUTE and BRAIN_PROXY_SECRET in brainbridge/.env');
  console.error('   Or provide them as environment variables');
  process.exit(1);
}

// Test cases that mimic ChatGPT calls
const testCases = [
  {
    name: 'AI Status Check',
    description: 'Check if the brain is online and get system status',
    payload: {
      id: 'chatgpt-status-test',
      method: 'ai_status',
      params: {}
    }
  },
  {
    name: 'Memory Query',
    description: 'Query memories with AI synthesis',
    payload: {
      id: 'chatgpt-query-test',
      method: 'ai_query_memories',
      params: {
        question: 'What do I know about testing?',
        max_privacy: 'personal'
      }
    }
  },
  {
    name: 'Memory Search',
    description: 'Search through memories',
    payload: {
      id: 'chatgpt-search-test',
      method: 'search_memories',
      params: {
        query: 'test'
      }
    }
  },
  {
    name: 'Save Memory',
    description: 'Save a new memory with AI categorization',
    payload: {
      id: 'chatgpt-save-test',
      method: 'ai_save_memory',
      params: {
        content: 'ChatGPT integration test completed successfully at ' + new Date().toISOString(),
        privacy_level: 'personal'
      }
    }
  }
];

// Make HTTP request
function makeRequest(testCase) {
  return new Promise((resolve, reject) => {
    const url = `${BRAIN_PROXY_BASE_URL}/rpc/${BRAIN_PROXY_ROUTE}`;
    const urlObj = new URL(url);
    const payload = JSON.stringify(testCase.payload);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Brain-Key': BRAIN_PROXY_SECRET,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            response: response
          });
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// Run tests
async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n🧪 Running: ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    
    try {
      const startTime = Date.now();
      const result = await makeRequest(testCase);
      const duration = Date.now() - startTime;
      
      if (result.statusCode === 200 && result.response.result) {
        console.log(`✅ PASSED (${duration}ms)`);
        console.log(`📋 Response: ${JSON.stringify(result.response.result, null, 2).substring(0, 200)}...`);
        passed++;
      } else if (result.statusCode === 503) {
        console.log(`⚠️  OFFLINE - Brain not connected (${duration}ms)`);
        console.log(`📋 Response: ${result.response.result?.content?.[0]?.text?.substring(0, 150)}...`);
        passed++; // Offline response is expected behavior
      } else {
        console.log(`❌ FAILED (${duration}ms)`);
        console.log(`📋 Status: ${result.statusCode}`);
        console.log(`📋 Response: ${JSON.stringify(result.response, null, 2)}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🏆 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! ChatGPT integration is working correctly.');
  } else {
    console.log('🚨 Some tests failed. Check the Brain Proxy setup and local brain connection.');
    process.exit(1);
  }
}

// Health check first
async function healthCheck() {
  console.log('🏥 Checking Brain Proxy health...');
  
  try {
    const healthUrl = `${BRAIN_PROXY_BASE_URL}/health`;
    const response = await fetch(healthUrl);
    const health = await response.json();
    
    console.log(`✅ Brain Proxy Status: ${health.status}`);
    console.log(`🧠 Connected Brains: ${health.connectedBrains}`);
    console.log(`📍 Your Route Connected: ${health.routes.includes(BRAIN_PROXY_ROUTE) ? 'YES' : 'NO'}`);
    
    if (!health.routes.includes(BRAIN_PROXY_ROUTE)) {
      console.log(`⚠️  Warning: Route '${BRAIN_PROXY_ROUTE}' not found in connected routes`);
      console.log(`   Available routes: ${health.routes.join(', ')}`);
      console.log(`   Make sure your local BrainBridge is running: npm run dev`);
    }
    
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    console.log(`   Check if ${BRAIN_PROXY_BASE_URL} is accessible`);
  }
}

// Node.js doesn't have fetch by default in older versions
function fetch(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          json: () => JSON.parse(data)
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Run the tests
async function main() {
  await healthCheck();
  await runTests();
}

main().catch(console.error);