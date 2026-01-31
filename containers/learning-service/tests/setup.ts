/**
 * Test setup for learning-service (Plan W6 Layer 7).
 * Mocks config, database, and auth for integration tests.
 */

import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret';

vi.mock('../src/config', () => ({
  loadConfig: vi.fn(() => ({
    module: { name: 'learning-service', version: '1.0.0' },
    server: { port: 3050, host: '0.0.0.0' },
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

const mockState: { resource: Record<string, unknown> | null } = {
  resource: {
    id: 'fb-1',
    tenantId: 'tenant-123',
    modelId: 'm1',
    feedbackType: 'action',
    recordedAt: new Date().toISOString(),
  },
};
const mockUpsert = vi.fn().mockResolvedValue(undefined);

vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    item: vi.fn(() => ({
      read: vi.fn().mockImplementation(() =>
        Promise.resolve({ resource: mockState.resource })
      ),
    })),
    items: { upsert: mockUpsert },
  })),
}));

vi.mock('@coder/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    initializeDatabase: vi.fn(),
    connectDatabase: vi.fn(),
    setupJWT: vi.fn(),
    authenticateRequest: vi.fn(() => (_req: { user?: { id: string; tenantId: string } }, _r: unknown, next: () => void) => {
      (_req as { user: { id: string; tenantId: string } }).user = { id: 'test-user', tenantId: 'tenant-123' };
      next();
    }),
    tenantEnforcementMiddleware: vi.fn(() => (_req: unknown, _reply: unknown, next: () => void) => next()),
  };
});

vi.mock('../src/events/publishers/FeedbackLearningEventPublisher', () => ({
  initializeEventPublisher: vi.fn().mockResolvedValue(undefined),
  closeEventPublisher: vi.fn().mockResolvedValue(undefined),
  publishFeedbackRecorded: vi.fn().mockResolvedValue(undefined),
  publishOutcomeRecorded: vi.fn().mockResolvedValue(undefined),
  publishFeedbackTrendAlert: vi.fn().mockResolvedValue(undefined),
}));

export { mockState, mockUpsert };
