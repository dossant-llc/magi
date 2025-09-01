#!/usr/bin/env node

/**
 * Brain Proxy Integration Test Script
 * 
 * This script tests the end-to-end Brain Proxy functionality:
 * 1. Sends test RPC requests to the Brain Proxy
 * 2. Verifies responses when brain is offline (limited capacity mode)
 * 3. Tests different endpoints (health, openapi, privacy)
 */

const axios = require('axios');

const BRAINCLOUD_URL = process.env.BRAINCLOUD_URL || `https://${process.env.AGIFORME_SERVER_DOMAIN || 'localhost'}`;
const PROXY_BASE_URL = process.env.BRAIN_PROXY_BASE_URL || `${BRAINCLOUD_URL}/bp`;
const TEST_ROUTE = process.env.BRAIN_PROXY_ROUTE || 'test-route';

console.log('🌥️ BrainCloud Integration Test');
console.log('=================================');
console.log(`BrainCloud: ${BRAINCLOUD_URL}`);
console.log(`Brain Proxy: ${PROXY_BASE_URL}`);
console.log(`Test Route: ${TEST_ROUTE}`);
console.log('');

async function testBrainCloudDashboard() {
  console.log('🌥️ Testing BrainCloud dashboard...');
  try {
    const response = await axios.get(`${BRAINCLOUD_URL}/`);
    console.log('✅ BrainCloud dashboard accessible');
    console.log('   Content-Type:', response.headers['content-type']);
    console.log('   Contains BrainCloud:', response.data.includes('BrainCloud') ? 'Yes' : 'No');
    return true;
  } catch (error) {
    console.log('❌ BrainCloud dashboard failed:', error.message);
    return false;
  }
}

async function testSystemStatus() {
  console.log('📊 Testing system status API...');
  try {
    const response = await axios.get(`${BRAINCLOUD_URL}/api/status`);
    console.log('✅ System status retrieved');
    console.log('   Platform:', response.data.platform);
    console.log('   Version:', response.data.version);
    console.log('   Services:', Object.keys(response.data.services));
    return true;
  } catch (error) {
    console.log('❌ System status failed:', error.message);
    return false;
  }
}

async function testHealth() {
  console.log('🧠 Testing Brain Proxy health endpoint...');
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/health`);
    console.log('✅ Health check passed');
    console.log('   Status:', response.data.status);
    console.log('   Connected Brains:', response.data.connectedBrains);
    console.log('   Routes:', response.data.routes);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testOpenAPI() {
  console.log('📋 Testing OpenAPI schema...');
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/openapi.json`);
    console.log('✅ OpenAPI schema retrieved');
    console.log('   Title:', response.data.info.title);
    console.log('   Version:', response.data.info.version);
    console.log('   Paths:', Object.keys(response.data.paths));
    return true;
  } catch (error) {
    console.log('❌ OpenAPI schema failed:', error.message);
    return false;
  }
}

async function testPrivacyPolicy() {
  console.log('🔒 Testing privacy policy...');
  try {
    const response = await axios.get(`${PROXY_BASE_URL}/privacy`);
    console.log('✅ Privacy policy retrieved');
    console.log('   Content-Type:', response.headers['content-type']);
    console.log('   Content Length:', response.data.length, 'bytes');
    return true;
  } catch (error) {
    console.log('❌ Privacy policy failed:', error.message);
    return false;
  }
}

async function testRPCOffline() {
  console.log('🔌 Testing RPC with brain offline (limited capacity mode)...');
  try {
    const request = {
      id: 'test-' + Date.now(),
      method: 'ai_query_memories',
      params: {
        question: 'What do you know about JavaScript?'
      }
    };

    const response = await axios.post(`${PROXY_BASE_URL}/rpc/${TEST_ROUTE}`, request);
    
    if (response.status === 503) {
      console.log('✅ Limited capacity mode working');
      console.log('   Status:', response.status);
      console.log('   Response ID:', response.data.id);
      console.log('   Message Preview:', response.data.result.content[0].text.substring(0, 100) + '...');
      return true;
    } else {
      console.log('⚠️  Expected 503 (brain offline), got:', response.status);
      return false;
    }
  } catch (error) {
    if (error.response && error.response.status === 503) {
      console.log('✅ Limited capacity mode working (via error handling)');
      console.log('   Status:', error.response.status);
      console.log('   Response ID:', error.response.data.id);
      return true;
    } else {
      console.log('❌ RPC offline test failed:', error.message);
      return false;
    }
  }
}

async function testInvalidRPC() {
  console.log('❓ Testing invalid RPC request...');
  try {
    const request = {
      // Missing id and method
      params: {
        question: 'Test'
      }
    };

    const response = await axios.post(`${PROXY_BASE_URL}/rpc/${TEST_ROUTE}`, request);
    console.log('⚠️  Expected error, got success:', response.status);
    return false;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Invalid request properly rejected');
      console.log('   Status:', error.response.status);
      return true;
    } else {
      console.log('❌ Invalid RPC test failed:', error.message);
      return false;
    }
  }
}

async function runAllTests() {
  console.log('Starting BrainCloud integration tests...\n');
  
  const results = [];
  
  results.push(await testBrainCloudDashboard());
  console.log('');
  
  results.push(await testSystemStatus());
  console.log('');
  
  results.push(await testHealth());
  console.log('');
  
  results.push(await testOpenAPI());
  console.log('');
  
  results.push(await testPrivacyPolicy());
  console.log('');
  
  results.push(await testRPCOffline());
  console.log('');
  
  results.push(await testInvalidRPC());
  console.log('');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('🎯 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! BrainCloud Platform is working correctly.');
    console.log('\n📝 Next Steps:');
    console.log('1. Deploy BrainCloud to your server: cd services/braincloud && ./deploy.sh');
    console.log('2. Configure your local BrainBridge with BrainCloud settings');
    console.log('3. Set up Custom GPT with the Brain Proxy OpenAPI schema');
    console.log(`4. Access BrainCloud dashboard at https://${process.env.AGIFORME_SERVER_DOMAIN || 'your-server.com'}:8082/`);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the BrainCloud server configuration.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node test-brain-proxy.js [options]');
  console.log('');
  console.log('Environment variables:');
  console.log('  BRAIN_PROXY_BASE_URL  Base URL for Brain Proxy (default: http://localhost:8082/bp)');
  console.log('  BRAIN_PROXY_ROUTE     Test route name (default: test-route)');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help           Show this help message');
  process.exit(0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error.message);
  process.exit(1);
});