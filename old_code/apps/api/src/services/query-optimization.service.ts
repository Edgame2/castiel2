/**
 * Query Optimization Service
 * 
 * Analyzes and optimizes Cosmos DB queries for production performance.
 * Provides query performance monitoring, slow query identification, and optimization recommendations.
 */

import { Container, CosmosClient, FeedResponse } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import { config } from '../config/env.js';

export interface QueryAnalysisResult {
  query: string;
  parameters: Array<{ name: string; value: any }>;
  executionTimeMs: number;
  requestCharge: number;
  itemCount: number;
  partitionKeyUsed: boolean;
  partitionKeyValue?: string;
  hasCompositeIndex: boolean;
  recommendations: string[];
  severity: 'info' | 'warning' | 'error';
}

export interface QueryOptimizationReport {
  totalQueries: number;
  slowQueries: number; // > 1000ms
  expensiveQueries: number; // > 10 RUs
  missingPartitionKey: number;
  missingIndex: number;
  recommendations: Array<{
    query: string;
    issue: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface SlowQueryThresholds {
  executionTimeMs: number; // Default: 1000ms
  requestCharge: number; // Default: 10 RUs
}

/**
 * Query Optimization Service
 * Monitors and optimizes Cosmos DB query performance
 */
export class QueryOptimizationService {
  private queryMetrics: Map<string, QueryAnalysisResult[]> = new Map();
  private readonly slowQueryThresholds: SlowQueryThresholds;

  constructor(
    private monitoring: IMonitoringProvider,
    private cosmosClient: CosmosClient,
    thresholds?: Partial<SlowQueryThresholds>
  ) {
    this.slowQueryThresholds = {
      executionTimeMs: thresholds?.executionTimeMs ?? 1000,
      requestCharge: thresholds?.requestCharge ?? 10,
    };
  }

  /**
   * Analyze a query execution and provide optimization recommendations
   */
  async analyzeQuery(
    container: Container,
    query: string,
    parameters: Array<{ name: string; value: any }>,
    partitionKey?: string
  ): Promise<QueryAnalysisResult> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(query, parameters);

    try {
      // Execute query with monitoring
      const feedOptions: any = {
        maxItemCount: 100,
        populateQueryMetrics: true, // Enable query metrics
      };

      if (partitionKey) {
        feedOptions.partitionKey = partitionKey;
      }

      const response = await container.items.query(
        { query, parameters },
        feedOptions
      ).fetchAll();

      const executionTimeMs = Date.now() - startTime;
      
      // Extract metrics from response (if available)
      const requestCharge = (response as any).requestCharge || 0;
      const itemCount = response.resources?.length || 0;

      // Analyze query
      const partitionKeyUsed = this.hasPartitionKeyFilter(query, parameters);
      const hasCompositeIndex = this.checkCompositeIndexUsage(query, container);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        query,
        parameters,
        executionTimeMs,
        requestCharge,
        partitionKeyUsed,
        hasCompositeIndex,
        partitionKey
      );

      const result: QueryAnalysisResult = {
        query,
        parameters,
        executionTimeMs,
        requestCharge,
        itemCount,
        partitionKeyUsed,
        partitionKeyValue: partitionKey,
        hasCompositeIndex,
        recommendations,
        severity: this.determineSeverity(executionTimeMs, requestCharge, partitionKeyUsed),
      };

      // Store metrics
      this.storeQueryMetric(queryId, result);

      // Track slow queries
      if (executionTimeMs > this.slowQueryThresholds.executionTimeMs) {
        this.monitoring.trackEvent('query.slow', {
          queryId,
          executionTimeMs,
          requestCharge,
          itemCount,
          partitionKeyUsed,
        });
      }

      // Track expensive queries
      if (requestCharge > this.slowQueryThresholds.requestCharge) {
        this.monitoring.trackEvent('query.expensive', {
          queryId,
          executionTimeMs,
          requestCharge,
          itemCount,
        });
      }

      return result;
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      
      this.monitoring.trackException(error as Error, {
        operation: 'query.analyze',
        query: query.substring(0, 100),
        executionTimeMs,
      });

      return {
        query,
        parameters,
        executionTimeMs,
        requestCharge: 0,
        itemCount: 0,
        partitionKeyUsed: false,
        hasCompositeIndex: false,
        recommendations: ['Query execution failed - check error logs'],
        severity: 'error',
      };
    }
  }

