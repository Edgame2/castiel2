# CAIS Monitoring Guide

**Date:** January 2025  
**Status:** 📋 **MONITORING SETUP GUIDE**  
**Version:** 1.0

---

## Overview

This guide provides comprehensive monitoring setup and best practices for the CAIS adaptive learning system. Proper monitoring is critical for ensuring system health, learning effectiveness, and early detection of issues.

---

## Monitoring Architecture

### Application Insights Integration

All adaptive learning services use Application Insights for monitoring:

```typescript
// Services track:
monitoring.trackEvent('adaptive_learning.weight_updated', { ... });
monitoring.trackException(error, { operation: '...' });
monitoring.trackMetric('adaptive_learning.accuracy', value);
```

### Key Metrics Categories

1. **Learning Metrics** - Track learning progress
2. **Performance Metrics** - Track system performance
3. **Health Metrics** - Track system health
4. **Business Metrics** - Track business impact

---

## Learning Metrics

### Weight Learning Metrics

**Event:** `adaptive_learning.weight_updated`
```typescript
{
  tenantId: string;
  contextKey: string;
  serviceType: 'risk' | 'forecast' | 'recommendations';
  component: string;
  oldWeight: number;
  newWeight: number;
  examples: number;
  learningRate: number;
}
```

**Key Metrics:**
- Weight update frequency
- Learning rate trends
- Examples per context
- Weight convergence

### Model Selection Metrics

**Event:** `adaptive_learning.model_selected`
```typescript
{
  tenantId: string;
  modelType: string;
  selectedModel: 'global' | 'industry' | 'tenant';
  reason: string;
  examples: number;
}
```

**Key Metrics:**
- Model selection distribution
- Graduation rate (global → industry → tenant)
- Model performance comparison

### Outcome Collection Metrics

**Event:** `adaptive_learning.outcome_recorded`
```typescript
{
  tenantId: string;
  serviceType: string;
  outcomeType: 'success' | 'failure' | 'partial';
  predictionId: string;
  processingMode: 'realtime' | 'batch';
}
```

**Key Metrics:**
- Outcome collection rate
- Real-time vs. batch ratio
- Outcome distribution
- Collection latency

---

## Performance Metrics

### Accuracy Metrics

**Metric:** `adaptive_learning.accuracy`
- Component accuracy per tenant/context
- Overall accuracy trends
- Accuracy by service type

**Metric:** `adaptive_learning.improvement`
- Improvement over baseline
- Improvement by context
- Improvement trends over time

### Validation Metrics

**Event:** `adaptive_learning.validation_completed`
```typescript
{
  tenantId: string;
  contextKey: string;
  serviceType: string;
  validated: boolean;
  confidence: number;
  improvement: number;
  sampleSize: number;
}
```

**Key Metrics:**
- Validation pass rate
- Confidence intervals
- Improvement distribution
- Sample size trends

### Rollback Metrics

**Event:** `adaptive_learning.rollback_triggered`
```typescript
{
  tenantId: string;
  contextKey: string;
  serviceType: string;
  reason: string;
  degradation: number;
  previousAccuracy: number;
  currentAccuracy: number;
}
```

**Key Metrics:**
- Rollback frequency
- Rollback reasons distribution
- Performance recovery time

---

## Health Metrics

### Cache Performance

**Metric:** `adaptive_learning.cache_hit_rate`
- Target: >90%
- Alert: <80%

**Metric:** `adaptive_learning.cache_latency`
- Target: <10ms p95
- Alert: >20ms p95

### Database Performance

**Metric:** `adaptive_learning.db_latency`
- Target: <50ms p95
- Alert: >100ms p95

**Metric:** `adaptive_learning.db_throughput`
- Target: >500 requests/second
- Alert: <300 requests/second

### Error Rates

**Metric:** `adaptive_learning.error_rate`
- Target: <1%
- Alert: >5%

**Event:** `adaptive_learning.service_error`
```typescript
{
  service: string;
  operation: string;
  error: string;
  tenantId?: string;
}
```

---

## Business Metrics

### Learning Effectiveness

**Metric:** `adaptive_learning.learning_effectiveness`
- Percentage of contexts where learned weights outperform defaults
- Target: >80%

**Metric:** `adaptive_learning.user_adoption`
- Percentage of users/tenants using learned parameters
- Target: >80%

### Business Impact

**Metric:** `adaptive_learning.win_rate_improvement`
- Improvement in opportunity win rates
- Target: >25%

**Metric:** `adaptive_learning.forecast_accuracy_improvement`
- Improvement in forecast accuracy
- Target: >40%

**Metric:** `adaptive_learning.productivity_improvement`
- Improvement in sales productivity
- Target: >30%

---

## Dashboard Setup

### Dashboard 1: Learning Overview

**Widgets:**
1. Learning Progress (examples collected)
2. Weight Update Frequency
3. Model Selection Distribution
4. Validation Pass Rate
5. Overall Improvement

### Dashboard 2: Performance Monitoring

