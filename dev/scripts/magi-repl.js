#!/usr/bin/env node

/**
 * 🧙 MAGI Interactive REPL
 * 
 * The main interactive interface for your personal AI memory bank.
 * Supports persona-based contexts and rich conversational AI.
 */

const readline = require('readline');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Import configuration and utilities
const { getProjectRoot, getMemoriesPath } = require('./path-utils');

// Load personas from profile-specific location
function loadPersonas(profile = 'default') {
  const personasPath = path.join(getMemoriesPath(profile), 'personas.js');
  
  if (!fs.existsSync(personasPath)) {
    console.error(`❌ Personas config not found at: ${personasPath}`);
    process.exit(1);
  }
  
  // Clear require cache to ensure fresh load
  delete require.cache[require.resolve(personasPath)];
  
  return require(personasPath);
}

const personas = loadPersonas();

// ANSI Colors for rich terminal output
const colors = {
  // Persona colors
  personal: '\x1b[94m',    // Bright blue
  work: '\x1b[92m',        // Bright green  
  dev: '\x1b[95m',         // Bright magenta
  creative: '\x1b[93m',    // Bright yellow
  family: '\x1b[91m',      // Bright red
  research: '\x1b[96m',    // Bright cyan
  
  // UI colors
  prompt: '\x1b[36m',      // Cyan
  success: '\x1b[92m',     // Bright green
  error: '\x1b[91m',       // Bright red
  warning: '\x1b[93m',     // Bright yellow
  hint: '\x1b[90m',        // Dark gray
  system: '\x1b[33m',      // Yellow
  info: '\x1b[36m',        // Cyan
  reset: '\x1b[0m',        // Reset
  bold: '\x1b[1m',         // Bold
  dim: '\x1b[2m'           // Dim
};

