/**
 * Test Setup
 * Mocks and global setup for all tests
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.RABBITMQ_URL = '';
process.env.PORT = '3014';
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
      if (path.includes('default.yaml')) {
        return `
module:
  name: logging
  version: 1.0.0
server:
  port: 3014
  host: 0.0.0.0
database:
  url: postgresql://test:test@localhost:5432/test
  pool_size: 5
rabbitmq:
  url: ''
  exchange: test_events
  queue: test_queue
  bindings: []
storage:
  provider: postgres
  postgres:
    partition_by: month
archive:
  enabled: false
  provider: local
siem:
  enabled: false
  provider: webhook
defaults:
  capture:
    ip_address: true
    user_agent: true
    geolocation: false
  redaction:
    enabled: true
    patterns:
      - password
      - secret
      - token
  retention:
    default_days: 90
    min_days: 30
    max_days: 2555
  hash_chain:
    enabled: true
    algorithm: sha256
  alerts:
    enabled: true
    check_interval_seconds: 60
ingestion:
  batch_size: 100
  flush_interval_ms: 1000
  buffer:
    enabled: false
    max_size: 10000
    file_path: /tmp/test_audit_buffer
rate_limit:
  enabled: false
  max_per_second: 1000
  burst: 2000
jobs:
  retention:
    enabled: false
    schedule: "0 2 * * *"
  archive:
    enabled: false
    schedule: "0 3 * * *"
  partition:
    enabled: false
    schedule: "0 0 25 * *"
  alerts:
    enabled: false
    schedule: "*/1 * * * *"
services:
  user_management:
    url: http://localhost:3000
  notification:
    url: http://localhost:3001
`;
      }
      if (path.includes('schema.json')) {
        return JSON.stringify({
          type: 'object',
          properties: {},
        });
      }
      return actual.readFileSync(path, 'utf8');
    }),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mock amqplib
vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn().mockResolvedValue({
      createChannel: vi.fn().mockResolvedValue({
        assertExchange: vi.fn(),
        assertQueue: vi.fn().mockResolvedValue({ queue: 'test_queue' }),
        bindQueue: vi.fn(),
        consume: vi.fn(),
        ack: vi.fn(),
        nack: vi.fn(),
        publish: vi.fn().mockReturnValue(true),
        close: vi.fn(),
      }),
      close: vi.fn(),
    }),
  },
  connect: vi.fn().mockResolvedValue({
    createChannel: vi.fn().mockResolvedValue({
      assertExchange: vi.fn(),
      assertQueue: vi.fn().mockResolvedValue({ queue: 'test_queue' }),
      bindQueue: vi.fn(),
      consume: vi.fn(),
      ack: vi.fn(),
      nack: vi.fn(),
      publish: vi.fn().mockReturnValue(true),
      close: vi.fn(),
    }),
    close: vi.fn(),
  }),
}));

// Mock Prisma Client
vi.mock('.prisma/logging-client', () => {
  const mockPrismaClient = vi.fn(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    audit_logs: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    audit_retention_policies: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    audit_alert_rules: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    audit_hash_checkpoints: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    audit_configurations: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    audit_exports: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  }));

  return {
    PrismaClient: mockPrismaClient,
    audit_log_category: {
      ACTION: 'ACTION',
      ACCESS: 'ACCESS',
      SECURITY: 'SECURITY',
      SYSTEM: 'SYSTEM',
      CUSTOM: 'CUSTOM',
    },
    audit_log_severity: {
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR',
      CRITICAL: 'CRITICAL',
    },
    audit_export_status: {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
    },
    audit_export_format: {
      CSV: 'CSV',
      JSON: 'JSON',
    },
    audit_alert_type: {
      PATTERN: 'PATTERN',
      THRESHOLD: 'THRESHOLD',
      ANOMALY: 'ANOMALY',
    },
  };
});

// Mock @coder/shared
vi.mock('@coder/shared', () => ({
  EventPublisher: vi.fn(() => ({
    publish: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
  ServiceClient: vi.fn().mockImplementation(function (this: unknown) {
    return { get: vi.fn() };
  }),
  setupJWT: vi.fn().mockResolvedValue(undefined),
  AuthenticatedUser: {},
}));

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global error handling
beforeAll(() => {
  // Suppress console during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});



