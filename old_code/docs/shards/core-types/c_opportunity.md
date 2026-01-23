# c_opportunity - Opportunity ShardType

## Overview

The `c_opportunity` ShardType represents sales opportunities, deals, or business prospects. It tracks the sales pipeline from initial contact through close, providing critical business context for AI insights.

> **CRITICAL**: This is the most important shard type in the entire application. Used for vector search, AI insights, chats, and risk analysis.

> **AI Role**: Provides business/financial context—deal value, stage, probability, and timeline for prioritization and forecasting insights.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_opportunity` |
| **Display Name** | Opportunity |
| **Category** | DATA |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `trending-up` |
| **Color** | `#3b82f6` (Blue) |
| **Embedding Model** | `quality` (text-embedding-3-large) |

---

## Schema Definition

### Core Identification Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Opportunity name (max 255 chars) |
| `opportunityNumber` | string | No | System-generated opportunity number |
| `type` | enum | No | Opportunity type (new_business, renewal, upsell, etc.) |

### Stage & Status Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stage` | enum | **Yes** | Sales stage (prospecting, qualification, etc.) |
| `status` | enum | No | Status (open, won, lost) |
| `isWon` | boolean | No | Read-only: Is opportunity won |
| `isClosed` | boolean | No | Read-only: Is opportunity closed |
| `lostReason` | enum | No | Reason if lost (price, competition, etc.) |
| `lostReasonDetail` | textarea | No | Detailed loss reason (max 1000 chars) |

### Financial Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | currency | No | Deal amount |
| `expectedRevenue` | currency | **Yes** | Expected revenue (amount × probability / 100, stored) |
| `currency` | enum | **Yes** | Currency code (default: USD, supports multi-currency) |
| `probability` | percentage | **Yes** | Win probability (0-100%, auto-calculated from stage, manual override allowed) |
| `totalPrice` | currency | No | Total price (computed from line items, read-only) |
| `totalOpportunityQuantity` | float | No | Total quantity across all line items |

### Date Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `closeDate` | date | No | Expected/actual close date |
| `nextStepDate` | date | No | Next step due date |
| `createdDate` | datetime | No | Creation date (read-only) |
| `lastModifiedDate` | datetime | No | Last modification date (read-only) |
| `lastActivityDate` | date | No | Last activity date (read-only) |
| `fiscalYear` | integer | No | Fiscal year (read-only) |
| `fiscalQuarter` | integer | No | Fiscal quarter 1-4 (read-only) |

### Relationship Fields (with Auto-Generated Name Fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accountId` | reference (c_account) | No | Account reference |
| `accountName` | string | No | **Auto-generated** from accountId (read-only) |
| `contactId` | reference (c_contact) | No | Primary contact reference |
| `contactName` | string | No | **Auto-generated** from contactId (read-only) |
| `leadId` | reference (c_lead) | No | Lead reference |
| `leadName` | string | No | **Auto-generated** from leadId (read-only) |
| `campaignId` | reference (c_campaign) | No | Campaign reference |
| `campaignName` | string | No | **Auto-generated** from campaignId (read-only) |
| `ownerId` | user | **Yes** | Opportunity owner (User reference) |
| `ownerName` | string | No | **Auto-generated** from ownerId (read-only) |
| `createdById` | user | No | Created by user (read-only) |
| `createdByName` | string | No | **Auto-generated** from createdById (read-only) |
| `lastModifiedById` | user | No | Last modified by user (read-only) |
| `lastModifiedByName` | string | No | **Auto-generated** from lastModifiedById (read-only) |

### Related Entities (Direct References)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `competitorIds` | multiselect | No | References to c_opportunityCompetitor shards (also tracked via internal_relationships) |
| `contactRoleIds` | multiselect | No | References to c_opportunityContactRole shards (also tracked via internal_relationships) |
| `lineItemIds` | multiselect | No | References to c_opportunityLineItem shards (also tracked via internal_relationships) |

