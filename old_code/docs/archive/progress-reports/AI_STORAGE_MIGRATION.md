# AI Models & Connections Storage Migration

## Overview
Migrated AI models and connections from Shards-based storage to dedicated Cosmos DB containers.

## Changes Made

### 1. Container Names Updated
- **AI Models**: `ai-models` → `aimodel`
- **AI Connections**: `ai-connections` → `aiconnexion`

### 2. Partition Keys
- **aimodel**: `/provider` - Groups models by provider (OpenAI, Azure, Anthropic, etc.)
- **aiconnexion**: `/tenantId` - Isolates connections by tenant (or 'system' for system-wide)

### 3. Configuration Updates
**File**: `apps/api/src/config/env.ts`
```typescript
aiModels: process.env.COSMOS_DB_AI_MODELS_CONTAINER || 'aimodel',
aiConnections: process.env.COSMOS_DB_AI_CONNECTIONS_CONTAINER || 'aiconnexion',
```

### 4. Service Updates

#### AI Model Service (`apps/api/src/services/ai/ai-model.service.ts`)
- **getModel()**: Now queries by ID (since partition key is `/provider`, not `/id`)
- **createModel()**: Includes `provider` field for partition key
- **updateModel()**: Gets existing model first to retrieve `provider` for partition key
- **deleteModel()**: Gets model first to retrieve `provider` for partition key

#### AI Connection Service (`apps/api/src/services/ai/ai-connection.service.ts`)
- **Removed**: All Shards fallback logic - models are now ONLY in `aimodel` container
- **getModelById()**: Simplified to query only `aimodel` container
- **getConnection()**: Queries by ID (since partition key is `/tenantId`, not `/id`)
- **createConnection()**: Sets `tenantId` to 'system' if null (for partition key)
- **updateConnection()**: Gets existing connection first to retrieve `tenantId` for partition key
- **deleteConnection()**: Uses `tenantId` as partition key
- **hardDeleteConnection()**: Gets connection first to retrieve `tenantId` for partition key
- **unsetDefaults()**: Uses `tenantId` as partition key when updating connections

### 5. Routes Consolidation
**File**: `apps/api/src/routes/ai-settings.routes.ts`
- **Removed**: All Shards-based AI model routes (GET/POST/DELETE `/admin/ai/models`)
- **Reason**: Duplicate routes - AI models now managed via `ai-models.routes.ts` only

### 6. Database Initialization
**File**: `apps/api/src/scripts/init-cosmos-db.ts`
- **Added**: Container definition for `aimodel` with `/provider` partition key
- **Added**: Container definition for `aiconnexion` with `/tenantId` partition key

## Migration Path

### No Data Migration Required ✅
Per user request, all existing Shards data can be lost. New AI models and connections should be created fresh in the new containers.

### Steps to Use New Storage

1. **Initialize Containers** (if not already created):
   ```bash
   pnpm --filter @castiel/api run init-db
   ```

2. **Create AI Models** via API:
   ```bash
   POST /api/admin/ai-models
   {
     "name": "GPT-4",
     "provider": "OpenAI",
     "type": "LLM",
     "hoster": "OpenAI",
     "allowTenantConnections": true,
     "contextWindow": 8192,
     "maxOutputs": 4096,
     "streaming": true,
     "vision": true,
     "functions": true,
     "jsonMode": true,
     "modelIdentifier": "gpt-4",
     "pricing": {
       "inputPricePerMillion": 30,
       "outputPricePerMillion": 60
     }
   }
   ```

3. **Create AI Connections** via API:
   ```bash
   POST /api/admin/ai-connections
   {
     "name": "OpenAI GPT-4 Production",
     "modelId": "<model-id>",
     "endpoint": "https://api.openai.com/v1",
     "apiKey": "sk-...",  // Stored in Azure Key Vault
     "isDefaultModel": true
   }
   ```

## Environment Variables

Optional - to override default container names:
```bash
COSMOS_DB_AI_MODELS_CONTAINER=aimodel
COSMOS_DB_AI_CONNECTIONS_CONTAINER=aiconnexion
```

## Breaking Changes

⚠️ **Important**: All existing AI models stored as Shards will NOT be accessible by the new system. You must recreate them via the API.

### Why This Change?
1. **Performance**: Dedicated containers with proper partition keys for efficient queries
2. **Scalability**: `/provider` partition for models scales better than storing as Shards
3. **Isolation**: `/tenantId` partition for connections provides better tenant isolation
4. **Simplicity**: Removes complex Shards fallback logic and dual storage paths
5. **Consistency**: Single source of truth for AI models and connections

## Testing

After migration:
1. Create a new AI model via POST `/api/admin/ai-models`
2. Verify model is stored in `aimodel` container
3. Create an AI connection via POST `/api/admin/ai-connections`
4. Verify connection is stored in `aiconnexion` container
5. Verify API key is stored in Azure Key Vault (check `secretId` in connection)
6. Test connection retrieval with GET `/api/admin/ai-connections/:id`

## Rollback Plan

If needed, revert these commits:
- Config: `apps/api/src/config/env.ts`
- Services: `apps/api/src/services/ai/*.service.ts`
- Routes: `apps/api/src/routes/ai-settings.routes.ts`
- Init script: `apps/api/src/scripts/init-cosmos-db.ts`

Note: Old Shards-based data will remain untouched in the `shards` container.
