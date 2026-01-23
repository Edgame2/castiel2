# AI Configuration System - Two-Part Architecture

## Overview

Complete redesign of AI model configuration into a **two-part system**:

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

## Implementation Status

### ✅ Completed

1. **Type Definitions** (`/packages/shared-types/src/ai-models.ts`)
   - `AIModel` - Catalog entry
   - `AIConnection` - Instance configuration
   - `CreateAIModelInput`, `UpdateAIModelInput`
   - `CreateAIConnectionInput`, `UpdateAIConnectionInput`
   - `AIModelListFilters`, `AIConnectionListFilters`
   - `AIConnectionCredentials` - Return type with Key Vault-retrieved key

2. **Configuration** (`/apps/api/src/config/env.ts`)
   - Added `aiModels` container
   - Added `aiConnections` container

3. **Services**
   - **AIModelService** (`/apps/api/src/services/ai/ai-model.service.ts`)
     - CRUD operations for model catalog
     - Filtering by type, provider, hoster, status
     - Super admin only
   
   - **AIConnectionService** (`/apps/api/src/services/ai/ai-connection.service.ts`)
     - CRUD operations for connections
     - **Azure Key Vault integration** for API key storage
     - Automatic default management (one default LLM/Embedding per scope)
     - Tenant visibility logic
     - Retrieves credentials with `getConnectionWithCredentials()`

4. **API Routes**
   - **AI Models Routes** (`/apps/api/src/routes/ai-models.routes.ts`)
     - `GET /admin/ai/models` - List models
     - `GET /admin/ai/models/:id` - Get specific model
     - `POST /admin/ai/models` - Create model
     - `PATCH /admin/ai/models/:id` - Update model
     - `DELETE /admin/ai/models/:id` - Delete (disable) model
     - `GET /tenant/ai/available-models` - Models tenants can connect to
   
   - **AI Connections Routes** (`/apps/api/src/routes/ai-connections.routes.ts`)
     - **System Connections (Super Admin):**
       - `GET /admin/ai/connections`
       - `POST /admin/ai/connections`
       - `PATCH /admin/ai/connections/:id`
       - `DELETE /admin/ai/connections/:id`
     - **Tenant Connections (Tenant Admin):**
       - `GET /tenant/ai/connections` - Available connections
       - `POST /tenant/ai/connections` - Create (BYOK)
       - `PATCH /tenant/ai/connections/:id` - Update
       - `DELETE /tenant/ai/connections/:id` - Delete
       - `GET /tenant/ai/connections/default/:type` - Get default for LLM/Embedding

### 🔄 Next Steps

1. **Build shared-types package** - Compile TypeScript types
2. **Initialize services in index.ts** - Wire up AI services
3. **Register routes** - Add to route registration
4. **Update AI request handlers** - Use new connection system
5. **Create initial models** - Seed catalog with common models

## Data Model

### AIModel (Catalog)

```typescript
{
  id: "model-openai-gpt-4-turbo",
  name: "GPT-4 Turbo",
  provider: "OpenAI",
  type: "LLM",
  hoster: "OpenAI",
  allowTenantConnections: true,
  contextWindow: 128000,
  maxOutputs: 4096,
  streaming: true,
  vision: true,
  functions: true,
  jsonMode: true,
  status: "active",
  description: "Latest GPT-4 model with vision and function calling",
  modelIdentifier: "gpt-4-turbo-preview",
  pricing: {
    inputTokenPrice: 0.01,
    outputTokenPrice: 0.03,
    currency: "USD"
  },
  createdAt: "2024-12-01T00:00:00Z",
  createdBy: "admin-user-id",
  updatedAt: "2024-12-01T00:00:00Z"
}
```

### AIConnection (Instance)

```typescript
{
  id: "conn-model-openai-gpt-4-turbo-system-1733011200000",
  name: "System OpenAI GPT-4",
  modelId: "model-openai-gpt-4-turbo",
  tenantId: null, // null = system-wide
  endpoint: "https://api.openai.com/v1",
  version: undefined,
  deploymentName: undefined,
  contextWindow: 128000,
  isDefaultModel: true,
  secretId: "ai-provider-openai-system",
  status: "active",
  createdAt: "2024-12-01T00:00:00Z",
  createdBy: "admin-user-id",
  updatedAt: "2024-12-01T00:00:00Z"
}
```

### Tenant Connection (BYOK)

```typescript
{
  id: "conn-model-openai-gpt-4-turbo-tenant-abc123-1733011200000",
  name: "Our GPT-4 Connection",
  modelId: "model-openai-gpt-4-turbo",
  tenantId: "tenant-abc123",
  endpoint: "https://api.openai.com/v1",
  isDefaultModel: true,
  secretId: "ai-provider-openai-tenant-abc123",
  status: "active",
  createdAt: "2024-12-01T00:00:00Z",
  createdBy: "tenant-admin-user-id",
  updatedAt: "2024-12-01T00:00:00Z"
}
```

## User Flows

### Super Admin: Create System Connection

1. **Create model in catalog**
   ```http
   POST /admin/ai/models
   {
     "name": "GPT-4 Turbo",
     "provider": "OpenAI",
     "type": "LLM",
     "hoster": "OpenAI",
     "allowTenantConnections": true,
     "contextWindow": 128000,
     ...
   }
   ```

