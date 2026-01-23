/**
 * Notification Controller
 * Handles HTTP requests for notification operations
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { NotificationService } from '../services/notification.service.js';
import type { NotificationRealtimeService } from '../services/notification-realtime.service.js';
import type { PushNotificationService } from '../services/notifications/push-notification.service.js';
import { CreateAdminNotificationInput, NotificationStatus } from '../types/notification.types.js';
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
export declare class NotificationController {
    private readonly notificationService;
    private readonly realtimeService?;
    private readonly pushNotificationService?;
    constructor(notificationService: NotificationService, realtimeService?: NotificationRealtimeService | undefined, pushNotificationService?: PushNotificationService | undefined);
    /**
     * GET /api/v1/notifications
     * Get user's notifications
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic.
     */
    listNotifications(request: FastifyRequest<GetNotificationsParams>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/notifications/:id
     * Get a specific notification
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic.
     */
    getNotification(request: FastifyRequest<GetNotificationParams>, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/v1/notifications/:id
     * Update notification status
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic validation (status enum check).
     */
    updateNotification(request: FastifyRequest<UpdateNotificationParams>, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/notifications/:id
     * Delete a notification
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic.
     */
    deleteNotification(request: FastifyRequest<DeleteNotificationParams>, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/notifications/mark-all-read
     * Mark all notifications as read
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic.
     */
    markAllAsRead(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/notifications/unread-count
     * Get unread count
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic.
     */
    getUnreadCount(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/admin/notifications
     * Create notification(s) as admin
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic validation (required fields, conditional validation).
     */
    createAdminNotification(request: FastifyRequest<CreateAdminNotificationBody>, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/admin/notifications/stats
     * Get notification statistics
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic.
     */
    getStats(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/notifications/preferences
     * Get user's notification preferences
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic.
     */
    getPreferences(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/v1/notifications/preferences
     * Update user's notification preferences
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    updatePreferences(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/notifications/:id/delivery
     * Get delivery status for a specific notification
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    getNotificationDeliveryStatus(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/notifications/delivery
     * Get delivery tracking for user's notifications
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic.
     */
    getDeliveryTracking(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/notifications/push/vapid-key
     * Get VAPID public key for push notification subscription
     *
     * Note: Input validation is handled by Fastify schema validation (if defined).
     * This method handles business logic.
     */
    getVapidPublicKey(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/notifications/push/subscribe
     * Subscribe a device for push notifications
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic (device management).
     */
    subscribePushDevice(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/notifications/push/unsubscribe
     * Unsubscribe a device from push notifications
     *
     * Note: Input validation is handled by Fastify schema validation.
     * This method handles business logic (device management).
     */
    unsubscribePushDevice(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
export {};
//# sourceMappingURL=notification.controller.d.ts.map