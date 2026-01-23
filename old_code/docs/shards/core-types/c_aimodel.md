# c_aimodel - AI Model ShardType

## Overview

The `c_aimodel` ShardType represents AI model definitions in Castiel. Each model shard defines a specific AI model that can be used for various AI operations (chat, image generation, text-to-speech, embeddings). This enables dynamic model management without code changes.

> **AI Role**: Models are the foundation of all AI features. Super Admin configures available models, sets defaults, and controls tenant access.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_aimodel` |
| **Display Name** | AI Model |
| **Category** | CONFIGURATION |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `Cpu` |
| **Color** | `#8b5cf6` (Violet) |
| **Embedding** | Disabled |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Model display name (e.g., "GPT-4o") |
| `modelId` | string | **Yes** | Technical model identifier (e.g., "gpt-4o") |
| `modelType` | enum | **Yes** | Type of AI model |
| `provider` | enum | **Yes** | AI provider (OpenAI, Anthropic, etc.) |
| `hoster` | enum | **Yes** | Who hosts the model |
| `version` | string | No | Model version (e.g., "2024-05-13") |
| `description` | string | No | Model description and capabilities |
| `isSystemWide` | boolean | **Yes** | Available to all tenants |
| `isDefault` | boolean | No | Default model for its type |
| `allowTenantCustom` | boolean | No | Tenants can bring their own API key |
| `contextWindow` | integer | No | Maximum context length in tokens |
| `maxOutputTokens` | integer | No | Maximum output tokens |
| `inputPricePerMillion` | number | No | Cost per million input tokens (USD) |
| `outputPricePerMillion` | number | No | Cost per million output tokens (USD) |
| `supportsStreaming` | boolean | No | Supports streaming responses |
| `supportsVision` | boolean | No | Can process images |
| `supportsFunctionCalling` | boolean | No | Supports tool/function calling |
| `supportsJSON` | boolean | No | Supports JSON mode |
| `endpoint` | string | No | Custom API endpoint (for Azure/custom) |
| `deploymentName` | string | No | Azure deployment name |
| `isActive` | boolean | No | Whether model is currently available |
| `isDeprecated` | boolean | No | Model is deprecated |
| `deprecationDate` | date | No | When model will be deprecated |
| `recommendedReplacement` | reference | No | Replacement model reference |
| `tags` | string[] | No | Custom tags |

### Field Details

#### `modelType`

```typescript
enum AIModelType {
  LLM = 'llm',                           // Large Language Model (chat/completion)
  IMAGE_GENERATION = 'image_generation', // Image generation (DALL-E, Midjourney)
  TEXT_TO_SPEECH = 'text_to_speech',     // TTS models
  SPEECH_TO_TEXT = 'speech_to_text',     // STT/Whisper
  EMBEDDING = 'embedding',               // Text embeddings
  MODERATION = 'moderation',             // Content moderation
  VISION = 'vision',                     // Image analysis only
}
```

#### `provider`

```typescript
enum AIProvider {
  OPENAI = 'openai',
  AZURE_OPENAI = 'azure_openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  COHERE = 'cohere',
  MISTRAL = 'mistral',
  META = 'meta',
  CUSTOM = 'custom',
}
```

#### `hoster`

```typescript
enum AIHoster {
  OPENAI = 'openai',           // Hosted by OpenAI
  AZURE = 'azure',             // Microsoft Azure
  AWS = 'aws',                 // AWS Bedrock
  GCP = 'gcp',                 // Google Cloud
  SELF_HOSTED = 'self_hosted', // Customer's infrastructure
  CASTIEL = 'castiel',         // Castiel's infrastructure
}
```

