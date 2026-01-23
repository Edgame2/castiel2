/**
 * Collaborative Insights Controller Unit Tests
 * 
 * Tests for:
 * - Request validation
 * - Authentication and authorization
 * - Input sanitization
 * - Response formatting
 * - Error handling
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollaborativeInsightsController } from '../../src/controllers/collaborative-insights.controller.js';
import type { CollaborativeInsightsService } from '../../src/services/collaborative-insights.service.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError, NotFoundError } from '../../src/middleware/error-handler.js';
import type {
  SharedInsight,
  InsightVisibility,
  ReactionType,
  InsightComment,
  InsightNotification,
  ActivityFeed,
} from '../../src/services/collaborative-insights.service.js';

// ============================================================================
// Mocks
// ============================================================================

function createMockRequest(overrides?: Partial<FastifyRequest>): FastifyRequest {
  return {
    body: {},
    params: {},
    query: {},
    user: {
      id: 'test-user-123',
      tenantId: 'test-tenant-456',
      email: 'test@example.com',
    },
    log: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
    ...overrides,
  } as any;
}

function createMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
  } as any;
}

function createMockService(): CollaborativeInsightsService {
  return {
    shareInsight: vi.fn(),
    getInsight: vi.fn(),
    recordView: vi.fn(),
    listInsightsForUser: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    addComment: vi.fn(),
    editComment: vi.fn(),
    deleteComment: vi.fn(),
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    getActivityFeed: vi.fn(),
  } as any;
}

// ============================================================================
// Test Data
// ============================================================================

const TEST_INSIGHT_ID = 'shared_insight-123';
const TEST_COMMENT_ID = 'comment_123';
const TEST_NOTIFICATION_ID = 'notif_123';

const mockSharedInsight: SharedInsight = {
  id: TEST_INSIGHT_ID,
  tenantId: 'test-tenant-456',
  sourceType: 'quick_insight',
  sourceId: 'source-123',
  title: 'Test Insight',
  content: 'Test content',
  sharedBy: 'test-user-123',
  sharedAt: new Date(),
  visibility: 'tenant',
  sharedWith: [],
  views: 0,
  reactions: [],
  comments: [],
  relatedShardIds: [],
  tags: [],
  isPinned: false,
  isArchived: false,
  updatedAt: new Date(),
};

// ============================================================================
// Test Suite
// ============================================================================

describe('CollaborativeInsightsController', () => {
  let controller: CollaborativeInsightsController;
  let mockService: CollaborativeInsightsService;
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;

  beforeEach(() => {
    vi.clearAllMocks();

    mockService = createMockService();
    controller = new CollaborativeInsightsController(mockService);

    mockRequest = createMockRequest();
    mockReply = createMockReply();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Share Insight Tests
  // ==========================================================================

  describe('shareInsight', () => {
    it('should share insight successfully', async () => {
      // Arrange
      mockRequest.body = {
        sourceType: 'quick_insight',
        sourceId: 'source-123',
        title: 'Test Insight',
        content: 'Test content',
        visibility: 'tenant',
      };
      (mockService.shareInsight as any).mockResolvedValue(mockSharedInsight);

      // Act
      await controller.shareInsight(mockRequest, mockReply);

      // Assert
      expect(mockService.shareInsight).toHaveBeenCalledWith(
        'test-tenant-456',
        'test-user-123',
        expect.any(String),
        expect.objectContaining({
          sourceType: 'quick_insight',
          sourceId: 'source-123',
          title: 'Test Insight',
          content: 'Test content',
          visibility: 'tenant',
        })
      );
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(mockSharedInsight);
    });

    it('should throw error when required fields are missing', async () => {
      // Arrange
      mockRequest.body = {
        sourceType: 'quick_insight',
        // Missing other required fields
      };

      // Act
      await controller.shareInsight(mockRequest, mockReply);

      // Assert
      // Controller catches error and sends response
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Missing required fields'),
        })
      );
      expect(mockReply.status).toHaveBeenCalledWith(400);
    });

    it('should throw error for invalid visibility', async () => {
      // Arrange
      mockRequest.body = {
        sourceType: 'quick_insight',
        sourceId: 'source-123',
        title: 'Test Insight',
        content: 'Test content',
        visibility: 'invalid' as any,
      };

      // Act
      await controller.shareInsight(mockRequest, mockReply);

      // Assert
      // Controller catches error and sends response
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Invalid visibility'),
        })
      );
    });

    it('should parse expiresAt date correctly', async () => {
      // Arrange
      const expiresAt = '2025-12-31T00:00:00Z';
      mockRequest.body = {
        sourceType: 'quick_insight',
        sourceId: 'source-123',
        title: 'Test Insight',
        content: 'Test content',
        visibility: 'tenant',
        expiresAt,
      };
      (mockService.shareInsight as any).mockResolvedValue(mockSharedInsight);

      // Act
      await controller.shareInsight(mockRequest, mockReply);

      // Assert
      expect(mockService.shareInsight).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          expiresAt: new Date(expiresAt),
        })
      );
    });

    it('should throw error for invalid expiresAt format', async () => {
      // Arrange
      mockRequest.body = {
        sourceType: 'quick_insight',
        sourceId: 'source-123',
        title: 'Test Insight',
        content: 'Test content',
        visibility: 'tenant',
        expiresAt: 'invalid-date',
      };

      // Act
      await controller.shareInsight(mockRequest, mockReply);

      // Assert
      // Controller catches error and sends response
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Invalid expiresAt date format'),
        })
      );
    });
  });

  // ==========================================================================
  // Get Insight Tests
  // ==========================================================================

  describe('getInsight', () => {
    it('should get insight successfully', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      (mockService.getInsight as any).mockResolvedValue(mockSharedInsight);
      (mockService.recordView as any).mockResolvedValue(undefined);

      // Act
      await controller.getInsight(mockRequest, mockReply);

      // Assert
      expect(mockService.getInsight).toHaveBeenCalledWith(
        TEST_INSIGHT_ID,
        'test-tenant-456'
      );
      expect(mockService.recordView).toHaveBeenCalledWith(
        TEST_INSIGHT_ID,
        'test-tenant-456',
        'test-user-123'
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(mockSharedInsight);
    });

    it('should throw error when insightId is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await controller.getInsight(mockRequest, mockReply);

      // Assert
      // Controller catches error and sends response
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('insightId is required'),
        })
      );
    });

    it('should throw NotFoundError when insight not found', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      (mockService.getInsight as any).mockResolvedValue(null);

      // Act
      await controller.getInsight(mockRequest, mockReply);

      // Assert
      // Controller catches error and sends response
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Insight not found'),
        })
      );
    });
  });

  // ==========================================================================
  // List Insights Tests
  // ==========================================================================

  describe('listInsights', () => {
    it('should list insights successfully', async () => {
      // Arrange
      const insights = [mockSharedInsight];
      (mockService.listInsightsForUser as any).mockResolvedValue(insights);

      // Act
      await controller.listInsights(mockRequest, mockReply);

      // Assert
      expect(mockService.listInsightsForUser).toHaveBeenCalledWith(
        'test-tenant-456',
        'test-user-123',
        expect.objectContaining({
          limit: 20,
          offset: 0,
        })
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        insights,
        total: insights.length,
        limit: 20,
        offset: 0,
      });
    });

    it('should parse tags from comma-separated string', async () => {
      // Arrange
      mockRequest.query = { tags: 'tag1, tag2, tag3' };
      (mockService.listInsightsForUser as any).mockResolvedValue([]);

      // Act
      await controller.listInsights(mockRequest, mockReply);

      // Assert
      expect(mockService.listInsightsForUser).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          tags: ['tag1', 'tag2', 'tag3'],
        })
      );
    });

    it('should validate and clamp limit', async () => {
      // Arrange
      mockRequest.query = { limit: 150 }; // Exceeds max
      (mockService.listInsightsForUser as any).mockResolvedValue([]);

      // Act
      await controller.listInsights(mockRequest, mockReply);

      // Assert
      expect(mockService.listInsightsForUser).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          limit: 100, // Clamped to max
        })
      );
    });

    it('should validate and clamp offset', async () => {
      // Arrange
      mockRequest.query = { offset: -5 }; // Negative
      (mockService.listInsightsForUser as any).mockResolvedValue([]);

      // Act
      await controller.listInsights(mockRequest, mockReply);

      // Assert
      expect(mockService.listInsightsForUser).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          offset: 0, // Clamped to min
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await controller.listInsights(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
    });
  });

  // ==========================================================================
  // Reactions Tests
  // ==========================================================================

  describe('addReaction', () => {
    it('should add reaction successfully', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = { reactionType: '👍' };
      (mockService.addReaction as any).mockResolvedValue(mockSharedInsight);

      // Act
      await controller.addReaction(mockRequest, mockReply);

      // Assert
      expect(mockService.addReaction).toHaveBeenCalledWith(
        TEST_INSIGHT_ID,
        'test-tenant-456',
        'test-user-123',
        expect.any(String),
        '👍'
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should throw error when insightId is missing', async () => {
      // Arrange
      mockRequest.params = {};
      mockRequest.body = { reactionType: '👍' };

      // Act
      await controller.addReaction(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('insightId is required'),
        })
      );
    });

    it('should throw error when reactionType is missing', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = {};

      // Act
      await controller.addReaction(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('reactionType is required'),
        })
      );
    });

    it('should throw error for invalid reaction type', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = { reactionType: 'invalid' };

      // Act
      await controller.addReaction(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Invalid reactionType'),
        })
      );
    });

    it('should throw NotFoundError when insight not found', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = { reactionType: '👍' };
      (mockService.addReaction as any).mockResolvedValue(null);

      // Act
      await controller.addReaction(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Insight not found'),
        })
      );
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction successfully', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      (mockService.removeReaction as any).mockResolvedValue(mockSharedInsight);

      // Act
      await controller.removeReaction(mockRequest, mockReply);

      // Assert
      expect(mockService.removeReaction).toHaveBeenCalledWith(
        TEST_INSIGHT_ID,
        'test-tenant-456',
        'test-user-123'
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should throw NotFoundError when insight not found', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      (mockService.removeReaction as any).mockResolvedValue(null);

      // Act
      await controller.removeReaction(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Insight not found'),
        })
      );
    });
  });

  // ==========================================================================
  // Comments Tests
  // ==========================================================================

  describe('addComment', () => {
    it('should add comment successfully', async () => {
      // Arrange
      const comment: InsightComment = {
        id: TEST_COMMENT_ID,
        userId: 'test-user-123',
        userName: 'Test User',
        content: 'Test comment',
        mentions: [],
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = { content: 'Test comment' };
      (mockService.addComment as any).mockResolvedValue(comment);

      // Act
      await controller.addComment(mockRequest, mockReply);

      // Assert
      expect(mockService.addComment).toHaveBeenCalledWith(
        TEST_INSIGHT_ID,
        'test-tenant-456',
        'test-user-123',
        expect.any(String),
        'Test comment',
        undefined
      );
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith(comment);
    });

    it('should support threaded replies', async () => {
      // Arrange
      const comment: InsightComment = {
        id: TEST_COMMENT_ID,
        userId: 'test-user-123',
        userName: 'Test User',
        content: 'Reply comment',
        mentions: [],
        parentId: 'parent-comment-123',
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = {
        content: 'Reply comment',
        parentId: 'parent-comment-123',
      };
      (mockService.addComment as any).mockResolvedValue(comment);

      // Act
      await controller.addComment(mockRequest, mockReply);

      // Assert
      expect(mockService.addComment).toHaveBeenCalledWith(
        TEST_INSIGHT_ID,
        'test-tenant-456',
        'test-user-123',
        expect.any(String),
        'Reply comment',
        'parent-comment-123'
      );
    });

    it('should throw error when content is empty', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = { content: '   ' };

      // Act
      await controller.addComment(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('content is required and cannot be empty'),
        })
      );
    });

    it('should throw error when content exceeds max length', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = { content: 'A'.repeat(5001) };

      // Act
      await controller.addComment(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Comment content cannot exceed 5000 characters'),
        })
      );
    });

    it('should throw NotFoundError when insight not found', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = { content: 'Test comment' };
      (mockService.addComment as any).mockResolvedValue(null);

      // Act
      await controller.addComment(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Insight not found'),
        })
      );
    });
  });

  describe('editComment', () => {
    it('should edit comment successfully', async () => {
      // Arrange
      const comment: InsightComment = {
        id: TEST_COMMENT_ID,
        userId: 'test-user-123',
        userName: 'Test User',
        content: 'Edited comment',
        mentions: [],
        isEdited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockRequest.params = { insightId: TEST_INSIGHT_ID, commentId: TEST_COMMENT_ID };
      mockRequest.body = { content: 'Edited comment' };
      (mockService.editComment as any).mockResolvedValue(comment);

      // Act
      await controller.editComment(mockRequest, mockReply);

      // Assert
      expect(mockService.editComment).toHaveBeenCalledWith(
        TEST_INSIGHT_ID,
        'test-tenant-456',
        TEST_COMMENT_ID,
        'test-user-123',
        'Edited comment'
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should throw error when commentId is missing', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID };
      mockRequest.body = { content: 'Edited comment' };

      // Act
      await controller.editComment(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('insightId and commentId are required'),
        })
      );
    });

    it('should throw NotFoundError when comment not found or unauthorized', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID, commentId: TEST_COMMENT_ID };
      mockRequest.body = { content: 'Edited comment' };
      (mockService.editComment as any).mockResolvedValue(null);

      // Act
      await controller.editComment(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Comment not found or you do not have permission'),
        })
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID, commentId: TEST_COMMENT_ID };
      (mockService.deleteComment as any).mockResolvedValue(true);

      // Act
      await controller.deleteComment(mockRequest, mockReply);

      // Assert
      expect(mockService.deleteComment).toHaveBeenCalledWith(
        TEST_INSIGHT_ID,
        'test-tenant-456',
        TEST_COMMENT_ID,
        'test-user-123'
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true });
    });

    it('should throw NotFoundError when comment not found or unauthorized', async () => {
      // Arrange
      mockRequest.params = { insightId: TEST_INSIGHT_ID, commentId: TEST_COMMENT_ID };
      (mockService.deleteComment as any).mockResolvedValue(false);

      // Act
      await controller.deleteComment(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('Comment not found or you do not have permission'),
        })
      );
    });
  });

  // ==========================================================================
  // Notifications Tests
  // ==========================================================================

  describe('getNotifications', () => {
    it('should get notifications successfully', async () => {
      // Arrange
      const notifications: InsightNotification[] = [
        {
          id: TEST_NOTIFICATION_ID,
          tenantId: 'test-tenant-456',
          userId: 'test-user-123',
          type: 'shared_with_you',
          insightId: TEST_INSIGHT_ID,
          insightTitle: 'Test Insight',
          actorId: 'actor-123',
          actorName: 'Actor User',
          message: 'Test message',
          isRead: false,
          createdAt: new Date(),
        },
      ];
      (mockService.getNotifications as any).mockResolvedValue(notifications);

      // Act
      await controller.getNotifications(mockRequest, mockReply);

      // Assert
      expect(mockService.getNotifications).toHaveBeenCalledWith(
        'test-tenant-456',
        'test-user-123',
        expect.objectContaining({
          limit: 50,
        })
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        notifications,
        unreadCount: 1,
      });
    });

    it('should filter unread notifications', async () => {
      // Arrange
      mockRequest.query = { unreadOnly: true };
      (mockService.getNotifications as any).mockResolvedValue([]);

      // Act
      await controller.getNotifications(mockRequest, mockReply);

      // Assert
      expect(mockService.getNotifications).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          unreadOnly: true,
        })
      );
    });

    it('should validate and clamp limit', async () => {
      // Arrange
      mockRequest.query = { limit: 150 };
      (mockService.getNotifications as any).mockResolvedValue([]);

      // Act
      await controller.getNotifications(mockRequest, mockReply);

      // Assert
      expect(mockService.getNotifications).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          limit: 100, // Clamped to max
        })
      );
    });
  });

  describe('markNotificationRead', () => {
    it('should mark notification as read', async () => {
      // Arrange
      mockRequest.params = { notificationId: TEST_NOTIFICATION_ID };
      (mockService.markNotificationRead as any).mockResolvedValue(undefined);

      // Act
      await controller.markNotificationRead(mockRequest, mockReply);

      // Assert
      expect(mockService.markNotificationRead).toHaveBeenCalledWith(
        'test-tenant-456',
        'test-user-123',
        TEST_NOTIFICATION_ID
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true });
    });

    it('should throw error when notificationId is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await controller.markNotificationRead(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.stringContaining('notificationId is required'),
        })
      );
    });
  });

  describe('markAllNotificationsRead', () => {
    it('should mark all notifications as read', async () => {
      // Arrange
      (mockService.markAllNotificationsRead as any).mockResolvedValue(undefined);

      // Act
      await controller.markAllNotificationsRead(mockRequest, mockReply);

      // Assert
      expect(mockService.markAllNotificationsRead).toHaveBeenCalledWith(
        'test-tenant-456',
        'test-user-123'
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ success: true });
    });
  });

  // ==========================================================================
  // Activity Feed Tests
  // ==========================================================================

  describe('getActivityFeed', () => {
    it('should get activity feed successfully', async () => {
      // Arrange
      const feed: ActivityFeed = {
        items: [
          {
            id: 'item_1',
            type: 'share',
            insight: { id: TEST_INSIGHT_ID, title: 'Test Insight' },
            actor: { id: 'test-user-123', name: 'Test User' },
            timestamp: new Date(),
          },
        ],
        hasMore: false,
      };
      (mockService.getActivityFeed as any).mockResolvedValue(feed);

      // Act
      await controller.getActivityFeed(mockRequest, mockReply);

      // Assert
      expect(mockService.getActivityFeed).toHaveBeenCalledWith(
        'test-tenant-456',
        expect.objectContaining({
          limit: 20,
        })
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(feed);
    });

    it('should support pagination with cursor', async () => {
      // Arrange
      mockRequest.query = { cursor: '20', limit: 10 };
      (mockService.getActivityFeed as any).mockResolvedValue({
        items: [],
        hasMore: true,
        nextCursor: '30',
      });

      // Act
      await controller.getActivityFeed(mockRequest, mockReply);

      // Assert
      expect(mockService.getActivityFeed).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cursor: '20',
          limit: 10,
        })
      );
    });

    it('should validate and clamp limit', async () => {
      // Arrange
      mockRequest.query = { limit: 150 };
      (mockService.getActivityFeed as any).mockResolvedValue({
        items: [],
        hasMore: false,
      });

      // Act
      await controller.getActivityFeed(mockRequest, mockReply);

      // Assert
      expect(mockService.getActivityFeed).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 100, // Clamped to max
        })
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      mockRequest.body = {
        sourceType: 'quick_insight',
        sourceId: 'source-123',
        title: 'Test Insight',
        content: 'Test content',
        visibility: 'tenant',
      };
      const serviceError = new Error('Service error');
      (mockService.shareInsight as any).mockRejectedValue(serviceError);

      // Act
      await controller.shareInsight(mockRequest, mockReply);

      // Assert
      expect(mockRequest.log.error).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error',
          message: 'Service error',
        })
      );
    });

    it('should handle AppError with correct status code', async () => {
      // Arrange
      mockRequest.body = {
        sourceType: 'quick_insight',
        sourceId: 'source-123',
        title: 'Test Insight',
        content: 'Test content',
        visibility: 'tenant',
      };
      const appError = new AppError('Bad request', 400);
      (mockService.shareInsight as any).mockRejectedValue(appError);

      // Act
      await controller.shareInsight(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
    });
  });
});

