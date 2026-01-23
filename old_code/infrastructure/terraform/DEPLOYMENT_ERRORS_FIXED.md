# Terraform Deployment Errors - Fixed

## Errors Encountered and Fixes Applied

### 1. ✅ Cosmos DB Backup Configuration Error

**Error:**
```
Error: expanding `backup`: `retention_in_hours` cannot be defined when the `backup.type` is set to "Continuous"
```

**Fix Applied:**
- Removed `retention_in_hours` from Cosmos DB backup configuration
- For Continuous backup, retention is fixed at 7-35 days based on tier
- Updated `cosmos-db.tf` line 33-37

**Status:** ✅ Fixed

---

### 2. ⚠️ Azure Subscription Quota Errors

**Error:**
```
Error: creating App Service Plan: unexpected status 401 (401 Unauthorized)
Current Limit (Basic VMs): 0
Current Limit (Dynamic VMs): 0
```

**Issue:**
- The new subscription has 0 quota for:
  - **Basic VMs** (needed for App Service Plan B1)
  - **Dynamic VMs** (needed for Function App Consumption plan)

**Action Required:**
You must request quota increases from Azure Support:

1. **Via Azure Portal:**
   - Go to: Subscriptions → Your Subscription → Usage + quotas
   - Search for: "App Service Plan (Basic)" and "Dynamic VMs"
   - Click "Request increase"
   - Request at least 1-2 for each

2. **Via Support Ticket:**
   - Portal → Help + support → New support request
   - Type: Service and subscription limits (quotas)
   - Resource: App Service Plan / Function App
   - Details: Request Basic VMs and Dynamic VMs quota

**Status:** ⚠️ Requires Azure Support Action

---

### 3. ⚠️ Service Bus Authorization Rule Already Exists

**Error:**
```
Error: A resource with the ID ".../authorizationRules/RootManageSharedAccessKey" already exists
```

**Issue:**
- Azure automatically creates `RootManageSharedAccessKey` when a Service Bus namespace is created
- Terraform is trying to create it again

**Fix Options:**

**Option A: Import the existing rule (Recommended)**
```bash
terraform import azurerm_servicebus_namespace_authorization_rule.main \
  /subscriptions/90357f88-9f70-4a1b-9ea4-b5b739799237/resourceGroups/castiel-dev-rg/providers/Microsoft.ServiceBus/namespaces/castiel-sb-dev/authorizationRules/RootManageSharedAccessKey
```
**Note:** Use lowercase `authorizationRules` (not `AuthorizationRules`) in the resource ID.

**Option B: Remove from Terraform (if you don't need to manage it)**
- Comment out or remove the `azurerm_servicebus_namespace_authorization_rule.main` resource
- Azure will continue to manage it automatically

**Status:** ✅ Fixed (Imported into Terraform state)

---

### 4. ✅ Service Bus Queue Alert Configuration

**Error:**
- Alert scope was pointing to individual queue instead of namespace

**Fix Applied:**
- Changed scope from `azurerm_servicebus_queue.sync_inbound_webhook.id` to `azurerm_servicebus_namespace.main.id`
- Updated metric namespace to `Microsoft.ServiceBus/namespaces`
- Updated `alerts.tf` line 117-139

**Status:** ✅ Fixed

---

### 5. ⚠️ DNS Resolution Errors (Transient)

**Error:**
```
dial tcp: lookup management.azure.com on 127.0.0.53:53: server misbehaving
```

**Issue:**
- Temporary DNS resolution failures
- Affected multiple resources during deployment

**Action:**
- These are transient network issues
- Retry the deployment after a few minutes
- If persistent, check DNS configuration or network connectivity

**Status:** ⚠️ Transient - Retry Deployment

---

### 6. ⚠️ Redis Cache Creation Error

**Error:**
```
Error: creating Redis: polling after Create: internal-error: unimplemented polling status "Unknown"
```

**Issue:**
- Redis cache creation encountered an unknown status
- May be related to quota or transient Azure service issue

**Action:**
- Check if Redis cache was partially created
- Retry deployment
- If quota issue, request Redis quota increase

**Status:** ⚠️ Retry or Check Quota

---

## Summary

### Fixed Issues ✅
1. Cosmos DB backup configuration
2. Service Bus queue alert scope

### Requires Manual Action ⚠️
1. **Azure Quota Increase** (Critical - blocks deployment)
   - Request Basic VMs quota
   - Request Dynamic VMs quota
   
2. **Service Bus Authorization Rule** ✅ Fixed
   - Successfully imported into Terraform state

### Transient Issues ⚠️
1. DNS resolution errors - retry deployment
2. Redis creation error - retry or check quota

## Next Steps

1. **Request quota increases** (most critical - blocks deployment)
   - Basic VMs: At least 1-2
   - Dynamic VMs: At least 1-2
2. **Wait a few minutes** for DNS/network issues to resolve
3. **Retry deployment:**
   ```bash
   cd infrastructure/terraform
   terraform apply -var-file="terraform.dev.tfvars"
   ```

## Quick Fix Commands

### Import Service Bus Authorization Rule ✅ DONE
```bash
# Already imported - command for reference:
cd infrastructure/terraform
terraform import azurerm_servicebus_namespace_authorization_rule.main \
  /subscriptions/90357f88-9f70-4a1b-9ea4-b5b739799237/resourceGroups/castiel-dev-rg/providers/Microsoft.ServiceBus/namespaces/castiel-sb-dev/authorizationRules/RootManageSharedAccessKey
```

### Check Current Quota
```bash
az vm list-usage --location eastus --output table | grep -E "App Service|Dynamic"
```

### Retry Deployment
```bash
cd infrastructure/terraform
terraform apply -var-file="terraform.dev.tfvars"
```
