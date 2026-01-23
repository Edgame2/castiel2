import { apiClient } from './client'
import type {
  PlatformStats,
  TenantListItem,
  SystemHealth,
  SystemLog,
  PaginatedResponse,
  Tenant,
} from '@/types/api'

// Get platform-wide statistics
export async function getPlatformStats(): Promise<PlatformStats> {
  const response = await apiClient.get('/api/v1/dashboard/stats' as any)
  return response.data
}

// Get list of all tenants
export async function getTenants(params?: {
  page?: number
  limit?: number
  search?: string
  status?: string
}): Promise<PaginatedResponse<TenantListItem>> {
  const response = await apiClient.get('/api/tenants', { params })
  return {
    items: response.data.tenants,
    total: response.data.total,
    page: response.data.page,
    limit: response.data.limit,
    hasMore: response.data.hasMore,
  }
}

// Get tenant details (for super admin)
export async function getTenantById(tenantId: string): Promise<Tenant> {
  const response = await apiClient.get(`/api/tenants/${tenantId}`)
  return response.data
}

// Update tenant status
export async function updateTenantStatus(
  tenantId: string,
  status: 'active' | 'suspended' | 'trial'
): Promise<Tenant> {
  const response = await apiClient.patch(`/api/tenants/${tenantId}/status`, { status })
  return response.data
}

// Get system health status
export async function getSystemHealth(): Promise<SystemHealth> {
  const response = await apiClient.get('/health' as any)
  return response.data
}

// Get system logs
export async function getSystemLogs(params?: {
  page?: number
  limit?: number
  level?: string
  service?: string
  startDate?: string
  endDate?: string
}): Promise<PaginatedResponse<SystemLog>> {
  const response = await apiClient.get('/audit-logs', { params })
  return {
    items: response.data.logs,
    total: response.data.total,
    page: Math.floor(response.data.offset / response.data.limit) + 1,
    limit: response.data.limit,
    hasMore: response.data.offset + response.data.logs.length < response.data.total,
  }
}

// Impersonate tenant (switch context to tenant)
export async function impersonateTenant(tenantId: string): Promise<{ token: string }> {
  const response = await apiClient.post(`/api/v1/auth/impersonate/${tenantId}`)
  return response.data
}

// Stop impersonation
export async function stopImpersonation(): Promise<void> {
  await apiClient.post('/api/v1/auth/impersonate/stop' as any)
}

// ============================================
// Conversation Statistics (Admin)
// ============================================

export interface ConversationSystemStats {
  totalConversations: number
  activeConversations: number
  archivedConversations: number
  totalMessages: number
  totalUsers: number
  totalTenants: number
  averageMessagesPerConversation: number
  averageCostPerConversation: number
  totalCost: number
  totalTokens: number
  conversationsByStatus: Record<string, number>
  conversationsByVisibility: Record<string, number>
  topTenants: Array<{
    tenantId: string
    conversationCount: number
    messageCount: number
    totalCost: number
  }>
  growthTrend: Array<{
    date: string
    conversations: number
    messages: number
  }>
}

/**
 * Get system-wide conversation statistics (Super Admin only)
 */
export async function getConversationSystemStats(params?: {
  fromDate?: string
  toDate?: string
}): Promise<ConversationSystemStats> {
  const response = await apiClient.get('/api/v1/admin/insights/conversations/stats', { params })
  return response.data
}

// ============================================
// Performance Metrics (Admin)
// ============================================

export interface PerformanceMetrics {
  avgRecommendationLatency: number
  avgContextAssemblyLatency: number
  avgVectorSearchLatency: number
  avgAIResponseTime: number
  totalContextTokensUsed: number
  truncationFrequency: number
  metricCount: number
}

