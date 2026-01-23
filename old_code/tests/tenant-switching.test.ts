/**
 * Tenant Switching Tests
 * 
 * Tests multi-tenant token isolation and tenant switching flows
 * Phase 4: Tenant Switching & Token Blacklisting
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

describe('Tenant Switching & Token Blacklisting', () => {
  let client: AxiosInstance;
  let user1AccessToken: string;
  let user1RefreshToken: string;
  let tenant1Id: string;
  let tenant2Id: string;
  let userEmail: string;

  beforeAll(() => {
    client = axios.create({
      baseURL: API_URL,
      validateStatus: () => true, // Don't throw on any status
    });
  });

  describe('Tenant Switch Flow', () => {
    it('should successfully switch tenant and issue new tokens', async () => {
      // Setup: Create test user with membership in two tenants
      userEmail = `test-tenant-switch-${Date.now()}@example.com`;
      
      // Register user in tenant1
      const registerRes = await client.post('/auth/register', {
        email: userEmail,
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(registerRes.status).toBe(201);
      tenant1Id = registerRes.data.user.tenantId;
      user1AccessToken = registerRes.data.accessToken;
      user1RefreshToken = registerRes.data.refreshToken;

      // Create second tenant and add user as member
      const tenant2Res = await client.post('/tenants', {
        name: `Test Tenant 2 ${Date.now()}`,
      }, {
        headers: { Authorization: `Bearer ${user1AccessToken}` }
      });

      tenant2Id = tenant2Res.data.id;

      // Switch to tenant2
      const switchRes = await client.post('/auth/switch-tenant', {
        tenantId: tenant2Id,
      }, {
        headers: { Authorization: `Bearer ${user1AccessToken}` }
      });

      expect(switchRes.status).toBe(200);
      expect(switchRes.data).toHaveProperty('accessToken');
      expect(switchRes.data).toHaveProperty('refreshToken');
      expect(switchRes.data.user.tenantId).toBe(tenant2Id);

      // Verify new tokens are different
      expect(switchRes.data.accessToken).not.toBe(user1AccessToken);
      expect(switchRes.data.refreshToken).not.toBe(user1RefreshToken);
    });

    it('should blacklist old access token after tenant switch', async () => {
      // Setup: Login to tenant1
      const loginRes = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const oldAccessToken = loginRes.data.accessToken;
      tenant1Id = loginRes.data.user.tenantId;

      // Switch to tenant2
      const switchRes = await client.post('/auth/switch-tenant', {
        tenantId: tenant2Id,
      }, {
        headers: { Authorization: `Bearer ${oldAccessToken}` }
      });

      expect(switchRes.status).toBe(200);

      // Try to use old token - should be rejected
      const useOldTokenRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${oldAccessToken}` }
      });

      expect(useOldTokenRes.status).toBe(401);
      expect(useOldTokenRes.data.error).toMatch(/revoked|blacklist/i);
    });

    it('should revoke old tenant refresh tokens after switch', async () => {
      // Setup: Login to tenant1
      const loginRes = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const oldRefreshToken = loginRes.data.refreshToken;
      const oldAccessToken = loginRes.data.accessToken;

      // Switch to tenant2
      await client.post('/auth/switch-tenant', {
        tenantId: tenant2Id,
      }, {
        headers: { Authorization: `Bearer ${oldAccessToken}` }
      });

      // Try to use old refresh token - should fail
      const refreshRes = await client.post('/auth/refresh', {
        refreshToken: oldRefreshToken,
      });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.data.message).toMatch(/invalid|expired/i);
    });

    it('should prevent access to tenant1 resources with tenant2 token', async () => {
      // Setup: Get tenant2 token
      const loginRes = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const tenant1Token = loginRes.data.accessToken;

      // Switch to tenant2
      const switchRes = await client.post('/auth/switch-tenant', {
        tenantId: tenant2Id,
      }, {
        headers: { Authorization: `Bearer ${tenant1Token}` }
      });

      const tenant2Token = switchRes.data.accessToken;

      // Try to access tenant1 resource with tenant2 token
      const accessRes = await client.get(`/tenants/${tenant1Id}`, {
        headers: { 
          Authorization: `Bearer ${tenant2Token}`,
          'x-tenant-id': tenant1Id
        }
      });

      expect(accessRes.status).toBe(401);
      expect(accessRes.data.message).toMatch(/tenant/i);
    });

    it('should reject tenant switch if user not member of target tenant', async () => {
      // Setup: Login as user
      const loginRes = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const accessToken = loginRes.data.accessToken;

      // Try to switch to non-existent tenant
      const switchRes = await client.post('/auth/switch-tenant', {
        tenantId: 'non-existent-tenant-id',
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      expect(switchRes.status).toBe(403);
      expect(switchRes.data.message).toMatch(/not a member|forbidden/i);
    });
  });

  describe('Cross-Tenant Token Isolation', () => {
    it('should reject request with x-tenant-id header mismatch', async () => {
      // Setup: Login to tenant1
      const loginRes = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const tenant1Token = loginRes.data.accessToken;
      const tenant1Id = loginRes.data.user.tenantId;

      // Try to access with mismatched tenant header
      const accessRes = await client.get('/auth/me', {
        headers: { 
          Authorization: `Bearer ${tenant1Token}`,
          'x-tenant-id': 'different-tenant-id'
        }
      });

      expect(accessRes.status).toBe(401);
      expect(accessRes.data.message).toMatch(/tenant.*not match/i);
    });

    it('should reject request with route tenant param mismatch', async () => {
      // Setup: Login to tenant1
      const loginRes = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const tenant1Token = loginRes.data.accessToken;

      // Try to access different tenant route
      const accessRes = await client.get('/tenants/different-tenant-id/users', {
        headers: { Authorization: `Bearer ${tenant1Token}` }
      });

      expect(accessRes.status).toBe(401);
      expect(accessRes.data.message).toMatch(/tenant/i);
    });

    it('should enforce tenant isolation on refresh token', async () => {
      // Setup: Login to tenant1
      const loginRes = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const refreshToken = loginRes.data.refreshToken;

      // Try to refresh with wrong tenant context
      const refreshRes = await client.post('/auth/refresh', {
        refreshToken,
      }, {
        headers: { 'x-tenant-id': 'wrong-tenant-id' }
      });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.data.message).toMatch(/tenant/i);
    });
  });

  describe('Session Isolation Per Tenant', () => {
    it('should maintain separate sessions per tenant', async () => {
      // Login to tenant1
      const login1Res = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const tenant1Token = login1Res.data.accessToken;
      const tenant1Id = login1Res.data.user.tenantId;

      // Get sessions for tenant1
      const sessions1Res = await client.get('/auth/sessions', {
        headers: { Authorization: `Bearer ${tenant1Token}` }
      });

      expect(sessions1Res.status).toBe(200);
      const tenant1SessionCount = sessions1Res.data.sessions.length;

      // Switch to tenant2
      const switchRes = await client.post('/auth/switch-tenant', {
        tenantId: tenant2Id,
      }, {
        headers: { Authorization: `Bearer ${tenant1Token}` }
      });

      const tenant2Token = switchRes.data.accessToken;

      // Get sessions for tenant2
      const sessions2Res = await client.get('/auth/sessions', {
        headers: { Authorization: `Bearer ${tenant2Token}` }
      });

      expect(sessions2Res.status).toBe(200);
      
      // Sessions should be isolated (tenant2 should have its own session)
      expect(sessions2Res.data.sessions).toBeDefined();
      expect(sessions2Res.data.sessions.length).toBeGreaterThan(0);
    });

    it('should revoke only target tenant sessions on logout', async () => {
      // Login to tenant1
      const login1Res = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const tenant1Token = login1Res.data.accessToken;

      // Switch to tenant2
      const switchRes = await client.post('/auth/switch-tenant', {
        tenantId: tenant2Id,
      }, {
        headers: { Authorization: `Bearer ${tenant1Token}` }
      });

      const tenant2Token = switchRes.data.accessToken;

      // Logout from tenant2
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${tenant2Token}` }
      });

      expect(logoutRes.status).toBe(200);

      // Tenant2 token should be invalid
      const access2Res = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${tenant2Token}` }
      });

      expect(access2Res.status).toBe(401);
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should rotate refresh token on use', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const oldRefreshToken = loginRes.data.refreshToken;

      // Use refresh token
      const refreshRes = await client.post('/auth/refresh', {
        refreshToken: oldRefreshToken,
      });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.data.refreshToken).toBeDefined();
      expect(refreshRes.data.refreshToken).not.toBe(oldRefreshToken);

      // Old refresh token should be invalid
      const reuseRes = await client.post('/auth/refresh', {
        refreshToken: oldRefreshToken,
      });

      expect(reuseRes.status).toBe(401);
    });

    it('should detect refresh token reuse and revoke family', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: userEmail,
        password: 'SecurePassword123!',
      });

      const refreshToken1 = loginRes.data.refreshToken;

      // Rotate once
      const refresh1Res = await client.post('/auth/refresh', {
        refreshToken: refreshToken1,
      });

      const refreshToken2 = refresh1Res.data.refreshToken;

      // Rotate again
      const refresh2Res = await client.post('/auth/refresh', {
        refreshToken: refreshToken2,
      });

      expect(refresh2Res.status).toBe(200);

      // Try to reuse token1 (should trigger family revocation)
      const reuseRes = await client.post('/auth/refresh', {
        refreshToken: refreshToken1,
      });

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.data.message).toMatch(/reuse detected/i);
    });
  });
});
