#!/usr/bin/env tsx

/**
 * Search Performance Testing Script
 * Tests and compares different search optimization approaches
 */

import { EmbeddingService } from '../services/embedding-service';
import { LoggerService } from '../services/logger-service';
import { AIService } from '../services/ai-service';

interface PerformanceMetrics {
  approach: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  memoryUsage: number;
  searchRelevance: number;
  errorRate: number;
  totalQueries: number;
}

class SearchPerformanceTest {
  private embeddingService: EmbeddingService;
  private aiService: AIService;
  private loggerService: LoggerService;

  constructor() {
    this.loggerService = new LoggerService('logs/perf-test.log');
    this.embeddingService = new EmbeddingService(this.loggerService);
    this.aiService = new AIService(this.embeddingService, this.loggerService);
  }

  private getTestQueries(): string[] {
    return [
      "performance optimization",
      "database queries", 
      "testing embedding generation",
      "live system monitoring",
      "memory management",
      "Igor avocado fruit",
      "network troubleshooting",
      "personal preferences",
      "getting started template",
      "artificial intelligence machine learning",
      "short query",
      "this is a much longer query that contains multiple concepts and should test how the system handles complex multi-word searches with various terms",
      "technical",
      "development testing logging"
    ];
  }

  private async measureMemoryUsage(): Promise<number> {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }

  private calculateRelevanceScore(results: any[]): number {
    if (results.length === 0) return 0;
    
    // Simple relevance: average of similarity scores
    const similarities = results.map(r => r.similarity || 0);
    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  }

  async testBaseline(): Promise<PerformanceMetrics> {
    console.log('🔍 Testing Baseline (Current Implementation)');
    
    const queries = this.getTestQueries();
    const responseTimes: number[] = [];
    const relevanceScores: number[] = [];
    let errors = 0;

    const startMemory = await this.measureMemoryUsage();

    for (const query of queries) {
      try {
        const startTime = Date.now();
        
        // Test current raw mode via AI service
        const results = await this.aiService.searchMemories(query, 'personal', 5, 'raw');
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        responseTimes.push(responseTime);
        
        // Calculate relevance (simplified)
        const relevance = results.length > 0 ? 0.7 : 0.0; // Placeholder
        relevanceScores.push(relevance);
        
        console.log(`  Query: "${query.substring(0, 20)}..." -> ${responseTime}ms, ${results.length} results`);
        
      } catch (error) {
        console.error(`  Error with query "${query}":`, error.message);
        errors++;
      }
    }

    const endMemory = await this.measureMemoryUsage();
    
    responseTimes.sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    
    return {
      approach: 'baseline',
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: p95ResponseTime,
      memoryUsage: endMemory - startMemory,
      searchRelevance: relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length,
      errorRate: errors / queries.length,
      totalQueries: queries.length
    };
  }

  async testVectorSearchOnly(): Promise<PerformanceMetrics> {
    console.log('⚡ Testing Vector Search Only (No File I/O)');
    
    const queries = this.getTestQueries();
    const responseTimes: number[] = [];
    const relevanceScores: number[] = [];
    let errors = 0;

    const startMemory = await this.measureMemoryUsage();

    for (const query of queries) {
      try {
        const startTime = Date.now();
        
        // Test pure vector search (no file reading)
        const results = await this.embeddingService.searchSimilar(query, 5, 0.2);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        responseTimes.push(responseTime);
        
        const relevance = this.calculateRelevanceScore(results);
        relevanceScores.push(relevance);
        
        console.log(`  Query: "${query.substring(0, 20)}..." -> ${responseTime}ms, ${results.length} results, relevance: ${relevance.toFixed(3)}`);
        
      } catch (error) {
        console.error(`  Error with query "${query}":`, error.message);
        errors++;
      }
    }

    const endMemory = await this.measureMemoryUsage();
    
    responseTimes.sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    
    return {
      approach: 'vector-only',
      avgResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: p95ResponseTime,
      memoryUsage: endMemory - startMemory,
      searchRelevance: relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length,
      errorRate: errors / queries.length,
      totalQueries: queries.length
    };
  }

  private formatResults(metrics: PerformanceMetrics[]): void {
    console.log('\n📊 SEARCH PERFORMANCE COMPARISON');
    console.log('='.repeat(80));
    
    // Header
    console.log('Approach'.padEnd(15) + 
                'Avg Time'.padEnd(12) + 
                'P95 Time'.padEnd(12) + 
                'Memory'.padEnd(10) + 
                'Relevance'.padEnd(12) + 
                'Errors'.padEnd(8));
    console.log('-'.repeat(80));
    
    // Results
    metrics.forEach(metric => {
      console.log(
        metric.approach.padEnd(15) +
        `${metric.avgResponseTime}ms`.padEnd(12) +
        `${metric.p95ResponseTime}ms`.padEnd(12) +
        `${metric.memoryUsage}MB`.padEnd(10) +
        `${(metric.searchRelevance * 100).toFixed(1)}%`.padEnd(12) +
        `${(metric.errorRate * 100).toFixed(1)}%`.padEnd(8)
      );
    });

    console.log('='.repeat(80));

    // Analysis
    console.log('\n📈 PERFORMANCE INSIGHTS:');
    
    const baseline = metrics.find(m => m.approach === 'baseline');
    const vectorOnly = metrics.find(m => m.approach === 'vector-only');
    
    if (baseline && vectorOnly) {
      const speedup = baseline.avgResponseTime / vectorOnly.avgResponseTime;
      console.log(`⚡ Vector-only is ${speedup.toFixed(1)}x faster than baseline`);
      
      const memoryDiff = vectorOnly.memoryUsage - baseline.memoryUsage;
      console.log(`💾 Memory difference: ${memoryDiff > 0 ? '+' : ''}${memoryDiff}MB`);
      
      const relevanceDiff = vectorOnly.searchRelevance - baseline.searchRelevance;
      console.log(`🎯 Relevance difference: ${relevanceDiff > 0 ? '+' : ''}${(relevanceDiff * 100).toFixed(1)}%`);
    }
  }

  async runTests(mode: string = 'compare'): Promise<void> {
    console.log('🚀 Search Performance Testing Started\n');
    
    const metrics: PerformanceMetrics[] = [];
    
    if (mode === 'baseline' || mode === 'compare') {
      const baselineMetrics = await this.testBaseline();
      metrics.push(baselineMetrics);
      console.log('✅ Baseline test completed\n');
    }
    
    if (mode === 'index-first' || mode === 'compare') {
      const vectorMetrics = await this.testVectorSearchOnly();
      metrics.push(vectorMetrics);
      console.log('✅ Vector-only test completed\n');
    }
    
    this.formatResults(metrics);
    
    console.log('\n💡 Next Steps:');
    console.log('  • Implement index-first approach to get vector-only performance');
    console.log('  • Add content previews to maintain usability');
    console.log('  • Test with larger knowledge bases');
    console.log('  • Monitor real-world usage patterns');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--baseline') ? 'baseline' :
               args.includes('--index-first') ? 'index-first' :
               args.includes('--compare') ? 'compare' : 'compare';
  
  const tester = new SearchPerformanceTest();
  
  try {
    await tester.runTests(mode);
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SearchPerformanceTest };