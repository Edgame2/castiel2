/**
 * Notification Real-Time Service
 * Handles real-time broadcasting of notifications via WebSocket/SSE
 */
/**
 * Notification Real-Time Service
 * Broadcasts notifications to connected clients via Redis pub/sub
 */
export class NotificationRealtimeService {
    redis;
    monitoring;
    constructor(redis, monitoring) {
        this.redis = redis;
        this.monitoring = monitoring;
    }
    /**
     * Broadcast notification to a specific user
     */
    async broadcastToUser(notification) {
        try {
            const channel = `notification:${notification.tenantId}:${notification.userId}`;
            const payload = {
                type: 'notification',
                notification: {
                    id: notification.id,
                    name: notification.name,
                    content: notification.content,
                    type: notification.type,
                    link: notification.link,
                    status: notification.status,
                    priority: notification.priority,
                    createdAt: notification.createdAt,
                    metadata: notification.metadata,
                },
            };
            await this.redis.publish(channel, JSON.stringify(payload));
            this.monitoring.trackMetric('notification.broadcast', 1, {
                tenantId: notification.tenantId,
                userId: notification.userId,
                type: notification.type,
            });
        }
        catch (error) {
            this.monitoring.trackTrace(`Failed to broadcast notification: ${error}`, 'error');
            throw error;
        }
    }
    /**
     * Broadcast notification to multiple users
     */
    async broadcastToUsers(notification, userIds) {
        const promises = userIds.map(userId => {
            const userNotification = {
                ...notification,
                userId,
            };
            return this.broadcastToUser(userNotification);
        });
        await Promise.allSettled(promises);
    }
    /**
     * Broadcast unread count update to a user
     */
    async broadcastUnreadCount(tenantId, userId, count) {
        try {
            const channel = `notification:${tenantId}:${userId}`;
            const payload = {
                type: 'unread_count',
                count,
            };
            await this.redis.publish(channel, JSON.stringify(payload));
            this.monitoring.trackMetric('notification.unread_count.broadcast', 1, {
                tenantId,
                userId,
            });
        }
        catch (error) {
            this.monitoring.trackTrace(`Failed to broadcast unread count: ${error}`, 'error');
            // Don't throw - unread count updates are not critical
        }
    }
}
//# sourceMappingURL=notification-realtime.service.js.map