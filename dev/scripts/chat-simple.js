#!/usr/bin/env node

const readline = require('readline');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { tryPatterns, isComplexDevQuestion } = require('./dev-patterns');
const { getLogsDir } = require('../../utils/magi-root');
const { colors, log, getAIProvider, getTimestamp, isDev, getProjectRoot } = require('./common');

// Check for streaming logs mode
const args = process.argv.slice(2);
if (args.includes('logs')) {
  startStreamingLogs();
  return;
}

/**
 * Start streaming log viewer mode
 */
function startStreamingLogs() {
  console.log(`${colors.system}🧙 Magi Log Companion - Streaming BrainBridge Activity${colors.reset}`);
  console.log(`${colors.hint}Press Ctrl+C to exit${colors.reset}\n`);
  
  // Try to find the most recent log file using MAGI_ROOT
  const logsDir = getLogsDir();
  let logFile = path.join(logsDir, 'brainbridge-default.log');
  
  try {
    const logFiles = fs.readdirSync(logsDir)
      .filter(f => f.startsWith('brainbridge-') && f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(logsDir, f),
        mtime: fs.statSync(path.join(logsDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (logFiles.length > 0) {
      logFile = logFiles[0].path;
      console.log(`${colors.info}📂 Using most recent log: ${logFiles[0].name}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.warning}⚠️ Could not detect log file, using default${colors.reset}`);
  }
  
  // Check if log file exists
  if (!fs.existsSync(logFile)) {
    console.log(`${colors.warning}⚠️ Log file not found: ${logFile}${colors.reset}`);
    console.log(`${colors.hint}Make sure BrainBridge is running with: npm run dev${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.info}📂 Monitoring: ${path.basename(logFile)}${colors.reset}\n`);
  
  // Show last 10 lines first, then start streaming
  try {
    console.log('📜 Recent entries:');
    const recentLines = execSync(`tail -10 "${logFile}"`, { encoding: 'utf8' });
    const lines = recentLines.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const timestamp = new Date().toLocaleTimeString();
      const formattedLine = formatLogLine(line, timestamp);
      if (formattedLine) {
        console.log(formattedLine);
      }
    });
    
    console.log('\n🔄 Streaming new entries... (Ctrl+C to exit)\n');
  } catch (error) {
    console.log(`${colors.warning}Could not show recent entries: ${error.message}${colors.reset}`);
  }
  
  // Start tail -f process
  const tailProcess = spawn('tail', ['-f', logFile]);
  
  let lineCount = 0;
  
  tailProcess.stdout.setEncoding('utf8');
  tailProcess.stdout.on('data', (data) => {
    const lines = data.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      lineCount++;
      const timestamp = new Date().toLocaleTimeString();
      const formattedLine = formatLogLine(line, timestamp);
      if (formattedLine) {
        console.log(`🆕 ${formattedLine}`);
      }
      
      // Show periodic status updates
      if (lineCount % 20 === 0) {
        showPeriodicStatus();
      }
    });
  });
  
  tailProcess.stderr.on('data', (data) => {
    console.error(`${colors.error}Tail error: ${data}${colors.reset}`);
  });
  
  tailProcess.on('error', (error) => {
    console.error(`${colors.error}❌ Error streaming logs: ${error.message}${colors.reset}`);
    process.exit(1);
  });
  
  tailProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(`${colors.warning}⚠️ Tail process exited with code ${code}${colors.reset}`);
    }
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(`\n${colors.system}👋 Magi Log Companion stopped${colors.reset}`);
    tailProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  // Show initial status
  setTimeout(showPeriodicStatus, 2000);
}

/**
 * Format log line with colors and timestamp
 */
