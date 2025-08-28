#!/usr/bin/env node

/**
 * mAGIc CLI - Local AI for AGIfor.me
 * Entry point for privacy-first local AI operations
 */

import { Command } from 'commander';
import { saveCommand } from './commands/save';
import { queryCommand } from './commands/query';
import { statusCommand } from './commands/status';
import { indexCommand } from './commands/index';

const program = new Command();

program
  .name('magic')
  .description('mAGIc - Local AI for your personal knowledge base')
  .version('0.1.0');

// Core commands
program
  .command('save <content>')
  .description('Save content to your knowledge base with AI categorization')
  .option('-p, --privacy <level>', 'Privacy level (public|team|personal|private|sensitive)', 'personal')
  .option('-c, --category <category>', 'Category hint for AI classification')
  .action(saveCommand);

program
  .command('query <question>')
  .alias('tell')
  .description('Ask questions about your knowledge base')
  .option('-p, --privacy <level>', 'Maximum privacy level to search', 'personal')
  .option('-l, --limit <number>', 'Maximum number of results', '5')
  .action(queryCommand);

// Utility commands
program
  .command('status')
  .description('Show mAGIc system status')
  .action(statusCommand);

program
  .command('index')
  .description('Build/rebuild vector index from memories')
  .option('-f, --force', 'Force rebuild entire index')
  .action(indexCommand);

// Parse arguments
program.parse(process.argv);