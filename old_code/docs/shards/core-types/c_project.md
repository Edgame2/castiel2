# c_project - Project ShardType

## Overview

The `c_project` ShardType is the **central hub** of Castiel's AI insights system. Projects aggregate related Shards (companies, contacts, opportunities, documents, notes) to provide comprehensive context for AI analysis.

> **AI Role**: Primary context aggregation point. All AI insights start from a project.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_project` |
| **Display Name** | Project |
| **Category** | DATA |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `FolderKanban` |
| **Color** | `#6366f1` (Indigo) |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Project name/title |
| `description` | string | No | Detailed project description |
| `status` | enum | Yes | Current project status |
| `stage` | enum | No | Project stage/phase |
| `priority` | enum | No | Priority level |
| `startDate` | date | No | Project start date |
| `targetEndDate` | date | No | Target completion date |
| `actualEndDate` | date | No | Actual completion date |
| `budget` | number | No | Project budget |
| `currency` | string | No | Budget currency (ISO 4217) |
| `projectType` | enum | No | Type of project |
| `ownerUserId` | string | No | Project owner (user ID) |
| `teamMembers` | string[] | No | Team member user IDs |
| `objectives` | string[] | No | Project objectives/goals |
| `risks` | object[] | No | Identified risks |
| `milestones` | object[] | No | Project milestones |

### Field Details

#### `status` (Required)
```typescript
enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
```

#### `stage`
```typescript
enum ProjectStage {
  INITIATION = 'initiation',
  PLANNING = 'planning',
  EXECUTION = 'execution',
  MONITORING = 'monitoring',
  CLOSING = 'closing'
}
```

#### `priority`
```typescript
enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}
```

#### `projectType`
```typescript
enum ProjectType {
  IMPLEMENTATION = 'implementation',
  CONSULTING = 'consulting',
  DEVELOPMENT = 'development',
  SUPPORT = 'support',
  RESEARCH = 'research',
  INTERNAL = 'internal',
  OTHER = 'other'
}
```

#### `risks`
```typescript
interface ProjectRisk {
  id: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
  status: 'identified' | 'mitigating' | 'resolved' | 'accepted';
}
```

#### `milestones`
```typescript
interface Milestone {
  id: string;
  name: string;
  description?: string;
  dueDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_project.json",
  "title": "Project",
  "description": "Central hub for AI insights - aggregates related entities",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Project name"
    },
    "description": {
      "type": "string",
      "maxLength": 5000,
      "description": "Detailed project description"
    },
    "status": {
      "type": "string",
      "enum": ["planning", "active", "on_hold", "completed", "cancelled"],
      "default": "planning",
      "description": "Current project status"
    },
    "stage": {
      "type": "string",
      "enum": ["initiation", "planning", "execution", "monitoring", "closing"],
      "description": "Project lifecycle stage"
    },
    "priority": {
      "type": "string",
      "enum": ["critical", "high", "medium", "low"],
      "default": "medium",
      "description": "Priority level"
    },
    "startDate": {
      "type": "string",
      "format": "date",
      "description": "Project start date"
    },
    "targetEndDate": {
      "type": "string",
      "format": "date",
      "description": "Target completion date"
    },
    "actualEndDate": {
      "type": "string",
      "format": "date",
      "description": "Actual completion date"
    },
    "budget": {
      "type": "number",
      "minimum": 0,
      "description": "Project budget"
    },
    "currency": {
      "type": "string",
      "pattern": "^[A-Z]{3}$",
      "default": "USD",
      "description": "ISO 4217 currency code"
    },
    "projectType": {
      "type": "string",
      "enum": ["implementation", "consulting", "development", "support", "research", "internal", "other"],
      "description": "Type of project"
    },
    "ownerUserId": {
      "type": "string",
      "format": "uuid",
      "description": "Project owner user ID"
    },
    "teamMembers": {
      "type": "array",
      "items": { "type": "string", "format": "uuid" },
      "description": "Team member user IDs"
    },
    "objectives": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Project objectives"
    },
    "risks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "description": { "type": "string" },
          "likelihood": { "type": "string", "enum": ["low", "medium", "high"] },
          "impact": { "type": "string", "enum": ["low", "medium", "high"] },
          "mitigation": { "type": "string" },
          "status": { "type": "string", "enum": ["identified", "mitigating", "resolved", "accepted"] }
        },
        "required": ["id", "description", "likelihood", "impact", "status"]
      },
      "description": "Identified risks"
    },
    "milestones": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "dueDate": { "type": "string", "format": "date" },
          "completedDate": { "type": "string", "format": "date" },
          "status": { "type": "string", "enum": ["pending", "in_progress", "completed", "delayed"] }
        },
        "required": ["id", "name", "dueDate", "status"]
      },
      "description": "Project milestones"
    }
  },
  "required": ["name", "status"]
}
```

---

## Relationships

### Internal Relationships (Typical)

