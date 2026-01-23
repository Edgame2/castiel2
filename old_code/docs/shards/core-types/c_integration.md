# c_integration

> **⚠️ DEPRECATED**: This ShardType is **NOT used**. Integrations now use dedicated Cosmos DB containers instead of shard types.
>
> **Migration**: See [Integration Container Architecture](../../features/integrations/CONTAINER-ARCHITECTURE.md) for the current architecture.
>
> **Status**: This document is kept for historical reference only. Do not use `c_integration` ShardType for new integrations.

---

## Overview

The `c_integration` ShardType **was** used to represent a tenant's configured integration with an external system. It stored authentication references, sync configuration, entity mappings, and sync state.

> **Scope**: Tenant-specific  
> **Created By**: Tenant Admin  
> **Managed By**: Tenant Admin, Sync Engine
>
> **Note**: This approach has been replaced with the `integrations` container. See [Container Architecture](../../features/integrations/CONTAINER-ARCHITECTURE.md).

---

## Schema

### Base Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | User-defined integration name |
| `description` | string | ❌ | Integration description |
| `shardTypeId` | string | ✅ | Always `c_integration` |

### Structured Data

```typescript
interface IntegrationStructuredData {
  // === IDENTITY ===
  integrationName: string;              // User-friendly name
  providerName: string;                 // Provider identifier (e.g., "salesforce")
  providerId: string;                   // Reference to c_integrationProvider
  
  // === AUTHENTICATION ===
  authMethod: AuthMethod;
  credentialSecretName: string;         // Key Vault secret name
  instanceUrl?: string;                 // For OAuth (Salesforce instance, etc.)
  
  // === SYNC CONFIGURATION ===
  syncEnabled: boolean;
  syncDirection: SyncDirection;
  syncFrequency: SyncFrequency;
  
  // === ENTITY MAPPINGS ===
  entityMappings: EntityMapping[];
  
  // === FILTERS ===
  pullFilters?: PullFilter[];
  
  // === WRITE-BACK ===
  writeBack?: WriteBackConfig;
  
  // === CONFLICT RESOLUTION ===
  conflictResolution: ConflictResolutionMode;
  
  // === WEBHOOKS ===
  webhookEnabled: boolean;
  webhookUrl?: string;                  // Registered webhook URL
  webhookId?: string;                   // External webhook ID
  webhookSecret?: string;               // Reference to secret in Key Vault
  
  // === LIMITS ===
  maxRecordsPerSync: number;
  
  // === SYNC STATE ===
  lastSyncAt?: string;
  lastSyncStatus?: SyncStatus;
  lastSyncMessage?: string;
  lastSyncRecordsProcessed?: number;
  nextSyncAt?: string;
  
  // === STATUS ===
  status: IntegrationStatus;
  statusMessage?: string;
  statusChangedAt?: string;
  
  // === METADATA ===
  configuredBy: string;                 // User who set up integration
  configuredAt: string;
}

// === SUPPORTING TYPES ===

type AuthMethod = 'oauth' | 'apikey' | 'serviceaccount' | 'basic';

type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';

interface SyncFrequency {
  type: 'interval' | 'cron' | 'manual';
  intervalMinutes?: number;             // 5, 15, 30, 60
  cronExpression?: string;              // "0 0 */4 * * *"
}

interface EntityMapping {
  // Identity
  id: string;                           // Unique mapping ID
  externalEntity: string;               // "Account"
  shardTypeId: string;                  // "c_company"
  displayName?: string;                 // "Company"
  
  // Direction
  direction: 'inbound' | 'outbound' | 'bidirectional';
  
  // Behavior
  enabled: boolean;
  createNew: boolean;                   // Create new shards
  updateExisting: boolean;              // Update existing shards
  deleteOnRemoval: boolean;             // Delete when removed from external
  
  // Field mappings
  fieldMappings: FieldMapping[];
  
  // Entity-specific filter
  filter?: string;
}

interface FieldMapping {
  id: string;
  externalField: string;
  shardField: string;
  direction: 'inbound' | 'outbound' | 'bidirectional';
  transform?: FieldTransform;
  required?: boolean;
  defaultValue?: any;
}

interface FieldTransform {
  type: 'direct' | 'map' | 'template' | 'custom';
  mapping?: Record<string, string>;
  template?: string;
  customFn?: string;
}

interface PullFilter {
  entity: string;
  filterType: 'soql' | 'odata' | 'rest' | 'simple';
  expression: string;
  description?: string;
}

interface WriteBackConfig {
  enabled: boolean;
  mode: 'realtime';
  entities: WriteBackEntity[];
  retryPolicy: RetryPolicy;
}

interface WriteBackEntity {
  shardTypeId: string;
  externalEntity: string;
  operations: ('create' | 'update' | 'delete')[];
  fieldMappings: FieldMapping[];
}

interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

type ConflictResolutionMode = 
  | 'last_write_wins' 
  | 'external_wins' 
  | 'castiel_wins' 
  | 'manual';

type SyncStatus = 
  | 'success' 
  | 'partial' 
  | 'failed' 
  | 'cancelled';

type IntegrationStatus = 
  | 'active'           // Enabled and functioning
  | 'paused'           // Manually paused
  | 'error'            // Error state (auth failure, etc.)
  | 'needs_reauth'     // OAuth needs re-authorization
  | 'configuring';     // Initial setup
```

---

## Example Instance

