/**
 * Common utilities for development scripts
 * Provides shared functionality to avoid code duplication
 */

const path = require('path');
const { getProjectRoot } = require('../../utils/magi-root');

// Load .env configuration once
require('dotenv').config({ path: path.join(getProjectRoot(), '.env') });

/**
 * Standard color codes for consistent terminal output
 */
const colors = {
  // Basic colors
  prompt: '\x1b[36m',
  success: '\x1b[92m',
  system: '\x1b[33m',
  error: '\x1b[31m',
  hint: '\x1b[90m',
  info: '\x1b[36m',
  warning: '\x1b[33m',
  
  // Additional common colors
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Special
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

/**
 * Get the current AI provider from environment
 */
function getAIProvider() {
  return process.env.AI_PROVIDER || 'ollama';
}

/**
 * Standard formatted timestamp for consistent logging
 */
function getTimestamp() {
  return new Date().toLocaleTimeString();
}

/**
 * Colored log functions for consistent output
 */
const log = {
  info: (message) => console.log(`${colors.info}${message}${colors.reset}`),
  success: (message) => console.log(`${colors.success}${message}${colors.reset}`),
  error: (message) => console.log(`${colors.error}${message}${colors.reset}`),
  warning: (message) => console.log(`${colors.warning}${message}${colors.reset}`),
  system: (message) => console.log(`${colors.system}${message}${colors.reset}`),
  hint: (message) => console.log(`${colors.hint}${message}${colors.reset}`)
};

/**
 * Check if we're running in development mode
 */
function isDev() {
  return process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
}

module.exports = {
  colors,
  log,
  getAIProvider,
  getTimestamp,
  isDev,
  getProjectRoot
};