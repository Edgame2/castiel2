/**
 * Test Setup
 * Mocks and global setup for all tests
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_auth';
process.env.RABBITMQ_URL = process.env.TEST_RABBITMQ_URL || '';
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || '';
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
  name: auth
  version: 1.0.0
server:
  port: 3000
  host: 0.0.0.0
database:
  url: ${process.env.DATABASE_URL}
  pool_size: 5
jwt:
  secret: ${process.env.JWT_SECRET}
  expiration: 7d
redis:
  url: ${process.env.REDIS_URL || ''}
rabbitmq:
  url: ${process.env.RABBITMQ_URL || ''}
  exchange: test_events
  queue: test_queue
  bindings: []
oauth:
  google:
    enabled: false
  github:
    enabled: false
password:
  min_length: 8
security:
  max_login_attempts: 5
services:
  logging:
    url: http://localhost:3014
  notification:
    url: http://localhost:3001
  main_app:
    url: http://localhost:3000
        `;
      }
      return '';
    }),
  };
});

// Mock yaml parser
vi.mock('yaml', () => ({
  parse: vi.fn((content: string) => {
    // Simple mock parser for test config
    const config: any = {
      module: { name: 'auth', version: '1.0.0' },
      server: { port: 3000, host: '0.0.0.0' },
      database: { url: process.env.DATABASE_URL, pool_size: 5 },
      jwt: { secret: process.env.JWT_SECRET, expiration: '7d' },
      redis: { url: process.env.REDIS_URL || '' },
      rabbitmq: { url: process.env.RABBITMQ_URL || '', exchange: 'test_events', queue: 'test_queue', bindings: [] },
      oauth: { google: { enabled: false }, github: { enabled: false } },
      password: { min_length: 8 },
      security: { max_login_attempts: 5 },
      services: {
        logging: { url: 'http://localhost:3014' },
        notification: { url: 'http://localhost:3001' },
        main_app: { url: 'http://localhost:3000' },
      },
    };
    return config;
  }),
}));

// Mock hibp (HaveIBeenPwned) - global mock for all tests
vi.mock('hibp', () => ({
  pwnedPassword: vi.fn(async (password: string) => {
    // Mock: return 0 for most passwords, high count for 'pwnedpassword'
    if (password.toLowerCase() === 'pwnedpassword') {
      return 1000;
    }
    return 0;
  }),
}));

// Mock bcrypt - use actual bcrypt if available, otherwise provide mock
vi.mock('bcrypt', async () => {
  try {
    // Try to use actual bcrypt if available
    const bcrypt = await import('bcrypt');
    return bcrypt;
  } catch {
    // Fallback mock if bcrypt not available
    const mockHash = vi.fn(async (password: string, rounds: number) => {
      // Return a mock bcrypt hash (starts with $2)
      const salt = Buffer.from(`${password}-${Date.now()}`).toString('base64').substring(0, 22);
      return `$2b$${rounds}$${salt}`;
    });
    
    const mockCompare = vi.fn(async (password: string, hash: string) => {
      // For testing: if hash contains password in base64, consider it a match
      // This is a simplified mock - real bcrypt comparison is more complex
      const hashStr = hash.toString();
      const passwordBase64 = Buffer.from(password).toString('base64');
      return hashStr.includes(passwordBase64.substring(0, 10));
    });
    
    return {
      hash: mockHash,
      compare: mockCompare,
    };
  }
});

// Mock ioredis - provide mock implementation
vi.mock('ioredis', () => {
  const mockRedisInstance = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
  };
  
  const MockRedis = vi.fn(() => mockRedisInstance);
  
  return {
    default: MockRedis,
  };
});

// Mock redis utility module
vi.mock('../../../src/utils/redis', () => {
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
  };
  
  return {
    redis: mockRedis,
    default: mockRedis,
  };
});

// Mock ajv (used by config validation)
vi.mock('ajv', () => {
  const Ajv = vi.fn(() => ({
    compile: vi.fn(() => vi.fn(() => true)), // Always validate
    validate: vi.fn(() => true),
    errors: null,
  }));
  return { default: Ajv, Ajv };
});

// Mock ajv-formats (used by ajv)
vi.mock('ajv-formats', () => ({
  default: vi.fn(),
}));

// Mock fastify (for integration tests)
vi.mock('fastify', () => {
  const mockFastify = {
    register: vi.fn(),
    listen: vi.fn(),
    ready: vi.fn(),
    close: vi.fn(),
    inject: vi.fn(),
    log: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  };
  
  return {
    default: vi.fn(() => mockFastify),
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

