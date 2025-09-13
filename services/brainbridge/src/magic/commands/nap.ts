#!/usr/bin/env node

/**
 * mAGIc Nap Command - Smart Memory Analysis and Consolidation
 * v0.1.2 "Nap" - Magi takes a nap to analyze and synthesize memories
 */

import { AIService } from '../../services/ai-service';
import { EmbeddingService } from '../../services/embedding-service';
import { MemoryService } from '../../services/memory-service';
import { LoggerService } from '../../services/logger-service';
import { getMemoriesPath } from '../../utils/magi-paths.js';
import * as fs from 'fs';
import * as path from 'path';

interface NapOptions {
  deep?: boolean;
  status?: boolean;
}

interface MemoryHealth {
  totalMemories: number;
  fragmentedTopics: Array<{
    topic: string;
    files: string[];
    count: number;
  }>;
  temporalConflicts: Array<{
    topic: string;
    oldInfo: { file: string; date: string; content: string };
    newInfo: { file: string; date: string; content: string };
  }>;
  recommendations: string[];
}

export async function napCommand(options: NapOptions) {
  const logger = new LoggerService(path.join(process.cwd(), 'logs'));

  console.log('🧠💤 Magi is taking a nap...');
  console.log('');

  if (options.status) {
    await showMemoryHealthStatus();
    return;
  }

  try {
    const aiService = new AIService(logger);
    const embeddingService = new EmbeddingService(logger);

    // Get memories directory using the proper path utility
    const memoriesDir = getMemoriesPath();

    const memoryService = new MemoryService(memoriesDir, logger);

    console.log('🔍 Analyzing memory patterns...');
    const memoryHealth = await analyzeMemoryHealth(aiService, memoryService);

    if (options.deep) {
      console.log('🧠 Performing deep consolidation analysis...');
      await performDeepAnalysis(aiService, memoryHealth);
    } else {
      console.log('⚡ Performing quick memory insights...');
      await performQuickAnalysis(memoryHealth);
    }

    // Save analysis results
    await saveNapResults(memoryHealth);

    console.log('');
    console.log('✅ Nap complete! Memories have been analyzed.');
    console.log(`💡 Run 'magi nap --status' to see detailed insights.`);

  } catch (error: any) {
    console.error('❌ Nap analysis failed:', error.message);
    process.exit(1);
  }
}

async function analyzeMemoryHealth(aiService: AIService, memoryService: MemoryService): Promise<MemoryHealth> {
  // Get all memories
  const allMemories = await memoryService.getAllMemories();

  console.log(`📊 Found ${allMemories.length} memories to analyze`);

  // Analyze for fragmented topics using AI
  const fragmentedTopics = await findFragmentedTopics(aiService, allMemories);

  // Detect temporal conflicts
  const temporalConflicts = await findTemporalConflicts(aiService, allMemories);

  // Generate recommendations
  const recommendations = generateRecommendations(fragmentedTopics, temporalConflicts);

  return {
    totalMemories: allMemories.length,
    fragmentedTopics,
    temporalConflicts,
    recommendations
  };
}

async function findFragmentedTopics(aiService: AIService, memories: any[]): Promise<Array<{
  topic: string;
  files: string[];
  count: number;
}>> {
  const analysisPrompt = `Analyze these memory files and identify topics that are fragmented across multiple files.

Memory files:
${memories.map((m, i) => `[${i+1}] ${m.filename}: ${m.content.slice(0, 200)}...`).join('\n')}

Return a JSON array of fragmented topics:
[{
  "topic": "topic name",
  "files": ["file1.md", "file2.md"],
  "count": 2
}]

Only include topics that appear in 2+ files and would benefit from consolidation.`;

  try {
    const result = await aiService.queryWithAI(analysisPrompt);
    return JSON.parse(result);
  } catch (error) {
    console.log('⚠️  Could not analyze fragmented topics, using fallback method');
    return [];
  }
}

async function findTemporalConflicts(aiService: AIService, memories: any[]): Promise<Array<{
  topic: string;
  oldInfo: { file: string; date: string; content: string };
  newInfo: { file: string; date: string; content: string };
}>> {
  // Sort memories by date (extract from filename)
  const memoriesWithDates = memories.map(m => {
    const dateMatch = m.filename.match(/(\d{4}-\d{2}-\d{2})/);
    return {
      ...m,
      extractedDate: dateMatch ? dateMatch[1] : null,
      parsedDate: dateMatch ? new Date(dateMatch[1]) : null
    };
  }).filter(m => m.parsedDate).sort((a, b) => a.parsedDate!.getTime() - b.parsedDate!.getTime());

  const conflictPrompt = `Analyze these chronologically ordered memories for temporal conflicts - where preferences, opinions, or facts have changed over time.

Memories (chronological order):
${memoriesWithDates.map((m, i) => `[${m.extractedDate}] ${m.filename}: ${m.content.slice(0, 300)}...`).join('\n\n')}

Return JSON array of conflicts:
[{
  "topic": "topic that changed",
  "oldInfo": {"file": "old_file.md", "date": "2023-01-01", "content": "old preference/fact"},
  "newInfo": {"file": "new_file.md", "date": "2024-01-01", "content": "new preference/fact"}
}]

Focus on meaningful changes in preferences, opinions, or contradictory information.`;

  try {
    const result = await aiService.queryWithAI(conflictPrompt);
    return JSON.parse(result);
  } catch (error) {
    console.log('⚠️  Could not analyze temporal conflicts');
    return [];
  }
}

