# AI Model API Keys - Azure Key Vault Integration

## Summary of Changes

This implementation migrates AI provider API keys from encrypted storage in Cosmos DB to secure storage in Azure Key Vault.

## What Changed

### 1. Key Vault Types (`packages/key-vault/src/types.ts`)
Added new SecretName enum entries for AI providers:
- `OPENAI_API_KEY`
- `AZURE_OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_AI_API_KEY`
- `MISTRAL_API_KEY`
- `COHERE_API_KEY`
- `HUGGINGFACE_API_KEY`
- `REPLICATE_API_KEY`

### 2. AIConfigService (`apps/api/src/services/ai-config.service.ts`)

**Constructor Updated**:
- Now accepts `KeyVaultService` as a parameter
- Initializes Key Vault integration

**New Methods**:
- `getProviderSecretName()`: Generates standardized secret names (format: `ai-provider-{provider}-{scope}`)
- `storeApiKeyInKeyVault()`: Handles API key storage (currently logs instructions for manual setup)
- `retrieveApiKeyFromKeyVault()`: Fetches API keys from Key Vault

**Updated Methods**:
- `addSystemCredential()`: Stores Key Vault secret reference instead of encrypted key
- `addTenantCredential()`: Stores tenant-specific keys in Key Vault
- `getApiKey()`: Retrieves keys from Key Vault with backward compatibility for legacy encrypted keys

**Backward Compatibility**:
- Detects legacy encrypted keys (contain colons: `iv:authTag:encrypted`)
- Detects Key Vault references (no colons: `ai-provider-openai-system`)
- Seamlessly handles both formats

### 3. Secret Naming Convention

**Format**: `ai-provider-{provider}-{scope}`

**Examples**:
- System OpenAI: `ai-provider-openai-system`
- Tenant Anthropic: `ai-provider-anthropic-tenant-abc123`
- Azure OpenAI: `ai-provider-azureopenai-system`

## How It Works

### Storing API Keys (Write)

```typescript
// 1. Admin adds credential via API
POST /admin/ai/credentials
{
  "provider": "openai",
  "apiKey": "sk-...",
}

// 2. AIConfigService generates secret name
const secretName = "ai-provider-openai-system";

// 3. Instructions displayed to manually add to Key Vault
console.log("Store secret in Key Vault: ai-provider-openai-system");

// 4. Secret name stored in Cosmos DB as reference
{
  "provider": "openai",
  "encryptedApiKey": "ai-provider-openai-system", // Key Vault reference
  "endpoint": null
}
```

### Retrieving API Keys (Read)

```typescript
// 1. Application needs API key
const creds = await aiConfigService.getApiKey(tenantId, 'openai');

// 2. Retrieve from Key Vault
const secretName = "ai-provider-openai-system";
const result = await keyVault.getSecret(secretName);

// 3. Use the API key
const apiKey = result.value; // "sk-..."
```

## Security Benefits

1. **HSM-backed storage**: Keys stored in hardware security modules
2. **Access control**: RBAC policies control who can read/write secrets
3. **Audit logging**: All access attempts logged
4. **Automatic rotation**: Support for key rotation policies
5. **Separation of concerns**: Keys not stored in application database
6. **Compliance**: Meets security standards (SOC 2, ISO 27001, etc.)

## Setup Required

### 1. Configure Key Vault Access

Ensure environment variables are set:
```bash
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret  # Dev only
```

### 2. Grant Permissions

```bash
az keyvault set-policy \
  --name your-vault-name \
  --spn <client-id> \
  --secret-permissions get list set delete
```

### 3. Add API Keys to Key Vault

```bash
# System-level keys
az keyvault secret set --vault-name your-vault \
  --name "ai-provider-openai-system" \
  --value "sk-..."

az keyvault secret set --vault-name your-vault \
  --name "ai-provider-anthropic-system" \
  --value "sk-ant-..."
```

## Migration from Legacy Keys

### Automatic Detection
The system automatically detects and handles both:
- **Legacy**: Encrypted keys with colons (`iv:tag:encrypted`)
- **New**: Key Vault references (`ai-provider-openai-system`)

