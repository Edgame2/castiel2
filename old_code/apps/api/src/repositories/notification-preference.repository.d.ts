/**
 * Notification Preference Repository
 * Handles Cosmos DB operations for user notification preferences
 */
import { Container, CosmosClient } from '@azure/cosmos';
import { NotificationPreferences, UpdateNotificationPreferencesInput } from '../types/notification.types.js';
/**
 * Notification Preference Repository
 */
export declare class NotificationPreferenceRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId?: string);
    /**
     * Ensure container exists
     */
    static ensureContainer(client: CosmosClient, databaseId: string, containerId?: string): Promise<Container>;
    /**
     * Get user's notification preferences
     */
    getPreferences(tenantId: string, userId: string): Promise<NotificationPreferences | null>;
    /**
     * Create or update notification preferences
     */
    upsertPreferences(tenantId: string, userId: string, preferences: NotificationPreferences | UpdateNotificationPreferencesInput): Promise<NotificationPreferences>;
    /**
     * Get default notification preferences
     */
    private getDefaultPreferences;
    /**
     * Delete user's notification preferences
     */
    deletePreferences(tenantId: string, userId: string): Promise<boolean>;
}
//# sourceMappingURL=notification-preference.repository.d.ts.map