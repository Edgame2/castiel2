/**
 * Severity levels for trace messages
 */
export enum SeverityLevel {
  Verbose = 0,
  Information = 1,
  Warning = 2,
  Error = 3,
  Critical = 4,
}

/**
 * Monitoring provider configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  provider: 'application-insights' | 'datadog' | 'newrelic' | 'mock';
  instrumentationKey?: string;
  samplingRate?: number; // 0.0 to 1.0
  disableExceptionTracking?: boolean;
  disableRequestTracking?: boolean;
  enableAutoCollect?: boolean;
}

/**
 * Custom properties for tracking events
 */
export type CustomProperties = Record<string, string | number | boolean | undefined>;

/**
 * Monitoring provider interface
 * All monitoring providers must implement this interface
 */
export interface IMonitoringProvider {
  /**
   * Track a custom metric
   * @param name Metric name
   * @param value Metric value
   * @param properties Additional properties
   */
  trackMetric(name: string, value: number, properties?: CustomProperties): void;

  /**
   * Track a custom event
   * @param name Event name
   * @param properties Event properties
   */
  trackEvent(name: string, properties?: CustomProperties): void;

  /**
   * Track a trace/log message
   * @param message Log message
   * @param severity Severity level
   * @param properties Additional properties
   */
  trackTrace(message: string, severity: SeverityLevel, properties?: CustomProperties): void;

  /**
   * Track an exception/error
   * @param error Error object
   * @param properties Additional properties
   */
  trackException(error: Error, properties?: CustomProperties): void;

  /**
   * Track an HTTP request
   * @param name Request name
   * @param url Request URL
   * @param duration Request duration in milliseconds
   * @param responseCode HTTP response code
   * @param success Whether the request was successful
   * @param properties Additional properties
   */
  trackRequest(
    name: string,
    url: string,
    duration: number,
    responseCode: number,
    success: boolean,
    properties?: CustomProperties
  ): void;

  /**
   * Track a dependency call (external service, database, etc.)
   * @param name Dependency name
   * @param type Dependency type (HTTP, Redis, SQL, etc.)
   * @param target Dependency target (hostname, connection string, etc.)
   * @param duration Call duration in milliseconds
   * @param success Whether the call was successful
   * @param data Additional data
   * @param properties Additional properties
   */
  trackDependency(
    name: string,
    type: string,
    target: string,
    duration: number,
    success: boolean,
    data?: string,
    properties?: CustomProperties
  ): void;

  /**
   * Set the authenticated user context
   * @param userId User ID
   * @param accountId Account/Tenant ID
   */
  setAuthenticatedUserContext(userId: string, accountId?: string): void;

  /**
   * Clear the authenticated user context
   */
  clearAuthenticatedUserContext(): void;

  /**
   * Flush all pending telemetry
   * @returns Promise that resolves when flush is complete
   */
  flush(): Promise<void>;

  /**
   * Start a timed operation
   * @param name Operation name
   * @returns Function to end the timer and track the operation
   */
  startTimer(name: string): () => void;
}

/**
 * Monitoring metrics namespace
 */
export const MetricNames = {
  // API metrics
  API_RESPONSE_TIME: 'api.response_time',
  API_REQUEST_COUNT: 'api.request_count',
  API_ERROR_COUNT: 'api.error_count',
  
  // Cache metrics
  CACHE_HIT_RATE: 'cache.hit_rate',
  CACHE_MISS_COUNT: 'cache.miss_count',
  CACHE_HIT_COUNT: 'cache.hit_count',
  CACHE_OPERATION_DURATION: 'cache.operation_duration',
  
  // Database metrics
  DB_QUERY_DURATION: 'db.query_duration',
  DB_CONNECTION_COUNT: 'db.connection_count',
  DB_ERROR_COUNT: 'db.error_count',
  
  // Authentication metrics
  AUTH_LOGIN_SUCCESS: 'auth.login_success',
  AUTH_LOGIN_FAILURE: 'auth.login_failure',
  AUTH_TOKEN_VALIDATION_DURATION: 'auth.token_validation_duration',
  AUTH_ACTIVE_SESSIONS: 'auth.active_sessions',
  
  // Redis metrics
  REDIS_OPERATION_DURATION: 'redis.operation_duration',
  REDIS_CONNECTION_ERRORS: 'redis.connection_errors',
  
  // Queue metrics
  QUEUE_DEPTH: 'queue.depth',
  QUEUE_WAITING: 'queue.waiting',
  QUEUE_ACTIVE: 'queue.active',
  QUEUE_COMPLETED: 'queue.completed',
  QUEUE_FAILED: 'queue.failed',
  QUEUE_DELAYED: 'queue.delayed',
  QUEUE_PROCESSING_TIME_P50: 'queue.processing_time_p50',
  QUEUE_PROCESSING_TIME_P95: 'queue.processing_time_p95',
  QUEUE_PROCESSING_TIME_P99: 'queue.processing_time_p99',
  QUEUE_FAILED_JOB_RATE: 'queue.failed_job_rate',
  QUEUE_THROUGHPUT: 'queue.throughput',
  QUEUE_JOB_DURATION: 'queue.job_duration',
  
  // Worker metrics
  WORKER_ACTIVE_JOBS: 'worker.active_jobs',
  WORKER_PROCESSING_TIME: 'worker.processing_time',
  WORKER_ERROR_RATE: 'worker.error_rate',
  WORKER_COMPLETED_JOBS: 'worker.completed_jobs',
  WORKER_FAILED_JOBS: 'worker.failed_jobs',
  WORKER_STALLED_JOBS: 'worker.stalled_jobs',
  WORKER_THROUGHPUT: 'worker.throughput',
  WORKER_RATE_LIMITER_DELAYED: 'worker.rate_limiter_delayed',
  
  // Business metrics
  TENANT_USAGE: 'tenant.usage',
  USER_ACTIVITY: 'user.activity',
  SHARD_OPERATIONS: 'shard.operations',
} as const;

/**
 * Monitoring event names namespace
 */
export const EventNames = {
  // User events
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  
  // Shard events
  SHARD_CREATED: 'shard.created',
  SHARD_UPDATED: 'shard.updated',
  SHARD_DELETED: 'shard.deleted',
  SHARD_SHARED: 'shard.shared',
  
  // Cache events
  CACHE_INVALIDATED: 'cache.invalidated',
  CACHE_WARMED: 'cache.warmed',
  
  // System events
  SERVICE_STARTED: 'service.started',
  SERVICE_STOPPED: 'service.stopped',
  HEALTH_CHECK_FAILED: 'health_check.failed',
} as const;

/**
 * Dependency types
 */
export const DependencyTypes = {
  HTTP: 'HTTP',
  REDIS: 'Redis',
  COSMOSDB: 'Azure Cosmos DB',
  SQL: 'SQL',
  AZURE_AD: 'Azure AD',
  SENDGRID: 'SendGrid',
} as const;