| Relationship Type | Target | Description |
|-------------------|--------|-------------|
| `has_client` | `c_company` | The client company for this project |
| `has_stakeholder` | `c_contact[]` | People involved in the project |
| `has_opportunity` | `c_opportunity` | Related sales opportunity |
| `has_document` | `c_document[]` | Project documents |
| `has_note` | `c_note[]` | Project notes and updates |
| `uses_assistant` | `c_assistant` | AI assistant for this project |

### Incoming Relationships (What Links to Projects)

| From | Relationship Type | Description |
|------|-------------------|-------------|
| `c_document` | `belongs_to` | Documents belonging to project |
| `c_note` | `belongs_to` | Notes about the project |
| Custom types | `belongs_to` | Tenant-specific types |

### External Relationships (Common)

| System Type | System | Description |
|-------------|--------|-------------|
| `project_management` | Jira, Asana, Monday | Project tracking |
| `crm` | Salesforce, HubSpot | Related opportunity |
| `storage` | Google Drive, SharePoint | Project folder |
| `messaging` | Slack, Teams | Project channel |

---

## AI Context Role

### Primary Hub

`c_project` is the **primary aggregation point** for AI insights. When a user requests insights about a project:

1. **Core Data**: Project name, description, status, objectives
2. **Client Context**: Linked `c_company` data (industry, size, history)
3. **Stakeholders**: Linked `c_contact` records (roles, relationships)
4. **Business Context**: Linked `c_opportunity` (deal value, stage)
5. **Content**: Linked `c_document` text and summaries
6. **Activities**: Linked `c_note` entries (meetings, calls)
7. **External Data**: Data from external_relationships

### AI Prompt Template

```
Project: {name}
Description: {description}
Status: {status} | Stage: {stage} | Priority: {priority}
Timeline: {startDate} → {targetEndDate}
Budget: {currency} {budget}

Client: {c_company.name}
  Industry: {c_company.industry}
  Size: {c_company.employeeCount} employees

Stakeholders:
{foreach c_contact}
  - {name} ({jobTitle}) - {relationship.label}
{/foreach}

Opportunity: {c_opportunity.name}
  Value: {c_opportunity.value}
  Stage: {c_opportunity.stage}

Recent Notes:
{foreach c_note (last 5)}
  [{createdAt}] {content}
{/foreach}

Documents:
{foreach c_document}
  - {name}: {enrichment.summary}
{/foreach}
```

---

## Examples

### Example 1: Enterprise Implementation Project

```json
{
  "id": "proj-001-uuid",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid",
  "shardTypeId": "c_project-type-uuid",
  "structuredData": {
    "name": "Acme Corp - Enterprise Implementation Q1 2025",
    "description": "Full enterprise rollout of Castiel platform for Acme Corporation, including data migration, user training, and integration with existing systems.",
    "status": "active",
    "stage": "execution",
    "priority": "high",
    "startDate": "2025-01-15",
    "targetEndDate": "2025-03-31",
    "budget": 150000,
    "currency": "USD",
    "projectType": "implementation",
    "ownerUserId": "owner-user-uuid",
    "teamMembers": ["user-1-uuid", "user-2-uuid", "user-3-uuid"],
    "objectives": [
      "Migrate 50,000 customer records",
      "Train 200 end users",
      "Integrate with Salesforce CRM",
      "Achieve 95% user adoption within 60 days"
    ],
    "milestones": [
      {
        "id": "m1",
        "name": "Data Migration Complete",
        "dueDate": "2025-02-15",
        "status": "completed",
        "completedDate": "2025-02-12"
      },
      {
        "id": "m2",
        "name": "User Training Complete",
        "dueDate": "2025-03-01",
        "status": "in_progress"
      },
      {
        "id": "m3",
        "name": "Go-Live",
        "dueDate": "2025-03-15",
        "status": "pending"
      }
    ],
    "risks": [
      {
        "id": "r1",
        "description": "Data quality issues may delay migration",
        "likelihood": "medium",
        "impact": "high",
        "mitigation": "Allocated extra week for data cleanup",
        "status": "mitigating"
      }
    ]
  },
  "internal_relationships": [
    {
      "id": "rel-1",
      "targetShardId": "company-acme-uuid",
      "targetShardTypeId": "c_company-type-uuid",
      "relationshipType": "has_client",
      "label": "Client Company",
      "createdAt": "2025-01-15T00:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "rel-2",
      "targetShardId": "contact-john-uuid",
      "targetShardTypeId": "c_contact-type-uuid",
      "relationshipType": "has_stakeholder",
      "label": "Project Sponsor",
      "metadata": { "role": "sponsor", "isPrimary": true },
      "createdAt": "2025-01-15T00:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "rel-3",
      "targetShardId": "opportunity-uuid",
      "targetShardTypeId": "c_opportunity-type-uuid",
      "relationshipType": "has_opportunity",
      "label": "Enterprise License Deal",
      "createdAt": "2025-01-15T00:00:00Z",
      "createdBy": "user-uuid"
    }
  ],
  "external_relationships": [
    {
      "id": "ext-1",
      "system": "jira",
      "systemType": "project_management",
      "externalId": "ACME-IMPL",
      "externalUrl": "https://company.atlassian.net/projects/ACME-IMPL",
      "label": "Jira Project",
      "syncStatus": "synced",
      "lastSyncedAt": "2025-01-20T08:00:00Z",
      "createdAt": "2025-01-15T00:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "ext-2",
      "system": "slack:acme-workspace",
      "systemType": "messaging",
      "externalId": "C0123456789",
      "externalUrl": "https://company.slack.com/archives/C0123456789",
      "label": "Project Channel",
      "syncStatus": "synced",
      "createdAt": "2025-01-15T00:00:00Z",
      "createdBy": "user-uuid"
    }
  ],
  "metadata": {
    "tags": ["enterprise", "q1-2025", "implementation"],
    "category": "client-project"
  },
  "status": "active",
  "createdAt": "2025-01-15T00:00:00Z",
  "updatedAt": "2025-01-20T10:30:00Z"
}
```

