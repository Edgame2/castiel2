# Alert Configuration Guide

## Overview

This document describes the alert configuration for the Castiel platform, including critical alerts, warning alerts, and notification channels.

## Alert Rules

All alert rules are defined in `alert-rules.json`. The configuration includes:

- **Alert definitions**: Name, description, condition, severity, notification channels, runbook
- **Notification channels**: Email, Slack, PagerDuty configuration

## Critical Alerts

### 1. High Sync Failure Rate
- **Condition**: `rate(sync_jobs_failed_total[5m]) / rate(sync_jobs_total[5m]) * 100 > 10`
- **Severity**: Critical
- **Notification**: Email + Slack + PagerDuty
- **Runbook**: Check adapter logs, external API status, authentication tokens
- **Action**: Investigate failed sync jobs, check integration adapter health

### 2. Service Bus Queue Backlog
- **Condition**: `service_bus_queue_depth > 100`
- **Severity**: Warning
- **Notification**: Slack
- **Runbook**: Check worker processing rate, increase worker instances if needed
- **Action**: Scale Azure Functions workers or investigate processing bottlenecks

### 3. Dead Letter Queue Accumulation
- **Condition**: `service_bus_dlq_depth > 0`
- **Severity**: Warning
- **Notification**: Slack
- **Runbook**: Investigate failed messages, check error logs, reprocess if needed
- **Action**: Review DLQ messages, fix root cause, reprocess messages

### 4. High API Error Rate
- **Condition**: `rate(api_requests_total{status=~"5.."}[5m]) / rate(api_requests_total[5m]) * 100 > 5`
- **Severity**: Critical
- **Notification**: Email + Slack
- **Runbook**: Check application logs, database connectivity, external service status
- **Action**: Investigate API errors, check service health

### 5. Critical API Response Times
- **Condition**: `histogram_quantile(0.99, rate(api_response_time_bucket[5m])) > 1000`
- **Severity**: Critical
- **Notification**: Email + Slack + PagerDuty
- **Runbook**: Immediate investigation required. Check for database locks, slow queries, or service degradation
- **Action**: Investigate performance issues, check database and cache performance

### 6. Redis Connection Failures
- **Condition**: `rate(redis_connection_failures_total[5m]) > 0`
- **Severity**: Critical
- **Notification**: Email + Slack
- **Runbook**: Check Redis service status, network connectivity, and authentication
- **Action**: Verify Redis connectivity, check firewall rules

### 7. Database Connection Failures
- **Condition**: `rate(cosmos_connection_failures_total[5m]) > 0`
- **Severity**: Critical
- **Notification**: Email + Slack + PagerDuty
- **Runbook**: Check Cosmos DB service status, connection strings, and firewall rules
- **Action**: Verify Cosmos DB connectivity, check connection strings

## Warning Alerts

### 1. Slow Sync Processing
- **Condition**: `histogram_quantile(0.95, rate(sync_latency_ms_bucket[5m])) > 300000`
- **Severity**: Warning
- **Notification**: Slack
- **Runbook**: Check adapter performance, external API latency
- **Action**: Review sync performance, optimize adapter queries

### 2. High Rate Limit Hits
- **Condition**: `rate(adapter_rate_limit_hits_total[5m]) > 10`
- **Severity**: Warning
- **Notification**: Slack
- **Runbook**: Review rate limit configuration, implement backoff
- **Action**: Adjust rate limiting, implement exponential backoff

### 3. Slow API Response Times
- **Condition**: `histogram_quantile(0.95, rate(api_response_time_bucket[5m])) > 500`
- **Severity**: Warning
- **Notification**: Slack
- **Runbook**: Check database query performance, cache hit rates, and external API latency
- **Action**: Optimize slow queries, improve cache hit rate

### 4. High Embedding Failure Rate
- **Condition**: `rate(embedding_jobs_failed_total[5m]) / rate(embedding_jobs_total[5m]) * 100 > 5`
- **Severity**: Warning
- **Notification**: Slack
- **Runbook**: Check Azure OpenAI service status, rate limits, and embedding service logs
- **Action**: Check Azure OpenAI service health, review rate limits

### 5. Slow Vector Search
- **Condition**: `histogram_quantile(0.95, rate(vector_search_duration_seconds_bucket[5m])) > 2`
- **Severity**: Warning
- **Notification**: Slack
- **Runbook**: Check vector index configuration, cache hit rate, and query complexity
- **Action**: Optimize vector search queries, review index configuration

## Info Alerts