---

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Model display name"
    },
    "modelId": {
      "type": "string",
      "description": "Technical model identifier"
    },
    "modelType": {
      "type": "string",
      "enum": ["llm", "image_generation", "text_to_speech", "speech_to_text", "embedding", "moderation", "vision"],
      "description": "Type of AI model"
    },
    "provider": {
      "type": "string",
      "enum": ["openai", "azure_openai", "anthropic", "google", "cohere", "mistral", "meta", "custom"],
      "description": "AI provider"
    },
    "hoster": {
      "type": "string",
      "enum": ["openai", "azure", "aws", "gcp", "self_hosted", "castiel"],
      "description": "Model hosting location"
    },
    "version": {
      "type": "string",
      "description": "Model version"
    },
    "description": {
      "type": "string",
      "description": "Model description"
    },
    "isSystemWide": {
      "type": "boolean",
      "default": false,
      "description": "Available to all tenants"
    },
    "isDefault": {
      "type": "boolean",
      "default": false,
      "description": "Default model for its type"
    },
    "allowTenantCustom": {
      "type": "boolean",
      "default": true,
      "description": "Allow tenants to use their own API key"
    },
    "contextWindow": {
      "type": "integer",
      "minimum": 0,
      "description": "Maximum context length in tokens"
    },
    "maxOutputTokens": {
      "type": "integer",
      "minimum": 0,
      "description": "Maximum output tokens"
    },
    "inputPricePerMillion": {
      "type": "number",
      "minimum": 0,
      "description": "Cost per million input tokens (USD)"
    },
    "outputPricePerMillion": {
      "type": "number",
      "minimum": 0,
      "description": "Cost per million output tokens (USD)"
    },
    "supportsStreaming": {
      "type": "boolean",
      "default": true
    },
    "supportsVision": {
      "type": "boolean",
      "default": false
    },
    "supportsFunctionCalling": {
      "type": "boolean",
      "default": false
    },
    "supportsJSON": {
      "type": "boolean",
      "default": false
    },
    "endpoint": {
      "type": "string",
      "format": "uri",
      "description": "Custom API endpoint"
    },
    "deploymentName": {
      "type": "string",
      "description": "Azure deployment name"
    },
    "isActive": {
      "type": "boolean",
      "default": true
    },
    "isDeprecated": {
      "type": "boolean",
      "default": false
    },
    "deprecationDate": {
      "type": "string",
      "format": "date"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["name", "modelId", "modelType", "provider", "hoster", "isSystemWide"]
}
```

---

## Access Control

| Action | User | Tenant Admin | Super Admin |
|--------|------|--------------|-------------|
| View available models | ✓ | ✓ | ✓ |
| View model details | ✓ | ✓ | ✓ |
| Create model definition | ✗ | ✗ | ✓ |
| Update model definition | ✗ | ✗ | ✓ |
| Delete model definition | ✗ | ✗ | ✓ |
| Set as system default | ✗ | ✗ | ✓ |
| Set as tenant default | ✗ | ✓ | ✓ |

---

## Model Selection Hierarchy

When an AI operation is requested, the model is selected in this order:

```
1. Assistant-specific model (if set in c_assistant.model)
   ↓ (not set)
2. Tenant default model (if set by Tenant Admin)
   ↓ (not set)
