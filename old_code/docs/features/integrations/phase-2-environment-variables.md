# Phase 2 Integration - Environment Variables Reference

**Date:** Implementation Complete  
**Status:** ✅ **CONFIGURATION DOCUMENTED**

---

## 📋 Overview

This document lists all environment variables required and optional for Phase 2 Integration services.

---

## 🔧 Required Environment Variables

### Core Infrastructure

#### Cosmos DB
```bash
COSMOS_DB_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_DB_KEY=<primary-key>
COSMOS_DB_DATABASE=castiel
```

**Used by:**
- All Phase 2 services
- All Azure Functions
- Shard repository
- Integration state storage

---

#### Azure Service Bus
```bash
AZURE_SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=<key>
```

**Used by:**
- All Azure Functions
- Service Bus service
- Event messaging pipeline

---

### Phase 2 Service Bus Queues (Optional - defaults provided)

```bash
# Queue names (defaults shown)
AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE=ingestion-events
AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE=shard-emission
AZURE_SERVICE_BUS_ENRICHMENT_JOBS_QUEUE=enrichment-jobs
AZURE_SERVICE_BUS_SHARD_CREATED_QUEUE=shard-created
```

**Note:** If not provided, defaults are used. Ensure queues exist in Service Bus namespace.

**Used by:**
- `ingestion-salesforce.ts`, `ingestion-gdrive.ts`, `ingestion-slack.ts` → `ingestion-events`
- `normalization-processor.ts` → `shard-emission`
- `enrichment-processor.ts` → `enrichment-jobs`
- `project-auto-attachment-processor.ts` → `shard-created`

---

## 🔧 Optional Environment Variables

### Azure OpenAI (for Enrichment Processor)

```bash
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=<api-key>
AZURE_OPENAI_DEPLOYMENT_NAME=<deployment-name>  # e.g., gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

**Used by:**
- `enrichment-processor.ts` - LLM-based entity extraction

**Note:** If not configured, enrichment processor will skip LLM extraction and use only structured field extraction.

---

### Azure Key Vault (for Ingestion Functions)

```bash
AZURE_KEY_VAULT_URL=https://<vault-name>.vault.azure.net/
```

**Used by:**
- `ingestion-salesforce.ts` - Storing OAuth tokens
- `ingestion-gdrive.ts` - Storing OAuth tokens
- `ingestion-slack.ts` - Storing OAuth tokens

**Note:** Required if using Key Vault for credential storage. Otherwise, credentials can be stored in Cosmos DB.

---

### Insight Computation Service

```bash
# Enable/disable Change Feed listener
ENABLE_INSIGHT_CHANGE_FEED=true  # Default: true

# Enable/disable nightly batch recomputation
ENABLE_INSIGHT_NIGHTLY_BATCH=true  # Default: true

# Batch size for nightly recomputation
INSIGHT_BATCH_SIZE=100  # Default: 100