  /**
   * Generate optimization report for all tracked queries
   */
  generateReport(): QueryOptimizationReport {
    const allResults: QueryAnalysisResult[] = [];
    for (const results of this.queryMetrics.values()) {
      allResults.push(...results);
    }

    const slowQueries = allResults.filter(
      r => r.executionTimeMs > this.slowQueryThresholds.executionTimeMs
    );
    const expensiveQueries = allResults.filter(
      r => r.requestCharge > this.slowQueryThresholds.requestCharge
    );
    const missingPartitionKey = allResults.filter(r => !r.partitionKeyUsed);
    const missingIndex = allResults.filter(r => !r.hasCompositeIndex && r.recommendations.some(rec => rec.includes('index')));

    const recommendations = allResults
      .filter(r => r.recommendations.length > 0)
      .flatMap(r => 
        r.recommendations.map(rec => ({
          query: r.query.substring(0, 200),
          issue: this.extractIssue(r),
          recommendation: rec,
          priority: this.determinePriority(r),
        }))
      );

    return {
      totalQueries: allResults.length,
      slowQueries: slowQueries.length,
      expensiveQueries: expensiveQueries.length,
      missingPartitionKey: missingPartitionKey.length,
      missingIndex: missingIndex.length,
      recommendations: recommendations.slice(0, 50), // Top 50 recommendations
    };
  }

  /**
   * Check if query uses partition key filter
   */
  private hasPartitionKeyFilter(
    query: string,
    parameters: Array<{ name: string; value: any }>
  ): boolean {
    // Check for common partition key patterns
    const partitionKeyPatterns = [
      /c\.tenantId\s*=\s*@tenantId/i,
      /c\.partitionKey\s*=\s*@partitionKey/i,
      /WHERE\s+.*tenantId/i,
    ];

    const queryLower = query.toLowerCase();
    return partitionKeyPatterns.some(pattern => pattern.test(queryLower)) ||
           parameters.some(p => p.name.toLowerCase().includes('tenantid') || 
                               p.name.toLowerCase().includes('partitionkey'));
  }

  /**
   * Check if query can benefit from composite index
   */
  private checkCompositeIndexUsage(
    query: string,
    container: Container
  ): boolean {
    // This is a simplified check - in production, would analyze container's indexing policy
    // Check for ORDER BY with multiple fields (common composite index pattern)
    const orderByMatches = query.match(/ORDER BY\s+([^LIMIT]+)/i);
    if (orderByMatches) {
      const orderByFields = orderByMatches[1].split(',').length;
      return orderByFields > 1; // Multiple fields in ORDER BY suggest composite index
    }
    return false;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    query: string,
    parameters: Array<{ name: string; value: any }>,
    executionTimeMs: number,
    requestCharge: number,
    partitionKeyUsed: boolean,
    hasCompositeIndex: boolean,
    partitionKey?: string
  ): string[] {
    const recommendations: string[] = [];

    // Partition key recommendations
    if (!partitionKeyUsed && !partitionKey) {
      recommendations.push('Query does not filter by partition key - this may cause cross-partition queries. Add partition key filter for better performance.');
    }

    // Performance recommendations
    if (executionTimeMs > this.slowQueryThresholds.executionTimeMs) {
      recommendations.push(`Query execution time (${executionTimeMs}ms) exceeds threshold (${this.slowQueryThresholds.executionTimeMs}ms). Consider adding indexes or optimizing query.`);
    }

    if (requestCharge > this.slowQueryThresholds.requestCharge) {
      recommendations.push(`Query request charge (${requestCharge} RUs) is high. Consider optimizing query or adding composite indexes.`);
    }

    // Index recommendations
    if (query.includes('ORDER BY') && !hasCompositeIndex) {
      const orderByFields = query.match(/ORDER BY\s+([^LIMIT]+)/i)?.[1];
      if (orderByFields) {
        recommendations.push(`Query uses ORDER BY with multiple fields but may not have composite index. Consider adding composite index for: ${orderByFields.trim()}`);
      }
    }

    // Pagination recommendations
    if (!query.includes('TOP') && !query.includes('LIMIT') && !query.includes('OFFSET')) {
      recommendations.push('Query does not use pagination (TOP/LIMIT). Consider adding pagination to limit result size.');
    }

    // Filter recommendations
    if (query.includes('WHERE') && query.match(/WHERE.*AND.*AND/i)) {
      recommendations.push('Query has multiple AND conditions. Ensure all filter fields are indexed.');
    }

    return recommendations;
  }

