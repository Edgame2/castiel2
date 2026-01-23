# Complete AI API Key Storage Flow - Key Vault Integration

## Overview

This document describes the **complete end-to-end flow** for storing AI provider API keys securely:

1. **Admin enters API key in UI** (web interface)
2. **Backend creates secret in Azure Key Vault** (automatic)
3. **Database stores only the Key Vault reference** (not the key)
4. **Runtime retrieves key from Key Vault** (when needed)

## Implementation Status

### ✅ Completed

1. **KeyVaultService.setSecret()** - Can now write secrets to Key Vault
2. **KeyVaultService.deleteSecret()** - Can delete secrets from Key Vault  
3. **AIConfigService.storeApiKeyInKeyVault()** - Automatically stores keys in Key Vault
4. **AIConfigService.retrieveApiKeyFromKeyVault()** - Retrieves keys from Key Vault
5. **AIConfigService.getApiKey()** - Smart detection of Key Vault vs legacy encrypted keys
6. **Backward compatibility** - Supports both new Key Vault and old encrypted keys

### ⚠️ Requires Integration

The following need to be connected in your `apps/api/src/index.ts`:

1. **Initialize KeyVaultService** on app startup
2. **Inject KeyVaultService into AIConfigService**
3. **Pass AIConfigService to routes**

## Step-by-Step Implementation

### 1. Initialize Key Vault Service (apps/api/src/index.ts)

Add this code where other services are initialized:

```typescript
import { KeyVaultService } from '@castiel/key-vault';
import { AIConfigService } from './services/ai-config.service.js';

// ... existing code ...

const start = async () => {
  try {
    // ... existing Redis, CosmosDB initialization ...

    // Initialize Key Vault Service
    const keyVaultService = new KeyVaultService({
      vaultUrl: config.keyVault.url, // e.g., https://your-vault.vault.azure.net/
      useManagedIdentity: config.env === 'production',
      servicePrincipal: config.env !== 'production' ? {
        tenantId: config.azure.tenantId,
        clientId: config.azure.clientId,
        clientSecret: config.azure.clientSecret,
      } : undefined,
      cacheTTL: 300000, // 5 minutes
      enableFallback: config.env !== 'production',
    });
    server.log.info('✅ Key Vault service initialized');

    // Initialize AI Config Service (NEW)
    const aiConfigService = new AIConfigService(
      cosmosClient,
      redisClient,
      keyVaultService // <-- Key Vault injected here
    );
    await aiConfigService.ensureContainers();
    server.decorate('aiConfigService', aiConfigService);
    server.log.info('✅ AI Config service initialized');

    // ... rest of startup code ...
  }
}
```

### 2. Update Config (apps/api/src/config/env.ts)

Ensure your config includes Key Vault settings:

```typescript
export const config = {
  // ... existing config ...
  
  keyVault: {
    url: process.env.AZURE_KEY_VAULT_URL || 'https://your-vault.vault.azure.net/',
    enabled: process.env.ENABLE_KEY_VAULT === 'true' || process.env.NODE_ENV === 'production',
  },
  
  azure: {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
  },
};
```

### 3. Add TypeScript Decorators

Add type declaration for the new decorator:

```typescript
// apps/api/src/types/fastify.d.ts (or create if doesn't exist)
import { AIConfigService } from '../services/ai-config.service';

declare module 'fastify' {
  interface FastifyInstance {
    aiConfigService: AIConfigService;
    // ... other decorators ...
  }
}
```

### 4. Update AI Settings Routes

Replace in-memory storage with AIConfigService:

