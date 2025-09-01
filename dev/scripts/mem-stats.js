#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getMemoryStats, getAvailableProfiles, findMemoriesPath } = require('./memory-path-utils');

// Colors for output
const colors = {
  title: '\x1b[1m\x1b[36m',    // Bold cyan
  category: '\x1b[1m\x1b[33m', // Bold yellow
  stat: '\x1b[32m',            // Green
  path: '\x1b[90m',            // Gray
  reset: '\x1b[0m'             // Reset
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getDirectoryStats(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return { files: 0, size: 0, categories: {} };
  }

  let totalFiles = 0;
  let totalSize = 0;
  const categories = {};

  function scanDirectory(dir, categoryName = null) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // For privacy categories (public, personal, etc.)
          const newCategory = categoryName || item;
          if (!categories[newCategory]) {
            categories[newCategory] = { files: 0, size: 0 };
          }
          scanDirectory(fullPath, newCategory);
        } else if (stat.isFile() && item.endsWith('.md')) {
          totalFiles++;
          totalSize += stat.size;
          
          if (categoryName && categories[categoryName]) {
            categories[categoryName].files++;
            categories[categoryName].size += stat.size;
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  scanDirectory(dirPath);
  return { files: totalFiles, size: totalSize, categories };
}

function getRecentActivity(memoriesPath) {
  if (!fs.existsSync(memoriesPath)) return [];
  
  const recentFiles = [];
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  function scanForRecent(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanForRecent(fullPath);
        } else if (item.endsWith('.md')) {
          const mtime = stat.mtime.getTime();
          if (mtime > oneWeekAgo) {
            recentFiles.push({
              path: path.relative(memoriesPath, fullPath),
              mtime,
              isToday: mtime > oneDayAgo
            });
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  scanForRecent(memoriesPath);
  return recentFiles.sort((a, b) => b.mtime - a.mtime);
}

function main() {
  console.log(colors.title + '🧠 Memory Statistics\n' + colors.reset);
  
  // Use centralized memory path resolution
  const memoriesPath = findMemoriesPath();
  const profiles = getAvailableProfiles();
  
  if (!memoriesPath) {
    console.log('❌ No memories directory found');
    console.log('💡 Run: npm run setup');
    return;
  }
  
  // Show profile information if multiple profiles exist
  if (profiles.length > 1) {
    console.log(colors.category + `📁 Found ${profiles.length} profiles: ${profiles.join(', ')}` + colors.reset);
    console.log('');
  }
  
  console.log(colors.path + `📁 Memories location: ${memoriesPath}\n` + colors.reset);
  
  // Get overall stats
  const stats = getDirectoryStats(memoriesPath);
  
  // Overall statistics
  console.log(colors.category + 'Overall Statistics:' + colors.reset);
  console.log(`  Total memories: ${colors.stat}${stats.files}${colors.reset}`);
  console.log(`  Total size: ${colors.stat}${formatBytes(stats.size)}${colors.reset}`);
  
  if (stats.files > 0) {
    console.log(`  Average size: ${colors.stat}${formatBytes(stats.size / stats.files)}${colors.reset}`);
  }
  
  // Privacy category breakdown
  if (Object.keys(stats.categories).length > 0) {
    console.log('\n' + colors.category + 'Privacy Categories:' + colors.reset);
    
    // Sort categories by file count
    const sortedCategories = Object.entries(stats.categories)
      .sort(([,a], [,b]) => b.files - a.files);
    
    for (const [category, data] of sortedCategories) {
      const percentage = stats.files > 0 ? ((data.files / stats.files) * 100).toFixed(1) : '0';
      console.log(`  ${category.padEnd(15)} ${colors.stat}${data.files.toString().padStart(3)}${colors.reset} files, ${colors.stat}${formatBytes(data.size).padStart(8)}${colors.reset} (${percentage}%)`);
    }
  }
  
  // Recent activity
  const recentFiles = getRecentActivity(memoriesPath);
  if (recentFiles.length > 0) {
    console.log('\n' + colors.category + 'Recent Activity (last 7 days):' + colors.reset);
    
    const todayCount = recentFiles.filter(f => f.isToday).length;
    const weekCount = recentFiles.length;
    
    console.log(`  Today: ${colors.stat}${todayCount}${colors.reset} new memories`);
    console.log(`  This week: ${colors.stat}${weekCount}${colors.reset} new memories`);
    
    if (recentFiles.length <= 5) {
      console.log('\n  Recent files:');
      recentFiles.forEach(file => {
        const timeAgo = new Date(file.mtime).toLocaleDateString();
        const indicator = file.isToday ? '🆕' : '📝';
        console.log(`    ${indicator} ${file.path} (${timeAgo})`);
      });
    }
  } else {
    console.log('\n' + colors.category + 'Recent Activity:' + colors.reset);
    console.log('  No new memories in the last 7 days');
  }
  
  // System health indicators
  console.log('\n' + colors.category + 'Health Indicators:' + colors.reset);
  
  // Check for very large files (>1MB)
  const largeFiles = [];
  function findLargeFiles(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          findLargeFiles(fullPath);
        } else if (item.endsWith('.md') && stat.size > 1024 * 1024) {
          largeFiles.push({
            path: path.relative(memoriesPath, fullPath),
            size: stat.size
          });
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  findLargeFiles(memoriesPath);
  
  if (largeFiles.length > 0) {
    console.log(`  ⚠️  Large files (>1MB): ${colors.stat}${largeFiles.length}${colors.reset}`);
    largeFiles.forEach(file => {
      console.log(`    📄 ${file.path} (${formatBytes(file.size)})`);
    });
  } else {
    console.log(`  ✅ All files under 1MB`);
  }
  
  // Disk space check
  try {
    const diskUsage = execSync(`df -h "${memoriesPath}" | tail -1 | awk '{print $4}'`, {encoding: 'utf8'}).trim();
    console.log(`  💾 Available disk space: ${colors.stat}${diskUsage}${colors.reset}`);
  } catch (error) {
    // Skip disk space check if df command fails
  }
  
  console.log('');
}

main();