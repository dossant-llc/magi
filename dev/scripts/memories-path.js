#!/usr/bin/env node

/**
 * Memory Path Manager - Super simple memory location management
 * Usage: npm run mem:path [location]
 */

const fs = require('fs');
const path = require('path');

// Load root .env configuration
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const colors = {
  success: '\x1b[32m',
  info: '\x1b[36m',
  warning: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const prefix = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${colors[type]}${prefix} ${message}${colors.reset}`);
}

function getCurrentMemoriesPath() {
  // Custom path overrides everything (advanced users)
  if (process.env.MEMORIES_DIR) {
    return {
      path: process.env.MEMORIES_DIR,
      source: 'custom MEMORIES_DIR'
    };
  }
  
  // Simple location flag
  const location = process.env.MEMORIES_LOCATION || 'project';
  
  if (location === 'documents') {
    return {
      path: path.join(require('os').homedir(), 'Documents', 'memories'),
      source: 'MEMORIES_LOCATION=documents'
    };
  }
  
  // Default: project root  
  return {
    path: path.join(process.cwd(), 'memories'),
    source: 'default (project root)'
  };
}

function setMemoriesLocation(location) {
  const envFile = path.join(process.cwd(), '.env');
  
  // Validate location
  if (!['project', 'documents'].includes(location) && !location.startsWith('/')) {
    log(`Invalid location: ${location}`, 'warning');
    log('Use: "project", "documents", or a full path');
    return;
  }
  
  // Read existing .env or create new one
  let envContent = '';
  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf8');
  } else {
    log('Creating .env file');
    envContent = `# AGIfor.me Simple Configuration
MEMORIES_LOCATION=project
OLLAMA_HOST=127.0.0.1
OLLAMA_PORT=11434
NODE_ENV=development
`;
  }
  
  if (location === 'project' || location === 'documents') {
    // Simple location setting
    if (envContent.match(/^MEMORIES_LOCATION=/m)) {
      envContent = envContent.replace(/^MEMORIES_LOCATION=.+$/m, `MEMORIES_LOCATION=${location}`);
    } else {
      envContent = `MEMORIES_LOCATION=${location}\n${envContent}`;
    }
    
    // Remove any custom MEMORIES_DIR if switching to simple mode
    envContent = envContent.replace(/^MEMORIES_DIR=.+$/m, '').replace(/\n\n+/g, '\n\n');
  } else {
    // Custom path
    if (envContent.match(/^MEMORIES_DIR=/m)) {
      envContent = envContent.replace(/^MEMORIES_DIR=.+$/m, `MEMORIES_DIR=${location}`);
    } else {
      envContent += `\n# Custom memory location\nMEMORIES_DIR=${location}\n`;
    }
    
    // Remove simple location flag when using custom path
    envContent = envContent.replace(/^MEMORIES_LOCATION=.+$/m, '').replace(/\n\n+/g, '\n\n');
  }
  
  // Write back to .env
  fs.writeFileSync(envFile, envContent);
  log(`Updated memory location in ${envFile}`, 'success');
}

function main() {
  const args = process.argv.slice(2);
  
  console.log(`${colors.info}📁 Simple Memory Path Manager${colors.reset}\n`);
  
  if (args.length === 0) {
    // Show current path
    const current = getCurrentMemoriesPath();
    log(`Current memories path: ${current.path}`);
    log(`Source: ${current.source}`);
    
    // Check if path exists
    if (fs.existsSync(current.path)) {
      const files = fs.readdirSync(current.path);
      const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
      const foundLevels = privacyLevels.filter(level => files.includes(level));
      
      if (foundLevels.length > 0) {
        log(`Found privacy levels: ${foundLevels.join(', ')}`, 'success');
      } else {
        log('Directory exists but no privacy levels found', 'warning');
      }
    } else {
      log('Path does not exist!', 'warning');
      log('Run ./setup.sh to create memory structure');
    }
    
    console.log(`\n${colors.info}💡 Usage:${colors.reset}`);
    console.log(`${colors.info}   npm run mem:path project     # Store in ./memories/${colors.reset}`);
    console.log(`${colors.info}   npm run mem:path documents   # Store in ~/Documents/memories/${colors.reset}`);
    console.log(`${colors.info}   npm run mem:path /custom/path # Store anywhere${colors.reset}`);
    
  } else {
    // Set new location
    const location = args[0];
    setMemoriesLocation(location);
    
    // Show updated info
    console.log();
    const updated = getCurrentMemoriesPath();
    log(`New memories path: ${updated.path}`, 'success');
    log(`Source: ${updated.source}`);
    
    console.log(`\n${colors.warning}⚠️  Remember to restart services:${colors.reset}`);
    console.log(`${colors.warning}   • Stop current server (Ctrl+C)${colors.reset}`);
    console.log(`${colors.warning}   • npm run dev${colors.reset}`);
    console.log(`${colors.warning}   • Restart Claude Code if using MCP${colors.reset}`);
  }
}

main();