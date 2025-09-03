#!/usr/bin/env node

/**
 * System Diagnostics - Comprehensive health checks for BrainBridge
 * Usage: npm run diag
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  warning: '\x1b[33m',
  info: '\x1b[36m',
  dim: '\x1b[90m',
  reset: '\x1b[0m'
};

class Diagnostics {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  /**
   * Get memories path using same logic as BrainBridge
   */
  getMemoriesPath(profile = 'default') {
    // Custom path overrides everything
    if (process.env.MEMORIES_DIR) {
      return process.env.MEMORIES_DIR;
    }
    
    // Get base memories directory based on MEMORIES_LOCATION
    const location = process.env.MEMORIES_LOCATION || 'project';
    let baseMemoriesDir;
    
    if (location === 'documents') {
      baseMemoriesDir = path.join(require('os').homedir(), 'Documents', 'memories');
    } else {
      // Default: project-local
      baseMemoriesDir = path.join(process.cwd(), 'data', 'memories');
    }
    
    return path.join(baseMemoriesDir, 'profiles', profile);
  }

  log(message, type = 'info') {
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${colors[type]}${prefix} ${message}${colors.reset}`);
  }

  addIssue(message, fix = null) {
    this.issues.push({ message, fix });
    this.log(message, 'error');
    if (fix) {
      this.log(`   Fix: ${fix}`, 'dim');
    }
  }

  addWarning(message, suggestion = null) {
    this.warnings.push({ message, suggestion });
    this.log(message, 'warning');
    if (suggestion) {
      this.log(`   Suggestion: ${suggestion}`, 'dim');
    }
  }

  addPassed(message) {
    this.passed.push(message);
    this.log(message, 'success');
  }

  async checkOllama() {
    this.log('\n🤖 Checking Ollama AI Service...', 'info');
    
    try {
      const response = execSync('curl -s http://localhost:11434/api/tags', { encoding: 'utf8' });
      const data = JSON.parse(response);
      
      if (data.models && data.models.length > 0) {
        this.addPassed(`Ollama running with ${data.models.length} models`);
        
        const hasChat = data.models.some(m => m.name.includes('llama3.1:8b'));
        const hasEmbed = data.models.some(m => m.name.includes('mxbai-embed-large'));
        
        if (hasChat) {
          this.addPassed('Chat model (llama3.1:8b) available');
        } else {
          this.addIssue('Chat model missing', 'ollama pull llama3.1:8b');
        }
        
        if (hasEmbed) {
          this.addPassed('Embedding model (mxbai-embed-large) available');
        } else {
          this.addIssue('Embedding model missing', 'ollama pull mxbai-embed-large');
        }
      } else {
        this.addIssue('No Ollama models found', 'ollama pull llama3.1:8b && ollama pull mxbai-embed-large');
      }
    } catch (error) {
      this.addIssue('Ollama not running or unreachable', 'ollama serve');
    }
  }

  async checkMemoryPaths() {
    this.log('\n📁 Checking Memory Storage Paths...', 'info');
    
    // Use same logic as BrainBridge memory-path.ts
    const baseMemoriesDir = this.getMemoriesPath();
    const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
    
    // Check base memories directory
    if (fs.existsSync(baseMemoriesDir)) {
      this.addPassed(`Base memories directory exists: ${baseMemoriesDir}`);
      
      // Ensure all privacy level directories exist
      let missingDirs = [];
      for (const level of privacyLevels) {
        const levelDir = path.join(baseMemoriesDir, level);
        if (!fs.existsSync(levelDir)) {
          missingDirs.push(level);
        }
      }
      
      if (missingDirs.length > 0) {
        this.addWarning(`Missing privacy directories: ${missingDirs.join(', ')}`, `mkdir -p "${baseMemoriesDir}"/{${missingDirs.join(',')}}`);
        
        // Create missing directories
        try {
          for (const level of missingDirs) {
            const levelDir = path.join(baseMemoriesDir, level);
            fs.mkdirSync(levelDir, { recursive: true });
          }
          this.addPassed(`Created missing directories: ${missingDirs.join(', ')}`);
        } catch (error) {
          this.addIssue(`Failed to create directories: ${error.message}`);
        }
      } else {
        this.addPassed('All privacy directories exist (public, team, personal, private, sensitive)');
      }
      
      // Count total memories
      let totalMemories = 0;
      for (const level of privacyLevels) {
        const levelDir = path.join(baseMemoriesDir, level);
        if (fs.existsSync(levelDir)) {
          const files = fs.readdirSync(levelDir).filter(f => f.endsWith('.md'));
          totalMemories += files.length;
          if (files.length > 0) {
            this.addPassed(`${level}: ${files.length} memories`);
          }
        }
      }
      
      if (totalMemories === 0) {
        this.addWarning(`No memories found in ${baseMemoriesDir}`, 'Add some memories using: magi save "your content"');
      } else {
        this.addPassed(`Total memories: ${totalMemories}`);
      }
    } else {
      this.addIssue(`Memories directory missing: ${baseMemoriesDir}`, 'mkdir -p ../memories/{public,team,personal,private,sensitive}');
    }
  }

  async checkVectorIndex() {
    this.log('\n🧠 Checking AI Embeddings & Vector Index...', 'info');
    
    const baseMemoriesDir = this.getMemoriesPath();
    const embeddingsDir = path.join(baseMemoriesDir, 'embeddings');
    const embeddingsFile = path.join(embeddingsDir, 'embeddings.txt');
    const oldIndexDir = path.join(process.cwd(), '.index');
    
    // Check for old index location (migration needed)
    if (fs.existsSync(oldIndexDir)) {
      this.addIssue('Old vector index found in wrong location', 'magi fix-paths');
    }
    
    // Count total memories for comparison
    let totalMemories = 0;
    const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
    for (const level of privacyLevels) {
      const levelDir = path.join(baseMemoriesDir, level);
      if (fs.existsSync(levelDir)) {
        const files = fs.readdirSync(levelDir).filter(f => f.endsWith('.md'));
        totalMemories += files.length;
      }
    }
    
    // Check vector index status
    if (fs.existsSync(embeddingsFile)) {
      const stats = fs.statSync(embeddingsFile);
      const sizeKB = Math.round(stats.size / 1024);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      
      this.addPassed(`Vector index exists: ${sizeKB}KB (${sizeMB}MB)`);
      
      // Estimate embeddings count (rough approximation)
      const estimatedEmbeddings = Math.floor(stats.size / 4096); // Rough estimate
      this.addPassed(`Estimated ${estimatedEmbeddings} embeddings indexed`);
      
      // Check if index needs updating
      const ageHours = Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60));
      const ageDays = Math.round(ageHours / 24);
      
      if (ageHours < 1) {
        this.addPassed('Vector index is fresh (< 1h old)');
      } else if (ageHours < 24) {
        this.addPassed(`Vector index age: ${ageHours}h old`);
      } else if (ageDays < 7) {
        this.addWarning(`Vector index is ${ageDays} days old`, 'Consider running: magi index');
      } else {
        this.addWarning(`Vector index is ${ageDays} days old - may be stale`, 'magi index');
      }
      
      // Check if memories vs embeddings ratio seems off
      if (totalMemories > 0) {
        const ratio = estimatedEmbeddings / totalMemories;
        if (ratio < 0.5) {
          this.addWarning(`Only ~${Math.round(ratio * 100)}% of memories appear indexed`, 'magi index');
        } else {
          this.addPassed(`Index coverage looks good (~${Math.round(ratio * 100)}% of memories)`);
        }
      }
    } else {
      if (totalMemories > 0) {
        this.addIssue(`No vector index found but ${totalMemories} memories exist`, 'magi index');
      } else {
        this.addWarning('No vector index (no memories to index yet)', 'Add memories first, then run: magi index');
      }
    }
    
    // Check embeddings directory structure
    if (!fs.existsSync(embeddingsDir)) {
      this.addWarning('Embeddings directory missing', 'Will be created when running: magi index');
    } else {
      this.addPassed('Embeddings directory exists');
    }
  }

  async checkBrainBridgeProcesses() {
    this.log('\n🔗 Checking BrainBridge Processes...', 'info');
    
    try {
      const processes = execSync('ps aux | grep "brainbridge.*stdio" | grep -v grep', { encoding: 'utf8' }).trim();
      if (processes) {
        const lines = processes.split('\n').filter(line => line.trim());
        if (lines.length > 3) {
          this.addWarning(`${lines.length} BrainBridge processes running`, 'magi stop && magi start');
        } else {
          this.addPassed(`${lines.length} BrainBridge processes running`);
        }
      } else {
        this.addWarning('No BrainBridge processes found', 'magi start');
      }
    } catch (error) {
      this.addWarning('No BrainBridge processes found', 'magi start');
    }
  }

  async checkEnvironmentConfig() {
    this.log('\n⚙️ Checking Environment Configuration...', 'info');
    
    const memoriesDir = this.getMemoriesPath();
    const location = process.env.MEMORIES_LOCATION || 'project';
    this.addPassed(`MEMORIES_LOCATION: ${location} (${location === 'project' ? 'project-local' : 'global Documents'})`);
    this.addPassed(`MEMORIES_DIR: ${memoriesDir}`);
    
    const ollamaHost = process.env.OLLAMA_HOST || '127.0.0.1';
    const ollamaPort = process.env.OLLAMA_PORT || '11434';
    this.addPassed(`Ollama: http://${ollamaHost}:${ollamaPort}`);
  }

  async checkDiskSpace() {
    this.log('\n💾 Checking Disk Space...', 'info');
    
    try {
      const df = execSync('df -h .', { encoding: 'utf8' });
      const lines = df.split('\n');
      if (lines.length > 1) {
        const usage = lines[1].split(/\s+/);
        const available = usage[3];
        const usedPercent = usage[4];
        
        this.addPassed(`Available space: ${available} (${usedPercent} used)`);
        
        if (parseInt(usedPercent) > 90) {
          this.addWarning('Disk space running low', 'Clean up old logs or unused files');
        }
      }
    } catch (error) {
      this.addWarning('Could not check disk space');
    }
  }

  async runAll() {
    console.log(`${colors.info}🧙 Magi System Status${colors.reset}\n`);
    
    await this.checkOllama();
    await this.checkMemoryPaths();
    await this.checkVectorIndex();
    await this.checkBrainBridgeProcesses();
    await this.checkEnvironmentConfig();
    await this.checkDiskSpace();
    
    // Summary
    console.log(`\n${colors.info}📊 System Health${colors.reset}`);
    console.log(`${colors.success}✅ Healthy: ${this.passed.length}${colors.reset}`);
    console.log(`${colors.warning}⚠️  Attention: ${this.warnings.length}${colors.reset}`);
    console.log(`${colors.error}❌ Critical: ${this.issues.length}${colors.reset}`);
    
    if (this.issues.length > 0) {
      console.log(`\n${colors.error}🔧 Critical fixes needed:${colors.reset}`);
      this.issues.forEach(issue => {
        if (issue.fix) {
          console.log(`   ${colors.dim}magi fix: ${issue.fix}${colors.reset}`);
        }
      });
      console.log(`\n${colors.error}🚨 System unstable - resolve critical issues first${colors.reset}`);
      process.exit(1);
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n${colors.warning}💡 Recommendations:${colors.reset}`);
      this.warnings.forEach(warning => {
        if (warning.suggestion) {
          const suggestion = warning.suggestion.replace(/npm run /g, 'magi ');
          console.log(`   ${colors.dim}${suggestion}${colors.reset}`);
        }
      });
      console.log(`\n${colors.warning}⚡ System functional but could be optimized${colors.reset}`);
    } else {
      console.log(`\n${colors.success}🎉 Magi system is healthy and ready!${colors.reset}`);
    }
  }
}

// Run diagnostics
const diag = new Diagnostics();
diag.runAll().catch(error => {
  console.error(`${colors.error}❌ Diagnostic error: ${error.message}${colors.reset}`);
  process.exit(1);
});