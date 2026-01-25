# BI Sales Risk – Feature Pipeline Specification

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Remove ambiguity for implementing `buildFeatureVector` (risk-scoring, win-probability, LSTM, anomaly).  
**Referenced by:** [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md) §5.3–5.4, [BI_SALES_RISK_SHARD_SCHEMAS.md](./BI_SALES_RISK_SHARD_SCHEMAS.md)

---

## 1. Overview

- **Owner:** `FeatureService` in **ml-service** (or `FeaturePipelineService`). risk-analytics and forecasting call ml-service for features, or ml-service calls shard-manager + risk-analytics.
- **Input:** `tenantId`, `opportunityId` (id of `c_opportunity` shard), `purpose`: `'risk-scoring'` | `'win-probability'` | `'lstm'` | `'anomaly'` | `'forecasting'`.
- **Output:** `Record<string, number>` (all numeric for Azure ML). Categoricals are one-hot or label-encoded; see §3.
- **Data sources:** shard-manager (opportunity, account, contacts, activities), risk-analytics/Cosmos (risk_snapshots, risk_evaluations), optionally Data Lake.

---

## 2. Data Access

### 2.1 Shard-Manager (HTTP)

- **Base URL:** `config.services.shard_manager.url` (no hardcoded URL).
- **Opportunity:** `GET /api/v1/shards/{opportunityId}` → Shard. `structuredData` = c_opportunity fields (§2.2).
- **Account:** Use `opportunity.structuredData.AccountId` as shard id; `GET /api/v1/shards/{accountId}`. If 404, use `industryId = 'general'`, `accountName = ''`.
- **Related activities (c_email, c_call, c_meeting):**  
  `GET /api/v1/shards/{opportunityId}/related?direction=both&targetShardTypeId=c_email` (and `c_call`, `c_meeting`).  
  Or, if activities use **parentShardId** only: `GET /api/v1/shards?parentShardId={opportunityId}&shardTypeId=c_email` (and c_call, c_meeting).  
  **Lock:** Prefer **`/related`** with `targetShardTypeId`; relationship type `has_activity` (or allow any type). If no edges exist, **fallback:** `GET /api/v1/shards?parentShardId={opportunityId}` and filter by `shardTypeId in ['c_email','c_call','c_meeting']`.  
  Each activity shard has **root** `createdAt` (Shard schema). Use it for recency and counts.
- **Related contacts (c_contact):**  
  `GET /api/v1/shards/{opportunityId}/related?targetShardTypeId=c_contact` → count = `stakeholderCount`.  
  Use `shard.structuredData.role` if present (`decision_maker`, `influencer`, `executive_sponsor`).

### 2.2 risk-analytics / Cosmos (from ml-service or risk-analytics)

- **risk_snapshots:** Query `(tenantId, opportunityId)` and `snapshotDate` in range. Use latest N (e.g. 30) for LSTM; latest 1 for risk-scoring/win-prob/anomaly.  
  If ml-service has no Cosmos access to risk_snapshots, **ml-service calls risk-analytics** `GET /api/v1/opportunities/:id/risk-snapshots?from=...&to=...` or a dedicated `GET /api/v1/features/opportunity/:id` that returns a prebuilt feature dict.
- **risk_evaluations:** Latest evaluation for `opportunityId` → `riskScore`, `categoryScores`; use as features or as prior for LSTM.

---

## 3. Feature Definitions (Phase 1–2)

Numeric only in the final vector. Encoding:

- **Categorical (StageName, IndustryId):** label-encode (map to 0..K-1). Define a fixed mapping per tenant or global (e.g. Discovery=0, Proposal=1, …; `general`=0, industry ids 1..).  
  Alternatively one-hot: `stage_Discovery`, `stage_Proposal`, … (only if model expects it).
- **Datetime:** `daysSinceClose`, `daysInStage` = days from `StageUpdatedAt` or `StageDates[StageName]` to now; `daysSinceLastActivity`; `daysSinceCreated` from `CreatedDate`.

### 3.1 From Opportunity (c_opportunity)

