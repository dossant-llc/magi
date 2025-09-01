#!/usr/bin/env node

/**
 * Dev Handlers - System query functions for Magi development assistant
 * Provides instant responses to common development questions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getMemoriesPath, getAvailableProfiles, getMemoryStats } = require('./memory-path-utils');

const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  warning: '\x1b[33m',
  info: '\x1b[36m',
  dim: '\x1b[90m',
  reset: '\x1b[0m'
};

/**
 * Check if a process/service is running
 * @param {string|Array} serviceNameOrMatch - Name of service or regex match array
 * @returns {Promise<string>}
 */
async function checkProcess(serviceNameOrMatch) {
  // Handle both service name and match array parameters
  const serviceName = Array.isArray(serviceNameOrMatch) ? serviceNameOrMatch[1] : serviceNameOrMatch;
  try {
    const service = serviceName.toLowerCase();
    let grepPattern;
    let friendlyName;
    let specialCheck = null;
    
    switch (service) {
      case 'bc':
      case 'braincloud':
        // BrainCloud runs on port 8147
        specialCheck = async () => {
          try {
            const portInfo = execSync('lsof -i :8147 2>/dev/null', { encoding: 'utf8' }).trim();
            if (portInfo) {
              const lines = portInfo.split('\n');
              const pid = lines[1] ? lines[1].split(/\s+/)[1] : 'unknown';
              return `${colors.success}☁️ BrainCloud running on port 8147 (PID: ${pid})${colors.reset}`;
            }
            return `${colors.error}☁️ BrainCloud not running${colors.reset}`;
          } catch (e) {
            return `${colors.error}☁️ BrainCloud not running${colors.reset}`;
          }
        };
        break;
      case 'bb':
      case 'brainbridge':
        grepPattern = 'brainbridge.*stdio';
        friendlyName = 'BrainBridge';
        break;
      case 'ollama':
        specialCheck = async () => {
          try {
            const response = execSync('curl -s http://localhost:11434/api/tags', { encoding: 'utf8' });
            const data = JSON.parse(response);
            if (data.models) {
              return `${colors.success}🤖 Ollama running (${data.models.length} models)${colors.reset}`;
            }
            return `${colors.error}🤖 Ollama not running${colors.reset}`;
          } catch (e) {
            return `${colors.error}🤖 Ollama not running${colors.reset}`;
          }
        };
        break;
      case 'bp':
      case 'brain-proxy':
        grepPattern = 'brain-proxy';
        friendlyName = 'Brain Proxy (BP)';
        specialCheck = async () => {
          try {
            const processes = execSync('ps aux | grep "brain-proxy" | grep -v grep', { encoding: 'utf8' }).trim();
            if (processes) {
              return `${colors.success}🔗 Brain Proxy connected${colors.reset}`;
            }
            return `${colors.warning}🔗 Brain Proxy not connected${colors.reset}`;
          } catch (e) {
            return `${colors.warning}🔗 Brain Proxy not connected${colors.reset}`;
          }
        };
        break;
      case 'bx':
      case 'brainxchange':
        grepPattern = 'brainxchange';
        friendlyName = 'BrainXchange (BX)';
        specialCheck = async () => {
          try {
            const processes = execSync('ps aux | grep "brainxchange" | grep -v grep', { encoding: 'utf8' }).trim();
            if (processes) {
              return `${colors.success}🔄 BrainXchange active${colors.reset}`;
            }
            // Check for BX ports
            const bxPorts = execSync('lsof -i :8082,8083,8084 2>/dev/null', { encoding: 'utf8' }).trim();
            if (bxPorts) {
              return `${colors.warning}🔄 BrainXchange service detected${colors.reset}`;
            }
            return `${colors.error}🔄 BrainXchange not active${colors.reset}`;
          } catch (e) {
            return `${colors.error}🔄 BrainXchange not active${colors.reset}`;
          }
        };
        break;
      default:
        grepPattern = service;
        friendlyName = service.charAt(0).toUpperCase() + service.slice(1);
    }
    
    // Use special check if available
    if (specialCheck) {
      return await specialCheck();
    }
    
    const processes = execSync(`ps aux | grep "${grepPattern}" | grep -v grep`, { encoding: 'utf8' }).trim();
    
    if (processes) {
      const lines = processes.split('\n').filter(line => line.trim());
      const pid = lines[0].split(/\s+/)[1];
      return `${colors.success}✅ ${friendlyName} running (PID: ${pid})${colors.reset}`;
    } else {
      return `${colors.error}❌ ${friendlyName} not running${colors.reset}`;
    }
  } catch (error) {
    return `${colors.error}❌ ${serviceName} not running${colors.reset}`;
  }
}

