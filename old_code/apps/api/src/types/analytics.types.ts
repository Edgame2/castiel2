/**
 * Analytics & Metrics Types
 * Usage analytics, trending, predictive insights, and custom metrics
 */

/**
 * Analytics metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
  CUSTOM = 'custom',
}

/**
 * Time aggregation levels
 */
export enum TimeAggregation {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

/**
 * Trending directions
 */
export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  ANOMALY = 'anomaly',
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  id: string;
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
  timestamp: Date;
  sessionId?: string;
  duration?: number;
  url?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  ttl?: number;
}

/**
 * Usage metric
 */
export interface UsageMetric {
  id: string;
  tenantId: string;
  projectId?: string;
  userId?: string;
  metricType: MetricType;
  metricName: string;
  value: number;
  unit: string;
  timestamp: Date;
  aggregation: TimeAggregation;
  dimensions?: Record<string, string>;
  metadata?: Record<string, any>;
  ttl?: number;
}

/**
 * Aggregate metric data
 */
export interface AggregateMetric {
  metricName: string;
  period: TimeAggregation;
  startDate: Date;
  endDate: Date;
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  median: number;
  stdDev: number;
  percentile95: number;
  percentile99: number;
  values: {
    timestamp: Date;
    value: number;
  }[];
}

/**
 * Trending analysis
 */
export interface TrendingAnalysis {
  metricName: string;
  currentValue: number;
  previousValue: number;
  direction: TrendDirection;
  percentageChange: number;
  absoluteChange: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number; // 0-1
  period: TimeAggregation;
  forecastNext?: {
    value: number;
    confidence: number;
    range: [number, number];
  };
}

/**
 * Predictive insight
 */
export interface PredictiveInsight {
  id: string;
  tenantId: string;
  projectId?: string;
  insightType:
    | 'user_churn'
    | 'usage_anomaly'
    | 'growth_forecast'
    | 'feature_adoption'
    | 'performance_degradation'
    | 'custom';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
  data: Record<string, any>;
  detectedAt: Date;
  validUntil?: Date;
  actionTaken?: boolean;
  ttl?: number;
}

/**
 * Dashboard metric
 */
export interface DashboardMetric {
  id: string;
  tenantId: string;
  projectId?: string;
  widgetType:
    | 'line_chart'
    | 'bar_chart'
    | 'pie_chart'
    | 'gauge'
    | 'number'
    | 'table'
    | 'heatmap'
    | 'custom';
  title: string;
  description?: string;
  metricName: string;
  metricValue: number | any[];
  unit?: string;
  format?: string; // 'number', 'percentage', 'currency', etc.
  sparklineData?: { x: string | Date; y: number }[];
  trend?: TrendingAnalysis;
  comparisonValue?: number;
  comparisonLabel?: string;
  metadata?: Record<string, any>;
  lastUpdated: Date;
  refreshInterval: number; // seconds
}

/**
 * Custom metric definition
 */
export interface CustomMetricDefinition {
  id: string;
  tenantId: string;
  projectId?: string;
  metricName: string;
  description: string;
  metricType: MetricType;
  unit: string;
  aggregationType: 'sum' | 'average' | 'count' | 'min' | 'max' | 'custom';
  eventFilter?: {
    eventType: string;
    properties: Record<string, any>;
  };
  calculation?: string; // Custom formula or calculation
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  ttl?: number;
}

/**
 * User behavior analytics
 */
export interface UserBehaviorAnalytics {
  userId: string;
  tenantId: string;
  projectId?: string;
  sessionCount: number;
  totalSessionDuration: number;
  averageSessionDuration: number;
  lastActiveAt: Date;
  firstSeenAt: Date;
  deviceTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
  topFeatures: {
    feature: string;
    usageCount: number;
    lastUsed: Date;
  }[];
  activityTrend: {
    date: Date;
    sessions: number;
    duration: number;
  }[];
  engagementScore: number; // 0-100
  churnRisk: 'low' | 'medium' | 'high';
}

/**
 * Feature adoption metrics
 */
