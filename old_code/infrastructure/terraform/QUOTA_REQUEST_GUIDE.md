# Azure Quota Request Guide

## Required Quotas for Deployment

For the **dev environment** in **East US**, you need to request the following quotas:

### 1. B1 VMs (App Service Plan - Basic Tier)
- **Current:** 0 of 0
- **Request:** At least 1-2
- **Used by:** App Service Plan for Main API (`castiel-dev-asp`)
- **SKU:** B1 (Basic tier - $13/month)

### 2. Y1 VMs (Function App - Consumption Plan)
- **Current:** 0 of 0
- **Request:** At least 1-2
- **Used by:** Function App Plan (`castiel-functions-dev-asp`)
- **SKU:** Y1 (Consumption plan - pay-per-execution)

## How to Request Quota Increases

### Method 1: Azure Portal (Recommended)

1. Go to: [Azure Portal](https://portal.azure.com)
2. Navigate to: **Subscriptions** → **Main** → **Usage + quotas**
3. Search for each quota:
   - **"B1 VMs"** (filter by East US)
   - **"Y1 VMs"** (filter by East US)
4. Click **"Request increase"** for each
5. Fill in the form:
   - **New limit:** 2 (or more if you plan to scale)
   - **Details:** "Development environment for Castiel project - App Service Plan and Function App"
6. Submit both requests

### Method 2: Azure Support Ticket

1. Go to: **Help + support** → **New support request**
2. Select:
   - **Issue type:** Service and subscription limits (quotas)
   - **Subscription:** Main
   - **Quota type:** Compute-VM (cores-v3) family
3. In the details, specify:
   ```
   Requesting quota increases for:
   - B1 VMs in East US: 2 cores
   - Y1 VMs in East US: 2 cores
   
   Purpose: Development environment deployment
   - App Service Plan (B1 SKU)
   - Function App Consumption plan (Y1 SKU)
   ```
4. Submit the request

### Method 3: Azure CLI (if you have support plan)

```bash
# Check current quota
az vm list-usage --location eastus --output table | grep -E "B1|Y1"

# Note: Quota increases via CLI require Azure Support plan
# Most users should use Portal method above
```

## Expected Approval Time

- **Typical:** 24-48 hours
- **Fast track (if available):** Same day
- **Enterprise subscriptions:** May be faster

## After Approval

1. Verify quota increase:
   ```bash
   az vm list-usage --location eastus --output table | grep -E "B1|Y1"
   ```

2. Retry Terraform deployment:
   ```bash
   cd infrastructure/terraform
   terraform apply -var-file="terraform.dev.tfvars"
   ```

## Alternative: Use Different SKUs (If Quota Can't Be Increased)

If quota increases are not possible, you can modify the Terraform configuration to use different SKUs that have available quota:

### Option 1: Use Free Tier (F1) for App Service
- Change `sku_name` from `"B1"` to `"F1"` in `app-services.tf`
- **Limitation:** Free tier has restrictions (1 GB storage, 60 minutes compute/day)

### Option 2: Use Premium SKUs (if you have quota)
- Check if you have quota for P1v3, P1v4, etc.
- Update `sku_name` accordingly

### Option 3: Use Different Region
- Deploy to a region where you have quota
- Update `location` in `terraform.dev.tfvars`

## Current Configuration

**File:** `infrastructure/terraform/app-services.tf`
```hcl
sku_name = var.environment == "production" ? "P1v3" : "B1"
```

**File:** `infrastructure/terraform/functions.tf`
```hcl
sku_name = var.environment == "production" ? "EP1" : "Y1"
```

## Notes

- **B1 VMs:** Basic tier App Service Plan cores
- **Y1 VMs:** Consumption plan Function App cores (serverless, pay-per-use)
- Both are required for the dev environment deployment
- Production environment uses different SKUs (P1v3 and EP1) which may have different quota requirements



