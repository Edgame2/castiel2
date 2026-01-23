/**
 * Password Reset Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDatabaseClient } from '@coder/shared';
import { requestPasswordReset, resetPasswordWithToken, validateResetToken } from '../../../src/services/PasswordResetService';

// Mock database
vi.mock('@coder/shared', () => ({
  getDatabaseClient: vi.fn(),
}));

// Mock Redis - hibp is mocked globally in tests/setup.ts
vi.mock('../../../src/utils/redis', () => {
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(3600),
  };
  
  return {
    redis: mockRedis,
    default: mockRedis,
  };
});

// Mock event publisher
vi.mock('../../../src/events/publishers/AuthEventPublisher', () => ({
  publishEventSafely: vi.fn(),
}));

// Mock password history service
vi.mock('../../../src/services/PasswordHistoryService', () => ({
  setPassword: vi.fn().mockResolvedValue(undefined),
}));

describe('PasswordResetService', () => {
  let mockDb: any;
  let mockRedis: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked redis
    const redisModule = await import('../../../src/utils/redis');
    mockRedis = redisModule.redis;
    
    // Reset mock implementations
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(3600);
    
    mockDb = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    
    (getDatabaseClient as any).mockReturnValue(mockDb);
  });

  describe('requestPasswordReset', () => {
    it('should create a reset token for a valid user', async () => {
      const email = 'test@example.com';
      const userId = 'user-123';
      
      // Mock rate limit check (first request)
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.expire.mockResolvedValueOnce(1);
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isActive: true,
        passwordHash: 'hashed-password',
      });
      
      mockRedis.setex.mockResolvedValue('OK');

      const result = await requestPasswordReset(email);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        select: {
          id: true,
          email: true,
          isActive: true,
          passwordHash: true,
        },
      });
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return null for non-existent user (security)', async () => {
      const email = 'nonexistent@example.com';
      
      // Mock rate limit check
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.expire.mockResolvedValueOnce(1);
      
      mockDb.user.findUnique.mockResolvedValue(null);

      const result = await requestPasswordReset(email);

      expect(result).toBeNull();
      expect(mockDb.user.findUnique).toHaveBeenCalled();
      // Should still increment rate limit for security
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('should return null for inactive user', async () => {
      const email = 'inactive@example.com';
      const userId = 'user-123';
      
      // Mock rate limit check
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.expire.mockResolvedValueOnce(1);
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isActive: false,
        passwordHash: 'hashed-password',
      });

      const result = await requestPasswordReset(email);

      expect(result).toBeNull();
    });

    it('should return null for user without password (OAuth-only)', async () => {
      const email = 'oauth@example.com';
      const userId = 'user-123';
      
      // Mock rate limit check
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.expire.mockResolvedValueOnce(1);
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        isActive: true,
        passwordHash: null,
      });

      const result = await requestPasswordReset(email);

      expect(result).toBeNull();
    });

    it('should throw error if rate limit exceeded', async () => {
      const email = 'test@example.com';
      
      // Mock rate limit exceeded
      mockRedis.incr.mockResolvedValueOnce(4); // Exceeds MAX_REQUESTS_PER_HOUR (3)
      mockRedis.expire.mockResolvedValueOnce(1);
      mockRedis.ttl.mockResolvedValueOnce(1800); // 30 minutes

      await expect(requestPasswordReset(email)).rejects.toThrow('Too many password reset requests');
    });
  });

  describe('resetPasswordWithToken', () => {
    it('should reset password with valid token', async () => {
      const token = 'a'.repeat(64); // Valid token length
      const userId = 'user-123';
      const email = 'test@example.com';
      const newPassword = 'NewPassword123!';
      
      // Mock token validation
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({
        userId,
        email,
        createdAt: new Date().toISOString(),
      }));
      
      // Mock user lookup
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        firstName: 'Test',
        lastName: 'User',
      });
      
      // Mock token deletion
      mockRedis.del.mockResolvedValueOnce(1);
      
      // Mock rate limit clearing
      mockRedis.del.mockResolvedValueOnce(1);

      await resetPasswordWithToken(token, newPassword);

      expect(mockRedis.get).toHaveBeenCalled();
      expect(mockDb.user.findUnique).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled(); // Token should be deleted
    });

    it('should reject invalid token', async () => {
      const token = 'invalid-token';
      
      mockRedis.get.mockResolvedValue(null);

      await expect(resetPasswordWithToken(token, 'NewPassword123!')).rejects.toThrow('Invalid or expired reset token');
    });

    it('should reject expired token', async () => {
      const token = 'a'.repeat(64);
      
      mockRedis.get.mockResolvedValue(null);

      await expect(resetPasswordWithToken(token, 'NewPassword123!')).rejects.toThrow('Invalid or expired reset token');
    });

    it('should reject token with wrong length', async () => {
      const token = 'short-token';
      
      // validateResetToken checks length first
      const result = await validateResetToken(token);
      expect(result).toBeNull();
    });
  });

  describe('validateResetToken', () => {
    it('should validate a valid token', async () => {
      const token = 'a'.repeat(64);
      const userId = 'user-123';
      const email = 'test@example.com';
      
      mockRedis.get.mockResolvedValue(JSON.stringify({
        userId,
        email,
        createdAt: new Date().toISOString(),
      }));

      const result = await validateResetToken(token);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.email).toBe(email);
    });

    it('should return null for invalid token', async () => {
      const token = 'a'.repeat(64);
      
      mockRedis.get.mockResolvedValue(null);

      const result = await validateResetToken(token);

      expect(result).toBeNull();
    });

    it('should return null for token with wrong length', async () => {
      const token = 'short-token';

      const result = await validateResetToken(token);

      expect(result).toBeNull();
    });
  });
});
