# Application Log Monitoring Events

This document describes events published and consumed by the Application Log Monitoring service.

## Event Naming Convention

Events follow the pattern: `monitoring.{resource}.{action}`

## Published Events

### monitoring.log.created

Published when a log entry is successfully created.

**Event Type:** `monitoring.log.created`

**Payload:**
```typescript
{
  id: string;                    // Event ID
  type: 'monitoring.log.created';
  version: '1.0.0';
  timestamp: string;             // ISO 8601
  tenantId: string;              // Tenant ID
  source: 'application-log-monitoring';
  data: {
    logId: string;               // Log entry ID
    level: string;               // Log level
    service: string;              // Service name
    message: string;              // Log message
    tenantId: string;            // Tenant ID
    userId?: string;             // User ID (if available)
    correlationId?: string;      // Correlation ID
    timestamp: string;           // ISO 8601
  };
}
```

### monitoring.metric.recorded

Published when a metric is successfully recorded.

**Event Type:** `monitoring.metric.recorded`

**Payload:**
```typescript
{
  id: string;
  type: 'monitoring.metric.recorded';
  version: '1.0.0';
  timestamp: string;
  tenantId: string;
  source: 'application-log-monitoring';
  data: {
    metricId: string;            // Metric ID
    name: string;                // Metric name
    value: number;                // Metric value
    unit?: string;               // Unit (e.g., 'milliseconds')
    service: string;              // Service name
    tenantId: string;            // Tenant ID
    timestamp: string;           // ISO 8601
  };
}
```

### monitoring.error.reported

Published when an error is successfully reported.

**Event Type:** `monitoring.error.reported`

**Payload:**
```typescript
{
  id: string;
  type: 'monitoring.error.reported';
  version: '1.0.0';
  timestamp: string;
  tenantId: string;
  source: 'application-log-monitoring';
  data: {
    errorId: string;             // Error ID
    errorType: string;           // Error type
    message: string;             // Error message
    service: string;             // Service name
    tenantId: string;            // Tenant ID
    userId?: string;             // User ID (if available)
    correlationId?: string;     // Correlation ID
    timestamp: string;           // ISO 8601
  };
}
```

### monitoring.provider.status.changed

Published when a monitoring provider status changes (e.g., becomes unhealthy).

**Event Type:** `monitoring.provider.status.changed`

**Payload:**
```typescript
{
  id: string;
  type: 'monitoring.provider.status.changed';
  version: '1.0.0';
  timestamp: string;
  tenantId?: string;             // May be null for system events
  source: 'application-log-monitoring';
  data: {
    provider: string;            // Provider name (e.g., 'application-insights')
    previousStatus: string;      // Previous status
    currentStatus: string;       // Current status
    reason?: string;             // Reason for status change
    timestamp: string;           // ISO 8601
  };
}
```

## Consumed Events

The Application Log Monitoring service does not currently consume events from other services. It is a write-only service that receives logs, metrics, and errors via its REST API.

## Event Routing

All events are published to the RabbitMQ exchange: `coder_events`

**Routing Keys:**
- `monitoring.log.created`
- `monitoring.metric.recorded`
- `monitoring.error.reported`
- `monitoring.provider.status.changed`

## Event Consumers

Potential consumers of monitoring events:

- **Alert Service**: Subscribe to error events to trigger alerts
- **Analytics Service**: Aggregate metrics for reporting
- **Dashboard Service**: Real-time updates for dashboards
- **Audit Service**: Track monitoring operations for compliance
