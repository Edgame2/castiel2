# c_generatedContent - Generated Content ShardType

## Overview

The `c_generatedContent` ShardType stores AI-generated content (presentations, documents, webpages). It contains the Universal Intermediate Format (UIF), generation metadata, rendered outputs, and relationships to source Shards and templates.

> **Philosophy**: "Every generation is a Shard—versioned, searchable, and connected to its origins."

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Schema Definition](#schema-definition)
3. [Generation Status](#generation-status)
4. [Relationships](#relationships)
5. [Storage Structure](#storage-structure)
6. [Lifecycle](#lifecycle)
7. [Examples](#examples)
8. [Best Practices](#best-practices)
9. [API Reference](#api-reference)

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_generatedContent` |
| **Display Name** | Generated Content |
| **Category** | DOCUMENT |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `FileOutput` |
| **Color** | `#10b981` (Emerald) |

---

## Schema Definition

### TypeScript Interface

```typescript
interface GeneratedContentStructuredData {
  // === IDENTITY ===
  name: string;                          // Required: Content name
  description?: string;                  // Content description
  
  // === TYPE ===
  documentType: DocumentType;            // presentation, document, webpage
  
  // === STATUS ===
  status: GenerationStatus;              // Current status
  
  // === GENERATED CONTENT ===
  uif: UniversalIntermediateFormat;      // The generated UIF
  
  // === GENERATION METADATA ===
  generationMetadata: {
    // AI details
    model: string;                       // Model used (e.g., "gpt-4")
    assistantId?: string;                // c_assistant used
    tokensUsed: number;                  // Total tokens consumed
    generationTimeMs: number;            // Generation duration
    
    // Template details
    templateId: string;                  // c_contentTemplate used
    templateName: string;                // Template name (snapshot)
    templateVersion: string;             // Version at generation time
    
    // Context details
    contextTemplateId?: string;          // c_contextTemplate used
    sourceShardId?: string;              // Source Shard (project, etc.)
    sourceShardType?: string;            // Type of source Shard
    
    // Inputs
    userPrompt: string;                  // Original user prompt
    userInputs?: Record<string, any>;    // User-provided field values
    assembledContext?: string;           // Context snapshot (optional)
    
    // Timestamps
    generatedAt: Date;
    generatedBy: string;                 // User ID
  };
  
  // === RENDERED OUTPUTS ===
  outputs?: {
    [format: string]: OutputInfo;
  };
  
  // === RETENTION ===
  expiresAt?: Date;                      // When content expires
  
  // === ITERATION ===
  version: number;                       // Iteration count (1, 2, 3...)
  parentGenerationId?: string;           // Previous version
}

interface OutputInfo {
  format: OutputFormat;
  url: string;                           // Download URL
  path: string;                          // Storage path
  fileSize: number;                      // Size in bytes
  pageCount: number;                     // Number of pages
  renderedAt: Date;
  expiresAt: Date;                       // URL expiration
  renderTimeMs: number;
}

type DocumentType = 'presentation' | 'document' | 'webpage';

enum GenerationStatus {
  GENERATING = 'generating',             // AI is generating UIF
  GENERATED = 'generated',               // UIF complete, not rendered
  RENDERING = 'rendering',               // Rendering in progress
  COMPLETED = 'completed',               // All requested renders done
  FAILED = 'failed',                     // Generation or render failed
  EXPIRED = 'expired'                    // Past retention date
}

type OutputFormat = 'html' | 'pptx' | 'pdf' | 'markdown' | 'google_slides';
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_generatedContent.json",
  "title": "Generated Content",
  "description": "AI-generated content output",
  "type": "object",
  "required": [
    "name",
    "documentType",
    "status",
    "uif",
    "generationMetadata",
    "version"
  ],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Content name"
    },
    "description": {
      "type": "string",
      "maxLength": 2000,
      "description": "Content description"
    },
    "documentType": {
      "type": "string",
      "enum": ["presentation", "document", "webpage"],
      "description": "Output type"
    },
    "status": {
      "type": "string",
      "enum": ["generating", "generated", "rendering", "completed", "failed", "expired"],
      "description": "Generation status"
    },
    "uif": {
      "$ref": "uif.json",
      "description": "Universal Intermediate Format"
    },
    "generationMetadata": {
      "type": "object",
      "required": ["model", "tokensUsed", "generationTimeMs", "templateId", "templateName", "templateVersion", "userPrompt", "generatedAt", "generatedBy"],
      "properties": {
        "model": { "type": "string" },
        "assistantId": { "type": "string", "format": "uuid" },
        "tokensUsed": { "type": "integer", "minimum": 0 },
        "generationTimeMs": { "type": "integer", "minimum": 0 },
        "templateId": { "type": "string", "format": "uuid" },
        "templateName": { "type": "string" },
        "templateVersion": { "type": "string" },
        "contextTemplateId": { "type": "string", "format": "uuid" },
        "sourceShardId": { "type": "string", "format": "uuid" },
        "sourceShardType": { "type": "string" },
        "userPrompt": { "type": "string" },
        "userInputs": { "type": "object" },
        "assembledContext": { "type": "string" },
        "generatedAt": { "type": "string", "format": "date-time" },
        "generatedBy": { "type": "string", "format": "uuid" }
      }
    },
    "outputs": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "format": { "type": "string" },
          "url": { "type": "string", "format": "uri" },
          "path": { "type": "string" },
          "fileSize": { "type": "integer" },
          "pageCount": { "type": "integer" },
          "renderedAt": { "type": "string", "format": "date-time" },
          "expiresAt": { "type": "string", "format": "date-time" },
          "renderTimeMs": { "type": "integer" }
        }
      }
    },
    "expiresAt": {
      "type": "string",
      "format": "date-time",
      "description": "Retention expiration"
    },
    "version": {
      "type": "integer",
      "minimum": 1,
      "description": "Iteration version"
    },
    "parentGenerationId": {
      "type": "string",
      "format": "uuid",
      "description": "Previous version's ID"
    }
  }
}
```

---

## Generation Status

### Status Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STATUS LIFECYCLE                                 │
└─────────────────────────────────────────────────────────────────────────┘

     ┌────────────┐
     │   START    │
     └─────┬──────┘
           │
           ▼
     ┌────────────┐
     │ GENERATING │ ─────────── AI is creating UIF
     └─────┬──────┘
           │
           ├──────── ERROR ────────┐
           │                       │
           ▼                       ▼
     ┌────────────┐          ┌────────────┐
     │ GENERATED  │          │   FAILED   │
     └─────┬──────┘          └────────────┘
           │
           │ (render requested)
           ▼
     ┌────────────┐
     │ RENDERING  │ ─────────── Converting to outputs
     └─────┬──────┘
           │
           ├──────── ERROR ────────┐
           │                       │
           ▼                       ▼
     ┌────────────┐          ┌────────────┐
     │ COMPLETED  │          │   FAILED   │
     └─────┬──────┘          └────────────┘
           │
           │ (past expiresAt)
           ▼
     ┌────────────┐
     │  EXPIRED   │
     └────────────┘
```

### Status Descriptions

| Status | Description | Next Steps |
|--------|-------------|------------|
| `generating` | AI is producing UIF | Wait for completion |
| `generated` | UIF ready, no renders | Request render |
| `rendering` | Converting to formats | Wait for completion |
| `completed` | All renders done | Download outputs |
| `failed` | Error occurred | View error, retry |
| `expired` | Past retention date | Cannot download |

---

## Relationships

### Outgoing Relationships

| Type | Target | Cardinality | Description |
|------|--------|-------------|-------------|
| `generated_for` | `c_project` | Many-to-One | Source project |
| `generated_for` | `c_opportunity` | Many-to-One | Source opportunity |
| `generated_for` | `c_company` | Many-to-One | Source company |
| `generated_from` | `c_contentTemplate` | Many-to-One | Template used |
| `used_assistant` | `c_assistant` | Many-to-One | AI assistant used |
| `previous_version` | `c_generatedContent` | Many-to-One | Parent iteration |

### Incoming Relationships

| From | Type | Description |
|------|------|-------------|
| `c_project` | `has_generated` | Project's generated content |
| `c_opportunity` | `has_generated` | Opportunity's generated content |
| `c_generatedContent` | `previous_version` | Next iteration |

### Relationship Diagram

```
┌─────────────────────┐
│     c_project       │
│   "Acme Security"   │
└─────────┬───────────┘
          │ has_generated
          ▼
┌─────────────────────┐         generated_from         ┌─────────────────────┐
│ c_generatedContent  │ ────────────────────────────► │  c_contentTemplate  │
│ "Acme Sales Deck"   │                                │  "Sales Pitch Deck" │
└─────────┬───────────┘                                └─────────────────────┘
          │
          ├─── used_assistant ──────────────────────► c_assistant
          │                                           "Sales Coach"
          │
          └─── previous_version ────────────────────► c_generatedContent
                                                      "Acme Sales Deck v1"
```

---

## Storage Structure

### Blob Storage Layout

```
Azure Blob Storage
└── generatedContent/
    └── {tenantId}/
        └── {shardId}/
            ├── uif.json              # Universal Intermediate Format
            ├── metadata.json         # Generation metadata
            ├── output.html           # HTML render
            ├── output.pptx           # PowerPoint render
            ├── output.pdf            # PDF render
            ├── output.md             # Markdown render
            └── assets/
                ├── chart-1.png       # Generated charts
                ├── chart-2.png
                └── image-1.png       # Processed images
```

### URL Structure

```
https://{storage}.blob.core.windows.net/
  generatedContent/
    {tenantId}/
      {shardId}/
        output.pptx?{sas_token}
```

### Signed URL Details

| Property | Value |
|----------|-------|
| Default Expiration | 24 hours |
| Permissions | Read only |
| IP Restriction | Optional (per tenant) |

---

## Lifecycle

### Creation

```typescript
// 1. User requests generation
POST /api/v1/content/generate
{
  "prompt": "Sales deck for Acme Corp security solution",
  "projectId": "project-123",
  "outputFormats": ["html", "pptx"]
}

// 2. System creates c_generatedContent Shard with status: 'generating'

// 3. AI generates UIF, status → 'generated'

// 4. Renderers produce outputs, status → 'completed'
```

### Iteration (Regeneration)

```typescript
// 1. User requests regeneration of section
POST /api/v1/content/{id}/regenerate-section
{
  "sectionId": "page-3",
  "prompt": "Make this slide more focused on ROI"
}

// 2. System creates NEW c_generatedContent Shard
//    - version: previousVersion + 1
//    - parentGenerationId: previous Shard ID
//    - Links via 'previous_version' relationship

// 3. Both versions remain (full history)
```

### Expiration

```typescript
// Scheduled job runs daily
async function expireOldContent(): Promise<void> {
  const expired = await findShards({
    shardTypeId: 'c_generatedContent',
    'structuredData.expiresAt': { $lt: new Date() },
    'structuredData.status': { $ne: 'expired' }
  });
  
  for (const shard of expired) {
    // 1. Delete blob storage files
    await deleteBlob(`generatedContent/${shard.tenantId}/${shard.id}/`);
    
    // 2. Update status
    await updateShard(shard.id, {
      'structuredData.status': 'expired',
      'structuredData.outputs': null
    });
  }
}
```

---

## Examples

### Complete Generated Content Shard

```json
{
  "id": "gen-content-uuid",
  "shardTypeId": "c_generatedContent",
  "tenantId": "tenant-123",
  "userId": "user-456",
  
  "structuredData": {
    "name": "Acme Corp Security Solution - Sales Deck",
    "description": "Sales presentation for Acme Corp enterprise security opportunity",
    "documentType": "presentation",
    "status": "completed",
    
    "uif": {
      "version": "1.0",
      "documentType": "presentation",
      "title": "Enterprise Security Solution",
      "theme": {
        "primaryColor": "#0066FF",
        "secondaryColor": "#00AACC",
        "backgroundColor": "#FFFFFF",
        "textColor": "#1A1A1A",
        "fontFamily": "Inter, sans-serif",
        "fontSize": { "title": 48, "heading": 32, "body": 16 }
      },
      "pages": [
        {
          "pageNumber": 1,
          "layout": "title-slide",
          "elements": [
            {
              "type": "text",
              "value": "Enterprise Security Solution",
              "position": { "x": "10%", "y": "40%" },
              "size": { "width": "80%", "height": "auto" },
              "style": { "fontSize": 56, "fontWeight": 700 }
            }
          ]
        }
      ]
    },
    
    "generationMetadata": {
      "model": "gpt-4",
      "assistantId": "assistant-sales-coach",
      "tokensUsed": 4523,
      "generationTimeMs": 8200,
      
      "templateId": "template-sales-pitch",
      "templateName": "Sales Pitch Deck",
      "templateVersion": "1.0.0",
      
      "contextTemplateId": "ctx-template-project-overview",
      "sourceShardId": "project-acme-security",
      "sourceShardType": "c_project",
      
      "userPrompt": "Create a sales deck for our enterprise security solution pitch to Acme Corp",
      "userInputs": {
        "company_name": "Acme Corporation",
        "target_audience": "CISOs and IT Directors"
      },
      
      "generatedAt": "2025-11-30T10:00:00Z",
      "generatedBy": "user-456"
    },
    
    "outputs": {
      "html": {
        "format": "html",
        "url": "https://storage.blob.core.windows.net/.../output.html?sas=...",
        "path": "generatedContent/tenant-123/gen-content-uuid/output.html",
        "fileSize": 245678,
        "pageCount": 10,
        "renderedAt": "2025-11-30T10:00:15Z",
        "expiresAt": "2025-12-01T10:00:15Z",
        "renderTimeMs": 1200
      },
      "pptx": {
        "format": "pptx",
        "url": "https://storage.blob.core.windows.net/.../output.pptx?sas=...",
        "path": "generatedContent/tenant-123/gen-content-uuid/output.pptx",
        "fileSize": 1234567,
        "pageCount": 10,
        "renderedAt": "2025-11-30T10:00:20Z",
        "expiresAt": "2025-12-01T10:00:20Z",
        "renderTimeMs": 3500
      }
    },
    
    "expiresAt": "2026-05-30T10:00:00Z",
    "version": 1,
    "parentGenerationId": null
  },
  
  "internal_relationships": [
    {
      "targetShardId": "project-acme-security",
      "relationshipType": "generated_for",
      "label": "Generated for Acme Security Project"
    },
    {
      "targetShardId": "template-sales-pitch",
      "relationshipType": "generated_from",
      "label": "Generated from Sales Pitch Deck template"
    },
    {
      "targetShardId": "assistant-sales-coach",
      "relationshipType": "used_assistant",
      "label": "Generated with Sales Coach assistant"
    }
  ],
  
  "metadata": {
    "tags": ["sales", "presentation", "acme", "security"]
  },
  
  "status": "active",
  "createdAt": "2025-11-30T10:00:00Z",
  "updatedAt": "2025-11-30T10:00:20Z"
}
```

### Iteration Example (v2)

```json
{
  "id": "gen-content-v2-uuid",
  "structuredData": {
    "name": "Acme Corp Security Solution - Sales Deck v2",
    "status": "completed",
    
    "generationMetadata": {
      "userPrompt": "Regenerate slide 3 with more focus on ROI and cost savings",
      "generatedAt": "2025-11-30T14:00:00Z"
    },
    
    "version": 2,
    "parentGenerationId": "gen-content-uuid"
  },
  
  "internal_relationships": [
    {
      "targetShardId": "gen-content-uuid",
      "relationshipType": "previous_version",
      "label": "Version 1"
    }
  ]
}
```

---

## Best Practices

### 1. Always Link to Source

```typescript
// ✅ Good - linked to source
internal_relationships: [
  { targetShardId: "project-123", relationshipType: "generated_for" },
  { targetShardId: "template-456", relationshipType: "generated_from" }
]

// ❌ Bad - orphaned content
internal_relationships: []
```

### 2. Preserve Generation Context

```typescript
// Store enough context to reproduce
generationMetadata: {
  userPrompt: "...",
  userInputs: { ... },
  templateVersion: "1.0.0",  // Snapshot version
  assembledContext: "..."    // Optional: full context
}
```

### 3. Use Version Chain

```typescript
// For iterations, always link
{
  version: 2,
  parentGenerationId: "previous-uuid"
}
```

### 4. Set Appropriate Retention

```typescript
// Based on content value
expiresAt: addDays(new Date(), 
  isImportant ? 365 : 180
)
```

### 5. Refresh Download URLs

```typescript
// URLs expire - provide refresh endpoint
GET /api/v1/content/{id}/download-url?format=pptx
```

---

## API Reference

### Generate Content

```http
POST /api/v1/content/generate
Content-Type: application/json

{
  "prompt": "Sales deck for SaaS product",
  "projectId": "project-123",
  "templateId": "template-456",
  "outputFormats": ["html", "pptx"],
  "userInputs": { "company_name": "Acme" }
}
```

### Get Generated Content

```http
GET /api/v1/content/{id}
```

### Get Download URL

```http
GET /api/v1/content/{id}/download-url?format=pptx
```

### Regenerate Section

```http
POST /api/v1/content/{id}/regenerate-section
Content-Type: application/json

{
  "sectionId": "page-3",
  "prompt": "Make more concise"
}
```

### List Generated Content

```http
GET /api/v1/shards?shardTypeId=c_generatedContent&status=completed
```

### Get Version History

```http
GET /api/v1/content/{id}/versions
```

---

## Related Documentation

- [Content Generation README](../../content-generation/README.md)
- [UIF Specification](../../content-generation/UIF-SPECIFICATION.md)
- [c_contentTemplate](./c_contentTemplate.md)
- [c_project](./c_project.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team






