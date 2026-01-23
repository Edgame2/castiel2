# c_contextTemplate

## Overview

The `c_contextTemplate` ShardType defines reusable templates for assembling AI context. Instead of hardcoding what data gets sent to the AI, templates declaratively specify which relationships to traverse, which fields to include, and how to format the output.

> **Philosophy**: "Templates turn AI context assembly from art into engineering—predictable, measurable, and optimizable."

---

## Table of Contents

1. [Purpose](#purpose)
2. [Benefits](#benefits)
3. [Schema Definition](#schema-definition)
4. [JSON Schema](#json-schema)
5. [Relationships](#relationships)
6. [System Templates](#system-templates)
7. [Template Selection Hierarchy](#template-selection-hierarchy)
8. [Usage Examples](#usage-examples)
9. [Best Practices](#best-practices)
10. [API Reference](#api-reference)

---

## Purpose

When an AI needs to answer a question about a project, it needs context—related companies, contacts, documents, notes, etc. Without a structured approach:

- **Inconsistent**: Different features assemble context differently
- **Wasteful**: Too much irrelevant data = wasted tokens
- **Hard to maintain**: Context logic scattered across codebase
- **Not tuneable**: Can't optimize what AI "sees"

`c_contextTemplate` solves this by defining **declarative, reusable templates** that specify exactly what context to assemble.

### The Problem

```
❌ WITHOUT TEMPLATES

Feature A: "Summarize project"
  → Gets: project + notes + documents

Feature B: "Generate report"  
  → Gets: project + notes (forgot documents!)

Feature C: "Risk analysis"
  → Gets: project + opportunities + notes + documents

Result: Inconsistent AI quality, duplicated logic
```

### The Solution

```
✅ WITH TEMPLATES

All features use: "project-overview" template
  → Always gets: project + client + stakeholders + 
                 opportunity + documents + notes

Result: Consistent AI quality, single source of truth
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Consistency** | Same context assembly across all AI features |
| **Cost Savings** | 50-80% fewer tokens through field selection |
| **Better AI Output** | Focused context = more relevant answers |
| **Maintainability** | Change once, improve everywhere |
| **Debugging** | See exactly what AI receives |
| **Tenant Flexibility** | Custom templates per use case |
| **Performance** | Cacheable assembled context |
| **Testability** | A/B test context strategies |
| **Versioning** | Track template changes, rollback if needed |
| **Access Control** | Control who can create/edit templates |

---

## Schema Definition

### TypeScript Interface

```typescript
interface ContextTemplateStructuredData {
  // === IDENTITY ===
  name: string;                          // Required: Template name
  description?: string;                  // What this template is for
  
  // === APPLICABILITY ===
  applicableShardTypes: string[];        // Which shard types can use this
  
  // === SELF CONFIGURATION ===
  includeSelf: boolean;                  // Include the starting shard?
  selfFields?: string[];                 // Specific fields from self (null = all)
  
  // === RELATIONSHIP TRAVERSAL ===
  relationships: RelationshipConfig[];   // What to include
  
  // === OUTPUT CONFIGURATION ===
  format: ContextFormat;                 // How to format output
  maxTokens: number;                     // Token limit
  
  // === FIELD SELECTION ===
  fieldSelection: {                      // Per-type field configuration
    [shardTypeName: string]: FieldConfig;
  };
  
  // === ORDERING ===
  defaultOrdering?: OrderingConfig;      // How to order results
  
  // === CACHING ===
  cacheTTLSeconds?: number;              // Cache duration (0 = no cache)
  
  // === CATEGORIZATION ===
  category?: TemplateCategory;           // Template category
  tags?: string[];                       // Searchable tags
  
  // === SYSTEM FLAG ===
  isSystemTemplate: boolean;             // True for global c_ templates
}

interface RelationshipConfig {
  relationshipType: string;              // e.g., "has_client", "has_stakeholder"
  depth: number;                         // Traversal depth (1-3)
  maxCount: number;                      // Max items to include
  required: boolean;                     // Fail if not found?
  filter?: Record<string, any>;          // Additional filters
  orderBy?: string;                      // Sort field
  orderDirection?: 'asc' | 'desc';       // Sort direction
}

interface FieldConfig {
  include?: string[];                    // Fields to include (whitelist)
  exclude?: string[];                    // Fields to exclude (blacklist)
  transform?: Record<string, string>;    // Field name mappings
}

interface OrderingConfig {
  field: string;
  direction: 'asc' | 'desc';
}

type ContextFormat = 'prose' | 'structured' | 'minimal' | 'json';

type TemplateCategory = 
  | 'general' 
  | 'sales' 
  | 'support' 
  | 'technical' 
  | 'legal' 
  | 'financial' 
  | 'custom';
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Human-readable template name |
| `description` | string | ❌ | Detailed description of template purpose |
| `applicableShardTypes` | string[] | ✅ | ShardType names this template can be used with |
| `includeSelf` | boolean | ✅ | Whether to include the starting shard in context |
| `selfFields` | string[] | ❌ | Specific fields to include from self (null = all) |
| `relationships` | RelationshipConfig[] | ✅ | Relationship traversal configuration |
| `format` | ContextFormat | ✅ | Output format style |
| `maxTokens` | number | ✅ | Maximum tokens for assembled context |
| `fieldSelection` | object | ❌ | Per-ShardType field configuration |
| `defaultOrdering` | OrderingConfig | ❌ | Default sort order for results |
| `cacheTTLSeconds` | number | ❌ | How long to cache assembled context |
| `category` | TemplateCategory | ❌ | Template category for organization |
| `tags` | string[] | ❌ | Searchable tags |
| `isSystemTemplate` | boolean | ✅ | Whether this is a system (global) template |

---

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Context Template",
  "description": "AI context assembly template",
  "type": "object",
  "required": [
    "name",
    "applicableShardTypes",
    "includeSelf",
    "relationships",
    "format",
    "maxTokens",
    "isSystemTemplate"
  ],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Template name"
    },
    "description": {
      "type": "string",
      "maxLength": 500,
      "description": "Template description"
    },
    "applicableShardTypes": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1,
      "description": "ShardTypes this template can be used with"
    },
    "includeSelf": {
      "type": "boolean",
      "description": "Include the starting shard in context"
    },
    "selfFields": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Specific fields from self to include"
    },
    "relationships": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["relationshipType", "depth", "maxCount"],
        "properties": {
          "relationshipType": {
            "type": "string",
            "description": "Type of relationship to traverse"
          },
          "depth": {
            "type": "integer",
            "minimum": 1,
            "maximum": 3,
            "description": "How deep to traverse"
          },
          "maxCount": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100,
            "description": "Maximum items to include"
          },
          "required": {
            "type": "boolean",
            "default": false,
            "description": "Fail if no items found"
          },
          "filter": {
            "type": "object",
            "description": "Additional filters for items"
          },
          "orderBy": {
            "type": "string",
            "description": "Field to sort by"
          },
          "orderDirection": {
            "type": "string",
            "enum": ["asc", "desc"],
            "description": "Sort direction"
          }
        }
      },
      "description": "Relationship traversal configuration"
    },
    "format": {
      "type": "string",
      "enum": ["prose", "structured", "minimal", "json"],
      "description": "Output format style"
    },
    "maxTokens": {
      "type": "integer",
      "minimum": 500,
      "maximum": 128000,
      "description": "Maximum tokens for context"
    },
    "fieldSelection": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "include": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Fields to include"
          },
          "exclude": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Fields to exclude"
          },
          "transform": {
            "type": "object",
            "additionalProperties": { "type": "string" },
            "description": "Field name mappings"
          }
        }
      },
      "description": "Per-ShardType field configuration"
    },
    "defaultOrdering": {
      "type": "object",
      "properties": {
        "field": { "type": "string" },
        "direction": { "type": "string", "enum": ["asc", "desc"] }
      },
      "description": "Default sort order"
    },
    "cacheTTLSeconds": {
      "type": "integer",
      "minimum": 0,
      "maximum": 86400,
      "default": 300,
      "description": "Cache duration in seconds"
    },
    "category": {
      "type": "string",
      "enum": ["general", "sales", "support", "technical", "legal", "financial", "custom"],
      "default": "general",
      "description": "Template category"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Searchable tags"
    },
    "isSystemTemplate": {
      "type": "boolean",
      "description": "Whether this is a system template"
    }
  }
}
```

---

## Relationships

### Outgoing Relationships

| Type | Target | Cardinality | Description |
|------|--------|-------------|-------------|
| `template_for` | `c_assistant` | Many-to-Many | Template is used by this assistant |
| `default_template_for` | `c_project` | Many-to-Many | Default template for this project |
| `inherits_from` | `c_contextTemplate` | Many-to-One | Template extends another template |

### Relationship Diagram

```
┌────────────────────┐
│ c_contextTemplate  │
│ "Project Overview" │
└─────────┬──────────┘
          │
          │ template_for
          ▼
