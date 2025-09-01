#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧠 Welcome to AGIfor.me - Your Personal AI Memory Bank!');
console.log('');

// Status check functions
function checkNodeModules() {
  return fs.existsSync('node_modules') && fs.existsSync('node_modules/.package-lock.json');
}

function checkMemories() {
  // Check if memories directory exists using new profile structure
  const memoryPaths = [
    'data/memories/profiles/default', // New profile structure
    'data/memories/main', // Legacy path for migration
    'memories', // Very old legacy path
    process.env.MEMORIES_DIR
  ].filter(Boolean);
  
  return memoryPaths.some(path => fs.existsSync(path));
}

function checkOllama() {
  try {
    execSync('ollama list', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkBrainBridgeWorkspace() {
  const bbPath = 'services/brainbridge';
  return fs.existsSync(path.join(bbPath, 'node_modules'));
}

// Status checks
const checks = {
  nodeModules: checkNodeModules(),
  memories: checkMemories(),
  ollama: checkOllama(),
  brainbridge: checkBrainBridgeWorkspace()
};

const allGood = Object.values(checks).every(Boolean);

// Display status
console.log('📊 System Status:');
console.log(`${checks.nodeModules ? '✅' : '❌'} Dependencies installed`);
console.log(`${checks.memories ? '✅' : '❌'} Memory bank initialized`);
console.log(`${checks.ollama ? '✅' : '❌'} Ollama AI engine available`);
console.log(`${checks.brainbridge ? '✅' : '❌'} BrainBridge service ready`);
console.log('');

if (allGood) {
  console.log('🎉 All systems ready! Launching magi...');
  console.log('');
  // Exit successfully - package.json will continue with bb:stdio
  process.exit(0);
}

// Suggest fixes for missing components
console.log('🔧 Setup needed:');
console.log('');

if (!checks.nodeModules) {
  console.log('📦 Install dependencies:');
  console.log('   npm install');
  console.log('');
}

if (!checks.brainbridge) {
  console.log('🧠 Install BrainBridge dependencies:');
  console.log('   npm run install:all');
  console.log('');
}

if (!checks.memories) {
  console.log('💾 Initialize memory bank:');
  console.log('   npm run setup');
  console.log('');
}

if (!checks.ollama) {
  console.log('🤖 Install AI engine (Ollama):');
  console.log('   # Option 1: Automatic install');
  console.log('   node dev/scripts/install-llm.sh');
  console.log('');
  console.log('   # Option 2: Manual install');
  console.log('   # Visit: https://ollama.ai/download');
  console.log('   # Then run: npm run ai:pull');
  console.log('');
}

console.log('💡 Quick setup (runs all missing steps):');
console.log('   npm run bootstrap');
console.log('');

console.log('📚 For detailed setup instructions:');
console.log('   docs/setup/GETTING_STARTED.md');
console.log('');

process.exit(1);