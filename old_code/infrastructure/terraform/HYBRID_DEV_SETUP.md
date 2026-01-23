# Hybrid Dev Environment Setup

## Summary

Terraform has been configured to support three deployment modes:
1. **Hybrid Dev** (`hybrid-dev`) - Infrastructure only
2. **Dev** (`dev`) - Full deployment
3. **Production** (`production`) - Full deployment with production settings

## Files Created/Modified

### New Files
- `terraform.hybrid-dev.tfvars` - Configuration for hybrid dev environment
- `DEPLOYMENT_MODES.md` - Documentation of deployment modes
- `REMOVE_LEGACY.md` - Notes on removed legacy resources
- `HYBRID_DEV_SETUP.md` - This file

### Modified Files
- `main.tf` - Added environment validation and local flags
- `network.tf` - Made VNet and subnets conditional
- `service-bus.tf` - Made Service Bus conditional
- `container-registry.tf` - Made Container Registry conditional
- `container-apps-environment.tf` - Made Container Apps Environment conditional
- `container-apps-*.tf` - Made all Container Apps conditional
- `outputs.tf` - Updated to handle conditional resources
- `cosmos-db.tf` - Made VNet rules conditional
- `redis.tf` - Made VNet integration conditional

### Removed Files
- `app-services.tf` - Legacy App Service (replaced by Container Apps)
- `functions.tf` - Legacy Azure Functions (replaced by Container Apps)

## Known Issues / Remaining Work

The following files still reference VNet/subnets and may need updates for hybrid-dev:
- `private-endpoints.tf` - Private endpoints (should be excluded for hybrid-dev)
- `network-security.tf` - Network security groups (should be excluded for hybrid-dev)
- `key-vault.tf` - VNet ACLs (may need adjustment for hybrid-dev)
- `waf.tf` - Web Application Firewall (references removed App Service)
- `traffic-manager.tf` - Traffic Manager (references removed App Service)
- `disaster-recovery.tf` - Disaster recovery (references removed resources)
- `alerts.tf` - Alerts (references removed resources)
- `monitoring.tf` - Monitoring (references removed resources)

## Testing

To test the hybrid-dev configuration:

```bash
cd infrastructure/terraform

# Initialize (if needed)
terraform init

# Plan for hybrid-dev
terraform plan -var-file="terraform.hybrid-dev.tfvars"

# Apply (if plan looks good)
terraform apply -var-file="terraform.hybrid-dev.tfvars"
```

## Expected Resources for Hybrid Dev

When deploying with `terraform.hybrid-dev.tfvars`, you should see:
- ✅ Resource Group
- ✅ Cosmos DB Account + Containers
- ✅ Redis Cache (Basic tier)
- ✅ Key Vault
- ✅ Application Insights
- ✅ Log Analytics Workspace
- ❌ No VNet/Subnets
- ❌ No Container Registry
- ❌ No Container Apps
- ❌ No Service Bus

## Next Steps

1. Test `terraform plan` with `terraform.hybrid-dev.tfvars`
2. Fix any remaining references to removed/conditional resources
3. Update documentation files that reference removed resources
4. Test full deployment with `terraform.dev.tfvars` to ensure nothing broke



