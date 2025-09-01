#!/usr/bin/env node

/**
 * Performance test for BrainBridge MCP operations
 * Tests the "favorite beer" query with timing measurements
 */

import axios from 'axios';

const MCP_URL = 'http://localhost:8147/mcp';

interface PerfResult {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  response?: any;
}

async function measureTime<T>(operation: string, fn: () => Promise<T>): Promise<PerfResult> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    return {
      operation,
      duration,
      success: true,
      response: result
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      operation,
      duration,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testMCPEndpoint(method: string, params: any = {}) {
  return axios.post(MCP_URL, {
    method: 'tools/call',
    params: {
      name: method,
      arguments: params
    }
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 35000
  });
}

async function runPerformanceTest() {
  console.log('🚀 BrainBridge Performance Test');
  console.log('================================');
  console.log(`🎯 Target: ${MCP_URL}`);
  console.log('');

  const tests = [
    {
      name: 'Health Check',
      fn: () => axios.get('http://localhost:8147/health')
    },
    {
      name: 'Tools List',
      fn: () => testMCPEndpoint('tools/list')
    },
    {
      name: 'AI Status',
      fn: () => testMCPEndpoint('ai_status')
    },
    {
      name: 'Search Memories (beer)',
      fn: () => testMCPEndpoint('search_memories', { 
        query: 'beer',
        category: 'personal' 
      })
    },
    {
      name: '🍺 AI Query: "What is my favorite beer?"',
      fn: () => testMCPEndpoint('ai_query_memories', {
        question: 'What is my favorite beer?',
        max_privacy: 'personal',
        limit: 5,
        synthesis_mode: 'local'
      })
    },
    {
      name: 'AI Query: "What is my favorite beer?" (Raw Mode)',
      fn: () => testMCPEndpoint('ai_query_memories', {
        question: 'What is my favorite beer?',
        max_privacy: 'personal', 
        limit: 5,
        synthesis_mode: 'raw'
      })
    }
  ];

  const results: PerfResult[] = [];

  for (const test of tests) {
    console.log(`⏱️  Running: ${test.name}...`);
    const result = await measureTime(test.name, test.fn);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.duration}ms - ${test.name}`);
    } else {
      console.log(`❌ ${result.duration}ms - ${test.name}: ${result.error}`);
    }
  }

  console.log('');
  console.log('📊 Performance Summary');
  console.log('=====================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log('');

  if (successful.length > 0) {
    console.log('⚡ Response Times:');
    successful.forEach(result => {
      const emoji = result.duration > 5000 ? '🐌' : result.duration > 2000 ? '⚠️' : '⚡';
      console.log(`${emoji} ${result.duration.toString().padStart(6)}ms - ${result.operation}`);
    });
    console.log('');
  }

  if (failed.length > 0) {
    console.log('💥 Failures:');
    failed.forEach(result => {
      console.log(`❌ ${result.operation}: ${result.error}`);
    });
    console.log('');
  }

  const beerQuery = results.find(r => r.operation.includes('favorite beer') && !r.operation.includes('Raw'));
  if (beerQuery) {
    console.log('🍺 Beer Query Analysis:');
    if (beerQuery.success) {
      console.log(`✅ Success: ${beerQuery.duration}ms`);
      if (beerQuery.duration > 10000) {
        console.log('⚠️  Warning: >10s response time indicates performance issue');
        console.log('   Possible causes: Ollama slow, embeddings rebuild, memory file corruption');
      } else if (beerQuery.duration > 5000) {
        console.log('⚠️  Slow: >5s response time could be improved');
      } else {
        console.log('⚡ Good: <5s response time');
      }
    } else {
      console.log(`❌ Failed: ${beerQuery.error}`);
    }
  }
}

// Run the test
runPerformanceTest().catch(console.error);