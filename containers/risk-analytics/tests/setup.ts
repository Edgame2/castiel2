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
process.env.PORT = '3048';
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
  name: risk-analytics
  version: 1.0.0
server:
  port: 3048
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
      module: { name: 'risk-analytics', version: '1.0.0' },
      server: { port: 3048, host: '0.0.0.0' },
      cosmos_db: {
        endpoint: process.env.COSMOS_DB_ENDPOINT,
        key: process.env.COSMOS_DB_KEY,
        database_id: process.env.COSMOS_DB_DATABASE_ID,
        containers: {
          evaluations: 'risk_evaluations',
          snapshots: 'risk_snapshots',
          predictions: 'risk_predictions',
          revenue_at_risk: 'risk_revenue_at_risk',
          quotas: 'risk_quotas',
          warnings: 'risk_warnings',
          simulations: 'risk_simulations',
          anomaly_alerts: 'risk_anomaly_alerts',
          sentiment_trends: 'risk_sentiment_trends',
          explanations: 'risk_explanations',
          global_feature_importance: 'risk_global_feature_importance',
          decisions: 'risk_decisions',
          rules: 'risk_rules',
          sales_methodology: 'risk_sales_methodology',
          tenant_ml_config: 'risk_tenant_ml_config',
        },
      },
      jwt: { secret: process.env.JWT_SECRET },
      rabbitmq: { url: process.env.RABBITMQ_URL || '', exchange: 'test_events', queue: 'test_queue', bindings: [] },
      services: {
        ml_service: { url: 'http://ml-service:3000' },
        shard_manager: { url: 'http://shard-manager:3000' },
        risk_catalog: { url: 'http://risk-catalog:3000' },
        adaptive_learning: { url: 'http://adaptive-learning:3000' },
        ai_insights: { url: 'http://ai-insights:3000' },
        embeddings: { url: 'http://embeddings:3000' },
        search_service: { url: 'http://search-service:3029' },
      },
    };
    return config;
  }),
}));

// Mock @coder/shared database
vi.mock('@coder/shared/database', () => ({
  getContainer: vi.fn(() => ({
    items: {
      create: vi.fn(),
      upsert: vi.fn().mockResolvedValue(undefined),
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

// Mock @coder/shared ServiceClient, auth middleware, and DB
vi.mock('@coder/shared', () => {
  const clientInstance = {
    get: vi.fn().mockResolvedValue({
      stageRequirementsMet: 0.5,
      stageRequirementsMissing: ['req1'],
      stageDurationAnomaly: false,
      methodologyFieldsComplete: 0.9,
      methodologyFieldsMissing: [],
      meddic: null,
    }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };
  return {
    ServiceClient: vi.fn().mockImplementation(function ServiceClient() {
      return clientInstance;
    }),
  authenticateRequest: vi.fn(() => async (req: any) => {
    req.user = req.user || { id: 'user-1', tenantId: req.headers?.['x-tenant-id'] ?? 'tenant-123' };
  }),
  tenantEnforcementMiddleware: vi.fn(() => async (req: any) => {
    req.user = req.user || { id: 'user-1', tenantId: req.headers?.['x-tenant-id'] || 'tenant-123' };
  }),
  setupJWT: vi.fn(),
  initializeDatabase: vi.fn(),
  connectDatabase: vi.fn().mockResolvedValue(undefined),
  generateServiceToken: vi.fn().mockReturnValue('mock-service-token'),
  };
});

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