┌────────────────────┐
│    c_assistant     │
│   "Sales Coach"    │
└────────────────────┘

┌────────────────────┐
│ c_contextTemplate  │
│  "Legal Review"    │
└─────────┬──────────┘
          │
          │ default_template_for
          ▼
┌────────────────────┐
│     c_project      │
│  "Acme Contract"   │
└────────────────────┘

┌────────────────────┐     inherits_from     ┌────────────────────┐
│ c_contextTemplate  │ ───────────────────► │ c_contextTemplate  │
│ "Sales Deep Dive"  │                       │ "Project Overview" │
└────────────────────┘                       └────────────────────┘
```

---

## System Templates

These global templates are provided by Castiel and available to all tenants.

### Project Overview

**Purpose**: Comprehensive project context for AI insights

```typescript
{
  name: "Project Overview",
  description: "Comprehensive project context including client, stakeholders, opportunities, and recent activity",
  applicableShardTypes: ["c_project"],
  includeSelf: true,
  relationships: [
    { relationshipType: "has_client", depth: 1, maxCount: 1, required: false },
    { relationshipType: "has_stakeholder", depth: 1, maxCount: 10, required: false },
    { relationshipType: "has_opportunity", depth: 1, maxCount: 3, required: false },
    { 
      relationshipType: "has_document", 
      depth: 1, 
      maxCount: 5, 
      required: false,
      orderBy: "updatedAt",
      orderDirection: "desc"
    },
    { 
      relationshipType: "has_note", 
      depth: 1, 
      maxCount: 10, 
      required: false,
      orderBy: "date",
      orderDirection: "desc"
    }
  ],
  format: "structured",
  maxTokens: 6000,
  fieldSelection: {
    c_project: {
      include: ["name", "description", "status", "stage", "objectives", "milestones", "startDate", "targetEndDate"]
    },
    c_company: {
      include: ["name", "industry", "employeeCount", "description", "website"]
    },
    c_contact: {
      include: ["name", "jobTitle", "role", "email", "seniorityLevel"]
    },
    c_opportunity: {
      include: ["name", "value", "currency", "stage", "probability", "expectedCloseDate"]
    },
    c_document: {
      include: ["name", "documentType", "status", "summary", "version"]
    },
    c_note: {
      include: ["name", "noteType", "content", "date", "sentiment", "actionItems"]
    }
  },
  cacheTTLSeconds: 300,
  category: "general",
  isSystemTemplate: true
}
```

### Deal Analysis

**Purpose**: Opportunity analysis context for sales insights

```typescript
{
  name: "Deal Analysis",
  description: "Opportunity analysis context including company details, stakeholders, and related documents",
  applicableShardTypes: ["c_opportunity"],
  includeSelf: true,
  relationships: [
    { relationshipType: "opportunity_for", depth: 1, maxCount: 1, required: true },
    { relationshipType: "has_stakeholder", depth: 1, maxCount: 10, required: false },
    { 
      relationshipType: "has_document", 
      depth: 1, 
      maxCount: 5, 
      required: false,
      filter: { documentType: ["proposal", "contract", "quote"] }
    },
    { 
      relationshipType: "has_note", 
      depth: 1, 
      maxCount: 15, 
      required: false,
      orderBy: "date",
      orderDirection: "desc"
    }
  ],
  format: "structured",
  maxTokens: 8000,
  fieldSelection: {
    c_opportunity: {
      include: ["name", "description", "value", "currency", "stage", "probability", "expectedCloseDate", "nextSteps", "competitorName", "lostReason"]
    },
    c_company: {
      include: ["name", "industry", "employeeCount", "annualRevenue", "status", "description"]
    },
    c_contact: {
      include: ["name", "jobTitle", "role", "seniorityLevel", "email", "phone"]
    },
    c_document: {
      include: ["name", "documentType", "status", "summary", "version", "sentDate"]
    },
    c_note: {
      include: ["name", "noteType", "content", "date", "sentiment", "decisions", "actionItems"]
    }
  },
  cacheTTLSeconds: 300,
  category: "sales",
  isSystemTemplate: true
}
```

### Contact Briefing

**Purpose**: Contact context for meeting preparation

```typescript
{
  name: "Contact Briefing",
  description: "Contact context for meeting preparation including company, projects, and interaction history",
  applicableShardTypes: ["c_contact"],
  includeSelf: true,
  relationships: [
    { relationshipType: "works_at", depth: 1, maxCount: 1, required: false },
    { relationshipType: "stakeholder_in", depth: 1, maxCount: 5, required: false },
    { 
      relationshipType: "has_note", 
      depth: 1, 
      maxCount: 10, 
      required: false,
      orderBy: "date",
      orderDirection: "desc"
    }
  ],
  format: "prose",
  maxTokens: 4000,
  fieldSelection: {
    c_contact: {
      include: ["name", "firstName", "lastName", "jobTitle", "department", "role", "seniorityLevel", "email", "phone", "linkedInUrl", "notes"]
    },
    c_company: {
      include: ["name", "industry", "employeeCount", "description", "website"]
    },
    c_project: {
      include: ["name", "status", "description"]
    },
    c_note: {
      include: ["name", "content", "date", "sentiment"]
    }
  },
  cacheTTLSeconds: 600,
  category: "general",
  isSystemTemplate: true
}
```

### Document Summary

**Purpose**: Document context for analysis and summarization

```typescript
{
  name: "Document Summary",
  description: "Document context with related project and notes for analysis",
  applicableShardTypes: ["c_document"],
  includeSelf: true,
  selfFields: ["name", "documentType", "status", "description", "version"],
  relationships: [
    { relationshipType: "document_for", depth: 1, maxCount: 1, required: false },
    { 
      relationshipType: "has_note", 
      depth: 1, 
      maxCount: 5, 
      required: false,
      filter: { noteType: ["review", "feedback", "comment"] }
    }
  ],
  format: "structured",
  maxTokens: 4000,
  fieldSelection: {
    c_project: {
      include: ["name", "description", "status"]
    },
    c_note: {
      include: ["name", "content", "date", "author"]
    }
  },
  cacheTTLSeconds: 600,
  category: "general",
  isSystemTemplate: true
}
```

---

## Template Selection Hierarchy

When an AI operation starts, the system selects the appropriate template using this hierarchy:

```
1. User-specified template (explicit)
         │
         ▼ (not found)
