/**
 * Query Optimization Service
 *
 * Analyzes and optimizes Cosmos DB queries for production performance.
 * Provides query performance monitoring, slow query identification, and optimization recommendations.
 */
import { Container, CosmosClient } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
export interface QueryAnalysisResult {
    query: string;
    parameters: Array<{
        name: string;
        value: any;
    }>;
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
    slowQueries: number;
    expensiveQueries: number;
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
    executionTimeMs: number;
    requestCharge: number;
}
/**
 * Query Optimization Service
 * Monitors and optimizes Cosmos DB query performance
 */
export declare class QueryOptimizationService {
    private monitoring;
    private cosmosClient;
    private queryMetrics;
    private readonly slowQueryThresholds;
    constructor(monitoring: IMonitoringProvider, cosmosClient: CosmosClient, thresholds?: Partial<SlowQueryThresholds>);
    /**
     * Analyze a query execution and provide optimization recommendations
     */
    analyzeQuery(container: Container, query: string, parameters: Array<{
        name: string;
        value: any;
    }>, partitionKey?: string): Promise<QueryAnalysisResult>;
    /**
     * Generate optimization report for all tracked queries
     */
    generateReport(): QueryOptimizationReport;
    /**
     * Check if query uses partition key filter
     */
    private hasPartitionKeyFilter;
    /**
     * Check if query can benefit from composite index
     */
    private checkCompositeIndexUsage;
    /**
     * Generate optimization recommendations
     */
    private generateRecommendations;
    /**
     * Determine query severity
     */
    private determineSeverity;
    /**
     * Determine recommendation priority
     */
    private determinePriority;
    /**
     * Extract issue description from query result
     */
    private extractIssue;
    /**
     * Store query metric for reporting
     */
    private storeQueryMetric;
    /**
     * Generate unique query ID for tracking
     */
    private generateQueryId;
    /**
     * Clear stored metrics
     */
    clearMetrics(): void;
    /**
     * Get metrics for a specific query pattern
     */
    getQueryMetrics(queryPattern: string): QueryAnalysisResult[];
}
//# sourceMappingURL=query-optimization.service.d.ts.map