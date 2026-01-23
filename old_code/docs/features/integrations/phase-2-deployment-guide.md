# Phase 2 Integration - Deployment Guide

**Date:** Implementation Complete  
**Status:** ✅ **READY FOR DEPLOYMENT**

---

## 🚀 Deployment Overview

This guide provides step-by-step instructions for deploying Phase 2 Integration to production.

---

## 📋 Prerequisites

### Azure Resources Required
- ✅ Azure Cosmos DB account (with vector search enabled)
- ✅ Azure Service Bus namespace
- ✅ Azure Functions App
- ✅ Azure Application Insights (for monitoring)
- ✅ Azure Key Vault (for secrets)

### Environment Setup
- ✅ Node.js 18+ installed
- ✅ Azure Functions Core Tools installed
- ✅ Azure CLI installed and configured
- ✅ Access to Azure subscription

---

## 📋 Step 0: Environment Variables

Before deploying, configure the required environment variables. See **[phase-2-environment-variables.md](./phase-2-environment-variables.md)** for complete reference.

### Backend Environment Variables

**Required:**
- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `COSMOS_DB_DATABASE`
- `AZURE_SERVICE_BUS_CONNECTION_STRING`

**Optional (with defaults):**
- `AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE` (default: `ingestion-events`)
- `AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE` (default: `shard-emission`)
- `AZURE_SERVICE_BUS_ENRICHMENT_JOBS_QUEUE` (default: `enrichment-jobs`)
- `AZURE_SERVICE_BUS_SHARD_CREATED_QUEUE` (default: `shard-created`)
- `AZURE_OPENAI_ENDPOINT` (for LLM enrichment)
- `AZURE_OPENAI_API_KEY` (for LLM enrichment)

### Frontend Environment Variables

**Required:**
- `NEXT_PUBLIC_API_BASE_URL` - Backend API base URL (e.g., `http://localhost:3001` or `https://api.example.com`)

**Optional:**
- `API_PORT` - Backend API port for Next.js rewrites (default: `3001`)
- `NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING` - Application Insights for monitoring
- `NEXT_PUBLIC_APP_INSIGHTS_INSTRUMENTATION_KEY` - Application Insights instrumentation key

**Frontend Configuration:**

The frontend uses Next.js rewrites to proxy API requests. Ensure `next.config.ts` has the correct rewrite rules:

```typescript
async rewrites() {
  return [
    {
      source: '/api/v1/:path*',
      destination: `http://localhost:${process.env.API_PORT || 3001}/api/v1/:path*`,
    },
  ]
}
```

For production, set `NEXT_PUBLIC_API_BASE_URL` to your production API URL, and the frontend will use it directly (rewrites are typically disabled in production).

---

## 🔧 Step 1: Configure Azure Resources

### 1.1 Create Service Bus Queues

Create the following queues in your Azure Service Bus namespace:

```bash
# Using Azure CLI
az servicebus queue create \
  --resource-group <resource-group> \
  --namespace-name <service-bus-namespace> \
  --name ingestion-events \
  --max-delivery-count 10 \
  --lock-duration PT5M

az servicebus queue create \
  --resource-group <resource-group> \
  --namespace-name <service-bus-namespace> \
  --name shard-emission \
  --max-delivery-count 10 \
  --lock-duration PT5M

az servicebus queue create \
  --resource-group <resource-group> \
  --namespace-name <service-bus-namespace> \
  --name enrichment-jobs \
  --max-delivery-count 10 \
  --lock-duration PT5M

az servicebus queue create \
  --resource-group <resource-group> \
  --namespace-name <service-bus-namespace> \
  --name shard-created \
  --max-delivery-count 10 \
  --lock-duration PT5M
```

**Queue Configuration:**
- **Max Delivery Count:** 10 (retry failed messages)
- **Lock Duration:** 5 minutes (processing window)
- **Message TTL:** Default (or set based on requirements)
- **Dead Letter Queue:** Enabled (for failed messages)

---

### 1.2 Verify Cosmos DB Vector Search

Verify that your Cosmos DB container has vector search enabled:

```bash
# Check container configuration
az cosmosdb sql container show \
  --account-name <cosmos-account> \
  --database-name <database> \
  --name shards \
  --query "indexingPolicy"