2. Assistant's linked template
         │
         ▼ (not found)
3. Shard's default template (via relationship)
         │
         ▼ (not found)
4. System template for ShardType
```

### Implementation

```typescript
async function selectTemplate(
  shardId: string,
  tenantId: string,
  options?: {
    preferredTemplateId?: string;
    assistantId?: string;
  }
): Promise<Shard> {
  // 1. User-specified template
  if (options?.preferredTemplateId) {
    const template = await getContextTemplate(options.preferredTemplateId, tenantId);
    if (template) return template;
  }
  
  // 2. Assistant's linked template
  if (options?.assistantId) {
    const assistantTemplates = await getRelatedShards(
      options.assistantId,
      tenantId,
      'template_for',
      'incoming'  // Templates pointing TO this assistant
    );
    if (assistantTemplates.length > 0) return assistantTemplates[0];
  }
  
  // 3. Shard's default template
  const shardTemplates = await getRelatedShards(
    shardId,
    tenantId,
    'default_template_for',
    'incoming'
  );
  if (shardTemplates.length > 0) return shardTemplates[0];
  
  // 4. System template for this shard type
  const shard = await getShard(shardId, tenantId);
  const shardType = await getShardType(shard.shardTypeId);
  return await findSystemTemplateForType(shardType.name);
}
```

---

## Usage Examples

### Loading and Using a Template

```typescript
async function assembleContext(
  shardId: string,
  templateIdOrName: string,
  tenantId: string
): Promise<AssembledContext> {
  // 1. Load the template shard
  const templateShard = await getContextTemplate(templateIdOrName, tenantId);
  const template = templateShard.structuredData as ContextTemplateStructuredData;
  
  // 2. Load the target shard
  const shard = await getShard(shardId, tenantId);
  
  // 3. Verify template applies
  const shardType = await getShardType(shard.shardTypeId);
  if (!template.applicableShardTypes.includes(shardType.name)) {
    throw new Error(`Template "${template.name}" not applicable to ${shardType.name}`);
  }
  
  // 4. Assemble context
  const context: AssembledContext = {
    templateId: templateShard.id,
    templateName: template.name,
    self: null,
    related: {},
    metadata: {
      totalShards: 0,
      tokenEstimate: 0
    }
  };
  
  // 5. Include self if configured
  if (template.includeSelf) {
    const selfConfig = template.fieldSelection?.[shardType.name];
    context.self = selectFields(shard, selfConfig);
    context.metadata.totalShards++;
  }
  
  // 6. Traverse relationships
  for (const relConfig of template.relationships) {
    const related = await traverseRelationship(shard, relConfig, tenantId);
    context.related[relConfig.relationshipType] = related.map(r => {
      const rTypeName = getShardTypeName(r.shardTypeId);
      const fieldConfig = template.fieldSelection?.[rTypeName];
      return selectFields(r, fieldConfig);
    });
    context.metadata.totalShards += related.length;
  }
  
  // 7. Estimate tokens
  context.metadata.tokenEstimate = estimateTokens(context);
  
  // 8. Truncate if over limit
  if (context.metadata.tokenEstimate > template.maxTokens) {
    context = truncateContext(context, template.maxTokens);
  }
  
  // 9. Format output
  return formatContext(context, template.format);
}
```

### Creating a Custom Tenant Template

```typescript
// POST /api/v1/shards
{
  "shardTypeId": "c_contextTemplate",
  "structuredData": {
    "name": "Legal Document Review",
    "description": "Context template for legal team document reviews",
    "applicableShardTypes": ["c_document"],
    "includeSelf": true,
    "relationships": [
      {
        "relationshipType": "document_for",
        "depth": 1,
        "maxCount": 1,
        "required": true
      },
      {
        "relationshipType": "has_note",
        "depth": 1,
        "maxCount": 20,
        "required": false,
        "filter": { "tags": { "$contains": "legal" } },
        "orderBy": "date",
        "orderDirection": "desc"
      },
      {
        "relationshipType": "reviewed_by",
        "depth": 1,
        "maxCount": 5,
        "required": false
      }
    ],
    "format": "structured",
    "maxTokens": 10000,
    "fieldSelection": {
      "c_document": {
        "include": ["name", "documentType", "status", "version", "legalTerms", "expirationDate"]
      },
      "c_project": {
        "include": ["name", "description", "contractValue"]
      },
      "c_note": {
        "include": ["name", "content", "date", "author", "legalRiskLevel"]
      },
      "c_contact": {
        "include": ["name", "jobTitle", "role"]
      }
    },
    "cacheTTLSeconds": 120,
    "category": "legal",
    "tags": ["legal", "review", "compliance"],
    "isSystemTemplate": false
  }
}
```

### Linking Template to Assistant

```typescript
// Link template to assistant via internal_relationships
{
  "internal_relationships": [
    {
      "targetShardId": "assistant-uuid-123",
      "relationshipType": "template_for",
      "label": "Default template for Sales Coach"
    }
  ]
}
```

---

## Best Practices

### 1. Start Minimal, Expand as Needed

```typescript
// ✅ Good: Start with essential relationships
relationships: [
  { relationshipType: "has_client", depth: 1, maxCount: 1 },
  { relationshipType: "has_note", depth: 1, maxCount: 5 }
]

