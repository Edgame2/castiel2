/**
 * Notification Preference Repository
 * Handles Cosmos DB operations for user notification preferences
 */
/**
 * Notification Preference Repository
 */
export class NotificationPreferenceRepository {
    container;
    constructor(client, databaseId, containerId = 'notification-preferences') {
        this.container = client.database(databaseId).container(containerId);
    }
    /**
     * Ensure container exists
     */
    static async ensureContainer(client, databaseId, containerId = 'notification-preferences') {
        const database = client.database(databaseId);
        const { container } = await database.containers.createIfNotExists({
            id: containerId,
            partitionKey: {
                paths: ['/tenantId', '/userId'],
                kind: 'MultiHash', // Cosmos DB SDK type may not include MultiHash in types
                version: 2,
            },
            indexingPolicy: {
                indexingMode: 'consistent',
                automatic: true,
                includedPaths: [
                    { path: '/' },
                    { path: '/tenantId/?' },
                    { path: '/userId/?' },
                    { path: '/updatedAt/?' },
                ],
            },
        });
        return container;
    }
    /**
     * Get user's notification preferences
     */
    async getPreferences(tenantId, userId) {
        const partitionKey = [tenantId, userId];
        const itemId = `${tenantId}|${userId}`;
        try {
            const { resource } = await this.container.item(itemId, partitionKey).read();
            return resource || null;
        }
        catch (error) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Create or update notification preferences
     */
    async upsertPreferences(tenantId, userId, preferences) {
        const partitionKey = [tenantId, userId];
        const now = new Date().toISOString();
        // Get existing preferences or create defaults
        const existing = await this.getPreferences(tenantId, userId);
        let updatedPreferences;
        if (existing) {
            // Merge with existing preferences
            const input = preferences;
            updatedPreferences = {
                ...existing,
                globalSettings: {
                    ...existing.globalSettings,
                    ...input.globalSettings,
                },
                channels: {
                    ...existing.channels,
                    ...input.channels,
                },
                typePreferences: {
                    ...existing.typePreferences,
                    ...input.typePreferences,
                },
                updatedAt: now,
            };
        }
        else {
            // Create new preferences with defaults
            const defaultPreferences = this.getDefaultPreferences(tenantId, userId);
            const input = preferences;
            updatedPreferences = {
                ...defaultPreferences,
                globalSettings: {
                    ...defaultPreferences.globalSettings,
                    ...input.globalSettings,
                },
                channels: {
                    ...defaultPreferences.channels,
                    ...input.channels,
                },
                typePreferences: {
                    ...defaultPreferences.typePreferences,
                    ...input.typePreferences,
                },
                updatedAt: now,
                createdAt: now,
            };
        }
        const itemId = `${tenantId}|${userId}`;
        const { resource } = await this.container.item(itemId, partitionKey).replace(updatedPreferences);
        if (!resource) {
            throw new Error('Failed to save notification preferences');
        }
        return resource;
    }
    /**
     * Get default notification preferences
     */
    getDefaultPreferences(tenantId, userId) {
        const now = new Date().toISOString();
        return {
            userId,
            tenantId,
            globalSettings: {
                enabled: true,
                quietHoursEnabled: false,
            },
            channels: {
                'in-app': {
                    enabled: true,
                },
                'email': {
                    enabled: true,
                    digestEnabled: false,
                },
            },
            typePreferences: {
                success: { enabled: true, channels: ['in-app'] },
                error: { enabled: true, channels: ['in-app', 'email'] },
                warning: { enabled: true, channels: ['in-app', 'email'] },
                information: { enabled: true, channels: ['in-app'] },
                alert: { enabled: true, channels: ['in-app', 'email'] },
            },
            createdAt: now,
            updatedAt: now,
        };
    }
    /**
     * Delete user's notification preferences
     */
    async deletePreferences(tenantId, userId) {
        const partitionKey = [tenantId, userId];
        const itemId = `${tenantId}|${userId}`;
        try {
            await this.container.item(itemId, partitionKey).delete();
            return true;
        }
        catch (error) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }
}
//# sourceMappingURL=notification-preference.repository.js.map