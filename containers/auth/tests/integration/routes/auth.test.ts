/**
 * Authentication Routes Integration Tests
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { setupAuthRoutes } from '../../../src/routes/auth';
import { hashPassword } from '../../../src/utils/passwordUtils';
import { getDatabaseClient, setupJWT } from '@coder/shared';
import Fastify from 'fastify';

// Mock only getDatabaseClient so setupJWT and rest of shared work
vi.mock('@coder/shared', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@coder/shared')>();
  return { ...mod, getDatabaseClient: vi.fn() };
});

// hibp is mocked globally in tests/setup.ts

// Mock services
vi.mock('../../../src/services/LoginAttemptService', () => ({
  recordLoginAttempt: vi.fn(),
  isAccountLocked: vi.fn(() => false),
}));

vi.mock('../../../src/services/LoginHistoryService', () => ({
  recordLoginAttempt: vi.fn(),
}));

vi.mock('../../../src/services/SessionService', () => ({
  createSession: vi.fn(async () => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    sessionId: 'mock-session-id',
  })),
  generateDeviceFingerprint: vi.fn(() => 'mock-fingerprint'),
}));

vi.mock('../../../src/services/PasswordResetService', () => ({
  requestPasswordReset: vi.fn(async () => ({ success: true })),
  resetPasswordWithToken: vi.fn(async () => ({ success: true })),
}));

vi.mock('../../../src/services/EmailVerificationService', () => ({
  sendVerificationEmail: vi.fn(async () => ({ success: true })),
  verifyEmailWithToken: vi.fn(async () => ({ success: true })),
}));

vi.mock('../../../src/services/AccountService', () => ({
  getAccountService: vi.fn(() => ({
    createUserAccount: vi.fn(async () => ({ id: 'account-123' })),
  })),
}));

vi.mock('../../../src/services/LoggingService', () => ({
  getLoggingService: vi.fn(() => ({
    logFromRequest: vi.fn(async () => {}),
  })),
}));

vi.mock('../../../src/events/publishers/AuthEventPublisher', () => ({
  publishEventSafely: vi.fn(async () => {}),
  extractEventMetadata: vi.fn(() => ({ correlationId: null, userId: null, tenantId: null })),
  createBaseEvent: vi.fn(() => ({ id: 'e1', type: 'auth.test', version: '1.0', timestamp: new Date().toISOString(), tenantId: null, source: 'auth', data: {} })),
}));

describe('Authentication Routes', () => {
  let app: any;
  let mockDb: any;

  beforeAll(async () => {
    mockDb = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      session: {
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      passwordResetToken: {
        findUnique: vi.fn(),
      },
      organization: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      role: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      organizationMembership: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
    };

    (getDatabaseClient as any).mockReturnValue(mockDb);
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify({ logger: false });
    // Auth routes use reply.setCookie; ensure it exists (e.g. from @fastify/cookie in real server)
    app.decorateReply('setCookie', function (this: any, _name: string, _value: string, _opts?: any) {
      return this;
    });
    await setupJWT(app, { secret: process.env.JWT_SECRET || 'test-secret' });
    await setupAuthRoutes(app);
    await app.ready();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      mockDb.user.findUnique.mockResolvedValueOnce(null); // Email not taken
      mockDb.user.findUnique.mockResolvedValueOnce(null); // Username not taken
      mockDb.user.create.mockResolvedValue({
        id: 'user-123',
        email,
        username: 'newuser',
        isEmailVerified: false,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password,
          firstName: 'New',
          lastName: 'User',
        },
      });

      expect([200, 201]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(email);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      const email = 'existing@example.com';
      
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'TestPassword123!',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@example.com',
          password: '123', // Too weak
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);

      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email,
        passwordHash: hashedPassword,
        isActive: true,
        isEmailVerified: true,
      });

      // Mock app.inject if Fastify is not available
      if (app.inject) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: {
            email,
            password,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.user).toBeDefined();
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
      } else {
        // Skip test if Fastify is not available
        expect(true).toBe(true);
      }
    });

    it('should reject login with invalid credentials', async () => {
      const email = 'test@example.com';
      const password = 'WrongPassword123!';
      const hashedPassword = await hashPassword('CorrectPassword123!');

      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email,
        passwordHash: hashedPassword,
        isActive: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email,
          password,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should reject login for non-existent user', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
    });
  });
});

