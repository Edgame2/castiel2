# AI API Keys Migration to Azure Key Vault

## Overview

This guide explains how to migrate AI provider API keys from encrypted storage in Cosmos DB to secure storage in Azure Key Vault.

## Why Key Vault?

- **Enhanced Security**: Keys are stored in a hardware security module (HSM)
- **Centralized Management**: All secrets in one secure location
- **Access Control**: Fine-grained RBAC permissions
- **Audit Logging**: Track all secret access
- **Automatic Rotation**: Support for key rotation policies
- **Compliance**: Meets industry security standards

## Architecture Changes

### Before (Encrypted in Cosmos DB)
```
API Request → AIConfigService → Decrypt from Cosmos DB → Use API Key
```

### After (Key Vault)
```
API Request → AIConfigService → Fetch from Key Vault → Use API Key
```

## Setup Instructions

### 1. Ensure Key Vault is Configured

Check your environment variables:

```bash
# Required environment variables
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret  # For local dev
```

In production, use Managed Identity instead of service principal.

### 2. Grant Permissions

Ensure the application has Key Vault permissions:

```bash
# For service principal
az keyvault set-policy \
  --name your-vault-name \
  --spn <client-id> \
  --secret-permissions get list set delete

# For managed identity (production)
az keyvault set-policy \
  --name your-vault-name \
  --object-id <managed-identity-object-id> \
  --secret-permissions get list set delete
```

### 3. Secret Naming Convention

Secrets are named using the pattern:
```
ai-provider-{provider}-{scope}
```

Examples:
- System-level OpenAI: `ai-provider-openai-system`
- Tenant-specific Anthropic: `ai-provider-anthropic-tenant-abc123`
- Azure OpenAI for tenant: `ai-provider-azureopenai-tenant-xyz789`

### 4. Add API Keys to Key Vault

#### Option A: Azure CLI

```bash
# System-level OpenAI key
az keyvault secret set \
  --vault-name your-vault-name \
  --name "ai-provider-openai-system" \
  --value "sk-..."

# Tenant-specific key
az keyvault secret set \
  --vault-name your-vault-name \
  --name "ai-provider-anthropic-tenant-abc123" \
  --value "sk-ant-..."

# Azure OpenAI
az keyvault secret set \
  --vault-name your-vault-name \
  --name "ai-provider-azureopenai-system" \
  --value "your-azure-openai-key"
```

#### Option B: Azure Portal

1. Navigate to your Key Vault in Azure Portal
2. Go to **Secrets** → **Generate/Import**
3. Set:
   - **Name**: Use the naming convention above
   - **Value**: Paste your API key
   - **Content Type**: `application/x-api-key` (optional)
4. Click **Create**

#### Option C: PowerShell

```powershell
# Set secret
Set-AzKeyVaultSecret `
  -VaultName "your-vault-name" `
  -Name "ai-provider-openai-system" `
  -SecretValue (ConvertTo-SecureString "sk-..." -AsPlainText -Force)
```

## Migration Process

### For Existing Deployments

If you have existing API keys encrypted in Cosmos DB:

1. **Identify existing keys**:
   ```typescript
   // In systemConfig container
   const systemConfig = await cosmosClient
     .database('castiel')
     .container('systemConfig')
     .item('system-ai-config', 'system-ai-config')
     .read();
   
   console.log('System credentials:', systemConfig.resource.systemCredentials);
   ```

2. **Decrypt and migrate**:
   ```typescript
   // Manual migration script (run once)
   for (const cred of systemConfig.resource.systemCredentials) {
     const decryptedKey = decryptApiKey(cred.encryptedApiKey);
     const secretName = `ai-provider-${cred.provider}-system`;
     
     // Store in Key Vault using Azure SDK
     await keyVaultClient.setSecret(secretName, decryptedKey);
     
     console.log(`Migrated ${cred.provider} to Key Vault as ${secretName}`);
   }
   ```

3. **Update references**:
   After migration, the system automatically uses Key Vault. The `encryptedApiKey` field now stores the Key Vault secret name instead of the encrypted key.

### For New Deployments

No migration needed! Just add keys directly to Key Vault before first use:

```bash
# Add all your provider keys
az keyvault secret set --vault-name your-vault --name "ai-provider-openai-system" --value "sk-..."
az keyvault secret set --vault-name your-vault --name "ai-provider-anthropic-system" --value "sk-ant-..."
az keyvault secret set --vault-name your-vault --name "ai-provider-azureopenai-system" --value "your-key"
```

## Adding New API Keys via API

When adding credentials through the admin API, the system will:

1. Generate the appropriate Key Vault secret name
2. Display instructions for manual setup (current implementation)
3. Store the secret name reference in Cosmos DB

**Example: Adding System OpenAI Credentials**

```bash
POST /admin/ai/credentials
{
  "provider": "openai",
  "apiKey": "sk-...",
  "scope": "system"
}
```

Response:
```json
{
  "success": true,
  "message": "Credential added. Please store the API key in Key Vault manually.",
  "secretName": "ai-provider-openai-system",
  "instructions": "Run: az keyvault secret set --vault-name your-vault --name 'ai-provider-openai-system' --value 'your-key'"
}
```

## Backward Compatibility

The system supports both Key Vault and legacy encrypted keys:

- **Key Vault reference**: Secret name without colons (e.g., `ai-provider-openai-system`)
- **Legacy encrypted**: Has colons in format `iv:authTag:encrypted`

Detection logic:
```typescript
const apiKey = credential.encryptedApiKey.includes(':')
  ? this.decryptApiKey(credential.encryptedApiKey) // Legacy
  : await this.retrieveApiKeyFromKeyVault(credential.encryptedApiKey); // Key Vault
