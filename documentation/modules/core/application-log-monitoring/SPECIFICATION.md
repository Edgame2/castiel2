# Application Log Monitoring Module Specification

**Version:** 1.0.0  
**Last Updated:** 2026-01-23  
**Status:** Draft  
**Module Category:** Core / Shared Service

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Provider Abstraction](#3-provider-abstraction)
4. [Data Models](#4-data-models)
5. [API Specification](#5-api-specification)
6. [Configuration](#6-configuration)
7. [Integration Patterns](#7-integration-patterns)
8. [Security & Compliance](#8-security--compliance)

---

## 1. Overview

### 1.1 Purpose

The Application Log Monitoring module provides a **unified abstraction layer** for application log monitoring, enabling all Castiel containers to send logs, metrics, errors, and traces to monitoring providers (Application Insights, Sentry) through a consistent interface.

### 1.2 Key Benefits

- **Provider Agnostic**: Switch between Application Insights and Sentry without code changes
- **Centralized Management**: Single service manages all monitoring configuration
- **Consistent Interface**: All containers use the same API regardless of provider
- **Multi-Provider Support**: Route logs to multiple providers simultaneously
- **Tenant Isolation**: Built-in tenant context for multi-tenant environments

### 1.3 Design Principles

1. **Abstraction First**: Provider-specific details hidden behind unified interface
2. **Performance**: Async processing, batching, and buffering for high throughput
3. **Reliability**: Automatic retries, fallbacks, and error handling
4. **Extensibility**: Easy to add new providers (Datadog, New Relic, etc.)
5. **Tenant Awareness**: All operations include tenant context

---

## 2. Architecture

### 2.1 Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Application Log Monitoring Service              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  API Layer (Fastify)                   │  │
│  │  • /api/v1/monitoring/logs                            │  │
│  │  • /api/v1/monitoring/metrics                         │  │
│  │  • /api/v1/monitoring/errors                          │  │
│  │  • /api/v1/monitoring/traces                           │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                        │                                      │
│  ┌─────────────────────▼─────────────────────────────────┐  │
│  │            Request Handler & Validator                  │  │
│  │  • Validate requests                                   │  │
│  │  • Extract tenant/user context                         │  │
│  │  • Enrich with metadata                                │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                        │                                      │
│  ┌─────────────────────▼─────────────────────────────────┐  │
│  │              Provider Abstraction Layer                │  │
│  │  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │   Provider   │  │   Provider   │                 │  │
│  │  │   Factory    │  │   Router     │                 │  │
│  │  └──────┬───────┘  └──────┬───────┘                 │  │
│  │         │                 │                          │  │
│  │  ┌──────▼───────┐  ┌──────▼───────┐                 │  │
│  │  │ Application  │  │    Sentry     │                 │  │
│  │  │   Insights   │  │   Provider    │                 │  │
│  │  │   Provider   │  │               │                 │  │
│  │  └─────────────┘  └───────────────┘                 │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                        │                                      │
│  ┌─────────────────────▼─────────────────────────────────┐  │
│  │              Buffer & Batch Manager                    │  │
│  │  • In-memory buffer                                    │  │
│  │  • Batch aggregation                                   │  │
│  │  • Async processing                                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **Container sends log/metric/error** → Monitoring Service API
2. **API validates and enriches** → Adds tenantId, userId, correlationId
3. **Provider abstraction routes** → To configured provider(s)
4. **Provider sends to backend** → Application Insights or Sentry
5. **Response returned** → Success/failure status

---

## 3. Provider Abstraction

### 3.1 Provider Interface

```typescript
interface MonitoringProvider {
  // Initialize provider with configuration
  initialize(config: ProviderConfig): Promise<void>;
  
  // Log operations
  log(entry: LogEntry): Promise<void>;
  logBatch(entries: LogEntry[]): Promise<void>;
  
  // Metric operations
  trackMetric(metric: Metric): Promise<void>;
  trackMetricBatch(metrics: Metric[]): Promise<void>;
  
  // Error operations
  trackError(error: Error, context?: ErrorContext): Promise<void>;
  
  // Trace operations
  startTrace(traceId: string, name: string): Promise<TraceSpan>;
  endTrace(span: TraceSpan): Promise<void>;
  
  // Health check
  healthCheck(): Promise<ProviderHealth>;
}
```

### 3.2 Provider Factory

```typescript
class ProviderFactory {
  createProvider(type: 'application-insights' | 'sentry'): MonitoringProvider {
    switch (type) {
      case 'application-insights':
        return new ApplicationInsightsProvider();
      case 'sentry':
        return new SentryProvider();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}
```

### 3.3 Provider Router

```typescript
class ProviderRouter {
  private providers: MonitoringProvider[];
  
  constructor(config: MonitoringConfig) {
    this.providers = [];
    
    if (config.application_insights?.enabled) {
      this.providers.push(
        this.factory.createProvider('application-insights')
      );
    }
    
    if (config.sentry?.enabled) {
      this.providers.push(
        this.factory.createProvider('sentry')
      );
    }
  }
  
  async log(entry: LogEntry): Promise<void> {
    // Send to all enabled providers
    await Promise.allSettled(
      this.providers.map(p => p.log(entry))
    );
  }
}
```

---

## 4. Data Models

### 4.1 Log Entry

```typescript
interface LogEntry {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service: string;              // Service name (e.g., 'ai-insights')
  tenantId?: string;            // Tenant ID (required for multi-tenant)
  userId?: string;              // User ID (if available)
  correlationId?: string;        // Request correlation ID
  timestamp?: string;            // ISO 8601 timestamp
  properties?: Record<string, any>;  // Additional context
  exception?: {
    type: string;
    message: string;
    stack?: string;
  };
}
```

### 4.2 Metric

```typescript
interface Metric {
  name: string;                 // Metric name (e.g., 'api_request_duration')
  value: number;                 // Metric value
  unit?: string;                 // Unit (e.g., 'milliseconds', 'count')
  service: string;               // Service name
  tenantId?: string;             // Tenant ID
  timestamp?: string;            // ISO 8601 timestamp
  properties?: Record<string, any>;  // Dimensions/tags
}
```

### 4.3 Error Context

```typescript
interface ErrorContext {
  service: string;
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
  };
  custom?: Record<string, any>;
}
```

### 4.4 Trace Span

```typescript
interface TraceSpan {
  traceId: string;               // Trace ID (correlation ID)
  spanId: string;                // Unique span ID
  parentSpanId?: string;         // Parent span ID (for nested spans)
  name: string;                   // Operation name
  service: string;                // Service name
  startTime: number;              // Start timestamp (Unix ms)
  endTime?: number;               // End timestamp (Unix ms)
  duration?: number;              // Duration in milliseconds
  status: 'ok' | 'error';
  tags?: Record<string, string>;
  logs?: Array<{
    timestamp: number;
    fields: Record<string, any>;
  }>;
}
```

---

## 5. API Specification

### 5.1 Log Endpoints

#### POST /api/v1/monitoring/logs

Send a single log entry.

**Request Body:**
```json
{
  "level": "info",
  "message": "Processing insight request",
  "service": "ai-insights",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "correlationId": "corr-789",
  "properties": {
    "insightType": "risk-analysis",
    "conversationId": "conv-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "logId": "log-abc123",
  "timestamp": "2026-01-23T10:30:00Z"
}
```

#### POST /api/v1/monitoring/logs/batch

Send multiple log entries in a single request.

**Request Body:**
```json
{
  "entries": [
    {
      "level": "info",
      "message": "Log entry 1",
      "service": "ai-insights"
    },
    {
      "level": "error",
      "message": "Log entry 2",
      "service": "ai-insights"
    }
  ]
}
```

#### GET /api/v1/monitoring/logs

Query logs with filters.

**Query Parameters:**
- `service` - Filter by service name
- `tenantId` - Filter by tenant ID
- `level` - Filter by log level
- `startTime` - Start timestamp (ISO 8601)
- `endTime` - End timestamp (ISO 8601)
- `limit` - Maximum number of results (default: 100)

**Response:**
```json
{
  "logs": [
    {
      "id": "log-abc123",
      "level": "info",
      "message": "Processing insight request",
      "service": "ai-insights",
      "tenantId": "tenant-123",
      "timestamp": "2026-01-23T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 100
}
```

### 5.2 Metric Endpoints

#### POST /api/v1/monitoring/metrics

Record a custom metric.

**Request Body:**
```json
{
  "name": "insight_generation_time",
  "value": 245,
  "unit": "milliseconds",
  "service": "ai-insights",
  "tenantId": "tenant-123",
  "properties": {
    "insightType": "risk-analysis",
    "model": "gpt-4"
  }
}
```

### 5.3 Error Endpoints

#### POST /api/v1/monitoring/errors

Report an error.

**Request Body:**
```json
{
  "error": {
    "type": "ValidationError",
    "message": "Invalid input parameter",
    "stack": "Error: Invalid input parameter\n    at ..."
  },
  "service": "ai-insights",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "correlationId": "corr-789",
  "context": {
    "request": {
      "method": "POST",
      "url": "/api/v1/insights"
    }
  }
}
```

### 5.4 Trace Endpoints

#### POST /api/v1/monitoring/traces

Send a trace span.

**Request Body:**
```json
{
  "traceId": "trace-abc123",
  "spanId": "span-xyz789",
  "parentSpanId": "span-parent",
  "name": "generate-insight",
  "service": "ai-insights",
  "startTime": 1706011200000,
  "endTime": 1706011200245,
  "duration": 245,
  "status": "ok",
  "tags": {
    "insightType": "risk-analysis"
  }
}
```

---

## 6. Configuration

### 6.1 Service Configuration Schema

```yaml
module:
  name: application-log-monitoring
  version: 1.0.0

server:
  port: ${PORT:-3015}
  host: ${HOST:-0.0.0.0}

monitoring:
  provider: ${MONITORING_PROVIDER:-application-insights}  # 'application-insights' | 'sentry' | 'both'
  
  application_insights:
    enabled: ${APPINSIGHTS_ENABLED:-true}
    connection_string: ${APPLICATIONINSIGHTS_CONNECTION_STRING}
    instrumentation_key: ${APPINSIGHTS_INSTRUMENTATION_KEY}
    sampling_rate: ${APPINSIGHTS_SAMPLING_RATE:-1.0}  # 0.0 to 1.0
    enable_live_metrics: ${APPINSIGHTS_LIVE_METRICS:-true}
    enable_auto_collect:
      requests: true
      performance: true
      exceptions: true
      dependencies: true
  
  sentry:
    enabled: ${SENTRY_ENABLED:-false}
    dsn: ${SENTRY_DSN}
    environment: ${SENTRY_ENVIRONMENT:-production}
    traces_sample_rate: ${SENTRY_TRACES_SAMPLE_RATE:-1.0}  # 0.0 to 1.0
    profiles_sample_rate: ${SENTRY_PROFILES_SAMPLE_RATE:-1.0}  # 0.0 to 1.0
    before_send: null  # Optional function reference
  
  buffer:
    max_size: ${LOG_BUFFER_MAX_SIZE:-1000}  # Max entries in buffer
    flush_interval: ${LOG_BUFFER_FLUSH_INTERVAL:-5000}  # ms
    batch_size: ${LOG_BUFFER_BATCH_SIZE:-100}  # Entries per batch
  
  retention:
    application_insights:
      days: ${APPINSIGHTS_RETENTION_DAYS:-90}
    sentry:
      days: ${SENTRY_RETENTION_DAYS:-90}
  
  rate_limit:
    enabled: ${RATE_LIMIT_ENABLED:-true}
    max_requests: ${RATE_LIMIT_MAX:-1000}  # Per minute
    window_ms: ${RATE_LIMIT_WINDOW:-60000}
```

---

## 7. Integration Patterns

### 7.1 Client Library Pattern

Containers use the shared client library:

```typescript
// @coder/shared/monitoring
export class MonitoringClient {
  private static instance: MonitoringClient;
  private serviceUrl: string;
  private serviceName: string;
  
  static initialize(config: ClientConfig): MonitoringClient {
    this.instance = new MonitoringClient(config);
    return this.instance;
  }
  
  async log(level: LogLevel, message: string, context?: LogContext): Promise<void> {
    await fetch(`${this.serviceUrl}/api/v1/monitoring/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        service: this.serviceName,
        ...context,
      }),
    });
  }
  
  // ... other methods
}
```

### 7.2 Middleware Pattern

Automatic logging via Fastify middleware:

```typescript
fastify.addHook('onRequest', async (request, reply) => {
  const correlationId = request.headers['x-correlation-id'] || randomUUID();
  request.correlationId = correlationId;
  
  monitoring.log('info', `${request.method} ${request.url}`, {
    correlationId,
    tenantId: request.headers['x-tenant-id'],
  });
});

