# WAF Deployment Guide - Adding Later

## Can WAF Be Added Later?

**Yes!** The WAF (Web Application Firewall) configuration is designed to be added later without affecting existing infrastructure.

## Current Configuration

The WAF is configured with:
- ✅ **Conditional creation**: Only created for production (`count = var.environment == "production" ? 1 : 0`)
- ✅ **No dependencies on existing resources**: WAF is independent
- ✅ **Can be added anytime**: No impact on running services

## Why Add WAF Later?

1. **Cost**: WAF adds ~$100/month (Application Gateway WAF_v2)
2. **Complexity**: Requires SSL certificate configuration
3. **Testing**: Can test application without WAF first
4. **Flexibility**: Add when security requirements increase

## How to Add WAF Later

### Option 1: Enable for Existing Production Environment

```bash
cd infrastructure/terraform

# 1. Review current WAF configuration
cat waf.tf

# 2. Plan to add WAF (it's already in the code, just not applied)
terraform plan -var-file="terraform.prod.tfvars" \
  -target=azurerm_public_ip.app_gateway \
  -target=azurerm_subnet.app_gateway \
  -target=azurerm_application_gateway.main \
  -target=azurerm_network_ddos_protection_plan.main

# 3. Apply WAF resources
terraform apply -var-file="terraform.prod.tfvars" \
  -target=azurerm_public_ip.app_gateway \
  -target=azurerm_subnet.app_gateway \
  -target=azurerm_application_gateway.main
```

### Option 2: Configure SSL Certificate First

Before enabling WAF, configure SSL certificate:

#### Step 1: Get SSL Certificate

```bash
# Option A: Use Azure Key Vault certificate
# Option B: Upload PFX certificate
# Option C: Use Let's Encrypt (requires additional setup)
```

#### Step 2: Update WAF Configuration

Edit `infrastructure/terraform/waf.tf`:

```hcl
# Uncomment and configure SSL certificate section:

identity {
  type = "UserAssigned"
  identity_ids = [azurerm_user_assigned_identity.app_gateway.id]
}

ssl_certificate {
  name                = "app-gateway-ssl-cert"
  key_vault_secret_id = azurerm_key_vault_certificate.main.secret_id
}

# Or use manual certificate:
# ssl_certificate {
#   name     = "app-gateway-ssl-cert"
#   data     = filebase64("${path.module}/certs/wildcard.castiel.com.pfx")
#   password = var.ssl_certificate_password
# }

# Update listener to use HTTPS:
http_listener {
  name                           = "https-listener"
  frontend_ip_configuration_name = "app-gateway-frontend-ip"
  frontend_port_name             = "https-port"
  protocol                       = "Https"
  ssl_certificate_name           = "app-gateway-ssl-cert"
}

# Update routing rule:
request_routing_rule {
  name                       = "app-service-routing-rule"
  rule_type                  = "Basic"
  http_listener_name         = "https-listener"  # Changed from "http-listener"
  backend_address_pool_name   = "app-service-backend-pool"
  backend_http_settings_name = "app-service-http-settings"
  priority                   = 100
}
```

#### Step 3: Deploy WAF

```bash
# Plan the changes
terraform plan -var-file="terraform.prod.tfvars" \
  -target=azurerm_application_gateway.main

# Apply
terraform apply -var-file="terraform.prod.tfvars" \
  -target=azurerm_application_gateway.main
```

### Option 3: Start with HTTP (No SSL)

You can deploy WAF with HTTP first, then upgrade to HTTPS:

```bash
# Current configuration uses HTTP listener
# This works immediately without SSL certificate

# Deploy WAF with HTTP
terraform apply -var-file="terraform.prod.tfvars" \
  -target=azurerm_application_gateway.main

# Later, add SSL and switch to HTTPS listener
```

## Step-by-Step: Adding WAF to Existing Deployment

### Prerequisites

- ✅ Existing App Service running
- ✅ Production environment
- ✅ Terraform state file available
- ✅ Azure credentials configured

### Steps

1. **Verify Current State**
   ```bash
   terraform state list | grep -i gateway
   # Should return nothing (WAF not deployed yet)
   ```

2. **Review WAF Configuration**
   ```bash
   cat infrastructure/terraform/waf.tf
   # Verify configuration looks correct
   ```

