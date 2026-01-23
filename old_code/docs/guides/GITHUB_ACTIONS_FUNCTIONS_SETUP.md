# GitHub Actions Setup for Azure Functions Deployment

**Last Updated**: December 2025  
**Status**: Complete Setup Guide

---

## Overview

This guide explains how to configure GitHub Actions to automatically deploy Azure Functions to Azure when you push code to your repository.

---

## Prerequisites

1. **Azure Function App** already created in Azure
2. **Service Bus** already created in Azure
3. **GitHub Repository** with Actions enabled
4. **Azure Service Principal** with permissions to deploy to Function App

---

## Step 1: Create Azure Service Principal

If you don't already have a service principal, create one:

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription <subscription-id>

# Create service principal
az ad sp create-for-rbac \
  --name "castiel-github-actions" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id> \
  --sdk-auth
```

**Save the JSON output** - you'll need it for GitHub Secrets.

---

## Step 2: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Required Secrets

Add the following secrets:

#### For Development Environment

1. **`AZURE_CREDENTIALS_DEV`**
   - Value: The JSON output from the service principal creation
   - Example:
     ```json
     {
       "clientId": "...",
       "clientSecret": "...",
       "subscriptionId": "...",
       "tenantId": "..."
     }
     ```

2. **`AZURE_FUNCTION_APP_NAME_DEV`**
   - Value: Your development Function App name
   - Example: `castiel-functions-dev`

3. **`AZURE_RESOURCE_GROUP_DEV`**
   - Value: Your development resource group name
   - Example: `castiel-dev-rg`

#### For Production Environment

1. **`AZURE_CREDENTIALS_PROD`**
   - Value: The JSON output from the service principal creation (can be same or different)
   - Example: Same format as `AZURE_CREDENTIALS_DEV`

2. **`AZURE_FUNCTION_APP_NAME_PROD`**
   - Value: Your production Function App name
   - Example: `castiel-functions-production`

3. **`AZURE_RESOURCE_GROUP_PROD`**
   - Value: Your production resource group name
   - Example: `castiel-production-rg`

#### Optional Secrets

4. **`SLACK_WEBHOOK`** (Optional)
   - Value: Slack webhook URL for deployment notifications
   - Example: `https://hooks.slack.com/services/...`

---

## Step 3: Verify Workflow Configuration

The workflow file (`.github/workflows/deploy.yml`) is already configured with:

- ✅ Functions build step
- ✅ Functions deployment to development
- ✅ Functions deployment to staging
- ✅ Functions deployment to production (with slot swap)

### Workflow Triggers

The workflow automatically runs when:

- **Push to `develop` branch** → Deploys to development
- **Push to `main` branch** → Deploys to staging, then production (with approval)
- **Manual trigger** → Select environment via workflow_dispatch

---

## Step 4: Update Function App Names

If your Function App names don't match the secrets, you have two options:

### Option A: Update GitHub Secrets

Update the secrets in GitHub to match your actual Function App names.

### Option B: Update Workflow File

Edit `.github/workflows/deploy.yml` and replace the secret references with your actual Function App names:

```yaml
# Replace this:
app-name: ${{ secrets.AZURE_FUNCTION_APP_NAME_DEV }}

# With this:
app-name: your-actual-function-app-name
```

---

## Step 5: Configure Environment Variables in Azure

Since you already have the Function App created, make sure the following environment variables are set in Azure:

### Required Environment Variables

Set these in Azure Portal → Function App → Configuration → Application settings:

```bash
# Cosmos DB
COSMOS_DB_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_DB_KEY=<primary-key>
COSMOS_DB_DATABASE=castiel

# Service Bus
AZURE_SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=<key>

# Redis (if using)
REDIS_URL=rediss://:<key>@<hostname>:6380

# Key Vault (if using)
KEY_VAULT_URL=https://<vault-name>.vault.azure.net/
KEY_VAULT_ENABLED=true

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...

# Queue Names (defaults)
AZURE_SERVICE_BUS_CONTENT_GENERATION_QUEUE=content-generation-jobs
SYNC_INBOUND_SCHEDULED_QUEUE=sync-inbound-scheduled
SYNC_INBOUND_WEBHOOK_QUEUE=sync-inbound-webhook
SYNC_OUTBOUND_QUEUE=sync-outbound
```

### Set via Azure CLI

```bash
az functionapp config appsettings set \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --settings \
    COSMOS_DB_ENDPOINT="https://..." \
    COSMOS_DB_KEY="..." \
    COSMOS_DB_DATABASE="castiel" \
    AZURE_SERVICE_BUS_CONNECTION_STRING="Endpoint=sb://..."
```

---

## Step 6: Test the Deployment

### Test Development Deployment

1. **Push to develop branch:**
   ```bash
   git checkout develop
   git add .
   git commit -m "Test functions deployment"
   git push origin develop
   ```

2. **Monitor deployment:**
   - Go to GitHub → Actions tab
   - Watch the workflow run
   - Check for any errors

3. **Verify in Azure:**
   ```bash
   az functionapp function list \
     --resource-group <resource-group> \
     --name <function-app-name> \
     --query "[].name"
   ```

### Test Production Deployment

1. **Push to main branch:**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

2. **Approve production deployment:**
   - Go to GitHub → Actions
   - Click on the workflow run
   - Approve the production deployment when prompted

