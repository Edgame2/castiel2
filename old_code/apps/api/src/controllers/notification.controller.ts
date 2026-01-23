/**
 * Notification Controller
 * Handles HTTP requests for notification operations
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type {
  NotificationService,
  PushNotificationService,
  type CreateAdminNotificationInput,
  type NotificationListOptions,
  type NotificationStatus,
  type UpdateNotificationPreferencesInput,
  type DeliveryTrackingOptions,
  type DeliveryChannel,
} from '@castiel/api-core';
import type { NotificationRealtimeService } from '../services/notification-realtime.service.js';
import type { AuthUser } from '../types/auth.types.js';
import { getUser } from '../middleware/authenticate.js';
import { AppError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/error-handler.js';

interface AuthenticatedRequest extends FastifyRequest {
  user: AuthUser;
}

interface GetNotificationsParams {
  Querystring: {
    status?: NotificationStatus;
    type?: string;
    limit?: number;
    offset?: number;
  };
}

interface GetNotificationParams {
  Params: {
    id: string;
  };
}

interface UpdateNotificationParams {
  Params: {
    id: string;
  };
  Body: {
    status: NotificationStatus;
  };
}

interface DeleteNotificationParams {
  Params: {
    id: string;
  };
}

interface CreateAdminNotificationBody {
  Body: CreateAdminNotificationInput;
}

export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly realtimeService?: NotificationRealtimeService,
    private readonly pushNotificationService?: PushNotificationService
  ) {}

  /**
   * GET /api/v1/notifications
   * Get user's notifications
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic.
   */
  async listNotifications(
    request: FastifyRequest<GetNotificationsParams>,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    const { status, type, limit = 20, offset = 0 } = request.query;

    const options: NotificationListOptions = {
      status,
      type: type as any,
      limit: Math.min(limit, 100), // Max 100
      offset,
    };

    try {
      const result = await this.notificationService.getUserNotifications(
        user.tenantId,
        user.id,
        options
      );

      reply.send(result);
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to list notifications');
      throw new AppError('Failed to retrieve notifications', 500);
    }
  }

  /**
   * GET /api/v1/notifications/:id
   * Get a specific notification
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic.
   */
  async getNotification(
    request: FastifyRequest<GetNotificationParams>,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    // Fastify schema validation ensures id is present (if schema defined)
    const { id } = request.params;

    try {
      const notification = await this.notificationService.getNotification(
        id,
        user.tenantId,
        user.id
      );

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      reply.send(notification);
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to get notification');
      throw new AppError('Failed to retrieve notification', 500);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id
   * Update notification status
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic validation (status enum check).
   */
  async updateNotification(
    request: FastifyRequest<UpdateNotificationParams>,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    // Fastify schema validation ensures id is present (if schema defined)
    const { id } = request.params;
    const { status } = request.body;

    // Business logic validation - status must be valid enum value
    if (!status || !['read', 'unread'].includes(status)) {
      throw new ValidationError('Invalid status. Must be "read" or "unread"');
    }

    try {
      const notification = await this.notificationService.updateNotificationStatus(
        id,
        user.tenantId,
        user.id,
        status
      );

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      // Broadcast unread count update
      if (this.realtimeService) {
        const unreadCount = await this.notificationService.getUnreadCount(
          user.tenantId,
          user.id
        );
        await this.realtimeService.broadcastUnreadCount(
          user.tenantId,
          user.id,
          unreadCount
        );
      }

      reply.send(notification);
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to update notification');
      throw new AppError('Failed to update notification', 500);
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   * Delete a notification
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic.
   */
  async deleteNotification(
    request: FastifyRequest<DeleteNotificationParams>,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    // Fastify schema validation ensures id is present (if schema defined)
    const { id } = request.params;

    try {
      const deleted = await this.notificationService.deleteNotification(
        id,
        user.tenantId,
        user.id
      );

      if (!deleted) {
        throw new NotFoundError('Notification not found');
      }

      // Broadcast unread count update
      if (this.realtimeService) {
        const unreadCount = await this.notificationService.getUnreadCount(
          user.tenantId,
          user.id
        );
        await this.realtimeService.broadcastUnreadCount(
          user.tenantId,
          user.id,
          unreadCount
        );
      }

      reply.send({ success: true });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to delete notification');
      throw new AppError('Failed to delete notification', 500);
    }
  }

  /**
   * POST /api/v1/notifications/mark-all-read
   * Mark all notifications as read
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic.
   */
  async markAllAsRead(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);

    try {
      const count = await this.notificationService.markAllAsRead(
        user.tenantId,
        user.id
      );

      // Broadcast unread count update
      if (this.realtimeService) {
        await this.realtimeService.broadcastUnreadCount(
          user.tenantId,
          user.id,
          0
        );
      }

      reply.send({ count });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to mark all as read');
      throw new AppError('Failed to mark all notifications as read', 500);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread count
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic.
   */
  async getUnreadCount(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);

    try {
      const count = await this.notificationService.getUnreadCount(
        user.tenantId,
        user.id
      );

      reply.send({ count });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to get unread count');
      throw new AppError('Failed to get unread count', 500);
    }
  }

  /**
   * POST /api/v1/admin/notifications
   * Create notification(s) as admin
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic validation (required fields, conditional validation).
   */
  async createAdminNotification(
    request: FastifyRequest<CreateAdminNotificationBody>,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    // Fastify schema validation ensures body structure is valid (if schema defined)
    const input = request.body;

    // Business logic validation - required fields
    if (!input.name || !input.content || !input.type || !input.targetType) {
      throw new ValidationError('Missing required fields: name, content, type, targetType');
    }

    // Business logic validation - conditional validation
    if (input.targetType === 'user' && (!input.targetUserIds || input.targetUserIds.length === 0)) {
      throw new ValidationError('targetUserIds is required when targetType is "user"');
    }

    try {
      const result = await this.notificationService.createAdminNotification(input, user);

      // Broadcast notifications to users
      if (this.realtimeService) {
        for (const notification of result.notifications) {
          await this.realtimeService.broadcastToUser(notification);
        }
      }

      reply.status(201).send(result);
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to create admin notification');
      throw new AppError('Failed to create notification', 500);
    }
  }

  /**
   * GET /api/v1/admin/notifications/stats
   * Get notification statistics
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic.
   */
  async getStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);

    try {
      const stats = await this.notificationService.getStats(user.tenantId);

      reply.send(stats);
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to get notification stats');
      throw new AppError('Failed to get notification statistics', 500);
    }
  }

  /**
   * GET /api/v1/notifications/preferences
   * Get user's notification preferences
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic.
   */
  async getPreferences(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);

    try {
      const preferences = await this.notificationService.getPreferences(user.tenantId, user.id);
      reply.send({ data: preferences });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to get notification preferences');
      throw new AppError('Failed to get notification preferences', 500);
    }
  }

  /**
   * PATCH /api/v1/notifications/preferences
   * Update user's notification preferences
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method handles business logic.
   */
  async updatePreferences(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    // Fastify schema validation ensures body structure is valid
    const body = request.body as UpdateNotificationPreferencesInput;

    try {
      const preferences = await this.notificationService.updatePreferences(
        user.tenantId,
        user.id,
        body
      );
      reply.send({ data: preferences });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to update notification preferences');
      throw new AppError('Failed to update notification preferences', 500);
    }
  }

  /**
   * GET /api/v1/notifications/:id/delivery
   * Get delivery status for a specific notification
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method handles business logic.
   */
  async getNotificationDeliveryStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    // Fastify schema validation ensures id is present and channel is valid enum (if provided)
    const params = request.params as { id: string };
    const query = request.query as { channel?: DeliveryChannel };

    try {
      const records = await this.notificationService.getNotificationDeliveryStatus(
        params.id,
        user.tenantId,
        user.id,
        query.channel
      );

      reply.send({ data: records });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to get notification delivery status');
      throw new AppError('Failed to get notification delivery status', 500);
    }
  }

  /**
   * GET /api/v1/notifications/delivery
   * Get delivery tracking for user's notifications
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method handles business logic.
   */
  async getDeliveryTracking(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    // Fastify schema validation ensures query parameters are valid (channel enum, limit/offset ranges)
    const query = request.query as {
      channel?: DeliveryChannel;
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    };

    const options: DeliveryTrackingOptions = {
      channel: query.channel,
      status: query.status as any,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit ? Math.min(query.limit, 100) : 20, // Max 100
      offset: query.offset || 0,
    };

    try {
      const result = await this.notificationService.getDeliveryTracking(
        user.tenantId,
        user.id,
        options
      );

      reply.send(result);
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to get delivery tracking');
      throw new AppError('Failed to get delivery tracking', 500);
    }
  }

  /**
   * GET /api/v1/notifications/push/vapid-key
   * Get VAPID public key for push notification subscription
   * 
   * Note: Input validation is handled by Fastify schema validation (if defined).
   * This method handles business logic.
   */
  async getVapidPublicKey(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.pushNotificationService) {
      throw new AppError('Push notification service is not available', 503);
    }

    try {
      const publicKey = this.pushNotificationService.getVapidPublicKey();
      if (!publicKey) {
        throw new AppError('VAPID keys are not configured', 503);
      }

      reply.send({ data: { publicKey } });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to get VAPID public key');
      throw new AppError('Failed to get VAPID public key', 500);
    }
  }

  /**
   * POST /api/v1/notifications/push/subscribe
   * Subscribe a device for push notifications
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method handles business logic (device management).
   */
  async subscribePushDevice(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    // Fastify schema validation ensures subscription structure is valid
    const body = request.body as {
      subscription: {
        endpoint: string;
        keys: {
          p256dh: string;
          auth: string;
        };
      };
      platform?: string;
    };

    try {
      // Get current preferences
      const preferences = await this.notificationService.getPreferences(user.tenantId, user.id);
      
      // Ensure push channel exists
      if (!preferences.channels.push) {
        preferences.channels.push = {
          enabled: true,
          devices: [],
        };
      }

      // Check if device already exists (by endpoint)
      const existingDeviceIndex = preferences.channels.push.devices?.findIndex(
        (device) => {
          try {
            const sub = typeof device.token === 'string' ? JSON.parse(device.token) : device.token;
            return sub.endpoint === body.subscription.endpoint;
          } catch {
            return device.token === body.subscription.endpoint;
          }
        }
      ) ?? -1;

      // Store subscription as JSON string in token field
      const subscriptionToken = JSON.stringify(body.subscription);
      const device = {
        token: subscriptionToken,
        platform: body.platform || 'web',
      };

      if (existingDeviceIndex >= 0 && preferences.channels.push.devices) {
        // Update existing device
        preferences.channels.push.devices[existingDeviceIndex] = device;
      } else {
        // Add new device
        if (!preferences.channels.push.devices) {
          preferences.channels.push.devices = [];
        }
        preferences.channels.push.devices.push(device);
      }

      // Enable push channel if not already enabled
      preferences.channels.push.enabled = true;

      // Update preferences
      await this.notificationService.updatePreferences(user.tenantId, user.id, {
        channels: {
          push: preferences.channels.push,
        },
      });

      reply.status(201).send({
        success: true,
        message: 'Device subscribed successfully',
        deviceCount: preferences.channels.push.devices.length,
      });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to subscribe push device');
      throw new AppError('Failed to subscribe push device', 500);
    }
  }

  /**
   * DELETE /api/v1/notifications/push/unsubscribe
   * Unsubscribe a device from push notifications
   * 
   * Note: Input validation is handled by Fastify schema validation.
   * This method handles business logic (device management).
   */
  async unsubscribePushDevice(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = getUser(request as AuthenticatedRequest);
    // Fastify schema validation ensures body structure is valid
    const body = request.body as {
      endpoint?: string;
      subscription?: {
        endpoint: string;
        keys?: {
          p256dh?: string;
          auth?: string;
        };
      };
    };

    // Business logic validation - need either endpoint or subscription.endpoint
    if (!body.endpoint && !body.subscription?.endpoint) {
      throw new ValidationError('Missing required field: endpoint or subscription.endpoint');
    }

    // At this point, at least one must exist due to validation above
    const endpointToRemove = body.endpoint || (body.subscription?.endpoint as string);

    try {
      // Get current preferences
      const preferences = await this.notificationService.getPreferences(user.tenantId, user.id);

      if (!preferences.channels.push?.devices || preferences.channels.push.devices.length === 0) {
        throw new NotFoundError('No push devices found');
      }

      // Find and remove device by endpoint
      const initialLength = preferences.channels.push.devices.length;
      preferences.channels.push.devices = preferences.channels.push.devices.filter((device) => {
        try {
          const sub = typeof device.token === 'string' ? JSON.parse(device.token) : device.token;
          return sub.endpoint !== endpointToRemove;
        } catch {
          return device.token !== endpointToRemove;
        }
      });

      if (preferences.channels.push.devices.length === initialLength) {
        throw new NotFoundError('Device not found');
      }

      // If no devices left, disable push channel
      if (preferences.channels.push.devices.length === 0) {
        preferences.channels.push.enabled = false;
      }

      // Update preferences
      await this.notificationService.updatePreferences(user.tenantId, user.id, {
        channels: {
          push: preferences.channels.push,
        },
      });

      reply.send({
        success: true,
        message: 'Device unsubscribed successfully',
        deviceCount: preferences.channels.push.devices.length,
      });
    } catch (error: unknown) {
      // Re-throw AppError instances (will be handled by Fastify error handler)
      if (error instanceof AppError) {
        throw error;
      }

      // Log and transform unknown errors
      request.log.error({ error }, 'Failed to unsubscribe push device');
      throw new AppError('Failed to unsubscribe push device', 500);
    }
  }
}






