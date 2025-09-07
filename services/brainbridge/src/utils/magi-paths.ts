/**
 * Centralized Path Management for BrainBridge
 * Uses consistent path resolution across all components
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Get the project root directory - ROBUST VERSION
 * Priority: MAGI_ROOT env var > auto-detect by finding project markers
 */
export function getProjectRoot(): string {
  if (process.env.MAGI_ROOT) {
    return process.env.MAGI_ROOT;
  }
  
  const fs = require('fs');
  
  // Start from current file location and walk up until we find project root markers
  let currentDir = __dirname;
  const maxLevels = 10; // Safety limit to prevent infinite loops
  
  for (let i = 0; i < maxLevels; i++) {
    // Look for MAGI project root indicators - must have multiple key files
    const requiredIndicators = [
      'config.js',      // MAGI config
      'bin/magi'        // MAGI CLI script
    ];
    
    const optionalIndicators = [
      'data/memories/profiles',  // MAGI memory storage (more specific)
      '.git'                    // Git repository
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
      // Additional validation: ensure this is actually a MAGI project
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          // Look for MAGI-specific indicators in package.json
          if (packageJson.name === 'agiforme' || 
              packageJson.description?.includes('mAGI') ||
              packageJson.scripts?.['magic'] ||
              packageJson.workspaces?.includes('services/brainbridge')) {
            return currentDir;
          }
        } catch (error) {
          // If package.json is malformed, continue searching
        }
      }
      // If no package.json validation, still accept (for compatibility)
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
  
  // Fallback: if we can't find project root, use the old method but warn about it
  console.warn('⚠️  Could not find project root using indicators, falling back to relative path');
  return path.resolve(__dirname, '..', '..', '..', '..');
}

/**
 * Get the memories directory for a specific profile
 */
export function getMemoriesPath(profile: string = 'default'): string {
  // Custom path overrides everything
  if (process.env.MEMORIES_DIR) {
    return process.env.MEMORIES_DIR;
  }
  
  const location = process.env.MEMORIES_LOCATION || 'project';
  
  if (location === 'documents') {
    return path.join(os.homedir(), 'Documents', 'memories', 'profiles', profile);
  }
  
  // Default: project/data/memories/profiles/profile
  return path.join(getProjectRoot(), 'data', 'memories', 'profiles', profile);
}

/**
 * Get the BrainBridge logs directory
 */
export function getLogsDir(): string {
  return path.join(getProjectRoot(), 'services', 'brainbridge', 'logs');
}

/**
 * Get available profiles
 */
export function getAvailableProfiles(): string[] {
  const fs = require('fs');
  const profilesDir = path.join(getProjectRoot(), 'data', 'memories', 'profiles');
  
  if (!fs.existsSync(profilesDir)) {
    return ['default'];
  }
  
  try {
    return fs.readdirSync(profilesDir, { withFileTypes: true })
      .filter((dirent: any) => dirent.isDirectory())
      .map((dirent: any) => dirent.name);
  } catch (error) {
    return ['default'];
  }
}

/**
 * Check if a profile exists
 */
export function profileExists(profile: string): boolean {
  return getAvailableProfiles().includes(profile);
}

/**
 * STRONG .env reader - bypasses process.env completely
 * Reads AI_PROVIDER directly from root .env file to ensure consistency
 */
export function getProviderFromDotEnv(): string {
  const fs = require('fs');
  const envPath = path.join(getProjectRoot(), '.env');
  
  if (!fs.existsSync(envPath)) {
    return 'ollama'; // default
  }
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for AI_PROVIDER=value, ignore comments
      if (trimmed.startsWith('AI_PROVIDER=') && !trimmed.startsWith('#')) {
        const value = trimmed.split('=')[1]?.trim() || 'ollama';
        return value;
      }
    }
  } catch (error) {
    // If any error reading file, fall back to default
  }
  
  return 'ollama'; // default if not found
}