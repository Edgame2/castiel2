/**
 * Collaborative Insights Hooks
 * React Query hooks for collaborative insights operations
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api/client';
import {
  collaborativeInsightsApi,
  type SharedInsight,
  type ShareInsightRequest,
  type AddCommentRequest,
  type EditCommentRequest,
  type ReactionType,
  type InsightVisibility,
  type ActivityFeed,
} from '@/lib/api/collaborative-insights';

// ============================================
// Query Keys
// ============================================

export const collaborativeInsightsKeys = {
  all: ['collaborative-insights'] as const,
  insights: () => [...collaborativeInsightsKeys.all, 'insights'] as const,
  insightList: (params?: Record<string, unknown>) =>
    [...collaborativeInsightsKeys.insights(), 'list', params] as const,
  insightDetail: (id: string) => [...collaborativeInsightsKeys.insights(), 'detail', id] as const,
  notifications: () => [...collaborativeInsightsKeys.all, 'notifications'] as const,
  notificationList: (params?: Record<string, unknown>) =>
    [...collaborativeInsightsKeys.notifications(), 'list', params] as const,
  activityFeed: () => [...collaborativeInsightsKeys.all, 'activity-feed'] as const,
  activityFeedList: (params?: Record<string, unknown>) =>
    [...collaborativeInsightsKeys.activityFeed(), 'list', params] as const,
};

// ============================================
// Insight Queries
// ============================================

/**
 * Hook to list insights
 */
export function useInsights(params?: {
  visibility?: InsightVisibility;
  tags?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: collaborativeInsightsKeys.insightList(params),
    queryFn: () => collaborativeInsightsApi.listInsights(params),
    enabled: true,
  });
}

/**
 * Hook to get a single insight
 */
export function useInsight(insightId: string) {
  return useQuery({
    queryKey: collaborativeInsightsKeys.insightDetail(insightId),
    queryFn: () => collaborativeInsightsApi.getInsight(insightId),
    enabled: !!insightId,
  });
}

// ============================================
// Insight Mutations
// ============================================

/**
 * Hook to share an insight
 */
export function useShareInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ShareInsightRequest) => collaborativeInsightsApi.shareInsight(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightList() });
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.activityFeedList() });
      toast.success('Insight shared successfully');
    },
    onError: (error) => {
      handleApiError(error);
      toast.error('Failed to share insight');
    },
  });
}

/**
 * Hook to add a reaction
 */
export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ insightId, reactionType }: { insightId: string; reactionType: ReactionType }) =>
      collaborativeInsightsApi.addReaction(insightId, reactionType),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightDetail(variables.insightId) });
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightList() });
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.activityFeedList() });
    },
    onError: (error) => {
      handleApiError(error);
      toast.error('Failed to add reaction');
    },
  });
}

/**
 * Hook to remove a reaction
 */
export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (insightId: string) => collaborativeInsightsApi.removeReaction(insightId),
    onSuccess: (data, insightId) => {
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightDetail(insightId) });
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightList() });
    },
    onError: (error) => {
      handleApiError(error);
      toast.error('Failed to remove reaction');
    },
  });
}

/**
 * Hook to add a comment
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ insightId, data }: { insightId: string; data: AddCommentRequest }) =>
      collaborativeInsightsApi.addComment(insightId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightDetail(variables.insightId) });
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightList() });
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.activityFeedList() });
      toast.success('Comment added');
    },
    onError: (error) => {
      handleApiError(error);
      toast.error('Failed to add comment');
    },
  });
}

/**
 * Hook to edit a comment
 */
export function useEditComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      insightId,
      commentId,
      data,
    }: {
      insightId: string;
      commentId: string;
      data: EditCommentRequest;
    }) => collaborativeInsightsApi.editComment(insightId, commentId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightDetail(variables.insightId) });
      toast.success('Comment updated');
    },
    onError: (error) => {
      handleApiError(error);
      toast.error('Failed to update comment');
    },
  });
}

/**
 * Hook to delete a comment
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ insightId, commentId }: { insightId: string; commentId: string }) =>
      collaborativeInsightsApi.deleteComment(insightId, commentId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightDetail(variables.insightId) });
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.insightList() });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      handleApiError(error);
      toast.error('Failed to delete comment');
    },
  });
}

// ============================================
// Notification Queries
// ============================================

/**
 * Hook to get notifications
 */
export function useInsightNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
  return useQuery({
    queryKey: collaborativeInsightsKeys.notificationList(params),
    queryFn: () => collaborativeInsightsApi.getNotifications(params),
    enabled: true,
  });
}

/**
 * Hook to mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => collaborativeInsightsApi.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.notificationList() });
    },
    onError: (error) => {
      handleApiError(error);
      toast.error('Failed to mark notification as read');
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => collaborativeInsightsApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborativeInsightsKeys.notificationList() });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      handleApiError(error);
      toast.error('Failed to mark all notifications as read');
    },
  });
}

// ============================================
// Activity Feed Queries
// ============================================

/**
 * Hook to get activity feed (infinite query for pagination)
 */
export function useActivityFeed(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: collaborativeInsightsKeys.activityFeedList({ limit }),
    queryFn: ({ pageParam }) =>
      collaborativeInsightsApi.getActivityFeed({
        limit,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  });
}










