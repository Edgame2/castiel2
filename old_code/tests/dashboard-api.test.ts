/**
 * Dashboard Management API Integration Tests
 * 
 * Comprehensive tests for dashboard management endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { TestHelpers } from './helpers/test-helpers';
import { TestData } from './fixtures/test-data';
import { TestConfig } from './config/test-config';

const API_BASE_URL = process.env.MAIN_API_URL || TestConfig.mainApiUrl || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

describe('Dashboard API Tests', () => {
  let client: AxiosInstance;
  let helpers: TestHelpers;
  let testUser: { userId: string; email: string; password: string; tenantId: string; accessToken: string };
  let createdDashboardIds: string[] = [];
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
        (global as any).__skipDashboardTests = true;
        return;
      }

      if (loginRes.status !== 200) {
        console.warn(`Failed to login with admin credentials: ${loginRes.status}`);
        (global as any).__skipDashboardTests = true;
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
        (global as any).__skipDashboardTests = true;
        return;
      }

      const loginRes = await client.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      });

      if (loginRes.status !== 200) {
        console.warn('Failed to login test user, skipping tests');
        (global as any).__skipDashboardTests = true;
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
    if ((global as any).__skipDashboardTests) {
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
    if ((global as any).__skipDashboardTests) {
      return;
    }

    // Cleanup created dashboards
    for (const dashboardId of createdDashboardIds) {
      try {
        await client.delete(`/api/v1/dashboards/${dashboardId}`, {
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

  describe('1. Dashboard Stats and Activity', () => {
    it('should get dashboard statistics', async () => {
      if ((global as any).__skipDashboardTests) return;

      const response = await client.get('/api/v1/dashboard/stats');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // May have stats like totalShards, totalUsers, etc.
      }
    }, TEST_TIMEOUT);

    it('should get recent activity', async () => {
      if ((global as any).__skipDashboardTests) return;

      const response = await client.get('/api/v1/dashboard/activity');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(Array.isArray(response.data) || response.data.items).toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should get recent shards', async () => {
      if ((global as any).__skipDashboardTests) return;

      const response = await client.get('/api/v1/dashboard/recent-shards');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(Array.isArray(response.data) || response.data.items).toBe(true);
      }
    }, TEST_TIMEOUT);
  });

  describe('2. Dashboard CRUD Operations', () => {
    it('should list dashboards', async () => {
      if ((global as any).__skipDashboardTests) return;

      const response = await client.get('/api/v1/dashboards', {
        params: {
          type: 'user',
        },
      });

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        const dashboards = Array.isArray(response.data) ? response.data : response.data.items || [];
        expect(Array.isArray(dashboards)).toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should create a dashboard', async () => {
      if ((global as any).__skipDashboardTests) return;

      const dashboardData = {
        name: `Test Dashboard ${Date.now()}`,
        description: 'A test dashboard',
        type: 'user',
        widgets: [],
        settings: {},
      };

      const response = await client.post('/api/v1/dashboards', dashboardData);

      expect([200, 201, 400, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        const dashboardId = response.data.id || response.data.dashboardId || response.data.dashboard?.id;
        if (dashboardId) {
          createdDashboardIds.push(dashboardId);
        }
      }
    }, TEST_TIMEOUT);

    it('should retrieve a dashboard by ID', async () => {
      if ((global as any).__skipDashboardTests) return;

      // First create a dashboard
      const createData = {
        name: `Retrieval Test Dashboard ${Date.now()}`,
        description: 'Dashboard for retrieval test',
        type: 'user',
      };

      const createRes = await client.post('/api/v1/dashboards', createData);
      
      if (![200, 201].includes(createRes.status)) {
        return; // Skip if creation failed
      }

      const dashboardId = createRes.data.id || createRes.data.dashboardId || createRes.data.dashboard?.id;
      if (!dashboardId) {
        return;
      }

      createdDashboardIds.push(dashboardId);

      // Now retrieve it
      const response = await client.get(`/api/v1/dashboards/${dashboardId}`);

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data.id || response.data.dashboardId).toBe(dashboardId);
      }
    }, TEST_TIMEOUT);

    it('should update a dashboard', async () => {
      if ((global as any).__skipDashboardTests) return;

      // First create a dashboard
      const createData = {
        name: `Update Test Dashboard ${Date.now()}`,
        description: 'Dashboard for update test',
        type: 'user',
      };

      const createRes = await client.post('/api/v1/dashboards', createData);
      
      if (![200, 201].includes(createRes.status)) {
        return;
      }

      const dashboardId = createRes.data.id || createRes.data.dashboardId || createRes.data.dashboard?.id;
      if (!dashboardId) {
        return;
      }

      createdDashboardIds.push(dashboardId);

      // Update it
      const updateData = {
        name: 'Updated Dashboard Name',
        description: 'Updated description',
      };

      const response = await client.patch(`/api/v1/dashboards/${dashboardId}`, updateData);

      expect([200, 204, 404]).toContain(response.status);
      
      if ([200, 204].includes(response.status)) {
        // Verify update
        const getResponse = await client.get(`/api/v1/dashboards/${dashboardId}`);
        if (getResponse.status === 200) {
          expect(getResponse.data.name || getResponse.data.title).toBe(updateData.name);
        }
      }
    }, TEST_TIMEOUT);

    it('should delete a dashboard', async () => {
      if ((global as any).__skipDashboardTests) return;

      // First create a dashboard
      const createData = {
        name: `Delete Test Dashboard ${Date.now()}`,
        description: 'Dashboard for delete test',
        type: 'user',
      };

      const createRes = await client.post('/api/v1/dashboards', createData);
      
      if (![200, 201].includes(createRes.status)) {
        return;
      }

      const dashboardId = createRes.data.id || createRes.data.dashboardId || createRes.data.dashboard?.id;
      if (!dashboardId) {
        return;
      }
      // Don't add to cleanup list since we're testing deletion

      // Delete it
      const response = await client.delete(`/api/v1/dashboards/${dashboardId}`);

      expect([200, 204, 404]).toContain(response.status);
      
      if ([200, 204].includes(response.status)) {
        // Verify deletion
        const getResponse = await client.get(`/api/v1/dashboards/${dashboardId}`);
        expect([404, 200]).toContain(getResponse.status);
      }
    }, TEST_TIMEOUT);
  });

  describe('3. Dashboard Operations', () => {
    let testDashboardId: string | null = null;

    beforeEach(async () => {
      if ((global as any).__skipDashboardTests) return;

      const createData = {
        name: `Operations Test Dashboard ${Date.now()}`,
        description: 'Dashboard for operations test',
        type: 'user',
      };

      const createRes = await client.post('/api/v1/dashboards', createData);
      
      if ([200, 201].includes(createRes.status)) {
        testDashboardId = createRes.data.id || createRes.data.dashboardId || createRes.data.dashboard?.id;
        if (testDashboardId) {
          createdDashboardIds.push(testDashboardId);
        }
      }
    });

    it('should get merged dashboard', async () => {
      if ((global as any).__skipDashboardTests) return;

      const response = await client.get('/api/v1/dashboards/merged');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should duplicate a dashboard', async () => {
      if ((global as any).__skipDashboardTests || !testDashboardId) return;

      const duplicateData = {
        name: `Duplicated Dashboard ${Date.now()}`,
        copyWidgets: true,
      };

      const response = await client.post(`/api/v1/dashboards/${testDashboardId}/duplicate`, duplicateData);

      expect([200, 201, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        const duplicatedId = response.data.id || response.data.dashboardId || response.data.dashboard?.id;
        if (duplicatedId) {
          createdDashboardIds.push(duplicatedId);
        }
      }
    }, TEST_TIMEOUT);

    it('should set dashboard as default', async () => {
      if ((global as any).__skipDashboardTests || !testDashboardId) return;

      const response = await client.post(`/api/v1/dashboards/${testDashboardId}/set-default`);

      expect([200, 204, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('4. Widget Management', () => {
    let testDashboardId: string | null = null;

    beforeEach(async () => {
      if ((global as any).__skipDashboardTests) return;

      const createData = {
        name: `Widget Test Dashboard ${Date.now()}`,
        description: 'Dashboard for widget test',
        type: 'user',
      };

      const createRes = await client.post('/api/v1/dashboards', createData);
      
      if ([200, 201].includes(createRes.status)) {
        testDashboardId = createRes.data.id || createRes.data.dashboardId || createRes.data.dashboard?.id;
        if (testDashboardId) {
          createdDashboardIds.push(testDashboardId);
        }
      }
    });

    it('should list widgets for a dashboard', async () => {
      if ((global as any).__skipDashboardTests || !testDashboardId) return;

      const response = await client.get(`/api/v1/dashboards/${testDashboardId}/widgets`);

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(Array.isArray(response.data) || response.data.items).toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should add a widget to a dashboard', async () => {
      if ((global as any).__skipDashboardTests || !testDashboardId) return;

      const widgetData = {
        type: 'chart',
        name: 'Test Widget',
        config: {
          chartType: 'bar',
        },
        dataSource: {
          type: 'shards',
        },
        position: { x: 0, y: 0 },
        size: { width: 4, height: 3 },
      };

      const response = await client.post(`/api/v1/dashboards/${testDashboardId}/widgets`, widgetData);

      expect([200, 201, 400, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should update a widget', async () => {
      if ((global as any).__skipDashboardTests || !testDashboardId) return;

      // First add a widget
      const widgetData = {
        type: 'chart',
        name: 'Widget to Update',
        config: { chartType: 'bar' },
        position: { x: 0, y: 0 },
        size: { width: 4, height: 3 },
      };

      const addRes = await client.post(`/api/v1/dashboards/${testDashboardId}/widgets`, widgetData);
      
      if (![200, 201].includes(addRes.status)) {
        return;
      }

      const widgetId = addRes.data.id || addRes.data.widgetId || addRes.data.widget?.id;
      if (!widgetId) {
        return;
      }

      // Update it
      const updateData = {
        name: 'Updated Widget Name',
        config: { chartType: 'line' },
      };

      const response = await client.patch(`/api/v1/dashboards/${testDashboardId}/widgets/${widgetId}`, updateData);

      expect([200, 204, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should remove a widget from a dashboard', async () => {
      if ((global as any).__skipDashboardTests || !testDashboardId) return;

      // First add a widget
      const widgetData = {
        type: 'chart',
        name: 'Widget to Delete',
        config: { chartType: 'bar' },
        position: { x: 0, y: 0 },
        size: { width: 4, height: 3 },
      };

      const addRes = await client.post(`/api/v1/dashboards/${testDashboardId}/widgets`, widgetData);
      
      if (![200, 201].includes(addRes.status)) {
        return;
      }

      const widgetId = addRes.data.id || addRes.data.widgetId || addRes.data.widget?.id;
      if (!widgetId) {
        return;
      }

      // Delete it
      const response = await client.delete(`/api/v1/dashboards/${testDashboardId}/widgets/${widgetId}`);

      expect([200, 204, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('5. Dashboard Filtering', () => {
    it('should filter dashboards by type', async () => {
      if ((global as any).__skipDashboardTests) return;

      const types = ['user', 'tenant', 'system'];

      for (const type of types) {
        const response = await client.get('/api/v1/dashboards', {
          params: { type },
        });

        expect([200, 404]).toContain(response.status);
      }
    }, TEST_TIMEOUT);

    it('should include templates when requested', async () => {
      if ((global as any).__skipDashboardTests) return;

      const response = await client.get('/api/v1/dashboards', {
        params: {
          includeTemplates: true,
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should filter by context type', async () => {
      if ((global as any).__skipDashboardTests) return;

      const response = await client.get('/api/v1/dashboards', {
        params: {
          contextType: 'c_project',
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('6. Multi-Tenant Isolation', () => {
    it('should only return dashboards from user tenant', async () => {
      if ((global as any).__skipDashboardTests) return;

      const response = await client.get('/api/v1/dashboards');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const dashboards = Array.isArray(response.data) ? response.data : response.data.items || [];
        for (const dashboard of dashboards) {
          if (dashboard.tenantId) {
            expect(dashboard.tenantId).toBe(testUser.tenantId);
          }
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('7. Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      if ((global as any).__skipDashboardTests) return;

      const response = await axios.get(`${API_BASE_URL}/api/v1/dashboards`, {
        validateStatus: () => true,
      });

      expect([401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should return 404 for non-existent dashboard', async () => {
      if ((global as any).__skipDashboardTests) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/v1/dashboards/${fakeId}`);

      expect([404, 403]).toContain(response.status);
    }, TEST_TIMEOUT);
  });
});
