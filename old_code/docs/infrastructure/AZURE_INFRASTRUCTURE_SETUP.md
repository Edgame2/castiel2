# Azure Infrastructure Setup Guide

**Status**: Production-Ready Setup Guide  
**Last Updated**: January 2025  
**Purpose**: Complete guide for setting up Azure resources required for Castiel production deployment

> **Note:** For gap analysis, see [Infrastructure README](./README.md) and [Gap Analysis](../GAP_ANALYSIS.md)

---

## Overview

This guide covers the setup of all Azure resources required for Castiel production deployment, specifically:

1. **Azure Service Bus** - Message queuing for integrations
2. **Azure Event Grid** - Event routing for integration workflows
3. **Azure Functions** - Serverless processing for sync operations
4. **Azure Key Vault** - Secure credential storage
5. **Azure Storage** - Function App storage

---

## Prerequisites

- Azure CLI installed and configured
- Azure subscription with appropriate permissions
- Resource group created (or will be created by script)
- Understanding of Azure services

---

## Quick Setup

### Automated Setup Script

Use the provided script to set up all infrastructure:

```bash
./scripts/setup-azure-infrastructure.sh <environment> <resource-group> <location>
```

**Example:**
```bash
./scripts/setup-azure-infrastructure.sh prod rg-castiel-prod eastus
```

The script will:
- Create Service Bus namespace and queues
- Set up Function App with Premium plan
- Configure storage account
- Enable managed identity
- Set up Key Vault access policies

---

## Manual Setup

### 1. Azure Service Bus

#### 1.1 Create Namespace

```bash
az servicebus namespace create \
  --resource-group <resource-group> \
  --name sb-sync-<environment> \
  --location <location> \
  --sku Standard
```

#### 1.2 Create Queues

**sync-inbound-webhook** (High priority, real-time webhooks):
```bash
az servicebus queue create \
  --resource-group <resource-group> \
  --namespace-name sb-sync-<environment> \
  --name sync-inbound-webhook \
  --max-delivery-count 10 \
  --lock-duration PT5M \
  --default-message-time-to-live P7D \
  --dead-lettering-on-message-expiration true
```

**sync-inbound-scheduled** (Standard priority, scheduled syncs):
```bash
az servicebus queue create \
  --resource-group <resource-group> \
  --namespace-name sb-sync-<environment> \
  --name sync-inbound-scheduled \
  --max-delivery-count 10 \
  --lock-duration PT5M \
  --default-message-time-to-live P7D \
  --dead-lettering-on-message-expiration true
```

**sync-outbound** (Sessions enabled, write-back operations):
```bash
az servicebus queue create \
  --resource-group <resource-group> \
  --namespace-name sb-sync-<environment> \
  --name sync-outbound \
  --enable-session true \
  --max-delivery-count 10 \
  --lock-duration PT5M \
  --default-message-time-to-live P7D \
  --dead-lettering-on-message-expiration true
```

#### 1.3 Get Connection String

```bash
az servicebus namespace authorization-rule keys list \
  --resource-group <resource-group> \
  --namespace-name sb-sync-<environment> \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString -o tsv
```

**Save this connection string** - it's needed for:
- API application settings: `AZURE_SERVICE_BUS_CONNECTION_STRING`
- Function App settings: `SERVICEBUS_SYNC_CONNECTION`

---

### 2. Azure Event Grid

Event Grid subscriptions route integration events to Service Bus queues.

#### 2.1 Create System Topic

Event Grid system topics are typically created automatically when you create the first subscription. However, you can create them explicitly:

```bash
# Note: System topics require a source resource
# For custom events, use Event Grid Custom Topics instead
az eventgrid topic create \
  --resource-group <resource-group> \
  --name evgt-sync-<environment> \
  --location <location>
```

#### 2.2 Create Subscriptions

