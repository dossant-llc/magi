"use strict";
/**
 * mAGIc Index Command
 * Builds vector index for semantic search using embeddings
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
exports.indexCommand = indexCommand;
const path = __importStar(require("path"));
const embedding_service_1 = require("../../services/embedding-service");
const logger_service_1 = require("../../services/logger-service");
async function indexCommand(options) {
    console.log('🔍 mAGIc Index: Building vector embeddings index...');
    try {
        // Initialize services  
        const loggerService = new logger_service_1.LoggerService(path.join(process.cwd(), 'logs', 'magic-index.log'));
        const embeddingService = new embedding_service_1.EmbeddingService(loggerService);
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
        }
        else if (options.force) {
            console.log('\n🔄 Force rebuild completed - all embeddings regenerated');
        }
        else {
            console.log('\n⚡ Incremental update - only new/changed files processed');
        }
    }
    catch (error) {
        console.error('❌ Error building embeddings index:', error);
        console.error('   Make sure Ollama is running with mxbai-embed-large model');
        console.error('   Run: ollama pull mxbai-embed-large');
        process.exit(1);
    }
}
