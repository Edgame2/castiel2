/**
 * Storage Provider Interface
 * Per ModuleImplementationGuide Section 6: Abstraction Layer Pattern
 */

import {
  AuditLog,
  CreateLogInput,
  LogSearchParams,
  LogSearchResult,
  LogAggregation,
  LogAggregationParams,
} from '../../../types';

/**
 * Storage provider interface for audit logs.
 * All storage implementations must conform to this contract.
 */
export interface IStorageProvider {
  /**
   * Store a single log entry
   */
  store(log: AuditLog): Promise<AuditLog>;
  
  /**
   * Store multiple log entries in a batch
   */
  storeBatch(logs: AuditLog[]): Promise<AuditLog[]>;
  
  /**
   * Get a log by ID
   */
  getById(id: string, organizationId?: string): Promise<AuditLog | null>;
  
  /**
   * Search logs with filters
   */
  search(params: LogSearchParams): Promise<LogSearchResult>;
  
  /**
   * Full-text search (optional - provider may fall back to basic search)
   */
  fullTextSearch?(query: string, params: LogSearchParams): Promise<LogSearchResult>;
  
  /**
   * Get aggregation statistics
   */
  aggregate(params: LogAggregationParams): Promise<LogAggregation>;
  
  /**
   * Get time-series aggregation for dashboards
   */
  getTimeSeries?(params: LogAggregationParams & { interval: 'hour' | 'day' | 'week' | 'month' }): Promise<{ buckets: { timestamp: string; count: number }[] }>;
  
  /**
   * Get distinct values for a field (for filter dropdowns)
   */
  getDistinctValues?(field: 'action' | 'source' | 'resourceType', organizationId?: string, limit?: number): Promise<string[]>;
  
  /**
   * Get the last log entry (for hash chain)
   */
  getLastLog(organizationId?: string): Promise<AuditLog | null>;
  
  /**
   * Get logs by IDs (for verification)
   */
  getByIds(ids: string[]): Promise<AuditLog[]>;
  
  /**
   * Get logs in a time range (for verification)
   */
  getLogsInRange(startTime: Date, endTime: Date, limit?: number): Promise<AuditLog[]>;
  
  /**
   * Count logs matching criteria
   */
  count(params: Partial<LogSearchParams>): Promise<number>;
  
  /**
   * Delete logs older than date (for retention)
   */
  deleteOlderThan(date: Date, organizationId?: string): Promise<number>;
  
  /**
   * Health check - verify provider is operational
   */
  healthCheck(): Promise<{ status: 'ok' | 'error'; latency_ms: number; message?: string }>;
}

/**
 * Storage provider configuration
 */
export interface StorageProviderConfig {
  provider: 'postgres' | 'elasticsearch';
  postgres?: {
    partition_by: 'month' | 'week' | 'day';
  };
  elasticsearch?: {
    nodes: string[];
    index_prefix: string;
  };
}

