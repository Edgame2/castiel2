# c_contentTemplate - Content Template ShardType

## Overview

The `c_contentTemplate` ShardType defines reusable templates for AI-generated content (presentations, documents, webpages). Unlike `c_contextTemplate` which defines *what data the AI sees*, `c_contentTemplate` defines *what the AI produces*—the structure, layout, and placeholders for generated output.

> **Philosophy**: "Structure meets creativity—templates provide the skeleton, AI fills the soul."

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Comparison with c_contextTemplate](#comparison-with-c_contexttemplate)
3. [Schema Definition](#schema-definition)
4. [Field Requirements](#field-requirements)
5. [UI Layout (UIF Template)](#ui-layout-uif-template)
6. [Relationships](#relationships)
7. [System Templates](#system-templates)
8. [Template Matching](#template-matching)
9. [Examples](#examples)
10. [Best Practices](#best-practices)
11. [API Reference](#api-reference)

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_contentTemplate` |
| **Display Name** | Content Template |
| **Category** | CONFIGURATION |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `Layout` |
| **Color** | `#06b6d4` (Cyan) |

---

## Comparison with c_contextTemplate

| Aspect | c_contextTemplate | c_contentTemplate |
|--------|-------------------|-------------------|
| **Purpose** | Defines AI input context | Defines AI output structure |
| **Controls** | What data AI sees | What AI produces |
| **Contains** | Relationships, field selection | Layout, placeholders, theme |
| **Used For** | Context assembly | Content generation |
| **Output** | Assembled context JSON | Universal Intermediate Format |

```
┌──────────────────────┐          ┌──────────────────────┐
│  c_contextTemplate   │          │  c_contentTemplate   │
│                      │          │                      │
│  "What AI sees"      │    →     │  "What AI produces"  │
│                      │          │                      │
│  • Relationships     │          │  • Page layouts      │
│  • Field selection   │          │  • Placeholders      │
│  • Token limits      │          │  • Theme/styling     │
│  • Ordering          │          │  • Field requirements│
└──────────────────────┘          └──────────────────────┘
         │                                  │
         ▼                                  ▼
   Assembled Context  ───────────────→  AI Generator  ───→  UIF Output
```

---

## Schema Definition

### TypeScript Interface

```typescript
interface ContentTemplateStructuredData {
  // === IDENTITY ===
  name: string;                          // Required: Template name
  description?: string;                  // Template purpose
  
  // === CATEGORIZATION ===
  category: TemplateCategory;            // Template category
  documentType: DocumentType;            // Output type
  tags?: string[];                       // Searchable tags
  
  // === TEMPLATE STRUCTURE ===
  uiLayout: UIFTemplate;                 // Partial UIF with placeholders
  defaultTheme: Theme;                   // Default visual theme
  pageCount: number;                     // Number of pages/slides
  
  // === FIELD REQUIREMENTS ===
  requiredFields: FieldRequirement[];    // Fields needed for generation
  
  // === AI CONFIGURATION ===
  defaultModel?: string;                 // AI model to use
  defaultAssistantId?: string;           // c_assistant to use
  contextTemplateId?: string;            // c_contextTemplate to use
  generationPrompt?: string;             // Custom generation prompt
  temperature?: number;                  // AI creativity (0-1)
  
  // === CHART DATA ===
  chartDataConfig?: ChartDataConfig;     // Chart data source config
  
  // === SYSTEM FLAG ===
  isSystemTemplate: boolean;             // Global template flag
  
  // === VERSIONING ===
  templateVersion: string;               // Semantic version
  
  // === EMBEDDING (auto-populated) ===
  embedding?: number[];                  // For template matching
}

type TemplateCategory = 
  | 'sales'
  | 'report'
  | 'proposal'
  | 'executive'
  | 'technical'
  | 'training'
  | 'marketing'
  | 'general';

type DocumentType = 
  | 'presentation'
  | 'document'
  | 'webpage';

interface Theme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontFamilyHeading?: string;
  fontSize: {
    title: number;
    heading: number;
    subheading: number;
    body: number;
    caption: number;
  };
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_contentTemplate.json",
  "title": "Content Template",
  "description": "Template for AI-generated content",
  "type": "object",
  "required": [
    "name",
    "category",
    "documentType",
    "uiLayout",
    "defaultTheme",
    "pageCount",
    "requiredFields",
    "isSystemTemplate",
    "templateVersion"
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
      "maxLength": 1000,
      "description": "Template description"
    },
    "category": {
      "type": "string",
      "enum": ["sales", "report", "proposal", "executive", "technical", "training", "marketing", "general"],
      "description": "Template category"
    },
    "documentType": {
      "type": "string",
      "enum": ["presentation", "document", "webpage"],
      "description": "Output document type"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Searchable tags"
    },
    "uiLayout": {
      "$ref": "#/definitions/UIFTemplate",
      "description": "Partial UIF with placeholders"
    },
    "defaultTheme": {
      "$ref": "#/definitions/Theme",
      "description": "Default theme"
    },
    "pageCount": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "description": "Number of pages"
    },
    "requiredFields": {
      "type": "array",
      "items": { "$ref": "#/definitions/FieldRequirement" },
      "description": "Fields needed for generation"
    },
    "defaultModel": {
      "type": "string",
      "description": "AI model identifier"
    },
    "defaultAssistantId": {
      "type": "string",
      "format": "uuid",
      "description": "Default c_assistant"
    },
    "contextTemplateId": {
      "type": "string",
      "format": "uuid",
      "description": "c_contextTemplate for context assembly"
    },
    "generationPrompt": {
      "type": "string",
      "maxLength": 5000,
      "description": "Custom generation instructions"
    },
    "temperature": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "default": 0.7,
      "description": "AI creativity level"
    },
    "chartDataConfig": {
      "$ref": "#/definitions/ChartDataConfig",
      "description": "Chart data configuration"
    },
    "isSystemTemplate": {
      "type": "boolean",
      "description": "Is this a system (global) template"
    },
    "templateVersion": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version"
    }
  },
  "definitions": {
    "FieldRequirement": {
      "type": "object",
      "required": ["fieldName", "type"],
      "properties": {
        "fieldName": { "type": "string" },
        "type": {
          "type": "string",
          "enum": ["required", "ai_fillable", "optional"]
        },
        "description": { "type": "string" },
        "defaultValue": {},
        "aiPrompt": { "type": "string" },
        "validation": {
          "type": "object",
          "properties": {
            "type": { "type": "string" },
            "minLength": { "type": "integer" },
            "maxLength": { "type": "integer" },
            "pattern": { "type": "string" }
          }
        }
      }
    },
    "ChartDataConfig": {
      "type": "object",
      "properties": {
        "defaultDataSource": {
          "type": "string",
          "enum": ["shards", "user", "ai"]
        },
        "shardDataMapping": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "field": { "type": "string" },
              "shardType": { "type": "string" },
              "shardField": { "type": "string" }
            }
          }
        },
        "aiPrompt": { "type": "string" }
      }
    },
    "Theme": {
      "type": "object",
      "required": ["primaryColor", "secondaryColor", "backgroundColor", "textColor", "fontFamily", "fontSize"],
      "properties": {
        "primaryColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "secondaryColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "backgroundColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "textColor": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "fontFamily": { "type": "string" },
        "fontFamilyHeading": { "type": "string" },
        "fontSize": {
          "type": "object",
          "properties": {
            "title": { "type": "integer" },
            "heading": { "type": "integer" },
            "subheading": { "type": "integer" },
            "body": { "type": "integer" },
            "caption": { "type": "integer" }
          }
        }
      }
    },
    "UIFTemplate": {
      "type": "object",
      "description": "Partial UIF structure with placeholders"
    }
  }
}
```

---

## Field Requirements

### Field Requirement Types

| Type | Behavior | Example |
|------|----------|---------|
| `required` | Must be provided by user or context | `company_name`, `product_name` |
| `ai_fillable` | AI generates if not provided | `tagline`, `problem_statement` |
| `optional` | Skipped if missing | `competitor_analysis`, `testimonial` |

### FieldRequirement Interface

```typescript
interface FieldRequirement {
  fieldName: string;              // Placeholder name: {{fieldName}}
  type: 'required' | 'ai_fillable' | 'optional';
  description: string;            // Human-readable description
  defaultValue?: any;             // Default if not provided
  aiPrompt?: string;              // Prompt for AI to fill
  validation?: {
    type: 'string' | 'number' | 'url' | 'date' | 'email';
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}
```

### Example Field Requirements

```json
{
  "requiredFields": [
    {
      "fieldName": "company_name",
      "type": "required",
      "description": "Target company name",
      "validation": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      }
    },
    {
      "fieldName": "product_name",
      "type": "required",
      "description": "Your product/service name"
    },
    {
      "fieldName": "problem_statement",
      "type": "ai_fillable",
      "description": "The problem your product solves",
      "aiPrompt": "Based on the product and target company, describe the key business problem being solved in 2-3 sentences. Be specific and data-driven."
    },
    {
      "fieldName": "solution_benefits",
      "type": "ai_fillable",
      "description": "Key benefits of your solution",
      "aiPrompt": "List 3-5 key benefits of the product for the target company. Focus on ROI, efficiency, and competitive advantage."
    },
    {
      "fieldName": "customer_testimonial",
      "type": "optional",
      "description": "A customer quote or testimonial",
      "defaultValue": null
    }
  ]
}
```

---

## UI Layout (UIF Template)

The `uiLayout` field contains a partial UIF structure with placeholders.

### Placeholder Syntax

```
{{fieldName}}           - Simple placeholder
{{fieldName|default}}   - With default value
{{#if fieldName}}...{{/if}} - Conditional
{{#each items}}...{{/each}} - Loop
```

### UIF Template Example

```json
{
  "uiLayout": {
    "pages": [
      {
        "pageNumber": 1,
        "layout": "title-slide",
        "elements": [
          {
            "type": "text",
            "value": "{{product_name}}",
            "position": { "x": "10%", "y": "35%" },
            "size": { "width": "80%", "height": "auto" },
            "style": { "fontSize": 56, "fontWeight": 700 }
          },
          {
            "type": "text",
            "value": "{{tagline|Transforming the way you work}}",
            "position": { "x": "10%", "y": "55%" },
            "size": { "width": "80%", "height": "auto" },
            "style": { "fontSize": 24 }
          }
        ]
      },
      {
        "pageNumber": 2,
        "layout": "title-and-body",
        "elements": [
          {
            "type": "text",
            "value": "The Challenge",
            "position": { "x": "5%", "y": "5%" },
            "style": { "fontSize": 36, "fontWeight": 700 }
          },
          {
            "type": "text",
            "value": "{{problem_statement}}",
            "format": "markdown",
            "position": { "x": "5%", "y": "20%" },
            "size": { "width": "90%", "height": "auto" }
          }
        ]
      },
      {
        "pageNumber": 3,
        "layout": "two-column",
        "elements": [
          {
            "type": "text",
            "value": "Our Solution",
            "position": { "x": "5%", "y": "5%" },
            "style": { "fontSize": 36, "fontWeight": 700 }
          },
          {
            "type": "text",
            "value": "{{solution_benefits}}",
            "format": "markdown",
            "position": { "x": "5%", "y": "20%" },
            "size": { "width": "45%", "height": "auto" }
          },
          {
            "type": "image",
            "source": "{{product_screenshot|https://placeholder.com/product.png}}",
            "alt": "Product Screenshot",
            "position": { "x": "55%", "y": "20%" },
            "size": { "width": "40%", "height": "auto" }
          }
        ]
      }
    ]
  }
}
```

---

## Relationships

### Outgoing Relationships

| Type | Target | Cardinality | Description |
|------|--------|-------------|-------------|
| `uses_context_template` | `c_contextTemplate` | Many-to-One | Context assembly template |
| `default_assistant` | `c_assistant` | Many-to-One | Default AI assistant |
| `inherits_from` | `c_contentTemplate` | Many-to-One | Parent template |

### Incoming Relationships

| From | Type | Description |
|------|------|-------------|
| `c_generatedContent` | `generated_from` | Content generated using this template |

### Relationship Diagram

```
┌─────────────────────┐
│  c_contentTemplate  │
│  "Sales Pitch Deck" │
└─────────┬───────────┘
          │
          ├─── uses_context_template ───► c_contextTemplate
          │                               "Project Overview"
          │
          ├─── default_assistant ───────► c_assistant
          │                               "Sales Coach"
          │
          └─── inherits_from ───────────► c_contentTemplate
                                          "Basic Presentation"

┌─────────────────────┐      generated_from      ┌─────────────────────┐
│ c_generatedContent  │ ◄───────────────────────│  c_contentTemplate  │
│ "Acme Sales Deck"   │                          │  "Sales Pitch Deck" │
└─────────────────────┘                          └─────────────────────┘
```

---

## System Templates

Global templates available to all tenants.

### Sales Category

| Template | Pages | Description |
|----------|-------|-------------|
| **Sales Pitch Deck** | 10 | B2B sales presentation |
| **Product Demo** | 8 | Product demonstration |
| **Competitive Analysis** | 6 | Competitor comparison |

### Report Category

| Template | Pages | Description |
|----------|-------|-------------|
| **Quarterly Business Review** | 12 | QBR presentation |
| **Project Status Report** | 8 | Status update deck |
| **Executive Summary** | 5 | High-level overview |

### Proposal Category

| Template | Pages | Description |
|----------|-------|-------------|
| **Project Proposal** | 15 | Full proposal deck |
| **RFP Response** | 20 | Request for proposal |
| **Statement of Work** | 10 | SOW document |

---

## Template Matching

Templates are matched to user prompts using semantic search.

### Matching Process

```
1. User prompt: "Create a deck to pitch our security product to banks"
                    │
                    ▼
2. Embed prompt using Embedding Processor
                    │
                    ▼
3. Search c_contentTemplate vectors:
   - Filter: tenantId = user's OR isSystemTemplate = true
   - Filter: category = 'sales' (inferred)
   - Score by cosine similarity
                    │
                    ▼
4. Return matches:
   [
     { template: "Sales Pitch Deck", score: 0.87 },
     { template: "Product Demo", score: 0.72 },
     { template: "Competitive Analysis", score: 0.65 }
   ]
```

### Embedding Integration

On `c_contentTemplate` create/update:
1. Embedding Processor generates embedding from:
   - `name`
   - `description`
   - `tags`
   - `requiredFields[].description`
2. Stored in `embedding` field
3. Indexed in vector search

---

## Examples

### Complete Sales Pitch Template

```json
{
  "id": "template-sales-pitch-uuid",
  "shardTypeId": "c_contentTemplate",
  "tenantId": "system",
  
  "structuredData": {
    "name": "Sales Pitch Deck",
    "description": "Professional B2B sales presentation with problem-solution-benefits structure. Ideal for enterprise sales pitches.",
    "category": "sales",
    "documentType": "presentation",
    "tags": ["sales", "pitch", "b2b", "enterprise", "presentation"],
    
    "pageCount": 10,
    
    "defaultTheme": {
      "primaryColor": "#0066FF",
      "secondaryColor": "#00AACC",
      "backgroundColor": "#FFFFFF",
      "textColor": "#1A1A1A",
      "fontFamily": "Inter, sans-serif",
      "fontFamilyHeading": "Poppins, sans-serif",
      "fontSize": {
        "title": 48,
        "heading": 32,
        "subheading": 24,
        "body": 16,
        "caption": 12
      }
    },
    
    "requiredFields": [
      {
        "fieldName": "company_name",
        "type": "required",
        "description": "Target company name"
      },
      {
        "fieldName": "product_name",
        "type": "required",
        "description": "Your product/service name"
      },
      {
        "fieldName": "problem_statement",
        "type": "ai_fillable",
        "description": "The problem your product solves",
        "aiPrompt": "Based on the company and product, describe the key business problem in 2-3 sentences."
      },
      {
        "fieldName": "solution_benefits",
        "type": "ai_fillable",
        "description": "Key benefits (3-5 bullet points)",
        "aiPrompt": "List 3-5 key benefits focusing on ROI and efficiency."
      },
      {
        "fieldName": "pricing_info",
        "type": "optional",
        "description": "Pricing information"
      }
    ],
    
    "uiLayout": {
      "pages": [
        {
          "pageNumber": 1,
          "layout": "title-slide",
          "elements": [
            {
              "type": "text",
              "value": "{{product_name}}",
              "position": { "x": "10%", "y": "35%" },
              "size": { "width": "80%", "height": "auto" },
              "style": { "fontSize": 56, "fontWeight": 700, "textAlign": "center" }
            }
          ]
        }
      ]
    },
    
    "chartDataConfig": {
      "defaultDataSource": "shards",
      "shardDataMapping": [
        {
          "field": "revenue_projection",
          "shardType": "c_opportunity",
          "shardField": "value"
        }
      ]
    },
    
    "defaultModel": "gpt-4",
    "contextTemplateId": "ctx-template-project-overview",
    "temperature": 0.7,
    
    "isSystemTemplate": true,
    "templateVersion": "1.0.0"
  },
  
  "internal_relationships": [
    {
      "targetShardId": "ctx-template-project-overview",
      "relationshipType": "uses_context_template",
      "label": "Project Overview context"
    },
    {
      "targetShardId": "assistant-sales-coach",
      "relationshipType": "default_assistant",
      "label": "Sales Coach"
    }
  ],
  
  "status": "active",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-11-30T00:00:00Z"
}
```

---

## Best Practices

### 1. Clear Field Descriptions

```typescript
// ✅ Good
{
  fieldName: "problem_statement",
  description: "A 2-3 sentence description of the business problem your product solves for the target company"
}

// ❌ Bad
{
  fieldName: "problem",
  description: "Problem"
}
```

### 2. Effective AI Prompts

```typescript
// ✅ Good - specific, contextual
aiPrompt: "Based on the target company's industry ({{company_industry}}) and size, describe 3-5 specific pain points that {{product_name}} addresses. Use data and statistics where possible."

// ❌ Bad - vague
aiPrompt: "Write about the problem"
```

### 3. Thoughtful Default Values

```typescript
// ✅ Good
{
  fieldName: "cta_text",
  defaultValue: "Schedule a Demo",
  type: "optional"
}
```

### 4. Appropriate Field Types

- Use `required` for essential identity fields
- Use `ai_fillable` for content that can be generated
- Use `optional` for nice-to-have additions

### 5. Test Templates Thoroughly

Before marking as system template:
- Test with various prompts
- Verify all placeholders work
- Check output quality
- Validate rendering in all formats

---

## API Reference

### Create Template

```http
POST /api/v1/shards
Content-Type: application/json

{
  "shardTypeId": "c_contentTemplate",
  "structuredData": { ... }
}
```

### List Templates

```http
GET /api/v1/content/templates?category=sales&includeSystem=true
```

### Match Templates

```http
POST /api/v1/content/templates/match
Content-Type: application/json

{
  "prompt": "Sales deck for SaaS security product",
  "category": "sales",
  "maxResults": 5
}
```

---

## Related Documentation

- [Content Generation README](../../content-generation/README.md)
- [UIF Specification](../../content-generation/UIF-SPECIFICATION.md)
- [c_contextTemplate](./c_contextTemplate.md)
- [c_assistant](./c_assistant.md)
- [c_generatedContent](./c_generatedContent.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team






