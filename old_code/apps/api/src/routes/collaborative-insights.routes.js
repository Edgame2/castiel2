/**
 * Collaborative Insights Routes
 *
 * API routes for sharing, commenting, reacting, and collaborating on AI insights
 */
import { requireAuth } from '../middleware/authorization.js';
/**
 * Request validation schemas
 */
const shareInsightSchema = {
    description: 'Share an insight with team members',
    tags: ['Collaborative Insights'],
    body: {
        type: 'object',
        required: ['sourceType', 'sourceId', 'title', 'content', 'visibility'],
        properties: {
            sourceType: {
                type: 'string',
                enum: ['conversation', 'quick_insight', 'scheduled', 'proactive'],
            },
            sourceId: { type: 'string', minLength: 1 },
            title: { type: 'string', minLength: 1, maxLength: 500 },
            content: { type: 'string', minLength: 1, maxLength: 100000 },
            summary: { type: 'string', maxLength: 1000 },
            visibility: {
                type: 'string',
                enum: ['private', 'team', 'department', 'tenant', 'specific'],
            },
            sharedWith: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['type', 'id', 'name'],
                    properties: {
                        type: { type: 'string', enum: ['user', 'team', 'role'] },
                        id: { type: 'string' },
                        name: { type: 'string' },
                        canComment: { type: 'boolean' },
                        canReshare: { type: 'boolean' },
                    },
                },
                maxItems: 100,
            },
            relatedShardIds: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 50,
            },
            tags: {
                type: 'array',
                items: { type: 'string', maxLength: 50 },
                maxItems: 20,
            },
            expiresAt: { type: 'string', format: 'date-time' },
        },
    },
    response: {
        201: {
            description: 'Shared insight created successfully',
            type: 'object',
            properties: {
                id: { type: 'string' },
                sourceType: { type: 'string' },
                sourceId: { type: 'string' },
                title: { type: 'string' },
                visibility: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
            },
        },
        400: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
        401: {
            type: 'object',
            description: 'Unauthorized'
        },
    },
};
const getInsightSchema = {
    description: 'Get a shared insight by ID',
    tags: ['Collaborative Insights'],
    params: {
        type: 'object',
        required: ['insightId'],
        properties: {
            insightId: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            description: 'Shared insight',
        },
        404: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
    },
};
const listInsightsSchema = {
    description: 'List insights visible to user',
    tags: ['Collaborative Insights'],
    querystring: {
        type: 'object',
        properties: {
            visibility: {
                type: 'string',
                enum: ['private', 'team', 'department', 'tenant', 'specific'],
            },
            tags: { type: 'string', description: 'Comma-separated list of tags' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'number', minimum: 0, default: 0 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                insights: { type: 'array' },
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
            },
        },
    },
};
const addReactionSchema = {
    description: 'Add reaction to insight',
    tags: ['Collaborative Insights'],
    params: {
        type: 'object',
        required: ['insightId'],
        properties: {
            insightId: { type: 'string' },
        },
    },
    body: {
        type: 'object',
        required: ['reactionType'],
        properties: {
            reactionType: {
                type: 'string',
                enum: ['👍', '❤️', '💡', '🎯', '⭐', '🔥'],
            },
        },
    },
    response: {
        200: {
            type: 'object',
            description: 'Updated insight with reaction',
        },
        404: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
    },
};
const removeReactionSchema = {
    description: 'Remove reaction from insight',
    tags: ['Collaborative Insights'],
    params: {
        type: 'object',
        required: ['insightId'],
        properties: {
            insightId: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            description: 'Updated insight without reaction',
        },
        404: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
    },
};
const addCommentSchema = {
    description: 'Add comment to insight',
    tags: ['Collaborative Insights'],
    params: {
        type: 'object',
        required: ['insightId'],
        properties: {
            insightId: { type: 'string' },
        },
    },
    body: {
        type: 'object',
        required: ['content'],
        properties: {
            content: { type: 'string', minLength: 1, maxLength: 5000 },
            parentId: { type: 'string', description: 'Parent comment ID for threaded replies' },
        },
    },
    response: {
        201: {
            type: 'object',
            description: 'Comment created successfully',
        },
        404: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
    },
};
const editCommentSchema = {
    description: 'Edit comment',
    tags: ['Collaborative Insights'],
    params: {
        type: 'object',
        required: ['insightId', 'commentId'],
        properties: {
            insightId: { type: 'string' },
            commentId: { type: 'string' },
        },
    },
    body: {
        type: 'object',
        required: ['content'],
        properties: {
            content: { type: 'string', minLength: 1, maxLength: 5000 },
        },
    },
    response: {
        200: {
            type: 'object',
            description: 'Comment updated successfully',
        },
        404: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
    },
};
const deleteCommentSchema = {
    description: 'Delete comment',
    tags: ['Collaborative Insights'],
    params: {
        type: 'object',
        required: ['insightId', 'commentId'],
        properties: {
            insightId: { type: 'string' },
            commentId: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
            },
        },
        404: {
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' },
            },
        },
    },
};
const getNotificationsSchema = {
    description: 'Get notifications for user',
    tags: ['Collaborative Insights'],
    querystring: {
        type: 'object',
        properties: {
            unreadOnly: { type: 'boolean' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                notifications: { type: 'array' },
                unreadCount: { type: 'number' },
            },
        },
    },
};
const markNotificationReadSchema = {
    description: 'Mark notification as read',
    tags: ['Collaborative Insights'],
    params: {
        type: 'object',
        required: ['notificationId'],
        properties: {
            notificationId: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
            },
        },
    },
};
const markAllNotificationsReadSchema = {
    description: 'Mark all notifications as read',
    tags: ['Collaborative Insights'],
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
            },
        },
    },
};
const getActivityFeedSchema = {
    description: 'Get activity feed',
    tags: ['Collaborative Insights'],
    querystring: {
        type: 'object',
        properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            cursor: { type: 'string' },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                items: { type: 'array' },
                hasMore: { type: 'boolean' },
                nextCursor: { type: 'string' },
            },
        },
    },
};
/**
 * Register Collaborative Insights routes
 */
