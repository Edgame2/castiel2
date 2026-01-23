# AI Features Testing Guide

Complete guide for testing AI Model Catalog and AI Connections features.

## Prerequisites

1. ✅ **Database Initialized** - Run `pnpm tsx scripts/init-cosmos-db.ts`
2. ✅ **API Server Running** - `pnpm --filter @castiel/api dev`
3. ✅ **Admin JWT Token** - Login as super admin and get JWT token
4. ✅ **Azure Key Vault** - Configured with service principal
5. ✅ **Azure OpenAI Key** - Ready in environment variables

## Architecture Overview

### Two-Part System

1. **AI Model Catalog** (Super Admin Only)
   - Defines available AI models and their capabilities
   - Provider, type (LLM/Embedding), features, pricing
   - Container: `aimodel` (partition: `/provider`)

2. **AI Connections** (System-wide & Tenant-specific)
   - Specific credentials and endpoints to connect to models
   - API keys stored in Azure Key Vault
   - Container: `aiconnexion` (partition: `/tenantId`)
   - `tenantId = null` → System-wide connection
   - `tenantId = <tenant_id>` → Tenant-specific BYOK connection

---

## Test 1: AI Model Catalog Management (Super Admin)

### 1.1 Create GPT-4o Model

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
    "jsonMode": true,
    "description": "GPT-4o with 128K context window",
    "modelIdentifier": "gpt-4o",
    "pricing": {
      "inputTokenPrice": 2.5,
      "outputTokenPrice": 10.0,
      "currency": "USD"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "model": {
    "id": "...",
    "name": "GPT-4o",
    "provider": "OpenAI",
    "type": "LLM",
    "status": "active",
    "createdAt": "...",
    ...
  }
}
```

**Save the model ID** for next steps!

### 1.2 Create Text Embedding Model

```bash
curl -X POST http://localhost:3001/api/v1/admin/ai/models \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Text Embedding 3 Large",
    "provider": "OpenAI",
    "type": "Embedding",
    "hoster": "Azure",
    "allowTenantConnections": true,
    "contextWindow": 8192,
    "maxOutputs": 3072,
    "streaming": false,
    "vision": false,
    "functions": false,
    "jsonMode": false,
    "description": "OpenAI text-embedding-3-large for embeddings",
    "modelIdentifier": "text-embedding-3-large",
    "pricing": {
      "inputTokenPrice": 0.13,
      "outputTokenPrice": 0.0,
      "currency": "USD"
    }
  }'
```

### 1.3 List All Models

```bash
curl -X GET http://localhost:3001/api/v1/admin/ai/models \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 1.4 Get Specific Model

```bash
curl -X GET http://localhost:3001/api/v1/admin/ai/models/{MODEL_ID} \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 1.5 Update Model

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/ai/models/{MODEL_ID} \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "GPT-4o with 128K context - UPDATED",
    "contextWindow": 130000
  }'
```

### 1.6 Filter Models by Type

```bash
# List only LLM models
curl -X GET "http://localhost:3001/api/v1/admin/ai/models?type=LLM" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"

# List only Embedding models
curl -X GET "http://localhost:3001/api/v1/admin/ai/models?type=Embedding" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 1.7 Delete Model (Soft Delete)

```bash
curl -X DELETE http://localhost:3001/api/v1/admin/ai/models/{MODEL_ID} \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

---

## Test 2: System-Wide AI Connections (Super Admin)

### 2.1 Create System GPT-4o Connection

```bash
curl -X POST http://localhost:3001/api/v1/admin/ai/connections \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System GPT-4o Azure",
    "modelId": "YOUR_GPT4_MODEL_ID",
    "endpoint": "https://castiel-openai.openai.azure.com/",
    "version": "2024-10-01-preview",
    "deploymentName": "gpt-4o",
    "contextWindow": 128000,
    "isDefaultModel": true,
    "apiKey": "REDACTED"
  }'
```

**What happens:**
- API key is stored in Azure Key Vault with secret ID: `ai-provider-openai-system`
- Connection record stores `secretId` but NOT the actual API key
- `tenantId` is `null` (system-wide)

### 2.2 Create System Embedding Connection

```bash
curl -X POST http://localhost:3001/api/v1/admin/ai/connections \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System Embedding Azure",
    "modelId": "YOUR_EMBEDDING_MODEL_ID",
    "endpoint": "https://castiel-openai.openai.azure.com/",
    "version": "2024-10-01-preview",
    "deploymentName": "text-embedding-3-large",
    "isDefaultModel": true,
    "apiKey": "REDACTED"
  }'
```

### 2.3 List System Connections

```bash
curl -X GET http://localhost:3001/api/v1/admin/ai/connections \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 2.4 Update Connection

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/ai/connections/{CONNECTION_ID} \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System GPT-4o Azure (Updated)",
    "contextWindow": 130000
  }'
```