  /**
   * Determine query severity
   */
  private determineSeverity(
    executionTimeMs: number,
    requestCharge: number,
    partitionKeyUsed: boolean
  ): 'info' | 'warning' | 'error' {
    if (!partitionKeyUsed) {
      return 'error'; // Cross-partition queries are always errors
    }
    if (executionTimeMs > this.slowQueryThresholds.executionTimeMs * 2 || 
        requestCharge > this.slowQueryThresholds.requestCharge * 2) {
      return 'error';
    }
    if (executionTimeMs > this.slowQueryThresholds.executionTimeMs || 
        requestCharge > this.slowQueryThresholds.requestCharge) {
      return 'warning';
    }
    return 'info';
  }

  /**
   * Determine recommendation priority
   */
  private determinePriority(result: QueryAnalysisResult): 'high' | 'medium' | 'low' {
    if (result.severity === 'error') {return 'high';}
    if (result.severity === 'warning') {return 'medium';}
    return 'low';
  }

  /**
   * Extract issue description from query result
   */
  private extractIssue(result: QueryAnalysisResult): string {
    if (!result.partitionKeyUsed) {
      return 'Missing partition key filter';
    }
    if (result.executionTimeMs > this.slowQueryThresholds.executionTimeMs) {
      return `Slow query (${result.executionTimeMs}ms)`;
    }
    if (result.requestCharge > this.slowQueryThresholds.requestCharge) {
      return `High request charge (${result.requestCharge} RUs)`;
    }
    if (!result.hasCompositeIndex && result.query.includes('ORDER BY')) {
      return 'Missing composite index';
    }
    return 'Query optimization opportunity';
  }

  /**
   * Store query metric for reporting
   */
  private storeQueryMetric(queryId: string, result: QueryAnalysisResult): void {
    if (!this.queryMetrics.has(queryId)) {
      this.queryMetrics.set(queryId, []);
    }
    const metrics = this.queryMetrics.get(queryId)!;
    metrics.push(result);
    
    // Keep only last 100 executions per query
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Generate unique query ID for tracking
   */
  private generateQueryId(
    query: string,
    parameters: Array<{ name: string; value: any }>
  ): string {
    // Normalize query (remove parameter values, keep structure)
    const normalizedQuery = query
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    
    const paramNames = parameters.map(p => p.name).sort().join(',');
    return `${normalizedQuery.substring(0, 100)}|${paramNames}`;
  }

  /**
   * Clear stored metrics
   */
  clearMetrics(): void {
    this.queryMetrics.clear();
  }

  /**
   * Get metrics for a specific query pattern
   */
  getQueryMetrics(queryPattern: string): QueryAnalysisResult[] {
    const results: QueryAnalysisResult[] = [];
    for (const [queryId, metrics] of this.queryMetrics.entries()) {
      if (queryId.includes(queryPattern.toLowerCase())) {
        results.push(...metrics);
      }
    }
    return results;
  }
}








