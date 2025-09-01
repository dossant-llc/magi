#!/usr/bin/env node

const chalk = require('chalk');
const { execSync } = require('child_process');

// Check if chalk is available, fallback to no colors
let colors = {
  title: (text) => text,
  category: (text) => text,
  command: (text) => text,
  description: (text) => text,
  example: (text) => text,
  dim: (text) => text
};

try {
  colors = {
    title: chalk.bold.cyan,
    category: chalk.bold.yellow,
    command: chalk.green,
    description: chalk.white,
    example: chalk.dim,
    dim: chalk.dim
  };
} catch (e) {
  // Fallback to no colors if chalk not available
}

const commands = {
  'Getting Started': [
    { cmd: 'npm run help', desc: 'Show this help message' },
    { cmd: 'npm run magi', desc: '🧙‍♂️ Interactive CLI - chat with your memories' },
    { cmd: 'npm run quick', desc: 'Fastest way to get running (stdio mode)' },
    { cmd: './start.sh', desc: 'Start BrainBridge (alternative to quick)' },
    { cmd: 'npm run setup', desc: 'Initial setup and configuration' }
  ],
  'Single Brain (bb:*)': [
    { cmd: 'npm run bb:stdio', desc: 'Start BrainBridge in stdio mode (for Claude Code)' },
    { cmd: 'npm run bb:cli', desc: 'Interactive CLI for testing BrainBridge' },
    { cmd: 'npm run bb:logs', desc: 'Tail BrainBridge logs (formatted)' },
    { cmd: 'npm run bb:logs:clear', desc: 'Clear BrainBridge logs' },
    { cmd: 'npm run bb:trace', desc: 'Start with detailed trace logging' },
    { cmd: 'npm run bb:trace:logs', desc: 'Show only trace logs' }
  ],
  'Multi-Brain Dev (mb:*)': [
    { cmd: 'npm run mb:start', desc: 'Start local multi-brain network (Alice, Bob, Carol)' },
    { cmd: 'npm run mb:dashboard', desc: 'Open web dashboard for multi-brain network' },
    { cmd: 'npm run mb:logs', desc: 'Tail all multi-brain instance logs' },
    { cmd: 'npm run mb:stop', desc: 'Stop all multi-brain instances' },
    { cmd: 'npm run mb:clean', desc: 'Clean multi-brain logs' }
  ],
  'P2P Network (bx:*)': [
    { cmd: 'npm run bx:status', desc: 'Show BrainXchange P2P network status' },
    { cmd: 'npm run bx:invite', desc: 'Create invitation for peer connection' },
    { cmd: 'npm run bx:connect', desc: 'Connect to a peer' },
    { cmd: 'npm run bx:peers', desc: 'List connected peers' }
  ],
  'AI/Models (ai:*)': [
    { cmd: 'npm run ai:status', desc: 'Check Ollama status and available models' },
    { cmd: 'npm run ai:pull', desc: 'Pull required AI models (llama3.1:8b, mxbai-embed-large)' },
    { cmd: 'npm run ai:models', desc: 'List all installed Ollama models' }
  ],
  'Memory Management (mem:*)': [
    { cmd: 'npm run mem:backup', desc: 'Backup memories directory' },
    { cmd: 'npm run mem:stats', desc: 'Show memory usage statistics' },
    { cmd: 'npm run mem:clean', desc: 'Clean up old or orphaned memories' }
  ],
  'System Health (sys:*)': [
    { cmd: 'npm run sys:check', desc: 'Full system health check (Ollama, ports, models)' },
    { cmd: 'npm run sys:ports', desc: 'Show what\'s running on which ports' },
    { cmd: 'npm run sys:reset', desc: 'Clean restart everything' }
  ],
  'Quality & Testing': [
    { cmd: 'npm run qc', desc: 'Run quality checks on codebase' },
    { cmd: 'npm run magic', desc: 'Run magic scripts and utilities' },
    { cmd: 'npm run test', desc: 'Run test suites' },
    { cmd: 'npm run test:mcp', desc: 'Test MCP protocol connection' },
    { cmd: 'npm run test:chat', desc: 'Test chat functionality (one-shot)' },
    { cmd: 'npm run build', desc: 'Build all workspaces' }
  ]
};

const examples = [
  {
    title: 'Quick Start for New Users',
    steps: [
      '1. npm run quick                 # Start in stdio mode',
      '2. Open Claude Code and start using "magi" commands'
    ]
  },
  {
    title: 'Development with Multi-Brain',
    steps: [
      '1. npm run ai:pull              # Ensure models are available',
      '2. npm run mb:start             # Start multi-brain network',
      '3. npm run mb:dashboard         # Open web dashboard',
      '4. Test @mentions between brains'
    ]
  },
  {
    title: 'Debugging Issues',
    steps: [
      '1. npm run sys:check            # Check system health',
      '2. npm run bb:trace             # Start with detailed logging',
      '3. npm run bb:trace:logs        # Monitor trace output'
    ]
  }
];

function showHelp() {
  console.log(colors.title('\n🧠 AGIfor.me - Your Personal AI Memory Bank\n'));
  
  // Show command categories
  Object.entries(commands).forEach(([category, cmds]) => {
    console.log(colors.category(`${category}:`));
    cmds.forEach(({ cmd, desc }) => {
      console.log(`  ${colors.command(cmd.padEnd(30))} ${colors.description(desc)}`);
    });
    console.log('');
  });

  // Show examples
  console.log(colors.category('Common Usage Examples:'));
  examples.forEach(({ title, steps }) => {
    console.log(colors.example(`\n  ${title}:`));
    steps.forEach(step => {
      console.log(colors.example(`    ${step}`));
    });
  });

  console.log(colors.dim('\n📚 For more details, see README.md and docs/ directory'));
  console.log(colors.dim('🔧 System requirements: Node.js 22+, Ollama (for AI features)\n'));
}

// Handle specific category help
const category = process.argv[2];
if (category && commands[category]) {
  console.log(colors.category(`\n${category}:\n`));
  commands[category].forEach(({ cmd, desc }) => {
    console.log(`  ${colors.command(cmd.padEnd(30))} ${colors.description(desc)}`);
  });
  console.log('');
} else {
  showHelp();
}