### Forecasting Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `forecastCategory` | enum | No | Forecast category (pipeline, best_case, commit, closed, omitted) |
| `forecastCategoryName` | string | No | Forecast category name (read-only) |
| `isExcludedFromForecast` | boolean | No | Excluded from forecast calculations |

### Marketing & Lead Source Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `leadSource` | enum | No | Lead source (web, phone_inquiry, partner_referral, etc.) |
| `hasOpportunityLineItem` | boolean | No | Has opportunity line items (read-only) |

### Description & Next Steps Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | textarea | No | Opportunity description (max 32,000 chars) |
| `nextStep` | textarea | No | Next action item (max 255 chars) |

### Opportunity Splits / Revenue Sharing Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hasOpportunitySplits` | boolean | No | Has opportunity splits (read-only) |

### Additional Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tags` | multiselect | No | Custom tags (allow custom values) |
| `rating` | enum | No | Rating (hot, warm, cold) |

### Custom Fields

Custom fields can be stored in `unstructuredData` for tenant-specific requirements.

---

## Field Details

### `stage` (Required)

Granular sales stages that work across Salesforce, HubSpot, and Dynamics:

```typescript
enum SalesStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  NEEDS_ANALYSIS = 'needs_analysis',
  VALUE_PROPOSITION = 'value_proposition',
  ID_DECISION_MAKERS = 'id_decision_makers',
  PERCEPTION_ANALYSIS = 'perception_analysis',
  PROPOSAL_PRICE_QUOTE = 'proposal_price_quote',
  NEGOTIATION_REVIEW = 'negotiation_review',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}
```

**Integration Mapping:**
- Salesforce: Maps to `StageName` field
- HubSpot: Maps to `dealstage` property
- Dynamics: Maps to `opportunity_statecode` and `opportunity_statuscode`

### `type`

Opportunity type classification:

```typescript
enum OpportunityType {
  NEW_BUSINESS = 'new_business',
  EXISTING_BUSINESS = 'existing_business',
  RENEWAL = 'renewal',
  UPSELL = 'upsell',
  CROSS_SELL = 'cross_sell',
  EXPANSION = 'expansion',
  OTHER = 'other'
}
```

### `probability` (Required)

- **Type**: Percentage (0-100)
- **Auto-calculation**: Tenant admin configures probability per stage in integration adapter
- **Manual override**: Allowed (auto-calculated value has priority, but can be manually adjusted)
- **Required**: Yes

**Default Probabilities** (configured by tenant admin in adapter):
- Prospecting: 10%
- Qualification: 25%
- Needs Analysis: 40%
- Value Proposition: 50%
- Id. Decision Makers: 55%
- Perception Analysis: 60%
- Proposal/Price Quote: 65%
- Negotiation/Review: 75%
- Closed Won: 100%
- Closed Lost: 0%

### `expectedRevenue` (Required)

- **Type**: Currency
- **Calculation**: `amount × (probability / 100)`
- **Storage**: Stored (calculated on save/update, not read-only)
- **Required**: Yes

### `currency` (Required)

- **Type**: Select (picklist)
- **Default**: USD
- **Required**: Yes
- **Multi-currency**: Supported from the start

Supported currencies: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, BRL, MXN, SGD, HKD, NZD, ZAR

### `forecastCategory`

Forecast classification for pipeline management:

```typescript
enum ForecastCategory {
  PIPELINE = 'pipeline',
  BEST_CASE = 'best_case',
  COMMIT = 'commit',
  CLOSED = 'closed',
  OMITTED = 'omitted'
}
```

### `leadSource`

Lead source tracking:

```typescript
enum LeadSource {
  WEB = 'web',
  PHONE_INQUIRY = 'phone_inquiry',
  PARTNER_REFERRAL = 'partner_referral',
  PURCHASED_LIST = 'purchased_list',
  OTHER = 'other'
}
```

### `lostReason`

Reason for lost opportunities:

```typescript
enum LostReason {
  PRICE = 'price',
  COMPETITION = 'competition',
  NO_BUDGET = 'no_budget',
  NO_DECISION = 'no_decision',
  TIMING = 'timing',
  OTHER = 'other'
}
```

### `rating`

