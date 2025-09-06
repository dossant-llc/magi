/**
 * mAGIc Status Command
 * Shows system status and health checks
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { aiConfig } from '../../config/ai-config';
import { getMemoriesPath } from '../../utils/magi-paths';

export async function statusCommand() {
  const config = aiConfig.getConfig();
  console.log(`🤖 mAGIc System Status (${config.provider.toUpperCase()})`);
  console.log('═'.repeat(50));
  
  // Check AI Provider
  console.log(`🔄 Checking ${config.provider.toUpperCase()} connection...`);
  
  if (config.provider === 'ollama') {
    await checkOllamaStatus(config);
  } else if (config.provider === 'openai') {
    await checkOpenAIStatus(config);
  } else if (config.provider === 'gemini') {
    await checkGeminiStatus(config);
  } else {
    console.log(`❌ Unknown provider: ${config.provider}`);
  }
  
  // Check memory directories using correct path
  console.log('\n📁 Memory Storage:');
  const memoriesDir = getMemoriesPath();
  const privacyLevels = ['public', 'team', 'personal', 'private', 'sensitive'];
  
  let totalFiles = 0;
  for (const level of privacyLevels) {
    try {
      const dir = path.join(memoriesDir, level);
      const files = await fs.readdir(dir);
      const mdFiles = files.filter(f => f.endsWith('.md')).length;
      totalFiles += mdFiles;
      console.log(`  ${level.padEnd(9)}: ${mdFiles} memories`);
    } catch (error) {
      console.log(`  ${level.padEnd(9)}: Directory not found`);
    }
  }
  
  console.log(`  ${'Total'.padEnd(9)}: ${totalFiles} memories`);
  
  // Check provider-specific index status
  console.log('\n🔍 Vector Index:');
  try {
    const indexPath = aiConfig.getIndexPath(path.join(memoriesDir, 'embeddings'));
    const embeddingsFile = path.join(indexPath, 'embeddings.txt');
    
    try {
      const stats = await fs.stat(embeddingsFile);
      console.log(`  ✅ ${config.provider.toUpperCase()} embeddings index found`);
      console.log(`     Size: ${(stats.size / 1024).toFixed(1)}KB`);
      console.log(`     Modified: ${stats.mtime.toLocaleDateString()}`);
    } catch (error) {
      console.log(`  ❌ ${config.provider.toUpperCase()} embeddings index not found`);
      console.log('     Run: magic index to create initial index');
    }
  } catch (error) {
    console.log('  ❌ Index path error');
    console.log('     Run: magic index to create initial index');
  }
  
  console.log('\n🎯 Quick Actions:');
  console.log('  magic save "your content here" - Save new knowledge');
  console.log('  magic query "your question" - Ask about your knowledge');  
  console.log('  magic index - Build/rebuild vector index');
}

async function checkOllamaStatus(config: any) {
  try {
    const { Ollama } = require('ollama');
    const ollama = new Ollama({ host: config.ollamaHost ? `http://${config.ollamaHost}:${config.ollamaPort}` : 'http://127.0.0.1:11434' });
    
    const models = await ollama.list();
    const chatModel = models.models.find(m => m.name.includes(config.chatModel.split(':')[0]));
    const embedModel = models.models.find(m => m.name.includes(config.embeddingModel.split(':')[0]));
    
    console.log('✅ Ollama: Connected');
    console.log(`  📊 Chat Model (${config.chatModel}): ${chatModel ? '✅ Available' : '❌ Missing'}`);
    console.log(`  🧠 Embed Model (${config.embeddingModel}): ${embedModel ? '✅ Available' : '❌ Missing'}`);
    
    if (chatModel) {
      console.log(`     Size: ${(chatModel.size / (1024*1024*1024)).toFixed(1)}GB`);
      console.log(`     Modified: ${new Date(chatModel.modified_at).toLocaleDateString()}`);
    }
    
  } catch (error) {
    console.log('❌ Ollama: Not accessible');
    console.log('   Make sure Ollama is running: ollama serve');
  }
}

async function checkOpenAIStatus(config: any) {
  try {
    console.log('✅ OpenAI: Configured');
    console.log(`  📊 Chat Model: ${config.chatModel}`);
    console.log(`  🧠 Embed Model: ${config.embeddingModel}`);
    
    if (config.openaiApiKey) {
      const maskedKey = `${config.openaiApiKey.substring(0, 8)}...${config.openaiApiKey.substring(config.openaiApiKey.length - 4)}`;
      console.log(`  🔑 API Key: ${maskedKey}`);
    } else {
      console.log('  ❌ API Key: Not configured');
      console.log('     Set OPENAI_API_KEY in .env file');
    }
    
  } catch (error) {
    console.log('❌ OpenAI: Configuration error');
    console.log(`   Error: ${error.message}`);
  }
}

async function checkGeminiStatus(config: any) {
  try {
    console.log('✅ Gemini: Configured');
    console.log(`  📊 Chat Model: Not available (embedding-only provider)`);
    console.log(`  🧠 Embed Model: ${config.embeddingModel}`);
    
    if (config.geminiApiKey) {
      const maskedKey = `${config.geminiApiKey.substring(0, 8)}...${config.geminiApiKey.substring(config.geminiApiKey.length - 4)}`;
      console.log(`  🔑 API Key: ${maskedKey}`);
      console.log(`  ⚠️  Free Tier: 5 requests/minute, 25 requests/day`);
    } else {
      console.log('  ❌ API Key: Not configured');
      console.log('     Set GEMINI_API_KEY or GOOGLE_API_KEY in .env file');
      console.log('     Get your free key at: https://aistudio.google.com/app/apikey');
    }
    
  } catch (error) {
    console.log('❌ Gemini: Configuration error');
    console.log(`   Error: ${error.message}`);
  }
}