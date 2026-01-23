# Terraform Infrastructure Deployment

**Last Updated**: December 2025  
**Status**: Infrastructure-as-Code Complete

---

## Overview

This document describes the Terraform infrastructure-as-code implementation for Castiel's Azure resources, including Service Bus and Azure Functions.

---

## Infrastructure Components

### 1. Azure Service Bus

**File**: `infrastructure/terraform/service-bus.tf`

**Resources**:
- Service Bus Namespace (Standard SKU)
- Authorization Rule (RootManageSharedAccessKey)
- 10 Queues:
  - `embedding-jobs` - Embedding pipeline jobs
  - `document-chunk-jobs` - Document chunking jobs
  - `content-generation-jobs` - Content generation jobs
  - `sync-inbound-webhook` - High priority webhook syncs
  - `sync-inbound-scheduled` - Scheduled sync operations
  - `sync-outbound` - Write-back operations (sessions enabled)
  - `ingestion-events` - Integration ingestion events
  - `shard-emission` - Shard emission events
  - `enrichment-jobs` - Data enrichment jobs
  - `shard-created` - Project auto-attachment events

**Queue Configuration**:
- Max delivery count: 10
- Lock duration: 5 minutes
- Message TTL: 7 days
- Dead lettering: Enabled
- Sessions: Enabled for `sync-outbound` queue

---

### 2. Azure Functions App

**File**: `infrastructure/terraform/functions.tf`

**Resources**:
- Storage Account (for Function App)
- Function App Plan (Consumption Y1 for dev, Premium EP1 for production)
- Linux Function App
- Managed Identity
- Role Assignments:
  - Key Vault access (secrets)
  - Service Bus Data Receiver
  - Cosmos DB Data Contributor

**Function App Configuration**:
- Runtime: Node.js 20
- Always On: Enabled for production
- Application Insights: Integrated
- Managed Identity: System-assigned

**Environment Variables**:
- Cosmos DB connection
- Service Bus connection string
- Redis connection
- Key Vault URL
- Queue names
- Application Insights connection

---

## Deployment

### Prerequisites

1. **Azure CLI** installed and authenticated
2. **Terraform** >= 1.0 installed
3. **Azure Subscription** with appropriate permissions
4. **Resource Group** (created automatically or pre-existing)

### Initial Setup

1. **Navigate to terraform directory**:
   ```bash
   cd infrastructure/terraform
   ```

2. **Initialize Terraform**:
   ```bash
   terraform init
   ```

3. **Review plan**:
   ```bash
   terraform plan -var-file=terraform.dev.tfvars
   ```

4. **Apply infrastructure**:
   ```bash
   terraform apply -var-file=terraform.dev.tfvars
   ```

### Environment-Specific Deployment

**Development**:
```bash
terraform apply -var-file=terraform.dev.tfvars
```

**Production**:
```bash
terraform apply -var-file=terraform.prod.tfvars
```

---

## Outputs

After deployment, Terraform outputs:

- `service_bus_namespace` - Service Bus namespace name
- `service_bus_connection_string` - Connection string (sensitive)
- `functions_app_name` - Function App name
- `functions_app_url` - Function App URL
- `deployment_instructions` - Next steps

**Retrieve outputs**:
```bash
terraform output service_bus_connection_string
terraform output functions_app_name
```

---

## Post-Deployment Steps

### 1. Update Key Vault Secrets

Add required secrets to Key Vault:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `GOOGLE-CLIENT-ID`, `GOOGLE-CLIENT-SECRET`
- `SENDGRID-API-KEY`
- Other integration credentials

### 2. Deploy Function App Code

```bash
# Build Functions
cd apps/functions
pnpm build

# Deploy to Azure
az functionapp deployment source config-zip \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --src dist.zip
```

### 3. Verify Service Bus Queues

```bash
# List queues
az servicebus queue list \
  --resource-group <resource-group> \
  --namespace-name <namespace-name>
```

### 4. Test Function App

```bash
# Check Function App status
az functionapp show \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --query state

# View logs
az functionapp log tail \
  --resource-group <resource-group> \
  --name <function-app-name>
```

---

## Configuration Files

### Variable Files