Opportunity rating:

```typescript
enum OpportunityRating {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}
```

---

## Auto-Generated Name Fields

For every ID reference field, a corresponding name field is automatically generated:

- `accountId` → `accountName` (auto-populated from `c_account.name`)
- `contactId` → `contactName` (auto-populated from `c_contact.name`)
- `leadId` → `leadName` (auto-populated from `c_lead.name`)
- `campaignId` → `campaignName` (auto-populated from `c_campaign.name`)
- `ownerId` → `ownerName` (auto-populated from User name)
- `createdById` → `createdByName` (auto-populated from User name)
- `lastModifiedById` → `lastModifiedByName` (auto-populated from User name)

**Characteristics:**
- Read-only fields
- Included in embedding templates (weight 0.6-0.7)
- Null if referenced shard doesn't exist
- Auto-updated when referenced shard name changes

---

## Relationships

### Internal Relationships

Opportunities can link to related entities via `internal_relationships`:

| Relationship Type | Target | Description |
|-------------------|--------|-------------|
| `opportunity_for` | `c_account` | Target account |
| `has_stakeholder` | `c_contact[]` | Key contacts involved |
| `has_competitor` | `c_opportunityCompetitor[]` | Opportunity competitors |
| `has_contact_role` | `c_opportunityContactRole[]` | Contact roles in opportunity |
| `has_line_item` | `c_opportunityLineItem[]` | Opportunity line items/products |
| `has_document` | `c_document[]` | Proposals, contracts, attachments |
| `has_note` | `c_note[]` | Notes and activity logs |
| `has_meeting` | `c_meeting[]` | Related meetings |
| `has_call` | `c_call[]` | Related phone calls |
| `belongs_to` | `c_project` | Related project |

### Direct Reference Fields

In addition to `internal_relationships`, opportunities also support direct reference fields:
- `competitorIds[]` - Array of c_opportunityCompetitor shard IDs
- `contactRoleIds[]` - Array of c_opportunityContactRole shard IDs
- `lineItemIds[]` - Array of c_opportunityLineItem shard IDs

This dual approach provides:
- **Direct references**: Fast lookups and filtering
- **Relationships**: Rich traversal for AI context assembly

---

## External Integrations

### Supported Systems

| System | Object Type | Key Field Mappings |
|--------|-------------|-------------------|
| **Salesforce** | Opportunity | `stage` → `StageName`, `amount` → `Amount`, `closeDate` → `CloseDate` |
| **HubSpot** | Deal | `stage` → `dealstage`, `amount` → `amount`, `closeDate` → `closedate` |
| **Dynamics 365** | Opportunity | `stage` → `opportunity_statecode`/`opportunity_statuscode` |

### Integration Adapter Configuration

Tenant admins configure:
- **Stage-to-probability mapping**: Default probability for each stage
- **Field mappings**: System-specific fields → generic shard fields
- **Custom field handling**: Map custom fields to `unstructuredData`

---

## Embedding Template

**CRITICAL**: Uses `quality` model (`text-embedding-3-large`) for highest precision in risk analysis and AI insights.

### Field Weights

| Field | Weight | Rationale |
|-------|--------|-----------|
| `name` | 1.0 | Primary identifier |
| `stage` | 0.9 | Critical business field |
| `amount` | 0.9 | Critical business field |
| `expectedRevenue` | 0.9 | Critical business field |
| `description` | 0.8 | Main content |
| `accountName` | 0.7 | Important metadata |
| `contactName` | 0.7 | Important metadata |
| `ownerName` | 0.6 | Important metadata |
| `nextStep` | 0.6 | Action context |
| `forecastCategory` | 0.6 | Forecasting context |
| `lostReasonDetail` | 0.6 | Loss analysis |
| `leadSource` | 0.5 | Secondary metadata |
| `type` | 0.5 | Secondary metadata |
| `lostReason` | 0.5 | Secondary metadata |

### Preprocessing

- **Combine fields**: Yes
- **Chunking**: Enabled (512 chars, 50 overlap, sentence-based)
- **Strip formatting**: Yes (for description, lostReasonDetail)

