/**
 * CommonJS Path Utilities for Dev Scripts
 * 
 * Provides robust project path resolution for development scripts
 * that need to work consistently regardless of where they're called from.
 */

const path = require('path');
const fs = require('fs');

/**
 * Get the project root directory - ROBUST VERSION
 * Walks up the directory tree looking for MAGI project markers
 */
function getProjectRoot() {
  if (process.env.MAGI_ROOT) {
    return process.env.MAGI_ROOT;
  }
  
  // Start from current script location and walk up until we find project root markers
  let currentDir = __dirname;
  const maxLevels = 10; // Safety limit to prevent infinite loops
  
  for (let i = 0; i < maxLevels; i++) {
    // Look for MAGI project root indicators - must have multiple key files
    const requiredIndicators = [
      'config.js',      // MAGI config
      'bin/magi'        // MAGI CLI script
    ];
    
    const optionalIndicators = [
      'data/memories',  // MAGI memory storage
      '.git'           // Git repository
    ];
    
    // Must have ALL required indicators
    const hasAllRequired = requiredIndicators.every(indicator => {
      const fullPath = path.join(currentDir, indicator);
      return fs.existsSync(fullPath);
    });
    
    // And at least one optional indicator
    const hasOptional = optionalIndicators.some(indicator => {
      const fullPath = path.join(currentDir, indicator);
      return fs.existsSync(fullPath);
    });
    
    if (hasAllRequired && hasOptional) {
      return currentDir;
    }
    
    // Go up one level
    const parentDir = path.dirname(currentDir);
    
    // If we've reached the root of the filesystem, stop
    if (parentDir === currentDir) {
      break;
    }
    
    currentDir = parentDir;
  }
  
  // Fallback: if we can't find project root, use relative path from dev/scripts
  console.warn('⚠️  Could not find project root using indicators, falling back to relative path');
  return path.resolve(__dirname, '../..');
}

/**
 * Get the memories directory for a specific profile
 */
function getMemoriesPath(profile = 'default') {
  // Custom path overrides everything
  if (process.env.MEMORIES_DIR) {
    return process.env.MEMORIES_DIR;
  }
  
  const location = process.env.MEMORIES_LOCATION || 'project';
  
  if (location === 'documents') {
    const os = require('os');
    return path.join(os.homedir(), 'Documents', 'memories', 'profiles', profile);
  }
  
  // Default: project/data/memories/profiles/profile
  return path.join(getProjectRoot(), 'data', 'memories', 'profiles', profile);
}

/**
 * Get the BrainBridge logs directory
 */
function getLogsDir() {
  return path.join(getProjectRoot(), 'services', 'brainbridge', 'logs');
}

/**
 * Get path to project .env file
 */
function getEnvPath() {
  return path.join(getProjectRoot(), '.env');
}

/**
 * Get embeddings directory for a specific provider
 */
function getEmbeddingsPath(provider = 'openai', profile = 'default') {
  return path.join(getMemoriesPath(profile), 'embeddings', provider);
}

module.exports = {
  getProjectRoot,
  getMemoriesPath,
  getLogsDir,
  getEnvPath,
  getEmbeddingsPath
};