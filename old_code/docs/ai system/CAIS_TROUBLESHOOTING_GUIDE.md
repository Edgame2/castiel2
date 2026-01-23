# CAIS Troubleshooting Guide

**Date:** January 2025  
**Status:** 📋 **TROUBLESHOOTING GUIDE**  
**Version:** 1.0

---

## Overview

Comprehensive troubleshooting guide for common issues with the CAIS adaptive learning system.

---

## Quick Diagnosis

### Check System Status

```bash
# Check learning status
pnpm tsx scripts/adaptive-learning/check-learning-status.ts <tenantId>

# Check API endpoints
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/weights/<tenantId>?contextKey=tech:large:proposal&serviceType=risk" \
  -H "Authorization: Bearer <token>"

# Check service health
curl -X GET "http://localhost:3000/health"
```

---

## Common Issues

### Issue 1: No Learning Records Found

**Symptoms:**
- `check-learning-status.ts` shows "No learning records found"
- Weights remain at defaults
- No improvement over time

**Possible Causes:**
1. Outcome collection not working
2. Insufficient examples (<100)
3. Feature flag disabled
4. Services not initialized

**Diagnosis:**
```bash
# Check if outcomes are being collected
# Query learningOutcomes container in Cosmos DB
# Should see records with tenantId

# Check feature flag
# Via API or feature flag service
GET /api/v1/feature-flags/adaptive_learning_enabled

# Check service initialization
# Check application logs for "Adaptive Learning Services initialized"
```

**Solutions:**

1. **Verify Outcome Collection:**
   ```typescript
   // In your service, ensure outcomeCollector is called
   if (this.outcomeCollector) {
     await this.outcomeCollector.recordOutcome(
       predictionId,
       tenantId,
       outcome,
       'success'
     );
   }
   ```

2. **Check Feature Flag:**
   ```typescript
   await featureFlagService.setFlag('adaptive_learning_enabled', {
     enabled: true,
     rolloutPercentage: 0, // Start at 0% for data collection
   });
   ```

3. **Verify Service Initialization:**
   - Check `routes/index.ts` for `initializeAdaptiveLearningServices` call
   - Verify Cosmos DB connection
   - Verify Redis connection

4. **Wait for Sufficient Examples:**
   - Learning starts after 100+ examples
   - Check example count: `check-learning-status.ts`

---

### Issue 2: Weights Not Updating

**Symptoms:**
- Weights remain at defaults
- No learning progress
- Blend ratio stays at 0%

**Possible Causes:**
1. Learning rate too low
2. Examples not sufficient
3. Validation failing
4. Rollout percentage at 0%

**Diagnosis:**
```bash
# Check learning status
pnpm tsx scripts/adaptive-learning/check-learning-status.ts <tenantId> <contextKey> <serviceType>

# Check examples count
# Should be >100 for initial learning

# Check validation status
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/validation-status/<tenantId>?contextKey=<contextKey>&serviceType=<serviceType>"
```

**Solutions:**

1. **Verify Examples Count:**
   - Need 100+ examples for bootstrap stage
   - Need 500+ examples for initial learning
   - Check: `check-learning-status.ts`

2. **Check Learning Rate:**
   ```typescript
   // Learning rate should be > 0
   // Check learning record: learningRate field
   ```

3. **Verify Validation:**
   - Check validation status via API
   - If validation failing, check performance metrics
   - May need more examples for statistical significance

4. **Check Rollout Percentage:**
   ```typescript
   // Rollout should be > 0% for learning to apply
   // Check via API: GET /adaptive-learning/rollout-status/:tenantId
   ```

---

### Issue 3: Performance Degradation

**Symptoms:**
- Accuracy decreased
- User complaints
- Rollback events triggered

**Possible Causes:**
1. Data quality issues
2. Insufficient examples
3. Context mismatch
4. Model drift

**Diagnosis:**
```bash
# Check performance metrics
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/performance/<tenantId>?contextKey=<contextKey>&serviceType=<serviceType>"

# Check validation status
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/validation-status/<tenantId>?contextKey=<contextKey>&serviceType=<serviceType>"

# Check rollback status
# Review application logs for rollback events
```

**Solutions:**

1. **Check Data Quality:**
   - Verify outcome data is accurate
   - Check for data drift
   - Review recent changes

2. **Review Learning Record:**
   ```bash
   pnpm tsx scripts/adaptive-learning/check-learning-status.ts <tenantId> <contextKey> <serviceType>
   ```
   - Check performance metrics
   - Check validation results
   - Review rollback history

3. **Manual Rollback:**
   ```bash
   # Reset to defaults
   pnpm tsx scripts/adaptive-learning/reset-learning.ts <tenantId> <contextKey> <serviceType>
   ```

