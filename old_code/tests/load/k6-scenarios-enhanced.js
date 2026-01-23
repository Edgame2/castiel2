/**
 * Enhanced k6 Load Test Scenarios
 * 
 * Comprehensive load testing scenarios aligned with performance budgets
 * Run with: k6 run --env TEST_TYPE=normal tests/load/k6-scenarios-enhanced.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { getConfig } from './k6-config.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const cacheHitRate = new Counter('cache_hits');
const cacheMissRate = new Counter('cache_misses');

// Configuration
const TEST_TYPE = __ENV.TEST_TYPE || 'normal';
export const options = getConfig(TEST_TYPE);

// Base URL from environment or default
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';

// Test user credentials (should be set via environment variables)
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'test-password';
const TEST_TENANT_ID = __ENV.TEST_TENANT_ID || 'test-tenant';

// Per-VU token cache
let authToken = null;
let csrfToken = null;

/**
 * Authenticate and get access token
 */
function authenticate() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );

  const success = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('accessToken') !== undefined,
    'login response time < 300ms': (r) => r.timings.duration < 300,
  });

  if (success) {
    authToken = loginRes.json('accessToken');
    errorRate.add(false);
    apiResponseTime.add(loginRes.timings.duration);
    return authToken;
  }

  errorRate.add(true);
  return null;
}

/**
 * Get CSRF token from GET request
 */
function getCsrfToken() {
  if (csrfToken) return csrfToken;
  
  const res = http.get(`${BASE_URL}/api/v1/auth/me`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { name: 'Get CSRF Token' },
  });
  
  csrfToken = res.headers['X-CSRF-Token'] || null;
  return csrfToken;
}

/**
 * Get request headers with auth and CSRF
 */
function getHeaders(includeCsrf = false) {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
  
  if (includeCsrf) {
    const token = getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }
  
  return headers;
}

/**
 * Scenario 1: Health Check
 */
export function healthCheck() {
  const res = http.get(`${BASE_URL}/health`, {
    tags: { name: 'Health Check' },
  });
  
  const success = check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(1);
}

/**
 * Scenario 2: Get Shard Types
 */
export function getShardTypes() {
  if (!authToken) {
    authToken = authenticate();
    if (!authToken) return;
  }

  const res = http.get(`${BASE_URL}/api/v1/shard-types`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { name: 'Get Shard Types' },
  });

  const success = check(res, {
    'get shard types status is 200': (r) => r.status === 200,
    'get shard types response time < 200ms': (r) => r.timings.duration < 200,
    'has cache header': (r) => r.headers['X-Cache'] !== undefined,
  });

  // Track cache hits/misses
  if (res.headers['X-Cache'] === 'HIT') {
    cacheHitRate.add(1);
  } else if (res.headers['X-Cache'] === 'MISS') {
    cacheMissRate.add(1);
  }

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(1);
}

/**
 * Scenario 3: Get Single Shard Type
 */
