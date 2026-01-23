/**
 * Notification Repository
 * Handles all Cosmos DB operations for notifications
 */
import { Container, CosmosClient } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { Notification, NotificationListOptions, NotificationListResult, NotificationStatus } from '../types/notification.types.js';
/**
 * Notification Repository
 */
export declare class NotificationRepository {
    private container;
    private monitoring?;
    constructor(client: CosmosClient, databaseId: string, containerId: string, monitoring?: IMonitoringProvider);
    /**
     * Ensure container exists with HPK
     */
    static ensureContainer(client: CosmosClient, databaseId: string, containerId: string): Promise<Container>;
    /**
     * Create a notification
     */
    create(notification: Omit<Notification, 'id' | 'notificationId' | 'createdAt' | 'expiresAt'>): Promise<Notification>;
    /**
     * Get notification by ID
     */
    findById(id: string, tenantId: string, userId: string): Promise<Notification | null>;
    /**
     * List notifications for a user
     */
    list(tenantId: string, userId: string, options?: NotificationListOptions): Promise<NotificationListResult>;
    /**
     * Update notification status
     */
    updateStatus(id: string, tenantId: string, userId: string, status: NotificationStatus): Promise<Notification | null>;
    /**
     * Update notification (for delivery tracking and other updates)
     */
    update(id: string, tenantId: string, userId: string, updates: Partial<Notification>): Promise<Notification | null>;
    /**
     * Mark all notifications as read for a user
     */
    markAllAsRead(tenantId: string, userId: string): Promise<number>;
    /**
     * Delete notification
     */
    delete(id: string, tenantId: string, userId: string): Promise<boolean>;
    /**
     * Get unread count for a user
     */
    getUnreadCount(tenantId: string, userId: string): Promise<number>;
    /**
     * Fetch multiple notifications by IDs
     * Used for digest compilation
     */
    findByIds(ids: string[], tenantId: string, userId: string): Promise<Notification[]>;
}
//# sourceMappingURL=notification.repository.d.ts.map