| Feature name           | Type   | Source | Fallback |
|------------------------|--------|--------|----------|
| `amount`              | number | `structuredData.Amount` | 0 |
| `probability`         | number | `structuredData.Probability` [0–100] | 50 → scale to 0.5 |
| `days_to_close`      | number | `(CloseDate - now)` in days | 0 if past, else 999 |
| `days_in_stage`      | number | from `StageUpdatedAt` or `StageDates[StageName]` | 0 |
| `days_since_created` | number | `(now - CreatedDate)` in days | 0 |
| `is_closed`          | number | `structuredData.IsClosed` → 1/0 | 0 |
| `is_won`             | number | `structuredData.IsWon` → 1/0 (if closed) | 0 |
| `stage_encoded`      | number | label-encode `StageName` | 0 |
| `industry_encoded`   | number | from `structuredData.IndustryId` or account; label-encode | 0 (general) |
| `competitor_count`   | number | `structuredData.CompetitorIds?.length` or 0 | 0 |

### 3.2 From Account (c_account)

| Feature name     | Type   | Source | Fallback |
|------------------|--------|--------|----------|
| `industry_encoded` | number | overwrite from `account.structuredData.IndustryId` if opportunity has none | keep opportunity value |

### 3.3 Leading Indicators (from BI_SALES_RISK_SHARD_SCHEMAS §5)

| Feature name            | Type   | Source | Fallback |
|-------------------------|--------|--------|----------|
| `days_since_last_activity` | number | `structuredData.LastActivityDate` or `max(activity.createdAt)` for c_email, c_call, c_meeting | 999 if none |
| `activity_count_30d`   | number | Count related c_email, c_call, c_meeting where `createdAt` in last 30 days | 0 |
| `stage_stagnation_days`| number | from `StageUpdatedAt` or `StageDates[current]` | 0 |
| `stakeholder_count`    | number | Count related c_contact | 0 |

### 3.4 From Risk History (risk_snapshots / risk_evaluations)

| Feature name     | Type   | Source | Fallback |
|------------------|--------|--------|----------|
| `risk_score_latest`   | number | latest `risk_snapshots.riskScore` or `risk_evaluations` | 0.5 |
| `risk_velocity`       | number | from `RiskSnapshotService` / `EarlyWarningService.calculateRiskVelocity`; or (scores[t] - scores[t-1]) / 7 | 0 |
| `risk_acceleration`   | number | 2nd derivative or from service | 0 |

For **LSTM**, also pass a **sequence** of `risk_score` (and optionally `activity_count_30d`, `days_since_last_activity`) over the last N days (e.g. 30). The Python model expects a fixed-length or padded sequence; the Node pipeline exports `risk_sequence: number[]` in a separate payload or as flattened features `risk_score_t_minus_1`, …, `risk_score_t_minus_N` (flattened form is simpler for a REST contract).

### 3.5 For Anomaly (Isolation Forest)

Same as risk-scoring/win-probability; same feature set. Optionally add `categoryScores` from latest risk evaluation as extra dimensions.

### 3.6 For Forecasting (revenue, scenarios)

| Feature name       | Type   | Source | Fallback |
|--------------------|--------|--------|----------|
| `opportunity_value`| number | `Amount` | 0 |
| `probability`      | number | as above | 0.5 |
| `stage_encoded`    | number | as above | 0 |
| `days_in_stage`    | number | as above | 0 |
| `risk_score_latest`| number | from risk-analytics | 0.5 |

Plus optional pipeline-level aggregates (e.g. from dashboard-analytics) if passed in.

---

## 4. buildFeatureVector Algorithm (Pseudocode)

