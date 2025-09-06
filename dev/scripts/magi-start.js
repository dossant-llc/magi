#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getProjectRoot, getMemoriesDir } = require('../../utils/magi-root');

// Load .env configuration
require('dotenv').config({ path: path.join(getProjectRoot(), '.env') });

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

// Check for --dev flag to control verbosity
const isDevMode = process.argv.includes('--dev');

// Singleton lock implementation
const lockFile = path.join(getProjectRoot(), '.magi-start.lock');

function acquireLock() {
  try {
    // Check if lock file exists and if the process is still running
    if (fs.existsSync(lockFile)) {
      const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      
      // Check if the process is still alive
      try {
        process.kill(lockData.pid, 0); // Signal 0 just tests if process exists
        
        // Show comprehensive failure message with helpful guidance
        console.log(`\n${colors.error}❌ Cannot start: Magi BrainBridge service is already running${colors.reset}`);
        console.log(`${colors.system}📍 Running instance details:${colors.reset}`);
        console.log(`   PID: ${lockData.pid}`);
        console.log(`   Started: ${new Date(lockData.started).toLocaleString()}`);
        console.log(`   Mode: ${lockData.dev ? 'development (--dev)' : 'production'}`);
        
        console.log(`\n${colors.info}🎯 What you probably want to do:${colors.reset}`);
        if (isDevMode) {
          console.log(`${colors.success}   magi logs${colors.reset}     # View live logs from running instance`);
          console.log(`${colors.hint}   magi status${colors.reset}   # Check system health & diagnostics`);
        } else {
          console.log(`${colors.success}   magi start --dev${colors.reset} # Start in development mode (but first stop this instance)`);
          console.log(`${colors.hint}   magi logs${colors.reset}        # View live logs from running instance`);
        }
        
        console.log(`\n${colors.warning}🛠️  Service management:${colors.reset}`);
        console.log(`${colors.prompt}   magi stop${colors.reset}        # Stop the running instance`);
        console.log(`${colors.prompt}   magi restart${colors.reset}     # Restart the service`);
        console.log(`${colors.hint}   magi status${colors.reset}       # Full system diagnostics`);
        
        console.log(`\n${colors.system}ℹ️  About singleton architecture:${colors.reset}`);
        console.log(`   Magi uses a singleton pattern to prevent resource conflicts and`);
        console.log(`   ensure consistent MCP connections. Only one instance can run at a time.`);
        
        if (lockData.dev && !isDevMode) {
          console.log(`\n${colors.warning}⚠️  Instance mode mismatch:${colors.reset}`);
          console.log(`   Running instance is in development mode, but you tried to start in production mode.`);
          console.log(`${colors.hint}   Consider: ${colors.prompt}magi logs${colors.reset} (to view dev logs) or ${colors.prompt}magi stop && magi start${colors.reset} (production)`);
        } else if (!lockData.dev && isDevMode) {
          console.log(`\n${colors.warning}⚠️  Instance mode mismatch:${colors.reset}`);
          console.log(`   Running instance is in production mode, but you tried to start with --dev flag.`);
          console.log(`${colors.hint}   Consider: ${colors.prompt}magi stop && magi start --dev${colors.reset} (development) or ${colors.prompt}magi logs${colors.reset} (view current logs)`);
        }
        
        console.log(`\n${colors.hint}💡 Quick troubleshooting: If instance appears stuck, check ${colors.prompt}magi status${colors.reset} for diagnostics.${colors.reset}\n`);
        
        process.exit(1);
      } catch (e) {
        // Process is dead, remove stale lock file
        console.log(`${colors.warning}🧹 Removing stale lock file${colors.reset}`);
        fs.unlinkSync(lockFile);
      }
    }

    // Create new lock file
    const lockData = {
      pid: process.pid,
      started: new Date().toISOString(),
      dev: isDevMode
    };
    fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2));
    
    console.log(`${colors.system}🔒 Acquired singleton lock (PID: ${process.pid})${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.error}❌ Failed to acquire lock: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

function releaseLock() {
  try {
    // Stop MCP log file watcher
    if (logFileWatcher) {
      fs.unwatchFile(sharedLogFile);
      logFileWatcher = null;
    }
    
    // Clean up shared log file
    if (fs.existsSync(sharedLogFile)) {
      try {
        fs.unlinkSync(sharedLogFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // Remove lock file
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log(`${colors.system}🔓 Released singleton lock${colors.reset}`);
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
}

// Acquire singleton lock before proceeding
acquireLock();

console.log(`${colors.system}🧙 Starting Magi BrainBridge Service${colors.reset}`);
console.log(`${colors.hint}Press Ctrl+C to stop${colors.reset}\n`);

// Check if BrainBridge is already running (legacy check, should be caught by lock)
try {
  const processes = execSync('ps aux | grep "brainbridge.*stdio" | grep -v grep', { encoding: 'utf8' }).trim();
  if (processes) {
    console.log(`${colors.warning}⚠️ Found existing BrainBridge processes (cleaning up)${colors.reset}`);
    // Auto-cleanup since we have the lock
    try {
      execSync('pkill -f "brainbridge.*stdio"');
      console.log(`${colors.success}✅ Cleaned up existing processes${colors.reset}`);
    } catch (cleanupError) {
      console.log(`${colors.hint}Manual cleanup may be needed: pkill -f "brainbridge.*stdio"${colors.reset}`);
    }
  }
} catch (e) {
  // No existing processes, good to start
}

// Start BrainBridge service
console.log(`${colors.info}🚀 Starting BrainBridge service...${colors.reset}`);
console.log(`${colors.hint}AI Provider: ${process.env.AI_PROVIDER || 'ollama (default)'}${colors.reset}`);

const server = spawn('npm', ['run', 'dev:stdio', '--workspace=services/brainbridge'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: getProjectRoot(),
  env: { ...process.env } // Pass through all environment variables
});

let isReady = false;
let lineCount = 0;

// Monitor shared MCP log file for connection events from Claude Code
const sharedLogFile = path.join(getProjectRoot(), '.magi-mcp.log');
let logFileWatcher = null;
let lastLogPosition = 0;

function setupMCPLogMonitoring() {
  // Clear existing log file on startup
  try {
    fs.writeFileSync(sharedLogFile, '');
  } catch (e) {
    // Ignore file creation errors
  }

  // Watch for MCP log file changes
  if (fs.existsSync(sharedLogFile)) {
    try {
      logFileWatcher = fs.watchFile(sharedLogFile, { interval: 100 }, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          readNewMCPLogs();
        }
      });
    } catch (error) {
      // Ignore watcher setup errors
    }
  }
}

function readNewMCPLogs() {
  try {
    const data = fs.readFileSync(sharedLogFile, 'utf8');
    const lines = data.split('\n').filter(line => line.trim());
    
    // Only read new lines since last position
    const newLines = lines.slice(Math.floor(lastLogPosition / 100));
    lastLogPosition = data.length;
    
    newLines.forEach(line => {
      if (!line.trim()) return;
      
      try {
        const logEntry = JSON.parse(line);
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        
        switch (logEntry.event) {
          case 'connection_established':
            const claudePid = logEntry.claude_pid ? ` (PID: ${logEntry.claude_pid})` : '';
            console.log(`${colors.success}📡 [${timestamp}] Claude Code connected via MCP${claudePid}${colors.reset}`);
            break;
          case 'tool_called':
            console.log(`${colors.info}🔧 [${timestamp}] Claude Code called: ${logEntry.tool}${colors.reset}`);
            break;
          case 'connection_closed':
            console.log(`${colors.warning}📡 [${timestamp}] Claude Code disconnected from MCP${colors.reset}`);
            break;
          case 'bridge_start':
            const bridgeClaudePid = logEntry.claude_pid ? ` (PID: ${logEntry.claude_pid})` : '';
            console.log(`${colors.system}🌉 [${timestamp}] MCP Bridge started for Claude Code${bridgeClaudePid}${colors.reset}`);
            break;
        }
      } catch (parseError) {
        // Ignore malformed log entries
      }
    });
  } catch (error) {
    // Ignore read errors
  }
}

// Start MCP log monitoring
setupMCPLogMonitoring();

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
    
    // Show periodic status updates less frequently
    if (lineCount % 50 === 0) {
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
  releaseLock();
  process.exit(1);
});

server.on('close', (code) => {
  if (code === 0) {
    console.log(`${colors.system}👋 BrainBridge stopped gracefully${colors.reset}`);
  } else {
    console.log(`${colors.error}❌ BrainBridge exited with code ${code}${colors.reset}`);
  }
  releaseLock();
  process.exit(code);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n${colors.system}🛑 Stopping BrainBridge service...${colors.reset}`);
  server.kill('SIGTERM');
  
  // Force kill after 5 seconds if needed
  setTimeout(() => {
    server.kill('SIGKILL');
    releaseLock();
    process.exit(1);
  }, 5000);
});

