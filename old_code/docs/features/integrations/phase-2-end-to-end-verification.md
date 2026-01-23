# Phase 2 Integration - End-to-End Verification Guide

**Date:** Implementation Complete  
**Status:** ✅ **VERIFICATION GUIDE READY**

---

## 📋 Overview

This guide provides a comprehensive checklist for verifying that Phase 2 Integration is working correctly end-to-end, from backend services through frontend API calls.

---

## ✅ Prerequisites

Before starting verification, ensure:

1. **Backend API is running** on `http://localhost:3001` (or configured URL)
2. **Frontend web app is running** on `http://localhost:3000` (or configured URL)
3. **Azure resources are configured:**
   - Cosmos DB with vector search enabled
   - Service Bus queues created
   - Azure Functions deployed (if using serverless)
4. **Environment variables are set** (see [phase-2-environment-variables.md](./phase-2-environment-variables.md))
5. **Test user account exists** with appropriate permissions

---

## 🔍 Verification Checklist

### 1. Backend API Endpoints

#### 1.1 Project Resolver API

```bash
# Test: Get project context
curl -X GET "http://localhost:3001/api/v1/projects/{projectId}/context" \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenantId}"

# Expected: 200 OK with project and linkedShards
```

```bash
# Test: Add internal relationships
curl -X PATCH "http://localhost:3001/api/v1/projects/{projectId}/internal-relationships" \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenantId}" \
  -H "Content-Type: application/json" \
  -d '{
    "relationships": [{
      "shardId": "shard-123",
      "shardTypeId": "c_opportunity",
      "shardName": "Test Opportunity",
      "metadata": {
        "confidence": 0.9,
        "source": "manual"
      }
    }]
  }'

# Expected: 200 OK with message and relationshipCount
```

```bash
# Test: Get project insights
curl -X GET "http://localhost:3001/api/v1/projects/{projectId}/insights" \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenantId}"

# Expected: 200 OK with insights array
```

#### 1.2 Redaction Configuration API

```bash
# Test: Get redaction config
curl -X GET "http://localhost:3001/api/v1/redaction/config" \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenantId}"

# Expected: 200 OK with enabled, fields, redactionValue
```

```bash
# Test: Update redaction config
curl -X PUT "http://localhost:3001/api/v1/redaction/config" \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenantId}" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": ["structuredData.email", "structuredData.phone"],
    "redactionValue": "[REDACTED]"
  }'

# Expected: 200 OK with success: true
```

#### 1.3 Phase 2 Audit Trail API

```bash
# Test: Query audit trail
curl -X GET "http://localhost:3001/api/v1/audit-trail?limit=10" \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenantId}"

# Expected: 200 OK with logs array and count
```

```bash
# Test: Get shard audit trail
curl -X GET "http://localhost:3001/api/v1/audit-trail/shard/{shardId}" \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenantId}"

# Expected: 200 OK with shardId, logs array, and count
```

#### 1.4 Phase 2 Metrics API

```bash
# Test: Query metrics
curl -X GET "http://localhost:3001/api/v1/metrics?metricType=vector_hit_ratio&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenantId}"

# Expected: 200 OK with metrics array and count
```

```bash
# Test: Get aggregated metrics
curl -X GET "http://localhost:3001/api/v1/metrics/aggregated?metricType=vector_hit_ratio&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer {token}" \
  -H "X-Tenant-ID: {tenantId}"

# Expected: 200 OK with p50, p95, p99, mean, min, max, count
```

---

### 2. Frontend API Integration

#### 2.1 Verify API Service Files

Check that all API service files exist and export correctly:

```bash
# Verify files exist
ls -la apps/web/src/lib/api/project-resolver.ts
ls -la apps/web/src/lib/api/redaction.ts
ls -la apps/web/src/lib/api/phase2-audit-trail.ts
ls -la apps/web/src/lib/api/phase2-metrics.ts
```

#### 2.2 Verify React Query Hooks

Check that all hooks exist and export correctly:

```bash
# Verify files exist
ls -la apps/web/src/hooks/use-project-resolver.ts
ls -la apps/web/src/hooks/use-redaction.ts
ls -la apps/web/src/hooks/use-phase2-audit-trail.ts
ls -la apps/web/src/hooks/use-phase2-metrics.ts
```

#### 2.3 Test Frontend API Calls

Open browser DevTools Console and test:

```javascript
// Test: Project Resolver
import { projectResolverApi } from '@/lib/api/project-resolver'
const context = await projectResolverApi.getProjectContext('project-123')
console.log('Project Context:', context)

// Test: Redaction
import { redactionApi } from '@/lib/api/redaction'
const config = await redactionApi.getConfig()
console.log('Redaction Config:', config)

// Test: Audit Trail
import { phase2AuditTrailApi } from '@/lib/api/phase2-audit-trail'
const logs = await phase2AuditTrailApi.getAuditTrail({ limit: 10 })
console.log('Audit Logs:', logs)

// Test: Metrics
import { phase2MetricsApi } from '@/lib/api/phase2-metrics'
const metrics = await phase2MetricsApi.getMetrics({
  metricType: 'vector_hit_ratio',
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z',
})
console.log('Metrics:', metrics)
```

