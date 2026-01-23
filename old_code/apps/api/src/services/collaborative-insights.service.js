/**
 * Collaborative Insights Service
 * Enable sharing, mentions, comments, and team collaboration on AI insights
 */
import { v4 as uuid } from 'uuid';
// ============================================
// Service
// ============================================
export class CollaborativeInsightsService {
    repository;
    redis;
    monitoring;
    INSIGHTS_KEY = 'collab:insights:';
    NOTIFICATIONS_KEY = 'collab:notifications:';
    COLLECTIONS_KEY = 'collab:collections:';
    FEED_KEY = 'collab:feed:';
    CACHE_TTL = 3600; // 1 hour cache TTL
    constructor(repository, redis, // Redis is optional (cache layer)
    monitoring) {
        this.repository = repository;
        this.redis = redis;
        this.monitoring = monitoring;
    }
    // ============================================
    // Sharing
    // ============================================
    /**
     * Share an insight
     */
    async shareInsight(tenantId, userId, userName, input) {
        const insight = {
            id: `shared_${uuid()}`,
            tenantId,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            title: input.title,
            content: input.content,
            summary: input.summary,
            sharedBy: userId,
            sharedAt: new Date(),
            visibility: input.visibility,
            sharedWith: input.sharedWith || [],
            views: 0,
            reactions: [],
            comments: [],
            relatedShardIds: input.relatedShardIds || [],
            tags: input.tags || [],
            isPinned: false,
            isArchived: false,
            expiresAt: input.expiresAt,
            updatedAt: new Date(),
        };
        // Save to Cosmos DB (primary storage)
        await this.repository.upsertInsight(insight);
        // Cache in Redis if available
        await this.cacheInsight(insight);
        // Send notifications to shared users
        for (const target of insight.sharedWith) {
            if (target.type === 'user') {
                await this.createNotification({
                    tenantId,
                    userId: target.id,
                    type: 'shared_with_you',
                    insightId: insight.id,
                    insightTitle: insight.title,
                    actorId: userId,
                    actorName: userName,
                    message: `${userName} shared an insight with you: "${insight.title}"`,
                });
            }
        }
        // Add to activity feed
        await this.addToFeed(tenantId, {
            id: uuid(),
            type: 'share',
            insight: { id: insight.id, title: insight.title },
            actor: { id: userId, name: userName },
            timestamp: new Date(),
        });
        this.monitoring.trackEvent('insight.shared', {
            tenantId,
            insightId: insight.id,
            visibility: input.visibility,
            sharedWithCount: insight.sharedWith.length,
        });
        return insight;
    }
    /**
     * Get shared insight by ID
     */
    async getInsight(insightId, tenantId) {
        // Try cache first
        if (this.redis) {
            const key = `${this.INSIGHTS_KEY}${tenantId}:${insightId}`;
            const cached = await this.redis.get(key);
            if (cached) {
                try {
                    return JSON.parse(cached);
                }
                catch {
                    // Invalid cache, continue to DB
                }
            }
        }
        // Fetch from Cosmos DB
        const insight = await this.repository.getInsight(insightId, tenantId);
        // Cache if found and Redis available
        if (insight && this.redis) {
            await this.cacheInsight(insight);
        }
        return insight;
    }
    /**
     * Record view
     */
    async recordView(insightId, tenantId, userId) {
        const insight = await this.getInsight(insightId, tenantId);
        if (!insight) {
            return;
        }
        insight.views++;
        insight.updatedAt = new Date();
        // Update in Cosmos DB
        await this.repository.updateInsight(insightId, tenantId, {
            views: insight.views,
            updatedAt: insight.updatedAt,
        });
        // Update cache
        await this.cacheInsight(insight);
    }
    /**
     * List insights visible to user
     */
    async listInsightsForUser(tenantId, userId, options) {
        // Fetch from Cosmos DB with filters
        const insights = await this.repository.listInsights(tenantId, {
            visibility: options?.visibility,
            tags: options?.tags,
            isArchived: false, // Don't show archived insights
            limit: options?.limit || 20,
            offset: options?.offset || 0,
        });
        // Filter by user permissions (canUserView)
        const visibleInsights = insights.filter(insight => this.canUserView(insight, userId));
        // Cache insights if Redis available
        if (this.redis) {
            for (const insight of visibleInsights) {
                await this.cacheInsight(insight);
            }
        }
        return visibleInsights;
    }
    // ============================================
    // Reactions
    // ============================================
    /**
     * Add reaction to insight
     */
    async addReaction(insightId, tenantId, userId, userName, reactionType) {
        const insight = await this.getInsight(insightId, tenantId);
        if (!insight) {
            return null;
        }
        // Remove existing reaction from same user
        insight.reactions = insight.reactions.filter(r => r.userId !== userId);
        // Add new reaction
        insight.reactions.push({
            userId,
            userName,
            type: reactionType,
            createdAt: new Date(),
        });
        insight.updatedAt = new Date();
        // Update in Cosmos DB
        await this.repository.updateInsight(insightId, tenantId, {
            reactions: insight.reactions,
            updatedAt: insight.updatedAt,
        });
        // Update cache
        await this.cacheInsight(insight);
        // Notify insight owner
        if (insight.sharedBy !== userId) {
            await this.createNotification({
                tenantId,
                userId: insight.sharedBy,
                type: 'reaction',
                insightId: insight.id,
                insightTitle: insight.title,
                actorId: userId,
                actorName: userName,
                message: `${userName} reacted ${reactionType} to your insight`,
            });
        }
        return insight;
    }
    /**
     * Remove reaction
     */
    async removeReaction(insightId, tenantId, userId) {
        const insight = await this.getInsight(insightId, tenantId);
        if (!insight) {
            return null;
        }
        insight.reactions = insight.reactions.filter(r => r.userId !== userId);
        insight.updatedAt = new Date();
        // Update in Cosmos DB
        await this.repository.updateInsight(insightId, tenantId, {
            reactions: insight.reactions,
            updatedAt: insight.updatedAt,
        });
        // Update cache
        await this.cacheInsight(insight);
        return insight;
    }
    // ============================================
    // Comments
    // ============================================
    /**
     * Add comment to insight
     */
    async addComment(insightId, tenantId, userId, userName, content, parentId) {
        const insight = await this.getInsight(insightId, tenantId);
        if (!insight) {
            return null;
        }
        // Extract mentions
        const mentions = this.extractMentions(content);
        const comment = {
            id: `comment_${uuid()}`,
            userId,
            userName,
            content,
            mentions,
            parentId,
            isEdited: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        insight.comments.push(comment);
        insight.updatedAt = new Date();
        // Update in Cosmos DB
        await this.repository.updateInsight(insightId, tenantId, {
            comments: insight.comments,
            updatedAt: insight.updatedAt,
        });
        // Update cache
        await this.cacheInsight(insight);
        // Notify insight owner
        if (insight.sharedBy !== userId) {
            await this.createNotification({
                tenantId,
                userId: insight.sharedBy,
                type: parentId ? 'reply' : 'comment',
                insightId: insight.id,
                insightTitle: insight.title,
                actorId: userId,
                actorName: userName,
                message: `${userName} commented on your insight: "${content.slice(0, 50)}..."`,
            });
        }
        // Notify mentioned users
        for (const mention of mentions) {
            if (mention.userId !== userId) {
                await this.createNotification({
                    tenantId,
                    userId: mention.userId,
                    type: 'mentioned',
                    insightId: insight.id,
                    insightTitle: insight.title,
                    actorId: userId,
                    actorName: userName,
                    message: `${userName} mentioned you in a comment`,
                });
            }
        }
        // Add to activity feed
        await this.addToFeed(tenantId, {
            id: uuid(),
            type: 'comment',
            insight: { id: insight.id, title: insight.title },
            actor: { id: userId, name: userName },
            preview: content.slice(0, 100),
            timestamp: new Date(),
        });
        this.monitoring.trackEvent('insight.comment-added', {
            tenantId,
            insightId,
            commentId: comment.id,
        });
        return comment;
    }
    /**
     * Edit comment
     */
    async editComment(insightId, tenantId, commentId, userId, newContent) {
        const insight = await this.getInsight(insightId, tenantId);
        if (!insight) {
            return null;
        }
        const comment = insight.comments.find(c => c.id === commentId);
        if (!comment || comment.userId !== userId) {
            return null;
        }
        comment.content = newContent;
        comment.mentions = this.extractMentions(newContent);
        comment.isEdited = true;
        comment.updatedAt = new Date();
        insight.updatedAt = new Date();
        // Update in Cosmos DB
        await this.repository.updateInsight(insightId, tenantId, {
            comments: insight.comments,
            updatedAt: insight.updatedAt,
        });
        // Update cache
        await this.cacheInsight(insight);
        return comment;
    }
    /**
     * Delete comment
     */
    async deleteComment(insightId, tenantId, commentId, userId) {
        const insight = await this.getInsight(insightId, tenantId);
        if (!insight) {
            return false;
        }
        const commentIndex = insight.comments.findIndex(c => c.id === commentId);
        if (commentIndex < 0) {
            return false;
        }
        // Only author can delete
        if (insight.comments[commentIndex].userId !== userId) {
            return false;
        }
        insight.comments.splice(commentIndex, 1);
        insight.updatedAt = new Date();
        // Update in Cosmos DB
        await this.repository.updateInsight(insightId, tenantId, {
            comments: insight.comments,
            updatedAt: insight.updatedAt,
        });
        // Update cache
        await this.cacheInsight(insight);
        return true;
    }
    // ============================================
    // Notifications
    // ============================================
    /**
     * Get notifications for user
     */
    async getNotifications(tenantId, userId, options) {
        if (!this.redis) {
            return [];
        }
        const key = `${this.NOTIFICATIONS_KEY}${tenantId}:${userId}`;
        const all = await this.redis.lrange(key, 0, options?.limit || 50);
        let notifications = all.map(n => JSON.parse(n));
        if (options?.unreadOnly) {
            notifications = notifications.filter(n => !n.isRead);
        }
        return notifications;
    }
    /**
     * Mark notification as read
     */
    async markNotificationRead(tenantId, userId, notificationId) {
        const notifications = await this.getNotifications(tenantId, userId);
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && this.redis) {
            notification.isRead = true;
            // Re-save all notifications
            const key = `${this.NOTIFICATIONS_KEY}${tenantId}:${userId}`;
            await this.redis.del(key);
            for (const n of notifications.reverse()) {
                await this.redis.lpush(key, JSON.stringify(n));
            }
        }
    }
    /**
     * Mark all notifications as read
     */
    async markAllNotificationsRead(tenantId, userId) {
        if (!this.redis) {
            return;
        }
        const notifications = await this.getNotifications(tenantId, userId);
        const key = `${this.NOTIFICATIONS_KEY}${tenantId}:${userId}`;
        await this.redis.del(key);
        for (const n of notifications.reverse()) {
            n.isRead = true;
            await this.redis.lpush(key, JSON.stringify(n));
        }
    }
    /**
     * Get unread count
     */
    async getUnreadCount(tenantId, userId) {
        const notifications = await this.getNotifications(tenantId, userId, { unreadOnly: true });
        return notifications.length;
    }
    // ============================================
    // Collections
    // ============================================
    /**
     * Create a collection
     */
    async createCollection(tenantId, userId, name, description, visibility = 'private') {
        const collection = {
            id: `coll_${uuid()}`,
            tenantId,
            name,
            description,
            createdBy: userId,
            visibility,
            insightIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        if (!this.redis) {
            return collection;
        }
        const key = `${this.COLLECTIONS_KEY}${tenantId}:${collection.id}`;
        await this.redis.set(key, JSON.stringify(collection));
        return collection;
    }
    /**
     * Add insight to collection
     */
    async addToCollection(collectionId, insightId, tenantId) {
        if (!this.redis) {
            return null;
        }
        const key = `${this.COLLECTIONS_KEY}${tenantId}:${collectionId}`;
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        const collection = JSON.parse(data);
        if (!collection.insightIds.includes(insightId)) {
            collection.insightIds.push(insightId);
            collection.updatedAt = new Date();
            await this.redis.set(key, JSON.stringify(collection));
        }
        return collection;
    }
    /**
     * Get user's collections
     */
    async getUserCollections(tenantId, userId) {
        if (!this.redis) {
            return [];
        }
        const pattern = `${this.COLLECTIONS_KEY}${tenantId}:*`;
        const keys = await this.redis.keys(pattern);
        const collections = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const collection = JSON.parse(data);
                if (collection.createdBy === userId ||
                    collection.visibility === 'tenant') {
                    collections.push(collection);
                }
            }
        }
        return collections.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    // ============================================
    // Activity Feed
    // ============================================
    /**
     * Get activity feed for tenant
     */
    async getActivityFeed(tenantId, options) {
        const key = `${this.FEED_KEY}${tenantId}`;
        const limit = options?.limit || 20;
        const start = options?.cursor ? parseInt(options.cursor) : 0;
        const items = await this.redis.lrange(key, start, start + limit);
        const total = await this.redis.llen(key);
        return {
            items: items.map(i => JSON.parse(i)),
            hasMore: start + limit < total,
            nextCursor: start + limit < total ? String(start + limit) : undefined,
        };
    }
    // ============================================
    // Helpers
    // ============================================
    canUserView(insight, userId) {
        if (insight.isArchived) {
            return false;
        }
        if (insight.expiresAt && new Date(insight.expiresAt) < new Date()) {
            return false;
        }
        if (insight.sharedBy === userId) {
            return true;
        }
        if (insight.visibility === 'tenant') {
            return true;
        }
        if (insight.visibility === 'specific') {
            return insight.sharedWith.some(t => t.type === 'user' && t.id === userId);
        }
        return false;
    }
    extractMentions(content) {
        const mentions = [];
        const regex = /@\[([^\]]+)\]\(user:([^)]+)\)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            mentions.push({
                userName: match[1],
                userId: match[2],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
            });
        }
        return mentions;
    }
    /**
     * Cache insight in Redis
     */
    async cacheInsight(insight) {
        if (!this.redis) {
            return;
        }
        const key = `${this.INSIGHTS_KEY}${insight.tenantId}:${insight.id}`;
        await this.redis.setex(key, this.CACHE_TTL, JSON.stringify(insight));
    }
    /**
     * Invalidate cache for an insight
     */
    async invalidateCache(insightId, tenantId) {
        if (!this.redis) {
            return;
        }
        const key = `${this.INSIGHTS_KEY}${tenantId}:${insightId}`;
        await this.redis.del(key);
    }
    async createNotification(input) {
        const notification = {
            ...input,
            id: `notif_${uuid()}`,
            isRead: false,
            createdAt: new Date(),
        };
        if (!this.redis) {
            return;
        }
        const key = `${this.NOTIFICATIONS_KEY}${input.tenantId}:${input.userId}`;
        await this.redis.lpush(key, JSON.stringify(notification));
        await this.redis.ltrim(key, 0, 99); // Keep last 100 notifications
    }
    async addToFeed(tenantId, item) {
        if (!this.redis) {
            return;
        }
        const key = `${this.FEED_KEY}${tenantId}`;
        await this.redis.lpush(key, JSON.stringify(item));
        await this.redis.ltrim(key, 0, 499); // Keep last 500 items
    }
}
// ============================================
// Factory
// ============================================
export function createCollaborativeInsightsService(repository, redis, monitoring) {
    return new CollaborativeInsightsService(repository, redis, monitoring);
}
//# sourceMappingURL=collaborative-insights.service.js.map