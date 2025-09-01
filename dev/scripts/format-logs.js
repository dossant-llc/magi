#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Colors and formatting to match stdio output
const colors = {
  timestamp: '\x1b[90m', // Gray
  info: '\x1b[34m',      // Blue
  warn: '\x1b[33m',      // Yellow
  error: '\x1b[31m',     // Red
  reset: '\x1b[0m',      // Reset
  bold: '\x1b[1m',       // Bold
  dim: '\x1b[2m'         // Dim
};

function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    const time = date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    return `🕐 ${time}`;
  } catch (e) {
    return isoString;
  }
}

function formatLogLevel(level) {
  switch (level.toUpperCase()) {
    case 'INFO':
      return `${colors.info}info${colors.reset}`;
    case 'WARN':
    case 'WARNING':
      return `${colors.warn}warn${colors.reset}`;
    case 'ERROR':
      return `${colors.error}error${colors.reset}`;
    case 'DEBUG':
      return `${colors.dim}debug${colors.reset}`;
    case 'TRACE':
      return `${colors.dim}trace${colors.reset}`;
    default:
      return level.toLowerCase();
  }
}

function formatLogLine(line) {
  // Match the log format: "2025-08-28T09:13:30.253-05:00: [INFO] message"
  const logMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[-+]\d{2}:\d{2}):\s*\[(\w+)\]\s*(.+)$/);
  
  if (logMatch) {
    const [, timestamp, level, message] = logMatch;
    const formattedTime = formatTimestamp(timestamp);
    const formattedLevel = formatLogLevel(level);
    
    // Try to parse JSON metadata if it exists
    let formattedMessage = message;
    if (message.includes(' | {')) {
      const parts = message.split(' | ');
      const mainMessage = parts[0];
      const jsonPart = parts.slice(1).join(' | ');
      
      try {
        const metadata = JSON.parse(jsonPart);
        if (metadata.component || metadata.action) {
          formattedMessage = `${colors.info}${mainMessage}${colors.reset}`;
          if (metadata.component && metadata.action) {
            formattedMessage += ` │ ${colors.dim}${metadata.component}:${metadata.action}${colors.reset}`;
          }
        }
      } catch (e) {
        // If JSON parsing fails, just use the original message
        formattedMessage = `${colors.info}${mainMessage}${colors.reset}`;
      }
    } else {
      formattedMessage = `${colors.info}${message}${colors.reset}`;
    }
    
    return `${colors.timestamp}${formattedTime}${colors.reset} │ ${formattedLevel} │ ${formattedMessage}`;
  }
  
  // If line doesn't match expected format, return as-is but with some color
  return `${colors.dim}${line}${colors.reset}`;
}

function main() {
  const logFile = path.join(process.cwd(), 'services/brainbridge/logs/brainbridge-mcp.log');
  
  // Use tail -f to follow the log file
  const tail = spawn('tail', ['-f', logFile], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  tail.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(formatLogLine(line.trim()));
      }
    });
  });
  
  tail.stderr.on('data', (data) => {
    console.error(`${colors.error}tail error: ${data}${colors.reset}`);
  });
  
  tail.on('close', (code) => {
    if (code !== 0) {
      console.log(`${colors.warn}Log file watcher exited with code ${code}${colors.reset}`);
    }
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    tail.kill();
    process.exit(0);
  });
}

main();