export function getShardType() {
  if (!authToken) {
    authToken = authenticate();
    if (!authToken) return;
  }

  // First get list to find a shard type ID
  const listRes = http.get(`${BASE_URL}/api/v1/shard-types`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { name: 'Get Shard Types' },
  });

  if (listRes.status !== 200) {
    errorRate.add(true);
    return;
  }

  const shardTypes = listRes.json();
  if (!shardTypes || !Array.isArray(shardTypes) || shardTypes.length === 0) {
    sleep(1);
    return;
  }

  const shardTypeId = shardTypes[0].id;
  const res = http.get(`${BASE_URL}/api/v1/shard-types/${shardTypeId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { name: 'Get Shard Type' },
  });

  const success = check(res, {
    'get shard type status is 200': (r) => r.status === 200,
    'get shard type response time < 100ms': (r) => r.timings.duration < 100,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(1);
}

/**
 * Scenario 4: List Shards
 */
export function listShards() {
  if (!authToken) {
    authToken = authenticate();
    if (!authToken) return;
  }

  const res = http.get(`${BASE_URL}/api/v1/shards?limit=20&offset=0`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { name: 'List Shards' },
  });

  const success = check(res, {
    'list shards status is 200': (r) => r.status === 200,
    'list shards response time < 300ms': (r) => r.timings.duration < 300,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(2);
}

/**
 * Scenario 5: Search Shards (Advanced)
 */
export function searchShards() {
  if (!authToken) {
    authToken = authenticate();
    if (!authToken) return;
  }

  const res = http.post(
    `${BASE_URL}/api/v1/search/advanced`,
    JSON.stringify({
      tenantId: TEST_TENANT_ID,
      query: 'test',
      limit: 20,
      offset: 0,
    }),
    {
      headers: getHeaders(true),
      tags: { name: 'Search Advanced' },
    }
  );

  const success = check(res, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(2);
}

/**
 * Scenario 6: Vector Search
 */
export function vectorSearch() {
  if (!authToken) {
    authToken = authenticate();
    if (!authToken) return;
  }

  const res = http.get(
    `${BASE_URL}/api/v1/search/vector?query=test&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      tags: { name: 'Search Vector' },
    }
  );

  const success = check(res, {
    'vector search status is 200': (r) => r.status === 200,
    'vector search response time < 300ms': (r) => r.timings.duration < 300,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(2);
}

/**
 * Scenario 7: Create Shard
 */
export function createShard() {
  if (!authToken) {
    authToken = authenticate();
    if (!authToken) return;
  }

  // First get a shard type ID
  const typeRes = http.get(`${BASE_URL}/api/v1/shard-types`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (typeRes.status !== 200) {
    errorRate.add(true);
    return;
  }

  const shardTypes = typeRes.json();
  if (!shardTypes || !Array.isArray(shardTypes) || shardTypes.length === 0) {
    sleep(1);
    return;
  }

  const shardTypeId = shardTypes[0].id;
  const res = http.post(
    `${BASE_URL}/api/v1/shards`,
    JSON.stringify({
      tenantId: TEST_TENANT_ID,
      shardTypeId: shardTypeId,
      structuredData: {
        name: `Load Test Shard ${Date.now()}-${__VU}`,
        description: 'Created during load test',
      },
    }),
    {
      headers: getHeaders(true),
      tags: { name: 'Create Shard' },
    }
  );

  const success = check(res, {
    'create shard status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'create shard response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(2);
}

/**
 * Scenario 8: Update Shard
 */
export function updateShard() {
  if (!authToken) {
    authToken = authenticate();
    if (!authToken) return;
  }

  // First get a shard ID
  const listRes = http.get(`${BASE_URL}/api/v1/shards?limit=1`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (listRes.status !== 200) {
    errorRate.add(true);
    return;
  }

  const shards = listRes.json();
  if (!shards || !Array.isArray(shards) || shards.length === 0) {
    sleep(1);
    return;
  }

  const shardId = shards[0].id;
  const res = http.put(
    `${BASE_URL}/api/v1/shards/${shardId}`,
    JSON.stringify({
      structuredData: {
        ...shards[0].structuredData,
        updatedAt: new Date().toISOString(),
      },
    }),
    {
      headers: getHeaders(true),
      tags: { name: 'Update Shard' },
    }
  );

  const success = check(res, {
    'update shard status is 200': (r) => r.status === 200,
    'update shard response time < 400ms': (r) => r.timings.duration < 400,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(2);
}

/**
 * Main test function
 */
export default function () {
  // Run scenarios with different weights (realistic traffic distribution)
  const scenarios = [
    { weight: 5, fn: healthCheck },        // 5% - Health checks
    { weight: 20, fn: getShardTypes },    // 20% - Get shard types (frequent)
    { weight: 10, fn: getShardType },     // 10% - Get single shard type
    { weight: 25, fn: listShards },       // 25% - List shards (most common)
    { weight: 15, fn: searchShards },     // 15% - Advanced search
    { weight: 5, fn: vectorSearch },      // 5% - Vector search
    { weight: 10, fn: createShard },      // 10% - Create shard
    { weight: 10, fn: updateShard },      // 10% - Update shard
  ];

  // Select scenario based on weight
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (random <= cumulative) {
      scenario.fn();
      break;
    }
  }
}

/**
 * Setup function (runs once before all VUs)
 */
export function setup() {
  console.log(`🚀 Starting ${TEST_TYPE} load test...`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Type: ${TEST_TYPE}`);
  
  // Authenticate once to verify credentials
  const token = authenticate();
  if (!token) {
    console.error('❌ Authentication failed. Check TEST_USER_EMAIL and TEST_USER_PASSWORD.');
    return {};
  }
  
  console.log('✅ Authentication successful');
  return { token };
}

/**
 * Teardown function (runs once after all VUs)
 */
export function teardown(data) {
  console.log('✅ Load test completed');
}
