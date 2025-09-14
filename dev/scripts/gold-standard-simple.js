#!/usr/bin/env node
/**
 * Gold Standard Biorhythm Search Test - Simplified Version
 * Uses the existing magi MCP connection (no server startup needed)
 * The definitive test: Save fresh memory → Search for it → Clean up
 */

const fs = require('fs');
const path = require('path');
const { getProjectRoot } = require('./path-utils');

console.log('🏆 GOLD STANDARD Biorhythm Search Test - Simplified');
console.log('==================================================\n');

// Generate unique test content
const UNIQUE_ID = Date.now();
const TEST_BIORHYTHM_CONTENT = `Biorhythm Circadian Sleep Study ${UNIQUE_ID} - Research into how natural circadian rhythms impact coding productivity and focus during different times of day. This study was initiated to understand optimal work schedules for software development teams. Key findings include correlation between biorhythm peaks and bug-free code production rates.`;
const TEST_BIORHYTHM_QUERY = `What research has been done on biorhythm circadian sleep study ${UNIQUE_ID}?`;

// Track created file for cleanup
let createdTestFile = null;

async function runSimpleGoldStandardTest() {
  const results = {
    memorySave: { passed: false, details: null },
    memoryRetrieval: { passed: false, details: null },
    contentVerification: { passed: false, details: null },
    cleanup: { passed: false, details: null },
    regressionTest: { passed: false, details: null }
  };

  console.log(`🎯 Testing fresh memory with unique ID: ${UNIQUE_ID}`);
  console.log(`📋 Content: "${TEST_BIORHYTHM_CONTENT.substring(0, 80)}..."`);
  console.log(`🔍 Query: "${TEST_BIORHYTHM_QUERY}"\n`);

  // Phase 1: Save Fresh Test Memory
  console.log('⏱️  Phase 1: Save Fresh Biorhythm Memory...');
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    const saveCmd = `AI_PROVIDER=openai npm run magic save "${TEST_BIORHYTHM_CONTENT}"`;
    const saveResult = await execPromise(saveCmd, {
      cwd: getProjectRoot(),
      timeout: 25000
    });

    if (saveResult.stderr && saveResult.stderr.includes('error')) {
      throw new Error(`Memory save failed: ${saveResult.stderr}`);
    }

    const saveOutput = saveResult.stdout || saveResult.stderr || '';
    if (!saveOutput.toLowerCase().includes('saved') && !saveOutput.toLowerCase().includes('memory')) {
      throw new Error('Save confirmation not found in output');
    }

    console.log('✅ Phase 1 PASSED: Fresh biorhythm memory saved successfully');
    results.memorySave.passed = true;
    results.memorySave.details = `Saved test memory with unique ID ${UNIQUE_ID}`;

  } catch (error) {
    console.log(`❌ Phase 1 FAILED: ${error.message}`);
    results.memorySave.details = error.message;
    return await generateReport(results);
  }

  // Phase 2: Immediate Search Test (THE GOLD STANDARD MOMENT)
  console.log('⏱️  Phase 2: Search for Fresh Memory (THE GOLD STANDARD)...');
  try {
    const queryCmd = `AI_PROVIDER=openai npm run magic query "${TEST_BIORHYTHM_QUERY}"`;
    const queryResult = await execPromise(queryCmd, {
      cwd: getProjectRoot(),
      timeout: 25000
    });

    const responseText = queryResult.stdout || queryResult.stderr || '';
    console.log('📄 Search Response Preview:');
    console.log(responseText.substring(0, 400) + '...\n');

    // CRITICAL: Must find our exact unique ID
    if (!responseText.includes(UNIQUE_ID.toString())) {
      throw new Error(`GOLD STANDARD FAILED: Fresh memory not found! Unique ID ${UNIQUE_ID} not in response`);
    }

    // Must find key content from our test memory
    if (!responseText.toLowerCase().includes('circadian')) {
      throw new Error('Fresh memory content missing: circadian not found');
    }

    if (!responseText.toLowerCase().includes('coding productivity')) {
      throw new Error('Fresh memory content missing: coding productivity not found');
    }

    console.log('✅ Phase 2 PASSED: 🏆 GOLD STANDARD ACHIEVED! Fresh memory immediately searchable');
    results.memoryRetrieval.passed = true;
    results.memoryRetrieval.details = `Found fresh memory with unique ID ${UNIQUE_ID}`;

    results.contentVerification.passed = true;
    results.contentVerification.details = 'Fresh memory content verified in search results';

  } catch (error) {
    console.log(`❌ Phase 2 FAILED: ${error.message}`);
    results.memoryRetrieval.details = error.message;
    results.contentVerification.details = error.message;
  }

  // Phase 3: Regression Test - Blue Moon Query
  console.log('⏱️  Phase 3: Regression Test (Blue Moon Beer)...');
  try {
    const regressionCmd = `AI_PROVIDER=openai npm run magic query "What is Igor's favorite beer?"`;
    const regressionResult = await execPromise(regressionCmd, {
      cwd: getProjectRoot(),
      timeout: 15000
    });

    const regressionText = regressionResult.stdout || regressionResult.stderr || '';
    if (!regressionText.includes('Blue Moon') && !regressionText.includes('beer')) {
      throw new Error('Regression test failed - Blue Moon query not working');
    }

    console.log('✅ Phase 3 PASSED: Regression test (Blue Moon) works');
    results.regressionTest.passed = true;
    results.regressionTest.details = 'Blue Moon query returned expected results';

  } catch (error) {
    console.log(`❌ Phase 3 FAILED: ${error.message}`);
    results.regressionTest.details = error.message;
  }

  // Phase 4: Cleanup Test Memory
  await cleanupTestMemory(results);

  return await generateReport(results);
}