### Model Configuration

- **Strategy**: `quality`
- **Model**: `text-embedding-3-large` (3072 dimensions)
- **Fallback**: `text-embedding-3-small`
- **Normalization**: L2 normalize for cosine similarity

---

## AI Context Role

### Business Context Provider

`c_opportunity` provides critical financial and sales context:

- **Deal prioritization**: Value and probability for prioritization
- **Timeline awareness**: Close dates for urgency
- **Risk assessment**: Stage, competitor, and lost reason analysis
- **Forecasting**: Forecast category for pipeline insights
- **Revenue prediction**: Expected revenue calculations

### AI Prompt Fragment

```
Opportunity: {name}
Value: {currency} {amount} | Expected Revenue: {currency} {expectedRevenue}
Probability: {probability}% | Stage: {stage} | Type: {type}
Expected Close: {closeDate}
Account: {accountName} | Owner: {ownerName}
Next Step: {nextStep} (due: {nextStepDate})
Forecast: {forecastCategory}
Lead Source: {leadSource}
```

---

## Examples

### Example: Enterprise Software Deal

```json
{
  "id": "opp-001-uuid",
  "shardTypeId": "c_opportunity-type-uuid",
  "structuredData": {
    "name": "Acme Corp - Enterprise License FY25",
    "opportunityNumber": "OPP-2025-001",
    "type": "new_business",
    "stage": "negotiation_review",
    "status": "open",
    "isWon": false,
    "isClosed": false,
    "amount": 500000,
    "expectedRevenue": 375000,
    "currency": "USD",
    "probability": 75,
    "closeDate": "2025-03-31",
    "nextStep": "Final contract review with legal team",
    "nextStepDate": "2025-02-15",
    "description": "Enterprise-wide license for Castiel platform with professional services implementation. Includes 500 user licenses and 6-month implementation project.",
    "accountId": "account-acme-uuid",
    "accountName": "Acme Corporation",
    "contactId": "contact-john-uuid",
    "contactName": "John Smith",
    "ownerId": "user-sales-rep-uuid",
    "ownerName": "Sarah Johnson",
    "leadSource": "partner_referral",
    "forecastCategory": "commit",
    "isExcludedFromForecast": false,
    "tags": ["enterprise", "q1-close", "strategic"],
    "rating": "hot",
    "createdDate": "2025-01-01T10:00:00Z",
    "lastModifiedDate": "2025-01-20T14:30:00Z",
    "lastActivityDate": "2025-01-20",
    "fiscalYear": 2025,
    "fiscalQuarter": 1,
    "competitorIds": ["comp-1-uuid", "comp-2-uuid"],
    "contactRoleIds": ["role-1-uuid", "role-2-uuid"],
    "lineItemIds": ["lineitem-1-uuid", "lineitem-2-uuid"]
  },
  "unstructuredData": {
    "customFields": {
      "salesProcess": "enterprise",
      "approvalRequired": true,
      "budgetConfirmed": true
    }
  },
  "internal_relationships": [
    {
      "id": "rel-1",
      "targetShardId": "account-acme-uuid",
      "targetShardTypeId": "c_account",
      "relationshipType": "opportunity_for",
      "label": "Target Account",
      "createdAt": "2025-01-01T00:00:00Z",
      "createdBy": "user-uuid"
    },
    {
      "id": "rel-2",
      "targetShardId": "comp-1-uuid",
      "targetShardTypeId": "c_opportunityCompetitor",
      "relationshipType": "has_competitor",
      "label": "Primary Competitor",
      "metadata": { "strength": "high" },
      "createdAt": "2025-01-01T00:00:00Z",
      "createdBy": "user-uuid"
    }
  ],
  "external_relationships": [
    {
      "id": "ext-1",
      "system": "salesforce",
      "systemType": "crm",
      "externalId": "006XXXXXXXXXXXX",
      "externalUrl": "https://org.salesforce.com/006XXXXXXXXXXXX",
      "label": "Salesforce Opportunity",
      "syncStatus": "synced",
      "lastSyncedAt": "2025-01-20T08:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "createdBy": "user-uuid"
    }
  ],
  "status": "active",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-20T14:30:00Z"
}
```

