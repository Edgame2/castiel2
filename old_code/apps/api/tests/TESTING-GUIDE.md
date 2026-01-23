# Integration Testing Framework - Complete Guide

## Overview

The Integration Testing Framework provides comprehensive tools for testing the integration system without external API dependencies. It includes mock adapters, webhook replay capabilities, performance benchmarking, and end-to-end test scenarios.

## Components

### 1. Test Harness (`integration-test-harness.ts`)

#### MockIntegrationAdapter

A fully functional mock adapter for testing integration logic.

```typescript
import { MockIntegrationAdapter } from './utils/integration-test-harness';

// Create mock adapter
const adapter = new MockIntegrationAdapter('test-crm', 'crm');

// Add mock data
adapter.addMockRecords([
  {
    externalId: 'ext-1',
    data: { name: 'John Doe', email: 'john@example.com' },
    lastModified: new Date().toISOString(),
  },
]);

// Fetch records
const result = await adapter.fetchRecords();
console.log(`Fetched ${result.records.length} records`);

// Configure behavior
adapter.shouldFailOnFetch = true; // Simulate errors
adapter.rateLimitDelay = 500; // Simulate rate limiting
```

#### IntegrationFixtureGenerator

Generate test data quickly and consistently.

```typescript
import { IntegrationFixtureGenerator } from './utils/integration-test-harness';

const fixture = new IntegrationFixtureGenerator();

// Generate single record
const record = fixture.createRecord({
  data: { name: 'Custom Name' },
});

// Generate multiple records
const records = fixture.createRecords(100);

// Generate sync task
const task = fixture.createSyncTask({
  name: 'My Sync Task',
  direction: 'pull',
});

// Generate conversion schema
const schema = fixture.createConversionSchema({
  name: 'Contact Schema',
  fieldMappings: [
    { source: 'firstName', target: 'first_name' },
    { source: 'email', target: 'email_address' },
  ],
});
```

#### IntegrationTestUtils

Helper utilities for common testing scenarios.

```typescript
import { IntegrationTestUtils } from './utils/integration-test-harness';

// Wait for async conditions
await IntegrationTestUtils.waitFor(
  () => syncCompleted,
  { timeout: 5000, interval: 100 }
);

// Mock API responses
const response = await IntegrationTestUtils.mockApiResponse(
  { data: 'test' },
  500 // 500ms delay
);

// Verify sync results
IntegrationTestUtils.verifySyncResult(result, {
  recordsProcessed: 100,
  recordsCreated: 80,
  recordsUpdated: 20,
});

// Create mock monitoring
const monitoring = IntegrationTestUtils.createMockMonitoring();
monitoring.trackEvent('test-event');
expect(monitoring.trackEvent).toHaveBeenCalled();
```

### 2. Webhook Replay System (`webhook-replay.ts`)

#### Recording Webhooks

Capture real webhook interactions for later replay.

```typescript
import { WebhookRecorder } from './utils/webhook-replay';

const recorder = new WebhookRecorder('salesforce-webhooks');

// Start recording
recorder.startRecording();

// Make API calls (these will be recorded)
// ...your integration code...

// Stop and save
const cassette = recorder.stopRecording();
console.log(`Recorded ${cassette.recordings.length} interactions`);
```

#### Replaying Webhooks

Replay recorded interactions without hitting real APIs.

```typescript
import { WebhookPlayer } from './utils/webhook-replay';

const player = new WebhookPlayer();

// Load cassette
player.loadCassette('salesforce-webhooks');

// Find recording for request
const recording = player.playRecording(
  'https://api.salesforce.com/contacts',
  'GET'
);

// Use recording response
console.log('Status:', recording.responseStatus);
console.log('Body:', recording.responseBody);

// Simulate network delay
await player.simulateDelay(recording);
```

#### MockWebhookClient

HTTP client that automatically records/replays.

