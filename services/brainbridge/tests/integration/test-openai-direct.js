#!/usr/bin/env node

/**
 * Direct OpenAI API test to verify configuration
 */

const OpenAI = require('openai');

async function testOpenAIDirect() {
  console.log('🧪 Testing OpenAI API directly...\n');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Test 1: Chat completion
    console.log('💬 Test 1: Chat completion with gpt-4o-mini...');
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "OpenAI is working!" in 5 words or less.' }],
      max_tokens: 20,
    });
    console.log('Response:', chatResponse.choices[0].message.content);
    console.log('✅ Chat completion working\n');

    // Test 2: Embeddings
    console.log('🧠 Test 2: Embeddings with text-embedding-3-small...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'OpenAI integration test for magi knowledge base',
    });
    console.log('Embedding dimensions:', embeddingResponse.data[0].embedding.length);
    console.log('First 5 values:', embeddingResponse.data[0].embedding.slice(0, 5));
    console.log('✅ Embeddings working\n');

    console.log('🎉 OpenAI API is fully functional!');
    console.log('✅ Both chat (gpt-4o-mini) and embeddings (text-embedding-3-small) are working correctly.');
    
  } catch (error) {
    console.error('❌ OpenAI API test failed:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testOpenAIDirect().catch(console.error);