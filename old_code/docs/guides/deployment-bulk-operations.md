# Bulk Operations Deployment Guide

**Version**: 1.0  
**Last Updated**: December 12, 2025  
**Status**: Production Ready

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Cosmos DB containers created
- [ ] Azure Key Vault secrets stored
- [ ] Authentication service verified
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Documentation reviewed
- [ ] Test suite passed

## Environment Variables

### Required Variables

```bash
# Bulk Jobs Worker Configuration
BULK_JOB_WORKER_ENABLED=true
BULK_JOB_WORKER_POLL_INTERVAL=5000         # milliseconds, default 5000
BULK_JOB_WORKER_MAX_CONCURRENT=2           # default 2, max 4 recommended
BULK_JOB_WORKER_MAX_DURATION=3600000       # milliseconds, default 1 hour

# Cosmos DB Configuration
COSMOS_DB_BULK_JOBS_CONTAINER=bulk-jobs    # Container name
COSMOS_DB_ENDPOINT=https://...cosmos.azure.com/
COSMOS_DB_KEY=<key>
COSMOS_DB_DATABASE=<database_name>

# Authentication
AUTH_JWT_SECRET=<secret_key>
AUTH_JWT_ISSUER=https://your-auth-provider.com
AUTH_JWT_AUDIENCE=https://api.example.com

# Monitoring (Optional but Recommended)
MONITORING_ENABLED=true
APPLICATION_INSIGHTS_KEY=<key>
ENVIRONMENT=production
```

### Configuration Recommendations by Deployment Size

#### Small Deployment (< 1M documents)
```bash
BULK_JOB_WORKER_POLL_INTERVAL=5000
BULK_JOB_WORKER_MAX_CONCURRENT=2
BULK_JOB_WORKER_MAX_DURATION=3600000
```

#### Medium Deployment (1M - 100M documents)
```bash
BULK_JOB_WORKER_POLL_INTERVAL=2000
BULK_JOB_WORKER_MAX_CONCURRENT=3
BULK_JOB_WORKER_MAX_DURATION=3600000
```

#### Large Deployment (> 100M documents)
```bash
BULK_JOB_WORKER_POLL_INTERVAL=1000
BULK_JOB_WORKER_MAX_CONCURRENT=4
BULK_JOB_WORKER_MAX_DURATION=3600000
# Consider running on separate worker instance
```

## Database Setup

### Cosmos DB Container

The system automatically creates the `bulk-jobs` container if it doesn't exist. However, for production, manually configure:

```javascript
{
  "id": "bulk-jobs",
  "partitionKey": {
    "paths": ["/tenantId"],
    "kind": "Hash"
  },
  "indexingPolicy": {
    "indexingMode": "consistent",
    "includedPaths": [
      {
        "path": "/*"
      }
    ],
    "compositeIndexes": [
      [
        {
          "path": "/status",
          "order": "ascending"
        },
        {
          "path": "/createdAt",
          "order": "descending"
        }
      ]
    ]
  },
  "ttl": 2592000  // 30 days in seconds
}
```

**Recommended Throughput**: 
- Small: 400 RU/s (auto-scale 400-4000)
- Medium: 1000 RU/s (auto-scale 1000-10000)
- Large: 5000 RU/s (auto-scale 5000-50000)

### Index Strategy

The composite index on `(status, createdAt)` is critical for:
- Worker polling by status
- Cleanup/archival operations
- Job discovery efficiency

## Monitoring Setup

### Application Insights Events to Track

```typescript
// Track job lifecycle events
- bulk_job_created        // When job is initiated
- bulk_job_processing     // When worker picks up job
- bulk_job_completed      // When job finishes
- bulk_job_failed         // When job fails
- bulk_job_cancelled      // When job is cancelled
- bulk_job_timeout        // When job exceeds duration

// Track worker health
- worker_started
- worker_stopped
- worker_cycle_completed
- worker_error
```

### Recommended Alerts

#### Critical (Page on-call)
- Job failure rate > 10% in 5 min window
- Worker crashed or not processing jobs for 10+ min
- Cosmos DB throttling (429 responses)
- Database connection failures

#### Warning (Log and notify team)
- Job processing time > 30 minutes
- Average job processing time trending up
- Individual operation failure rate > 5%
- Queue depth > 100 pending jobs

### Example Alert Configuration (Azure Monitor)

```yaml
alert_rules:
  - name: bulk_operations_failure_rate_high
    condition: "metric.custom_bulk_job_failure_rate > 0.1 for 5 minutes"
    severity: 1
    action: page_oncall
    
  - name: bulk_operations_worker_stalled
    condition: "timestamp(last_worker_cycle) > now - 10 minutes"
    severity: 1
    action: page_oncall
    
  - name: bulk_operations_queue_depth_high
    condition: "count(status = 'PENDING') > 100"
    severity: 2
    action: notify_team
```

