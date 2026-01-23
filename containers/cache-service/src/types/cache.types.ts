/**
 * Cache Service types
 * Core data model for cache management
 */

/**
 * Cache Entry
 */
export interface CacheEntry {
  key: string;
  value: any;
  ttl?: number; // Time to live in seconds
  createdAt: Date;
  expiresAt?: Date;
  tenantId?: string; // For tenant isolation
  namespace?: string; // Cache namespace (e.g., 'shards', 'users', 'permissions')
}

/**
 * Cache Statistics
 */
export interface CacheStats {
  tenantId?: string;
  namespace?: string;
  hits: number;
  misses: number;
  evictions: number;
  errors: number;
  hitRate: number; // hits / (hits + misses)
  totalKeys: number;
  memoryUsage?: number; // In bytes
  averageTtl?: number; // Average TTL in seconds
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cache Operation
 */
export interface CacheOperation {
  id: string;
  tenantId: string;
  operation: 'get' | 'set' | 'delete' | 'invalidate' | 'clear' | 'warm';
  key?: string;
  pattern?: string; // For pattern-based operations
  namespace?: string;
  success: boolean;
  error?: string;
  duration?: number; // Operation duration in milliseconds
  createdAt: Date;
}

/**
 * Cache Warming Task
 */
export interface CacheWarmingTask {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  namespace: string;
  pattern?: string; // Pattern to match keys to warm
  strategy: 'preload' | 'refresh' | 'invalidate';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number; // 0-100
  keysProcessed?: number;
  keysTotal?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  createdAt: Date;
  createdBy: string;
}

/**
 * Cache Optimization Report
 */
export interface CacheOptimizationReport {
  id: string;
  tenantId: string;
  namespace?: string;
  recommendations: CacheOptimizationRecommendation[];
  estimatedSavings?: {
    memoryBytes?: number;
    hitRateImprovement?: number;
  };
  createdAt: Date;
  createdBy: string;
}

/**
 * Cache Optimization Recommendation
 */
export interface CacheOptimizationRecommendation {
  type: 'ttl_adjustment' | 'key_cleanup' | 'memory_optimization' | 'pattern_optimization';
  priority: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  action: string;
  estimatedSavings?: {
    memoryBytes?: number;
    hitRateImprovement?: number;
  };
}

/**
 * Set cache entry input
 */
export interface SetCacheEntryInput {
  tenantId: string;
  key: string;
  value: any;
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

/**
 * Get cache entry input
 */
export interface GetCacheEntryInput {
  tenantId: string;
  key: string;
  namespace?: string;
}

/**
 * Delete cache entry input
 */
export interface DeleteCacheEntryInput {
  tenantId: string;
  key: string;
  namespace?: string;
}

/**
 * Invalidate cache pattern input
 */
export interface InvalidateCachePatternInput {
  tenantId: string;
  pattern: string; // Redis pattern (e.g., 'tenant:*:shard:*')
  namespace?: string;
}

/**
 * Create cache warming task input
 */
export interface CreateCacheWarmingTaskInput {
  tenantId: string;
  userId: string;
  name: string;
  description?: string;
  namespace: string;
  pattern?: string;
  strategy: 'preload' | 'refresh' | 'invalidate';
}

/**
 * Cache health check result
 */
export interface CacheHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  redis: {
    connected: boolean;
    latency?: number; // In milliseconds
    error?: string;
  };
  memory: {
    used: number;
    available: number;
    percentage: number;
  };
  stats: {
    totalKeys: number;
    hitRate: number;
    errors: number;
  };
  timestamp: Date;
}

