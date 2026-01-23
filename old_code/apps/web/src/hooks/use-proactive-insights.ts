/**
 * Proactive Insights React Hooks
 * React Query hooks for Proactive Insights functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProactiveInsights,
  getProactiveInsight,
  acknowledgeProactiveInsight,
  dismissProactiveInsight,
  actionProactiveInsight,
  checkTriggers,
  getDeliveryPreferences,
  updateDeliveryPreferences,
  resetDeliveryPreferences,
  getDeliveryMetrics,
  getDailyDeliveryMetrics,
  getTriggerPerformance,
  getChannelPerformance,
  type ProactiveInsightsListParams,
  type ProactiveInsight,
  type CheckTriggersRequest,
  type CheckTriggersResponse,
  type DeliveryPreferences,
  type UpdateDeliveryPreferencesRequest,
  type DeliveryMetrics,
  type DailyDeliveryMetrics,
  type TriggerPerformance,
  type ChannelPerformance,
} from '@/lib/api/proactive-insights';

// ============================================
// Query Keys
// ============================================

export const proactiveInsightKeys = {
  all: ['proactive-insights'] as const,
  lists: () => [...proactiveInsightKeys.all, 'list'] as const,
  list: (params?: ProactiveInsightsListParams) =>
    [...proactiveInsightKeys.lists(), params] as const,
  details: () => [...proactiveInsightKeys.all, 'detail'] as const,
  detail: (id: string) => [...proactiveInsightKeys.details(), id] as const,
};

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to list proactive insights
 */
export function useProactiveInsights(params?: ProactiveInsightsListParams) {
  return useQuery({
    queryKey: proactiveInsightKeys.list(params),
    queryFn: () => listProactiveInsights(params),
  });
}

/**
 * Hook to get a single proactive insight
 */
export function useProactiveInsight(insightId: string) {
  return useQuery({
    queryKey: proactiveInsightKeys.detail(insightId),
    queryFn: () => getProactiveInsight(insightId),
    enabled: !!insightId,
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to acknowledge a proactive insight
 */
export function useAcknowledgeProactiveInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (insightId: string) => acknowledgeProactiveInsight(insightId),
    onSuccess: (data) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: proactiveInsightKeys.lists() });
      // Update detail query
      queryClient.setQueryData(proactiveInsightKeys.detail(data.id), data);
      toast.success('Insight acknowledged');
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge insight: ${error.message}`);
    },
  });
}

/**
 * Hook to dismiss a proactive insight
 */
export function useDismissProactiveInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ insightId, reason }: { insightId: string; reason?: string }) =>
      dismissProactiveInsight(insightId, reason ? { reason } : undefined),
    onSuccess: (data) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: proactiveInsightKeys.lists() });
      // Update detail query
      queryClient.setQueryData(proactiveInsightKeys.detail(data.id), data);
      toast.success('Insight dismissed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to dismiss insight: ${error.message}`);
    },
  });
}

/**
 * Hook to mark a proactive insight as actioned
 */
export function useActionProactiveInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (insightId: string) => actionProactiveInsight(insightId),
    onSuccess: (data) => {
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: proactiveInsightKeys.lists() });
      // Update detail query
      queryClient.setQueryData(proactiveInsightKeys.detail(data.id), data);
      toast.success('Insight marked as actioned');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark insight as actioned: ${error.message}`);
    },
  });
}

/**
 * Hook to manually trigger evaluation of proactive triggers
 */
export function useCheckTriggers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: CheckTriggersRequest) => checkTriggers(options),
    onSuccess: (data) => {
      // Invalidate list queries to show newly generated insights
      queryClient.invalidateQueries({ queryKey: proactiveInsightKeys.lists() });
      
      const { triggersEvaluated, shardsEvaluated, insightsGenerated, errors } = data;
      if (errors.length > 0) {
        toast.warning(
          `Evaluated ${triggersEvaluated} triggers, generated ${insightsGenerated.length} insights, ${errors.length} errors occurred`
        );
      } else if (insightsGenerated.length > 0) {
        toast.success(
          `Successfully generated ${insightsGenerated.length} insight${insightsGenerated.length !== 1 ? 's' : ''} from ${triggersEvaluated} trigger${triggersEvaluated !== 1 ? 's' : ''}`
        );
      } else {
        toast.info(`Evaluated ${triggersEvaluated} triggers across ${shardsEvaluated} shards, no insights generated`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to check triggers: ${error.message}`);
    },
  });
}

// ============================================
// Delivery Preferences Hooks
// ============================================

export const deliveryPreferencesKeys = {
  all: ['delivery-preferences'] as const,
  current: () => [...deliveryPreferencesKeys.all, 'current'] as const,
};

export const proactiveInsightsAnalyticsKeys = {
  all: ['proactive-insights-analytics'] as const,
  metrics: (period: string) => [...proactiveInsightsAnalyticsKeys.all, 'metrics', period] as const,
  daily: (startDate: string, endDate: string) =>
    [...proactiveInsightsAnalyticsKeys.all, 'daily', startDate, endDate] as const,
  triggers: (triggerId?: string) =>
    [...proactiveInsightsAnalyticsKeys.all, 'triggers', triggerId || 'all'] as const,
  channels: (period: string) =>
    [...proactiveInsightsAnalyticsKeys.all, 'channels', period] as const,
};

/**
 * Hook to get delivery preferences for the current user
 */
export function useDeliveryPreferences() {
  return useQuery({
    queryKey: deliveryPreferencesKeys.current(),
    queryFn: () => getDeliveryPreferences(),
  });
}

/**
 * Hook to update delivery preferences
 */
export function useUpdateDeliveryPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: UpdateDeliveryPreferencesRequest) =>
      updateDeliveryPreferences(preferences),
    onSuccess: (data) => {
      queryClient.setQueryData(deliveryPreferencesKeys.current(), data);
      toast.success('Delivery preferences updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update delivery preferences: ${error.message}`);
    },
  });
}

/**
 * Hook to reset delivery preferences to defaults
 */
export function useResetDeliveryPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resetDeliveryPreferences(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryPreferencesKeys.current() });
      toast.success('Delivery preferences reset to defaults');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reset delivery preferences: ${error.message}`);
    },
  });
}

// ============================================
// Analytics Hooks
// ============================================

/**
 * Hook to get delivery metrics for a time period
 */
export function useDeliveryMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: proactiveInsightsAnalyticsKeys.metrics(period),
    queryFn: () => getDeliveryMetrics(period),
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to get daily metrics for a date range
 */
export function useDailyDeliveryMetrics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: proactiveInsightsAnalyticsKeys.daily(startDate, endDate),
    queryFn: () => getDailyDeliveryMetrics(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

/**
 * Hook to get trigger performance metrics
 */
export function useTriggerPerformance(triggerId?: string) {
  return useQuery({
    queryKey: proactiveInsightsAnalyticsKeys.triggers(triggerId),
    queryFn: () => getTriggerPerformance(triggerId),
  });
}

/**
 * Hook to get channel performance metrics
 */
export function useChannelPerformance(period: 'hour' | 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: proactiveInsightsAnalyticsKeys.channels(period),
    queryFn: () => getChannelPerformance(period),
    refetchInterval: 60000, // Refresh every minute
  });
}

