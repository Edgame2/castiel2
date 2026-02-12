/**
 * Auth middleware unit tests
 * Verifies authenticateRequest: no token, invalid token, user/session in DB or not (session owned by auth).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';

const JWT_SECRET = process.env.TEST_JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

vi.mock('../../../src/config', () => ({
  getConfig: vi.fn(() => ({ jwt: { secret: JWT_SECRET } })),
}));

// Mock logger to avoid console noise
vi.mock('../../../src/utils/logger', () => ({
  log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import jwt from 'jsonwebtoken';
import { getDatabaseClient } from '@coder/shared';
import { authenticateRequest } from '../../../src/middleware/auth';

function createMockRequest(overrides: Partial<FastifyRequest> = {}): FastifyRequest {
  return {
    headers: {},
    url: '/api/v1/users/me',
    method: 'GET',
    ...overrides,
  } as FastifyRequest;
}

function createMockReply(): FastifyReply {
  const sent = { code: 0, payload: null as unknown };
  const reply = {
    code: vi.fn((n: number) => {
      sent.code = n;
      return reply;
    }),
    send: vi.fn((p: unknown) => {
      sent.payload = p;
      return reply;
    }),
    sent,
  };
  return reply as unknown as FastifyReply;
}

describe('auth middleware', () => {
  type DbShape = {
    user: { findUnique: (args: unknown) => Promise<unknown> };
    session: { findUnique: (args: unknown) => Promise<unknown> };
  };
  let mockDb: DbShape;
  let reply: FastifyReply;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      user: { findUnique: vi.fn() },
      session: { findUnique: vi.fn() },
    };
    (getDatabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
    reply = createMockReply();
  });

  it('returns 401 when no token provided', async () => {
    const request = createMockRequest({ headers: {} });
    await authenticateRequest(request, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'No authentication token provided' }));
  });

  it('returns 401 when Authorization header has no Bearer token', async () => {
    const request = createMockRequest({ headers: { authorization: 'Basic x' } });
    await authenticateRequest(request, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
  });

  it('returns 401 when token is invalid or expired', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer invalid-token' },
    });
    await authenticateRequest(request, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid or expired token' }));
  });

  it('returns 401 when user does not exist in DB', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'u@test.com', sessionId: 'sess-1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    mockDb.user.findUnique.mockResolvedValue(null);

    const request = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    await authenticateRequest(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'User not found' }));
  });

  it('returns 403 when user is deactivated', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'u@test.com', sessionId: 'sess-1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@test.com',
      name: 'User',
      isActive: false,
      isEmailVerified: true,
    });

    const request = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    await authenticateRequest(request, reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Account is deactivated' }));
  });

  it('authenticates successfully when session is NOT in user-management DB (auth owns sessions)', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'u@test.com', sessionId: 'sess-from-auth', organizationId: 'org-1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@test.com',
      name: 'User',
      isActive: true,
      isEmailVerified: true,
    });
    mockDb.session.findUnique.mockResolvedValue(null); // session not in our DB

    const request = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    await authenticateRequest(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
    expect((request as any).user).toEqual(
      expect.objectContaining({
        id: 'user-1',
        email: 'u@test.com',
        name: 'User',
        sessionId: 'sess-from-auth',
      })
    );
    expect((request as any).sessionId).toBe('sess-from-auth');
    expect((request as any).organizationId).toBe('org-1');
  });

  it('authenticates successfully when session IS in user-management DB and valid', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'u@test.com', sessionId: 'sess-1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@test.com',
      name: 'User',
      isActive: true,
      isEmailVerified: true,
    });
    const future = new Date(Date.now() + 86400 * 1000);
    mockDb.session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-1',
      organizationId: 'org-1',
      revokedAt: null,
      expiresAt: future,
    });

    const request = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    await authenticateRequest(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
    expect((request as any).user.id).toBe('user-1');
    expect((request as any).organizationId).toBe('org-1');
  });

  it('returns 401 when session is in DB but revoked', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'u@test.com', sessionId: 'sess-1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@test.com',
      name: 'User',
      isActive: true,
      isEmailVerified: true,
    });
    mockDb.session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-1',
      organizationId: 'org-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400 * 1000),
    });

    const request = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    await authenticateRequest(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Session has been revoked' }));
  });

  it('returns 401 when session is in DB but expired', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'u@test.com', sessionId: 'sess-1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@test.com',
      name: 'User',
      isActive: true,
      isEmailVerified: true,
    });
    mockDb.session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-1',
      organizationId: 'org-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    const request = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    await authenticateRequest(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Session has expired' }));
  });

  it('returns 401 when session is in DB but userId does not match', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'u@test.com', sessionId: 'sess-1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@test.com',
      name: 'User',
      isActive: true,
      isEmailVerified: true,
    });
    const future = new Date(Date.now() + 86400 * 1000);
    mockDb.session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'other-user',
      organizationId: 'org-1',
      revokedAt: null,
      expiresAt: future,
    });

    const request = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    await authenticateRequest(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid session' }));
  });

  it('authenticates when token has no sessionId (no session lookup)', async () => {
    const token = jwt.sign(
      { userId: 'user-1', email: 'u@test.com', organizationId: 'org-1' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    mockDb.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'u@test.com',
      name: 'User',
      isActive: true,
      isEmailVerified: true,
    });

    const request = createMockRequest({ headers: { authorization: `Bearer ${token}` } });
    await authenticateRequest(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
    expect((request as any).user.id).toBe('user-1');
    expect((request as any).organizationId).toBe('org-1');
    expect(mockDb.session.findUnique).not.toHaveBeenCalled();
  });
});
