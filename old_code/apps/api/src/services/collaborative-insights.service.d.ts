/**
 * Collaborative Insights Service
 * Enable sharing, mentions, comments, and team collaboration on AI insights
 */
import { Redis } from 'ioredis';
import { IMonitoringProvider } from '@castiel/monitoring';
import { CollaborativeInsightsRepository } from '../repositories/collaborative-insights.repository.js';
export interface SharedInsight {
    id: string;
    tenantId: string;
    sourceType: 'conversation' | 'quick_insight' | 'scheduled' | 'proactive';
    sourceId: string;
    title: string;
    content: string;
    summary?: string;
    sharedBy: string;
    sharedAt: Date;
    visibility: InsightVisibility;
    sharedWith: ShareTarget[];
    views: number;
    reactions: InsightReaction[];
    comments: InsightComment[];
    relatedShardIds: string[];
    tags: string[];
    isPinned: boolean;
    isArchived: boolean;
    expiresAt?: Date;
    updatedAt: Date;
}
export type InsightVisibility = 'private' | 'team' | 'department' | 'tenant' | 'specific';
export interface ShareTarget {
    type: 'user' | 'team' | 'role';
    id: string;
    name: string;
    canComment: boolean;
    canReshare: boolean;
}
export interface InsightReaction {
    userId: string;
    userName: string;
    type: ReactionType;
    createdAt: Date;
}
export type ReactionType = '👍' | '❤️' | '💡' | '🎯' | '⭐' | '🔥';
export interface InsightComment {
    id: string;
    userId: string;
    userName: string;
    content: string;
    mentions: UserMention[];
    parentId?: string;
    isEdited: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserMention {
    userId: string;
    userName: string;
    startIndex: number;
    endIndex: number;
}
export interface InsightNotification {
    id: string;
    tenantId: string;
    userId: string;
    type: NotificationType;
    insightId: string;
    insightTitle: string;
    actorId: string;
    actorName: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
}
export type NotificationType = 'shared_with_you' | 'mentioned' | 'comment' | 'reply' | 'reaction';
export interface InsightCollection {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    createdBy: string;
    visibility: InsightVisibility;
    insightIds: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface ActivityFeed {
    items: ActivityFeedItem[];
    hasMore: boolean;
    nextCursor?: string;
}
export interface ActivityFeedItem {
    id: string;
    type: 'share' | 'comment' | 'reaction' | 'mention';
    insight: {
        id: string;
        title: string;
    };
    actor: {
        id: string;
        name: string;
    };
    preview?: string;
    timestamp: Date;
}
export declare class CollaborativeInsightsService {
    private readonly repository;
    private readonly redis;
    private readonly monitoring;
    private readonly INSIGHTS_KEY;
    private readonly NOTIFICATIONS_KEY;
    private readonly COLLECTIONS_KEY;
    private readonly FEED_KEY;
    private readonly CACHE_TTL;
    constructor(repository: CollaborativeInsightsRepository, redis: Redis | null, // Redis is optional (cache layer)
    monitoring: IMonitoringProvider);
    /**
     * Share an insight
     */
    shareInsight(tenantId: string, userId: string, userName: string, input: {
        sourceType: SharedInsight['sourceType'];
        sourceId: string;
        title: string;
        content: string;
        summary?: string;
        visibility: InsightVisibility;
        sharedWith?: ShareTarget[];
        relatedShardIds?: string[];
        tags?: string[];
        expiresAt?: Date;
    }): Promise<SharedInsight>;
    /**
     * Get shared insight by ID
     */
    getInsight(insightId: string, tenantId: string): Promise<SharedInsight | null>;
    /**
     * Record view
     */
    recordView(insightId: string, tenantId: string, userId: string): Promise<void>;
    /**
     * List insights visible to user
     */
    listInsightsForUser(tenantId: string, userId: string, options?: {
        visibility?: InsightVisibility;
        tags?: string[];
        limit?: number;
        offset?: number;
    }): Promise<SharedInsight[]>;
    /**
     * Add reaction to insight
     */
    addReaction(insightId: string, tenantId: string, userId: string, userName: string, reactionType: ReactionType): Promise<SharedInsight | null>;
    /**
     * Remove reaction
     */
    removeReaction(insightId: string, tenantId: string, userId: string): Promise<SharedInsight | null>;
    /**
     * Add comment to insight
     */
    addComment(insightId: string, tenantId: string, userId: string, userName: string, content: string, parentId?: string): Promise<InsightComment | null>;
    /**
     * Edit comment
     */
    editComment(insightId: string, tenantId: string, commentId: string, userId: string, newContent: string): Promise<InsightComment | null>;
    /**
     * Delete comment
     */
    deleteComment(insightId: string, tenantId: string, commentId: string, userId: string): Promise<boolean>;
    /**
     * Get notifications for user
     */
    getNotifications(tenantId: string, userId: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
    }): Promise<InsightNotification[]>;
    /**
     * Mark notification as read
     */
    markNotificationRead(tenantId: string, userId: string, notificationId: string): Promise<void>;
    /**
     * Mark all notifications as read
     */
    markAllNotificationsRead(tenantId: string, userId: string): Promise<void>;
    /**
     * Get unread count
     */
    getUnreadCount(tenantId: string, userId: string): Promise<number>;
    /**
     * Create a collection
     */
    createCollection(tenantId: string, userId: string, name: string, description?: string, visibility?: InsightVisibility): Promise<InsightCollection>;
    /**
     * Add insight to collection
     */
    addToCollection(collectionId: string, insightId: string, tenantId: string): Promise<InsightCollection | null>;
    /**
     * Get user's collections
     */
    getUserCollections(tenantId: string, userId: string): Promise<InsightCollection[]>;
    /**
     * Get activity feed for tenant
     */
    getActivityFeed(tenantId: string, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<ActivityFeed>;
    private canUserView;
    private extractMentions;
    /**
     * Cache insight in Redis
     */
    private cacheInsight;
    /**
     * Invalidate cache for an insight
     */
    private invalidateCache;
    private createNotification;
    private addToFeed;
}
export declare function createCollaborativeInsightsService(repository: CollaborativeInsightsRepository, redis: Redis | null, monitoring: IMonitoringProvider): CollaborativeInsightsService;
//# sourceMappingURL=collaborative-insights.service.d.ts.map