# c_integrationProvider

> **⚠️ DEPRECATED**: This ShardType is **NOT used**. Integrations now use dedicated Cosmos DB containers instead of shard types.
>
> **Migration**: See [Integration Container Architecture](../../features/integrations/CONTAINER-ARCHITECTURE.md) for the current architecture.
>
> **Status**: This document is kept for historical reference only. Do not use `c_integrationProvider` ShardType for new integrations.

---

## Overview

The `c_integrationProvider` ShardType **was** used to define available integration types in Castiel. These were **system-level** Shards that specified capabilities, authentication methods, and entity mappings for external systems.

> **Scope**: System (not tenant-specific)  
> **Created By**: Super Admin or system deployment  
> **Used By**: Tenants when configuring integrations
>
> **Note**: This approach has been replaced with the `integration_providers` container. See [Container Architecture](../../features/integrations/CONTAINER-ARCHITECTURE.md).

---

## Schema

### Base Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Internal name |
| `description` | string | ❌ | Provider description |
| `shardTypeId` | string | ✅ | Always `c_integrationProvider` |

### Structured Data

```typescript
interface IntegrationProviderStructuredData {
  // === IDENTITY ===
  name: string;                          // "Salesforce"
  displayName: string;                   // "Salesforce CRM"
  provider: string;                      // "salesforce" (unique identifier)
  description?: string;
  
  // === CATEGORIZATION ===
  category: IntegrationCategory;
  subcategory?: string;
  tags?: string[];
  
  // === BRANDING ===
  logoUrl?: string;
  iconUrl?: string;
  primaryColor?: string;
  documentationUrl?: string;
  
  // === CAPABILITIES ===
  capabilities: ProviderCapability[];
  supportedOperations: SupportedOperation[];
  
  // === ENTITIES ===
  supportedEntities: EntityDefinition[];
  
  // === AUTHENTICATION ===
  authType: AuthenticationType;
  authConfig: AuthConfig;
  
  // === SYNC SETTINGS ===
  supportsWebhooks: boolean;
  supportsPolling: boolean;
  supportsDeltaSync: boolean;
  minPollIntervalMinutes: number;
  defaultPollIntervalMinutes: number;
  maxRecordsPerRequest?: number;
  
  // === QUERY LANGUAGE ===
  queryLanguage: QueryLanguage;
  queryExamples?: QueryExample[];
  
  // === RATE LIMITS ===
  rateLimits?: RateLimitConfig;
  
  // === TENANT CONFIG SCHEMA ===
  configSchema?: JSONSchema;
  defaultConfig?: Record<string, any>;
  
  // === STATUS ===
  status: ProviderStatus;
  version: string;
  releaseNotes?: string;
  
  // === EXTENSIBILITY ===
  isBuiltIn: boolean;
  isThirdParty: boolean;
  adapterModule?: string;
  partnerId?: string;
}

// === SUPPORTING TYPES ===

type IntegrationCategory = 
  | 'crm' 
  | 'communication' 
  | 'storage' 
  | 'calendar' 
  | 'email' 
  | 'project_management'
  | 'ai_model'
  | 'other';

type ProviderCapability = 
  | 'sync_inbound'      // Pull data from external
  | 'sync_outbound'     // Push data to external
  | 'webhooks'          // Real-time notifications
  | 'bulk_operations'   // Batch API support
  | 'file_download'     // Download files
  | 'file_upload'       // Upload files
  | 'search'            // Search external data
  | 'oauth_refresh';    // Auto token refresh

type SupportedOperation = 'read' | 'write' | 'delete' | 'subscribe';

type AuthenticationType = 
  | 'oauth2' 
  | 'api_key' 
  | 'service_account' 
  | 'basic'
  | 'none';

type QueryLanguage = 
  | 'soql'      // Salesforce
  | 'odata'     // Dynamics, SharePoint
  | 'graphql'   // GitHub, etc.
  | 'rest'      // Generic REST
  | 'simple';   // Key-value filters

type ProviderStatus = 'active' | 'beta' | 'deprecated' | 'disabled';

interface EntityDefinition {
  externalEntity: string;              // "Account"
  shardTypeId: string;                 // "c_company"
  displayName: string;                 // "Company"
  description?: string;
  supportedDirections: ('inbound' | 'outbound')[];
  defaultFieldMappings: FieldMapping[];
  requiredFields: string[];
  optionalFields?: string[];
}

interface FieldMapping {
  externalField: string;
  shardField: string;
  direction: 'inbound' | 'outbound' | 'bidirectional';
  transform?: FieldTransform;
  required?: boolean;
}

interface AuthConfig {
  // OAuth 2.0
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  responseType?: string;
  grantType?: string;
  pkceRequired?: boolean;
  
  // API Key
  apiKeyHeader?: string;
  apiKeyPrefix?: string;
  apiKeyLocation?: 'header' | 'query';
  
  // Service Account
  serviceAccountFields?: string[];
  serviceAccountInstructions?: string;
}

interface RateLimitConfig {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstLimit?: number;
}

interface QueryExample {
  name: string;
  description: string;
  query: string;
}
```

---

## Example Instances

### Salesforce Provider

