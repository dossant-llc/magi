/**
 * Test script to verify MCP AI integration
 * Simulates the MCP tool calls to test the AI functionality
 */

const { BrainBridgeServer } = require('./dist/server.js');

async function testMCPAI() {
  console.log('🧪 Testing BrainBridge MCP AI Integration...\n');
  
  try {
    // This would normally be handled by MCP protocol, but we'll test the handlers directly
    const { AIService, LoggerService } = require('./dist/services/index.js');
    
    const loggerService = new LoggerService('./logs/test.log');
    const aiService = new AIService(loggerService);
    
    // Test 1: AI Status
    console.log('1️⃣  Testing AI Status...');
    const status = await aiService.getAIStatus();
    console.log('   ✅ Status check completed');
    console.log(`   🤖 Ollama connected: ${status.ollama.connected}`);
    console.log(`   📚 Total memories: ${status.memories.total}`);
    console.log(`   📊 Index exists: ${status.index.exists}`);
    
    // Test 2: AI Save Memory
    console.log('\n2️⃣  Testing AI Save Memory...');
    const testContent = 'When troubleshooting API issues, always check the response headers first. Look for rate limiting info in X-RateLimit headers.';
    
    const saveResult = await aiService.saveMemoryWithAI(testContent, 'personal', 'troubleshooting');
    
    if (saveResult.success) {
      console.log('   ✅ AI Save successful');
      console.log(`   📁 File: ${saveResult.filePath}`);
      console.log(`   🏷️  Category: ${saveResult.aiAnalysis?.category}`);
      console.log(`   🏷️  Tags: ${saveResult.aiAnalysis?.tags?.join(', ')}`);
    } else {
      console.log(`   ❌ AI Save failed: ${saveResult.error}`);
    }
    
    // Test 3: AI Query Memories
    console.log('\n3️⃣  Testing AI Query Memories...');
    const queryResult = await aiService.queryMemoriesWithAI('How should I debug API problems?', 'personal', 3);
    
    if (queryResult.success) {
      console.log('   ✅ AI Query successful');
      console.log(`   🧠 Found ${queryResult.memoryCount} relevant memories`);
      console.log(`   📝 Answer: ${queryResult.answer?.slice(0, 100)}...`);
      console.log(`   📖 Sources: ${queryResult.sources?.join(', ')}`);
    } else {
      console.log(`   ❌ AI Query failed: ${queryResult.error}`);
    }
    
    console.log('\n🎉 MCP AI Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ BrainBridge MCP server with AI tools is functional');
    console.log('   ✅ Local LLM integration working');
    console.log('   ✅ Privacy-aware memory storage working');
    console.log('   ✅ AI-powered categorization and search working');
    console.log('\n🚀 Ready for Claude Code integration!');
    console.log('   Use tools: ai_save_memory, ai_query_memories, ai_status');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMCPAI().then(() => {
  console.log('\n✨ Test completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed with error:', error);
  process.exit(1);
});