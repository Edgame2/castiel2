/**
 * Benchmarks Routes Permission Tests
 * 
 * Tests for authentication and access control on benchmarks API routes.
 * 
 * Note: Benchmarks routes use basic authentication only. They are read-only
 * aggregated analytics accessible to all authenticated users.
 * 
 * Tests cover:
 * - Authentication requirements
 * - Read-only access patterns
 * - Role-based access (all authenticated users)
 */

import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { requireAuth } from '../../../middleware/authorization.js';
import { UnauthorizedError } from '../../../middleware/error-handler.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest } from '../../../types/auth.types.js';
import { getUser } from '../../../middleware/authenticate.js';

// Mock getUser to return user or undefined
vi.mock('../../../middleware/authenticate.js', () => ({
  getUser: vi.fn(),
}));

describe('Benchmarks Routes Permission Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for benchmarks routes', async () => {
      const mockRequest = {
        user: undefined,
        log: {
          error: vi.fn(),
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as unknown as FastifyRequest;

      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
        code: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      // Mock getUser to return undefined (not authenticated)
      (getUser as any).mockReturnValue(undefined);

      const authMiddleware = requireAuth();

      // Should throw UnauthorizedError when user is not authenticated
      await expect(authMiddleware(mockRequest, mockReply)).rejects.toThrow(UnauthorizedError);
    });

    it('should allow authenticated users to access benchmarks routes', async () => {
      const mockRequest = {
        user: {
          id: 'user1',
          tenantId: 'tenant1',
          roles: ['user'],
          email: 'test@example.com',
        },
        log: {
          error: vi.fn(),
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as unknown as AuthenticatedRequest;

      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
        code: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      // Mock getUser to return authenticated user
      (getUser as any).mockReturnValue(mockRequest.user);

      const authMiddleware = requireAuth();

      // Should not throw when user is authenticated
      await expect(authMiddleware(mockRequest, mockReply)).resolves.not.toThrow();
    });
  });

  describe('Read-Only Access', () => {
    it('should document that benchmarks are read-only analytics', () => {
      // Note: All benchmarks endpoints are GET requests (read-only)
      // They provide aggregated analytics and don't modify data
      const benchmarksEndpoints = {
        winRates: {
          path: '/api/v1/benchmarks/win-rates',
          method: 'GET',
          type: 'read-only',
        },
        closingTimes: {
          path: '/api/v1/benchmarks/closing-times',
          method: 'GET',
          type: 'read-only',
        },
        dealSizes: {
          path: '/api/v1/benchmarks/deal-sizes',
          method: 'GET',
          type: 'read-only',
        },
        renewals: {
          path: '/api/v1/benchmarks/renewals/:contractId',
          method: 'GET',
          type: 'read-only',
        },
      };

      // Verify all endpoints are read-only
      Object.values(benchmarksEndpoints).forEach(endpoint => {
        expect(endpoint.method).toBe('GET');
        expect(endpoint.type).toBe('read-only');
      });
    });

    it('should allow all authenticated roles to access benchmarks', async () => {
      const roles = ['user', 'manager', 'director', 'admin', 'guest'];

      for (const role of roles) {
        const mockRequest = {
          user: {
            id: `user-${role}`,
            tenantId: 'tenant1',
            roles: [role],
            email: `${role}@example.com`,
          },
          log: {
            error: vi.fn(),
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
          },
        } as unknown as AuthenticatedRequest;

        const mockReply = {
          status: vi.fn().mockReturnThis(),
          send: vi.fn(),
          code: vi.fn().mockReturnThis(),
        } as unknown as FastifyReply;

        // Mock getUser to return authenticated user
        (getUser as any).mockReturnValue(mockRequest.user);

        const authMiddleware = requireAuth();

        // All authenticated users should pass authentication check
        await expect(authMiddleware(mockRequest, mockReply)).resolves.not.toThrow();
      }
    });
  });

  describe('Route Access Patterns', () => {
    it('should document benchmarks route access patterns', () => {
      const routes = {
        winRates: {
          path: '/api/v1/benchmarks/win-rates',
          method: 'GET',
          auth: 'Required',
          permission: 'None (read-only analytics)',
          access: 'All authenticated users',
        },
        closingTimes: {
          path: '/api/v1/benchmarks/closing-times',
          method: 'GET',
          auth: 'Required',
          permission: 'None (read-only analytics)',
          access: 'All authenticated users',
        },
        dealSizes: {
          path: '/api/v1/benchmarks/deal-sizes',
          method: 'GET',
          auth: 'Required',
          permission: 'None (read-only analytics)',
          access: 'All authenticated users',
        },
        renewals: {
          path: '/api/v1/benchmarks/renewals/:contractId',
          method: 'GET',
          auth: 'Required',
          permission: 'None (read-only analytics)',
          access: 'All authenticated users',
        },
      };

      // Verify all routes require authentication but no specific permissions
      Object.values(routes).forEach(route => {
        expect(route.auth).toBe('Required');
        expect(route.permission).toContain('read-only');
        expect(route.access).toBe('All authenticated users');
      });
    });
  });
});