3. System default model (set by Super Admin, isDefault: true)
```

---

## Examples

### Example 1: GPT-4o (System Default LLM)

```json
{
  "shardTypeId": "c_aimodel",
  "structuredData": {
    "name": "GPT-4o",
    "modelId": "gpt-4o",
    "modelType": "llm",
    "provider": "openai",
    "hoster": "openai",
    "version": "2024-05-13",
    "description": "OpenAI's most advanced model. Great for complex reasoning, vision, and creative tasks.",
    "isSystemWide": true,
    "isDefault": true,
    "allowTenantCustom": true,
    "contextWindow": 128000,
    "maxOutputTokens": 4096,
    "inputPricePerMillion": 5.0,
    "outputPricePerMillion": 15.0,
    "supportsStreaming": true,
    "supportsVision": true,
    "supportsFunctionCalling": true,
    "supportsJSON": true,
    "isActive": true,
    "isDeprecated": false
  }
}
```

### Example 2: Azure OpenAI GPT-4 (Enterprise)

```json
{
  "shardTypeId": "c_aimodel",
  "structuredData": {
    "name": "GPT-4 (Azure Enterprise)",
    "modelId": "gpt-4",
    "modelType": "llm",
    "provider": "azure_openai",
    "hoster": "azure",
    "version": "0613",
    "description": "Azure-hosted GPT-4 with enterprise security and compliance.",
    "isSystemWide": true,
    "isDefault": false,
    "allowTenantCustom": true,
    "contextWindow": 8192,
    "maxOutputTokens": 4096,
    "inputPricePerMillion": 30.0,
    "outputPricePerMillion": 60.0,
    "supportsStreaming": true,
    "supportsVision": false,
    "supportsFunctionCalling": true,
    "supportsJSON": true,
    "endpoint": "https://castiel-openai.openai.azure.com/",
    "deploymentName": "gpt-4-deployment",
    "isActive": true
  }
}
```

### Example 3: Claude 3.5 Sonnet

```json
{
  "shardTypeId": "c_aimodel",
  "structuredData": {
    "name": "Claude 3.5 Sonnet",
    "modelId": "claude-3-5-sonnet-20241022",
    "modelType": "llm",
    "provider": "anthropic",
    "hoster": "anthropic",
    "version": "2024-10-22",
    "description": "Anthropic's most balanced model. Excellent for analysis and coding.",
    "isSystemWide": true,
    "isDefault": false,
    "allowTenantCustom": true,
    "contextWindow": 200000,
    "maxOutputTokens": 8192,
    "inputPricePerMillion": 3.0,
    "outputPricePerMillion": 15.0,
    "supportsStreaming": true,
    "supportsVision": true,
    "supportsFunctionCalling": true,
    "supportsJSON": true,
    "isActive": true
  }
}
```

### Example 4: DALL-E 3 (Image Generation)

```json
{
  "shardTypeId": "c_aimodel",
  "structuredData": {
    "name": "DALL-E 3",
    "modelId": "dall-e-3",
    "modelType": "image_generation",
    "provider": "openai",
    "hoster": "openai",
    "version": "3.0",
    "description": "OpenAI's latest image generation model with high quality and prompt following.",
    "isSystemWide": true,
    "isDefault": true,
    "allowTenantCustom": true,
    "inputPricePerMillion": 40.0,
    "outputPricePerMillion": 0,
    "supportsStreaming": false,
    "supportsVision": false,
    "supportsFunctionCalling": false,
    "supportsJSON": false,
    "isActive": true,
    "tags": ["image", "creative"]
  }
}
```

### Example 5: Whisper (Speech-to-Text)

```json
{
  "shardTypeId": "c_aimodel",
  "structuredData": {
    "name": "Whisper Large V3",
    "modelId": "whisper-1",
    "modelType": "speech_to_text",
    "provider": "openai",
    "hoster": "openai",
    "version": "large-v3",
    "description": "OpenAI's speech recognition model with multilingual support.",
    "isSystemWide": true,
    "isDefault": true,
    "allowTenantCustom": true,
    "inputPricePerMillion": 0.006,
    "supportsStreaming": false,
    "isActive": true,
    "tags": ["audio", "transcription", "multilingual"]
  }
}
```

### Example 6: Text-to-Speech

```json
{
  "shardTypeId": "c_aimodel",
  "structuredData": {
    "name": "TTS-1 HD",
    "modelId": "tts-1-hd",
    "modelType": "text_to_speech",
    "provider": "openai",
    "hoster": "openai",
    "version": "1.0",
    "description": "High-quality text-to-speech model with natural voices.",
    "isSystemWide": true,
    "isDefault": true,
    "allowTenantCustom": true,
    "inputPricePerMillion": 30.0,
    "supportsStreaming": true,
    "isActive": true,
    "tags": ["audio", "speech", "voices"]
  }
}
```

### Example 7: Text Embedding

```json
{
  "shardTypeId": "c_aimodel",
  "structuredData": {
    "name": "Text Embedding 3 Small",
    "modelId": "text-embedding-3-small",
    "modelType": "embedding",
    "provider": "openai",
    "hoster": "openai",
    "version": "3",
    "description": "Fast and efficient embedding model for semantic search.",
    "isSystemWide": true,
    "isDefault": true,
    "allowTenantCustom": false,
    "contextWindow": 8191,
    "inputPricePerMillion": 0.02,
    "supportsStreaming": false,
    "isActive": true,
    "tags": ["embedding", "search", "semantic"]
  }
}
```

---

## Relationships

### Internal Relationships

| Relationship Type | Target | Description |
|-------------------|--------|-------------|
| `replaces` | `c_aimodel` | Model this one replaces |
| `replaced_by` | `c_aimodel` | Model that replaces this one |

### Incoming Relationships

| From | Relationship Type | Description |
|------|-------------------|-------------|
| `c_assistant` | `uses_model` | Assistant using this model |
| `c_tenant` | `default_model` | Tenant's default model |

---

## Tenant Model Configuration

Tenants can configure their model preferences via `c_tenantAIConfig`:

```typescript
interface TenantAIConfig {
  tenantId: string;
  
