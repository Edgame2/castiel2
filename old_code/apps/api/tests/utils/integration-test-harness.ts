/**
 * Integration Test Harness
 * 
 * Provides mock adapters, fixture generators, and utilities for testing
 * the integration system without external API dependencies.
 */

import { vi } from 'vitest';
import type {
  BaseIntegrationAdapter,
  IntegrationRecord,
  SyncResult,
  IntegrationMetadata,
} from '../types/integration.types';

/**
 * Mock Integration Adapter for Testing
 */
export class MockIntegrationAdapter implements BaseIntegrationAdapter {
  name: string;
  category: string;
  supportsFullSync = true;
  supportsIncrementalSync = true;
  supportsBidirectionalSync = true;

  private records: Map<string, IntegrationRecord> = new Map();
  private metadata: IntegrationMetadata = {
    lastSyncToken: null,
    totalRecords: 0,
    lastModifiedAt: new Date().toISOString(),
  };

  // Mock control flags
  public shouldFailOnFetch = false;
  public shouldFailOnPush = false;
  public rateLimitDelay = 0;
  public fetchCallCount = 0;
  public pushCallCount = 0;
  public deleteCallCount = 0;

  constructor(name: string, category: string = 'data_source') {
    this.name = name;
    this.category = category;
  }

  /**
   * Initialize adapter with mock data
   */
  async initialize(config: Record<string, any>): Promise<void> {
    // Simulate initialization delay
    await this.delay(10);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    await this.delay(50);
    return { success: true };
  }

  /**
   * Fetch records from mock storage
   */
  async fetchRecords(params?: {
    syncToken?: string;
    pageSize?: number;
    filters?: Record<string, any>;
  }): Promise<{
    records: IntegrationRecord[];
    metadata: IntegrationMetadata;
  }> {
    this.fetchCallCount++;

    if (this.shouldFailOnFetch) {
      throw new Error('Mock fetch failure');
    }

    await this.delay(this.rateLimitDelay);

    const allRecords = Array.from(this.records.values());
    const pageSize = params?.pageSize || 100;
    const records = allRecords.slice(0, pageSize);

    return {
      records,
      metadata: {
        ...this.metadata,
        totalRecords: allRecords.length,
        lastSyncToken: records.length > 0 ? `token-${Date.now()}` : null,
      },
    };
  }

  /**
   * Fetch single record by ID
   */
  async fetchRecord(externalId: string): Promise<IntegrationRecord | null> {
    await this.delay(20);
    return this.records.get(externalId) || null;
  }

  /**
   * Push records to mock storage
   */
  async pushRecords(
    records: IntegrationRecord[]
  ): Promise<{ success: boolean; results: Array<{ id: string; success: boolean; error?: string }> }> {
    this.pushCallCount++;

    if (this.shouldFailOnPush) {
      throw new Error('Mock push failure');
    }

    await this.delay(this.rateLimitDelay);

    const results = records.map(record => {
      this.records.set(record.externalId, {
        ...record,
        lastModified: new Date().toISOString(),
      });
      return { id: record.externalId, success: true };
    });

    return { success: true, results };
  }

  /**
   * Delete record from mock storage
   */
  async deleteRecord(externalId: string): Promise<{ success: boolean; error?: string }> {
    this.deleteCallCount++;
    await this.delay(20);

    if (this.records.has(externalId)) {
      this.records.delete(externalId);
      return { success: true };
    }

    return { success: false, error: 'Record not found' };
  }

  /**
   * Get sync metadata
   */
  async getMetadata(): Promise<IntegrationMetadata> {
    return this.metadata;
  }

  /**
   * Helper: Add mock record
   */
  addMockRecord(record: IntegrationRecord): void {
    this.records.set(record.externalId, record);
    this.metadata.totalRecords = this.records.size;
  }

  /**
   * Helper: Add multiple mock records
   */
  addMockRecords(records: IntegrationRecord[]): void {
    records.forEach(record => this.addMockRecord(record));
  }

  /**
   * Helper: Clear all records
   */
  clearRecords(): void {
    this.records.clear();
    this.metadata.totalRecords = 0;
  }

  /**
   * Helper: Get all records
   */
  getAllRecords(): IntegrationRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Helper: Reset counters
   */
  resetCounters(): void {
    this.fetchCallCount = 0;
    this.pushCallCount = 0;
    this.deleteCallCount = 0;
  }

  private async delay(ms: number): Promise<void> {
    if (ms > 0) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }
}

/**
 * Fixture Generator for Test Data
 */
export class IntegrationFixtureGenerator {
  private recordIdCounter = 1;
  private shardIdCounter = 1;

