/**
 * Test setup for learning-service (Plan W6 Layer 7).
 * Mocks config, database, and auth for integration tests.
 */

import { vi, afterEach } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.COSMOS_DB_ENDPOINT = process.env.TEST_COSMOS_DB_ENDPOINT || 'https://test.documents.azure.com:443/';
process.env.COSMOS_DB_KEY = process.env.TEST_COSMOS_DB_KEY || 'test-key';
process.env.COSMOS_DB_DATABASE_ID = process.env.TEST_COSMOS_DB_DATABASE_ID || 'test';
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

vi.mock('../src/config', () => ({
  loadConfig: vi.fn(() => ({
    module: { name: 'learning-service', version: '1.0.0' },
    server: { port: 3063, host: '0.0.0.0' },
    cosmos_db: {
      endpoint: process.env.COSMOS_DB_ENDPOINT || 'https://test.documents.azure.com:443/',
      key: process.env.COSMOS_DB_KEY || 'test-key',
      database_id: process.env.COSMOS_DB_DATABASE_ID || 'test',
      containers: { user_feedback: 'learning_user_feedback', outcome: 'learning_outcome' },
    },
    jwt: { secret: process.env.JWT_SECRET || 'test-secret' },
    services: {},
    rabbitmq: { url: '', exchange: 'coder_events', queue: 'learning', bindings: [] },
  })),
}));

const mockUpsert = vi.fn().mockResolvedValue(undefined);

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    item: vi.fn((id: string, _partitionKey?: string) => ({
      read: vi.fn().mockResolvedValue({
        resource: id === 'not-found' ? null : {
          id: id || 'fb-1',
          tenantId: 'tenant-123',
          modelId: 'm1',
          feedbackType: 'action',
          recordedAt: new Date().toISOString(),
        },
      }),
    })),
    items: {
      upsert: mockUpsert,
      query: vi.fn(() => ({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      })),
    },
    read: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    initializeDatabase: vi.fn(),
    connectDatabase: vi.fn().mockResolvedValue(undefined),
    setupJWT: vi.fn(),
    authenticateRequest: vi.fn(() => async (req: { user?: { id: string; tenantId: string }; headers?: Record<string, string> }) => {
      req.user = req.user || { id: 'test-user', tenantId: req.headers?.['x-tenant-id'] || 'tenant-123' };
    }),
    tenantEnforcementMiddleware: vi.fn(() => async (req: { user?: { id: string; tenantId: string }; headers?: Record<string, string> }) => {
      req.user = req.user || { id: 'test-user', tenantId: req.headers?.['x-tenant-id'] || 'tenant-123' };
    }),
  };
});

vi.mock('../src/events/publishers/FeedbackLearningEventPublisher', () => ({
  initializeEventPublisher: vi.fn().mockResolvedValue(undefined),
  closeEventPublisher: vi.fn().mockResolvedValue(undefined),
  publishFeedbackRecorded: vi.fn().mockResolvedValue(undefined),
  publishOutcomeRecorded: vi.fn().mockResolvedValue(undefined),
  publishFeedbackTrendAlert: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  vi.clearAllMocks();
});

export { mockUpsert };