// ❌ Avoid: Including everything "just in case"
relationships: [
  { relationshipType: "has_client", depth: 3, maxCount: 10 },
  { relationshipType: "has_note", depth: 2, maxCount: 50 },
  { relationshipType: "has_document", depth: 2, maxCount: 20 },
  // ... too much
]
```

### 2. Use Field Selection Aggressively

```typescript
// ✅ Good: Only include fields AI needs
fieldSelection: {
  c_contact: {
    include: ["name", "jobTitle", "role"]  // Just the essentials
  }
}

// ❌ Avoid: Including all fields
fieldSelection: {
  c_contact: {
    // No include = all fields (wasteful)
  }
}
```

### 3. Set Appropriate Cache TTL

| Template Type | Recommended TTL |
|---------------|-----------------|
| Frequently changing (notes, tasks) | 60-300 seconds |
| Stable data (contacts, companies) | 600-3600 seconds |
| Static data (archived projects) | 3600+ seconds |

### 4. Use Filters for Relevance

```typescript
// ✅ Good: Filter to relevant items
{
  relationshipType: "has_note",
  filter: { 
    date: { "$gte": "last30days" },
    noteType: { "$in": ["meeting", "decision"] }
  }
}

// ❌ Avoid: All notes without filtering
{
  relationshipType: "has_note",
  maxCount: 100  // Too many, no filter
}
```

### 5. Document Template Purpose

Always include a clear description:

```typescript
{
  name: "Quarterly Business Review",
  description: "Comprehensive context for QBR preparation including metrics, stakeholder history, and key decisions from the past quarter"
}
```

---

## API Reference

### Create Template

```http
POST /api/v1/shards
Content-Type: application/json

