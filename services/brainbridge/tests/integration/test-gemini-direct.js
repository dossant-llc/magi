#!/usr/bin/env node

/**
 * Direct Gemini API Test Script
 * Tests Gemini embedding API without affecting the main system
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY or GOOGLE_API_KEY environment variable required');
  console.log('💡 Set up your API key at: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  warning: '\x1b[33m',
  info: '\x1b[36m',
  dim: '\x1b[90m',
  reset: '\x1b[0m'
};

class GeminiTester {
  constructor() {
    this.apiKey = GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = 'text-embedding-004';
  }

  async testEmbedding(text, description = '') {
    console.log(`${colors.info}🧪 Testing: ${description || text.substring(0, 50)}...${colors.reset}`);
    
    try {
      const startTime = Date.now();
      
      const requestBody = {
        model: `models/${this.model}`,
        content: {
          parts: [{
            text: text
          }]
        }
      };

      const url = `${this.baseUrl}/${this.model}:embedContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          console.log(`${colors.warning}⚠️  Rate limited (429): ${errorText}${colors.reset}`);
          return { success: false, error: 'Rate limited', duration };
        }
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.embedding || !data.embedding.values) {
        throw new Error('Invalid response format');
      }

      const embedding = data.embedding.values;
      
      console.log(`${colors.success}✅ Success: ${embedding.length}D vector in ${duration}ms${colors.reset}`);
      console.log(`${colors.dim}   Preview: [${embedding.slice(0, 5).map(n => n.toFixed(3)).join(', ')}...]${colors.reset}`);
      
      return { 
        success: true, 
        embedding, 
        dimensions: embedding.length,
        duration 
      };
      
    } catch (error) {
      console.log(`${colors.error}❌ Failed: ${error.message}${colors.reset}`);
      return { success: false, error: error.message, duration: 0 };
    }
  }

  async testApiKey() {
    console.log(`${colors.info}🔑 Testing API key validity...${colors.reset}`);
    
    const maskedKey = `${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
    console.log(`${colors.dim}   Using key: ${maskedKey}${colors.reset}`);
    
    return await this.testEmbedding('API key test', 'API Key Validation');
  }

  async testRateLimit() {
    console.log(`\n${colors.info}⏱️  Testing rate limits (free tier: 5 RPM)...${colors.reset}`);
    
    const results = [];
    for (let i = 1; i <= 3; i++) {
      console.log(`${colors.dim}Request ${i}/3:${colors.reset}`);
      const result = await this.testEmbedding(`Rate limit test ${i}`, `Rate Limit Test ${i}`);
      results.push(result);
      
      if (i < 3 && result.success) {
        console.log(`${colors.dim}   Waiting 13 seconds for rate limit...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 13000));
      }
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`${colors.info}📊 Rate limit test: ${successful}/3 requests succeeded${colors.reset}`);
  }

  async testDifferentTexts() {
    console.log(`\n${colors.info}📝 Testing different text types...${colors.reset}`);
    
    const tests = [
      { text: 'Hello world', description: 'Simple text' },
      { text: 'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for testing.', description: 'Medium text' },
      { text: 'Igor loves avocados. They are creamy, nutritious, and perfect for making guacamole. He eats them almost every day for breakfast.', description: 'Personal preference text' },
      { text: 'Technical documentation about neural networks and machine learning algorithms in artificial intelligence systems.', description: 'Technical text' },
    ];
    
    const results = [];
    for (const test of tests) {
      const result = await this.testEmbedding(test.text, test.description);
      results.push({ ...test, ...result });
      
      if (result.success) {
        // Wait between requests to respect rate limit
        await new Promise(resolve => setTimeout(resolve, 13000));
      }
    }
    
    console.log(`\n${colors.info}📊 Text type test results:${colors.reset}`);
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const dims = result.dimensions ? `${result.dimensions}D` : 'N/A';
      const time = result.duration ? `${result.duration}ms` : 'N/A';
      console.log(`   ${status} ${result.description}: ${dims} in ${time}`);
    });
  }

  async runAllTests() {
    console.log(`${colors.info}🧙 Gemini Embedding API Direct Test${colors.reset}`);
    console.log(`${colors.dim}Model: ${this.model}${colors.reset}`);
    console.log(`${colors.dim}Base URL: ${this.baseUrl}${colors.reset}\n`);
    
    // Test 1: API Key validation
    const keyTest = await this.testApiKey();
    if (!keyTest.success) {
      console.log(`${colors.error}❌ API key test failed. Cannot proceed with other tests.${colors.reset}`);
      return;
    }
    
    console.log(`${colors.success}🎉 API key is valid! Proceeding with additional tests...${colors.reset}`);
    
    // Test 2: Rate limiting (if API key works)
    await this.testRateLimit();
    
    // Test 3: Different text types
    await this.testDifferentTexts();
    
    console.log(`\n${colors.success}🎯 Gemini API testing complete!${colors.reset}`);
    console.log(`${colors.info}💡 Ready to integrate with BrainBridge system${colors.reset}`);
  }
}

// Run the tests
const tester = new GeminiTester();
tester.runAllTests().catch(error => {
  console.error(`${colors.error}❌ Test runner failed: ${error.message}${colors.reset}`);
  process.exit(1);
});