# Poll interval for Change Feed (milliseconds)
INSIGHT_POLL_INTERVAL_MS=5000  # Default: 5000
```

**Used by:**
- `InsightComputationService` - KPI computation

---

### Metrics Shard Service

```bash
# Enable/disable metrics-as-shards recording
ENABLE_METRICS_SHARDS=true  # Default: true
```

**Used by:**
- `MetricsShardService` - Observability metrics

---

## 📝 Environment Variables by Component

### API Service (`apps/api`)

#### Required
- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `COSMOS_DB_DATABASE`
- `AZURE_SERVICE_BUS_CONNECTION_STRING` (if using Service Bus features)

#### Optional
- `AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE` (default: `ingestion-events`)
- `AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE` (default: `shard-emission`)
- `AZURE_SERVICE_BUS_ENRICHMENT_JOBS_QUEUE` (default: `enrichment-jobs`)
- `AZURE_SERVICE_BUS_SHARD_CREATED_QUEUE` (default: `shard-created`)
- `ENABLE_INSIGHT_CHANGE_FEED` (default: `true`)
- `ENABLE_INSIGHT_NIGHTLY_BATCH` (default: `true`)
- `INSIGHT_BATCH_SIZE` (default: `100`)
- `INSIGHT_POLL_INTERVAL_MS` (default: `5000`)
- `ENABLE_METRICS_SHARDS` (default: `true`)

---

### Ingestion Functions (`src/functions/ingestion-*.ts`)

#### Required
- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `COSMOS_DB_DATABASE`
- `AZURE_SERVICE_BUS_CONNECTION_STRING`
- `AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE` (or use default)

#### Optional
- `AZURE_KEY_VAULT_URL` (if using Key Vault for credentials)

---

### Normalization Processor (`src/functions/normalization-processor.ts`)

#### Required
- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `COSMOS_DB_DATABASE`
- `AZURE_SERVICE_BUS_CONNECTION_STRING`
- `AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE` (or use default)
- `AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE` (or use default)

---

### Enrichment Processor (`src/functions/enrichment-processor.ts`)

#### Required
- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `COSMOS_DB_DATABASE`
- `AZURE_SERVICE_BUS_CONNECTION_STRING`
- `AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE` (or use default)
- `AZURE_SERVICE_BUS_ENRICHMENT_JOBS_QUEUE` (or use default)

#### Optional
- `AZURE_OPENAI_ENDPOINT` (for LLM-based entity extraction)
- `AZURE_OPENAI_API_KEY` (for LLM-based entity extraction)
- `AZURE_OPENAI_DEPLOYMENT_NAME` (for LLM-based entity extraction)
- `AZURE_OPENAI_API_VERSION` (for LLM-based entity extraction)

**Note:** If Azure OpenAI is not configured, enrichment will use only structured field extraction (CRM data).

---

### Project Auto-Attachment Processor (`src/functions/project-auto-attachment-processor.ts`)

#### Required
- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `COSMOS_DB_DATABASE`
- `AZURE_SERVICE_BUS_CONNECTION_STRING`
- `AZURE_SERVICE_BUS_SHARD_CREATED_QUEUE` (or use default)

---

## 🔐 Security Best Practices

### Environment Variable Storage

1. **Development:**
   - Use `.env` files (not committed to git)
   - Use `.env.example` for documentation

2. **Staging/Production:**
   - Use Azure Key Vault
   - Use Azure App Service Configuration
   - Use Azure Functions Application Settings
   - Never commit secrets to git

### Secret Rotation

- Rotate `COSMOS_DB_KEY` regularly
- Rotate `AZURE_SERVICE_BUS_CONNECTION_STRING` regularly
- Rotate `AZURE_OPENAI_API_KEY` regularly
- Use managed identities where possible

---

## 📋 Environment Setup Checklist

### For API Service
- [ ] `COSMOS_DB_ENDPOINT` configured
- [ ] `COSMOS_DB_KEY` configured
- [ ] `COSMOS_DB_DATABASE` configured
- [ ] `AZURE_SERVICE_BUS_CONNECTION_STRING` configured (if using Service Bus)
- [ ] Optional: Queue names configured (or defaults used)
- [ ] Optional: Insight computation settings configured
- [ ] Optional: Metrics shards enabled

### For Azure Functions
- [ ] `COSMOS_DB_ENDPOINT` configured
- [ ] `COSMOS_DB_KEY` configured
- [ ] `COSMOS_DB_DATABASE` configured
- [ ] `AZURE_SERVICE_BUS_CONNECTION_STRING` configured
- [ ] Queue names configured (or defaults used)
- [ ] Optional: `AZURE_OPENAI_*` configured (for enrichment)
- [ ] Optional: `AZURE_KEY_VAULT_URL` configured (for credentials)

---

## 🧪 Testing Environment Variables

### Verify Configuration

```bash
# Check if required variables are set
echo $COSMOS_DB_ENDPOINT
echo $COSMOS_DB_KEY
echo $AZURE_SERVICE_BUS_CONNECTION_STRING

# Test Service Bus connection
az servicebus namespace show \
  --resource-group <resource-group> \
  --name <namespace-name>

# Test Cosmos DB connection
az cosmosdb database show \
  --account-name <account-name> \
  --name <database-name>
```

---

## 📚 Related Documentation

- **[phase-2-deployment-guide.md](./phase-2-deployment-guide.md)** - Deployment instructions
- **[phase-2-api-endpoints.md](./phase-2-api-endpoints.md)** - API endpoints reference
- **[phase-2-known-limitations.md](./phase-2-known-limitations.md)** - Known limitations

---

## ✅ Summary

### Required Variables
- Cosmos DB connection (endpoint, key, database)
- Service Bus connection string

### Optional Variables
- Service Bus queue names (defaults provided)
- Azure OpenAI (for LLM enrichment)
- Azure Key Vault (for credential storage)
- Service feature flags (insights, metrics)

**All optional variables have sensible defaults. Only Cosmos DB and Service Bus are required for basic functionality.**

---

**Last Updated:** Implementation Complete  
**Status:** ✅ **CONFIGURATION DOCUMENTED**






