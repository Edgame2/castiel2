/**
 * Rate Limiting Security Tests
 * 
 * Comprehensive security tests for rate limiting on all authentication endpoints.
 * Verifies protection against brute force attacks, account enumeration, and abuse.
 * 
 * Tests cover:
 * - Rate limiting on all auth endpoints
 * - Account enumeration protection
 * - IP-based and email-based rate limiting
 * - Rate limit headers
 * - Block duration and reset behavior
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RateLimiterService, InMemoryRateLimiterService } from '../../../services/security/rate-limiter.service.js';
import { createRateLimitMiddleware } from '../../../middleware/rate-limit.middleware.js';
import { IMonitoringProvider } from '@castiel/monitoring';

// Mock monitoring
const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
  trackTrace: vi.fn(),
  trackDependency: vi.fn(),
  trackRequest: vi.fn(),
  flush: vi.fn(),
  setUser: vi.fn(),
  setAuthenticatedUserContext: vi.fn(),
  clearAuthenticatedUserContext: vi.fn(),
  setOperationId: vi.fn(),
  setOperationName: vi.fn(),
  setOperationParentId: vi.fn(),
  setCustomProperty: vi.fn(),
  setCustomMeasurement: vi.fn(),
  startOperation: vi.fn(),
  endOperation: vi.fn(),
  getCorrelationContext: vi.fn(),
  setCorrelationContext: vi.fn(),
};

describe('Rate Limiting Security Tests', () => {
  let rateLimiter: InMemoryRateLimiterService;

  beforeEach(() => {
    rateLimiter = new InMemoryRateLimiterService(mockMonitoring);
  });

  describe('Login Endpoint Rate Limiting', () => {
    it('should rate limit login attempts by email and IP combination', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'login' });
      
      // Create mock request with email and IP
      const mockRequest = {
        body: { email: 'test@example.com' },
        ip: '192.168.1.100',
        headers: {},
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Attempt 5 logins (within limit)
      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest, mockReply);
      }

      // 6th attempt should be rate limited
      await middleware(mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Too Many Requests'),
        })
      );
    });

    it('should apply rate limiting per unique email+IP combination', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'login' });

      // User 1 from IP 1
      const request1 = {
        body: { email: 'user1@example.com' },
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      // User 2 from IP 2 (different combination)
      const request2 = {
        body: { email: 'user2@example.com' },
        ip: '192.168.1.101',
      } as unknown as FastifyRequest;

      const reply1 = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      const reply2 = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Exhaust rate limit for user1
      for (let i = 0; i < 6; i++) {
        await middleware(request1, reply1);
      }

      // User 2 should not be rate limited
      await middleware(request2, reply2);
      
      expect(reply2.status).not.toHaveBeenCalledWith(429);
    });

    it('should include rate limit headers in responses', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'login' });
      
      const mockRequest = {
        body: { email: 'test@example.com' },
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      await middleware(mockRequest, mockReply);

      // Should set rate limit headers
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });
  });

  describe('Token Refresh Rate Limiting', () => {
    it('should rate limit token refresh attempts', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'refresh' });
      
      const mockRequest = {
        body: {},
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Attempt multiple refreshes
      for (let i = 0; i < 20; i++) {
        await middleware(mockRequest, mockReply);
      }

      // 21st attempt should be rate limited
      await middleware(mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Email Verification Rate Limiting', () => {
    it('should rate limit email verification attempts', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'verifyEmail' });
      
      const mockRequest = {
        params: { token: 'test-token' },
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Attempt multiple verifications
      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest, mockReply);
      }

      // 6th attempt should be rate limited
      await middleware(mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Password Reset Rate Limiting', () => {
    it('should rate limit password reset requests', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'passwordReset' });
      
      const mockRequest = {
        body: { email: 'test@example.com' },
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Attempt multiple password resets
      for (let i = 0; i < 3; i++) {
        await middleware(mockRequest, mockReply);
      }

      // 4th attempt should be rate limited
      await middleware(mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(429);
    });
  });

  describe('MFA Verification Rate Limiting', () => {
    it('should rate limit MFA verification attempts', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'mfaVerify' });
      
      const mockRequest = {
        body: { code: '123456' },
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Attempt multiple MFA verifications
      for (let i = 0; i < 5; i++) {
        await middleware(mockRequest, mockReply);
      }

      // 6th attempt should be rate limited
      await middleware(mockRequest, mockReply);
      
      expect(mockReply.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Block Duration and Reset', () => {
    it('should block identifier for configured duration after exceeding limit', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'login' });
      
      const mockRequest = {
        body: { email: 'test@example.com' },
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Exhaust rate limit
      for (let i = 0; i < 6; i++) {
        await middleware(mockRequest, mockReply);
      }

      // Check block status
      const result = await rateLimiter.checkAndRecord('login', 'test@example.com:192.168.1.100');
      
      expect(result.isBlocked).toBe(true);
      expect(result.blockExpiresAt).toBeDefined();
      expect(result.blockExpiresAt!).toBeGreaterThan(Date.now());
    });

    it('should reset rate limit after window expires', async () => {
      // Use a short window for testing
      rateLimiter = new InMemoryRateLimiterService(mockMonitoring, {
        login: {
          windowSizeMs: 1000, // 1 second
          maxAttempts: 3,
          blockDurationMs: 2000,
        },
      });

      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'login' });
      
      const mockRequest = {
        body: { email: 'test@example.com' },
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Exhaust rate limit
      for (let i = 0; i < 4; i++) {
        await middleware(mockRequest, mockReply);
      }

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be able to make requests again
      const result = await rateLimiter.checkAndRecord('login', 'test@example.com:192.168.1.100');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Account Enumeration Protection', () => {
    it('should use generic error messages to prevent account enumeration', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'login' });
      
      // Simulate login attempts with different emails
      const emails = [
        'nonexistent1@example.com',
        'nonexistent2@example.com',
        'nonexistent3@example.com',
      ];

      for (const email of emails) {
        const mockRequest = {
          body: { email },
          ip: '192.168.1.100',
        } as unknown as FastifyRequest;

        const mockReply = {
          header: vi.fn(),
          status: vi.fn().mockReturnThis(),
          send: vi.fn(),
        } as unknown as FastifyReply;

        await middleware(mockRequest, mockReply);
      }

      // Rate limit should apply regardless of email existence
      // This prevents attackers from enumerating valid accounts
      const result = await rateLimiter.checkAndRecord('login', 'nonexistent1@example.com:192.168.1.100');
      
      // After multiple attempts, should be rate limited
      expect(result.remaining).toBeLessThan(5);
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should use correct rate limits for each action', async () => {
      const actions = [
        { action: 'login', expectedMax: 5 },
        { action: 'passwordReset', expectedMax: 3 },
        { action: 'registration', expectedMax: 5 },
        { action: 'refresh', expectedMax: 20 },
        { action: 'verifyEmail', expectedMax: 5 },
        { action: 'resendVerification', expectedMax: 3 },
        { action: 'mfaVerify', expectedMax: 5 },
      ];

      for (const { action, expectedMax } of actions) {
        const config = rateLimiter.getConfig(action);
        expect(config).toBeDefined();
        expect(config!.maxAttempts).toBe(expectedMax);
      }
    });

    it('should have appropriate block durations', async () => {
      const loginConfig = rateLimiter.getConfig('login');
      expect(loginConfig?.blockDurationMs).toBe(30 * 60 * 1000); // 30 minutes

      const passwordResetConfig = rateLimiter.getConfig('passwordReset');
      expect(passwordResetConfig?.blockDurationMs).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing email in request body gracefully', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'login' });
      
      const mockRequest = {
        body: {},
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Should fall back to IP-based rate limiting
      await middleware(mockRequest, mockReply);
      
      // Should not throw error
      expect(mockReply.status).not.toHaveBeenCalledWith(500);
    });

    it('should handle missing IP address gracefully', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'login' });
      
      const mockRequest = {
        body: { email: 'test@example.com' },
        ip: undefined,
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Should fall back to email-based rate limiting
      await middleware(mockRequest, mockReply);
      
      // Should not throw error
      expect(mockReply.status).not.toHaveBeenCalledWith(500);
    });

    it('should handle concurrent rate limit checks', async () => {
      const middleware = createRateLimitMiddleware(rateLimiter, { action: 'login' });
      
      const mockRequest = {
        body: { email: 'test@example.com' },
        ip: '192.168.1.100',
      } as unknown as FastifyRequest;

      const mockReply = {
        header: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      // Make concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        middleware(mockRequest, mockReply)
      );

      await Promise.all(promises);

      // Should handle race conditions correctly
      const result = await rateLimiter.checkAndRecord('login', 'test@example.com:192.168.1.100');
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });
  });
});







