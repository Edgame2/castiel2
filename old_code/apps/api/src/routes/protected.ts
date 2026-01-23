import type { FastifyInstance } from 'fastify';
import type { TokenValidationCacheService } from '../services/token-validation-cache.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuth, requireRole } from '../middleware/authorization.js';
import { getUser } from '../middleware/authenticate.js';

/**
 * Example protected routes
 * Demonstrates authentication and authorization
 */
export async function registerProtectedRoutes(
  server: FastifyInstance,
  tokenValidationCache: TokenValidationCacheService | null
): Promise<void> {
  /**
   * Protected route - requires authentication
   * GET /api/profile
   */
  server.get(
    '/api/profile',
    {
      onRequest: [
        authenticate(tokenValidationCache),
        requireAuth(),
      ],
    },
    async (request) => {
      const user = getUser(request);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
          roles: user.roles,
          organizationId: user.organizationId,
        },
      };
    }
  );

  /**
   * Admin only route - requires admin role
   * GET /api/admin/stats
   */
  server.get(
    '/api/admin/stats',
    {
      onRequest: [
        authenticate(tokenValidationCache),
        requireAuth(),
        requireRole('admin', 'owner'),
      ],
    },
    async (request) => {
      const user = getUser(request);

      return {
        success: true,
        message: 'Admin statistics',
        requestedBy: {
          id: user.id,
          email: user.email,
          roles: user.roles,
        },
        stats: {
          // Example stats
          totalUsers: 100,
          activeUsers: 75,
          totalTenants: 10,
        },
      };
    }
  );

  /**
   * GET /api/profile/notifications
   * Get user's notification preferences
   */
  server.get(
    '/api/profile/notifications',
    {
      onRequest: [
        authenticate(tokenValidationCache),
        requireAuth(),
      ],
    },
    async (request, reply) => {
      try {
        const user = getUser(request);
        
        // Get notification controller from server
        const notificationController = (server as any).notificationController;
        
        if (!notificationController) {
          // Return default preferences if notification service is not available
          return reply.send({
            emailNotifications: true,
            securityAlerts: true,
            productUpdates: false,
            weeklyDigest: false,
            mentionNotifications: true,
          });
        }

        // Get preferences from notification service
        const notificationService = (notificationController).notificationService;
        if (!notificationService) {
          return reply.send({
            emailNotifications: true,
            securityAlerts: true,
            productUpdates: false,
            weeklyDigest: false,
            mentionNotifications: true,
          });
        }

        const preferences = await notificationService.getPreferences(user.tenantId, user.id);
        
        // Transform to expected format
        const transformed = {
          emailNotifications: preferences?.channels?.email?.enabled ?? true,
          securityAlerts: preferences?.typePreferences?.security?.enabled ?? true,
          productUpdates: preferences?.typePreferences?.product?.enabled ?? false,
          weeklyDigest: preferences?.channels?.email?.digestFrequency === 'weekly',
          mentionNotifications: preferences?.typePreferences?.mention?.enabled ?? true,
        };

        return reply.send(transformed);
      } catch (error: any) {
        request.log.error({ error }, 'Failed to get notification preferences');
        // Return default preferences on error
        return reply.send({
          emailNotifications: true,
          securityAlerts: true,
          productUpdates: false,
          weeklyDigest: false,
          mentionNotifications: true,
        });
      }
    }
  );

  /**
   * PATCH /api/profile/notifications
   * Update user's notification preferences
   */
  server.patch(
    '/api/profile/notifications',
    {
      onRequest: [
        authenticate(tokenValidationCache),
        requireAuth(),
      ],
    },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const body = request.body as any;
        
        // Get notification controller from server
        const notificationController = (server as any).notificationController;
        
        if (!notificationController) {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Notification service is not available',
          });
        }

        // Get notification service
        const notificationService = (notificationController).notificationService;
        if (!notificationService) {
          return reply.status(503).send({
            error: 'Service Unavailable',
            message: 'Notification service is not available',
          });
        }

        // Transform frontend format to backend format
        const updateData: any = {
          channels: {
            email: {
              enabled: body.emailNotifications ?? true,
            },
          },
          typePreferences: {
            security: {
              enabled: body.securityAlerts ?? true,
            },
            product: {
              enabled: body.productUpdates ?? false,
            },
            mention: {
              enabled: body.mentionNotifications ?? true,
            },
          },
        };

        if (body.weeklyDigest) {
          updateData.channels.email.digestFrequency = 'weekly';
        }

        await notificationService.updatePreferences(user.tenantId, user.id, updateData);

        // Return transformed response
        return reply.send({
          emailNotifications: body.emailNotifications ?? true,
          securityAlerts: body.securityAlerts ?? true,
          productUpdates: body.productUpdates ?? false,
          weeklyDigest: body.weeklyDigest ?? false,
          mentionNotifications: body.mentionNotifications ?? true,
        });
      } catch (error: any) {
        request.log.error({ error }, 'Failed to update notification preferences');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update notification preferences',
        });
      }
    }
  );

  /**
   * GET /api/profile/activity
   * Get user's activity log
   */
  server.get(
    '/api/profile/activity',
    {
      onRequest: [
        authenticate(tokenValidationCache),
        requireAuth(),
      ],
    },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const query = request.query as { limit?: string };
        const limit = parseInt(query.limit || '20', 10);

        // Get audit log controller from server
        const auditLogController = (server as any).auditLogController;
        
        if (!auditLogController) {
          // Return empty activity if audit log service is not available
          return reply.send([]);
        }

        // Get audit log service
        const auditLogService = (auditLogController).auditLogService;
        if (!auditLogService) {
          return reply.send([]);
        }

        // Query audit logs for this user
        const logs = await auditLogService.query({
          tenantId: user.tenantId,
          actorId: user.id,
          limit: Math.min(limit, 100), // Max 100
          sortBy: 'timestamp',
          sortOrder: 'desc',
        });

        // Transform to expected format
        const activities = (logs.logs || []).map((log: any) => ({
          id: log.id,
          action: log.eventType || log.action || 'Unknown',
          description: log.description || `${log.eventType || 'Activity'} at ${new Date(log.timestamp).toLocaleString()}`,
          ipAddress: log.ipAddress || log.metadata?.ipAddress,
          userAgent: log.userAgent || log.metadata?.userAgent,
          timestamp: log.timestamp || log.createdAt,
        }));

        return reply.send(activities);
      } catch (error: any) {
        request.log.error({ error }, 'Failed to get user activity');
        // Return empty array on error
        return reply.send([]);
      }
    }
  );
}
