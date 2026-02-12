/**
 * Test Setup
 * Mocks and global setup for llm-service tests
 */

import { vi, afterEach } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.COSMOS_DB_ENDPOINT = process.env.TEST_COSMOS_DB_ENDPOINT || 'https://test.documents.azure.com:443/';
process.env.COSMOS_DB_KEY = process.env.TEST_COSMOS_DB_KEY || 'test-key';
process.env.COSMOS_DB_DATABASE_ID = process.env.TEST_COSMOS_DB_DATABASE_ID || 'test';
process.env.RABBITMQ_URL = process.env.TEST_RABBITMQ_URL || '';
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '3062';
process.env.HOST = '0.0.0.0';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn((path: string) => {
      if (path.includes('default.yaml')) return true;
      if (path.includes('schema.json')) return true;
      return false;
    }),
    readFileSync: vi.fn((path: string) => {
      if (path.includes('schema.json')) {
        return JSON.stringify({
          type: 'object',
          required: ['server', 'cosmos_db'],
          properties: {
            module: { type: 'object', properties: { name: { type: 'string' } } },
            server: { type: 'object', properties: { port: { type: 'number' } } },
            cosmos_db: { type: 'object', properties: { endpoint: { type: 'string' }, key: { type: 'string' }, database_id: { type: 'string' }, containers: { type: 'object' } } },
            jwt: { type: 'object', properties: { secret: { type: 'string' } } },
            rabbitmq: { type: 'object' },
          },
        });
      }
      if (path.includes('default.yaml')) {
        return `
module:
  name: llm-service
  version: 1.0.0
server:
  port: 3062
  host: 0.0.0.0
cosmos_db:
  endpoint: ${process.env.COSMOS_DB_ENDPOINT}
  key: ${process.env.COSMOS_DB_KEY}
  database_id: ${process.env.COSMOS_DB_DATABASE_ID}
  containers:
    llm_outputs: llm_outputs
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

vi.mock('yaml', () => ({
  parse: vi.fn((content: string) => {
    const config: Record<string, unknown> = {
      module: { name: 'llm-service', version: '1.0.0' },
      server: { port: 3062, host: '0.0.0.0' },
      cosmos_db: {
        endpoint: process.env.COSMOS_DB_ENDPOINT,
        key: process.env.COSMOS_DB_KEY,
        database_id: process.env.COSMOS_DB_DATABASE_ID,
        containers: { llm_outputs: 'llm_outputs' },
      },
      jwt: { secret: process.env.JWT_SECRET },
      rabbitmq: { url: process.env.RABBITMQ_URL || '', exchange: 'test_events', queue: 'test_queue', bindings: [] },
      services: {},
    };
    return config;
  }),
}));

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    items: {
      upsert: vi.fn().mockResolvedValue({ resource: {} }),
    },
    read: vi.fn().mockResolvedValue(undefined),
  })),
  initializeDatabase: vi.fn(),
  connectDatabase: vi.fn(),
}));

vi.mock('@coder/shared/events', () => ({
  EventPublisher: vi.fn(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  })),
}));

vi.mock('@coder/shared', () => ({
  authenticateRequest: vi.fn(() => async (request: { user?: { id: string; tenantId: string }; headers?: Record<string, string> }) => {
    request.user = request.user || { id: 'user-1', tenantId: request.headers?.['x-tenant-id'] || 'tenant-123' };
  }),
  tenantEnforcementMiddleware: vi.fn(() => async (request: { user?: { id: string; tenantId: string }; headers?: Record<string, string> }) => {
    request.user = request.user || { id: 'user-1', tenantId: request.headers?.['x-tenant-id'] || 'tenant-123' };
  }),
  setupJWT: vi.fn(),
  initializeDatabase: vi.fn(),
  connectDatabase: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  vi.clearAllMocks();
});