export interface AIMetrics {
  period: string
  totalRequests: number
  uniqueUsers: number
  requestsByType: Record<string, number>
  requestsByModel: Record<string, number>
  totalInputTokens: number
  totalOutputTokens: number
  avgTokensPerRequest: number
  avgLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  totalCost: number
  avgCostPerRequest: number
  costByModel: Record<string, number>
  cacheHitRate: number
  cacheCostSavings: number
  errorRate: number
  errorsByType: Record<string, number>
}

/**
 * Get aggregated performance metrics (Super Admin only)
 */
export async function getPerformanceMetrics(params?: {
  tenantId?: string
  timeRange?: number // Minutes
}): Promise<PerformanceMetrics> {
  const response = await apiClient.get('/api/v1/admin/project-performance/metrics', { params })
  return response.data.data
}

/**
 * Get AI analytics metrics (Super Admin only)
 */
export async function getAIMetrics(params?: {
  period?: 'hour' | 'day' | 'week' | 'month'
}): Promise<AIMetrics> {
  const response = await apiClient.get('/admin/ai/analytics/metrics', { params })
  return response.data
}

// ============================================
// Cache Statistics (Admin)
// ============================================

export interface CacheServiceStats {
  serviceName: string
  enabled: boolean
  healthy: boolean
  totalOperations: number
  hits: number
  misses: number
  hitRate: number
  invalidations: number
  totalKeys: number
  memoryUsageBytes?: number
  averageLatencyMs?: number
}

export interface AggregatedCacheStats {
  timestamp: string
  redisConnected: boolean
  services: {
    shardCache?: CacheServiceStats
    aclCache?: CacheServiceStats
    vectorSearchCache?: CacheServiceStats
    tokenValidationCache?: CacheServiceStats
  }
  aggregated: {
    totalHits: number
    totalMisses: number
    overallHitRate: number
    totalKeys: number
    totalMemoryBytes?: number
    totalInvalidations: number
  }
  performance: {
    averageLatencyMs: number
  }
  topKeys?: Array<{ key: string; count: number }>
}

export interface CacheHealthCheck {
  healthy: boolean
  redisConnected: boolean
  redisLatencyMs: number
  memoryUsagePercent?: number
  issues: string[]
  recommendations: string[]
  serviceHealth: Record<string, {
    healthy: boolean
    hitRate: number
    keyCount: number
  }>
}

/**
 * Get aggregated cache statistics (Super Admin only)
 */
export async function getCacheStats(): Promise<AggregatedCacheStats> {
  const response = await apiClient.get('/api/v1/admin/cache/stats' as any)
  return response.data.data
}

/**
 * Get cache health check (Super Admin only)
 */
export async function getCacheHealth(): Promise<CacheHealthCheck> {
  const response = await apiClient.get('/api/v1/admin/cache/health' as any)
  return response.data.data
}

export interface CacheMonitorConfig {
  metricsIntervalMs: number
  trackTopKeys: boolean
  topKeysCount: number
  enableAlerts: boolean
  alertThresholds: {
    lowHitRate: number
    highMemoryUsage: number
    highLatency: number
  }
}

/**
 * Get cache alert configuration (Super Admin only)
 */
export async function getCacheConfig(): Promise<CacheMonitorConfig> {
  const response = await apiClient.get('/api/v1/admin/cache/config' as any)
  return response.data.data
}

export interface PerformanceAnomaly {
  metric: string
  currentValue: number
  threshold: number
  severity: 'warning' | 'critical'
}

/**
 * Get performance anomalies (Super Admin only)
 * Note: tenantId is required by the API, but we can pass empty string for system-wide
 */
export async function getPerformanceAnomalies(params?: {
  tenantId?: string
  stdDevThreshold?: number
}): Promise<PerformanceAnomaly[]> {
  // If no tenantId provided, we'll skip this call as the API requires it
  // For now, return empty array if no tenantId
  if (!params?.tenantId) {
    return []
  }
  const response = await apiClient.get('/api/v1/admin/project-performance/anomalies', { 
    params: {
      tenantId: params.tenantId,
      threshold: params.stdDevThreshold?.toString()
    }
  })
  return response.data.data || []
}