/**
 * Check what's running on a specific port
 * @param {string|number|Array} portOrMatch - Port number or regex match array
 * @returns {Promise<string>}
 */
async function checkPort(portOrMatch) {
  // Handle both port number and match array parameters  
  const port = Array.isArray(portOrMatch) ? portOrMatch[1] : portOrMatch;
  try {
    const result = execSync(`lsof -i :${port} 2>/dev/null`, { encoding: 'utf8' }).trim();
    
    if (result) {
      const lines = result.split('\n');
      if (lines.length > 1) {
        const processLine = lines[1];
        const parts = processLine.split(/\s+/);
        const processName = parts[0];
        const pid = parts[1];
        return `${colors.success}🔗 Port ${port}: ${processName} (PID: ${pid})${colors.reset}`;
      }
    }
    
    return `${colors.dim}📭 Port ${port}: Nothing running${colors.reset}`;
  } catch (error) {
    return `${colors.dim}📭 Port ${port}: Nothing running${colors.reset}`;
  }
}

/**
 * Explain what an npm command does
 * @param {string|Array} commandOrMatch - Command name or regex match array
 * @returns {Promise<string>}
 */
async function explainCommand(commandOrMatch) {
  // Handle both string and match array parameters
  const command = Array.isArray(commandOrMatch) ? commandOrMatch[1] : commandOrMatch;
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const script = packageJson.scripts[command];
    if (script) {
      let explanation = '';
      
      // Add contextual explanations for common commands
      const explanations = {
        'magi': '🧙‍♂️ Interactive CLI - chat with your memories',
        'quick': '⚡ Fastest way to get running (stdio mode)',  
        'dev': '🔧 Start development server',
        'magic': '✨ Run brainbridge magic commands (indexing, etc.)',
        'diag': '🔍 Full system health check',
        'ai:status': '🤖 Check Ollama status and available models',
        'bb:stdio': '📡 Start BrainBridge in stdio mode (for Claude Code)',
        'bb:cli': '💬 Interactive CLI for testing BrainBridge'
      };
      
      if (explanations[command]) {
        explanation = explanations[command];
      }
      
      return `${colors.info}📦 npm run ${command}${explanation ? ' → ' + explanation : ''}${colors.reset}\n${colors.dim}   Actual: ${script}${colors.reset}`;
    } else {
      return `${colors.error}❌ Script '${command}' not found in package.json${colors.reset}`;
    }
  } catch (error) {
    return `${colors.error}❌ Error reading package.json: ${error.message}${colors.reset}`;
  }
}

/**
 * Show comprehensive system status
 * @returns {Promise<string>}
 */
