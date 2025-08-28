#!/usr/bin/env node

/**
 * BrainBridge Local Network Launcher
 * Runs multiple BrainBridge instances locally without Docker
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration for each brain instance
const INSTANCES = [
  {
    name: 'alice',
    port: 8147,
    mcpPort: 8247,
    memoriesDir: '../memories.alice',
    ollamaPort: 11434,
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'bob',
    port: 8148,
    mcpPort: 8248,
    memoriesDir: '../memories.bob',
    ollamaPort: 11434,
    color: '\x1b[33m' // Yellow
  },
  {
    name: 'carol',
    port: 8149,
    mcpPort: 8249,
    memoriesDir: '../memories.carol',
    ollamaPort: 11434,
    color: '\x1b[35m' // Magenta
  }
];

const processes = new Map();
const brainbridgeDir = path.join(__dirname, '..', 'brainbridge');

// Ensure BrainBridge is built
function ensureBrainBridgeBuilt() {
  console.log('🔨 Checking BrainBridge build...');
  const distPath = path.join(brainbridgeDir, 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('📦 Building BrainBridge...');
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: brainbridgeDir,
      stdio: 'inherit'
    });
    
    return new Promise((resolve, reject) => {
      buildProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ BrainBridge built successfully');
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  }
  
  console.log('✅ BrainBridge already built');
  return Promise.resolve();
}

// Start a single brain instance
function startInstance(config) {
  const { name, port, mcpPort, memoriesDir, ollamaPort, color } = config;
  
  console.log(`${color}🚀 Starting ${name} on port ${port}...`);
  
  // Ensure memories directory exists
  const fullMemoriesPath = path.resolve(memoriesDir);
  if (!fs.existsSync(fullMemoriesPath)) {
    fs.mkdirSync(fullMemoriesPath, { recursive: true });
  }
  
  const env = {
    ...process.env,
    INSTANCE_NAME: name,
    MEMORIES_DIR: fullMemoriesPath,
    MCP_PORT: mcpPort,
    OLLAMA_HOST: '127.0.0.1',
    OLLAMA_PORT: ollamaPort,
    LOG_FILE: path.join(__dirname, 'logs', `${name}.log`),
    NODE_ENV: 'development'
  };
  
  const child = spawn('node', [
    path.join(brainbridgeDir, 'dist', 'server.js'),
    'http',
    port.toString()
  ], {
    env,
    cwd: brainbridgeDir
  });
  
  // Add colored prefix to output
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.log(`${color}[${name.toUpperCase()}]\x1b[0m ${line}`);
    });
  });
  
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      console.error(`${color}[${name.toUpperCase()}]\x1b[0m ${line}`);
    });
  });
  
  child.on('exit', (code) => {
    console.log(`${color}[${name.toUpperCase()}] Process exited with code ${code}\x1b[0m`);
    processes.delete(name);
    
    // Auto-restart on crash
    if (code !== 0) {
      console.log(`${color}🔄 Restarting ${name} in 3 seconds...\x1b[0m`);
      setTimeout(() => startInstance(config), 3000);
    }
  });
  
  processes.set(name, { process: child, config });
  
  console.log(`${color}✅ ${name} started on http://localhost:${port}\x1b[0m`);
}

// Stop all instances
function stopAllInstances() {
  console.log('\n🛑 Stopping all instances...');
  
  processes.forEach(({ process }, name) => {
    console.log(`  Stopping ${name}...`);
    process.kill('SIGTERM');
  });
  
  // Force kill after 5 seconds if not stopped
  setTimeout(() => {
    processes.forEach(({ process }, name) => {
      if (!process.killed) {
        console.log(`  Force killing ${name}...`);
        process.kill('SIGKILL');
      }
    });
    process.exit(0);
  }, 5000);
}

// Start Ollama if not running
async function ensureOllamaRunning() {
  console.log('🤖 Checking Ollama...');
  
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      console.log('✅ Ollama is running');
      return true;
    }
  } catch (error) {
    console.log('⚠️  Ollama is not running');
    console.log('📝 Please start Ollama with: ollama serve');
    console.log('   Then run this launcher again');
    return false;
  }
}

// Main launcher
async function main() {
  console.log('🧠 BrainBridge Local Network Launcher');
  console.log('=====================================\n');
  
  // Check Ollama
  const ollamaRunning = await ensureOllamaRunning();
  if (!ollamaRunning) {
    console.log('\n❌ Cannot start without Ollama. Exiting...');
    process.exit(1);
  }
  
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Build BrainBridge if needed
  try {
    await ensureBrainBridgeBuilt();
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
  
  // Handle graceful shutdown
  process.on('SIGINT', stopAllInstances);
  process.on('SIGTERM', stopAllInstances);
  
  // Start all instances
  console.log('\n🚀 Starting all brain instances...\n');
  INSTANCES.forEach(config => {
    startInstance(config);
    // Small delay between starts
    return new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  // Print summary
  setTimeout(() => {
    console.log('\n✨ All instances started!');
    console.log('\n📍 Instance URLs:');
    INSTANCES.forEach(({ name, port, color }) => {
      console.log(`   ${color}${name}:\x1b[0m http://localhost:${port}`);
    });
    console.log('\n📊 Dashboard: http://localhost:3000 (start with npm run dashboard)');
    console.log('\nPress Ctrl+C to stop all instances\n');
  }, 3000);
}

// Run the launcher
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});