```typescript
// apps/api/src/routes/ai-settings.routes.ts

/**
 * Add custom credentials for a provider
 * POST /tenant/ai/credentials/:provider
 */
fastify.post<{
  Params: { provider: string };
  Body: { apiKey: string; endpoint?: string; deploymentMappings?: Record<string, string> };
}>(
  '/tenant/ai/credentials/:provider',
  {
    schema: {
      description: 'Add custom API credentials for a provider (BYOK)',
      tags: ['ai-tenant'],
      body: {
        type: 'object',
        required: ['apiKey'],
        properties: {
          apiKey: { type: 'string', description: 'API key for the provider' },
          endpoint: { type: 'string', description: 'Optional custom endpoint (for Azure OpenAI)' },
          deploymentMappings: { 
            type: 'object', 
            description: 'Model to deployment name mappings (for Azure)' 
          },
        },
      },
    },
  },
  async (request, reply) => {
    const { tenantId, userId } = request.user!;
    const { provider } = request.params;
    const { apiKey, endpoint, deploymentMappings } = request.body;

    try {
      // Use AIConfigService to store in Key Vault
      await fastify.aiConfigService.addTenantCredential(
        tenantId,
        {
          provider: provider as any, // Cast to AIProviderName
          apiKey,
          endpoint,
          deploymentMappings,
        },
        userId
      );

      monitoring.trackEvent('tenant-ai-credentials.added', {
        tenantId,
        provider,
        addedBy: userId,
      });

      return { 
        success: true,
        message: 'Credentials stored securely in Azure Key Vault',
        provider,
      };
    } catch (error) {
      server.log.error('Failed to add tenant credentials:', error);
      return reply.status(500).send({
        error: 'Failed to store credentials',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Add system-level credentials (Super Admin only)
 * POST /admin/ai/credentials/:provider
 */
fastify.post<{
  Params: { provider: string };
  Body: { apiKey: string; endpoint?: string; deploymentMappings?: Record<string, string> };
}>(
  '/admin/ai/credentials/:provider',
  {
    schema: {
      description: 'Add system-level AI provider credentials',
      tags: ['ai-admin'],
    },
    preHandler: [authenticate, requireSuperAdmin], // Add your auth middleware
  },
  async (request, reply) => {
    const { userId } = request.user!;
    const { provider } = request.params;
    const { apiKey, endpoint, deploymentMappings } = request.body;

    try {
      await fastify.aiConfigService.addSystemCredential(
        provider as any,
        apiKey,
        endpoint,
        deploymentMappings,
        userId
      );

      monitoring.trackEvent('system-ai-credentials.added', {
        provider,
        addedBy: userId,
      });

      return {
        success: true,
        message: 'System credentials stored securely in Azure Key Vault',
        provider,
      };
    } catch (error) {
      server.log.error('Failed to add system credentials:', error);
      return reply.status(500).send({
        error: 'Failed to store credentials',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Remove tenant credentials
 * DELETE /tenant/ai/credentials/:provider
 */
fastify.delete<{ Params: { provider: string } }>(
  '/tenant/ai/credentials/:provider',
  async (request, reply) => {
    const { tenantId, userId } = request.user!;
    const { provider } = request.params;

    try {
      await fastify.aiConfigService.removeTenantCredential(
        tenantId,
        provider as any,
        userId
      );

      return { success: true };
    } catch (error) {
      server.log.error('Failed to remove credentials:', error);
      return reply.status(500).send({ error: 'Failed to remove credentials' });
    }
  }
);
```

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADMIN UI (React)                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  AI Settings Page                                         │ │
│  │  • Select Provider (OpenAI, Anthropic, etc.)              │ │
│  │  • Enter API Key: [sk-...]                                │ │
│  │  • Optional: Endpoint, Deployment Mappings                │ │
│  │  • Click "Save"                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /admin/ai/credentials/openai
                             │ { "apiKey": "sk-..." }
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FASTIFY BACKEND                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Route Handler                                            │ │
│  │  aiConfigService.addSystemCredential(provider, apiKey)    │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────────────┐ │
│  │  AIConfigService                                          │ │
│  │  1. Generate secret name: "ai-provider-openai-system"    │ │
│  │  2. keyVault.setSecret(name, apiKey)                     │ │
│  │  3. Store reference in Cosmos DB                          │ │
│  └────────────────────────┬──────────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │  Azure Key Vault│ │  Cosmos DB  │ │   Response      │
    │                 │ │             │ │                 │
    │  Secret Created:│ │  Stores:    │ │  { success:     │
    │  Name: ai-      │ │  {          │ │    true,        │
    │   provider-     │ │   provider: │ │    message:     │
    │   openai-system │ │   "openai", │ │    "Stored in   │
    │  Value: sk-...  │ │   encrypted │ │     Key Vault"  │
    │  Tags:          │ │   ApiKey:   │ │  }              │
    │   - provider    │ │   "ai-pro   │ │                 │
    │   - scope       │ │    vider-   │ │                 │
    │   - type        │ │    openai-  │ │                 │
    │                 │ │    system"  │ │                 │
    │  ✓ Stored!      │ │  }          │ │  ✓ Returned     │
    └─────────────────┘ └─────────────┘ └─────────────────┘

═══════════════════════════════════════════════════════════════════

                    RUNTIME: Using the API Key

┌─────────────────────────────────────────────────────────────────┐
│                    AI Request (Chat, etc.)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  AIConfigService.getApiKey(tenantId, "openai")                  │
│  1. Query Cosmos DB for credential reference                    │
│  2. Get: { encryptedApiKey: "ai-provider-openai-system" }      │
│  3. Detect it's a Key Vault reference (no colons)              │
│  4. keyVault.getSecret("ai-provider-openai-system")            │
│  5. Return: { apiKey: "sk-...", endpoint, etc }                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Use API Key to call AI Provider (OpenAI, Anthropic, etc.)     │
│  • Make authenticated request                                   │
│  • Get AI response                                              │
│  • Return to user                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Variables Required

```bash
# Azure Key Vault
AZURE_KEY_VAULT_URL=https://your-vault-name.vault.azure.net/

# Development: Service Principal
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-app-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Production: Use Managed Identity (no credentials needed)
# Assign managed identity to your App Service/Container
```

## Azure Key Vault Permissions

Grant the application identity these permissions:

```bash
# For development (service principal)
az keyvault set-policy \
  --name your-vault-name \
  --spn $AZURE_CLIENT_ID \
  --secret-permissions get list set delete

# For production (managed identity)
az keyvault set-policy \
  --name your-vault-name \
  --object-id $(az webapp identity show --name your-app --resource-group your-rg --query principalId -o tsv) \
  --secret-permissions get list set delete
```