### Manual Migration Steps

1. Extract existing encrypted keys from Cosmos DB
2. Decrypt them using the legacy method
3. Store decrypted keys in Key Vault with proper names
4. Update Cosmos DB references to use Key Vault names

See [AI Key Vault Migration Guide](./ai-key-vault-migration.md) for detailed steps.

## Usage Examples

### System-Level API Key

```typescript
// Add system credential
await aiConfigService.addSystemCredential(
  'openai',
  'sk-...',
  undefined, // no endpoint
  undefined, // no deployment mappings
  'admin@example.com'
);

// Retrieve for use
const creds = await aiConfigService.getApiKey('any-tenant', 'openai');
console.log(creds.apiKey); // Retrieved from Key Vault
```

### Tenant-Specific API Key (BYOK)

```typescript
// Tenant brings their own key
await aiConfigService.addTenantCredential(
  'tenant-abc123',
  {
    provider: 'anthropic',
    apiKey: 'sk-ant-...',
    endpoint: undefined,
    deploymentMappings: undefined
  },
  'tenant-admin@example.com'
);

// Retrieve tenant-specific key
const creds = await aiConfigService.getApiKey('tenant-abc123', 'anthropic');
console.log(creds.apiKey); // Tenant's own key from Key Vault
```

## Implementation Status

✅ **Completed**:
- Key Vault types updated with AI provider secrets
- AIConfigService modified to use Key Vault
- Secret naming convention established
- Backward compatibility for legacy encrypted keys
- Documentation and migration guide created

⚠️ **Requires Manual Setup**:
- API keys must be manually added to Key Vault
- Current implementation logs instructions instead of auto-storing
- This is intentional for security review and approval

🔮 **Future Enhancements**:
- Automatic secret storage via SecretClient.setSecret()
- Admin UI for Key Vault secret management
- Automatic key rotation support
- Per-tenant Key Vault option

## Testing

### Development (with fallback)
```bash
# Set environment variables as fallback
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# Start app (will use env vars if Key Vault unavailable)
pnpm dev
```

### Production (Key Vault required)
```bash
# Verify secrets exist
az keyvault secret show --vault-name your-vault --name "ai-provider-openai-system"

# Test API endpoint
curl -X POST https://api.yourapp.com/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "test"}'
```

## Monitoring

### Key Vault Metrics
- **ServiceApiHit**: Number of Key Vault API calls
- **ServiceApiLatency**: Response time
- **ServiceApiResult**: Success/failure rate

### Application Logs
```
✓ Retrieved API key from Key Vault: ai-provider-openai-system
⚠ Using legacy encrypted key (migrate to Key Vault)
❌ Failed to retrieve secret: ai-provider-openai-system
```

## Troubleshooting

### Secret Not Found
1. Verify secret exists: `az keyvault secret show --vault-name your-vault --name "ai-provider-openai-system"`
2. Check secret name format matches convention
3. Ensure permissions are granted

### Permission Denied
1. Verify Key Vault access policy: `az keyvault show --name your-vault --query "properties.accessPolicies"`
2. Grant required permissions: `az keyvault set-policy --name your-vault --spn <client-id> --secret-permissions get list`

### Fallback to Environment Variables
- Expected in development if Key Vault is not configured
- Enable fallback: `ENABLE_KEY_VAULT_FALLBACK=true`

## References

- [Complete Migration Guide](./ai-key-vault-migration.md)
- [Azure Key Vault Documentation](https://docs.microsoft.com/azure/key-vault)
- [Key Vault Best Practices](https://docs.microsoft.com/azure/key-vault/general/best-practices)

## Next Steps

1. **Review the implementation**: Check code changes are acceptable
2. **Setup Key Vault**: Follow setup instructions above
3. **Add secrets**: Use Azure CLI or Portal to add API keys
4. **Test**: Verify API keys are retrieved correctly
5. **Migrate**: Move legacy encrypted keys to Key Vault
6. **Monitor**: Track Key Vault metrics and application logs

## Questions?

Contact the platform team or review the detailed [Migration Guide](./ai-key-vault-migration.md).
