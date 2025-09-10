#!/usr/bin/env node

/**
 * Test script to verify composite API key parsing logic
 */

console.log('🧪 Testing Composite API Key Logic\n');

// Test cases
const testCases = [
  {
    name: 'Valid composite key',
    apiKey: 'ig-4f2a8b9d:8f840af7792e4672a67dfb21754a571f',
    urlRoute: '_auto',
    expected: {
      route: 'ig-4f2a8b9d',
      secret: '8f840af7792e4672a67dfb21754a571f',
      valid: true
    }
  },
  {
    name: 'Composite key with explicit route',
    apiKey: 'ig-4f2a8b9d:8f840af7792e4672a67dfb21754a571f',
    urlRoute: 'custom-route',
    expected: {
      route: 'custom-route',
      secret: '8f840af7792e4672a67dfb21754a571f',
      valid: true
    }
  },
  {
    name: 'Legacy key format with explicit route',
    apiKey: '8f840af7792e4672a67dfb21754a571f',
    urlRoute: 'legacy-route',
    expected: {
      route: 'legacy-route',
      secret: '8f840af7792e4672a67dfb21754a571f',
      valid: true
    }
  },
  {
    name: 'Legacy key with _auto route (should fail)',
    apiKey: '8f840af7792e4672a67dfb21754a571f',
    urlRoute: '_auto',
    expected: {
      route: '_auto',
      secret: '8f840af7792e4672a67dfb21754a571f',
      valid: false,
      error: '_auto route requires composite API key'
    }
  },
  {
    name: 'Short secret (should fail)',
    apiKey: 'ig-test:tooshort',
    urlRoute: '_auto',
    expected: {
      route: 'ig-test',
      secret: 'tooshort',
      valid: false,
      error: 'Secret too short'
    }
  }
];

// Parse function (mirrors the Brain Proxy logic)
function parseApiKey(apiKey, urlRoute) {
  let route = urlRoute;
  let extractedRoute;
  let extractedSecret;
  let error = null;
  
  // Parse composite key format: route:secret
  if (apiKey.includes(':')) {
    const parts = apiKey.split(':');
    extractedRoute = parts[0];
    extractedSecret = parts[1];
    
    // If route is _auto, use the route from the API key
    if (urlRoute === '_auto') {
      route = extractedRoute;
    }
  } else {
    // Fallback to old format (just secret)
    extractedSecret = apiKey;
    
    if (urlRoute === '_auto') {
      error = '_auto route requires composite API key';
    }
  }
  
  // Validate secret length
  if (!error && (!extractedSecret || extractedSecret.length < 16)) {
    error = 'Secret too short';
  }
  
  return {
    route,
    secret: extractedSecret,
    valid: !error,
    error
  };
}

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = parseApiKey(test.apiKey, test.urlRoute);
  
  const matches = 
    result.route === test.expected.route &&
    result.secret === test.expected.secret &&
    result.valid === test.expected.valid &&
    (!test.expected.error || result.error === test.expected.error);
  
  if (matches) {
    console.log(`✅ ${test.name}`);
    console.log(`   Route: ${result.route}, Secret: ${result.secret?.substring(0, 8)}...`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: route=${test.expected.route}, valid=${test.expected.valid}`);
    console.log(`   Got: route=${result.route}, valid=${result.valid}, error=${result.error}`);
    failed++;
  }
  console.log('');
});

console.log('═'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed');
  process.exit(1);
}