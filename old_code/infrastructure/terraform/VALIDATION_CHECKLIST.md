# Terraform Configuration Validation Checklist

## Pre-Deployment Validation

### 1. Syntax Validation
```bash
cd infrastructure/terraform
terraform fmt -check -recursive
terraform validate
```

### 2. Dependency Check
- ✅ All data sources defined (azurerm_client_config in main.tf)
- ✅ All resource references exist
- ✅ No circular dependencies
- ✅ Subnet created before resources that use it

### 3. Configuration Issues Fixed
- ✅ WAF HTTP listener configuration corrected
- ✅ Application Gateway backend settings use HTTPS properly
- ✅ Shared data source (azurerm_client_config) moved to main.tf
- ✅ Function App alert criteria simplified (removed conflicting dynamic_criteria)

### 4. Resource Dependencies
- ✅ App Service Plan created before App Service
- ✅ VNet created before subnets
- ✅ Subnets created before resources using them
- ✅ Key Vault created before secrets
- ✅ Application Insights created before alerts

### 5. Conditional Resources
- ✅ Production-only resources use `count = var.environment == "production" ? 1 : 0`
- ✅ Staging slots only for production
- ✅ Traffic Manager only for production
- ✅ WAF only for production

### 6. Required Variables
- ✅ environment (default: "dev")
- ✅ location (default: "eastus")
- ✅ resource_prefix (default: "castiel")
- ✅ tags (default: {})

## Known Limitations

1. **WAF SSL Certificate**: Application Gateway SSL certificate not configured (commented out)
   - Action: Configure SSL certificate via Key Vault or manual upload before production

2. **Function App Alert**: Simplified to use static criteria only
   - Action: Consider creating separate alert for function errors if needed

3. **Secondary Region**: Traffic Manager secondary endpoint commented out
   - Action: Uncomment and configure when secondary region App Service is deployed

## Testing Steps

1. **Format Check**
   ```bash
   terraform fmt -check -recursive
   ```

2. **Validate**
   ```bash
   terraform init
   terraform validate
   ```

3. **Plan (Dev)**
   ```bash
   terraform plan -var-file="terraform.dev.tfvars"
   ```

4. **Plan (Prod)**
   ```bash
   terraform plan -var-file="terraform.prod.tfvars"
   ```

## Post-Deployment Validation

1. Verify all resources created successfully
2. Check Application Insights is receiving data
3. Test health endpoints
4. Verify alerts are configured
5. Check cost budgets are active
6. Validate private endpoints connectivity
7. Test autoscaling triggers



