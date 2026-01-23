# Hybrid Local-Azure Development Setup

This guide explains how to run the Castiel application locally using Docker Compose while connecting to Azure-managed services (Cosmos DB, Redis Cache, Key Vault, Blob Storage, Application Insights).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Local Development                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   API    │  │   Web    │  │ Workers  │             │
│  │ Container│  │Container │  │Containers│             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │             │                     │
│       └─────────────┴─────────────┘                     │
│                    │                                     │
└────────────────────┼─────────────────────────────────────┘
                     │
                     │ (via .env connection strings)
                     │
┌────────────────────┼─────────────────────────────────────┐
│                 Azure Cloud Services                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Cosmos DB   │  │ Redis Cache  │  │  Key Vault   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │Blob Storage  │  │ App Insights │                     │
│  └──────────────┘  └──────────────┘                     │
└──────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required

- **Azure Account and Subscription**: Active Azure subscription with appropriate permissions
- **Azure CLI**: Installed and configured (`az login`)
- **Terraform**: >= 1.0 installed for infrastructure deployment
- **Docker**: >= 20.10 installed
- **Docker Compose**: >= 2.0 installed
- **Node.js**: >= 20.0.0 (for local development tools)
- **pnpm**: >= 9.0.0 (package manager)

### Optional

- **VS Code**: Recommended IDE
- **Azure Storage Explorer**: For managing Blob Storage

## Step 1: Deploy Azure Infrastructure

### 1.1 Navigate to Terraform Directory

```bash
cd infrastructure/terraform
```

### 1.2 Initialize Terraform

```bash
terraform init
```

### 1.3 Review and Apply Infrastructure

```bash
# Review what will be created
terraform plan

# Apply infrastructure (creates all Azure services)
terraform apply
```

This will create:
- Resource Group
- Cosmos DB Account
- Azure Cache for Redis (Basic tier for dev)
- Key Vault
- Application Insights
- Storage Account (for Functions/Blob Storage)

### 1.4 Get Connection Strings

After deployment, retrieve connection strings:

```bash
# Cosmos DB
terraform output cosmos_db_endpoint
terraform output cosmos_db_primary_key

# Redis
terraform output redis_hostname
terraform output redis_primary_access_key
terraform output redis_connection_string  # Pre-formatted connection string

# Key Vault
terraform output key_vault_uri

# Application Insights
terraform output app_insights_connection_string

# Blob Storage (if available)
terraform output blob_storage_connection_string
```

## Step 2: Configure Local Environment

### 2.1 Copy Environment Template

```bash
cd /path/to/castiel
cp .env.example .env
```

### 2.2 Fill in Azure Service Connection Strings

Edit `.env` and fill in the values from Step 1.4:

```bash
# Azure Cosmos DB
COSMOS_DB_ENDPOINT=https://castiel-cosmos-dev-xxxxxx.documents.azure.com:443/
COSMOS_DB_KEY=<from terraform output>

# Azure Cache for Redis
REDIS_URL=rediss://:<password>@<hostname>:6380
# OR use individual components:
# REDIS_HOST=castiel-redis-dev-xxxxxx.redis.cache.windows.net
# REDIS_PORT=6380
# REDIS_PASSWORD=<from terraform output>

# Azure Key Vault
KEY_VAULT_URL=https://castiel-kv-dev-xxxxxx.vault.azure.net/

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=<from terraform output>

# Blob Storage
BLOB_STORAGE_CONNECTION_STRING=<from Azure Portal or terraform output>

# Azure OpenAI (if using)
AZURE_OPENAI_ENDPOINT=https://castiel-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-key>
```

### 2.3 Configure Azure CLI Authentication

Key Vault access from local containers requires Azure CLI authentication:

```bash
# Login to Azure
az login

# Verify your subscription
az account show

# Set default subscription (if needed)
az account set --subscription "<subscription-id>"
```

The `DefaultAzureCredential` used by the application will automatically use your Azure CLI credentials.

## Step 3: Start Local Containers

### 3.1 Start All Services

```bash
docker-compose up
```

This starts:
- `api`: Main API service (port 3001)
- `web`: Next.js web application (port 3000)
- `workers-sync`: Sync workers
- `workers-processing`: Processing workers
- `workers-ingestion`: Ingestion workers

### 3.2 Verify Connections

Check container logs to verify connections:

```bash
# Check API logs
docker-compose logs api

# Check worker logs
docker-compose logs workers-processing

# Check all logs
docker-compose logs
```

Look for:
- ✅ Cosmos DB connection successful
- ✅ Redis connection successful
- ✅ Key Vault access successful (may show warnings if not authenticated)
- ✅ Application Insights initialized

