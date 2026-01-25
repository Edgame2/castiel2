# BI Sales Risk Analysis – Shard Schemas

**Version:** 1.0  
**Date:** January 2026  
**Referenced by:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md)

---

## Overview

Specification of shard types, `structuredData` schemas, and relationships for BI Sales Risk. All shards live in the **shards** container; partition key **`tenantId`**. Field names follow **Salesforce defaults** where applicable; added fields are marked **NEW**.

---

## 1. Opportunity Shard (`c_opportunity`)

### 1.1 Standard Salesforce Fields

| Field | Type | Description |
|-------|------|-------------|
| `Amount` | number | Deal value |
| `StageName` | string | Sales stage |
| `CloseDate` | string (ISO date) | Target close date |
| `Probability` | number | Win probability 0–100 |
| `IsClosed` | boolean | Deal closed |
| `IsWon` | boolean | Won (if closed) |
| `AccountId` | string | Account reference |
| `OwnerId` | string | Owner reference |
| `CreatedDate` | string (ISO date) | Created |

### 1.2 NEW Fields (add if missing)

| Field | Type | Description |
|-------|------|-------------|
| `LastActivityDate` | string (ISO) | Last engagement; update from activities |
| `Industry` | string | Industry (if at opportunity level) |
| `IndustryId` | string | Standardized industry ID for model routing |
| `CompetitorIds` | string[] | Competitor IDs (from competitive intel) |
| `StageUpdatedAt` | string (ISO) | When current stage was set |
| `StageDates` | Record<string, string> | Stage → date entered |
| `lossReason` | string | Primary reason when deal lost (Plan §11.8, §943); also in `risk_win_loss_reasons` |
| `winReason` | string | Primary reason when deal won (Plan §11.8, §943); also in `risk_win_loss_reasons` |
| `competitorId` | string | Competitor when lost to (Plan §11.8, §943); also in `risk_win_loss_reasons` |

### 1.3 Shard Root Fields

| Field | Type |
|-------|------|
| `id` | string |
| `tenantId` | string |
| `shardTypeId` | `'c_opportunity'` |
| `structuredData` | object (above) |
| `createdAt` | string (ISO) |
| `updatedAt` | string (ISO) |

---

## 2. Account Shard (`c_account`)

### 2.1 Standard Fields

| Field | Type | Description |
|-------|------|-------------|
| `Name` | string | Account name |

### 2.2 NEW Fields (add if missing)

| Field | Type | Description |
|-------|------|-------------|
| `Industry` | string | Primary for industry hierarchy |
| `IndustryId` | string | Standardized industry ID |

### 2.3 Industry Hierarchy

Resolve industry: `opportunity.structuredData.IndustryId` → `account.structuredData.IndustryId` → `tenant.defaultIndustryId` → `"general"`.

---

## 3. Contact Shard (`c_contact`)

### 3.1 NEW Fields (add before Phase 1)

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | `decision_maker` \| `influencer` \| `executive_sponsor` \| other |

### 3.2 Contact–Contact (reporting)

**Relationship type:** contact → contact (e.g. `reports_to`). Create shard relationship and document in shard-manager. Used for risk propagation and network analysis.

---

## 4. Activity Shards

**Linking to opportunity:** Use **shard relationship** `has_activity` (c_opportunity → c_email, c_call, c_meeting). **Fallback:** `parentShardId` = opportunity shard id. Feature pipeline: `GET /shards/:id/related?targetShardTypeId=c_email` first; if empty, `GET /shards?parentShardId=:id&shardTypeId=c_email`. **Timestamps:** Use Shard root **`createdAt`** for `daysSinceLastActivity` and `activityCount30Days`. Phase 1 does not require `structuredData` for activities.

### 4.1 `c_email`

| Field | Type | Description |
|-------|------|-------------|
| (optional Phase 1) | | Phase 2: sender, recipient, subject, body/summary, emailResponseRate. |

**Phase 1:** Root `createdAt` is sufficient.

### 4.2 `c_call`, `c_meeting` (or `c_event`)

| Field | Type | Description |
|-------|------|-------------|
| (optional Phase 1) | | Phase 2: cancellation status, attendee status, activityType. |

**Phase 1:** Root `createdAt` is sufficient.

### 4.3 `c_note`, `c_task`

Leading indicators and sentiment. Link via `has_activity` or `parentShardId`; `createdAt` for recency.

---

## 5. Leading Indicators – Data Sources

**Phase 1 (create if missing):**

- **daysSinceLastActivity:** `c_opportunity.structuredData.LastActivityDate` or max of related `c_email`, `c_call`, `c_meeting` `createdAt`.
- **activityCount30Days:** Count related shards `shardTypeId` in `['c_email','c_call','c_meeting']` where `createdAt` in last 30 days.
- **stageStagnationDays:** `StageUpdatedAt` or `StageDates[currentStage]`; else derive from stage change events.
- **stakeholderCount:** Count related `c_contact` shards.

**Phase 2 (create if not available):** `activity_type`, `role`, email/calendar fields per §4.

---

## 6. External / Risk Shards (reference)

| shardTypeId | Purpose | Full schema |
|-------------|---------|-------------|
| `news_article` | NewsAPI, etc. | `title`, `description`, `url`, `publishedAt`, `source`, `sentiment`, `relatedCompanies`, `relatedOpportunities`, `keywords` |
| `market_data` | Alpha Vantage, etc. | `dataType`, `symbol`, `value`, `change`, `changePercent`, `timestamp` |

---

## 7. Relationships

**Locked relationship types** (for `GET /shards/:id/related?relationshipType=...` and edge creation):

| From | To | Relationship type | Notes |
|------|-----|--------------------|-------|
| `c_opportunity` | `c_account` | *(none)* | Use `structuredData.AccountId` = account shard id; no edge required. |
| `c_opportunity` | `c_contact` | `has_contact` | Contact `role` in `c_contact.structuredData.role`. |
| `c_opportunity` | `c_email`, `c_call`, `c_meeting`, `c_note`, `c_task` | `has_activity` | Feature pipeline uses `/related?targetShardTypeId=c_email` etc.; fallback `parentShardId`. |
| `c_contact` | `c_contact` | `reports_to` | For propagation and network analysis. |
| `c_opportunity` | competitors | *(none)* | Use `CompetitorIds` in structuredData or separate relationship if needed. |

---

## 8. Cross-References

- **Feature pipeline:** [BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md](./BI_SALES_RISK_FEATURE_PIPELINE_SPEC.md) (§2, §7) for how `/related` and `parentShardId` are used.
- **Training scripts:** [BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md](./BI_SALES_RISK_TRAINING_SCRIPTS_SPEC.md) for input columns aligned with leading indicators.

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial; Salesforce mapping + NEW fields; contact role; relationships. |
| 1.1 | 2026-01 | §4: activity `has_activity` / `parentShardId`, `createdAt`; §7: locked relationship types `has_activity`, `has_contact`, `reports_to`; §8 cross-refs. |
