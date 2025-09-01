const fs = require('fs');
const path = require('path');

// Simulate the same path calculation as in the server
const logFile = path.join(__dirname, 'logs', 'brainbridge-mcp.log');
console.log('Log file path:', logFile);

// Test logging
const timestamp = new Date().toISOString();
const logMessage = `${timestamp}: TEST LOG MESSAGE - Server would write here\n`;

try {
  // Ensure logs directory exists
  const logDir = path.dirname(logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log('Created logs directory');
  }
  fs.appendFileSync(logFile, logMessage);
  console.log('Successfully wrote test log message');
} catch (error) {
  console.error('Failed to write to log file:', error);
}