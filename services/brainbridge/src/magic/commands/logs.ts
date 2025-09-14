#!/usr/bin/env node

/**
 * mAGIc Logs Command - Quick access to system logs
 * Shows recent mAGIc system logs for debugging and monitoring
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { getLogsDir } from '../../utils/magi-paths.js';

interface LogsOptions {
  lines?: string;
  follow?: boolean;
  errors?: boolean;
}

export async function logsCommand(options: LogsOptions = {}) {
  const lines = parseInt(options.lines || '50');

  console.log('📋 mAGIc System Logs');
  console.log('═'.repeat(50));
  console.log('');

  // Use the proper path service
  const logsDir = getLogsDir();
  const mainLogFile = path.join(logsDir, 'brainbridge-default.log');

  if (!fs.existsSync(mainLogFile)) {
    console.log('❌ Log file not found at:', mainLogFile);
    console.log('💡 Make sure the BrainBridge service is running with: npm run dev');

    // Show available log files if any
    try {
      if (fs.existsSync(logsDir)) {
        const logFiles = fs.readdirSync(logsDir)
          .filter(f => f.endsWith('.log'))
          .map(f => `   • ${f}`);
        if (logFiles.length > 0) {
          console.log('📋 Available log files:');
          console.log(logFiles.join('\n'));
        }
      }
    } catch (e) {
      // Ignore directory read errors
    }
    return;
  }

  try {
    if (options.follow) {
      console.log('👁️  Following logs in real-time (press Ctrl+C to stop)...');
      console.log('');

      // Use tail -f for real-time following
      const tailArgs = ['-f', '-n', lines.toString()];
      if (options.errors) {
        // Pipe through grep for errors only
        const tail = spawn('tail', [...tailArgs, mainLogFile]);
        const grep = spawn('grep', ['-i', '--color=always', 'error\\|warn\\|fail']);

        tail.stdout.pipe(grep.stdin);
        grep.stdout.pipe(process.stdout);
        grep.stderr.pipe(process.stderr);

        process.on('SIGINT', () => {
          tail.kill();
          grep.kill();
          console.log('\n📋 Logs stopped.');
          process.exit(0);
        });
      } else {
        const tail = spawn('tail', [...tailArgs, mainLogFile], { stdio: 'inherit' });
        process.on('SIGINT', () => {
          tail.kill();
          console.log('\n📋 Logs stopped.');
          process.exit(0);
        });
      }
    } else {
      // Show recent logs
      console.log(`📄 Last ${lines} lines from mAGIc logs:`);
      console.log('');

      if (options.errors) {
        // Show only errors and warnings
        const { spawn } = require('child_process');
        const tail = spawn('tail', ['-n', lines.toString(), mainLogFile]);
        const grep = spawn('grep', ['-i', '--color=always', 'error\\|warn\\|fail']);

        let output = '';
        tail.stdout.pipe(grep.stdin);

        grep.stdout.on('data', (data: any) => {
          output += data.toString();
        });

        grep.on('close', () => {
          if (output.trim()) {
            console.log(output);
          } else {
            console.log('✅ No errors or warnings found in recent logs!');
          }
        });
      } else {
        // Show all recent logs
        const { execSync } = require('child_process');
        try {
          const output = execSync(`tail -n ${lines} "${mainLogFile}"`, { encoding: 'utf8' });
          console.log(output);
        } catch (error) {
          console.error('❌ Failed to read logs:', error);
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to access logs:', error.message);
    console.log('💡 Available log files:');

    try {
      const logFiles = fs.readdirSync(logsDir)
        .filter(f => f.endsWith('.log'))
        .map(f => `   • ${f}`);
      console.log(logFiles.join('\n'));
    } catch (e) {
      console.log('   • No log files found in:', logsDir);
    }
  }
}