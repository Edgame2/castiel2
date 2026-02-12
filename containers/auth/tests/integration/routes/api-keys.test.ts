/**
 * API Keys Routes Integration Tests
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { getDatabaseClient, setupJWT } from '@coder/shared';
import Fastify from 'fastify';
import { getContainer } from '@coder/shared/database';

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
  return { redis: mockRedis, default: mockRedis };
});

vi.mock('@coder/shared', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@coder/shared')>();
  return { ...mod, getDatabaseClient: vi.fn() };
});

vi.mock('@coder/shared/database', () => ({ getContainer: vi.fn() }));

vi.mock('../../../src/services/LoginAttemptService', () => ({
  recordLoginAttempt: vi.fn(),
  isAccountLocked: vi.fn(() => false),
}));

vi.mock('../../../src/services/LoginHistoryService', () => ({
  recordLoginAttempt: vi.fn(),
}));

vi.mock('../../../src/services/SessionService', () => ({
  createSession: vi.fn(),
  validateSession: vi.fn(),
  generateDeviceFingerprint: vi.fn(),
  switchSessionOrganization: vi.fn(),
}));

vi.mock('../../../src/services/PasswordResetService', () => ({
  requestPasswordReset: vi.fn(),
  resetPasswordWithToken: vi.fn(),
}));

vi.mock('../../../src/services/EmailVerificationService', () => ({
  sendVerificationEmail: vi.fn(),
  verifyEmailWithToken: vi.fn(),
}));

vi.mock('../../../src/services/AccountService', () => ({
  getAccountService: vi.fn(() => ({
    createUserAccount: vi.fn(),
  })),
}));

vi.mock('../../../src/services/LoggingService', () => ({
  getLoggingService: vi.fn(() => ({
    logFromRequest: vi.fn(),
  })),
}));

vi.mock('../../../src/events/publishers/AuthEventPublisher', () => ({
  publishEventSafely: vi.fn(),
  extractEventMetadata: vi.fn(() => ({ correlationId: null, userId: null, tenantId: null })),
  createBaseEvent: vi.fn(() => ({ id: 'e1', type: 'auth.test', version: '1.0', timestamp: new Date().toISOString(), tenantId: null, source: 'auth', data: {} })),
}));

import { validateSession } from '../../../src/services/SessionService';
import { setupAuthRoutes } from '../../../src/routes/auth';

describe('API Keys Routes', () => {
  let app: any;
  let mockDb: any;
  const TEST_TOKEN = 'test-bearer-token';
  const TEST_USER_ID = 'user-api-keys-123';
  const TEST_ORG_ID = 'org-tenant-1';
  const TEST_TENANT_ID = '11111111-2222-3333-4444-555555555555'; // UUID for X-Tenant-ID (tenantEnforcementMiddleware)
  const authHeaders = () => ({ authorization: `Bearer ${TEST_TOKEN}`, 'x-tenant-id': TEST_TENANT_ID });

  beforeAll(async () => {
    mockDb = {
      user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      session: { findUnique: vi.fn(), delete: vi.fn() },
      passwordResetToken: { findUnique: vi.fn() },
      organization: { findFirst: vi.fn().mockResolvedValue(null) },
      role: { findFirst: vi.fn().mockResolvedValue(null) },
      organizationMembership: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    };
    (getDatabaseClient as any).mockReturnValue(mockDb);
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    vi.mocked(validateSession).mockResolvedValue({
      userId: TEST_USER_ID,
      email: 'apikey@test.com',
      organizationId: TEST_ORG_ID,
      sessionId: 'sess-1',
    } as any);

    mockDb.user.findUnique.mockResolvedValue({
      id: TEST_USER_ID,
      email: 'apikey@test.com',
      name: 'API Key User',
      isActive: true,
      isEmailVerified: true,
    });

    const mockContainer = {
      items: {
        create: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockReturnValue({
          fetchAll: vi.fn().mockResolvedValue({
            resources: [
              { id: 'key-1', name: 'Key 1', createdAt: '2025-01-01T00:00:00Z', expiresAt: null },
            ],
          }),
        }),
      },
      item: vi.fn(() => ({
        read: vi.fn().mockResolvedValue({
          resource: { id: 'key-1', userId: TEST_USER_ID, tenantId: TEST_ORG_ID, name: 'Key 1', keyHash: 'h', createdAt: '', expiresAt: null },
        }),
        delete: vi.fn().mockResolvedValue(undefined),
      })),
    };
    vi.mocked(getContainer).mockReturnValue(mockContainer as any);

    app = Fastify({ logger: false });
    app.decorateReply('setCookie', function (this: any) { return this; });
    await setupJWT(app, { secret: process.env.JWT_SECRET || 'test-secret' });
    await setupAuthRoutes(app, {
      features: { api_keys: true },
      server: { port: 3000, host: '0.0.0.0' },
      jwt: { secret: 'test', expiration: '1h', refresh_expiration: '7d' },
      database: { url: 'postgresql://test' },
      cosmos_db: { endpoint: '', key: '', database_id: 'test' },
      rabbitmq: { url: '', exchange: '', queue: '' },
    } as any);
    await app.ready();
  });

  describe('POST /api/v1/auth/api-keys', () => {
    it('returns 403 when feature flag is disabled', async () => {
      const appNoFeature = Fastify({ logger: false });
      appNoFeature.decorateReply('setCookie', function (this: any) { return this; });
      await setupJWT(appNoFeature, { secret: 'test-secret' });
      await setupAuthRoutes(appNoFeature, {
        features: { api_keys: false },
        server: { port: 3000, host: '0.0.0.0' },
        jwt: { secret: 'test', expiration: '1h', refresh_expiration: '7d' },
        database: { url: 'postgresql://test' },
        cosmos_db: { endpoint: '', key: '', database_id: 'test' },
        rabbitmq: { url: '', exchange: '', queue: '' },
      } as any);
      await appNoFeature.ready();

      const response = await appNoFeature.inject({
        method: 'POST',
        url: '/api/v1/auth/api-keys',
        headers: { authorization: `Bearer ${TEST_TOKEN}`, 'x-tenant-id': TEST_TENANT_ID },
        payload: { name: 'My Key' },
      });
      expect(response.statusCode).toBe(403);
      await appNoFeature.close();
    });

    it('creates API key with valid JWT and name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/api-keys',
        headers: authHeaders(),
        payload: { name: 'My New Key' },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('My New Key');
      expect(body.key).toMatch(/^ak_/);
      expect(body.createdAt).toBeDefined();
    });

    it('returns 400 when name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/api-keys',
        headers: authHeaders(),
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it('returns 401 when not authenticated', async () => {
      vi.mocked(validateSession).mockRejectedValueOnce(new Error('Invalid token'));
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/api-keys',
        headers: { authorization: 'Bearer invalid', 'x-tenant-id': TEST_TENANT_ID },
        payload: { name: 'Key' },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/api-keys', () => {
    it('returns list of keys for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/api-keys',
        headers: authHeaders(),
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.keys).toBeDefined();
      expect(Array.isArray(body.keys)).toBe(true);
      if (body.keys.length > 0) {
        expect(body.keys[0]).toHaveProperty('id');
        expect(body.keys[0]).toHaveProperty('name');
        expect(body.keys[0]).toHaveProperty('createdAt');
      }
    });

    it('returns 403 when feature flag is disabled', async () => {
      const appNoFeature = Fastify({ logger: false });
      appNoFeature.decorateReply('setCookie', function (this: any) { return this; });
      await setupJWT(appNoFeature, { secret: 'test-secret' });
      await setupAuthRoutes(appNoFeature, {
        features: { api_keys: false },
        server: { port: 3000, host: '0.0.0.0' },
        jwt: { secret: 'test', expiration: '1h', refresh_expiration: '7d' },
        database: { url: 'postgresql://test' },
        cosmos_db: { endpoint: '', key: '', database_id: 'test' },
        rabbitmq: { url: '', exchange: '', queue: '' },
      } as any);
      await appNoFeature.ready();

      const response = await appNoFeature.inject({
        method: 'GET',
        url: '/api/v1/auth/api-keys',
        headers: authHeaders(),
      });
      expect(response.statusCode).toBe(403);
      await appNoFeature.close();
    });
  });

  describe('DELETE /api/v1/auth/api-keys/:id', () => {
    it('revokes key when user owns it', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/api-keys/key-1',
        headers: authHeaders(),
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('returns 404 when key not found or not owner', async () => {
      const mockItem = vi.fn(() => ({
        read: vi.fn().mockResolvedValue({ resource: null }),
        delete: vi.fn(),
      }));
      vi.mocked(getContainer).mockReturnValueOnce({ item: mockItem, items: {} } as any);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/api-keys/nonexistent-key',
        headers: authHeaders(),
      });
      expect(response.statusCode).toBe(404);
    });

    it('returns 403 when feature flag is disabled', async () => {
      const appNoFeature = Fastify({ logger: false });
      appNoFeature.decorateReply('setCookie', function (this: any) { return this; });
      await setupJWT(appNoFeature, { secret: 'test-secret' });
      await setupAuthRoutes(appNoFeature, {
        features: { api_keys: false },
        server: { port: 3000, host: '0.0.0.0' },
        jwt: { secret: 'test', expiration: '1h', refresh_expiration: '7d' },
        database: { url: 'postgresql://test' },
        cosmos_db: { endpoint: '', key: '', database_id: 'test' },
        rabbitmq: { url: '', exchange: '', queue: '' },
      } as any);
      await appNoFeature.ready();

      const response = await appNoFeature.inject({
        method: 'DELETE',
        url: '/api/v1/auth/api-keys/key-1',
        headers: authHeaders(),
      });
      expect(response.statusCode).toBe(403);
      await appNoFeature.close();
    });
  });
});