  // Default models by type
  defaultModels: {
    llm?: string;              // Reference to c_aimodel
    embedding?: string;
    imageGeneration?: string;
    textToSpeech?: string;
    speechToText?: string;
  };
  
  // Tenant's own API keys (BYOK)
  customCredentials?: {
    provider: string;
    encryptedApiKey: string;
    endpoint?: string;
  }[];
  
  // Use system credentials or tenant's own
  useSystemCredentials: boolean;
}
```

---

## API Reference

### List Available Models

```http
GET /api/ai/models
Query: ?type=llm&active=true

Response:
{
  "data": [
    {
      "id": "shard-id",
      "structuredData": {
        "name": "GPT-4o",
        "modelId": "gpt-4o",
        "modelType": "llm",
        ...
      }
    }
  ]
}
```

### Get Default Model by Type

```http
GET /api/ai/models/default?type=llm

Response:
{
  "data": {
    "systemDefault": { ... },
    "tenantDefault": { ... },  // If tenant has override
    "effectiveModel": { ... }  // What will actually be used
  }
}
```

### Set Tenant Default (Tenant Admin)

```http
POST /api/tenant/ai/default-model
Body: {
  "modelType": "llm",
  "modelId": "shard-id-of-model"
}
```

### Create Model (Super Admin)

```http
POST /api/admin/ai/models
Body: {
  "name": "GPT-4o",
  "modelId": "gpt-4o",
  ...
}
```

---

## Seeding Initial Models

On first deployment, seed the standard models:

```typescript
const SEED_MODELS: Partial<AIModelStructuredData>[] = [
  // OpenAI LLMs
  { name: 'GPT-4o', modelId: 'gpt-4o', modelType: 'llm', provider: 'openai', hoster: 'openai', isSystemWide: true, isDefault: true, ... },
  { name: 'GPT-4 Turbo', modelId: 'gpt-4-turbo', modelType: 'llm', provider: 'openai', hoster: 'openai', isSystemWide: true, ... },
  { name: 'GPT-3.5 Turbo', modelId: 'gpt-3.5-turbo', modelType: 'llm', provider: 'openai', hoster: 'openai', isSystemWide: true, ... },
  
  // Anthropic
  { name: 'Claude 3.5 Sonnet', modelId: 'claude-3-5-sonnet-20241022', modelType: 'llm', provider: 'anthropic', hoster: 'anthropic', isSystemWide: true, ... },
  { name: 'Claude 3 Haiku', modelId: 'claude-3-haiku-20240307', modelType: 'llm', provider: 'anthropic', hoster: 'anthropic', isSystemWide: true, ... },
  
  // Embeddings
  { name: 'Text Embedding 3 Small', modelId: 'text-embedding-3-small', modelType: 'embedding', provider: 'openai', hoster: 'openai', isSystemWide: true, isDefault: true, ... },
  
  // Image Generation
  { name: 'DALL-E 3', modelId: 'dall-e-3', modelType: 'image_generation', provider: 'openai', hoster: 'openai', isSystemWide: true, isDefault: true, ... },
  
  // TTS
  { name: 'TTS-1 HD', modelId: 'tts-1-hd', modelType: 'text_to_speech', provider: 'openai', hoster: 'openai', isSystemWide: true, isDefault: true, ... },
  
  // STT
  { name: 'Whisper', modelId: 'whisper-1', modelType: 'speech_to_text', provider: 'openai', hoster: 'openai', isSystemWide: true, isDefault: true, ... },
];
```

---

## Related Documentation

- [c_assistant](./c_assistant.md) - AI Assistant configuration
- [AI Tenant Isolation](../ai-tenant-isolation.md) - Multi-tenant AI best practices
- [Integrations](../../features/integrations/SPECIFICATION.md) - AI Provider as integration category

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team