```typescript
import { MockWebhookClient, WebhookRecorder, WebhookPlayer } from './utils/webhook-replay';

const client = new MockWebhookClient();

// For recording
const recorder = new WebhookRecorder('my-cassette');
recorder.startRecording();
client.useRecorder(recorder);

const response = await client.request('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
});

recorder.stopRecording();

// For replay
const player = new WebhookPlayer();
player.loadCassette('my-cassette');
client.usePlayer(player);

const replayedResponse = await client.request('https://api.example.com/data', {
  method: 'GET',
});
```

### 3. Performance Benchmarking (`performance-benchmark.ts`)

#### PerformanceBenchmark

Measure execution time and throughput.

```typescript
import { PerformanceBenchmark } from './utils/performance-benchmark';

const benchmark = new PerformanceBenchmark();

// Start benchmark
benchmark.start('Data Processing', 'performance');

// Run iterations
for (let i = 0; i < 100; i++) {
  // Your code here
  await processData();
  benchmark.recordIteration();
  benchmark.recordMemory();
}

// Complete and get results
const result = benchmark.complete();
console.log(`Average time: ${result.avgTime.toFixed(2)}ms`);
console.log(`P95: ${result.p95Time.toFixed(2)}ms`);
console.log(`Throughput: ${result.throughput.toFixed(2)} ops/sec`);

// Generate report
console.log(benchmark.generateReport());
```

#### SyncPerformanceBenchmark

Specialized benchmarks for sync operations.

```typescript
import { SyncPerformanceBenchmark } from './utils/performance-benchmark';

const benchmark = new SyncPerformanceBenchmark();

// Benchmark full sync
const result = await benchmark.benchmarkFullSync(
  async () => await performFullSync(),
  1000, // 1000 records
  5     // 5 iterations
);

console.log(`Sync performance: ${result.avgTime.toFixed(2)}ms`);
console.log(`Records/sec: ${result.metadata.recordsPerSecond}`);

// Benchmark incremental sync
const incrementalResult = await benchmark.benchmarkIncrementalSync(
  async () => await performIncrementalSync(),
  50, // 50 changed records
  10  // 10 iterations
);

// Generate report
console.log(benchmark.generateReport());
```

#### RateLimitMonitor

Track and enforce API rate limits.

```typescript
import { RateLimitMonitor } from './utils/performance-benchmark';

const monitor = new RateLimitMonitor(60000); // 1-minute window

// Record requests
monitor.recordRequest();

// Check if within limit
if (!monitor.isWithinLimit(100)) {
  console.log('Rate limit reached!');
  monitor.recordRateLimitHit();
  await sleep(1000);
}

// Get metrics
const metrics = monitor.getMetrics();
console.log(`Requests: ${metrics.requestCount}`);
console.log(`Rate: ${metrics.averageRequestRate.toFixed(2)}/sec`);
console.log(`Rate limit hits: ${metrics.rateLimitHits}`);
```

#### MemoryProfiler

Track memory usage during operations.

```typescript
import { MemoryProfiler } from './utils/performance-benchmark';

const profiler = new MemoryProfiler();

// Take snapshots
profiler.snapshot('start');
await loadData();
profiler.snapshot('after-load');
await processData();
profiler.snapshot('after-process');

// Get memory delta
const delta = profiler.getDelta('start', 'after-process');
console.log(`Memory increased by ${delta.heapUsed / 1024 / 1024} MB`);

// Get peak usage
const peak = profiler.getPeakUsage();
console.log(`Peak memory: ${peak.heapUsed / 1024 / 1024} MB`);

// Generate report
console.log(profiler.generateReport());
```

## Example Test Scenarios

### Testing Full Sync Workflow

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MockIntegrationAdapter, IntegrationFixtureGenerator } from '../utils/integration-test-harness';

