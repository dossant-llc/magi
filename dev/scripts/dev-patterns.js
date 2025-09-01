#!/usr/bin/env node

/**
 * Dev Patterns - Natural language pattern matching for development questions
 * Used by Magi hybrid assistant for instant responses to common dev queries
 */

const { 
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
} = require('./dev-handlers');

const patterns = [
  // System status queries
  { 
    regex: /^(status|health|check|refresh)$/i, 
    handler: systemStatus,
    description: 'Show full system status'
  },
  
  // Process checking
  { 
    regex: /is\s+(.*?)\s+(running|up|alive)/i, 
    handler: (match) => checkProcess(match[1]),
    description: 'Check if a service is running'
  },
  { 
    regex: /is\s+(bc|braincloud)\s+(running|up|alive)?/i, 
    handler: () => checkProcess('braincloud'),
    description: 'Check if BrainCloud is running'
  },
  { 
    regex: /is\s+(bb|brainbridge)\s+(running|up|alive)?/i, 
    handler: () => checkProcess('brainbridge'),
    description: 'Check if BrainBridge is running'
  },
  { 
    regex: /is\s+(ollama)\s+(running|up|alive)?/i, 
    handler: () => checkProcess('ollama'),
    description: 'Check if Ollama is running'
  },
  { 
    regex: /is\s+(bp|brain.?proxy)\s+(running|up|alive|connected)?/i, 
    handler: () => checkProcess('brain-proxy'),
    description: 'Check if Brain Proxy is connected'
  },
  { 
    regex: /is\s+(bx|brainxchange)\s+(running|up|alive|active)?/i, 
    handler: () => checkProcess('brainxchange'),
    description: 'Check if BrainXchange is active'
  },
  
  // Port queries
  { 
    regex: /what.*port.*(\d+)/i, 
    handler: (match) => checkPort(match[1]),
    description: 'Check what\'s running on a specific port'
  },
  { 
    regex: /ports?$/i, 
    handler: showPorts,
    description: 'Show all active ports'
  },
  
  // Command explanations
  { 
    regex: /what.*does.*npm run\s+([^\s?]+)/i, 
    handler: (match) => explainCommand(match[1]),
    description: 'Explain what an npm script does'
  },
  { 
    regex: /what.*is.*npm run\s+([^\s?]+)/i, 
    handler: (match) => explainCommand(match[1]),
    description: 'Explain what an npm script is'
  },
  { 
    regex: /explain\s+([^\s?]+)/i, 
    handler: (match) => explainCommand(match[1]),
    description: 'Explain a command'
  },
  
  // Process management
  { 
    regex: /show.*process(es)?/i, 
    handler: listProcesses,
    description: 'List BrainBridge processes'
  },
  { 
    regex: /(ps|processes)$/i, 
    handler: listProcesses,
    description: 'List BrainBridge processes'
  },
  { 
    regex: /kill\s+(all|everything)/i, 
    handler: killAll,
    description: 'Kill all BrainBridge processes'
  },
  { 
    regex: /restart\s+(.+)/i, 
    handler: (match) => restartService(match[1]),
    description: 'Restart a service'
  },
  
  // AI/Model queries
  { 
    regex: /models?$/i, 
    handler: showModels,
    description: 'Show Ollama models'
  },
  { 
    regex: /(ai|ollama)\s+(status|models)/i, 
    handler: showModels,
    description: 'Show AI/Ollama status'
  },
  
  // Logs
  { 
    regex: /^logs?$/i, 
    handler: showLogs,
    description: 'Show recent logs + streaming companion info'
  },
  { 
    regex: /show.*logs?/i, 
    handler: showLogs,
    description: 'Show recent logs'
  },
  { 
    regex: /(streaming|companion|watch).*logs?/i, 
    handler: showLogs,
    description: 'Show companion streaming setup'
  },
  { 
    regex: /^companion$/i, 
    handler: showLogs,
    description: 'Show log streaming companion info'
  },
  
  // Memory queries
  { 
    regex: /(what|which).*folder.*(memor|reading)/i, 
    handler: showMemoryPath,
    description: 'Show memory storage location'
  },
  { 
    regex: /memor.*path|path.*memor/i, 
    handler: showMemoryPath,
    description: 'Show memory storage path'
  },
  { 
    regex: /where.*(memor|stored)/i, 
    handler: showMemoryPath,
    description: 'Show memory storage location'
  },
  
  // Setup and Bootstrap commands
  {
    regex: /^(bootstrap|setup|install).*$/i,
    handler: bootstrapSystem,
    description: 'Bootstrap/setup system with dependencies and models'
  },
  {
    regex: /^bootstrap what you need$/i,
    handler: bootstrapSystem,
    description: 'Smart bootstrap - install what you need'
  },
  
  // Memory management commands
  {
    regex: /^save\s+(.+)$/i,
    handler: saveMemory,
    description: 'Save content to memories'
  },
  {
    regex: /^(query|search|what|find)\s+(.+)$/i,
    handler: queryMemories,
    description: 'Query/search memories'
  },
  
  // Profile management commands
  {
    regex: /^profiles?$/i,
    handler: showProfiles,
    description: 'List available profiles'
  },
  
  // Utility commands
  { 
    regex: /^(clear|cls)$/i, 
    handler: clearScreen,
    description: 'Clear screen'
  },
  { 
    regex: /^(exit|quit|bye)$/i, 
    handler: exitMagi,
    description: 'Exit magi'
  },
  { 
    regex: /^(help|\?)$/i, 
    handler: showHelp,
    description: 'Show available dev commands'
  }
];

/**
 * Try to match input against dev patterns
 * @param {string} input - User input
 * @returns {Promise<string|null>} Response or null if no match
 */
async function tryPatterns(input) {
  const trimmed = input.trim();
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      try {
        // Some handlers expect the match array, others don't need it
        // Pass match for handlers that need capture groups
        const result = await pattern.handler(match);
        return result;
      } catch (error) {
        // More detailed error reporting for debugging
        console.error(`Pattern handler error for "${trimmed}":`, error);
        return `❌ Error: ${error.message}`;
      }
    }
  }
  
  return null;
}

/**
 * Check if input looks like a complex dev question that should go to LLM
 * @param {string} input - User input
 * @returns {boolean}
 */
function isComplexDevQuestion(input) {
  const complexPatterns = [
    /how do i/i,
    /what should i do/i,
    /troubleshoot/i,
    /debug/i,
    /fix/i,
    /error/i,
    /problem/i,
    /issue/i,
    /why is/i,
    /why does/i,
    /why won't/i
  ];
  
  return complexPatterns.some(pattern => pattern.test(input));
}

/**
 * Get help text for all available patterns
 * @returns {string}
 */
function getPatternHelp() {
  const help = patterns.map(p => `  ${p.description}`).join('\n');
  return `🧙 Magi Dev Commands:\n\n${help}\n\n💡 Log Companion:\n  Terminal 1: npm run bb:logs (streaming logs)\n  Terminal 2: npm run magi (this interface)\n\nPrefix with 'ask:' to force LLM mode for complex questions.`;
}

module.exports = {
  tryPatterns,
  isComplexDevQuestion,
  getPatternHelp,
  patterns
};