```

## Supported Providers

The following AI providers are supported:

- **openai**: OpenAI API
- **azureopenai**: Azure OpenAI Service
- **anthropic**: Anthropic Claude
- **google**: Google AI (PaLM, Gemini)
- **mistral**: Mistral AI
- **cohere**: Cohere
- **huggingface**: HuggingFace Inference API
- **replicate**: Replicate

## Security Best Practices

1. **Never log API keys**: All keys are masked in logs
2. **Use Managed Identity in production**: Avoid service principal credentials
3. **Rotate keys regularly**: Set up rotation policies in Key Vault
4. **Limit access**: Use RBAC to restrict who can read/write secrets
5. **Enable audit logging**: Track all secret access
6. **Use separate vaults per environment**: dev, staging, production

## Monitoring

### Key Vault Metrics
Monitor these metrics in Azure Portal:

- **ServiceApiHit**: API calls to Key Vault
- **ServiceApiLatency**: Latency of Key Vault operations
- **ServiceApiResult**: Success/failure of operations

### Application Logs
Look for these log entries:

```
✓ Successfully retrieved API key from Key Vault: ai-provider-openai-system
⚠ Failed to retrieve from Key Vault, using fallback
❌ Failed to retrieve required secret from Key Vault
```

## Troubleshooting

### Issue: "Failed to retrieve secret from Key Vault"

**Causes**:
1. Secret doesn't exist in Key Vault
2. Insufficient permissions
3. Key Vault URL is incorrect
4. Network connectivity issues

**Solutions**:
```bash
# Verify secret exists
az keyvault secret show --vault-name your-vault --name "ai-provider-openai-system"

# Check permissions
az keyvault show --name your-vault --query "properties.accessPolicies"

# Test connectivity
curl https://your-vault.vault.azure.net/
```

### Issue: "Fallback to environment variables"

This means Key Vault is unavailable but the app is using environment variables as fallback (development mode).

**Solution**: Ensure Key Vault is properly configured or accept fallback behavior in dev environment.

### Issue: Legacy keys still being used

**Solution**: Run migration script to convert all encrypted keys to Key Vault references.

## Future Enhancements

Planned improvements:

1. **Automatic storage**: API will store keys directly in Key Vault (requires setSecret implementation)
2. **Key rotation**: Automatic rotation support
3. **Multi-region**: Key Vault replication for high availability
4. **Per-tenant vaults**: Option for tenants to use their own Key Vaults

## Testing

### Local Development
```bash
# Use environment variables as fallback
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# Start app (will use env vars if Key Vault unavailable)
pnpm dev
```

### Production Testing
```bash
# Verify Key Vault access
az keyvault secret show --vault-name your-vault --name "ai-provider-openai-system"

# Test API endpoint
curl -X POST https://your-api.com/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

## Support

For questions or issues:
- Check Azure Key Vault documentation: https://docs.microsoft.com/azure/key-vault
- Review application logs for detailed error messages
- Contact the platform team for assistance

## References

- [Azure Key Vault Overview](https://docs.microsoft.com/azure/key-vault/general/overview)
- [Best practices for using Azure Key Vault](https://docs.microsoft.com/azure/key-vault/general/best-practices)
- [Azure Key Vault SDK for Node.js](https://docs.microsoft.com/javascript/api/overview/azure/keyvault-secrets-readme)
