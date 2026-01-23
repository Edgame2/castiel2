/**
 * Test Utilities for Main API
 * 
 * Provides helper functions for:
 * - Mock authentication
 * - Redis mocking
 * - Database setup/teardown
 * - Test data generation
 */

import { vi } from 'vitest';
import RedisMock from 'ioredis-mock';
import type { FastifyRequest } from 'fastify';

// Define AuthUser type locally for tests
interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
  organizationId: string | null;
}

/**
 * Mock Authentication Utilities
 */
export class MockAuth {
  /**
   * Create a mock authenticated user
   */
  static createMockUser(overrides?: Partial<AuthUser>): AuthUser {
    return {
      id: 'test-user-id',
      tenantId: 'test-tenant-id',
      email: 'test@example.com',
      roles: ['user'],
      organizationId: null,
      ...overrides,
    };
  }

  /**
   * Create a mock admin user
   */
  static createMockAdmin(overrides?: Partial<AuthUser>): AuthUser {
    return this.createMockUser({
      roles: ['admin', 'user'],
      ...overrides,
    });
  }

  /**
   * Mock a Fastify request with authenticated user
   */
  static mockAuthenticatedRequest(
    user?: Partial<AuthUser>
  ): Partial<FastifyRequest> {
    return {
      user: this.createMockUser(user) as any,
      headers: {
        authorization: 'Bearer mock-token',
      },
    } as Partial<FastifyRequest>;
  }

  /**
   * Mock authentication middleware
   */
  static mockAuthMiddleware(user?: Partial<AuthUser>) {
    return async (request: FastifyRequest) => {
      (request as any).user = this.createMockUser(user);
    };
  }
}

/**
 * Redis Mock Utilities
 */
export class MockRedis {
  private static instance: RedisMock | null = null;

  /**
   * Get a mock Redis client
   */
  static getClient(): RedisMock {
    if (!this.instance) {
      this.instance = new RedisMock();
    }
    return this.instance;
  }

  /**
   * Reset the Redis mock
   */
  static async reset(): Promise<void> {
    if (this.instance) {
      await this.instance.flushall();
    }
  }

  /**
   * Close the Redis mock
   */
  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
    }
  }

  /**
   * Seed Redis with test data
   */
  static async seed(data: Record<string, string>): Promise<void> {
    const client = this.getClient();
    for (const [key, value] of Object.entries(data)) {
      await client.set(key, value);
    }
  }

  /**
   * Mock Redis pub/sub
   */
  static mockPubSub() {
    const subscribers = new Map<string, Set<(...args: any[]) => void>>();

    return {
      publish: vi.fn(async (channel: string, message: string) => {
        const subs = subscribers.get(channel);
        if (subs) {
          subs.forEach((callback) => callback(channel, message));
        }
      }),
      subscribe: vi.fn(async (channel: string) => {
        if (!subscribers.has(channel)) {
          subscribers.set(channel, new Set());
        }
      }),
      on: vi.fn((event: string, callback: (...args: any[]) => void) => {
        if (event === 'message') {
          // Store callback for the 'message' event
          subscribers.forEach((subs) => subs.add(callback));
        }
      }),
      unsubscribe: vi.fn(),
      quit: vi.fn(),
    };
  }
}

/**
 * Database Mock Utilities
 */
export class MockDatabase {
  /**
   * Mock Cosmos DB container
   */
  static mockCosmosContainer() {
    const store = new Map<string, any>();

    return {
      items: {
        create: vi.fn(async (item: any) => {
          const id = item.id || `mock-${Date.now()}`;
          store.set(id, { ...item, id });
          return { resource: { ...item, id } };
        }),
        upsert: vi.fn(async (item: any) => {
          store.set(item.id, item);
          return { resource: item };
        }),
        query: vi.fn((_query: any) => ({
          fetchAll: vi.fn(async () => {
            const resources = Array.from(store.values());
            return { resources };
          }),
        })),
      },
      item: vi.fn((id: string, _partitionKey: string) => ({
        read: vi.fn(async () => {
          const resource = store.get(id);
          if (!resource) {
            const error: any = new Error('Not found');
            error.code = 404;
            throw error;
          }
          return { resource };
        }),
        delete: vi.fn(async () => {
          store.delete(id);
          return { resource: undefined };
        }),
      })),
      _store: store, // For testing purposes
    };
  }

  /**
   * Reset all database mocks
   */
  static reset(container: any): void {
    container._store?.clear();
    vi.clearAllMocks();
  }
}

/**
 * Monitoring Mock Utilities
 */
export class MockMonitoring {
  /**
   * Create a mock monitoring provider
   */
  static createMockProvider() {
    return {
      trackEvent: vi.fn(),
      trackMetric: vi.fn(),
      trackException: vi.fn(),
      trackTrace: vi.fn(),
      trackRequest: vi.fn(),
      trackDependency: vi.fn(),
      startOperation: vi.fn(() => ({
        end: vi.fn(),
      })),
      flush: vi.fn(),
      isHealthy: vi.fn(() => true),
      clearEvents: vi.fn(),
    };
  }
}

/**
 * Time utilities for testing
 */
export class MockTime {
  /**
   * Mock Date.now()
   */
  static mockNow(timestamp: number): void {
    vi.spyOn(Date, 'now').mockReturnValue(timestamp);
  }

  /**
   * Restore Date.now()
   */
  static restoreNow(): void {
    vi.restoreAllMocks();
  }

  /**
   * Create a fixed date
   */
  static fixedDate(date: string = '2024-01-01T00:00:00.000Z'): Date {
    return new Date(date);
  }
}

/**
 * Test cleanup utilities
 */
export class TestCleanup {
  private static cleanupFunctions: Array<() => Promise<void>> = [];

  /**
   * Register a cleanup function
   */
  static register(fn: () => Promise<void>): void {
    this.cleanupFunctions.push(fn);
  }

  /**
   * Run all cleanup functions
   */
  static async runAll(): Promise<void> {
    for (const fn of this.cleanupFunctions) {
      await fn();
    }
    this.cleanupFunctions = [];
  }
}

/**
 * Helper to wait for a condition
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 5000;
  const interval = options.interval || 100;
  const start = Date.now();

  while (!(await condition())) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Helper to create a delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
