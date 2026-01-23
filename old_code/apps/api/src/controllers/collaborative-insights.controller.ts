/**
 * Collaborative Insights Controller
 * 
 * HTTP handlers for Collaborative Insights API endpoints
 * Enables sharing, comments, reactions, and team collaboration on AI insights
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { CollaborativeInsightsService } from '../services/collaborative-insights.service.js';
import { getUser } from '../middleware/authenticate.js';
import { AppError, NotFoundError } from '../middleware/error-handler.js';
import type {
  SharedInsight,
  InsightVisibility,
  ShareTarget,
  ReactionType,
  InsightComment,
  InsightNotification,
  InsightCollection,
  ActivityFeed,
} from '../services/collaborative-insights.service.js';

/**
 * Request body types
 */
interface ShareInsightBody {
  sourceType: 'conversation' | 'quick_insight' | 'scheduled' | 'proactive';
  sourceId: string;
  title: string;
  content: string;
  summary?: string;
  visibility: InsightVisibility;
  sharedWith?: ShareTarget[];
  relatedShardIds?: string[];
  tags?: string[];
  expiresAt?: string; // ISO 8601 date string
}

interface AddReactionBody {
  reactionType: ReactionType;
}

interface AddCommentBody {
  content: string;
  parentId?: string;
}

interface EditCommentBody {
  content: string;
}

interface CreateCollectionBody {
  name: string;
  description?: string;
  visibility?: InsightVisibility;
}

interface AddToCollectionBody {
  insightId: string;
}

/**
 * Query parameters
 */
interface ListInsightsQuery {
  visibility?: InsightVisibility;
  tags?: string;
  limit?: number;
  offset?: number;
}

interface ActivityFeedQuery {
  limit?: number;
  cursor?: string;
}

interface NotificationsQuery {
  unreadOnly?: boolean;
  limit?: number;
}

/**
 * Collaborative Insights Controller
 */
export class CollaborativeInsightsController {
  constructor(
    private readonly service: CollaborativeInsightsService
  ) {}

