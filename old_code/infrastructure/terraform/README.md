# Castiel API - Terraform Infrastructure

Infrastructure as Code (IaC) for deploying Castiel API to Microsoft Azure.

## Quick Start

```bash
# Initialize Terraform
terraform init

# Plan deployment (development)
terraform plan -var-file="terraform.dev.tfvars" -out=tfplan-dev

# Apply changes
terraform apply tfplan-dev

# Destroy infrastructure (WARNING: Deletes all resources)
terraform destroy -var-file="terraform.dev.tfvars"
```

## Prerequisites

- **Terraform** >= 1.0
- **Azure CLI** >= 2.50 (logged in: `az login`)
- **Azure Subscription** with Contributor access
- **Service Principal** for automation (optional, see below)

### Create Service Principal

```bash
az ad sp create-for-rbac \
  --name "castiel-terraform-sp" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>

# Set credentials as environment variables
export ARM_CLIENT_ID="<appId>"
export ARM_CLIENT_SECRET="<password>"
export ARM_SUBSCRIPTION_ID="<subscription-id>"
export ARM_TENANT_ID="<tenant>"
```

## Architecture

```
terraform/
├── main.tf              # Provider, variables, locals, random suffix
├── network.tf           # VNet and 3 subnets (app, redis, private endpoints)
├── app-services.tf      # App Service Plan, Main API, auto-scaling
├── cosmos-db.tf         # Cosmos DB Account + 6 containers (users, shards, etc.)
├── redis.tf             # Redis Cache (Standard C2), backups, alerts
├── key-vault.tf         # Key Vault, Managed Identity, secrets, access policies
├── monitoring.tf        # Application Insights, alerts, availability tests
├── outputs.tf           # Resource URLs, keys, connection strings
├── terraform.dev.tfvars # Development environment variables
└── terraform.prod.tfvars# Production environment variables
```

## Environments

### Development
- **Location**: East US
- **Tier**: Basic/Standard
- **Features**: Single region, no staging slots
- **Cost**: ~$150/month

### Production
- **Location**: East US (primary), West US 2 (secondary)
- **Tier**: Premium
- **Features**: Multi-region Cosmos DB, staging slots, auto-scaling, backups
- **Cost**: ~$800/month

## Resources Created

| Resource | Type | Purpose |
|----------|------|---------|
| Resource Group | `azurerm_resource_group` | Container for all resources |
| Virtual Network | `azurerm_virtual_network` | Network isolation (10.0.0.0/16) |
| Subnets (3) | `azurerm_subnet` | App services, Redis, private endpoints |
| App Service Plan | `azurerm_service_plan` | Compute for applications (P1v3/B2) |
| App Service | `azurerm_linux_web_app` | Main API |
| Cosmos DB | `azurerm_cosmosdb_account` | NoSQL database (serverless) |
| Containers (6) | `azurerm_cosmosdb_sql_container` | users, shards, sso, oauth, etc. |
| Redis Cache | `azurerm_redis_cache` | Distributed cache (Standard C2) |
| Key Vault | `azurerm_key_vault` | Centralized secrets management |
| Storage Account | `azurerm_storage_account` | Redis backups (production) |
| Application Insights | `azurerm_application_insights` | APM and monitoring |
| Log Analytics | `azurerm_log_analytics_workspace` | Centralized logging |
| Alerts (7) | `azurerm_monitor_metric_alert` | CPU, memory, errors, availability |
| Action Group | `azurerm_monitor_action_group` | Alert notifications |

**Total Resources**: ~40 (varies by environment)

## Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `environment` | string | `"dev"` | Environment name (dev, staging, production) |
| `location` | string | `"eastus"` | Azure region |
| `secondary_location` | string | `"westus2"` | Secondary region (production only) |
| `resource_prefix` | string | `"castiel"` | Prefix for all resources |
| `tags` | map | `{}` | Resource tags |

**Note**: Use `terraform.dev.tfvars` or `terraform.prod.tfvars` to set values.

