/**
 * Test Setup
 * Mocks and global setup for all tests
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.COSMOS_DB_ENDPOINT = process.env.TEST_COSMOS_DB_ENDPOINT || 'https://test.documents.azure.com:443/';
process.env.COSMOS_DB_KEY = process.env.TEST_COSMOS_DB_KEY || 'test-key';
process.env.COSMOS_DB_DATABASE_ID = process.env.TEST_COSMOS_DB_DATABASE_ID || 'test';
process.env.RABBITMQ_URL = process.env.TEST_RABBITMQ_URL || '';
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '3011';
process.env.HOST = '0.0.0.0';

// Mock fs for config loading
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn((path: string) => {
      if (path.includes('default.yaml')) return true;
      if (path.includes('test.yaml')) return true;
      return false;
    }),
    readFileSync: vi.fn((path: string) => {
      if (path.includes('schema.json')) {
        return JSON.stringify({
          type: 'object',
          required: ['module'],
          properties: {
            module: { type: 'object', properties: { name: { type: 'string' } } },
          },
        });
      }
      if (path.includes('default.yaml') || path.includes('test.yaml')) {
        return `
module:
  name: dashboard
  version: 1.0.0
server:
  port: 3011
  host: 0.0.0.0
cosmos_db:
  endpoint: ${process.env.COSMOS_DB_ENDPOINT}
  key: ${process.env.COSMOS_DB_KEY}
  database_id: ${process.env.COSMOS_DB_DATABASE_ID}
jwt:
  secret: ${process.env.JWT_SECRET}
rabbitmq:
  url: ${process.env.RABBITMQ_URL || ''}
  exchange: test_events
  queue: test_queue
  bindings: []
        `;
      }
      return '';
    }),
  };
});

// Mock yaml parser (config uses load())
const yamlConfig = () => ({
  module: { name: 'dashboard', version: '1.0.0' },
  server: { port: 3011, host: '0.0.0.0' },
  cosmos_db: {
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY,
    database_id: process.env.COSMOS_DB_DATABASE_ID,
  },
  jwt: { secret: process.env.JWT_SECRET },
  rabbitmq: { url: process.env.RABBITMQ_URL || '', exchange: 'test_events', queue: 'test_queue', bindings: [] },
  services: {},
  redis: { host: 'localhost', port: 6379 },
});
vi.mock('yaml', () => ({
  parse: vi.fn(yamlConfig),
  load: vi.fn(yamlConfig),
}));

// Mock @coder/shared database
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    items: {
      create: vi.fn(),
      query: vi.fn(() => ({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }),
      })),
    },
    item: vi.fn(() => ({
      read: vi.fn().mockResolvedValue({ resource: null }),
      replace: vi.fn(),
      delete: vi.fn(),
    })),
  })),
  initializeDatabase: vi.fn(),
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

// Mock @coder/shared events
vi.mock('@coder/shared/events', () => ({
  EventPublisher: vi.fn(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  })),
  EventConsumer: vi.fn(() => ({
    on: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
  })),
}));

// Mock @coder/shared (getDatabaseClient, NotFoundError, ServiceClient)
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(function getDatabaseClient() {
    return {
      dashboard_dashboards: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
  }),
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string, id: string) {
      super(`${resource} not found: ${id}`);
      this.name = 'NotFoundError';
    }
  },
  ServiceClient: class MockServiceClient {
    get = vi.fn().mockResolvedValue({ data: {} });
    post = vi.fn().mockResolvedValue({ data: {} });
    put = vi.fn().mockResolvedValue({ data: {} });
    delete = vi.fn().mockResolvedValue({ data: {} });
  },
  authenticateRequest: vi.fn(() => vi.fn()),
  tenantEnforcementMiddleware: vi.fn(() => vi.fn()),
  setupJWT: vi.fn(),
  setupHealthCheck: vi.fn(),
}));

// Global test setup
beforeAll(async () => {
  // Setup can go here if needed
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  // Cleanup can go here if needed
});
