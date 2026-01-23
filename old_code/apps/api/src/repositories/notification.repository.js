/**
 * Notification Repository
 * Handles all Cosmos DB operations for notifications
 */
import { v4 as uuidv4 } from 'uuid';
/**
 * Notification Repository
 */
export class NotificationRepository {
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
                kind: 'MultiHash', // MultiHash requires type assertion
                version: 2,
            },
            defaultTtl: 7776000, // 90 days in seconds
            indexingPolicy: {
                indexingMode: 'consistent',
                automatic: true,
                includedPaths: [
                    { path: '/' }, // Required: root path must be included
                    { path: '/tenantId/?' },
                    { path: '/userId/?' },
                    { path: '/status/?' },
                    { path: '/type/?' },
                    { path: '/createdAt/?' },
                    { path: '/createdBy/type/?' },
                ],
                excludedPaths: [
                    { path: '/content/?' },
                    { path: '/metadata/*' },
                ],
                compositeIndexes: [
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/userId', order: 'ascending' },
                        { path: '/createdAt', order: 'descending' },
                    ],
                    [
                        { path: '/tenantId', order: 'ascending' },
                        { path: '/userId', order: 'ascending' },
                        { path: '/status', order: 'ascending' },
                        { path: '/createdAt', order: 'descending' },
                    ],
                ],
            },
        });
        return container;
    }
    /**
     * Create a notification
     */
    async create(notification) {
        const id = uuidv4();
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days
        const doc = {
            ...notification,
            id,
            notificationId: id, // Same as id for HPK
            createdAt: now,
            expiresAt,
        };
        // For HPK, partition key is an array [tenantId, userId, id]
        const partitionKey = [notification.tenantId, notification.userId, id];
        const { resource } = await this.container.item(id, partitionKey).replace(doc);
        if (!resource) {
            throw new Error('Failed to create notification');
        }
        return resource;
    }
    /**
     * Get notification by ID
     */
    async findById(id, tenantId, userId) {
        try {
            // For HPK, partition key is an array [tenantId, userId, id]
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
     * List notifications for a user
     */
    async list(tenantId, userId, options = {}) {
        const { status, type, limit = 20, offset = 0, } = options;
        // Build query
        let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId';
        const parameters = [
            { name: '@tenantId', value: tenantId },
            { name: '@userId', value: userId },
        ];
        if (status) {
            query += ' AND c.status = @status';
            parameters.push({ name: '@status', value: status });
        }
        if (type) {
            query += ' AND c.type = @type';
            parameters.push({ name: '@type', value: type });
        }
        query += ' ORDER BY c.createdAt DESC';
        // For HPK queries, don't pass partitionKey option
        // Cosmos DB automatically routes based on WHERE clause (tenantId and userId)
        // Get total count
        const countQuery = query.replace('SELECT *', 'SELECT VALUE COUNT(1)');
        const { resources: countResult } = await this.container.items
            .query({ query: countQuery, parameters })
            .fetchAll();
        const total = countResult[0] || 0;
        // Get paginated results
        query += ` OFFSET ${offset} LIMIT ${limit}`;
        const { resources } = await this.container.items
            .query({ query, parameters })
            .fetchAll();
        // Get unread count
        const unreadQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.status = @unreadStatus';
        const unreadParams = [
            { name: '@tenantId', value: tenantId },
            { name: '@userId', value: userId },
            { name: '@unreadStatus', value: 'unread' },
        ];
        const { resources: unreadResult } = await this.container.items
            .query({ query: unreadQuery, parameters: unreadParams })
            .fetchAll();
        const unreadCount = unreadResult[0] || 0;
        return {
            notifications: resources,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
            unreadCount,
        };
    }
    /**
     * Update notification status
     */
    async updateStatus(id, tenantId, userId, status) {
        const existing = await this.findById(id, tenantId, userId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            status,
            readAt: status === 'read' ? new Date().toISOString() : undefined,
        };
        const partitionKey = [tenantId, userId, id];
        const { resource } = await this.container.item(id, partitionKey).replace(updated);
        return resource;
    }
    /**
     * Update notification (for delivery tracking and other updates)
     */
    async update(id, tenantId, userId, updates) {
        const existing = await this.findById(id, tenantId, userId);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...updates,
        };
        const partitionKey = [tenantId, userId, id];
        const { resource } = await this.container.item(id, partitionKey).replace(updated);
        return resource;
    }
    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(tenantId, userId) {
        // Get all unread notifications
        const query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.status = @status';
        const parameters = [
            { name: '@tenantId', value: tenantId },
            { name: '@userId', value: userId },
            { name: '@status', value: 'unread' },
        ];
        // For HPK, don't pass partitionKey - Cosmos routes based on WHERE clause
        const { resources } = await this.container.items
            .query({ query, parameters })
            .fetchAll();
        // Update each notification
        const now = new Date().toISOString();
        let count = 0;
        for (const notification of resources) {
            const updated = {
                ...notification,
                status: 'read',
                readAt: now,
            };
            const itemPartitionKey = [tenantId, userId, notification.id];
            await this.container.item(notification.id, itemPartitionKey).replace(updated);
            count++;
        }
        return count;
    }
    /**
     * Delete notification
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
    /**
     * Get unread count for a user
     */
    async getUnreadCount(tenantId, userId) {
        const query = 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId AND c.status = @status';
        const parameters = [
            { name: '@tenantId', value: tenantId },
            { name: '@userId', value: userId },
            { name: '@status', value: 'unread' },
        ];
        // For HPK, don't pass partitionKey - Cosmos routes based on WHERE clause
        const { resources } = await this.container.items
            .query({ query, parameters })
            .fetchAll();
        return resources[0] || 0;
    }
    /**
     * Fetch multiple notifications by IDs
     * Used for digest compilation
     */
    async findByIds(ids, tenantId, userId) {
        if (ids.length === 0) {
            return [];
        }
        // Build query with IN clause
        const query = {
            query: `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
          AND c.userId = @userId
          AND ARRAY_CONTAINS(@ids, c.id)
        ORDER BY c.createdAt DESC
      `,
            parameters: [
                { name: '@tenantId', value: tenantId },
                { name: '@userId', value: userId },
                { name: '@ids', value: ids },
            ],
        };
        try {
            const { resources } = await this.container.items.query(query).fetchAll();
            return resources;
        }
        catch (error) {
            this.monitoring?.trackException(error, { operation: 'notification-repository.fetch-by-ids' });
            return [];
        }
    }
}
//# sourceMappingURL=notification.repository.js.map