---

## Form Layout Groups

The opportunity form is organized into logical groups:

1. **Opportunity Information**: name, opportunityNumber, type, stage, status
2. **Financial Information**: amount, expectedRevenue, currency, probability, totalPrice, totalOpportunityQuantity
3. **Dates**: closeDate, nextStepDate, createdDate, lastModifiedDate, lastActivityDate, fiscalYear, fiscalQuarter
4. **Relationships**: accountId/accountName, contactId/contactName, leadId/leadName, campaignId/campaignName, ownerId/ownerName
5. **Related Entities**: competitorIds, contactRoleIds, lineItemIds
6. **Forecasting**: forecastCategory, forecastCategoryName, isExcludedFromForecast, isWon, isClosed
7. **Marketing & Lead Source**: leadSource, hasOpportunityLineItem, hasOpportunitySplits
8. **Loss Information**: lostReason, lostReasonDetail
9. **Description & Next Steps**: description, nextStep
10. **Additional Information**: tags, rating, createdById/createdByName, lastModifiedById/lastModifiedByName

---

## Best Practices

1. **Track value accurately**: Keep deal amount and expected revenue updated
2. **Update stage promptly**: Move through pipeline stages as progress happens
3. **Document next steps**: Always have a clear next action with due date
4. **Link stakeholders**: Associate key contacts via contact roles
5. **Track competitors**: Document competitive intelligence via opportunity competitors
6. **Record lost reasons**: Capture why deals are lost for analysis
7. **Sync with CRM**: Keep external CRM in sync via integration adapters
8. **Use custom fields**: Store tenant-specific data in `unstructuredData.customFields`
9. **Maintain relationships**: Use both direct references and `internal_relationships` for flexibility
10. **Update probability**: Ensure probability reflects current stage (auto-calculated or manually adjusted)

---

## Integration Field Mapping

### Salesforce → Generic

| Salesforce Field | Generic Field | Notes |
|------------------|---------------|-------|
| `Name` | `name` | Direct mapping |
| `StageName` | `stage` | Stage values mapped to generic stages |
| `Amount` | `amount` | Direct mapping |
| `ExpectedRevenue` | `expectedRevenue` | Calculated: Amount × (Probability / 100) |
| `CurrencyIsoCode` | `currency` | Direct mapping |
| `Probability` | `probability` | Auto-calculated from stage (tenant configurable) |
| `CloseDate` | `closeDate` | Direct mapping |
| `AccountId` | `accountId` | Reference to c_account |
| `OwnerId` | `ownerId` | User reference |
| `LeadSource` | `leadSource` | Lead source values mapped |
| `ForecastCategory` | `forecastCategory` | Forecast category mapped |
| `Type` | `type` | Opportunity type mapped |
| `Description` | `description` | Direct mapping |
| `NextStep` | `nextStep` | Direct mapping |

### HubSpot → Generic

| HubSpot Property | Generic Field | Notes |
|------------------|---------------|-------|
| `dealname` | `name` | Direct mapping |
| `dealstage` | `stage` | Deal stage mapped to generic stages |
| `amount` | `amount` | Direct mapping |
| `closedate` | `closeDate` | Direct mapping |
| `hubspot_owner_id` | `ownerId` | User reference |
| `pipeline` | (stored in unstructuredData) | Pipeline-specific data |

### Dynamics 365 → Generic

| Dynamics Field | Generic Field | Notes |
|----------------|---------------|-------|
| `name` | `name` | Direct mapping |
| `opportunity_statecode` + `opportunity_statuscode` | `stage` | Combined to determine stage |
| `estimatedvalue` | `amount` | Direct mapping |
| `estimatedclosedate` | `closeDate` | Direct mapping |
| `ownerid` | `ownerId` | User reference |

---

**Last Updated**: December 2025  
**Version**: 2.0.0  
**Status**: Comprehensive Implementation Complete
