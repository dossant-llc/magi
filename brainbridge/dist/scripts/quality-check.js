#!/usr/bin/env tsx
"use strict";
/**
 * Quality Control Script - Performance check for BrainBridge embedding system
 * Tests vector search, embedding generation, and system health
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const perf_hooks_1 = require("perf_hooks");
const logger_service_1 = require("../services/logger-service");
const embedding_service_1 = require("../services/embedding-service");
const ai_service_1 = require("../services/ai-service");
class QualityChecker {
    results = [];
    loggerService;
    embeddingService;
    aiService;
    constructor() {
        const logFile = path.join(process.cwd(), 'logs', 'qc.log');
        this.loggerService = new logger_service_1.LoggerService(logFile);
        this.embeddingService = new embedding_service_1.EmbeddingService(this.loggerService);
        this.aiService = new ai_service_1.AIService(this.loggerService);
    }
    addResult(result) {
        this.results.push(result);
    }
    formatDuration(ms) {
        if (ms < 1000)
            return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    }
    async checkSystemHealth() {
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
    async checkOllamaHealth() {
        console.log('⚡ Testing Ollama connectivity...');
        try {
            const startTime = perf_hooks_1.performance.now();
            const status = await this.aiService.getAIStatus();
            const duration = perf_hooks_1.performance.now() - startTime;
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
            }
            else {
                this.addResult({
                    component: 'Ollama',
                    status: 'FAIL',
                    metric: 'Connection',
                    value: '❌ Not connected',
                    notes: 'Run: ollama serve'
                });
            }
        }
        catch (error) {
            this.addResult({
                component: 'Ollama',
                status: 'FAIL',
                metric: 'Connection',
                value: '❌ Error',
                notes: `${error}`
            });
        }
    }
    async checkEmbeddingIndex() {
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
            }
            else {
                this.addResult({
                    component: 'Index',
                    status: 'FAIL',
                    metric: 'Existence',
                    value: '❌ Not found',
                    notes: 'Run: magic index'
                });
            }
        }
        catch (error) {
            this.addResult({
                component: 'Index',
                status: 'FAIL',
                metric: 'Read',
                value: '❌ Error',
                notes: `${error}`
            });
        }
    }
    async checkEmbeddingPerformance() {
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
                const startTime = perf_hooks_1.performance.now();
                const embedding = await this.embeddingService.generateEmbedding(text);
                const duration = perf_hooks_1.performance.now() - startTime;
                const isGood = duration < 1000; // Under 1 second
                const isOk = duration < 5000; // Under 5 seconds
                this.addResult({
                    component: 'Embedding',
                    status: isGood ? 'PASS' : isOk ? 'WARN' : 'FAIL',
                    metric: `${label} Text (${text.length} chars)`,
                    value: this.formatDuration(duration),
                    threshold: '< 1s',
                    notes: `${embedding.length}D vector`
                });
            }
            catch (error) {
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
    async checkVectorSearchPerformance() {
        console.log('🔎 Testing vector search performance...');
        const testQueries = [
            'Igor avocado fruit',
            'network troubleshooting',
            'personal preferences',
            'getting started template'
        ];
        for (const query of testQueries) {
            try {
                const startTime = perf_hooks_1.performance.now();
                const results = await this.embeddingService.searchSimilar(query, 5, 0.1);
                const duration = perf_hooks_1.performance.now() - startTime;
                const isGood = duration < 500; // Under 500ms
                const isOk = duration < 2000; // Under 2 seconds
                this.addResult({
                    component: 'Vector Search',
                    status: isGood ? 'PASS' : isOk ? 'WARN' : 'FAIL',
                    metric: `Query: "${query.slice(0, 20)}..."`,
                    value: this.formatDuration(duration),
                    threshold: '< 500ms',
                    notes: `${results.length} results, top similarity: ${results[0]?.similarity.toFixed(3) || 'none'}`
                });
            }
            catch (error) {
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
    async checkE2EPerformance() {
        console.log('🎯 Testing end-to-end AI query performance...');
        try {
            const startTime = perf_hooks_1.performance.now();
            const result = await this.aiService.searchMemoriesOnly('Igor avocado fruit', 'personal', 3);
            const duration = perf_hooks_1.performance.now() - startTime;
            const isGood = duration < 1000; // Under 1 second
            const isOk = duration < 5000; // Under 5 seconds
            this.addResult({
                component: 'E2E Search',
                status: isGood ? 'PASS' : isOk ? 'WARN' : 'FAIL',
                metric: 'Raw Mode Query',
                value: this.formatDuration(duration),
                threshold: '< 1s',
                notes: `${result.memories.length} memories found`
            });
        }
        catch (error) {
            this.addResult({
                component: 'E2E Search',
                status: 'FAIL',
                metric: 'Raw Mode Query',
                value: '❌ Error',
                notes: `${error}`
            });
        }
    }
    async checkMemoryStorage() {
        console.log('💾 Checking memory storage...');
        try {
            const memoriesDir = path.join(process.cwd(), '..', 'memories');
            const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
            let totalMemories = 0;
            const memoryStats = {};
            for (const level of privacyLevels) {
                try {
                    const levelDir = path.join(memoriesDir, level);
                    const files = await fs.readdir(levelDir);
                    const mdFiles = files.filter(f => f.endsWith('.md'));
                    memoryStats[level] = mdFiles.length;
                    totalMemories += mdFiles.length;
                }
                catch {
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
        }
        catch (error) {
            this.addResult({
                component: 'Memory Storage',
                status: 'FAIL',
                metric: 'Access',
                value: '❌ Error',
                notes: `${error}`
            });
        }
    }
    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('🎯 BRAINBRIDGE QUALITY CONTROL REPORT');
        console.log('='.repeat(80));
        const passCount = this.results.filter(r => r.status === 'PASS').length;
        const warnCount = this.results.filter(r => r.status === 'WARN').length;
        const failCount = this.results.filter(r => r.status === 'FAIL').length;
        console.log(`\n📊 SUMMARY: ${passCount} PASS, ${warnCount} WARN, ${failCount} FAIL\n`);
        // Group by component
        const byComponent = {};
        for (const result of this.results) {
            if (!byComponent[result.component])
                byComponent[result.component] = [];
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
        }
        else if (failCount === 0) {
            console.log('✅ SYSTEM STATUS: GOOD - Minor issues detected, system functional');
        }
        else if (failCount <= 2) {
            console.log('⚠️  SYSTEM STATUS: NEEDS ATTENTION - Some components failing');
        }
        else {
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
