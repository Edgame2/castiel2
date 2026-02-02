/**
 * System configuration types (Super Admin §8.1)
 * Performance targets and throughput; stored as JSON in configuration_settings (key: system.performance, scope: global).
 */

export interface LatencyTargetGroup {
  p50: number;
  p95: number;
  p99: number;
}

export interface PerformanceTargetsConfig {
  latencyTargets: {
    featureExtraction: LatencyTargetGroup;
    mlPrediction: LatencyTargetGroup;
    explanation: LatencyTargetGroup;
    llmReasoning: LatencyTargetGroup;
    decisionEvaluation: LatencyTargetGroup;
    endToEnd: LatencyTargetGroup;
  };
  throughputTargets: {
    predictionsPerSecond: number;
    batchSize: number;
    concurrentRequests: number;
  };
  alerts: {
    alertIfExceeded: boolean;
    alertThreshold: number;
  };
}

const defaultLatency = (p95: number): LatencyTargetGroup => ({
  p50: Math.round(p95 * 0.5),
  p95,
  p99: Math.round(p95 * 1.2),
});

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceTargetsConfig = {
  latencyTargets: {
    featureExtraction: defaultLatency(500),
    mlPrediction: defaultLatency(2000),
    explanation: defaultLatency(1000),
    llmReasoning: defaultLatency(3000),
    decisionEvaluation: defaultLatency(100),
    endToEnd: defaultLatency(5000),
  },
  throughputTargets: {
    predictionsPerSecond: 50,
    batchSize: 100,
    concurrentRequests: 100,
  },
  alerts: {
    alertIfExceeded: true,
    alertThreshold: 10,
  },
};

function mergeWithDefaults(partial: Partial<PerformanceTargetsConfig>): PerformanceTargetsConfig {
  const d = DEFAULT_PERFORMANCE_CONFIG;
  const lt = (partial.latencyTargets ?? {}) as Partial<PerformanceTargetsConfig['latencyTargets']>;
  const tt = (partial.throughputTargets ?? {}) as Partial<PerformanceTargetsConfig['throughputTargets']>;
  const al = (partial.alerts ?? {}) as Partial<PerformanceTargetsConfig['alerts']>;
  return {
    latencyTargets: {
      featureExtraction: { ...d.latencyTargets.featureExtraction, ...lt.featureExtraction },
      mlPrediction: { ...d.latencyTargets.mlPrediction, ...lt.mlPrediction },
      explanation: { ...d.latencyTargets.explanation, ...lt.explanation },
      llmReasoning: { ...d.latencyTargets.llmReasoning, ...lt.llmReasoning },
      decisionEvaluation: { ...d.latencyTargets.decisionEvaluation, ...lt.decisionEvaluation },
      endToEnd: { ...d.latencyTargets.endToEnd, ...lt.endToEnd },
    },
    throughputTargets: {
      predictionsPerSecond: tt.predictionsPerSecond ?? d.throughputTargets.predictionsPerSecond,
      batchSize: tt.batchSize ?? d.throughputTargets.batchSize,
      concurrentRequests: tt.concurrentRequests ?? d.throughputTargets.concurrentRequests,
    },
    alerts: {
      alertIfExceeded: al.alertIfExceeded ?? d.alerts.alertIfExceeded,
      alertThreshold: al.alertThreshold ?? d.alerts.alertThreshold,
    },
  };
}

export function normalizePerformanceConfig(
  value: unknown
): PerformanceTargetsConfig {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return mergeWithDefaults(value as Partial<PerformanceTargetsConfig>);
  }
  return { ...DEFAULT_PERFORMANCE_CONFIG };
}

// --- Super Admin §8.2 Data Lake ---
export interface DataLakeConfig {
  connectionString?: string;
  accountName?: string;
  containerName?: string;
  syncStrategy?: 'real-time' | 'batch' | 'hybrid';
  batchSyncFrequency?: 'hourly' | 'daily' | 'weekly';
  retryMaxRetries?: number;
  retryDelaySeconds?: number;
  compressionEnabled?: boolean;
  compressionFormat?: 'gzip' | 'snappy' | 'lz4';
}