**Inbound Subscription** (routes to sync-inbound-* queues):
```bash
az eventgrid event-subscription create \
  --name evgs-sync-inbound-<environment> \
  --source-resource-id /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.EventGrid/topics/evgt-sync-<environment> \
  --endpoint-type servicebusqueue \
  --endpoint /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.ServiceBus/namespaces/sb-sync-<environment>/queues/sync-inbound-webhook
```

**Outbound Subscription** (routes to sync-outbound queue):
```bash
az eventgrid event-subscription create \
  --name evgs-sync-outbound-<environment> \
  --source-resource-id /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.EventGrid/topics/evgt-sync-<environment> \
  --endpoint-type servicebusqueue \
  --endpoint /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.ServiceBus/namespaces/sb-sync-<environment>/queues/sync-outbound
```

**Note**: Event Grid subscriptions are complex to set up via CLI. Consider using:
- Azure Portal (recommended for first-time setup)
- ARM/Bicep templates
- Terraform (see `terraform/` directory)

---

### 3. Azure Functions

#### 3.1 Create Storage Account

```bash
az storage account create \
  --resource-group <resource-group> \
  --name stcastiel<environment> \
  --location <location> \
  --sku Standard_LRS
```

#### 3.2 Create App Service Plan (Premium)

```bash
az appservice plan create \
  --resource-group <resource-group> \
  --name asp-sync-<environment> \
  --location <location> \
  --sku EP1 \
  --is-linux
```

**SKU Options:**
- `EP1` - Premium plan, 1 core, 3.5GB RAM (recommended for production)
- `EP2` - Premium plan, 2 cores, 7GB RAM (for higher load)
- `EP3` - Premium plan, 4 cores, 14GB RAM (for very high load)

#### 3.3 Create Function App

```bash
az functionapp create \
  --resource-group <resource-group> \
  --name func-sync-<environment> \
  --storage-account stcastiel<environment> \
  --plan asp-sync-<environment> \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --os-type Linux
```

#### 3.4 Configure Function App Settings

```bash
az functionapp config appsettings set \
  --resource-group <resource-group> \
  --name func-sync-<environment> \
  --settings \
    "SERVICEBUS_SYNC_CONNECTION=<service-bus-connection-string>" \
    "FUNCTIONS_WORKER_RUNTIME=node" \
    "WEBSITE_NODE_DEFAULT_VERSION=~20" \
    "AzureWebJobsFeatureFlags=EnableWorkerIndexing" \
    "COSMOS_DB_ENDPOINT=<cosmos-endpoint>" \
    "COSMOS_DB_KEY=<cosmos-key>" \
    "COSMOS_DB_DATABASE_ID=<database-id>" \
    "KEY_VAULT_URL=<key-vault-url>"
```

#### 3.5 Enable Managed Identity

```bash
az functionapp identity assign \
  --resource-group <resource-group> \
  --name func-sync-<environment>
```

Get the principal ID:
```bash
az functionapp identity show \
  --resource-group <resource-group> \
  --name func-sync-<environment> \
  --query principalId -o tsv
```

---

### 4. Azure Key Vault Access Policy

Grant the Function App's managed identity access to Key Vault:

```bash
az keyvault set-policy \
  --name <key-vault-name> \
  --object-id <function-app-principal-id> \
  --secret-permissions get list
```

**Required Permissions:**
- `get` - Read secrets
- `list` - List secrets

---

## Verification

### Verify Service Bus

```bash
# List queues
az servicebus queue list \
  --resource-group <resource-group> \
  --namespace-name sb-sync-<environment>

# Check queue properties
az servicebus queue show \
  --resource-group <resource-group> \
  --namespace-name sb-sync-<environment> \
  --name sync-inbound-webhook
```

### Verify Function App

```bash
# Check Function App status
az functionapp show \
  --resource-group <resource-group> \
  --name func-sync-<environment>

# List functions
az functionapp function list \
  --resource-group <resource-group> \
  --name func-sync-<environment>
```

### Verify Managed Identity

