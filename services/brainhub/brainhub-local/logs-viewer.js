#!/usr/bin/env node

/**
 * Simple Raw Log Viewer - Direct observability into BrainBridge services
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 BrainBridge Raw Log Viewer');
console.log('================================');
console.log();

// Watch all log files simultaneously
const logFiles = ['alice.log', 'bob.log', 'carol.log'];
const watchers = [];

logFiles.forEach(logFile => {
  const logPath = path.join(__dirname, 'logs', logFile);
  const instanceName = logFile.replace('.log', '').toUpperCase();
  
  console.log(`📁 Watching: ${logPath}`);
  
  // Show last few lines first
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').slice(-5).filter(line => line.trim());
    lines.forEach(line => {
      console.log(`[${instanceName}] ${line}`);
    });
  }
  
  // Watch for new content
  let position = 0;
  try {
    const stats = fs.statSync(logPath);
    position = stats.size;
  } catch (e) {
    // File doesn't exist yet
  }
  
  const watcher = fs.watchFile(logPath, { interval: 500 }, (curr, prev) => {
    if (curr.size > position) {
      const stream = fs.createReadStream(logPath, {
        start: position,
        end: curr.size
      });
      
      let buffer = '';
      stream.on('data', chunk => {
        buffer += chunk.toString();
      });
      
      stream.on('end', () => {
        const lines = buffer.split('\n').filter(line => line.trim());
        lines.forEach(line => {
          console.log(`[${instanceName}] ${line}`);
        });
      });
      
      position = curr.size;
    }
  });
  
  watchers.push(() => fs.unwatchFile(logPath));
});

console.log();
console.log('📊 Live log streaming started. Press Ctrl+C to stop.');
console.log();

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping log viewer...');
  watchers.forEach(cleanup => cleanup());
  process.exit(0);
});