describe('Full Sync Workflow', () => {
  let adapter: MockIntegrationAdapter;
  let fixture: IntegrationFixtureGenerator;

  beforeEach(() => {
    adapter = new MockIntegrationAdapter('test-crm', 'crm');
    fixture = new IntegrationFixtureGenerator();
  });

  it('should sync 100 records successfully', async () => {
    // Arrange
    const records = fixture.createRecords(100);
    adapter.addMockRecords(records);

    // Act
    const result = await adapter.fetchRecords();

    // Assert
    expect(result.records).toHaveLength(100);
    expect(result.metadata.totalRecords).toBe(100);
    expect(adapter.fetchCallCount).toBe(1);
  });

  it('should handle pagination correctly', async () => {
    // Arrange
    adapter.addMockRecords(fixture.createRecords(250));

    // Act - Fetch in 3 pages
    const pages = [];
    let syncToken = undefined;
    
    for (let i = 0; i < 3; i++) {
      const result = await adapter.fetchRecords({ 
        pageSize: 100,
        syncToken 
      });
      pages.push(result);
      syncToken = result.metadata.lastSyncToken || undefined;
    }

    // Assert
    expect(pages[0].records).toHaveLength(100);
    expect(pages[1].records).toHaveLength(100);
    expect(pages[2].records).toHaveLength(50);
  });
});
```

### Testing Error Recovery

```typescript
describe('Error Recovery', () => {
  it('should retry on temporary failures', async () => {
    const adapter = new MockIntegrationAdapter('test-crm', 'crm');
    adapter.shouldFailOnFetch = true;
    
    let attempts = 0;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      attempts++;
      try {
        if (attempts === 3) adapter.shouldFailOnFetch = false;
        await adapter.fetchRecords();
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    expect(attempts).toBe(3);
    expect(adapter.shouldFailOnFetch).toBe(false);
  });

  it('should handle rate limiting', async () => {
    const adapter = new MockIntegrationAdapter('test-crm', 'crm');
    const monitor = new RateLimitMonitor(1000);
    
    adapter.rateLimitDelay = 100;

    // Make 10 rapid requests
    const promises = Array.from({ length: 10 }, async () => {
      monitor.recordRequest();
      
      if (!monitor.isWithinLimit(5)) {
        monitor.recordRateLimitHit();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      return adapter.fetchRecords();
    });

    await Promise.all(promises);

    const metrics = monitor.getMetrics();
    expect(metrics.requestCount).toBeLessThanOrEqual(10);
  });
});
```

### Testing with Webhook Replay

```typescript
describe('Webhook Integration', () => {
  it('should replay recorded webhooks', async () => {
    const player = new WebhookPlayer();
    player.loadCassette('salesforce-contacts');
    
    const recording = player.playRecording(
      'https://api.salesforce.com/services/data/v52.0/query',
      'GET'
    );

    expect(recording.responseStatus).toBe(200);
    expect(recording.responseBody).toBeDefined();
    expect(recording.responseBody.records).toBeInstanceOf(Array);
  });
});
```

### Performance Testing

```typescript
describe('Performance', () => {
  it('should meet throughput requirements', async () => {
    const benchmark = new SyncPerformanceBenchmark();
    const adapter = new MockIntegrationAdapter('test-crm', 'crm');
    
    adapter.addMockRecords(fixture.createRecords(1000));

    const result = await benchmark.benchmarkFullSync(
      async () => await adapter.fetchRecords({ pageSize: 100 }),
      1000,
      5
    );

    expect(result.avgTime).toBeLessThan(1000); // < 1 second
    expect(result.throughput).toBeGreaterThan(1); // > 1 op/sec
  }, 10000);
});
```

## Running Tests

### Run All Integration Tests

```bash
# Run all tests
pnpm test

# Run integration tests only
pnpm test tests/integration

# Run specific test file
pnpm test tests/integration/e2e-sync-workflows.test.ts

# Run with coverage
pnpm test --coverage

# Run in watch mode
pnpm test --watch
```

### Run Performance Benchmarks

```bash
# Run all benchmarks
pnpm test tests/integration/e2e-sync-workflows.test.ts --reporter=verbose

# Run specific benchmark
pnpm test -t "Performance Under Load"
```

## Best Practices

### 1. Use Fixtures for Test Data

```typescript
// ✅ Good - Consistent test data
const fixture = new IntegrationFixtureGenerator();
const records = fixture.createRecords(100);

// ❌ Bad - Manual test data creation
const records = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  // ... lots of manual fields
}));
```

### 2. Reset State Between Tests

```typescript
beforeEach(() => {
  adapter = new MockIntegrationAdapter('test-crm', 'crm');
  adapter.clearRecords();
  adapter.resetCounters();
  fixture.reset();
});
```

### 3. Use Webhoo Replay for External APIs

```typescript
// ✅ Good - Fast, reliable, no external dependencies
const player = new WebhookPlayer();
player.loadCassette('salesforce-api');
// ... test using replayed responses