function formatLogLine(line, timestamp) {
  if (!line.trim()) return '';
  
  // Parse multiple log formats
  // Verbose format: "🕐 23:42:52.864 │ info │ Message"
  // ISO format: "💡 2025-09-02T23:53:20.693-05:00 │ [INFO ] │ Message"
  
  let message = line;
  let level = '';
  
  // Try verbose format first
  const verbosePattern = /^[🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛]?\s*(\d{1,2}:\d{2}:\d{2}\.\d{3})\s*│\s*(\w+)\s*│\s*(.*)$/;
  let match = line.match(verbosePattern);
  
  if (match) {
    const [, logTime, logLevel, logMessage] = match;
    message = logMessage;
    level = logLevel.toLowerCase();
    
    // Convert 24-hour time to 12-hour AM/PM format
    if (logTime) {
      const [hours, minutes, seconds] = logTime.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      timestamp = `${hour12}:${minutes}:${seconds.split('.')[0]} ${ampm}`;
    }
  } else {
    // Check if line contains ISO timestamp (it's already been prefixed with emojis)
    if (line.includes('T') && line.includes('│')) {
      // Remove everything before the actual message part
      // Pattern: anything → timestamp → │ → [LEVEL] → │ → message
      const parts = line.split('│');
      if (parts.length >= 3) {
        // Get the actual message (last part after second │)
        message = parts.slice(2).join('│').trim();
        
        // Get the log level from middle part
        const levelPart = parts[1] || '';
        const levelMatch = levelPart.match(/\[?(\w+)\s*\]?/);
        if (levelMatch) {
          level = levelMatch[1].toLowerCase().trim();
        }
      }
    }
  }
  
  // Keep existing ANSI colors if present, otherwise add our own
  const hasColors = message.includes('\x1b[');
  
  // Format time in desired style with color
  const time = `${colors.hint}[${timestamp}]${colors.reset}`;
  
  // Choose emoji and color based on content or level
  let emoji = '💡';
  let messageColor = '';
  
  if (level === 'error' || message.includes('ERROR') || message.includes('Failed')) {
    emoji = '❌';
    messageColor = hasColors ? '' : colors.error;
  } else if (level === 'warn' || message.includes('WARN')) {
    emoji = '⚠️';
    messageColor = hasColors ? '' : colors.warning;
  } else if (message.includes('memory') || message.includes('Memory')) {
    emoji = '🧠';
    messageColor = hasColors ? '' : colors.info;
  } else if (message.includes('AI') || message.includes('Ollama') || message.includes('LLM')) {
    emoji = '🤖';
    messageColor = hasColors ? '' : colors.success;
  } else if (message.includes('sync') || message.includes('Sync')) {
    emoji = '🔄';
    messageColor = hasColors ? '' : colors.info;
  } else if (message.includes('save') || message.includes('Save') || message.includes('store')) {
    emoji = '💾';
    messageColor = hasColors ? '' : colors.success;
  } else if (message.includes('search') || message.includes('Search') || message.includes('query')) {
    emoji = '🔍';
    messageColor = hasColors ? '' : colors.info;
  } else if (message.includes('connect') || message.includes('Connect')) {
    emoji = '🔌';
    messageColor = hasColors ? '' : colors.success;
  } else if (level === 'debug' || level === 'trace') {
    emoji = '🔍';
    messageColor = hasColors ? '' : colors.hint;
  } else {
    messageColor = hasColors ? '' : colors.info;
  }
  
  // Apply color if message doesn't already have colors
  const coloredMessage = messageColor ? `${messageColor}${message}${colors.reset}` : message;
  
  return `${time} ${emoji} ${coloredMessage}`;
}

/**
 * Show periodic system status in log stream
 */
function showPeriodicStatus() {
  try {
    // Quick system check
    let statusLine = `${colors.system}━━━ STATUS CHECK ━━━${colors.reset} `;
    
    // Check BrainBridge processes - look for tsx running server.ts
    try {
      const processes = execSync('ps aux | grep "tsx.*server\\.ts" | grep -v grep', { encoding: 'utf8' }).trim();
      const count = processes ? processes.split('\n').filter(line => line.trim()).length : 0;
      statusLine += `🧠 BB:${count} `;
    } catch (e) {
      statusLine += '🧠 BB:0 ';
    }
    
    // Check AI Provider
    const aiProvider = getAIProvider();
    if (aiProvider === 'openai') {
      // Check OpenAI by checking if API key is configured
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey && apiKey.startsWith('sk-')) {
          statusLine += `🤖 OpenAI:✅ `;
        } else {
          statusLine += `🤖 OpenAI:❌ `;
        }
      } catch (e) {
        statusLine += '🤖 OpenAI:❌ ';
      }
    } else {
      // Check Ollama
      try {
        const response = execSync('curl -s http://localhost:11434/api/tags', { encoding: 'utf8', timeout: 1000 });
        const data = JSON.parse(response);
        statusLine += `🤖 Ollama:${data.models?.length || 0} `;
      } catch (e) {
        statusLine += '🤖 Ollama:❌ ';
      }
    }
    
    // Check memory count
    try {
      const { getMemoriesDir } = require('../../utils/magi-root');
      const memoriesDir = getMemoriesDir();
      let totalMemories = 0;
      
      // Count all .md files in the actual memories directory
      if (fs.existsSync(memoriesDir)) {
        const countFiles = (dir) => {
          let count = 0;
          try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
              const fullPath = path.join(dir, item);
              const stat = fs.statSync(fullPath);
              if (stat.isDirectory() && !item.startsWith('.')) {
                count += countFiles(fullPath);
              } else if (item.endsWith('.md')) {
                count++;
              }
            }
          } catch (e) {
            // Ignore permission errors
          }
          return count;
        };
        totalMemories = countFiles(memoriesDir);
      }
      statusLine += `📁 Mem:${totalMemories}`;
    } catch (e) {
      statusLine += '📁 Mem:0 ';
    }
    
    console.log(statusLine);
  } catch (error) {
    // Ignore status check errors
  }
}

