/**
 * Basic health check tests for backend API
 * Run with: npm test
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Simple test helper
 */
async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
        });
      })
      .on('error', reject);
  });
}

/**
 * Test runner
 */
async function runTests() {
  console.log('🧪 Running backend health tests...\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Health endpoint
  try {
    const result = await makeRequest('/health');
    if (result.status === 200 && result.data.status === 'ok') {
      console.log('✅ Health check endpoint returns 200');
      passed++;
    } else {
      console.log('❌ Health check endpoint failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Health check endpoint error:', error.message);
    failed++;
  }

  // Test 2: Users endpoint
  try {
    const result = await makeRequest('/api/users');
    if (result.status === 200) {
      console.log('✅ Users endpoint returns 200');
      passed++;
    } else {
      console.log('❌ Users endpoint failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Users endpoint error:', error.message);
    failed++;
  }

  // Test 3: Incidents endpoint
  try {
    const result = await makeRequest('/api/incidents');
    if (result.status === 200) {
      console.log('✅ Incidents endpoint returns 200');
      passed++;
    } else {
      console.log('❌ Incidents endpoint failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Incidents endpoint error:', error.message);
    failed++;
  }

  // Summary
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests();