## Outputs

After successful deployment, Terraform outputs:

```
main_api_url                # https://castiel-api-dev.azurewebsites.net
cosmos_db_endpoint          # https://castiel-cosmos-dev.documents.azure.com:443/
cosmos_db_key               # (sensitive)
redis_hostname              # castiel-redis-dev.redis.cache.windows.net
redis_primary_key           # (sensitive)
key_vault_uri               # https://castiel-kv-dev-abc123.vault.azure.net/
application_insights_key    # (sensitive)
```

### View Outputs

```bash
# All outputs
terraform output

# Sensitive output (will be revealed)
terraform output -raw cosmos_db_key
```

## Deployment Guide

### Step 1: Initialize Terraform

```bash
terraform init

# Expected output:
# Initializing the backend...
# Initializing provider plugins...
# - Finding hashicorp/azurerm versions matching "~> 3.80"...
# Terraform has been successfully initialized!
```

### Step 2: Validate Configuration

```bash
terraform validate

# Expected output:
# Success! The configuration is valid.
```

### Step 3: Format Code (Optional)

```bash
terraform fmt
```

### Step 4: Plan Deployment

```bash
# Development
terraform plan -var-file="terraform.dev.tfvars" -out=tfplan-dev

# Production
terraform plan -var-file="terraform.prod.tfvars" -out=tfplan-prod
```

Review the plan carefully:
- **Green (+)**: Resources to be created
- **Yellow (~)**: Resources to be modified
- **Red (-)**: Resources to be destroyed

### Step 5: Apply Changes

```bash
# Development (15-20 minutes)
terraform apply tfplan-dev

# Production (25-30 minutes, multi-region)
terraform apply tfplan-prod
```

Terraform will:
1. Create resource group
2. Create networking (VNet, subnets)
3. Create App Service Plan
4. Deploy App Services (empty, needs code deployment)
5. Create Cosmos DB + containers
6. Create Redis Cache
7. Create Key Vault + secrets
8. Create monitoring (Application Insights, alerts)

### Step 6: Save Outputs

```bash
# Save to file
terraform output > outputs.txt

# Or export as environment variables
export MAIN_API_URL=$(terraform output -raw main_api_url)
export KEY_VAULT_URI=$(terraform output -raw key_vault_uri)
```

### Step 7: Post-Deployment

1. **Update Key Vault Secrets** (see DEPLOYMENT.md)
   - SendGrid API key
   - Google/GitHub OAuth credentials
   - OpenAI API key

2. **Deploy Application Code** (via GitHub Actions or Azure CLI)

3. **Verify Deployment**
  ```bash
  curl $MAIN_API_URL/health
  ```

## Common Commands

```bash
# Show current state
terraform show

# List resources
terraform state list

# Inspect specific resource
terraform state show azurerm_cosmosdb_account.castiel

# Refresh state (sync with Azure)
terraform refresh -var-file="terraform.dev.tfvars"

# Targeted apply (specific resource)
terraform apply -target=azurerm_redis_cache.castiel

# Import existing resource
terraform import azurerm_resource_group.castiel /subscriptions/<sub-id>/resourceGroups/castiel-dev-rg

# Destroy specific resource
terraform destroy -target=azurerm_redis_cache.castiel

# Destroy all infrastructure (WARNING)
terraform destroy -var-file="terraform.dev.tfvars"
```

## State Management

### Local State (Default)

State is stored in `terraform.tfstate` (gitignored).

**⚠️ WARNING**: Do not commit state files to Git (contains secrets).

### Remote State (Recommended for Teams)

Uncomment the `backend` block in `main.tf`:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "castiel-tfstate-rg"
    storage_account_name = "castieltfstate"
    container_name       = "tfstate"
    key                  = "dev.terraform.tfstate"
  }
}
```

#### Setup Remote State

```bash
# Create storage account for state
az group create --name castiel-tfstate-rg --location eastus

