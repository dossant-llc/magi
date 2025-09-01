/**
 * mAGIc Status Command
 * Shows system status and health checks
 */

import { Ollama } from 'ollama';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function statusCommand() {
  console.log('🤖 mAGIc System Status');
  console.log('═'.repeat(40));
  
  // Check Ollama connection
  try {
    const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });
    console.log('🔄 Checking Ollama connection...');
    
    const models = await ollama.list();
    const chatModel = models.models.find(m => m.name === 'llama3.1:8b');
    const embedModel = models.models.find(m => m.name.includes('mxbai-embed-large'));
    
    console.log('✅ Ollama: Connected');
    console.log(`  📊 Chat Model (llama3.1:8b): ${chatModel ? '✅ Available' : '❌ Missing'}`);
    console.log(`  🧠 Embed Model (mxbai-embed-large): ${embedModel ? '✅ Available' : '❌ Missing'}`);
    
    if (chatModel) {
      console.log(`     Size: ${(chatModel.size / (1024*1024*1024)).toFixed(1)}GB`);
      console.log(`     Modified: ${new Date(chatModel.modified_at).toLocaleDateString()}`);
    }
    
  } catch (error) {
    console.log('❌ Ollama: Not accessible');
    console.log('   Make sure Ollama is running: ollama serve');
  }
  
  // Check memory directories
  console.log('\n📁 Memory Storage:');
  const memoriesDir = path.join(process.cwd(), 'memories');
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
  
  // Check index status
  console.log('\n🔍 Vector Index:');
  try {
    const indexDir = path.join(process.cwd(), '.index');
    const indexFiles = await fs.readdir(indexDir);
    console.log(`  📊 Index files: ${indexFiles.length}`);
    
    if (indexFiles.includes('embeddings.json')) {
      console.log('  ✅ Embeddings metadata found');
    } else {
      console.log('  ⚠️  No embeddings metadata (run: magic index)');
    }
  } catch (error) {
    console.log('  ❌ Index directory not found');
    console.log('     Run: magic index to create initial index');
  }
  
  console.log('\n🎯 Quick Actions:');
  console.log('  magic save "your content here" - Save new knowledge');
  console.log('  magic query "your question" - Ask about your knowledge');  
  console.log('  magic index - Build/rebuild vector index');
}