### 1. Low Cache Hit Rate
- **Condition**: `rate(redis_cache_hits_total[5m]) / (rate(redis_cache_hits_total[5m]) + rate(redis_cache_misses_total[5m])) * 100 < 80`
- **Severity**: Info
- **Notification**: Slack
- **Runbook**: Review cache TTL settings and warming strategies
- **Action**: Review cache configuration, adjust TTL values

### 2. High Cost per Tenant
- **Condition**: `cost_per_tenant > 100`
- **Severity**: Info
- **Notification**: Email
- **Runbook**: Review tenant usage patterns and optimize resource consumption
- **Action**: Review tenant usage, optimize resource allocation

## Notification Channels

### Email
- **Type**: Email
- **Recipients**: ops@castiel.com
- **Enabled**: Yes
- **Configuration**: Set via environment variable or configuration file

### Slack
- **Type**: Slack
- **Webhook URL**: Set via `SLACK_WEBHOOK_URL` environment variable
- **Channel**: #alerts
- **Enabled**: Yes
- **Configuration**: Requires Slack webhook URL

### PagerDuty
- **Type**: PagerDuty
- **Integration Key**: Set via `PAGERDUTY_INTEGRATION_KEY` environment variable
- **Enabled**: Yes
- **Configuration**: Requires PagerDuty integration key

## Verification

Run the verification script to check alert configuration:

```bash
pnpm --filter api verify:alerts
```

Or directly:

```bash
tsx apps/api/src/scripts/verify-alert-configuration.ts
```

The script verifies:
- All required alerts are defined
- Alert conditions are valid
- Notification channels are configured
- Runbooks are documented

## Deployment

### Azure Application Insights

1. Import alert rules from `alert-rules.json`
2. Configure notification channels (email, Slack, PagerDuty)
3. Set up action groups for each notification channel
4. Create alert rules using the conditions from `alert-rules.json`
5. Test alert delivery

### Grafana

1. Import alert rules to Grafana
2. Configure notification channels in Grafana
3. Create alert rules using Grafana's alerting UI
4. Test alert delivery

### Manual Configuration

For manual configuration, use the alert conditions and settings from `alert-rules.json`:

1. Create alert rules in your monitoring platform
2. Use the conditions from `alert-rules.json`
3. Configure notification channels
4. Set up runbooks for each alert
5. Test alert delivery

## Testing

### Test Alert Delivery

1. **Email**: Send test email to verify recipients
2. **Slack**: Send test message to #alerts channel
3. **PagerDuty**: Trigger test incident

### Test Alert Conditions

1. **High Sync Failure Rate**: Temporarily increase failure rate to trigger alert
2. **Service Bus Queue Backlog**: Add messages to queue to exceed threshold
3. **Dead Letter Queue**: Add messages to DLQ to trigger alert

## Maintenance

### Regular Review

- Review alert thresholds monthly
- Update runbooks as system evolves
- Test alert delivery quarterly
- Review and adjust notification channels as needed

### Alert Tuning

- Adjust thresholds based on historical data
- Remove false positives
- Add new alerts as needed
- Consolidate similar alerts

## Troubleshooting

### Alerts Not Firing

1. Check alert conditions are correct
2. Verify metrics are being collected
3. Check notification channel configuration
4. Verify alert rules are enabled

### Too Many Alerts

1. Review alert thresholds
2. Consolidate similar alerts
3. Adjust notification channels
4. Implement alert grouping

### Missing Alerts

1. Verify alert rules are configured
2. Check notification channels are enabled
3. Review alert conditions
4. Test alert delivery

## References

- [INTEGRATION_MONITORING.md](./INTEGRATION_MONITORING.md) - Integration monitoring documentation
- [alert-rules.json](./alert-rules.json) - Alert rules configuration
- [DASHBOARD_DEPLOYMENT.md](./DASHBOARD_DEPLOYMENT.md) - Dashboard deployment guide

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - Alert configuration documented but may reference deprecated services

#### Implemented Features (✅)

- ✅ Alert rules defined
- ✅ Critical alerts configured
- ✅ Warning alerts configured
- ✅ Notification channels documented

#### Known Limitations

- ⚠️ **Service Bus References** - Service Bus has been removed
  - **Code Reference:**
    - Alert rules reference Service Bus queues
  - **Recommendation:**
    1. Update alert rules for BullMQ/Redis
    2. Remove Service Bus references
    3. Document queue monitoring

- ⚠️ **Alert Implementation** - Alerts may not be fully implemented
  - **Recommendation:**
    1. Verify alert implementation
    2. Test alert delivery
    3. Update alert configuration

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Monitoring Documentation](./INTEGRATION_MONITORING.md) - Monitoring setup
- [Application Insights Config](./APPLICATION_INSIGHTS_CONFIG.md) - Application Insights setup