### 2.5 Update API Key

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/ai/connections/{CONNECTION_ID} \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "NEW_API_KEY_HERE"
  }'
```

**What happens:**
- New API key is stored in Azure Key Vault
- Same secret ID is updated

### 2.6 Filter Connections

```bash
# Get only default connections
curl -X GET "http://localhost:3001/api/v1/admin/ai/connections?isDefaultModel=true" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"

# Get connections for specific model
curl -X GET "http://localhost:3001/api/v1/admin/ai/connections?modelId=YOUR_MODEL_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 2.7 Delete Connection

```bash
curl -X DELETE http://localhost:3001/api/v1/admin/ai/connections/{CONNECTION_ID} \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

---

## Test 3: Tenant-Specific BYOK Connections

### 3.1 Get Available Models for Tenant

```bash
curl -X GET http://localhost:3001/api/v1/tenant/ai/available-models \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Returns:** Only models where `allowTenantConnections = true`

### 3.2 Create Tenant Connection (BYOK)

```bash
curl -X POST http://localhost:3001/api/v1/tenant/ai/connections \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tenant Custom GPT-4o",
    "modelId": "YOUR_GPT4_MODEL_ID",
    "endpoint": "https://tenant-specific-openai.openai.azure.com/",
    "version": "2024-10-01-preview",
    "deploymentName": "gpt-4o-tenant",
    "contextWindow": 100000,
    "isDefaultModel": true,
    "apiKey": "TENANT_OWN_API_KEY"
  }'
```

**What happens:**
- API key stored in Key Vault with secret ID: `ai-provider-openai-tenant-{tenantId}`
- Connection is scoped to the tenant making the request
- `tenantId` is extracted from JWT token

### 3.3 List Tenant Connections

```bash
curl -X GET http://localhost:3001/api/v1/tenant/ai/connections \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Returns:** Only connections for the requesting tenant

### 3.4 Get Default Connection for Tenant

```bash
# Get default LLM connection
curl -X GET http://localhost:3001/api/v1/tenant/ai/connections/default/LLM \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get default Embedding connection
curl -X GET http://localhost:3001/api/v1/tenant/ai/connections/default/Embedding \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Priority:**
1. Tenant's own connection (if `isDefaultModel = true`)
2. System-wide connection (if no tenant connection)

### 3.5 Update Tenant Connection

```bash
curl -X PATCH http://localhost:3001/api/v1/tenant/ai/connections/{CONNECTION_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tenant Custom GPT-4o (Updated)",
    "contextWindow": 120000
  }'
```

### 3.6 Delete Tenant Connection

```bash
curl -X DELETE http://localhost:3001/api/v1/tenant/ai/connections/{CONNECTION_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Test 4: Azure Key Vault Integration

### 4.1 Verify Key Vault Configuration

Check your `.env` file:

```bash
# Azure Key Vault Configuration
KEY_VAULT_URL=https://castiel-keyvault-prod.vault.azure.net/
USE_MANAGED_IDENTITY=false  # Set to false for local dev with service principal

# Service Principal for Local Development
AZURE_TENANT_ID=7b8a1dc0-92b8-45e4-ba6f-e2a71ec3f73a
AZURE_CLIENT_ID=36018d82-b7a3-4f37-a9f5-fbb3fe1d923c
AZURE_CLIENT_SECRET=REDACTED
```

### 4.2 Grant Service Principal Access

Your service principal needs these permissions on Key Vault:
- **Secrets**: Get, List, Set, Delete

```bash
# Grant permissions (run this in Azure CLI)
az keyvault set-policy \
  --name castiel-keyvault-prod \
  --spn 36018d82-b7a3-4f37-a9f5-fbb3fe1d923c \
  --secret-permissions get list set delete
```

### 4.3 Check Secrets in Key Vault

```bash
# List all secrets
az keyvault secret list --vault-name castiel-keyvault-prod

# Get specific secret
az keyvault secret show \
  --vault-name castiel-keyvault-prod \
  --name ai-provider-openai-system
```

---

## Test 5: Environment Variable Alternative

If you prefer NOT to use Azure Key Vault, you can use environment variables:

### 5.1 Create Connection with Environment Variable

```bash
curl -X POST http://localhost:3001/api/v1/admin/ai/connections \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System GPT-4o (Env Var)",
    "modelId": "YOUR_GPT4_MODEL_ID",
    "endpoint": "https://castiel-openai.openai.azure.com/",
    "version": "2024-10-01-preview",
    "deploymentName": "gpt-4o",
    "isDefaultModel": true,
    "apiKeyEnvVar": "AZURE_OPENAI_GPT_51_CHAT"
  }'