az storage account create \
  --resource-group castiel-tfstate-rg \
  --name castieltfstate \
  --sku Standard_LRS \
  --encryption-services blob

az storage container create \
  --name tfstate \
  --account-name castieltfstate

# Enable versioning
az storage blob service-properties update \
  --account-name castieltfstate \
  --enable-versioning true

# Initialize with backend
terraform init -migrate-state
```

## Troubleshooting

### Issue: "Error: Insufficient Azure Quota"

**Solution**: Request quota increase in Azure Portal → Subscriptions → Usage + quotas

### Issue: "Error: Name 'castiel-kv-dev' already exists"

**Cause**: Key Vault soft-deleted (90-day retention)

**Solution**:
```bash
# Purge soft-deleted Key Vault
az keyvault purge --name castiel-kv-dev-abc123

# Or recover it
az keyvault recover --name castiel-kv-dev-abc123
```

### Issue: "Error: Container name 'shards' already exists"

**Cause**: Terraform trying to recreate existing container

**Solution**:
```bash
# Import existing container
terraform import azurerm_cosmosdb_sql_container.shards \
  /subscriptions/<sub-id>/resourceGroups/castiel-dev-rg/providers/Microsoft.DocumentDB/databaseAccounts/castiel-cosmos-dev/sqlDatabases/castiel-db/containers/shards
```

### Issue: Slow Terraform Apply

**Cause**: Cosmos DB multi-region replication takes time

**Solution**: Be patient. Multi-region deployments can take 20-30 minutes.

### Issue: "Error: Invalid for_each argument"

**Cause**: Variable not properly defined in tfvars

**Solution**: Ensure `terraform.dev.tfvars` has all required variables.

## Cost Optimization

### Development Tips

- Use **B2** tier for App Service Plan (~$50/month vs. P1v3 ~$150/month)
- Disable **auto-scaling** (set `environment != "production"`)
- Use **single-region** Cosmos DB
- Disable **staging slots**
- Use **Basic** Redis Cache (C0 ~$15/month vs. Standard C2 ~$75/month)

### Production Considerations

- Enable **Azure Hybrid Benefit** if you have Windows Server licenses
- Use **Reserved Instances** for 1-3 year commitments (40-60% savings)
- Monitor **Cosmos DB Request Units** (switch to Provisioned if consistent load)
- Enable **auto-pause** for dev environments during off-hours

## Security Best Practices

✅ **Never commit** `terraform.tfstate` or `*.tfvars` with secrets
✅ **Use Managed Identity** for App Service → Key Vault access (already configured)
✅ **Enable soft delete** on Key Vault (90-day recovery window)
✅ **Use VNet integration** for network isolation
✅ **Enable TLS 1.2+** for all services
✅ **Rotate secrets** regularly (automate with Key Vault)
✅ **Enable diagnostic logs** for audit trails
✅ **Tag all resources** for cost tracking and compliance

## CI/CD Integration

This Terraform configuration is designed to work with GitHub Actions.

See `.github/workflows/deploy.yml` for full CI/CD pipeline.

### Manual Terraform in CI/CD

```yaml
- name: Terraform Init
  run: terraform init

- name: Terraform Plan
  run: terraform plan -var-file="terraform.${{ env.ENVIRONMENT }}.tfvars" -out=tfplan

- name: Terraform Apply
  run: terraform apply tfplan
```

## Additional Resources

- **Terraform Azure Provider**: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- **Azure App Service**: https://docs.microsoft.com/azure/app-service/
- **Cosmos DB**: https://docs.microsoft.com/azure/cosmos-db/
- **Redis Cache**: https://docs.microsoft.com/azure/azure-cache-for-redis/
- **Key Vault**: https://docs.microsoft.com/azure/key-vault/

## Support

For issues or questions:
1. Check `docs/DEPLOYMENT.md` for detailed deployment guide
2. Review Azure Portal logs
3. Check Application Insights for runtime issues
4. Contact DevOps team

---

**Maintained By**: Castiel DevOps Team
**Last Updated**: November 17, 2025