// ❌ Bad - Slow, flaky, requires network
const response = await axios.get('https://api.salesforce.com/...');
```

### 4. Benchmark Critical Paths

```typescript
it('should process 10K records efficiently', async () => {
  const benchmark = new PerformanceBenchmark();
  benchmark.start('Large Sync', 'performance');
  
  for (let i = 0; i < 5; i++) {
    await processLargeDataset();
    benchmark.recordIteration();
    benchmark.recordMemory();
  }
  
  const result = benchmark.complete();
  expect(result.avgTime).toBeLessThan(5000);
}, 30000);
```

### 5. Test Error Scenarios

```typescript
it('should handle all error types', async () => {
  // Network errors
  adapter.shouldFailOnFetch = true;
  await expect(adapter.fetchRecords()).rejects.toThrow();
  
  // Rate limiting
  adapter.rateLimitDelay = 1000;
  // ... test rate limit handling
  
  // Invalid data
  adapter.addMockRecord({ externalId: 'bad', data: null });
  // ... test validation
});
```

## Troubleshooting

### Tests Timing Out

Increase timeout for performance tests:

```typescript
it('should handle large dataset', async () => {
  // ...
}, 30000); // 30 second timeout
```

### Memory Leaks

Use MemoryProfiler to detect leaks:

```typescript
const profiler = new MemoryProfiler();
profiler.snapshot('start');

// Run test multiple times
for (let i = 0; i < 10; i++) {
  await runOperation();
  profiler.snapshot(`iteration-${i}`);
}

const peak = profiler.getPeakUsage();
// Check if memory keeps growing
```

### Flaky Tests

Use `waitFor` for async conditions:

```typescript
await IntegrationTestUtils.waitFor(
  () => syncService.isComplete(),
  { timeout: 5000, interval: 100 }
);
```

## Directory Structure

```
tests/
├── integration/
│   ├── e2e-sync-workflows.test.ts     # End-to-end tests
│   ├── slack-teams-delivery.test.ts   # Notification tests
│   └── health.api.test.ts             # API health tests
├── unit/
│   ├── auth.controller.test.ts
│   ├── cache.service.test.ts
│   └── notification.service.test.ts
├── utils/
│   ├── integration-test-harness.ts    # Mock adapters & fixtures
│   ├── webhook-replay.ts              # Recording/replay system
│   └── performance-benchmark.ts       # Performance tools
└── fixtures/
    └── webhooks/                      # Recorded cassettes
        ├── salesforce-contacts.json
        ├── hubspot-companies.json
        └── teams-webhook.json
```

## Summary

The Integration Testing Framework provides:

- ✅ **Mock Adapters** for isolated testing
- ✅ **Fixture Generators** for consistent test data
- ✅ **Webhook Replay** for external API testing
- ✅ **Performance Benchmarks** for speed/memory analysis
- ✅ **E2E Test Scenarios** for comprehensive coverage
- ✅ **Rate Limit Monitoring** for API compliance
- ✅ **Memory Profiling** for leak detection

Use these tools to build reliable, fast, and maintainable integration tests.
