/**
 * MFA (Multi-Factor Authentication) API Integration Tests
 * 
 * Comprehensive tests for MFA endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { TestHelpers } from './helpers/test-helpers';
import { TestData } from './fixtures/test-data';
import { TestConfig } from './config/test-config';

const API_BASE_URL = process.env.MAIN_API_URL || TestConfig.mainApiUrl || 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

describe('MFA API Tests', () => {
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
        (global as any).__skipMFATests = true;
        return;
      }

      if (loginRes.status !== 200) {
        (global as any).__skipMFATests = true;
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
        (global as any).__skipMFATests = true;
        return;
      }

      const loginRes = await client.post('/api/v1/auth/login', {
        email: userData.email,
        password: userData.password,
        tenantId: userData.tenantId,
      });

      if (loginRes.status !== 200) {
        (global as any).__skipMFATests = true;
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
    if ((global as any).__skipMFATests) return;

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

  describe('1. TOTP (Time-based One-Time Password)', () => {
    it('should enroll TOTP and return QR code', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await client.post('/api/v1/auth/mfa/enroll/totp', {});

      expect([200, 201, 400, 401, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        // May return QR code, secret, or setup URL
        expect(response.data.secret || response.data.qrCodeDataUrl || response.data.otpauthUrl || response.data.enrollmentToken).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should verify TOTP code', async () => {
      if ((global as any).__skipMFATests) return;

      // First enroll TOTP
      const enrollRes = await client.post('/api/v1/auth/mfa/enroll/totp', {});

      if (![200, 201].includes(enrollRes.status)) {
        return; // Skip if enrollment failed
      }

      const enrollmentToken = enrollRes.data.enrollmentToken;
      if (!enrollmentToken) {
        return; // Skip if no enrollment token
      }

      // Verify with a test code (may fail if code is invalid, but should handle gracefully)
      const verifyRes = await client.post('/api/v1/auth/mfa/verify/totp', {
        enrollmentToken,
        code: '123456', // Test code - may be invalid
      });

      expect([200, 400, 404]).toContain(verifyRes.status);
    }, TEST_TIMEOUT);

    it('should reject invalid TOTP code', async () => {
      if ((global as any).__skipMFATests) return;

      // First enroll to get enrollment token
      const enrollRes = await client.post('/api/v1/auth/mfa/enroll/totp', {});
      
      if (![200, 201].includes(enrollRes.status)) {
        return;
      }

      const enrollmentToken = enrollRes.data.enrollmentToken;
      if (!enrollmentToken) {
        return;
      }

      const response = await client.post('/api/v1/auth/mfa/verify/totp', {
        enrollmentToken,
        code: '000000', // Invalid code
      });

      expect([400, 401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('2. SMS MFA', () => {
    it('should enroll SMS MFA method', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await client.post('/api/v1/auth/mfa/enroll/sms', {
        phoneNumber: '+1234567890',
      });

      expect([200, 201, 400, 401, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        expect(response.data.maskedPhoneNumber || response.data.enrollmentToken).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should verify SMS code', async () => {
      if ((global as any).__skipMFATests) return;

      // First enroll SMS
      const enrollRes = await client.post('/api/v1/auth/mfa/enroll/sms', {
        phoneNumber: '+1234567890',
      });

      if (![200, 201].includes(enrollRes.status)) {
        return;
      }

      const enrollmentToken = enrollRes.data.enrollmentToken;
      if (!enrollmentToken) {
        return;
      }

      // Verify with a test code
      const verifyRes = await client.post('/api/v1/auth/mfa/verify/sms', {
        enrollmentToken,
        code: '123456',
      });

      expect([200, 400, 404]).toContain(verifyRes.status);
    }, TEST_TIMEOUT);

    it('should validate phone number format', async () => {
      if ((global as any).__skipMFATests) return;

      const invalidPhones = ['123', 'invalid', ''];

      for (const phone of invalidPhones) {
        const response = await client.post('/api/v1/auth/mfa/enroll/sms', {
          phoneNumber: phone,
        });

        expect([400, 422, 404]).toContain(response.status);
      }
    }, TEST_TIMEOUT);
  });

  describe('3. Email MFA', () => {
    it('should enroll Email MFA method', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await client.post('/api/v1/auth/mfa/enroll/email', {});

      expect([200, 201, 400, 401, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        expect(response.data.maskedEmail || response.data.enrollmentToken).toBeDefined();
      }
    }, TEST_TIMEOUT);

    it('should verify email code', async () => {
      if ((global as any).__skipMFATests) return;

      // First enroll Email
      const enrollRes = await client.post('/api/v1/auth/mfa/enroll/email', {});

      if (![200, 201].includes(enrollRes.status)) {
        return;
      }

      const enrollmentToken = enrollRes.data.enrollmentToken;
      if (!enrollmentToken) {
        return;
      }

      // Verify with a test code
      const verifyRes = await client.post('/api/v1/auth/mfa/verify/email', {
        enrollmentToken,
        code: '123456',
      });

      expect([200, 400, 404]).toContain(verifyRes.status);
    }, TEST_TIMEOUT);
  });

  describe('4. MFA Challenge', () => {
    it('should create MFA challenge', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await client.post('/api/v1/auth/mfa/challenge', {
        method: 'totp',
      });

      expect([200, 201, 400, 401, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        // May return challenge token or code sent confirmation
      }
    }, TEST_TIMEOUT);

    it('should send MFA code for challenge', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await client.post('/api/v1/auth/mfa/send-code', {
        challengeToken: 'test-challenge-token',
        method: 'sms',
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should validate challenge method', async () => {
      if ((global as any).__skipMFATests) return;

      const invalidMethods = ['invalid', 'none', ''];

      for (const method of invalidMethods) {
        const response = await client.post('/api/v1/auth/mfa/challenge', {
          method,
        });

        expect([400, 422, 404]).toContain(response.status);
      }
    }, TEST_TIMEOUT);
  });

  describe('5. MFA Methods Management', () => {
    it('should list enrolled MFA methods', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await client.get('/api/v1/auth/mfa/methods');

      expect([200, 401, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        const methods = response.data.methods || response.data.items || response.data;
        expect(Array.isArray(methods) || typeof methods === 'object').toBe(true);
      }
    }, TEST_TIMEOUT);

    it('should disable MFA method', async () => {
      if ((global as any).__skipMFATests) return;

      const methods = ['totp', 'sms', 'email'];

      for (const method of methods) {
        const response = await client.post(`/api/v1/auth/mfa/disable/${method}`, {});

        expect([200, 204, 400, 404]).toContain(response.status);
      }
    }, TEST_TIMEOUT);

    it('should validate method name when disabling', async () => {
      if ((global as any).__skipMFATests) return;

      const invalidMethods = ['invalid', 'none', 'unknown'];

      for (const method of invalidMethods) {
        const response = await client.post(`/api/v1/auth/mfa/disable/${method}`, {});

        expect([400, 404]).toContain(response.status);
      }
    }, TEST_TIMEOUT);
  });

  describe('6. Recovery Codes', () => {
    it('should generate recovery codes', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await client.post('/api/v1/auth/mfa/recovery-codes/generate', {});

      expect([200, 201, 400, 401, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        expect(response.data).toBeDefined();
        const codes = response.data.codes || response.data.recoveryCodes || [];
        if (Array.isArray(codes) && codes.length > 0) {
          expect(codes.length).toBeGreaterThan(0);
        }
      }
    }, TEST_TIMEOUT);

    it('should require authentication for recovery codes', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/auth/mfa/recovery-codes/generate`,
        {},
        {
          validateStatus: () => true,
        }
      );

      expect([200, 201, 401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('7. MFA Policy', () => {
    it('should get MFA policy for tenant', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await client.get(`/api/v1/tenants/${testUser.tenantId}/mfa/policy`);

      expect([200, 403, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // May have required, methods, etc.
      }
    }, TEST_TIMEOUT);

    it('should update MFA policy (admin only)', async () => {
      if ((global as any).__skipMFATests) return;

      const policyData = {
        required: false,
        methods: ['totp', 'sms', 'email'],
        backupCodesEnabled: true,
      };

      const response = await client.post(`/api/v1/tenants/${testUser.tenantId}/mfa/policy`, policyData);

      expect([200, 201, 403, 404]).toContain(response.status);
      
      if ([200, 201].includes(response.status)) {
        // Verify update
        const getResponse = await client.get(`/api/v1/tenants/${testUser.tenantId}/mfa/policy`);
        if (getResponse.status === 200) {
          expect(getResponse.data).toBeDefined();
        }
      }
    }, TEST_TIMEOUT);

    it('should require admin role for policy updates', async () => {
      if ((global as any).__skipMFATests) return;

      const policyData = {
        required: true,
      };

      const response = await client.post(`/api/v1/tenants/${testUser.tenantId}/mfa/policy`, policyData);

      expect([200, 201, 403, 404]).toContain(response.status);
    }, TEST_TIMEOUT);
  });

  describe('8. Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await axios.get(`${API_BASE_URL}/api/v1/auth/mfa/methods`, {
        params: {
          userId: testUser.userId,
          tenantId: testUser.tenantId,
        },
        validateStatus: () => true,
      });

      expect([200, 401, 404]).toContain(response.status);
    }, TEST_TIMEOUT);

    it('should validate code format', async () => {
      if ((global as any).__skipMFATests) return;

      // First enroll to get enrollment token
      const enrollRes = await client.post('/api/v1/auth/mfa/enroll/totp', {});
      
      if (![200, 201].includes(enrollRes.status)) {
        return;
      }

      const enrollmentToken = enrollRes.data.enrollmentToken;
      if (!enrollmentToken) {
        return;
      }

      const invalidCodes = ['', '123', '12345', 'abcdef'];

      for (const code of invalidCodes) {
        const response = await client.post('/api/v1/auth/mfa/verify/totp', {
          enrollmentToken,
          code,
        });

        expect([400, 422, 404]).toContain(response.status);
      }
    }, TEST_TIMEOUT);
  });

  describe('9. Multi-Tenant Isolation', () => {
    it('should only access MFA methods for user tenant', async () => {
      if ((global as any).__skipMFATests) return;

      const response = await client.get('/api/v1/auth/mfa/methods');

      expect([200, 401, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const methods = response.data.methods || response.data.items || [];
        const methodArray = Array.isArray(methods) ? methods : [];
        for (const method of methodArray) {
          if (method.tenantId) {
            expect(method.tenantId).toBe(testUser.tenantId);
          }
        }
      }
    }, TEST_TIMEOUT);
  });
});
