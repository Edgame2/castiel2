/**
 * Analytics Service types
 * Core data model for analytics and reporting
 */

export enum MetricType {
  USER_ACTION = 'user_action',
  SYSTEM_METRIC = 'system_metric',
  PERFORMANCE = 'performance',
  BUSINESS = 'business',
  CONVERSION = 'conversion',
}

export enum TimeAggregation {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  ANOMALY = 'anomaly',
}

/**
 * Analytics Event
 */
export interface AnalyticsEvent {
  id: string;
  tenantId: string; // Partition key
  userId: string;
  projectId?: string;
  eventType: string;
  eventName: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  duration?: number;
  url?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  ttl?: number;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create analytics event input
 */
export interface CreateAnalyticsEventInput {
  tenantId: string;
  userId: string;
  projectId?: string;
  eventType: string;
  eventName: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  sessionId?: string;
  duration?: number;
  url?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Usage Metric
 */
export interface UsageMetric {
  id: string;
  tenantId: string; // Partition key
  metricType: MetricType;
  metricName: string;
  value: number;
  dimensions?: Record<string, string>;
  timestamp: Date;
  projectId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Aggregate Metric
 */
export interface AggregateMetric {
  metricName: string;
  metricType: MetricType;
  period: TimeAggregation;
  startDate: Date;
  endDate: Date;
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  median?: number;
  stdDev?: number;
  percentile95?: number;
  percentile99?: number;
  values: {
    timestamp: Date;
    value: number;
  }[];
}

/**
 * Trending Analysis
 */
export interface TrendingAnalysis {
  metricName: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  direction: TrendDirection;
  confidence: number; // 0-100
  isAnomaly: boolean;
  forecast?: {
    nextValue: number;
    confidence: number;
  };
  period: {
    current: { startDate: Date; endDate: Date };
    previous: { startDate: Date; endDate: Date };
  };
}

/**
 * Predictive Insight
 */
export interface PredictiveInsight {
  id: string;
  tenantId: string;
  insightType: 'anomaly' | 'churn' | 'growth' | 'decline' | 'opportunity' | 'risk';
  metricName: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
  metadata?: Record<string, any>;
  detectedAt: Date;
}

/**
 * Dashboard Metric
 */
export interface DashboardMetric {
  id: string;
  metricName: string;
  metricType: MetricType;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  trend: TrendDirection;
  sparkline?: number[]; // Historical values for sparkline
  comparison?: {
    period: string;
    value: number;
    change: number;
  };
  formattedValue?: string;
  unit?: string;
}

/**
 * Analytics Query
 */
export interface AnalyticsQuery {
  tenantId: string;
  metricNames?: string[];
  metricTypes?: MetricType[];
  startDate: Date;
  endDate: Date;
  aggregation?: TimeAggregation;
  filters?: {
    projectId?: string;
    userId?: string;
    category?: string;
    action?: string;
    dimensions?: Record<string, string>;
  };
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Analytics Report
 */
export interface AnalyticsReport {
  id: string;
  tenantId: string; // Partition key
  projectId?: string;
  reportName: string;
  reportType: 'performance' | 'usage' | 'user_behavior' | 'feature_adoption' | 'revenue' | 'custom';
  description?: string;
  metrics: DashboardMetric[];
  insights?: PredictiveInsight[];
  period: TimeAggregation;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  generatedBy: string;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipient: string;
  };
  exportFormats?: ('pdf' | 'excel' | 'json')[];
  createdAt: Date;
  updatedAt: Date;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create analytics report input
 */
export interface CreateAnalyticsReportInput {
  tenantId: string;
  userId: string;
  projectId?: string;
  reportName: string;
  reportType: AnalyticsReport['reportType'];
  description?: string;
  period: TimeAggregation;
  startDate: Date;
  endDate: Date;
  schedule?: AnalyticsReport['schedule'];
  exportFormats?: AnalyticsReport['exportFormats'];
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  tenantId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  apiMetrics: {
    totalRequests: number;
    averageResponseTime: number; // milliseconds
    p50: number;
    p95: number;
    p99: number;
    errorRate: number; // percentage
    throughput: number; // requests per second
  };
  databaseMetrics: {
    averageQueryTime: number;
    totalQueries: number;
    slowQueries: number;
  };
  cacheMetrics: {
    hitRate: number; // percentage
    missRate: number; // percentage
    averageResponseTime: number;
  };
}

