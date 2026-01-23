# Terraform Deployment Modes

This document explains the different deployment modes and which resources are created for each.

## Deployment Modes

### 1. Hybrid Dev (`hybrid-dev`)

**Purpose**: Local development with Azure infrastructure services only. Containers run locally via Docker Compose.

**Resources Created**:
- ✅ Resource Group
- ✅ Cosmos DB Account + Containers
- ✅ Azure Cache for Redis (Basic tier)
- ✅ Key Vault
- ✅ Application Insights + Log Analytics Workspace
- ✅ Blob Storage (via Functions storage account, if needed)

**Resources Excluded**:
- ❌ Virtual Network & Subnets
- ❌ Container Registry
- ❌ Container Apps Environment
- ❌ All Container Apps (api, web, workers)
- ❌ Service Bus
- ❌ App Services (legacy - removed)
- ❌ Azure Functions (legacy - removed)

**Usage**:
```bash
terraform plan -var-file="terraform.hybrid-dev.tfvars"
terraform apply -var-file="terraform.hybrid-dev.tfvars"
```

### 2. Dev (`dev`)

**Purpose**: Full development environment with all services deployed to Azure.

**Resources Created**:
- ✅ All infrastructure services (same as hybrid-dev)
- ✅ Virtual Network & Subnets
- ✅ Container Registry
- ✅ Container Apps Environment
- ✅ All Container Apps (api, web, workers-sync, workers-processing, workers-ingestion)
- ✅ Service Bus (for legacy compatibility)

**Usage**:
```bash
terraform plan -var-file="terraform.dev.tfvars"
terraform apply -var-file="terraform.dev.tfvars"
```

### 3. Production (`production`)

**Purpose**: Production environment with enhanced features, multi-region support, and production-tier SKUs.

**Resources Created**:
- ✅ All resources from Dev
- ✅ Production-tier SKUs (Premium, Standard)
- ✅ Multi-region Cosmos DB (if configured)
- ✅ Enhanced monitoring and alerting
- ✅ Geo-replication for Container Registry

**Usage**:
```bash
terraform plan -var-file="terraform.prod.tfvars"
terraform apply -var-file="terraform.prod.tfvars"
```

## Conditional Resources

Resources are conditionally created based on the `environment` variable:

```hcl
locals {
  is_hybrid_dev = var.environment == "hybrid-dev"
  is_full_deployment = !local.is_hybrid_dev
}
```

Resources use `count` to conditionally create:

```hcl
resource "azurerm_container_app" "api" {
  count = local.is_full_deployment ? 1 : 0
  # ...
}
```

## Migration Notes

### Legacy Resources Removed

The following legacy resources have been removed:
- `azurerm_linux_web_app.main_api` (App Service)
- `azurerm_service_plan.main` (App Service Plan)
- `azurerm_linux_function_app.main` (Azure Functions)
- `azurerm_service_plan.functions` (Functions Plan)

These have been replaced by Container Apps. If you have existing deployments with these resources, see `REMOVE_LEGACY.md` for cleanup instructions.

## Outputs

Outputs are conditionally included based on deployment mode. Some outputs may be empty for hybrid-dev mode.

## Cost Estimates

- **Hybrid Dev**: ~$25-50/month (infrastructure only)
- **Dev**: ~$150-200/month (full deployment)
- **Production**: ~$800-1000/month (with multi-region, premium SKUs)



