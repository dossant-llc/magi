#!/usr/bin/env node

const path = require('path');

/**
 * Get the project root directory
 * Priority: MAGI_ROOT env var > auto-detect from script location
 */
function getProjectRoot() {
  if (process.env.MAGI_ROOT) {
    return process.env.MAGI_ROOT;
  }
  // Fallback to detecting from this file's location
  return path.resolve(__dirname, '..');
}

/**
 * Get the BrainBridge logs directory
 */
function getLogsDir() {
  return path.join(getProjectRoot(), 'services', 'brainbridge', 'logs');
}

/**
 * Get the memories directory
 */
function getMemoriesDir() {
  const location = process.env.MEMORIES_LOCATION || 'project';
  const profile = process.env.INSTANCE_NAME || 'default';
  
  if (location === 'documents') {
    return path.join(require('os').homedir(), 'Documents', 'memories', 'profiles', profile);
  }
  return path.join(getProjectRoot(), 'data', 'memories', 'profiles', profile);
}

/**
 * Get the MCP logs directory for Claude
 */
function getMcpLogsDir() {
  return path.join(
    require('os').homedir(),
    'Library', 'Caches', 'claude-cli-nodejs',
    '-Users-igor-Documents-code-agiforme',
    'mcp-logs-magi'
  );
}

module.exports = {
  getProjectRoot,
  getLogsDir,
  getMemoriesDir,
  getMcpLogsDir
};