## Testing the Flow

### 1. Test Secret Storage

```bash
# Add system credentials via API
curl -X POST https://your-api.com/admin/ai/credentials/openai \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "sk-test-key",
    "endpoint": null
  }'

# Expected response:
{
  "success": true,
  "message": "System credentials stored securely in Azure Key Vault",
  "provider": "openai"
}
```

### 2. Verify in Key Vault

```bash
# Check secret was created
az keyvault secret show \
  --vault-name your-vault-name \
  --name "ai-provider-openai-system"

# Should return the secret metadata (not the value in logs)
```

### 3. Test Secret Retrieval

```bash
# Make an AI request (should use the stored key)
curl -X POST https://your-api.com/api/ai/chat \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, test the AI integration"
  }'

# Check logs for:
# ✓ Retrieved API key from Key Vault: ai-provider-openai-system
```

### 4. Test Tenant BYOK

```bash
# Tenant adds their own key
curl -X POST https://your-api.com/tenant/ai/credentials/anthropic \
  -H "Authorization: Bearer $TENANT_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "sk-ant-tenant-key"
  }'

# Verify tenant-specific secret created:
# ai-provider-anthropic-tenant-{tenantId}
```

## UI Components

The UI already exists! The forms in:
- `/apps/web/src/app/(protected)/admin/ai-settings/page.tsx`
- Component forms for adding/editing models

Just need to ensure the API endpoints are called correctly.

Example form submission:

```typescript
// In your React component
const handleSaveCredentials = async (provider: string, apiKey: string) => {
  try {
    const response = await fetch('/admin/ai/credentials/' + provider, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ apiKey }),
    });

    if (response.ok) {
      toast.success('API key stored securely in Key Vault');
    } else {
      const error = await response.json();
      toast.error(error.message || 'Failed to store credentials');
    }
  } catch (error) {
    toast.error('Network error');
  }
};
```

## Security Considerations

1. **Key Vault Access**: Only the backend service can access Key Vault
2. **API Keys Never Logged**: Keys are masked in all logs
3. **HTTPS Required**: All API calls must use HTTPS
4. **RBAC**: Use Azure RBAC to control who can manage secrets
5. **Audit Logs**: Enable Key Vault audit logging
6. **Key Rotation**: Plan for regular key rotation
7. **Separation**: System keys vs tenant keys stored separately

## Monitoring

### Key Metrics to Track

```typescript
// In your monitoring
monitoring.trackMetric('keyvault.secret.write', 1, { provider, scope });
monitoring.trackMetric('keyvault.secret.read', 1, { provider, cached });
monitoring.trackMetric('keyvault.secret.read.latency', durationMs);
```

### Alerts to Set Up

1. **Failed Key Vault access**: Alert if reads fail
2. **Permission errors**: Alert on 403 errors
3. **High latency**: Alert if Key Vault calls > 1000ms
4. **Cache miss rate**: Track Key Vault cache effectiveness

## Troubleshooting

### Error: "Key Vault is not configured"

**Cause**: Missing environment variables

**Solution**:
```bash
export AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
export AZURE_CLIENT_ID=your-client-id
export AZURE_CLIENT_SECRET=your-secret
```

### Error: "Insufficient permissions to write to Key Vault"

**Cause**: Missing Key Vault access policy

**Solution**:
```bash
az keyvault set-policy --name your-vault \
  --spn $AZURE_CLIENT_ID \
  --secret-permissions set get list delete
```

### Error: "Failed to retrieve secret"

**Cause**: Secret doesn't exist or wrong name

**Solution**:
```bash
# List all secrets
az keyvault secret list --vault-name your-vault

# Check specific secret
az keyvault secret show --vault-name your-vault \
  --name "ai-provider-openai-system"
```

## Next Steps

1. ✅ **Initialize KeyVaultService** in `index.ts`
2. ✅ **Initialize AIConfigService** with Key Vault injection
3. ✅ **Update routes** to use AIConfigService
4. ✅ **Set environment variables** for Key Vault access
5. ✅ **Grant Key Vault permissions** to your app
6. ✅ **Test the complete flow** from UI to Key Vault to AI request
7. ✅ **Enable monitoring** and alerts
8. ✅ **Document for your team**

## Success Criteria

You'll know it's working when:

1. ✅ Admin can enter API key in UI
2. ✅ Key is stored in Key Vault (verify with Azure CLI)
3. ✅ Database shows Key Vault reference (not encrypted key)
4. ✅ AI requests work using the stored key
5. ✅ Logs show "Retrieved API key from Key Vault"
6. ✅ Tenant BYOK works with separate secrets

## Support

If you need help:
- Check the logs for specific error messages
- Verify Key Vault permissions with `az keyvault show`
- Test Key Vault connectivity with `az keyvault secret list`
- Review the implementation in `AIConfigService`

---

**Ready to implement?** Follow the steps above and you'll have secure AI API key storage working end-to-end!
