# 🎯 Azure Key Vault Integration - Quick Start Checklist

## Pre-Deployment Checklist

### ✅ Code Changes (ALL COMPLETE)

- [x] **KeyVaultService.setSecret()** - Stores secrets in Azure Key Vault
- [x] **KeyVaultService.deleteSecret()** - Removes secrets from Key Vault
- [x] **AIConfigService** - Integrated with Key Vault
- [x] **index.ts** - Services initialized
- [x] **ai-settings.routes.ts** - Routes updated to use AIConfigService
- [x] **env.ts** - Configuration added
- [x] **fastify.d.ts** - TypeScript declarations added

### 🔧 Azure Setup (DO BEFORE DEPLOYMENT)

#### 1. Create Key Vault

```bash
# Set variables
RESOURCE_GROUP="castiel-rg"
LOCATION="eastus"
VAULT_NAME="castiel-vault"  # Must be globally unique

# Create Key Vault
az keyvault create \
  --name $VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Get the vault URL (save this for env vars)
az keyvault show \
  --name $VAULT_NAME \
  --query properties.vaultUri \
  --output tsv
```

#### 2. Development: Create Service Principal

```bash
# Create service principal
az ad sp create-for-rbac \
  --name castiel-dev-sp \
  --role Contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP

# Save the output:
# - appId → AZURE_CLIENT_ID
# - password → AZURE_CLIENT_SECRET
# - tenant → AZURE_TENANT_ID

# Grant Key Vault permissions
az keyvault set-policy \
  --name $VAULT_NAME \
  --spn <appId-from-above> \
  --secret-permissions get list set delete
```

#### 3. Production: Enable Managed Identity

```bash
# Enable managed identity on your App Service/Container
az webapp identity assign \
  --name your-app-name \
  --resource-group $RESOURCE_GROUP

# Get principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name your-app-name \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

# Grant Key Vault permissions
az keyvault set-policy \
  --name $VAULT_NAME \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list set delete
```

### 📝 Environment Variables

#### Development (.env)

```bash
# Azure Key Vault
AZURE_KEY_VAULT_URL=https://castiel-vault.vault.azure.net/

# Service Principal (Development Only)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Optional
ENABLE_KEY_VAULT=true
KEY_VAULT_CACHE_TTL=300000
```

#### Production (App Service Configuration)

```bash
# Required
az webapp config appsettings set \
  --name your-app-name \
  --resource-group $RESOURCE_GROUP \
  --settings \
    AZURE_KEY_VAULT_URL=https://castiel-vault.vault.azure.net/ \
    KEY_VAULT_USE_MANAGED_IDENTITY=true

# Optional
az webapp config appsettings set \
  --name your-app-name \
  --resource-group $RESOURCE_GROUP \
  --settings \
    ENABLE_KEY_VAULT=true \
    KEY_VAULT_CACHE_TTL=300000
```

### 🧪 Testing Checklist

#### 1. Local Development Test

```bash
# Start the server
pnpm --filter @castiel/api dev

# Check logs for:
✅ Azure Key Vault service initialized
✅ AI Config service initialized with Key Vault integration
```

#### 2. Add Credentials Test

```bash
# Get auth token
TOKEN="your-jwt-token"

# Add OpenAI credentials
curl -X POST http://localhost:3000/tenant/ai/credentials/openai \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "sk-test-1234"}'

# Expected response:
{
  "success": true,
  "message": "Credentials stored securely in Azure Key Vault"
}
```

#### 3. Verify in Azure

```bash
# List secrets
az keyvault secret list --vault-name $VAULT_NAME

# Should see:
# - ai-provider-openai-tenant-{tenantId}
```

#### 4. AI Request Test

```bash
# Make AI request (should use stored key)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Check logs for:
Retrieved API key from Key Vault: ai-provider-openai-tenant-{id}
```

#### 5. Delete Credentials Test

```bash
# Delete credentials
curl -X DELETE http://localhost:3000/tenant/ai/credentials/openai \
  -H "Authorization: Bearer $TOKEN"

# Expected: 204 No Content

# Verify deletion in Azure
az keyvault secret show \
  --vault-name $VAULT_NAME \
  --name "ai-provider-openai-tenant-{tenantId}"

# Expected: NotFound error
```

### 🚀 Deployment Steps

#### 1. Pre-Deployment

- [ ] Run tests locally
- [ ] Verify Key Vault access
- [ ] Commit all code changes
- [ ] Update environment variables in production

#### 2. Deploy

```bash
# Deploy to production
git push origin main

# Or manually deploy
az webapp deployment source config-zip \
  --name your-app-name \
  --resource-group $RESOURCE_GROUP \
  --src dist.zip
```

#### 3. Post-Deployment

- [ ] Check application logs for initialization messages
- [ ] Test credential addition via UI
- [ ] Verify secrets in Azure Key Vault
- [ ] Test AI requests
- [ ] Monitor for errors

### 🔍 Monitoring

#### Application Insights Queries

```kusto
// Successful credential additions
traces
| where message contains "tenant-ai-credentials.added"
| where customDimensions.storedIn == "key-vault"
| project timestamp, tenantId=customDimensions.tenantId, provider=customDimensions.provider

// Failed Key Vault operations
traces
| where message contains "Failed to" and message contains "credentials"
| project timestamp, message, severityLevel
```

#### Key Vault Diagnostic Logs

```kusto
// All Key Vault operations
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| project TimeGenerated, OperationName, ResultType, CallerIPAddress

// Failed operations
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where ResultType != "Success"
| project TimeGenerated, OperationName, ResultSignature
```

### 🆘 Common Issues

#### Issue: "Key Vault is not configured"

**Solution**:
```bash
# Check environment variable
echo $AZURE_KEY_VAULT_URL

# Should output: https://your-vault.vault.azure.net/
```

#### Issue: "Permission denied"

**Solution**:
```bash
# Re-grant permissions
az keyvault set-policy \
  --name $VAULT_NAME \
  --spn $AZURE_CLIENT_ID \
  --secret-permissions get list set delete
```

#### Issue: "Stored in memory" warning

**Solution**: This is a fallback. Key Vault not configured or not enabled. Check logs for why.

### 📚 Documentation

- **Complete Setup**: `/docs/guides/AI_KEY_VAULT_COMPLETE_SETUP.md`
- **Integration Status**: `/docs/guides/AI_KEY_VAULT_INTEGRATION_COMPLETE.md`
- **Implementation Details**: `/docs/guides/AI_KEY_VAULT_IMPLEMENTATION.md`
- **Migration Guide**: `/docs/guides/ai-key-vault-migration.md`

### ✅ Success Criteria

You'll know it's working when:

1. ✅ Admin can enter API key in UI
2. ✅ Secret appears in Azure Key Vault (verify via Azure Portal or CLI)
3. ✅ Database shows Key Vault reference (not encrypted key)
4. ✅ AI requests work using stored key
5. ✅ Logs show "Retrieved API key from Key Vault"
6. ✅ No error messages about Key Vault permissions

---

## 🎉 Ready to Deploy!

All code changes are complete. Follow the Azure setup steps above, deploy, and you're done!

**Questions?** Check the documentation or Azure Key Vault logs for detailed error messages.
