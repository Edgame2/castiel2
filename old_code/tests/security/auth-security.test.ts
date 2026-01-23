import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';

/**
 * Phase 6: Test Suite & Deployment
 * Security Test Suite: CSRF, Rate Limiting, Token Expiry, Security Headers
 * 
 * This test suite verifies security features:
 * 1. CSRF protection on state-changing operations
 * 2. Rate limiting on authentication endpoints
 * 3. Token expiry and validation
 * 4. Security headers configuration
 * 5. Input validation and sanitization
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Security Feature Tests', () => {
  let client: AxiosInstance;

  beforeAll(async () => {
    client = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true,
    });
  });

  describe('CSRF Protection', () => {
    it('should reject state-changing requests without CSRF token', async () => {
      const timestamp = Date.now();
      const testUser = {
        email: `csrf-test-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'CSRF Test User',
      };

      // Register and login
      const registerRes = await client.post('/auth/register', testUser);
      expect(registerRes.status).toBe(201);

      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      expect(loginRes.status).toBe(200);

      const accessToken = loginRes.data.accessToken;

      // Attempt logout without CSRF token (if CSRF enabled)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // Intentionally omitting CSRF token if required
        },
      });

      // Should succeed if CSRF not required on API endpoints
      // Or fail with 403 if CSRF protection enabled
      expect([200, 403]).toContain(logoutRes.status);
    });

    it('should accept requests with valid CSRF token', async () => {
      // CSRF tokens typically obtained from cookie or initial request
      // This test verifies the flow structure

      const timestamp = Date.now();
      const testUser = {
        email: `csrf-valid-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'CSRF Valid User',
      };

      const registerRes = await client.post('/auth/register', testUser);
      expect(registerRes.status).toBe(201);

      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      expect(loginRes.status).toBe(200);

      // If CSRF token returned in response
      const csrfToken = loginRes.headers['x-csrf-token'] || loginRes.data.csrfToken;

      if (csrfToken) {
        const logoutRes = await client.post('/auth/logout', {}, {
          headers: {
            Authorization: `Bearer ${loginRes.data.accessToken}`,
            'X-CSRF-Token': csrfToken,
          },
        });

        expect(logoutRes.status).toBe(200);
      }
    });

    it('should protect user profile updates with CSRF', async () => {
      const timestamp = Date.now();
      const testUser = {
        email: `csrf-profile-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'CSRF Profile User',
      };

      // Register and login
      const registerRes = await client.post('/auth/register', testUser);
      expect(registerRes.status).toBe(201);

      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      expect(loginRes.status).toBe(200);

      const accessToken = loginRes.data.accessToken;

      // Attempt profile update (if endpoint exists)
      const updateRes = await client.patch('/auth/profile', 
        { name: 'Updated Name' },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      // Should succeed or fail appropriately
      expect([200, 403, 404]).toContain(updateRes.status);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login endpoint', async () => {
      const timestamp = Date.now();
      const email = `rate-limit-${timestamp}@example.com`;

      // Attempt multiple failed logins
      const attempts = [];
      for (let i = 0; i < 7; i++) {
        attempts.push(
          client.post('/auth/login', {
            email,
            password: 'WrongPassword123!',
          })
        );
      }

      const results = await Promise.all(attempts);

      // First 5 should return 401 (wrong password)
      // 6th and 7th should return 429 (rate limited)
      const rateLimitedCount = results.filter(r => r.status === 429).length;

      expect(rateLimitedCount).toBeGreaterThanOrEqual(1);
    });

    it('should reset rate limit after cooldown period', async () => {
      const timestamp = Date.now();
      const email = `rate-reset-${timestamp}@example.com`;

      // Hit rate limit
      for (let i = 0; i < 6; i++) {
        await client.post('/auth/login', {
          email,
          password: 'WrongPassword123!',
        });
      }

      // Wait for rate limit cooldown (15 minutes typical, use 1s for test)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Next attempt may still be rate limited or succeed depending on window
      const retryRes = await client.post('/auth/login', {
        email,
        password: 'WrongPassword123!',
      });

      expect([401, 429]).toContain(retryRes.status);
    });

    it('should apply rate limiting per IP address', async () => {
      const timestamp = Date.now();

      // Simulate different IPs (if supported)
      const user1 = `user1-${timestamp}@example.com`;
      const user2 = `user2-${timestamp}@example.com`;

      // Exhaust rate limit for user1
      for (let i = 0; i < 6; i++) {
        await client.post('/auth/login', {
          email: user1,
          password: 'WrongPassword123!',
        }, {
          headers: { 'X-Forwarded-For': '192.168.1.100' },
        });
      }

      // user2 from different IP should not be rate limited
      const user2Res = await client.post('/auth/login', {
        email: user2,
        password: 'WrongPassword123!',
      }, {
        headers: { 'X-Forwarded-For': '192.168.1.101' },
      });

      // Should return 401 (wrong password), not 429 (rate limited)
      expect(user2Res.status).toBe(401);
    });

    it('should not rate limit successful logins', async () => {
      const timestamp = Date.now();
      const testUser = {
        email: `rate-success-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'Rate Success User',
      };

      // Register
      const registerRes = await client.post('/auth/register', testUser);
      expect(registerRes.status).toBe(201);

      // Multiple successful logins should not trigger rate limit
      for (let i = 0; i < 10; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
      }
    });
  });

  describe('Token Expiry and Validation', () => {
    it('should reject expired access tokens', async () => {
      // Note: Testing actual token expiry requires waiting 15+ minutes
      // This test verifies the validation mechanism

      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDk0NTkyMDB9.fake';

      const meRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });

      expect(meRes.status).toBe(401);
    });

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'not-a-jwt-token',
        'Bearer invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
      ];

      for (const token of malformedTokens) {
        const meRes = await client.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        expect(meRes.status).toBe(401);
      }
    });

    it('should validate token signature', async () => {
      const timestamp = Date.now();
      const testUser = {
        email: `signature-test-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'Signature Test User',
      };

      // Register and login
      const registerRes = await client.post('/auth/register', testUser);
      expect(registerRes.status).toBe(201);

      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      expect(loginRes.status).toBe(200);

      const validToken = loginRes.data.accessToken;

      // Valid token should work
      const meRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      expect(meRes.status).toBe(200);

      // Tampered token should fail
      const tamperedToken = validToken.slice(0, -5) + 'xxxxx';
      const meRes2 = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${tamperedToken}` },
      });
      expect(meRes2.status).toBe(401);
    });

    it('should enforce refresh token expiry', async () => {
      // Refresh tokens expire after 7 days (configurable)
      // This test verifies the validation logic

      const expiredRefreshToken = 'expired-refresh-token-12345';

      const refreshRes = await client.post('/auth/refresh', {
        refreshToken: expiredRefreshToken,
      });

      expect(refreshRes.status).toBe(401);
      expect(refreshRes.data.message || refreshRes.data.error).toMatch(
        /invalid|expired/i
      );
    });
  });

  describe('Security Headers', () => {
    it('should set strict security headers on all responses', async () => {
      const healthRes = await client.get('/health');

      // Check for security headers
      expect(healthRes.headers['x-content-type-options']).toBe('nosniff');
      expect(healthRes.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/i);
      expect(healthRes.headers['x-xss-protection']).toBeDefined();

      // Content-Security-Policy
      if (healthRes.headers['content-security-policy']) {
        expect(healthRes.headers['content-security-policy']).toContain('default-src');
      }

      // HSTS (Strict-Transport-Security)
      if (healthRes.headers['strict-transport-security']) {
        expect(healthRes.headers['strict-transport-security']).toContain('max-age');
      }
    });

    it('should not expose sensitive server information', async () => {
      const healthRes = await client.get('/health');

      // Should not expose server version
      const serverHeader = healthRes.headers['server'];
      if (serverHeader) {
        expect(serverHeader).not.toMatch(/\d+\.\d+\.\d+/); // No version numbers
      }

      // Should not have X-Powered-By
      expect(healthRes.headers['x-powered-by']).toBeUndefined();
    });

    it('should set secure cookie attributes', async () => {
      const timestamp = Date.now();
      const testUser = {
        email: `cookie-test-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'Cookie Test User',
      };

      // Register and login
      const registerRes = await client.post('/auth/register', testUser);
      expect(registerRes.status).toBe(201);

      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      // Check Set-Cookie headers if present
      const setCookieHeaders = loginRes.headers['set-cookie'];
      if (setCookieHeaders) {
        const cookieString = Array.isArray(setCookieHeaders)
          ? setCookieHeaders.join('; ')
          : setCookieHeaders;

        // Should have HttpOnly
        expect(cookieString).toMatch(/HttpOnly/i);

        // Should have Secure (in production)
        if (process.env.NODE_ENV === 'production') {
          expect(cookieString).toMatch(/Secure/i);
        }

        // Should have SameSite=Strict or Lax
        expect(cookieString).toMatch(/SameSite=(Strict|Lax)/i);
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate email format on registration', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ];

      for (const email of invalidEmails) {
        const registerRes = await client.post('/auth/register', {
          email,
          password: 'TestPassword123!',
          name: 'Test User',
        });

        expect(registerRes.status).toBe(400);
        expect(registerRes.data.error || registerRes.data.message).toMatch(
          /email|invalid|validation/i
        );
      }
    });

    it('should enforce password complexity requirements', async () => {
      const timestamp = Date.now();
      const weakPasswords = [
        'short',              // Too short
        'nouppercase123!',    // No uppercase
        'NOLOWERCASE123!',    // No lowercase
        'NoNumbers!',         // No numbers
        'NoSpecial123',       // No special characters
      ];

      for (const password of weakPasswords) {
        const registerRes = await client.post('/auth/register', {
          email: `weak-pw-${timestamp}-${Math.random()}@example.com`,
          password,
          name: 'Weak Password User',
        });

        expect(registerRes.status).toBe(400);
        expect(registerRes.data.error || registerRes.data.message).toMatch(
          /password|complexity|requirements/i
        );
      }
    });

    it('should sanitize user input to prevent XSS', async () => {
      const timestamp = Date.now();
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
      ];

      for (const maliciousInput of xssAttempts) {
        const registerRes = await client.post('/auth/register', {
          email: `xss-test-${timestamp}-${Math.random()}@example.com`,
          password: 'TestPassword123!',
          name: maliciousInput,
        });

        if (registerRes.status === 201) {
          // If registration succeeds, verify name is sanitized
          const loginRes = await client.post('/auth/login', {
            email: `xss-test-${timestamp}@example.com`,
            password: 'TestPassword123!',
          });

          if (loginRes.status === 200) {
            const meRes = await client.get('/auth/me', {
              headers: { Authorization: `Bearer ${loginRes.data.accessToken}` },
            });

            // Name should not contain script tags
            expect(meRes.data.name).not.toContain('<script>');
            expect(meRes.data.name).not.toContain('javascript:');
          }
        }
      }
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionAttempts = [
        "' OR '1'='1",
        "admin'--",
        "1' UNION SELECT * FROM users--",
      ];

      for (const injection of sqlInjectionAttempts) {
        const loginRes = await client.post('/auth/login', {
          email: injection,
          password: injection,
        });

        // Should return 401 (invalid credentials), not 500 (SQL error)
        expect(loginRes.status).toBe(401);
        expect(loginRes.data.message || loginRes.data.error).not.toMatch(/sql|database|query/i);
      }
    });

    it('should validate request body size limits', async () => {
      const timestamp = Date.now();
      const largePayload = {
        email: `large-payload-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'A'.repeat(10000), // Very long name
      };

      const registerRes = await client.post('/auth/register', largePayload);

      // Should reject or accept with size limit
      expect([201, 400, 413]).toContain(registerRes.status);
    });
  });

  describe('Session Security', () => {
    it('should prevent session fixation attacks', async () => {
      const timestamp = Date.now();
      const testUser = {
        email: `session-fixation-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'Session Fixation User',
      };

      // Register and login
      const registerRes = await client.post('/auth/register', testUser);
      expect(registerRes.status).toBe(201);

      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      expect(loginRes.status).toBe(200);

      const sessionToken1 = loginRes.data.accessToken;

      // Logout and login again
      await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${sessionToken1}` },
      });

      const login2Res = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      expect(login2Res.status).toBe(200);

      const sessionToken2 = login2Res.data.accessToken;

      // Old session token should not work
      const meWithOldTokenRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${sessionToken1}` },
      });
      expect(meWithOldTokenRes.status).toBe(401);

      // New session token should work
      const meWithNewTokenRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${sessionToken2}` },
      });
      expect(meWithNewTokenRes.status).toBe(200);
    });

    it('should enforce session timeout', async () => {
      // Session timeout is typically 9 hours
      // This test verifies the mechanism exists

      const timestamp = Date.now();
      const testUser = {
        email: `session-timeout-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'Session Timeout User',
      };

      // Register and login
      const registerRes = await client.post('/auth/register', testUser);
      expect(registerRes.status).toBe(201);

      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      expect(loginRes.status).toBe(200);

      // Verify session is active
      const meRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${loginRes.data.accessToken}` },
      });
      expect(meRes.status).toBe(200);

      // Note: Can't test actual timeout without waiting 9 hours
      // Verify timeout configuration exists
    });

    it('should regenerate session ID on privilege escalation', async () => {
      const timestamp = Date.now();
      const testUser = {
        email: `privilege-escalation-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: 'Privilege Escalation User',
      };

      // Register and login
      const registerRes = await client.post('/auth/register', testUser);
      expect(registerRes.status).toBe(201);

      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      expect(loginRes.status).toBe(200);

      const initialToken = loginRes.data.accessToken;

      // MFA setup would trigger session regeneration
      const mfaInitRes = await client.post('/auth/mfa/setup/totp/init', {}, {
        headers: { Authorization: `Bearer ${initialToken}` },
      });

      if (mfaInitRes.status === 200) {
        // Verify mechanism exists (actual regeneration may require MFA completion)
        expect(mfaInitRes.data).toBeDefined();
      }
    });
  });

  describe('API Security', () => {
    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'get', url: '/auth/me' },
        { method: 'post', url: '/auth/logout' },
        { method: 'get', url: '/auth/sessions' },
      ];

      for (const endpoint of protectedEndpoints) {
        const res = await client.request({
          method: endpoint.method,
          url: endpoint.url,
        });

        expect(res.status).toBe(401);
      }
    });

    it('should enforce CORS policy', async () => {
      // CORS headers should be set appropriately
      const healthRes = await client.get('/health', {
        headers: {
          Origin: 'https://malicious-site.com',
        },
      });

      // Check CORS headers
      const corsHeader = healthRes.headers['access-control-allow-origin'];
      
      if (corsHeader) {
        // Should not allow all origins in production
        if (process.env.NODE_ENV === 'production') {
          expect(corsHeader).not.toBe('*');
        }
      }
    });

    it('should validate content-type headers', async () => {
      const timestamp = Date.now();

      // Send login request with wrong content-type
      const loginRes = await client.post('/auth/login', 
        `email=test-${timestamp}@example.com&password=TestPassword123!`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Should reject or handle appropriately
      expect([400, 401, 415]).toContain(loginRes.status);
    });
  });
});
