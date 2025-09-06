/**
 * Centralized Path Management for BrainBridge
 * Uses consistent path resolution across all components
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Get the project root directory
 * Priority: MAGI_ROOT env var > auto-detect from script location
 */
export function getProjectRoot(): string {
  if (process.env.MAGI_ROOT) {
    return process.env.MAGI_ROOT;
  }
  // BrainBridge is at services/brainbridge, so go up 2 levels to project root
  return path.resolve(__dirname, '..', '..', '..');
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