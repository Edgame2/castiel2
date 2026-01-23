# Castiel API - Azure Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Deployment](#infrastructure-deployment)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Monitoring and Alerts](#monitoring-and-alerts)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## Overview

This guide covers the deployment of the Castiel API platform to Azure using Terraform for infrastructure and GitHub Actions for CI/CD.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Azure Front Door                        │
│                    (CDN + WAF + SSL)                        │
└──────────────┬──────────────────────────┬──────────────────┘
               │                          │
       ┌───────▼──────────┐      ┌───────▼──────────┐
       │  Auth Broker     │      │    Main API      │
       │  (App Service)   │      │  (App Service)   │
       └──────┬───────────┘      └─────────┬────────┘
              │                            │
    ┌─────────▼────────────────────────────▼─────────┐
    │          Azure Key Vault (Secrets)             │
    └────────────────────────────────────────────────┘
              │                            │
    ┌─────────▼──────────┐      ┌─────────▼──────────┐
    │   Cosmos DB        │      │  Redis Cache       │
    │ (Multi-region)     │      │  (Standard C2)     │
    └────────────────────┘      └────────────────────┘
              │
    ┌─────────▼──────────┐
    │ Application        │
    │   Insights         │
    └────────────────────┘
```

### Environments

- **Development**: Single region, Basic/Standard tiers, no slot swapping
- **Staging**: Production staging slot, full monitoring
- **Production**: Multi-region, Premium tiers, slot swapping, full DR

---

## Prerequisites

### Required Tools

1. **Terraform** >= 1.0
   ```bash
   # Install Terraform
   brew install terraform  # macOS
   # or
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. **Azure CLI** >= 2.50
   ```bash
   # Install Azure CLI
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

3. **Node.js** >= 20.x
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **pnpm** >= 8.x
   ```bash
   npm install -g pnpm
   ```

### Azure Setup

1. **Azure Subscription**
   - Active Azure subscription with Contributor access
   - Sufficient quota for App Services, Cosmos DB, Redis

2. **Service Principal** (for Terraform and GitHub Actions)
   ```bash
   # Create service principal
   az ad sp create-for-rbac \
     --name "castiel-deploy-sp" \
     --role Contributor \
     --scopes /subscriptions/<subscription-id> \
     --sdk-auth
   
   # Save output as AZURE_CREDENTIALS secret in GitHub
   ```

3. **Azure AD B2C Tenant** (from Task 3)
   - Tenant created and configured
   - User flows and custom policies set up
   - Redirect URIs registered

---

## Infrastructure Deployment

### Step 1: Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate
```

### Step 2: Plan Infrastructure (Development)

```bash
# Create execution plan
terraform plan \
  -var-file="terraform.dev.tfvars" \
  -out=tfplan-dev

# Review the plan
terraform show tfplan-dev
```

### Step 3: Deploy Infrastructure

```bash
# Apply the plan
terraform apply tfplan-dev

# Terraform will create:
# - Resource Group
# - Virtual Network (3 subnets)
# - App Service Plan (B2 for dev, P1v3 for prod)
# - 2 App Services (auth-broker, main-api)
# - Cosmos DB Account + 6 Containers
# - Redis Cache (Standard C2 - 2.5GB)
# - Key Vault with Managed Identity access
# - Application Insights + Log Analytics
# - Monitoring Alerts and Action Groups

# Deployment time: ~15-20 minutes
```

### Step 4: Save Terraform Outputs

```bash
# Get all outputs
terraform output

# Save important values
AUTH_BROKER_URL=$(terraform output -raw auth_broker_url)
MAIN_API_URL=$(terraform output -raw main_api_url)
KEY_VAULT_URI=$(terraform output -raw key_vault_uri)
COSMOS_DB_ENDPOINT=$(terraform output -raw cosmos_db_endpoint)

echo "Auth Broker: $AUTH_BROKER_URL"
echo "Main API: $MAIN_API_URL"
```

### Step 5: Deploy Production Infrastructure

