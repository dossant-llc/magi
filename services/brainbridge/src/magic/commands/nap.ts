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
  preview?: boolean;
  apply?: boolean;
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
  miscategorizedFiles: Array<{
    filename: string;
    currentPrivacy: string;
    suggestedPrivacy: string;
    confidence: number;
    reasoning: string;
  }>;
  systemIssues: {
    emptyFiles: string[];
    brokenReferences: string[];
    indexHealth: 'excellent' | 'good' | 'stale' | 'missing';
    lastIndexUpdate: string | null;
    metricsOutdated: boolean;
    diskUsageMB: number;
  };
  recommendations: string[];
}

interface ConsolidationProposal {
  topic: string;
  targetFile: string;
  sourceFiles: string[];
  consolidatedContent: string;
  reasoning: string;
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

    if (options.apply) {
      console.log('🔧 Applying memory consolidation...');
      await applyConsolidation(aiService, memoryService, memoryHealth);
      return;
    }

    if (options.preview) {
      console.log('👀 Generating consolidation preview...');
      await showConsolidationPreview(aiService, memoryService, memoryHealth);
      return;
    }

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
    if (memoryHealth.fragmentedTopics.length > 0) {
      console.log(`💡 Run 'magi nap preview' to see proposed consolidations.`);
      console.log(`🔧 Run 'magi nap apply' to apply the consolidations.`);
    }

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

  // Automatically detect miscategorized files
  const miscategorizedFiles = await findMiscategorizedFiles(aiService, allMemories);

  // Analyze system health issues
  const systemIssues = await analyzeSystemHealth(memoryService);

  // Generate comprehensive recommendations including system maintenance
  const recommendations = generateRecommendations(fragmentedTopics, temporalConflicts, miscategorizedFiles, systemIssues);

  return {
    totalMemories: allMemories.length,
    fragmentedTopics,
    temporalConflicts,
    miscategorizedFiles,
    systemIssues,
    recommendations
  };
}