function generateRecommendations(
  fragmentedTopics: Array<{ topic: string; files: string[]; count: number }>,
  temporalConflicts: Array<{ topic: string; oldInfo: any; newInfo: any }>
): string[] {
  const recommendations: string[] = [];

  if (fragmentedTopics.length > 0) {
    recommendations.push(`📄 Consider consolidating ${fragmentedTopics.length} fragmented topics into single files`);
    fragmentedTopics.slice(0, 3).forEach(topic => {
      recommendations.push(`  • "${topic.topic}" scattered across ${topic.count} files`);
    });
  }

  if (temporalConflicts.length > 0) {
    recommendations.push(`⏰ Found ${temporalConflicts.length} temporal conflicts that need attention`);
    temporalConflicts.slice(0, 3).forEach(conflict => {
      recommendations.push(`  • "${conflict.topic}" changed from ${conflict.oldInfo.date} to ${conflict.newInfo.date}`);
    });
  }

  if (recommendations.length === 0) {
    recommendations.push('🎉 Your memories look well organized! No major issues found.');
  }

  return recommendations;
}

async function performQuickAnalysis(memoryHealth: MemoryHealth) {
  console.log('');
  console.log('📊 Quick Analysis Results:');
  console.log(`   Total memories: ${memoryHealth.totalMemories}`);
  console.log(`   Fragmented topics: ${memoryHealth.fragmentedTopics.length}`);
  console.log(`   Temporal conflicts: ${memoryHealth.temporalConflicts.length}`);
  console.log('');

  if (memoryHealth.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    memoryHealth.recommendations.forEach(rec => console.log(`   ${rec}`));
  }
}

async function performDeepAnalysis(aiService: AIService, memoryHealth: MemoryHealth) {
  console.log('');
  console.log('🔍 Deep Analysis Results:');

  // Show detailed fragmentation analysis
  if (memoryHealth.fragmentedTopics.length > 0) {
    console.log('');
    console.log('📄 Fragmented Topics:');
    memoryHealth.fragmentedTopics.forEach(topic => {
      console.log(`   • ${topic.topic} (${topic.count} files)`);
      topic.files.forEach(file => console.log(`     - ${file}`));
    });
  }

  // Show temporal conflicts
  if (memoryHealth.temporalConflicts.length > 0) {
    console.log('');
    console.log('⏰ Temporal Conflicts:');
    memoryHealth.temporalConflicts.forEach(conflict => {
      console.log(`   • ${conflict.topic}:`);
      console.log(`     Old (${conflict.oldInfo.date}): ${conflict.oldInfo.content.slice(0, 100)}...`);
      console.log(`     New (${conflict.newInfo.date}): ${conflict.newInfo.content.slice(0, 100)}...`);
    });
  }

  // Advanced AI insights
  console.log('');
  console.log('🧠 AI Insights:');
  console.log('   Analyzing patterns and suggesting optimizations...');

  const insightsPrompt = `Based on this memory analysis, provide 3-5 actionable insights for better memory organization:

Fragmented topics: ${memoryHealth.fragmentedTopics.length}
Temporal conflicts: ${memoryHealth.temporalConflicts.length}
Total memories: ${memoryHealth.totalMemories}

Provide specific, actionable recommendations for improving memory organization and avoiding information fragmentation.`;

  try {
    const insights = await aiService.queryWithAI(insightsPrompt);
    console.log(`   ${insights.replace(/\n/g, '\n   ')}`);
  } catch (error) {
    console.log('   ⚠️  Could not generate AI insights');
  }

  console.log('');
  console.log('💡 Recommendations:');
  memoryHealth.recommendations.forEach(rec => console.log(`   ${rec}`));
}

async function saveNapResults(memoryHealth: MemoryHealth) {
  const resultsPath = path.join(process.cwd(), 'data', 'nap-results.json');

  const napResults = {
    timestamp: new Date().toISOString(),
    analysis: memoryHealth,
    version: '0.1.2-nap'
  };

  try {
    // Ensure directory exists
    const dir = path.dirname(resultsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resultsPath, JSON.stringify(napResults, null, 2));
  } catch (error: any) {
    console.log('⚠️  Could not save nap results:', error.message);
  }
}

async function showMemoryHealthStatus() {
  const resultsPath = path.join(process.cwd(), 'data', 'nap-results.json');

  if (!fs.existsSync(resultsPath)) {
    console.log('💤 No nap results found. Run "magi nap" first to analyze your memories.');
    return;
  }

  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const analysis = results.analysis;

    console.log('🧠💤 Memory Health Status');
    console.log('═══════════════════════════');
    console.log('');
    console.log(`📊 Analysis from: ${new Date(results.timestamp).toLocaleString()}`);
    console.log(`📁 Total memories: ${analysis.totalMemories}`);
    console.log(`📄 Fragmented topics: ${analysis.fragmentedTopics.length}`);
    console.log(`⏰ Temporal conflicts: ${analysis.temporalConflicts.length}`);
    console.log('');

    if (analysis.fragmentedTopics.length > 0) {
      console.log('📄 Top Fragmented Topics:');
      analysis.fragmentedTopics.slice(0, 5).forEach((topic: any) => {
        console.log(`   • ${topic.topic} (${topic.count} files)`);
      });
      console.log('');
    }

    if (analysis.temporalConflicts.length > 0) {
      console.log('⏰ Recent Conflicts:');
      analysis.temporalConflicts.slice(0, 3).forEach((conflict: any) => {
        console.log(`   • ${conflict.topic}: ${conflict.oldInfo.date} → ${conflict.newInfo.date}`);
      });
      console.log('');
    }

    console.log('💡 Current Recommendations:');
    analysis.recommendations.forEach((rec: string) => console.log(`   ${rec}`));

  } catch (error: any) {
    console.log('❌ Could not read nap results:', error.message);
  }
}