---

### 3. Service Bus Integration

#### 3.1 Verify Queues Exist

```bash
# Using Azure CLI
az servicebus queue list \
  --resource-group <resource-group> \
  --namespace-name <service-bus-namespace> \
  --query "[].name" \
  --output table

# Expected: ingestion-events, shard-emission, enrichment-jobs, shard-created
```

#### 3.2 Test Message Flow

1. **Trigger ingestion** (via Azure Function or API)
2. **Check `ingestion-events` queue** for messages
3. **Check `shard-emission` queue** for normalized events
4. **Check `enrichment-jobs` queue** for enrichment jobs
5. **Check `shard-created` queue** for created shards

---

### 4. Cosmos DB Integration

#### 4.1 Verify Shard Types

```bash
# Query Cosmos DB for core shard types
# Expected: c_project, c_opportunity, c_account, integration.state, system.metric, system.audit_log
```

#### 4.2 Verify Vector Search

```bash
# Test vector search query
# Expected: Results with vector similarity scores
```

#### 4.3 Verify Relationships

```bash
# Query a project shard
# Expected: internal_relationships and external_relationships arrays populated
```

---

### 5. Azure Functions Integration

#### 5.1 Verify Functions Deployed

```bash
# Using Azure CLI
az functionapp list \
  --resource-group <resource-group> \
  --query "[].name" \
  --output table

# Check for:
# - ingestion-salesforce
# - ingestion-gdrive
# - ingestion-slack
# - normalization-processor
# - enrichment-processor
# - project-auto-attachment-processor
```

#### 5.2 Test Function Triggers

1. **HTTP Trigger:** Test `ingestion-salesforce` HTTP endpoint
2. **Timer Trigger:** Verify scheduled ingestion functions run
3. **Service Bus Trigger:** Send test message to queue, verify function processes it

---

### 6. End-to-End Flow Test

#### 6.1 Complete Ingestion Flow

1. **Trigger ingestion** (e.g., Salesforce sync)
2. **Verify `ingestion-events` queue** receives messages
3. **Verify normalization processor** creates normalized shards
4. **Verify enrichment processor** creates entity shards and relationships
5. **Verify project auto-attachment** links shards to projects
6. **Verify vector embeddings** are generated
7. **Query project context** and verify linked shards appear
8. **Query audit trail** and verify events are logged
9. **Query metrics** and verify metrics are recorded

#### 6.2 Redaction Flow

1. **Configure redaction** via API
2. **Create/update a shard** with PII fields
3. **Verify redaction** is applied to shard data
4. **Query audit trail** and verify redacted_access events
5. **Query shard** and verify redacted values

#### 6.3 Project Context Flow

1. **Create a project** shard
2. **Add internal relationships** via API
3. **Query project context** and verify linked shards
4. **Perform vector search** with project filter
5. **Verify project-scoped results** only include linked shards

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: 401 Unauthorized
**Solution:** Verify JWT token is valid and includes tenant context

#### Issue: 403 Forbidden
**Solution:** Verify user has required roles (tenant-admin, super-admin)

#### Issue: 404 Not Found
**Solution:** Verify endpoint path is correct and resource exists

#### Issue: 500 Internal Server Error
**Solution:** Check backend logs, verify Azure resources are configured

#### Issue: Frontend API calls fail
**Solution:** 
- Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly
- Check browser console for CORS errors
- Verify Next.js rewrite rules are working

#### Issue: Service Bus messages not processing
**Solution:**
- Verify queue names match environment variables
- Check function app logs
- Verify connection string is correct

---

## ✅ Success Criteria

All verification steps should pass:

- ✅ All backend API endpoints return 200 OK
- ✅ All frontend API service files compile without errors
- ✅ All React Query hooks work correctly
- ✅ Service Bus queues receive and process messages
- ✅ Cosmos DB shards are created with correct structure
- ✅ Vector search returns results
- ✅ Relationships are properly linked
- ✅ Audit trail logs events
- ✅ Metrics are recorded
- ✅ Redaction is applied correctly

---

## 📚 Related Documentation

- [Phase 2 API Endpoints](./phase-2-api-endpoints.md) - API reference
- [Phase 2 Frontend Integration](./phase-2-frontend-integration.md) - Frontend guide
- [Phase 2 Deployment Guide](./phase-2-deployment-guide.md) - Deployment instructions
- [Phase 2 Environment Variables](./phase-2-environment-variables.md) - Environment setup

---

**Status:** ✅ **VERIFICATION GUIDE COMPLETE**

Use this guide to verify Phase 2 Integration is working correctly end-to-end.






