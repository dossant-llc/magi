#!/usr/bin/env node

/**
 * mAGIc Recategorization Tool - Fix privacy level misclassifications
 * Analyzes content to suggest better privacy levels for existing memories
 */

import { AIService } from '../../services/ai-service.js';
import { MemoryService } from '../../services/memory-service.js';
import { LoggerService } from '../../services/logger-service.js';
import { getMemoriesPath } from '../../utils/magi-paths.js';
import * as fs from 'fs';
import * as path from 'path';

interface RecategorizeOptions {
  apply?: boolean;
  preview?: boolean;
  from?: string; // Source privacy level to analyze
  to?: string;   // Target privacy level to suggest
}

interface RecategorizationSuggestion {
  filename: string;
  currentPrivacy: string;
  suggestedPrivacy: string;
  confidence: number;
  reasoning: string;
  content: string;
  filepath: string;
}

export async function recategorizeCommand(options: RecategorizeOptions = {}) {
  const logger = new LoggerService(path.join(process.cwd(), 'logs'));

  console.log('🔄 Analyzing memory categorization...');
  console.log('');

  try {
    const aiService = new AIService(logger);
    const memoriesDir = getMemoriesPath();
    const memoryService = new MemoryService(memoriesDir, logger);

    // Get all memories for analysis
    const allMemories = await memoryService.getAllMemories();

    if (options.from) {
      // Filter to only analyze specific privacy level
      const filtered = allMemories.filter(m => m.privacy === options.from);
      console.log(`📁 Analyzing ${filtered.length} memories from '${options.from}' privacy level`);
    } else {
      console.log(`📁 Analyzing ${allMemories.length} memories across all privacy levels`);
    }

    const suggestions = await analyzeAndSuggestRecategorization(
      aiService,
      allMemories,
      options.from,
      options.to
    );

    if (suggestions.length === 0) {
      console.log('✅ All memories appear to be properly categorized!');
      return;
    }

    if (options.apply) {
      console.log('🔧 Applying recategorization suggestions...');
      await applyRecategorization(suggestions, memoriesDir);
    } else {
      console.log('👀 Recategorization Suggestions:');
      showRecategorizationPreview(suggestions);

      if (!options.preview) {
        console.log('');
        console.log(`💡 Run 'magi recategorize --apply' to move the files`);
        console.log(`📋 Run 'magi recategorize --preview' for detailed reasoning`);
      }
    }

  } catch (error: any) {
    console.error('❌ Recategorization analysis failed:', error.message);
    process.exit(1);
  }
}

async function analyzeAndSuggestRecategorization(
  aiService: AIService,
  memories: any[],
  fromPrivacy?: string,
  toPrivacy?: string
): Promise<RecategorizationSuggestion[]> {
  const suggestions: RecategorizationSuggestion[] = [];

  // Filter memories if specific privacy level requested
  const memoriesToAnalyze = fromPrivacy
    ? memories.filter(m => m.privacy === fromPrivacy)
    : memories;

  console.log(`🤖 Analyzing ${memoriesToAnalyze.length} memories with AI...`);

  // Analyze in batches to avoid overwhelming the AI
  const batchSize = 10;
  for (let i = 0; i < memoriesToAnalyze.length; i += batchSize) {
    const batch = memoriesToAnalyze.slice(i, i + batchSize);

    console.log(`   Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(memoriesToAnalyze.length/batchSize)}...`);

    try {
      const batchSuggestions = await analyzeBatchForRecategorization(aiService, batch, toPrivacy);
      suggestions.push(...batchSuggestions);
    } catch (error) {
      console.log(`⚠️  Failed to analyze batch ${Math.floor(i/batchSize) + 1}: ${error}`);
    }
  }

  // Filter out suggestions where current privacy is already correct
  return suggestions.filter(s => s.currentPrivacy !== s.suggestedPrivacy);
}

