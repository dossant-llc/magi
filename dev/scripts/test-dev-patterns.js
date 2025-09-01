#!/usr/bin/env node

/**
 * Test script for dev patterns functionality
 */

const { tryPatterns, isComplexDevQuestion } = require('./dev-patterns');

const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  info: '\x1b[36m',
  dim: '\x1b[90m',
  reset: '\x1b[0m'
};

async function runTests() {
  console.log(`${colors.info}🧪 Testing Dev Patterns System${colors.reset}\n`);
  
  const testCases = [
    // Pattern matching tests
    { input: 'status', expected: 'should show system status' },
    { input: 'is bc running?', expected: 'should check BrainCloud process' },
    { input: 'what does npm run magic do?', expected: 'should explain npm script' },
    { input: 'ports', expected: 'should show port status' },
    { input: 'models', expected: 'should show Ollama models' },
    { input: 'help', expected: 'should show help' },
    
    // Complex dev question detection
    { input: 'how do i fix connection issues?', isComplex: true },
    { input: 'what should i do if ollama stops?', isComplex: true },
    { input: 'why is brainbridge not starting?', isComplex: true },
    { input: 'troubleshoot memory problems', isComplex: true },
    
    // Non-pattern inputs (should return null)
    { input: 'tell me about react hooks', expected: null },
    { input: 'what is machine learning?', expected: null }
  ];
  
  let passed = 0;
  let total = 0;
  
  for (const testCase of testCases) {
    total++;
    console.log(`${colors.dim}Testing: "${testCase.input}"${colors.reset}`);
    
    try {
      // Test pattern matching
      const result = await tryPatterns(testCase.input);
      
      if (testCase.expected === null) {
        if (result === null) {
          console.log(`  ${colors.success}✅ Correctly returned null (no pattern match)${colors.reset}`);
          passed++;
        } else {
          console.log(`  ${colors.error}❌ Expected null but got response${colors.reset}`);
        }
      } else if (result) {
        console.log(`  ${colors.success}✅ Got response: ${result.slice(0, 50)}...${colors.reset}`);
        passed++;
      } else if (testCase.isComplex) {
        // Test complex question detection
        const isComplex = isComplexDevQuestion(testCase.input);
        if (isComplex) {
          console.log(`  ${colors.success}✅ Correctly detected as complex dev question${colors.reset}`);
          passed++;
        } else {
          console.log(`  ${colors.error}❌ Should have been detected as complex${colors.reset}`);
        }
      } else {
        console.log(`  ${colors.error}❌ No pattern match found${colors.reset}`);
      }
    } catch (error) {
      console.log(`  ${colors.error}❌ Error: ${error.message}${colors.reset}`);
    }
    
    console.log('');
  }
  
  console.log(`${colors.info}📊 Test Results: ${passed}/${total} passed${colors.reset}`);
  
  if (passed === total) {
    console.log(`${colors.success}🎉 All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.error}❌ Some tests failed${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.error}❌ Test error: ${error.message}${colors.reset}`);
  process.exit(1);
});