## Scaling Considerations

### Vertical Scaling (Single Instance)

**CPU/Memory Requirements**:
- Per worker instance: ~256 MB RAM baseline
- Per concurrent job: ~50 MB RAM
- Recommended: 1-2 GB total for worker service

**Network**:
- Cosmos DB: 1-5 Mbps typical
- Webhook delivery: 100 Kbps per job
- Status polling: 10 Kbps per monitored job

### Horizontal Scaling

For high-throughput deployments, run multiple worker instances:

```yaml
# Docker Compose example
services:
  api-worker-1:
    image: api:latest
    environment:
      BULK_JOB_WORKER_MAX_CONCURRENT: 2
      BULK_JOB_WORKER_ID: worker-1  # optional for logging
    
  api-worker-2:
    image: api:latest
    environment:
      BULK_JOB_WORKER_MAX_CONCURRENT: 2
      BULK_JOB_WORKER_ID: worker-2
```

**Load Distribution**:
- Polling uses Cosmos DB query, no coordination needed
- Each worker independently polls for available jobs
- No job locking mechanism; optimistically update status
- Cosmos DB provides distributed coordination

### Performance Baselines

| Scenario | Throughput | Latency | CPU | Memory |
|----------|-----------|---------|-----|--------|
| 100 items upload | 10 jobs/min | 1-2 sec | 5-10% | 100 MB |
| 500 items upload | 5 jobs/min | 3-5 sec | 15-20% | 150 MB |
| 1000 items upload | 2 jobs/min | 5-10 sec | 25-30% | 200 MB |
| Mixed operations | 15 jobs/min | 2-6 sec | 20-25% | 180 MB |

## Deployment Steps

### 1. Pre-Deployment Validation

```bash
#!/bin/bash

# Check environment variables
echo "Validating environment..."
required_vars=(
  "BULK_JOB_WORKER_ENABLED"
  "COSMOS_DB_BULK_JOBS_CONTAINER"
  "COSMOS_DB_ENDPOINT"
  "COSMOS_DB_KEY"
  "AUTH_JWT_SECRET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: Missing required variable: $var"
    exit 1
  fi
done

echo "✓ All required variables present"

# Test Cosmos DB connection
echo "Testing Cosmos DB connection..."
curl -X GET \
  -H "Authorization: type%3dmaster%26ver%3d1.0%26sig%3d..." \
  "https://${COSMOS_DB_ENDPOINT}/dbs/${COSMOS_DB_DATABASE}/colls/${COSMOS_DB_BULK_JOBS_CONTAINER}/docs?%24count=true&\$limit=1"

echo "✓ Cosmos DB connection successful"
```

### 2. Database Preparation

```bash
# Create/verify container exists
npm run db:migrate

# Verify indexes created
npm run db:verify-indexes

# Check container stats
npm run db:stats bulk-jobs
```

### 3. Health Check

```bash
# Test API health
curl https://api.example.com/health

# Expected response:
# { "status": "healthy", "version": "1.0.0" }

# Test bulk operations endpoint
curl -X POST https://api.example.com/api/v1/documents/bulk-upload \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"items": []}'

# Expected: 400 (empty items) or 202 (success)
```

### 4. Deploy and Start Worker

```bash
# Build
npm run build

# Start API server
npm start

# Verify worker started
curl https://api.example.com/health

# Check logs for worker startup message:
# "BulkJobWorker started - polling every 5000ms"
```

### 5. Post-Deployment Validation

```bash
# Create test job
TEST_JOB=$(curl -X POST https://api.example.com/api/v1/documents/bulk-upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "name": "test.pdf",
        "fileSize": 1024,
        "mimeType": "application/pdf",
        "storagePath": "test.pdf",
        "visibility": "public"
      }
    ]
  }' | jq -r '.jobId')

echo "Test job ID: $TEST_JOB"

# Poll for completion
for i in {1..30}; do
  STATUS=$(curl https://api.example.com/api/v1/bulk-jobs/$TEST_JOB \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  
  echo "Attempt $i: Status = $STATUS"
  
  if [ "$STATUS" = "COMPLETED" ]; then
    echo "✓ Test job completed successfully"
    break
  fi
  
  sleep 2
done
```

## Rollback Procedure

If issues occur post-deployment:

### 1. Stop New Version

```bash
# Scale down new deployment
kubectl set replicas deployment/api-new --replicas=0

# Or if using Docker:
docker stop <container_id>
```

### 2. Restore Previous Version

```bash
# Scale up previous deployment
kubectl set replicas deployment/api-old --replicas=3

# Or manually restart previous version
docker start <previous_container_id>
```

