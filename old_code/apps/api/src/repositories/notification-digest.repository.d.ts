/**
 * Notification Digest Repository
 * Handles all Cosmos DB operations for notification digests
 */
import { Container, CosmosClient } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { NotificationDigest, DigestSchedule, DeliveryChannel } from '../types/notification.types.js';
/**
 * Notification Digest Repository
 */
export declare class NotificationDigestRepository {
    private container;
    private monitoring?;
    constructor(client: CosmosClient, databaseId: string, containerId: string, monitoring?: IMonitoringProvider);
    /**
     * Ensure container exists with HPK
     */
    static ensureContainer(client: CosmosClient, databaseId: string, containerId: string): Promise<Container>;
    /**
     * Create or update a digest
     * If a digest exists for the same user/channel/period, add notification IDs to it
     */
    upsertDigest(tenantId: string, userId: string, channel: DeliveryChannel, schedule: DigestSchedule, periodEnd: string, // ISO 8601
    notificationIds: string[]): Promise<NotificationDigest>;
    /**
     * Find digest by period (for a specific user, channel, and period end)
     */
    findByPeriod(tenantId: string, userId: string, channel: DeliveryChannel, periodEnd: string): Promise<NotificationDigest | null>;
    /**
     * Find digests that are due to be sent (periodEnd <= now and status = 'pending')
     */
    findDueDigests(limit?: number): Promise<NotificationDigest[]>;
    /**
     * Get digest by ID
     */
    findById(id: string, tenantId: string, userId: string): Promise<NotificationDigest | null>;
    /**
     * Update digest status
     */
    updateStatus(id: string, tenantId: string, userId: string, status: NotificationDigest['status'], error?: string): Promise<NotificationDigest | null>;
    /**
     * Delete digest (for cleanup)
     */
    delete(id: string, tenantId: string, userId: string): Promise<boolean>;
}
//# sourceMappingURL=notification-digest.repository.d.ts.map