3. **Plan WAF Deployment**
   ```bash
   cd infrastructure/terraform
   terraform plan -var-file="terraform.prod.tfvars" \
     | grep -A 5 "azurerm_application_gateway\|azurerm_public_ip.app_gateway"
   ```

4. **Deploy WAF Resources**
   ```bash
   # Deploy incrementally
   terraform apply -var-file="terraform.prod.tfvars" \
     -target=azurerm_public_ip.app_gateway
   
   terraform apply -var-file="terraform.prod.tfvars" \
     -target=azurerm_subnet.app_gateway
   
   terraform apply -var-file="terraform.prod.tfvars" \
     -target=azurerm_application_gateway.main
   ```

5. **Update DNS (If Using Custom Domain)**
   ```bash
   # Get Application Gateway public IP
   terraform output app_gateway_public_ip
   
   # Update DNS A record to point to this IP
   # Or use CNAME to point to Application Gateway FQDN
   ```

6. **Test WAF**
   ```bash
   # Get Application Gateway URL
   AGW_IP=$(terraform output -raw app_gateway_public_ip)
   
   # Test health endpoint through WAF
   curl -v http://$AGW_IP/health
   
   # Test with custom domain (if configured)
   curl -v https://api.castiel.com/health
   ```

## WAF Configuration Options

### Current Configuration (HTTP)

```hcl
# Uses HTTP listener (port 80)
# Backend uses HTTPS (port 443) to App Service
# No SSL certificate required initially
```

### Recommended Configuration (HTTPS)

```hcl
# Uses HTTPS listener (port 443)
# Requires SSL certificate
# More secure, recommended for production
```

### WAF Modes

1. **Detection Mode** (Testing)
   ```hcl
   firewall_mode = "Detection"  # Logs but doesn't block
   ```

2. **Prevention Mode** (Production)
   ```hcl
   firewall_mode = "Prevention"  # Blocks malicious requests
   ```

## Cost Considerations

| Component | Monthly Cost (Est.) |
|-----------|-------------------|
| Application Gateway WAF_v2 (2 instances) | ~$100 |
| Public IP (Static) | ~$3 |
| DDoS Protection Standard | ~$3,000 (optional) |
| **Total** | **~$100-3,100** |

**Note**: DDoS Protection Standard is expensive. Consider if needed based on threat level.

## Testing WAF After Deployment

```bash
# 1. Test normal traffic
curl https://api.castiel.com/health

# 2. Test WAF blocking (should be blocked in Prevention mode)
curl -X POST https://api.castiel.com/api/test \
  -H "Content-Type: application/json" \
  -d "<script>alert('xss')</script>"

# 3. Check WAF logs
az monitor log-analytics query \
  --workspace <log-analytics-workspace-id> \
  --analytics-query "AzureDiagnostics | where Category == 'ApplicationGatewayFirewallLog'"
```

## Rollback Plan

If WAF causes issues, you can:

1. **Switch to Detection Mode**
   ```bash
   # Edit waf.tf: firewall_mode = "Detection"
   terraform apply -var-file="terraform.prod.tfvars" \
     -target=azurerm_application_gateway.main
   ```

2. **Temporarily Disable WAF**
   ```bash
   # Edit waf.tf: enabled = false
   terraform apply -var-file="terraform.prod.tfvars" \
     -target=azurerm_application_gateway.main
   ```

3. **Remove WAF** (if needed)
   ```bash
   terraform destroy -var-file="terraform.prod.tfvars" \
     -target=azurerm_application_gateway.main \
     -target=azurerm_public_ip.app_gateway \
     -target=azurerm_subnet.app_gateway
   ```

## Best Practices

1. ✅ **Test in Detection mode first** - Monitor logs before enabling Prevention
2. ✅ **Start with HTTP** - Add SSL certificate later
3. ✅ **Use staging slot** - Test WAF with staging App Service first
4. ✅ **Monitor logs** - Review WAF logs for false positives
5. ✅ **Tune rules** - Disable rules that cause issues with your application
6. ✅ **Gradual rollout** - Use Traffic Manager to route percentage of traffic through WAF

## Summary

- ✅ **WAF can be added anytime** - No impact on existing services
- ✅ **Start with HTTP** - SSL can be added later
- ✅ **Test incrementally** - Use Detection mode first
- ✅ **Cost-effective** - Only pay when deployed (production only)
- ✅ **Flexible** - Easy to enable/disable or modify

The current configuration is ready - just apply when you're ready to enable WAF!



