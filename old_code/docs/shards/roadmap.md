# Shard System Roadmap & Improvements

## Overview

This document outlines planned improvements and enhancements to the Shard system. Items are prioritized and should be implemented in order to maximize value while maintaining system stability.

---

## Table of Contents

1. [Priority Matrix](#priority-matrix)
2. [High Priority](#high-priority)
3. [Medium Priority](#medium-priority)
4. [Lower Priority](#lower-priority)
5. [Quick Wins](#quick-wins)
6. [Additional Core Types](#additional-core-types)
7. [Documentation Gaps](#documentation-gaps)

---

## Priority Matrix

| Priority | Items | Timeline | Status |
|----------|-------|----------|--------|
| 🔴 **Critical** | **Rich Field Types System** | Phase 0 | ✅ Complete |
| 🔴 High | Event system, Schema evolution, Bulk operations | Phase 1 | ✅ Complete |
| 🟡 Medium | Graph queries, **Context templates**, Field security | Phase 2 | ✅ Complete |
| 🟢 Lower | New core types, Computed fields, Advanced search | Phase 3 | ✅ Complete |
| 🔵 Integrations | Integration definitions, OAuth, Sync tasks, Adapters | Phase 4 | ✅ Complete |
| 🟣 **AI Insights Core** | AI models, Conversations, Config, Intent, Grounding | Phase 5 | ✅ Complete |
| 🟠 Performance | Semantic caching, Model routing, Quality monitoring | Phase 6 | ✅ Complete |
| 🩵 Automation | Proactive agents, Feedback learning, Workflows | Phase 7 | ✅ Complete |
| 🩷 UX | Explainability, Templates library, Memory, Collaboration | Phase 8 | ✅ Complete |
| ⚡ Quick Wins | Schema version, lastActivityAt, source field | Immediate | ✅ Complete |

---

## High Priority

### 1. Event System / Webhooks

**Status**: 📋 Planned  
**Effort**: Medium  
**Impact**: High

Shards should emit events for integrations and real-time updates.

#### Event Types

```typescript
enum ShardEvent {
  CREATED = 'shard.created',
  UPDATED = 'shard.updated',
  DELETED = 'shard.deleted',
  RESTORED = 'shard.restored',
  RELATIONSHIP_ADDED = 'shard.relationship.added',
  RELATIONSHIP_REMOVED = 'shard.relationship.removed',
  ENRICHED = 'shard.enriched',
  STATUS_CHANGED = 'shard.status.changed',
  ACL_CHANGED = 'shard.acl.changed'
}
```

#### Event Payload

```typescript
interface ShardEventPayload {
  // Event metadata
  eventId: string;
  eventType: ShardEvent;
  timestamp: Date;
  
  // Tenant context
  tenantId: string;
  
  // Shard identity
  shardId: string;
  shardTypeId: string;
  shardTypeName: string;
  
  // Change details
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  // Trigger info
  triggeredBy: string;           // User ID
  triggerSource: 'ui' | 'api' | 'import' | 'integration' | 'system';
  
  // Related data (optional, for convenience)
  shardSnapshot?: Partial<Shard>;
}
```

#### Webhook Configuration

```typescript
interface WebhookConfig {
  id: string;
  tenantId: string;
  
  // Target
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  
  // Events to subscribe
  events: ShardEvent[];
  
  // Filters (optional)
  filters?: {
    shardTypeIds?: string[];     // Only specific types
    status?: string[];           // Only specific statuses
  };
  
  // Retry config
  retryCount: number;
  retryDelayMs: number;
  
  // Security
  secret: string;                // For signature verification
  
  // Status
  isActive: boolean;
  lastTriggeredAt?: Date;
  failureCount: number;
}
```

#### Use Cases

- External system synchronization
- Real-time UI updates (via WebSocket/SSE)
- Audit automation
- AI enrichment triggers
- Notification systems

---

### 2. Schema Evolution Strategy

**Status**: 📋 Planned  
**Effort**: High  
**Impact**: Critical

Plan for when ShardType schemas change over time.

#### ShardType Version Fields

```typescript
interface ShardType {
  // ... existing fields
  
  // Version tracking
  schemaVersion: number;                    // Current version (starts at 1)
  
  // Version history
  versionHistory?: SchemaVersion[];
  
  // Migration config
  migrationStrategy: MigrationStrategy;
}

interface SchemaVersion {
  version: number;
  schema: JSONSchema;
  createdAt: Date;
  createdBy: string;
  changeDescription: string;
  breakingChange: boolean;
}

enum MigrationStrategy {
  LAZY = 'lazy',           // Transform on read
  EAGER = 'eager',         // Batch migrate all
  MANUAL = 'manual',       // Require explicit migration
  VERSIONED = 'versioned'  // Keep multiple versions
}
```

#### Shard Version Tracking

```typescript
interface Shard {
  // ... existing fields
  
  // Schema version this shard conforms to
  schemaVersion: number;
  
  // Migration status
  migrationStatus?: 'current' | 'pending' | 'failed';
  lastMigratedAt?: Date;
}
```

#### Migration Strategies

##### Lazy Migration (Recommended for most cases)

```typescript
async function getShardWithMigration(
  shardId: string,
  tenantId: string
): Promise<Shard> {
  const shard = await getRawShard(shardId, tenantId);
  const shardType = await getShardType(shard.shardTypeId);
  
  // Check if migration needed
  if (shard.schemaVersion < shardType.schemaVersion) {
    // Apply migrations in order
    const migratedData = await applyMigrations(
      shard.structuredData,
      shard.schemaVersion,
      shardType.schemaVersion,
      shardType.versionHistory
    );
    
    // Update shard (async, don't block read)
    queueMigrationUpdate(shard.id, migratedData, shardType.schemaVersion);
    
    // Return migrated data
    return { ...shard, structuredData: migratedData };
  }
  
  return shard;
}
```

##### Eager Migration (For breaking changes)

```typescript
interface MigrationJob {
  id: string;
  tenantId: string;
  shardTypeId: string;
  fromVersion: number;
  toVersion: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    failed: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  errors?: MigrationError[];
}

async function runEagerMigration(job: MigrationJob): Promise<void> {
  const batchSize = 100;
  let continuationToken: string | undefined;
  
  do {
    // Fetch batch
    const { shards, nextToken } = await listShards({
      filter: {
        tenantId: job.tenantId,
        shardTypeId: job.shardTypeId,
        schemaVersion: { $lt: job.toVersion }
      },
      limit: batchSize,
      continuationToken
    });
    
    // Migrate batch
    for (const shard of shards) {
      try {
        await migrateShard(shard, job.toVersion);
        job.progress.processed++;
      } catch (error) {
        job.progress.failed++;
        job.errors.push({ shardId: shard.id, error: error.message });
      }
    }
    
    continuationToken = nextToken;
    await updateMigrationJob(job);
    
  } while (continuationToken);
}
```

#### Migration Functions

```typescript
// Migration function registry
interface MigrationFunction {
  fromVersion: number;
  toVersion: number;
  migrate: (data: Record<string, any>) => Record<string, any>;
  rollback?: (data: Record<string, any>) => Record<string, any>;
}

// Example migrations
const contactMigrations: MigrationFunction[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: (data) => ({
      ...data,
      // Split 'name' into 'firstName' and 'lastName'
      firstName: data.name?.split(' ')[0] || '',
      lastName: data.name?.split(' ').slice(1).join(' ') || '',
      // Keep original for reference
      _migratedFrom: { name: data.name }
    }),
    rollback: (data) => ({
      ...data,
      name: `${data.firstName} ${data.lastName}`.trim()
    })
  },
  {
    fromVersion: 2,
    toVersion: 3,
    migrate: (data) => ({
      ...data,
      // Add new required field with default
      status: data.status || 'active',
      // Rename field
      primaryEmail: data.email,
      email: undefined
    })
  }
];
```

---

### 3. Bulk Operations API

**Status**: 📋 Planned  
**Effort**: Medium  
**Impact**: High

Support for importing and batch processing shards.

#### Bulk Create

```http
POST /api/v1/shards/bulk
Content-Type: application/json

{
  "shards": [
    {
      "shardTypeId": "c_contact-uuid",
      "structuredData": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    {
      "shardTypeId": "c_contact-uuid",
      "structuredData": {
        "name": "Jane Smith",
        "email": "jane@example.com"
      }
    }
  ],
  "options": {
    "skipValidation": false,
    "skipEnrichment": true,
    "skipEvents": false,
    "transactional": false,
    "onError": "continue"  // or "abort"
  }
}
```

#### Response

```json
{
  "success": true,
  "summary": {
    "total": 100,
    "created": 98,
    "failed": 2
  },
  "results": [
    { "index": 0, "status": "created", "shardId": "uuid-1" },
    { "index": 1, "status": "created", "shardId": "uuid-2" },
    { "index": 45, "status": "failed", "error": "Validation failed: email format" }
  ]
}
```

#### Bulk Update

```http
PATCH /api/v1/shards/bulk
Content-Type: application/json

{
  "updates": [
    {
      "id": "shard-uuid-1",
      "structuredData": {
        "status": "active"
      }
    },
    {
      "id": "shard-uuid-2",
      "structuredData": {
        "status": "inactive"
      }
    }
  ],
  "options": {
    "skipValidation": false,
    "createRevision": true
  }
}
```

#### Bulk Delete

```http
DELETE /api/v1/shards/bulk
Content-Type: application/json

{
  "shardIds": ["uuid-1", "uuid-2", "uuid-3"],
  "options": {
    "hardDelete": false,
    "skipEvents": false
  }
}
```

#### Bulk Relationships

```http
POST /api/v1/shards/bulk/relationships
Content-Type: application/json

{
  "relationships": [
    {
      "sourceShardId": "project-uuid",
      "targetShardId": "contact-uuid-1",
      "relationshipType": "has_stakeholder",
      "label": "Project Manager"
    },
    {
      "sourceShardId": "project-uuid",
      "targetShardId": "contact-uuid-2",
      "relationshipType": "has_stakeholder",
      "label": "Technical Lead"
    }
  ]
}
```

#### Import from CSV/Excel

```http
POST /api/v1/shards/import
Content-Type: multipart/form-data

file: [CSV/Excel file]
shardTypeId: c_contact-uuid
options: {
  "mapping": {
    "Full Name": "name",
    "Email Address": "email",
    "Company": "_relationship:c_company:name"
  },
  "skipFirstRow": true,
  "onDuplicate": "skip"  // or "update", "error"
}
```

#### Export

```http
GET /api/v1/shards/export?shardTypeId=c_contact-uuid&format=csv

Response: CSV file download
```

---

## Medium Priority

### 4. Relationship Graph Collection

**Status**: 📋 Planned  
**Effort**: Medium  
**Impact**: Medium

Separate collection for efficient graph queries.

#### Edge Collection Schema

```typescript
interface ShardEdge {
  id: string;
  tenantId: string;
  
  // Source shard
  sourceShardId: string;
  sourceShardTypeId: string;
  sourceShardTypeName: string;
  
  // Target shard
  targetShardId: string;
  targetShardTypeId: string;
  targetShardTypeName: string;
  
  // Relationship details
  relationshipType: string;
  label?: string;
  weight?: number;              // For ranking/sorting
  bidirectional: boolean;       // Is reverse relationship implied?
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
}
```

#### Indexes

```typescript
// Cosmos DB indexing policy
const edgeIndexes = {
  compositeIndexes: [
    // Find all edges FROM a shard
    [
      { path: '/tenantId', order: 'ascending' },
      { path: '/sourceShardId', order: 'ascending' }
    ],
    // Find all edges TO a shard
    [
      { path: '/tenantId', order: 'ascending' },
      { path: '/targetShardId', order: 'ascending' }
    ],
    // Find edges by type
    [
      { path: '/tenantId', order: 'ascending' },
      { path: '/relationshipType', order: 'ascending' },
      { path: '/sourceShardTypeId', order: 'ascending' }
    ]
  ]
};
```

#### Query Examples

```typescript
// Get all shards linked TO a shard (reverse lookup)
async function getIncomingRelationships(
  shardId: string,
  tenantId: string
): Promise<ShardEdge[]> {
  return await edgeCollection.query({
    query: `
      SELECT * FROM e 
      WHERE e.tenantId = @tenantId 
      AND e.targetShardId = @shardId
    `,
    parameters: [
      { name: '@tenantId', value: tenantId },
      { name: '@shardId', value: shardId }
    ]
  });
}

// Get relationship graph (N levels)
async function getRelationshipGraph(
  shardId: string,
  tenantId: string,
  depth: number = 2
): Promise<GraphData> {
  const visited = new Set<string>();
  const nodes: ShardNode[] = [];
  const edges: ShardEdge[] = [];
  
  async function traverse(id: string, level: number) {
    if (level > depth || visited.has(id)) return;
    visited.add(id);
    
    // Get shard
    const shard = await getShard(id, tenantId);
    nodes.push({ id, type: shard.shardTypeId, data: shard });
    
    // Get outgoing edges
    const outgoing = await getOutgoingRelationships(id, tenantId);
    for (const edge of outgoing) {
      edges.push(edge);
      await traverse(edge.targetShardId, level + 1);
    }
    
    // Get incoming edges
    const incoming = await getIncomingRelationships(id, tenantId);
    for (const edge of incoming) {
      edges.push(edge);
      await traverse(edge.sourceShardId, level + 1);
    }
  }
  
  await traverse(shardId, 0);
  return { nodes, edges };
}
```

---

### 5. AI Context Templates (`c_contextTemplate`)

**Status**: ✅ Designed (Documentation Complete)  
**Effort**: Low  
**Impact**: High

> **Architectural Decision**: AI Context Templates are implemented as a **core ShardType** (`c_contextTemplate`) rather than a separate system. This follows the "everything is a Shard" philosophy and provides all Shard benefits (versioning, ACL, relationships, audit trail) for free.

#### Implementation as Shards

Templates are stored as `c_contextTemplate` Shards, which provides:

| Benefit | Description |
|---------|-------------|
| **Versioning** | Track template changes, rollback if needed |
| **ACL** | Control who can create/edit templates |
| **Relationships** | Link templates to assistants, projects |
| **Audit Trail** | See who changed what, when |
| **Search** | Find templates by name, description |
| **Standard API** | CRUD via existing Shard API |

#### Key Relationships

```
c_contextTemplate
├── template_for ───────► c_assistant (AI uses this template)
├── default_for ────────► c_project (Default template for project)
└── inherits_from ──────► c_contextTemplate (Template inheritance)
```

#### System Templates (Seed Data)

The following system templates will be seeded as global `c_contextTemplate` Shards:

| Template | Applicable Types | Purpose |
|----------|------------------|---------|
| Project Overview | `c_project` | Comprehensive project context |
| Deal Analysis | `c_opportunity` | Sales opportunity analysis |
| Contact Briefing | `c_contact` | Meeting preparation |
| Document Summary | `c_document` | Document analysis |

#### Template Selection Hierarchy

```
1. User-specified template (explicit)
         │
         ▼ (not found)
2. Assistant's linked template (via relationship)
         │
         ▼ (not found)
3. Shard's default template (via relationship)
         │
         ▼ (not found)
4. System template for ShardType
```

#### Documentation

Full specification available at: [`core-types/c_contextTemplate.md`](./core-types/c_contextTemplate.md)

#### Implementation Tasks

- [ ] Create `c_contextTemplate` ShardType in database
- [ ] Seed system templates (Project Overview, Deal Analysis, Contact Briefing, Document Summary)
- [ ] Implement context assembly service using template Shards
- [ ] Add template selection hierarchy logic
- [ ] Create UI for template management
- [ ] Add template caching with tenant-scoped keys

---

### 6. Field-Level Security

**Status**: 📋 Planned  
**Effort**: High  
**Impact**: High (for regulated industries)

Per-field access control and encryption.

#### Field Security Configuration

```typescript
interface FieldSecurityConfig {
  field: string;
  
  // Access control
  readRoles: string[];            // Roles that can read this field
  writeRoles: string[];           // Roles that can write this field
  
  // Encryption
  encrypted: boolean;             // Encrypt at rest
  encryptionKeyId?: string;       // Specific key to use
  
  // PII classification
  piiCategory?: PIICategory;
  
  // Masking
  maskInLogs: boolean;            // Mask in audit logs
  maskInExport: boolean;          // Mask in exports
  maskInAI: boolean;              // Exclude from AI context
  maskPattern?: string;           // How to mask (e.g., "***" or "xxx@xxx.com")
  
  // Retention
  retentionDays?: number;         // Auto-delete after N days
}

enum PIICategory {
  EMAIL = 'email',
  PHONE = 'phone',
  ADDRESS = 'address',
  SSN = 'ssn',
  FINANCIAL = 'financial',
  HEALTH = 'health',
  BIOMETRIC = 'biometric',
  CUSTOM = 'custom'
}
```

#### ShardType Security Configuration

```typescript
interface ShardType {
  // ... existing fields
  
  // Field-level security
  fieldSecurity?: FieldSecurityConfig[];
  
  // Default security level
  defaultSecurityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
}
```

#### Example Configuration

```typescript
const contactFieldSecurity: FieldSecurityConfig[] = [
  {
    field: 'email',
    readRoles: ['user', 'admin'],
    writeRoles: ['user', 'admin'],
    encrypted: false,
    piiCategory: PIICategory.EMAIL,
    maskInLogs: true,
    maskInExport: false,
    maskInAI: false,
    maskPattern: '***@***.***'
  },
  {
    field: 'phone',
    readRoles: ['user', 'admin'],
    writeRoles: ['user', 'admin'],
    encrypted: false,
    piiCategory: PIICategory.PHONE,
    maskInLogs: true,
    maskInExport: false,
    maskInAI: false,
    maskPattern: '***-***-****'
  },
  {
    field: 'socialSecurityNumber',
    readRoles: ['hr', 'admin'],
    writeRoles: ['hr', 'admin'],
    encrypted: true,
    piiCategory: PIICategory.SSN,
    maskInLogs: true,
    maskInExport: true,
    maskInAI: true,  // NEVER send to AI
    maskPattern: '***-**-****',
    retentionDays: 365 * 7  // 7 years for compliance
  },
  {
    field: 'salary',
    readRoles: ['hr', 'finance', 'admin'],
    writeRoles: ['hr', 'admin'],
    encrypted: true,
    piiCategory: PIICategory.FINANCIAL,
    maskInLogs: true,
    maskInExport: true,
    maskInAI: true
  }
];
```

#### Security Middleware

```typescript
async function applyFieldSecurity(
  shard: Shard,
  shardType: ShardType,
  userRoles: string[],
  operation: 'read' | 'write' | 'export' | 'ai'
): Promise<Shard> {
  if (!shardType.fieldSecurity) return shard;
  
  const securedData = { ...shard.structuredData };
  
  for (const fieldConfig of shardType.fieldSecurity) {
    const value = securedData[fieldConfig.field];
    if (value === undefined) continue;
    
    // Check read access
    if (operation === 'read' || operation === 'export') {
      const canRead = fieldConfig.readRoles.some(r => userRoles.includes(r));
      if (!canRead) {
        securedData[fieldConfig.field] = maskValue(value, fieldConfig.maskPattern);
        continue;
      }
    }
    
    // Check export masking
    if (operation === 'export' && fieldConfig.maskInExport) {
      securedData[fieldConfig.field] = maskValue(value, fieldConfig.maskPattern);
      continue;
    }
    
    // Check AI exclusion
    if (operation === 'ai' && fieldConfig.maskInAI) {
      delete securedData[fieldConfig.field];
      continue;
    }
  }
  
  return { ...shard, structuredData: securedData };
}
```

---

## Lower Priority

### 7. Additional Core Types

**Status**: 📋 Planned  
**Effort**: Medium  
**Impact**: Medium

Consider adding these core types when needed:

#### c_task

```typescript
// Task/action item with assignment and tracking
interface TaskStructuredData {
  name: string;                    // Task title
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assigneeUserId?: string;
  dueDate?: Date;
  completedDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  blockedReason?: string;
  tags?: string[];
}

// Differs from c_note: structured status, assignment, time tracking
```

#### c_event

```typescript
// Calendar event/meeting
interface EventStructuredData {
  name: string;                    // Event title
  description?: string;
  eventType: 'meeting' | 'call' | 'webinar' | 'conference' | 'other';
  startDateTime: Date;
  endDateTime: Date;
  timezone: string;
  location?: string;
  virtualMeetingUrl?: string;
  attendees?: {
    userId?: string;
    contactId?: string;
    name: string;
    email: string;
    status: 'pending' | 'accepted' | 'declined' | 'tentative';
  }[];
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  reminderMinutes?: number;
  isAllDay: boolean;
  isCancelled: boolean;
}

// Differs from c_note: time-bound, attendee tracking, recurrence
```

#### c_email

```typescript
// Email thread/message
interface EmailStructuredData {
  name: string;                    // Subject line
  from: {
    name: string;
    email: string;
    contactId?: string;
  };
  to: {
    name: string;
    email: string;
    contactId?: string;
  }[];
  cc?: { name: string; email: string; contactId?: string; }[];
  bcc?: { name: string; email: string; contactId?: string; }[];
  sentAt: Date;
  receivedAt?: Date;
  threadId?: string;              // For grouping conversations
  inReplyTo?: string;             // Parent email shard ID
  hasAttachments: boolean;
  isRead: boolean;
  isStarred: boolean;
  labels?: string[];
}

// Differs from c_note: email-specific metadata, threading
```

#### c_product

```typescript
// Product/service catalog item
interface ProductStructuredData {
  name: string;
  sku?: string;
  description?: string;
  category: string;
  subcategory?: string;
  unitPrice: number;
  currency: string;
  pricingModel: 'one_time' | 'subscription' | 'usage_based' | 'tiered';
  billingFrequency?: 'monthly' | 'quarterly' | 'annual';
  isActive: boolean;
  features?: string[];
  specifications?: Record<string, any>;
  imageUrl?: string;
}
```

#### c_activity (System-generated)

```typescript
// System-generated activity log entry
interface ActivityStructuredData {
  name: string;                    // Activity description
  activityType: 'shard_created' | 'shard_updated' | 'relationship_added' | 
                'email_sent' | 'email_received' | 'call_logged' | 
                'meeting_scheduled' | 'task_completed' | 'note_added' |
                'stage_changed' | 'status_changed' | 'assignment_changed';
  performedBy: string;             // User ID
  performedAt: Date;
  
  // Related entities
  relatedShardId?: string;
  relatedShardType?: string;
  
  // Change details
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  // Auto-generated, read-only
  isSystemGenerated: true;
}

// Differs from c_note: system-generated, structured change tracking
```

---

### 8. Computed/Derived Fields

**Status**: 📋 Planned  
**Effort**: Medium  
**Impact**: Medium

Auto-calculated fields based on other data.

#### Configuration

```typescript
interface ComputedField {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'date';
  formula: string;                  // Expression or function reference
  dependencies: string[];           // Fields that trigger recalculation
  cacheStrategy: 'always' | 'on_read' | 'never';
  precision?: number;               // For numbers
}

interface ShardType {
  // ... existing fields
  computedFields?: ComputedField[];
}
```

#### Example Computed Fields

```typescript
const opportunityComputedFields: ComputedField[] = [
  {
    name: 'weightedValue',
    type: 'number',
    formula: 'value * (probability / 100)',
    dependencies: ['value', 'probability'],
    cacheStrategy: 'always',
    precision: 2
  },
  {
    name: 'daysUntilClose',
    type: 'number',
    formula: 'daysBetween(today(), expectedCloseDate)',
    dependencies: ['expectedCloseDate'],
    cacheStrategy: 'on_read'
  },
  {
    name: 'isOverdue',
    type: 'boolean',
    formula: 'expectedCloseDate < today() && stage != "closed_won" && stage != "closed_lost"',
    dependencies: ['expectedCloseDate', 'stage'],
    cacheStrategy: 'on_read'
  },
  {
    name: 'ageInDays',
    type: 'number',
    formula: 'daysBetween(createdAt, today())',
    dependencies: [],
    cacheStrategy: 'on_read'
  }
];

const projectComputedFields: ComputedField[] = [
  {
    name: 'completionPercentage',
    type: 'number',
    formula: 'count(milestones, status == "completed") / count(milestones) * 100',
    dependencies: ['milestones'],
    cacheStrategy: 'always',
    precision: 0
  },
  {
    name: 'isOnTrack',
    type: 'boolean',
    formula: 'completionPercentage >= expectedProgress(startDate, targetEndDate)',
    dependencies: ['milestones', 'startDate', 'targetEndDate'],
    cacheStrategy: 'on_read'
  },
  {
    name: 'daysRemaining',
    type: 'number',
    formula: 'max(0, daysBetween(today(), targetEndDate))',
    dependencies: ['targetEndDate'],
    cacheStrategy: 'on_read'
  }
];
```

---

### 9. Advanced Search Indexing

**Status**: 📋 Planned  
**Effort**: High  
**Impact**: Medium

Dedicated search document structure.

#### Search Index Schema

```typescript
interface ShardSearchDocument {
  // Identity
  id: string;                       // Same as shard ID
  tenantId: string;
  shardTypeId: string;
  shardTypeName: string;
  
  // Core searchable content
  name: string;
  description?: string;
  fullText: string;                 // All text combined
  
  // Facets for filtering
  status: string;
  category?: string;
  tags: string[];
  priority?: number;
  
  // Dates for filtering/sorting
  createdAt: Date;
  updatedAt: Date;
  
  // Type-specific facets
  facets: Record<string, string | number | boolean>;
  
  // Related IDs for filtering
  relatedIds: {
    companyIds: string[];
    contactIds: string[];
    projectIds: string[];
    opportunityIds: string[];
  };
  
  // Vector embedding
  embedding?: number[];
  embeddingModel?: string;
  
  // Search boost factors
  boost: {
    recency: number;                // Based on updatedAt
    activity: number;               // Based on view/edit count
    relevance: number;              // Base relevance score
  };
}
```

---

## Quick Wins

Immediate improvements with minimal effort:

### 0. Rich Field Types System ✅ DESIGNED

**Status**: ✅ Specification Complete  
**Effort**: High  
**Impact**: Critical

Comprehensive field type system for `structuredData` with:

- **Text Fields**: `text`, `textarea`, `richtext` (Quill.js WYSIWYG)
- **Selection Fields**: `select`, `multiselect` with searchable options, min/max selection
- **Date Fields**: `date`, `datetime`, `daterange` with tenant-configurable formats
- **Number Fields**: `integer`, `float`, `currency`, `percentage` with slider/input modes
- **Boolean Fields**: `boolean` with switch/checkbox/buttons display
- **Reference Fields**: `email`, `url`, `phone`, `user`, `shard`
- **File Fields**: `file`, `image` with upload configuration

Plus:
- **Design Configuration**: 12-column grid, grouping, conditional visibility, responsive
- **Validation Rules**: Required, regex, unique, cross-field validation
- **AI Form Design**: Generate optimal layouts from field definitions

→ **Full Specification**: [Field Types](./field-types.md)

#### Implementation Tasks

- [ ] Define TypeScript interfaces for all field types
- [ ] Update ShardType schema to include field definitions
- [ ] Create OptionList entity for reusable dropdown options
- [ ] Implement field validation service with cross-field support
- [ ] Build DynamicForm React component
- [ ] Create all input components (text, select, date, number, etc.)
- [ ] Add Quill.js integration for richtext
- [ ] Implement form layout grid system
- [ ] Build visual form designer
- [ ] Create AI form design generation endpoint

---

### 1. Add `schemaVersion` to ShardType

```typescript
interface ShardType {
  // ... existing fields
  schemaVersion: number;  // Add this, default to 1
}
```

### 2. Add `lastActivityAt` to Shard

```typescript
interface Shard {
  // ... existing fields
  lastActivityAt: Date;  // Updated on any significant activity
}
```

### 3. Add `source` field to Shard

```typescript
interface Shard {
  // ... existing fields
  source: 'ui' | 'api' | 'import' | 'integration' | 'system';
  sourceDetails?: {
    integrationName?: string;
    importJobId?: string;
    originalId?: string;
  };
}
```

### 4. Add `archivedAt` timestamp

```typescript
interface Shard {
  // ... existing fields
  archivedAt?: Date;  // When status changed to 'archived'
}
```

### 5. Standardize API Error Codes

```typescript
enum ShardErrorCode {
  // Validation
  SHARD_VALIDATION_FAILED = 'SHARD_VALIDATION_FAILED',
  SHARD_TYPE_NOT_FOUND = 'SHARD_TYPE_NOT_FOUND',
  SHARD_TYPE_INACTIVE = 'SHARD_TYPE_INACTIVE',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FIELD_VALUE = 'INVALID_FIELD_VALUE',
  
  // Access
  SHARD_NOT_FOUND = 'SHARD_NOT_FOUND',
  SHARD_ACCESS_DENIED = 'SHARD_ACCESS_DENIED',
  CROSS_TENANT_ACCESS = 'CROSS_TENANT_ACCESS',
  
  // Relationships
  RELATIONSHIP_TARGET_NOT_FOUND = 'RELATIONSHIP_TARGET_NOT_FOUND',
  RELATIONSHIP_CYCLE_DETECTED = 'RELATIONSHIP_CYCLE_DETECTED',
  INVALID_RELATIONSHIP_TYPE = 'INVALID_RELATIONSHIP_TYPE',
  
  // Operations
  SHARD_ALREADY_DELETED = 'SHARD_ALREADY_DELETED',
  SHARD_RESTORE_FAILED = 'SHARD_RESTORE_FAILED',
  BULK_OPERATION_PARTIAL_FAILURE = 'BULK_OPERATION_PARTIAL_FAILURE',
  
  // Schema
  SCHEMA_MIGRATION_FAILED = 'SCHEMA_MIGRATION_FAILED',
  SCHEMA_VERSION_MISMATCH = 'SCHEMA_VERSION_MISMATCH'
}
```

---

## Documentation Gaps

Additional documentation needed:

| Document | Status | Priority |
|----------|--------|----------|
| `api-reference.md` | 📋 Needed | High |
| `migration-guide.md` | 📋 Needed | High |
| `import-export.md` | 📋 Needed | Medium |
| `integrations.md` | 📋 Needed | Medium |
| `troubleshooting.md` | 📋 Needed | Low |
| `performance-tuning.md` | 📋 Needed | Low |

---

## Implementation Order

### Phase 0 (Field Types) ✅ COMPLETE
1. ✅ Rich Field Types specification (complete)
2. ✅ Backend: TypeScript interfaces and validation
3. ✅ Frontend: DynamicForm and input components
4. 🔴 AI form design generation

### Phase 1 (Foundation) ✅ COMPLETE
1. ✅ Quick wins (schemaVersion, lastActivityAt, source)
2. ✅ Event System / Webhooks
3. ✅ Schema Evolution Strategy
4. ✅ Bulk Operations API

### Phase 2 (Enhancement) ✅ COMPLETE
5. ✅ Relationship Graph Collection
6. ✅ Context Templates (`c_contextTemplate`)
7. ✅ Field-Level Security
8. 📄 API reference docs

### Phase 3 (Advanced) ✅ COMPLETE
9. ✅ Additional core types (c_task, c_event, c_email, c_activity, c_product)
10. ✅ Computed/Derived fields
11. ✅ Advanced search (facets, saved searches, analytics)
12. 📄 Remaining docs

### Phase 4 (Integrations) ✅ COMPLETE
13. ✅ Integration definitions and tenant activations
14. ✅ Conversion schema engine with 30+ transformations
15. ✅ Sync task scheduling (manual, interval, cron, realtime)
16. ✅ OAuth and API key connection management
17. ✅ Salesforce and Google News adapters
18. ✅ Frontend UI (list, configure, schema builder, sync tasks)

### Phase 5 (AI Insights Core) ✅ COMPLETE
19. ✅ `c_aimodel` ShardType - AI model definitions with capabilities, pricing, availability
20. ✅ `c_conversation` ShardType - Multi-user conversations with per-message models, RAG, feedback
21. ✅ `c_aiconfig` ShardType - Configurable prompt system (persona, style, tools, safety)
22. ✅ AI Insights documentation (8 insight types, 5 triggers, grounding, context assembly)
23. 📋 Intent classification service
24. 📋 Context assembly service (template-driven)
25. 📋 Grounding engine (citations, hallucination detection, confidence scoring)
26. 📋 Web search integration
27. 📋 Tool calling (create task, schedule meeting, draft email)
28. 📋 Streaming insight API endpoints
29. 📋 Frontend chat UI with insight widgets
30. 📋 Proactive insights (deal at risk, milestone approaching)

### Phase 6 (Performance & Cost Optimization) ✅ COMPLETE
31. ✅ Semantic caching (70-90% cost savings) - `semantic-cache.service.ts`
32. ✅ Smart model routing (complexity-based model selection) - `model-router.service.ts`
33. ✅ Quality monitoring dashboard (accuracy, satisfaction, performance, cost metrics) - `ai-analytics.service.ts`, `/analytics/ai`
34. ✅ Hybrid RAG + Graph retrieval (RRF fusion) - `hybrid-retrieval.service.ts`
35. ✅ Chain-of-thought reasoning for complex queries - `chain-of-thought.service.ts`

### Phase 7 (Automation & Intelligence) ✅ COMPLETE
36. ✅ Proactive insight agents (background monitoring) - `proactive-agent.service.ts`
37. ✅ Feedback learning system (continuous improvement) - `feedback-learning.service.ts`
38. ✅ Workflow automation (insights → tasks, notifications) - `workflow-automation.service.ts`
39. ✅ Insight scheduling (daily briefings, weekly reviews) - `insight-scheduler.service.ts`
40. 📋 A/B testing framework for prompts and models

### Phase 8 (User Experience) ✅ COMPLETE
41. ✅ Explainable AI (XAI) - reasoning transparency - `explainable-ai.service.ts`
42. ✅ Insight templates library (pre-built, customizable) - `insight-templates.service.ts`
43. ✅ Memory & long-term context (user preferences, entity facts) - `memory-context.service.ts`
44. ✅ Collaborative insights (sharing, mentions, comments) - `collaborative-insights.service.ts`
45. 📋 Multi-modal insights (images, charts, audio)

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team