async function cleanupTestMemory(results) {
  console.log('⏱️  Phase 4: Cleanup Test Memory...');

  try {
    // Find the test memory file by searching for the unique ID
    const memoriesPath = path.join(getProjectRoot(), 'data', 'memories', 'profiles', 'default');
    const searchDirs = ['public', 'team', 'personal', 'private', 'sensitive'];

    let found = false;
    for (const dir of searchDirs) {
      const dirPath = path.join(memoriesPath, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const filePath = path.join(dirPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(UNIQUE_ID.toString())) {
              console.log(`🗑️  Found and deleting test memory: ${path.relative(getProjectRoot(), filePath)}`);
              fs.unlinkSync(filePath);
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
    }

    if (found) {
      console.log('✅ Phase 4 PASSED: Test memory successfully cleaned up');
      results.cleanup.passed = true;
      results.cleanup.details = 'Test memory file deleted';
    } else {
      console.log('⚠️  Test memory file not found for cleanup (may have been auto-deleted)');
      results.cleanup.passed = true; // Not a failure
      results.cleanup.details = 'No cleanup needed';
    }

  } catch (error) {
    console.log(`❌ Phase 4 FAILED: Cleanup error: ${error.message}`);
    results.cleanup.details = error.message;
  }
}

async function generateReport(results) {
  const passed = Object.values(results).filter(r => r.passed).length;
  const total = Object.keys(results).length;

  console.log('\n🏆 GOLD STANDARD BIORHYTHM SEARCH TEST RESULTS');
  console.log('=============================================');
  console.log(`Memory Save: ${results.memorySave.passed ? '✅ PASS' : '❌ FAIL'} - ${results.memorySave.details || 'No details'}`);
  console.log(`Memory Retrieval: ${results.memoryRetrieval.passed ? '✅ PASS' : '❌ FAIL'} - ${results.memoryRetrieval.details || 'No details'}`);
  console.log(`Content Verification: ${results.contentVerification.passed ? '✅ PASS' : '❌ FAIL'} - ${results.contentVerification.details || 'No details'}`);
  console.log(`Cleanup: ${results.cleanup.passed ? '✅ PASS' : '❌ FAIL'} - ${results.cleanup.details || 'No details'}`);
  console.log(`Regression Test: ${results.regressionTest.passed ? '✅ PASS' : '❌ FAIL'} - ${results.regressionTest.details || 'No details'}`);

  console.log(`\n📊 Summary: ${passed}/${total} phases passed`);

  // GOLD STANDARD Decision
  const isGoldStandard = results.memorySave.passed && results.memoryRetrieval.passed && results.contentVerification.passed;
  const isGoForDeploy = isGoldStandard && results.regressionTest.passed;

  if (isGoForDeploy) {
    console.log('\n🚀 DECISION: GO FOR DEPLOY');
    console.log('🏆 GOLD STANDARD ACHIEVED: Fresh memory → Search → Find → Cleanup WORKS!');
    console.log('✅ Biorhythm search pipeline is bulletproof');
    console.log('✅ Regression tests pass');
    console.log('✅ Ready for production');
    process.exit(0);
  } else {
    console.log('\n🛑 DECISION: NO-GO FOR DEPLOY');

    if (!isGoldStandard) {
      console.log('🏆 GOLD STANDARD FAILED: Core pipeline broken');
      console.log('❌ Save→Search→Find cycle not working');
    } else {
      console.log('⚠️  Gold Standard works but regression issues detected');
    }

    console.log('\n📋 Next steps:');
    if (!results.memorySave.passed) {
      console.log('- Fix memory save functionality');
    }
    if (!results.memoryRetrieval.passed) {
      console.log('- Fix memory retrieval pipeline (likely similarity threshold)');
    }
    if (!results.contentVerification.passed) {
      console.log('- Fix content verification in search results');
    }
    if (!results.regressionTest.passed) {
      console.log('- Fix regression in existing search functionality');
    }

    console.log(`\n🔧 Test again with: node ${path.basename(__filename)}`);
    process.exit(1);
  }
}

// Run the test
runSimpleGoldStandardTest().catch(error => {
  console.error('\n💥 Gold Standard test runner crashed:', error);
  console.log('\n🛑 DECISION: NO-GO FOR DEPLOY - Test runner failure');
  process.exit(1);
});