async function systemStatus() {
  let status = `${colors.info}🔍 System Status${colors.reset}\n`;
  
  // Check Ollama
  try {
    const response = execSync('curl -s http://localhost:11434/api/tags', { encoding: 'utf8' });
    const data = JSON.parse(response);
    if (data.models && data.models.length > 0) {
      status += `🤖 Ollama: ${colors.success}✅ Running (${data.models.length} models)${colors.reset}\n`;
    } else {
      status += `🤖 Ollama: ${colors.warning}⚠️ Running but no models${colors.reset}\n`;
    }
  } catch (error) {
    status += `🤖 Ollama: ${colors.error}❌ Not running${colors.reset}\n`;
  }
  
  // Check BrainBridge processes
  try {
    const processes = execSync('ps aux | grep "brainbridge.*stdio" | grep -v grep', { encoding: 'utf8' }).trim();
    if (processes) {
      const count = processes.split('\n').filter(line => line.trim()).length;
      status += `🧠 BrainBridge: ${colors.success}✅ ${count} process${count > 1 ? 'es' : ''}${colors.reset}\n`;
    } else {
      status += `🧠 BrainBridge: ${colors.error}❌ Not running${colors.reset}\n`;
    }
  } catch (error) {
    status += `🧠 BrainBridge: ${colors.error}❌ Not running${colors.reset}\n`;
  }
  
  // Check BrainCloud (BC) - port 8147
  try {
    const bcPort = execSync('lsof -i :8147 2>/dev/null', { encoding: 'utf8' }).trim();
    if (bcPort) {
      status += `☁️ BrainCloud (BC): ${colors.success}✅ Running on port 8147${colors.reset}\n`;
    } else {
      status += `☁️ BrainCloud (BC): ${colors.error}❌ Not running${colors.reset}\n`;
    }
  } catch (error) {
    status += `☁️ BrainCloud (BC): ${colors.error}❌ Not running${colors.reset}\n`;
  }
  
  // Check Brain Proxy (BP) - check for brain-proxy processes
  try {
    const bpProcesses = execSync('ps aux | grep "brain-proxy" | grep -v grep', { encoding: 'utf8' }).trim();
    if (bpProcesses) {
      status += `🔗 Brain Proxy (BP): ${colors.success}✅ Connected${colors.reset}\n`;
    } else {
      status += `🔗 Brain Proxy (BP): ${colors.warning}⚠️ Not connected${colors.reset}\n`;
    }
  } catch (error) {
    status += `🔗 Brain Proxy (BP): ${colors.warning}⚠️ Not connected${colors.reset}\n`;
  }
  
  // Check BrainXchange (BX) - check for brainxchange processes or connections
  try {
    const bxProcesses = execSync('ps aux | grep "brainxchange" | grep -v grep', { encoding: 'utf8' }).trim();
    if (bxProcesses) {
      status += `🔄 BrainXchange (BX): ${colors.success}✅ Active${colors.reset}\n`;
    } else {
      // Check if any BX services might be running on typical ports
      const bxPorts = execSync('lsof -i :8082,8083,8084 2>/dev/null', { encoding: 'utf8' }).trim();
      if (bxPorts) {
        status += `🔄 BrainXchange (BX): ${colors.warning}⚠️ Service detected${colors.reset}\n`;
      } else {
        status += `🔄 BrainXchange (BX): ${colors.error}❌ Not active${colors.reset}\n`;
      }
    }
  } catch (error) {
    status += `🔄 BrainXchange (BX): ${colors.error}❌ Not active${colors.reset}\n`;
  }
  
  // Check key ports
  const ports = [8147, 11434, 3000, 3001];
  let activePortsCount = 0;
  for (const port of ports) {
    try {
      const result = execSync(`lsof -i :${port} 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (result) activePortsCount++;
    } catch (e) {}
  }
  status += `🔗 Ports: ${colors.success}${activePortsCount}/${ports.length} active${colors.reset}\n`;
  
  // Check memories using new profile system
  try {
    // Use the default profile path
    const defaultProfileDir = path.join(process.cwd(), 'data', 'memories', 'profiles', 'default');
    
    if (fs.existsSync(defaultProfileDir)) {
      let totalMemories = 0;
      const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
      for (const level of privacyLevels) {
        const levelDir = path.join(defaultProfileDir, level);
        if (fs.existsSync(levelDir)) {
          const files = fs.readdirSync(levelDir).filter(f => f.endsWith('.md'));
          totalMemories += files.length;
        }
      }
      
      // Show path relative to project for readability
      const displayPath = defaultProfileDir.replace(process.cwd(), '.');
      
      status += `📁 Memories: ${colors.success}${totalMemories} indexed${colors.reset} (${colors.dim}${displayPath}${colors.reset})`;
    } else {
      status += `📁 Memories: ${colors.warning}⚠️ Default profile not found${colors.reset} (${colors.dim}${defaultProfileDir}${colors.reset})`;
    }
  } catch (error) {
    status += `📁 Memories: ${colors.warning}⚠️ Path not accessible${colors.reset}`;
  }
  
  return status;
}

/**
 * List BrainBridge processes
 * @returns {Promise<string>}
 */
async function listProcesses() {
  try {
    const processes = execSync('ps aux | grep "brainbridge" | grep -v grep', { encoding: 'utf8' }).trim();
    
    if (processes) {
      const lines = processes.split('\n').filter(line => line.trim());
      let result = `${colors.info}🔍 BrainBridge Processes (${lines.length}):${colors.reset}\n`;
      
      lines.forEach((line, index) => {
        const parts = line.split(/\s+/);
        const pid = parts[1];
        const cpu = parts[2];
        const mem = parts[3];
        const command = parts.slice(10).join(' ');
        result += `${colors.dim}${index + 1}. PID ${pid} | CPU ${cpu}% | MEM ${mem}% | ${command}${colors.reset}\n`;
      });
      
      return result.trim();
    } else {
      return `${colors.warning}⚠️ No BrainBridge processes running${colors.reset}`;
    }
  } catch (error) {
    return `${colors.error}❌ Error listing processes: ${error.message}${colors.reset}`;
  }
}

/**
 * Show active ports
 * @returns {Promise<string>}
 */
async function showPorts() {
  try {
    const ports = [8147, 8148, 8149, 3000, 3001, 11434];
    let result = `${colors.info}🔗 Port Status:${colors.reset}\n`;
    
    for (const port of ports) {
      try {
        const portInfo = execSync(`lsof -i :${port} 2>/dev/null`, { encoding: 'utf8' }).trim();
        if (portInfo) {
          const lines = portInfo.split('\n');
          if (lines.length > 1) {
            const parts = lines[1].split(/\s+/);
            const processName = parts[0];
            const pid = parts[1];
            result += `  ${colors.success}${port}: ${processName} (PID: ${pid})${colors.reset}\n`;
          }
        } else {
          result += `  ${colors.dim}${port}: Available${colors.reset}\n`;
        }
      } catch (e) {
        result += `  ${colors.dim}${port}: Available${colors.reset}\n`;
      }
    }
    
    return result.trim();
  } catch (error) {
    return `${colors.error}❌ Error checking ports: ${error.message}${colors.reset}`;
  }
}

/**
 * Kill all BrainBridge processes
 * @returns {Promise<string>}
 */
async function killAll() {
  try {
    const processes = execSync('ps aux | grep "brainbridge.*stdio" | grep -v grep', { encoding: 'utf8' }).trim();
    
    if (processes) {
      const lines = processes.split('\n').filter(line => line.trim());
      const pids = lines.map(line => line.split(/\s+/)[1]);
      
      execSync(`kill ${pids.join(' ')}`, { encoding: 'utf8' });
      
      return `${colors.success}✅ Killed ${pids.length} BrainBridge process${pids.length > 1 ? 'es' : ''} (PIDs: ${pids.join(', ')})${colors.reset}`;
    } else {
      return `${colors.warning}⚠️ No BrainBridge processes to kill${colors.reset}`;
    }
  } catch (error) {
    return `${colors.error}❌ Error killing processes: ${error.message}${colors.reset}`;
  }
}

/**
 * Show Ollama models
 * @returns {Promise<string>}
 */
async function showModels() {
  try {
    const response = execSync('curl -s http://localhost:11434/api/tags', { encoding: 'utf8' });
    const data = JSON.parse(response);
    
    if (data.models && data.models.length > 0) {
      let result = `${colors.info}🤖 Ollama Models (${data.models.length}):${colors.reset}\n`;
      data.models.forEach((model, index) => {
        const sizeGB = (model.size / 1e9).toFixed(1);
        result += `${colors.dim}${index + 1}. ${model.name} (${sizeGB}GB)${colors.reset}\n`;
      });
      return result.trim();
    } else {
      return `${colors.warning}⚠️ Ollama running but no models installed${colors.reset}`;
    }
  } catch (error) {
    return `${colors.error}❌ Ollama not running or unreachable${colors.reset}`;
  }
}

/**
 * Show recent logs + companion streaming info
 * @returns {Promise<string>}
 */
async function showLogs() {
  let output = `${colors.info}📋 Recent BrainBridge Activity${colors.reset}\n`;
  
  try {
    // Try to get recent log entries
    const logFile = path.join(process.cwd(), 'brainbridge', 'logs', 'brainbridge-mcp.log');
    
    if (fs.existsSync(logFile)) {
      const logs = execSync(`tail -10 "${logFile}"`, { encoding: 'utf8' }).trim();
      if (logs) {
        output += `${colors.dim}Recent logs:\n${logs}${colors.reset}\n\n`;
      } else {
        output += `${colors.dim}Log file is empty${colors.reset}\n\n`;
      }
    } else {
      output += `${colors.dim}No log file found at: ${logFile}${colors.reset}\n\n`;
    }
  } catch (error) {
    output += `${colors.dim}Could not read recent logs${colors.reset}\n\n`;
  }
  
  // Show companion streaming info
  output += `${colors.info}🔄 Live Log Streaming:${colors.reset}\n`;
  output += `${colors.success}Terminal 1 (logs):${colors.reset} ${colors.dim}npm run bb:logs${colors.reset}\n`;
  output += `${colors.success}Terminal 2 (magi):${colors.reset} ${colors.dim}npm run magi${colors.reset}\n\n`;
  output += `${colors.warning}💡 Pro tip: Open a second terminal with 'npm run bb:logs' for live streaming!${colors.reset}`;
  
  return output;
}

/**
 * Restart a service
 * @param {string|Array} serviceOrMatch - Service name or regex match array
 * @returns {Promise<string>}
 */
async function restartService(serviceOrMatch) {
  // Handle both service name and match array parameters
  const service = Array.isArray(serviceOrMatch) ? serviceOrMatch[1] : serviceOrMatch;
  const serviceMap = {
    'bb': 'BrainBridge',
    'brainbridge': 'BrainBridge',
    'bc': 'BrainCloud', 
    'braincloud': 'BrainCloud',
    'ollama': 'Ollama'
  };
  
  const friendlyName = serviceMap[service.toLowerCase()] || service;
  return `${colors.info}💡 To restart ${friendlyName}, use: npm run kill && npm run quick${colors.reset}`;
}

/**
 * Clear screen
 * @returns {Promise<string>}
 */
async function clearScreen() {
  console.clear();
  return '';
}

/**
 * Exit magi gracefully
 * @returns {Promise<string>}
 */
async function exitMagi() {
  console.log(`${colors.system}👋 Goodbye!${colors.reset}`);
  process.exit(0);
}


/**
 * Show memory storage path and info
 * @returns {Promise<string>}
 */
async function showMemoryPath() {
  // Use centralized path resolution
  const memoriesDir = getMemoriesPath('default');
  const profiles = getAvailableProfiles();
  const stats = getMemoryStats('default');
  
  let output = `${colors.info}📁 Memory Storage Location${colors.reset}\n\n`;
  output += `${colors.success}Path:${colors.reset} ${memoriesDir}\n`;
  output += `${colors.info}Profile:${colors.reset} default\n`;
  
  if (stats.exists) {
    output += `${colors.success}Status:${colors.reset} ✅ Directory exists\n\n`;
    
    output += `${colors.info}Privacy Levels:${colors.reset}\n`;
    const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
    for (const level of privacyLevels) {
      const count = stats.levels[level] || 0;
      if (count > 0) {
        output += `  ${colors.dim}${level}:${colors.reset} ${count} memories\n`;
      } else {
        output += `  ${colors.dim}${level}:${colors.reset} ${colors.warning}empty${colors.reset}\n`;
      }
    }
    
    output += `\n${colors.success}Total memories:${colors.reset} ${stats.total}`;
    
    // Show available profiles if more than just default
    if (profiles.length > 1) {
      output += `\n\n${colors.info}Available profiles:${colors.reset} ${profiles.join(', ')}`;
      output += `\n${colors.dim}Use: magi use <profile> (future feature)${colors.reset}`;
    }
  } else {
    output += `${colors.error}Status:${colors.reset} ❌ Directory does not exist\n`;
    output += `${colors.warning}Create with:${colors.reset} ${colors.dim}npm run setup${colors.reset}`;
  }
  
  return output;
}

/**
 * Show help for dev commands
 * @returns {Promise<string>}
 */
async function showHelp() {
  const { getPatternHelp } = require('./dev-patterns');
  return getPatternHelp();
}

/**
 * Bootstrap/setup the system with dependencies, models, etc.
 * @returns {Promise<string>}
 */
async function bootstrapSystem() {
  try {
    console.log(`${colors.info}🔄 Bootstrapping AGIfor.me system...${colors.reset}\n`);
    
    // Run the bootstrap command
    const result = execSync('npm run bootstrap', { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    return `${colors.success}✅ Bootstrap completed successfully!${colors.reset}`;
  } catch (error) {
    return `${colors.error}❌ Bootstrap failed: ${error.message}${colors.reset}\n${colors.info}💡 Try running: npm run diag${colors.reset}`;
  }
}

/**
 * Save content to memories using magic save
 * @param {string|Array} contentOrMatch - Content to save or regex match array
 * @returns {Promise<string>}
 */
async function saveMemory(contentOrMatch) {
  try {
    // Handle both direct content and match array parameters
    let content;
    if (Array.isArray(contentOrMatch)) {
      // Extract content from regex match - everything after "save "
      const fullMatch = contentOrMatch[0];
      content = fullMatch.replace(/^.*?save\s+/i, '').trim();
    } else {
      content = contentOrMatch;
    }
    
    if (!content) {
      return `${colors.warning}⚠️ No content provided. Usage: save your important information here${colors.reset}`;
    }
    
    console.log(`${colors.info}💾 Saving to memories...${colors.reset}`);
    
    // Use magic save command
    const result = execSync(`npm run magic save "${content.replace(/"/g, '\\"')}"`, { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    return `${colors.success}✅ Memory saved successfully!${colors.reset}`;
  } catch (error) {
    return `${colors.error}❌ Failed to save memory: ${error.message}${colors.reset}`;
  }
}

