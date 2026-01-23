# Shards - The Atomic Unit of Castiel

## Overview

**Shards** are the atomic unit of data in Castiel. Every piece of information—projects, companies, contacts, documents, notes, AI assistants, templates—is a Shard. This unified model enables:

- 🔗 **Universal Relationships**: Any Shard can link to any other Shard
- 🔍 **Semantic Search**: AI-powered vector search across all data
- 🤖 **AI-Native**: Designed for context assembly and AI insights
- 🏢 **Multi-Tenant**: Strict tenant isolation at every level
- 📝 **Auditable**: Full history and version control

> **Philosophy**: "Everything is a Shard—uniform structure, infinite flexibility."

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [ShardTypes](#shardtypes)
3. [Semantic Search](#semantic-search)
4. [AI Integration](#ai-integration)
5. [Content Generation](#content-generation)
6. [Documentation Index](#documentation-index)

---

## Core Concepts

### What is a Shard?

A Shard is a schema-driven, relationship-centric, AI-native data object. Every Shard contains:

| Section | Purpose |
|---------|---------|
| **Identity** | `id`, `tenantId`, `userId`, `shardTypeId` |
| **Structured Data** | Schema-validated business data |
| **Unstructured Data** | Free-form text, extracted content |
| **Relationships** | Internal links (Shard-to-Shard), external links (CRM, etc.) |
| **AI Data** | Vector embeddings, enrichments |
| **Metadata** | Tags, categories, custom fields |
| **System** | Timestamps, status, version |

→ See [Base Schema](./base-schema.md) for complete specification

### The Shard Ecosystem

```
                    ┌──────────────────────────────────────────┐
                    │              USER REQUEST                 │
                    │  "Create a sales deck for Project Alpha"  │
                    └────────────────────┬─────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                SHARD GRAPH                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────────┐                                                          │
│    │  c_project  │ ◄──────── Central AI Hub                                 │
│    │   "Alpha"   │                                                          │
│    └──────┬──────┘                                                          │
│           │                                                                 │
│    ┌──────┼────────────────────────────────────────────────────┐           │
│    │      │                                                    │           │
│    ▼      ▼                    ▼                    ▼          ▼           │
│ ┌───────┐ ┌───────┐      ┌─────────────┐     ┌──────────┐ ┌─────────┐     │
│ │Company│ │Contact│      │ Opportunity │     │ Document │ │  Note   │     │
│ │ Acme  │ │ John  │      │  $500K Deal │     │ Proposal │ │ Meeting │     │
│ └───────┘ └───────┘      └─────────────┘     └──────────┘ └─────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI PROCESSING                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ c_contextTemp   │    │  c_assistant    │    │c_contentTemplate│         │
│  │ "Project View"  │    │ "Sales Coach"   │    │ "Sales Pitch"   │         │
│  │                 │    │                 │    │                 │         │
│  │ What AI sees    │    │ AI personality  │    │ Output format   │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                  │
│           └──────────────────────┼──────────────────────┘                  │
│                                  │                                         │
│                                  ▼                                         │
│                    ┌──────────────────────────┐                            │
│                    │    c_generatedContent    │                            │
│                    │  "Acme Sales Deck v1"    │                            │
│                    │                          │                            │
│                    │  • UIF JSON              │                            │
│                    │  • HTML, PPTX, PDF       │                            │
│                    └──────────────────────────┘                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ShardTypes

ShardTypes are blueprints that define valid Shard structures. They specify:

- **Field Types** - Text, numbers, dates, selections, references, files
- **Validation Rules** - Required, patterns, constraints, cross-field
- **UI Configuration** - Input types, layout, conditional visibility
- **Default Values** - Initial field values
- **Relationship Types** - Links to other Shards
- **AI Processing** - Embedding and enrichment configuration
- **Auto-Generated Fields** - Name fields automatically populated from referenced shards

→ See [Field Types Specification](./field-types.md) for comprehensive field type documentation

### Auto-Generated Name Fields

For every ID reference field (e.g., `accountId`, `contactId`, `opportunityId`), Castiel automatically creates a corresponding name field (e.g., `accountName`, `contactName`, `opportunityName`).

**Characteristics:**
- **Read-only**: Auto-populated from the referenced shard's `name` field
- **Included in embeddings**: Name fields are included in embedding templates (weight 0.6-0.7) for semantic search
- **Null handling**: If the referenced shard doesn't exist or is deleted, the name field is null
- **Real-time updates**: Name fields update automatically when referenced shard names change

**Example:**
```typescript
// c_opportunity shard
{
  accountId: "account-uuid-123",        // Reference field
  accountName: "Acme Corporation",      // Auto-generated (read-only)
  contactId: "contact-uuid-456",        // Reference field
  contactName: "John Smith"             // Auto-generated (read-only)
}
```

This enables:
- **Better search**: Semantic search can find opportunities by account/contact names
- **Improved UX**: Display names without additional lookups
- **AI context**: Names provide semantic value for AI insights

### Core ShardTypes (c_*)

Global types available to all tenants, protected by Super Admin:

| Type | Purpose | AI Role |
|------|---------|---------|
| [`c_project`](./core-types/c_project.md) | Central hub for work | **Primary Hub** |
| [`c_company`](./core-types/c_company.md) | Organizations | Context Provider |
| [`c_contact`](./core-types/c_contact.md) | People | Stakeholder Info |
| [`c_opportunity`](./core-types/c_opportunity.md) | Sales deals | Business Context |
| [`c_account`](./core-types/c_account.md) | CRM accounts | Context Provider |
| [`c_lead`](./core-types/c_lead.md) | Sales leads | Prospect Info |
| [`c_ticket`](./core-types/c_ticket.md) | Support cases | Support Context |
| [`c_campaign`](./core-types/c_campaign.md) | Marketing campaigns | Marketing Context |
| [`c_quote`](./core-types/c_quote.md) | Sales quotes | Proposal Context |
| [`c_contract`](./core-types/c_contract.md) | Sales contracts | Contract Context |
| [`c_order`](./core-types/c_order.md) | Sales orders | Order Context |
| [`c_invoice`](./core-types/c_invoice.md) | Invoices | Financial Context |
| [`c_payment`](./core-types/c_payment.md) | Payments | Payment Context |
| [`c_revenue`](./core-types/c_revenue.md) | Revenue recognition | Revenue Context |
| [`c_opportunityHistory`](./core-types/c_opportunityHistory.md) | Opportunity history | Historical Context |
| [`c_opportunityCompetitor`](./core-types/c_opportunityCompetitor.md) | Opportunity competitors | Competitive Context |
| [`c_opportunityContactRole`](./core-types/c_opportunityContactRole.md) | Opportunity contact roles | Stakeholder Context |
| [`c_opportunityLineItem`](./core-types/c_opportunityLineItem.md) | Opportunity line items | Product Context |
| [`c_competitor`](./core-types/c_competitor.md) | Competitors | Competitive Intelligence |
| [`c_email`](./core-types/c_email.md) | Email messages | Communication Context |
| [`c_message`](./core-types/c_message.md) | Slack/Teams messages | Communication Context |
| [`c_channel`](./core-types/c_channel.md) | Slack/Teams channels | Channel Context |
| [`c_team`](./core-types/c_team.md) | Team/workspace containers | Team Context |
| [`c_meeting`](./core-types/c_meeting.md) | Video/audio meetings | Meeting Context |
| [`c_event`](./core-types/c_event.md) | Calendar events | Event Context |
| [`c_calendar`](./core-types/c_calendar.md) | Calendar containers | Calendar Context |
| [`c_call`](./core-types/c_call.md) | Phone calls | Call Context |
| [`c_document`](./core-types/c_document.md) | Files and docs | Content Source |
| [`c_documentChunk`](./core-types/c_documentChunk.md) | Document chunks with embeddings | **Vector Context** |
| [`c_file`](./core-types/c_file.md) | Files (Drive, SharePoint, OneDrive) | File Source |
| [`c_folder`](./core-types/c_folder.md) | Folders (Drive, SharePoint, OneDrive) | Folder Source |
| [`c_attachment`](./core-types/c_attachment.md) | File attachments | Attachment Source |
| [`c_product`](./core-types/c_product.md) | Products/services | Product Context |
| [`c_priceBook`](./core-types/c_priceBook.md) | Price books | Pricing Context |
| [`c_asset`](./core-types/c_asset.md) | Installed products/assets | Asset Context |
| [`c_webinar`](./core-types/c_webinar.md) | Webinars | Webinar Context |
| [`c_marketingAsset`](./core-types/c_marketingAsset.md) | Marketing materials | Marketing Content |
| [`c_eventRegistration`](./core-types/c_eventRegistration.md) | Event registrations | Registration Context |
| [`c_leadScore`](./core-types/c_leadScore.md) | Lead scoring | Scoring Context |
| [`c_note`](./core-types/c_note.md) | Notes and memos | Activity Log |
| [`c_assistant`](./core-types/c_assistant.md) | AI configuration | **AI Personality** |
| [`c_contextTemplate`](./core-types/c_contextTemplate.md) | Context assembly | **Context Builder** |
| [`c_contentTemplate`](./core-types/c_contentTemplate.md) | Content generation | **Output Builder** |
| [`c_generatedContent`](./core-types/c_generatedContent.md) | Generated outputs | Generated Output |
| [`c_integrationProvider`](./core-types/c_integrationProvider.md) | Integration definitions | System Config |
| [`c_integration`](./core-types/c_integration.md) | Tenant integrations | Sync Config |
| [`c_integrationSync`](./core-types/c_integrationSync.md) | Sync history | Audit Log |

→ See [Core Types](./core-types/README.md) for full documentation

### Custom ShardTypes

Tenants can create their own types for domain-specific needs (e.g., `invoice`, `support_ticket`, `product`).

---

## Semantic Search

### 2. Semantic Search

Vector embeddings enable:
- "Find similar documents"
- "What other projects had this issue?"
- Natural language queries

→ See [Embedding Processor](../embedding-processor/README.md) for details on how embeddings are generated and managed.

#### Embedding Templates

Each ShardType includes an **embedding template** that defines:
- **Field Weights**: Which fields contribute most to embeddings (name: 1.0, description: 0.8, metadata: 0.5)
- **Preprocessing**: Text chunking, normalization, formatting
- **Model Selection**: Default (text-embedding-3-small) or Quality (text-embedding-3-large)
- **Normalization**: L2 normalization for cosine similarity

Embedding templates are stored in `ShardType.embeddingTemplate` and used by `EmbeddingTemplateService` for:
- Vector search across all shard types
- AI insights and context assembly
- Chat and conversational AI
- Risk analysis and forecasting

**Critical Shard Types** (use quality model):
- `c_opportunity` - Sales deals (risk analysis critical)
- `c_account` - CRM accounts (company matching)
- `c_contact` - Contacts (people matching)

**All Other Types** (use default model):
- Cost-effective while maintaining high quality
- Includes: c_lead, c_ticket, c_campaign, c_email, c_message, c_note, etc.

### How It Works

1. **Embedding Generation**: When a Shard is created/updated, the Embedding Processor generates vector embeddings from configured fields
2. **Vector Storage**: Embeddings stored in Shard `vectors[]` array and Azure AI Search index
3. **Semantic Search**: Queries are embedded and matched against stored vectors
4. **Tenant Isolation**: All searches filtered by `tenantId`

---

## AI Integration

### Context Assembly

The `c_contextTemplate` ShardType defines what data the AI sees when generating insights:

```
User: "Give me insights on Project Alpha"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              c_contextTemplate (Project Overview)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Relationships to traverse:                                 │
│  • has_client → c_company                                   │
│  • has_stakeholder → c_contact[]                            │
│  • has_opportunity → c_opportunity                          │
│  • has_document → c_document[]                              │
│                                                             │
│  Fields to include:                                         │
│  • c_project: name, description, status, objectives         │
│  • c_company: name, industry, revenue                       │
│  • c_contact: name, title, role                             │
│  • c_opportunity: value, stage, closeDate                   │
│                                                             │
│  Token limit: 6000                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
              Assembled Context JSON → AI Model → Insights
```

→ See [c_contextTemplate](./core-types/c_contextTemplate.md) for full specification

### AI Personality

The `c_assistant` ShardType configures AI behavior:

- System prompt and instructions
- Personality and tone
- Focus areas and expertise
- Model settings (temperature, etc.)

→ See [c_assistant](./core-types/c_assistant.md) for full specification

---

## Content Generation

### Overview

The Content Generation Module transforms user prompts into professional deliverables:

```
User Prompt → Template Matching → Context Assembly → AI Generation → Rendered Output
                                                            │
                                                            ▼
                                                    ┌───────────────┐
                                                    │ HTML / PPTX / │
                                                    │ PDF / Slides  │
                                                    └───────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| [`c_contentTemplate`](./core-types/c_contentTemplate.md) | Defines output structure, layout, placeholders |
| [`c_generatedContent`](./core-types/c_generatedContent.md) | Stores generated UIF and rendered outputs |
| [UIF Specification](../content-generation/UIF-SPECIFICATION.md) | Universal Intermediate Format schema |
| [Renderers](../content-generation/RENDERERS.md) | Convert UIF to HTML, PPTX, PDF, Markdown, Google Slides |

→ See [Content Generation](../content-generation/README.md) for complete documentation

---

## External Integrations

### Overview

The Integrations System connects Castiel to external business systems:

```
External Systems                    Castiel Shards
┌─────────────────┐                ┌─────────────────┐
│  Salesforce     │ ◄────────────► │   c_account     │
│  Dynamics 365   │                │   c_contact     │
│  HubSpot        │                │   c_opportunity │
│                 │                │   c_lead        │
│                 │                │   c_ticket      │
│                 │                │   c_campaign    │
│                 │                │   c_quote       │
│                 │                │   c_contract    │
│                 │                │   c_order       │
│                 │                │   c_invoice    │
│                 │                │   c_product     │
└─────────────────┘                └─────────────────┘

┌─────────────────┐                ┌─────────────────┐
│  Slack          │ ──────────────► │   c_message     │
│  Teams          │                │   c_channel     │
│  Discord        │                │   c_team        │
└─────────────────┘                └─────────────────┘

┌─────────────────┐                ┌─────────────────┐
│  Teams / Zoom   │ ──────────────► │   c_meeting     │
│  Google Meet    │                │   c_event       │
│  Webex          │                │   c_calendar    │
│  Gong           │                │   c_call        │
│  RingCentral    │                │   c_note        │
└─────────────────┘                └─────────────────┘

┌─────────────────┐                ┌─────────────────┐
│  Google Drive   │ ──────────────► │   c_file        │
│  OneDrive       │                │   c_folder      │
│  SharePoint     │                │   c_attachment  │
└─────────────────┘                └─────────────────┘
```

### Key Components

| Component | Purpose |
|-----------|---------|
| [`c_integrationProvider`](./core-types/c_integrationProvider.md) | Defines available integration types |
| [`c_integration`](./core-types/c_integration.md) | Tenant's configured integration |
| [`c_integrationSync`](./core-types/c_integrationSync.md) | Sync job history |
| [Sync Engine](../integrations/SYNC-ENGINE.md) | Handles data synchronization |

→ See [Integrations System](../integrations/README.md) for complete documentation

---

## Documentation Index

### Core Documentation

| Document | Description |
|----------|-------------|
| [Base Schema](./base-schema.md) | Complete Shard structure specification |
| [Field Types](./field-types.md) | **Field types, validation, UI configuration** |
| [Core Types](./core-types/README.md) | All core ShardType documentation |
| [Relationships](./relationships.md) | Relationship patterns and best practices |
| [Naming Conventions](./naming-conventions.md) | Naming standards |

### AI Documentation

| Document | Description |
|----------|-------------|
| [AI Tenant Isolation](./ai-tenant-isolation.md) | Multi-tenant AI best practices |
| [Embedding Processor](../embedding-processor/README.md) | Vector embedding pipeline |
| [Content Generation](../content-generation/README.md) | Content generation module |
| [Integrations System](../integrations/README.md) | External system integrations |

### ShardType Quick Links

**Data Types**:
- [`c_project`](./core-types/c_project.md) - Projects (AI Hub)
- [`c_company`](./core-types/c_company.md) - Companies/Organizations
- [`c_contact`](./core-types/c_contact.md) - People/Contacts
- [`c_opportunity`](./core-types/c_opportunity.md) - Sales Opportunities
- [`c_account`](./core-types/c_account.md) - CRM Accounts
- [`c_lead`](./core-types/c_lead.md) - Sales Leads
- [`c_ticket`](./core-types/c_ticket.md) - Support Cases/Tickets
- [`c_campaign`](./core-types/c_campaign.md) - Marketing Campaigns
- [`c_quote`](./core-types/c_quote.md) - Sales Quotes
- [`c_contract`](./core-types/c_contract.md) - Sales Contracts
- [`c_order`](./core-types/c_order.md) - Sales Orders
- [`c_invoice`](./core-types/c_invoice.md) - Invoices
- [`c_payment`](./core-types/c_payment.md) - Payments
- [`c_revenue`](./core-types/c_revenue.md) - Revenue Recognition
- [`c_competitor`](./core-types/c_competitor.md) - Competitors

**Content Types**:
- [`c_document`](./core-types/c_document.md) - Documents/Files
- [`c_file`](./core-types/c_file.md) - Files (Drive, SharePoint, OneDrive)
- [`c_folder`](./core-types/c_folder.md) - Folders (Drive, SharePoint, OneDrive)
- [`c_attachment`](./core-types/c_attachment.md) - File Attachments
- [`c_note`](./core-types/c_note.md) - Notes/Memos
- [`c_generatedContent`](./core-types/c_generatedContent.md) - Generated Content
- [`c_marketingAsset`](./core-types/c_marketingAsset.md) - Marketing Materials

**Configuration Types**:
- [`c_assistant`](./core-types/c_assistant.md) - AI Assistants
- [`c_contextTemplate`](./core-types/c_contextTemplate.md) - Context Templates
- [`c_contentTemplate`](./core-types/c_contentTemplate.md) - Content Templates

**Communication Types**:
- [`c_email`](./core-types/c_email.md) - Email Messages
- [`c_message`](./core-types/c_message.md) - Slack/Teams Messages
- [`c_channel`](./core-types/c_channel.md) - Slack/Teams Channels
- [`c_team`](./core-types/c_team.md) - Team/Workspace Containers
- [`c_meeting`](./core-types/c_meeting.md) - Video/Audio Meetings
- [`c_event`](./core-types/c_event.md) - Calendar Events
- [`c_calendar`](./core-types/c_calendar.md) - Calendar Containers
- [`c_call`](./core-types/c_call.md) - Phone Calls

**Product Types**:
- [`c_product`](./core-types/c_product.md) - Products/Services
- [`c_priceBook`](./core-types/c_priceBook.md) - Price Books
- [`c_asset`](./core-types/c_asset.md) - Installed Products/Assets

**Marketing Types**:
- [`c_webinar`](./core-types/c_webinar.md) - Webinars
- [`c_eventRegistration`](./core-types/c_eventRegistration.md) - Event Registrations
- [`c_leadScore`](./core-types/c_leadScore.md) - Lead Scoring

**Integration Types**:
- [`c_integrationProvider`](./core-types/c_integrationProvider.md) - Integration Providers
- [`c_integration`](./core-types/c_integration.md) - Tenant Integrations
- [`c_integrationSync`](./core-types/c_integrationSync.md) - Sync History

---

## Future Roadmap

See [Roadmap](./roadmap.md) for planned enhancements:

- [ ] ShardType inheritance
- [ ] Advanced workflow automation
- [ ] Real-time collaboration
- [ ] Enhanced AI capabilities

---

## 🔍 Gap Analysis### Current Implementation Status**Status:** ✅ **Mostly Complete** - Core shard system fully implemented

#### Implemented Features (✅)

- ✅ Core shard CRUD operations
- ✅ ShardType management
- ✅ Shard relationships (graph edges)
- ✅ Revision history
- ✅ Vector embeddings and semantic search
- ✅ ACL (access control lists)
- ✅ Bulk operations
- ✅ Import/export (CSV, JSON, NDJSON)
- ✅ Schema migrations
- ✅ Field-level security
- ✅ Computed fields
- ✅ Webhooks
- ✅ Document management
- ✅ Collections

#### Known Limitations

- ⚠️ **ShardType Inheritance** - Planned but not yet implemented (see roadmap)
- ⚠️ **Advanced Workflow Automation** - Planned but not yet implemented
- ⚠️ **Real-time Collaboration** - Partial implementation (Y.js integration exists)

### Code References

- **Backend Services:**
  - `apps/api/src/repositories/shard.repository.ts` - Shard CRUD
  - `apps/api/src/repositories/shard-type.repository.ts` - ShardType management
  - `apps/api/src/repositories/shard-relationship.repository.ts` - Relationship management
  - `apps/api/src/services/shard-relationship.service.ts` - Relationship service
  - `apps/api/src/services/shard-embedding.service.ts` - Embedding service
  - `apps/api/src/services/shard-linking.service.ts` - Linking service- **API Routes:**
  - `/api/v1/shards/*` - Shard CRUD
  - `/api/v1/shard-types/*` - ShardType management
  - `/api/v1/shard-relationships/*` - Relationship management
  - `/api/v1/shard-bulk/*` - Bulk operations
  - `/api/v1/revisions/*` - Revision history

- **Frontend:**
  - `apps/web/src/components/shard-types/` - ShardType management UI
  - `apps/web/src/components/shard/` - Shard components

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Base Schema](./base-schema.md) - Shard base schema
- [Field Types](./field-types.md) - Field type definitions
- [Relationships](./relationships.md) - Relationship system---
