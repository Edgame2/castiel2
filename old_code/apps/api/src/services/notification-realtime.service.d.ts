/**
 * Notification Real-Time Service
 * Handles real-time broadcasting of notifications via WebSocket/SSE
 */
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { Notification } from '../types/notification.types.js';
/**
 * Notification Real-Time Service
 * Broadcasts notifications to connected clients via Redis pub/sub
 */
export declare class NotificationRealtimeService {
    private redis;
    private monitoring;
    constructor(redis: Redis, monitoring: IMonitoringProvider);
    /**
     * Broadcast notification to a specific user
     */
    broadcastToUser(notification: Notification): Promise<void>;
    /**
     * Broadcast notification to multiple users
     */
    broadcastToUsers(notification: Notification, userIds: string[]): Promise<void>;
    /**
     * Broadcast unread count update to a user
     */
    broadcastUnreadCount(tenantId: string, userId: string, count: number): Promise<void>;
}
//# sourceMappingURL=notification-realtime.service.d.ts.map