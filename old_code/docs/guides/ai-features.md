# AI Features Guide

Complete guide to AI model catalog, connections, and Key Vault integration in Castiel.

## Overview

Castiel uses a **two-part AI configuration system**:

1. **AI Models (Catalog)** - Defines available models and their capabilities (super admin only)
2. **AI Connections** - Specific credentials/endpoints to connect to models (system-wide or tenant-specific)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI MODELS (Catalog)                      │
│                   Super Admin Only                          │
├─────────────────────────────────────────────────────────────┤
│  • Model capabilities and specifications                    │
│  • Provider, type, hoster                                   │
│  • Context window, streaming, vision, functions             │
│  • Managed globally                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Referenced by
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI CONNECTIONS                             │
│            System-Wide or Tenant-Specific                   │
├─────────────────────────────────────────────────────────────┤
│  • Specific endpoint + API key for a model                  │
│  • System: Created by super admin (all tenants)            │
│  • Tenant: BYOK - tenant brings their own key              │
│  • API keys stored in Azure Key Vault                      │
│  • Database stores only Key Vault reference                │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Backend Setup

1. **Environment Variables** (`apps/api/.env`):
```bash
# Cosmos DB containers
COSMOS_DB_AI_MODELS_CONTAINER=ai-models
COSMOS_DB_AI_CONNECTIONS_CONTAINER=ai-connections

# Azure Key Vault
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
ENABLE_KEY_VAULT=true

# Development: Service Principal
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Production: Managed Identity
KEY_VAULT_USE_MANAGED_IDENTITY=true
```

2. **Initialize Services** - Services auto-initialize on startup

3. **API Routes** - Available at:
   - `/api/v1/admin/ai/models` - Model catalog (super admin)
   - `/api/v1/admin/ai/connections` - System connections (super admin)
   - `/api/v1/tenant/ai/connections` - Tenant connections (BYOK)

### Frontend Setup

1. **React Hooks** - Available in `apps/web/src/hooks/use-ai-settings.ts`
2. **API Client** - Available in `apps/web/src/lib/api/ai-settings.ts`
3. **UI Components** - Located in `apps/web/src/app/(protected)/admin/ai-settings/`

## Azure Key Vault Integration

### Setup

#### 1. Create Key Vault

```bash
RESOURCE_GROUP="castiel-rg"
LOCATION="eastus"
VAULT_NAME="castiel-vault"  # Must be globally unique

az keyvault create \
  --name $VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

#### 2. Development: Service Principal

```bash
# Create service principal
az ad sp create-for-rbac \
  --name castiel-dev-sp \
  --role Contributor

# Grant Key Vault permissions
az keyvault set-policy \
  --name $VAULT_NAME \
  --spn <appId> \
  --secret-permissions get list set delete
```

#### 3. Production: Managed Identity

```bash
# Enable managed identity
az webapp identity assign \
  --name your-app-name \
  --resource-group $RESOURCE_GROUP

# Grant Key Vault permissions
PRINCIPAL_ID=$(az webapp identity show \
  --name your-app-name \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

az keyvault set-policy \
  --name $VAULT_NAME \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list set delete
```

### API Key Storage Flow

```
User enters API key in UI
         ↓
POST /tenant/ai/connections
         ↓
AIConnectionService.createConnection()
         ↓
Generate secretId: ai-provider-{provider}-tenant-{tenantId}
         ↓
keyVault.setSecret(secretId, apiKey)
         ↓
Store connection in Cosmos DB with secretId reference
         ↓
Return success (without API key)

═══════════════════════════════════════════

Runtime: Get credentials
         ↓
AIConnectionService.getConnectionWithCredentials()
         ↓
Query Cosmos DB for connection
         ↓
keyVault.getSecret(connection.secretId)
         ↓
Return { connection, model, apiKey }
```

## API Reference

### Model Catalog (Super Admin)

```http
GET    /api/v1/admin/ai/models              # List models
GET    /api/v1/admin/ai/models/:id         # Get model details
POST   /api/v1/admin/ai/models             # Create model
PATCH  /api/v1/admin/ai/models/:id         # Update model
DELETE /api/v1/admin/ai/models/:id         # Delete model
GET    /api/v1/tenant/ai/available-models  # Models for tenant BYOK
```

### System Connections (Super Admin)

```http
GET    /api/v1/admin/ai/connections         # List system connections
POST   /api/v1/admin/ai/connections         # Create system connection
PATCH  /api/v1/admin/ai/connections/:id     # Update connection
DELETE /api/v1/admin/ai/connections/:id    # Delete connection
```

### Tenant Connections (Tenant Admin)

```http
GET    /api/v1/tenant/ai/connections                    # List tenant connections
POST   /api/v1/tenant/ai/connections                   # Create tenant connection (BYOK)
PATCH  /api/v1/tenant/ai/connections/:id              # Update connection
DELETE /api/v1/tenant/ai/connections/:id               # Delete connection
GET    /api/v1/tenant/ai/connections/default/:type     # Get default LLM/Embedding
```

## React Hooks

### Catalog Management

- `useAIModelsCatalog(filters?)` - List models
- `useCreateModelCatalog()` - Create model
- `useUpdateModelCatalog()` - Edit model
- `useDeleteModelCatalog()` - Delete model
- `useModelsForTenants()` - Available for BYOK

### System Connections

- `useSystemConnections(filters?)` - List connections
- `useCreateSystemConnection()` - Create with API key
- `useUpdateSystemConnection()` - Edit connection
- `useDeleteSystemConnection()` - Delete connection

### Tenant Connections

- `useTenantConnections()` - List available
- `useCreateTenantConnection()` - BYOK
- `useUpdateTenantConnection()` - Edit
- `useDeleteTenantConnection()` - Delete
- `useDefaultConnection(type)` - Get default

## Data Model

### AIModel (Catalog)

```typescript
{
  id: "model-openai-gpt-4-turbo",
  name: "GPT-4 Turbo",
  provider: "OpenAI",
  type: "LLM" | "Embedding",
  hoster: "OpenAI" | "Azure" | "AWS" | "GCP" | "Anthropic" | "Self-Hosted",
  allowTenantConnections: true,
  contextWindow: 128000,
  maxOutputs: 4096,
  streaming: true,
  vision: true,
  functions: true,
  jsonMode: true,
  status: "active",
  description?: string,
  modelIdentifier?: string,
  pricing?: {
    inputTokenPrice: number,
    outputTokenPrice: number,
    currency: string
  }
}
```

### AIConnection (Instance)

```typescript
{
  id: "conn-model-openai-gpt-4-turbo-system-1733011200000",
  name: "System OpenAI GPT-4",
  modelId: "model-openai-gpt-4-turbo",
  tenantId: string | null,  // null = system-wide
  endpoint: "https://api.openai.com/v1",
  version?: string,
  deploymentName?: string,
  contextWindow: 128000,
  isDefaultModel: true,
  secretId: "ai-provider-openai-system",  // Key Vault reference
  status: "active"
}
```

## Key Features

### 1. Secure Credential Storage
- All API keys stored in Azure Key Vault
- Database never stores actual keys
- Key Vault references: `ai-provider-{provider}-{scope}`

### 2. Automatic Default Management
- One default LLM per scope (system/tenant)
- One default Embedding per scope
- Setting new default automatically unsets previous

### 3. Tenant Isolation
- Tenants can only see/modify their own connections
- System connections visible as fallback
- Tenant connections override system for same model

### 4. Tenant Visibility Logic

**Scenario 1: Tenant with own connection**
- Tenant creates connection to GPT-4 with their API key
- Tenant sees: **Their GPT-4 connection**
- System has GPT-4 connection: **Hidden** (tenant overrides)

**Scenario 2: Tenant without connection**
- Tenant has no GPT-4 connection
- System has GPT-4 connection: **Visible**
- Tenant uses system connection

**Scenario 3: Multiple models**
- System has: GPT-4, Claude, Gemini connections
- Tenant has: GPT-4 connection (override)
- Tenant sees:
  - **Their GPT-4** (uses their key)
  - **System Claude** (uses system key)
  - **System Gemini** (uses system key)

## Testing

### Local Development Test

```bash
# Start the server
pnpm --filter @castiel/api dev

# Check logs for:
✅ Azure Key Vault service initialized
✅ AI Config service initialized with Key Vault integration
```

### Create Model Test

```bash
curl -X POST http://localhost:3001/api/v1/admin/ai/models \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4o",
    "provider": "OpenAI",
    "type": "LLM",
    "hoster": "Azure",
    "allowTenantConnections": true,
    "contextWindow": 128000,
    "maxOutputs": 16384,
    "streaming": true,
    "vision": true,
    "functions": true,
    "jsonMode": true
  }'
