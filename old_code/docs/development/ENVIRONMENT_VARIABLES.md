# Environment Variables Reference

## Overview

This document lists all environment variables required and optional for each service in the Castiel platform.

## Quick Reference

### Required for All Services

- `COSMOS_DB_ENDPOINT` - Azure Cosmos DB endpoint URL
- `COSMOS_DB_KEY` - Azure Cosmos DB primary key
- `COSMOS_DB_DATABASE` - Cosmos DB database name (default: `castiel`)
- Redis configuration (choose one):
  - `REDIS_URL` - Full Redis connection string (recommended)
  - OR `REDIS_HOST` + `REDIS_PORT` + `REDIS_PASSWORD` - Individual Redis components

### Optional for All Services

- `NODE_ENV` - Environment name (`development`, `production`, default: `production`)
- `PORT` - Service port (default: `8080` for workers, `3001` for API, `3000` for web)
- `MONITORING_ENABLED` - Enable monitoring (default: `true`)
- `MONITORING_PROVIDER` - Monitoring provider (default: `azure`)
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - Azure Application Insights connection string (required if monitoring enabled)
- `MONITORING_SAMPLING_RATE` - Monitoring sampling rate (default: `1.0`)

---

## API Service (`apps/api`)

### Required

- `COSMOS_DB_ENDPOINT` - Azure Cosmos DB endpoint
- `COSMOS_DB_KEY` - Azure Cosmos DB primary key
- `COSMOS_DB_DATABASE` - Database name
- `JWT_ACCESS_SECRET` - JWT access token secret (minimum 32 characters)
- Redis configuration (see above)

### Optional

- `REDIS_HOST` - Redis hostname (if not using REDIS_URL)
- `REDIS_PORT` - Redis port (default: `6379`)
- `REDIS_PASSWORD` - Redis password (if not using REDIS_URL)
- `REDIS_TLS_ENABLED` - Enable TLS for Redis (default: `false`)
- `KEY_VAULT_URL` - Azure Key Vault URL
- `KEY_VAULT_ENABLED` - Enable Key Vault (default: `false`)
- `FRONTEND_URL` - Frontend application URL (required in production)
- `JWT_ACCESS_TOKEN_EXPIRY` - JWT access token expiry (default: `9h`)
- `JWT_REFRESH_TOKEN_EXPIRY` - JWT refresh token expiry (default: `7d`)
- `LOG_LEVEL` - Logging level (default: `info`)

---

## Web Service (`apps/web`)

### Required

- `NEXT_PUBLIC_API_URL` - Public API URL (e.g., `http://localhost:3001`)

### Optional

- `NODE_ENV` - Environment (default: `production`)
- `PORT` - Server port (default: `3000`)

---

## Workers-Sync Service (`apps/workers-sync`)

### Required

- `COSMOS_DB_ENDPOINT` - Azure Cosmos DB endpoint
- `COSMOS_DB_KEY` - Azure Cosmos DB primary key
- `COSMOS_DB_DATABASE` - Database name (default: `castiel`)
- Redis configuration (see above)

### Optional

- `KEY_VAULT_URL` - Azure Key Vault URL
- `SYNC_BATCH_SIZE` - Sync batch size (default: `100`)
- `SYNC_MAX_RETRIES` - Maximum sync retries (default: `3`)
- `TOKEN_EXPIRY_THRESHOLD_MINUTES` - Token expiry threshold (default: `360`)
- `MAX_REFRESH_RETRIES` - Maximum token refresh retries (default: `3`)
- `CONNECTION_UNUSED_DAYS_THRESHOLD` - Unused connection threshold (default: `90`)
- `CONNECTION_EXPIRED_UNUSED_DAYS_THRESHOLD` - Expired unused threshold (default: `30`)
- `CONNECTION_ARCHIVE_INSTEAD_OF_DELETE` - Archive instead of delete (default: `true`)
- `TEAM_SYNC_SCHEDULE` - Team sync cron schedule (default: `0 2 * * *`)
- `TEAM_SYNC_BATCH_SIZE` - Team sync batch size (default: `50`)
- `TEAM_SYNC_MAX_RETRIES` - Team sync max retries (default: `3`)

---

## Workers-Processing Service (`apps/workers-processing`)

### Required

- `COSMOS_DB_ENDPOINT` - Azure Cosmos DB endpoint
- `COSMOS_DB_KEY` - Azure Cosmos DB primary key
- `COSMOS_DB_DATABASE` - Database name (default: `castiel`)
- Redis configuration (see above)

### Optional

- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint (required for embeddings/enrichment)
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key (required for embeddings/enrichment)
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` - Embedding deployment name (default: `text-embedding-ada-002`)
- `AZURE_OPENAI_DEPLOYMENT_NAME` - OpenAI deployment name (default: `gpt-4o`)
- `EMBEDDING_DIMENSIONS` - Embedding dimensions (default: `1536`)
- `COSMOS_DB_SHARDS_CONTAINER` - Shards container name (default: `shards`)
- `BLOB_STORAGE_CONNECTION_STRING` - Azure Blob Storage connection string
- `MAX_FILE_SIZE_MB` - Maximum file size in MB (default: `100`)
- `ENABLE_VIRUS_SCAN` - Enable virus scanning (default: `true`)
- `KEY_VAULT_URL` - Azure Key Vault URL
- `CREDENTIAL_ENCRYPTION_KEY` - Credential encryption key
- `ENCRYPTION_KEY` - General encryption key (fallback)
- `DIGEST_BATCH_SIZE` - Digest batch size (default: `50`)
- `BASE_URL` - Base URL for notifications

---

## Workers-Ingestion Service (`apps/workers-ingestion`)

### Required

- `COSMOS_DB_ENDPOINT` - Azure Cosmos DB endpoint
- `COSMOS_DB_KEY` - Azure Cosmos DB primary key
- `COSMOS_DB_DATABASE` - Database name (default: `castiel`)
- Redis configuration (see above)

### Optional

- `KEY_VAULT_URL` - Azure Key Vault URL

---

## Validation

All worker services validate required environment variables at startup. If any required variables are missing, the service will:

1. Display clear error messages listing all missing variables
2. Exit with code 1
3. Prevent the service from starting with invalid configuration

### Example Error Output

```
❌ Environment validation failed:
  - Missing required environment variable: COSMOS_DB_ENDPOINT
  - Missing required environment variable: COSMOS_DB_KEY
  - Missing Redis configuration: Either REDIS_URL or REDIS_HOST must be set

Please set the required environment variables and try again.
```

---

## Environment-Specific Configuration

### Development (Local)

Use `.env` file in the project root:

```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env
```

### Hybrid Development (Local Containers + Azure Services)

Use `.env` file pointing to Azure services:

```bash
# Azure Cosmos DB
COSMOS_DB_ENDPOINT=https://castiel-cosmos-dev.documents.azure.com:443/
COSMOS_DB_KEY=your-cosmos-db-key
COSMOS_DB_DATABASE=castiel

# Azure Cache for Redis
REDIS_URL=rediss://castiel-redis-dev.redis.cache.windows.net:6380
# OR
REDIS_HOST=castiel-redis-dev.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your-redis-key
REDIS_TLS_ENABLED=true

# Azure Key Vault
KEY_VAULT_URL=https://castiel-kv-dev.vault.azure.net/
```

### Production (Azure Container Apps)

Environment variables are set via:
- Terraform (infrastructure as code)
- Azure Container Apps environment variables
- Azure Key Vault (for secrets)

See [Container Apps Deployment Guide](../ci-cd/CONTAINER_APPS_DEPLOYMENT.md) for details.

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env` files locally (add to `.gitignore`)
   - Use Azure Key Vault for production secrets

2. **Rotate secrets regularly**
   - Cosmos DB keys
   - Redis passwords
   - JWT secrets
   - API keys

3. **Use managed identities when possible**
   - Azure Container Apps support managed identities
   - Reduces need for explicit credentials

4. **Validate in production**
   - All services validate required variables at startup
   - Missing variables cause immediate failure (fail-fast)

---

## Related Documentation

- [Hybrid Local-Azure Setup Guide](./HYBRID_LOCAL_AZURE_SETUP.md)
- [Container Apps Deployment Guide](../ci-cd/CONTAINER_APPS_DEPLOYMENT.md)
- [Health Checks Guide](../operations/HEALTH_CHECKS.md)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Environment variables fully documented

#### Implemented Features (✅)

- ✅ Comprehensive environment variable reference
- ✅ Service-specific variables documented
- ✅ Required vs optional variables clearly marked
- ✅ Validation at startup

#### Known Limitations

- ⚠️ **Environment Variable Scattering** - Environment variables may be scattered across multiple files
  - **Code Reference:**
    - Variables may be defined in multiple places
  - **Recommendation:**
    1. Centralize environment variable definitions
    2. Create single source of truth
    3. Document all variable locations

- ⚠️ **Variable Validation** - Some variables may not be validated
  - **Recommendation:**
    1. Add validation for all variables
    2. Provide clear error messages
    3. Document validation rules

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Development Guide](../DEVELOPMENT.md) - Development setup
- [Hybrid Setup Guide](./HYBRID_LOCAL_AZURE_SETUP.md) - Hybrid setup