```json
{
  "id": "provider_salesforce",
  "shardTypeId": "c_integrationProvider",
  "name": "Salesforce",
  "structuredData": {
    "name": "Salesforce",
    "displayName": "Salesforce CRM",
    "provider": "salesforce",
    "description": "Connect to Salesforce to sync accounts, contacts, and opportunities.",
    
    "category": "crm",
    "tags": ["crm", "sales", "enterprise"],
    
    "logoUrl": "/assets/integrations/salesforce-logo.svg",
    "primaryColor": "#00A1E0",
    "documentationUrl": "https://docs.castiel.io/integrations/salesforce",
    
    "capabilities": [
      "sync_inbound",
      "sync_outbound",
      "webhooks",
      "bulk_operations",
      "oauth_refresh"
    ],
    "supportedOperations": ["read", "write", "delete", "subscribe"],
    
    "supportedEntities": [
      {
        "externalEntity": "Account",
        "shardTypeId": "c_company",
        "displayName": "Company",
        "supportedDirections": ["inbound", "outbound"],
        "defaultFieldMappings": [
          { "externalField": "Name", "shardField": "name", "direction": "bidirectional", "required": true },
          { "externalField": "Industry", "shardField": "structuredData.industry", "direction": "bidirectional" },
          { "externalField": "Website", "shardField": "structuredData.website", "direction": "bidirectional" }
        ],
        "requiredFields": ["Name"]
      },
      {
        "externalEntity": "Contact",
        "shardTypeId": "c_contact",
        "displayName": "Contact",
        "supportedDirections": ["inbound", "outbound"],
        "defaultFieldMappings": [
          { "externalField": "FirstName", "shardField": "structuredData.firstName", "direction": "bidirectional" },
          { "externalField": "LastName", "shardField": "structuredData.lastName", "direction": "bidirectional", "required": true },
          { "externalField": "Email", "shardField": "structuredData.email", "direction": "bidirectional" }
        ],
        "requiredFields": ["LastName"]
      },
      {
        "externalEntity": "Opportunity",
        "shardTypeId": "c_opportunity",
        "displayName": "Opportunity",
        "supportedDirections": ["inbound", "outbound"],
        "defaultFieldMappings": [
          { "externalField": "Name", "shardField": "name", "direction": "bidirectional", "required": true },
          { "externalField": "Amount", "shardField": "structuredData.amount", "direction": "bidirectional" },
          { "externalField": "StageName", "shardField": "structuredData.stage", "direction": "bidirectional" }
        ],
        "requiredFields": ["Name", "StageName", "CloseDate"]
      }
    ],
    
    "authType": "oauth2",
    "authConfig": {
      "authorizationUrl": "https://login.salesforce.com/services/oauth2/authorize",
      "tokenUrl": "https://login.salesforce.com/services/oauth2/token",
      "scopes": ["api", "refresh_token", "offline_access"],
      "responseType": "code",
      "grantType": "authorization_code"
    },
    
    "supportsWebhooks": true,
    "supportsPolling": true,
    "supportsDeltaSync": true,
    "minPollIntervalMinutes": 5,
    "defaultPollIntervalMinutes": 15,
    "maxRecordsPerRequest": 2000,
    
    "queryLanguage": "soql",
    "queryExamples": [
      {
        "name": "Customer Accounts",
        "description": "Get all customer accounts",
        "query": "SELECT Id, Name, Industry FROM Account WHERE Type = 'Customer'"
      }
    ],
    
    "rateLimits": {
      "requestsPerSecond": 25,
      "requestsPerDay": 100000
    },
    
    "status": "active",
    "version": "1.0.0",
    "isBuiltIn": true,
    "isThirdParty": false
  }
}
```

### Gong Provider

```json
{
  "id": "provider_gong",
  "shardTypeId": "c_integrationProvider",
  "name": "Gong",
  "structuredData": {
    "name": "Gong",
    "displayName": "Gong Revenue Intelligence",
    "provider": "gong",
    
    "category": "communication",
    "tags": ["calls", "transcripts", "sales"],
    
    "capabilities": ["sync_inbound", "webhooks"],
    "supportedOperations": ["read", "subscribe"],
    
    "supportedEntities": [
      {
        "externalEntity": "call",
        "shardTypeId": "c_note",
        "displayName": "Call",
        "supportedDirections": ["inbound"],
        "defaultFieldMappings": [
          { "externalField": "title", "shardField": "name", "direction": "inbound" },
          { "externalField": "transcript", "shardField": "structuredData.content", "direction": "inbound" }
        ],
        "requiredFields": []
      }
    ],
    
    "authType": "api_key",
    "authConfig": {
      "apiKeyHeader": "Authorization",
      "apiKeyPrefix": "Basic"
    },
    
    "supportsWebhooks": true,
    "supportsPolling": true,
    "supportsDeltaSync": true,
    "minPollIntervalMinutes": 15,
    "defaultPollIntervalMinutes": 60,
    
    "queryLanguage": "rest",
    
    "rateLimits": {
      "requestsPerSecond": 5
    },
    
    "status": "active",
    "version": "1.0.0",
    "isBuiltIn": true,
    "isThirdParty": false
  }
}
```

---

## Relationships

```
c_integrationProvider (System)
│
└── used_by ──► c_integration (Tenant)
                Each tenant integration references a provider
```

---

## Permissions

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Super Admin | ✅ | ✅ | ✅ | ✅ |
| Tenant Admin | ❌ | ✅ | ❌ | ❌ |
| User | ❌ | ✅ | ❌ | ❌ |

---

## Related Documentation

- [Integrations Overview](../../integrations/README.md)
- [Providers Catalog](../../integrations/PROVIDERS.md)
- [c_integration](./c_integration.md)
- [Adapter Development](../../integrations/adapters/README.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0






