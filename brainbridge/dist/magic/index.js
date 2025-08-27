#!/usr/bin/env node
"use strict";
/**
 * mAGIc CLI - Local AI for AGIfor.me
 * Entry point for privacy-first local AI operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const save_1 = require("./commands/save");
const query_1 = require("./commands/query");
const status_1 = require("./commands/status");
const index_1 = require("./commands/index");
const program = new commander_1.Command();
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
    .action(save_1.saveCommand);
program
    .command('query <question>')
    .alias('tell')
    .description('Ask questions about your knowledge base')
    .option('-p, --privacy <level>', 'Maximum privacy level to search', 'personal')
    .option('-l, --limit <number>', 'Maximum number of results', '5')
    .action(query_1.queryCommand);
// Utility commands
program
    .command('status')
    .description('Show mAGIc system status')
    .action(status_1.statusCommand);
program
    .command('index')
    .description('Build/rebuild vector index from memories')
    .option('-f, --force', 'Force rebuild entire index')
    .action(index_1.indexCommand);
// Parse arguments
program.parse(process.argv);
