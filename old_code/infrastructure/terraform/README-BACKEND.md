# Terraform Backend Configuration

## Overview

Terraform state can be stored locally or remotely in Azure Storage. For production, remote state is recommended.

## Setup Remote Backend

### 1. Create Storage Account for State

```bash
# Create resource group for state
az group create \
  --name castiel-tfstate-rg \
  --location eastus

# Create storage account
az storage account create \
  --name castieltfstate \
  --resource-group castiel-tfstate-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Create container
az storage container create \
  --name tfstate \
  --account-name castieltfstate \
  --auth-mode login
```

### 2. Configure Backend

Copy `backend.tf.example` to `backend.tf` and update values:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "castiel-tfstate-rg"
    storage_account_name = "castieltfstate"
    container_name       = "tfstate"
    key                  = "castiel-dev.terraform.tfstate"
    use_azuread_auth     = true
  }
}
```

### 3. Initialize

```bash
terraform init
```

## Workspace Strategy

Use Terraform workspaces for different environments:

```bash
# Create workspace
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# Switch workspace
terraform workspace select dev

# Workspace-specific state files
# Key: castiel-dev.terraform.tfstate
# Key: castiel-staging.terraform.tfstate
# Key: castiel-production.terraform.tfstate
```

## State Locking

Azure Storage backend provides state locking automatically. If a lock exists:

```bash
# Check for locks
az storage blob show \
  --container-name tfstate \
  --name castiel-dev.terraform.tfstate \
  --account-name castieltfstate

# Force unlock (if needed)
terraform force-unlock <lock-id>
```

## State Security

- Enable blob versioning on storage account
- Enable soft delete
- Use Azure AD authentication
- Restrict access with RBAC
- Enable encryption at rest

## Best Practices

1. **Never commit state files** to Git
2. **Use separate state files** per environment
3. **Enable versioning** on storage account
4. **Backup state** before major changes
5. **Use workspaces** for environment separation



