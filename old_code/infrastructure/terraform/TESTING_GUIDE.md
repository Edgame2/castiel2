# Terraform Testing Guide

## Quick Start Testing

### 1. Syntax Validation

```bash
cd infrastructure/terraform

# Format code (auto-fix formatting issues)
terraform fmt -recursive

# Validate syntax and configuration
terraform init
terraform validate
```

**Expected Output:**
```
Success! The configuration is valid.
```

### 2. Plan Without Changes (Dry Run)

```bash
# Development environment
terraform plan -var-file="terraform.dev.tfvars" -out=tfplan-dev

# Production environment
terraform plan -var-file="terraform.prod.tfvars" -out=tfplan-prod
```

**What to Check:**
- ✅ No errors or warnings
- ✅ Resources to be created/modified/destroyed are expected
- ✅ Review resource counts and types
- ✅ Check for any unexpected changes

### 3. Validate Specific Components

```bash
# Validate only network resources
terraform plan -var-file="terraform.dev.tfvars" -target=azurerm_virtual_network.main -target=azurerm_subnet.app_services

# Validate only App Services
terraform plan -var-file="terraform.dev.tfvars" -target=azurerm_linux_web_app.main_api

# Validate monitoring resources
terraform plan -var-file="terraform.dev.tfvars" -target=azurerm_monitor_autoscale_setting.app_service
```

## Testing Strategies

### Strategy 1: Incremental Testing (Recommended)

Test components in order of dependencies:

```bash
# Step 1: Test core infrastructure (no WAF)
terraform plan -var-file="terraform.dev.tfvars" \
  -target=azurerm_resource_group.main \
  -target=azurerm_virtual_network.main \
  -target=azurerm_subnet.app_services \
  -target=azurerm_subnet.redis \
  -target=azurerm_subnet.private_endpoints

# Step 2: Test compute resources
terraform plan -var-file="terraform.dev.tfvars" \
  -target=azurerm_service_plan.main \
  -target=azurerm_linux_web_app.main_api

# Step 3: Test data stores
terraform plan -var-file="terraform.dev.tfvars" \
  -target=azurerm_cosmosdb_account.main \
  -target=azurerm_redis_cache.main

# Step 4: Test monitoring
terraform plan -var-file="terraform.dev.tfvars" \
  -target=azurerm_application_insights.main \
  -target=azurerm_monitor_action_group.main
```

### Strategy 2: Environment-Specific Testing

```bash
# Test dev environment (no WAF, no Traffic Manager)
terraform plan -var-file="terraform.dev.tfvars" \
  -var="environment=dev"

# Test production environment (includes WAF, Traffic Manager)
terraform plan -var-file="terraform.prod.tfvars" \
  -var="environment=production"
```

### Strategy 3: Exclude Optional Components

```bash
# Test without WAF (WAF is production-only and can be added later)
terraform plan -var-file="terraform.dev.tfvars" \
  -var="environment=dev" \
  | grep -v "azurerm_application_gateway" \
  | grep -v "azurerm_public_ip.app_gateway"
```

## Pre-Deployment Checklist

### Before Running `terraform apply`:

- [ ] `terraform fmt` passes (no formatting issues)
- [ ] `terraform validate` passes (no syntax errors)
- [ ] `terraform plan` shows expected changes
- [ ] Reviewed all resources to be created
- [ ] Checked for any destroy operations
- [ ] Verified variable values in `.tfvars` files
- [ ] Confirmed Azure subscription and credentials
- [ ] Reviewed cost estimates (if available)

### Safety Checks:

```bash
# Check for destroy operations (should be empty for new deployments)
terraform plan -var-file="terraform.dev.tfvars" | grep "will be destroyed"

# Check resource count
terraform plan -var-file="terraform.dev.tfvars" | grep "will be created" | wc -l

# Review sensitive outputs
terraform plan -var-file="terraform.dev.tfvars" -out=tfplan
terraform show tfplan | grep -i "sensitive"
```

## Testing in CI/CD

The GitHub Actions workflows include automated testing:

```bash
# Run the validation workflow
gh workflow run terraform-validate.yml

# Or manually trigger
cd .github/workflows
# The workflow will:
# 1. Run terraform fmt -check
# 2. Run terraform init
# 3. Run terraform validate
# 4. Check for hardcoded secrets
```

## Common Testing Scenarios

### Scenario 1: First-Time Deployment

```bash
# 1. Initialize
terraform init

# 2. Validate
terraform validate

# 3. Plan (review carefully)
terraform plan -var-file="terraform.dev.tfvars" -out=tfplan-dev

# 4. Review plan file
terraform show tfplan-dev

# 5. Apply (if plan looks good)
terraform apply tfplan-dev
```

### Scenario 2: Testing Changes

```bash
# 1. Make changes to .tf files

# 2. Validate
terraform validate

# 3. Plan changes
terraform plan -var-file="terraform.dev.tfvars" -out=tfplan-changes

# 4. Review what will change
terraform show tfplan-changes | less

# 5. Apply if acceptable
terraform apply tfplan-changes
```

### Scenario 3: Testing Production Configuration

```bash
# Use a separate workspace or state file for production testing
terraform workspace new production-test

# Plan production deployment
terraform plan -var-file="terraform.prod.tfvars" -out=tfplan-prod-test

# Review carefully (production has WAF, Traffic Manager, etc.)
terraform show tfplan-prod-test
```

## Troubleshooting Common Issues

### Issue: "Backend configuration changed"

```bash
# Reinitialize backend
terraform init -reconfigure
```

### Issue: "Provider version mismatch"

```bash
# Update provider versions
terraform init -upgrade
```

### Issue: "Resource already exists"

```bash
# Import existing resource
terraform import azurerm_resource_group.main /subscriptions/.../resourceGroups/...
```

### Issue: "Variable not set"

```bash
# Check .tfvars file exists
ls -la terraform.*.tfvars

# Or set variables explicitly
terraform plan -var="environment=dev" -var="location=eastus"
```

## Testing Best Practices

1. **Always test in dev first** - Never test production changes directly
2. **Use plan files** - Save plans and review before applying
3. **Test incrementally** - Use `-target` for focused testing
4. **Review outputs** - Check what will be created/modified
5. **Validate syntax** - Run `terraform validate` before planning
6. **Check costs** - Review resource SKUs and sizes
7. **Test rollback** - Know how to undo changes if needed

## Cost Estimation

```bash
# Note: Terraform doesn't provide cost estimates directly
# Use Azure Pricing Calculator or:
# https://azure.microsoft.com/pricing/calculator/

# Review resource SKUs in plan output
terraform plan -var-file="terraform.dev.tfvars" | grep -i "sku\|tier\|size"
```

## Next Steps After Testing

1. ✅ All tests pass
2. ✅ Plan reviewed and approved
3. ✅ Backup current state (if updating existing)
4. ✅ Apply changes
5. ✅ Verify resources created successfully
6. ✅ Test application connectivity
7. ✅ Monitor for issues