export async function registerCollaborativeInsightsRoutes(server, controller) {
    const authDecorator = server.authenticate;
    if (!authDecorator) {
        server.log.warn('⚠️ Collaborative Insights routes not registered - authentication decorator missing');
        return;
    }
    const authGuards = [authDecorator, requireAuth()];
    // Share insight
    server.post('/api/v1/collaborative-insights/share', {
        onRequest: authGuards,
        schema: shareInsightSchema,
    }, (request, reply) => controller.shareInsight(request, reply));
    // Get insight
    server.get('/api/v1/collaborative-insights/:insightId', {
        onRequest: authGuards,
        schema: getInsightSchema,
    }, (request, reply) => controller.getInsight(request, reply));
    // List insights
    server.get('/api/v1/collaborative-insights', {
        onRequest: authGuards,
        schema: listInsightsSchema,
    }, (request, reply) => controller.listInsights(request, reply));
    // Add reaction
    server.post('/api/v1/collaborative-insights/:insightId/reactions', {
        onRequest: authGuards,
        schema: addReactionSchema,
    }, (request, reply) => controller.addReaction(request, reply));
    // Remove reaction
    server.delete('/api/v1/collaborative-insights/:insightId/reactions', {
        onRequest: authGuards,
        schema: removeReactionSchema,
    }, (request, reply) => controller.removeReaction(request, reply));
    // Add comment
    server.post('/api/v1/collaborative-insights/:insightId/comments', {
        onRequest: authGuards,
        schema: addCommentSchema,
    }, (request, reply) => controller.addComment(request, reply));
    // Edit comment
    server.patch('/api/v1/collaborative-insights/:insightId/comments/:commentId', {
        onRequest: authGuards,
        schema: editCommentSchema,
    }, (request, reply) => controller.editComment(request, reply));
    // Delete comment
    server.delete('/api/v1/collaborative-insights/:insightId/comments/:commentId', {
        onRequest: authGuards,
        schema: deleteCommentSchema,
    }, (request, reply) => controller.deleteComment(request, reply));
    // Get notifications
    server.get('/api/v1/collaborative-insights/notifications', {
        onRequest: authGuards,
        schema: getNotificationsSchema,
    }, (request, reply) => controller.getNotifications(request, reply));
    // Mark notification as read
    server.post('/api/v1/collaborative-insights/notifications/:notificationId/read', {
        onRequest: authGuards,
        schema: markNotificationReadSchema,
    }, (request, reply) => controller.markNotificationRead(request, reply));
    // Mark all notifications as read
    server.post('/api/v1/collaborative-insights/notifications/read-all', {
        onRequest: authGuards,
        schema: markAllNotificationsReadSchema,
    }, (request, reply) => controller.markAllNotificationsRead(request, reply));
    // Get activity feed
    server.get('/api/v1/collaborative-insights/activity', {
        onRequest: authGuards,
        schema: getActivityFeedSchema,
    }, (request, reply) => controller.getActivityFeed(request, reply));
    server.log.info('Collaborative Insights routes registered');
}
//# sourceMappingURL=collaborative-insights.routes.js.map