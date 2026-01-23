import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';

/**
 * Phase 5: Enhanced Logout Verification Tests
 * Test Suite 2: Token Revocation After Logout
 * 
 * This test suite verifies:
 * 1. Refresh tokens cannot be reused after logout
 * 2. New login required after full logout
 * 3. Token family revocation on logout
 * 4. Access tokens blacklisted after logout
 * 5. No token leakage after logout
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Token Revocation Tests', () => {
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
      validateStatus: () => true,
    });
  });

  beforeEach(async () => {
    const timestamp = Date.now();
    testUser = {
      email: `token-revoke-test-${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    const registerRes = await client.post('/auth/register', {
      email: testUser.email,
      password: testUser.password,
      name: 'Token Revoke Test User',
    });

    expect(registerRes.status).toBe(201);
    testUser.userId = registerRes.data.user.id;
    testUser.tenantId = registerRes.data.user.tenantId;
  });

  describe('Refresh Token Revocation', () => {
    it('should prevent refresh token reuse after logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken } = loginRes.data;

      // Verify refresh token works before logout
      const refreshBeforeRes = await client.post('/auth/refresh', {
        refreshToken,
      });

      expect(refreshBeforeRes.status).toBe(200);
      expect(refreshBeforeRes.data.accessToken).toBeDefined();

      const newRefreshToken = refreshBeforeRes.data.refreshToken;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Attempt to use old refresh token (should fail)
      const refreshAfterRes1 = await client.post('/auth/refresh', {
        refreshToken,
      });

      expect(refreshAfterRes1.status).toBe(401);
      expect(refreshAfterRes1.data.message || refreshAfterRes1.data.error).toMatch(
        /invalid|expired|revoked/i
      );

      // Attempt to use new refresh token from rotation (should also fail)
      const refreshAfterRes2 = await client.post('/auth/refresh', {
        refreshToken: newRefreshToken,
      });

      expect(refreshAfterRes2.status).toBe(401);
      expect(refreshAfterRes2.data.message || refreshAfterRes2.data.error).toMatch(
        /invalid|expired|revoked/i
      );
    });

    it('should revoke all refresh tokens in token family on logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken: refreshToken1 } = loginRes.data;

      // Rotate refresh token to create family
      const refresh1Res = await client.post('/auth/refresh', {
        refreshToken: refreshToken1,
      });

      expect(refresh1Res.status).toBe(200);
      const refreshToken2 = refresh1Res.data.refreshToken;

      // Rotate again
      const refresh2Res = await client.post('/auth/refresh', {
        refreshToken: refreshToken2,
      });

      expect(refresh2Res.status).toBe(200);
      const refreshToken3 = refresh2Res.data.refreshToken;

      // Now we have a family: refreshToken1 -> refreshToken2 -> refreshToken3

      // Logout with current access token
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify all refresh tokens in family are revoked
      const refresh3Res = await client.post('/auth/refresh', {
        refreshToken: refreshToken3,
      });

      expect(refresh3Res.status).toBe(401);
    });

    it('should require new login after logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify access token no longer works
      const meRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meRes.status).toBe(401);

      // Verify refresh token no longer works
      const refreshRes = await client.post('/auth/refresh', {
        refreshToken,
      });

      expect(refreshRes.status).toBe(401);

      // New login should work
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.data.accessToken).toBeDefined();
      expect(newLoginRes.data.refreshToken).toBeDefined();

      // New tokens should work
      const newMeRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
        },
      });

      expect(newMeRes.status).toBe(200);
      expect(newMeRes.data.email).toBe(testUser.email);
    });

    it('should revoke refresh tokens from all devices on logout', async () => {
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

      // Logout from first device
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${sessions[0].accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

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
  });

  describe('Access Token Blacklisting', () => {
    it('should blacklist access token on logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Verify token works before logout
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

      // Verify token blacklisted (immediate rejection)
      const meAfterRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meAfterRes.status).toBe(401);
      expect(meAfterRes.data.message || meAfterRes.data.error).toMatch(
        /revoked|blacklisted|unauthorized/i
      );
    });

    it('should blacklist all access tokens on multi-device logout', async () => {
      const accessTokens: string[] = [];

      // Login from 3 devices
      for (let i = 0; i < 3; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        accessTokens.push(loginRes.data.accessToken);
      }

      // Logout from first device
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessTokens[0]}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify ALL access tokens blacklisted
      for (const token of accessTokens) {
        const meRes = await client.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        expect(meRes.status).toBe(401);
      }
    });

    it('should reject blacklisted token immediately without JWT verification', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout (blacklist token)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Attempt to use blacklisted token
      // Should be rejected by blacklist check (before JWT verification)
      const startTime = Date.now();
      
      const meRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(meRes.status).toBe(401);

      // Response should be fast (blacklist check, no JWT verification)
      // Typically < 50ms for Redis lookup
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Token Leakage Prevention', () => {
    it('should not leak tokens after logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify no tokens can be used
      const meRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meRes.status).toBe(401);

      const refreshRes = await client.post('/auth/refresh', {
        refreshToken,
      });

      expect(refreshRes.status).toBe(401);

      // Verify logout response doesn't leak token info
      expect(logoutRes.data.accessToken).toBeUndefined();
      expect(logoutRes.data.refreshToken).toBeUndefined();
    });

    it('should not allow token refresh with logged-out user refresh token', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken } = loginRes.data;

      // Rotate refresh token
      const refreshBeforeRes = await client.post('/auth/refresh', {
        refreshToken,
      });

      expect(refreshBeforeRes.status).toBe(200);
      const newRefreshToken = refreshBeforeRes.data.refreshToken;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Attempt to use new refresh token (should fail due to family revocation)
      const refreshAfterRes = await client.post('/auth/refresh', {
        refreshToken: newRefreshToken,
      });

      expect(refreshAfterRes.status).toBe(401);
    });

    it('should prevent token usage after logout across all endpoints', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Test various protected endpoints
      const endpoints = [
        { method: 'get', url: '/auth/me' },
        { method: 'get', url: '/auth/sessions' },
        { method: 'post', url: '/auth/logout' }, // Second logout
      ];

      for (const endpoint of endpoints) {
        const res = await client.request({
          method: endpoint.method,
          url: endpoint.url,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        expect(res.status).toBe(401);
      }
    });
  });

  describe('Token Family Revocation', () => {
    it('should revoke entire token family on logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken: token1 } = loginRes.data;

      // Create token family by rotating
      const refresh1Res = await client.post('/auth/refresh', {
        refreshToken: token1,
      });
      expect(refresh1Res.status).toBe(200);
      const token2 = refresh1Res.data.refreshToken;

      const refresh2Res = await client.post('/auth/refresh', {
        refreshToken: token2,
      });
      expect(refresh2Res.status).toBe(200);
      const token3 = refresh2Res.data.refreshToken;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify entire family revoked
      const refresh3Res = await client.post('/auth/refresh', {
        refreshToken: token3,
      });
      expect(refresh3Res.status).toBe(401);

      // Attempting to use old tokens should also fail
      const refresh1AfterRes = await client.post('/auth/refresh', {
        refreshToken: token1,
      });
      expect(refresh1AfterRes.status).toBe(401);
    });

    it('should handle logout with rotated refresh tokens', async () => {
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

      const token1 = session1Res.data.refreshToken;
      const token2 = session2Res.data.refreshToken;

      // Rotate token1
      const refresh1Res = await client.post('/auth/refresh', {
        refreshToken: token1,
      });
      expect(refresh1Res.status).toBe(200);
      const rotatedToken1 = refresh1Res.data.refreshToken;

      // Logout from first device
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${session1Res.data.accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Verify both original and rotated tokens from device 1 revoked
      const refreshRotatedRes = await client.post('/auth/refresh', {
        refreshToken: rotatedToken1,
      });
      expect(refreshRotatedRes.status).toBe(401);

      // Device 2 tokens should also be revoked (comprehensive logout)
      const refresh2Res = await client.post('/auth/refresh', {
        refreshToken: token2,
      });
      expect(refresh2Res.status).toBe(401);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle refresh attempt with revoked token gracefully', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken } = loginRes.data;

      // Logout (revoke tokens)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Attempt refresh with revoked token
      const refreshRes = await client.post('/auth/refresh', {
        refreshToken,
      });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.data.error).toBeDefined();
      expect(refreshRes.data.message || refreshRes.data.error).toMatch(
        /invalid|expired|revoked/i
      );
    });

    it('should not revoke tokens on failed logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken } = loginRes.data;

      // Attempt logout with invalid token
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: 'Bearer invalid-token-12345',
        },
      });

      expect(logoutRes.status).toBe(401);

      // Verify original tokens still work
      const meRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meRes.status).toBe(200);

      const refreshRes = await client.post('/auth/refresh', {
        refreshToken,
      });

      expect(refreshRes.status).toBe(200);
    });

    it('should handle concurrent refresh attempts after logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Attempt concurrent refresh with revoked token
      const refreshPromises = Array(5).fill(null).map(() =>
        client.post('/auth/refresh', { refreshToken })
      );

      const refreshResults = await Promise.all(refreshPromises);

      // All should fail with 401
      for (const result of refreshResults) {
        expect(result.status).toBe(401);
      }
    });
  });
});
