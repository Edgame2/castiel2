'use client';

/**
 * React Query hooks for AI Analytics
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAIMetrics,
  getDailyMetrics,
  getModelComparison,
  getQualityInsights,
  getCacheStats,
  clearCache,
  getSystemMetrics,
  getCostBreakdown,
  getPromptMetrics,
  getPromptQualityInsights,
  getModelPerformance,
  AIMetrics,
  DailyMetrics,
  ModelComparison,
  QualityInsight,
  CacheStats,
  PromptPerformanceMetrics,
  PromptQualityInsight,
  ModelPerformance,
} from '@/lib/api/ai-analytics';

// ============================================
// Query Keys
// ============================================

export const aiAnalyticsKeys = {
  all: ['ai-analytics'] as const,
  metrics: (period: string) => [...aiAnalyticsKeys.all, 'metrics', period] as const,
  daily: (startDate: string, endDate: string) =>
    [...aiAnalyticsKeys.all, 'daily', startDate, endDate] as const,
  models: () => [...aiAnalyticsKeys.all, 'models'] as const,
  insights: () => [...aiAnalyticsKeys.all, 'insights'] as const,
  cache: () => [...aiAnalyticsKeys.all, 'cache'] as const,
  system: (period: string) => [...aiAnalyticsKeys.all, 'system', period] as const,
  costs: (period: string) => [...aiAnalyticsKeys.all, 'costs', period] as const,
  promptMetrics: (promptId: string, period: string) =>
    [...aiAnalyticsKeys.all, 'prompt-metrics', promptId, period] as const,
  promptInsights: () => [...aiAnalyticsKeys.all, 'prompt-insights'] as const,
  modelPerformance: (modelId: string) =>
    [...aiAnalyticsKeys.all, 'model-performance', modelId] as const,
};

// ============================================
// Tenant Queries
// ============================================

/**
 * Get AI metrics for current tenant
 */
export function useAIMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: aiAnalyticsKeys.metrics(period),
    queryFn: () => getAIMetrics(period),
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Get daily metrics for a date range
 */
export function useDailyMetrics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: aiAnalyticsKeys.daily(startDate, endDate),
    queryFn: () => getDailyMetrics(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

/**
 * Get model comparison metrics
 */
export function useModelComparison() {
  return useQuery({
    queryKey: aiAnalyticsKeys.models(),
    queryFn: getModelComparison,
  });
}

/**
 * Get quality insights
 */
export function useQualityInsights() {
  return useQuery({
    queryKey: aiAnalyticsKeys.insights(),
    queryFn: getQualityInsights,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

/**
 * Get cache statistics
 */
export function useCacheStats() {
  return useQuery({
    queryKey: aiAnalyticsKeys.cache(),
    queryFn: getCacheStats,
  });
}

/**
 * Clear cache mutation
 */
export function useClearCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCache,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiAnalyticsKeys.cache() });
    },
  });
}

// ============================================
// Admin Queries
// ============================================

/**
 * Get system-wide metrics (Super Admin)
 */
export function useSystemMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: aiAnalyticsKeys.system(period),
    queryFn: () => getSystemMetrics(period),
    refetchInterval: 60000,
  });
}

/**
 * Get cost breakdown (Super Admin)
 */
export function useCostBreakdown(period: 'day' | 'week' | 'month' = 'month') {
  return useQuery({
    queryKey: aiAnalyticsKeys.costs(period),
    queryFn: () => getCostBreakdown(period),
  });
}

// ============================================
// Prompt Analytics Hooks
// ============================================

/**
 * Get prompt performance metrics
 */
export function usePromptMetrics(
  promptId: string,
  period: 'hour' | 'day' | 'week' | 'month' = 'week'
) {
  return useQuery({
    queryKey: aiAnalyticsKeys.promptMetrics(promptId, period),
    queryFn: () => getPromptMetrics(promptId, period),
    enabled: !!promptId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

/**
 * Get prompt quality insights
 */
export function usePromptQualityInsights() {
  return useQuery({
    queryKey: aiAnalyticsKeys.promptInsights(),
    queryFn: getPromptQualityInsights,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

// ============================================
// Model Performance Hooks
// ============================================

/**
 * Get model performance metrics
 */
export function useModelPerformance(modelId: string) {
  return useQuery({
    queryKey: aiAnalyticsKeys.modelPerformance(modelId),
    queryFn: () => getModelPerformance(modelId),
    enabled: !!modelId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

// ============================================
// Helper Hooks
// ============================================

/**
 * Calculate key performance indicators
 */
export function useAIKPIs() {
  const { data: metrics } = useAIMetrics('week');
  const { data: cache } = useCacheStats();

  if (!metrics) return null;

  return {
    totalRequests: metrics.totalRequests,
    avgResponseTime: metrics.avgLatencyMs,
    cacheHitRate: metrics.cacheHitRate * 100,
    satisfactionRate: metrics.positiveRatingRate * 100,
    costSavings: cache?.stats?.totalCostSaved || 0,
    errorRate: metrics.errorRate * 100,
    tokensUsed: metrics.totalInputTokens + metrics.totalOutputTokens,
    totalCost: metrics.totalCost,
  };
}

// Export types
export type {
  AIMetrics,
  DailyMetrics,
  ModelComparison,
  QualityInsight,
  CacheStats,
  PromptPerformanceMetrics,
  PromptQualityInsight,
  ModelPerformance,
};











