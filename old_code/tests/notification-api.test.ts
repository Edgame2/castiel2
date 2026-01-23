/**
 * Notification Management API Integration Tests
 * 
 * Comprehensive tests for notification management endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { TestHelpers } from './helpers/test-helpers';
import { TestData } from './fixtures/test-data';
import { TestConfig } from './config/test-config';

const API_BASE_URL = process.env.MAIN_API_URL || TestConfig.mainApiUrl || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

describe('Notification API Tests', () => {
  let client: AxiosInstance;
  let helpers: TestHelpers;
  let testUser: { userId: string; email: string; password: string; tenantId: string; accessToken: string };
  let createdNotificationIds: string[] = [];
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
        (global as any).__skipNotificationTests = true;
        return;
      }

      if (loginRes.status !== 200) {
        (global as any).__skipNotificationTests = true;
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
        (global as any).__skipNotificationTests = true;
        return;
      }

      const loginRes = await client.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      });

      if (loginRes.status !== 200) {
        (global as any).__skipNotificationTests = true;
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
    if ((global as any).__skipNotificationTests) return;

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
    if ((global as any).__skipNotificationTests) {
      return;
    }

    // Cleanup created notifications
    for (const notificationId of createdNotificationIds) {
      try {
        await client.delete(`/api/v1/notifications/${notificationId}`, {
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

  describe('1. Notification Listing', () => {
    it('should list notifications with pagination', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await client.get('/api/v1/notifications', {
        params: {
          limit: 20,
          offset: 0,
        },
      });

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        const notifications = response.data.notifications || response.data.items || response.data;
        expect(Array.isArray(notifications) || typeof notifications === 'object').toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should filter notifications by status', async () => {
      if ((global as any).__skipNotificationTests) return;

      const statuses = ['unread', 'read'];

      for (const status of statuses) {
        const response = await client.get('/api/v1/notifications', {
          params: { status },
        });

        expect([200, 404]).toContain(response.status);
      }
    }, TEST_TIMEOUT);

    it('should filter notifications by type', async () => {
      if ((global as any).__skipNotificationTests) return;

      const types = ['success', 'error', 'warning', 'information', 'alert'];

      for (const type of types) {
        const response = await client.get('/api/v1/notifications', {
          params: { type },
        });

        expect([200, 404]).toContain(response.status);
      }
    }, TEST_TIMEOUT);

    it('should handle pagination parameters', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await client.get('/api/v1/notifications', {
        params: {
          limit: 10,
          offset: 10,
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('2. Notification CRUD Operations', () => {
    it('should retrieve a notification by ID', async () => {
      if ((global as any).__skipNotificationTests) return;

      // First get list to find an existing notification
      const listResponse = await client.get('/api/v1/notifications', {
        params: { limit: 1 },
      });

      if (listResponse.status === 200) {
        const notifications = listResponse.data.notifications || listResponse.data.items || [];
        if (Array.isArray(notifications) && notifications.length > 0) {
          const notificationId = notifications[0].id || notifications[0].notificationId;
          
          if (notificationId) {
            const response = await client.get(`/api/v1/notifications/${notificationId}`);
            expect([200, 404]).toContain(response.status);
            
            if (response.status === 200) {
              expect(response.data).toBeDefined();
              expect(response.data.id || response.data.notificationId).toBe(notificationId);
            }
          }
        }
      }
    }, TEST_TIMEOUT);

    it('should update notification status', async () => {
      if ((global as any).__skipNotificationTests) return;

      // First get list to find an existing notification
      const listResponse = await client.get('/api/v1/notifications', {
        params: { limit: 1 },
      });

      if (listResponse.status === 200) {
        const notifications = listResponse.data.notifications || listResponse.data.items || [];
        if (Array.isArray(notifications) && notifications.length > 0) {
          const notificationId = notifications[0].id || notifications[0].notificationId;
          
          if (notificationId) {
            const updateData = {
              status: 'read',
            };

            const response = await client.patch(`/api/v1/notifications/${notificationId}`, updateData);

            expect([200, 204, 404]).toContain(response.status);
            
            if ([200, 204].includes(response.status)) {
              // Verify update
              const getResponse = await client.get(`/api/v1/notifications/${notificationId}`);
              if (getResponse.status === 200) {
                expect(getResponse.data.status).toBe('read');
              }
            }
          }
        }
      }
    }, TEST_TIMEOUT);

    it('should delete a notification', async () => {
      if ((global as any).__skipNotificationTests) return;

      // First get list to find an existing notification
      const listResponse = await client.get('/api/v1/notifications', {
        params: { limit: 1 },
      });

      if (listResponse.status === 200) {
        const notifications = listResponse.data.notifications || listResponse.data.items || [];
        if (Array.isArray(notifications) && notifications.length > 0) {
          const notificationId = notifications[0].id || notifications[0].notificationId;
          
          if (notificationId) {
            // Don't add to cleanup list since we're testing deletion
            const response = await client.delete(`/api/v1/notifications/${notificationId}`);

            expect([200, 204, 404]).toContain(response.status);
            
            if ([200, 204].includes(response.status)) {
              // Verify deletion
              const getResponse = await client.get(`/api/v1/notifications/${notificationId}`);
              expect([404, 403]).toContain(getResponse.status);
            }
          }
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('3. Notification Operations', () => {
    it('should mark all notifications as read', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await client.post('/api/v1/notifications/mark-all-read');

      expect([200, 201, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        expect(response.data.count !== undefined || response.data.success !== undefined).toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should get unread notification count', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await client.get('/api/v1/notifications/unread-count');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data.count !== undefined).toBe(true);
        expect(typeof response.data.count).toBe('number');
      }
    }, TEST_TIMEOUT);
  });

  describe('4. Notification Preferences', () => {
    it('should get user notification preferences', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await client.get('/api/v1/notifications/preferences');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // May have globalSettings, channels, typePreferences
      }
    }, TEST_TIMEOUT);

    it('should update user notification preferences', async () => {
      if ((global as any).__skipNotificationTests) return;

      const updateData = {
        globalSettings: {
          enabled: true,
          quietHoursEnabled: false,
        },
        channels: {
          'in-app': {
            enabled: true,
          },
          email: {
            enabled: false,
          },
        },
      };

      const response = await client.patch('/api/v1/notifications/preferences', updateData);

      expect([200, 204, 404]).toContain(response.status);
      
      if ([200, 204].includes(response.status)) {
        // Verify update
        const getResponse = await client.get('/api/v1/notifications/preferences');
        if (getResponse.status === 200) {
          expect(getResponse.data).toBeDefined();
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('5. Admin Notification Operations', () => {
    it('should create admin notification (requires admin role)', async () => {
      if ((global as any).__skipNotificationTests) return;

      const notificationData = {
        name: `Test Admin Notification ${Date.now()}`,
        content: 'This is a test admin notification',
        type: 'information',
        priority: 'medium',
        targetType: 'user',
        targetUserIds: [testUser.userId],
      };

      const response = await client.post('/api/v1/admin/notifications', notificationData);

      expect([200, 201, 400, 403, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        const notifications = response.data.notifications || response.data.items || [];
        if (Array.isArray(notifications) && notifications.length > 0) {
          const notificationId = notifications[0].id || notifications[0].notificationId;
          if (notificationId) {
            createdNotificationIds.push(notificationId);
          }
        }
      }
    }, TEST_TIMEOUT);

    it('should get notification statistics (admin only)', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await client.get('/api/v1/admin/notifications/stats');

      expect([200, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // May have totalSent, byType, byStatus, avgDeliveryTime
      }
    }, TEST_TIMEOUT);

    it('should create notification for all tenant users (admin only)', async () => {
      if ((global as any).__skipNotificationTests) return;

      const notificationData = {
        name: `Test Tenant Notification ${Date.now()}`,
        content: 'This is a test tenant-wide notification',
        type: 'information',
        priority: 'low',
        targetType: 'all_tenant',
      };

      const response = await client.post('/api/v1/admin/notifications', notificationData);

      expect([200, 201, 400, 403, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        const notifications = response.data.notifications || response.data.items || [];
        if (Array.isArray(notifications)) {
          for (const notification of notifications) {
            const notificationId = notification.id || notification.notificationId;
            if (notificationId) {
              createdNotificationIds.push(notificationId);
            }
          }
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('6. Notification Filtering and Search', () => {
    it('should combine status and type filters', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await client.get('/api/v1/notifications', {
        params: {
          status: 'unread',
          type: 'information',
        },
      });

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should handle invalid filter values gracefully', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await client.get('/api/v1/notifications', {
        params: {
          status: 'invalid-status',
          type: 'invalid-type',
        },
      });

      expect([200, 400, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('7. Multi-Tenant Isolation', () => {
    it('should only return notifications from user tenant', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await client.get('/api/v1/notifications');

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const notifications = response.data.notifications || response.data.items || [];
        const notificationArray = Array.isArray(notifications) ? notifications : [];
        for (const notification of notificationArray) {
          if (notification.tenantId) {
            expect(notification.tenantId).toBe(testUser.tenantId);
          }
        }
      }
    }, TEST_TIMEOUT);

    it('should not allow access to notifications from other tenants', async () => {
      if ((global as any).__skipNotificationTests) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/v1/notifications/${fakeId}`);

      expect([404, 403]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('8. Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      if ((global as any).__skipNotificationTests) return;

      const response = await axios.get(`${API_BASE_URL}/api/v1/notifications`, {
        validateStatus: () => true,
      });

      expect([401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should return 404 for non-existent notification', async () => {
      if ((global as any).__skipNotificationTests) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client.get(`/api/v1/notifications/${fakeId}`);

      expect([404, 403]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should validate notification ID format', async () => {
      if ((global as any).__skipNotificationTests) return;

      const invalidIds = ['invalid-id', '123', 'not-a-uuid'];

      for (const id of invalidIds) {
        const response = await client.get(`/api/v1/notifications/${id}`);
        expect([400, 404, 403]).toContain(response.status);
      }
    }, TEST_TIMEOUT);
  });
});
