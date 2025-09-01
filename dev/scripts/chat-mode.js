#!/usr/bin/env node

const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');

// Colors for the chat interface
const colors = {
  prompt: '\x1b[36m',      // Cyan
  user: '\x1b[32m',        // Green  
  system: '\x1b[33m',      // Yellow
  error: '\x1b[31m',       // Red
  hint: '\x1b[90m',        // Gray
  success: '\x1b[92m',     // Bright green
  reset: '\x1b[0m',        // Reset
  bold: '\x1b[1m',         // Bold
  dim: '\x1b[2m'           // Dim
};

class BrainBridgeChat {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${colors.prompt}🧠 magi > ${colors.reset}`
    });
    
    this.mcpServer = null;
    this.messageId = 1;
    this.isInitialized = false;
    this.availableTools = [];
    
    this.setupCommands();
    this.startMCPServer();
  }

  setupCommands() {
    this.commands = {
      help: () => this.showHelp(),
      status: () => this.getStatus(),
      tools: () => this.listTools(),
      save: (content) => this.saveMemory(content),
      query: (question) => this.queryMemories(question),
      search: (term) => this.queryMemories(term),
      clear: () => this.clearScreen(),
      exit: () => this.exit(),
      quit: () => this.exit()
    };
  }

  async startMCPServer() {
    console.log(`${colors.system}🚀 Starting BrainBridge MCP Server...${colors.reset}`);
    
    this.mcpServer = spawn('npm', ['run', 'dev:stdio', '--workspace=brainbridge'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    this.mcpServer.stdout.on('data', (data) => {
      this.handleServerResponse(data.toString());
    });

    this.mcpServer.stderr.on('data', (data) => {
      const output = data.toString();
      
      // Look for startup indicators
      if (output.includes('BrainBridge MCP Server running') || 
          output.includes('✅ AI tools verification passed') ||
          output.includes('Building tools list')) {
        console.log(`${colors.success}✅ MCP Server detected, initializing...${colors.reset}`);
        this.initializeMCP();
      }
    });

    this.mcpServer.on('close', (code) => {
      console.log(`${colors.error}MCP Server exited with code ${code}${colors.reset}`);
      process.exit(1);
    });
  }

  async initializeMCP() {
    setTimeout(() => {
      this.sendMCPMessage({
        jsonrpc: "2.0",
        id: this.messageId++,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "brainbridge-chat", version: "1.0.0" }
        }
      });
    }, 1000);
  }

  sendMCPMessage(message) {
    if (this.mcpServer && this.mcpServer.stdin.writable) {
      this.mcpServer.stdin.write(JSON.stringify(message) + '\n');
    }
  }

  handleServerResponse(data) {
    const lines = data.trim().split('\n');
    
    for (const line of lines) {
      if (line.startsWith('{')) {
        try {
          const response = JSON.parse(line);
          this.processMCPResponse(response);
        } catch (e) {
          // Ignore non-JSON lines
        }
      }
    }
  }

  processMCPResponse(response) {
    if (response.result) {
      if (response.result.protocolVersion) {
        this.isInitialized = true;
        console.log(`${colors.success}✅ Connected to BrainBridge!${colors.reset}`);
        this.requestTools();
        this.showWelcome();
      } else if (response.result.tools) {
        this.availableTools = response.result.tools;
        console.log(`${colors.system}🔧 Loaded ${this.availableTools.length} tools${colors.reset}`);
      } else if (response.result._thinking) {
        console.log(`${colors.system}🤔 ${response.result._thinking}${colors.reset}`);
      } else if (response.result.content) {
        console.log(`${colors.success}📝 ${response.result.content}${colors.reset}`);
      } else if (typeof response.result === 'object') {
        // Handle complex objects better
        if (response.result.memories && Array.isArray(response.result.memories)) {
          console.log(`${colors.success}🔍 Found ${response.result.memories.length} memories:${colors.reset}`);
          response.result.memories.forEach((memory, i) => {
            console.log(`  ${i + 1}. ${memory.title || memory.filename || 'Untitled'}`);
            if (memory.content) {
              const preview = memory.content.slice(0, 100) + (memory.content.length > 100 ? '...' : '');
              console.log(`     ${colors.dim}${preview}${colors.reset}`);
            }
          });
        } else if (response.result.success !== undefined) {
          const status = response.result.success ? '✅ Success' : '❌ Failed';
          console.log(`${colors.success}${status}${colors.reset}`);
          if (response.result.message) {
            console.log(`   ${response.result.message}`);
          }
        } else {
          console.log(`${colors.system}💭 ${JSON.stringify(response.result, null, 2)}${colors.reset}`);
        }
      } else {
        console.log(`${colors.success}📝 ${response.result}${colors.reset}`);
      }
    }
    
    if (response.error) {
      console.log(`${colors.error}❌ Error: ${response.error.message}${colors.reset}`);
    }
  }

  requestTools() {
    this.sendMCPMessage({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "tools/list"
    });
  }

  showWelcome() {
    console.log(`\n${colors.bold}${colors.prompt}🧠 BrainBridge Chat Mode${colors.reset}`);
    console.log(`${colors.hint}Type your questions naturally, or use commands like:${colors.reset}`);
    console.log(`${colors.hint}  save <content>     - Save a memory${colors.reset}`);
    console.log(`${colors.hint}  query <question>   - Search memories${colors.reset}`);  
    console.log(`${colors.hint}  status             - Show system status${colors.reset}`);
    console.log(`${colors.hint}  help               - Show all commands${colors.reset}`);
    console.log(`${colors.hint}  exit               - Exit chat mode${colors.reset}\n`);
    
    this.rl.prompt();
  }

  showHelp() {
    console.log(`\n${colors.bold}Available Commands:${colors.reset}`);
    console.log(`${colors.user}💬 Natural Language:${colors.reset}`);
    console.log(`  Just type your question: "What do you remember about...?"`);
    console.log(`  Save naturally: "Remember that I like jazz music"`);
    console.log(`\n${colors.user}🔧 Direct Commands:${colors.reset}`);
    console.log(`  ${colors.prompt}save <content>${colors.reset}     - Save memory`);
    console.log(`  ${colors.prompt}query <question>${colors.reset}   - Search memories`);
    console.log(`  ${colors.prompt}search <term>${colors.reset}      - Same as query`);
    console.log(`  ${colors.prompt}status${colors.reset}             - System status`);
    console.log(`  ${colors.prompt}tools${colors.reset}              - List available tools`);
    console.log(`  ${colors.prompt}clear${colors.reset}              - Clear screen`);
    console.log(`  ${colors.prompt}exit/quit${colors.reset}          - Exit chat mode`);
    console.log('');
  }

  getStatus() {
    console.log(`${colors.system}🔍 BrainBridge Status:${colors.reset}`);
    console.log(`  Connection: ${this.isInitialized ? colors.success + '✅ Connected' : colors.error + '❌ Disconnected'}${colors.reset}`);
    console.log(`  Tools: ${colors.success}${this.availableTools.length} available${colors.reset}`);
    console.log(`  Server: ${this.mcpServer ? colors.success + '✅ Running' : colors.error + '❌ Stopped'}${colors.reset}`);
  }

  listTools() {
    if (this.availableTools.length === 0) {
      console.log(`${colors.error}No tools loaded yet${colors.reset}`);
      return;
    }

    console.log(`${colors.system}🔧 Available Tools:${colors.reset}`);
    this.availableTools.forEach(tool => {
      console.log(`  ${colors.prompt}${tool.name}${colors.reset} - ${colors.hint}${tool.description}${colors.reset}`);
    });
  }

  saveMemory(content) {
    if (!content) {
      console.log(`${colors.error}Usage: save <your content here>${colors.reset}`);
      return;
    }

    this.sendMCPMessage({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "tools/call",
      params: {
        name: "ai_save_memory",
        arguments: {
          content: content,
          privacy_level: "personal"
        }
      }
    });
  }

  queryMemories(question) {
    if (!question) {
      console.log(`${colors.error}Usage: query <your question here>${colors.reset}`);
      return;
    }

    this.sendMCPMessage({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "tools/call",
      params: {
        name: "ai_query_memories",
        arguments: {
          question: question,
          synthesis_mode: "raw"
        }
      }
    });
  }

  clearScreen() {
    console.clear();
    this.showWelcome();
  }

  exit() {
    console.log(`${colors.system}👋 Goodbye!${colors.reset}`);
    if (this.mcpServer) {
      this.mcpServer.kill();
    }
    this.rl.close();
    process.exit(0);
  }

  start() {
    this.rl.on('line', (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      // Parse command
      const [command, ...args] = trimmed.split(' ');
      const content = args.join(' ');

      if (this.commands[command.toLowerCase()]) {
        this.commands[command.toLowerCase()](content);
      } else {
        // Treat as natural language query
        if (trimmed.toLowerCase().startsWith('remember') || trimmed.toLowerCase().startsWith('save')) {
          // Extract content after "remember" or "save"
          const contentStart = trimmed.toLowerCase().startsWith('remember') ? 'remember' : 'save';
          const content = trimmed.slice(contentStart.length).replace(/^[\s\w]*?(?:that\s+)?/i, '').trim();
          this.saveMemory(content);
        } else {
          // Treat as query
          this.queryMemories(trimmed);
        }
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.exit();
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      this.exit();
    });
  }
}

// Start chat mode
const chat = new BrainBridgeChat();
chat.start();