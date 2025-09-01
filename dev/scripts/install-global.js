#!/usr/bin/env node

/**
 * Global mAGIc Installation - Make 'magi' work from anywhere
 * Usage: npm run install:global
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const colors = {
  success: '\x1b[32m',
  info: '\x1b[36m',
  warning: '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${colors[type]}${prefix} ${message}${colors.reset}`);
}

function createGlobalScript() {
  const projectPath = process.cwd();
  const scriptContent = `#!/usr/bin/env node

// Global mAGIc launcher - auto-generated
const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '${projectPath}';

// Start MCP server
const server = spawn('npm', ['run', 'magi:mcp'], {
  cwd: PROJECT_PATH,
  stdio: 'inherit',
  env: {
    ...process.env,
    MEMORIES_DIR: process.env.MEMORIES_DIR || path.join(require('os').homedir(), 'Documents', 'memories')
  }
});

server.on('error', (err) => {
  console.error('❌ Failed to start mAGIc:', err.message);
  console.error('💡 Make sure you run this from the agiforme project directory first');
  process.exit(1);
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});
`;

  return scriptContent;
}

function installGlobal() {
  try {
    // Create the global script content
    const scriptContent = createGlobalScript();
    
    // Write to a temporary file in the project
    const tempScript = path.join(process.cwd(), 'magi-global.js');
    fs.writeFileSync(tempScript, scriptContent);
    
    // Make it executable
    fs.chmodSync(tempScript, '755');
    
    // Install globally using npm link
    log('Installing mAGIc globally...');
    
    // Create a package.json for the global command
    const globalPackage = {
      name: 'magi-global',
      version: '1.0.0',
      bin: {
        'magi': './magi-global.js'
      },
      description: 'Global mAGIc command launcher'
    };
    
    const originalPackage = fs.readFileSync('package.json', 'utf8');
    fs.writeFileSync('package.json', JSON.stringify({
      ...JSON.parse(originalPackage),
      bin: {
        'magi': './magi-global.js'
      }
    }, null, 2));
    
    try {
      execSync('npm link', { stdio: 'inherit' });
      log('mAGIc installed globally!', 'success');
    } catch (error) {
      log('Failed to install globally - trying with sudo...', 'warning');
      try {
        execSync('sudo npm link', { stdio: 'inherit' });
        log('mAGIc installed globally with sudo!', 'success');
      } catch (sudoError) {
        throw new Error('Global installation failed. Try running as administrator.');
      }
    }
    
    // Restore original package.json
    fs.writeFileSync('package.json', originalPackage);
    
    return true;
  } catch (error) {
    log(`Global installation failed: ${error.message}`, 'error');
    return false;
  }
}

function generateSimpleMCPConfig() {
  return {
    mcpServers: {
      magi: {
        command: "magi"
      }
    }
  };
}

function main() {
  console.log(`${colors.info}🌍 mAGIc Global Installation${colors.reset}\n`);
  
  log('This will install "magi" command globally, so Claude Code can use it from anywhere');
  
  if (installGlobal()) {
    console.log(`\n${colors.success}🎉 Installation Complete!${colors.reset}\n`);
    
    log('Claude Code MCP Configuration (SUPER SIMPLE):');
    console.log();
    console.log(JSON.stringify(generateSimpleMCPConfig(), null, 2));
    
    console.log(`\n${colors.info}💡 Benefits:${colors.reset}`);
    console.log(`${colors.info}   • No path configuration needed${colors.reset}`);
    console.log(`${colors.info}   • Works from any directory${colors.reset}`);
    console.log(`${colors.info}   • Automatic memory path detection${colors.reset}`);
    console.log(`${colors.info}   • Just restart Claude Code and it works${colors.reset}`);
    
    console.log(`\n${colors.success}✅ Test: Run 'magi' in terminal - should start MCP server${colors.reset}`);
  } else {
    console.log(`\n${colors.error}❌ Installation failed. Use manual setup instead.${colors.reset}`);
    process.exit(1);
  }
}

main();