export const DEFAULT_DATA_LAKE_CONFIG: DataLakeConfig = {
  syncStrategy: 'hybrid',
  batchSyncFrequency: 'daily',
  retryMaxRetries: 3,
  retryDelaySeconds: 60,
  compressionEnabled: true,
  compressionFormat: 'snappy',
};

export function normalizeDataLakeConfig(value: unknown): DataLakeConfig {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...DEFAULT_DATA_LAKE_CONFIG, ...(value as Partial<DataLakeConfig>) };
  }
  return { ...DEFAULT_DATA_LAKE_CONFIG };
}

// --- Super Admin §8.3 Logging ---
export interface LoggingConfig {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  retentionDays?: number;
  archiveAfterDays?: number;
  samplingEnabled?: boolean;
  sampleRate?: number;
}

export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  logLevel: 'info',
  retentionDays: 30,
  archiveAfterDays: 90,
  samplingEnabled: false,
  sampleRate: 100,
};

export function normalizeLoggingConfig(value: unknown): LoggingConfig {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...DEFAULT_LOGGING_CONFIG, ...(value as Partial<LoggingConfig>) };
  }
  return { ...DEFAULT_LOGGING_CONFIG };
}

// --- Super Admin §8.4 API Security ---
export interface ApiSecurityConfig {
  rateLimitEnabled?: boolean;
  requestsPerMinute?: number;
  perTenant?: boolean;
  perUser?: boolean;
  corsEnabled?: boolean;
  allowedOrigins?: string[];
  dataAtRestEncryption?: boolean;
  dataInTransitEncryption?: boolean;
}

export const DEFAULT_API_SECURITY_CONFIG: ApiSecurityConfig = {
  rateLimitEnabled: true,
  requestsPerMinute: 100,
  perTenant: true,
  perUser: false,
  corsEnabled: true,
  allowedOrigins: [],
  dataAtRestEncryption: true,
  dataInTransitEncryption: true,
};

export function normalizeApiSecurityConfig(value: unknown): ApiSecurityConfig {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...DEFAULT_API_SECURITY_CONFIG, ...(value as Partial<ApiSecurityConfig>) };
  }
  return { ...DEFAULT_API_SECURITY_CONFIG };
}

// --- Super Admin §9 Analytics & Reporting ---
export interface DashboardDefinition {
  id: string;
  name: string;
  dataSource?: string;
  refreshIntervalSeconds?: number;
  widgets?: string[];
  createdAt?: string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  dataSources?: string[];
  metrics?: string[];
  outputFormat?: 'PDF' | 'Excel' | 'CSV';
  schedule?: 'daily' | 'weekly' | 'monthly';
  recipients?: string[];
  createdAt?: string;
}

export interface ExportConfig {
  datasets?: string[];
  format?: 'CSV' | 'JSON' | 'Parquet';
  schedule?: 'daily' | 'weekly' | 'monthly';
  retentionDays?: number;
}

export interface AnalyticsConfig {
  dashboards: DashboardDefinition[];
  reports: ReportDefinition[];
  exportConfig: ExportConfig;
}

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  dashboards: [],
  reports: [],
  exportConfig: { datasets: [], format: 'CSV', schedule: 'daily', retentionDays: 90 },
};

export function normalizeAnalyticsConfig(value: unknown): AnalyticsConfig {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const v = value as Partial<AnalyticsConfig>;
    return {
      dashboards: Array.isArray(v.dashboards) ? v.dashboards : DEFAULT_ANALYTICS_CONFIG.dashboards,
      reports: Array.isArray(v.reports) ? v.reports : DEFAULT_ANALYTICS_CONFIG.reports,
      exportConfig: v.exportConfig && typeof v.exportConfig === 'object'
        ? { ...DEFAULT_ANALYTICS_CONFIG.exportConfig, ...v.exportConfig }
        : DEFAULT_ANALYTICS_CONFIG.exportConfig,
    };
  }
  return { ...DEFAULT_ANALYTICS_CONFIG };
}
