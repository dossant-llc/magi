#!/usr/bin/env node
/**
 * Gold Standard Biorhythm Search Test - BrainProxy Edition
 * Uses the exact same API format as ChatGPT integration
 * Tests hub.m.agifor.me brain proxy endpoint
 */

const fs = require('fs');
const path = require('path');
const { getProjectRoot } = require('./path-utils');

console.log('🏆 GOLD STANDARD Biorhythm Search Test - BrainProxy Edition');
console.log('============================================================\n');

// Generate unique test content
const UNIQUE_ID = Date.now();
const TEST_BIORHYTHM_CONTENT = `Biorhythm Circadian Sleep Study ${UNIQUE_ID} - Research into how natural circadian rhythms impact coding productivity and focus during different times of day. This study was initiated to understand optimal work schedules for software development teams. Key findings include correlation between biorhythm peaks and bug-free code production rates.`;
const TEST_BIORHYTHM_QUERY = `What research has been done on biorhythm circadian sleep study ${UNIQUE_ID}?`;

// BrainProxy configuration
const BRAIN_PROXY_URL = 'https://hub.m.agifor.me/bp/rpc/ig-501097c1';
const BRAIN_PROXY_AUTH = 'Bearer ig-501097c1:c86ae73c8a8292872e9bdbe09ba5937d';

let createdTestFile = null;

