/**
 * mAGIc Query Command  
 * Searches knowledge base and provides AI-powered answers
 */

import { AIService } from '../../services/ai-service';
import { LoggerService } from '../../services/logger-service';
import { aiConfig } from '../../config/ai-config';
import * as path from 'path';

interface QueryOptions {
  privacy: string;
  limit: string;
}

export async function queryCommand(question: string, options: QueryOptions) {
  const config = aiConfig.getConfig();
  console.log(`🤖 mAGIc Query: "${question}"`);
  console.log(`🔍 Using ${config.provider.toUpperCase()} provider with ${config.chatModel}...`);
  
  try {
    // Initialize services
    const loggerService = new LoggerService(path.join(process.cwd(), 'logs', 'magic-query.log'));
    const aiService = new AIService(loggerService);
    
    // Step 1: Search memories and synthesize answer with AI
    console.log('🔍 Searching your knowledge base...');
    const result = await aiService.queryMemoriesWithAI(
      question, 
      options.privacy || 'personal', 
      parseInt(options.limit) || 5
    );
    
    if (!result.success) {
      console.error('❌ Query failed:', result.error);
      process.exit(1);
    }
    
    if (result.memoryCount === 0) {
      console.log('📭 No relevant memories found.');
      return;
    }
    
    console.log(`📚 Found ${result.memoryCount} relevant memories`);
    
    // Step 2: Display the AI-synthesized answer
    console.log('\n💡 Answer:');
    console.log('─'.repeat(50));
    console.log(result.answer);
    console.log('─'.repeat(50));
    
    // Step 3: Show source files
    if (result.sources && result.sources.length > 0) {
      console.log('\n📖 Sources:');
      result.sources.forEach((source, index) => {
        console.log(`[${index + 1}] ${source}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing query:', error);
    if (config.provider === 'ollama') {
      console.error(`   Make sure Ollama is running with ${config.chatModel} model`);
      console.error(`   Run: ollama pull ${config.chatModel}`);
    } else if (config.provider === 'openai') {
      console.error('   Make sure OPENAI_API_KEY is set in .env file');
      console.error('   Check your OpenAI API key and account status');
    }
    process.exit(1);
  }
}

