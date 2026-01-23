/**
 * Notification Digest Repository
 * Handles all Cosmos DB operations for notification digests
 */
import { v4 as uuidv4 } from 'uuid';
/**
 * Notification Digest Repository
 */
export class NotificationDigestRepository {
    container;
    monitoring;
    constructor(client, databaseId, containerId, monitoring) {
        this.container = client.database(databaseId).container(containerId);
        this.monitoring = monitoring;
    }
    /**
     * Ensure container exists with HPK
     */
    static async ensureContainer(client, databaseId, containerId) {
        const database = client.database(databaseId);
        const { container } = await database.containers.createIfNotExists({
            id: containerId,
            partitionKey: {
                paths: ['/tenantId', '/userId', '/id'],
                kind: 'MultiHash', // Cosmos DB SDK type definition may not include MultiHash
                version: 2,
            },
            defaultTtl: 2592000, // 30 days in seconds
            indexingPolicy: {
                indexingMode: 'consistent',
                automatic: true,
                includedPaths: [
                    { path: '/' },
                    { path: '/tenantId/?' },
                    { path: '/userId/?' },
                    { path: '/channel/?' },
                    { path: '/status/?' },
                    { path: '/schedule/?' },
                    { path: '/periodEnd/?' },
                    { path: '/createdAt/?' },
                ],
                excludedPaths: [
                    { path: '/notificationIds/*' },
                ],
                compositeIndexes: [
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/userId', order: 'ascending' },
                        { path: '/status', order: 'ascending' },
                        { path: '/periodEnd', order: 'ascending' },
                    ],
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/userId', order: 'ascending' },
                        { path: '/channel', order: 'ascending' },
                        { path: '/periodEnd', order: 'ascending' },
                    ],
                ],
            },
        });
        return container;
    }
    /**
     * Create or update a digest
     * If a digest exists for the same user/channel/period, add notification IDs to it
     */
    async upsertDigest(tenantId, userId, channel, schedule, periodEnd, // ISO 8601
    notificationIds) {
        const now = new Date().toISOString();
        // Calculate period start based on schedule
        const periodEndDate = new Date(periodEnd);
        const periodStart = schedule === 'daily'
            ? new Date(periodEndDate.getTime() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago
            : new Date(periodEndDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
        // Try to find existing digest for this period
        const existing = await this.findByPeriod(tenantId, userId, channel, periodEnd);
        if (existing) {
            // Merge notification IDs (avoid duplicates)
            const mergedIds = Array.from(new Set([...existing.notificationIds, ...notificationIds]));
            const updated = {
                ...existing,
                notificationIds: mergedIds,
                updatedAt: now,
            };
            const partitionKey = [tenantId, userId, existing.id];
            const { resource } = await this.container.item(existing.id, partitionKey).replace(updated);
            if (!resource) {
                throw new Error('Failed to update digest');
            }
            return resource;
        }
        // Create new digest
        const id = uuidv4();
        const digest = {
            id,
            tenantId,
            userId,
            channel,
            schedule,
            periodStart,
            periodEnd,
            notificationIds,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        };
        const partitionKey = [tenantId, userId, id];
        const { resource } = await this.container.items.create(digest, {
            partitionKey,
        });
        if (!resource) {
            throw new Error('Failed to create digest');
        }
        return resource;
    }
    /**
     * Find digest by period (for a specific user, channel, and period end)
     */
    async findByPeriod(tenantId, userId, channel, periodEnd) {
        const query = {
            query: `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
          AND c.userId = @userId
          AND c.channel = @channel
          AND c.periodEnd = @periodEnd
          AND c.status = 'pending'
        ORDER BY c.createdAt DESC
        OFFSET 0 LIMIT 1
      `,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@userId', value: userId },
                { name: '@channel', value: channel },
                { name: '@periodEnd', value: periodEnd },
            ],
        };
        try {
            const { resources } = await this.container.items.query(query).fetchAll();
            return resources.length > 0 ? resources[0] : null;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'notification-digest.repository.find-by-period' });
            return null;
        }
    }
    /**
     * Find digests that are due to be sent (periodEnd <= now and status = 'pending')
     */
    async findDueDigests(limit = 100) {
        const now = new Date().toISOString();
        const query = {
            query: `
        SELECT * FROM c
        WHERE c.status = 'pending'
          AND c.periodEnd <= @now
        ORDER BY c.periodEnd ASC
        OFFSET 0 LIMIT @limit
      `,
            parameters: [
                { name: '@now', value: now },
                { name: '@limit', value: limit },
            ],
        };
        try {
            const { resources } = await this.container.items.query(query).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'notification-digest.repository.find-due-digests' });
            return [];
        }
    }
    /**
     * Get digest by ID
     */
    async findById(id, tenantId, userId) {
        try {
            const partitionKey = [tenantId, userId, id];
            const { resource } = await this.container.item(id, partitionKey).read();
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
     * Update digest status
     */
    async updateStatus(id, tenantId, userId, status, error) {
        const existing = await this.findById(id, tenantId, userId);
        if (!existing) {
            return null;
        }
        const now = new Date().toISOString();
        const updated = {
            ...existing,
            status,
            updatedAt: now,
        };
        if (status === 'compiled') {
            updated.compiledAt = now;
        }
        else if (status === 'sent') {
            updated.sentAt = now;
        }
        if (error) {
            updated.error = error;
        }
        const partitionKey = [tenantId, userId, id];
        const { resource } = await this.container.item(id, partitionKey).replace(updated);
        if (!resource) {
            throw new Error('Failed to update digest status');
        }
        return resource;
    }
    /**
     * Delete digest (for cleanup)
     */
    async delete(id, tenantId, userId) {
        try {
            const partitionKey = [tenantId, userId, id];
            await this.container.item(id, partitionKey).delete();
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
//# sourceMappingURL=notification-digest.repository.js.map