```

**What happens:**
- No API key stored in Key Vault
- Connection uses `apiKeyEnvVar` to reference environment variable
- At runtime, API key is read from `process.env.AZURE_OPENAI_GPT_51_CHAT`

---

## Test 6: Frontend UI Testing

### 6.1 Navigate to AI Settings

1. Login as **Super Admin**
2. Go to `/admin/ai-settings`
3. You should see:
   - AI Model Catalog tab
   - AI Connections tab

### 6.2 Create Model via UI

1. Click "Add Model"
2. Fill in form:
   - Name, Provider, Type, Hoster
   - Capabilities (streaming, vision, functions, etc.)
   - Context window, max outputs
   - Pricing information
3. Save
4. Verify model appears in list

### 6.3 Create Connection via UI

1. Go to "Connections" tab
2. Click "Add Connection"
3. Select model from catalog
4. Enter endpoint, deployment name, API key
5. Set as default (optional)
6. Save
7. Verify connection appears in list

### 6.4 Tenant BYOK via UI

1. Login as **Tenant Admin**
2. Go to `/settings/ai` or tenant settings
3. View available models
4. Create custom connection with own API key
5. Set as default for tenant

---

## Troubleshooting

### Issue: "Container not found"

**Solution:** Run database initialization:
```bash
pnpm tsx scripts/init-cosmos-db.ts
```

### Issue: "Key Vault authentication failed"

**Check:**
1. Service principal credentials in `.env`
2. Service principal has Key Vault permissions
3. Key Vault URL is correct

**Grant permissions:**
```bash
az keyvault set-policy \
  --name castiel-keyvault-prod \
  --spn YOUR_CLIENT_ID \
  --secret-permissions get list set delete
```

### Issue: "Unauthorized" (401)

**Solution:** Get a fresh JWT token:
1. Login via frontend or auth endpoint
2. Copy JWT from response or browser DevTools
3. Use in `Authorization: Bearer TOKEN`

### Issue: "Model not found" when creating connection

**Solution:** Create the model first in the catalog (Test 1)

### Issue: "Tenant cannot create connection for this model"

**Solution:** Model must have `allowTenantConnections: true`

---

## Complete Flow Example

### Scenario: Setup GPT-4o for System + Allow Tenant BYOK

```bash
# Step 1: Create GPT-4o model in catalog
MODEL_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/admin/ai/models \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
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
  }')

MODEL_ID=$(echo $MODEL_RESPONSE | jq -r '.model.id')
echo "Created model: $MODEL_ID"

# Step 2: Create system-wide connection
CONNECTION_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/admin/ai/connections \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"System GPT-4o\",
    \"modelId\": \"$MODEL_ID\",
    \"endpoint\": \"https://castiel-openai.openai.azure.com/\",
    \"deploymentName\": \"gpt-4o\",
    \"isDefaultModel\": true,
    \"apiKey\": \"$AZURE_OPENAI_KEY\"
  }")

echo "Created system connection"

# Step 3: Tenant creates their own connection (BYOK)
curl -X POST http://localhost:3001/api/v1/tenant/ai/connections \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"My Custom GPT-4o\",
    \"modelId\": \"$MODEL_ID\",
    \"endpoint\": \"https://my-tenant-openai.openai.azure.com/\",
    \"deploymentName\": \"gpt-4o\",
    \"isDefaultModel\": true,
    \"apiKey\": \"tenant-api-key-here\"
  }"

echo "Created tenant BYOK connection"
```

---

## Quick Test Script

Run the automated test script:

```bash
# Set your admin token
export ADMIN_JWT_TOKEN="your-jwt-token-here"

# Run comprehensive tests
pnpm tsx scripts/test-ai-features.ts
```

---

## Expected Database State

After successful tests, Cosmos DB should have:

### `aimodel` container:
```json
{
  "id": "...",
  "provider": "OpenAI",
  "name": "GPT-4o",
  "type": "LLM",
  "hoster": "Azure",
  "allowTenantConnections": true,
  "status": "active",
  ...
}
```

### `aiconnexion` container:
```json
{
  "id": "...",
  "tenantId": null,  // System connection
  "modelId": "...",
  "name": "System GPT-4o",
  "endpoint": "https://...",
  "secretId": "ai-provider-openai-system",
  "isDefaultModel": true,
  "status": "active",
  ...
}
```

---

## Next Steps

1. ✅ Test all API endpoints with curl
2. ✅ Verify Key Vault secrets are created
3. ✅ Test frontend UI components
4. ✅ Test tenant isolation (one tenant can't see another's connections)
5. ✅ Test default model selection logic
6. ✅ Test API key rotation (update existing connection)
7. ✅ Test model deprecation workflow

---

## Questions?

If you encounter any issues or need clarification, check:
- Backend service logs: `apps/api/logs`
- Azure Key Vault access logs
- Cosmos DB query explorer
- Network tab in browser DevTools