```

**Required Configuration:**
- Vector embedding policy enabled
- Path: `/vectors/*/embedding`
- Distance function: Cosine
- Dimensions: 1536 (for text-embedding-3-small)

---

### 1.3 Configure Application Insights

Create or verify Application Insights resource:

```bash
az monitor app-insights component create \
  --app <app-name> \
  --location <location> \
  --resource-group <resource-group>
```

---

## 🔐 Step 2: Configure Environment Variables

### 2.1 API Application Settings

Add the following environment variables to your API application:

```bash
# Service Bus Configuration
AZURE_SERVICE_BUS_CONNECTION_STRING=<connection-string>
AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE=ingestion-events
AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE=shard-emission
AZURE_SERVICE_BUS_ENRICHMENT_JOBS_QUEUE=enrichment-jobs
AZURE_SERVICE_BUS_SHARD_CREATED_QUEUE=shard-created

# Azure OpenAI Configuration (for LLM entity extraction)
AZURE_OPENAI_ENDPOINT=<endpoint>
AZURE_OPENAI_API_KEY=<api-key>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Phase 2 Service Configuration
ENABLE_INSIGHT_CHANGE_FEED=true
ENABLE_INSIGHT_NIGHTLY_BATCH=true
INSIGHT_BATCH_SIZE=100
INSIGHT_POLL_INTERVAL_MS=5000
ENABLE_METRICS_SHARDS=true
```

### 2.2 Azure Functions Settings

Add the same environment variables to your Azure Functions app, plus:

```bash
# Cosmos DB Configuration (for Functions)
COSMOS_DB_ENDPOINT=<endpoint>
COSMOS_DB_KEY=<key>
COSMOS_DB_DATABASE_ID=<database-id>

# Service Bus Configuration (same as API)
AZURE_SERVICE_BUS_CONNECTION_STRING=<connection-string>
```

---

## 📦 Step 3: Deploy Azure Functions

### 3.1 Build Functions

```bash
cd src/functions
npm install
npm run build
```

### 3.2 Deploy Functions

```bash
# Deploy all functions
func azure functionapp publish <function-app-name>

# Or deploy individually
func azure functionapp publish <function-app-name> --typescript
```

### 3.3 Verify Functions

Check that all 6 functions are deployed:
- `ingestion-salesforce`
- `ingestion-gdrive`
- `ingestion-slack`
- `normalization-processor`
- `enrichment-processor`
- `project-auto-attachment-processor`

---

## 🗄️ Step 4: Seed Shard Types

Shard types are automatically seeded on API startup. Verify in logs:

```
✅ Core shard types seeded
```

If seeding fails, manually seed:

```bash
# Run seed script
npm run seed:core-types
```

**Expected Shard Types:**
- `c_opportunity`
- `c_account`
- `c_folder`
- `c_file`
- `c_sp_site`
- `c_channel`
- `integration.state`
- `c_insight_kpi`
- `system.metric`
- `system.audit_log`

---

## ✅ Step 5: Verify Deployment

### 5.1 Check Service Initialization

Verify in API logs that all Phase 2 services initialized:

```
✅ Redaction Service initialized
✅ Audit Trail Service initialized
✅ Insight Computation Service initialized
✅ Metrics Shard Service initialized
✅ Redaction configuration routes registered (Phase 2)
✅ Phase 2 Audit Trail routes registered
✅ Phase 2 Metrics routes registered
✅ Project resolver routes registered (Phase 2)
```

### 5.2 Test API Endpoints

**Test Redaction Configuration:**
```bash
# Get current config
curl -X GET https://<api-url>/api/v1/redaction/config \
  -H "Authorization: Bearer <token>"

# Configure redaction
curl -X PUT https://<api-url>/api/v1/redaction/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fields": ["structuredData.email"], "redactionValue": "[REDACTED]"}'
```

**Test Audit Trail:**
```bash
# Query audit logs
curl -X GET "https://<api-url>/api/v1/audit-trail?limit=10" \
  -H "Authorization: Bearer <token>"
```

**Test Metrics:**
```bash
# Query metrics
curl -X GET "https://<api-url>/api/v1/metrics?startDate=2024-01-15T00:00:00Z&endDate=2024-01-15T23:59:59Z" \
  -H "Authorization: Bearer <token>"
```

### 5.3 Verify Vector Search

Test that vector search works with metrics tracking:

```bash
curl -X POST https://<api-url>/api/v1/search/vector \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test query",
    "filter": {"tenantId": "tenant-123"},
    "topK": 10
  }'
```

After 100+ searches, verify metrics are recorded:
```bash
curl -X GET "https://<api-url>/api/v1/metrics?metricType=vector_hit_ratio&startDate=2024-01-15T00:00:00Z&endDate=2024-01-15T23:59:59Z" \
  -H "Authorization: Bearer <token>"
```

---

## 🔍 Step 6: Monitor & Validate

### 6.1 Application Insights Dashboards

Create dashboards for:
- **Ingestion Lag:** P50, P95, P99 percentiles
- **Vector Hit Ratio:** Cache performance
- **Change Miss Rate:** Change Feed effectiveness
- **Insight Confidence Drift:** KPI quality

### 6.2 Set Up Alerts

Configure alerts for:
- Ingestion lag > 1 hour
- Vector hit ratio < 0.5
- Change miss rate > 0.1%
- Service Bus queue depth > 1000

### 6.3 Verify Change Feed

Check that InsightComputationService Change Feed listener started:

```
✅ Insight Computation Service initialized
```

Monitor logs for:
- Change Feed processing events
- KPI computation events
- Error logs (should be minimal)

---

## 🧪 Step 7: End-to-End Testing

### 7.1 Test Ingestion Pipeline

1. **Trigger Salesforce Ingestion:**
   ```bash
   # Via HTTP trigger (webhook)
   curl -X POST https://<function-app>.azurewebsites.net/api/ingestion-salesforce \
     -H "Content-Type: application/json" \
     -d '{ ... }'
   ```

2. **Verify Normalization:**
   - Check `ingestion-events` queue for messages
   - Verify normalization processor processed events
   - Check `shard-emission` queue for messages

3. **Verify Enrichment:**
   - Check enrichment processor processed shards
   - Verify entity shards created
   - Check relationships established

4. **Verify Auto-Attachment:**
   - Check `shard-created` queue for messages
   - Verify project auto-attachment processor ran
   - Check shards linked to projects

### 7.2 Test Redaction

1. **Configure Redaction:**
   ```bash
   curl -X PUT https://<api-url>/api/v1/redaction/config \
     -H "Authorization: Bearer <token>" \
     -d '{"fields": ["structuredData.email"]}'
   ```

2. **Create Shard:**
   ```bash
   curl -X POST https://<api-url>/api/v1/shards \
     -H "Authorization: Bearer <token>" \
     -d '{"structuredData": {"email": "test@example.com"}}'
   ```

3. **Verify Redaction:**
   - Check shard metadata for redaction info
   - Verify email field is redacted

### 7.3 Test Audit Trail

1. **Create/Update Shard:**
   ```bash
   curl -X POST https://<api-url>/api/v1/shards ...
   ```

2. **Query Audit Logs:**
   ```bash
   curl -X GET "https://<api-url>/api/v1/audit-trail?targetShardId=<shard-id>" \
     -H "Authorization: Bearer <token>"
   ```

3. **Verify Audit Log:**
   - Check audit log shard created
   - Verify event type and changes recorded

---

## 🐛 Troubleshooting

### Issue: Services Not Initializing

**Symptoms:**
- Logs show "⚠️ Phase 2 Integration Services not initialized"

**Solutions:**
1. Check Cosmos DB connection string
2. Verify Service Bus connection string
3. Check environment variables are set
4. Review error logs for specific issues

---

### Issue: Change Feed Not Starting

**Symptoms:**
- No insight computation events
- Logs show Change Feed errors

**Solutions:**
1. Verify `ENABLE_INSIGHT_CHANGE_FEED=true`
2. Check Cosmos DB Change Feed is enabled
3. Verify container has proper permissions
4. Check Change Feed processor logs

---

### Issue: Redaction Not Applied

**Symptoms:**
- Shards created without redaction
- No redaction metadata

**Solutions:**
1. Verify redaction configuration via API
2. Check RedactionService is initialized
3. Verify service passed to ShardRepository
4. Check error logs for redaction failures

---

### Issue: Metrics Not Recording

**Symptoms:**
- No metric shards created
- Metrics API returns empty

**Solutions:**
1. Verify `ENABLE_METRICS_SHARDS=true`
2. Check MetricsShardService is initialized
3. Verify service passed to VectorSearchService
4. Perform 100+ searches to trigger recording
5. Check error logs for metric recording failures

---

### Issue: API Routes Not Available

**Symptoms:**
- 404 errors on Phase 2 endpoints
- Routes not in API documentation

**Solutions:**
1. Check route registration in `routes/index.ts`
2. Verify services are decorated on server
3. Check route registration logs
4. Verify authentication middleware

---

## 📊 Post-Deployment Checklist

- [ ] All services initialized successfully
- [ ] All API endpoints accessible
- [ ] Service Bus queues created
- [ ] Azure Functions deployed
- [ ] Shard types seeded
- [ ] Redaction configuration tested
- [ ] Audit trail logging verified
- [ ] Metrics recording verified
- [ ] Change Feed listener started
- [ ] Application Insights dashboards created
- [ ] Alerts configured
- [ ] End-to-end pipeline tested
- [ ] Documentation reviewed

---

## 🔄 Rollback Plan

If issues occur:

1. **Disable Phase 2 Services:**
   ```bash
   ENABLE_INSIGHT_CHANGE_FEED=false
   ENABLE_METRICS_SHARDS=false
   ```

2. **Remove Route Registration:**
   - Comment out Phase 2 route registrations in `routes/index.ts`
   - Redeploy API

3. **Disable Functions:**
   - Disable Azure Functions in Azure Portal
   - Or set function app to stopped state

4. **Revert Code:**
   - Revert to previous deployment
   - Services are optional, so system continues to work

---

## 📚 Additional Resources

- [Phase 2 Implementation Summary](./phase-2-final-summary.md)
- [Phase 2 API Endpoints](./phase-2-api-endpoints.md)
- [Phase 2 Known Limitations](./phase-2-known-limitations.md)
- [Phase 2 Verification Checklist](./phase-2-verification-checklist.md)

---

## 🎉 Deployment Complete

Once all steps are completed and verified, Phase 2 Integration is fully deployed and operational.

**Status:** ✅ **READY FOR PRODUCTION USE**

---

**Last Updated:** Implementation Complete  
**Next Review:** Post-deployment monitoring and optimization

