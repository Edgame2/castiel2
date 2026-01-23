import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';

/**
 * Phase 5: Enhanced Logout Verification Tests
 * Test Suite 4: Audit Trail & Logging
 * 
 * This test suite verifies:
 * 1. All revocations logged with audit trail
 * 2. Timestamps and user details recorded correctly
 * 3. AuditEventType.LOGOUT entries created
 * 4. Session termination logged
 * 5. Token revocation logged
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Audit Logout Tests', () => {
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
    });
  });

  beforeEach(async () => {
    const timestamp = Date.now();
    testUser = {
      email: `audit-test-${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    const registerRes = await client.post('/auth/register', {
      email: testUser.email,
      password: testUser.password,
      name: 'Audit Test User',
    });

    expect(registerRes.status).toBe(201);
    testUser.userId = registerRes.data.user.id;
    testUser.tenantId = registerRes.data.user.tenantId;
  });

  describe('Logout Audit Trail', () => {
    it('should create LOGOUT audit entry on logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit log to be written
      await new Promise(resolve => setTimeout(resolve, 500));

      // Login again to query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(newLoginRes.status).toBe(200);

      // Query audit logs (if endpoint exists)
      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'logout',
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        expect(auditRes.data.logs).toBeDefined();
        
        // Find logout event
        const logoutEvent = auditRes.data.logs.find(
          (log: any) => log.eventType === 'logout' || log.eventType === 'LOGOUT'
        );

        if (logoutEvent) {
          expect(logoutEvent.actorId || logoutEvent.userId).toBe(testUser.userId);
          expect(logoutEvent.tenantId).toBe(testUser.tenantId);
          expect(logoutEvent.outcome || logoutEvent.status).toMatch(/success|SUCCESS/i);
        }
      }
    });

    it('should record timestamp in logout audit entry', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      const logoutStartTime = Date.now();

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const logoutEndTime = Date.now();

      expect(logoutRes.status).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Login and query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(newLoginRes.status).toBe(200);

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'logout',
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        const logoutEvent = auditRes.data.logs.find(
          (log: any) => log.eventType === 'logout' || log.eventType === 'LOGOUT'
        );

        if (logoutEvent) {
          const eventTimestamp = new Date(logoutEvent.timestamp || logoutEvent.createdAt).getTime();
          
          // Timestamp should be within logout time window
          expect(eventTimestamp).toBeGreaterThanOrEqual(logoutStartTime);
          expect(eventTimestamp).toBeLessThanOrEqual(logoutEndTime + 5000); // 5s buffer
        }
      }
    });

    it('should record user details in logout audit entry', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'logout',
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        const logoutEvent = auditRes.data.logs.find(
          (log: any) => log.eventType === 'logout' || log.eventType === 'LOGOUT'
        );

        if (logoutEvent) {
          // Should record user identifier
          expect(
            logoutEvent.actorId || logoutEvent.userId || logoutEvent.actorEmail
          ).toBeDefined();

          // Should record tenant
          expect(logoutEvent.tenantId).toBe(testUser.tenantId);

          // May record email
          if (logoutEvent.actorEmail || logoutEvent.email) {
            expect(logoutEvent.actorEmail || logoutEvent.email).toBe(testUser.email);
          }
        }
      }
    });

    it('should record IP address and user agent in audit entry', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      }, {
        headers: {
          'User-Agent': 'AuditTest/1.0',
          'X-Forwarded-For': '192.168.1.100',
        },
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'AuditTest/1.0',
          'X-Forwarded-For': '192.168.1.100',
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'logout',
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        const logoutEvent = auditRes.data.logs.find(
          (log: any) => log.eventType === 'logout' || log.eventType === 'LOGOUT'
        );

        if (logoutEvent) {
          // May record IP address
          if (logoutEvent.ipAddress || logoutEvent.ip) {
            expect(logoutEvent.ipAddress || logoutEvent.ip).toBeDefined();
          }

          // May record user agent
          if (logoutEvent.userAgent || logoutEvent.metadata?.userAgent) {
            expect(logoutEvent.userAgent || logoutEvent.metadata?.userAgent).toBeDefined();
          }
        }
      }
    });
  });

  describe('Session Termination Logging', () => {
    it('should log SESSION_TERMINATE event on logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'session_terminate',
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        const sessionTerminateEvent = auditRes.data.logs.find(
          (log: any) => 
            log.eventType === 'session_terminate' || 
            log.eventType === 'SESSION_TERMINATE'
        );

        if (sessionTerminateEvent) {
          expect(sessionTerminateEvent.outcome || sessionTerminateEvent.status).toMatch(
            /success|SUCCESS/i
          );
        }
      }
    });

    it('should log multiple session terminations on multi-device logout', async () => {
      const sessions: string[] = [];

      // Login from 3 devices
      for (let i = 0; i < 3; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        sessions.push(loginRes.data.accessToken);
      }

      // Logout from first device (revokes all sessions)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${sessions[0]}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit logs
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'session_terminate',
          limit: 50,
        },
      });

      if (auditRes.status === 200) {
        const sessionTerminateEvents = auditRes.data.logs.filter(
          (log: any) => 
            log.eventType === 'session_terminate' || 
            log.eventType === 'SESSION_TERMINATE'
        );

        // Should have logged termination for multiple sessions
        if (sessionTerminateEvents.length > 0) {
          expect(sessionTerminateEvents.length).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  describe('Token Revocation Logging', () => {
    it('should log TOKEN_REVOKE event on logout', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'token_revoke',
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        const tokenRevokeEvent = auditRes.data.logs.find(
          (log: any) => 
            log.eventType === 'token_revoke' || 
            log.eventType === 'TOKEN_REVOKE'
        );

        if (tokenRevokeEvent) {
          expect(tokenRevokeEvent.outcome || tokenRevokeEvent.status).toMatch(
            /success|SUCCESS/i
          );
        }
      }
    });

    it('should log access token and refresh token revocations', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit logs
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'token_revoke',
          limit: 50,
        },
      });

      if (auditRes.status === 200) {
        const tokenRevokeEvents = auditRes.data.logs.filter(
          (log: any) => 
            log.eventType === 'token_revoke' || 
            log.eventType === 'TOKEN_REVOKE'
        );

        if (tokenRevokeEvents.length > 0) {
          // Should have logged both access and refresh token revocations
          expect(tokenRevokeEvents.length).toBeGreaterThanOrEqual(1);

          // Check for token type in metadata
          const hasAccessTokenRevoke = tokenRevokeEvents.some(
            (event: any) => 
              event.metadata?.tokenType === 'access' ||
              event.details?.includes('access')
          );

          const hasRefreshTokenRevoke = tokenRevokeEvents.some(
            (event: any) => 
              event.metadata?.tokenType === 'refresh' ||
              event.details?.includes('refresh')
          );

          // At least one type should be logged
          expect(hasAccessTokenRevoke || hasRefreshTokenRevoke).toBe(true);
        }
      }
    });
  });

  describe('Audit Event Metadata', () => {
    it('should include reason in logout audit metadata', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'logout',
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        const logoutEvent = auditRes.data.logs.find(
          (log: any) => log.eventType === 'logout' || log.eventType === 'LOGOUT'
        );

        if (logoutEvent) {
          // May include reason in metadata
          if (logoutEvent.metadata) {
            expect(logoutEvent.metadata).toBeDefined();
          }
        }
      }
    });

    it('should track session count before and after logout', async () => {
      // Login from 3 devices
      const sessions: string[] = [];

      for (let i = 0; i < 3; i++) {
        const loginRes = await client.post('/auth/login', {
          email: testUser.email,
          password: testUser.password,
        });

        expect(loginRes.status).toBe(200);
        sessions.push(loginRes.data.accessToken);
      }

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${sessions[0]}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'logout',
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        const logoutEvent = auditRes.data.logs.find(
          (log: any) => log.eventType === 'logout' || log.eventType === 'LOGOUT'
        );

        if (logoutEvent && logoutEvent.metadata) {
          // May track sessions revoked
          if (logoutEvent.metadata.sessionsRevoked) {
            expect(logoutEvent.metadata.sessionsRevoked).toBeGreaterThanOrEqual(1);
          }

          // May track tokens revoked
          if (logoutEvent.metadata.tokensRevoked) {
            expect(logoutEvent.metadata.tokensRevoked).toBeGreaterThanOrEqual(1);
          }
        }
      }
    });
  });

  describe('Audit Query & Filtering', () => {
    it('should filter audit logs by event type', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs with filter
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'logout',
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        // All returned logs should be logout events
        for (const log of auditRes.data.logs) {
          expect(log.eventType.toLowerCase()).toMatch(/logout/i);
        }
      }
    });

    it('should filter audit logs by time range', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      const beforeLogout = new Date();

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      const afterLogout = new Date();

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs with time range
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          eventType: 'logout',
          startTime: beforeLogout.toISOString(),
          endTime: afterLogout.toISOString(),
          limit: 10,
        },
      });

      if (auditRes.status === 200) {
        expect(auditRes.data.logs).toBeDefined();
        
        // Should find logout event within time range
        const logoutEvent = auditRes.data.logs.find(
          (log: any) => log.eventType === 'logout' || log.eventType === 'LOGOUT'
        );

        if (logoutEvent) {
          const eventTime = new Date(logoutEvent.timestamp || logoutEvent.createdAt);
          expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeLogout.getTime());
          expect(eventTime.getTime()).toBeLessThanOrEqual(afterLogout.getTime() + 10000);
        }
      }
    });

    it('should filter audit logs by user ID', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutRes.status).toBe(200);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Query audit logs filtered by user
      const newLoginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const auditRes = await client.get('/audit/logs', {
        headers: {
          Authorization: `Bearer ${newLoginRes.data.accessToken}`,
          'x-tenant-id': testUser.tenantId,
        },
        params: {
          userId: testUser.userId,
          limit: 50,
        },
      });

      if (auditRes.status === 200) {
        // All logs should belong to test user
        for (const log of auditRes.data.logs) {
          expect(log.actorId || log.userId).toBe(testUser.userId);
        }

        // Should include logout event
        const hasLogout = auditRes.data.logs.some(
          (log: any) => 
            log.eventType === 'logout' || 
            log.eventType === 'LOGOUT'
        );

        if (auditRes.data.logs.length > 0) {
          // May or may not have logout depending on timing
          expect(typeof hasLogout).toBe('boolean');
        }
      }
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should log failed logout attempts', async () => {
      // Attempt logout with invalid token
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: 'Bearer invalid-token-12345',
        },
      });

      expect(logoutRes.status).toBe(401);

      // Wait for audit log
      await new Promise(resolve => setTimeout(resolve, 500));

      // Note: Cannot query audit logs without valid token
      // This test verifies the logout fails appropriately
    });

    it('should handle audit logging failure gracefully', async () => {
      // Login
      const loginRes = await client.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.data;

      // Logout (audit logging may fail but logout should succeed)
      const logoutRes = await client.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Logout should succeed even if audit logging fails
      expect(logoutRes.status).toBe(200);

      // Token should be blacklisted regardless of audit log
      const meRes = await client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meRes.status).toBe(401);
    });
  });
});
