/**
 * Context Cache Types
 * Types for context caching
 */

export interface ContextCacheEntry<T> {
  data: T;
  metadata: {
    cachedAt: string;
    version: number;
    ttl: number;
    accessCount: number;
    lastAccessed: string;
    tenantId: string;
    contextType: 'global' | 'template' | 'conversation';
    [key: string]: any;
  };
}

export interface ContextCacheMetrics {
  hits: number;
  misses: number;
  staleHits: number;
  criticalStaleHits: number;
  invalidations: number;
  warmingHits: number;
  errors: number;
  hitRate: number;
  averageAgeMs: number;
  totalSize: number;
}

export interface CacheWarmingRequest {
  tenantId: string;
  contextType: 'global' | 'template' | 'conversation';
  queries?: string[];
  shardIds?: string[];
  templateIds?: string[];
  conversationIds?: string[];
  priority?: number;
}
