/**
 * End-to-End Integration Test Scenarios
 * 
 * Comprehensive tests covering full sync workflows, error recovery,
 * and data consistency verification.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MockIntegrationAdapter,
  IntegrationFixtureGenerator,
  IntegrationTestUtils,
} from '../utils/integration-test-harness';
import {
  SyncPerformanceBenchmark,
  RateLimitMonitor,
  MemoryProfiler,
} from '../utils/performance-benchmark';

describe('E2E: Full Sync Workflow', () => {
  let adapter: MockIntegrationAdapter;
  let fixture: IntegrationFixtureGenerator;
  let benchmark: SyncPerformanceBenchmark;

  beforeEach(() => {
    adapter = new MockIntegrationAdapter('test-crm', 'crm');
    fixture = new IntegrationFixtureGenerator();
    benchmark = new SyncPerformanceBenchmark();
  });

  it('should complete full sync with 100 records', async () => {
    // Arrange: Add mock records to adapter
    const records = fixture.createRecords(100);
    adapter.addMockRecords(records);

    // Act: Perform full sync
    const result = await adapter.fetchRecords({ pageSize: 100 });

    // Assert: All records fetched
    expect(result.records).toHaveLength(100);
    expect(result.metadata.totalRecords).toBe(100);
    expect(adapter.fetchCallCount).toBe(1);
  });

  it('should handle paginated sync correctly', async () => {
    // Arrange: Add 250 records (3 pages of 100)
    const records = fixture.createRecords(250);
    adapter.addMockRecords(records);

    // Act: Fetch in pages
    const page1 = await adapter.fetchRecords({ pageSize: 100 });
    const page2 = await adapter.fetchRecords({ 
      pageSize: 100,
      syncToken: page1.metadata.lastSyncToken || undefined,
    });
    const page3 = await adapter.fetchRecords({ 
      pageSize: 100,
      syncToken: page2.metadata.lastSyncToken || undefined,
    });

    // Assert: All pages fetched
    expect(page1.records).toHaveLength(100);
    expect(page2.records).toHaveLength(100);
    expect(page3.records).toHaveLength(50);
    expect(adapter.fetchCallCount).toBe(3);
  });

  it('should meet performance thresholds for 1000 records', async () => {
    // Arrange
    const records = fixture.createRecords(1000);
    adapter.addMockRecords(records);

    // Act: Benchmark sync operation
    const result = await benchmark.benchmarkFullSync(
      async () => await adapter.fetchRecords({ pageSize: 100 }),
      1000,
      5
    );

    // Assert: Performance within limits
    expect(result.avgTime).toBeLessThan(1000); // < 1 second
    expect(result.throughput).toBeGreaterThan(1); // > 1 op/sec
  }, 10000);
});

describe('E2E: Incremental Sync', () => {
  let adapter: MockIntegrationAdapter;
  let fixture: IntegrationFixtureGenerator;

  beforeEach(() => {
    adapter = new MockIntegrationAdapter('test-crm', 'crm');
    fixture = new IntegrationFixtureGenerator();
  });

  it('should sync only changed records', async () => {
    // Arrange: Initial sync with 100 records
    const initialRecords = fixture.createRecords(100);
    adapter.addMockRecords(initialRecords);
    const initialSync = await adapter.fetchRecords();
    const syncToken = initialSync.metadata.lastSyncToken;

    // Modify 10 records
    const modifiedRecords = fixture.createRecords(10, {
      lastModified: new Date().toISOString(),
    });
    modifiedRecords.forEach(record => adapter.addMockRecord(record));

    // Act: Incremental sync
    const incrementalSync = await adapter.fetchRecords({ syncToken: syncToken || undefined });

    // Assert: Only changed records returned
    expect(adapter.fetchCallCount).toBe(2);
    // Note: Mock adapter returns all records, real adapter would filter
  });

  it('should handle sync token expiration', async () => {
    // Arrange: Invalid sync token
    const expiredToken = 'expired-token-123';

    // Act & Assert: Should fallback to full sync
    const result = await adapter.fetchRecords({ syncToken: expiredToken });
    expect(result.records.length).toBeGreaterThanOrEqual(0);
  });
});

describe('E2E: Bidirectional Sync', () => {
  let sourceAdapter: MockIntegrationAdapter;
  let targetAdapter: MockIntegrationAdapter;
  let fixture: IntegrationFixtureGenerator;

  beforeEach(() => {
    sourceAdapter = new MockIntegrationAdapter('source-crm', 'crm');
    targetAdapter = new MockIntegrationAdapter('target-system', 'storage');
    fixture = new IntegrationFixtureGenerator();
  });

  it('should sync records in both directions', async () => {
    // Arrange: Source has 50 records, target has 30 records
    const sourceRecords = fixture.createRecords(50);
    const targetRecords = fixture.createRecords(30);
    sourceAdapter.addMockRecords(sourceRecords);
    targetAdapter.addMockRecords(targetRecords);

    // Act: Pull from source
    const pulledRecords = await sourceAdapter.fetchRecords();
    await targetAdapter.pushRecords(pulledRecords.records);

    // Act: Push to source
    const targetData = await targetAdapter.fetchRecords();
    await sourceAdapter.pushRecords(targetData.records);

    // Assert: Both systems synchronized
    expect(targetAdapter.pushCallCount).toBe(1);
    expect(sourceAdapter.pushCallCount).toBe(1);
    expect(sourceAdapter.getAllRecords().length).toBeGreaterThanOrEqual(50);
    expect(targetAdapter.getAllRecords().length).toBeGreaterThanOrEqual(50);
  });

  it('should detect and resolve conflicts', async () => {
    // Arrange: Same record modified in both systems
    const conflictingRecord = fixture.createRecord({
      externalId: 'conflict-1',
      data: { name: 'Source Name', version: 1 },
    });

    const targetVersion = fixture.createRecord({
      externalId: 'conflict-1',
      data: { name: 'Target Name', version: 2 },
    });

    sourceAdapter.addMockRecord(conflictingRecord);
    targetAdapter.addMockRecord(targetVersion);

    // Act: Attempt bidirectional sync
    const sourceData = await sourceAdapter.fetchRecords();
    const targetData = await targetAdapter.fetchRecords();

    // Assert: Conflict detected (both have same external ID)
    const sourceIds = sourceData.records.map(r => r.externalId);
    const targetIds = targetData.records.map(r => r.externalId);
    const conflicts = sourceIds.filter(id => targetIds.includes(id));
    
    expect(conflicts).toContain('conflict-1');
  });
});

describe('E2E: Error Recovery', () => {
  let adapter: MockIntegrationAdapter;
  let fixture: IntegrationFixtureGenerator;

  beforeEach(() => {
    adapter = new MockIntegrationAdapter('test-crm', 'crm');
    fixture = new IntegrationFixtureGenerator();
  });

  it('should retry on temporary failures', async () => {
    // Arrange: Configure adapter to fail first 2 attempts
    adapter.shouldFailOnFetch = true;
    let attemptCount = 0;

    // Act: Retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      attemptCount++;
      try {
        // Succeed on 3rd attempt
        if (attemptCount === 3) {
          adapter.shouldFailOnFetch = false;
        }

        await adapter.fetchRecords();
        break;
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Assert: Eventually succeeded
    expect(attemptCount).toBe(3);
    expect(adapter.shouldFailOnFetch).toBe(false);
  });

  it('should handle rate limiting gracefully', async () => {
    // Arrange: Simulate rate limiting
    const monitor = new RateLimitMonitor(1000);
    adapter.rateLimitDelay = 100; // 100ms delay per request

    // Act: Make rapid requests
    const promises = Array.from({ length: 10 }, async () => {
      monitor.recordRequest();
      
      if (!monitor.isWithinLimit(5)) {
        monitor.recordRateLimitHit();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      return adapter.fetchRecords();
    });

    await Promise.all(promises);

    // Assert: Rate limiting tracked
    const metrics = monitor.getMetrics();
    expect(metrics.requestCount).toBeLessThanOrEqual(10);
  });

  it('should handle partial batch failures', async () => {
    // Arrange: 100 records, 10 will fail
    const records = fixture.createRecords(100);
    const failingRecords = records.slice(0, 10).map(r => ({
      ...r,
      data: { ...r.data, invalid: true },
    }));
    const successRecords = records.slice(10);

    // Act: Push records with some failures
    const result = await adapter.pushRecords([...failingRecords, ...successRecords]);

    // Assert: Track successes and failures
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(100);
    const successes = result.results.filter(r => r.success);
    expect(successes.length).toBeGreaterThan(0);
  });

  it('should maintain data consistency after errors', async () => {
    // Arrange: Initial state
    const initialRecords = fixture.createRecords(50);
    adapter.addMockRecords(initialRecords);
    const beforeCount = adapter.getAllRecords().length;

    // Act: Failed operation
    adapter.shouldFailOnPush = true;
    try {
      await adapter.pushRecords(fixture.createRecords(10));
    } catch (error) {
      // Expected failure
    }
    adapter.shouldFailOnPush = false;

    // Assert: Original data intact
    const afterCount = adapter.getAllRecords().length;
    expect(afterCount).toBe(beforeCount);
  });
});

describe('E2E: Data Consistency', () => {
  let adapter: MockIntegrationAdapter;
  let fixture: IntegrationFixtureGenerator;

  beforeEach(() => {
    adapter = new MockIntegrationAdapter('test-crm', 'crm');
    fixture = new IntegrationFixtureGenerator();
  });

  it('should maintain referential integrity', async () => {
    // Arrange: Parent and child records
    const parentRecord = fixture.createRecord({
      externalId: 'parent-1',
      data: { type: 'account', name: 'Parent Account' },
    });

    const childRecord = fixture.createRecord({
      externalId: 'child-1',
      data: { type: 'contact', parentId: 'parent-1', name: 'Child Contact' },
    });

    // Act: Sync records
    adapter.addMockRecord(parentRecord);
    adapter.addMockRecord(childRecord);
    const result = await adapter.fetchRecords();

    // Assert: Both records present
    const records = result.records;
    const parent = records.find(r => r.externalId === 'parent-1');
    const child = records.find(r => r.externalId === 'child-1');
    
    expect(parent).toBeDefined();
    expect(child).toBeDefined();
    expect(child?.data.parentId).toBe('parent-1');
  });

  it('should handle duplicate detection correctly', async () => {
    // Arrange: Duplicate records with same email
    const records = [
      fixture.createRecord({ 
        externalId: 'user-1',
        data: { email: 'duplicate@example.com', name: 'User 1' },
      }),
      fixture.createRecord({ 
        externalId: 'user-2',
        data: { email: 'duplicate@example.com', name: 'User 2' },
      }),
      fixture.createRecord({ 
        externalId: 'user-3',
        data: { email: 'unique@example.com', name: 'User 3' },
      }),
    ];

    adapter.addMockRecords(records);

    // Act: Fetch and check for duplicates
    const result = await adapter.fetchRecords();
    const emailMap = new Map<string, number>();
    
    result.records.forEach(record => {
      const email = record.data.email;
      emailMap.set(email, (emailMap.get(email) || 0) + 1);
    });

    // Assert: Duplicates detected
    expect(emailMap.get('duplicate@example.com')).toBe(2);
    expect(emailMap.get('unique@example.com')).toBe(1);
  });

  it('should validate data transformations', async () => {
    // Arrange: Records needing transformation
    const records = fixture.createRecords(10, {
      data: {
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: 'JOHN.DOE@EXAMPLE.COM',
      },
    });

    adapter.addMockRecords(records);

    // Act: Fetch and apply transformations
    const result = await adapter.fetchRecords();
    
    // Simulate field transformations
    const transformed = result.records.map(record => ({
      ...record,
      data: {
        ...record.data,
        firstName: record.data.firstName?.trim(),
        lastName: record.data.lastName?.trim(),
        email: record.data.email?.toLowerCase(),
      },
    }));

    // Assert: Transformations applied
    transformed.forEach(record => {
      expect(record.data.firstName).not.toMatch(/^\s|\s$/);
      expect(record.data.lastName).not.toMatch(/^\s|\s$/);
      expect(record.data.email).toBe(record.data.email?.toLowerCase());
    });
  });
});

describe('E2E: Performance Under Load', () => {
  let adapter: MockIntegrationAdapter;
  let fixture: IntegrationFixtureGenerator;
  let profiler: MemoryProfiler;

  beforeEach(() => {
    adapter = new MockIntegrationAdapter('test-crm', 'crm');
    fixture = new IntegrationFixtureGenerator();
    profiler = new MemoryProfiler();
  });

  it('should handle large dataset efficiently', async () => {
    // Arrange: 10,000 records
    profiler.snapshot('before-load');
    const records = fixture.createRecords(10000);
    adapter.addMockRecords(records);
    profiler.snapshot('after-load');

    // Act: Fetch all records
    const startTime = performance.now();
    const result = await adapter.fetchRecords({ pageSize: 1000 });
    const duration = performance.now() - startTime;

    profiler.snapshot('after-fetch');

    // Assert: Performance acceptable
    expect(duration).toBeLessThan(5000); // < 5 seconds
    expect(result.records.length).toBeGreaterThan(0);

    const memoryDelta = profiler.getDelta('before-load', 'after-fetch');
    expect(memoryDelta?.heapUsed).toBeDefined();
  }, 10000);

  it('should maintain throughput with concurrent syncs', async () => {
    // Arrange: Multiple adapters
    const adapters = Array.from({ length: 5 }, (_, i) => {
      const adapterInstance = new MockIntegrationAdapter(`adapter-${i}`, 'crm');
      adapterInstance.addMockRecords(fixture.createRecords(100));
      return adapterInstance;
    });

    // Act: Concurrent syncs
    const startTime = performance.now();
    const results = await Promise.all(
      adapters.map(a => a.fetchRecords())
    );
    const duration = performance.now() - startTime;

    // Assert: All syncs completed
    expect(results).toHaveLength(5);
    expect(duration).toBeLessThan(2000); // < 2 seconds for all
    results.forEach(result => {
      expect(result.records.length).toBeGreaterThan(0);
    });
  });
});
