/**
 * Analytics & Metrics Service
 * Usage analytics, trending, predictive insights, and reporting
 */
import { AnalyticsEvent, AggregateMetric, TrendingAnalysis, UserBehaviorAnalytics, FeatureAdoptionMetrics, PerformanceMetrics, AnalyticsComparison, TimeAggregation } from '../types/analytics.types';
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import { ProjectActivityService } from './project-activity.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
export declare class AnalyticsService {
    private cosmosDB;
    private cache;
    private activityService;
    private performanceMonitoring;
    private readonly logger;
    private readonly ANALYTICS_CACHE_TTL;
    private readonly EVENTS_CACHE_TTL;
    constructor(cosmosDB: CosmosDBService, cache: CacheService, activityService: ProjectActivityService, performanceMonitoring: PerformanceMonitoringService);
    /**
     * Track analytics event
     */
    trackEvent(tenantId: string, event: Partial<AnalyticsEvent>): Promise<AnalyticsEvent>;
    /**
     * Batch track events
     */
    trackBatchEvents(tenantId: string, events: Partial<AnalyticsEvent>[]): Promise<AnalyticsEvent[]>;
    /**
     * Get aggregate metrics
     */
    getAggregateMetrics(tenantId: string, metricName: string, startDate: Date, endDate: Date, aggregation?: TimeAggregation, projectId?: string): Promise<AggregateMetric>;
    /**
     * Get trending analysis
     */
    getTrendingAnalysis(tenantId: string, metricName: string, projectId?: string): Promise<TrendingAnalysis>;
    /**
     * Get user behavior analytics
     */
    getUserBehavior(tenantId: string, userId: string, projectId?: string): Promise<UserBehaviorAnalytics>;
    /**
     * Get feature adoption metrics
     */
    getFeatureAdoption(tenantId: string, featureName: string, projectId?: string): Promise<FeatureAdoptionMetrics>;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(tenantId: string, endpoint?: string, method?: string, daysBack?: number): Promise<PerformanceMetrics>;
    /**
     * Get analytics comparison
     */
    getComparison(tenantId: string, metricName: string, currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date, projectId?: string): Promise<AnalyticsComparison>;
    /**
     * Helper: Calculate median
     */
    private calculateMedian;
    /**
     * Helper: Calculate standard deviation
     */
    private calculateStdDev;
    /**
     * Helper: Calculate percentile
     */
    private calculatePercentile;
    /**
     * Helper: Calculate average
     */
    private calculateAverage;
    /**
     * Helper: Group by time
     */
    private groupByTime;
    /**
     * Helper: Get time key for grouping
     */
    private getTimeKey;
    /**
     * Helper: Group by sessions
     */
    private groupBySessions;
    /**
     * Helper: Group by device type
     */
    private groupByDeviceType;
    /**
     * Helper: Extract device type from user agent
     */
    private extractDeviceType;
    /**
     * Helper: Get top features
     */
    private getTopFeatures;
    /**
     * Helper: Calculate activity trend
     */
    private calculateActivityTrend;
    /**
     * Helper: Calculate engagement score
     */
    private calculateEngagementScore;
    /**
     * Helper: Assess churn risk
     */
    private assessChurnRisk;
    /**
     * Helper: Invalidate cache
     */
    private invalidateEventCache;
}
//# sourceMappingURL=analytics.service.d.ts.map