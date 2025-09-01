/**
 * Memory Path Resolution with Default Profile Support
 * Uses 'main' as the default profile, with future multi-profile support
 */

import * as path from 'path';
import * as os from 'os';

export function getMemoriesPath(profile: string = 'default'): string {
  // Custom path overrides everything (for advanced users)
  if (process.env.MEMORIES_DIR) {
    return process.env.MEMORIES_DIR;
  }
  
  // Get base memories directory
  const baseMemoriesDir = getBaseMemoriesDir();
  
  // All profiles are in profiles/ directory for consistency
  return path.join(baseMemoriesDir, 'profiles', profile);
}

/**
 * Get the base memories directory location
 */
function getBaseMemoriesDir(): string {
  // Simple flag: "project" or "documents"
  const location = process.env.MEMORIES_LOCATION || 'project';
  
  if (location === 'documents') {
    return path.join(os.homedir(), 'Documents', 'memories');
  }
  
  // Default: ../../data/memories from services/brainbridge
  return path.join(process.cwd(), '..', '..', 'data', 'memories');
}

/**
 * Get available profiles
 */
export function getAvailableProfiles(): string[] {
  const baseDir = getBaseMemoriesDir();
  const profiles: string[] = [];
  
  // Add all profiles from profiles/ directory
  const profilesDir = path.join(baseDir, 'profiles');
  const fs = require('fs');
  if (fs.existsSync(profilesDir)) {
    const profileDirs = fs.readdirSync(profilesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    profiles.push(...profileDirs);
  }
  
  return profiles;
}


/**
 * Check if a profile exists
 */
export function profileExists(profile: string): boolean {
  return getAvailableProfiles().includes(profile);
}