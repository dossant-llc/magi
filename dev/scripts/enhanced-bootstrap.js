#!/usr/bin/env node

/**
 * Enhanced Bootstrap Script for AGIfor.me
 * Provides a complete, user-friendly setup experience with progress tracking
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const colors = {
  title: '\x1b[1m\x1b[36m',    // Bold cyan
  success: '\x1b[32m',         // Green
  error: '\x1b[31m',           // Red
  warning: '\x1b[33m',         // Yellow
  info: '\x1b[36m',            // Cyan
  dim: '\x1b[90m',             // Gray
  reset: '\x1b[0m'             // Reset
};

// Progress tracking
let currentStep = 0;
let totalSteps = 6;

function showStep(step, description) {
  currentStep = step;
  console.log(`${colors.info}[${step}/${totalSteps}] ${description}${colors.reset}`);
}

function showSuccess(message) {
  console.log(`${colors.success}✅ ${message}${colors.reset}`);
}

function showError(message) {
  console.log(`${colors.error}❌ ${message}${colors.reset}`);
}

function showWarning(message) {
  console.log(`${colors.warning}⚠️ ${message}${colors.reset}`);
}

function showInfo(message) {
  console.log(`${colors.dim}   ${message}${colors.reset}`);
}

function runCommand(command, description, options = {}) {
  try {
    showInfo(`Running: ${command}`);
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return { success: true, output: result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.output ? error.output.toString() : ''
    };
  }
}

function checkPrerequisites() {
  showStep(1, 'Checking prerequisites...');
  
  // Check Node.js version
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      showError(`Node.js ${nodeVersion} is too old. Need v18+`);
      showInfo('Please upgrade Node.js: https://nodejs.org/');
      process.exit(1);
    }
    showSuccess(`Node.js ${nodeVersion} ✓`);
  } catch (error) {
    showError('Node.js not found');
    process.exit(1);
  }
  
  // Check Git
  try {
    const gitResult = runCommand('git --version', 'Check Git', { silent: true });
    if (gitResult.success) {
      showSuccess('Git available ✓');
    } else {
      showError('Git not found - please install Git');
      process.exit(1);
    }
  } catch (error) {
    showError('Git not found - please install Git');
    process.exit(1);
  }
  
  // Check available RAM
  const totalRAM = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  if (totalRAM < 8) {
    showWarning(`Only ${totalRAM}GB RAM detected. 8GB+ recommended for AI models`);
    showInfo('Local AI models may run slowly with less RAM');
  } else {
    showSuccess(`${totalRAM}GB RAM available ✓`);
  }
  
  // Check available disk space
  try {
    const stats = fs.statSync(process.cwd());
    showInfo('Disk space check passed ✓');
  } catch (error) {
    showWarning('Could not check disk space');
  }
  
  console.log('');
}

function installDependencies() {
  showStep(2, 'Installing dependencies...');
  
  // Main dependencies
  const installResult = runCommand('npm install', 'Install main dependencies');
  if (!installResult.success) {
    showError('Failed to install main dependencies');
    showInfo(installResult.error);
    process.exit(1);
  }
  showSuccess('Main dependencies installed');
  
  // Workspace dependencies
  const workspaceResult = runCommand('npm run install:all', 'Install workspace dependencies');
  if (!workspaceResult.success) {
    showError('Failed to install workspace dependencies');
    showInfo(workspaceResult.error);
    process.exit(1);
  }
  showSuccess('Workspace dependencies installed');
  
  console.log('');
}

function setupMemoryStructure() {
  showStep(3, 'Setting up your memory structure...');
  
  // Create .env if it doesn't exist
  if (!fs.existsSync('.env')) {
    try {
      fs.copyFileSync('config/env.template', '.env');
      showSuccess('Created .env configuration file');
    } catch (error) {
      showError('Could not create .env file');
      showInfo('You may need to copy config/env.template to .env manually');
      process.exit(1);
    }
  } else {
    showInfo('.env already exists - keeping your configuration');
  }
  
  // Run setup script
  const setupResult = runCommand('npm run setup', 'Create memory directories');
  if (!setupResult.success) {
    // Setup might fail if directories already exist - that's okay
    if (setupResult.error.includes('exists')) {
      showSuccess('Memory structure already exists');
    } else {
      showError('Memory setup failed');
      showInfo(setupResult.error);
      process.exit(1);
    }
  } else {
    showSuccess('Memory structure created');
  }
  
  // Verify memory structure
  const profilePath = path.join(process.cwd(), 'data', 'memories', 'profiles', 'default');
  if (fs.existsSync(profilePath)) {
    showSuccess(`Default profile created at: ${profilePath}`);
  } else {
    showError('Memory structure not found after setup');
    process.exit(1);
  }
  
  console.log('');
}

function setupLocalAI() {
  showStep(4, 'Setting up local AI (Ollama)...');
  
  // Check if Ollama is installed
  const ollamaCheck = runCommand('ollama --version', 'Check Ollama', { silent: true });
  if (!ollamaCheck.success) {
    showError('Ollama not found');
    showInfo('Please install Ollama:');
    showInfo('  macOS: brew install ollama');
    showInfo('  Other: https://ollama.ai/download');
    showInfo('Then run: ollama serve');
    process.exit(1);
  }
  showSuccess('Ollama installed ✓');
  
  // Check if Ollama is running
  const ollamaStatus = runCommand('curl -s http://localhost:11434/api/tags', 'Check Ollama service', { silent: true });
  if (!ollamaStatus.success) {
    showError('Ollama service not running');
    showInfo('Please start Ollama in another terminal:');
    showInfo('  ollama serve');
    showInfo('Then re-run bootstrap');
    process.exit(1);
  }
  showSuccess('Ollama service running ✓');
  
  // Download AI models
  showInfo('Downloading AI models (this may take 10-15 minutes)...');
  const aiResult = runCommand('npm run ai:pull', 'Download AI models');
  if (!aiResult.success) {
    showError('Failed to download AI models');
    showInfo(aiResult.error);
    showInfo('You can retry later with: npm run ai:pull');
  } else {
    showSuccess('AI models downloaded successfully');
  }
  
  console.log('');
}

function validateSetup() {
  showStep(5, 'Validating setup...');
  
  // Run diagnostics
  const diagResult = runCommand('npm run diag', 'System diagnostics', { silent: true });
  if (diagResult.success) {
    showSuccess('All system checks passed ✓');
  } else {
    showWarning('Some system checks failed');
    showInfo('Run "npm run diag" later to see detailed status');
  }
  
  // Check memory stats
  try {
    const memStatsResult = runCommand('npm run mem:stats', 'Memory statistics', { silent: true });
    if (memStatsResult.success) {
      showSuccess('Memory system ready ✓');
    }
  } catch (error) {
    showInfo('Memory statistics unavailable (normal for new setup)');
  }
  
  console.log('');
}

function showCompletionMessage() {
  showStep(6, 'Setup complete!');
  
  console.log(`${colors.title}🎉 AGIfor.me Bootstrap Complete!${colors.reset}`);
  console.log('');
  console.log(`${colors.success}✅ Your personal AI memory system is ready!${colors.reset}`);
  console.log('');
  console.log(`${colors.info}🚀 Next Steps:${colors.reset}`);
  console.log('');
  console.log(`${colors.dim}1. Start the system:${colors.reset}`);
  console.log('   npm run start');
  console.log('');
  console.log(`${colors.dim}2. Try saving your first memory:${colors.reset}`);
  console.log('   # In Claude Code, type:');
  console.log('   magi save "Remember to run diagnostics when things look broken"');
  console.log('');
  console.log(`${colors.dim}3. Query your memories:${colors.reset}`);
  console.log('   # In Claude Code, type:');
  console.log('   magi what do I know about troubleshooting?');
  console.log('');
  console.log(`${colors.dim}4. Interactive mode:${colors.reset}`);
  console.log('   npm run magi');
  console.log('');
  console.log(`${colors.info}💡 Want ChatGPT integration?${colors.reset}`);
  console.log('   See: COMPLETE_USER_JOURNEY.md → Track 2');
  console.log('');
  console.log(`${colors.info}🔧 Need help?${colors.reset}`);
  console.log('   npm run diag     # System health check');
  console.log('   npm run help     # Show all commands');
  console.log('');
  console.log(`${colors.dim}📖 Documentation: docs/setup/GETTING_STARTED.md${colors.reset}`);
  console.log(`${colors.dim}🌟 Full journey guide: COMPLETE_USER_JOURNEY.md${colors.reset}`);
  console.log('');
}

// Main bootstrap process
async function main() {
  console.log(`${colors.title}🧠 AGIfor.me Enhanced Bootstrap${colors.reset}`);
  console.log(`${colors.dim}Setting up your personal AI memory system...${colors.reset}`);
  console.log('');
  
  try {
    checkPrerequisites();
    installDependencies();
    setupMemoryStructure();
    setupLocalAI();
    validateSetup();
    showCompletionMessage();
  } catch (error) {
    showError(`Bootstrap failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\\n${colors.warning}Bootstrap interrupted${colors.reset}`);
  console.log('You can resume by running: npm run bootstrap');
  process.exit(0);
});

main().catch(error => {
  showError(`Unexpected error: ${error.message}`);
  process.exit(1);
});