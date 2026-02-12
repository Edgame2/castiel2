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
process.env.PORT = '3010';
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
  name: context-service
  version: 1.0.0
server:
  port: 3010
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

// Mock yaml parser
vi.mock('yaml', () => ({
  parse: vi.fn((content: string) => {
    const config: any = {
      module: { name: 'context-service', version: '1.0.0' },
      server: { port: 3010, host: '0.0.0.0' },
      cosmos_db: {
        endpoint: process.env.COSMOS_DB_ENDPOINT,
        key: process.env.COSMOS_DB_KEY,
        database_id: process.env.COSMOS_DB_DATABASE_ID,
        containers: {
          contexts: 'context_contexts',
          assemblies: 'context_assemblies',
          dependency_trees: 'context_dependency_trees',
          call_graphs: 'context_call_graphs',
          analyses: 'context_analyses',
        },
      },
      jwt: { secret: process.env.JWT_SECRET },
      rabbitmq: { url: process.env.RABBITMQ_URL || '', exchange: 'test_events', queue: 'test_queue', bindings: [] },
      services: {},
    };
    return config;
  }),
}));

// Mock @coder/shared database
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn((name: string) => {
    const stubContext = { id: 'ctx-1', tenantId: 'tenant-123', path: '/test/file.ts', name: 'test', type: 'file', scope: 'file' };
    const isContexts = name === 'context_contexts' || name.includes('context');
    return {
      items: {
        create: vi.fn().mockImplementation((doc: any) =>
          Promise.resolve({ resource: { ...doc, id: doc.id || 'created-id' } })
        ),
        query: vi.fn(() => ({
          fetchAll: vi.fn().mockResolvedValue({
            resources: isContexts ? [stubContext] : [],
          }),
          fetchNext: vi.fn().mockResolvedValue({
            resources: isContexts ? [stubContext] : [],
            continuationToken: undefined,
          }),
        })),
      },
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
        replace: vi.fn().mockImplementation((doc: any) => Promise.resolve({ resource: doc })),
        delete: vi.fn().mockResolvedValue(undefined),
      })),
    };
  }),
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
  ServiceClient: vi.fn().mockImplementation(function (this: any) {
    this.get = vi.fn().mockResolvedValue({ data: {} });
    this.post = vi.fn().mockResolvedValue({ data: {} });
    this.put = vi.fn().mockResolvedValue({ data: {} });
    this.delete = vi.fn().mockResolvedValue({ data: {} });
  }),
  generateServiceToken: vi.fn(() => 'token'),
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