```bash
az functionapp identity show \
  --resource-group <resource-group> \
  --name func-sync-<environment>
```

---

## Environment Variables

### API Application

Add these to your API application settings:

```bash
AZURE_SERVICE_BUS_CONNECTION_STRING=<service-bus-connection-string>
AZURE_SERVICE_BUS_SYNC_INBOUND_WEBHOOK_QUEUE=sync-inbound-webhook
AZURE_SERVICE_BUS_SYNC_INBOUND_SCHEDULED_QUEUE=sync-inbound-scheduled
AZURE_SERVICE_BUS_SYNC_OUTBOUND_QUEUE=sync-outbound
```

### Function App

Add these to Function App settings (see section 3.4 above):

```bash
SERVICEBUS_SYNC_CONNECTION=<service-bus-connection-string>
COSMOS_DB_ENDPOINT=<cosmos-endpoint>
COSMOS_DB_KEY=<cosmos-key>
COSMOS_DB_DATABASE_ID=<database-id>
KEY_VAULT_URL=<key-vault-url>
```

---

## Cost Estimation

**Service Bus (Standard tier):**
- Base cost: ~$10/month
- Operations: $0.05 per million operations
- Estimated: $15-30/month for moderate usage

**Azure Functions (Premium EP1):**
- Base cost: ~$146/month
- Execution: Included in base cost
- Estimated: $150-200/month

**Event Grid:**
- First 100,000 operations: Free
- Additional: $0.60 per 100,000 operations
- Estimated: $5-20/month

**Storage Account:**
- Standard LRS: ~$0.02/GB/month
- Estimated: $1-5/month

**Total Estimated Cost**: $170-255/month per environment

---

## Troubleshooting

### Service Bus Connection Issues

```bash
# Test connection string
az servicebus namespace authorization-rule keys list \
  --resource-group <resource-group> \
  --namespace-name sb-sync-<environment> \
  --name RootManageSharedAccessKey
```

### Function App Not Starting

1. Check logs:
```bash
az functionapp log tail \
  --resource-group <resource-group> \
  --name func-sync-<environment>
```

2. Verify settings:
```bash
az functionapp config appsettings list \
  --resource-group <resource-group> \
  --name func-sync-<environment>
```

### Key Vault Access Denied

1. Verify managed identity is enabled
2. Check access policy:
```bash
az keyvault show \
  --name <key-vault-name> \
  --query properties.accessPolicies
```

---

## Next Steps

After infrastructure setup:

1. **Deploy Function App code** (see `apps/functions/README.md`)
2. **Configure Event Grid subscriptions** (via Portal or ARM/Bicep)
3. **Test integration flows** (see `docs/features/integrations/IMPLEMENTATION_TODO.md`)
4. **Set up monitoring** (Application Insights)
5. **Configure alerts** (for queue depth, function errors, etc.)

---

## References

- [Integration System TODO](./features/integrations/IMPLEMENTATION_TODO.md)
- [Sync Engine Documentation](./features/integrations/SYNC-ENGINE.md)
- [Event Flow Documentation](./features/integrations/EVENT-FLOW.md)
- [Azure Functions Deployment](./features/integrations/phase-2-deployment-guide.md)

---

**Last Updated**: January 2025  
**Status**: Production-Ready

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Infrastructure setup guide fully documented

#### Implemented Features (✅)

- ✅ Azure Service Bus setup
- ✅ Azure Event Grid configuration
- ✅ Azure Functions setup
- ✅ Azure Key Vault integration
- ✅ Azure Storage configuration
- ✅ Automated setup scripts
- ✅ Manual setup procedures

#### Known Limitations

- ⚠️ **Terraform State Management** - Remote state backend not configured (see [Infrastructure README](./README.md))
- ⚠️ **Infrastructure Testing** - Limited infrastructure testing and validation

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](./README.md) - Infrastructure overview with gap analysis
- [Terraform Documentation](../infrastructure/terraform/README.md) - Terraform deployment








