// Simple test of the @alice command functionality
// This simulates what happens when a user types "magi ask @alice about her shrinking expertise"

const { brainXchangeIntegration } = require('./dist/integrations/brainxchange-integration.js');
const { MemoryService } = require('./dist/services/memory-service.js');
const { LoggerService } = require('./dist/services/logger-service.js');

async function testAliceCommand() {
  console.log('🧪 Testing @alice user discovery command...\n');

  try {
    // Initialize the integration (simulate server startup)
    const loggerService = new LoggerService('./logs/test.log');
    const memoryService = new MemoryService('../memories', loggerService);
    
    console.log('🔗 Initializing BrainXchange integration...');
    await brainXchangeIntegration.initialize('igor@test.com', 'Igor Test', memoryService);
    console.log('✅ BrainXchange integration ready\n');

    // Test the @alice command
    console.log('📤 Testing command: "magi ask @alice about her shrinking expertise"');
    const result = await brainXchangeIntegration.handleCommand('magi ask @alice about her shrinking expertise');
    
    console.log('\n📥 Response:');
    console.log('═'.repeat(60));
    console.log(result);
    console.log('═'.repeat(60));

    // Test status command too
    console.log('\n📤 Testing command: "magi status"');
    const statusResult = await brainXchangeIntegration.handleCommand('magi status');
    
    console.log('\n📥 Status Response:');
    console.log('═'.repeat(60));
    console.log(statusResult);
    console.log('═'.repeat(60));

    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAliceCommand();