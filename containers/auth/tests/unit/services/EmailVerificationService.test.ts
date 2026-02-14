/**
 * Email Verification Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { sendVerificationEmail, verifyEmailWithToken } from '../../../src/services/EmailVerificationService';

// Mock database
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

// Mock Redis
vi.mock('../../../src/utils/redis', () => ({
  redis: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock event publisher
vi.mock('../../../src/events/publishers/AuthEventPublisher', () => ({
  publishEventSafely: vi.fn(),
  createBaseEvent: vi.fn((type, userId, tenantId, metadata, data) => ({
    type,
    userId,
    tenantId,
    metadata,
    data,
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: 'auth-service',
  })),
}));

// Mock logging service
vi.mock('../../../src/services/LoggingService', () => ({
  getLoggingService: vi.fn(() => ({
    logFromRequest: vi.fn(async () => {}),
  })),
}));

describe('EmailVerificationService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDb = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      emailVerificationToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
    };
    
    (getDatabaseClient as any).mockReturnValue(mockDb);
  });

  describe('sendVerificationEmail', () => {
    it('should create a verification token for a valid user', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isEmailVerified: false,
        isActive: true,
      });

      const { redis } = await import('../../../src/utils/redis');
      vi.mocked(redis.setex).mockResolvedValue('OK');

      const result = await sendVerificationEmail(userId);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string'); // Returns token string
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { email: true, isEmailVerified: true },
      });
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'nonexistent-user';
      
      mockDb.user.findUnique.mockResolvedValue(null);

      await expect(sendVerificationEmail(userId)).rejects.toThrow('User not found');
    });

    it('should throw error for already verified email', async () => {
      const userId = 'user-123';
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        isEmailVerified: true,
      });

      await expect(sendVerificationEmail(userId)).rejects.toThrow('Email is already verified');
    });
  });

  describe('verifyEmailWithToken', () => {
    it('should verify email with valid token', async () => {
      const token = 'valid-verification-token';
      const userId = 'user-123';
      
      const { redis } = await import('../../../src/utils/redis');
      const tokenData = JSON.stringify({
        userId,
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
      });
      
      vi.mocked(redis.get).mockResolvedValue(tokenData);
      vi.mocked(redis.del).mockResolvedValue(1);
      
      mockDb.user.update.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        isEmailVerified: true,
      });

      const result = await verifyEmailWithToken(userId, token);

      expect(result).toBe(true); // Returns boolean
      expect(redis.get).toHaveBeenCalled();
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isEmailVerified: true },
      });
      expect(redis.del).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';
      const userId = 'user-123';
      
      const { redis } = await import('../../../src/utils/redis');
      vi.mocked(redis.get).mockResolvedValue(null);

      await expect(verifyEmailWithToken(userId, token)).rejects.toThrow('Invalid or expired');
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });
  });
});

