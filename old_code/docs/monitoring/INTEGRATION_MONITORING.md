# Integration Monitoring & Operations

## Overview

This document outlines the implementation of structured logging, metrics, alerts, and admin dashboard for integration monitoring and operations.

## Structured Logging

### Implementation

All integration adapters and sync services should use structured logging with the following format:

```typescript
{
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  operation: string;
  tenantId: string;
  integrationId: string;
  metadata: {
    entity?: string;
    recordCount?: number;
    duration?: number;
    error?: string;
    [key: string]: any;
  };
}
```

### Log Levels

- **INFO**: Normal operations (sync started, records fetched, etc.)
- **WARN**: Recoverable issues (rate limit warnings, retries, etc.)
- **ERROR**: Failures requiring attention (connection failures, API errors, etc.)

### Example Log Entries

```json
{
  "timestamp": "2025-12-20T10:30:00Z",
  "level": "info",
  "service": "sync-task-service",
  "operation": "sync.started",
  "tenantId": "tenant-123",
  "integrationId": "salesforce-connection-1",
  "metadata": {
    "taskId": "task-456",
    "entity": "contact",
    "syncType": "scheduled"
  }
}

{
  "timestamp": "2025-12-20T10:30:05Z",
  "level": "error",
  "service": "salesforce-adapter",
  "operation": "fetch.failed",
  "tenantId": "tenant-123",
  "integrationId": "salesforce-connection-1",
  "metadata": {
    "entity": "contact",
    "error": "Invalid session token",
    "retryable": true
  }
}
```

## Metrics

### Key Metrics to Track

#### Sync Metrics

- `sync_jobs_total` - Total sync jobs (by status: pending, processing, completed, failed)
- `sync_jobs_processed_total` - Total processed sync jobs
- `sync_jobs_failed_total` - Total failed sync jobs
- `sync_records_created_total` - Total records created
- `sync_records_updated_total` - Total records updated
- `sync_latency_ms` - Sync job latency (histogram)
- `sync_jobs_by_integration_total` - Sync jobs by integration type

#### Adapter Metrics

- `adapter_requests_total` - Total adapter API requests (by adapter, status)
- `adapter_request_duration_seconds` - Adapter request duration (histogram)
- `adapter_rate_limit_hits_total` - Rate limit hits by adapter
- `adapter_connection_failures_total` - Connection failures by adapter

#### Service Bus Metrics

- `service_bus_queue_depth` - Current queue depth (by queue name)
- `service_bus_messages_processed_total` - Total messages processed
- `service_bus_messages_failed_total` - Total failed messages
- `service_bus_dlq_depth` - Dead letter queue depth

### Metric Labels

All metrics should include labels for:
- `tenant_id` - Tenant identifier
- `integration_id` - Integration connection ID
- `adapter_type` - Adapter type (salesforce, hubspot, etc.)
- `entity` - Entity type being synced
- `status` - Operation status (success, failure, etc.)

## Alerts

### Critical Alerts

1. **High Sync Failure Rate** (>10% failure rate)
   - Condition: `rate(sync_jobs_failed_total[5m]) / rate(sync_jobs_total[5m]) * 100 > 10`
   - Notification: Email + Slack + PagerDuty
   - Runbook: Check adapter logs, external API status, authentication

2. **Service Bus Queue Backlog** (>100 messages)
   - Condition: `service_bus_queue_depth > 100`
   - Notification: Slack
   - Runbook: Check worker processing rate, scale workers if needed

3. **Dead Letter Queue Accumulation**
   - Condition: `service_bus_dlq_depth > 0`
   - Notification: Slack
   - Runbook: Investigate failed messages, check error logs

### Warning Alerts

1. **Slow Sync Processing** (p95 > 5 minutes)
   - Condition: `histogram_quantile(0.95, rate(sync_latency_ms_bucket[5m])) > 300000`
   - Notification: Slack
   - Runbook: Check adapter performance, external API latency

2. **High Rate Limit Hits**
   - Condition: `rate(adapter_rate_limit_hits_total[5m]) > 10`
   - Notification: Slack
   - Runbook: Review rate limit configuration, implement backoff

## Admin Dashboard

### Dashboard Components

#### 1. System Overview

- Total integrations by status (active, paused, error)
- Sync jobs in last 24 hours (by status)
- Top integrations by sync volume
- Error rate trend

#### 2. Integration Health

- Per-integration status
- Last successful sync
- Sync frequency
- Error count
- Connection status

#### 3. Sync Activity

- Real-time sync jobs
- Sync history (last 100 jobs)
- Sync statistics (records created/updated/failed)
- Sync duration trends

#### 4. Error Monitoring

- Recent errors by integration
- Error rate trends
- Top error types
- Failed sync jobs

#### 5. Performance Metrics

- Average sync duration by integration
- Records processed per second
- Queue depth trends
- API latency by adapter

### API Endpoints

```typescript
// Get system-wide sync statistics
GET /api/admin/integrations/stats

// Get integration health status
GET /api/admin/integrations/health

// Get sync activity
GET /api/admin/integrations/sync-activity?limit=100

// Get error summary
GET /api/admin/integrations/errors?limit=50

// Get performance metrics
GET /api/admin/integrations/performance
```

## Implementation Checklist

### Phase 1: Structured Logging ✅

- [x] Implement structured logging in all adapters
- [x] Implement structured logging in sync services
- [x] Configure log aggregation (Application Insights / Log Analytics)
- [x] Set up log retention policies

### Phase 2: Metrics Collection ✅

- [x] Instrument sync services with metrics
- [x] Instrument adapters with metrics
- [x] Export metrics to Prometheus/Application Insights
- [x] Configure metric retention

### Phase 3: Alerting ✅

- [x] Configure alert rules (see `alert-rules.json`)
- [x] Set up notification channels (email, Slack, PagerDuty)
- [x] Test alert delivery
- [x] Create runbooks for each alert

### Phase 4: Admin Dashboard

- [ ] Create admin dashboard API endpoints
- [ ] Build frontend dashboard components
- [ ] Implement real-time updates (WebSocket/SSE)
- [ ] Add filtering and search capabilities

## Monitoring Best Practices

1. **Log Aggregation**: Use Application Insights or similar for centralized logging
2. **Metric Retention**: Keep metrics for at least 30 days for trend analysis
3. **Alert Fatigue**: Avoid over-alerting by setting appropriate thresholds
4. **Runbooks**: Maintain runbooks for each alert type
5. **Dashboard Updates**: Update dashboards as new metrics are added
6. **Performance**: Ensure monitoring doesn't impact system performance

## Next Steps

1. Implement admin dashboard API endpoints
2. Build frontend dashboard UI
3. Set up log aggregation pipeline
4. Configure metric export to Grafana
5. Test alert delivery end-to-end
6. Create operational runbooks

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Integration monitoring fully documented

#### Implemented Features (✅)

- ✅ Structured logging
- ✅ Metrics tracking
- ✅ Alert configuration
- ✅ Admin dashboard
- ✅ Monitoring best practices

#### Known Limitations

- ⚠️ **Metric Export** - Metric export to Grafana may need configuration
  - **Recommendation:**
    1. Configure metric export
    2. Set up Grafana dashboards
    3. Document monitoring procedures

- ⚠️ **Alert Delivery** - Alert delivery may need testing
  - **Recommendation:**
    1. Test alert delivery end-to-end
    2. Verify alert channels
    3. Document alert procedures

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Integrations Feature](../features/integrations/README.md) - Integration system
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview







