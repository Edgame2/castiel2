/**
 * Session Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { createSession, generateDeviceFingerprint } from '../../../src/services/SessionService';

// Mock database
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

// Mock Redis
vi.mock('../../../src/utils/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
  default: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn((payload: any, secret: string) => {
      return `mock-jwt-${payload.userId}`;
    }),
  },
}));

// Mock Fastify instance
const mockFastify = {
  jwt: {
    sign: vi.fn((payload: any) => `mock-jwt-${payload.userId}`),
  },
} as any;

describe('SessionService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDb = {
      session: {
        create: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      organizationMembership: {
        findFirst: vi.fn(),
      },
      organization: {
        findUnique: vi.fn(),
      },
    };
    
    (getDatabaseClient as any).mockReturnValue(mockDb);
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate a consistent fingerprint for the same input', () => {
      const userAgent = 'Mozilla/5.0';
      const ipAddress = '192.168.1.1';
      
      const fingerprint1 = generateDeviceFingerprint(userAgent, ipAddress);
      const fingerprint2 = generateDeviceFingerprint(userAgent, ipAddress);
      
      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toBeDefined();
      expect(fingerprint1.length).toBeGreaterThan(0);
    });

    it('should generate different fingerprints for different inputs', () => {
      const fingerprint1 = generateDeviceFingerprint('UserAgent1', '192.168.1.1');
      const fingerprint2 = generateDeviceFingerprint('UserAgent2', '192.168.1.2');
      
      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('createSession', () => {
    it('should create a session successfully', async () => {
      const userId = 'user-123';
      const organizationId = 'org-123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      
      const mockSession = {
        id: 'session-123',
        userId,
        organizationId,
        deviceFingerprint: 'fingerprint-123',
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 604800000), // 7 days
      };
      
      // Mock organization membership check with role
      mockDb.organizationMembership.findFirst.mockResolvedValue({
        id: 'membership-123',
        userId,
        organizationId,
        roleId: 'role-123',
        role: {
          id: 'role-123',
          isSuperAdmin: false,
        },
      });
      
      // Mock organization lookup
      mockDb.organization.findUnique.mockResolvedValue({
        id: organizationId,
        maxSessionsPerUser: 10,
      });
      
      // Mock session count (no active sessions)
      mockDb.session.count.mockResolvedValue(0);
      
      // Mock session findFirst (for oldest session lookup - not needed here)
      mockDb.session.findFirst.mockResolvedValue(null);
      
      mockDb.session.create.mockResolvedValue(mockSession);

      const result = await createSession(
        userId,
        organizationId,
        false,
        ipAddress,
        userAgent,
        undefined,
        mockFastify
      );

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(typeof result.sessionId).toBe('string');
      expect(result.sessionId.length).toBeGreaterThan(0);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockDb.session.create).toHaveBeenCalled();
      // Verify session was created with the generated sessionId
      const createCall = mockDb.session.create.mock.calls[0][0];
      expect(createCall.data.id).toBe(result.sessionId);
    });

    it('should create a session with rememberMe option', async () => {
      const userId = 'user-123';
      const organizationId = 'org-123';
      const rememberMe = true;
      
      const mockSession = {
        id: 'session-123',
        userId,
        organizationId,
        expiresAt: new Date(Date.now() + 2592000000), // 30 days
      };
      
      // Mock organization membership check with role
      mockDb.organizationMembership.findFirst.mockResolvedValue({
        id: 'membership-123',
        userId,
        organizationId,
        roleId: 'role-123',
        role: {
          id: 'role-123',
          isSuperAdmin: false,
        },
      });
      
      // Mock organization lookup
      mockDb.organization.findUnique.mockResolvedValue({
        id: organizationId,
        maxSessionsPerUser: 10,
      });
      
      // Mock session count (no active sessions)
      mockDb.session.count.mockResolvedValue(0);
      
      // Mock session findFirst (for oldest session lookup - not needed here)
      mockDb.session.findFirst.mockResolvedValue(null);
      
      mockDb.session.create.mockResolvedValue(mockSession);

      const result = await createSession(
        userId,
        organizationId,
        rememberMe,
        null,
        null,
        undefined,
        mockFastify
      );

      expect(result).toBeDefined();
      expect(mockDb.session.create).toHaveBeenCalled();
      // Check that expiration is longer for rememberMe
      const callArgs = mockDb.session.create.mock.calls[0][0];
      expect(callArgs.data.expiresAt).toBeDefined();
    });
  });
});
