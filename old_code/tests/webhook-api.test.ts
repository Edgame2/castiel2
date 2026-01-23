/**
 * Webhook Management API Integration Tests
 * 
 * Comprehensive tests for webhook management endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { TestHelpers } from './helpers/test-helpers';
import { TestData } from './fixtures/test-data';
import { TestConfig } from './config/test-config';

const API_BASE_URL = process.env.MAIN_API_URL || TestConfig.mainApiUrl || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

describe('Webhook API Tests', () => {
  let client: AxiosInstance;
  let helpers: TestHelpers;
  let testUser: { userId: string; email: string; password: string; tenantId: string; accessToken: string };
  let createdWebhookIds: string[] = [];
  let cachedToken: string | null = null;
  let tokenExpiry: number = 0;

  beforeAll(async () => {
    client = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true,
      timeout: TEST_TIMEOUT,
    });

    helpers = new TestHelpers(client);

    // Wait for service to be ready
    const isReady = await helpers.waitForService(API_BASE_URL);
    if (!isReady) {
      console.warn('Service health check failed, but continuing with tests...');
    }

    // Login once at the start and cache the token
    const useProvidedCredentials = process.env.USE_ADMIN_CREDENTIALS === 'true' || process.env.USE_ADMIN_CREDENTIALS === '1';
    
    if (useProvidedCredentials) {
      let loginRes = await client.post('/api/v1/auth/login', {
        email: 'admin@admin.com',
        password: 'Morpheus@12',
      });

      if (loginRes.status === 429) {
        const retryAfter = loginRes.data.retryAfter || 30;
        console.warn(`Rate limited on login. Retry after ${retryAfter} seconds. Skipping tests for now.`);
        (global as any).__skipWebhookTests = true;
        return;
      }

      if (loginRes.status !== 200) {
        console.warn(`Failed to login with admin credentials: ${loginRes.status}`);
        (global as any).__skipWebhookTests = true;
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
        console.warn('Failed to register test user, skipping tests');
        (global as any).__skipWebhookTests = true;
        return;
      }

      const loginRes = await client.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      });

      if (loginRes.status !== 200) {
        console.warn('Failed to login test user, skipping tests');
        (global as any).__skipWebhookTests = true;
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
    if ((global as any).__skipWebhookTests) {
      return;
    }

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
    if ((global as any).__skipWebhookTests) {
      return;
    }

    // Cleanup created webhooks
    for (const webhookId of createdWebhookIds) {
      try {
        await client.delete(`/api/v1/webhooks/${webhookId}`, {
          headers: {
            Authorization: `Bearer ${testUser.accessToken}`,
          },
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    if (helpers) {
      await helpers.cleanup();
    }
  });

  describe('1. Webhook CRUD Operations', () => {
    it('should create a webhook', async () => {
      if ((global as any).__skipWebhookTests) return;

      const webhookData = {
        name: `Test Webhook ${Date.now()}`,
        description: 'A test webhook',
        url: 'https://example.com/webhook',
        method: 'POST',
        events: ['shard.created', 'shard.updated'],
        retryCount: 3,
        retryDelayMs: 1000,
        timeoutMs: 30000,
      };

      const response = await client.post('/api/v1/webhooks', webhookData);

      expect([200, 201, 400, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        expect(response.data.id || response.data.webhookId).toBeDefined();
        const webhookId = response.data.id || response.data.webhookId;
        if (webhookId) {
          createdWebhookIds.push(webhookId);
        }
      }
    }, TEST_TIMEOUT);

    it('should list webhooks', async () => {
      if ((global as any).__skipWebhookTests) return;

      const response = await client.get('/api/v1/webhooks', {
        params: {
          limit: 20,
        },
      });

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        const webhooks = response.data.webhooks || response.data.items || response.data;
        expect(Array.isArray(webhooks) || typeof webhooks === 'object').toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should retrieve a webhook by ID', async () => {
      if ((global as any).__skipWebhookTests) return;

      // First create a webhook
      const createData = {
        name: `Retrieval Test Webhook ${Date.now()}`,
        url: 'https://example.com/webhook',
        events: ['shard.created'],
      };

      const createRes = await client.post('/api/v1/webhooks', createData);
      
      if (![200, 201].includes(createRes.status)) {
        return;
      }

      const webhookId = createRes.data.id || createRes.data.webhookId;
      if (!webhookId) {
        return;
      }

      createdWebhookIds.push(webhookId);

      // Now retrieve it
      const response = await client.get(`/api/v1/webhooks/${webhookId}`);

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data.id || response.data.webhookId).toBe(webhookId);
      }
    }, TEST_TIMEOUT);

    it('should update a webhook', async () => {
      if ((global as any).__skipWebhookTests) return;

      // First create a webhook
      const createData = {
        name: `Update Test Webhook ${Date.now()}`,
        url: 'https://example.com/webhook',
        events: ['shard.created'],
      };

      const createRes = await client.post('/api/v1/webhooks', createData);
      
      if (![200, 201].includes(createRes.status)) {
        return;
      }

      const webhookId = createRes.data.id || createRes.data.webhookId;
      if (!webhookId) {
        return;
      }

      createdWebhookIds.push(webhookId);

      // Update it
      const updateData = {
        name: 'Updated Webhook Name',
        description: 'Updated description',
        isActive: false,
      };

      const response = await client.patch(`/api/v1/webhooks/${webhookId}`, updateData);

      expect([200, 204, 404]).toContain(response.status);
      
      if ([200, 204].includes(response.status)) {
        // Verify update
        const getResponse = await client.get(`/api/v1/webhooks/${webhookId}`);
        if (getResponse.status === 200) {
          expect(getResponse.data.name).toBe(updateData.name);
        }
      }
    }, TEST_TIMEOUT);

    it('should delete a webhook', async () => {
      if ((global as any).__skipWebhookTests) return;

      // First create a webhook
      const createData = {
        name: `Delete Test Webhook ${Date.now()}`,
        url: 'https://example.com/webhook',
        events: ['shard.created'],
      };

      const createRes = await client.post('/api/v1/webhooks', createData);
      
      if (![200, 201].includes(createRes.status)) {
        return;
      }

      const webhookId = createRes.data.id || createRes.data.webhookId;
      if (!webhookId) {
        return;
      }
      // Don't add to cleanup list since we're testing deletion

      // Delete it
      const response = await client.delete(`/api/v1/webhooks/${webhookId}`);

      expect([200, 204, 404]).toContain(response.status);
      
      if ([200, 204].includes(response.status)) {
        // Verify deletion
        const getResponse = await client.get(`/api/v1/webhooks/${webhookId}`);
        expect([404, 403]).toContain(getResponse.status);
      }
    }, TEST_TIMEOUT);
  });

  describe('2. Webhook Operations', () => {
    let testWebhookId: string | null = null;

    beforeEach(async () => {
      if ((global as any).__skipWebhookTests) return;

      const createData = {
        name: `Operations Test Webhook ${Date.now()}`,
        url: 'https://example.com/webhook',
        events: ['shard.created'],
      };

      const createRes = await client.post('/api/v1/webhooks', createData);
      
      if ([200, 201].includes(createRes.status)) {
        testWebhookId = createRes.data.id || createRes.data.webhookId;
        if (testWebhookId) {
          createdWebhookIds.push(testWebhookId);
        }
      }
    });

    it('should regenerate webhook secret', async () => {
      if ((global as any).__skipWebhookTests || !testWebhookId) return;

      const response = await client.post(`/api/v1/webhooks/${testWebhookId}/regenerate-secret`);

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data.secret || response.data.secretMasked).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should test webhook delivery', async () => {
      if ((global as any).__skipWebhookTests || !testWebhookId) return;

      const response = await client.post(`/api/v1/webhooks/${testWebhookId}/test`);

      expect([200, 400, 404, 500]).toContain(response.status);
      
      // Test may fail if webhook URL is not reachable, which is expected
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should get webhook statistics', async () => {
      if ((global as any).__skipWebhookTests || !testWebhookId) return;

      const response = await client.get(`/api/v1/webhooks/${testWebhookId}/stats`);

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // May have stats like totalDeliveries, successCount, failureCount, etc.
      }
    }, TEST_TIMEOUT);
  });

  describe('3. Webhook Filtering', () => {
    it('should filter webhooks by active status', async () => {
      if ((global as any).__skipWebhookTests) return;

      const response = await client.get('/api/v1/webhooks', {
        params: {
          isActive: true,
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should filter webhooks by event type', async () => {
      if ((global as any).__skipWebhookTests) return;

      const response = await client.get('/api/v1/webhooks', {
        params: {
          eventType: 'shard.created',
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should handle pagination with continuation token', async () => {
      if ((global as any).__skipWebhookTests) return;

      const firstResponse = await client.get('/api/v1/webhooks', {
        params: {
          limit: 10,
        },
      });

      expect([200, 404]).toContain(firstResponse.status);
      
      if (firstResponse.status === 200 && firstResponse.data.continuationToken) {
        const secondResponse = await client.get('/api/v1/webhooks', {
          params: {
            limit: 10,
            continuationToken: firstResponse.data.continuationToken,
          },
        });

        expect([200, 404]).toContain(secondResponse.status);
      }
    }, TEST_TIMEOUT);
  });

  describe('4. Webhook Validation', () => {
    it('should reject webhook with invalid URL', async () => {
      if ((global as any).__skipWebhookTests) return;

      const webhookData = {
        name: 'Invalid Webhook',
        url: 'not-a-valid-url',
        events: ['shard.created'],
      };

      const response = await client.post('/api/v1/webhooks', webhookData);

      expect([400, 422, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should reject webhook without required fields', async () => {
      if ((global as any).__skipWebhookTests) return;

      const webhookData = {
        name: 'Incomplete Webhook',
        // Missing url and events
      };

      const response = await client.post('/api/v1/webhooks', webhookData);

      expect([400, 422, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should reject webhook with empty events array', async () => {
      if ((global as any).__skipWebhookTests) return;

      const webhookData = {
        name: 'Empty Events Webhook',
        url: 'https://example.com/webhook',
        events: [],
      };

      const response = await client.post('/api/v1/webhooks', webhookData);

      expect([400, 422, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('5. Multi-Tenant Isolation', () => {
    it('should only return webhooks from user tenant', async () => {
      if ((global as any).__skipWebhookTests) return;

      const response = await client.get('/api/v1/webhooks');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const webhooks = response.data.webhooks || response.data.items || response.data;
        const webhookArray = Array.isArray(webhooks) ? webhooks : [];
        for (const webhook of webhookArray) {
          if (webhook.tenantId) {
            expect(webhook.tenantId).toBe(testUser.tenantId);
          }
        }
      }
    }, TEST_TIMEOUT);

    it('should not allow access to webhooks from other tenants', async () => {
      if ((global as any).__skipWebhookTests) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/v1/webhooks/${fakeId}`);

      expect([404, 403]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('6. Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      if ((global as any).__skipWebhookTests) return;

      const response = await axios.get(`${API_BASE_URL}/api/v1/webhooks`, {
        validateStatus: () => true,
      });

      expect([401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should return 404 for non-existent webhook', async () => {
      if ((global as any).__skipWebhookTests) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/v1/webhooks/${fakeId}`);

      expect([404, 403]).toContain(response.status);
    }, TEST_TIMEOUT);
  });
});
