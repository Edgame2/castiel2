# Core ShardTypes Overview

## Introduction

Core ShardTypes (prefixed with `c_`) are the foundational building blocks of Castiel's data model. They are:

- **Global**: Available to all tenants
- **Protected**: Only Super Admins can modify them
- **AI-Optimized**: Designed for AI context assembly and insights
- **Standardized**: Consistent structure across all deployments

---

## Table of Contents

1. [Core Types List](#core-types-list)
2. [Type Hierarchy](#type-hierarchy)
3. [AI Context Model](#ai-context-model)
4. [Common Properties](#common-properties)
5. [Extending Core Types](#extending-core-types)

---

## Core Types List

| ShardType | Purpose | Category | AI Role |
|-----------|---------|----------|---------|
| [`c_project`](./c_project.md) | Central hub for AI insights | DATA | **Primary Hub** |
| [`c_company`](./c_company.md) | Organizations and companies | DATA | Context Provider |
| [`c_contact`](./c_contact.md) | People and contacts | DATA | Stakeholder Info |
| [`c_opportunity`](./c_opportunity.md) | Sales opportunities | DATA | Business Context |
| [`c_account`](./c_account.md) | CRM accounts (Salesforce, HubSpot, Dynamics) | DATA | Context Provider |
| [`c_lead`](./c_lead.md) | Sales leads | DATA | Prospect Info |
| [`c_ticket`](./c_ticket.md) | Support cases/tickets | DATA | Support Context |
| [`c_campaign`](./c_campaign.md) | Marketing campaigns | DATA | Marketing Context |
| [`c_quote`](./c_quote.md) | Sales quotes/proposals | DATA | Proposal Context |
| [`c_contract`](./c_contract.md) | Sales contracts/agreements | DATA | Contract Context |
| [`c_order`](./c_order.md) | Sales orders | DATA | Order Context |
| [`c_invoice`](./c_invoice.md) | Invoices | DATA | Financial Context |
| [`c_payment`](./c_payment.md) | Payments | DATA | Payment Context |
| [`c_revenue`](./c_revenue.md) | Revenue recognition | DATA | Revenue Context |
| [`c_opportunityHistory`](./c_opportunityHistory.md) | Opportunity history/audit trail | DATA | Historical Context |
| [`c_opportunityCompetitor`](./c_opportunityCompetitor.md) | Opportunity competitors | DATA | Competitive Context |
| [`c_opportunityContactRole`](./c_opportunityContactRole.md) | Opportunity contact roles | DATA | Stakeholder Context |
| [`c_opportunityLineItem`](./c_opportunityLineItem.md) | Opportunity line items/products | DATA | Product Context |
| [`c_competitor`](./c_competitor.md) | Standalone competitor entities | DATA | Competitive Intelligence |
| [`c_email`](./c_email.md) | Email messages | DATA | Communication Context |
| [`c_message`](./c_message.md) | Slack/Teams messages | DATA | Communication Context |
| [`c_channel`](./c_channel.md) | Slack/Teams channels | DATA | Channel Context |
| [`c_team`](./c_team.md) | Team/workspace containers | DATA | Team Context |
| [`c_meeting`](./c_meeting.md) | Video/audio meetings (Zoom, Teams) | DATA | Meeting Context |
| [`c_event`](./c_event.md) | Calendar events | DATA | Event Context |
| [`c_calendar`](./c_calendar.md) | Calendar containers | DATA | Calendar Context |
| [`c_call`](./c_call.md) | Phone calls | DATA | Call Context |
| [`c_note`](./c_note.md) | Notes and memos | DOCUMENT | Activity Log |
| [`c_document`](./c_document.md) | Documents and files | DOCUMENT | Content Source |
| [`c_documentChunk`](./c_documentChunk.md) | Document chunks with embeddings | DOCUMENT | **Vector Context** |
| [`c_file`](./c_file.md) | Files (Google Drive, SharePoint, OneDrive) | DOCUMENT | File Source |
| [`c_folder`](./c_folder.md) | Folders (Google Drive, SharePoint, OneDrive) | DOCUMENT | Folder Source |
| [`c_attachment`](./c_attachment.md) | File attachments | DOCUMENT | Attachment Source |
| [`c_content`](./c_content.md) | Articles, blog posts, pages | DOCUMENT | Content Source |
| [`c_product`](./c_product.md) | Products/services | DATA | Product Context |
| [`c_priceBook`](./c_priceBook.md) | Price books | DATA | Pricing Context |
| [`c_asset`](./c_asset.md) | Installed products/assets | DATA | Asset Context |
| [`c_webinar`](./c_webinar.md) | Webinars | DATA | Webinar Context |
| [`c_marketingAsset`](./c_marketingAsset.md) | Marketing materials/content | DOCUMENT | Marketing Content |
| [`c_eventRegistration`](./c_eventRegistration.md) | Event registrations | DATA | Registration Context |
| [`c_leadScore`](./c_leadScore.md) | Lead scoring models | DATA | Scoring Context |
| [`c_assistant`](./c_assistant.md) | AI Assistant configurations | CONFIGURATION | AI Personality |
| [`c_aimodel`](./c_aimodel.md) | AI Model definitions | CONFIGURATION | **Model Selection** |
| [`c_aiconfig`](./c_aiconfig.md) | AI Prompt configurations | CONFIGURATION | **Prompt System** |
| [`c_conversation`](./c_conversation.md) | AI Conversations | DATA | **Chat History** |
| [`c_contextTemplate`](./c_contextTemplate.md) | AI context assembly templates | CONFIGURATION | **Context Builder** |
| [`c_contentTemplate`](./c_contentTemplate.md) | Content generation templates | CONFIGURATION | **Output Builder** |
| [`c_generatedContent`](./c_generatedContent.md) | AI-generated content | DOCUMENT | Generated Output |
| [`c_integrationProvider`](./c_integrationProvider.md) | Integration provider definitions | SYSTEM | System Config |
| [`c_integration`](./c_integration.md) | Tenant integration configurations | CONFIGURATION | Sync Config |
| [`c_integrationSync`](./c_integrationSync.md) | Sync job history | AUDIT | Audit Log |

---

## Type Hierarchy

```
                          ┌─────────────────────────────────────┐
                          │            c_project                │
                          │      (Central AI Hub)               │
                          └──────────────┬──────────────────────┘
                                         │
           ┌─────────────────────────────┼─────────────────────────────┐
           │                             │                             │
           ▼                             ▼                             ▼
    ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
    │  c_company  │              │c_opportunity│              │c_assistant  │
    │ (Client/Org)│              │(Sales Deal) │              │  (AI Bot)   │
    └──────┬──────┘              └──────┬──────┘              └──────┬──────┘
           │                            │                            │
           ▼                            ▼                            ▼
    ┌─────────────┐              ┌─────────────┐              ┌─────────────────┐
    │  c_contact  │              │ c_document  │              │c_contextTemplate│
    │  (Person)   │              │  (Content)  │              │(Context Builder)│
    └─────────────┘              └──────┬──────┘              └─────────────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │   c_note    │
                                 │ (Activity)  │
                                 └─────────────┘
```

---

## AI Context Model

### Project-Centric AI

The `c_project` ShardType is the **central hub** for AI insights. When generating insights:

1. Start with a `c_project`
2. Traverse `internal_relationships` to gather connected Shards
3. Include related `c_company`, `c_contact`, `c_opportunity` data
4. Pull in `c_document` and `c_note` content
5. Apply `c_assistant` personality/instructions
6. Generate comprehensive insights

### Context Assembly Flow

```
User: "Give me insights on Project Alpha"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              TEMPLATE SELECTION                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  c_contextTemplate (Project Overview)                       │
│    ├── applicableShardTypes: ["c_project"]                  │
│    ├── relationships: [has_client, has_stakeholder, ...]    │
│    ├── fieldSelection: { c_contact: ["name", "role"], ... } │
│    └── maxTokens: 6000                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONTEXT ASSEMBLY                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  c_project (Project Alpha)                                  │
│    ├── structuredData: name, description, status, stage     │
│    └── internal_relationships:                              │
│         ├── c_company (Acme Corp)                           │
│         │    └── industry, revenue, employees               │
│         ├── c_contact[] (Stakeholders)                      │
│         │    └── John (Sponsor), Jane (Tech Lead)           │
│         ├── c_opportunity (Q1 Deal)                         │
│         │    └── value: $500K, stage: negotiation           │
│         ├── c_document[] (Artifacts)                        │
│         │    └── Proposal v2, Requirements Spec             │
│         └── c_note[] (Activities)                           │
│              └── Kickoff notes, Weekly updates              │
│                                                             │
│  c_assistant (Sales Coach)                                  │
│    └── instructions, tone, focus areas                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI INSIGHTS                              │
├─────────────────────────────────────────────────────────────┤
│ "Project Alpha is a strategic enterprise deal with Acme    │
│ Corp. Key considerations:                                   │
│ - Decision maker John is the project sponsor               │
│ - Technical approval needed from Jane                       │
│ - $500K deal at negotiation stage                          │
│ - Recent meeting highlighted budget concerns                │
│ - Recommend addressing ROI in next call..."                │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Properties

All core ShardTypes share these characteristics:

### Required Inherited Fields

From [Base Schema](../base-schema.md):

| Field | Description |
|-------|-------------|
| `structuredData.name` | Human-readable identifier |
| `internal_relationships` | Links to other Shards |
| `external_relationships` | Links to external systems |
| All system fields | id, tenantId, userId, etc. |

### Common structuredData Fields

Most core types include:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | **Required** - Primary identifier |
| `description` | string | Detailed description |
| `status` | enum | Current lifecycle status |
| `tags` | string[] | Organizational tags |

### Common Relationship Patterns

| From | To | Relationship | Description |
|------|-----|--------------|-------------|
| Any | `c_project` | `belongs_to` | Links entity to a project |
| `c_contact` | `c_company` | `belongs_to` | Contact works at company |
| `c_opportunity` | `c_company` | `opportunity_for` | Deal with company |
| `c_document` | Any | `attached_to` | Document attached to entity |
| `c_note` | Any | `note_for` | Note about an entity |

### Common External Integrations

| ShardType | Common Integrations |
|-----------|---------------------|
| `c_company` | Salesforce (Account), HubSpot, LinkedIn |
| `c_contact` | Salesforce (Contact/Lead), HubSpot, LinkedIn |
| `c_opportunity` | Salesforce (Opportunity), HubSpot (Deal) |
| `c_document` | Google Drive, SharePoint, Dropbox |
| `c_note` | Slack, Teams (messages) |

---

## Extending Core Types

### Can Tenants Modify Core Types?

**No.** Core types are protected:

- Tenants cannot modify `c_*` ShardType definitions
- Tenants cannot delete `c_*` ShardTypes
- Only Super Admins can update core types

### How Tenants Can Customize

1. **Create Custom Types**: Tenants can create their own ShardTypes
   ```
   invoice, support_ticket, product, employee
   ```

2. **Use Metadata**: Store custom data in `metadata.customFields`
   ```json
   {
     "metadata": {
       "customFields": {
         "tenantSpecificField": "value"
       }
     }
   }
   ```

3. **Add Relationships**: Link custom types to core types
   ```json
   {
     "internal_relationships": [{
       "targetShardId": "c_project-uuid",
       "relationshipType": "belongs_to"
     }]
   }
   ```

4. **Extend via Inheritance**: Create child types (future feature)
   ```
   c_contact → vip_contact (extends with VIP-specific fields)
   ```

---

## Documentation Structure

Each core type has dedicated documentation:

```
docs/shards/core-types/
├── README.md               ← You are here
├── c_project.md            ← Project (AI Hub)
├── c_company.md            ← Company/Organization
├── c_contact.md            ← Person/Contact
├── c_opportunity.md        ← Sales Opportunity
├── c_document.md           ← Document/File
├── c_assistant.md          ← AI Assistant
├── c_aimodel.md            ← AI Model Definition
├── c_aiconfig.md           ← AI Prompt Configuration
├── c_conversation.md       ← AI Conversation
├── c_note.md               ← Note/Memo
├── c_contextTemplate.md    ← AI Context Template
├── c_contentTemplate.md    ← Content Generation Template
├── c_generatedContent.md   ← Generated Content Output
├── c_integrationProvider.md ← Integration Provider Definition
├── c_integration.md        ← Tenant Integration
└── c_integrationSync.md    ← Sync History
```

### Documentation Template

Each core type document includes:

1. **Overview**: Purpose and use cases
2. **Schema Definition**: Complete field specifications
3. **Relationships**: Common relationship patterns
4. **External Integrations**: Supported external systems
5. **AI Context Role**: How AI uses this type
6. **Examples**: Sample data and usage
7. **API Reference**: Endpoints and operations

---

## Quick Reference

### Category Distribution

```
DATA (Structured Records)
├── c_project      ← Central hub
├── c_company      ← Organizations
├── c_contact      ← People
├── c_opportunity  ← Deals
└── c_conversation ← AI Conversations

DOCUMENT (Content)
├── c_document     ← Files & documents
└── c_note         ← Notes & memos

CONFIGURATION (Settings)
├── c_assistant         ← AI configuration
├── c_aimodel           ← AI model definitions
├── c_aiconfig          ← AI prompt configuration
├── c_contextTemplate   ← Context assembly templates
├── c_contentTemplate   ← Content generation templates
└── c_integration       ← Tenant integrations

GENERATED (AI Output)
└── c_generatedContent  ← Generated presentations/docs

SYSTEM (Platform)
└── c_integrationProvider ← Integration definitions

AUDIT (History)
└── c_integrationSync   ← Sync job history
```

### Recommended Relationships

```
c_project
├── belongs_to ─────────► c_company (client)
├── has_stakeholder ────► c_contact[] (people)
├── has_opportunity ────► c_opportunity (deal)
├── has_document ───────► c_document[] (files)
├── has_note ───────────► c_note[] (notes)
└── uses_assistant ─────► c_assistant (AI)

c_company
├── has_contact ────────► c_contact[] (employees)
└── has_opportunity ────► c_opportunity[] (deals)

c_contact
└── belongs_to ─────────► c_company (employer)

c_opportunity
├── opportunity_for ────► c_company (target)
├── has_stakeholder ────► c_contact[] (involved)
└── has_document ───────► c_document[] (proposals)

c_assistant
├── uses_model ─────────► c_aimodel (AI model)
└── uses_template ──────► c_contextTemplate (context)

c_aimodel
├── replaces ──────────► c_aimodel (deprecated model)
└── replaced_by ───────► c_aimodel (replacement)

c_aiconfig
├── belongs_to_tenant ─► c_tenant (for tenant configs)
├── belongs_to_assistant► c_assistant (for assistant configs)
├── inherits_from ─────► c_aiconfig (parent config)
└── has_children ──────► c_aiconfig[] (child configs)

c_conversation
├── uses_assistant ────► c_assistant (AI configuration)
├── uses_model ────────► c_aimodel (default model)
├── uses_template ─────► c_contextTemplate (context)
├── about_project ─────► c_project (related project)
├── about_company ─────► c_company (related company)
├── about_opportunity ─► c_opportunity (related deal)
└── references_document► c_document[] (documents used)

c_contextTemplate
├── template_for ───────► c_assistant (AI configuration)
├── default_for ────────► c_project (default context)
└── inherits_from ──────► c_contextTemplate (parent)

c_contentTemplate
├── uses_context_template ► c_contextTemplate (context)
├── default_assistant ────► c_assistant (AI config)
└── inherits_from ────────► c_contentTemplate (parent)

c_generatedContent
├── generated_for ────────► c_project | c_opportunity
├── generated_from ───────► c_contentTemplate (template)
└── used_assistant ───────► c_assistant (AI used)
```

---

## Next Steps

Explore each core type in detail:

1. → [`c_project`](./c_project.md) - The central hub for AI insights
2. → [`c_company`](./c_company.md) - Organizations and companies
3. → [`c_contact`](./c_contact.md) - People and contacts
4. → [`c_opportunity`](./c_opportunity.md) - Sales opportunities
5. → [`c_document`](./c_document.md) - Documents and files
6. → [`c_content`](./c_content.md) - Articles, blog posts, pages
7. → [`c_assistant`](./c_assistant.md) - AI Assistant configurations
8. → [`c_aimodel`](./c_aimodel.md) - AI Model definitions (LLM, Image, TTS, etc.)
9. → [`c_aiconfig`](./c_aiconfig.md) - AI Prompt configurations (persona, style, tools, safety)
10. → [`c_conversation`](./c_conversation.md) - AI Conversations with messages, feedback, branching
11. → [`c_note`](./c_note.md) - Notes and memos
12. → [`c_contextTemplate`](./c_contextTemplate.md) - AI context assembly templates
13. → [`c_contentTemplate`](./c_contentTemplate.md) - Content generation templates
14. → [`c_generatedContent`](./c_generatedContent.md) - AI-generated content
15. → [`c_integrationProvider`](./c_integrationProvider.md) - Integration provider definitions
16. → [`c_integration`](./c_integration.md) - Tenant integration configurations
17. → [`c_integrationSync`](./c_integrationSync.md) - Sync job history

---

---

## New Shard Types (2025)

The following shard types have been added to provide comprehensive enterprise coverage:

### CRM & Sales Operations
- **c_account** - CRM accounts (Salesforce Account, HubSpot Company, Dynamics Account)
- **c_lead** - Sales leads
- **c_ticket** - Support cases/tickets
- **c_campaign** - Marketing campaigns
- **c_quote** - Sales quotes/proposals
- **c_contract** - Sales contracts/agreements
- **c_order** - Sales orders
- **c_invoice** - Invoices
- **c_payment** - Payments
- **c_revenue** - Revenue recognition

### Opportunity-Related
- **c_opportunityHistory** - Opportunity history/audit trail
- **c_opportunityCompetitor** - Opportunity competitors
- **c_opportunityContactRole** - Opportunity contact roles
- **c_opportunityLineItem** - Opportunity line items/products

### Communication & Collaboration
- **c_message** - Slack/Teams messages
- **c_channel** - Slack/Teams channels
- **c_team** - Team/workspace containers
- **c_meeting** - Video/audio meetings (Zoom, Teams, Google Meet, Webex)
- **c_calendar** - Calendar containers
- **c_call** - Phone calls

### Files & Storage
- **c_file** - Files (Google Drive, SharePoint, OneDrive)
- **c_folder** - Folders (Google Drive, SharePoint, OneDrive)
- **c_attachment** - File attachments

### Products & Pricing
- **c_product** - Products/services (extended)
- **c_priceBook** - Price books
- **c_asset** - Installed products/assets

### Marketing Operations
- **c_webinar** - Webinars
- **c_marketingAsset** - Marketing materials/content
- **c_eventRegistration** - Event registrations
- **c_leadScore** - Lead scoring models

### Competitive Intelligence
- **c_competitor** - Standalone competitor entities

All new shard types include:
- Comprehensive field schemas with auto-generated name fields
- Embedding templates configured for vector search
- Relationship definitions for AI context assembly
- Support for multiple integrations (Salesforce, HubSpot, Dynamics, etc.)

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Maintainer**: Castiel Development Team

---## 🔍 Gap Analysis

### Current Implementation Status**Status:** ✅ **Complete** - Core ShardTypes fully documented#### Implemented Features (✅)

- ✅ Core ShardTypes defined
- ✅ Type hierarchy documented
- ✅ AI context model documented
- ✅ Common properties documented
- ✅ Extension patterns documented

#### Known Limitations

- ⚠️ **ShardType Inheritance** - ShardType inheritance may not be fully implemented
  - **Code Reference:**
    - ShardType inheritance may need verification
  - **Recommendation:**
    1. Verify ShardType inheritance implementation
    2. Test inheritance patterns
    3. Document inheritance behavior

- ⚠️ **Type Definitions** - Some TypeScript types may be missing
  - **Code Reference:**
    - Some ShardTypes may not have TypeScript definitions
  - **Recommendation:**
    1. Create TypeScript types for all ShardTypes
    2. Generate types from schemas
    3. Document type generation

### Related Documentation- [Gap Analysis](../../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Shards README](../README.md) - Shards system documentation
- [Backend Documentation](../../backend/README.md) - Backend implementation
