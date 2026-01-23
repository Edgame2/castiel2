/**
 * API Performance Monitoring Service
 *
 * Tracks API response times, calculates percentiles (p50, p95, p99),
 * identifies slow endpoints, and establishes performance baselines.
 *
 * Target: p95 < 500ms, p99 < 1000ms
 */
import type { IMonitoringProvider } from '@castiel/monitoring';
export interface EndpointPerformanceStats {
    endpoint: string;
    method: string;
    totalRequests: number;
    avgResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    minResponseTime: number;
    maxResponseTime: number;
    errorRate: number;
    successRate: number;
    lastUpdated: Date;
}
export interface PerformanceBaseline {
    endpoint: string;
    method: string;
    targetP95: number;
    targetP99: number;
    currentP95: number;
    currentP99: number;
    status: 'healthy' | 'warning' | 'critical';
    recommendations: string[];
}
export interface SlowEndpoint {
    endpoint: string;
    method: string;
    p95: number;
    p99: number;
    avgResponseTime: number;
    requestCount: number;
    severity: 'warning' | 'critical';
    exceedsTarget: boolean;
}
/**
 * API Performance Monitoring Service
 */
export declare class APIPerformanceMonitoringService {
    private monitoring;
    private endpointResponseTimes;
    private endpointErrors;
    private endpointSuccesses;
    private readonly MAX_SAMPLES_PER_ENDPOINT;
    private readonly TARGET_P95;
    private readonly TARGET_P99;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Record API response time for an endpoint
     */
    recordResponseTime(endpoint: string, method: string, responseTime: number, statusCode: number): void;
    /**
     * Get performance statistics for an endpoint
     */
    getEndpointStats(endpoint: string, method: string): EndpointPerformanceStats | null;
    /**
     * Get all endpoint statistics
     */
    getAllEndpointStats(): EndpointPerformanceStats[];
    /**
     * Get slow endpoints (exceeding targets)
     */
    getSlowEndpoints(): SlowEndpoint[];
    /**
     * Get performance baselines for all endpoints
     */
    getPerformanceBaselines(): PerformanceBaseline[];
    /**
     * Track percentiles for an endpoint
     */
    private trackPercentiles;
    /**
     * Get endpoint key for internal storage
     */
    private getEndpointKey;
    /**
     * Parse endpoint key back to endpoint and method
     */
    private parseEndpointKey;
    /**
     * Reset statistics for an endpoint
     */
    resetEndpointStats(endpoint: string, method: string): void;
    /**
     * Reset all statistics
     */
    resetAllStats(): void;
    /**
     * Get summary statistics
     */
    getSummaryStats(): {
        totalEndpoints: number;
        healthyEndpoints: number;
        warningEndpoints: number;
        criticalEndpoints: number;
        avgP95AcrossEndpoints: number;
        avgP99AcrossEndpoints: number;
    };
}
//# sourceMappingURL=api-performance-monitoring.service.d.ts.map