# Changing Azure Subscription for Terraform Deployment

## Quick Steps

### 1. List Available Subscriptions

```bash
az account list --output table
```

### 2. Set Active Subscription

```bash
# Set by subscription ID
az account set --subscription "<subscription-id>"

# Or set by subscription name
az account set --subscription "<subscription-name>"
```

### 3. Verify Current Subscription

```bash
az account show --output table
```

### 4. Re-run Terraform

```bash
cd infrastructure/terraform
terraform init  # Re-initialize if needed
terraform plan -var-file="terraform.dev.tfvars"
```

## Subscription-Specific Configuration

### Cost Budgets

The cost budgets in `cost-management.tf` use the current subscription automatically via:
```hcl
subscription_id = data.azurerm_client_config.current.subscription_id
```

This will automatically use the subscription you're logged into.

### Provider Configuration

Terraform uses the Azure CLI credentials by default. The subscription is determined by:
1. **Azure CLI default subscription** (set via `az account set`)
2. **Environment variables** (if set):
   ```bash
   export ARM_SUBSCRIPTION_ID="<subscription-id>"
   ```

## Methods to Set Subscription

### Method 1: Azure CLI (Recommended)

```bash
# List subscriptions
az account list --output table

# Set subscription
az account set --subscription "<subscription-id-or-name>"

# Verify
az account show
```

### Method 2: Environment Variable

```bash
# Set for current session
export ARM_SUBSCRIPTION_ID="<subscription-id>"

# Or add to ~/.bashrc for persistence
echo 'export ARM_SUBSCRIPTION_ID="<subscription-id>"' >> ~/.bashrc
source ~/.bashrc
```

### Method 3: Terraform Provider (Explicit)

Edit `main.tf` to explicitly set subscription:

```hcl
provider "azurerm" {
  subscription_id = var.subscription_id  # Add variable
  features {
    # ... existing config
  }
}
```

Then set in `terraform.dev.tfvars`:
```hcl
subscription_id = "<your-subscription-id>"
```

## Important Notes

1. **Quota Check**: New subscription may have different quota limits
   - Check quota: `az vm list-usage --location eastus`
   - Request increases if needed

2. **Permissions**: Ensure your account has Contributor role on the new subscription
   ```bash
   az role assignment list --assignee $(az account show --query user.name -o tsv) --scope /subscriptions/<subscription-id>
   ```

3. **Resource Naming**: Resource names must be globally unique
   - Current config uses random suffix to ensure uniqueness
   - May need to adjust if names conflict

4. **Cost Budgets**: Budgets are subscription-scoped
   - Will be created for the new subscription
   - Update budget amounts if needed

## Verification Steps

After changing subscription:

1. **Verify subscription**:
   ```bash
   az account show
   ```

2. **Check quota**:
   ```bash
   az vm list-usage --location eastus --output table | grep -E "App Service|Dynamic"
   ```

3. **Test Terraform**:
   ```bash
   terraform plan -var-file="terraform.dev.tfvars"
   ```

4. **Review plan output**:
   - Check resource names
   - Verify location
   - Confirm subscription ID in plan

## Troubleshooting

### Issue: "Subscription not found"
- Verify subscription ID is correct
- Check you have access to the subscription
- Ensure you're logged in: `az login`

### Issue: "Insufficient permissions"
- Request Contributor role on subscription
- Check with: `az role assignment list --assignee <your-email>`

### Issue: "Quota exceeded"
- Request quota increase for new subscription
- Or use different region with available quota



