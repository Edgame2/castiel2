/**
 * Unit tests focusing on the email/password authentication flow.
 * Verifies registration, login, password recovery, and refresh token behavior
 * without relying on external services (Cosmos DB, Redis, Resend).
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from '../../src/controllers/auth.controller.js';
import { UserStatus } from '../../src/types/user.types.js';
import { TenantStatus } from '../../src/types/tenant.types.js';

const STRONG_PASSWORD = 'Password123!';

type Mocked<T> = {
  [K in keyof T]?: T[K] extends (...args: any[]) => any ? ReturnType<typeof vi.fn> : any;
};

type MockRequest = ReturnType<typeof createMockRequest>;
type MockReply = ReturnType<typeof createMockReply>;

const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-123',
  tenantId: 'default',
  email: 'user@example.com',
  emailVerified: true,
  firstName: 'Test',
  lastName: 'User',
  status: UserStatus.ACTIVE,
  roles: ['user'],
  createdAt: new Date(),
  updatedAt: new Date(),
  partitionKey: 'default',
  ...overrides,
});

const createMockRequest = (overrides: Partial<any> = {}) => ({
  body: {},
  headers: {
    'user-agent': 'Vitest',
    'x-forwarded-for': '127.0.0.1',
    ...overrides.headers,
  },
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' },
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  server: {
    jwt: {
      sign: vi.fn().mockReturnValue('signed-jwt'),
      verify: vi.fn(),
      decode: vi.fn(),
    },
  },
  ...overrides,
});

const createMockReply = () => {
  const reply: any = {
    statusCode: 200,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(payload: any) {
      this.payload = payload;
      return this;
    },
  };
  return reply;
};

describe('AuthController - Email/Password', () => {
  let userService: Mocked<any>;
  let emailService: Mocked<any>;
  let cacheManager: any;
  let tenantService: Mocked<any>;
  let tenantJoinRequestService: Mocked<any>;
  let controller: AuthController;

  beforeEach(() => {
    userService = {
      findByEmail: vi.fn(),
      createUser: vi.fn(),
      verifyEmail: vi.fn(),
      authenticateUser: vi.fn(),
      createPasswordResetToken: vi.fn(),
      resetPassword: vi.fn(),
      findById: vi.fn(),
    };

    emailService = {
      isReady: vi.fn().mockReturnValue(false),
      sendVerificationEmail: vi.fn(),
      sendPasswordResetEmail: vi.fn(),
      sendWelcomeEmail: vi.fn(),
      sendEmail: vi.fn(),
    };

    cacheManager = {
      tokens: {
        createRefreshToken: vi.fn().mockResolvedValue({ token: 'refresh-token', tokenId: 'rt1' }),
        rotateRefreshToken: vi.fn(),
        getTokenData: vi.fn(),
        revokeToken: vi.fn(),
      },
      sessions: {
        createSession: vi.fn().mockResolvedValue(undefined),
      },
      blacklist: {
        blacklistToken: vi.fn(),
        isTokenBlacklisted: vi.fn().mockResolvedValue(false),
      },
      logoutUser: vi.fn(),
    };

    tenantService = {
      getTenantByDomain: vi.fn(),
      createTenant: vi.fn(),
      activateTenant: vi.fn(),
      appendAdminUser: vi.fn(),
      getTenant: vi.fn(),
    };

    tenantJoinRequestService = {
      createRequest: vi.fn(),
    };

    controller = new AuthController(
      userService as any,
      emailService as any,
      cacheManager,
      'http://localhost:3001',
      '15m',
      tenantService as any,
      tenantJoinRequestService as any
    );
  });

  const buildReply = () => createMockReply() as MockReply;
  const buildRequest = (overrides: Partial<any>) => createMockRequest(overrides) as MockRequest;

  it('registers a new user and auto-verifies when email service is disabled', async () => {
    const user = createMockUser({
      email: 'new@example.com',
      emailVerified: false,
      verificationToken: 'verify-token',
      status: UserStatus.PENDING_VERIFICATION,
      tenantId: 'tenant-123',
    });

    (userService.findByEmail as any).mockResolvedValue(null);
    (userService.createUser as any).mockResolvedValue(user);
    (userService.verifyEmail as any).mockResolvedValue({ ...user, emailVerified: true, status: UserStatus.ACTIVE });
    (tenantService.getTenantByDomain as any).mockResolvedValue(null);
    (tenantService.createTenant as any).mockResolvedValue({
      id: 'tenant-123',
      name: 'Acme Corp',
      domain: 'acme.com',
      status: TenantStatus.ACTIVE,
    });
    (tenantService.activateTenant as any).mockResolvedValue(undefined);
    (tenantService.appendAdminUser as any).mockResolvedValue(undefined);

    const request = buildRequest({
      body: {
        email: user.email,
        password: STRONG_PASSWORD,
        firstName: 'New',
        lastName: 'User',
        tenantId: 'default',
        tenantName: 'Acme Corp',
        tenantDomain: 'acme.com',
      },
    });
    const reply = buildReply();

    await controller.register(request as any, reply as any);

    expect(reply.statusCode).toBe(201);
    expect(userService.verifyEmail).toHaveBeenCalledWith('verify-token', 'tenant-123');
    expect(reply.payload).toMatchObject({
      message: expect.stringContaining('Tenant created and registration successful'),
      email: user.email,
    });
  });

  it('rejects registration when the email already exists', async () => {
    (userService.findByEmail as any).mockResolvedValue(createMockUser());
  (tenantService.getTenantByDomain as any).mockResolvedValue({ id: 'tenant-123', status: TenantStatus.ACTIVE });

    const request = buildRequest({
      body: {
        email: 'duplicate@example.com',
        password: STRONG_PASSWORD,
        tenantId: 'default',
        tenantName: 'Acme Corp',
        tenantDomain: 'acme.com',
      },
    });
    const reply = buildReply();

    await controller.register(request as any, reply as any);

    expect(reply.statusCode).toBe(409);
    expect(reply.payload).toMatchObject({ error: 'Conflict' });
    expect(userService.createUser).not.toHaveBeenCalled();
    expect(tenantService.createTenant).not.toHaveBeenCalled();
  });

  it('logs a user in with valid credentials', async () => {
    const user = createMockUser();
    (userService.authenticateUser as any).mockResolvedValue(user);
    (cacheManager.tokens.createRefreshToken as any).mockResolvedValue({ token: 'refresh-token' });

    const request = buildRequest({
      body: {
        email: user.email,
        password: STRONG_PASSWORD,
        tenantId: 'default',
      },
    });
    request.server.jwt.sign = vi.fn().mockReturnValue('access-token');
    const reply = buildReply();

    await controller.login(request as any, reply as any);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { email: user.email },
    });
    expect(cacheManager.sessions.createSession).toHaveBeenCalledWith(
      user.id,
      user.tenantId,
      expect.objectContaining({ email: user.email })
    );
  });

  it('returns 401 when credentials are invalid', async () => {
    (userService.authenticateUser as any).mockResolvedValue(null);

    const request = buildRequest({
      body: { email: 'user@example.com', password: 'Wrong123!', tenantId: 'default' },
    });
    const reply = buildReply();

    await controller.login(request as any, reply as any);

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('blocks login when email is unverified and email service is ready', async () => {
    const user = createMockUser({ emailVerified: false });
    (userService.authenticateUser as any).mockResolvedValue(user);
    (emailService.isReady as any).mockReturnValue(true);

    const request = buildRequest({
      body: { email: user.email, password: STRONG_PASSWORD, tenantId: 'default' },
    });
    const reply = buildReply();

    await controller.login(request as any, reply as any);

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toMatchObject({ error: 'Forbidden' });
  });

  it('sends password reset instructions when a reset token is created', async () => {
    (userService.createPasswordResetToken as any).mockResolvedValue('reset-token');

    const request = buildRequest({ body: { email: 'user@example.com', tenantId: 'default' } });
    const reply = buildReply();

    await controller.forgotPassword(request as any, reply as any);

    expect(reply.statusCode).toBe(200);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'user@example.com',
      'reset-token',
      'http://localhost:3001'
    );
    expect(reply.payload).toMatchObject({
      message: expect.stringContaining('If an account exists'),
    });
  });

  it('completes gracefully when no reset token is created', async () => {
    (userService.createPasswordResetToken as any).mockResolvedValue(null);

    const request = buildRequest({ body: { email: 'missing@example.com', tenantId: 'default' } });
    const reply = buildReply();

    await controller.forgotPassword(request as any, reply as any);

    expect(reply.statusCode).toBe(200);
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(reply.payload).toMatchObject({
      message: expect.stringContaining('If an account exists'),
    });
  });

  it('resets password with a valid token', async () => {
    (userService.resetPassword as any).mockResolvedValue(true);

    const request = buildRequest({
      body: { token: 'reset-token', password: STRONG_PASSWORD, tenantId: 'default' },
    });
    const reply = buildReply();

    await controller.resetPassword(request as any, reply as any);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toMatchObject({
      message: expect.stringContaining('Password reset successfully'),
    });
  });

  it('rejects password reset when token is invalid', async () => {
    (userService.resetPassword as any).mockResolvedValue(false);

    const request = buildRequest({
      body: { token: 'bad-token', password: STRONG_PASSWORD, tenantId: 'default' },
    });
    const reply = buildReply();

    await controller.resetPassword(request as any, reply as any);

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toMatchObject({ error: 'Bad Request' });
  });

  it('issues fresh tokens when a refresh token is rotated successfully', async () => {
    const user = createMockUser();
    (cacheManager.tokens.rotateRefreshToken as any).mockResolvedValue({
      token: 'next-refresh',
      tokenData: { userId: user.id, tenantId: user.tenantId },
    });
    (userService.findById as any).mockResolvedValue(user);

    const request = buildRequest({
      body: { refreshToken: 'old-refresh' },
    });
    request.server.jwt.sign = vi.fn().mockReturnValue('next-access');
    const reply = buildReply();

    await controller.refreshToken(request as any, reply as any);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toMatchObject({
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
    });
  });

  it('returns 401 when refresh token rotation fails', async () => {
    (cacheManager.tokens.rotateRefreshToken as any).mockResolvedValue(null);

    const request = buildRequest({ body: { refreshToken: 'expired' } });
    const reply = buildReply();

    await controller.refreshToken(request as any, reply as any);

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toMatchObject({ error: 'Unauthorized' });
  });
});