```bash
# Plan production deployment
terraform plan \
  -var-file="terraform.prod.tfvars" \
  -out=tfplan-prod

# Apply (with approval)
terraform apply tfplan-prod

# Production includes:
# - Deployment slots (staging)
# - Auto-scaling (2-10 instances)
# - Multi-region Cosmos DB (East US + West US)
# - Redis backup to Storage Account
# - Availability tests (3 regions)
# - Enhanced monitoring and alerts
```

---

## Application Deployment

### Option 1: GitHub Actions (Recommended)

1. **Configure GitHub Secrets**

   Go to your GitHub repository → Settings → Secrets and add:

   ```
   AZURE_CREDENTIALS_DEV       # Service principal JSON for dev
   AZURE_CREDENTIALS_PROD      # Service principal JSON for prod
   SLACK_WEBHOOK               # (Optional) Slack notifications
   ```

2. **Trigger Deployment**

   ```bash
   # Push to develop branch → deploys to dev
   git push origin develop
   
   # Push to main branch → deploys to staging, then prod (requires approval)
   git push origin main
   
   # Manual deployment
   # Go to Actions → CI/CD Pipeline → Run workflow → Select environment
   ```

3. **Workflow Steps**
   - ✅ Install dependencies
   - ✅ Run type checking
   - ✅ Run linting
   - ✅ Run tests with coverage
   - ✅ Build TypeScript to JavaScript
   - ✅ Deploy to App Service
   - ✅ Health checks
   - ✅ Slot swapping (production only)

### Option 2: Azure CLI (Manual)

```bash
# Build applications
cd services/auth-broker
pnpm install --frozen-lockfile
pnpm run build

cd ../main-api
pnpm install --frozen-lockfile
pnpm run build

# Create deployment packages
cd services/auth-broker
zip -r auth-broker.zip dist package.json pnpm-lock.yaml

cd ../main-api
zip -r main-api.zip dist package.json pnpm-lock.yaml

# Deploy to Azure App Services
az webapp deployment source config-zip \
  --resource-group castiel-dev-rg \
  --name castiel-auth-dev \
  --src auth-broker.zip

az webapp deployment source config-zip \
  --resource-group castiel-dev-rg \
  --name castiel-api-dev \
  --src main-api.zip

# Restart services
az webapp restart --resource-group castiel-dev-rg --name castiel-auth-dev
az webapp restart --resource-group castiel-dev-rg --name castiel-api-dev
```

### Option 3: VS Code Extension

1. Install **Azure App Service** extension
2. Right-click on `services/auth-broker` → Deploy to Web App
3. Select subscription and app service
4. Confirm deployment

---

## Post-Deployment Configuration

### Step 1: Update Key Vault Secrets

```bash
# Login to Azure
az login

# Set Key Vault name
KEY_VAULT_NAME="castiel-kv-dev-abc123"

# Update SendGrid API key
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "SENDGRID-API-KEY" \
  --value "SG.your_sendgrid_api_key"

# Update OAuth secrets
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "GOOGLE-CLIENT-ID" \
  --value "your-google-client-id.apps.googleusercontent.com"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "GOOGLE-CLIENT-SECRET" \
  --value "your-google-client-secret"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "GITHUB-CLIENT-ID" \
  --value "your-github-client-id"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "GITHUB-CLIENT-SECRET" \
  --value "your-github-client-secret"

# Update OpenAI API key (for vectorization)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "OPENAI-API-KEY" \
  --value "sk-your-openai-api-key"
```

### Step 2: Configure Custom Domains (Production)

```bash
# Add custom domain to auth-broker
az webapp config hostname add \
  --resource-group castiel-production-rg \
  --webapp-name castiel-auth-production \
  --hostname auth.castiel.com

# Add custom domain to main-api
az webapp config hostname add \
  --resource-group castiel-production-rg \
  --webapp-name castiel-api-production \
  --hostname api.castiel.com

# Enable managed SSL certificates
az webapp config ssl bind \
  --resource-group castiel-production-rg \
  --name castiel-auth-production \
  --certificate-thumbprint auto \
  --ssl-type SNI

az webapp config ssl bind \
  --resource-group castiel-production-rg \
  --name castiel-api-production \
  --certificate-thumbprint auto \
  --ssl-type SNI
```

