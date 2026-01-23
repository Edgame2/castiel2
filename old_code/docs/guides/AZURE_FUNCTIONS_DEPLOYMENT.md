# Azure Functions Deployment Guide

**Last Updated**: December 2025  
**Status**: Complete Deployment Guide

---

## Overview

This guide provides step-by-step instructions for deploying Azure Functions to Azure, including infrastructure setup, environment variable configuration, and code deployment.

---

## Prerequisites

1. **Azure CLI** installed and authenticated
   ```bash
   az login
   az account set --subscription <subscription-id>
   ```

2. **Azure Functions Core Tools** installed
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```

3. **Terraform** >= 1.0 (for infrastructure deployment)
   ```bash
   terraform --version
   ```

4. **Node.js 20+** and **pnpm** installed

5. **Azure Subscription** with appropriate permissions

---

## Step 1: Deploy Infrastructure (Terraform)

The infrastructure (Function App, Service Bus, Cosmos DB, etc.) is managed via Terraform.

### 1.1 Navigate to Terraform Directory

```bash
cd terraform
```

### 1.2 Initialize Terraform

```bash
terraform init
```

### 1.3 Review Infrastructure Plan

**Development:**
```bash
terraform plan -var-file=terraform.dev.tfvars
```

**Production:**
```bash
terraform plan -var-file=terraform.prod.tfvars
```

### 1.4 Deploy Infrastructure

**Development:**
```bash
terraform apply -var-file=terraform.dev.tfvars
```

**Production:**
```bash
terraform apply -var-file=terraform.prod.tfvars
```

This creates:
- ✅ Resource Group
- ✅ Storage Account (for Function App)
- ✅ Function App Plan (Consumption Y1 for dev, Premium EP1 for prod)
- ✅ Linux Function App
- ✅ Service Bus Namespace + Queues
- ✅ Cosmos DB Account
- ✅ Redis Cache
- ✅ Key Vault
- ✅ Application Insights
- ✅ Managed Identity with proper role assignments

### 1.5 Get Deployment Outputs

```bash
# Get Function App name
terraform output functions_app_name

# Get Service Bus connection string
terraform output service_bus_connection_string

# Get all outputs
terraform output
```

---

## Step 2: Configure Environment Variables

Environment variables are automatically set by Terraform in the Function App's `app_settings`. However, you may need to add additional secrets to Key Vault.

### 2.1 Environment Variables Set by Terraform

The following are automatically configured in `infrastructure/terraform/functions.tf`:

#### Core Configuration
- `FUNCTIONS_WORKER_RUNTIME` = `node`
- `WEBSITE_NODE_DEFAULT_VERSION` = `~20`
- `WEBSITE_RUN_FROM_PACKAGE` = `1`
- `NODE_ENV` = `development` or `production`

#### Cosmos DB
- `COSMOS_DB_ENDPOINT` - Cosmos DB endpoint
- `COSMOS_DB_KEY` - Cosmos DB primary key
- `COSMOS_DB_DATABASE` - Database name (usually `castiel`)
- `COSMOS_DATABASE` - Alias for compatibility

#### Service Bus
- `AZURE_SERVICE_BUS_CONNECTION_STRING` - Service Bus connection string
- `SERVICE_BUS_CONNECTION_STRING` - Alias for compatibility

#### Queue Names
- `AZURE_SERVICE_BUS_CONTENT_GENERATION_QUEUE` = `content-generation-jobs`
- `SYNC_INBOUND_SCHEDULED_QUEUE` = `sync-inbound-scheduled`
- `SYNC_INBOUND_WEBHOOK_QUEUE` = `sync-inbound-webhook`
- `SYNC_OUTBOUND_QUEUE` = `sync-outbound`

#### Redis
- `REDIS_URL` - Redis connection string (TLS enabled)

#### Key Vault
- `KEY_VAULT_URL` - Key Vault URI
- `KEY_VAULT_ENABLED` = `true`

#### Application Insights
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - App Insights connection
- `MONITORING_ENABLED` = `true`
- `MONITORING_PROVIDER` = `azure`

#### Sync Configuration
- `SYNC_BATCH_SIZE` = `100`
- `SYNC_MAX_RETRIES` = `3`

#### Logging
- `LOG_LEVEL` = `info` (production) or `debug` (development)

### 2.2 Additional Environment Variables (Optional)

These need to be added manually via Azure Portal or Azure CLI:

#### Azure OpenAI (for Enrichment Processor)
```bash
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings \
    AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/ \
    AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o \
    AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

**Note:** `AZURE_OPENAI_API_KEY` should be stored in Key Vault and referenced:
```bash
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings \
    AZURE_OPENAI_API_KEY=@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/AZURE_OPENAI_API_KEY/)
```

#### Phase 2 Integration Queues (if using Phase 2 features)
```bash
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings \
    AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE=ingestion-events \
    AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE=shard-emission \
    AZURE_SERVICE_BUS_ENRICHMENT_JOBS_QUEUE=enrichment-jobs \
    AZURE_SERVICE_BUS_SHARD_CREATED_QUEUE=shard-created
```

