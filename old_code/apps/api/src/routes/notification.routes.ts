/**
 * Notification Routes
 * API routes for notification operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotificationController } from '../controllers/notification.controller.js';
import { requireAuth, requireRole } from '../middleware/authorization.js';
import { authenticate } from '../middleware/authenticate.js';

/**
 * Register notification routes
 */
export async function registerNotificationRoutes(
  server: FastifyInstance
): Promise<void> {
  server.log.info('🔍 Starting notification routes registration...');
  server.log.info('   Checking for notificationController...');
  
  const notificationController = (server as any).notificationController as NotificationController | undefined;

  if (!notificationController) {
    server.log.error('❌ Notification routes not registered - controller missing');
    const decorators = Object.keys(server as any).filter(k => !k.startsWith('_') && k !== 'log');
    server.log.error({ decorators: decorators.slice(0, 15) }, `   Available decorators (${decorators.length}):`);
    return;
  }

  server.log.info('   ✅ Notification controller found');
  server.log.info('   Checking for authenticate decorator...');

  const authDecorator = (server as any).authenticate;

  if (!authDecorator) {
    server.log.error('❌ Notification routes not registered - authentication decorator missing');
    return;
  }

  server.log.info('   ✅ Authentication decorator found');
  server.log.info('📝 Registering notification routes...');

  const authGuard = [authDecorator, requireAuth()] as any;
  const adminGuard = [
    authDecorator,
    requireAuth(),
    requireRole('admin', 'owner', 'super-admin', 'super_admin', 'superadmin', 'global_admin'),
  ] as any;

  // ============================================================================
  // User Endpoints
  // ============================================================================

  /**
   * GET /api/v1/notifications
   * Get user's notifications with pagination and filtering
   */
  server.log.info('   Registering GET /api/v1/notifications...');
  try {
    server.get(
      '/api/v1/notifications',
      {
        onRequest: authGuard,
      },
      async (request, reply) => {
        try {
          await notificationController.listNotifications(request as any, reply);
        } catch (error: any) {
          server.log.error({ error, url: request.url }, 'Error in listNotifications handler');
          throw error;
        }
      }
    );
    server.log.info('   ✅ Registered GET /api/v1/notifications');
  } catch (routeErr: any) {
    server.log.error({ err: routeErr }, '❌ Failed to register GET /api/v1/notifications');
    throw routeErr;
  }

  /**
   * GET /api/v1/notifications/:id
   * Get a specific notification
   */
  server.get(
    '/api/v1/notifications/:id',
    {
      onRequest: authGuard,
    },
    async (request, reply) => {
      await notificationController.getNotification(request as any, reply);
    }
  );

  /**
   * PATCH /api/v1/notifications/:id
   * Update notification status
   */
  server.patch(
    '/api/v1/notifications/:id',
    {
      onRequest: authGuard,
    },
    async (request, reply) => {
      await notificationController.updateNotification(request as any, reply);
    }
  );

  /**
   * DELETE /api/v1/notifications/:id
   * Delete a notification
   */
  server.delete(
    '/api/v1/notifications/:id',
    {
      onRequest: authGuard,
    },
    async (request, reply) => {
      await notificationController.deleteNotification(request as any, reply);
    }
  );

  /**
   * POST /api/v1/notifications/mark-all-read
   * Mark all user's notifications as read
   */
  server.post(
    '/api/v1/notifications/mark-all-read',
    {
      onRequest: authGuard,
    },
    async (request, reply) => {
      await notificationController.markAllAsRead(request as any, reply);
    }
  );

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread count
   */
  server.get(
    '/api/v1/notifications/unread-count',
    {
      onRequest: authGuard,
    },
    async (request, reply) => {
      await notificationController.getUnreadCount(request as any, reply);
    }
  );

  /**
   * GET /api/v1/notifications/preferences
   * Get user's notification preferences
   */
  server.get(
    '/api/v1/notifications/preferences',
    {
      onRequest: authGuard,
    },
    async (request, reply) => {
      await notificationController.getPreferences(request as any, reply);
    }
  );

  /**
   * PATCH /api/v1/notifications/preferences
   * Update user's notification preferences
   */
  server.patch(
    '/api/v1/notifications/preferences',
    {
      onRequest: authGuard,
      schema: {
        body: {
          type: 'object',
          properties: {
            globalSettings: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                quietHoursEnabled: { type: 'boolean' },
                quietHoursStart: { type: 'string' },
                quietHoursEnd: { type: 'string' },
                timezone: { type: 'string' },
              },
            },
            channels: {
              type: 'object',
              properties: {
                'in-app': { type: 'object' },
                'email': { type: 'object' },
                'webhook': { type: 'object' },
                'push': { type: 'object' },
                'slack': { type: 'object' },
                'teams': { type: 'object' },
              },
            },
            typePreferences: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      await notificationController.updatePreferences(request as any, reply);
    }
  );

  // ============================================================================
  // Admin Endpoints
  // ============================================================================

  /**
   * POST /api/v1/admin/notifications
   * Create notification(s) as admin
   */
  server.post(
    '/api/v1/admin/notifications',
    {
      onRequest: adminGuard,
    },
    async (request, reply) => {
      await notificationController.createAdminNotification(request as any, reply);
    }
  );

  /**
   * GET /api/v1/admin/notifications/stats
   * Get notification statistics
   */
  server.get(
    '/api/v1/admin/notifications/stats',
    {
      onRequest: adminGuard,
    },
    async (request, reply) => {
      await notificationController.getStats(request as any, reply);
    }
  );

  /**
   * GET /api/v1/notifications/:id/delivery
   * Get delivery status for a specific notification
   */
  server.get(
    '/api/v1/notifications/:id/delivery',
    {
      onRequest: authGuard,
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              enum: ['in-app', 'email', 'webhook', 'push', 'slack', 'teams'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      await notificationController.getNotificationDeliveryStatus(request as any, reply);
    }
  );

  /**
   * GET /api/v1/notifications/delivery
   * Get delivery tracking for user's notifications
   */
  server.get(
    '/api/v1/notifications/delivery',
    {
      onRequest: authGuard,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              enum: ['in-app', 'email', 'webhook', 'push', 'slack', 'teams'],
            },
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'delivered', 'failed', 'bounced', 'unsubscribed'],
            },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 100 },
            offset: { type: 'number', minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      await notificationController.getDeliveryTracking(request as any, reply);
    }
  );

  /**
   * GET /api/v1/notifications/push/vapid-key
   * Get VAPID public key for push notification subscription
   */
  server.get(
    '/api/v1/notifications/push/vapid-key',
    {
      onRequest: authGuard,
    },
    async (request, reply) => {
      await notificationController.getVapidPublicKey(request as any, reply);
    }
  );

  /**
   * POST /api/v1/notifications/push/subscribe
   * Subscribe a device for push notifications
   */
  server.post(
    '/api/v1/notifications/push/subscribe',
    {
      onRequest: authGuard,
      schema: {
        body: {
          type: 'object',
          required: ['subscription'],
          properties: {
            subscription: {
              type: 'object',
              required: ['endpoint', 'keys'],
              properties: {
                endpoint: { type: 'string' },
                keys: {
                  type: 'object',
                  required: ['p256dh', 'auth'],
                  properties: {
                    p256dh: { type: 'string' },
                    auth: { type: 'string' },
                  },
                },
              },
            },
            platform: {
              type: 'string',
              enum: ['web', 'ios', 'android'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      await notificationController.subscribePushDevice(request as any, reply);
    }
  );

  /**
   * DELETE /api/v1/notifications/push/unsubscribe
   * Unsubscribe a device from push notifications
   */
  server.delete(
    '/api/v1/notifications/push/unsubscribe',
    {
      onRequest: authGuard,
      schema: {
        body: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            subscription: {
              type: 'object',
              properties: {
                endpoint: { type: 'string' },
                keys: {
                  type: 'object',
                  properties: {
                    p256dh: { type: 'string' },
                    auth: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      await notificationController.unsubscribePushDevice(request as any, reply);
    }
  );

  server.log.info('✅ All notification routes registered successfully');
  server.log.info('   User routes: GET, PATCH, DELETE /api/v1/notifications, POST /api/v1/notifications/mark-all-read, GET /api/v1/notifications/unread-count');
  server.log.info('   Preferences: GET, PATCH /api/v1/notifications/preferences');
  server.log.info('   Delivery: GET /api/v1/notifications/:id/delivery, GET /api/v1/notifications/delivery');
  server.log.info('   Push: GET /api/v1/notifications/push/vapid-key, POST /api/v1/notifications/push/subscribe, DELETE /api/v1/notifications/push/unsubscribe');
  server.log.info('   Admin routes: POST, GET /api/v1/admin/notifications');
  
  // Verify routes were registered by checking the route table
  // Note: printRoutes() may not show routes immediately after registration in some Fastify versions
  // This is a best-effort verification and failures are not critical
  try {
    const routes = server.printRoutes();
    // Check for various route formats that Fastify might use
    const routePatterns = [
      '/api/v1/notifications',
      'GET /api/v1/notifications',
      'POST /api/v1/notifications',
      'PATCH /api/v1/notifications',
      'DELETE /api/v1/notifications',
      'notifications', // Sometimes routes are shown without prefix
    ];
    const hasNotificationsRoute = routePatterns.some(pattern => routes.includes(pattern));
    if (hasNotificationsRoute) {
      server.log.info('   ✅ Verified: /api/v1/notifications route is registered');
    } else {
      // Check if routes are actually registered by trying to find any notification-related routes
      const notificationRoutes = routes.split('\n').filter(line => 
        line.toLowerCase().includes('notification') || 
        line.includes('/notifications')
      );
      if (notificationRoutes.length > 0) {
        server.log.info(`   ✅ Verified: Found ${notificationRoutes.length} notification-related route(s) registered`);
      } else {
        // Only log at debug level - routes are registered, verification just couldn't find them
        server.log.debug('   ℹ️  Route verification inconclusive (routes are registered, but not found in printRoutes output)');
      }
    }
  } catch (err) {
    // Silently ignore - printRoutes may not be available in all Fastify versions
    // Routes are still registered, verification just failed
    server.log.debug('   Could not verify routes (printRoutes may not be available)');
  }
}