---

## UI Schema

```json
{
  "name": {
    "ui:widget": "text",
    "ui:placeholder": "Enter project name",
    "ui:autofocus": true
  },
  "description": {
    "ui:widget": "textarea",
    "ui:options": { "rows": 4 }
  },
  "status": {
    "ui:widget": "select"
  },
  "stage": {
    "ui:widget": "select"
  },
  "priority": {
    "ui:widget": "radio",
    "ui:options": { "inline": true }
  },
  "startDate": {
    "ui:widget": "date"
  },
  "targetEndDate": {
    "ui:widget": "date"
  },
  "budget": {
    "ui:widget": "number",
    "ui:options": { "prefix": "$" }
  },
  "objectives": {
    "ui:widget": "tags",
    "ui:options": { "allowNew": true }
  },
  "ui:order": [
    "name",
    "description",
    "status",
    "stage",
    "priority",
    "projectType",
    "startDate",
    "targetEndDate",
    "budget",
    "currency",
    "objectives",
    "milestones",
    "risks"
  ]
}
```

---

## Display Configuration

```json
{
  "titleField": "name",
  "subtitleField": "status",
  "iconField": null,
  "searchableFields": ["name", "description", "objectives"],
  "sortableFields": ["name", "status", "priority", "startDate", "targetEndDate"],
  "defaultSortField": "updatedAt",
  "defaultSortOrder": "desc"
}
```

---

## Workflow Configuration

```json
{
  "statusField": "status",
  "statuses": [
    { "value": "planning", "label": "Planning", "color": "#6b7280", "order": 1 },
    { "value": "active", "label": "Active", "color": "#10b981", "order": 2 },
    { "value": "on_hold", "label": "On Hold", "color": "#f59e0b", "order": 3 },
    { "value": "completed", "label": "Completed", "color": "#3b82f6", "order": 4 },
    { "value": "cancelled", "label": "Cancelled", "color": "#ef4444", "order": 5 }
  ],
  "transitions": [
    { "from": "planning", "to": ["active", "cancelled"] },
    { "from": "active", "to": ["on_hold", "completed", "cancelled"] },
    { "from": "on_hold", "to": ["active", "cancelled"] },
    { "from": "completed", "to": ["active"] },
    { "from": "cancelled", "to": ["planning"] }
  ],
  "defaultStatus": "planning"
}
```

---

## Enrichment Configuration

```json
{
  "enabled": true,
  "fields": [
    {
      "fieldName": "summary",
      "enrichmentType": "summarize",
      "sourceFields": ["description", "objectives"],
      "autoApply": true
    },
    {
      "fieldName": "riskAnalysis",
      "enrichmentType": "extract",
      "prompt": "Analyze the project risks and suggest mitigations",
      "sourceFields": ["description", "risks"],
      "autoApply": false
    }
  ],
  "frequency": "on_update",
  "triggers": [
    { "type": "field_change", "condition": { "field": "status", "operator": "not_equals", "value": null } }
  ]
}
```

---

## API Operations

### Create Project
```http
POST /api/v1/shards
Content-Type: application/json

{
  "shardTypeId": "c_project-type-uuid",
  "structuredData": {
    "name": "New Project",
    "status": "planning"
  }
}
```

### List Projects
```http
GET /api/v1/shards?shardTypeId={c_project-type-uuid}&status=active
```

### Get Project with Related Shards
```http
GET /api/v1/shards/{id}?include=relationships
```

---

## Best Practices

1. **Always link a client**: Projects should have a `has_client` relationship to a `c_company`
2. **Add stakeholders**: Link key `c_contact` records for context
3. **Track milestones**: Use milestones for progress tracking
4. **Document risks**: Identify and track project risks
5. **Keep notes**: Link `c_note` records for activity history
6. **External sync**: Connect to project management tools (Jira, Asana)

---

**Last Updated**: November 2025  
**Version**: 1.0.0