### 2.3 Add Secrets to Key Vault

Add secrets that should be referenced via Key Vault:

```bash
# Azure OpenAI API Key
az keyvault secret set \
  --vault-name <vault-name> \
  --name AZURE_OPENAI_API_KEY \
  --value <api-key>

# Google OAuth credentials
az keyvault secret set \
  --vault-name <vault-name> \
  --name GOOGLE-CLIENT-ID \
  --value <client-id>

az keyvault secret set \
  --vault-name <vault-name> \
  --name GOOGLE-CLIENT-SECRET \
  --value <client-secret>

# SendGrid API Key
az keyvault secret set \
  --vault-name <vault-name> \
  --name SENDGRID-API-KEY \
  --value <api-key>
```

**Note:** The Function App's managed identity already has Key Vault access permissions configured by Terraform.

---

## Step 3: Build Functions

### 3.1 Navigate to Functions Directory

```bash
cd functions
```

### 3.2 Install Dependencies

```bash
pnpm install --frozen-lockfile
```

### 3.3 Build Functions

```bash
pnpm build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

---

## Step 4: Deploy Functions Code

### Option A: Using Azure Functions Core Tools (Recommended)

```bash
# Deploy all functions
func azure functionapp publish <function-app-name>

# Example for development
func azure functionapp publish castiel-functions-dev

# Example for production
func azure functionapp publish castiel-functions-production
```

**Note:** The Function App name can be retrieved from Terraform:
```bash
terraform output functions_app_name
```

### Option B: Using Azure CLI (Alternative)

```bash
# Create deployment package
cd functions
zip -r ../functions-deploy.zip dist package.json pnpm-lock.yaml node_modules

# Deploy to Function App
az functionapp deployment source config-zip \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --src ../functions-deploy.zip
```

### Option C: Using GitHub Actions (CI/CD)

If you have GitHub Actions configured, pushing to the appropriate branch will trigger automatic deployment:

- `develop` branch → deploys to development
- `main` branch → deploys to production (with approval)

**See [GitHub Actions Setup Guide](./GITHUB_ACTIONS_FUNCTIONS_SETUP.md) for detailed setup instructions.**

---

## Step 5: Verify Deployment

### 5.1 Check Function App Status

```bash
az functionapp show \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --query state
```

Should return: `"Running"`

### 5.2 List Deployed Functions

```bash
az functionapp function list \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --query "[].name"
```

Expected functions:
- `sync-scheduler`
- `sync-inbound-worker`
- `sync-outbound-worker`
- `token-refresher`
- `connection-cleanup`
- `webhook-receiver`
- `content-generation-worker`
- `ingestion-salesforce`
- `ingestion-gdrive`
- `ingestion-slack`
- `normalization-processor`
- `enrichment-processor`
- `project-auto-attachment-processor`
- `opportunity-auto-linking-processor`
- `risk-evaluation-processor`
- `documentCheck`
- `documentChunking`
- `embeddingWorker`
- `digest-processor`

### 5.3 View Function App Logs

```bash
# Stream logs
az functionapp log tail \
  --resource-group <resource-group> \
  --name <function-app-name>

# View recent logs
az functionapp log show \
  --resource-group <resource-group> \
  --name <function-app-name>
```

### 5.4 Verify Environment Variables

```bash
az functionapp config appsettings list \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --query "[?name=='COSMOS_DB_ENDPOINT' || name=='AZURE_SERVICE_BUS_CONNECTION_STRING']"
```

### 5.5 Test a Function (HTTP Trigger)

If you have HTTP-triggered functions, test them:

```bash
# Get function URL
FUNCTION_URL=$(az functionapp function show \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --function-name webhook-receiver \
  --query invokeUrlTemplate -o tsv)

# Test the function
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

---

## Step 6: Verify Service Bus Queues

Ensure all required queues exist:

```bash
# List all queues
az servicebus queue list \
  --resource-group <resource-group> \
  --namespace-name <namespace-name> \
  --query "[].name"
```

Expected queues:
- `content-generation-jobs`
- `sync-inbound-scheduled`
- `sync-inbound-webhook`
- `sync-outbound`
- `ingestion-events` (if using Phase 2)
- `shard-emission` (if using Phase 2)
- `enrichment-jobs` (if using Phase 2)
- `shard-created` (if using Phase 2)
- `embedding-jobs`
- `document-chunk-jobs`

---

## Step 7: Verify Managed Identity Permissions

The Function App's managed identity should have:

1. **Key Vault Access** - Get/List secrets
2. **Service Bus Data Receiver** - Read from queues
3. **Cosmos DB Data Contributor** - Read/write to Cosmos DB

Verify permissions:

```bash
# Get Function App managed identity principal ID
PRINCIPAL_ID=$(az functionapp identity show \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --query principalId -o tsv)

# Check role assignments
az role assignment list \
  --assignee $PRINCIPAL_ID \
  --query "[].{Role:roleDefinitionName, Scope:scope}"
```

---

## Environment Variables Summary

### Required (Set by Terraform)

| Variable | Description | Example |
|----------|-------------|---------|
| `COSMOS_DB_ENDPOINT` | Cosmos DB endpoint | `https://castiel-cosmos.documents.azure.com:443/` |
| `COSMOS_DB_KEY` | Cosmos DB primary key | `[key]` |
| `COSMOS_DB_DATABASE` | Database name | `castiel` |
| `AZURE_SERVICE_BUS_CONNECTION_STRING` | Service Bus connection | `Endpoint=sb://...` |
| `REDIS_URL` | Redis connection string | `rediss://:...@...:6380` |
| `KEY_VAULT_URL` | Key Vault URI | `https://castiel-kv.vault.azure.net/` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection | `InstrumentationKey=...` |

### Optional (Manual Configuration)

| Variable | Description | Default |
|----------|-------------|---------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | - |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | - |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Deployment name | `gpt-4o` |
| `AZURE_SERVICE_BUS_INGESTION_EVENTS_QUEUE` | Ingestion queue | `ingestion-events` |
| `AZURE_SERVICE_BUS_SHARD_EMISSION_QUEUE` | Shard emission queue | `shard-emission` |
| `AZURE_SERVICE_BUS_ENRICHMENT_JOBS_QUEUE` | Enrichment queue | `enrichment-jobs` |
| `AZURE_SERVICE_BUS_SHARD_CREATED_QUEUE` | Shard created queue | `shard-created` |

---

## Troubleshooting

### Issue: Function App Not Starting

**Symptoms:**
- Functions not appearing in Azure Portal
- 500 errors when invoking functions

**Solutions:**
1. Check Function App status: `az functionapp show --name <name>`
2. View logs: `az functionapp log tail --name <name>`
3. Verify environment variables are set
4. Check managed identity permissions
5. Verify build output exists in `dist/` directory

### Issue: Functions Not Triggering

**Symptoms:**
- Timer functions not running
- Service Bus triggers not processing messages

**Solutions:**
1. Verify Service Bus connection string is correct
2. Check queue names match environment variables
3. Verify managed identity has Service Bus Data Receiver role
4. Check function bindings in code match queue names
5. View Application Insights for errors

### Issue: Cosmos DB Connection Errors

**Symptoms:**
- Functions failing with Cosmos DB errors
- Timeout errors

**Solutions:**
1. Verify `COSMOS_DB_ENDPOINT` and `COSMOS_DB_KEY` are correct
2. Check managed identity has Cosmos DB Data Contributor role
3. Verify database and container names exist
4. Check firewall rules (if enabled)
5. Verify network connectivity

### Issue: Key Vault Access Denied

**Symptoms:**
- Functions can't read secrets from Key Vault

**Solutions:**
1. Verify managed identity has Key Vault access policy
2. Check Key Vault access policy permissions (Get, List)
3. Verify Key Vault URL is correct
4. Check if Key Vault has network restrictions

---

## Quick Reference Commands

```bash
# Get Function App name
terraform output functions_app_name

# Deploy functions
cd functions && func azure functionapp publish $(terraform output -raw functions_app_name)

# View logs
az functionapp log tail --name <function-app-name> --resource-group <resource-group>

# List functions
az functionapp function list --name <function-app-name> --resource-group <resource-group>

# Update environment variable
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings KEY=VALUE

# Restart Function App
az functionapp restart --name <function-app-name> --resource-group <resource-group>
```

---

## Related Documentation

- [Terraform Deployment Guide](../infrastructure/TERRAFORM_DEPLOYMENT.md)
- [Phase 2 Deployment Guide](../features/integrations/phase-2-deployment-guide.md)
- [Environment Variables Reference](../features/integrations/phase-2-environment-variables.md)
- [Migration Complete Summary](../migration/MIGRATION_COMPLETE_SUMMARY.md) - Functions have been migrated to Container Apps

---

**Status**: ✅ Complete  
**Last Updated**: January 2025

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Azure Functions deployment guide fully documented

#### Implemented Features (✅)

- ✅ Terraform infrastructure deployment
- ✅ Environment variable configuration
- ✅ Function App deployment
- ✅ Service Bus setup
- ✅ Cosmos DB integration
- ✅ Monitoring setup

#### Known Limitations

- ⚠️ **Functions Migration** - Functions have been migrated to Container Apps (see migration summary)
  - **Code Reference:**
    - Migration complete summary referenced
  - **Recommendation:**
    1. Update documentation to reflect Container Apps deployment
    2. Document Container Apps deployment procedures
    3. Archive Functions deployment guide if no longer needed

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview
- [Migration Complete Summary](../migration/MIGRATION_COMPLETE_SUMMARY.md) - Functions migration