```
buildFeatureVector(tenantId, opportunityId, purpose):
  1. GET /shards/{opportunityId} → opportunity; if 404 → return null or throw.
  2. account = null; if opportunity.structuredData.AccountId:
       account = GET /shards/{AccountId}; if 404, keep null.
  3. activities = []
     For each type in [c_email, c_call, c_meeting]:
       rel = GET /shards/{opportunityId}/related?targetShardTypeId={type}&limit=500
       activities.push(...rel.map(r => r.shard))
     Fallback: if rel empty, try GET /shards?parentShardId={opportunityId}&shardTypeId={type}
  4. contacts = GET /shards/{opportunityId}/related?targetShardTypeId=c_contact
  5. riskHistory = risk-analytics GET /opportunities/{id}/risk-snapshots or /risk/evaluations (or Cosmos in risk-analytics, then passed to ml-service).
  6. Compute:
     - days_since_last_activity = from opportunity.LastActivityDate or max(activities[].createdAt) or 999
     - activity_count_30d = count(activities where createdAt in last 30d)
     - stage_stagnation_days = from StageUpdatedAt or StageDates
     - stakeholder_count = contacts.length
     - risk_score_latest, risk_velocity, risk_acceleration from riskHistory
     - stage_encoded, industry_encoded via label mapping (config or fixed).
  7. Assemble Record<string, number> with the feature names above. Omit keys that are not applicable for `purpose`.
  8. return vector
```

---

## 5. Where It Lives

- **Option A (recommended):** **ml-service**  
  - New method: `FeatureService.buildVectorForOpportunity(tenantId, opportunityId, purpose)`.  
  - It calls shard-manager (ServiceClient), risk-analytics `GET /api/v1/opportunities/:id/risk-snapshots` (and optionally latest-evaluation).  
  - `PredictionService.predictWinProbability`, `predictRiskScore`, and risk-analytics’ call to ml-service for LSTM/anomaly pass `opportunityId`; ml-service resolves features internally.
- **Option B:** **risk-analytics**  
  - `FeaturePipelineService` in risk-analytics; calls shard-manager, has direct Cosmos for risk_snapshots/risk_evaluations.  
  - ml-service then receives a **prebuilt** `Record<string, number>` from risk-analytics (e.g. `GET /api/v1/features/opportunity/:id?purpose=win-probability`).  
  - Use Option B if you want to avoid ml-service depending on shard-manager and to keep all risk/opportunity reads in risk-analytics.

**Lock for implementation:** **Option A (ml-service)** with `config.services.shard_manager.url` and `config.services.risk_analytics.url`. risk-analytics already has shard-manager; for LSTM/anomaly, risk-analytics can either (i) call ml-service `POST /api/v1/features/build` with `{ opportunityId, purpose }` and get the vector, or (ii) implement a small local feature builder that only adds risk history and calls ml-service with a partial vector. Prefer (i) for one source of truth.

---

## 6. Configuration

- **ml-service `config/default.yaml`:**
  - `services.shard_manager.url`
  - `services.risk_analytics.url` (for risk-snapshots / risk-evaluations or /features/opportunity if Option B).
- **Label encoding:**  
  - `feature_pipeline.stage_labels` and `feature_pipeline.industry_labels` (ordered list); or path to JSON.  
  - **Defaults if missing:**
    - **stage_encoded:** `['Unknown','Discovery','Proposal','Negotiation','Closed Won','Closed Lost']`. Map `StageName` to index 0..5; unmapped → 0.
    - **industry_encoded:** `['general']`. Map `IndustryId` to index; unmapped or null → 0.

---

## 7. Relationship and Shard Conventions (Summary)

- **c_opportunity → c_account:** by `structuredData.AccountId` = account shard id. No edge required for feature pipeline; explicit GET /shards/{AccountId}.
- **c_opportunity → c_email, c_call, c_meeting:**  
  - Use **`/shards/{opportunityId}/related?targetShardTypeId=c_email`** (and c_call, c_meeting).  
  - Relationship type, if filtered: `has_activity` (optional; can be omitted to mean “any”).  
  - If no edges: fallback to `GET /shards?parentShardId={opportunityId}` and filter `shardTypeId in ['c_email','c_call','c_meeting']`.
- **c_opportunity → c_contact:**  
  - `GET /shards/{opportunityId}/related?targetShardTypeId=c_contact`.  
  - Relationship type, if used: `has_contact` (optional).

---

## 8. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial: data access, feature list, build steps, Option A/B, relationship locks. |