### Step 3: Initialize Database

```bash
# Option 1: Run initialization scripts
cd scripts
node init-database.js

# Option 2: Use Azure Portal Data Explorer
# Navigate to Cosmos DB → Data Explorer
# Run queries to create initial data
```

### Step 4: Warm Cache

```bash
# Call cache warming endpoint
curl -X POST https://api.castiel.com/api/admin/cache/warm \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "default-tenant-id",
    "resources": ["shards", "sso"]
  }'
```

### Step 5: Verify Deployment

```bash
# Health checks
curl https://auth.castiel.com/health
# Expected: {"status":"healthy","uptime":123,"timestamp":"..."}

curl https://api.castiel.com/health
# Expected: {"status":"healthy","uptime":456,"services":{"database":"healthy","redis":"healthy"}}

# Check endpoints
curl https://api.castiel.com/docs  # Swagger UI
curl https://api.castiel.com/graphql  # GraphQL Playground
```

---

## Monitoring and Alerts

### Application Insights

1. **Navigate to Application Insights**
   ```bash
   az monitor app-insights component show \
     --resource-group castiel-production-rg \
     --app castiel-ai-production
   ```

2. **Key Metrics to Monitor**
   - Request rate
   - Response time (P50, P95, P99)
   - Failure rate
   - Dependency calls (Cosmos DB, Redis)
   - Exceptions

3. **Custom Queries** (Kusto/KQL)
   ```kusto
   // Cache hit rate
   customMetrics
   | where name == "cache.hit" or name == "cache.miss"
   | summarize hits = sumif(value, name == "cache.hit"),
               misses = sumif(value, name == "cache.miss")
   | extend hitRate = hits / (hits + misses)
   
   // API response times by endpoint
   requests
   | summarize avg(duration), percentiles(duration, 50, 95, 99) by name
   | order by avg_duration desc
   
   // Top 10 slowest requests
   requests
   | top 10 by duration desc
   | project timestamp, name, duration, resultCode
   ```

### Alerts Configured

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| CPU > 80% | 15 min avg | Warning | Email |
| Memory > 80% | 15 min avg | Warning | Email |
| 5xx errors > 10 | 5 min total | Critical | Email + SMS |
| Response time > 2s | 15 min avg | Info | Email |
| Redis memory > 85% | 15 min avg | Warning | Email |
| Redis hit rate < 60% | 15 min avg | Info | Email |
| Availability < 99% | 5 min | Critical | Email + SMS |

### Dashboards

Create custom dashboards in Azure Portal:

1. Go to **Dashboard** → **New dashboard**
2. Add tiles:
   - Application Insights metrics
   - App Service metrics
   - Cosmos DB Request Units
   - Redis Cache metrics
3. Save as "Castiel Production Dashboard"

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails with "Resource Not Found"

**Cause**: App Service not ready or incorrect resource names

**Solution**:
```bash
# Check if App Service exists
az webapp show --resource-group castiel-dev-rg --name castiel-api-dev

# Check deployment logs
az webapp log tail --resource-group castiel-dev-rg --name castiel-api-dev
```

#### 2. Application Crashes on Startup

**Cause**: Missing environment variables or Key Vault access

**Solution**:
```bash
# Check App Service logs
az webapp log download \
  --resource-group castiel-dev-rg \
  --name castiel-api-dev \
  --log-file app-logs.zip

# Check Managed Identity has Key Vault access
az keyvault set-policy \
  --name castiel-kv-dev \
  --object-id <app-principal-id> \
  --secret-permissions get list
```

#### 3. Cosmos DB Connection Failures

**Cause**: Network restrictions or firewall rules

**Solution**:
```bash
# Add App Service subnet to Cosmos DB firewall
az cosmosdb network-rule add \
  --resource-group castiel-dev-rg \
  --name castiel-cosmos-dev \
  --subnet /subscriptions/<sub-id>/resourceGroups/castiel-dev-rg/providers/Microsoft.Network/virtualNetworks/castiel-vnet-dev/subnets/app-services-subnet
```

#### 4. Redis Connection Timeouts

