#!/usr/bin/env node

/**
 * Path Fix Utility - Auto-repair common path configuration issues
 * Usage: npm run fix-paths
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  warning: '\x1b[33m',
  info: '\x1b[36m',
  reset: '\x1b[0m'
};

class PathFixer {
  constructor() {
    this.fixed = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${colors[type]}${prefix} ${message}${colors.reset}`);
  }

  async fixOldVectorIndex() {
    this.log('🔍 Checking for old vector index location...', 'info');
    
    const oldIndexDir = path.join(process.cwd(), '.index');
    const oldEmbeddingsFile = path.join(oldIndexDir, 'embeddings.json');
    const baseMemoriesDir = path.join(process.cwd(), '..', 'memories');
    const newEmbeddingsDir = path.join(baseMemoriesDir, 'embeddings');
    
    if (fs.existsSync(oldIndexDir)) {
      this.log('Found old vector index, moving to correct location...', 'warning');
      
      try {
        // Create new embeddings directory
        if (!fs.existsSync(newEmbeddingsDir)) {
          fs.mkdirSync(newEmbeddingsDir, { recursive: true });
          this.log(`Created embeddings directory: ${newEmbeddingsDir}`, 'success');
        }
        
        // Remove old index - we'll rebuild it fresh
        if (fs.existsSync(oldIndexDir)) {
          fs.rmSync(oldIndexDir, { recursive: true, force: true });
          this.log('Removed old vector index', 'success');
          this.fixed.push('Moved vector index to memories folder');
        }
        
        // Rebuild index in correct location
        this.log('Rebuilding vector index in correct location...', 'info');
        execSync('npm run magic index', { stdio: 'inherit' });
        this.log('Vector index rebuilt successfully', 'success');
        
      } catch (error) {
        this.log(`Error fixing vector index: ${error.message}`, 'error');
        this.errors.push(`Vector index fix failed: ${error.message}`);
      }
    } else {
      this.log('No old vector index found', 'success');
    }
  }

  async ensureMemoryDirectories() {
    this.log('📁 Ensuring memory directories exist...', 'info');
    
    const baseMemoriesDir = path.join(process.cwd(), '..', 'memories');
    const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
    
    try {
      // Create base memories directory
      if (!fs.existsSync(baseMemoriesDir)) {
        fs.mkdirSync(baseMemoriesDir, { recursive: true });
        this.log(`Created base memories directory: ${baseMemoriesDir}`, 'success');
        this.fixed.push('Created memories directory');
      }
      
      // Create privacy level directories
      for (const level of privacyLevels) {
        const levelDir = path.join(baseMemoriesDir, level);
        if (!fs.existsSync(levelDir)) {
          fs.mkdirSync(levelDir, { recursive: true });
          this.log(`Created ${level} directory`, 'success');
          this.fixed.push(`Created ${level} directory`);
        }
      }
      
      // Create embeddings directory
      const embeddingsDir = path.join(baseMemoriesDir, 'embeddings');
      if (!fs.existsSync(embeddingsDir)) {
        fs.mkdirSync(embeddingsDir, { recursive: true });
        this.log('Created embeddings directory', 'success');
        this.fixed.push('Created embeddings directory');
      }
      
    } catch (error) {
      this.log(`Error creating directories: ${error.message}`, 'error');
      this.errors.push(`Directory creation failed: ${error.message}`);
    }
  }

  async cleanupProcesses() {
    this.log('🔗 Cleaning up duplicate BrainBridge processes...', 'info');
    
    try {
      const processes = execSync('ps aux | grep "brainbridge.*stdio" | grep -v grep', { encoding: 'utf8' }).trim();
      if (processes) {
        const lines = processes.split('\n').filter(line => line.trim());
        if (lines.length > 3) {
          this.log(`Found ${lines.length} processes, cleaning up...`, 'warning');
          execSync('pkill -f "brainbridge.*stdio"');
          this.log('Cleaned up duplicate processes', 'success');
          this.fixed.push('Cleaned up duplicate processes');
          
          // Wait a moment for cleanup
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          this.log(`Process count normal (${lines.length})`, 'success');
        }
      }
    } catch (error) {
      // No processes running is fine
      this.log('No duplicate processes found', 'success');
    }
  }

  async fixPermissions() {
    this.log('🔐 Checking file permissions...', 'info');
    
    const baseMemoriesDir = path.join(process.cwd(), '..', 'memories');
    
    try {
      if (fs.existsSync(baseMemoriesDir)) {
        // Make sure directories are readable/writable
        execSync(`chmod -R u+rw "${baseMemoriesDir}"`);
        this.log('Fixed memory directory permissions', 'success');
        this.fixed.push('Fixed permissions');
      }
    } catch (error) {
      this.log(`Permission fix failed: ${error.message}`, 'warning');
    }
  }

  async createDefaultEnvFile() {
    this.log('⚙️ Checking environment configuration...', 'info');
    
    const envFile = path.join(process.cwd(), '.env');
    const envTemplate = path.join(process.cwd(), '.env.template');
    
    if (!fs.existsSync(envFile) && fs.existsSync(envTemplate)) {
      try {
        fs.copyFileSync(envTemplate, envFile);
        this.log('Created .env file from template', 'success');
        this.fixed.push('Created .env configuration');
      } catch (error) {
        this.log(`Failed to create .env file: ${error.message}`, 'warning');
      }
    }
  }

  async runAll() {
    console.log(`${colors.info}🔧 BrainBridge Path Fixer${colors.reset}\n`);
    
    await this.ensureMemoryDirectories();
    await this.fixOldVectorIndex();
    await this.cleanupProcesses();
    await this.fixPermissions();
    await this.createDefaultEnvFile();
    
    // Summary
    console.log(`\n${colors.info}📊 Fix Summary${colors.reset}`);
    console.log(`${colors.success}✅ Fixed: ${this.fixed.length} issues${colors.reset}`);
    console.log(`${colors.error}❌ Errors: ${this.errors.length}${colors.reset}`);
    
    if (this.fixed.length > 0) {
      console.log(`\n${colors.success}🎯 What was fixed:${colors.reset}`);
      this.fixed.forEach(fix => {
        console.log(`   ${colors.success}• ${fix}${colors.reset}`);
      });
    }
    
    if (this.errors.length > 0) {
      console.log(`\n${colors.error}❌ Manual intervention needed:${colors.reset}`);
      this.errors.forEach(error => {
        console.log(`   ${colors.error}• ${error}${colors.reset}`);
      });
    }
    
    console.log(`\n${colors.info}💡 Next steps:${colors.reset}`);
    console.log(`   ${colors.info}1. Run: npm run diag${colors.reset}`);
    console.log(`   ${colors.info}2. If all good: npm run magi${colors.reset}`);
    
    if (this.errors.length > 0) {
      process.exit(1);
    } else {
      console.log(`\n${colors.success}🎉 All paths fixed successfully!${colors.reset}`);
    }
  }
}

// Run path fixer
const fixer = new PathFixer();
fixer.runAll().catch(error => {
  console.error(`${colors.error}❌ Path fix error: ${error.message}${colors.reset}`);
  process.exit(1);
});