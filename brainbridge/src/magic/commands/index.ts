/**
 * mAGIc Index Command
 * Builds vector index for semantic search using embeddings
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EmbeddingService } from '../../services/embedding-service';
import { LoggerService } from '../../services/logger-service';

interface IndexOptions {
  force?: boolean;
}

export async function indexCommand(options: IndexOptions) {
  console.log('🔍 mAGIc Index: Building vector embeddings index...');
  
  try {
    // Initialize services  
    const loggerService = new LoggerService(path.join(process.cwd(), 'logs', 'magic-index.log'));
    const embeddingService = new EmbeddingService(loggerService);
    
    console.log('🤖 Initializing embedding service with mxbai-embed-large...');
    
    // Build embeddings index
    const stats = await embeddingService.buildIndex(options.force || false);
    
    console.log(`✅ Index built successfully!`);
    console.log(`📊 Processed: ${stats.processed} files`);
    console.log(`⏭️  Skipped: ${stats.skipped} files (unchanged)`);
    
    if (stats.errors > 0) {
      console.log(`⚠️  Errors: ${stats.errors} files failed to process`);
    }
    
    console.log(`💾 Vector embeddings saved to .index/embeddings.json`);
    
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
    console.error('   Make sure Ollama is running with mxbai-embed-large model');
    console.error('   Run: ollama pull mxbai-embed-large');
    process.exit(1);
  }
}