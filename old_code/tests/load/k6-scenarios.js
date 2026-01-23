/**
 * Load Testing Scenarios for Castiel API
 * Uses k6 for performance testing
 * 
 * Run with: k6 run tests/load/k6-scenarios.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% < 200ms, 99% < 500ms
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    errors: ['rate<0.01'],                          // Custom error rate < 1%
  },
};

// Base URL from environment or default
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';

// Test user credentials (should be set via environment variables)
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'test-password';

// Authentication token cache
let authToken = null;

/**
 * Authenticate and get access token
 */
function authenticate() {
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('accessToken') !== undefined,
  });

  if (success) {
    authToken = loginRes.json('accessToken');
    return authToken;
  }

  return null;
}

/**
 * Get CSRF token from GET request
 */
function getCsrfToken() {
  const res = http.get(`${BASE_URL}/api/v1/auth/me`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  return res.headers['X-CSRF-Token'] || null;
}

/**
 * Scenario 1: Health Check
 */
export function healthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  
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
  });

  const success = check(res, {
    'get shard types status is 200': (r) => r.status === 200,
    'get shard types response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(1);
}

/**
 * Scenario 3: Search Shards
 */
export function searchShards() {
  if (!authToken) {
    authToken = authenticate();
    if (!authToken) return;
  }

  const csrfToken = getCsrfToken();
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
  
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = http.post(`${BASE_URL}/api/v1/search/advanced`, JSON.stringify({
    tenantId: 'test-tenant',
    query: 'test',
    limit: 20,
    offset: 0,
  }), {
    headers,
  });

  const success = check(res, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(2);
}

/**
 * Scenario 4: Create Shard
 */
export function createShard() {
  if (!authToken) {
    authToken = authenticate();
    if (!authToken) return;
  }

  const csrfToken = getCsrfToken();
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
  
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = http.post(`${BASE_URL}/api/v1/shards`, JSON.stringify({
    tenantId: 'test-tenant',
    shardTypeId: 'test-type',
    data: {
      name: `Test Shard ${Date.now()}`,
      description: 'Load test shard',
    },
  }), {
    headers,
  });

  const success = check(res, {
    'create shard status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'create shard response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  apiResponseTime.add(res.timings.duration);
  
  sleep(2);
}

/**
 * Main test function
 */
export default function () {
  // Run scenarios with different weights
  const scenarios = [
    { weight: 10, fn: healthCheck },
    { weight: 30, fn: getShardTypes },
    { weight: 40, fn: searchShards },
    { weight: 20, fn: createShard },
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
  console.log('🚀 Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  
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