/**
 * Query memories using magic query
 * @param {string|Array} queryOrMatch - Query to search or regex match array
 * @returns {Promise<string>}
 */
async function queryMemories(queryOrMatch) {
  try {
    // Handle both direct query and match array parameters
    let query;
    if (Array.isArray(queryOrMatch)) {
      // Extract query from regex match - everything after "query " or similar
      const fullMatch = queryOrMatch[0];
      query = fullMatch.replace(/^.*?(query|what|search)\s+/i, '').trim();
    } else {
      query = queryOrMatch;
    }
    
    if (!query) {
      return `${colors.warning}⚠️ No query provided. Usage: query what did I learn about X?${colors.reset}`;
    }
    
    console.log(`${colors.info}🔍 Searching memories...${colors.reset}`);
    
    // Use magic query command
    const result = execSync(`npm run magic query "${query.replace(/"/g, '\\"')}"`, { 
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    return `${colors.success}✅ Search completed!${colors.reset}`;
  } catch (error) {
    return `${colors.error}❌ Failed to query memories: ${error.message}${colors.reset}`;
  }
}

/**
 * Show available profiles
 * @returns {Promise<string>}
 */
async function showProfiles() {
  try {
    const profiles = getAvailableProfiles();
    
    if (profiles.length === 0) {
      return `${colors.warning}⚠️ No profiles found. Run: npm run setup${colors.reset}`;
    }
    
    let output = `${colors.info}📁 Available Profiles (${profiles.length}):${colors.reset}\n\n`;
    
    for (const profile of profiles) {
      const stats = getMemoryStats(profile);
      const isDefault = profile === 'default' ? ' (default)' : '';
      const statusIcon = stats.exists ? '✅' : '❌';
      
      output += `${statusIcon} ${colors.success}${profile}${isDefault}${colors.reset}`;
      if (stats.exists) {
        output += ` - ${colors.dim}${stats.total} memories${colors.reset}`;
      } else {
        output += ` - ${colors.warning}not created${colors.reset}`;
      }
      output += '\n';
    }
    
    output += `\n${colors.info}💡 Future feature:${colors.reset} ${colors.dim}magi use <profile> to switch profiles${colors.reset}`;
    
    return output;
  } catch (error) {
    return `${colors.error}❌ Error listing profiles: ${error.message}${colors.reset}`;
  }
}

module.exports = {
  checkProcess,
  checkPort,
  explainCommand,
  systemStatus,
  listProcesses,
  showPorts,
  killAll,
  showModels,
  showLogs,
  restartService,
  clearScreen,
  showHelp,
  showMemoryPath,
  exitMagi,
  bootstrapSystem,
  saveMemory,
  queryMemories,
  showProfiles
};