# Shard Base Schema

## Overview

This document defines the **base schema** that ALL Shards in Castiel must follow. Every Shard, regardless of its ShardType, inherits this foundational structure.

---

## Table of Contents

1. [System Fields](#system-fields)
2. [Structured Data Requirements](#structured-data-requirements)
3. [Unstructured Data](#unstructured-data)
4. [Relationships](#relationships)
5. [Metadata](#metadata)
6. [Access Control](#access-control)
7. [AI Data](#ai-data)
8. [Versioning & Lifecycle](#versioning--lifecycle)
9. [Soft Delete](#soft-delete)
10. [Timestamps](#timestamps)
11. [Type-Specific Handling](#type-specific-handling)
12. [Complete Schema Definition](#complete-schema-definition)

---

## System Fields

These fields are **managed by Castiel** and cannot be directly set by users (except during creation where noted).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string (UUID)` | Auto | Unique identifier, auto-generated |
| `tenantId` | `string (UUID)` | Yes | Tenant this Shard belongs to (partition key) |
| `userId` | `string (UUID)` | Yes | Creator/owner of the Shard |
| `shardTypeId` | `string (UUID)` | Yes | Reference to the ShardType this Shard conforms to |
| `parentShardId` | `string (UUID)` | No | Parent Shard for hierarchical organization |

### Field Details

#### `id`
- Auto-generated UUID v4
- Immutable after creation
- Used as document ID in Cosmos DB

#### `tenantId`
- Set from authentication context
- Used as partition key for data isolation
- Cannot be changed after creation

#### `userId`
- Set from authentication context at creation
- Represents the original creator
- Can transfer ownership via ACL changes

#### `shardTypeId`
- Must reference an existing, active ShardType
- Cannot be changed after creation (create new Shard instead)
- Determines validation schema for `structuredData`

#### `parentShardId`
- Optional hierarchical parent
- Used for permission inheritance
- Parent must be in same tenant

---

## Structured Data Requirements

The `structuredData` object contains the **business data** defined by the ShardType schema.

### Universal Required Field

> **All Shards MUST have a `name` field in structuredData.**

```typescript
structuredData: {
  name: string;        // REQUIRED - Human-readable identifier
  // ... additional fields per ShardType schema
}
```

### The `name` Field

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | **Yes** (for ALL Shards) |
| Min Length | 1 |
| Max Length | 500 |
| Purpose | Human-readable identifier for display, search, and AI context |

**Why `name` is required:**

1. **Display**: Every Shard needs a human-readable title
2. **Search**: Enables text search across all Shards
3. **AI Context**: Provides essential context for AI processing
4. **Consistency**: Uniform interface for all Shard types

### Schema Definition

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Human-readable name/title for this Shard"
    }
  },
  "required": ["name"]
}
```

### Validation

When creating or updating a Shard:
1. Validate `structuredData.name` exists and is non-empty
2. Validate against ShardType's additional schema requirements
3. Validate field types and constraints

---

## Unstructured Data

The `unstructuredData` object stores **large, non-schema content** that is NOT cached.

```typescript
interface UnstructuredData {
  text?: string;              // Large text content (articles, descriptions)
  files?: FileReference[];    // Attached files
  rawData?: any;              // Any additional raw data
}

interface FileReference {
  id: string;                 // File ID in storage
  name: string;               // Original filename
  url: string;                // Access URL
  mimeType: string;           // MIME type (e.g., "application/pdf")
  size: number;               // Size in bytes
}
```

### Characteristics

- **Not cached**: Too large for Redis cache
- **Not indexed**: Excluded from Cosmos DB indexing
- **AI processed**: Text is extracted for embeddings and enrichment
- **Optional**: Not all Shards need unstructured data

---

## Relationships

Shards connect to other entities through two relationship types.

### Internal Relationships

Links to other Shards within Castiel.

```typescript
interface InternalRelationship {
  id: string;                          // Unique relationship ID
  targetShardId: string;               // The linked Shard's ID
  targetShardTypeId: string;           // The linked Shard's type
  relationshipType: string;            // Type of relationship (e.g., "belongs_to", "related_to")
  label?: string;                      // Human-readable label
  metadata?: Record<string, any>;      // Additional relationship data
  createdAt: Date;
  createdBy: string;
}
```

**Field: `internal_relationships`**
```typescript
internal_relationships: InternalRelationship[];
```

### External Relationships

Links to records in external systems.

```typescript
interface ExternalRelationship {
  id: string;                          // Unique relationship ID
  system: string;                      // External system identifier
  systemType: ExternalSystemType;      // Type of system
  externalId: string;                  // ID in the external system
  externalUrl?: string;                // Direct link to external record
  label?: string;                      // Human-readable label
  syncStatus?: SyncStatus;             // Synchronization status
  lastSyncedAt?: Date;
  metadata?: Record<string, any>;      // Additional data from external system
  createdAt: Date;
  createdBy: string;
}

enum ExternalSystemType {
  CRM = 'crm',                         // Salesforce, HubSpot, etc.
  ERP = 'erp',                         // SAP, Oracle, etc.
  MESSAGING = 'messaging',             // Slack, Teams, etc.
  EMAIL = 'email',                     // Gmail, Outlook, etc.
  CALENDAR = 'calendar',               // Google Calendar, Outlook Calendar
  STORAGE = 'storage',                 // Google Drive, Dropbox, etc.
  PROJECT_MANAGEMENT = 'project_management', // Jira, Asana, etc.
  CUSTOM = 'custom'                    // Custom integrations
}

enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  FAILED = 'failed',
  STALE = 'stale'
}
```

**Field: `external_relationships`**
```typescript
external_relationships: ExternalRelationship[];
```

→ See [Relationships](./relationships.md) for detailed documentation.  
→ See [Integrations System](../integrations/README.md) for how external relationships are synchronized with CRM, communication, and storage systems.

---

## Metadata

The `metadata` object contains **organizational and enrichment data**.

```typescript
interface ShardMetadata {
  tags?: string[];                     // User-defined tags
  category?: string;                   // Category classification
  priority?: number;                   // Priority (1-5, 1=highest)
  customFields?: Record<string, any>;  // Tenant-specific custom fields
  enrichment?: EnrichmentResults;      // AI enrichment results
}
```

### Tags

- Array of strings
- User-defined organizational labels
- Searchable and filterable

### Category

- Single category assignment
- Typically defined by ShardType (e.g., "lead", "customer" for contacts)

### Priority

- Numeric priority level
- 1 = Highest, 5 = Lowest
- Optional, used for sorting/filtering

### Enrichment Results

AI-generated data stored after enrichment:

```typescript
interface EnrichmentResults {
  enrichedAt: Date;
  enrichmentConfigId: string;
  processingTimeMs: number;
  entities?: ExtractedEntity[];        // Named entities
  classification?: ClassificationResult;
  summary?: SummarizationResult;
  sentiment?: SentimentAnalysisResult;
  keyPhrases?: KeyPhrasesResult;
  cost?: {
    promptTokens: number;
    completionTokens: number;
    totalCost: number;
  };
}
```

---

## Access Control

Every Shard has an **ACL (Access Control List)** defining who can access it.

```typescript
interface ACLEntry {
  userId?: string;                     // User-specific permission
  roleId?: string;                     // Role-based permission
  permissions: PermissionLevel[];      // Granted permissions
  grantedBy: string;                   // Who granted this access
  grantedAt: Date;                     // When access was granted
}

enum PermissionLevel {
  READ = 'read',                       // Can view the Shard
  WRITE = 'write',                     // Can modify the Shard
  DELETE = 'delete',                   // Can delete the Shard
  ADMIN = 'admin'                      // Can manage ACL
}
```

**Field: `acl`**
```typescript
acl: ACLEntry[];
```

### Default ACL

When a Shard is created, the creator receives full permissions:

```typescript
acl: [{
  userId: creatorUserId,
  permissions: ['read', 'write', 'delete', 'admin'],
  grantedBy: creatorUserId,
  grantedAt: new Date()
}]
```

### Permission Inheritance

If `parentShardId` is set, permissions can be inherited from the parent Shard.

---

## AI Data

### Vector Embeddings

Semantic search vectors generated from Shard content.

```typescript
interface VectorEmbedding {
  id: string;                          // Embedding ID
  field: string;                       // Source field (e.g., "name", "text")
  model: string;                       // Model used (e.g., "text-embedding-ada-002")
  dimensions: number;                  // Vector dimensions (e.g., 1536)
  embedding: number[];                 // The actual vector
  createdAt: Date;
}
```

**Field: `vectors`**
```typescript
vectors?: VectorEmbedding[];
```

→ See the **[Embedding Processor](../embedding-processor/README.md)** for detailed implementation of vector generation and storage.

### Enrichment Configuration

AI enrichment settings.

```typescript
interface Enrichment {
  config: EnrichmentConfig;
  lastEnrichedAt?: Date;
  enrichmentData?: Record<string, any>;
  error?: string;
}

interface EnrichmentConfig {
  enabled: boolean;
  providers?: string[];                // e.g., ['azure-openai']
  autoEnrich?: boolean;                // Enrich on create/update
  enrichmentTypes?: string[];          // e.g., ['summary', 'keywords']
}
```

**Field: `enrichment`**
```typescript
enrichment?: Enrichment;
```

---

## Versioning & Lifecycle

Shards maintain version history for auditing and recovery.

| Field | Type | Description |
|-------|------|-------------|
| `revisionId` | `string (UUID)` | Current revision identifier |
| `revisionNumber` | `number` | Incrementing version number |
| `status` | `ShardStatus` | Current lifecycle status |

```typescript
enum ShardStatus {
  ACTIVE = 'active',                   // Normal, accessible state
  ARCHIVED = 'archived',               // Hidden but recoverable
  DELETED = 'deleted',                 // Soft-deleted (TTL applies)
  DRAFT = 'draft'                      // Work in progress
}
```

### Status Transitions

```
                    ┌─────────┐
         ┌─────────►│ DRAFT   │
         │          └────┬────┘
         │               │ publish
         │               ▼
         │          ┌─────────┐
    restore         │ ACTIVE  │◄───────────┐
         │          └────┬────┘            │
         │               │                 │ restore
         │      ┌────────┼────────┐        │
         │      │ archive│ delete │        │
         │      ▼        ▼        ▼        │
         │ ┌─────────┐      ┌─────────┐    │
         └─┤ARCHIVED │      │ DELETED ├────┘
           └─────────┘      └─────────┘
                                 │
                                 │ TTL (90 days)
                                 ▼
                            [Hard Delete]
```

---

## Soft Delete

Castiel uses **soft delete** for all Shards. When a Shard is deleted:

1. `status` is set to `DELETED`
2. `deletedAt` timestamp is recorded
3. A `ttl` (Time-To-Live) is set for automatic hard deletion
4. The Shard becomes invisible in normal queries

### Soft Delete Behavior

| Aspect | Behavior |
|--------|----------|
| **Visibility** | Excluded from standard list queries |
| **Direct Access** | Can still be fetched by ID (for recovery) |
| **Relationships** | Internal relationships remain (for audit) |
| **External Sync** | External systems notified of deletion |
| **TTL** | Auto hard-delete after 90 days |
| **Restore** | Can restore to `ACTIVE` before TTL expires |
| **Revisions** | Deletion creates a revision for audit |

### Implementation

```typescript
// Soft delete operation
async function softDeleteShard(id: string, tenantId: string): Promise<void> {
  const shard = await getShard(id, tenantId);
  
  await updateShard(id, tenantId, {
    status: ShardStatus.DELETED,
    deletedAt: new Date(),
    ttl: 7776000  // 90 days in seconds
  });
  
  // Create deletion revision
  await createRevision({
    shardId: id,
    changeType: ChangeType.DELETED,
    previousData: shard,
    currentData: { status: 'deleted' }
  });
  
  // Notify external systems
  await notifyExternalSystems(shard.external_relationships, 'deleted');
}
```

### Restore from Soft Delete

```typescript
// Restore operation
async function restoreShard(id: string, tenantId: string): Promise<Shard> {
  const shard = await getShard(id, tenantId);
  
  if (shard.status !== ShardStatus.DELETED) {
    throw new Error('Shard is not deleted');
  }
  
  return await updateShard(id, tenantId, {
    status: ShardStatus.ACTIVE,
    deletedAt: null,
    ttl: -1  // Remove TTL
  });
}
```

### Query Behavior

```typescript
// Default queries exclude deleted shards
const activeShards = await listShards({
  filter: { tenantId, status: { $ne: 'deleted' } }
});

// Include deleted shards (for admin/audit)
const allShards = await listShards({
  filter: { tenantId },
  includeDeleted: true
});
```

---

## Timestamps

Standard timestamp fields.

| Field | Type | Description |
|-------|------|-------------|
| `createdAt` | `Date` | When the Shard was created |
| `updatedAt` | `Date` | When the Shard was last modified |
| `deletedAt` | `Date?` | When the Shard was soft-deleted |

---

## Type-Specific Handling

Different ShardTypes may have **type-specific UI components** and **dedicated API endpoints**. This allows specialized handling while maintaining the common base schema.

### Type-Specific API Endpoints

Certain ShardTypes have dedicated endpoints beyond the standard CRUD:

| ShardType | Endpoint | Purpose |
|-----------|----------|---------|
| `c_document` | `POST /api/v1/documents/upload` | File upload with processing |
| `c_document` | `GET /api/v1/documents/:id/download` | File download |
| `c_document` | `POST /api/v1/documents/:id/extract` | Text extraction |
| `c_assistant` | `POST /api/v1/assistants/:id/test` | Test assistant prompt |
| `c_note` | `POST /api/v1/notes/from-transcript` | Create from meeting transcript |

### API Route Pattern

```typescript
// Standard CRUD (all shard types)
GET    /api/v1/shards
POST   /api/v1/shards
GET    /api/v1/shards/:id
PUT    /api/v1/shards/:id
PATCH  /api/v1/shards/:id
DELETE /api/v1/shards/:id

// Type-specific endpoints (example: c_document)
POST   /api/v1/documents/upload              // Upload file
GET    /api/v1/documents/:id/download        // Download file
POST   /api/v1/documents/:id/extract         // Extract text
POST   /api/v1/documents/:id/thumbnail       // Generate thumbnail
GET    /api/v1/documents/:id/versions        // List versions

// Type-specific endpoints (example: c_assistant)
POST   /api/v1/assistants/:id/test           // Test prompt
POST   /api/v1/assistants/:id/clone          // Clone assistant
GET    /api/v1/assistants/presets            // List preset assistants
```

### Type-Specific UI Components

Each ShardType can define custom UI behavior:

```typescript
interface ShardTypeUIConfig {
  // List view configuration
  listView: {
    columns: string[];              // Which fields to show
    defaultSort: string;
    defaultSortOrder: 'asc' | 'desc';
    cardView?: boolean;             // Support card layout
  };
  
  // Detail view configuration
  detailView: {
    layout: 'single' | 'tabs' | 'sidebar';
    sections: UISection[];
    actions: UIAction[];            // Type-specific actions
  };
  
  // Form configuration
  form: {
    layout: 'single' | 'wizard' | 'accordion';
    fieldGroups: FieldGroup[];
  };
  
  // Custom components
  customComponents?: {
    listItem?: string;              // Custom list item component
    detailHeader?: string;          // Custom detail header
    formWidget?: Record<string, string>;  // Field-specific widgets
  };
}
```

### Example: c_document Type-Specific Handling

```typescript
// c_document has special handling
const documentConfig: ShardTypeUIConfig = {
  listView: {
    columns: ['name', 'documentType', 'status', 'fileSize', 'updatedAt'],
    defaultSort: 'updatedAt',
    defaultSortOrder: 'desc',
    cardView: true  // Documents support thumbnail cards
  },
  
  detailView: {
    layout: 'sidebar',
    sections: [
      { id: 'preview', title: 'Preview', component: 'DocumentPreview' },
      { id: 'metadata', title: 'Details', component: 'DocumentMetadata' },
      { id: 'versions', title: 'Versions', component: 'DocumentVersions' },
      { id: 'relationships', title: 'Related', component: 'RelationshipList' }
    ],
    actions: [
      { id: 'download', label: 'Download', icon: 'Download', endpoint: '/download' },
      { id: 'share', label: 'Share', icon: 'Share', modal: 'ShareModal' },
      { id: 'version', label: 'New Version', icon: 'Upload', endpoint: '/upload' }
    ]
  },
  
  form: {
    layout: 'wizard',
    fieldGroups: [
      { id: 'upload', title: 'Upload File', fields: ['file'] },
      { id: 'metadata', title: 'Document Info', fields: ['name', 'description', 'documentType'] },
      { id: 'settings', title: 'Settings', fields: ['accessLevel', 'expiryDate'] }
    ]
  },
  
  customComponents: {
    listItem: 'DocumentListItem',
    detailHeader: 'DocumentHeader',
    formWidget: {
      'file': 'FileUploadWidget',
      'content': 'RichTextEditor'
    }
  }
};
```

### Registering Type-Specific Handlers

```typescript
// Backend: Register type-specific API handlers
shardTypeRegistry.register('c_document', {
  beforeCreate: async (input) => {
    // Process file upload
    if (input.file) {
      const fileUrl = await uploadFile(input.file);
      const text = await extractText(input.file);
      input.structuredData.fileUrl = fileUrl;
      input.unstructuredData = { text };
    }
    return input;
  },
  
  afterCreate: async (shard) => {
    // Generate thumbnail
    await generateThumbnail(shard);
    // Start enrichment
    await enqueueEnrichment(shard.id);
  },
  
  customEndpoints: [
    { method: 'POST', path: '/upload', handler: handleUpload },
    { method: 'GET', path: '/:id/download', handler: handleDownload },
    { method: 'POST', path: '/:id/extract', handler: handleExtract }
  ]
});
```

---

## Complete Schema Definition

### TypeScript Interface

```typescript
interface Shard {
  // === SYSTEM FIELDS ===
  id: string;
  tenantId: string;
  userId: string;
  shardTypeId: string;
  parentShardId?: string;

  // === DATA FIELDS ===
  structuredData: {
    name: string;                      // REQUIRED
    [key: string]: any;                // ShardType-specific fields
  };
  unstructuredData?: UnstructuredData;

  // === RELATIONSHIPS ===
  internal_relationships: InternalRelationship[];
  external_relationships: ExternalRelationship[];

  // === METADATA ===
  metadata?: ShardMetadata;

  // === ACCESS CONTROL ===
  acl: ACLEntry[];

  // === AI DATA ===
  enrichment?: Enrichment;
  lastEnrichedAt?: Date;
  vectors?: VectorEmbedding[];

  // === VERSIONING ===
  revisionId: string;
  revisionNumber: number;
  status: ShardStatus;

  // === TIMESTAMPS ===
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### JSON Schema (Base)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/shard-base.json",
  "title": "Shard Base Schema",
  "description": "Base schema that all Shards must conform to",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant identifier (partition key)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "Creator/owner identifier"
    },
    "shardTypeId": {
      "type": "string",
      "format": "uuid",
      "description": "ShardType reference"
    },
    "parentShardId": {
      "type": "string",
      "format": "uuid",
      "description": "Parent Shard for hierarchy"
    },
    "structuredData": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 500,
          "description": "Required human-readable name"
        }
      },
      "required": ["name"],
      "additionalProperties": true
    },
    "unstructuredData": {
      "type": "object",
      "properties": {
        "text": { "type": "string" },
        "files": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "url": { "type": "string", "format": "uri" },
              "mimeType": { "type": "string" },
              "size": { "type": "integer", "minimum": 0 }
            },
            "required": ["id", "name", "url", "mimeType", "size"]
          }
        },
        "rawData": {}
      }
    },
    "internal_relationships": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/InternalRelationship"
      },
      "default": []
    },
    "external_relationships": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/ExternalRelationship"
      },
      "default": []
    },
    "metadata": {
      "type": "object",
      "properties": {
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "category": { "type": "string" },
        "priority": {
          "type": "integer",
          "minimum": 1,
          "maximum": 5
        },
        "customFields": { "type": "object" }
      }
    },
    "acl": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/ACLEntry"
      },
      "minItems": 1
    },
    "status": {
      "type": "string",
      "enum": ["active", "archived", "deleted", "draft"],
      "default": "active"
    },
    "revisionId": { "type": "string", "format": "uuid" },
    "revisionNumber": { "type": "integer", "minimum": 1 },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "deletedAt": { "type": "string", "format": "date-time" }
  },
  "required": [
    "id",
    "tenantId",
    "userId",
    "shardTypeId",
    "structuredData",
    "acl",
    "status",
    "revisionId",
    "revisionNumber",
    "createdAt",
    "updatedAt"
  ],
  "definitions": {
    "InternalRelationship": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "targetShardId": { "type": "string", "format": "uuid" },
        "targetShardTypeId": { "type": "string", "format": "uuid" },
        "relationshipType": { "type": "string" },
        "label": { "type": "string" },
        "metadata": { "type": "object" },
        "createdAt": { "type": "string", "format": "date-time" },
        "createdBy": { "type": "string", "format": "uuid" }
      },
      "required": ["id", "targetShardId", "targetShardTypeId", "relationshipType", "createdAt", "createdBy"]
    },
    "ExternalRelationship": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "system": { "type": "string" },
        "systemType": {
          "type": "string",
          "enum": ["crm", "erp", "messaging", "email", "calendar", "storage", "project_management", "accounting", "support", "marketing", "custom"]
        },
        "externalId": { "type": "string" },
        "externalUrl": { "type": "string", "format": "uri" },
        "label": { "type": "string" },
        "syncStatus": {
          "type": "string",
          "enum": ["synced", "pending", "syncing", "failed", "stale", "disconnected"],
          "default": "pending"
        },
        "syncDirection": {
          "type": "string",
          "enum": ["inbound", "outbound", "bidirectional"],
          "default": "bidirectional"
        },
        "lastSyncAttemptAt": { "type": "string", "format": "date-time" },
        "nextSyncAt": { "type": "string", "format": "date-time" },
        "syncError": {
          "type": "object",
          "properties": {
            "code": { "type": "string" },
            "message": { "type": "string" },
            "occurredAt": { "type": "string", "format": "date-time" },
            "retryable": { "type": "boolean" },
            "retryCount": { "type": "integer" }
          }
        },
        "lastSyncedAt": { "type": "string", "format": "date-time" },
        "metadata": { "type": "object" },
        "createdAt": { "type": "string", "format": "date-time" },
        "createdBy": { "type": "string", "format": "uuid" },
        "updatedAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "system", "systemType", "externalId", "syncStatus", "createdAt", "createdBy"]
    },
    "ACLEntry": {
      "type": "object",
      "properties": {
        "userId": { "type": "string", "format": "uuid" },
        "roleId": { "type": "string" },
        "permissions": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["read", "write", "delete", "admin"]
          },
          "minItems": 1
        },
        "grantedBy": { "type": "string", "format": "uuid" },
        "grantedAt": { "type": "string", "format": "date-time" }
      },
      "required": ["permissions", "grantedBy", "grantedAt"]
    }
  }
}
```

---

## Validation Rules

### On Create

1. ✅ `tenantId` from auth context
2. ✅ `userId` from auth context
3. ✅ `shardTypeId` references valid, active ShardType
4. ✅ `structuredData.name` is present and non-empty
5. ✅ `structuredData` validates against ShardType schema
6. ✅ Default `acl` with creator permissions
7. ✅ `status` defaults to `active`
8. ✅ `revisionNumber` starts at 1

### On Update

1. ✅ Cannot change `id`, `tenantId`, `shardTypeId`
2. ✅ `structuredData.name` remains non-empty
3. ✅ `structuredData` validates against ShardType schema
4. ✅ `updatedAt` is updated
5. ✅ `revisionNumber` increments
6. ✅ New revision is created

---

## Next Steps

→ Continue to [Relationships](./relationships.md) to understand how Shards connect.

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team

