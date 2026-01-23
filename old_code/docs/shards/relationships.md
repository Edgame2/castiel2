# Shard Relationships

## Overview

Shards don't exist in isolation—they form a **knowledge graph** through relationships. Castiel supports two types of relationships:

1. **Internal Relationships**: Links between Shards within Castiel
2. **External Relationships**: Links to records in external systems

This document defines the structure, usage, and best practices for both relationship types.

---

## Table of Contents

1. [Why Relationships Matter](#why-relationships-matter)
2. [Internal Relationships](#internal-relationships)
3. [External Relationships](#external-relationships)
4. [Relationship Types](#relationship-types)
5. [Bidirectional vs Unidirectional](#bidirectional-vs-unidirectional)
6. [Querying Relationships](#querying-relationships)
7. [AI and Relationships](#ai-and-relationships)
8. [Best Practices](#best-practices)

---

## Why Relationships Matter

### For Users

- Navigate between related records
- Understand context and connections
- Maintain data integrity

### For AI

- Aggregate context from multiple sources
- Generate comprehensive insights
- Understand the full picture around a project

### For Integration

- Sync with external systems
- Track external record references
- Maintain bidirectional links

---

## Internal Relationships

### Definition

Internal relationships link one Shard to another Shard within Castiel.

```typescript
interface InternalRelationship {
  id: string;                          // Unique relationship ID (UUID)
  targetShardId: string;               // The linked Shard's ID
  targetShardTypeId: string;           // The linked Shard's type (for validation/display)
  relationshipType: string;            // Type of relationship
  label?: string;                      // Human-readable description
  metadata?: Record<string, any>;      // Additional relationship data
  createdAt: Date;                     // When relationship was created
  createdBy: string;                   // User who created the relationship
}
```

### Field Specifications

#### `id`
- UUID v4
- Auto-generated when relationship is created
- Used for updating/deleting specific relationships

#### `targetShardId`
- **Required**
- Must reference an existing Shard
- Shard must be in the same tenant (cross-tenant relationships forbidden)

#### `targetShardTypeId`
- **Required**
- ShardType ID of the target Shard
- Used for UI display (icon, label) and validation

#### `relationshipType`
- **Required**
- Defines the semantic meaning of the relationship
- See [Relationship Types](#relationship-types) for standard values

#### `label`
- Optional human-readable description
- Displayed in UI
- Example: "Primary Contact", "Related Document"

#### `metadata`
- Optional additional data
- Use for relationship-specific attributes
- Example: `{ role: "decision_maker", priority: 1 }`

### Example

A project linked to a company and several contacts:

```json
{
  "id": "project-uuid",
  "shardTypeId": "c_project-type-uuid",
  "structuredData": {
    "name": "Enterprise Implementation Q1"
  },
  "internal_relationships": [
    {
      "id": "rel-1-uuid",
      "targetShardId": "company-uuid",
      "targetShardTypeId": "c_company-type-uuid",
      "relationshipType": "belongs_to",
      "label": "Client Company",
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "rel-2-uuid",
      "targetShardId": "contact-1-uuid",
      "targetShardTypeId": "c_contact-type-uuid",
      "relationshipType": "has_stakeholder",
      "label": "Project Sponsor",
      "metadata": {
        "role": "sponsor",
        "isPrimary": true
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "rel-3-uuid",
      "targetShardId": "contact-2-uuid",
      "targetShardTypeId": "c_contact-type-uuid",
      "relationshipType": "has_stakeholder",
      "label": "Technical Lead",
      "metadata": {
        "role": "technical_lead",
        "isPrimary": false
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-uuid"
    }
  ]
}
```

---

## External Relationships

### Definition

External relationships link a Shard to a record in an external system (CRM, ERP, messaging, etc.).

```typescript
interface ExternalRelationship {
  id: string;                          // Unique relationship ID (UUID)
  system: string;                      // External system identifier
  systemType: ExternalSystemType;      // Category of external system
  externalId: string;                  // ID in the external system
  externalUrl?: string;                // Direct link to external record
  label?: string;                      // Human-readable description
  
  // === SYNC DATA ===
  syncStatus: SyncStatus;              // Current synchronization status
  syncDirection: SyncDirection;        // Direction of sync
  lastSyncedAt?: Date;                 // Last successful sync timestamp
  lastSyncAttemptAt?: Date;            // Last sync attempt (success or fail)
  nextSyncAt?: Date;                   // Scheduled next sync
  syncError?: SyncError;               // Error details if sync failed
  syncHistory?: SyncHistoryEntry[];    // Recent sync history (last 10)
  
  metadata?: Record<string, any>;      // Data from external system
  createdAt: Date;                     // When relationship was created
  createdBy: string;                   // User who created the relationship
  updatedAt?: Date;                    // When relationship was last updated
}
```

### External System Types

```typescript
enum ExternalSystemType {
  CRM = 'crm',                         // Salesforce, HubSpot, Dynamics, Pipedrive
  ERP = 'erp',                         // SAP, Oracle, NetSuite
  MESSAGING = 'messaging',             // Slack, Microsoft Teams, Discord
  EMAIL = 'email',                     // Gmail, Outlook
  CALENDAR = 'calendar',               // Google Calendar, Outlook Calendar
  STORAGE = 'storage',                 // Google Drive, Dropbox, OneDrive, SharePoint
  PROJECT_MANAGEMENT = 'project_management', // Jira, Asana, Monday, Trello
  ACCOUNTING = 'accounting',           // QuickBooks, Xero
  SUPPORT = 'support',                 // Zendesk, Intercom, Freshdesk
  MARKETING = 'marketing',             // Mailchimp, Marketo
  CUSTOM = 'custom'                    // Custom integrations
}
```

### Sync Status

```typescript
enum SyncStatus {
  SYNCED = 'synced',                   // Successfully synchronized
  PENDING = 'pending',                 // Waiting for sync
  SYNCING = 'syncing',                 // Currently syncing
  FAILED = 'failed',                   // Last sync failed
  STALE = 'stale',                     // Data may be outdated (>24h since last sync)
  DISCONNECTED = 'disconnected'        // Integration disconnected/revoked
}
```

### Sync Direction

```typescript
enum SyncDirection {
  INBOUND = 'inbound',                 // External → Castiel
  OUTBOUND = 'outbound',               // Castiel → External
  BIDIRECTIONAL = 'bidirectional'      // Both directions
}
```

### Sync Error

```typescript
interface SyncError {
  code: string;                        // Error code (e.g., "AUTH_EXPIRED", "NOT_FOUND")
  message: string;                     // Human-readable error message
  occurredAt: Date;                    // When error occurred
  retryable: boolean;                  // Can this be retried?
  retryCount: number;                  // Number of retry attempts
  details?: Record<string, any>;       // Additional error context
}
```

### Sync History Entry

```typescript
interface SyncHistoryEntry {
  timestamp: Date;
  status: 'success' | 'failed';
  direction: SyncDirection;
  changesApplied?: number;             // Number of fields updated
  error?: string;                      // Error message if failed
  duration?: number;                   // Sync duration in ms
}
```

### Common Sync Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `AUTH_EXPIRED` | OAuth token expired | Yes (after re-auth) |
| `AUTH_REVOKED` | User revoked access | No |
| `NOT_FOUND` | External record deleted | No |
| `PERMISSION_DENIED` | Insufficient permissions | No |
| `RATE_LIMITED` | API rate limit exceeded | Yes |
| `NETWORK_ERROR` | Network connectivity issue | Yes |
| `SCHEMA_MISMATCH` | Field mapping mismatch | No |
| `CONFLICT` | Conflicting updates | Yes (manual) |
| `TIMEOUT` | Request timeout | Yes |
| `UNKNOWN` | Unknown error | Yes |

### Field Specifications

#### `system`
- **Required**
- Unique identifier for the external system instance
- Format: `{provider}:{instance}` or just `{provider}`
- Examples: `salesforce`, `hubspot:acme-corp`, `slack:workspace-123`

#### `systemType`
- **Required**
- Categorizes the external system
- Used for UI grouping and integration logic

#### `externalId`
- **Required**
- The record's ID in the external system
- Format varies by system (Salesforce IDs, HubSpot IDs, etc.)

#### `externalUrl`
- Optional direct link to the record
- Opens in new tab when clicked
- Example: `https://acme.salesforce.com/001XXXXXXXXXXXX`

#### `syncStatus`
- **Required** (defaults to `pending`)
- Tracks current synchronization state
- Updated by integration jobs
- UI displays sync indicators based on status

#### `syncDirection`
- Direction of data flow
- `inbound`: External system is source of truth
- `outbound`: Castiel is source of truth
- `bidirectional`: Both systems can update

#### `lastSyncedAt`
- When data was last **successfully** synced
- Used to determine staleness (stale if >24h)
- Only updated on successful sync

#### `lastSyncAttemptAt`
- When sync was last **attempted** (success or failure)
- Useful for debugging failed syncs
- Updated on every sync attempt

#### `nextSyncAt`
- Scheduled time for next sync
- Used for polling-based integrations
- May be `null` for event-driven syncs

#### `syncError`
- Present only when `syncStatus` is `failed`
- Contains error details for troubleshooting
- Includes retry information

#### `syncHistory`
- Array of recent sync attempts (last 10)
- Used for audit and debugging
- Shows success/failure pattern

#### `metadata`
- Additional data from the external system
- Varies by integration
- Example: `{ salesforceType: "Account", industry: "Technology" }`

### Example

A company linked to Salesforce and Slack with full sync data:

```json
{
  "id": "company-uuid",
  "shardTypeId": "c_company-type-uuid",
  "structuredData": {
    "name": "Acme Corporation",
    "industry": "Technology"
  },
  "external_relationships": [
    {
      "id": "ext-rel-1-uuid",
      "system": "salesforce",
      "systemType": "crm",
      "externalId": "001XXXXXXXXXXXX",
      "externalUrl": "https://acme.salesforce.com/001XXXXXXXXXXXX",
      "label": "Salesforce Account",
      "syncStatus": "synced",
      "syncDirection": "bidirectional",
      "lastSyncedAt": "2025-01-20T08:00:00Z",
      "lastSyncAttemptAt": "2025-01-20T08:00:00Z",
      "nextSyncAt": "2025-01-20T09:00:00Z",
      "syncHistory": [
        {
          "timestamp": "2025-01-20T08:00:00Z",
          "status": "success",
          "direction": "inbound",
          "changesApplied": 3,
          "duration": 245
        },
        {
          "timestamp": "2025-01-20T07:00:00Z",
          "status": "success",
          "direction": "inbound",
          "changesApplied": 0,
          "duration": 180
        }
      ],
      "metadata": {
        "salesforceType": "Account",
        "ownerId": "005XXXXXXXXXXXX",
        "ownerName": "Jane Smith"
      },
      "createdAt": "2025-01-01T00:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "ext-rel-2-uuid",
      "system": "slack:acme-workspace",
      "systemType": "messaging",
      "externalId": "C0123456789",
      "externalUrl": "https://acme.slack.com/archives/C0123456789",
      "label": "Acme Discussion Channel",
      "syncStatus": "synced",
      "syncDirection": "inbound",
      "lastSyncedAt": "2025-01-20T12:00:00Z",
      "lastSyncAttemptAt": "2025-01-20T12:00:00Z",
      "metadata": {
        "channelName": "#acme-project",
        "memberCount": 15
      },
      "createdAt": "2025-01-05T00:00:00Z",
      "createdBy": "user-uuid"
    }
  ]
}
```

### Example: Failed Sync with Error Details

```json
{
  "id": "ext-rel-3-uuid",
  "system": "hubspot",
  "systemType": "crm",
  "externalId": "123456789",
  "externalUrl": "https://app.hubspot.com/contacts/123456789",
  "label": "HubSpot Contact",
  "syncStatus": "failed",
  "syncDirection": "bidirectional",
  "lastSyncedAt": "2025-01-18T10:00:00Z",
  "lastSyncAttemptAt": "2025-01-20T14:30:00Z",
  "nextSyncAt": "2025-01-20T15:30:00Z",
  "syncError": {
    "code": "AUTH_EXPIRED",
    "message": "OAuth token expired. Please reconnect your HubSpot account.",
    "occurredAt": "2025-01-20T14:30:00Z",
    "retryable": true,
    "retryCount": 3,
    "details": {
      "httpStatus": 401,
      "endpoint": "/contacts/v1/contact/vid/123456789/profile"
    }
  },
  "syncHistory": [
    {
      "timestamp": "2025-01-20T14:30:00Z",
      "status": "failed",
      "direction": "inbound",
      "error": "AUTH_EXPIRED: OAuth token expired",
      "duration": 45
    },
    {
      "timestamp": "2025-01-20T13:30:00Z",
      "status": "failed",
      "direction": "inbound",
      "error": "AUTH_EXPIRED: OAuth token expired",
      "duration": 52
    },
    {
      "timestamp": "2025-01-18T10:00:00Z",
      "status": "success",
      "direction": "inbound",
      "changesApplied": 2,
      "duration": 320
    }
  ],
  "metadata": {
    "hubspotType": "contact",
    "lifecycleStage": "lead"
  },
  "createdAt": "2025-01-10T00:00:00Z",
  "createdBy": "user-uuid",
  "updatedAt": "2025-01-20T14:30:00Z"
}
```

---

## Relationship Types

### Standard Internal Relationship Types

The following relationship types are defined in the `RelationshipType` enum and available for use across all shard types:

Use these standard types for consistency across the platform.

#### Hierarchical Relationships

| Type | Description | Example |
|------|-------------|---------|
| `parent_of` | Source is parent of target | Project → Task |
| `child_of` | Source is child of target | Task → Project |
| `belongs_to` | Source belongs to target | Contact → Company |
| `contains` | Source contains target | Company → Department |

#### Associative Relationships

| Type | Description | Example |
|------|-------------|---------|
| `related_to` | General association | Document ↔ Project |
| `references` | Source references target | Note → Document |
| `mentioned_in` | Source mentions target | Contact mentioned in Note |

#### Role-Based Relationships

| Type | Description | Example |
|------|-------------|---------|
| `has_stakeholder` | Has a person involved | Project → Contact |
| `has_owner` | Has an owner | Opportunity → Contact |
| `has_participant` | Has a participant | Meeting → Contact |
| `assigned_to` | Assigned to person | Task → Contact |

#### Process Relationships

| Type | Description | Example |
|------|-------------|---------|
| `follows` | Follows in sequence | Task B → Task A |
| `blocks` | Blocks another item | Issue → Feature |
| `depends_on` | Depends on another | Project → Milestone |
| `derived_from` | Derived from source | Document v2 → Document v1 |

#### Opportunity/Sales Relationships

| Type | Description | Example |
|------|-------------|---------|
| `opportunity_for` | Opportunity for company | Opportunity → Company |
| `contact_for` | Contact for opportunity | Contact → Opportunity |
| `proposal_for` | Proposal for opportunity | Document → Opportunity |
| `competitor_of` | Competitor of opportunity | OpportunityCompetitor → Opportunity |
| `has_competitor` | Has competitor | Opportunity → OpportunityCompetitor |
| `contact_role_in` | Contact role in opportunity | OpportunityContactRole → Opportunity |
| `has_contact_role` | Has contact role | Opportunity → OpportunityContactRole |
| `line_item_of` | Line item of opportunity | OpportunityLineItem → Opportunity |
| `has_line_item` | Has line item | Opportunity → OpportunityLineItem |

#### Communication/Threading Relationships

| Type | Description | Example |
|------|-------------|---------|
| `replies_to` | Replies to message/email | Email/Message → Email/Message |
| `in_thread` | In same thread | Email/Message → Email/Message |
| `has_attachment` | Has file attachment | Email/Message/Note → Attachment |
| `attached_to` | Attached to entity | Attachment → Email/Message/Note |

#### Meeting/Event Relationships

| Type | Description | Example |
|------|-------------|---------|
| `has_attendee` | Has attendee | Meeting/Event → Contact/User |
| `attendee_of` | Attendee of meeting/event | Contact/User → Meeting/Event |
| `event_in_calendar` | Event in calendar | Event → Calendar |
| `calendar_has_event` | Calendar has event | Calendar → Event |
| `meeting_for` | Meeting for entity | Meeting → Opportunity/Account/Project |
| `has_meeting` | Has meeting | Opportunity/Account/Project → Meeting |

#### Team/Channel Relationships

| Type | Description | Example |
|------|-------------|---------|
| `channel_in_team` | Channel in team | Channel → Team |
| `team_has_channel` | Team has channel | Team → Channel |
| `message_in_channel` | Message in channel | Message → Channel |
| `channel_has_message` | Channel has message | Channel → Message |

### Custom Relationship Types

Tenants can define custom relationship types following the format:

```
{category}_{action}
```

Examples:
- `project_manages`
- `support_handles`
- `review_approves`

---

## Bidirectional vs Unidirectional

### Unidirectional (Default)

By default, relationships are **stored on one side only**. The Shard containing the `internal_relationships` array owns the relationship.

```
Project (has relationship) → Company (no relationship stored)
```

**Pros:**
- Simple to manage
- No synchronization issues
- Clear ownership

**Cons:**
- Requires reverse lookups to find "what links to me"

### Bidirectional (Application-Level)

For important relationships, the application can maintain **bidirectional links** by creating relationships on both sides.

```
Project.internal_relationships: [{ targetShardId: company, type: "belongs_to" }]
Company.internal_relationships: [{ targetShardId: project, type: "has_project" }]
```

**When to use bidirectional:**
- High-traffic lookups in both directions
- Business-critical relationships
- UI requires showing relationships from both sides

**Implementation:**
- Application creates both relationships in a transaction
- Application maintains consistency on updates/deletes

---

## Querying Relationships

### Find Related Shards

```typescript
// Get all shards linked FROM a shard
const relatedShards = shard.internal_relationships.map(rel => rel.targetShardId);

// Get all shards linking TO a shard (reverse lookup)
const query = `
  SELECT * FROM c 
  WHERE c.tenantId = @tenantId 
  AND ARRAY_CONTAINS(c.internal_relationships, { targetShardId: @shardId }, true)
`;
```

### Filter by Relationship Type

```typescript
// Get all stakeholders for a project
const stakeholders = project.internal_relationships
  .filter(rel => rel.relationshipType === 'has_stakeholder')
  .map(rel => rel.targetShardId);
```

### Get External System Records

```typescript
// Get all CRM links
const crmLinks = shard.external_relationships
  .filter(rel => rel.systemType === 'crm');

// Get Salesforce ID
const salesforceRel = shard.external_relationships
  .find(rel => rel.system === 'salesforce');
const salesforceId = salesforceRel?.externalId;
```

---

## AI and Relationships

### Context Assembly

When generating AI insights for a project, the system:

1. **Starts with the central Shard** (e.g., c_project)
2. **Traverses internal_relationships** to gather connected Shards
3. **Recursively follows relationships** (configurable depth)
4. **Fetches external_relationships** for additional context
5. **Assembles context** for AI processing

```
c_project
    │
    ├── internal_relationships
    │   ├── c_company (client info, industry, size)
    │   ├── c_contact[] (stakeholders, decision makers)
    │   ├── c_opportunity (deal size, stage, probability)
    │   ├── c_document[] (proposals, contracts, specs)
    │   └── c_note[] (meeting notes, call logs)
    │
    └── external_relationships
        ├── Salesforce (CRM data, activity history)
        ├── Slack (conversation context)
        └── Jira (technical requirements, progress)
```

### Relationship Weighting

AI can weight relationships by:

| Factor | Weight Modifier |
|--------|-----------------|
| Relationship type | Primary relationships weighted higher |
| Recency | Recent links weighted higher |
| Metadata flags | `isPrimary: true` weighted higher |
| User activity | Frequently accessed weighted higher |

---

## Best Practices

### 1. Choose Appropriate Relationship Types

```typescript
// ✅ Good: Specific, meaningful type
{ relationshipType: "has_stakeholder", label: "Project Sponsor" }

// ❌ Bad: Vague, uninformative
{ relationshipType: "link" }
```

### 2. Use Labels for Clarity

```typescript
// ✅ Good: Clear label explains the relationship
{
  relationshipType: "has_stakeholder",
  label: "Technical Decision Maker",
  metadata: { role: "technical_lead" }
}

// ❌ Bad: No context about why this person matters
{
  relationshipType: "has_stakeholder"
}
```

### 3. Store Metadata When Needed

```typescript
// ✅ Good: Metadata provides valuable context
{
  relationshipType: "contact_for",
  metadata: {
    role: "champion",
    influenceLevel: "high",
    department: "Engineering"
  }
}
```

### 4. Keep External Relationships Updated

```typescript
// ✅ Good: Track sync status
{
  system: "salesforce",
  syncStatus: "synced",
  lastSyncedAt: "2025-01-20T08:00:00Z"
}

// ❌ Bad: No sync tracking
{
  system: "salesforce",
  externalId: "001XXX"
  // When was this last verified?
}
```

### 5. Validate Relationship Targets

Before creating a relationship:

1. ✅ Verify target Shard exists
2. ✅ Verify target is in same tenant
3. ✅ Verify user has permission to link
4. ✅ Verify relationship type is valid for the ShardTypes involved

### 6. Consider AI Consumption

Design relationships with AI in mind:

```typescript
// ✅ Good: AI can understand the context
{
  relationshipType: "opportunity_for",
  label: "Q1 Enterprise Deal",
  metadata: {
    dealSize: 500000,
    stage: "negotiation",
    closeDate: "2025-03-31"
  }
}
```

### 7. Don't Duplicate Data

Use relationships instead of copying data:

```typescript
// ✅ Good: Reference via relationship
internal_relationships: [{
  targetShardId: "company-uuid",
  relationshipType: "belongs_to"
}]

// ❌ Bad: Copy company data into contact
structuredData: {
  companyName: "Acme Corp",  // Duplicated!
  companyIndustry: "Tech"    // Duplicated!
}
```

---

## Schema Reference

### Internal Relationship JSON Schema

```json
{
  "$id": "internal-relationship",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "targetShardId": { "type": "string", "format": "uuid" },
    "targetShardTypeId": { "type": "string", "format": "uuid" },
    "relationshipType": { 
      "type": "string",
      "pattern": "^[a-z_]+$"
    },
    "label": { "type": "string", "maxLength": 200 },
    "metadata": { "type": "object" },
    "createdAt": { "type": "string", "format": "date-time" },
    "createdBy": { "type": "string", "format": "uuid" }
  },
  "required": ["id", "targetShardId", "targetShardTypeId", "relationshipType", "createdAt", "createdBy"]
}
```

### External Relationship JSON Schema

```json
{
  "$id": "external-relationship",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "system": { "type": "string", "minLength": 1 },
    "systemType": {
      "type": "string",
      "enum": ["crm", "erp", "messaging", "email", "calendar", "storage", "project_management", "accounting", "support", "marketing", "custom"]
    },
    "externalId": { "type": "string", "minLength": 1 },
    "externalUrl": { "type": "string", "format": "uri" },
    "label": { "type": "string", "maxLength": 200 },
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
    "lastSyncedAt": { "type": "string", "format": "date-time" },
    "lastSyncAttemptAt": { "type": "string", "format": "date-time" },
    "nextSyncAt": { "type": "string", "format": "date-time" },
    "syncError": {
      "type": "object",
      "properties": {
        "code": { "type": "string" },
        "message": { "type": "string" },
        "occurredAt": { "type": "string", "format": "date-time" },
        "retryable": { "type": "boolean" },
        "retryCount": { "type": "integer", "minimum": 0 },
        "details": { "type": "object" }
      },
      "required": ["code", "message", "occurredAt", "retryable", "retryCount"]
    },
    "syncHistory": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "status": { "type": "string", "enum": ["success", "failed"] },
          "direction": { "type": "string", "enum": ["inbound", "outbound", "bidirectional"] },
          "changesApplied": { "type": "integer", "minimum": 0 },
          "error": { "type": "string" },
          "duration": { "type": "integer", "minimum": 0 }
        },
        "required": ["timestamp", "status", "direction"]
      }
    },
    "metadata": { "type": "object" },
    "createdAt": { "type": "string", "format": "date-time" },
    "createdBy": { "type": "string", "format": "uuid" },
    "updatedAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "system", "systemType", "externalId", "syncStatus", "createdAt", "createdBy"]
}
```

---

## Next Steps

→ Continue to [Naming Conventions](./naming-conventions.md) to understand the `c_` prefix and naming rules.

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team