{
  "shardTypeId": "c_contextTemplate",
  "structuredData": { ... }
}
```

### List Templates

```http
GET /api/v1/shards?shardTypeId=c_contextTemplate
```

### Get Template by Name

```http
GET /api/v1/shards?shardTypeId=c_contextTemplate&structuredData.name=Project%20Overview
```

### Assemble Context Using Template

```http
POST /api/v1/ai/context
Content-Type: application/json

{
  "shardId": "project-uuid-123",
  "templateId": "template-uuid-456",
  "options": {
    "debug": true
  }
}
```

### Response

```json
{
  "success": true,
  "context": {
    "templateId": "template-uuid-456",
    "templateName": "Project Overview",
    "self": { ... },
    "related": {
      "has_client": [{ ... }],
      "has_stakeholder": [{ ... }, { ... }],
      "has_note": [{ ... }, { ... }, { ... }]
    }
  },
  "metadata": {
    "totalShards": 12,
    "tokenEstimate": 4523,
    "truncated": false,
    "cachedUntil": "2025-11-29T15:30:00Z"
  },
  "debug": {
    "relationshipsTraversed": {
      "has_client": { "found": 1, "included": 1 },
      "has_stakeholder": { "found": 8, "included": 5 },
      "has_note": { "found": 45, "included": 10 }
    },
    "fieldsSelected": { ... },
    "executionTimeMs": 127
  }
}
```

---

## Format Options

| Format | Description | Use Case |
|--------|-------------|----------|
| `prose` | Natural language paragraphs | Reports, summaries |
| `structured` | Headers, sections, bullet points | Detailed analysis |
| `minimal` | Key-value pairs only | Quick lookups, low tokens |
| `json` | Raw JSON structure | Programmatic use |

### Example Outputs

#### Prose Format

```
Project "Acme Migration" is currently in the implementation phase. 
The client, Acme Corp, is a mid-sized technology company with 500 
employees. Key stakeholders include John Smith (CTO) and Jane Doe 
(Project Manager). The associated opportunity is valued at $250,000 
with an 80% probability of closing by December 2025.

Recent activity shows positive sentiment, with the last meeting 
resulting in approval of the technical architecture...
```

#### Structured Format

```
## Project Overview
- Name: Acme Migration
- Status: Active
- Stage: Implementation

## Client
- Company: Acme Corp
- Industry: Technology
- Size: 500 employees

## Key Stakeholders
1. John Smith - CTO (Executive Sponsor)
2. Jane Doe - Project Manager (Day-to-day Contact)

## Opportunity
- Value: $250,000
- Stage: Negotiation
- Probability: 80%

## Recent Notes
- [2025-11-28] Architecture approved (Positive)
- [2025-11-25] Budget discussion (Neutral)
```

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team






