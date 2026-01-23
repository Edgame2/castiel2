/**
 * Search Analytics Types
 * 
 * Types for search analytics including:
 * - Query analytics
 * - Zero-result detection
 * - Satisfaction metrics
 * - Popular terms dashboard
 */

export interface SearchQueryEvent {
  id: string;
  userId: string;
  tenantId: string;
  query: string;
  queryHash: string; // Hash for deduplication
  filters?: Record<string, any>;
  shardTypeId?: string;
  topK?: number;
  minScore?: number;
  similarityMetric?: string;
  
  // Results
  resultCount: number;
  hasResults: boolean;
  executionTimeMs: number;
  fromCache: boolean;
  
  // User interaction (optional, tracked separately)
  clickedResult?: boolean;
  clickedResultId?: string;
  viewedResults?: boolean;
  satisfactionScore?: number; // 1-5 rating
  
  // Metadata
  timestamp: Date;
  userAgent?: string;
  sessionId?: string;
}

export interface QueryAnalytics {
  query: string;
  queryHash: string;
  totalSearches: number;
  uniqueUsers: number;
  averageResultCount: number;
  averageExecutionTime: number;
  zeroResultCount: number;
  zeroResultRate: number; // percentage
  cacheHitRate: number; // percentage
  satisfactionScore?: number; // average satisfaction
  lastSearched: Date;
  firstSearched: Date;
  
  // Breakdown by time period
  searchesByDay?: Array<{
    date: string;
    count: number;
    zeroResults: number;
  }>;
}

export interface ZeroResultQuery {
  query: string;
  queryHash: string;
  count: number;
  lastSearched: Date;
  firstSearched: Date;
  uniqueUsers: number;
  filters?: Record<string, any>;
  shardTypeId?: string;
  suggestedActions?: string[]; // Suggestions to improve results
}

export interface SatisfactionMetric {
  queryHash: string;
  query: string;
  totalInteractions: number;
  clicks: number;
  views: number;
  averageSatisfactionScore: number;
  clickThroughRate: number; // percentage
  satisfactionDistribution: {
    score1: number;
    score2: number;
    score3: number;
    score4: number;
    score5: number;
  };
  lastInteraction: Date;
}

export interface PopularTermsDashboard {
  period: 'day' | 'week' | 'month' | 'all';
  startDate: Date;
  endDate: Date;
  
  // Top queries
  topQueries: Array<{
    query: string;
    count: number;
    uniqueUsers: number;
    averageResultCount: number;
    zeroResultRate: number;
  }>;
  
  // Zero-result queries
  topZeroResultQueries: Array<{
    query: string;
    count: number;
    uniqueUsers: number;
  }>;
  
  // Trends
  searchVolumeTrend: Array<{
    date: string;
    searches: number;
    zeroResults: number;
    uniqueUsers: number;
  }>;
  
  // Performance metrics
  averageExecutionTime: number;
  cacheHitRate: number;
  averageResultCount: number;
  
  // Satisfaction metrics
  averageSatisfactionScore?: number;
  clickThroughRate?: number;
  
  // Filters breakdown
  topFilters?: Array<{
    filter: string;
    count: number;
  }>;
  
  // Shard type breakdown
  searchesByShardType?: Array<{
    shardTypeId: string;
    count: number;
    averageResultCount: number;
  }>;
}

export interface SearchAnalyticsRequest {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  period?: 'day' | 'week' | 'month' | 'all';
  limit?: number;
  shardTypeId?: string;
  userId?: string;
}

export interface SearchInteractionEvent {
  queryHash: string;
  query?: string; // Optional, for convenience
  userId: string;
  tenantId: string;
  interactionType: 'click' | 'view' | 'satisfaction';
  resultId?: string;
  satisfactionScore?: number; // 1-5
  timestamp: Date;
}