class MagiREPL {
  constructor() {
    this.currentPersona = 'personal'; // Default persona for v0.1.1-rc1
    this.sessionActive = true;
    this.commandHistory = [];

    // Clean up old stdio sessions on startup
    this.cleanupOldStdioSessions();

    // Initialize readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPrompt(),
      completer: this.completer.bind(this)
    });
    
    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      console.log(`\n${colors.hint}👋 Goodbye! Your thoughts are safe with me.${colors.reset}`);
      this.exit();
    });
    
    // Handle line input
    this.rl.on('line', this.handleInput.bind(this));
  }
  
  /**
   * Generate the current prompt based on active persona
   */
  getPrompt() {
    const basePrompt = `${colors.prompt}🧙 magi${colors.reset}`;

    const persona = personas[this.currentPersona];
    if (!persona) return `${basePrompt} > `;

    const personaColor = colors[this.currentPersona] || colors.reset;
    return `${basePrompt} > ${personaColor}${persona.emoji} ${persona.name.toLowerCase()}${colors.reset} > `;
  }
  
  /**
   * Update prompt when persona changes
   */
  updatePrompt() {
    this.rl.setPrompt(this.getPrompt());
  }

  /**
   * Clean up old stdio sessions on startup
   */
  cleanupOldStdioSessions() {
    try {
      const { execSync } = require('child_process');

      // Find all stdio processes with their elapsed time
      const processes = execSync('ps axo pid,etime,command | grep "src/server.ts stdio" | grep -v grep', { encoding: 'utf8' }).trim();

      if (!processes) return;

      const lines = processes.split('\n');
      const toKill = [];
      const oneHourMs = 60 * 60 * 1000;

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[0];
        const etime = parts[1]; // Format: [[DD-]hh:]mm:ss or mm:ss

        // Parse elapsed time to milliseconds
        let totalMs = 0;
        if (etime.includes('-')) {
          // Format: DD-hh:mm:ss
          const [days, time] = etime.split('-');
          const [hours, minutes, seconds] = time.split(':').map(Number);
          totalMs = (parseInt(days) * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000;
        } else {
          const timeParts = etime.split(':').map(Number);
          if (timeParts.length === 3) {
            // Format: hh:mm:ss
            const [hours, minutes, seconds] = timeParts;
            totalMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
          } else {
            // Format: mm:ss
            const [minutes, seconds] = timeParts;
            totalMs = (minutes * 60 + seconds) * 1000;
          }
        }

        // Kill processes older than 1 hour
        if (totalMs > oneHourMs) {
          toKill.push(pid);
        }
      }

      if (toKill.length > 0) {
        console.log(`${colors.system}🧹 Cleaning up ${toKill.length} old stdio sessions (>1h)...${colors.reset}`);
        execSync(`kill ${toKill.join(' ')}`, { stdio: 'pipe' });
        console.log(`${colors.success}✅ Cleaned up old sessions${colors.reset}`);
      }
    } catch (error) {
      // Silently ignore cleanup errors - don't block startup
    }
  }
  
  /**
   * Tab completion for commands
   */
  completer(line) {
    const commands = [
      'help', 'exit', 'quit', 'clear', 'status', 'cd', 'pwd', 'ls',
      'save', 'search', 'recent', 'stats', 'history'
    ];
    
    // Add persona-specific commands
    const persona = personas[this.currentPersona];
    if (persona && persona.commands) {
      commands.push(...persona.commands);
    }
    
    // Add persona names for 'cd' command
    if (line.startsWith('cd ')) {
      const personaNames = ['root', '..', ...Object.keys(personas)];
      const hits = personaNames.filter(name => name.startsWith(line.slice(3)));
      return [hits, line];
    }
    
    const hits = commands.filter(cmd => cmd.startsWith(line));
    return [hits, line];
  }
  
  /**
   * Handle user input and route to appropriate handlers
   */
  async handleInput(input) {
    const trimmed = input.trim();
    
    if (!trimmed) {
      this.rl.prompt();
      return;
    }
    
    // Add to history
    this.commandHistory.push(trimmed);
    
    // Parse command and arguments
    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    try {
      await this.executeCommand(command, args, trimmed);
    } catch (error) {
      console.log(`${colors.error}❌ Error: ${error.message}${colors.reset}`);
    }
    
    if (this.sessionActive) {
      this.rl.prompt();
    }
  }
  
  /**
   * Execute a command based on input
   */
  async executeCommand(command, args, fullInput) {
    switch (command) {
      case 'help':
      case '?':
        this.showHelp();
        break;
        
      case 'exit':
      case 'quit':
      case 'q':
        console.log(`${colors.success}👋 Farewell! Your memories are preserved.${colors.reset}`);
        this.exit();
        break;
        
      case 'clear':
        console.clear();
        this.showWelcome();
        break;
        
      case 'status':
        await this.showStatus();
        break;
        
      case 'cd':
        // TODO v0.1.2: Re-enable persona switching for BrainXchange
        console.log(`${colors.warning}⚠️ Persona switching disabled in v0.1.1-rc1${colors.reset}`);
        console.log(`${colors.hint}💡 Currently hardcoded to 'personal' persona - will be enabled in v0.1.2${colors.reset}`);
        // this.changePersona(args[0]);
        break;
        
      case 'pwd':
        this.showCurrentContext();
        break;
        
      case 'ls':
        this.listPersonas();
        break;
        
      case 'save':
        await this.saveMemory(args.join(' '));
        break;
        
      case 'search':
        await this.searchMemories(args.join(' '));
        break;
        
      case 'recent':
        await this.showRecent();
        break;
        
      case 'stats':
        await this.showStats();
        break;
        
      case 'history':
        this.showHistory();
        break;
        
      default:
        // Check if it's a persona-specific command
        const persona = personas[this.currentPersona];
        if (persona && persona.commands && persona.commands.includes(command)) {
          await this.executePersonaCommand(command, args, fullInput);
        } else {
          // Default to AI query
          await this.queryAI(fullInput);
        }
        break;
    }
  }
  
  /**
   * Show welcome message
   */
  showWelcome() {
    console.log(`${colors.prompt}🧙 ${colors.bold}Welcome to MAGI - Your Personal AI Memory Bank${colors.reset}`);
    console.log(`${colors.hint}💡 Type 'help' for commands or just chat naturally! ${colors.dim}(persona switching disabled in v0.1.1-rc1)${colors.reset}`);

    const persona = personas[this.currentPersona];
    if (persona) {
      console.log(`${colors.hint}✨ Current persona: ${colors[this.currentPersona]}${persona.emoji} ${persona.name}${colors.reset}\n`);
    } else {
      console.log(`${colors.warning}⚠️ Unknown persona: ${this.currentPersona}${colors.reset}\n`);
    }
  }
  
  /**
   * Show help information
   */
  showHelp() {
    const persona = personas[this.currentPersona];
    
    console.log(`${colors.info}🧙 ${colors.bold}MAGI Interactive Commands${colors.reset}`);
    console.log('');
    console.log(`${colors.success}🎭 Context Commands:${colors.reset}`);
    console.log(`  ${colors.prompt}cd {persona}${colors.reset}     Switch to different persona/context ${colors.dim}(disabled in v0.1.1-rc1)${colors.reset}`);
    console.log(`  ${colors.prompt}pwd${colors.reset}             Show current context`);
    console.log(`  ${colors.prompt}ls${colors.reset}              List available personas`);
    console.log('');
    console.log(`${colors.success}💾 Memory Commands:${colors.reset}`);
    console.log(`  ${colors.prompt}save {content}${colors.reset}  Save content to current persona context`);
    console.log(`  ${colors.prompt}search {query}${colors.reset}  Search memories in current context`);
    console.log(`  ${colors.prompt}recent${colors.reset}          Show recently added memories`);
    console.log(`  ${colors.prompt}stats${colors.reset}           Show memory statistics for current context`);
    console.log('');
    console.log(`${colors.success}🛠 System Commands:${colors.reset}`);
    console.log(`  ${colors.prompt}status${colors.reset}          Check system health`);
    console.log(`  ${colors.prompt}clear${colors.reset}           Clear screen`);
    console.log(`  ${colors.prompt}history${colors.reset}         Show command history`);
    console.log(`  ${colors.prompt}help${colors.reset}            Show this help`);
    console.log(`  ${colors.prompt}exit${colors.reset}            Exit REPL`);
    
    if (persona && persona.commands && persona.commands.length > 0) {
      console.log('');
      console.log(`${colors[this.currentPersona]}${persona.emoji} ${persona.name} Specific Commands:${colors.reset}`);
      persona.commands.forEach(cmd => {
        console.log(`  ${colors.prompt}${cmd}${colors.reset}              ${this.getCommandDescription(cmd, persona)}`);
      });
    }
    
    console.log('');
    console.log(`${colors.hint}💬 Natural Language: Just type your thoughts or questions - I'll understand!${colors.reset}`);
  }
  
  /**
   * Get description for persona-specific commands
   */
  getCommandDescription(command, persona) {
    const descriptions = {
      // Personal persona
      journal: "Add entry to personal journal",
      goals: "Manage personal goals and aspirations", 
      habits: "Track and analyze habits",
      mood: "Log current mood and emotions",
      reflect: "Guided self-reflection",
      
      // Work persona  
      standup: "Quick daily standup summary",
      todo: "Manage work tasks and priorities",
      delegate: "Track delegated tasks", 
      review: "Performance and project reviews",
      metrics: "Work productivity metrics",
      
      // Dev persona
      debug: "Help debug technical issues",
      docs: "Search technical documentation", 
      pattern: "Identify code patterns and solutions",
      deploy: "Deployment guidance and checklists",
      test: "Testing strategies and templates",
      
      // Creative persona
      brainstorm: "Creative ideation session",
      inspire: "Get creative inspiration",
      draft: "Start creative drafts",
      remix: "Remix and iterate on ideas",
      explore: "Explore creative possibilities"
    };
    
    return descriptions[command] || "Specialized command for this persona";
  }
  
  /**
   * Change to different persona
   */
  changePersona(personaName) {
    if (!personaName) {
      console.log(`${colors.error}❌ Please specify a persona. Available: ${Object.keys(personas).join(', ')}${colors.reset}`);
      return;
    }
    
    // Handle 'cd ..' to go back to root
    if (personaName === '..' || personaName === 'root') {
      const oldPersona = this.currentPersona === 'root' ? null : personas[this.currentPersona];
      this.currentPersona = 'root';
      this.updatePrompt();
      
      if (oldPersona) {
        console.log(`${colors.success}✨ Switched from ${oldPersona.emoji} ${oldPersona.name} to 🌟 Root${colors.reset}`);
      } else {
        console.log(`${colors.info}📍 Already in Root context${colors.reset}`);
      }
      console.log(`${colors.hint}💡 System overview and cross-persona operations${colors.reset}`);
      return;
    }
    
    if (!personas[personaName]) {
      console.log(`${colors.error}❌ Unknown persona: ${personaName}${colors.reset}`);
      console.log(`${colors.hint}💡 Available personas: ${Object.keys(personas).join(', ')}${colors.reset}`);
      return;
    }
    
    const oldPersona = personas[this.currentPersona];
    const newPersona = personas[personaName];
    
    this.currentPersona = personaName;
    this.updatePrompt();
    
    console.log(`${colors.success}✨ Switched from ${oldPersona.emoji} ${oldPersona.name} to ${newPersona.emoji} ${newPersona.name}${colors.reset}`);
    console.log(`${colors.hint}💡 ${newPersona.description}${colors.reset}`);
  }
  
  /**
   * Show current context
   */
  showCurrentContext() {
    if (this.currentPersona === 'root') {
      console.log(`${colors.info}📍 Current context: 🌟 Root${colors.reset}`);
      console.log(`${colors.hint}   System overview and cross-persona operations${colors.reset}`);
      console.log(`${colors.hint}   Memory scope: all levels${colors.reset}`);
      return;
    }
    
    const persona = personas[this.currentPersona];
    console.log(`${colors.info}📍 Current context: ${colors[this.currentPersona]}${persona.emoji} ${persona.name}${colors.reset}`);
    console.log(`${colors.hint}   ${persona.description}${colors.reset}`);
    console.log(`${colors.hint}   Memory scope: ${persona.memory_scope.join(', ')}${colors.reset}`);
  }
  
  /**
   * List available personas
   */
  listPersonas() {
    console.log(`${colors.info}🎭 ${colors.bold}Available Personas:${colors.reset}`);
    console.log('');

    // Show only valid persona objects (not utility functions)
    Object.entries(personas).forEach(([key, persona]) => {
      // Skip utility functions - only show objects with emoji property
      if (typeof persona === 'object' && persona.emoji && persona.name) {
        const current = key === this.currentPersona ? `${colors.success}◄ current${colors.reset}` : '';
        console.log(`  ${colors[key] || colors.info}${persona.emoji} ${colors.bold}${persona.name}${colors.reset} - ${persona.description} ${current}`);
      }
    });
  }
  
  /**
   * Save memory to current persona context
   */
  async saveMemory(content) {
    if (!content) {
      console.log(`${colors.error}❌ Please provide content to save${colors.reset}`);
      return;
    }
    
    try {
      // TODO: Integrate with MCP ai_save_memory tool
      if (this.currentPersona === 'root') {
        console.log(`${colors.success}💾 Saving to 🌟 root context...${colors.reset}`);
      } else {
        console.log(`${colors.success}💾 Saving to ${personas[this.currentPersona].emoji} ${this.currentPersona} context...${colors.reset}`);
      }
      console.log(`${colors.hint}📝 "${content}"${colors.reset}`);
      console.log(`${colors.success}✅ Memory saved successfully${colors.reset}`);
    } catch (error) {
      console.log(`${colors.error}❌ Failed to save memory: ${error.message}${colors.reset}`);
    }
  }
  
  /**
   * Search memories in current context
   */
  async searchMemories(query) {
    if (!query) {
      console.log(`${colors.error}❌ Please provide a search query${colors.reset}`);
      return;
    }
    
    try {
      // TODO: Integrate with MCP search with persona context filtering
      if (this.currentPersona === 'root') {
        console.log(`${colors.info}🔍 Searching 🌟 all memories for: "${query}"${colors.reset}`);
      } else {
        console.log(`${colors.info}🔍 Searching ${personas[this.currentPersona].emoji} ${this.currentPersona} memories for: "${query}"${colors.reset}`);
      }
      console.log(`${colors.hint}📋 Found 0 results (integration pending)${colors.reset}`);
    } catch (error) {
      console.log(`${colors.error}❌ Search failed: ${error.message}${colors.reset}`);
    }
  }
  
  /**
   * Query AI with current persona context
   */
  async queryAI(query) {
    try {
      if (this.currentPersona === 'root') {
        console.log(`${colors.info}🧠 🌟 Thinking as Root system overview...${colors.reset}`);
        console.log(`${colors.hint}💭 (AI integration pending - would search all memory levels)${colors.reset}`);
        console.log(`${colors.hint}🎭 Persona tone: helpful, overview-focused, system-aware, guides between contexts${colors.reset}`);
      } else {
        const persona = personas[this.currentPersona];
        console.log(`${colors.info}🧠 ${persona.emoji} Thinking as ${persona.name}...${colors.reset}`);
        console.log(`${colors.hint}💭 (AI integration pending - would search ${persona.memory_scope.join(', ')} memories)${colors.reset}`);
        console.log(`${colors.hint}🎭 Persona tone: ${persona.tone}${colors.reset}`);
      }
      
    } catch (error) {
      console.log(`${colors.error}❌ AI query failed: ${error.message}${colors.reset}`);
    }
  }
  
  /**
   * Execute persona-specific commands
   */
  async executePersonaCommand(command, args, fullInput) {
    const persona = personas[this.currentPersona];
    console.log(`${colors[this.currentPersona]}${persona.emoji} Executing ${persona.name} command: ${command}${colors.reset}`);
    
    // TODO: Implement persona-specific command handlers
    console.log(`${colors.hint}🚧 Command handler for '${command}' coming soon!${colors.reset}`);
  }
  
  /**
   * Show system status
   */
  async showStatus() {
    try {
      console.log(`${colors.system}🔍 Checking system status...${colors.reset}`);
      // TODO: Integrate with existing status check
      console.log(`${colors.success}✅ MAGI system operational${colors.reset}`);
    } catch (error) {
      console.log(`${colors.error}❌ Status check failed: ${error.message}${colors.reset}`);
    }
  }
  
  /**
   * Show recent memories
   */
  async showRecent() {
    const persona = personas[this.currentPersona];
    if (persona) {
      console.log(`${colors.info}📅 Recent memories in ${persona.emoji} ${this.currentPersona} context:${colors.reset}`);
    } else {
      console.log(`${colors.info}📅 Recent memories:${colors.reset}`);
    }
    console.log(`${colors.hint}📋 (Implementation pending)${colors.reset}`);
  }
  
  /**
   * Show memory statistics
   */
  async showStats() {
    const persona = personas[this.currentPersona];
    if (persona) {
      console.log(`${colors.info}📊 Statistics for ${persona.emoji} ${persona.name} context:${colors.reset}`);
    } else {
      console.log(`${colors.info}📊 Statistics:${colors.reset}`);
    }
    console.log(`${colors.hint}📋 (Implementation pending)${colors.reset}`);
  }
  
  /**
   * Show command history
   */
  showHistory() {
    console.log(`${colors.info}📜 ${colors.bold}Command History:${colors.reset}`);
    this.commandHistory.slice(-10).forEach((cmd, idx) => {
      console.log(`${colors.hint}  ${idx + 1}. ${cmd}${colors.reset}`);
    });
  }
  
  /**
   * Start the REPL
   */
  start() {
    console.clear();
    this.showWelcome();
    this.rl.prompt();
  }
  
  /**
   * Clean exit
   */
  exit() {
    this.sessionActive = false;
    this.rl.close();
    process.exit(0);
  }
}

// Export for use as module or run directly
if (require.main === module) {
  // Check if BrainBridge service is running
  function isBrainBridgeRunning() {
    try {
      const processes = execSync('ps aux | grep "tsx.*server.ts.*stdio" | grep -v grep', { encoding: 'utf8' }).trim();
      return processes.length > 0;
    } catch (e) {
      return false;
    }
  }
  
  if (!isBrainBridgeRunning()) {
    console.log(`${colors.warning}⚠️  BrainBridge service is not running${colors.reset}`);
    console.log(`${colors.hint}💡 Start it with: ${colors.prompt}magi start${colors.reset} ${colors.hint}in another terminal${colors.reset}`);
    console.log(`${colors.hint}   Or continue anyway - some features may be limited${colors.reset}\n`);
  }
  
  const repl = new MagiREPL();
  repl.start();
}

module.exports = MagiREPL;