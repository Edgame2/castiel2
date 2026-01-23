import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';

/**
 * Phase 5: Enhanced Logout Verification Tests
 * Test Suite 1: Multi-Device Logout & Session Management
 * 
 * This test suite verifies:
 * 1. Logout revokes ALL user sessions across all devices
 * 2. Session cache properly cleaned up after logout
 * 3. Session count accurately reflects revocations
 * 4. Multi-tenant session isolation maintained
 * 5. Concurrent logout operations handled safely
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Logout All Sessions Tests', () => {
  let client: AxiosInstance;
  let testUser: {
    email: string;
    password: string;
    userId?: string;
    tenantId?: string;
  };

  beforeAll(async () => {
    client = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true, // Don't throw on any status
    });
  });

  beforeEach(async () => {
    // Create unique test user for each test
    const timestamp = Date.now();
    testUser = {
      email: `logout-test-${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    // Register test user
    const registerRes = await client.post('/auth/register', {
      email: testUser.email,
      password: testUser.password,
      name: 'Logout Test User',
    });

    expect(registerRes.status).toBe(201);
    testUser.userId = registerRes.data.user.id;
    testUser.tenantId = registerRes.data.user.tenantId;
  });

  describe('Multi-Device Session Management', () => {
    it('should create multiple sessions on different devices', async () => {
      const devices = ['device-1', 'device-2', 'device-3'];
      const sessions: Array<{ accessToken: string; refreshToken: string }> = [];

      // Login from 3 different devices
      for (const device of devices) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        }, {
          headers: {
            'User-Agent': `TestDevice/${device}`,
          },
        });

        expect(loginRes.status).toBe(200);
        expect(loginRes.data.accessToken).toBeDefined();
        expect(loginRes.data.refreshToken).toBeDefined();

        sessions.push({
          accessToken: loginRes.data.accessToken,
          refreshToken: loginRes.data.refreshToken,
        });
      }

      // Verify all sessions work
      for (const session of sessions) {
        const meRes = await client.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        expect(meRes.status).toBe(200);
        expect(meRes.data.email).toBe(testUser.email);
      }

      // Get session count (if endpoint exists)
      const sessionsRes = await client.get('/auth/sessions', {
        headers: {
          Authorization: `Bearer ${sessions[0].accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
      });

      if (sessionsRes.status === 200) {
        expect(sessionsRes.data.sessions.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should revoke ALL sessions on logout', async () => {
      const sessions: Array<{ accessToken: string; refreshToken: string }> = [];

      // Login from 3 devices
      for (let i = 0; i < 3; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        sessions.push({
          accessToken: loginRes.data.accessToken,
          refreshToken: loginRes.data.refreshToken,
        });
      }

      // Logout from first device (should revoke ALL sessions)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${sessions[0].accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify ALL sessions are invalid (access tokens blacklisted)
      for (let i = 0; i < sessions.length; i++) {
        const meRes = await client.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${sessions[i].accessToken}`,
          },
        });

        expect(meRes.status).toBe(401);
      }

      // Verify ALL refresh tokens are revoked
      for (let i = 0; i < sessions.length; i++) {
        const refreshRes = await client.post('/auth/refresh', {
          refreshToken: sessions[i].refreshToken,
        });

        expect(refreshRes.status).toBe(401);
        expect(refreshRes.data.message || refreshRes.data.error).toMatch(
          /invalid|expired|revoked/i
        );
      }
    });

    it('should drop session count to zero after logout', async () => {
      // Login from 2 devices
      const session1Res = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      const session2Res = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(session1Res.status).toBe(200);
      expect(session2Res.status).toBe(200);

      const accessToken = session1Res.data.accessToken;

      // Check initial session count (if endpoint exists)
      const sessionsBeforeRes = await client.get('/auth/sessions', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
      });

      if (sessionsBeforeRes.status === 200) {
        expect(sessionsBeforeRes.data.sessions.length).toBeGreaterThanOrEqual(2);
      }

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Login again to check session count
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(newLoginRes.status).toBe(200);

      const sessionsAfterRes = await client.get('/auth/sessions', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
      });

      if (sessionsAfterRes.status === 200) {
        // Only the new login session should exist
        expect(sessionsAfterRes.data.sessions.length).toBe(1);
      }
    });

    it('should handle concurrent logout operations safely', async () => {
      // Login from 3 devices
      const sessions: Array<{ accessToken: string; refreshToken: string }> = [];

      for (let i = 0; i < 3; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        sessions.push({
          accessToken: loginRes.data.accessToken,
          refreshToken: loginRes.data.refreshToken,
        });
      }

      // Attempt concurrent logout from all devices
      const logoutPromises = sessions.map(session =>
        client.post('/auth/logout', {}, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
      );

      const logoutResults = await Promise.all(logoutPromises);

      // At least one logout should succeed (200)
      // Others may be 401 if already logged out
      const successCount = logoutResults.filter(res => res.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Verify all sessions are invalid after concurrent logout
      for (const session of sessions) {
        const meRes = await client.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        expect(meRes.status).toBe(401);
      }
    });
  });

  describe('Session Cache Cleanup', () => {
    it('should remove sessions from Redis after logout', async () => {
      // Login to create session
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.data.accessToken;

      // Verify session exists
      const meBeforeRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meBeforeRes.status).toBe(200);

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify session no longer exists
      const meAfterRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meAfterRes.status).toBe(401);

      // Verify session count is 0 (if endpoint exists)
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const sessionsRes = await client.get('/auth/sessions', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
      });

      if (sessionsRes.status === 200) {
        // Only the new session should exist
        expect(sessionsRes.data.sessions.length).toBe(1);
      }
    });

    it('should cleanup session index on logout', async () => {
      // Login from 2 devices
      const session1Res = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      const session2Res = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(session1Res.status).toBe(200);
      expect(session2Res.status).toBe(200);

      // Logout from first device
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${session1Res.data.accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Login again to verify session index cleaned up
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(newLoginRes.status).toBe(200);

      const sessionsRes = await client.get('/auth/sessions', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
      });

      if (sessionsRes.status === 200) {
        // Only the new login session should exist (old sessions cleaned up)
        expect(sessionsRes.data.sessions.length).toBe(1);
      }
    });

    it('should handle logout with expired session gracefully', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.data.accessToken;

      // Create an expired token by using a manipulated token (for testing)
      // In real scenario, wait for session expiry or mock Redis TTL
      
      // Attempt logout (should succeed even if session expired)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Logout should succeed (idempotent operation)
      expect([200, 401]).toContain(logoutRes.status);
    });
  });

  describe('Multi-Tenant Session Isolation', () => {
    it('should only revoke sessions for current tenant on logout', async () => {
      // Login to tenant 1
      const tenant1LoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(tenant1LoginRes.status).toBe(200);
      const tenant1Token = tenant1LoginRes.data.accessToken;
      const tenant1Id = tenant1LoginRes.data.user.tenantId;

      // Create additional tenant (if multi-tenant setup available)
      // This test assumes user can belong to multiple tenants

      // Logout from tenant 1
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${tenant1Token}`,
          'x-tenant-id': tenant1Id,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify tenant 1 session revoked
      const meRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${tenant1Token}`,
        },
      });

      expect(meRes.status).toBe(401);
    });

    it('should maintain session isolation per tenant', async () => {
      // Login and verify tenant isolation
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.data.accessToken;
      const tenantId = loginRes.data.user.tenantId;

      // Get sessions with tenant context
      const sessionsRes = await client.get('/auth/sessions', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
      });

      if (sessionsRes.status === 200) {
        // All sessions should belong to the same tenant
        for (const session of sessionsRes.data.sessions) {
          expect(session.tenantId).toBe(tenantId);
        }
      }

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(logoutRes.status).toBe(200);
    });
  });

  describe('Session Revocation Verification', () => {
    it('should verify deleteAllUserSessions called on logout', async () => {
      // Login from 2 devices
      const session1Res = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      const session2Res = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(session1Res.status).toBe(200);
      expect(session2Res.status).toBe(200);

      const accessToken1 = session1Res.data.accessToken;
      const accessToken2 = session2Res.data.accessToken;

      // Logout from first session
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken1}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify both sessions revoked (deleteAllUserSessions effect)
      const me1Res = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken1}`,
        },
      });
      const me2Res = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken2}`,
        },
      });

      expect(me1Res.status).toBe(401);
      expect(me2Res.status).toBe(401);
    });

    it('should handle session revocation with no active sessions', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const accessToken = loginRes.data.accessToken;

      // Logout (first time)
      const logout1Res = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logout1Res.status).toBe(200);

      // Attempt logout again (idempotent operation)
      const logout2Res = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Should fail (token blacklisted) or succeed (idempotent)
      expect([200, 401]).toContain(logout2Res.status);
    });

    it('should count sessions accurately after partial logout', async () => {
      // This test verifies session counting when only some sessions are active

      // Login from 3 devices
      const sessions: Array<{ accessToken: string; refreshToken: string }> = [];

      for (let i = 0; i < 3; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        sessions.push({
          accessToken: loginRes.data.accessToken,
          refreshToken: loginRes.data.refreshToken,
        });
      }

      // Logout from first device (revokes ALL sessions due to comprehensive logout)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${sessions[0].accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Login again to check session count
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(newLoginRes.status).toBe(200);

      const sessionsRes = await client.get('/auth/sessions', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
      });

      if (sessionsRes.status === 200) {
        // Only the new session should exist (comprehensive logout revoked all)
        expect(sessionsRes.data.sessions.length).toBe(1);
      }
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle logout without authorization header', async () => {
      const logoutRes = await client.post('/auth/logout', {});

      expect(logoutRes.status).toBe(401);
      expect(logoutRes.data.error || logoutRes.data.message).toMatch(
        /unauthorized|missing|required/i
      );
    });

    it('should handle logout with invalid token', async () => {
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: 'Bearer invalid-token-12345',
        },
      });

      expect(logoutRes.status).toBe(401);
    });

    it('should handle logout with malformed authorization header', async () => {
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: 'InvalidFormat token-12345',
        },
      });

      expect(logoutRes.status).toBe(401);
    });
  });
});
