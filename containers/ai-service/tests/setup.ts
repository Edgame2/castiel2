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
process.env.RABBITMQ_URL = process.env.TEST_RABBITMQ_URL || 'amqp://localhost';
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY || 'test-key';
process.env.ANTHROPIC_API_KEY = process.env.TEST_ANTHROPIC_API_KEY || 'test-key';
process.env.PORT = '3006';
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
  name: ai-service
  version: 1.0.0
server:
  port: 3006
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
providers:
  openai:
    api_key: ${process.env.OPENAI_API_KEY}
  anthropic:
    api_key: ${process.env.ANTHROPIC_API_KEY}
        `;
      }
      return '';
    }),
  };
});

// Mock yaml parser
vi.mock('yaml', () => ({
  parse: vi.fn((content: string) => {
    const config: any = {
      module: { name: 'ai-service', version: '1.0.0' },
      server: { port: 3006, host: '0.0.0.0' },
      cosmos_db: {
        endpoint: process.env.COSMOS_DB_ENDPOINT,
        key: process.env.COSMOS_DB_KEY,
        database_id: process.env.COSMOS_DB_DATABASE_ID,
      },
      jwt: { secret: process.env.JWT_SECRET },
      rabbitmq: { url: process.env.RABBITMQ_URL || '', exchange: 'test_events', queue: 'test_queue', bindings: [] },
      providers: {
        openai: { api_key: process.env.OPENAI_API_KEY },
        anthropic: { api_key: process.env.ANTHROPIC_API_KEY },
      },
      services: {},
    };
    return config;
  }),
}));

// Mock @coder/shared database (Cosmos-style: query().fetchNext(), item(id, partitionKey).read())
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    items: {
      create: vi.fn(),
      query: vi.fn(() => ({
        fetchNext: vi.fn().mockResolvedValue({ resources: [] }),
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

// Mock @coder/shared
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  })),
  EventPublisher: vi.fn(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  })),
  authenticateRequest: vi.fn(() => async (req: any) => {
    req.user = req.user || { id: 'user-1', tenantId: req.headers?.['x-tenant-id'] || 'tenant-123' };
  }),
  tenantEnforcementMiddleware: vi.fn(() => async (req: any) => {
    req.user = req.user || { id: 'user-1', tenantId: req.headers?.['x-tenant-id'] || 'tenant-123' };
  }),
  setupJWT: vi.fn(),
  setupHealthCheck: vi.fn(),
  initializeDatabase: vi.fn(),
  connectDatabase: vi.fn().mockResolvedValue(undefined),
  disconnectDatabase: vi.fn(),
  closeConnection: vi.fn(),
  getDatabaseClient: vi.fn(() => ({
    ai_completions: {
      create: vi.fn().mockResolvedValue({ id: 'compl-1', modelId: 'gpt-4', status: 'completed' }),
    },
  })),
  HttpClient: vi.fn(() => ({ post: vi.fn().mockResolvedValue({ data: {} }) })),
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