async function analyzeBatchForRecategorization(
  aiService: AIService,
  memories: any[],
  targetPrivacy?: string
): Promise<RecategorizationSuggestion[]> {
  const prompt = `Analyze these memory files and suggest better privacy levels based on content.

Current files:
${memories.map((m, i) => `[${i+1}] File: ${m.filename}
Current Privacy: ${m.privacy}
Content: ${m.content.slice(0, 400)}...
`).join('\n')}

Privacy Level Guidelines:
- **public**: General knowledge, open source, shareable content
- **team**: Work projects, company-specific but shareable with team
- **personal**: Personal thoughts, preferences, private learnings
- **private**: Sensitive personal info, credentials, private thoughts
- **sensitive**: Highly confidential, legal, financial, or security-related

${targetPrivacy ? `Focus on suggesting '${targetPrivacy}' where appropriate.` : ''}

Return JSON array with suggestions:
[{
  "filename": "exact-filename.md",
  "currentPrivacy": "current_level",
  "suggestedPrivacy": "suggested_level",
  "confidence": 0.85,
  "reasoning": "Why this privacy level is better"
}]

Only suggest changes where the current privacy level is clearly wrong.`;

  const result = await aiService.queryWithAI(prompt);

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

  try {
    const aiSuggestions = JSON.parse(jsonStr);

    // Map AI suggestions to full suggestion objects
    return aiSuggestions.map((suggestion: any) => {
      const memory = memories.find(m => m.filename === suggestion.filename);

      if (!memory) {
        console.log(`⚠️  AI suggested file not found: ${suggestion.filename}`);
        return null;
      }

      return {
        filename: suggestion.filename,
        currentPrivacy: suggestion.currentPrivacy,
        suggestedPrivacy: suggestion.suggestedPrivacy,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        content: memory.content,
        filepath: memory.filepath
      };
    }).filter((s: any) => s !== null);

  } catch (parseError) {
    console.log(`⚠️  Failed to parse AI response: ${parseError}`);
    return [];
  }
}

function showRecategorizationPreview(suggestions: RecategorizationSuggestion[]) {
  console.log('');

  // Group by suggested privacy level
  const grouped = suggestions.reduce((acc, s) => {
    if (!acc[s.suggestedPrivacy]) acc[s.suggestedPrivacy] = [];
    acc[s.suggestedPrivacy].push(s);
    return acc;
  }, {} as Record<string, RecategorizationSuggestion[]>);

  for (const [targetPrivacy, items] of Object.entries(grouped)) {
    console.log(`📂 Move to '${targetPrivacy}' (${items.length} files):`);

    for (const suggestion of items.slice(0, 5)) { // Show first 5
      const confidenceIcon = suggestion.confidence >= 0.8 ? '🎯' : suggestion.confidence >= 0.6 ? '👍' : '🤔';
      console.log(`   ${confidenceIcon} ${suggestion.filename.slice(0, 50)}...`);
      console.log(`      From: ${suggestion.currentPrivacy} → To: ${suggestion.suggestedPrivacy}`);
      console.log(`      ${suggestion.reasoning.slice(0, 80)}...`);
      console.log('');
    }

    if (items.length > 5) {
      console.log(`   ... and ${items.length - 5} more files`);
      console.log('');
    }
  }
}

async function applyRecategorization(suggestions: RecategorizationSuggestion[], memoriesDir: string) {
  const moved: string[] = [];
  const failed: string[] = [];

  for (const suggestion of suggestions) {
    try {
      // Only apply high-confidence suggestions
      if (suggestion.confidence < 0.7) {
        console.log(`⚠️  Skipping low-confidence suggestion for ${suggestion.filename} (${suggestion.confidence})`);
        continue;
      }

      const currentPath = suggestion.filepath;
      const targetDir = path.join(memoriesDir, suggestion.suggestedPrivacy);
      const targetPath = path.join(targetDir, suggestion.filename);

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Move the file
      fs.renameSync(currentPath, targetPath);

      moved.push(`${suggestion.filename}: ${suggestion.currentPrivacy} → ${suggestion.suggestedPrivacy}`);
      console.log(`✅ Moved ${suggestion.filename} to ${suggestion.suggestedPrivacy}`);

    } catch (error) {
      failed.push(suggestion.filename);
      console.log(`❌ Failed to move ${suggestion.filename}: ${error}`);
    }
  }

  console.log('');
  console.log(`📊 Recategorization Results:`);
  console.log(`   ✅ Moved: ${moved.length} files`);
  console.log(`   ❌ Failed: ${failed.length} files`);

  if (moved.length > 0) {
    console.log('');
    console.log('💡 Consider running:');
    console.log('   • `magi index` to rebuild search index with new categories');
    console.log('   • `magi metrics --backfill` to update metrics with new privacy distribution');
  }
}