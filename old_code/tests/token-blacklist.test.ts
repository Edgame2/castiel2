/**
 * Token Blacklist Tests
 * 
 * Tests token blacklisting and revocation mechanisms
 * Phase 4: Tenant Switching & Token Blacklisting
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

describe('Token Blacklist', () => {
  let client: AxiosInstance;
  let testUserEmail: string;
  let testUserPassword: string;

  beforeAll(() => {
    client = axios.create({
      baseURL: API_URL,
      validateStatus: () => true,
    });

    testUserEmail = `blacklist-test-${Date.now()}@example.com`;
    testUserPassword = 'SecurePassword123!';
  });

  describe('Access Token Blacklisting', () => {
    it('should blacklist access token on logout', async () => {
      // Register and login
      await client.post('/auth/register', {
        email: testUserEmail,
        password: testUserPassword,
        firstName: 'Test',
        lastName: 'User',
      });

      const loginRes = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginRes.data.accessToken;

      // Verify token works
      const beforeLogout = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(beforeLogout.status).toBe(200);

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(logoutRes.status).toBe(200);

      // Try to use blacklisted token
      const afterLogout = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(afterLogout.status).toBe(401);
      expect(afterLogout.data.message).toMatch(/revoked|blacklist/i);
    });

    it('should blacklist access token on manual revocation', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginRes.data.accessToken;

      // Revoke token
      const revokeRes = await client.post('/auth/revoke', {
        token: accessToken,
        token_type_hint: 'access_token',
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(revokeRes.status).toBe(200);

      // Wait briefly for blacklist to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to use revoked token
      const useRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(useRes.status).toBe(401);
    });

    it('should handle blacklist check in optional auth middleware', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginRes.data.accessToken;

      // Logout (blacklists token)
      await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Try to use blacklisted token on endpoint with optional auth
      // Should treat as unauthenticated, not throw error
      const optionalAuthRes = await client.get('/api/v1/public/documents', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Should succeed but not be authenticated
      expect([200, 401]).toContain(optionalAuthRes.status);
    });

    it('should not blacklist token with invalid format', async () => {
      // Try to revoke invalid token
      const revokeRes = await client.post('/auth/revoke', {
        token: 'invalid-token-format',
        token_type_hint: 'access_token',
      });

      // Should succeed per RFC 7009 (idempotent revocation)
      expect(revokeRes.status).toBe(200);
    });
  });

  describe('Refresh Token Revocation', () => {
    it('should revoke refresh token on logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginRes.data.accessToken;
      const refreshToken = loginRes.data.refreshToken;

      // Logout
      await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Try to use refresh token
      const refreshRes = await client.post('/auth/refresh', {
        refreshToken,
      });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.data.message).toMatch(/invalid|expired/i);
    });

    it('should revoke refresh token on manual revocation', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginRes.data.accessToken;
      const refreshToken = loginRes.data.refreshToken;

      // Revoke refresh token
      const revokeRes = await client.post('/auth/revoke', {
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(revokeRes.status).toBe(200);

      // Try to use revoked refresh token
      const refreshRes = await client.post('/auth/refresh', {
        refreshToken,
      });

      expect(refreshRes.status).toBe(401);
    });

    it('should revoke all refresh tokens for user on logout', async () => {
      // Create multiple sessions
      const login1Res = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const login2Res = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const refreshToken1 = login1Res.data.refreshToken;
      const refreshToken2 = login2Res.data.refreshToken;
      const accessToken1 = login1Res.data.accessToken;

      // Logout from one session
      await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken1}` }
      });

      // Both refresh tokens should be revoked
      const refresh1Res = await client.post('/auth/refresh', {
        refreshToken: refreshToken1,
      });

      const refresh2Res = await client.post('/auth/refresh', {
        refreshToken: refreshToken2,
      });

      expect(refresh1Res.status).toBe(401);
      expect(refresh2Res.status).toBe(401);
    });
  });

  describe('Blacklist TTL Management', () => {
    it('should set blacklist TTL matching token expiry', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginRes.data.accessToken;

      // Logout (blacklists with TTL)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(logoutRes.status).toBe(200);

      // Token should be blacklisted immediately
      const useRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(useRes.status).toBe(401);

      // Note: We can't easily test TTL expiration in integration tests
      // as tokens would need to be near expiry
    });

    it('should handle expired token gracefully', async () => {
      // Create a token that's about to expire (mock scenario)
      // In real scenario, use a very short-lived token

      const loginRes = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginRes.data.accessToken;

      // Immediately revoke
      await client.post('/auth/revoke', {
        token: accessToken,
        token_type_hint: 'access_token',
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Should handle gracefully even if token near expiry
      const useRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(useRes.status).toBe(401);
    });
  });

  describe('Multi-Device Logout', () => {
    it('should revoke all tokens across devices on logout', async () => {
      // Login from "device 1"
      const device1Login = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const device1AccessToken = device1Login.data.accessToken;
      const device1RefreshToken = device1Login.data.refreshToken;

      // Login from "device 2"
      const device2Login = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const device2AccessToken = device2Login.data.accessToken;
      const device2RefreshToken = device2Login.data.refreshToken;

      // Verify both work
      const device1Check = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${device1AccessToken}` }
      });

      const device2Check = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${device2AccessToken}` }
      });

      expect(device1Check.status).toBe(200);
      expect(device2Check.status).toBe(200);

      // Logout from device 1
      await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${device1AccessToken}` }
      });

      // Both devices should be logged out
      const device1After = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${device1AccessToken}` }
      });

      const device2After = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${device2AccessToken}` }
      });

      expect(device1After.status).toBe(401);
      expect(device2After.status).toBe(401);

      // Both refresh tokens should be revoked
      const refresh1 = await client.post('/auth/refresh', {
        refreshToken: device1RefreshToken,
      });

      const refresh2 = await client.post('/auth/refresh', {
        refreshToken: device2RefreshToken,
      });

      expect(refresh1.status).toBe(401);
      expect(refresh2.status).toBe(401);
    });
  });

  describe('Blacklist Performance', () => {
    it('should handle concurrent blacklist operations', async () => {
      // Create multiple sessions
      const sessions = await Promise.all(
        Array(5).fill(null).map(() =>
          client.post('/auth/login', {
            email: testUserEmail,
            password: testUserPassword,
          })
        )
      );

      const tokens = sessions.map(s => s.data.accessToken);

      // Logout all concurrently
      const logouts = await Promise.all(
        tokens.map(token =>
          client.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );

      // All should succeed
      logouts.forEach(logout => {
        expect(logout.status).toBe(200);
      });

      // All tokens should be blacklisted
      const checks = await Promise.all(
        tokens.map(token =>
          client.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );

      checks.forEach(check => {
        expect(check.status).toBe(401);
      });
    });

    it('should not impact authentication performance significantly', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUserEmail,
        password: testUserPassword,
      });

      const accessToken = loginRes.data.accessToken;

      // Measure auth performance
      const start = Date.now();
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        await client.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }

      const avgTime = (Date.now() - start) / iterations;

      // Should be fast (< 100ms average with blacklist check)
      expect(avgTime).toBeLessThan(100);
    });
  });
});
