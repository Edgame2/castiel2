/**
 * Query Performance Tracker
 * 
 * Tracks Cosmos DB query performance, logs slow queries, and records performance metrics.
 * This utility should be used by all repository classes to ensure consistent performance monitoring.
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';

export interface QueryPerformanceContext {
  operation: string; // e.g., 'shard.repository.list'
  container: string; // Cosmos DB container name
  query?: string; // SQL query (may be truncated for logging)
  parameters?: Array<{ name: string; value: any }>; // Query parameters
  partitionKey?: string; // Partition key value if used
  itemCount?: number; // Number of items returned
  requestCharge?: number; // Request units consumed (if available)
  continuationToken?: string; // Continuation token if pagination used
  tenantId?: string; // Tenant ID for context
}

export interface QueryPerformanceResult {
  duration: number; // Execution time in milliseconds
  requestCharge?: number; // Request units consumed
  itemCount?: number; // Number of items returned
  isSlow: boolean; // Whether query exceeded slow threshold
  isExpensive: boolean; // Whether query exceeded expensive threshold
  logged: boolean; // Whether slow query was logged
}

/**
 * Track query performance and log slow queries
 */
export function trackQueryPerformance(
  monitoring: IMonitoringProvider,
  context: QueryPerformanceContext,
  startTime: number,
  requestCharge?: number,
  itemCount?: number
): QueryPerformanceResult {
  const duration = Date.now() - startTime;
  const perfConfig = config.cosmosDb.queryPerformance;
  
  const isSlow = duration > perfConfig.slowQueryThresholdMs;
  const isExpensive = requestCharge !== undefined && requestCharge > perfConfig.expensiveQueryThresholdRU;
  
  // Track dependency (always tracked for Application Insights)
  monitoring.trackDependency(
    `cosmosdb.${context.operation}`,
    'CosmosDB',
    config.cosmosDb.endpoint,
    duration,
    true // Assume success for performance tracking
  );
  
  // Track performance metrics if enabled
  if (perfConfig.enablePerformanceMetrics) {
    // Track query duration metric
    monitoring.trackMetric('query.duration', duration, {
      operation: context.operation,
      container: context.container,
      tenantId: context.tenantId,
    });
    
    // Track request charge if available
    if (requestCharge !== undefined) {
      monitoring.trackMetric('query.request_charge', requestCharge, {
        operation: context.operation,
        container: context.container,
        tenantId: context.tenantId,
      });
    }
    
    // Track item count if available
    if (itemCount !== undefined) {
      monitoring.trackMetric('query.item_count', itemCount, {
        operation: context.operation,
        container: context.container,
        tenantId: context.tenantId,
      });
    }
  }
  
  // Log slow queries if enabled
  let logged = false;
  if (perfConfig.enableSlowQueryLogging && (isSlow || isExpensive)) {
    const logContext: Record<string, any> = {
      operation: context.operation,
      container: context.container,
      duration,
      tenantId: context.tenantId,
    };
    
    if (requestCharge !== undefined) {
      logContext.requestCharge = requestCharge;
    }
    
    if (itemCount !== undefined) {
      logContext.itemCount = itemCount;
    }
    
    if (context.partitionKey) {
      logContext.partitionKey = context.partitionKey;
    }
    
    // Include query (truncated) if available
    if (context.query) {
      logContext.query = context.query.length > 500 
        ? context.query.substring(0, 500) + '...' 
        : context.query;
    }
    
    // Include parameter count and names (not values for security)
    if (context.parameters && context.parameters.length > 0) {
      logContext.parameterCount = context.parameters.length;
      logContext.parameterNames = context.parameters.map(p => p.name).slice(0, 10).join(', ');
    }
    
    // Track slow query event
    if (isSlow) {
      monitoring.trackEvent('query.slow', {
        ...logContext,
        threshold: perfConfig.slowQueryThresholdMs,
        exceededBy: duration - perfConfig.slowQueryThresholdMs,
      });
    }
    
    // Track expensive query event
    if (isExpensive && requestCharge !== undefined) {
      monitoring.trackEvent('query.expensive', {
        ...logContext,
        threshold: perfConfig.expensiveQueryThresholdRU,
        exceededBy: requestCharge - perfConfig.expensiveQueryThresholdRU,
      });
    }
    
    logged = true;
  }
  
  return {
    duration,
    requestCharge,
    itemCount,
    isSlow,
    isExpensive,
    logged,
  };
}

/**
 * Track query error performance
 */
export function trackQueryError(
  monitoring: IMonitoringProvider,
  context: QueryPerformanceContext,
  startTime: number,
  error: Error
): void {
  const duration = Date.now() - startTime;
  
  // Track failed dependency
  monitoring.trackDependency(
    `cosmosdb.${context.operation}`,
    'CosmosDB',
    config.cosmosDb.endpoint,
    duration,
    false // Failed
  );
  
  // Track exception with query context
  const errorContext: Record<string, any> = {
    operation: context.operation,
    container: context.container,
    duration,
    tenantId: context.tenantId,
  };
  
  if (context.query) {
    errorContext.query = context.query.length > 500 
      ? context.query.substring(0, 500) + '...' 
      : context.query;
  }
  
  if (context.parameters && context.parameters.length > 0) {
    errorContext.parameterCount = context.parameters.length;
    errorContext.parameterNames = context.parameters.map(p => p.name).slice(0, 10).join(', ');
  }
  
  monitoring.trackException(error, errorContext);
}