fastify.addHook('onResponse', async (request, reply) => {
  monitoring.trackMetric('http_request_duration', reply.getResponseTime(), {
    method: request.method,
    route: request.url,
    statusCode: reply.statusCode,
  });
});
```

### 7.3 Error Handler Pattern

Automatic error tracking:

```typescript
fastify.setErrorHandler(async (error, request, reply) => {
  monitoring.trackError(error, {
    service: 'ai-insights',
    tenantId: request.headers['x-tenant-id'],
    correlationId: request.correlationId,
    request: {
      method: request.method,
      url: request.url,
    },
  });
  
  reply.status(500).send({ error: 'Internal server error' });
});
```

---

## 8. Security & Compliance

### 8.1 Authentication

- Service-to-service JWT authentication required
- JWT tokens validated using shared secret
- Unauthenticated requests rejected

### 8.2 Tenant Isolation

- All logs must include tenantId
- Queries filtered by tenantId automatically
- Cross-tenant access prevented

### 8.3 Data Masking

- Sensitive fields automatically masked:
  - Passwords
  - API keys
  - Tokens
  - Credit card numbers
  - SSNs

### 8.4 Rate Limiting

- Per-service rate limits
- Per-tenant rate limits
- Burst protection

### 8.5 Audit Logging

- All monitoring operations logged
- Access to monitoring data audited
- Provider configuration changes tracked

---

## Appendix A: Provider Comparison

| Feature | Application Insights | Sentry |
|---------|---------------------|--------|
| Log Management | ✅ | ✅ |
| Metrics | ✅ | ✅ |
| Error Tracking | ✅ | ✅ |
| Distributed Tracing | ✅ | ✅ |
| Performance Monitoring | ✅ | ✅ |
| Real-time Alerts | ✅ | ✅ |
| Custom Dashboards | ✅ | ✅ |
| Azure Integration | ✅ | ❌ |
| Open Source Option | ❌ | ✅ |
| Pricing Model | Pay-as-you-go | Tiered |

---

## Appendix B: Future Providers

The abstraction layer is designed to easily add:

- **Datadog**: Full observability platform
- **New Relic**: APM and monitoring
- **Elastic Stack**: Self-hosted logging
- **Grafana Loki**: Log aggregation
- **Prometheus**: Metrics collection
