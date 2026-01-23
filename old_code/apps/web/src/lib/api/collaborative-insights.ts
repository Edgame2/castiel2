/**
 * Collaborative Insights API Client
 * API client for collaborative insights operations (sharing, comments, reactions, activity)
 */

import apiClient from './client';

// ============================================
// Types
// ============================================

export type InsightVisibility = 'private' | 'team' | 'department' | 'tenant' | 'specific';

export type ReactionType = '👍' | '❤️' | '💡' | '🎯' | '⭐' | '🔥';

export type NotificationType = 'shared_with_you' | 'mentioned' | 'comment' | 'reply' | 'reaction';

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
  createdAt: Date | string;
}

export interface UserMention {
  userId: string;
  userName: string;
  startIndex: number;
  endIndex: number;
}

export interface InsightComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  mentions: UserMention[];
  parentId?: string;
  isEdited: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SharedInsight {
  id: string;
  tenantId: string;
  sourceType: 'conversation' | 'quick_insight' | 'scheduled' | 'proactive';
  sourceId: string;
  title: string;
  content: string;
  summary?: string;
  sharedBy: string;
  sharedAt: Date | string;
  visibility: InsightVisibility;
  sharedWith: ShareTarget[];
  views: number;
  reactions: InsightReaction[];
  comments: InsightComment[];
  relatedShardIds: string[];
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  expiresAt?: Date | string;
  updatedAt: Date | string;
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
  createdAt: Date | string;
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
  timestamp: Date | string;
}

export interface ActivityFeed {
  items: ActivityFeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ShareInsightRequest {
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

export interface AddCommentRequest {
  content: string;
  parentId?: string;
}

export interface EditCommentRequest {
  content: string;
}

export interface ListInsightsResponse {
  insights: SharedInsight[];
  total: number;
  limit: number;
  offset: number;
}

export interface NotificationsResponse {
  notifications: InsightNotification[];
  total: number;
  unreadCount: number;
}

// ============================================
// API Client
// ============================================

export const collaborativeInsightsApi = {
  /**
   * Share an insight
   */
  shareInsight: async (data: ShareInsightRequest): Promise<SharedInsight> => {
    const response = await apiClient.post<SharedInsight>('/api/v1/collaborative-insights/share', data);
    return response.data;
  },

  /**
   * Get a shared insight by ID
   */
  getInsight: async (insightId: string): Promise<SharedInsight> => {
    const response = await apiClient.get<SharedInsight>(`/api/v1/collaborative-insights/${insightId}`);
    return response.data;
  },

  /**
   * List insights visible to user
   */
  listInsights: async (params?: {
    visibility?: InsightVisibility;
    tags?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListInsightsResponse> => {
    const response = await apiClient.get<ListInsightsResponse>('/api/v1/collaborative-insights', { params });
    return response.data;
  },

  /**
   * Add reaction to insight
   */
  addReaction: async (insightId: string, reactionType: ReactionType): Promise<SharedInsight> => {
    const response = await apiClient.post<SharedInsight>(
      `/api/v1/collaborative-insights/${insightId}/reactions`,
      { reactionType }
    );
    return response.data;
  },

  /**
   * Remove reaction from insight
   */
  removeReaction: async (insightId: string): Promise<SharedInsight> => {
    const response = await apiClient.delete<SharedInsight>(
      `/api/v1/collaborative-insights/${insightId}/reactions`
    );
    return response.data;
  },

  /**
   * Add comment to insight
   */
  addComment: async (insightId: string, data: AddCommentRequest): Promise<SharedInsight> => {
    const response = await apiClient.post<SharedInsight>(
      `/api/v1/collaborative-insights/${insightId}/comments`,
      data
    );
    return response.data;
  },

  /**
   * Edit comment
   */
  editComment: async (
    insightId: string,
    commentId: string,
    data: EditCommentRequest
  ): Promise<SharedInsight> => {
    const response = await apiClient.patch<SharedInsight>(
      `/api/v1/collaborative-insights/${insightId}/comments/${commentId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete comment
   */
  deleteComment: async (insightId: string, commentId: string): Promise<SharedInsight> => {
    const response = await apiClient.delete<SharedInsight>(
      `/api/v1/collaborative-insights/${insightId}/comments/${commentId}`
    );
    return response.data;
  },

  /**
   * Get notifications
   */
  getNotifications: async (params?: {
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<NotificationsResponse> => {
    const response = await apiClient.get<NotificationsResponse>(
      '/api/v1/collaborative-insights/notifications',
      { params }
    );
    return response.data;
  },

  /**
   * Mark notification as read
   */
  markNotificationRead: async (notificationId: string): Promise<void> => {
    await apiClient.post(`/api/v1/collaborative-insights/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.post<{ count: number }>(
      '/api/v1/collaborative-insights/notifications/read-all'
    );
    return response.data;
  },

  /**
   * Get activity feed
   */
  getActivityFeed: async (params?: {
    limit?: number;
    cursor?: string;
  }): Promise<ActivityFeed> => {
    const response = await apiClient.get<ActivityFeed>(
      '/api/v1/collaborative-insights/activity',
      { params }
    );
    return response.data;
  },
};










