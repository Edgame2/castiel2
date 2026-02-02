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
process.env.PORT = '3000';
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
  name: api-gateway
  version: 1.0.0
server:
  port: 3000
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

// Mock yaml parser (config uses load(), not parse())
vi.mock('yaml', () => {
  const getConfig = () => ({
    module: { name: 'api-gateway', version: '1.0.0' },
    server: { port: 3000, host: '0.0.0.0' },
    cosmos_db: {
      endpoint: process.env.COSMOS_DB_ENDPOINT,
      key: process.env.COSMOS_DB_KEY,
      database_id: process.env.COSMOS_DB_DATABASE_ID,
    },
    jwt: { secret: process.env.JWT_SECRET },
    rabbitmq: { url: process.env.RABBITMQ_URL || '', exchange: 'test_events', queue: 'test_queue', bindings: [] },
    services: {
      auth: { url: 'http://localhost:3021' },
      user_management: { url: 'http://localhost:3022' },
      secret_management: { url: 'http://localhost:3003' },
      logging: { url: 'http://localhost:3014' },
      notification: { url: 'http://localhost:3001' },
      ai_service: { url: 'http://localhost:3006' },
      embeddings: { url: 'http://localhost:3005' },
      dashboard: { url: 'http://localhost:3011' },
    },
    rate_limit: { max: 100, timeWindow: 60000 },
  });
  return {
    parse: vi.fn((_content: string) => getConfig()),
    load: vi.fn((_content: string) => getConfig()),
  };
});

// Mock @coder/shared database
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    items: {
      create: vi.fn(),
      query: vi.fn(() => ({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
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

// Mock @coder/shared ServiceClient (must be a constructor for `new ServiceClient()`)
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function () {
    return {
      get: vi.fn().mockResolvedValue({ data: {}, statusCode: 200 }),
      post: vi.fn().mockResolvedValue({ data: {}, statusCode: 200 }),
      put: vi.fn().mockResolvedValue({ data: {}, statusCode: 200 }),
      delete: vi.fn().mockResolvedValue({ data: {}, statusCode: 200 }),
      patch: vi.fn().mockResolvedValue({ data: {}, statusCode: 200 }),
    };
  }),
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
