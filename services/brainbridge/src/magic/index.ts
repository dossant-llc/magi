#!/usr/bin/env node

/**
 * mAGIc CLI - Local AI for AGIfor.me
 * Entry point for privacy-first local AI operations
 */

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getProjectRoot } from '../utils/magi-paths.js';

// Load root .env configuration
dotenv.config({ path: path.join(getProjectRoot(), '.env') });
import { saveCommand } from './commands/save';
import { queryCommand } from './commands/query';
import { statusCommand } from './commands/status';
import { indexCommand } from './commands/index';
import { napCommand } from './commands/nap';
import { metricsCommand } from './commands/metrics';
import { recategorizeCommand } from './commands/recategorize';
import { logsCommand } from './commands/logs';

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

program
  .command('metrics')
  .description('📊 Show effectiveness dashboard with real performance metrics')
  .option('-d, --days <number>', 'Days of metrics to analyze', '7')
  .option('--json', 'Output raw JSON data')
  .option('--backfill', 'Generate historical metrics from existing memory files')
  .action((options) => metricsCommand({ ...options, days: parseInt(options.days || '7') }));

program
  .command('recategorize')
  .description('🔄 Fix privacy level categorization of existing memories')
  .option('--from <privacy>', 'Only analyze files from this privacy level')
  .option('--to <privacy>', 'Suggest moving files to this privacy level')
  .option('--preview', 'Show detailed reasoning for suggestions')
  .option('--apply', 'Actually move the files (high confidence only)')
  .action(recategorizeCommand);

program
  .command('nap [subcommand]')
  .description('🧠💤 Analyze and consolidate memories (v0.1.2 "Nap")')
  .option('--deep', 'Perform deep analysis with recommendations')
  .option('--preview', 'Show proposed consolidated file contents')
  .option('--apply', 'Actually consolidate scattered memory files')
  .action((subcommand, options) => {
    if (subcommand === 'status') {
      napCommand({ status: true });
    } else if (subcommand === 'preview') {
      napCommand({ ...options, preview: true });
    } else if (subcommand === 'apply') {
      napCommand({ ...options, apply: true });
    } else {
      napCommand(options);
    }
  });

program
  .command('logs')
  .description('📋 Show recent mAGIc system logs')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .option('-f, --follow', 'Follow logs in real-time (like tail -f)')
  .option('--errors', 'Show only errors and warnings')
  .action(logsCommand);

// Parse arguments
program.parse(process.argv);