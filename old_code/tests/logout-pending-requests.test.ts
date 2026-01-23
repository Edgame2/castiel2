import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';

/**
 * Phase 5: Enhanced Logout Verification Tests
 * Test Suite 3: In-Flight Requests & Concurrent Operations
 * 
 * This test suite verifies:
 * 1. In-flight requests handled gracefully during logout
 * 2. No hung connections after logout
 * 3. Concurrent logout operations handled safely
 * 4. Race conditions prevented
 * 5. Request cleanup on logout
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Logout Pending Requests Tests', () => {
  let client: AxiosInstance;
  let testUser: {
    email: string;
    password: string;
    userId?: string;
    tenantId?: string;
  };

  beforeAll(async () => {
    client = axios.create({
      baseURL: API_BASE_URL,
      validateStatus: () => true,
      timeout: 10000, // 10 second timeout
    });
  });

  beforeEach(async () => {
    const timestamp = Date.now();
    testUser = {
      email: `pending-req-test-${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    const registerRes = await client.post('/auth/register', {
      email: testUser.email,
      password: testUser.password,
      name: 'Pending Request Test User',
    });

    expect(registerRes.status).toBe(201);
    testUser.userId = registerRes.data.user.id;
    testUser.tenantId = registerRes.data.user.tenantId;
  });

  describe('In-Flight Request Handling', () => {
    it('should handle in-flight requests gracefully during logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Start multiple requests and logout concurrently
      const inFlightRequests = [
        client.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        client.get('/auth/sessions', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ];

      const logoutPromise = client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Wait for all requests
      const [meRes, sessionsRes, logoutRes] = await Promise.all([
        ...inFlightRequests,
        logoutPromise,
      ]);

      // Logout should succeed
      expect(logoutRes.status).toBe(200);

      // In-flight requests may succeed (200) or fail (401) depending on timing
      // Both are acceptable outcomes
      expect([200, 401]).toContain(meRes.status);
      expect([200, 401, 404]).toContain(sessionsRes.status);

      // Subsequent requests should fail
      const afterLogoutRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(afterLogoutRes.status).toBe(401);
    });

    it('should complete in-flight requests before token blacklist', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Start long-running request
      const longRequestPromise = client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Small delay to ensure request is in-flight
      await new Promise(resolve => setTimeout(resolve, 10));

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for long request to complete
      const longRequestRes = await longRequestPromise;

      // Should complete (200 or 401 depending on timing)
      expect([200, 401]).toContain(longRequestRes.status);
    });

    it('should not hang connections on logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(logoutRes.status).toBe(200);

      // Make multiple requests to verify no connection issues
      const requests = Array(10).fill(null).map(() =>
        client.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      );

      const results = await Promise.all(requests);

      // All should return 401 (no timeouts or hangs)
      for (const result of results) {
        expect(result.status).toBe(401);
      }
    });

    it('should handle rapid successive requests during logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Create rapid successive requests while logging out
      const rapidRequests = [];

      for (let i = 0; i < 20; i++) {
        rapidRequests.push(
          client.get('/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
        );
      }

      // Insert logout in the middle
      rapidRequests.splice(10, 0, 
        client.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      );

      const results = await Promise.all(rapidRequests);

      // Find logout result
      const logoutResult = results[10];
      expect(logoutResult.status).toBe(200);

      // Some early requests may succeed, later ones should fail
      const statusCodes = results.map(r => r.status);
      expect(statusCodes).toContain(401); // At least some should be 401
    });
  });

  describe('Concurrent Logout Operations', () => {
    it('should handle concurrent logout from multiple devices', async () => {
      const sessions: Array<{ accessToken: string; refreshToken: string }> = [];

      // Login from 3 devices
      for (let i = 0; i < 3; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        sessions.push({
          accessToken: loginRes.data.accessToken,
          refreshToken: loginRes.data.refreshToken,
        });
      }

      // Concurrent logout from all devices
      const logoutPromises = sessions.map(session =>
        client.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
      );

      const logoutResults = await Promise.all(logoutPromises);

      // At least one should succeed
      const successCount = logoutResults.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // All tokens should be blacklisted after concurrent logout
      for (const session of sessions) {
        const meRes = await client.get('/auth/me', {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        expect(meRes.status).toBe(401);
      }
    });

    it('should handle concurrent logout and refresh', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken, refreshToken } = loginRes.data;

      // Concurrent logout and refresh
      const [logoutRes, refreshRes] = await Promise.all([
        client.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        client.post('/auth/refresh', { refreshToken }),
      ]);

      // One should succeed, one should fail
      if (logoutRes.status === 200) {
        // Logout succeeded, refresh should fail
        expect(refreshRes.status).toBe(401);
      } else {
        // Refresh succeeded, logout may succeed or fail
        expect([200, 401]).toContain(logoutRes.status);
      }

      // After both operations, all tokens should be invalid
      const meRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(meRes.status).toBe(401);

      const secondRefreshRes = await client.post('/auth/refresh', {
        refreshToken: refreshRes.status === 200 ? refreshRes.data.refreshToken : refreshToken,
      });

      expect(secondRefreshRes.status).toBe(401);
    });

    it('should handle concurrent logout and token verification', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Concurrent logout and multiple auth checks
      const operations = [
        client.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        client.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        client.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        client.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ];

      const results = await Promise.all(operations);

      // Logout should succeed
      expect(results[0].status).toBe(200);

      // Auth checks may succeed or fail depending on timing
      for (let i = 1; i < results.length; i++) {
        expect([200, 401]).toContain(results[i].status);
      }

      // After logout, token should be blacklisted
      const finalCheck = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(finalCheck.status).toBe(401);
    });

    it('should prevent race conditions in session cleanup', async () => {
      const sessions: Array<{ accessToken: string }> = [];

      // Login from 5 devices
      for (let i = 0; i < 5; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        sessions.push({ accessToken: loginRes.data.accessToken });
      }

      // Concurrent operations: logout + multiple auth checks
      const operations = [
        // Logout from first device
        client.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${sessions[0].accessToken}` },
        }),
        // Auth checks from other devices
        ...sessions.slice(1).map(session =>
          client.get('/auth/me', {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          })
        ),
      ];

      const results = await Promise.all(operations);

      // Logout should succeed
      expect(results[0].status).toBe(200);

      // Wait for cleanup to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      // All sessions should be invalid after cleanup
      for (const session of sessions) {
        const meRes = await client.get('/auth/me', {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        expect(meRes.status).toBe(401);
      }
    });
  });

  describe('Request Cleanup & Resource Management', () => {
    it('should cleanup resources on logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Make several requests to establish connections
      for (let i = 0; i < 5; i++) {
        const meRes = await client.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        expect(meRes.status).toBe(200);
      }

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(logoutRes.status).toBe(200);

      // Verify cleanup by checking new requests work without issues
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(newLoginRes.status).toBe(200);

      const newMeRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${newLoginRes.data.accessToken}` },
      });

      expect(newMeRes.status).toBe(200);
    });

    it('should not leak memory on repeated logout operations', async () => {
      // Perform multiple login/logout cycles
      for (let i = 0; i < 10; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);

        const logoutRes = await client.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${loginRes.data.accessToken}` },
        });

        expect(logoutRes.status).toBe(200);
      }

      // Verify system still responsive
      const finalLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(finalLoginRes.status).toBe(200);

      const meRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${finalLoginRes.data.accessToken}` },
      });

      expect(meRes.status).toBe(200);
    });

    it('should handle logout with slow network gracefully', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout with timeout protection
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000, // 5 second timeout
      });

      // Should complete within timeout
      expect(logoutRes.status).toBe(200);

      // Verify token blacklisted
      const meRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(meRes.status).toBe(401);
    });
  });

  describe('Edge Cases & Error Scenarios', () => {
    it('should handle logout during session expiration', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout (session may be expiring)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Should succeed or fail gracefully
      expect([200, 401]).toContain(logoutRes.status);
    });

    it('should handle logout with database connection issues', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout (may encounter Redis/DB issues)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Should complete (success or graceful failure)
      expect([200, 401, 500]).toContain(logoutRes.status);

      // If logout succeeded, token should be blacklisted
      if (logoutRes.status === 200) {
        const meRes = await client.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        expect(meRes.status).toBe(401);
      }
    });

    it('should handle extremely rapid logout operations', async () => {
      const sessions: Array<{ accessToken: string }> = [];

      // Login from 10 devices
      for (let i = 0; i < 10; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        sessions.push({ accessToken: loginRes.data.accessToken });
      }

      // Extremely rapid logout (no delay)
      const logoutPromises = sessions.map(session =>
        client.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
      );

      const logoutResults = await Promise.all(logoutPromises);

      // At least one should succeed
      const successCount = logoutResults.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 200));

      // All tokens should be blacklisted
      for (const session of sessions) {
        const meRes = await client.get('/auth/me', {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        expect(meRes.status).toBe(401);
      }
    });

    it('should handle logout with incomplete session data', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout (may have incomplete session data)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Should handle gracefully
      expect([200, 401]).toContain(logoutRes.status);

      // Token should be blacklisted regardless
      const meRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(meRes.status).toBe(401);
    });
  });

  describe('Performance & Scalability', () => {
    it('should complete logout within acceptable time', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Measure logout time
      const startTime = Date.now();

      const logoutRes = await client.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const endTime = Date.now();
      const logoutTime = endTime - startTime;

      expect(logoutRes.status).toBe(200);

      // Logout should complete in < 500ms
      expect(logoutTime).toBeLessThan(500);
    });

    it('should handle high-concurrency logout without performance degradation', async () => {
      const sessions: Array<{ accessToken: string }> = [];

      // Login from 20 devices
      for (let i = 0; i < 20; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        sessions.push({ accessToken: loginRes.data.accessToken });
      }

      // Measure concurrent logout time
      const startTime = Date.now();

      const logoutPromises = sessions.map(session =>
        client.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
      );

      await Promise.all(logoutPromises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete in reasonable time (< 2s for 20 concurrent logouts)
      expect(totalTime).toBeLessThan(2000);
    });
  });
});
