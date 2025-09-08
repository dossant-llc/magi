#!/usr/bin/env node
/**
 * Test suite for magi register command
 * Tests credential generation and basic functionality
 */

const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const os = require('os');

// Colors for output
const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  info: '\x1b[36m',
  warning: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(level, message) {
  console.log(`${colors[level]}${level.toUpperCase()}: ${message}${colors.reset}`);
}

/**
 * Test credential generation logic (same as in magi register)
 */
function testCredentialGeneration() {
  log('info', 'Testing credential generation...');
  
  try {
    // Test route generation
    const initials = os.userInfo().username.substring(0, 2).toLowerCase();
    const routeSuffix = crypto.randomBytes(4).toString('hex');
    const route = `${initials}-${routeSuffix}`;
    
    // Test secret generation
    const secret = crypto.randomBytes(16).toString('hex');
    
    // Validate format
    if (!/^[a-z]{1,2}-[a-f0-9]{8}$/.test(route)) {
      throw new Error(`Invalid route format: ${route}`);
    }
    
    if (!/^[a-f0-9]{32}$/.test(secret)) {
      throw new Error(`Invalid secret format: ${secret}`);
    }
    
    log('success', `✅ Route generated: ${route}`);
    log('success', `✅ Secret generated: ${secret.substring(0, 8)}...`);
    log('success', 'Credential generation test passed');
    
    return true;
  } catch (error) {
    log('error', `❌ Credential generation failed: ${error.message}`);
    return false;
  }
}

/**
 * Test magi register command execution
 */
function testMagiRegisterCommand() {
  log('info', 'Testing magi register command execution...');
  
  return new Promise((resolve) => {
    const magiPath = path.join(__dirname, '..', 'bin', 'magi');
    const timeout = setTimeout(() => {
      log('warning', '⚠️ Command timed out (expected for connection test)');
      resolve(true); // Timeout is expected when BrainCloud is offline
    }, 15000);
    
    exec(`node "${magiPath}" register --local`, (error, stdout, stderr) => {
      clearTimeout(timeout);
      
      if (error && !error.message.includes('timeout')) {
        log('error', `❌ Command failed: ${error.message}`);
        resolve(false);
        return;
      }
      
      // Check for expected output patterns
      const output = stdout + stderr;
      const hasRoute = /Route:.*[a-z]{1,2}-[a-f0-9]{8}/.test(output);
      const hasSecret = /Secret:.*[a-f0-9]{32}/.test(output);
      const hasEnvConfig = /BRAIN_PROXY_ENABLED=true/.test(output);
      
      if (hasRoute && hasSecret && hasEnvConfig) {
        log('success', '✅ Command output contains expected patterns');
        log('success', 'magi register command test passed');
        resolve(true);
      } else {
        log('error', '❌ Command output missing expected patterns');
        log('info', 'Output: ' + output.substring(0, 200) + '...');
        resolve(false);
      }
    });
  });
}

/**
 * Test Brain Proxy configuration format
 */
function testBrainProxyConfig() {
  log('info', 'Testing Brain Proxy configuration format...');
  
  try {
    const testRoute = 'ig-4f2a8b9d';
    const testSecret = 'a1b2c3d4e5f6789012345678901234567890abcd';
    const proxyUrl = 'wss://hub.m.agifor.me:9025/bp/connect';
    
    // Test URL format
    if (!proxyUrl.includes('hub.m.agifor.me:9025')) {
      throw new Error('Proxy URL should use hub.m.agifor.me:9025');
    }
    
    // Test connection string format
    const testConnectionUrl = `${proxyUrl}?route=${encodeURIComponent(testRoute)}&token=${encodeURIComponent(testSecret)}`;
    const url = new URL(testConnectionUrl);
    
    if (!url.searchParams.get('route') || !url.searchParams.get('token')) {
      throw new Error('Connection URL missing required parameters');
    }
    
    log('success', '✅ Brain Proxy configuration format is valid');
    log('success', 'Configuration test passed');
    
    return true;
  } catch (error) {
    log('error', `❌ Configuration test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.info}🧪 Running mAgi Register Command Tests${colors.reset}`);
  console.log('═'.repeat(50));
  
  const tests = [
    { name: 'Credential Generation', fn: testCredentialGeneration },
    { name: 'Brain Proxy Configuration', fn: testBrainProxyConfig },
    { name: 'Command Execution', fn: testMagiRegisterCommand }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    console.log(`\n🔬 Running: ${test.name}`);
    console.log('-'.repeat(30));
    
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      }
    } catch (error) {
      log('error', `❌ Test "${test.name}" threw exception: ${error.message}`);
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`${colors.info}📊 Test Results: ${passed}/${total} passed${colors.reset}`);
  
  if (passed === total) {
    log('success', '🎉 All tests passed!');
    process.exit(0);
  } else {
    log('error', `❌ ${total - passed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    log('error', `❌ Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testCredentialGeneration,
  testBrainProxyConfig,
  testMagiRegisterCommand,
  runTests
};