- `infrastructure/terraform/terraform.dev.tfvars` - Development environment
- `infrastructure/terraform/terraform.prod.tfvars` - Production environment

### Main Files

- `main.tf` - Core configuration, variables, locals
- `service-bus.tf` - Service Bus infrastructure
- `functions.tf` - Functions App infrastructure
- `app-services.tf` - API App Service
- `cosmos-db.tf` - Cosmos DB
- `redis.tf` - Redis Cache
- `key-vault.tf` - Key Vault
- `monitoring.tf` - Application Insights, alerts
- `network.tf` - Virtual Network (if needed)
- `outputs.tf` - Output values

---

## Cost Considerations

### Service Bus

- **Standard SKU**: ~$10/month base + per-operation charges
- **Queues**: Included in namespace cost
- **Message Operations**: Pay-per-use

### Functions App

- **Consumption Plan (Y1)**: Pay-per-execution, free tier available
- **Premium Plan (EP1)**: ~$200/month + execution costs
- **Storage Account**: ~$0.02/GB/month

**Recommendation**: Use Consumption plan for dev/staging, Premium for production.

---

## Security

### Managed Identity

Function App uses System-assigned Managed Identity for:
- Key Vault access (no secrets in code)
- Service Bus access (no connection strings needed)
- Cosmos DB access (RBAC)

### Network Security

- Functions can be configured with VNet integration
- Service Bus supports private endpoints
- All traffic encrypted in transit

---

## Troubleshooting

### Service Bus Connection Issues

**Error**: `Failed to connect to Service Bus`

**Solutions**:
1. Verify connection string: `terraform output service_bus_connection_string`
2. Check namespace exists: `az servicebus namespace show --name <name>`
3. Verify queues exist: `az servicebus queue list --namespace-name <name>`

### Function App Deployment Issues

**Error**: `Function app not responding`

**Solutions**:
1. Check Function App status: `az functionapp show --name <name>`
2. View logs: `az functionapp log tail --name <name>`
3. Verify environment variables: `az functionapp config appsettings list --name <name>`
4. Check managed identity: `az functionapp identity show --name <name>`

### Permission Issues

**Error**: `Access denied to Key Vault/Service Bus/Cosmos DB`

**Solutions**:
1. Verify role assignments: `az role assignment list --assignee <principal-id>`
2. Re-run Terraform to ensure role assignments are created
3. Check managed identity principal ID matches

---

## Maintenance

### Updating Infrastructure

1. **Modify Terraform files**
2. **Review changes**: `terraform plan`
3. **Apply changes**: `terraform apply`

### Destroying Infrastructure

⚠️ **Warning**: This will delete all resources!

```bash
terraform destroy -var-file=terraform.dev.tfvars
```

---

## Related Documentation

- [Azure Infrastructure Setup](../infrastructure/AZURE_INFRASTRUCTURE_SETUP.md)
- [Production Runbooks](../operations/PRODUCTION_RUNBOOKS.md)
- [Service Bus Queues](../features/integrations/README.md)

---

**Status**: Infrastructure-as-Code Complete ✅  
**Last Updated**: January 2025

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - Terraform deployment documented but may reference deprecated resources

#### Implemented Features (✅)

- ✅ Terraform infrastructure-as-code
- ✅ Service Bus configuration
- ✅ Function App configuration
- ✅ Deployment procedures
- ✅ Environment-specific deployment

#### Known Limitations

- ⚠️ **Functions Migration** - Functions have been migrated to Container Apps
  - **Code Reference:**
    - Document references Azure Functions which have been migrated
  - **Recommendation:**
    1. Update documentation to reflect Container Apps
    2. Remove Functions-specific content
    3. Document Container Apps deployment

- ⚠️ **Service Bus Removal** - Service Bus has been removed
  - **Code Reference:**
    - Document references Service Bus which has been removed
  - **Recommendation:**
    1. Update documentation to reflect BullMQ/Redis
    2. Remove Service Bus references
    3. Document queue system migration

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Infrastructure README](./README.md) - Infrastructure overview
- [Migration Complete Summary](../migration/MIGRATION_COMPLETE_SUMMARY.md) - Migration details







