const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { colors } = require('./common');
const { getProjectRoot } = require('./path-utils');

// Configure global error handler
process.on('uncaughtException', (error) => {
  console.error(`${colors.error}❌ Uncaught error: ${error.message}${colors.reset}`);
  releaseLock();
  process.exit(1);
});

// Cleanup on exit
process.on('exit', () => {
  releaseLock();
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log(`\n${colors.system}🛑 Received SIGTERM, cleaning up...${colors.reset}`);
  releaseLock();
  process.exit(0);
});

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
        // Process is dead but lock file exists - this is a stale lock
        console.log(`${colors.warning}⚠️ Found stale lock file from non-running process${colors.reset}`);
        console.log(`${colors.system}📍 Stale lock details:${colors.reset}`);
        console.log(`   PID: ${lockData.pid} (not running)`);
        console.log(`   Started: ${new Date(lockData.started).toLocaleString()}`);
        console.log(`   Mode: ${lockData.dev ? 'development (--dev)' : 'production'}`);
        console.log(`${colors.success}🧹 Cleaning up stale lock and proceeding with startup...${colors.reset}\n`);
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
  } catch (error) {
    console.error(`${colors.error}❌ Lock acquisition failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(lockFile)) {
      const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      if (lockData.pid === process.pid) {
        fs.unlinkSync(lockFile);
      }
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
}

// Main startup execution
console.log(`${colors.system}🔄 Starting BrainBridge service...${colors.reset}`);
acquireLock();

const projectRoot = getProjectRoot();
const brainbridgeService = path.join(projectRoot, 'services', 'brainbridge');

// Check if BrainBridge service exists
if (!fs.existsSync(brainbridgeService)) {
  console.error(`${colors.error}❌ BrainBridge service not found at: ${brainbridgeService}${colors.reset}`);
  process.exit(1);
}

// Start BrainBridge
console.log(`${colors.info}🚀 Launching BrainBridge...${colors.reset}`);
const child = spawn('npm', ['run', 'start'], {
  cwd: brainbridgeService,
  stdio: 'inherit',
  detached: false
});

child.on('close', (code) => {
  console.log(`${colors.system}BrainBridge process exited with code ${code}${colors.reset}`);
  releaseLock();
  process.exit(code);
});

child.on('error', (error) => {
  console.error(`${colors.error}❌ BrainBridge startup failed: ${error.message}${colors.reset}`);
  releaseLock();
  process.exit(1);
});
