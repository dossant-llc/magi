#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  prompt: '\x1b[36m',
  success: '\x1b[92m',
  system: '\x1b[33m',
  error: '\x1b[31m',
  hint: '\x1b[90m',
  info: '\x1b[36m',
  warning: '\x1b[33m',
  reset: '\x1b[0m'
};

console.log(`${colors.system}🧙 Starting Magi BrainBridge Service${colors.reset}`);
console.log(`${colors.hint}Press Ctrl+C to stop${colors.reset}\n`);

// Check if BrainBridge is already running
try {
  const processes = execSync('ps aux | grep "brainbridge.*stdio" | grep -v grep', { encoding: 'utf8' }).trim();
  if (processes) {
    console.log(`${colors.warning}⚠️ BrainBridge appears to be already running${colors.reset}`);
    console.log(`${colors.hint}If stuck, kill existing processes: pkill -f "brainbridge.*stdio"${colors.reset}\n`);
  }
} catch (e) {
  // No existing processes, good to start
}

// Start BrainBridge service
console.log(`${colors.info}🚀 Starting BrainBridge service...${colors.reset}`);
const server = spawn('npm', ['run', 'dev:stdio', '--workspace=services/brainbridge'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let isReady = false;
let lineCount = 0;

// Handle server output
server.stdout.setEncoding('utf8');
server.stdout.on('data', (data) => {
  const lines = data.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    lineCount++;
    const timestamp = new Date().toLocaleTimeString();
    const formattedLine = formatLogLine(line, timestamp);
    if (formattedLine) {
      console.log(formattedLine);
    }
    
    // Check for ready indicators
    if (!isReady && (line.includes('MCP server running') || line.includes('Server started'))) {
      isReady = true;
      setTimeout(() => {
        console.log(`\n${colors.success}✅ BrainBridge is ready! Service running in background.${colors.reset}`);
        console.log(`${colors.hint}🔄 Streaming logs... (Ctrl+C to stop)${colors.reset}\n`);
        showPeriodicStatus();
      }, 1000);
    }
    
    // Show periodic status updates
    if (lineCount % 25 === 0) {
      showPeriodicStatus();
    }
  });
});

server.stderr.setEncoding('utf8');
server.stderr.on('data', (data) => {
  const lines = data.split('\n').filter(line => line.trim());
  lines.forEach(line => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors.hint}[${timestamp}]${colors.reset} ${colors.error}⚠️ ${line}${colors.reset}`);
  });
});

server.on('error', (error) => {
  console.error(`${colors.error}❌ Failed to start BrainBridge: ${error.message}${colors.reset}`);
  process.exit(1);
});

server.on('close', (code) => {
  if (code === 0) {
    console.log(`${colors.system}👋 BrainBridge stopped gracefully${colors.reset}`);
  } else {
    console.log(`${colors.error}❌ BrainBridge exited with code ${code}${colors.reset}`);
  }
  process.exit(code);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n${colors.system}🛑 Stopping BrainBridge service...${colors.reset}`);
  server.kill('SIGTERM');
  
  // Force kill after 5 seconds if needed
  setTimeout(() => {
    server.kill('SIGKILL');
    process.exit(1);
  }, 5000);
});

/**
 * Format log line with colors and timestamp
 */
function formatLogLine(line, timestamp) {
  if (!line.trim()) return '';
  
  // If line already has BrainBridge timestamp (🕐), don't add our timestamp
  if (line.includes('🕐')) {
    return line; // Return as-is with original formatting
  }
  
  const time = `${colors.hint}[${timestamp}]${colors.reset}`;
  
  // If line already has formatting (ANSI codes), just add timestamp
  if (line.includes('\x1b[') || line.includes('[0m')) {
    return `${time} ${line}`;
  }
  
  // Otherwise, add our own formatting
  if (line.includes('[ERROR]') || line.includes('ERROR:')) {
    return `${time} ${colors.error}❌ ${line}${colors.reset}`;
  } else if (line.includes('[WARN]') || line.includes('WARN:')) {
    return `${time} ${colors.warning}⚠️  ${line}${colors.reset}`;
  } else if (line.includes('[INFO]') || line.includes('INFO:')) {
    return `${time} ${colors.info}ℹ️  ${line}${colors.reset}`;
  } else if (line.includes('[DEBUG]') || line.includes('DEBUG:')) {
    return `${time} ${colors.hint}🔍 ${line}${colors.reset}`;
  } else if (line.includes('[TRACE]') || line.includes('TRACE:')) {
    return `${time} ${colors.hint}📍 ${line}${colors.reset}`;
  } else {
    return `${time} ${line}`;
  }
}

/**
 * Show periodic system status
 */
function showPeriodicStatus() {
  try {
    let statusLine = `${colors.system}━━━ STATUS ━━━${colors.reset} `;
    
    // Check BrainBridge processes
    try {
      const processes = execSync('ps aux | grep "tsx.*server.ts.*stdio" | grep -v grep', { encoding: 'utf8' }).trim();
      const count = processes ? processes.split('\n').filter(line => line.trim()).length : 0;
      statusLine += `🧠 BB:${count} `;
    } catch (e) {
      statusLine += '🧠 BB:0 ';
    }
    
    // Check Ollama
    try {
      const response = execSync('curl -s -m 2 http://localhost:11434/api/tags', { encoding: 'utf8' });
      const data = JSON.parse(response);
      statusLine += `🤖 Ollama:${data.models?.length || 0} `;
    } catch (e) {
      statusLine += '🤖 Ollama:❌ ';
    }
    
    // Check memory count across all privacy levels
    try {
      const memoriesDir = path.join(process.cwd(), 'data/memories/profiles/default');
      let totalMemories = 0;
      if (fs.existsSync(memoriesDir)) {
        const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
        for (const level of privacyLevels) {
          const levelDir = path.join(memoriesDir, level);
          if (fs.existsSync(levelDir)) {
            const files = fs.readdirSync(levelDir).filter(f => f.endsWith('.md'));
            totalMemories += files.length;
          }
        }
      }
      statusLine += `📁 Mem:${totalMemories}`;
    } catch (e) {
      statusLine += '📁 Mem:?';
    }
    
    console.log(statusLine);
  } catch (error) {
    // Ignore status check errors
  }
}

// Show initial status after delay
setTimeout(showPeriodicStatus, 3000);