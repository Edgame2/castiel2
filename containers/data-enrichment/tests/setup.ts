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
process.env.PORT = '3046';
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
  name: data-enrichment
  version: 1.0.0
server:
  port: 3046
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
services:
  shard_manager:
    url: http://localhost:3002
  embeddings:
    url: http://localhost:3035
  ai_service:
    url: http://localhost:3006
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
      module: { name: 'data-enrichment', version: '1.0.0' },
      server: { port: 3046, host: '0.0.0.0' },
      cosmos_db: {
        endpoint: process.env.COSMOS_DB_ENDPOINT,
        key: process.env.COSMOS_DB_KEY,
        database_id: process.env.COSMOS_DB_DATABASE_ID,
        containers: {
          enrichment_jobs: 'enrichment_jobs',
          enrichment_results: 'enrichment_results',
          enrichment_configurations: 'enrichment_configurations',
          enrichment_history: 'enrichment_history',
          vectorization_jobs: 'vectorization_jobs',
          shard_relationships: 'shard_relationships',
          shard_acls: 'shard_acls',
        },
      },
      jwt: { secret: process.env.JWT_SECRET },
      rabbitmq: { url: process.env.RABBITMQ_URL || '', exchange: 'test_events', queue: 'test_queue', bindings: [] },
      services: {
        shard_manager: { url: 'http://localhost:3002' },
        embeddings: { url: 'http://localhost:3035' },
        ai_service: { url: 'http://localhost:3006' },
      },
    };
    return config;
  }),
}));

// Mock @coder/shared database
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn((name: string) => {
    const defaultItems = {
      create: vi.fn().mockImplementation((doc: any) =>
        Promise.resolve({ resource: { ...doc, id: doc.id || 'created-id' } })
      ),
      query: vi.fn(() => ({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
        fetchNext: vi.fn().mockResolvedValue({ resources: [], continuationToken: undefined }),
      })),
    };
    const defaultItem = vi.fn((id: string, partitionKey?: string) => ({
      read: vi.fn().mockResolvedValue({
        resource: name === 'enrichment_jobs' && id !== '00000000-0000-0000-0000-000000000000'
          ? { id, jobId: id, tenantId: partitionKey || 'tenant-123', status: 'pending', shardId: 'shard-1' }
          : null,
      }),
      replace: vi.fn().mockResolvedValue({ resource: {} }),
      delete: vi.fn().mockResolvedValue(undefined),
    }));
    const enrichmentConfigItems = {
      create: vi.fn().mockResolvedValue(undefined),
      query: vi.fn(() => ({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [{
            id: 'default',
            tenantId: 'tenant-123',
            name: 'Default',
            enabled: true,
            autoEnrich: false,
            processors: [
              { type: 'entity-extraction', enabled: true },
              { type: 'classification', enabled: true },
              { type: 'summarization', enabled: true },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        }),
      })),
    };
    return {
      items: name === 'enrichment_configurations' ? enrichmentConfigItems : defaultItems,
      item: defaultItem,
    };
  }),
  initializeDatabase: vi.fn(),
  connectDatabase: vi.fn(),
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

// Mock @coder/shared (server imports initializeDatabase, connectDatabase, setupJWT from here)
vi.mock('@coder/shared', () => ({
  ServiceClient: vi.fn().mockImplementation(function (this: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }) {
    this.get = vi.fn().mockResolvedValue({ data: { id: 'shard-1', content: 'test content for enrichment' } });
    this.post = vi.fn().mockResolvedValue({ data: {} });
    this.put = vi.fn().mockResolvedValue({ data: {} });
    this.delete = vi.fn().mockResolvedValue({ data: {} });
  }),
  authenticateRequest: vi.fn(() => async (request: any) => {
    request.user = request.user || { id: 'test-user-id', tenantId: request.headers?.['x-tenant-id'] || 'tenant-123' };
  }),
  tenantEnforcementMiddleware: vi.fn(() => async (request: any) => {
    request.user = request.user || { id: 'test-user-id', tenantId: request.headers?.['x-tenant-id'] || 'tenant-123' };
  }),
  setupJWT: vi.fn(),
  initializeDatabase: vi.fn(),
  connectDatabase: vi.fn(),
  generateServiceToken: vi.fn(() => 'mock-service-token'),
  PolicyResolver: vi.fn().mockImplementation(function PolicyResolver() {
    this.getActivationFlags = vi.fn().mockResolvedValue({});
    this.getShardTypeAnalysisPolicy = vi.fn().mockResolvedValue({});
  }),
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
