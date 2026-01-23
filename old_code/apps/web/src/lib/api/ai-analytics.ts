/**
 * AI Analytics API Client
 */

import { apiClient } from './client';

// ============================================
// Types
// ============================================

export interface AIMetrics {
  period: string;
  totalRequests: number;
  uniqueUsers: number;
  requestsByType: Record<string, number>;
  requestsByModel: Record<string, number>;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgTokensPerRequest: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  totalCost: number;
  avgCostPerRequest: number;
  costByModel: Record<string, number>;
  cacheHitRate: number;
  cacheCostSavings: number;
  positiveRatingRate: number;
  negativeRatingRate: number;
  regenerationRate: number;
  errorRate: number;
  errorsByType: Record<string, number>;
}

export interface DailyMetrics {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  satisfactionRate: number;
}

export interface ModelComparison {
  modelId: string;
  modelName: string;
  requests: number;
  avgLatencyMs: number;
  avgCost: number;
  satisfactionRate: number;
  errorRate: number;
}

export interface QualityInsight {
  type: 'warning' | 'improvement' | 'success';
  category: string;
  message: string;
  metric: string;
  value: number;
  threshold?: number;
  recommendation?: string;
}

export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  avgLatencySavedMs: number;
  totalCostSaved: number;
  totalTokensSaved: number;
}

export interface PromptPerformanceMetrics {
  promptId: string;
  promptSlug: string;
  totalUsage: number;
  usageByTenant: Record<string, number>;
  usageByInsightType: Record<string, number>;
  avgResolutionLatencyMs: number;
  avgRenderingLatencyMs: number;
  p95ResolutionLatencyMs: number;
  cacheHitRate: number;
  abTestPerformance?: {
    experimentId: string;
    variantId: string;
    usage: number;
    avgLatencyMs: number;
  }[];
  successRate: number;
  fallbackRate: number;
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
}

export interface PromptQualityInsight {
  type: 'warning' | 'improvement' | 'success';
  category: string;
  message: string;
  promptId: string;
  promptSlug: string;
  metric: string;
  value: number;
  threshold?: number;
  recommendation?: string;
}

export interface ModelPerformance {
  modelId: string;
  avgLatencyMs: number;
  avgTokensPerSecond: number;
  errorRate: number;
  successRate: number;
  avgSatisfactionScore: number;
  totalRequests: number;
}

// ============================================
// API Functions
// ============================================

/**
 * Get AI metrics for a period
 */
export async function getAIMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<AIMetrics> {
  return apiClient.get(`/ai/analytics/metrics?period=${period}`);
}

/**
 * Get daily metrics for a date range
 */
export async function getDailyMetrics(startDate: string, endDate: string): Promise<{ daily: DailyMetrics[] }> {
  return apiClient.get(`/ai/analytics/daily?startDate=${startDate}&endDate=${endDate}`);
}

/**
 * Get model comparison metrics
 */
export async function getModelComparison(): Promise<{ models: ModelComparison[] }> {
  return apiClient.get('/ai/analytics/models' as any);
}

/**
 * Get quality insights
 */
export async function getQualityInsights(): Promise<{ insights: QualityInsight[] }> {
  return apiClient.get('/ai/analytics/insights' as any);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ enabled: boolean; stats: CacheStats | null }> {
  return apiClient.get('/ai/analytics/cache' as any);
}

/**
 * Clear semantic cache
 */
export async function clearCache(): Promise<{ success: boolean; message: string }> {
  return apiClient.delete('/ai/analytics/cache');
}

// ============================================
// Admin API Functions
// ============================================

/**
 * Get system-wide AI metrics (Super Admin)
 */
export async function getSystemMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<AIMetrics> {
  return apiClient.get(`/admin/ai/analytics/metrics?period=${period}`);
}

/**
 * Get AI cost breakdown (Super Admin)
 */
export async function getCostBreakdown(period: 'day' | 'week' | 'month' = 'month'): Promise<{
  period: string;
  totalCost: number;
  costByModel: Record<string, number>;
  cacheSavings: number;
  avgCostPerRequest: number;
  projectedMonthlyCost: number;
}> {
  return apiClient.get(`/admin/ai/analytics/costs?period=${period}`);
}

// ============================================
// Prompt Analytics API Functions
// ============================================

/**
 * Get prompt performance metrics
 */
export async function getPromptMetrics(
  promptId: string,
  period: 'hour' | 'day' | 'week' | 'month' = 'week'
): Promise<{ metrics: PromptPerformanceMetrics }> {
  return apiClient.get(`/ai/analytics/prompts/${promptId}?period=${period}`);
}

/**
 * Get prompt quality insights
 */
export async function getPromptQualityInsights(): Promise<{ insights: PromptQualityInsight[] }> {
  return apiClient.get('/ai/analytics/prompts/insights' as any);
}

// ============================================
// Model Performance API Functions
// ============================================

/**
 * Get model performance metrics
 */
export async function getModelPerformance(modelId: string): Promise<{ performance: ModelPerformance }> {
  return apiClient.get(`/ai/analytics/models/${modelId}/performance`);
}











