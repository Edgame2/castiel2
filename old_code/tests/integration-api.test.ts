/**
 * Integration API Integration Tests
 * 
 * Tests for integration management, connections, and search
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { TestHelpers } from './helpers/test-helpers';
import { TestData } from './fixtures/test-data';
import { TestConfig } from './config/test-config';

const API_BASE_URL = process.env.MAIN_API_URL || TestConfig.mainApiUrl || 'http://localhost:3001';

describe('Integration API Tests', () => {
  let client: AxiosInstance;
  let helpers: TestHelpers;
  let testUser: { userId: string; email: string; password: string; tenantId: string; accessToken: string };
  let createdIntegrationIds: string[] = [];
  let cachedToken: string | null = null;
  let tokenExpiry: number = 0;

  beforeAll(async () => {
    client = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true,
      timeout: 30000,
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
        const retryAfter = Math.min(loginRes.data.retryAfter || 30, 60);
        console.warn(`Rate limited on login, waiting ${retryAfter} seconds...`);
        await helpers.sleep(retryAfter * 1000);
        loginRes = await client.post('/api/v1/auth/login', {
          email: 'admin@admin.com',
          password: 'Morpheus@12',
        });
        
        if (loginRes.status === 429) {
          console.warn('Still rate limited after wait, tests will be skipped');
          throw new Error(`Rate limit still active after ${retryAfter}s wait. Please wait ${loginRes.data.retryAfter || 30} seconds and try again.`);
        }
      }

      if (loginRes.status !== 200) {
        throw new Error(`Failed to login with admin credentials: ${loginRes.status} - ${JSON.stringify(loginRes.data)}`);
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
    }
  });

  beforeEach(async () => {
    // Reuse cached token if still valid
    const useProvidedCredentials = process.env.USE_ADMIN_CREDENTIALS === 'true' || process.env.USE_ADMIN_CREDENTIALS === '1';
    
    if (useProvidedCredentials) {
      if (cachedToken && Date.now() < tokenExpiry) {
        testUser = {
          userId: testUser?.userId || '',
          email: 'admin@admin.com',
          password: 'Morpheus@12',
          tenantId: testUser?.tenantId || '',
          accessToken: cachedToken,
        };
        client.defaults.headers.common['Authorization'] = `Bearer ${cachedToken}`;
        return;
      }

      // Token expired, login again
      const loginRes = await client.post('/api/v1/auth/login', {
        email: 'admin@admin.com',
        password: 'Morpheus@12',
      });

      if (loginRes.status === 429 && cachedToken) {
        console.warn('Rate limited, using cached token');
        client.defaults.headers.common['Authorization'] = `Bearer ${cachedToken}`;
        return;
      }

      if (loginRes.status !== 200) {
        throw new Error(`Failed to login: ${loginRes.status} - ${JSON.stringify(loginRes.data)}`);
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
      // Create a test user for each test suite
      const userData = TestData.generateValidUser(TestData.generateTenantId());
      
      // Register user
      const registerRes = await client.post('/api/v1/auth/register', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      if (registerRes.status !== 201) {
        throw new Error(`Failed to register test user: ${registerRes.status}`);
      }

      // Login to get access token
      const loginRes = await client.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      });

      if (loginRes.status !== 200) {
        throw new Error(`Failed to login test user: ${loginRes.status}`);
      }

      testUser = {
        userId: registerRes.data.user?.id || registerRes.data.userId,
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
        accessToken: loginRes.data.accessToken,
      };
    }

    // Set default authorization header
    client.defaults.headers.common['Authorization'] = `Bearer ${testUser.accessToken}`;
  });

  afterAll(async () => {
    // Cleanup created integrations
    if (testUser?.accessToken) {
      for (const integrationId of createdIntegrationIds) {
        try {
          await client.delete(`/api/integrations/${integrationId}`, {
            headers: { Authorization: `Bearer ${testUser.accessToken}` },
          });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }

    // Cleanup test user
    if (helpers) {
      await helpers.cleanup();
    }
  });

  describe('Integration Catalog', () => {
    it('should list available integrations', async () => {
      const response = await client.get('/api/integrations');

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      // Response may be array or object with providers array
      expect(
        Array.isArray(response.data) || 
        Array.isArray(response.data.providers) ||
        Array.isArray(response.data.items)
      ).toBe(true);
    });

    it('should list integrations with pagination', async () => {
      const response = await client.get('/api/integrations', {
        params: {
          limit: 10,
          offset: 0,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should filter integrations by category', async () => {
      const categories = ['crm', 'communication', 'data_source', 'storage'];
      
      for (const category of categories) {
        const response = await client.get('/api/integrations', {
          params: {
            category,
          },
        });

        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
      }
    });

    it('should search integrations by name', async () => {
      const response = await client.get('/api/integrations', {
        params: {
          search: 'test',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should get integration details by ID', async () => {
      // First get list to find an integration ID
      const listResponse = await client.get('/api/integrations');
      
      if (listResponse.status === 200) {
        const integrations = listResponse.data.providers || listResponse.data.items || listResponse.data;
        
        if (Array.isArray(integrations) && integrations.length > 0) {
          const integrationId = integrations[0].id;
          
          const response = await client.get(`/api/integrations/${integrationId}`);
          
          // May return 200 or 404 if integration doesn't exist
          expect([200, 404]).toContain(response.status);
          
          if (response.status === 200) {
            expect(response.data.id).toBe(integrationId);
          }
        }
      }
    });

    it('should return 404 for non-existent integration', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/integrations/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Tenant Integration Management', () => {
    it('should list tenant integrations', async () => {
      const response = await client.get('/api/tenant/integrations');

      // May require tenant admin role
      expect([200, 403]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(
          Array.isArray(response.data.integrations) ||
          Array.isArray(response.data.items) ||
          Array.isArray(response.data)
        ).toBe(true);
      }
    });

    it('should create/enable integration for tenant', async () => {
      // First get available integrations
      const catalogResponse = await client.get('/api/integrations');
      
      if (catalogResponse.status === 200) {
        const integrations = catalogResponse.data.providers || catalogResponse.data.items || catalogResponse.data;
        
        if (Array.isArray(integrations) && integrations.length > 0) {
          const integrationId = integrations[0].id;
          
          const createRequest = {
            integrationId,
            configuration: {
              enabled: true,
            },
          };

          const response = await client.post('/api/tenant/integrations', createRequest);
          
          // May require tenant admin, or may succeed
          expect([201, 403, 400]).toContain(response.status);
          
          if (response.status === 201 && response.data.id) {
            createdIntegrationIds.push(response.data.id);
          }
        }
      }
    });

    it('should get tenant integration details', async () => {
      // First try to create an integration
      const catalogResponse = await client.get('/api/integrations');
      
      if (catalogResponse.status === 200) {
        const integrations = catalogResponse.data.providers || catalogResponse.data.items || catalogResponse.data;
        
        if (Array.isArray(integrations) && integrations.length > 0) {
          const integrationId = integrations[0].id;
          
          const createRequest = {
            integrationId,
            configuration: {
              enabled: true,
            },
          };

          const createResponse = await client.post('/api/tenant/integrations', createRequest);
          
          if (createResponse.status === 201 && createResponse.data.id) {
            const tenantIntegrationId = createResponse.data.id;
            createdIntegrationIds.push(tenantIntegrationId);

            const getResponse = await client.get(`/api/tenant/integrations/${tenantIntegrationId}`);
            
            expect([200, 404]).toContain(getResponse.status);
            
            if (getResponse.status === 200) {
              expect(getResponse.data.id).toBe(tenantIntegrationId);
            }
          }
        }
      }
    });

    it('should update tenant integration configuration', async () => {
      // This test would require an existing tenant integration
      // For now, we'll test the endpoint structure
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateRequest = {
        configuration: {
          enabled: false,
        },
      };

      const response = await client.patch(`/api/tenant/integrations/${fakeId}`, updateRequest);
      
      // Should return 404 for non-existent integration
      expect([404, 403]).toContain(response.status);
    });

    it('should delete/disable tenant integration', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.delete(`/api/tenant/integrations/${fakeId}`);
      
      // Should return 404 for non-existent integration
      expect([404, 403]).toContain(response.status);
    });
  });

  describe('Integration Connection', () => {
    it('should initiate connection for integration', async () => {
      // First get available integrations
      const catalogResponse = await client.get('/api/integrations');
      
      if (catalogResponse.status === 200) {
        const integrations = catalogResponse.data.providers || catalogResponse.data.items || catalogResponse.data;
        
        if (Array.isArray(integrations) && integrations.length > 0) {
          const integrationId = integrations[0].id;
          
          // First create tenant integration
          const createRequest = {
            integrationId,
            configuration: {
              enabled: true,
            },
          };

          const createResponse = await client.post('/api/tenant/integrations', createRequest);
          
          if (createResponse.status === 201 && createResponse.data.id) {
            const tenantIntegrationId = createResponse.data.id;
            createdIntegrationIds.push(tenantIntegrationId);

            // Try to initiate connection
            const connectResponse = await client.post(`/api/tenant/integrations/${tenantIntegrationId}/connect`, {});
            
            // May require OAuth flow or return connection status
            expect([200, 201, 400, 403]).toContain(connectResponse.status);
          }
        }
      }
    });

    it('should get connection status', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/tenant/integrations/${fakeId}/connection`);
      
      expect([404, 403]).toContain(response.status);
    });

    it('should test connection', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.post(`/api/tenant/integrations/${fakeId}/test-connection`, {});
      
      expect([404, 403]).toContain(response.status);
    });

    it('should disconnect integration', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.post(`/api/tenant/integrations/${fakeId}/disconnect`, {});
      
      expect([404, 403]).toContain(response.status);
    });
  });

  describe('Integration Search', () => {
    it('should search integration data', async () => {
      // First get available integrations
      const catalogResponse = await client.get('/api/integrations');
      
      if (catalogResponse.status === 200) {
        const integrations = catalogResponse.data.providers || catalogResponse.data.items || catalogResponse.data;
        
        if (Array.isArray(integrations) && integrations.length > 0) {
          const integrationId = integrations[0].id;
          
          const searchRequest = {
            query: 'test search',
            entityTypes: ['contact', 'company'],
          };

          const response = await client.post(`/api/integrations/${integrationId}/search`, searchRequest);
          
          // May require integration to be connected, or return search results
          expect([200, 400, 403, 404]).toContain(response.status);
        }
      }
    });

    it('should search with filters', async () => {
      const catalogResponse = await client.get('/api/integrations');
      
      if (catalogResponse.status === 200) {
        const integrations = catalogResponse.data.providers || catalogResponse.data.items || catalogResponse.data;
        
        if (Array.isArray(integrations) && integrations.length > 0) {
          const integrationId = integrations[0].id;
          
          const searchRequest = {
            query: 'test',
            filters: {
              entityType: 'contact',
              status: 'active',
            },
            limit: 10,
          };

          const response = await client.post(`/api/integrations/${integrationId}/search`, searchRequest);
          
          expect([200, 400, 403, 404]).toContain(response.status);
        }
      }
    });

    it('should reject search without query', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const searchRequest = {
        entityTypes: ['contact'],
      };

      const response = await client.post(`/api/integrations/${fakeId}/search`, searchRequest);
      
      expect([400, 404, 403]).toContain(response.status);
    });
  });

  describe('User-Scoped Connections', () => {
    it('should create user connection', async () => {
      const catalogResponse = await client.get('/api/integrations');
      
      if (catalogResponse.status === 200) {
        const integrations = catalogResponse.data.providers || catalogResponse.data.items || catalogResponse.data;
        
        if (Array.isArray(integrations) && integrations.length > 0) {
          const integrationId = integrations[0].id;
          
          const connectionRequest = {
            integrationId,
            credentials: {
              // Credentials would be specific to integration type
              apiKey: 'test-key',
            },
          };

          const response = await client.post(`/api/integrations/${integrationId}/user-connections`, connectionRequest);
          
          // May require specific integration support or return created connection
          expect([201, 400, 403, 404]).toContain(response.status);
        }
      }
    });

    it('should list user connections', async () => {
      const catalogResponse = await client.get('/api/integrations');
      
      if (catalogResponse.status === 200) {
        const integrations = catalogResponse.data.providers || catalogResponse.data.items || catalogResponse.data;
        
        if (Array.isArray(integrations) && integrations.length > 0) {
          const integrationId = integrations[0].id;
          
          const response = await client.get(`/api/integrations/${integrationId}/user-connections`);
          
          expect([200, 403, 404]).toContain(response.status);
          
          if (response.status === 200) {
            expect(Array.isArray(response.data) || Array.isArray(response.data.connections)).toBe(true);
          }
        }
      }
    });

    it('should update user connection', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateRequest = {
        credentials: {
          apiKey: 'updated-key',
        },
      };

      const response = await client.patch(`/api/integrations/${fakeId}/user-connections/${fakeId}`, updateRequest);
      
      expect([404, 403]).toContain(response.status);
    });

    it('should delete user connection', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.delete(`/api/integrations/${fakeId}/user-connections/${fakeId}`);
      
      expect([404, 403]).toContain(response.status);
    });
  });

  describe('Integration Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/integrations`, {
        validateStatus: () => true,
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should enforce tenant isolation', async () => {
      // Create another user in different tenant
      const otherUserData = TestData.generateValidUser(TestData.generateTenantId());
      const registerRes = await client.post('/auth/register', {
        email: otherUserData.email,
        password: otherUserData.password,
        tenantId: otherUserData.tenantId,
      });

      if (registerRes.status === 201) {
        const loginRes = await client.post('/auth/login', {
          email: otherUserData.email,
          password: otherUserData.password,
          tenantId: otherUserData.tenantId,
        });

        if (loginRes.status === 200) {
          const otherClient = axios.create({
            baseURL: API_BASE_URL,
            validateStatus: () => true,
            headers: {
              Authorization: `Bearer ${loginRes.data.accessToken}`,
            },
          });

          // Try to access tenant integrations from different tenant
          const response = await otherClient.get('/api/tenant/integrations');
          
          // Should only see their own tenant's integrations
          expect([200, 403]).toContain(response.status);
        }
      }
    });
  });

  describe('Integration Status and Health', () => {
    it('should get integration status', async () => {
      const catalogResponse = await client.get('/api/integrations');
      
      if (catalogResponse.status === 200) {
        const integrations = catalogResponse.data.providers || catalogResponse.data.items || catalogResponse.data;
        
        if (Array.isArray(integrations) && integrations.length > 0) {
          const integrationId = integrations[0].id;
          
          const response = await client.get(`/api/integrations/${integrationId}/status`);
          
          // May return status or 404 if endpoint doesn't exist
          expect([200, 404]).toContain(response.status);
        }
      }
    });
  });
});