console.log(`${colors.system}🧙 Magi - Hybrid Development Assistant${colors.reset}`);
console.log(`${colors.hint}Starting MCP server... (dev questions get instant responses)${colors.reset}\n`);

// Start MCP server
const server = spawn('npm', ['run', 'dev:stdio', '--workspace=services/brainbridge'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: getProjectRoot()
});

let messageId = 1;
let isReady = false;

// Setup readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function sendMessage(message) {
  if (server.stdin.writable) {
    server.stdin.write(JSON.stringify(message) + '\n');
  }
}

// Handle server responses
server.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  
  for (const line of lines) {
    if (line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        let promptShown = false;
        
        if (response.result && response.result.protocolVersion) {
          console.log(`${colors.success}✅ Connected to BrainBridge!${colors.reset}\n`);
          isReady = true;
          showPrompt();
          promptShown = true;
        } else if (response.result && response.result.memories) {
          console.log(`${colors.success}🔍 Found ${response.result.memories.length} memories:${colors.reset}`);
          response.result.memories.forEach((memory, i) => {
            console.log(`  ${i + 1}. ${memory.title || 'Untitled'}`);
            if (memory.content) {
              const preview = memory.content.slice(0, 80) + '...';
              console.log(`     ${colors.hint}${preview}${colors.reset}`);
            }
          });
          showPrompt();
          promptShown = true;
        } else if (response.result && response.result.content) {
          // Handle content array format from MCP
          if (Array.isArray(response.result.content)) {
            response.result.content.forEach(item => {
              if (item.type === 'text' && item.text) {
                console.log(`${colors.success}📝 ${item.text}${colors.reset}`);
              }
            });
          } else {
            console.log(`${colors.success}📝 ${response.result.content}${colors.reset}`);
          }
          showPrompt();
          promptShown = true;
        } else if (response.result) {
          console.log(`${colors.success}✅ ${JSON.stringify(response.result)}${colors.reset}`);
          showPrompt();
          promptShown = true;
        }
        
        if (response.error) {
          console.log(`${colors.error}❌ ${response.error.message}${colors.reset}`);
          showPrompt();
          promptShown = true;
        }
        
        // Fallback: if we processed a response but didn't show prompt, do it now
        if (response.id && response.id > 1 && !promptShown) {
          console.log(`${colors.warning}⚠️ Unexpected response format${colors.reset}`);
          showPrompt();
        }
        
      } catch (e) {
        // Ignore non-JSON
      }
    }
  }
});

function showPrompt() {
  rl.question(`${colors.prompt}🧙 magi > ${colors.reset}`, handleInput);
}

async function handleInput(input) {
  const trimmed = input.trim();
  
  if (!trimmed) {
    showPrompt();
    return;
  }
  
  // Handle exit commands
  if (trimmed === 'exit' || trimmed === 'quit') {
    console.log(`${colors.system}👋 Goodbye!${colors.reset}`);
    server.kill();
    process.exit(0);
  }
  
  try {
    // Tier 1: Try pattern matching first (instant dev responses)
    const quickAnswer = await tryPatterns(trimmed);
    if (quickAnswer) {
      console.log(quickAnswer);
      showPrompt();
      return;
    }
    
    // Tier 2: Check for LLM mode (ask: prefix or complex dev questions)
    if (trimmed.startsWith('ask:') || isComplexDevQuestion(trimmed)) {
      console.log(`${colors.info}🤔 Thinking...${colors.reset}`);
      const llmResponse = await queryLocalLLM(trimmed.replace(/^ask:\s*/, ''));
      console.log(`${colors.success}💡 ${llmResponse}${colors.reset}`);
      showPrompt();
      return;
    }
    
    // Tier 2.5: Auto-fallback to LLM for dev-related questions that didn't match patterns
    if (isDevRelatedQuestion(trimmed)) {
      console.log(`${colors.info}🤔 Let me think about that...${colors.reset}`);
      try {
        const llmResponse = await queryLocalLLM(trimmed);
        console.log(`${colors.success}💡 ${llmResponse}${colors.reset}`);
        showPrompt();
        return;
      } catch (error) {
        console.log(`${colors.warning}⚠️ LLM unavailable, trying memory search...${colors.reset}`);
        // Fall through to BrainBridge
      }
    }
    
    // Tier 3: Send to BrainBridge memory system (existing behavior)
    const currentMsgId = messageId++;
    sendMessage({
      jsonrpc: "2.0",
      id: currentMsgId,
      method: "tools/call",
      params: {
        name: "ai_query_memories",
        arguments: {
          question: trimmed,
          synthesis_mode: "local"
        }
      }
    });
    
    // Timeout fallback to prevent hanging
    setTimeout(() => {
      console.log(`${colors.warning}⚠️ Response timeout - BrainBridge may be slow or stuck${colors.reset}`);
      showPrompt();
    }, 45000); // 45 second timeout
    
    // Note: showPrompt() will be called by the response handler (or timeout)
    
  } catch (error) {
    console.log(`${colors.error}❌ Error: ${error.message}${colors.reset}`);
    showPrompt();
  }
}