**Widgets:**
1. Component Accuracy Trends
2. Improvement Over Baseline
3. Cache Hit Rate
4. Database Latency
5. Error Rate

### Dashboard 3: System Health

**Widgets:**
1. Service Availability
2. Cache Performance
3. Database Performance
4. Rollback Events
5. Alert Summary

### Dashboard 4: Business Impact

**Widgets:**
1. Win Rate Improvement
2. Forecast Accuracy Improvement
3. User Adoption Rate
4. Learning Effectiveness
5. ROI Metrics

---

## Alerting Rules

### Critical Alerts

**Alert 1: High Error Rate**
- Condition: Error rate >5% for 5 minutes
- Action: Page on-call engineer
- Severity: Critical

**Alert 2: Performance Degradation**
- Condition: Accuracy drop >10% for 10 minutes
- Action: Page on-call engineer
- Severity: Critical

**Alert 3: Rollback Event**
- Condition: Any automatic rollback
- Action: Notify team, create ticket
- Severity: High

### Warning Alerts

**Alert 4: Low Cache Hit Rate**
- Condition: Cache hit rate <80% for 15 minutes
- Action: Notify team
- Severity: Warning

**Alert 5: High Database Latency**
- Condition: DB latency >100ms p95 for 10 minutes
- Action: Notify team
- Severity: Warning

**Alert 6: Low Learning Progress**
- Condition: No weight updates for 1 hour
- Action: Notify team
- Severity: Warning

---

## Logging Best Practices

### Log Levels

**INFO:** Normal operations
- Weight updates
- Model selections
- Outcome collections
- Validations

**WARN:** Potential issues
- Cache misses
- Fallback to defaults
- Low confidence validations
- Degradation detected

**ERROR:** Errors requiring attention
- Service failures
- Database errors
- Validation failures
- Rollback events

### Structured Logging

```typescript
// Good: Structured logging
server.log.info({
  tenantId,
  contextKey,
  serviceType,
  operation: 'weight_updated',
  oldWeight: 0.9,
  newWeight: 0.95,
  examples: 150,
}, 'Weight updated');

// Avoid: Unstructured logging
server.log.info(`Weight updated for ${tenantId}`);
```

---

## Monitoring Queries

### Learning Progress Query

```kusto
// Application Insights KQL
customEvents
| where name == "adaptive_learning.weight_updated"
| summarize 
    count() as Updates,
    avg(todouble(customDimensions.examples)) as AvgExamples,
    max(todouble(customDimensions.examples)) as MaxExamples
    by bin(timestamp, 1h), tostring(customDimensions.tenantId)
| render timechart
```

### Performance Improvement Query

```kusto
customMetrics
| where name == "adaptive_learning.improvement"
| summarize 
    avg(value) as AvgImprovement,
    percentile(value, 95) as P95Improvement
    by bin(timestamp, 1h), tostring(customDimensions.serviceType)
| render timechart
```

### Rollback Analysis Query

```kusto
customEvents
| where name == "adaptive_learning.rollback_triggered"
| summarize 
    count() as Rollbacks,
    make_list(tostring(customDimensions.reason)) as Reasons
    by bin(timestamp, 1d)
| render barchart
```

---

## Troubleshooting with Metrics

### Issue: Learning Not Progressing

**Check:**
1. Outcome collection rate (`adaptive_learning.outcome_recorded`)
2. Examples per context (should be >100)
3. Learning rate values (should be >0)
4. Weight update frequency

**Actions:**
- Verify outcome collection is working
- Check for sufficient data
- Review learning rate configuration

### Issue: Performance Degradation

**Check:**
1. Accuracy trends (`adaptive_learning.accuracy`)
2. Improvement metrics (`adaptive_learning.improvement`)
3. Rollback events (`adaptive_learning.rollback_triggered`)
4. Error rates

**Actions:**
- Review recent weight updates
- Check for data quality issues
- Consider manual rollback
- Investigate root cause

### Issue: High Latency

**Check:**
1. Cache hit rate (`adaptive_learning.cache_hit_rate`)
2. Database latency (`adaptive_learning.db_latency`)
3. Redis connection health
4. Cosmos DB RU/s usage

**Actions:**
- Verify Redis is healthy
- Check Cosmos DB RU/s allocation
- Review query patterns
- Optimize cache keys

---

## Best Practices

### 1. Monitor Proactively
- Set up dashboards before deployment
- Configure alerts early
- Review metrics daily during rollout

### 2. Track Trends
- Monitor metrics over time
- Look for patterns and anomalies
- Compare across tenants/contexts

### 3. Act on Alerts
- Respond to alerts promptly
- Investigate root causes
- Document resolutions

### 4. Regular Reviews
- Weekly metric reviews
- Monthly performance analysis
- Quarterly optimization reviews

---

## Conclusion

Comprehensive monitoring is essential for the success of the CAIS adaptive learning system. Use this guide to set up monitoring, configure alerts, and track system health and learning effectiveness.

**Status:** ✅ **MONITORING GUIDE COMPLETE**