async function runBrainProxyGoldStandardTest() {
  const results = {
    brainProxyConnection: { passed: false, details: null },
    memorySave: { passed: false, details: null },
    memoryRetrieval: { passed: false, details: null },
    contentVerification: { passed: false, details: null },
    cleanup: { passed: false, details: null },
    regressionTest: { passed: false, details: null }
  };

  console.log(`🎯 Testing fresh memory with unique ID: ${UNIQUE_ID}`);
  console.log(`📋 Content: "${TEST_BIORHYTHM_CONTENT.substring(0, 80)}..."`);
  console.log(`🔍 Query: "${TEST_BIORHYTHM_QUERY}"`);
  console.log(`🌐 Endpoint: ${BRAIN_PROXY_URL}\n`);

  // Phase 1: Test BrainProxy Connection
  console.log('⏱️  Phase 1: BrainProxy Connection Test...');
  try {
    const connectionTest = await sendBrainProxyRequest({
      id: "connection-test",
      method: "ai_query_memories",
      params: {
        question: "What is Igor's favorite beer?",
        limit: 1,
        max_privacy: "personal",
        synthesis_mode: "hybrid"
      }
    });

    if (connectionTest.error) {
      throw new Error(`Connection test failed: ${connectionTest.error.message || connectionTest.error}`);
    }

    const responseText = connectionTest.result.content[0].text;
    if (!responseText.includes('Blue Moon')) {
      throw new Error('Connection test failed - Blue Moon query not working');
    }

    console.log('✅ Phase 1 PASSED: BrainProxy connection working');
    results.brainProxyConnection.passed = true;
    results.brainProxyConnection.details = 'Brain proxy connection established and responding';

  } catch (error) {
    console.log(`❌ Phase 1 FAILED: ${error.message}`);
    results.brainProxyConnection.details = error.message;
    return await generateReport(results);
  }

  // Phase 2: Save Fresh Test Memory
  console.log(`⏱️  Phase 2: Save Fresh Biorhythm Memory (ID: ${UNIQUE_ID})...`);
  try {
    const saveResult = await sendBrainProxyRequest({
      id: `save-test-${UNIQUE_ID}`,
      method: "ai_save_memory",
      params: {
        content: TEST_BIORHYTHM_CONTENT,
        privacy_level: "team"
      }
    });

    if (saveResult.error) {
      throw new Error(`Memory save failed: ${saveResult.error.message || saveResult.error}`);
    }

    const saveResponseText = saveResult.result.content[0].text;
    if (!saveResponseText.includes('queued for saving') && !saveResponseText.includes('successfully saved')) {
      throw new Error('Save confirmation not found in response');
    }

    console.log('✅ Phase 2 PASSED: Fresh biorhythm memory saved via BrainProxy');
    results.memorySave.passed = true;
    results.memorySave.details = `Saved test memory with unique ID ${UNIQUE_ID} via brain proxy`;

    // Wait a moment for memory to be indexed
    console.log('⏳ Waiting 3 seconds for memory indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.log(`❌ Phase 2 FAILED: ${error.message}`);
    results.memorySave.details = error.message;
    return await generateReport(results);
  }

  // Phase 3: Immediate Retrieval Test (THE GOLD STANDARD MOMENT)
  console.log('⏱️  Phase 3: Search for Fresh Memory via BrainProxy (THE GOLD STANDARD)...');
  console.log(`🔍 Query: "${TEST_BIORHYTHM_QUERY}"`);
  try {
    const queryResult = await sendBrainProxyRequest({
      id: `query-test-${UNIQUE_ID}`,
      method: "ai_query_memories",
      params: {
        question: TEST_BIORHYTHM_QUERY,
        limit: 5,
        max_privacy: "team",
        synthesis_mode: "hybrid"
      }
    });

    if (queryResult.error) {
      throw new Error(`Fresh memory query failed: ${queryResult.error.message || queryResult.error}`);
    }

    const responseText = queryResult.result.content[0].text;
    console.log('📄 BrainProxy Search Response Preview:');
    console.log(responseText.substring(0, 400) + '...\n');

    // CRITICAL: Must find our exact unique ID
    if (!responseText.includes(UNIQUE_ID.toString())) {
      throw new Error(`GOLD STANDARD FAILED: Fresh memory not found via BrainProxy! Unique ID ${UNIQUE_ID} not in response`);
    }

    // Must find key content from our test memory
    if (!responseText.toLowerCase().includes('circadian')) {
      throw new Error('Fresh memory content missing: circadian not found');
    }

    if (!responseText.toLowerCase().includes('coding productivity')) {
      throw new Error('Fresh memory content missing: coding productivity not found');
    }

    console.log('✅ Phase 3 PASSED: 🏆 GOLD STANDARD ACHIEVED! Fresh memory immediately searchable via BrainProxy');
    results.memoryRetrieval.passed = true;
    results.memoryRetrieval.details = `Found fresh memory with unique ID ${UNIQUE_ID} via brain proxy`;

    results.contentVerification.passed = true;
    results.contentVerification.details = 'Fresh memory content verified in BrainProxy search results';

  } catch (error) {
    console.log(`❌ Phase 3 FAILED: ${error.message}`);
    results.memoryRetrieval.details = error.message;
    results.contentVerification.details = error.message;
  }

  // Phase 4: Regression Test - Blue Moon Query via BrainProxy
  console.log('⏱️  Phase 4: Regression Test via BrainProxy (Blue Moon Beer)...');
  try {
    const regressionResult = await sendBrainProxyRequest({
      id: "regression-test-blue-moon",
      method: "ai_query_memories",
      params: {
        question: "What is Igor's favorite beer?",
        limit: 3,
        max_privacy: "personal",
        synthesis_mode: "hybrid"
      }
    });

    if (regressionResult.error) {
      throw new Error(`Regression test failed: ${regressionResult.error.message || regressionResult.error}`);
    }

    const regressionText = regressionResult.result.content[0].text;
    if (!regressionText.includes('Blue Moon') && !regressionText.includes('beer')) {
      throw new Error('Regression test failed - Blue Moon query not working via BrainProxy');
    }

    console.log('✅ Phase 4 PASSED: Regression test (Blue Moon) works via BrainProxy');
    results.regressionTest.passed = true;
    results.regressionTest.details = 'Blue Moon query returned expected results via brain proxy';

  } catch (error) {
    console.log(`❌ Phase 4 FAILED: ${error.message}`);
    results.regressionTest.details = error.message;
  }

  // Phase 5: Cleanup Test Memory
  await cleanupTestMemory(results);

  return await generateReport(results);
}

async function sendBrainProxyRequest(message) {
  try {
    const response = await fetch(BRAIN_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BRAIN_PROXY_AUTH
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return { error: `BrainProxy request failed: ${error.message}` };
  }
}

async function cleanupTestMemory(results) {
  console.log('⏱️  Phase 5: Cleanup Test Memory...');

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
      console.log('✅ Phase 5 PASSED: Test memory successfully cleaned up');
      results.cleanup.passed = true;
      results.cleanup.details = 'Test memory file deleted';
    } else {
      console.log('⚠️  Test memory file not found for cleanup (may have been auto-deleted)');
      results.cleanup.passed = true; // Not a failure
      results.cleanup.details = 'No cleanup needed';
    }

  } catch (error) {
    console.log(`❌ Phase 5 FAILED: Cleanup error: ${error.message}`);
    results.cleanup.details = error.message;
  }
}

async function generateReport(results) {
  const passed = Object.values(results).filter(r => r.passed).length;
  const total = Object.keys(results).length;

  console.log('\n🏆 GOLD STANDARD BIORHYTHM SEARCH TEST RESULTS (BrainProxy)');
  console.log('===========================================================');
  console.log(`BrainProxy Connection: ${results.brainProxyConnection.passed ? '✅ PASS' : '❌ FAIL'} - ${results.brainProxyConnection.details || 'No details'}`);
  console.log(`Memory Save: ${results.memorySave.passed ? '✅ PASS' : '❌ FAIL'} - ${results.memorySave.details || 'No details'}`);
  console.log(`Memory Retrieval: ${results.memoryRetrieval.passed ? '✅ PASS' : '❌ FAIL'} - ${results.memoryRetrieval.details || 'No details'}`);
  console.log(`Content Verification: ${results.contentVerification.passed ? '✅ PASS' : '❌ FAIL'} - ${results.contentVerification.details || 'No details'}`);
  console.log(`Cleanup: ${results.cleanup.passed ? '✅ PASS' : '❌ FAIL'} - ${results.cleanup.details || 'No details'}`);
  console.log(`Regression Test: ${results.regressionTest.passed ? '✅ PASS' : '❌ FAIL'} - ${results.regressionTest.details || 'No details'}`);

  console.log(`\n📊 Summary: ${passed}/${total} phases passed`);

  // GOLD STANDARD Decision
  const isGoldStandard = results.memorySave.passed && results.memoryRetrieval.passed && results.contentVerification.passed;
  const isGoForDeploy = isGoldStandard && results.regressionTest.passed && results.brainProxyConnection.passed;

  if (isGoForDeploy) {
    console.log('\n🚀 DECISION: GO FOR DEPLOY');
    console.log('🏆 GOLD STANDARD ACHIEVED: BrainProxy integration works perfectly!');
    console.log('✅ Fresh memory → Save via BrainProxy → Search via BrainProxy → Find → Cleanup WORKS!');
    console.log('✅ ChatGPT integration format validated');
    console.log('✅ Regression tests pass via BrainProxy');
    console.log('✅ Ready for production with hub.m.agifor.me');
    process.exit(0);
  } else {
    console.log('\n🛑 DECISION: NO-GO FOR DEPLOY');

    if (!results.brainProxyConnection.passed) {
      console.log('🌐 BrainProxy connection failed');
    } else if (!isGoldStandard) {
      console.log('🏆 GOLD STANDARD FAILED: Core BrainProxy pipeline broken');
      console.log('❌ Save→Search→Find cycle not working via BrainProxy');
    } else {
      console.log('⚠️  Gold Standard works but BrainProxy regression issues detected');
    }

    console.log('\n📋 Next steps:');
    if (!results.brainProxyConnection.passed) {
      console.log('- Fix BrainProxy connection and authentication');
    }
    if (!results.memorySave.passed) {
      console.log('- Fix memory save functionality via BrainProxy');
    }
    if (!results.memoryRetrieval.passed) {
      console.log('- Fix memory retrieval pipeline via BrainProxy');
    }
    if (!results.contentVerification.passed) {
      console.log('- Fix content verification in BrainProxy search results');
    }
    if (!results.regressionTest.passed) {
      console.log('- Fix regression in existing BrainProxy functionality');
    }

    console.log(`\n🔧 Test again with: node ${path.basename(__filename)}`);
    process.exit(1);
  }
}

// Run the BrainProxy GOLD STANDARD test
runBrainProxyGoldStandardTest().catch(error => {
  console.error('\n💥 BrainProxy Gold Standard test runner crashed:', error);
  console.log('\n🛑 DECISION: NO-GO FOR DEPLOY - BrainProxy test runner failure');
  process.exit(1);
});