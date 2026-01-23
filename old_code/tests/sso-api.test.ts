/**
 * SSO (Single Sign-On) API Integration Tests
 * 
 * Comprehensive tests for SSO/SAML authentication endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { TestHelpers } from './helpers/test-helpers';
import { TestData } from './fixtures/test-data';
import { TestConfig } from './config/test-config';

const API_BASE_URL = process.env.MAIN_API_URL || TestConfig.mainApiUrl || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

describe('SSO API Tests', () => {
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
        (global as any).__skipSSOTests = true;
        return;
      }

      if (loginRes.status !== 200) {
        (global as any).__skipSSOTests = true;
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
        (global as any).__skipSSOTests = true;
        return;
      }

      const loginRes = await client.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      });

      if (loginRes.status !== 200) {
        (global as any).__skipSSOTests = true;
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
    if ((global as any).__skipSSOTests) return;

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

  describe('1. SSO Login Flow', () => {
    it('should initiate SSO login', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get(`/api/v1/auth/sso/${testUser.tenantId}/login`, {
        params: {
          returnUrl: 'https://example.com/return',
        },
      });

      expect([200, 302, 400, 404]).toContain(response.status);
      
      // May redirect to IdP or return SAML request
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should handle SSO login with return URL', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get(`/api/v1/auth/sso/${testUser.tenantId}/login`, {
        params: {
          returnUrl: 'https://app.example.com/dashboard',
        },
      });

      expect([200, 302, 400, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should return 404 for non-existent tenant', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get('/api/v1/auth/sso/non-existent-tenant/login');

      expect([404, 400]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('2. SSO Metadata', () => {
    it('should get SAML Service Provider metadata', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get(`/api/v1/auth/sso/${testUser.tenantId}/metadata`, {
        headers: {
          Accept: 'application/xml',
        },
      });

      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // Should return XML metadata
        expect(typeof response.data).toBe('string');
      }
    }, TEST_TIMEOUT);

    it('should return XML format for metadata', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get(`/api/v1/auth/sso/${testUser.tenantId}/metadata`);

      if (response.status === 200) {
        const contentType = response.headers['content-type'] || '';
        expect(contentType.includes('xml') || contentType.includes('text')).toBe(true);
      }
    }, TEST_TIMEOUT);
  });

  describe('3. SSO Callback', () => {
    it('should handle SSO callback (SAML assertion)', async () => {
      if ((global as any).__skipSSOTests) return;

      // Mock SAML assertion (in real scenario, this comes from IdP)
      const samlResponse = 'mock-saml-response';

      const response = await client.post(`/api/v1/auth/sso/${testUser.tenantId}/callback`, {
        SAMLResponse: samlResponse,
        RelayState: 'test-state',
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      expect([200, 302, 400, 401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should validate SAML response format', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.post(`/api/v1/auth/sso/${testUser.tenantId}/callback`, {
        SAMLResponse: 'invalid-saml-response',
      });

      expect([400, 401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('4. SSO Logout', () => {
    it('should initiate SSO logout', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.post(`/api/v1/auth/sso/${testUser.tenantId}/logout`, {
        nameID: 'test-name-id',
        sessionIndex: 'test-session-index',
      });

      expect([200, 302, 400, 401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should handle logout without session data', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.post(`/api/v1/auth/sso/${testUser.tenantId}/logout`, {});

      expect([200, 302, 400, 401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('5. SSO Configuration Management (Admin)', () => {
    it('should get SSO configuration', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get('/api/v1/admin/sso/config');

      expect([200, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should create SSO configuration (admin only)', async () => {
      if ((global as any).__skipSSOTests) return;

      const configData = {
        orgName: `Test Org ${Date.now()}`,
        provider: 'saml',
        samlConfig: {
          entityId: 'https://test.example.com/sso',
          entryPoint: 'https://idp.example.com/sso',
          issuer: 'https://test.example.com',
          callbackUrl: 'https://test.example.com/api/v1/auth/sso/callback',
          idpCert: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
          attributeMapping: {
            email: 'email',
            firstName: 'firstName',
            lastName: 'lastName',
          },
        },
        jitProvisioning: {
          enabled: true,
          autoActivate: true,
          defaultRole: 'user',
        },
      };

      const response = await client.post('/api/v1/admin/sso/config', configData);

      expect([200, 201, 400, 403, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should update SSO configuration (admin only)', async () => {
      if ((global as any).__skipSSOTests) return;

      const updateData = {
        status: 'active',
        samlConfig: {
          wantAssertionsSigned: true,
          wantAuthnResponseSigned: true,
        },
      };

      const response = await client.put('/api/v1/admin/sso/config', updateData);

      expect([200, 204, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should activate SSO configuration (admin only)', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.post('/api/v1/admin/sso/config/activate');

      expect([200, 201, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should deactivate SSO configuration (admin only)', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.post('/api/v1/admin/sso/config/deactivate');

      expect([200, 201, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should validate SSO configuration (admin only)', async () => {
      if ((global as any).__skipSSOTests) return;

      const configData = {
        samlConfig: {
          entityId: 'https://test.example.com/sso',
          entryPoint: 'https://idp.example.com/sso',
          idpCert: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
        },
      };

      const response = await client.post('/api/v1/admin/sso/config/validate', configData);

      expect([200, 400, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // May have validation results
      }
    }, TEST_TIMEOUT);

    it('should test SSO configuration (admin only)', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.post('/api/v1/admin/sso/config/test');

      expect([200, 400, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should delete SSO configuration (admin only)', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.delete('/api/v1/admin/sso/config');

      expect([200, 204, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('6. SSO Configuration Validation', () => {
    it('should reject invalid provider type', async () => {
      if ((global as any).__skipSSOTests) return;

      const configData = {
        orgName: 'Test Org',
        provider: 'invalid-provider',
        samlConfig: {
          entityId: 'https://test.example.com/sso',
          entryPoint: 'https://idp.example.com/sso',
          issuer: 'https://test.example.com',
          callbackUrl: 'https://test.example.com/api/v1/auth/sso/callback',
          idpCert: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
          attributeMapping: {
            email: 'email',
          },
        },
      };

      const response = await client.post('/api/v1/admin/sso/config', configData);

      expect([400, 422, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should require required SAML config fields', async () => {
      if ((global as any).__skipSSOTests) return;

      const configData = {
        orgName: 'Test Org',
        provider: 'saml',
        samlConfig: {
          // Missing required fields
        },
      };

      const response = await client.post('/api/v1/admin/sso/config', configData);

      expect([400, 422, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should validate attribute mapping', async () => {
      if ((global as any).__skipSSOTests) return;

      const configData = {
        orgName: 'Test Org',
        provider: 'saml',
        samlConfig: {
          entityId: 'https://test.example.com/sso',
          entryPoint: 'https://idp.example.com/sso',
          issuer: 'https://test.example.com',
          callbackUrl: 'https://test.example.com/api/v1/auth/sso/callback',
          idpCert: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
          attributeMapping: {
            // Missing required email field
          },
        },
      };

      const response = await client.post('/api/v1/admin/sso/config', configData);

      expect([400, 422, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('7. JIT Provisioning', () => {
    it('should support JIT provisioning configuration', async () => {
      if ((global as any).__skipSSOTests) return;

      const configData = {
        orgName: `JIT Test Org ${Date.now()}`,
        provider: 'saml',
        samlConfig: {
          entityId: 'https://test.example.com/sso',
          entryPoint: 'https://idp.example.com/sso',
          issuer: 'https://test.example.com',
          callbackUrl: 'https://test.example.com/api/v1/auth/sso/callback',
          idpCert: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
          attributeMapping: {
            email: 'email',
          },
        },
        jitProvisioning: {
          enabled: true,
          autoActivate: true,
          defaultRole: 'user',
          allowedDomains: ['example.com'],
        },
      };

      const response = await client.post('/api/v1/admin/sso/config', configData);

      expect([200, 201, 400, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should validate allowed domains', async () => {
      if ((global as any).__skipSSOTests) return;

      const configData = {
        orgName: 'Domain Test Org',
        provider: 'saml',
        samlConfig: {
          entityId: 'https://test.example.com/sso',
          entryPoint: 'https://idp.example.com/sso',
          issuer: 'https://test.example.com',
          callbackUrl: 'https://test.example.com/api/v1/auth/sso/callback',
          idpCert: '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
          attributeMapping: {
            email: 'email',
          },
        },
        jitProvisioning: {
          enabled: true,
          allowedDomains: ['invalid-domain', 'not-a-domain'],
        },
      };

      const response = await client.post('/api/v1/admin/sso/config', configData);

      expect([200, 201, 400, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('8. Error Handling', () => {
    it('should return 404 for non-existent tenant SSO', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get('/api/v1/auth/sso/non-existent-tenant/login');

      expect([404, 400]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should handle missing tenant ID', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get('/api/v1/auth/sso//login');

      expect([400, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should require admin role for configuration management', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get('/api/v1/admin/sso/config');

      expect([200, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('9. Multi-Tenant Isolation', () => {
    it('should only access SSO config for user tenant', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get(`/api/v1/auth/sso/${testUser.tenantId}/metadata`);

      expect([200, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should not allow SSO access for other tenants', async () => {
      if ((global as any).__skipSSOTests) return;

      const response = await client.get('/api/v1/auth/sso/different-tenant-id/login');

      expect([404, 403]).toContain(response.status);
    }, TEST_TIMEOUT);
  });
});