4. **Investigate Root Cause:**
   - Review recent weight updates
   - Check for context mismatches
   - Analyze performance trends

---

### Issue 4: High Cache Miss Rate

**Symptoms:**
- Cache hit rate <80%
- Increased database load
- Higher latency

**Possible Causes:**
1. Redis connection issues
2. Cache invalidation too frequent
3. Cache key mismatches
4. Redis memory full

**Diagnosis:**
```bash
# Check Redis connection
redis-cli -h <host> ping
# Should return: PONG

# Check Redis memory
redis-cli -h <host> INFO memory

# Check cache keys
redis-cli -h <host> KEYS "learned_params:*"
```

**Solutions:**

1. **Verify Redis Connection:**
   ```typescript
   // Check connection in application
   await redis.ping(); // Should return 'PONG'
   ```

2. **Check Cache Keys:**
   - Verify cache key patterns match
   - Check for key mismatches
   - Review cache invalidation logic

3. **Review Cache TTL:**
   - Default TTL: 15 minutes
   - May need adjustment based on usage
   - Check `cache-keys.ts` configuration

4. **Check Redis Memory:**
   - Monitor Redis memory usage
   - Consider increasing memory if needed
   - Review eviction policies

---

### Issue 5: Database Latency High

**Symptoms:**
- Cosmos DB latency >100ms
- Timeout errors
- High RU/s usage

**Possible Causes:**
1. Insufficient RU/s allocation
2. Query patterns inefficient
3. Indexes missing
4. Partition key issues

**Diagnosis:**
```bash
# Check Cosmos DB metrics
# Via Azure Portal or CLI
az cosmosdb sql container show \
  --account-name <account> \
  --database-name <database> \
  --name <container>

# Check RU/s usage
# Via Azure Portal metrics
```

**Solutions:**

1. **Increase RU/s:**
   ```bash
   # Via Azure Portal or CLI
   az cosmosdb sql container throughput update \
     --account-name <account> \
     --database-name <database> \
     --name <container> \
     --throughput <new-throughput>
   ```

2. **Optimize Queries:**
   - Review query patterns
   - Ensure partition key in WHERE clause
   - Use indexed properties

3. **Verify Indexes:**
   - Check composite indexes defined
   - Verify indexes are being used
   - Review query execution plans

4. **Check Partition Key:**
   - Ensure `/tenantId` is partition key
   - Queries should filter by tenantId
   - Avoid cross-partition queries

---

### Issue 6: Services Not Available

**Symptoms:**
- `adaptiveWeightService` is undefined
- Services not initialized
- Routes return 503

**Possible Causes:**
1. Services not initialized
2. Cosmos DB connection failed
3. Redis connection failed
4. Service registry issues

**Diagnosis:**
```bash
# Check application logs
# Look for initialization errors

# Check service registry
curl -X GET "http://localhost:3000/readiness"

# Check Cosmos DB connection
# Verify connection string and credentials
```

**Solutions:**

1. **Verify Initialization:**
   - Check `routes/index.ts` for `initializeAdaptiveLearningServices` call
   - Review initialization logs
   - Verify dependencies available

2. **Check Cosmos DB:**
   ```typescript
   // Verify connection
   const cosmosClient = new CosmosClient({
     endpoint: config.cosmosDb.endpoint,
     key: config.cosmosDb.key,
   });
   await cosmosClient.databases.readAll().fetchAll();
   ```

3. **Check Redis:**
   ```typescript
   // Verify connection
   await redis.ping(); // Should return 'PONG'
   ```

4. **Review Service Registry:**
   - Check service registry health
   - Verify services registered
   - Review dependency chain

---

### Issue 7: Validation Always Failing

**Symptoms:**
- Validation never passes
- `validated: false` in status
- No improvement detected

**Possible Causes:**
1. Insufficient sample size
2. No actual improvement
3. Statistical criteria too strict
4. Performance data incorrect

**Diagnosis:**
```bash
# Check validation status
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/validation-status/<tenantId>?contextKey=<contextKey>&serviceType=<serviceType>"

# Check examples count
pnpm tsx scripts/adaptive-learning/check-learning-status.ts <tenantId> <contextKey> <serviceType>
```

**Solutions:**

1. **Increase Sample Size:**
   - Need sufficient examples for statistical significance
   - Bootstrap validation requires multiple samples
   - Wait for more data collection

2. **Review Performance Data:**
   - Verify outcome data is accurate
   - Check for data quality issues
   - Review performance calculations

3. **Adjust Validation Criteria:**
   ```typescript
   // May need to adjust validation criteria
   // Check ValidationCriteria in types
   // Consider relaxing thresholds if appropriate
   ```