2. **Create system connection**
   ```http
   POST /admin/ai/connections
   {
     "name": "System OpenAI GPT-4",
     "modelId": "model-openai-gpt-4-turbo",
     "endpoint": "https://api.openai.com/v1",
     "apiKey": "sk-system-key",
     "isDefaultModel": true
   }
   ```
   - API key → Azure Key Vault (`ai-provider-openai-system`)
   - Database stores only reference

### Tenant Admin: Create BYOK Connection

1. **View available models**
   ```http
   GET /tenant/ai/available-models
   ```
   - Returns models where `allowTenantConnections = true`

2. **Create tenant connection**
   ```http
   POST /tenant/ai/connections
   {
     "name": "Our GPT-4 Connection",
     "modelId": "model-openai-gpt-4-turbo",
     "endpoint": "https://api.openai.com/v1",
     "apiKey": "sk-tenant-key",
     "isDefaultModel": true
   }
   ```
   - API key → Azure Key Vault (`ai-provider-openai-tenant-{tenantId}`)
   - Database stores only reference

### Runtime: AI Request

1. **Get default connection**
   ```typescript
   const credentials = await connectionService.getDefaultConnection(
     tenantId,
     'LLM'
   );
   ```
   - Checks tenant connections first
   - Falls back to system connection
   - Retrieves API key from Key Vault

2. **Make AI request**
   ```typescript
   const { connection, model, apiKey } = credentials;
   
   // Use connection.endpoint and apiKey
   const response = await fetch(connection.endpoint, {
     headers: {
       'Authorization': `Bearer ${apiKey}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(...)
   });
   ```

## Tenant Visibility

### Scenario 1: Tenant with own connection

- Tenant creates connection to GPT-4 with their API key
- Tenant sees: **Their GPT-4 connection**
- System has GPT-4 connection: **Hidden** (tenant overrides)

### Scenario 2: Tenant without connection

- Tenant has no GPT-4 connection
- System has GPT-4 connection: **Visible**
- Tenant uses system connection

### Scenario 3: Multiple models

- System has: GPT-4, Claude, Gemini connections
- Tenant has: GPT-4 connection (override)
- Tenant sees:
  - **Their GPT-4** (uses their key)
  - **System Claude** (uses system key)
  - **System Gemini** (uses system key)

## Key Features

### 1. **Secure Credential Storage**
- All API keys stored in Azure Key Vault
- Database never stores actual keys
- Key Vault references: `ai-provider-{provider}-{scope}`

### 2. **Automatic Default Management**
- One default LLM per scope (system/tenant)
- One default Embedding per scope
- Setting new default automatically unsets previous

### 3. **Tenant Isolation**
- Tenants can only see/modify their own connections
- System connections visible as fallback
- Tenant connections override system for same model

### 4. **Override Context Window**
- Model catalog defines max context window
- Connections can override (for quota/limit purposes)
- Useful for rate limiting tenant usage

### 5. **Model Capabilities**
- Catalog defines: streaming, vision, functions, JSON mode
- UI can show/hide features based on model capabilities
- Validation before allowing connections

## API Key Storage Flow

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

## Configuration Requirements

### Environment Variables

```bash
# Cosmos DB containers
COSMOS_DB_AI_MODELS_CONTAINER=ai-models
COSMOS_DB_AI_CONNECTIONS_CONTAINER=ai-connections

# Azure Key Vault (already configured)
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
ENABLE_KEY_VAULT=true
```

### Cosmos DB Containers

Create containers with these settings:
- `ai-models` - Partition key: `/id`
- `ai-connections` - Partition key: `/id`

## Migration from Old System

**No migration needed** - this is a fresh start.

Old system (`systemAIConfig.llmModels[]`) will be deprecated.

To populate:
1. Super admin creates models in catalog
2. Super admin creates system connections
3. Tenants can create their connections (BYOK)

## Benefits Over Old System

1. **Separation of Concerns**
   - Model capabilities vs. connection instances
   - Cleaner data model

2. **Multiple Connections**
   - System can have multiple connections to same model
   - Tenants can bring their own keys

3. **Better Security**
   - All keys in Key Vault (not encrypted in DB)
   - Tenant keys isolated

4. **Flexible Defaults**
   - Per-tenant defaults
   - Automatic management

5. **Visibility Control**
   - Tenants see only relevant connections
   - Override system connections

6. **Scalability**
   - Easy to add new models
   - Easy to add new providers/hosters

## Next Implementation Steps

1. Build shared-types package
2. Initialize services in index.ts
3. Register routes
4. Update AI request handlers to use `getDefaultConnection()`
5. Create UI components for:
   - Super admin: Model catalog management
   - Super admin: System connections management
   - Tenant admin: Connection management (BYOK)
6. Seed initial models (GPT-4, Claude, etc.)

---

## Summary

✅ **Complete two-part AI configuration system implemented**
- AI Models (catalog) - Super admin only
- AI Connections (instances) - System-wide or tenant-specific
- Azure Key Vault integration for secure credential storage
- Comprehensive API routes for management
- Tenant visibility and override logic
- Automatic default management

**Ready for integration!** 🚀