async function findFragmentedTopics(aiService: AIService, memories: any[]): Promise<Array<{
  topic: string;
  files: string[];
  count: number;
}>> {
  // Limit analysis to avoid overwhelming the AI with too much content
  const sampleSize = Math.min(memories.length, 20); // Only analyze up to 20 memories
  const sampleMemories = memories.slice(0, sampleSize);

  const analysisPrompt = `Analyze these memory files and identify topics that are fragmented across multiple files.

Memory files (${sampleSize} of ${memories.length} total):
${sampleMemories.map((m, i) => `[${i+1}] ${m.filename}: ${m.content.slice(0, 150)}...`).join('\n')}

Return a JSON array of fragmented topics:
[{
  "topic": "topic name",
  "files": ["file1.md", "file2.md"],
  "count": 2
}]

Only include topics that appear in 2+ files and would benefit from consolidation.`;

  try {
    console.log(`🔍 Analyzing ${sampleSize} memories for fragmentation...`);
    const result = await aiService.queryWithAI(analysisPrompt);

    console.log(`📝 AI Response: ${result.slice(0, 200)}...`);

    // Try to extract JSON from response if it's wrapped in text
    let jsonStr = result.trim();

    // Remove markdown code blocks if present
    if (jsonStr.includes('```json')) {
      const codeBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
    }

    // Look for JSON array in the response
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    // Basic validation - check if result looks like JSON
    if (!jsonStr.startsWith('[')) {
      throw new Error(`AI returned non-JSON response: "${result.slice(0, 100)}..."`);
    }

    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.log(`⚠️  Could not analyze fragmented topics: ${error.message || error}`);
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

  // Only analyze if we have dated memories, and limit to recent ones
  if (memoriesWithDates.length === 0) {
    console.log('⚠️  No dated memories found for temporal conflict analysis');
    return [];
  }

  // Limit to most recent 15 memories to avoid overwhelming the AI
  const recentMemories = memoriesWithDates.slice(-15);

  const conflictPrompt = `Analyze these chronologically ordered memories for temporal conflicts - where preferences, opinions, or facts have changed over time.

Memories (chronological order, ${recentMemories.length} most recent):
${recentMemories.map((m, i) => `[${m.extractedDate}] ${m.filename}: ${m.content.slice(0, 200)}...`).join('\n\n')}

Return JSON array of conflicts:
[{
  "topic": "topic that changed",
  "oldInfo": {"file": "old_file.md", "date": "2023-01-01", "content": "old preference/fact"},
  "newInfo": {"file": "new_file.md", "date": "2024-01-01", "content": "new preference/fact"}
}]

Focus on meaningful changes in preferences, opinions, or contradictory information.`;

  try {
    console.log(`⏰ Analyzing ${recentMemories.length} recent memories for temporal conflicts...`);
    const result = await aiService.queryWithAI(conflictPrompt);

    // Basic validation - check if result looks like JSON
    if (!result.trim().startsWith('[')) {
      throw new Error('AI returned non-JSON response');
    }

    return JSON.parse(result);
  } catch (error: any) {
    console.log(`⚠️  Could not analyze temporal conflicts: ${error.message || error}`);
    return [];
  }
}

function generateRecommendations(
  fragmentedTopics: Array<{ topic: string; files: string[]; count: number }>,
  temporalConflicts: Array<{ topic: string; oldInfo: any; newInfo: any }>,
  miscategorizedFiles: Array<{ filename: string; currentPrivacy: string; suggestedPrivacy: string; confidence: number }>,
  systemIssues: { emptyFiles: string[]; brokenReferences: string[]; indexHealth: string; metricsOutdated: boolean; diskUsageMB: number }
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

  if (miscategorizedFiles.length > 0) {
    const byTarget = miscategorizedFiles.reduce((acc, file) => {
      acc[file.suggestedPrivacy] = (acc[file.suggestedPrivacy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    recommendations.push(`🔄 Found ${miscategorizedFiles.length} files in wrong privacy levels`);
    Object.entries(byTarget).forEach(([privacy, count]) => {
      recommendations.push(`  • ${count} files should move to '${privacy}' folder`);
    });
  }

  // Add system maintenance recommendations
  if (systemIssues.emptyFiles.length > 0) {
    recommendations.push(`🧹 Found ${systemIssues.emptyFiles.length} empty files that should be cleaned up`);
  }

  if (systemIssues.indexHealth !== 'excellent') {
    recommendations.push(`🔄 Search index needs rebuilding (currently: ${systemIssues.indexHealth})`);
  }

  if (systemIssues.metricsOutdated) {
    recommendations.push(`📊 Metrics are outdated and need recalculation`);
  }

  if (systemIssues.diskUsageMB > 100) {
    recommendations.push(`💾 Disk usage is ${systemIssues.diskUsageMB}MB - consider cleanup if too high`);
  }

  if (recommendations.length === 0) {
    recommendations.push('🎉 Your mAGIc system is perfectly optimized! All housekeeping is up to date.');
  }

  return recommendations;
}

async function findMiscategorizedFiles(aiService: AIService, memories: any[]): Promise<Array<{
  filename: string;
  currentPrivacy: string;
  suggestedPrivacy: string;
  confidence: number;
  reasoning: string;
}>> {
  console.log(`🔍 Checking for miscategorized files...`);

  // Focus on files that are likely miscategorized (personal folder with work content)
  const personalFiles = memories.filter(m => m.privacy === 'personal');

  if (personalFiles.length === 0) {
    return [];
  }

  // Analyze in smaller batches
  const batchSize = 15;
  const miscategorized: Array<{
    filename: string;
    currentPrivacy: string;
    suggestedPrivacy: string;
    confidence: number;
    reasoning: string;
  }> = [];

  for (let i = 0; i < personalFiles.length; i += batchSize) {
    const batch = personalFiles.slice(i, i + batchSize);

    const analysisPrompt = `Analyze these memory files currently in "personal" folder and determine if they should be in a different privacy level.

Files to analyze:
${batch.map((m, idx) => `[${idx+1}] File: ${m.filename}
Content: ${m.content.slice(0, 300)}...
`).join('\n')}

Privacy Level Guidelines:
- **team**: Work projects, development practices, company tools, technical decisions
- **personal**: Personal thoughts, preferences, life experiences, hobbies
- **private**: Sensitive personal info, credentials, intimate thoughts
- **public**: General knowledge, open source, shareable content

Return JSON array ONLY for files that need to be moved:
[{
  "filename": "exact-filename.md",
  "currentPrivacy": "personal",
  "suggestedPrivacy": "team",
  "confidence": 0.9,
  "reasoning": "Contains work-related development practices and project-specific information"
}]

Only suggest moves with high confidence (0.7+). Skip files that are correctly categorized.`;

    try {
      const result = await aiService.queryWithAI(analysisPrompt);

      // Extract JSON from response
      let jsonStr = result.trim();
      if (jsonStr.includes('```json')) {
        const codeBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
        }
      }

      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const batchResults = JSON.parse(jsonStr);
      if (Array.isArray(batchResults)) {
        miscategorized.push(...batchResults);
      }

    } catch (error: any) {
      console.log(`⚠️  Could not analyze miscategorization batch: ${error.message || error}`);
    }
  }

  console.log(`📋 Found ${miscategorized.length} potentially miscategorized files`);
  return miscategorized;
}

async function analyzeSystemHealth(memoryService: MemoryService): Promise<{
  emptyFiles: string[];
  brokenReferences: string[];
  indexHealth: 'excellent' | 'good' | 'stale' | 'missing';
  lastIndexUpdate: string | null;
  metricsOutdated: boolean;
  diskUsageMB: number;
}> {
  console.log(`🔍 Analyzing system health...`);

  const memoriesDir = getMemoriesPath();
  const emptyFiles: string[] = [];
  const brokenReferences: string[] = [];

  // Check for empty or broken memory files
  const allMemories = await memoryService.getAllMemories();

  for (const memory of allMemories) {
    try {
      const stats = fs.statSync(memory.filepath);

      // Check for empty files (less than 50 bytes)
      if (stats.size < 50) {
        emptyFiles.push(memory.filename);
      }

      // Check for broken content (basic validation)
      if (memory.content.trim().length < 10) {
        emptyFiles.push(memory.filename);
      }

    } catch (error) {
      brokenReferences.push(memory.filename);
    }
  }

  // Check index health
  const embeddingsDir = path.join(memoriesDir, '..', 'embeddings', 'openai');
  let indexHealth: 'excellent' | 'good' | 'stale' | 'missing' = 'missing';
  let lastIndexUpdate: string | null = null;

  try {
    if (fs.existsSync(embeddingsDir)) {
      const indexFiles = fs.readdirSync(embeddingsDir).filter(f => f.endsWith('.json'));
      if (indexFiles.length > 0) {
        // Check most recent index file
        const indexStats = fs.statSync(path.join(embeddingsDir, indexFiles[0]));
        lastIndexUpdate = indexStats.mtime.toISOString();

        const daysSinceUpdate = (Date.now() - indexStats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceUpdate < 1) indexHealth = 'excellent';
        else if (daysSinceUpdate < 7) indexHealth = 'good';
        else indexHealth = 'stale';
      }
    }
  } catch (error) {
    indexHealth = 'missing';
  }

  // Check if metrics are outdated
  const metricsDir = path.join(memoriesDir, '..', 'metrics');
  let metricsOutdated = true;

  try {
    if (fs.existsSync(metricsDir)) {
      const metricFiles = fs.readdirSync(metricsDir).filter(f => f.startsWith('metrics-'));
      if (metricFiles.length > 0) {
        const latestMetric = metricFiles.sort().pop();
        if (latestMetric) {
          const metricStats = fs.statSync(path.join(metricsDir, latestMetric));
          const daysSinceMetrics = (Date.now() - metricStats.mtime.getTime()) / (1000 * 60 * 60 * 24);
          metricsOutdated = daysSinceMetrics > 1;
        }
      }
    }
  } catch (error) {
    metricsOutdated = true;
  }

  // Calculate disk usage
  let diskUsageMB = 0;
  try {
    const calculateDirSize = (dirPath: string): number => {
      let size = 0;
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const fullPath = path.join(dirPath, file);
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            size += calculateDirSize(fullPath);
          } else {
            size += stats.size;
          }
        }
      }
      return size;
    };

    diskUsageMB = Math.round(calculateDirSize(path.dirname(memoriesDir)) / (1024 * 1024));
  } catch (error) {
    // Ignore disk usage calculation errors
  }

  console.log(`📋 System health: ${emptyFiles.length} empty files, index: ${indexHealth}, metrics: ${metricsOutdated ? 'outdated' : 'current'}`);

  return {
    emptyFiles,
    brokenReferences,
    indexHealth,
    lastIndexUpdate,
    metricsOutdated,
    diskUsageMB
  };
}

async function showConsolidationPreview(aiService: AIService, memoryService: MemoryService, memoryHealth: MemoryHealth) {
  console.log('');
  console.log('🔍 Memory Organization Preview:');
  console.log('');

  // Show miscategorization fixes first
  if (memoryHealth.miscategorizedFiles.length > 0) {
    console.log('📂 Privacy Level Fixes:');
    const byPrivacy = memoryHealth.miscategorizedFiles.reduce((acc, file) => {
      if (!acc[file.suggestedPrivacy]) acc[file.suggestedPrivacy] = [];
      acc[file.suggestedPrivacy].push(file);
      return acc;
    }, {} as Record<string, typeof memoryHealth.miscategorizedFiles>);

    for (const [privacy, files] of Object.entries(byPrivacy)) {
      console.log(`   → Move ${files.length} files to '${privacy}' folder:`);
      files.slice(0, 3).forEach(file => {
        console.log(`     • ${file.filename.slice(0, 50)}... (${Math.round(file.confidence * 100)}% confidence)`);
        console.log(`       ${file.reasoning.slice(0, 80)}...`);
      });
      if (files.length > 3) {
        console.log(`     ... and ${files.length - 3} more files`);
      }
      console.log('');
    }
  }

  // Show fragmentation fixes
  if (memoryHealth.fragmentedTopics.length > 0) {
    console.log('📄 Topic Consolidation:');
    for (const topic of memoryHealth.fragmentedTopics.slice(0, 3)) { // Limit to top 3
      console.log(`📂 Topic: "${topic.topic}"`);
      console.log(`📄 Files to consolidate: ${topic.files.join(', ')}`);

      try {
        const proposal = await generateConsolidationProposal(aiService, memoryService, topic);
        console.log(`🎯 Target file: ${proposal.targetFile}`);
        console.log(`💡 Reasoning: ${proposal.reasoning}`);
        console.log(`📝 Preview (first 300 chars):`);
        console.log(`   ${proposal.consolidatedContent.slice(0, 300)}...`);
        console.log('');
      } catch (error: any) {
        console.log(`⚠️  Could not generate preview for "${topic.topic}": ${error.message}`);
        console.log('');
      }
    }
  }
}

async function applyConsolidation(aiService: AIService, memoryService: MemoryService, memoryHealth: MemoryHealth) {
  console.log('');
  console.log('🔧 Applying comprehensive system maintenance...');

  let totalFixed = 0;

  // 1. Clean up system issues first
  if (memoryHealth.systemIssues.emptyFiles.length > 0 || memoryHealth.systemIssues.brokenReferences.length > 0) {
    console.log('🧹 Cleaning up system issues...');
    const cleaned = await applySystemCleanup(memoryHealth.systemIssues);
    totalFixed += cleaned;
  }

  // 2. Fix miscategorized files
  if (memoryHealth.miscategorizedFiles.length > 0) {
    console.log('📂 Fixing privacy level categorization...');
    const recategorized = await applyRecategorization(memoryHealth.miscategorizedFiles);
    totalFixed += recategorized;
  }

  // 3. Consolidate fragmented topics
  if (memoryHealth.fragmentedTopics.length > 0) {
    console.log('📄 Consolidating fragmented topics...');
    const consolidated = await applyFragmentationFixes(aiService, memoryService, memoryHealth.fragmentedTopics);
    totalFixed += consolidated;
  }

  // 4. Rebuild index if needed
  if (memoryHealth.systemIssues.indexHealth !== 'excellent') {
    console.log('🔄 Rebuilding search index...');
    await rebuildSearchIndex();
  }

  // 5. Recalculate metrics if outdated
  if (memoryHealth.systemIssues.metricsOutdated) {
    console.log('📊 Updating metrics...');
    await recalculateMetrics();
  }

  if (totalFixed === 0 && memoryHealth.systemIssues.indexHealth === 'excellent' && !memoryHealth.systemIssues.metricsOutdated) {
    console.log('✅ No issues found - your memories are perfectly organized!');
    return;
  }

  console.log('');
  console.log('📊 Comprehensive Maintenance Results:');
  console.log(`   ✅ Memory issues fixed: ${totalFixed}`);
  console.log(`   🔍 Index health: ${memoryHealth.systemIssues.indexHealth} → excellent`);
  console.log(`   📊 Metrics: ${memoryHealth.systemIssues.metricsOutdated ? 'updated' : 'current'}`);
  console.log(`   💾 Disk usage: ${memoryHealth.systemIssues.diskUsageMB}MB`);

  console.log('');
  console.log('🎉 Your mAGIc system is now fully optimized!');
  console.log('💡 All housekeeping complete: synthesis, recategorization, indexing, and metrics.');
}

async function generateConsolidationProposal(aiService: AIService, memoryService: MemoryService, topic: any): Promise<ConsolidationProposal> {
  const memoriesDir = getMemoriesPath();

  // Read all source files
  const sourceContents: Array<{ file: string; content: string }> = [];

  for (const filename of topic.files) {
    try {
      const filepath = path.join(memoriesDir, filename);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8');
        sourceContents.push({ file: filename, content });
      }
    } catch (error) {
      console.log(`⚠️  Could not read ${filename}`);
    }
  }

  // Generate consolidated content using AI
  const consolidationPrompt = `Consolidate these scattered memory files about "${topic.topic}" into one well-organized file.

Source files:
${sourceContents.map((sc, i) => `=== ${sc.file} ===\n${sc.content}\n`).join('\n')}

Instructions:
1. Merge overlapping information intelligently
2. Remove duplicates and redundancy
3. Organize chronologically where relevant
4. Preserve all unique information
5. Use clear markdown headings
6. Add timestamps from source files where available

Return JSON:
{
  "targetFile": "privacy-level/consolidated-filename.md",
  "consolidatedContent": "# Topic Name\\n\\nContent here...",
  "reasoning": "Why these files should be consolidated and how"
}`;

  const result = await aiService.queryWithAI(consolidationPrompt);

  // Extract JSON from response
  let jsonStr = result.trim();
  if (jsonStr.includes('```json')) {
    const codeBlockMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
  }

  const response = JSON.parse(jsonStr);

  return {
    topic: topic.topic,
    targetFile: response.targetFile,
    sourceFiles: topic.files,
    consolidatedContent: response.consolidatedContent,
    reasoning: response.reasoning
  };
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
  const resultsPath = path.join(process.cwd(), 'data', 'memories', 'profiles', 'default', 'nap-results.json');

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
  const resultsPath = path.join(process.cwd(), 'data', 'memories', 'profiles', 'default', 'nap-results.json');

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

async function applyRecategorization(miscategorizedFiles: Array<{
  filename: string;
  currentPrivacy: string;
  suggestedPrivacy: string;
  confidence: number;
  reasoning: string;
}>): Promise<number> {
  const memoriesDir = getMemoriesPath();
  let fixed = 0;

  for (const file of miscategorizedFiles) {
    try {
      // Only move high-confidence suggestions
      if (file.confidence < 0.8) {
        console.log(`⚠️  Skipping ${file.filename} (confidence: ${Math.round(file.confidence * 100)}%)`);
        continue;
      }

      const currentPath = path.join(memoriesDir, file.currentPrivacy, file.filename);
      const targetDir = path.join(memoriesDir, file.suggestedPrivacy);
      const targetPath = path.join(targetDir, file.filename);

      // Check if source file exists
      if (!fs.existsSync(currentPath)) {
        console.log(`⚠️  Source file not found: ${file.filename}`);
        continue;
      }

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Move the file
      fs.renameSync(currentPath, targetPath);
      console.log(`✅ Moved ${file.filename} from '${file.currentPrivacy}' to '${file.suggestedPrivacy}'`);
      fixed++;

    } catch (error) {
      console.log(`❌ Failed to move ${file.filename}: ${error}`);
    }
  }

  return fixed;
}

async function applyFragmentationFixes(
  aiService: AIService,
  memoryService: MemoryService,
  fragmentedTopics: Array<{ topic: string; files: string[]; count: number }>
): Promise<number> {
  let fixed = 0;

  for (const topic of fragmentedTopics) {
    try {
      console.log(`📂 Consolidating "${topic.topic}"...`);

      const proposal = await generateConsolidationProposal(aiService, memoryService, topic);

      // Write the consolidated file
      const memoriesDir = getMemoriesPath();
      const targetPath = path.join(memoriesDir, proposal.targetFile);

      // Ensure directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, proposal.consolidatedContent, 'utf8');

      // Remove source files
      for (const sourceFile of proposal.sourceFiles) {
        const sourcePath = path.join(memoriesDir, sourceFile);
        if (fs.existsSync(sourcePath)) {
          fs.unlinkSync(sourcePath);
        }
      }

      console.log(`✅ Consolidated "${topic.topic}" into ${proposal.targetFile}`);
      fixed++;

    } catch (error: any) {
      console.log(`❌ Failed to consolidate "${topic.topic}": ${error.message}`);
    }
  }

  return fixed;
}

async function applySystemCleanup(systemIssues: {
  emptyFiles: string[];
  brokenReferences: string[];
  indexHealth: string;
  lastIndexUpdate: string | null;
  metricsOutdated: boolean;
  diskUsageMB: number;
}): Promise<number> {
  const memoriesDir = getMemoriesPath();
  let cleaned = 0;

  // Remove empty files
  for (const emptyFile of systemIssues.emptyFiles) {
    try {
      // Find the file across privacy levels
      const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
      let found = false;

      for (const privacy of privacyLevels) {
        const filePath = path.join(memoriesDir, privacy, emptyFile);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Removed empty file: ${emptyFile}`);
          cleaned++;
          found = true;
          break;
        }
      }

      if (!found) {
        console.log(`⚠️  Empty file not found: ${emptyFile}`);
      }
    } catch (error) {
      console.log(`❌ Failed to remove ${emptyFile}: ${error}`);
    }
  }

  // Clean up broken references (files that exist but can't be read)
  for (const brokenFile of systemIssues.brokenReferences) {
    try {
      console.log(`⚠️  Broken reference detected: ${brokenFile}`);
      // For now, just log - could implement recovery logic
    } catch (error) {
      console.log(`❌ Failed to handle broken reference ${brokenFile}: ${error}`);
    }
  }

  return cleaned;
}

async function rebuildSearchIndex(): Promise<void> {
  try {
    // Import and run the index command directly
    console.log('   🔄 Running: magi index --force');
    const { indexCommand } = await import('./index');
    await indexCommand({ force: true });
    console.log('   ✅ Search index rebuilt successfully');
  } catch (error) {
    console.log(`   ❌ Failed to rebuild index: ${error}`);
  }
}

async function recalculateMetrics(): Promise<void> {
  try {
    console.log('   📊 Running: magi metrics --backfill');

    // Import and run the metrics command directly
    const { metricsCommand } = await import('./metrics');
    await metricsCommand({ backfill: true });

    console.log('   ✅ Metrics updated successfully');
  } catch (error) {
    console.log(`   ❌ Failed to recalculate metrics: ${error}`);
  }
}