---

## Deployment Flow

```
┌─────────────────┐
│  Push to develop│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Functions │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deploy to Dev   │
└─────────────────┘

┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Functions │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deploy to       │
│ Staging Slot    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Approval       │
│  Required       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Swap Slots      │
│ (Staging → Prod)│
└─────────────────┘
```

---

## Troubleshooting

### Issue: "Function App not found"

**Error:**
```
Error: Function App '<name>' not found
```

**Solution:**
1. Verify the Function App name in GitHub secrets matches Azure
2. Check the service principal has Contributor role on the resource group
3. Verify you're using the correct subscription

### Issue: "Deployment failed"

**Error:**
```
Error: Failed to deploy function app
```

**Solution:**
1. Check Function App logs in Azure Portal
2. Verify all environment variables are set
3. Check build output for TypeScript errors
4. Ensure `host.json` and `package.json` are in the functions directory

### Issue: "Functions not appearing after deployment"

**Solution:**
1. Wait a few minutes for functions to register
2. Check Function App status: `az functionapp show --name <name>`
3. View Function App logs: `az functionapp log tail --name <name>`
4. Verify the build output includes all function files

### Issue: "Service Bus connection errors"

**Solution:**
1. Verify `AZURE_SERVICE_BUS_CONNECTION_STRING` is set correctly
2. Check Service Bus namespace exists and is accessible
3. Verify queues exist in Service Bus
4. Check managed identity permissions (if using managed identity)

---

## Manual Deployment (Alternative)

If you need to deploy manually without GitHub Actions:

```bash
# Build functions
cd functions
pnpm install --frozen-lockfile
pnpm build

# Deploy using Azure Functions Core Tools
func azure functionapp publish <function-app-name> --typescript

# Or using Azure CLI
zip -r functions-deploy.zip . -x "*.git*" "node_modules/.cache/*"
az functionapp deployment source config-zip \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --src functions-deploy.zip
```

---

## Environment-Specific Configuration

### Development

- **Function App**: `castiel-functions-dev` (or your dev name)
- **Resource Group**: `castiel-dev-rg` (or your dev RG)
- **Deploys on**: Push to `develop` branch

### Staging

- **Function App**: `castiel-functions-production` (staging slot)
- **Resource Group**: `castiel-production-rg` (or your prod RG)
- **Deploys on**: Push to `main` branch

### Production

- **Function App**: `castiel-functions-production` (production slot)
- **Resource Group**: `castiel-production-rg` (or your prod RG)
- **Deploys on**: After staging approval, slot swap

---

## Security Best Practices

1. **Use Service Principals** - Never use personal Azure credentials
2. **Limit Permissions** - Service principal should only have Contributor role on specific resource groups
3. **Rotate Secrets** - Rotate service principal secrets regularly
4. **Use Key Vault** - Store sensitive values in Azure Key Vault, not in Function App settings
5. **Enable Logging** - Monitor deployments in GitHub Actions and Azure Portal

---

## Quick Reference

### GitHub Secrets Checklist

- [ ] `AZURE_CREDENTIALS_DEV` - Service principal JSON for dev
- [ ] `AZURE_FUNCTION_APP_NAME_DEV` - Dev Function App name
- [ ] `AZURE_RESOURCE_GROUP_DEV` - Dev resource group name
- [ ] `AZURE_CREDENTIALS_PROD` - Service principal JSON for prod
- [ ] `AZURE_FUNCTION_APP_NAME_PROD` - Prod Function App name
- [ ] `AZURE_RESOURCE_GROUP_PROD` - Prod resource group name
- [ ] `SLACK_WEBHOOK` - (Optional) Slack notifications

### Azure Function App Settings Checklist

- [ ] `COSMOS_DB_ENDPOINT`
- [ ] `COSMOS_DB_KEY`
- [ ] `COSMOS_DB_DATABASE`
- [ ] `AZURE_SERVICE_BUS_CONNECTION_STRING`
- [ ] Queue names configured
- [ ] `REDIS_URL` (if using Redis)
- [ ] `KEY_VAULT_URL` (if using Key Vault)
- [ ] `APPLICATIONINSIGHTS_CONNECTION_STRING`

---

## Related Documentation

- [Azure Functions Deployment Guide](./AZURE_FUNCTIONS_DEPLOYMENT.md)
- [Environment Variables Reference](../features/integrations/phase-2-environment-variables.md)
- [Terraform Deployment Guide](../infrastructure/TERRAFORM_DEPLOYMENT.md)

---

**Status**: ✅ Complete  
**Last Updated**: January 2025

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - GitHub Actions setup guide fully documented

#### Implemented Features (✅)

- ✅ Service principal creation
- ✅ GitHub Secrets configuration
- ✅ Workflow configuration
- ✅ Deployment automation
- ✅ Environment-specific deployment

#### Known Limitations

- ⚠️ **Functions Migration** - Functions have been migrated to Container Apps
  - **Code Reference:**
    - Migration complete summary referenced
  - **Recommendation:**
    1. Update workflows for Container Apps deployment
    2. Document Container Apps CI/CD procedures
    3. Archive Functions deployment guide if no longer needed

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Azure Functions Deployment](./AZURE_FUNCTIONS_DEPLOYMENT.md) - Functions deployment guide
- [Infrastructure README](../infrastructure/README.md) - Infrastructure overview