### 3. Database Rollback

Bulk operations data is NOT rolled back (immutable job records). To clean up:

```javascript
// Query jobs created during bad deployment
const jobs = await container.items
  .query("SELECT * FROM c WHERE c.createdAt > @timestamp", {
    parameters: [{ name: "@timestamp", value: rollback_timestamp }]
  })
  .fetchAll();

// Inspect or delete problematic jobs
for (const job of jobs.resources) {
  console.log(`Job: ${job.jobId}, Status: ${job.status}`);
  // Manual deletion: await container.item(job.id).delete();
}
```

## Troubleshooting

### Worker Not Processing Jobs

**Symptom**: Jobs stay in PENDING status

**Diagnosis**:
```bash
# Check worker is running
curl https://api.example.com/health | jq '.worker.status'

# Check logs for errors
docker logs <container> | grep -i "worker\|error"

# Verify database connection
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/v1/bulk-jobs | head
```

**Solutions**:
1. Verify `BULK_JOB_WORKER_ENABLED=true`
2. Check Cosmos DB connection string
3. Verify worker has database permissions
4. Restart container: `docker restart <container_id>`

### High Failure Rate

**Symptom**: Many jobs/items failing

**Diagnosis**:
```bash
# Get failed job results
curl "https://api.example.com/api/v1/bulk-jobs/{jobId}/results?limit=100" \
  -H "Authorization: Bearer $TOKEN" | jq '.results[] | select(.status=="failure")'
```

**Common Causes**:
- Invalid file paths or document IDs
- Insufficient permissions
- Cosmos DB RU exhaustion (check throttling)
- Schema/validation changes in dependent services

### Database Throttling (429 Errors)

**Solution**:
1. Increase container throughput (RU/s)
2. Reduce worker concurrency: `BULK_JOB_WORKER_MAX_CONCURRENT=1`
3. Increase poll interval: `BULK_JOB_WORKER_POLL_INTERVAL=10000`

```bash
# Check current throughput
az cosmosdb sql container throughput show \
  --account-name <account> \
  --database-name <db> \
  --name bulk-jobs

# Update throughput
az cosmosdb sql container throughput update \
  --account-name <account> \
  --database-name <db> \
  --name bulk-jobs \
  --throughput 2000
```

## Operational Runbooks

### Daily Checks

```bash
# Check job processing rate
curl -H "Authorization: Bearer $TOKEN" \
  https://monitoring.example.com/api/metrics/bulk-jobs-completed-5m

# Monitor queue depth
curl -H "Authorization: Bearer $TOKEN" \
  https://monitoring.example.com/api/metrics/bulk-jobs-pending

# Check error rate
curl -H "Authorization: Bearer $TOKEN" \
  https://monitoring.example.com/api/metrics/bulk-jobs-failures-5m
```

### Weekly Checks

- Review failed job error patterns
- Check for long-running jobs
- Verify backup completion
- Review monitoring alert history

### Monthly Tasks

- Archive old job records (> 30 days)
- Review and optimize database indexes
- Analyze performance trends
- Plan capacity scaling if needed

## Security Checklist

- [ ] All secrets stored in Azure Key Vault
- [ ] Database connection string encrypted
- [ ] JWT tokens have short expiration (15-60 min)
- [ ] API requires authentication on all endpoints
- [ ] Audit logging enabled for all operations
- [ ] Network access restricted to authorized IPs
- [ ] CORS properly configured for client domains
- [ ] Rate limiting enabled (100 jobs/hour per tenant)

## Support and Escalation

**L1 Support** (Team)
- Check logs and metrics
- Verify environment variables
- Restart worker service
- Escalate if unresolved in 30 min

**L2 Support** (Database Team)
- Analyze Cosmos DB performance
- Adjust throughput and indexes
- Check for throttling or quota issues
- Escalate if affecting SLA

**L3 Support** (Architecture Team)
- Code review for bugs
- Database schema evaluation
- Scaling architecture changes
- Emergency deployments

---

**Emergency Contact**: oncall@example.com  
**Runbook Location**: https://confluence.example.com/x/BulkOps

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Bulk operations deployment guide fully documented

#### Implemented Features (✅)

- ✅ Bulk job worker configuration
- ✅ Environment variable setup
- ✅ Database container setup
- ✅ Monitoring and alerting
- ✅ Scaling considerations
- ✅ Troubleshooting guide

#### Known Limitations

- ⚠️ **Worker Performance** - Worker performance may need optimization for large deployments
  - **Recommendation:**
    1. Monitor worker performance
    2. Optimize worker configuration
    3. Document performance tuning

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Backend Documentation](../backend/README.md) - Backend implementation
