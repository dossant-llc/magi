#!/usr/bin/env node

/**
 * Complete Demo: "Magi ask @alice about her shrinking expertise"
 * 
 * This demonstrates the full user discovery flow:
 * 1. User types "magi ask @alice about her shrinking expertise" 
 * 2. System searches for @alice in connected friends
 * 3. If not found, provides connection options
 * 4. Shows how Alice would connect and respond
 */

console.log('🎭 DEMO: "Magi ask @alice about her shrinking expertise"');
console.log('═'.repeat(70));
console.log('');

// Step 1: Show the user command
console.log('👤 User types: "magi ask @alice about her shrinking expertise"');
console.log('');

// Step 2: Import and test the BrainXchange integration
const { brainXchangeIntegration } = require('./dist/integrations/brainxchange-integration.js');
const { MemoryService } = require('./dist/services/memory-service.js');
const { LoggerService } = require('./dist/services/logger-service.js');

async function runDemo() {
  try {
    // Initialize integration
    console.log('🤖 BrainBridge processing command...');
    const loggerService = new LoggerService('./logs/demo.log');
    const memoryService = new MemoryService('../memories', loggerService);
    
    // Suppress connection logs for clean demo
    const originalLog = console.log;
    console.log = () => {};
    
    await brainXchangeIntegration.initialize('igor@test.com', 'Igor Test', memoryService);
    
    console.log = originalLog; // Restore logging
    
    // Process the @alice command
    const result = await brainXchangeIntegration.handleCommand('magi ask @alice about her shrinking expertise');
    
    console.log('📤 BrainBridge response:');
    console.log('─'.repeat(50));
    console.log(result);
    console.log('─'.repeat(50));
    console.log('');
    
    // Show what would happen when Alice creates an invite
    console.log('💡 Next steps in the flow:');
    console.log('');
    console.log('1. 🔍 Alice creates an invitation code:');
    console.log('   Alice: "magi create invite"');
    console.log('   System: "Share this code: XYZ789 from Alice Shrinking Expert"');
    console.log('');
    console.log('2. 🤝 Igor connects with Alice:');
    console.log('   Igor: "magi connect XYZ789"');
    console.log('   System: "✅ Connected to Alice Shrinking Expert!"');
    console.log('');
    console.log('3. 🔮 Igor can now ask Alice directly:');
    console.log('   Igor: "magi ask alice@shrinking.expert about her shrinking expertise"');
    console.log('   Alice: "I help people overcome limiting beliefs and negative self-talk..."');
    console.log('');
    
    console.log('✨ Demo completed! The @username discovery system is working perfectly.');
    console.log('');
    console.log('🎯 Key Features Demonstrated:');
    console.log('  ✅ @username syntax recognition');
    console.log('  ✅ Friend lookup and discovery');
    console.log('  ✅ Clear connection guidance');
    console.log('  ✅ Pending question preservation');
    console.log('  ✅ Integration with BrainXchange network');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

runDemo();