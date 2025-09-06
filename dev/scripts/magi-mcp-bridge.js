#!/usr/bin/env node

/**
 * MCP Bridge Script - Connects Claude Code MCP requests to shared logging
 * 
 * This script:
 * 1. Runs the MCP server for Claude Code connections
 * 2. Logs all MCP activity to a shared log file
 * 3. Allows the main `magi start --dev` to monitor MCP connections
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getProjectRoot } = require('../../utils/magi-root');

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

// Shared log file for MCP connections
const sharedLogFile = path.join(getProjectRoot(), '.magi-mcp.log');

function logMCPEvent(event, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    pid: process.pid,
    ...data
  };
  
  try {
    // Append to shared log file
    fs.appendFileSync(sharedLogFile, JSON.stringify(logEntry) + '\n');
    
    // Also log to stderr so it appears in Claude Code if needed
    console.error(`📡 [${new Date().toLocaleTimeString()}] MCP ${event}: ${JSON.stringify(data)}`);
  } catch (error) {
    // Ignore logging errors
  }
}

// Log MCP bridge startup
logMCPEvent('bridge_start', {
  from: 'claude_code',
  claude_pid: process.ppid
});

// Start the actual MCP server
console.error(`${colors.info}🌉 Starting MCP bridge for Claude Code...${colors.reset}`);

const server = spawn('npm', ['run', 'dev:stdio', '--workspace=services/brainbridge'], {
  stdio: ['inherit', 'inherit', 'pipe'], // inherit stdin/stdout, pipe stderr for logging
  cwd: getProjectRoot(),
  env: { 
    ...process.env,
    MAGI_MCP_BRIDGE: 'true' // Flag to identify this as bridge instance
  }
});

// Monitor server stderr for connection events
server.stderr.setEncoding('utf8');
server.stderr.on('data', (data) => {
  const lines = data.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    // Forward all stderr to main process
    console.error(line);
    
    // Detect MCP connection events and log them
    if (line.includes('MCP stdio connection established')) {
      logMCPEvent('connection_established', {
        from: 'claude_code',
        claude_pid: process.ppid,
        line: line.trim()
      });
    }
    
    if (line.includes('MCP tool called:')) {
      const toolMatch = line.match(/MCP tool called: (\w+)/);
      const toolName = toolMatch ? toolMatch[1] : 'unknown';
      
      logMCPEvent('tool_called', {
        from: 'claude_code',
        tool: toolName,
        line: line.trim()
      });
    }
    
    if (line.includes('MCP stdio connection closed')) {
      logMCPEvent('connection_closed', {
        from: 'claude_code',
        line: line.trim()
      });
    }
  });
});

server.on('error', (error) => {
  logMCPEvent('bridge_error', {
    error: error.message
  });
  console.error(`${colors.error}❌ MCP Bridge error: ${error.message}${colors.reset}`);
});

server.on('close', (code) => {
  logMCPEvent('bridge_close', {
    code,
    from: 'claude_code'
  });
  process.exit(code);
});

// Handle exit signals
process.on('SIGINT', () => {
  logMCPEvent('bridge_sigint');
  server.kill('SIGTERM');
});

process.on('SIGTERM', () => {
  logMCPEvent('bridge_sigterm');
  server.kill('SIGTERM');
});