  /**
   * Generate mock integration record
   */
  createRecord(overrides?: Partial<IntegrationRecord>): IntegrationRecord {
    const id = this.recordIdCounter++;
    return {
      externalId: `ext-${id}`,
      data: {
        id: `ext-${id}`,
        name: `Test Record ${id}`,
        email: `test${id}@example.com`,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      lastModified: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Generate multiple records
   */
  createRecords(count: number, overrides?: Partial<IntegrationRecord>): IntegrationRecord[] {
    return Array.from({ length: count }, () => this.createRecord(overrides));
  }

  /**
   * Generate mock shard data
   */
  createShard(overrides?: any): any {
    const id = this.shardIdCounter++;
    return {
      id: `shard-${id}`,
      tenantId: 'tenant-123',
      shardTypeId: 'type-1',
      data: {
        title: `Test Shard ${id}`,
        description: `Description for shard ${id}`,
        status: 'active',
      },
      metadata: {
        source: 'integration-test',
        externalId: `ext-${id}`,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate sync task configuration
   */
  createSyncTask(overrides?: any): any {
    return {
      id: `task-${Date.now()}`,
      tenantId: 'tenant-123',
      tenantIntegrationId: 'integration-123',
      name: 'Test Sync Task',
      direction: 'pull',
      schedule: '0 * * * *',
      status: 'active',
      settings: {
        conversionSchemaId: 'schema-123',
        batchSize: 100,
        conflictResolution: 'prefer_external',
      },
      stats: {
        lastRunAt: null,
        nextRunAt: new Date(),
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate conversion schema
   */
  createConversionSchema(overrides?: any): any {
    return {
      id: `schema-${Date.now()}`,
      tenantId: 'tenant-123',
      tenantIntegrationId: 'integration-123',
      name: 'Test Schema',
      source: {
        resourceType: 'contacts',
      },
      target: {
        shardTypeId: 'type-1',
        createIfMissing: true,
        updateIfExists: true,
      },
      fieldMappings: [
        { source: 'firstName', target: 'first_name', transformation: 'trim' },
        { source: 'lastName', target: 'last_name', transformation: 'trim' },
        { source: 'email', target: 'email', transformation: 'lowercase' },
      ],
      deduplication: {
        externalIdField: 'id',
        rules: [],
        mergeStrategy: 'merge_fields',
      },
      bidirectionalSync: {
        enabled: false,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Reset counters
   */
  reset(): void {
    this.recordIdCounter = 1;
    this.shardIdCounter = 1;
  }
}

/**
 * Mock Adapter Registry for Testing
 */
export class MockAdapterRegistry {
  private adapters: Map<string, MockIntegrationAdapter> = new Map();

  /**
   * Register mock adapter
   */
  register(adapter: MockIntegrationAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get adapter by name
   */
  getAdapter(name: string): MockIntegrationAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Create and register new adapter
   */
  createAdapter(name: string, category: string = 'data_source'): MockIntegrationAdapter {
    const adapter = new MockIntegrationAdapter(name, category);
    this.register(adapter);
    return adapter;
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.clear();
  }

  /**
   * Get all adapters
   */
  getAllAdapters(): MockIntegrationAdapter[] {
    return Array.from(this.adapters.values());
  }
}

/**
 * Test Utilities
 */
export class IntegrationTestUtils {
  /**
   * Wait for async operations
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    const timeout = options.timeout || 5000;
    const interval = options.interval || 100;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Timeout waiting for condition');
  }

  /**
   * Mock external API response
   */
  static mockApiResponse(data: any, delay: number = 0): Promise<any> {
    return new Promise(resolve => {
      setTimeout(() => resolve(data), delay);
    });
  }

  /**
   * Mock API error
   */
  static mockApiError(message: string, code?: string, delay: number = 0): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error: any = new Error(message);
        if (code) error.code = code;
        reject(error);
      }, delay);
    });
  }

  /**
   * Generate test webhook payload
   */
  static createWebhookPayload(type: string, data: any): any {
    return {
      event: type,
      timestamp: new Date().toISOString(),
      data,
      signature: 'mock-signature',
    };
  }

  /**
   * Verify sync result
   */
  static verifySyncResult(result: SyncResult, expected: Partial<SyncResult>): void {
    if (expected.recordsProcessed !== undefined) {
      expect(result.recordsProcessed).toBe(expected.recordsProcessed);
    }
    if (expected.recordsCreated !== undefined) {
      expect(result.recordsCreated).toBe(expected.recordsCreated);
    }
    if (expected.recordsUpdated !== undefined) {
      expect(result.recordsUpdated).toBe(expected.recordsUpdated);
    }
    if (expected.recordsFailed !== undefined) {
      expect(result.recordsFailed).toBe(expected.recordsFailed);
    }
    if (expected.errors !== undefined) {
      expect(result.errors).toHaveLength(expected.errors.length);
    }
  }

  /**
   * Create mock monitoring provider
   */
  static createMockMonitoring() {
    return {
      trackEvent: vi.fn(),
      trackException: vi.fn(),
      trackMetric: vi.fn(),
      trackDependency: vi.fn(),
    };
  }

  /**
   * Create mock logger
   */
  static createMockLogger() {
    return {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  }
}

/**
 * Performance measurement utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  /**
   * Run performance benchmark
   */
  static async benchmark(
    name: string,
    fn: () => Promise<void>,
    iterations: number = 10
  ): Promise<{
    name: string;
    iterations: number;
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await this.measureTime(fn);
      times.push(duration);
    }

    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
    };
  }

  /**
   * Assert performance threshold
   */
  static assertPerformance(duration: number, threshold: number, message?: string): void {
    if (duration > threshold) {
      throw new Error(
        message || `Performance threshold exceeded: ${duration}ms > ${threshold}ms`
      );
    }
  }
}

/**
 * Export all test utilities
 */
export const testHarness = {
  MockIntegrationAdapter,
  IntegrationFixtureGenerator,
  MockAdapterRegistry,
  IntegrationTestUtils,
  PerformanceTestUtils,
};

export default testHarness;
