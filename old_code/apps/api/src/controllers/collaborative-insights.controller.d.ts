/**
 * Collaborative Insights Controller
 *
 * HTTP handlers for Collaborative Insights API endpoints
 * Enables sharing, comments, reactions, and team collaboration on AI insights
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { CollaborativeInsightsService } from '../services/collaborative-insights.service.js';
/**
 * Collaborative Insights Controller
 */
export declare class CollaborativeInsightsController {
    private readonly service;
    constructor(service: CollaborativeInsightsService);
    /**
     * POST /api/v1/collaborative-insights/share
     * Share an insight
     */
    shareInsight(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/collaborative-insights/:insightId
     * Get a shared insight by ID
     */
    getInsight(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/collaborative-insights
     * List insights visible to user
     */
    listInsights(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/collaborative-insights/:insightId/reactions
     * Add reaction to insight
     */
    addReaction(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/collaborative-insights/:insightId/reactions
     * Remove reaction from insight
     */
    removeReaction(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/collaborative-insights/:insightId/comments
     * Add comment to insight
     */
    addComment(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * PATCH /api/v1/collaborative-insights/:insightId/comments/:commentId
     * Edit comment
     */
    editComment(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * DELETE /api/v1/collaborative-insights/:insightId/comments/:commentId
     * Delete comment
     */
    deleteComment(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/collaborative-insights/notifications
     * Get notifications for user
     */
    getNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/collaborative-insights/notifications/:notificationId/read
     * Mark notification as read
     */
    markNotificationRead(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * POST /api/v1/collaborative-insights/notifications/read-all
     * Mark all notifications as read
     */
    markAllNotificationsRead(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    /**
     * GET /api/v1/collaborative-insights/activity
     * Get activity feed
     */
    getActivityFeed(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
//# sourceMappingURL=collaborative-insights.controller.d.ts.map