```json
{
  "id": "int_acme_salesforce",
  "tenantId": "tenant_acme123",
  "shardTypeId": "c_integration",
  "name": "Acme Salesforce",
  "description": "Main Salesforce integration for Acme Corp",
  
  "structuredData": {
    "integrationName": "Acme Salesforce",
    "providerName": "salesforce",
    "providerId": "provider_salesforce",
    
    "authMethod": "oauth",
    "credentialSecretName": "tenant-acme123-salesforce-oauth",
    "instanceUrl": "https://acme.my.salesforce.com",
    
    "syncEnabled": true,
    "syncDirection": "bidirectional",
    "syncFrequency": {
      "type": "interval",
      "intervalMinutes": 15
    },
    
    "entityMappings": [
      {
        "id": "map_account",
        "externalEntity": "Account",
        "shardTypeId": "c_company",
        "displayName": "Company",
        "direction": "bidirectional",
        "enabled": true,
        "createNew": true,
        "updateExisting": true,
        "deleteOnRemoval": false,
        "fieldMappings": [
          {
            "id": "fm_name",
            "externalField": "Name",
            "shardField": "name",
            "direction": "bidirectional",
            "required": true
          },
          {
            "id": "fm_industry",
            "externalField": "Industry",
            "shardField": "structuredData.industry",
            "direction": "bidirectional"
          },
          {
            "id": "fm_website",
            "externalField": "Website",
            "shardField": "structuredData.website",
            "direction": "bidirectional"
          }
        ],
        "filter": "Type = 'Customer'"
      },
      {
        "id": "map_contact",
        "externalEntity": "Contact",
        "shardTypeId": "c_contact",
        "displayName": "Contact",
        "direction": "bidirectional",
        "enabled": true,
        "createNew": true,
        "updateExisting": true,
        "deleteOnRemoval": false,
        "fieldMappings": [
          {
            "id": "fm_firstname",
            "externalField": "FirstName",
            "shardField": "structuredData.firstName",
            "direction": "bidirectional"
          },
          {
            "id": "fm_lastname",
            "externalField": "LastName",
            "shardField": "structuredData.lastName",
            "direction": "bidirectional",
            "required": true
          },
          {
            "id": "fm_email",
            "externalField": "Email",
            "shardField": "structuredData.email",
            "direction": "bidirectional"
          }
        ]
      }
    ],
    
    "pullFilters": [
      {
        "entity": "Account",
        "filterType": "soql",
        "expression": "Type = 'Customer' AND OwnerId IN ('005xxx', '005yyy')",
        "description": "Only customer accounts owned by specific users"
      }
    ],
    
    "writeBack": {
      "enabled": true,
      "mode": "realtime",
      "entities": [
        {
          "shardTypeId": "c_company",
          "externalEntity": "Account",
          "operations": ["update"],
          "fieldMappings": [
            { "id": "wb_name", "externalField": "Name", "shardField": "name", "direction": "outbound" },
            { "id": "wb_industry", "externalField": "Industry", "shardField": "structuredData.industry", "direction": "outbound" }
          ]
        }
      ],
      "retryPolicy": {
        "maxAttempts": 3,
        "initialDelayMs": 5000,
        "backoffMultiplier": 2,
        "maxDelayMs": 60000
      }
    },
    
    "conflictResolution": "last_write_wins",
    
    "webhookEnabled": true,
    "webhookUrl": "https://api.castiel.io/webhooks/salesforce/acme123",
    "webhookId": "CDC_Account_acme123",
    
    "maxRecordsPerSync": 1000,
    
    "lastSyncAt": "2025-11-30T10:00:00Z",
    "lastSyncStatus": "success",
    "lastSyncRecordsProcessed": 150,
    "nextSyncAt": "2025-11-30T10:15:00Z",
    
    "status": "active",
    
    "configuredBy": "user_admin_123",
    "configuredAt": "2025-11-01T09:00:00Z"
  },
  
  "relationships": [
    {
      "type": "uses_provider",
      "targetId": "provider_salesforce",
      "targetType": "c_integrationProvider"
    }
  ],
  
  "createdAt": "2025-11-01T09:00:00Z",
  "updatedAt": "2025-11-30T10:00:00Z",
  "createdBy": "user_admin_123",
  "updatedBy": "system"
}
```

---

## Relationships

```
c_integrationProvider (System)
│
└── used_by ◄── c_integration (Tenant)
                │
                ├── syncs ──► c_company (via entityMappings)
                ├── syncs ──► c_contact
                ├── syncs ──► c_opportunity
                │
                └── has_history ──► c_integrationSync[]
```

---

## Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. CONFIGURING                                                             │
│     └── Admin selects provider, enters credentials                          │
│                    │                                                        │
│                    ▼                                                        │
│  2. ACTIVE                                                                  │
│     └── Syncing according to schedule                                       │
│         ├── Success → stays ACTIVE                                          │
│         ├── Auth failure → NEEDS_REAUTH                                     │
│         └── Other error → ERROR                                             │
│                    │                                                        │
│          ┌────────┼────────┐                                               │
│          │        │        │                                               │
│          ▼        ▼        ▼                                               │
│  3. PAUSED   ERROR    NEEDS_REAUTH                                         │
│     (manual)  (auto)   (auto)                                              │
│          │        │        │                                               │
│          └────────┼────────┘                                               │
│                   │                                                        │
│                   ▼                                                        │
│          Fix issue / Re-auth                                               │
│                   │                                                        │
│                   ▼                                                        │
│              2. ACTIVE                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Permissions

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Super Admin | ✅ | ✅ | ✅ | ✅ |
| Tenant Admin | ✅ | ✅ | ✅ | ✅ |
| User | ❌ | ✅ (own tenant) | ❌ | ❌ |

---

## Related Documentation

- [Integrations Overview](../../integrations/README.md)
- [Configuration Reference](../../integrations/CONFIGURATION.md)
- [c_integrationProvider](./c_integrationProvider.md)
- [c_integrationSync](./c_integrationSync.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0