  /**
   * POST /api/v1/collaborative-insights/share
   * Share an insight
   */
  async shareInsight(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const body = request.body as ShareInsightBody;

      // Validate required fields
      if (!body.sourceType || !body.sourceId || !body.title || !body.content || !body.visibility) {
        throw new AppError('Missing required fields: sourceType, sourceId, title, content, visibility', 400);
      }

      // Validate visibility
      const validVisibilities: InsightVisibility[] = ['private', 'team', 'department', 'tenant', 'specific'];
      if (!validVisibilities.includes(body.visibility)) {
        throw new AppError(`Invalid visibility. Must be one of: ${validVisibilities.join(', ')}`, 400);
      }

      // Parse expiresAt if provided
      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
      if (expiresAt && isNaN(expiresAt.getTime())) {
        throw new AppError('Invalid expiresAt date format. Must be ISO 8601', 400);
      }

      // Get user name
      const userName = (user as any).name || user.email || 'Unknown User';

      const insight = await this.service.shareInsight(
        user.tenantId,
        user.id,
        userName,
        {
          sourceType: body.sourceType,
          sourceId: body.sourceId,
          title: body.title,
          content: body.content,
          summary: body.summary,
          visibility: body.visibility,
          sharedWith: body.sharedWith,
          relatedShardIds: body.relatedShardIds,
          tags: body.tags,
          expiresAt,
        }
      );

      reply.status(201).send(insight);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to share insight');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to share insight',
      });
    }
  }

  /**
   * GET /api/v1/collaborative-insights/:insightId
   * Get a shared insight by ID
   */
  async getInsight(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { insightId } = request.params as { insightId: string };

      if (!insightId) {
        throw new AppError('insightId is required', 400);
      }

      const insight = await this.service.getInsight(insightId, user.tenantId);

      if (!insight) {
        throw new NotFoundError('Insight not found');
      }

      // Record view
      await this.service.recordView(insightId, user.tenantId, user.id);

      reply.status(200).send(insight);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get insight');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to get insight',
      });
    }
  }

  /**
   * GET /api/v1/collaborative-insights
   * List insights visible to user
   */
  async listInsights(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      if (!user || !user.tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const query = request.query as ListInsightsQuery;

      // Parse tags from comma-separated string
      const tags = query.tags ? query.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : undefined;

      // Validate limit and offset
      const limit = query.limit ? Math.min(Math.max(1, query.limit), 100) : 20;
      const offset = query.offset ? Math.max(0, query.offset) : 0;

      const insights = await this.service.listInsightsForUser(
        user.tenantId,
        user.id,
        {
          visibility: query.visibility,
          tags,
          limit,
          offset,
        }
      );

      reply.status(200).send({
        insights,
        total: insights.length,
        limit,
        offset,
      });
    } catch (error: any) {
      const errorDetails = {
        error,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 200),
        statusCode: error.statusCode,
        tenantId: (request as any).user?.tenantId,
        userId: (request as any).user?.id,
      };
      
      request.log.error(errorDetails, 'Failed to list insights');
      
      const statusCode = error.statusCode || (error.message?.includes('not found') ? 404 : 500);
      reply.status(statusCode).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to list insights',
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
      });
    }
  }

  /**
   * POST /api/v1/collaborative-insights/:insightId/reactions
   * Add reaction to insight
   */
  async addReaction(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { insightId } = request.params as { insightId: string };
      const body = request.body as AddReactionBody;

      if (!insightId) {
        throw new AppError('insightId is required', 400);
      }

      if (!body.reactionType) {
        throw new AppError('reactionType is required', 400);
      }

      // Validate reaction type
      const validReactions: ReactionType[] = ['👍', '❤️', '💡', '🎯', '⭐', '🔥'];
      if (!validReactions.includes(body.reactionType)) {
        throw new AppError(`Invalid reactionType. Must be one of: ${validReactions.join(', ')}`, 400);
      }

      const userName = (user as any).name || user.email || 'Unknown User';

      const insight = await this.service.addReaction(
        insightId,
        user.tenantId,
        user.id,
        userName,
        body.reactionType
      );

      if (!insight) {
        throw new NotFoundError('Insight not found');
      }

      reply.status(200).send(insight);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to add reaction');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to add reaction',
      });
    }
  }

  /**
   * DELETE /api/v1/collaborative-insights/:insightId/reactions
   * Remove reaction from insight
   */
  async removeReaction(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { insightId } = request.params as { insightId: string };

      if (!insightId) {
        throw new AppError('insightId is required', 400);
      }

      const insight = await this.service.removeReaction(
        insightId,
        user.tenantId,
        user.id
      );

      if (!insight) {
        throw new NotFoundError('Insight not found');
      }

      reply.status(200).send(insight);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to remove reaction');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to remove reaction',
      });
    }
  }

  /**
   * POST /api/v1/collaborative-insights/:insightId/comments
   * Add comment to insight
   */
  async addComment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { insightId } = request.params as { insightId: string };
      const body = request.body as AddCommentBody;

      if (!insightId) {
        throw new AppError('insightId is required', 400);
      }

      if (!body.content || body.content.trim().length === 0) {
        throw new AppError('content is required and cannot be empty', 400);
      }

      // Validate content length
      if (body.content.length > 5000) {
        throw new AppError('Comment content cannot exceed 5000 characters', 400);
      }

      const userName = (user as any).name || user.email || 'Unknown User';

      const comment = await this.service.addComment(
        insightId,
        user.tenantId,
        user.id,
        userName,
        body.content,
        body.parentId
      );

      if (!comment) {
        throw new NotFoundError('Insight not found');
      }

      reply.status(201).send(comment);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to add comment');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to add comment',
      });
    }
  }

  /**
   * PATCH /api/v1/collaborative-insights/:insightId/comments/:commentId
   * Edit comment
   */
  async editComment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { insightId, commentId } = request.params as { insightId: string; commentId: string };
      const body = request.body as EditCommentBody;

      if (!insightId || !commentId) {
        throw new AppError('insightId and commentId are required', 400);
      }

      if (!body.content || body.content.trim().length === 0) {
        throw new AppError('content is required and cannot be empty', 400);
      }

      // Validate content length
      if (body.content.length > 5000) {
        throw new AppError('Comment content cannot exceed 5000 characters', 400);
      }

      const comment = await this.service.editComment(
        insightId,
        user.tenantId,
        commentId,
        user.id,
        body.content
      );

      if (!comment) {
        throw new NotFoundError('Comment not found or you do not have permission to edit it');
      }

      reply.status(200).send(comment);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to edit comment');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to edit comment',
      });
    }
  }

  /**
   * DELETE /api/v1/collaborative-insights/:insightId/comments/:commentId
   * Delete comment
   */
  async deleteComment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { insightId, commentId } = request.params as { insightId: string; commentId: string };

      if (!insightId || !commentId) {
        throw new AppError('insightId and commentId are required', 400);
      }

      const deleted = await this.service.deleteComment(
        insightId,
        user.tenantId,
        commentId,
        user.id
      );

      if (!deleted) {
        throw new NotFoundError('Comment not found or you do not have permission to delete it');
      }

      reply.status(200).send({ success: true });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to delete comment');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to delete comment',
      });
    }
  }

  /**
   * GET /api/v1/collaborative-insights/notifications
   * Get notifications for user
   */
  async getNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const query = request.query as NotificationsQuery;

      const limit = query.limit ? Math.min(Math.max(1, query.limit), 100) : 50;

      const notifications = await this.service.getNotifications(
        user.tenantId,
        user.id,
        {
          unreadOnly: query.unreadOnly,
          limit,
        }
      );

      reply.status(200).send({
        notifications,
        unreadCount: notifications.filter(n => !n.isRead).length,
      });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get notifications');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to get notifications',
      });
    }
  }

  /**
   * POST /api/v1/collaborative-insights/notifications/:notificationId/read
   * Mark notification as read
   */
  async markNotificationRead(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const { notificationId } = request.params as { notificationId: string };

      if (!notificationId) {
        throw new AppError('notificationId is required', 400);
      }

      await this.service.markNotificationRead(
        user.tenantId,
        user.id,
        notificationId
      );

      reply.status(200).send({ success: true });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to mark notification as read');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to mark notification as read',
      });
    }
  }

  /**
   * POST /api/v1/collaborative-insights/notifications/read-all
   * Mark all notifications as read
   */
  async markAllNotificationsRead(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);

      await this.service.markAllNotificationsRead(
        user.tenantId,
        user.id
      );

      reply.status(200).send({ success: true });
    } catch (error: any) {
      request.log.error({ error }, 'Failed to mark all notifications as read');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to mark all notifications as read',
      });
    }
  }

  /**
   * GET /api/v1/collaborative-insights/activity
   * Get activity feed
   */
  async getActivityFeed(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const user = getUser(request);
      const query = request.query as ActivityFeedQuery;

      const limit = query.limit ? Math.min(Math.max(1, query.limit), 100) : 20;

      const feed = await this.service.getActivityFeed(
        user.tenantId,
        {
          limit,
          cursor: query.cursor,
        }
      );

      reply.status(200).send(feed);
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get activity feed');
      reply.status(error.statusCode || 500).send({
        error: error.name || 'Internal Server Error',
        message: error.message || 'Failed to get activity feed',
      });
    }
  }
}







