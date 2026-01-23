/**
 * k6 Load Test Configuration
 * 
 * Defines load test scenarios aligned with performance budgets
 * See: docs/performance/PERFORMANCE_BUDGETS.md
 */

/**
 * Normal Load Scenario
 * Simulates expected production traffic
 */
export const normalLoad = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 concurrent users
    { duration: '10m', target: 50 },  // Stay at 50 users (normal load)
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // API Response Time (aligned with performance budgets)
    'http_req_duration{name:Health Check}': ['p(95)<100', 'p(99)<200'],
    'http_req_duration{name:Get Shard Types}': ['p(95)<200', 'p(99)<300'],
    'http_req_duration{name:Get Shard}': ['p(95)<100', 'p(99)<200'],
    'http_req_duration{name:List Shards}': ['p(95)<300', 'p(99)<500'],
    'http_req_duration{name:Create Shard}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{name:Update Shard}': ['p(95)<400', 'p(99)<800'],
    'http_req_duration{name:Search Advanced}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{name:Search Vector}': ['p(95)<300', 'p(99)<600'],
    'http_req_duration{name:Get Shard Types}': ['p(95)<200', 'p(99)<400'],
    
    // Overall API performance
    'http_req_duration': ['p(50)<200', 'p(95)<500', 'p(99)<1000'],
    
    // Error rates
    'http_req_failed': ['rate<0.01'],  // < 1% error rate
    'errors': ['rate<0.01'],
    
    // Throughput
    'http_reqs': ['rate>10'],  // At least 10 requests/second
  },
};

/**
 * Peak Load Scenario
 * Simulates 2x expected production traffic
 */
export const peakLoad = {
  stages: [
    { duration: '3m', target: 100 },  // Ramp up to 100 concurrent users
    { duration: '10m', target: 100 },   // Stay at 100 users (peak load)
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // Slightly relaxed thresholds for peak load
    'http_req_duration': ['p(50)<300', 'p(95)<750', 'p(99)<1500'],
    'http_req_failed': ['rate<0.02'],  // < 2% error rate during peak
    'errors': ['rate<0.02'],
    'http_reqs': ['rate>20'],  // At least 20 requests/second
  },
};

/**
 * Stress Test Scenario
 * Simulates 5x expected production traffic
 */
export const stressTest = {
  stages: [
    { duration: '5m', target: 250 },  // Ramp up to 250 concurrent users
    { duration: '10m', target: 250 }, // Stay at 250 users (stress test)
    { duration: '3m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // More relaxed thresholds for stress test (identify breaking points)
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.05'],  // < 5% error rate during stress
    'errors': ['rate<0.05'],
  },
};

/**
 * Spike Test Scenario
 * Simulates sudden traffic spike
 */
export const spikeTest = {
  stages: [
    { duration: '1m', target: 10 },   // Normal load
    { duration: '30s', target: 200 }, // Sudden spike to 200 users
    { duration: '2m', target: 200 },  // Hold spike
    { duration: '1m', target: 10 },   // Return to normal
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.03'],
  },
};

/**
 * Soak Test Scenario
 * Long-running test to identify memory leaks and resource issues
 */
export const soakTest = {
  stages: [
    { duration: '5m', target: 50 },   // Ramp up
    { duration: '60m', target: 50 },   // Stay at 50 users for 1 hour
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
    // Monitor for memory leaks (response times should not degrade over time)
    'http_req_duration{name:Health Check}': ['p(95)<100'],
  },
};

/**
 * Get configuration based on test type
 */
export function getConfig(testType = 'normal') {
  const configs = {
    normal: normalLoad,
    peak: peakLoad,
    stress: stressTest,
    spike: spikeTest,
    soak: soakTest,
  };
  
  return configs[testType] || normalLoad;
}