/**
 * Query local LLM for complex dev questions
 * @param {string} question - The question to ask
 * @returns {Promise<string>} LLM response
 */
async function queryLocalLLM(question) {
  try {
    const prompt = `You are a development assistant for the AGIfor.me project (BrainBridge/BrainCloud). 
Answer this development question concisely and helpfully:

${question}

Keep your response practical and focused on actionable advice. If it's about troubleshooting, provide specific steps.`;
    
    const payload = {
      model: "llama3.1:8b",
      prompt: prompt,
      stream: false
    };
    
    // Use safer shell execution with timeout
    const escapedPayload = JSON.stringify(payload).replace(/'/g, "'\"'\"'");
    const curlCommand = `curl -s -m 10 -H "Content-Type: application/json" -d '${escapedPayload}' http://localhost:11434/api/generate`;
    
    const response = execSync(curlCommand, { encoding: 'utf8', timeout: 15000 });
    const result = JSON.parse(response);
    
    if (result.response) {
      return result.response.trim();
    } else {
      throw new Error('No response from LLM');
    }
  } catch (error) {
    throw new Error(`LLM unavailable: ${error.message}`);
  }
}

/**
 * Check if question is dev-related but didn't match any patterns
 * @param {string} input - User input
 * @returns {boolean}
 */
function isDevRelatedQuestion(input) {
  const devKeywords = [
    // System/Infrastructure
    'server', 'service', 'process', 'port', 'docker', 'container',
    'database', 'db', 'redis', 'postgres', 'mysql',
    
    // Development tools
    'npm', 'node', 'typescript', 'javascript', 'build', 'compile',
    'test', 'jest', 'deploy', 'deployment', 'git', 'github',
    
    // Project-specific
    'brainbridge', 'braincloud', 'brainxchange', 'brain-proxy', 
    'magi', 'ollama', 'llm', 'ai', 'model', 'embedding',
    'memory', 'memories', 'index', 'search', 'vector',
    
    // Common dev questions
    'error', 'bug', 'issue', 'problem', 'fail', 'crash',
    'config', 'configuration', 'environment', 'env',
    'install', 'setup', 'start', 'stop', 'restart',
    'connect', 'connection', 'network', 'api', 'endpoint',
    
    // Actions
    'how do', 'how to', 'why does', 'why is', 'what happens',
    'can i', 'should i', 'where is', 'when does'
  ];
  
  const lowerInput = input.toLowerCase();
  
  // Check for dev keywords
  const hasDevKeywords = devKeywords.some(keyword => 
    lowerInput.includes(keyword)
  );
  
  // Check for question patterns that suggest dev queries
  const questionPatterns = [
    /how (do|to|can)/i,
    /why (does|is|won't|can't)/i, 
    /what (happens|is|does|should)/i,
    /where (is|are|does|can)/i,
    /when (does|should|will)/i,
    /should i/i,
    /can i/i,
    /is it/i
  ];
  
  const hasQuestionPattern = questionPatterns.some(pattern => 
    pattern.test(input)
  );
  
  return hasDevKeywords && hasQuestionPattern;
}

// Initialize after delay
setTimeout(() => {
  sendMessage({
    jsonrpc: "2.0",
    id: messageId++,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "chat", version: "1.0.0" }
    }
  });
}, 3000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n${colors.system}👋 Goodbye!${colors.reset}`);
  server.kill();
  process.exit(0);
});