**Cause**: Network latency or connection pool exhaustion

**Solution**:
```bash
# Check Redis metrics
az redis show \
  --resource-group castiel-dev-rg \
  --name castiel-redis-dev

# Increase connection pool size in app settings
az webapp config appsettings set \
  --resource-group castiel-dev-rg \
  --name castiel-api-dev \
  --settings REDIS_MAX_CONNECTIONS=50
```

#### 5. High Memory Usage

**Cause**: Memory leaks or insufficient App Service tier

**Solution**:
```bash
# Scale up App Service
az appservice plan update \
  --resource-group castiel-dev-rg \
  --name castiel-dev-asp \
  --sku P1v3

# Or scale out (more instances)
az appservice plan update \
  --resource-group castiel-dev-rg \
  --name castiel-dev-asp \
  --number-of-workers 3
```

---

## Rollback Procedures

### Automatic Rollback (Staging Slot)

Production deployments use Blue-Green deployment with staging slots:

```bash
# Swap slots (production → staging)
az webapp deployment slot swap \
  --resource-group castiel-production-rg \
  --name castiel-api-production \
  --slot production \
  --target-slot staging

# Verify production is now running previous version
curl https://api.castiel.com/health
```

### Manual Rollback (Previous Container)

```bash
# List deployment history
az webapp deployment list-publishing-profiles \
  --resource-group castiel-production-rg \
  --name castiel-api-production

# Restore previous deployment
az webapp deployment source config-zip \
  --resource-group castiel-production-rg \
  --name castiel-api-production \
  --src previous-deployment.zip
```

### Emergency Rollback via GitHub Actions

1. Go to **Actions** → **CI/CD Pipeline**
2. Click **Run workflow**
3. Select **Environment**: `rollback`
4. Confirm

This will automatically swap staging and production slots.

### Database Rollback

Cosmos DB uses continuous backup:

```bash
# List available restore points
az cosmosdb sql database list-restorable \
  --account-name castiel-cosmos-production

# Restore to point in time (last 30 days)
az cosmosdb restore \
  --resource-group castiel-production-rg \
  --account-name castiel-cosmos-production-restored \
  --source-account castiel-cosmos-production \
  --restore-timestamp "2025-11-17T10:00:00Z"
```

---

## Best Practices

✅ **Always deploy to staging first**
✅ **Run smoke tests before swapping to production**
✅ **Monitor Application Insights for 15 min after deployment**
✅ **Keep rollback plan ready**
✅ **Update Key Vault secrets securely**
✅ **Enable diagnostic logs in production**
✅ **Use Managed Identity for all Azure service connections**
✅ **Tag all resources appropriately**
✅ **Document custom configurations**
✅ **Test disaster recovery procedures quarterly**

---

## Additional Resources

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Cosmos DB Best Practices](https://docs.microsoft.com/azure/cosmos-db/)
- [Redis Cache Best Practices](https://docs.microsoft.com/azure/azure-cache-for-redis/)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [GitHub Actions for Azure](https://github.com/Azure/actions)

---

**Last Updated**: January 2025
**Maintained By**: Castiel DevOps Team

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Deployment guide fully documented

#### Implemented Features (✅)

- ✅ Terraform infrastructure deployment
- ✅ GitHub Actions CI/CD
- ✅ Azure CLI deployment
- ✅ Post-deployment configuration
- ✅ Monitoring and alerts setup
- ✅ Rollback procedures
- ✅ Multi-environment support

#### Known Limitations

- ⚠️ **Terraform State Management** - Remote state backend not configured (using local state)
  - **Code Reference:**
    - `infrastructure/terraform/main.tf` - Backend configuration commented out
  - **Recommendation:**
    1. Configure Azure Storage backend for Terraform state
    2. Enable state locking
    3. Document state management procedures

- ⚠️ **Infrastructure Testing** - Limited infrastructure testing and validation
  - **Recommendation:**
    1. Add Terraform validation tests
    2. Add infrastructure smoke tests
    3. Document testing procedures

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview
- [Terraform Documentation](../infrastructure/terraform/README.md) - Terraform deployment