```

### Create Connection Test

```bash
curl -X POST http://localhost:3001/api/v1/admin/ai/connections \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System OpenAI GPT-4",
    "modelId": "model-openai-gpt-4-turbo",
    "endpoint": "https://api.openai.com/v1",
    "apiKey": "sk-test-1234",
    "isDefaultModel": true
  }'
```

### Verify Key Vault

```bash
# List secrets
az keyvault secret list --vault-name $VAULT_NAME

# Should see:
# - ai-provider-openai-system
```

## Troubleshooting

### Issue: "Key Vault is not configured"

**Solution**: Check environment variable `AZURE_KEY_VAULT_URL` is set correctly.

### Issue: "Permission denied"

**Solution**: Re-grant Key Vault permissions:
```bash
az keyvault set-policy \
  --name $VAULT_NAME \
  --spn $AZURE_CLIENT_ID \
  --secret-permissions get list set delete
```

### Issue: "Stored in memory" warning

**Solution**: This is a fallback. Key Vault not configured or not enabled. Check logs for why.

## File Locations

### Backend
- Services: `apps/api/src/services/ai/`
- Routes: `apps/api/src/routes/ai-models.routes.ts`, `ai-connections.routes.ts`
- Types: `packages/shared-types/src/ai-models.ts`
- Config: `apps/api/src/config/env.ts`

### Frontend
- Main Page: `apps/web/src/app/(protected)/admin/ai-settings/page.tsx`
- Hooks: `apps/web/src/hooks/use-ai-settings.ts`
- API Client: `apps/web/src/lib/api/ai-settings.ts`
- Components: `apps/web/src/app/(protected)/admin/ai-settings/components/`

## Related Documentation

- [AI Insights Features](../features/ai-insights/README.md) - AI insights and grounding
- [Key Vault Setup](../setup/azure-key-vault.md) - Azure Key Vault configuration
- [Authentication Guide](./authentication.md) - Auth system details

## Success Criteria

You'll know it's working when:

1. ✅ Admin can enter API key in UI
2. ✅ Secret appears in Azure Key Vault (verify via Azure Portal or CLI)
3. ✅ Database shows Key Vault reference (not encrypted key)
4. ✅ AI requests work using stored key
5. ✅ Logs show "Retrieved API key from Key Vault"
6. ✅ No error messages about Key Vault permissions

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - AI features fully implemented

#### Implemented Features (✅)

- ✅ AI model catalog management
- ✅ AI connection management (system and tenant)
- ✅ Azure Key Vault integration
- ✅ BYOK (Bring Your Own Key) support
- ✅ Model selection service
- ✅ Cost tracking and budget management
- ✅ API routes for model and connection management
- ✅ Frontend UI components
- ✅ React hooks for AI settings

#### Known Limitations

- ⚠️ **Model Fine-tuning** - Fine-tuning support planned but not yet implemented (see ML system documentation)
- ⚠️ **Advanced Model Selection** - Current selection is based on complexity, advanced strategies may be limited

### Code References

- **Backend Services:**
  - `apps/api/src/services/ai/ai-connection.service.ts` - Connection management
  - `apps/api/src/services/ai/ai-model-seeder.service.ts` - Model seeding
  - `apps/api/src/services/ai/ai-model-selection.service.ts` - Model selection
  - `apps/api/src/services/ai-config.service.ts` - AI configuration

- **API Routes:**
  - `/api/v1/admin/ai/models` - Model catalog (super admin)
  - `/api/v1/admin/ai/connections` - System connections (super admin)
  - `/api/v1/tenant/ai/connections` - Tenant connections (BYOK)

- **Frontend:**
  - `apps/web/src/hooks/use-ai-settings.ts` - React hooks
  - `apps/web/src/lib/api/ai-settings.ts` - API client
  - `apps/web/src/app/(protected)/admin/ai-settings/` - UI components

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [AI Insights Feature](../features/ai-insights/README.md) - AI insights system
- [Machine Learning Documentation](../machine%20learning/) - ML system (not implemented)