// Handle other exit signals
process.on('SIGTERM', () => {
  console.log(`\n${colors.system}🛑 Received SIGTERM, stopping...${colors.reset}`);
  releaseLock();
  server.kill('SIGTERM');
  process.exit(0);
});

process.on('exit', () => {
  releaseLock();
});

/**
 * Format log line with colors and timestamp
 */
function formatLogLine(line, timestamp) {
  if (!line.trim()) return '';
  
  // Skip verbose dotenv messages
  if (line.includes('[dotenv@') && line.includes('tip:')) return '';
  
  // Skip duplicate/verbose startup messages unless in dev mode
  if (!isDevMode) {
    const skipPatterns = [
      'AI Provider Factory initialized',
      'OpenAI Chat Provider initialized with model',
      'OpenAI Embedding Provider initialized with model',
      'EmbeddingService initialized with openai provider',
      'AI Service initialized with openai provider',
      'Building tools list',
      'Built 8 tools successfully',
      'Tools verification: Found 8 tools',
      'AI Query tool available',
      'AI Save tool available',
      '✅ AI tools verification passed',
      'Initializing BrainXchange integration',
      'BrainXchange integration initialized successfully',
      'Brain Proxy connector disabled via configuration'
    ];
    
    for (const pattern of skipPatterns) {
      if (line.includes(pattern)) return '';
    }
  }
  
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
    
    // Check AI Provider
    const aiProvider = process.env.AI_PROVIDER || 'ollama';
    if (aiProvider === 'openai') {
      // Check OpenAI by checking if API key is configured
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey && apiKey.startsWith('sk-')) {
          statusLine += `🤖 OpenAI:✅ `;
        } else {
          statusLine += `🤖 OpenAI:❌ `;
        }
      } catch (e) {
        statusLine += '🤖 OpenAI:❌ ';
      }
    } else {
      // Check Ollama
      try {
        const response = execSync('curl -s -m 2 http://localhost:11434/api/tags', { encoding: 'utf8' });
        const data = JSON.parse(response);
        statusLine += `🤖 Ollama:${data.models?.length || 0} `;
      } catch (e) {
        statusLine += '🤖 Ollama:❌ ';
      }
    }
    
    // Check memory count across all privacy levels
    try {
      const memoriesDir = getMemoriesDir();
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