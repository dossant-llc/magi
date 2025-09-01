#!/usr/bin/env node

/**
 * BrainBridge Local Dashboard
 * Web-based monitoring and control interface
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Brain instances configuration
const INSTANCES = [
  { name: 'alice', port: 8147, color: '#00CED1' },
  { name: 'bob', port: 8148, color: '#FFD700' },
  { name: 'carol', port: 8149, color: '#DA70D6' }
];

app.use(express.json());
app.use(express.static('public'));

// API endpoint to get instance status
app.get('/api/instances', async (req, res) => {
  const statuses = await Promise.all(
    INSTANCES.map(async (instance) => {
      try {
        const response = await fetch(`http://localhost:${instance.port}/health`);
        const health = response.ok ? await response.json() : null;
        
        return {
          ...instance,
          status: response.ok ? 'online' : 'offline',
          health
        };
      } catch (error) {
        return {
          ...instance,
          status: 'offline',
          error: error.message
        };
      }
    })
  );
  
  res.json(statuses);
});

// API endpoint to send cross-brain query
app.post('/api/query', async (req, res) => {
  const { from, to, query } = req.body;
  
  try {
    const fromInstance = INSTANCES.find(i => i.name === from);
    if (!fromInstance) {
      throw new Error(`Unknown instance: ${from}`);
    }
    
    // Route through the 'from' instance with @mention
    const mcpQuery = {
      method: 'tools/call',
      params: {
        name: 'ai_query_memories',
        arguments: {
          question: to ? `@${to} ${query}` : query
        }
      }
    };
    
    const response = await fetch(`http://localhost:${fromInstance.port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mcpQuery)
    });
    
    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to save memory
app.post('/api/save', async (req, res) => {
  const { instance, content, privacy = 'personal' } = req.body;
  
  try {
    const targetInstance = INSTANCES.find(i => i.name === instance);
    if (!targetInstance) {
      throw new Error(`Unknown instance: ${instance}`);
    }
    
    const mcpQuery = {
      method: 'tools/call',
      params: {
        name: 'ai_save_memory',
        arguments: {
          content,
          privacy_level: privacy
        }
      }
    };
    
    const response = await fetch(`http://localhost:${targetInstance.port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mcpQuery)
    });
    
    if (!response.ok) {
      throw new Error(`Save failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get memory metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const metrics = {};
    const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
    
    for (const instance of INSTANCES) {
      const instanceMetrics = { total: 0, size: 0, privacy: {} };
      
      for (const level of privacyLevels) {
        try {
          const memoryPath = path.join(`../memories.${instance.name}`, level);
          if (fs.existsSync(memoryPath)) {
            const files = fs.readdirSync(memoryPath).filter(f => f.endsWith('.md'));
            let levelSize = 0;
            
            files.forEach(file => {
              const filePath = path.join(memoryPath, file);
              const stats = fs.statSync(filePath);
              levelSize += stats.size;
            });
            
            instanceMetrics.privacy[level] = { count: files.length, size: levelSize };
            instanceMetrics.total += files.length;
            instanceMetrics.size += levelSize;
          } else {
            instanceMetrics.privacy[level] = { count: 0, size: 0 };
          }
        } catch (error) {
          instanceMetrics.privacy[level] = { count: 0, size: 0 };
        }
      }
      
      metrics[instance.name] = instanceMetrics;
    }
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to stream live logs via Server-Sent Events
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    timestamp: new Date().toISOString(),
    instance: 'system',
    message: 'Live log stream connected',
    level: 'info'
  })}\n\n`);

  // Watch log files for changes
  const fs = require('fs');
  const path = require('path');
  
  const logWatchers = [];
  const logPositions = {};
  
  // Watch each instance's log file
  INSTANCES.forEach(instance => {
    const logFile = path.join(__dirname, 'logs', `${instance.name}.log`);
    logPositions[instance.name] = 0;
    
    try {
      // Get initial file size to start watching from end
      const stats = fs.statSync(logFile);
      logPositions[instance.name] = stats.size;
      
      const watcher = fs.watchFile(logFile, { interval: 500 }, (curr, prev) => {
        if (curr.size > logPositions[instance.name]) {
          // Read new content
          const stream = fs.createReadStream(logFile, {
            start: logPositions[instance.name],
            end: curr.size
          });
          
          let buffer = '';
          stream.on('data', chunk => {
            buffer += chunk.toString();
          });
          
          stream.on('end', () => {
            const lines = buffer.split('\n').filter(line => line.trim());
            lines.forEach(line => {
              const parsed = parseLogLine(line, instance.name);
              if (parsed) {
                res.write(`data: ${JSON.stringify(parsed)}\n\n`);
              }
            });
          });
          
          logPositions[instance.name] = curr.size;
        }
      });
      
      logWatchers.push(() => fs.unwatchFile(logFile));
    } catch (error) {
      console.error(`Failed to watch ${logFile}:`, error.message);
    }
  });

  // Clean up on client disconnect
  req.on('close', () => {
    logWatchers.forEach(cleanup => cleanup());
  });
});

// Parse log lines into structured format
function parseLogLine(line, instance) {
  // Match the log format: timestamp | level | message
  const match = line.match(/^[^│]*│\s*\[.*?\]\s*│\s*(.+)$/);
  if (!match) return null;
  
  const message = match[1];
  
  // Extract timestamp from beginning of line
  const timeMatch = line.match(/(\d{2}:\d{2}:\d{2})/);
  const timestamp = timeMatch ? timeMatch[1] : new Date().toLocaleTimeString().slice(0, 8);
  
  // Determine log level from emoji/color
  let level = 'info';
  if (line.includes('🚨') || line.includes('[31m')) level = 'error';
  else if (line.includes('⚡') || line.includes('[32m')) level = 'perf';
  else if (line.includes('🔍') || line.includes('[90m')) level = 'trace';
  
  // Clean ANSI codes from message
  const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
  
  return {
    timestamp,
    instance,
    message: cleanMessage,
    level
  };
}

// API endpoint to execute command in a brain terminal
app.post('/api/terminal', async (req, res) => {
  const { instance, command } = req.body;
  
  try {
    const targetInstance = INSTANCES.find(i => i.name === instance);
    if (!targetInstance) {
      throw new Error(`Unknown instance: ${instance}`);
    }
    
    let result;
    
    // Handle explicit commands first
    if (command === 'help') {
      result = {
        content: [{
          type: 'text',
          text: `🧠 ${instance.charAt(0).toUpperCase() + instance.slice(1)} Brain Terminal

Available commands:
• query [question] - Explicitly query memories
• save [content] - Explicitly save content to memory  
• help - Show this help
• clear - Clear terminal
• auto [on|off] - Toggle auto-routing mode (default: on)

🎯 Auto-routing mode (default):
Just type naturally! The AI will detect your intent:
• "magi, what's @alice's favorite food?" → Cross-brain query to Alice
• "remember that I like pizza" → Save to memory
• "what do I know about jazz?" → Query your memories
• "@bob what music do you like?" → Query Bob's memories

The terminal understands natural language and routes intelligently!`
        }]
      };
    } else if (command === 'clear') {
      result = { content: [{ type: 'text', text: '' }], clear: true };
    } else if (command.startsWith('auto ')) {
      const mode = command.substring(5).trim();
      if (mode === 'on' || mode === 'off') {
        result = {
          content: [{
            type: 'text',
            text: `Auto-routing mode ${mode === 'on' ? 'enabled' : 'disabled'}. ${mode === 'on' ? 'Just type naturally!' : 'Use explicit commands like "query" or "save".'}`
          }]
        };
      } else {
        result = {
          content: [{
            type: 'text',
            text: `Usage: auto [on|off]. Current mode: on (default)`
          }]
        };
      }
    } else if (command.startsWith('query ')) {
      // Explicit query command
      const question = command.substring(6);
      const mcpQuery = {
        method: 'tools/call',
        params: {
          name: 'ai_query_memories',
          arguments: { question }
        }
      };
      
      const response = await fetch(`http://localhost:${targetInstance.port}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpQuery)
      });
      
      result = await response.json();
    } else if (command.startsWith('save ')) {
      // Explicit save command
      const content = command.substring(5);
      const mcpQuery = {
        method: 'tools/call',
        params: {
          name: 'ai_save_memory',
          arguments: { content }
        }
      };
      
      const response = await fetch(`http://localhost:${targetInstance.port}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpQuery)
      });
      
      result = await response.json();
    } else {
      // AUTO MODE: Intelligent routing based on natural language
      result = await handleAutoCommand(command, instance, targetInstance);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }]
    });
  }
});

// Intelligent command routing using simple pattern detection
async function handleAutoCommand(command, fromInstance, targetInstanceConfig) {
  const lowerCommand = command.toLowerCase();
  
  // Detect @mentions for cross-brain queries
  const mentionMatch = command.match(/@(\w+)/i);
  if (mentionMatch) {
    const mentionedBrain = mentionMatch[1].toLowerCase();
    const availableBrains = ['alice', 'bob', 'carol'];
    
    if (availableBrains.includes(mentionedBrain)) {
      // Route to the mentioned brain
      const targetInstance = INSTANCES.find(i => i.name === mentionedBrain);
      const cleanQuestion = command.replace(/@\w+/gi, '').replace(/^(magi,?\s*|hey\s*|hi\s*)/i, '').trim();
      
      const mcpQuery = {
        method: 'tools/call',
        params: {
          name: 'ai_query_memories',
          arguments: { question: cleanQuestion }
        }
      };
      
      const response = await fetch(`http://localhost:${targetInstance.port}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpQuery)
      });
      
      const result = await response.json();
      
      // Add routing info to response
      if (result.content && result.content[0]) {
        result.content[0].text = `🎯 Routed to ${mentionedBrain}:\n\n${result.content[0].text}`;
      }
      
      return result;
    }
  }
  
  // Detect save/remember intent
  const savePatterns = [
    /^(remember|save|store|note|magi save)/i,
    /^(i like|my favorite|i prefer|i enjoy)/i,
    /^(today i|yesterday i|i just|i recently)/i
  ];
  
  if (savePatterns.some(pattern => pattern.test(command))) {
    const mcpQuery = {
      method: 'tools/call',
      params: {
        name: 'ai_save_memory',
        arguments: { content: command }
      }
    };
    
    const response = await fetch(`http://localhost:${targetInstanceConfig.port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mcpQuery)
    });
    
    const result = await response.json();
    
    // Add routing info
    if (result.content && result.content[0]) {
      result.content[0].text = `💾 Auto-saved to ${fromInstance}'s memories:\n\n${result.content[0].text}`;
    }
    
    return result;
  }
  
  // Default: treat as query
  const cleanQuestion = command.replace(/^(magi,?\s*|hey\s*|hi\s*)/i, '').trim();
  
  const mcpQuery = {
    method: 'tools/call',
    params: {
      name: 'ai_query_memories',
      arguments: { question: cleanQuestion }
    }
  };
  
  const response = await fetch(`http://localhost:${targetInstanceConfig.port}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mcpQuery)
  });
  
  const result = await response.json();
  
  // Add routing info
  if (result.content && result.content[0]) {
    result.content[0].text = `🔍 Searched ${fromInstance}'s memories:\n\n${result.content[0].text}`;
  }
  
  return result;
}

// Serve the dashboard HTML
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>BrainBridge Local Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      background: #1e1e1e;
      color: #d4d4d4;
      height: 100vh;
      overflow: hidden;
    }
    
    .dashboard {
      display: grid;
      grid-template-rows: auto 1fr auto;
      height: 100vh;
    }
    
    .header {
      background: #2d2d30;
      padding: 10px 20px;
      border-bottom: 1px solid #3e3e42;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .title {
      color: #569cd6;
      font-size: 18px;
      font-weight: bold;
    }
    
    .metrics {
      display: flex;
      gap: 20px;
      font-size: 12px;
    }
    
    .metric {
      color: #9cdcfe;
    }
    
    .main-area {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: 2fr 1fr;
      gap: 1px;
      background: #3e3e42;
    }
    
    .brain-terminal {
      background: #1e1e1e;
      display: flex;
      flex-direction: column;
    }
    
    .terminal-header {
      background: #2d2d30;
      padding: 8px 15px;
      border-bottom: 1px solid #3e3e42;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    
    .terminal-title {
      font-weight: bold;
    }
    
    .terminal-status {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: bold;
    }
    
    .online { background: #4caf50; color: white; }
    .offline { background: #f44336; color: white; }
    
    .terminal-content {
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .terminal-input {
      border-top: 1px solid #3e3e42;
      padding: 10px 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .prompt {
      color: #4ec9b0;
      font-weight: bold;
    }
    
    .terminal-input input {
      flex: 1;
      background: transparent;
      border: none;
      color: #d4d4d4;
      font-family: inherit;
      font-size: 13px;
      outline: none;
    }
    
    .console-log {
      grid-column: 1 / -1;
      background: #1e1e1e;
      display: flex;
      flex-direction: column;
    }
    
    .console-content {
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      font-size: 11px;
      line-height: 1.3;
    }
    
    .log-entry {
      margin-bottom: 5px;
      display: flex;
      gap: 10px;
    }
    
    .log-time {
      color: #808080;
      min-width: 60px;
    }
    
    .log-instance {
      min-width: 60px;
      font-weight: bold;
    }
    
    .alice { color: #00CED1; }
    .bob { color: #FFD700; }
    .carol { color: #DA70D6; }
    .bx { color: #ff6b6b; }
    .system { color: #90EE90; }
    
    .log-message {
      flex: 1;
    }
    
    /* Log level styling */
    .log-entry.error .log-message { color: #ff4444; }
    .log-entry.perf .log-message { color: #32cd32; }
    .log-entry.trace .log-message { color: #888888; }
    .log-entry.info .log-message { color: #e0e0e0; }
    
    .brainxchange-terminal {
      background: #0f1419;
      border-top: 2px solid #ff6b6b;
    }
    
    .brainxchange-terminal .terminal-header {
      background: #1a1f29;
    }
    
    .brainxchange-terminal .terminal-title {
      color: #ff6b6b;
    }
    
    .response {
      color: #dcdcaa;
      margin: 10px 0;
      padding: 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      border-left: 3px solid #4ec9b0;
    }
    
    .error {
      color: #f44747;
      border-left-color: #f44747;
    }
    
    .command {
      color: #9cdcfe;
    }
    
    .footer {
      background: #2d2d30;
      padding: 5px 20px;
      border-top: 1px solid #3e3e42;
      font-size: 11px;
      color: #808080;
      text-align: center;
    }
    
    .scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    
    .scrollbar::-webkit-scrollbar-track {
      background: #2d2d30;
    }
    
    .scrollbar::-webkit-scrollbar-thumb {
      background: #4a4a4a;
      border-radius: 4px;
    }
    
    .terminal-content, .console-content {
      scrollbar-width: thin;
      scrollbar-color: #4a4a4a #2d2d30;
    }
  </style>
</head>
<body>
  <div class="dashboard">
    <div class="header">
      <div class="title">🧠 BrainBridge Local Network</div>
      <div class="metrics" id="metrics">
        <div class="metric">Loading metrics...</div>
      </div>
    </div>
    
    <div class="main-area">
      <!-- Alice Terminal -->
      <div class="brain-terminal">
        <div class="terminal-header">
          <div class="terminal-title alice">Alice Terminal</div>
          <div class="terminal-status" id="alice-status">OFFLINE</div>
        </div>
        <div class="terminal-content scrollbar" id="alice-terminal"></div>
        <div class="terminal-input">
          <span class="prompt alice">alice@brain:~$</span>
          <input type="text" id="alice-input" placeholder="Type command..." />
        </div>
      </div>
      
      <!-- Bob Terminal -->
      <div class="brain-terminal">
        <div class="terminal-header">
          <div class="terminal-title bob">Bob Terminal</div>
          <div class="terminal-status" id="bob-status">OFFLINE</div>
        </div>
        <div class="terminal-content scrollbar" id="bob-terminal"></div>
        <div class="terminal-input">
          <span class="prompt bob">bob@brain:~$</span>
          <input type="text" id="bob-input" placeholder="Type command..." />
        </div>
      </div>
      
      <!-- Carol Terminal -->
      <div class="brain-terminal">
        <div class="terminal-header">
          <div class="terminal-title carol">Carol Terminal</div>
          <div class="terminal-status" id="carol-status">OFFLINE</div>
        </div>
        <div class="terminal-content scrollbar" id="carol-terminal"></div>
        <div class="terminal-input">
          <span class="prompt carol">carol@brain:~$</span>
          <input type="text" id="carol-input" placeholder="Type command..." />
        </div>
      </div>
      
      <!-- Console Log -->
      <div class="console-log">
        <div class="terminal-header">
          <div class="terminal-title">System Console</div>
          <div style="color: #808080; font-size: 10px;">Live system logs</div>
        </div>
        <div class="console-content scrollbar" id="console-log"></div>
      </div>
    </div>
    
    <div class="footer">
      Press Enter to execute commands • Type 'help' for available commands • All instances running on localhost
    </div>
  </div>
  
  <script>
    const terminals = {};
    let logEntries = [];
    
    // Initialize terminal for each brain
    ['alice', 'bob', 'carol'].forEach(name => {
      terminals[name] = {
        history: [],
        currentIndex: -1
      };
      
      const input = document.getElementById(name + '-input');
      input.addEventListener('keydown', (e) => handleTerminalInput(e, name));
    });
    
    function handleTerminalInput(event, instance) {
      if (event.key === 'Enter') {
        const input = event.target;
        const command = input.value.trim();
        if (command) {
          executeCommand(instance, command);
          terminals[instance].history.unshift(command);
          terminals[instance].currentIndex = -1;
          input.value = '';
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const terminal = terminals[instance];
        if (terminal.currentIndex < terminal.history.length - 1) {
          terminal.currentIndex++;
          event.target.value = terminal.history[terminal.currentIndex];
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const terminal = terminals[instance];
        if (terminal.currentIndex > 0) {
          terminal.currentIndex--;
          event.target.value = terminal.history[terminal.currentIndex];
        } else if (terminal.currentIndex === 0) {
          terminal.currentIndex = -1;
          event.target.value = '';
        }
      }
    }
    
    async function executeCommand(instance, command) {
      const terminalContent = document.getElementById(instance + '-terminal');
      
      // Add command to terminal
      const commandDiv = document.createElement('div');
      commandDiv.innerHTML = \`<span class="prompt \${instance}">\${instance}@brain:~$</span> <span class="command">\${command}</span>\`;
      terminalContent.appendChild(commandDiv);
      
      if (command === 'clear') {
        terminalContent.innerHTML = '';
        return;
      }
      
      try {
        const response = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instance, command })
        });
        
        const result = await response.json();
        
        if (result.clear) {
          terminalContent.innerHTML = '';
          return;
        }
        
        // Add response to terminal
        const responseDiv = document.createElement('div');
        responseDiv.className = 'response';
        
        if (result.content && result.content[0]) {
          responseDiv.textContent = result.content[0].text;
        } else if (result.error) {
          responseDiv.className = 'response error';
          responseDiv.textContent = result.error;
        }
        
        terminalContent.appendChild(responseDiv);
        
        // Auto-scroll to bottom
        terminalContent.scrollTop = terminalContent.scrollHeight;
        
      } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'response error';
        errorDiv.textContent = 'Error: ' + error.message;
        terminalContent.appendChild(errorDiv);
        terminalContent.scrollTop = terminalContent.scrollHeight;
      }
    }
    
    async function refreshStatus() {
      try {
        const response = await fetch('/api/instances');
        const instances = await response.json();
        
        instances.forEach(instance => {
          const statusElement = document.getElementById(instance.name + '-status');
          if (statusElement) {
            statusElement.textContent = instance.status.toUpperCase();
            statusElement.className = 'terminal-status ' + instance.status;
          }
        });
      } catch (error) {
        console.error('Failed to refresh status:', error);
      }
    }
    
    async function refreshMetrics() {
      try {
        const response = await fetch('/api/metrics');
        const metrics = await response.json();
        
        const metricsElement = document.getElementById('metrics');
        const totalMemories = Object.values(metrics).reduce((sum, m) => sum + m.total, 0);
        const totalSize = Object.values(metrics).reduce((sum, m) => sum + m.size, 0);
        
        const sizeFormatted = (totalSize / 1024).toFixed(1) + 'KB';
        
        metricsElement.innerHTML = \`
          <div class="metric">Total Memories: \${totalMemories}</div>
          <div class="metric">Total Size: \${sizeFormatted}</div>
          <div class="metric alice">Alice: \${metrics.alice?.total || 0}</div>
          <div class="metric bob">Bob: \${metrics.bob?.total || 0}</div>
          <div class="metric carol">Carol: \${metrics.carol?.total || 0}</div>
        \`;
      } catch (error) {
        console.error('Failed to refresh metrics:', error);
      }
    }
    
    function addConsoleLog(instance, message, type = 'info') {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour12: false }).slice(0, 8);
      
      logEntries.push({ time, instance, message, type });
      
      // Keep only last 100 entries
      if (logEntries.length > 100) {
        logEntries = logEntries.slice(-100);
      }
      
      updateConsoleLog();
    }
    
    function updateConsoleLog() {
      const consoleLog = document.getElementById('console-log');
      consoleLog.innerHTML = logEntries.map(entry => \`
        <div class="log-entry \${entry.type || 'info'}">
          <div class="log-time">\${entry.time}</div>
          <div class="log-instance \${entry.instance}">\${entry.instance.toUpperCase()}</div>
          <div class="log-message">\${entry.message}</div>
        </div>
      \`).join('');
      
      consoleLog.scrollTop = consoleLog.scrollHeight;
    }
    
    // Initialize with welcome messages
    ['alice', 'bob', 'carol'].forEach(name => {
      const terminal = document.getElementById(name + '-terminal');
      terminal.innerHTML = \`
        <div style="color: #4ec9b0; margin-bottom: 15px;">
          Welcome to \${name.charAt(0).toUpperCase() + name.slice(1)}'s Brain Terminal
          <br>Type 'help' for available commands
          <br>----------------------------------------
        </div>
      \`;
    });
    
    // Add initial console logs
    addConsoleLog('system', 'BrainBridge Local Network started');
    addConsoleLog('alice', 'Brain instance initialized');
    addConsoleLog('bob', 'Brain instance initialized');
    addConsoleLog('carol', 'Brain instance initialized');
    addConsoleLog('bx', 'BrainXchange network connection established');
    
    // Start periodic updates
    refreshStatus();
    refreshMetrics();
    setInterval(refreshStatus, 3000);
    setInterval(refreshMetrics, 5000);
    
    // Connect to live log stream
    const eventSource = new EventSource('/api/logs/stream');
    
    eventSource.onmessage = function(event) {
      try {
        const logData = JSON.parse(event.data);
        addConsoleLog(logData.instance, logData.message, logData.level);
      } catch (error) {
        console.error('Failed to parse log data:', error);
      }
    };
    
    eventSource.onerror = function(error) {
      console.error('EventSource connection error:', error);
      addConsoleLog('system', 'Log stream connection lost - attempting reconnect...', 'error');
    };
    
    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
      eventSource.close();
    });
  </script>
</body>
</html>
  `);
});

// Start the dashboard server
app.listen(PORT, () => {
  console.log('🧠 BrainBridge Local Dashboard');
  console.log('================================');
  console.log(`✨ Dashboard running at: http://localhost:${PORT}`);
  console.log('\nMake sure the launcher is running first:');
  console.log('  npm run start');
  console.log('\nPress Ctrl+C to stop the dashboard\n');
});