## Step 4: Access the Application

- **Web Application**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **API Documentation**: http://localhost:3001/docs (if Swagger is enabled)

## Troubleshooting

### Issue: Cannot connect to Cosmos DB

**Symptoms**: `ECONNREFUSED` or authentication errors

**Solutions**:
1. Verify `COSMOS_DB_ENDPOINT` and `COSMOS_DB_KEY` are correct
2. Check Cosmos DB firewall rules (should allow your IP or `0.0.0.0` for dev)
3. Verify Cosmos DB account is running: `az cosmosdb show --name <account-name>`

### Issue: Cannot connect to Redis

**Symptoms**: `ECONNREFUSED` or `NOAUTH` errors

**Solutions**:
1. Verify `REDIS_URL` format: `rediss://:password@hostname:6380`
2. Check Redis firewall rules (should allow your IP)
3. Verify Redis cache is running: `az redis show --name <cache-name>`
4. Ensure TLS is enabled (port 6380, not 6379)

### Issue: Key Vault access denied

**Symptoms**: `403 Forbidden` or `Access denied` errors

**Solutions**:
1. Ensure Azure CLI is authenticated: `az login`
2. Verify your user has Key Vault access:
   ```bash
   az keyvault show --name <vault-name>
   ```
3. Check Key Vault access policies in Azure Portal
4. For local development, you may need to add your user to Key Vault access policies

### Issue: Blob Storage connection fails

**Symptoms**: `InvalidConnectionString` or storage errors

**Solutions**:
1. Verify `BLOB_STORAGE_CONNECTION_STRING` format
2. Check storage account exists and is accessible
3. Verify containers exist: `documents`, `quarantine`

### Issue: Containers fail to start

**Symptoms**: Exit code 1 or startup errors

**Solutions**:
1. Check logs: `docker-compose logs <service-name>`
2. Verify all required environment variables are set
3. Ensure Docker has enough resources (memory, CPU)
4. Try rebuilding: `docker-compose build --no-cache`

## Cost Optimization Tips

### Development Environment

1. **Use Basic Tier Services**:
   - Redis: Basic C0 (cheapest)
   - Cosmos DB: Serverless (pay-per-request)
   - Storage: LRS (locally redundant)

2. **Scale Down When Not in Use**:
   ```bash
   # Stop all containers
   docker-compose down
   
   # Scale down Azure services (via Azure Portal or CLI)
   ```

3. **Monitor Usage**:
   - Check Azure Cost Management dashboard
   - Set up budget alerts
   - Review usage weekly

4. **Use Azure Dev/Test Pricing**:
   - Some services offer discounted dev/test pricing
   - Check Azure pricing calculator

### Estimated Monthly Costs (Dev Environment)

- Cosmos DB (Serverless): ~$5-20/month (depending on usage)
- Redis Cache (Basic C0): ~$15/month
- Key Vault (Standard): ~$0.03/10K operations
- Application Insights: ~$2-5/month (first 5GB free)
- Blob Storage: ~$0.02/GB/month
- **Total**: ~$25-50/month for development

## Best Practices

1. **Never Commit `.env`**: Already in `.gitignore`, but double-check
2. **Rotate Secrets Regularly**: Update connection strings periodically
3. **Use Separate Azure Subscriptions**: Dev vs Production
4. **Monitor Resource Usage**: Set up Azure alerts
5. **Clean Up Unused Resources**: Delete resources when not needed

## Next Steps

- [Development Guide](../DEVELOPMENT.md) - General development workflow
- [Architecture Documentation](../ARCHITECTURE.md) - System architecture
- [API Documentation](../api/README.md) - API reference
- [Terraform Deployment Guide](../infrastructure/TERRAFORM_DEPLOYMENT.md) - Infrastructure details

## Additional Resources

- [Azure Cosmos DB Documentation](https://docs.microsoft.com/azure/cosmos-db/)
- [Azure Cache for Redis Documentation](https://docs.microsoft.com/azure/azure-cache-for-redis/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/azure/key-vault/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Hybrid local-Azure setup fully documented

#### Implemented Features (✅)

- ✅ Complete setup guide
- ✅ Infrastructure deployment steps
- ✅ Environment configuration
- ✅ Docker Compose setup
- ✅ Troubleshooting guide

#### Known Limitations

- ⚠️ **Setup Complexity** - Setup may be complex for new developers
  - **Recommendation:**
    1. Simplify setup process
    2. Add setup verification scripts
    3. Document common issues

- ⚠️ **Cost Management** - Azure costs may accumulate during development
  - **Recommendation:**
    1. Document cost optimization
    2. Add cost monitoring
    3. Provide cleanup scripts

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Environment variable reference
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview



