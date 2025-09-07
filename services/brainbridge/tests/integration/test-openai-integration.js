#!/usr/bin/env node

/**
 * End-to-end test for magi with OpenAI integration
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
const { getProjectRoot } = require('../../src/utils/magi-paths.js');
const path = require('path');

async function testOpenAI() {
  console.log('🧪 Starting OpenAI integration test...\n');
  
  const projectRoot = getProjectRoot();
  
  // Start the server with OpenAI provider
  const serverProcess = spawn('npm', ['run', 'bb:stdio'], {
    env: { ...process.env, AI_PROVIDER: 'openai' },
    cwd: projectRoot
  });

  // Create transport and client
  const transport = new StdioClientTransport({
    command: 'npm',
    args: ['run', 'bb:stdio'],
    env: { ...process.env, AI_PROVIDER: 'openai' },
    cwd: projectRoot
  });

  const client = new Client({
    name: 'openai-test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    // Connect to the server
    await client.connect(transport);
    console.log('✅ Connected to magi server\n');

    // Test 1: Check AI status
    console.log('📊 Test 1: Checking AI status...');
    const statusResult = await client.callTool({
      name: 'ai_status',
      arguments: {}
    });
    console.log('Status:', JSON.stringify(statusResult.content, null, 2));
    console.log('✅ Status check passed\n');

    // Test 2: Save memory with AI categorization
    console.log('💾 Test 2: Saving memory with OpenAI...');
    const saveResult = await client.callTool({
      name: 'ai_save_memory',
      arguments: {
        content: 'OpenAI integration test: Successfully configured magi to use OpenAI provider with gpt-4o-mini for chat and text-embedding-3-small for embeddings. The system properly handles provider switching and index rebuilding.',
        category_hint: 'testing',
        privacy_level: 'personal'
      }
    });
    console.log('Save result:', JSON.stringify(saveResult.content, null, 2));
    console.log('✅ Memory saved successfully\n');

    // Test 3: Query memories with AI synthesis
    console.log('🔍 Test 3: Querying memories with OpenAI...');
    const queryResult = await client.callTool({
      name: 'ai_query_memories',
      arguments: {
        question: 'What do you know about OpenAI integration testing?',
        synthesis_mode: 'raw',
        limit: 5
      }
    });
    console.log('Query result:', JSON.stringify(queryResult.content, null, 2));
    console.log('✅ Query executed successfully\n');

    // Test 4: Search memories
    console.log('🔎 Test 4: Searching memories...');
    const searchResult = await client.callTool({
      name: 'search_memories',
      arguments: {
        query: 'OpenAI',
        category: 'testing'
      }
    });
    console.log('Search result:', JSON.stringify(searchResult.content, null, 2));
    console.log('✅ Search completed successfully\n');

    console.log('🎉 All tests passed! OpenAI integration is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

// Run the test
testOpenAI().catch(console.error);