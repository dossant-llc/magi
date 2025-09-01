#!/usr/bin/env tsx

/**
 * Quality Control Script - Performance check for BrainBridge embedding system
 * Tests vector search, embedding generation, and system health
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { performance } from 'perf_hooks';
import { LoggerService } from '../services/logger-service';
import { EmbeddingService } from '../services/embedding-service';
import { AIService } from '../services/ai-service';

interface QCResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  metric: string;
  value: string | number;
  threshold?: string;
  notes?: string;
}

class QualityChecker {
  private results: QCResult[] = [];
  private loggerService: LoggerService;
  private embeddingService: EmbeddingService;
  private aiService: AIService;

  constructor() {
    const logFile = path.join(process.cwd(), 'logs', 'qc.log');
    this.loggerService = new LoggerService(logFile);
    this.embeddingService = new EmbeddingService(this.loggerService);
    this.aiService = new AIService(this.loggerService);
  }

  private addResult(result: QCResult) {
    this.results.push(result);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  async checkSystemHealth(): Promise<void> {
    console.log('🔍 BrainBridge Quality Control Check\n');
    
    // 1. Check Ollama connectivity
    await this.checkOllamaHealth();
    
    // 2. Check embedding index
    await this.checkEmbeddingIndex();
    
    // 3. Test embedding generation performance  
    await this.checkEmbeddingPerformance();
    
    // 4. Test vector search performance
    await this.checkVectorSearchPerformance();
    
    // 5. Test end-to-end AI query performance
    await this.checkE2EPerformance();
    
    // 6. Check memory storage
    await this.checkMemoryStorage();
    
    // 7. Generate report
    this.generateReport();
  }

  async checkOllamaHealth(): Promise<void> {
    console.log('⚡ Testing Ollama connectivity...');
    
    try {
      const startTime = performance.now();
      const status = await this.aiService.getAIStatus();
      const duration = performance.now() - startTime;
      
      if (status.ollama.connected) {
        this.addResult({
          component: 'Ollama',
          status: 'PASS',
          metric: 'Connection',
          value: `✅ Connected (${this.formatDuration(duration)})`,
          notes: `${status.ollama.models.length} models available`
        });
        
        // Check if required models are available
        const hasLlama = status.ollama.models.some(m => m.name.includes('llama3.1:8b'));
        const hasEmbedding = status.ollama.models.some(m => m.name.includes('mxbai-embed-large'));
        
        this.addResult({
          component: 'Models',
          status: hasLlama && hasEmbedding ? 'PASS' : 'FAIL',
          metric: 'Required Models',
          value: `llama3.1:8b: ${hasLlama ? '✅' : '❌'}, mxbai-embed-large: ${hasEmbedding ? '✅' : '❌'}`,
        });
        
      } else {
        this.addResult({
          component: 'Ollama',
          status: 'FAIL',
          metric: 'Connection',
          value: '❌ Not connected',
          notes: 'Run: ollama serve'
        });
      }
    } catch (error) {
      this.addResult({
        component: 'Ollama',
        status: 'FAIL',
        metric: 'Connection',
        value: '❌ Error',
        notes: `${error}`
      });
    }
  }

  async checkEmbeddingIndex(): Promise<void> {
    console.log('📊 Checking embedding index...');
    
    try {
      const indexPath = path.join(process.cwd(), '.index', 'embeddings.json');
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
      
      if (indexExists) {
        const data = await fs.readFile(indexPath, 'utf8');
        const index = JSON.parse(data);
        
        this.addResult({
          component: 'Index',
          status: 'PASS',
          metric: 'Embeddings Count',
          value: index.totalEmbeddings || 0,
          threshold: '> 0'
        });
        
        this.addResult({
          component: 'Index',
          status: 'PASS',
          metric: 'Model',
          value: index.model,
          threshold: 'mxbai-embed-large'
        });
        
        const indexAge = Date.now() - new Date(index.updated).getTime();
        const hoursOld = indexAge / (1000 * 60 * 60);
        
        this.addResult({
          component: 'Index',
          status: hoursOld < 24 ? 'PASS' : 'WARN',
          metric: 'Freshness',
          value: hoursOld < 1 ? `${Math.round(hoursOld * 60)}min old` : `${Math.round(hoursOld)}h old`,
          threshold: '< 24h',
          notes: hoursOld > 24 ? 'Consider running: magic index --force' : undefined
        });
        
      } else {
        this.addResult({
          component: 'Index',
          status: 'FAIL',
          metric: 'Existence',
          value: '❌ Not found',
          notes: 'Run: magic index'
        });
      }
    } catch (error) {
      this.addResult({
        component: 'Index',
        status: 'FAIL',
        metric: 'Read',
        value: '❌ Error',
        notes: `${error}`
      });
    }
  }

  async checkEmbeddingPerformance(): Promise<void> {
    console.log('🚀 Testing embedding generation performance...');
    
    const testTexts = [
      'short text',
      'This is a medium length text that should take a reasonable amount of time to embed.',
      'This is a much longer text that contains multiple sentences and should provide a good test of embedding generation performance. It includes various topics like technology, artificial intelligence, and performance testing to ensure the embedding model can handle diverse content effectively.'
    ];
    
    for (let i = 0; i < testTexts.length; i++) {
      const text = testTexts[i];
      const label = ['Short', 'Medium', 'Long'][i];
      
      try {
        const startTime = performance.now();
        const embedding = await this.embeddingService.generateEmbedding(text);
        const duration = performance.now() - startTime;
        
        const isGood = duration < 1000; // Under 1 second
        const isOk = duration < 5000;   // Under 5 seconds
        
        this.addResult({
          component: 'Embedding',
          status: isGood ? 'PASS' : isOk ? 'WARN' : 'FAIL',
          metric: `${label} Text (${text.length} chars)`,
          value: this.formatDuration(duration),
          threshold: '< 1s',
          notes: `${embedding.length}D vector`
        });
        
      } catch (error) {
        this.addResult({
          component: 'Embedding',
          status: 'FAIL',
          metric: `${label} Text`,
          value: '❌ Error',
          notes: `${error}`
        });
      }
    }
  }

  async checkVectorSearchPerformance(): Promise<void> {
    console.log('🔎 Testing vector search performance...');
    
    const testQueries = [
      'Igor avocado fruit',
      'network troubleshooting',
      'personal preferences',
      'getting started template'
    ];
    
    for (const query of testQueries) {
      try {
        const startTime = performance.now();
        const results = await this.embeddingService.searchSimilar(query, 5, 0.1);
        const duration = performance.now() - startTime;
        
        const isGood = duration < 500;  // Under 500ms
        const isOk = duration < 2000;   // Under 2 seconds
        
        this.addResult({
          component: 'Vector Search',
          status: isGood ? 'PASS' : isOk ? 'WARN' : 'FAIL',
          metric: `Query: "${query.slice(0, 20)}..."`,
          value: this.formatDuration(duration),
          threshold: '< 500ms',
          notes: `${results.length} results, top similarity: ${results[0]?.similarity.toFixed(3) || 'none'}`
        });
        
      } catch (error) {
        this.addResult({
          component: 'Vector Search',
          status: 'FAIL',
          metric: `Query: "${query.slice(0, 20)}..."`,
          value: '❌ Error',
          notes: `${error}`
        });
      }
    }
  }

  async checkE2EPerformance(): Promise<void> {
    console.log('🎯 Testing end-to-end AI query performance...');
    
    try {
      const startTime = performance.now();
      const result = await this.aiService.searchMemoriesOnly('Igor avocado fruit', 'personal', 3);
      const duration = performance.now() - startTime;
      
      const isGood = duration < 1000;  // Under 1 second
      const isOk = duration < 5000;    // Under 5 seconds
      
      this.addResult({
        component: 'E2E Search',
        status: isGood ? 'PASS' : isOk ? 'WARN' : 'FAIL',
        metric: 'Raw Mode Query',
        value: this.formatDuration(duration),
        threshold: '< 1s',
        notes: `${result.memories.length} memories found`
      });
      
    } catch (error) {
      this.addResult({
        component: 'E2E Search',
        status: 'FAIL',
        metric: 'Raw Mode Query',
        value: '❌ Error',
        notes: `${error}`
      });
    }
  }

  async checkMemoryStorage(): Promise<void> {
    console.log('💾 Checking memory storage...');
    
    try {
      const memoriesDir = path.join(process.cwd(), '..', 'memories');
      const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
      
      let totalMemories = 0;
      const memoryStats: Record<string, number> = {};
      
      for (const level of privacyLevels) {
        try {
          const levelDir = path.join(memoriesDir, level);
          const files = await fs.readdir(levelDir);
          const mdFiles = files.filter(f => f.endsWith('.md'));
          memoryStats[level] = mdFiles.length;
          totalMemories += mdFiles.length;
        } catch {
          memoryStats[level] = 0;
        }
      }
      
      this.addResult({
        component: 'Memory Storage',
        status: totalMemories > 0 ? 'PASS' : 'WARN',
        metric: 'Total Memories',
        value: totalMemories,
        threshold: '> 0',
        notes: Object.entries(memoryStats)
          .filter(([_, count]) => count > 0)
          .map(([level, count]) => `${level}: ${count}`)
          .join(', ')
      });
      
    } catch (error) {
      this.addResult({
        component: 'Memory Storage',
        status: 'FAIL',
        metric: 'Access',
        value: '❌ Error',
        notes: `${error}`
      });
    }
  }

  generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 BRAINBRIDGE QUALITY CONTROL REPORT');
    console.log('='.repeat(80));
    
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const warnCount = this.results.filter(r => r.status === 'WARN').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`\n📊 SUMMARY: ${passCount} PASS, ${warnCount} WARN, ${failCount} FAIL\n`);
    
    // Group by component
    const byComponent: Record<string, QCResult[]> = {};
    for (const result of this.results) {
      if (!byComponent[result.component]) byComponent[result.component] = [];
      byComponent[result.component].push(result);
    }
    
    for (const [component, results] of Object.entries(byComponent)) {
      console.log(`\n🔧 ${component.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      for (const result of results) {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
        const threshold = result.threshold ? ` (expect ${result.threshold})` : '';
        const notes = result.notes ? ` - ${result.notes}` : '';
        
        console.log(`  ${icon} ${result.metric}: ${result.value}${threshold}${notes}`);
      }
    }
    
    // Overall status
    console.log('\n' + '='.repeat(80));
    if (failCount === 0 && warnCount === 0) {
      console.log('🎉 SYSTEM STATUS: EXCELLENT - All systems operational!');
    } else if (failCount === 0) {
      console.log('✅ SYSTEM STATUS: GOOD - Minor issues detected, system functional');
    } else if (failCount <= 2) {
      console.log('⚠️  SYSTEM STATUS: NEEDS ATTENTION - Some components failing');
    } else {
      console.log('❌ SYSTEM STATUS: CRITICAL - Multiple system failures detected');
    }
    console.log('='.repeat(80));
    
    // Quick recommendations
    const hasIndexIssues = this.results.some(r => r.component === 'Index' && r.status !== 'PASS');
    const hasOllamaIssues = this.results.some(r => r.component === 'Ollama' && r.status !== 'PASS');
    
    if (hasOllamaIssues || hasIndexIssues) {
      console.log('\n🔧 QUICK FIXES:');
      if (hasOllamaIssues) {
        console.log('  • Start Ollama: ollama serve');
        console.log('  • Install models: ollama pull llama3.1:8b && ollama pull mxbai-embed-large');
      }
      if (hasIndexIssues) {
        console.log('  • Rebuild index: magic index --force');
      }
    }
    
    console.log('');
  }
}

// Run the quality check
async function main() {
  const qc = new QualityChecker();
  await qc.checkSystemHealth();
}

if (require.main === module) {
  main().catch(console.error);
}