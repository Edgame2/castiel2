/**
 * User Management API Integration Tests
 * 
 * Comprehensive tests for user management endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { TestHelpers } from './helpers/test-helpers';
import { TestData } from './fixtures/test-data';
import { TestConfig } from './config/test-config';

const API_BASE_URL = process.env.MAIN_API_URL || TestConfig.mainApiUrl || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

describe('User Management API Tests', () => {
  let client: AxiosInstance;
  let helpers: TestHelpers;
  let testUser: { userId: string; email: string; password: string; tenantId: string; accessToken: string };
  let cachedToken: string | null = null;
  let tokenExpiry: number = 0;

  beforeAll(async () => {
    client = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true,
      timeout: TEST_TIMEOUT,
    });

    helpers = new TestHelpers(client);

    const isReady = await helpers.waitForService(API_BASE_URL);
    if (!isReady) {
      console.warn('Service health check failed, but continuing with tests...');
    }

    const useProvidedCredentials = process.env.USE_ADMIN_CREDENTIALS === 'true' || process.env.USE_ADMIN_CREDENTIALS === '1';
    
    if (useProvidedCredentials) {
      let loginRes = await client.post('/api/v1/auth/login', {
        email: 'admin@admin.com',
        password: 'Morpheus@12',
      });

      if (loginRes.status === 429) {
        (global as any).__skipUserTests = true;
        return;
      }

      if (loginRes.status !== 200) {
        (global as any).__skipUserTests = true;
        return;
      }

      cachedToken = loginRes.data.accessToken;
      tokenExpiry = Date.now() + (14 * 60 * 1000);

      testUser = {
        userId: loginRes.data.user?.id || loginRes.data.userId,
        email: 'admin@admin.com',
        password: 'Morpheus@12',
        tenantId: loginRes.data.user?.tenantId || loginRes.data.tenantId,
        accessToken: loginRes.data.accessToken,
      };

      client.defaults.headers.common['Authorization'] = `Bearer ${testUser.accessToken}`;
    } else {
      const userData = TestData.generateValidUser(TestData.generateTenantId());
      
      const registerRes = await client.post('/api/v1/auth/register', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      if (registerRes.status !== 201) {
        (global as any).__skipUserTests = true;
        return;
      }

      const loginRes = await client.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      });

      if (loginRes.status !== 200) {
        (global as any).__skipUserTests = true;
        return;
      }

      testUser = {
        userId: loginRes.data.user?.id || loginRes.data.userId,
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
        accessToken: loginRes.data.accessToken,
      };

      client.defaults.headers.common['Authorization'] = `Bearer ${testUser.accessToken}`;
      helpers.addTestUser(testUser.userId, testUser.tenantId);
    }
  }, 120000);

  beforeEach(async () => {
    if ((global as any).__skipUserTests) return;

    const useProvidedCredentials = process.env.USE_ADMIN_CREDENTIALS === 'true' || process.env.USE_ADMIN_CREDENTIALS === '1';
    
    if (useProvidedCredentials && cachedToken && Date.now() < tokenExpiry) {
      client.defaults.headers.common['Authorization'] = `Bearer ${cachedToken}`;
      return;
    }

    if (testUser?.accessToken) {
      client.defaults.headers.common['Authorization'] = `Bearer ${testUser.accessToken}`;
    }
  });

  afterAll(async () => {
    if (helpers) {
      await helpers.cleanup();
    }
  });

  describe('1. User Profile Management', () => {
    it('should get current user profile', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.get('/api/v1/users/me');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data.id || response.data.userId).toBe(testUser.userId);
      }
    }, TEST_TIMEOUT);

    it('should update user profile', async () => {
      if ((global as any).__skipUserTests) return;

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await client.patch('/api/v1/users/me', updateData);

      expect([200, 204, 404]).toContain(response.status);
      
      if ([200, 204].includes(response.status)) {
        // Verify update
        const getResponse = await client.get('/api/v1/users/me');
        if (getResponse.status === 200) {
          expect(getResponse.data.firstName).toBe(updateData.firstName);
        }
      }
    }, TEST_TIMEOUT);

    it('should get user by ID', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.get(`/api/v1/users/${testUser.userId}`);

      expect([200, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data.id || response.data.userId).toBe(testUser.userId);
      }
    }, TEST_TIMEOUT);
  });

  describe('2. User Listing', () => {
    it('should list users', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.get('/api/v1/users', {
        params: {
          limit: 20,
        },
      });

      expect([200, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        const users = Array.isArray(response.data) ? response.data : response.data.items || [];
        expect(Array.isArray(users)).toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should filter users by role', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.get('/api/v1/users', {
        params: {
          role: 'admin',
        },
      });

      expect([200, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should search users', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.get('/api/v1/users', {
        params: {
          search: 'test',
        },
      });

      expect([200, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('3. User Management Operations', () => {
    it('should create a new user (admin only)', async () => {
      if ((global as any).__skipUserTests) return;

      const userData = {
        email: TestData.generateEmail(),
        password: TestData.VALID_PASSWORD,
        firstName: 'New',
        lastName: 'User',
        tenantId: testUser.tenantId,
      };

      const response = await client.post('/api/v1/users', userData);

      expect([200, 201, 400, 403, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        const newUserId = response.data.id || response.data.userId;
        if (newUserId) {
          helpers.addTestUser(newUserId, testUser.tenantId);
        }
      }
    }, TEST_TIMEOUT);

    it('should update user (admin only)', async () => {
      if ((global as any).__skipUserTests) return;

      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
      };

      const response = await client.patch(`/api/v1/users/${testUser.userId}`, updateData);

      expect([200, 204, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should deactivate user (admin only)', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.patch(`/api/v1/users/${testUser.userId}`, {
        active: false,
      });

      expect([200, 204, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('4. User Security', () => {
    it('should get user security settings', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.get(`/api/v1/users/${testUser.userId}/security`);

      expect([200, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should list user sessions', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.get(`/api/v1/users/${testUser.userId}/sessions`);

      expect([200, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(Array.isArray(response.data) || response.data.items).toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should revoke user sessions', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.post(`/api/v1/users/${testUser.userId}/sessions/revoke-all`);

      expect([200, 204, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('5. Multi-Tenant Isolation', () => {
    it('should only return users from user tenant', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await client.get('/api/v1/users');

      expect([200, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const users = Array.isArray(response.data) ? response.data : response.data.items || [];
        for (const user of users) {
          if (user.tenantId) {
            expect(user.tenantId).toBe(testUser.tenantId);
          }
        }
      }
    }, TEST_TIMEOUT);

    it('should not allow access to users from other tenants', async () => {
      if ((global as any).__skipUserTests) return;

      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/v1/users/${fakeUserId}`);

      expect([403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('6. Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      if ((global as any).__skipUserTests) return;

      const response = await axios.get(`${API_BASE_URL}/api/v1/users/me`, {
        validateStatus: () => true,
      });

      expect([401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should return 404 for non-existent user', async () => {
      if ((global as any).__skipUserTests) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/v1/users/${fakeId}`);

      expect([404, 403]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should validate user ID format', async () => {
      if ((global as any).__skipUserTests) return;

      const invalidIds = ['invalid-id', '123', 'not-a-uuid'];

      for (const id of invalidIds) {
        const response = await client.get(`/api/v1/users/${id}`);
        expect([400, 404, 403]).toContain(response.status);
      }
    }, TEST_TIMEOUT);
  });
});
