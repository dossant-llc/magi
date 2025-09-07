/**
 * mAGIc Index Command
 * Builds vector index for semantic search using embeddings
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EmbeddingService } from '../../services/embedding-service';
import { LoggerService } from '../../services/logger-service';
import { aiConfig } from '../../config/ai-config';

interface IndexOptions {
  force?: boolean;
}

export async function indexCommand(options: IndexOptions) {
  const config = aiConfig.getConfig();
  console.log(`🔍 mAGIc Index: Building vector embeddings index (${config.provider.toUpperCase()})...`);
  
  try {
    // Initialize services  
    const loggerService = new LoggerService(path.join(process.cwd(), 'logs', 'magic-index.log'));
    const embeddingService = new EmbeddingService(loggerService);
    
    console.log(`🤖 Initializing ${config.provider.toUpperCase()} embedding service with ${config.embeddingModel}...`);
    
    // Build embeddings index
    const stats = await embeddingService.buildIndex(options.force || false);
    
    console.log(`✅ Index built successfully!`);
    console.log(`📊 Processed: ${stats.processed} files`);
    console.log(`⏭️  Skipped: ${stats.skipped} files (unchanged)`);
    
    if (stats.errors > 0) {
      console.log(`⚠️  Errors: ${stats.errors} files failed to process`);
    }
    
    const baseMemoriesDir = require('../../utils/memory-path').getMemoriesPath();
    const indexPath = aiConfig.getIndexPath(path.join(baseMemoriesDir, 'embeddings'));
    console.log(`💾 Vector embeddings saved to ${path.relative(process.cwd(), path.join(indexPath, 'embeddings.txt'))}`);
    
    if (stats.processed === 0 && stats.skipped === 0) {
      console.log('\n💡 Tip: Add some memories first!');
      console.log('   magic save "Your first memory content here"');
    } else if (options.force) {
      console.log('\n🔄 Force rebuild completed - all embeddings regenerated');
    } else {
      console.log('\n⚡ Incremental update - only new/changed files processed');
    }
    
  } catch (error) {
    console.error('❌ Error building embeddings index:', error);
    if (config.provider === 'ollama') {
      console.error(`   Make sure Ollama is running with ${config.embeddingModel} model`);
      console.error(`   Run: ollama pull ${config.embeddingModel}`);
    } else if (config.provider === 'openai') {
      console.error('   Make sure OPENAI_API_KEY is set in .env file');
      console.error('   Check your OpenAI API key and account status');
    }
    process.exit(1);
  }
}