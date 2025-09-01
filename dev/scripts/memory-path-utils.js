#!/usr/bin/env node

/**
 * Centralized Memory Path Utilities for Scripts
 * Provides consistent path resolution across all dev scripts
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Get the memories path for a specific profile
 * @param {string} profile - Profile name (default: 'default')
 * @returns {string} Full path to the profile's memory directory
 */
function getMemoriesPath(profile = 'default') {
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
 * @returns {string} Base directory containing all memory profiles
 */
function getBaseMemoriesDir() {
  // Simple flag: "project" or "documents"
  const location = process.env.MEMORIES_LOCATION || 'project';
  
  if (location === 'documents') {
    return path.join(os.homedir(), 'Documents', 'memories');
  }
  
  // Default: ./data/memories in project root
  return path.join(process.cwd(), 'data', 'memories');
}

/**
 * Get all available profiles
 * @returns {string[]} Array of profile names
 */
function getAvailableProfiles() {
  const baseDir = getBaseMemoriesDir();
  const profiles = [];
  
  // Add all profiles from profiles/ directory
  const profilesDir = path.join(baseDir, 'profiles');
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
 * @param {string} profile - Profile name to check
 * @returns {boolean} True if profile exists
 */
function profileExists(profile) {
  return getAvailableProfiles().includes(profile);
}

/**
 * Find the best available memories path (for legacy script compatibility)
 * @returns {string|null} Path to first found memories directory, or null
 */
function findMemoriesPath() {
  // Try new profile structure first
  const defaultProfile = getMemoriesPath('default');
  if (fs.existsSync(defaultProfile)) {
    return defaultProfile;
  }
  
  // Fallback to legacy paths for migration
  const legacyPaths = [
    path.join(process.cwd(), 'data', 'memories', 'main'), // Old main path
    path.join(process.cwd(), 'memories'), // Very old path
    path.join(process.cwd(), '..', 'memories'), // External path
    path.join(os.homedir(), 'Documents', 'memories'), // Documents path
    process.env.MEMORIES_DIR // Custom path
  ].filter(Boolean);
  
  for (const memoryPath of legacyPaths) {
    if (fs.existsSync(memoryPath)) {
      return memoryPath;
    }
  }
  
  return null;
}

/**
 * Get memory statistics for a profile
 * @param {string} profile - Profile name (default: 'default')  
 * @returns {object} Statistics object with counts per privacy level
 */
function getMemoryStats(profile = 'default') {
  const memoriesPath = getMemoriesPath(profile);
  const stats = {
    profile,
    path: memoriesPath,
    exists: fs.existsSync(memoriesPath),
    levels: {},
    total: 0
  };
  
  if (!stats.exists) {
    return stats;
  }
  
  const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
  
  for (const level of privacyLevels) {
    const levelDir = path.join(memoriesPath, level);
    if (fs.existsSync(levelDir)) {
      const files = fs.readdirSync(levelDir)
        .filter(f => f.endsWith('.md') && !f.startsWith('.'));
      stats.levels[level] = files.length;
      stats.total += files.length;
    } else {
      stats.levels[level] = 0;
    }
  }
  
  return stats;
}

module.exports = {
  getMemoriesPath,
  getBaseMemoriesDir,
  getAvailableProfiles,
  profileExists,
  findMemoriesPath,
  getMemoryStats
};