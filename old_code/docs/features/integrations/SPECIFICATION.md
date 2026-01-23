# Integrations System Specification

## Overview

The Integrations system enables Castiel to connect with external services, import/export data, and maintain synchronized records. Integrations support various data sources including CRMs, communication platforms, news feeds, and custom APIs.

---

## Table of Contents

1. [Integration Types](#integration-types)
2. [Access Control & Visibility](#access-control--visibility)
3. [Integration Configuration](#integration-configuration)
4. [Conversion Schema](#conversion-schema)
5. [Sync Tasks](#sync-tasks)
6. [Authentication & Credentials](#authentication--credentials)
7. [Sync Management](#sync-management)
8. [Data Model](#data-model)
9. [API Reference](#api-reference)
10. [UI Components](#ui-components)

---

## Integration Types

### Categories

| Category | Examples | Description |
|----------|----------|-------------|
| **CRM** | Salesforce, HubSpot, Pipedrive, Zoho | Customer relationship management platforms |
| **Communication** | Gmail, Outlook, Slack, Teams | Email and messaging platforms |
| **Data Sources** | Google News, RSS Feeds, Custom APIs | External data feeds and news sources |
| **Storage** | Google Drive, OneDrive, Dropbox, Box | File storage and document management |
| **AI Provider** | OpenAI, Azure OpenAI, Anthropic, Google | AI model providers for LLM, embeddings, images |
| **Custom** | Webhooks, REST APIs, GraphQL | Custom integrations via APIs |

### Integration Definition

```typescript
interface IntegrationDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  icon: string;
  color: string;
  
  // Visibility & Access
  visibility: 'public' | 'superadmin_only';
  isPremium: boolean;
  requiredPlan?: string;
  
  // Capabilities
  capabilities: IntegrationCapability[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  
  // Authentication
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  oauthConfig?: OAuthConfig;
  
  // Data entities this integration can sync
  availableEntities: IntegrationEntity[];
  
  // System-wide or per-tenant
  connectionScope: 'system' | 'tenant' | 'both';
  
  // Status
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  version: string;
}

type IntegrationCategory = 
  | 'crm' 
  | 'communication' 
  | 'data_source' 
  | 'storage' 
  | 'ai_provider'
  | 'custom';

type IntegrationCapability =
  | 'read'           // Can read data from integration
  | 'write'          // Can write data to integration
  | 'delete'         // Can delete data in integration
  | 'search'         // Can search within integration
  | 'realtime'       // Supports real-time sync via webhooks
  | 'bulk'           // Supports bulk operations
  | 'attachments';   // Supports file attachments
```

---

## Access Control & Visibility

### Visibility Levels

| Level | Who Can See | Who Can Configure | Use Case |
|-------|-------------|-------------------|----------|
| **Public** | All Tenant Admins | Tenant Admin | Standard integrations (HubSpot, Google Drive) |
| **Super Admin Only** | Super Admins | Super Admin | System-wide, premium, or high-security integrations |

### Permission Matrix

| Action | User | Tenant Admin | Super Admin |
|--------|------|--------------|-------------|
| View available integrations | ✓ (public only) | ✓ (public only) | ✓ (all) |
| Enable integration for tenant | ✗ | ✓ (public only) | ✓ (all) |
| Configure credentials | ✗ | ✓ (tenant scope) | ✓ (all scopes) |
| Create sync tasks | ✗ | ✓ | ✓ |
| Configure conversion schema | ✗ | ✓ | ✓ |
| View sync logs | ✓ (own syncs) | ✓ | ✓ |
| Manage system-wide connections | ✗ | ✗ | ✓ |
| Add/remove integration definitions | ✗ | ✗ | ✓ |

### Super Admin Only Integrations

Integrations marked as `superadmin_only` include:
- **System-wide integrations**: Single connection shared across tenants
- **High-security integrations**: Require elevated permissions
- **Premium integrations**: Paid/licensed integrations
- **Beta integrations**: Features still in testing

```typescript
// Example: System-wide news integration
const googleNewsIntegration: IntegrationDefinition = {
  id: 'google-news',
  name: 'google_news',
  displayName: 'Google News',
  visibility: 'superadmin_only',  // Only super admins can see/configure
  connectionScope: 'system',       // One connection for all tenants
  isPremium: false,
  // ...
};

// Example: Per-tenant CRM integration
const salesforceIntegration: IntegrationDefinition = {
  id: 'salesforce',
  name: 'salesforce',
  displayName: 'Salesforce',
  visibility: 'public',           // All tenant admins can see
  connectionScope: 'tenant',      // Each tenant connects their own
  isPremium: false,
  // ...
};
```

### AI Provider Integrations

AI Providers are a special integration category that provides AI model access.

```typescript
// Example: OpenAI integration
const openAIIntegration: IntegrationDefinition = {
  id: 'openai',
  name: 'openai',
  displayName: 'OpenAI',
  category: 'ai_provider',
  visibility: 'public',
  connectionScope: 'both',        // System-wide AND per-tenant
  authType: 'api_key',
  capabilities: ['read'],         // AI providers are read-only (no sync)
  supportsRealtime: false,
  supportsWebhooks: false,
  availableEntities: [],          // No data sync - models defined via c_aimodel
  // ...
};
```

#### AI Model ShardType (`c_aimodel`)

AI models are managed as Shards (type: `c_aimodel`), not hardcoded. This allows:
- Dynamic model management without code changes
- Super Admin can add new models via UI
- Models can be deprecated/updated independently

See [c_aimodel documentation](../../shards/core-types/c_aimodel.md) for full schema.

#### Model Selection Hierarchy

```
1. Assistant-specific model (c_assistant.model → c_aimodel)
   ↓ (not set)
2. Tenant default model (set by Tenant Admin)
   ↓ (not set)
3. System default model (c_aimodel with isDefault: true)
```

#### AI Provider Credentials

| Credential Source | Who Sets | Use Case |
|-------------------|----------|----------|
| **System** | Super Admin | Default for all tenants |
| **Tenant (BYOK)** | Tenant Admin | Tenant's own API key |

```typescript
// Tenant AI Configuration
interface TenantAIConfig {
  tenantId: string;
  
  // Default models by type
  defaultModels: {
    llm?: string;              // Reference to c_aimodel
    embedding?: string;
    imageGeneration?: string;
    textToSpeech?: string;
  };
  
  // Tenant's own API keys (BYOK)
  customCredentials?: {
    provider: string;          // openai, anthropic, etc.
    encryptedApiKey: string;
    endpoint?: string;         // For Azure
  }[];
  
  // Use system credentials or tenant's own
  useSystemCredentials: boolean;
}
```

---

## Integration Configuration

### Tenant Integration Instance

When a tenant enables an integration:

```typescript
interface TenantIntegration {
  id: string;
  tenantId: string;
  integrationId: string;
  
  // Status
  status: 'pending' | 'connected' | 'error' | 'disabled';
  enabledAt: Date;
  enabledBy: string;
  
  // Connection
  connectionId?: string;  // Reference to credentials
  lastConnectedAt?: Date;
  connectionError?: string;
  
  // Configuration
  settings: Record<string, any>;  // Integration-specific settings
  
  // Sync tasks
  syncTasks: SyncTask[];
  
  // Conversion schemas
  conversionSchemas: ConversionSchema[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Conversion Schema

The conversion schema maps data from external integrations to Castiel ShardTypes.

### Schema Definition

```typescript
interface ConversionSchema {
  id: string;
  tenantIntegrationId: string;
  name: string;
  description?: string;
  
  // Source configuration
  source: {
    entity: string;              // e.g., "Opportunity", "Contact"
    filters?: SourceFilter[];    // Optional filters on source data
  };
  
  // Target configuration
  target: {
    shardTypeId: string;         // Target ShardType in Castiel
    createIfMissing: boolean;    // Create shard if not found
    updateIfExists: boolean;     // Update existing shard
    deleteIfRemoved: boolean;    // Delete if removed from source
  };
  
  // Field mappings
  fieldMappings: FieldMapping[];
  
  // Relationship mappings
  relationshipMappings?: RelationshipMapping[];
  
  // Deduplication
  deduplication: {
    strategy: 'external_id' | 'field_match' | 'composite';
    externalIdField?: string;    // Field containing external ID
    matchFields?: string[];      // Fields to match on
  };
  
  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Field Mapping Types

```typescript
interface FieldMapping {
  id: string;
  targetField: string;           // Field in ShardType
  mappingType: FieldMappingType;
  config: FieldMappingConfig;
  
  // Validation
  required?: boolean;
  validation?: ValidationRule[];
}

type FieldMappingType = 
  | 'direct'           // 1:1 mapping
  | 'transform'        // Apply transformation
  | 'conditional'      // Conditional logic
  | 'default'          // Static default value
  | 'composite'        // Combine multiple fields
  | 'lookup'           // Lookup from another source
  | 'flatten';         // Flatten nested object

// Direct mapping: 1:1 field mapping
interface DirectMappingConfig {
  type: 'direct';
  sourceField: string;
}

// Transform mapping: Apply transformations
interface TransformMappingConfig {
  type: 'transform';
  sourceField: string;
  transformations: Transformation[];
}

// Conditional mapping: Logic-based mapping
interface ConditionalMappingConfig {
  type: 'conditional';
  conditions: ConditionalRule[];
  default?: any;
}

// Default mapping: Static value
interface DefaultMappingConfig {
  type: 'default';
  value: any;
}

// Composite mapping: Combine fields
interface CompositeMappingConfig {
  type: 'composite';
  sourceFields: string[];
  separator?: string;
  template?: string;  // e.g., "${firstName} ${lastName}"
}

// Flatten mapping: Nested data
interface FlattenMappingConfig {
  type: 'flatten';
  sourceField: string;
  path: string;  // JSONPath or dot notation
}

type FieldMappingConfig = 
  | DirectMappingConfig
  | TransformMappingConfig
  | ConditionalMappingConfig
  | DefaultMappingConfig
  | CompositeMappingConfig
  | FlattenMappingConfig;
```

### Transformations

```typescript
interface Transformation {
  type: TransformationType;
  config?: Record<string, any>;
}

type TransformationType =
  // String transformations
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'truncate'        // config: { maxLength: number }
  | 'replace'         // config: { search: string, replace: string }
  | 'regex_replace'   // config: { pattern: string, replace: string }
  | 'split'           // config: { separator: string, index: number }
  | 'concat'          // config: { prefix?: string, suffix?: string }
  
  // Number transformations
  | 'round'           // config: { decimals: number }
  | 'multiply'        // config: { factor: number }
  | 'divide'          // config: { divisor: number }
  | 'currency_convert' // config: { from: string, to: string }
  
  // Date transformations
  | 'parse_date'      // config: { format: string }
  | 'format_date'     // config: { format: string }
  | 'add_days'        // config: { days: number }
  | 'to_timestamp'
  | 'to_iso_string'
  
  // Type conversions
  | 'to_string'
  | 'to_number'
  | 'to_boolean'
  | 'to_array'
  | 'to_date'
  
  // Custom
  | 'custom';         // config: { expression: string }
```

### Conditional Rules

```typescript
interface ConditionalRule {
  condition: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 
              'contains' | 'starts_with' | 'ends_with' | 
              'in' | 'not_in' | 'exists' | 'not_exists';
    value: any;
  };
  then: {
    type: 'value' | 'field' | 'transform';
    value?: any;
    sourceField?: string;
    transformations?: Transformation[];
  };
}
```

### Conversion Schema Examples

#### Example 1: Salesforce Contact → c_contact

```typescript
const salesforceContactSchema: ConversionSchema = {
  id: 'sf-contact-to-contact',
  name: 'Salesforce Contact to Contact',
  source: {
    entity: 'Contact',
    filters: [
      { field: 'IsDeleted', operator: 'eq', value: false }
    ]
  },
  target: {
    shardTypeId: 'c_contact',
    createIfMissing: true,
    updateIfExists: true,
    deleteIfRemoved: false
  },
  fieldMappings: [
    // Direct mapping
    {
      targetField: 'email',
      mappingType: 'direct',
      config: { type: 'direct', sourceField: 'Email' },
      required: true
    },
    // Composite mapping (combine first + last name)
    {
      targetField: 'name',
      mappingType: 'composite',
      config: {
        type: 'composite',
        sourceFields: ['FirstName', 'LastName'],
        template: '${FirstName} ${LastName}'
      }
    },
    // Transform mapping (phone formatting)
    {
      targetField: 'phone',
      mappingType: 'transform',
      config: {
        type: 'transform',
        sourceField: 'Phone',
        transformations: [
          { type: 'replace', config: { search: ' ', replace: '' } }
        ]
      }
    },
    // Flatten nested data
    {
      targetField: 'street',
      mappingType: 'flatten',
      config: {
        type: 'flatten',
        sourceField: 'MailingAddress',
        path: 'street'
      }
    },
    // Default value
    {
      targetField: 'source',
      mappingType: 'default',
      config: { type: 'default', value: 'salesforce' }
    }
  ],
  deduplication: {
    strategy: 'external_id',
    externalIdField: 'Id'
  },
  isActive: true
};
```

#### Example 2: Salesforce Opportunity → c_opportunity (Conditional)

```typescript
const salesforceOpportunitySchema: ConversionSchema = {
  id: 'sf-opportunity',
  name: 'Salesforce Opportunity',
  source: {
    entity: 'Opportunity'
  },
  target: {
    shardTypeId: 'c_opportunity',
    createIfMissing: true,
    updateIfExists: true,
    deleteIfRemoved: false
  },
  fieldMappings: [
    {
      targetField: 'name',
      mappingType: 'direct',
      config: { type: 'direct', sourceField: 'Name' }
    },
    {
      targetField: 'value',
      mappingType: 'direct',
      config: { type: 'direct', sourceField: 'Amount' }
    },
    // Conditional: Map Salesforce stage to our stages
    {
      targetField: 'stage',
      mappingType: 'conditional',
      config: {
        type: 'conditional',
        conditions: [
          {
            condition: { field: 'StageName', operator: 'eq', value: 'Prospecting' },
            then: { type: 'value', value: 'lead' }
          },
          {
            condition: { field: 'StageName', operator: 'eq', value: 'Qualification' },
            then: { type: 'value', value: 'qualified' }
          },
          {
            condition: { field: 'StageName', operator: 'eq', value: 'Proposal' },
            then: { type: 'value', value: 'proposal' }
          },
          {
            condition: { field: 'StageName', operator: 'in', value: ['Negotiation', 'Review'] },
            then: { type: 'value', value: 'negotiation' }
          },
          {
            condition: { field: 'StageName', operator: 'eq', value: 'Closed Won' },
            then: { type: 'value', value: 'won' }
          },
          {
            condition: { field: 'StageName', operator: 'eq', value: 'Closed Lost' },
            then: { type: 'value', value: 'lost' }
          }
        ],
        default: 'lead'
      }
    },
    // Date transformation
    {
      targetField: 'expectedCloseDate',
      mappingType: 'transform',
      config: {
        type: 'transform',
        sourceField: 'CloseDate',
        transformations: [
          { type: 'to_date' }
        ]
      }
    }
  ],
  relationshipMappings: [
    {
      relationshipType: 'belongs_to',
      targetField: 'companyId',
      sourceField: 'AccountId',
      lookupShardType: 'c_company',
      lookupByExternalId: true
    }
  ],
  deduplication: {
    strategy: 'external_id',
    externalIdField: 'Id'
  },
  isActive: true
};
```

#### Example 3: Google News → c_news

```typescript
const googleNewsSchema: ConversionSchema = {
  id: 'google-news-to-news',
  name: 'Google News Articles',
  source: {
    entity: 'article'
  },
  target: {
    shardTypeId: 'c_news',
    createIfMissing: true,
    updateIfExists: false,  // News articles are immutable
    deleteIfRemoved: false
  },
  fieldMappings: [
    {
      targetField: 'name',
      mappingType: 'direct',
      config: { type: 'direct', sourceField: 'title' }
    },
    {
      targetField: 'summary',
      mappingType: 'direct',
      config: { type: 'direct', sourceField: 'description' }
    },
    {
      targetField: 'url',
      mappingType: 'direct',
      config: { type: 'direct', sourceField: 'link' }
    },
    {
      targetField: 'source',
      mappingType: 'flatten',
      config: {
        type: 'flatten',
        sourceField: 'source',
        path: 'name'
      }
    },
    {
      targetField: 'publishedAt',
      mappingType: 'transform',
      config: {
        type: 'transform',
        sourceField: 'publishedAt',
        transformations: [
          { type: 'to_date' }
        ]
      }
    },
    {
      targetField: 'industry',
      mappingType: 'default',
      config: { type: 'default', value: '{{task.industry}}' }  // From sync task config
    }
  ],
  deduplication: {
    strategy: 'external_id',
    externalIdField: 'link'  // Use URL as unique identifier
  },
  isActive: true
};
```

---

## Sync Tasks

Sync tasks define when and how data is synchronized.

### Sync Task Definition

```typescript
interface SyncTask {
  id: string;
  tenantIntegrationId: string;
  name: string;
  description?: string;
  
  // What to sync
  conversionSchemaId: string;
  
  // Direction
  direction: 'pull' | 'push' | 'bidirectional';
  
  // Schedule
  schedule: SyncSchedule;
  
  // Task-specific configuration
  config: Record<string, any>;  // e.g., { industry: 'banking' }
  
  // Status
  status: 'active' | 'paused' | 'error' | 'disabled';
  
  // Execution tracking
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'partial' | 'failed';
  nextRunAt?: Date;
  
  // Statistics
  stats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    lastSuccessAt?: Date;
    lastFailureAt?: Date;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsSkipped: number;
    recordsFailed: number;
  };
  
  // Error tracking
  lastError?: {
    message: string;
    timestamp: Date;
    details?: any;
  };
  
  // Retry configuration
  retryConfig: {
    maxRetries: number;
    retryDelaySeconds: number;
    exponentialBackoff: boolean;
  };
  
  // Notifications
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    onPartial: boolean;
    recipients: string[];  // User IDs or email addresses
  };
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Schedule Types

```typescript
interface SyncSchedule {
  type: 'manual' | 'interval' | 'cron' | 'realtime';
  config: ManualSchedule | IntervalSchedule | CronSchedule | RealtimeSchedule;
}

// Manual: Only run when triggered manually
interface ManualSchedule {
  type: 'manual';
}

// Interval: Run every X units
interface IntervalSchedule {
  type: 'interval';
  interval: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
}

// Cron: Complex schedules
interface CronSchedule {
  type: 'cron';
  expression: string;        // Standard cron expression
  timezone: string;          // IANA timezone
}

// Realtime: Webhook-based
interface RealtimeSchedule {
  type: 'realtime';
  webhookUrl: string;        // Endpoint for incoming webhooks
  verificationToken: string;
}
```

### Sync Task Examples

#### Example 1: Salesforce Opportunities - Hourly Pull

```typescript
const salesforceOpportunitySync: SyncTask = {
  id: 'sf-opp-hourly',
  name: 'Salesforce Opportunities - Hourly',
  description: 'Pull updated opportunities every hour',
  conversionSchemaId: 'sf-opportunity',
  direction: 'pull',
  schedule: {
    type: 'interval',
    config: {
      type: 'interval',
      interval: 1,
      unit: 'hours'
    }
  },
  config: {
    // Only fetch records modified since last sync
    incrementalSync: true,
    modifiedSinceField: 'LastModifiedDate'
  },
  status: 'active',
  retryConfig: {
    maxRetries: 3,
    retryDelaySeconds: 300,
    exponentialBackoff: true
  },
  notifications: {
    onSuccess: false,
    onFailure: true,
    onPartial: true,
    recipients: ['admin@tenant.com']
  }
};
```

#### Example 2: Salesforce Contacts - Daily Pull

```typescript
const salesforceContactSync: SyncTask = {
  id: 'sf-contact-daily',
  name: 'Salesforce Contacts - Daily',
  description: 'Pull all contacts daily at 2 AM',
  conversionSchemaId: 'sf-contact-to-contact',
  direction: 'pull',
  schedule: {
    type: 'cron',
    config: {
      type: 'cron',
      expression: '0 2 * * *',  // Every day at 2 AM
      timezone: 'America/New_York'
    }
  },
  config: {},
  status: 'active'
};
```

#### Example 3: Google News - Industry News Daily

```typescript
const bankingNewsSync: SyncTask = {
  id: 'news-banking-daily',
  name: 'Banking Industry News',
  description: 'Get latest news about banking industry every day',
  conversionSchemaId: 'google-news-to-news',
  direction: 'pull',
  schedule: {
    type: 'cron',
    config: {
      type: 'cron',
      expression: '0 6 * * *',  // Every day at 6 AM
      timezone: 'UTC'
    }
  },
  config: {
    query: 'banking industry',
    language: 'en',
    country: 'us',
    maxResults: 50,
    industry: 'banking'  // Used in conversion schema
  },
  status: 'active'
};

const automationNewsSync: SyncTask = {
  id: 'news-automation-daily',
  name: 'Automation Industry News',
  description: 'Get latest news about automation every day',
  conversionSchemaId: 'google-news-to-news',
  direction: 'pull',
  schedule: {
    type: 'cron',
    config: {
      type: 'cron',
      expression: '0 6 * * *',
      timezone: 'UTC'
    }
  },
  config: {
    query: 'automation robotics',
    language: 'en',
    maxResults: 50,
    industry: 'automation'
  },
  status: 'active'
};
```

#### Example 4: Company-Specific News - Weekly

```typescript
const companyNewsSync: SyncTask = {
  id: 'news-company-weekly',
  name: 'Competitor News - Weekly',
  description: 'Get news about competitor XYZ Corp every week',
  conversionSchemaId: 'google-news-to-news',
  direction: 'pull',
  schedule: {
    type: 'cron',
    config: {
      type: 'cron',
      expression: '0 8 * * 1',  // Every Monday at 8 AM
      timezone: 'America/New_York'
    }
  },
  config: {
    query: '"XYZ Corporation"',
    language: 'en',
    maxResults: 20,
    relatedCompanyId: 'shard-id-of-xyz-corp'  // Auto-link to company
  },
  status: 'active'
};
```

#### Example 5: Bidirectional CRM Sync

```typescript
const bidirectionalSync: SyncTask = {
  id: 'sf-bidirectional',
  name: 'Salesforce Bidirectional Sync',
  description: 'Keep contacts in sync both ways',
  conversionSchemaId: 'sf-contact-to-contact',
  direction: 'bidirectional',
  schedule: {
    type: 'interval',
    config: {
      type: 'interval',
      interval: 15,
      unit: 'minutes'
    }
  },
  config: {
    conflictResolution: 'newest_wins',  // or 'source_wins', 'target_wins', 'manual'
    pushChangesFrom: 'lastSyncTimestamp',
    pullChangesFrom: 'lastSyncTimestamp'
  },
  status: 'active'
};
```

---

## Authentication & Credentials

### Connection Definition

```typescript
interface IntegrationConnection {
  id: string;
  integrationId: string;
  
  // Scope
  scope: 'system' | 'tenant';
  tenantId?: string;  // Required if scope is 'tenant'
  
  // Authentication
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  credentials: EncryptedCredentials;
  
  // OAuth specific
  oauth?: {
    accessToken: string;       // Encrypted
    refreshToken?: string;     // Encrypted
    tokenType: string;
    expiresAt?: Date;
    scope?: string[];
  };
  
  // Status
  status: 'active' | 'expired' | 'revoked' | 'error';
  lastValidatedAt?: Date;
  
  // Metadata
  displayName?: string;        // e.g., "john@company.com's Salesforce"
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Credentials are encrypted at rest
interface EncryptedCredentials {
  encryptedData: string;
  keyId: string;              // Reference to encryption key
  algorithm: string;
}

// Decrypted credential types
type Credentials = 
  | { type: 'api_key'; apiKey: string }
  | { type: 'basic'; username: string; password: string }
  | { type: 'oauth2'; clientId: string; clientSecret: string }
  | { type: 'custom'; data: Record<string, any> };
```

### OAuth Flow

```typescript
interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  scopes: string[];
  clientId: string;           // Can be from env or per-tenant
  clientSecret: string;       // Encrypted
  redirectUri: string;
  pkce: boolean;
}

// OAuth state for security
interface OAuthState {
  integrationId: string;
  tenantId?: string;
  userId: string;
  returnUrl: string;
  nonce: string;
  expiresAt: Date;
}
```

---

## Sync Management

### Sync Execution

```typescript
interface SyncExecution {
  id: string;
  syncTaskId: string;
  tenantIntegrationId: string;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  
  // Trigger
  triggeredBy: 'schedule' | 'manual' | 'webhook' | 'retry';
  triggeredByUserId?: string;
  
  // Status
  status: 'running' | 'success' | 'partial' | 'failed' | 'cancelled';
  
  // Progress
  progress: {
    phase: 'fetching' | 'transforming' | 'saving' | 'complete';
    totalRecords?: number;
    processedRecords: number;
    percentage: number;
  };
  
  // Results
  results: {
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  
  // Errors
  errors: SyncError[];
  
  // For retry
  retryCount: number;
  retryOf?: string;  // Previous execution ID
}

interface SyncError {
  timestamp: Date;
  phase: string;
  recordId?: string;
  externalId?: string;
  error: string;
  details?: any;
  recoverable: boolean;
}
```

### Sync Log

```typescript
interface SyncLog {
  id: string;
  syncExecutionId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
}
```

### Conflict Resolution (Bidirectional)

```typescript
type ConflictResolutionStrategy = 
  | 'newest_wins'      // Most recently modified record wins
  | 'source_wins'      // External system always wins
  | 'target_wins'      // Castiel always wins
  | 'manual'           // Create conflict record for manual resolution
  | 'merge';           // Attempt to merge non-conflicting fields

interface SyncConflict {
  id: string;
  syncExecutionId: string;
  
  // Conflicting records
  externalId: string;
  shardId: string;
  
  // Data
  externalData: Record<string, any>;
  localData: Record<string, any>;
  
  // Conflicting fields
  conflictingFields: Array<{
    field: string;
    externalValue: any;
    localValue: any;
    externalModifiedAt: Date;
    localModifiedAt: Date;
  }>;
  
  // Resolution
  status: 'pending' | 'resolved' | 'ignored';
  resolution?: {
    strategy: string;
    resolvedBy?: string;
    resolvedAt?: Date;
    finalData: Record<string, any>;
  };
  
  createdAt: Date;
}
```

---

## Data Model

### External ID Storage

External IDs are stored in the Shard's `externalRelationships` field:

```typescript
// In Shard type
interface Shard {
  // ... other fields
  
  externalRelationships: ExternalRelationship[];
}

interface ExternalRelationship {
  integrationId: string;       // e.g., 'salesforce'
  externalId: string;          // e.g., '001D000001234ABC'
  externalType?: string;       // e.g., 'Contact'
  lastSyncedAt: Date;
  syncStatus: 'synced' | 'pending' | 'error';
  metadata?: Record<string, any>;
}
```

### c_news ShardType

```typescript
interface NewsStructuredData {
  name: string;                 // Article title
  summary?: string;             // Article description/snippet
  url: string;                  // Original article URL
  source: string;               // News source name
  sourceUrl?: string;           // News source URL
  publishedAt: Date;
  author?: string;
  imageUrl?: string;
  
  // Categorization
  industry?: string;
  topics?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  
  // AI enrichment
  aiSummary?: string;
  keyEntities?: string[];
  relevanceScore?: number;
}
```

---

## API Reference

### Integration Management

```
GET    /api/integrations                    # List available integrations
GET    /api/integrations/:id                # Get integration details
POST   /api/admin/integrations              # [Super Admin] Add integration
PATCH  /api/admin/integrations/:id          # [Super Admin] Update integration
DELETE /api/admin/integrations/:id          # [Super Admin] Remove integration
```

### Tenant Integrations

```
GET    /api/tenant/integrations             # List enabled integrations
POST   /api/tenant/integrations             # Enable integration for tenant
GET    /api/tenant/integrations/:id         # Get tenant integration
PATCH  /api/tenant/integrations/:id         # Update configuration
DELETE /api/tenant/integrations/:id         # Disable integration
```

### Connections

```
POST   /api/tenant/integrations/:id/connect         # Initiate connection
GET    /api/tenant/integrations/:id/oauth/callback  # OAuth callback
POST   /api/tenant/integrations/:id/disconnect      # Disconnect
GET    /api/tenant/integrations/:id/connection      # Get connection status
POST   /api/tenant/integrations/:id/test            # Test connection
```

### Conversion Schemas

```
GET    /api/tenant/integrations/:id/schemas         # List schemas
POST   /api/tenant/integrations/:id/schemas         # Create schema
GET    /api/tenant/integrations/:id/schemas/:sid    # Get schema
PATCH  /api/tenant/integrations/:id/schemas/:sid    # Update schema
DELETE /api/tenant/integrations/:id/schemas/:sid    # Delete schema
POST   /api/tenant/integrations/:id/schemas/:sid/test  # Test with sample data
```

### Sync Tasks

```
GET    /api/tenant/integrations/:id/tasks           # List sync tasks
POST   /api/tenant/integrations/:id/tasks           # Create task
GET    /api/tenant/integrations/:id/tasks/:tid      # Get task
PATCH  /api/tenant/integrations/:id/tasks/:tid      # Update task
DELETE /api/tenant/integrations/:id/tasks/:tid      # Delete task
POST   /api/tenant/integrations/:id/tasks/:tid/run  # Manual trigger
POST   /api/tenant/integrations/:id/tasks/:tid/pause   # Pause task
POST   /api/tenant/integrations/:id/tasks/:tid/resume  # Resume task
```

### Sync Executions

```
GET    /api/tenant/integrations/:id/executions      # List executions
GET    /api/tenant/integrations/:id/executions/:eid # Get execution
GET    /api/tenant/integrations/:id/executions/:eid/logs  # Get logs
POST   /api/tenant/integrations/:id/executions/:eid/retry # Retry failed
POST   /api/tenant/integrations/:id/executions/:eid/cancel # Cancel running
```

### Conflicts (Bidirectional)

```
GET    /api/tenant/integrations/:id/conflicts       # List conflicts
GET    /api/tenant/integrations/:id/conflicts/:cid  # Get conflict
POST   /api/tenant/integrations/:id/conflicts/:cid/resolve # Resolve conflict
```

---

## UI Components

### Integration List Page

```
/integrations
├── Available Integrations (cards)
│   ├── CRM
│   │   ├── Salesforce [Connect]
│   │   ├── HubSpot [Connect]
│   │   └── Pipedrive [Connect]
│   ├── Communication
│   │   ├── Gmail [Connect]
│   │   └── Outlook [Connect]
│   ├── Data Sources
│   │   └── Google News [Super Admin Only]
│   └── Storage
│       └── Google Drive [Connect]
└── Connected Integrations (list)
    ├── Salesforce ✓ Connected
    │   ├── 3 sync tasks active
    │   ├── Last sync: 5 min ago
    │   └── [Configure] [Disconnect]
    └── HubSpot ✓ Connected
        └── ...
```

### Integration Configuration Page

```
/integrations/:id/configure
├── Connection Status
│   ├── Status: Connected ✓
│   ├── Account: john@company.com
│   └── [Test Connection] [Reconnect] [Disconnect]
│
├── Conversion Schemas
│   ├── [+ Add Schema]
│   └── Schema List
│       ├── Contacts → c_contact [Edit] [Delete]
│       ├── Opportunities → c_opportunity [Edit] [Delete]
│       └── Companies → c_company [Edit] [Delete]
│
├── Sync Tasks
│   ├── [+ Add Task]
│   └── Task List
│       ├── Contacts Daily ✓ Active
│       │   ├── Schedule: Daily at 2 AM
│       │   ├── Last run: Success, 150 records
│       │   └── [Run Now] [Pause] [Edit] [Delete]
│       └── Opportunities Hourly ✓ Active
│           └── ...
│
└── Sync History
    └── [View All Executions]
```

### Schema Editor

```
/integrations/:id/schemas/:sid/edit
├── Source Configuration
│   ├── Entity: [Dropdown: Contact, Opportunity, ...]
│   └── Filters: [+ Add Filter]
│
├── Target Configuration
│   ├── ShardType: [Dropdown: c_contact, c_company, ...]
│   ├── ☑ Create if missing
│   ├── ☑ Update if exists
│   └── ☐ Delete if removed
│
├── Field Mappings (Visual Builder)
│   ├── Source Fields    →    Target Fields
│   ├── FirstName + LastName → name (composite)
│   ├── Email            →    email (direct)
│   ├── Phone            →    phone (transform: remove spaces)
│   ├── Type             →    contactType (conditional)
│   └── [+ Add Mapping]
│
├── Deduplication
│   ├── Strategy: External ID
│   └── External ID Field: Id
│
└── [Test with Sample Data] [Save]
```

### Schedule Builder UI

```
Schedule Type: [Dropdown]
├── Manual (trigger manually)
├── Interval
│   ├── Every [5] [minutes/hours/days/weeks]
│   └── Preview: Runs every 5 hours
├── Schedule (Cron with UI)
│   ├── Frequency: [Daily/Weekly/Monthly]
│   ├── Time: [2:00 AM]
│   ├── Days: [Mon] [Tue] [Wed] [Thu] [Fri]
│   ├── Timezone: [America/New_York]
│   └── Preview: Runs Mon-Fri at 2:00 AM ET
└── Real-time (webhook-based)
    └── Webhook URL: https://api.castiel.app/webhooks/...
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Integration definition storage
- [ ] Tenant integration management
- [ ] Credential storage (encrypted)
- [ ] OAuth flow implementation

### Phase 2: Sync Engine
- [ ] Conversion schema engine
- [ ] Field mapping transformations
- [ ] Sync task scheduler
- [ ] Execution tracking

### Phase 3: First Integrations
- [ ] Salesforce integration
- [ ] HubSpot integration
- [ ] Google News integration

### Phase 4: Advanced Features
- [ ] Bidirectional sync
- [ ] Conflict resolution
- [ ] Real-time webhooks
- [ ] Bulk operations

### Phase 5: UI
- [ ] Integration list page
- [ ] Configuration pages
- [ ] Schema visual builder
- [ ] Schedule builder
- [ ] Sync monitoring dashboard