export interface FeatureAdoptionMetrics {
  featureName: string;
  tenantId: string;
  totalUsers: number;
  adoptedUsers: number;
  adoptionRate: number; // percentage
  adoptionTrend: TrendingAnalysis;
  daysSinceRelease: number;
  projectedAdoptionRate: number;
  usageMetrics: {
    totalUsages: number;
    uniqueUsers: number;
    averageUsagePerUser: number;
    usageFrequency: 'high' | 'medium' | 'low';
  };
  successMetrics: {
    conversionRate: number;
    engagementScore: number;
    retentionRate: number;
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  id: string;
  tenantId: string;
  projectId?: string;
  endpoint?: string;
  method?: string;
  avgResponseTime: number; // milliseconds
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorRate: number; // percentage
  successRate: number; // percentage
  throughput: number; // requests per second
  period: TimeAggregation;
  sampledAt: Date;
  recommendations?: string[];
}

/**
 * Conversion funnel
 */
export interface ConversionFunnel {
  id: string;
  tenantId: string;
  projectId?: string;
  funnelName: string;
  description?: string;
  steps: {
    stepNumber: number;
    stepName: string;
    eventType: string;
    users: number;
    conversionRate: number;
    dropoffRate: number;
    averageTimeToConversion: number;
  }[];
  totalEntrants: number;
  finalConversions: number;
  overallConversionRate: number;
  avgTimeToConvert: number;
  trend: TrendingAnalysis;
  period: TimeAggregation;
  analyzedAt: Date;
}

/**
 * Cohort analysis
 */
export interface CohortAnalysis {
  id: string;
  tenantId: string;
  projectId?: string;
  cohortName: string;
  cohortType: 'acquisition_date' | 'property' | 'behavior';
  cohortCriteria: Record<string, any>;
  cohortSize: number;
  retentionData: {
    day: number;
    usersRemaining: number;
    retentionRate: number;
  }[];
  avgLifetimeValue: number;
  churnRate: number;
  engagementScore: number;
  createdAt: Date;
}

/**
 * Revenue analytics
 */
export interface RevenueAnalytics {
  tenantId: string;
  period: TimeAggregation;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  revenueGrowth: number; // percentage
  customerCount: number;
  arpu: number; // Average Revenue Per User
  churnRate: number;
  ltv: number; // Customer Lifetime Value
  cac: number; // Customer Acquisition Cost
  roi: number;
  topProducts: {
    name: string;
    revenue: number;
    percentage: number;
  }[];
}

/**
 * Analytics query
 */
export interface AnalyticsQuery {
  id: string;
  tenantId: string;
  projectId?: string;
  queryName: string;
  description?: string;
  metric: string;
  filters: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
    value: any;
  }[];
  groupBy?: string[];
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  timeRange?: {
    startDate: Date;
    endDate: Date;
  };
  limit?: number;
  offset?: number;
  cacheResults?: boolean;
  cacheTTL?: number;
}

/**
 * Analytics report
 */
export interface AnalyticsReport {
  id: string;
  tenantId: string;
  projectId?: string;
  reportName: string;
  reportType:
    | 'performance'
    | 'usage'
    | 'user_behavior'
    | 'feature_adoption'
    | 'revenue'
    | 'custom';
  description?: string;
  metrics: DashboardMetric[];
  insights: PredictiveInsight[];
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
  ttl?: number;
}

/**
 * Analytics export request
 */
export interface ExportRequest {
  reportId: string;
  format: 'pdf' | 'excel' | 'json' | 'csv';
  includeCharts: boolean;
  includeSummary: boolean;
  includeRawData: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Analytics dashboard configuration
 */
export interface DashboardConfiguration {
  id: string;
  tenantId: string;
  projectId?: string;
  dashboardName: string;
  description?: string;
  widgets: {
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    metricName: string;
    refreshInterval: number;
    configuration?: Record<string, any>;
  }[];
  layout: 'grid' | 'responsive' | 'custom';
  theme?: 'light' | 'dark';
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  ttl?: number;
}

/**
 * Anomaly detection alert
 */
export interface AnomalyAlert {
  id: string;
  tenantId: string;
  projectId?: string;
  metricName: string;
  anomalyType: 'spike' | 'dip' | 'trend_change' | 'threshold_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedValue: number;
  actualValue: number;
  deviation: number; // percentage
  threshold: number;
  detectedAt: Date;
  resolvedAt?: Date;
  isActive: boolean;
  autoResolved: boolean;
  metadata?: Record<string, any>;
  ttl?: number;
}

/**
 * Custom dashboard widget
 */
export interface CustomWidget {
  id: string;
  tenantId: string;
  projectId?: string;
  widgetName: string;
  widgetType: string;
  description?: string;
  dataSource: {
    type: 'metric' | 'query' | 'api' | 'calculation';
    source: string;
    refreshInterval: number;
  };
  visualization: {
    chartType: string;
    config: Record<string, any>;
  };
  filters?: {
    field: string;
    defaultValue: any;
    allowUserOverride: boolean;
  }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isShared: boolean;
  ttl?: number;
}

/**
 * Analytics comparison
 */
export interface AnalyticsComparison {
  metricName: string;
  currentPeriod: {
    startDate: Date;
    endDate: Date;
    value: number;
    dataPoints: number;
  };
  previousPeriod: {
    startDate: Date;
    endDate: Date;
    value: number;
    dataPoints: number;
  };
  absoluteChange: number;
  percentageChange: number;
  trend: TrendDirection;
  significance: number; // p-value for statistical significance
  recommendation?: string;
}
