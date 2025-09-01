#!/usr/bin/env node

/**
 * mAGIc MCP Setup - Robust, seamless Claude Code integration
 * Usage: npm run setup:mcp
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
  dim: '\x1b[90m',
  reset: '\x1b[0m'
};

function log(message, type = 'info') {
  const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${colors[type]}${prefix} ${message}${colors.reset}`);
}

function checkPrerequisites() {
  const checks = [];
  
  // Check Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    checks.push({ name: 'Node.js', status: 'ok', details: nodeVersion });
  } catch (error) {
    checks.push({ name: 'Node.js', status: 'error', details: 'Not installed' });
  }
  
  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    checks.push({ name: 'npm', status: 'ok', details: `v${npmVersion}` });
  } catch (error) {
    checks.push({ name: 'npm', status: 'error', details: 'Not installed' });
  }
  
  // Check if in project directory
  const packageJson = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJson)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
      if (pkg.name === 'agiforme') {
        checks.push({ name: 'Project location', status: 'ok', details: process.cwd() });
      } else {
        checks.push({ name: 'Project location', status: 'warning', details: 'Wrong project directory?' });
      }
    } catch (error) {
      checks.push({ name: 'Project location', status: 'error', details: 'Invalid package.json' });
    }
  } else {
    checks.push({ name: 'Project location', status: 'error', details: 'Run from agiforme root directory' });
  }
  
  // Check memories directory
  const memoriesDir = path.join(process.cwd(), 'memories');
  if (fs.existsSync(memoriesDir)) {
    checks.push({ name: 'Memories folder', status: 'ok', details: 'Ready' });
  } else {
    checks.push({ name: 'Memories folder', status: 'warning', details: 'Run ./setup.sh first' });
  }
  
  // Check Ollama
  try {
    const ollamaCheck = execSync('curl -s http://localhost:11434/api/tags', { encoding: 'utf8' });
    const data = JSON.parse(ollamaCheck);
    if (data.models && data.models.length > 0) {
      checks.push({ name: 'Ollama AI', status: 'ok', details: `${data.models.length} models` });
    } else {
      checks.push({ name: 'Ollama AI', status: 'warning', details: 'No models - run npm run ai:pull' });
    }
  } catch (error) {
    checks.push({ name: 'Ollama AI', status: 'warning', details: 'Not running - start with: ollama serve' });
  }
  
  return checks;
}

function detectClaudeCodeConfig() {
  // Common Claude Code config locations
  const possiblePaths = [
    path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json'),
    path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
    path.join(os.homedir(), '.claude', 'claude_desktop_config.json')
  ];
  
  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  
  return null;
}

function generateMCPConfig() {
  const projectPath = process.cwd();
  const memoriesPath = path.join(os.homedir(), 'Documents', 'memories');
  
  return {
    mcpServers: {
      magi: {
        command: "npm",
        args: ["run", "magi:mcp"],
        cwd: projectPath,
        env: {
          MEMORIES_DIR: memoriesPath,
          NODE_ENV: "production"
        }
      }
    }
  };
}

function generateSystemInstructions() {
  return `mAGIc Wake Word System:

When the user uses "magi" as a wake word, activate personal AI processing:
- "magi save [content]" → Use ai_save_memory for smart categorization
- "magi [question]" → Use ai_query_memories for personalized answers
- "magi status" → Use ai_status to check system health

Without "magi": Respond normally without accessing personal memories.

Privacy levels: public, team, personal (default), private, sensitive.

Always use BrainBridge tools for magi commands - they provide access to the user's personal knowledge base with full privacy protection.`;
}

function main() {
  console.log(`${colors.info}🧠 mAGIc MCP Setup - Robust & Seamless Integration${colors.reset}\n`);
  
  log('Running prerequisite checks...');
  const checks = checkPrerequisites();
  
  let hasErrors = false;
  let hasWarnings = false;
  
  console.log();
  checks.forEach(check => {
    if (check.status === 'ok') {
      log(`${check.name}: ${check.details}`, 'success');
    } else if (check.status === 'warning') {
      log(`${check.name}: ${check.details}`, 'warning');
      hasWarnings = true;
    } else {
      log(`${check.name}: ${check.details}`, 'error');
      hasErrors = true;
    }
  });
  
  if (hasErrors) {
    console.log(`\n${colors.error}❌ Setup cannot continue - fix errors above first${colors.reset}`);
    process.exit(1);
  }
  
  if (hasWarnings) {
    console.log(`\n${colors.warning}⚠️  Some warnings found - setup will continue but functionality may be limited${colors.reset}`);
  }
  
  console.log(`\n${colors.info}📋 Generated Claude Code MCP Configuration:${colors.reset}\n`);
  
  const config = generateMCPConfig();
  console.log(JSON.stringify(config, null, 2));
  
  console.log(`\n${colors.info}📝 System Instructions for Claude Code:${colors.reset}\n`);
  console.log(`${colors.dim}${generateSystemInstructions()}${colors.reset}`);
  
  const claudeConfigPath = detectClaudeCodeConfig();
  if (claudeConfigPath) {
    console.log(`\n${colors.success}✅ Detected Claude Code config: ${claudeConfigPath}${colors.reset}`);
    console.log(`${colors.info}💡 You can manually add the configuration above, or we can try to merge it automatically.${colors.reset}`);
  } else {
    console.log(`\n${colors.warning}⚠️  Could not auto-detect Claude Code configuration location${colors.reset}`);
    console.log(`${colors.info}💡 Manually add the configuration to your Claude Code MCP settings${colors.reset}`);
  }
  
  console.log(`\n${colors.info}🚀 Next Steps:${colors.reset}`);
  console.log(`${colors.info}   1. Copy the MCP configuration to Claude Code settings${colors.reset}`);
  console.log(`${colors.info}   2. Copy the system instructions to Claude Code${colors.reset}`);
  console.log(`${colors.info}   3. Restart Claude Code completely${colors.reset}`);
  console.log(`${colors.info}   4. Test: "magi status" should work${colors.reset}`);
  
  if (hasWarnings) {
    console.log(`\n${colors.warning}⚙️  Resolve warnings for full functionality:${colors.reset}`);
    console.log(`${colors.warning}   • Missing memories: ./setup.sh${colors.reset}`);
    console.log(`${colors.warning}   • Missing AI models: npm run ai:pull${colors.reset}`);
    console.log(`${colors.warning}   • Ollama not running: ollama serve${colors.reset}`);
  }
  
  console.log(`\n${colors.success}🎯 Success Criteria: "magi status" returns system information${colors.reset}`);
  console.log(`${colors.success}🔐 Privacy: All data stays on your machine${colors.reset}`);
}

main();