4. **Check Learning Progress:**
   - Verify learning is actually improving
   - Review weight updates
   - Check performance trends

---

### Issue 8: Rollback Events Frequent

**Symptoms:**
- Multiple rollback events
- Performance degradation
- Automatic rollbacks triggered

**Possible Causes:**
1. Data quality issues
2. Context mismatches
3. Insufficient examples
4. Model drift

**Diagnosis:**
```bash
# Check rollback history
# Review learning records for rollbackReason

# Check performance trends
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/performance/<tenantId>?contextKey=<contextKey>&serviceType=<serviceType>"
```

**Solutions:**

1. **Investigate Root Cause:**
   - Review rollback reasons
   - Check performance trends
   - Analyze data quality

2. **Review Context Keys:**
   - Verify context key generation
   - Check for context mismatches
   - Ensure consistent context usage

3. **Increase Examples:**
   - More examples = more stable learning
   - Wait for sufficient data
   - Consider context-specific learning

4. **Manual Intervention:**
   ```bash
   # Reset and start fresh
   pnpm tsx scripts/adaptive-learning/reset-learning.ts <tenantId> <contextKey> <serviceType>
   ```

---

## Diagnostic Commands

### Check Learning Status
```bash
# All learning for tenant
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123

# Specific context
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123 "tech:large:proposal" risk
```

### Check API Endpoints
```bash
# Get weights
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/weights/tenant-123?contextKey=tech:large:proposal&serviceType=risk" \
  -H "Authorization: Bearer <token>"

# Get performance
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/performance/tenant-123?contextKey=tech:large:proposal&serviceType=risk" \
  -H "Authorization: Bearer <token>"

# Get validation status
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/validation-status/tenant-123?contextKey=tech:large:proposal&serviceType=risk" \
  -H "Authorization: Bearer <token>"

# Get rollout status
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/rollout-status/tenant-123?serviceType=risk" \
  -H "Authorization: Bearer <token>"
```

### Check Database
```bash
# Query learning records
# Via Cosmos DB Data Explorer or CLI
SELECT * FROM c WHERE c.tenantId = 'tenant-123' ORDER BY c.updatedAt DESC

# Query outcomes
SELECT * FROM c WHERE c.tenantId = 'tenant-123' ORDER BY c.createdAt DESC
```

### Check Cache
```bash
# Check Redis connection
redis-cli -h <host> ping

# Check cache keys
redis-cli -h <host> KEYS "learned_params:*"

# Get cache value
redis-cli -h <host> GET "learned_params:tenant-123:weights:tech:large:proposal:risk"
```

---

## Prevention Best Practices

### 1. Monitor Regularly
- Check learning status weekly
- Monitor performance metrics
- Review validation results
- Track rollback events

### 2. Verify Data Quality
- Ensure outcome data is accurate
- Check for data drift
- Review context key generation
- Validate predictions

### 3. Gradual Rollout
- Start with 0% rollout (data collection)
- Gradually increase rollout percentage
- Monitor at each stage
- Rollback if issues detected

### 4. Maintain Infrastructure
- Monitor Redis health
- Monitor Cosmos DB RU/s
- Check cache hit rates
- Review database latency

### 5. Document Issues
- Log all issues
- Track resolutions
- Update runbooks
- Share learnings

---

## Escalation

### When to Escalate

1. **Critical Issues:**
   - System-wide failures
   - Data loss
   - Security breaches
   - Performance degradation >20%

2. **Persistent Issues:**
   - Issues not resolved after troubleshooting
   - Recurring problems
   - Unknown root causes

3. **Production Impact:**
   - User-facing issues
   - Business impact
   - SLA violations

### Escalation Process

1. **Document Issue:**
   - Symptoms
   - Diagnosis steps taken
   - Error messages
   - Logs

2. **Check Documentation:**
   - Review troubleshooting guide
   - Check monitoring dashboards
   - Review recent changes

3. **Contact Team:**
   - Engineering lead
   - DevOps team
   - Data science team

4. **Provide Context:**
   - Issue description
   - Steps to reproduce
   - Impact assessment
   - Attempted solutions

---

## Additional Resources

- **Quick Start:** `CAIS_QUICK_START.md`
- **Developer Reference:** `CAIS_DEVELOPER_QUICK_REFERENCE.md`
- **Monitoring Guide:** `CAIS_MONITORING_GUIDE.md`
- **Deployment Guide:** `CAIS_DEPLOYMENT_GUIDE.md`
- **Utility Scripts:** `scripts/adaptive-learning/README.md`

---

## Conclusion

This troubleshooting guide provides solutions for common issues. For additional help, refer to the monitoring guide, deployment guide, or contact the team.

**Status:** ✅ **TROUBLESHOOTING GUIDE COMPLETE**
