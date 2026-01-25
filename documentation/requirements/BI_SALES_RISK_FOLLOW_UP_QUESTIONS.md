# BI Sales Risk Analysis – Follow-Up Questions

**Purpose:** Remaining questions that block or refine the [BI_SALES_RISK_IMPLEMENTATION_PLAN.md](./BI_SALES_RISK_IMPLEMENTATION_PLAN.md). These are the **5 critical** from ADDITIONAL_ANSWERS plus a few needed to fully specify UI and Data Lake.

---

## 1. Implementation Scope (1.2) — CRITICAL

**From ADDITIONAL_ANSWERS:** Options A (full 12‑month), B (Phase 1 only), C (Phases 1–2).

**Question:** Which do you want?

- [ ] **A** – Full 12‑month plan (all 5 phases)
- [ ] **B** – Phase 1 only (Months 1–3): Azure ML, industry models, win probability, early warning, basic competitive intelligence, manager dashboard
- [ ] **C** – Phases 1–2 (Months 1–6): A + advanced analytics, competitive intel, prescriptive, anomaly, sentiment, network
- [ ] **Custom** – Describe: ________________

---

## 2. Opportunity (and Account) Schema (3.3) — CRITICAL

**Needed for:** Feature engineering, win probability, early warning, industry routing, benchmarks.

**Question:** Please provide:

1. **Opportunity shard** (`shardTypeId` = `c_opportunity` or other): `structuredData` (or equivalent) field names for:
   - `amount` / deal value: _______________
   - `stage` / sales stage: _______________
   - `closeDate` / target close: _______________
   - `probability` / stage probability: _______________
   - `status` (won/lost/open): _______________
   - `industryId` or `industry` (if at opportunity): _______________ or “not present”
   - `accountId`: _______________
   - `ownerId`: _______________
   - `competitorIds` or competitor link: _______________ or “relationship/separate”
   - `createdDate` / `createdAt`: _______________
   - `lastActivityDate` / last activity: _______________ or “derived”

2. **Account shard** (if used for industry): `structuredData` field for `industryId` / `industry`: _______________ or “not present”.

3. **Sample JSON** (optional): One opportunity and one account `structuredData` (redact PII).

4. **Schema changes:** Are you able to **add** fields to `structuredData` (e.g. `industryId`, `lastActivityDate`) if missing? Yes / No.
Yes fields can be added.

---

## 3. Industry Source (4.4.1) — CRITICAL

**Needed for:** Model selection (global vs industry), benchmarks, industry-specific risk catalog.

**Question:**

1. Where is industry stored today?
   - [ ] Opportunity only (field: _______________)
   - [ ] Account only (field: _______________)
   - [ ] Both (opportunity overrides account)
   - [ ] Tenant/org default only
   - [ ] Not stored; must be added

2. Do you want the **hierarchy**: `opportunity.industryId` → `account.industryId` → `tenant.defaultIndustryId` → `"general"`?
   - [ ] Yes
   - [ ] No; single source: _______________

---

## 4. Graph / Relationship Data (4.3.1) — CRITICAL

**Needed for:** Risk propagation, account health, network analysis.

**Question:** For `shard_manager` (and related services), which are **available today**?

- [ ] **Opportunity → Account** (e.g. `opportunity.structuredData.accountId` or relationship)
- [ ] **Opportunity → Contacts** (e.g. `getRelatedShards(oppId, 'c_contact')` or `contact_roles`)
- [ ] **Contact roles** (decision maker, influencer, executive sponsor) — where: _______________
- [ ] **Opportunity → Activities** (emails, calls, meetings) — via relationships or _______________
- [ ] **Contact → Contact** (e.g. reporting)
- [ ] **Queries:** “all opportunities for an account”; “all contacts for an opportunity”; “all activities for an opportunity”

If something is missing: are you willing to **add** it (schema/relationships)? For propagation, should we:
- [ ] **Phase 1:** Implement only with currently available relationships
- [ ] **Phase 2:** Extend once new relationships exist
- [ ] **Wait** until all are available

---

## 5. Leading Indicators – Data Availability (4.1.3) — CRITICAL

**Needed for:** Early-warning LSTM and rule-based signals.

**Question:** Which **data sources exist today**?

**Phase 1 (basic):**

- [ ] **Days since last activity** — from: _______________ (e.g. opportunity field, activity shards)
- [ ] **Activity count (e.g. last 30 days)** — from: _______________
- [ ] **Stage stagnation (days in stage)** — from: _______________ (stage + `stageUpdatedAt` or similar)
- [ ] **Stakeholder count** — from: _______________ (relationships, `contact_roles`)

**Phase 2 (if available):**

- [ ] **Email** (response rate, timestamps) — shard type: _______________; has sender/recipient/date? Y/N
- [ ] **Calendar** (cancellations, attendee status) — shard type: _______________
- [ ] **Activity types** (email/call/meeting) — classified? Y/N; where: _______________
- [ ] **Executive sponsor / decision maker** — from: _______________

**Decision:** Should we:

- [ ] **Phase 1 only:** Implement indicators for which data exists now; add the rest in Phase 2
- [ ] **Wait:** Until all Phase 2 sources are available

---

## 6. Data Lake & Data Collector (for Risk Snapshots)

**Your answer:** “Data collector must store the data in Azure Storage data lake, I want to leverage that data for risk snapshot.”

**Question:** To implement the hybrid (Data Lake + Cosmos `risk_snapshots`):

1. **Data Collector:** Does a **Data Collector** (or equivalent) service already **write** `risk.evaluated` (or similar) to **Azure Data Lake / Blob**? If yes:
   - Service/module name: _______________
   - Path/container pattern: _______________ (e.g. `risk_evaluations/year=YYYY/month=MM/day=DD`)
   - Format: _______________ (Parquet, JSON, other)

2. If **not** yet: should the plan include **adding** a Data Collector pipeline that:
   - Subscribes to `risk.evaluated`
   - Writes to Data Lake (path/format you prefer)?
   - [ ] Yes, include in plan
   - [ ] No; we will add it separately

3. **Reading for backfill:** Is there an existing reader/API for “query Data Lake by `opportunityId` and date range”? Or should the plan include a **batch job** that reads from Data Lake and populates Cosmos `risk_snapshots`?
   - [ ] Exists: _______________
   - [ ] Include batch job in plan

---

## 7. UI App and Dashboard Host

**Current state:** `containers/ui` is a Next.js app with a single home page. `containers/dashboard` is a backend service (Fastify) for dashboard CRUD and widget cache.

**Question:**

1. **BI / Risk / Executive UI:** Should all new BI pages (risk, early warning, competitive, executive, remediation, etc.) live in the **same** `containers/ui` Next.js app?
   - [ ] Yes, extend `containers/ui`
   - [ ] No; separate app: _______________

2. **Dashboard backend:** For executive/manager dashboards and new widget types, should we:
   - [ ] Extend **dashboard** + **dashboard-analytics** (as in ADDITIONAL_ANSWERS)
   - [ ] Use a different service: _______________

3. **Auth/tenant:** Does `containers/ui` already get `X-Tenant-ID` and JWT from api-gateway (or auth)? Are `organizationId` and `tenantId` both used; which is primary for scoping BI data?
   - [ ] `tenantId` only
   - [ ] `organizationId` only
   - [ ] Both; `tenantId` for BI: _______________

---

## 8. Portfolio and Drill-Down

**Drill-down:** Portfolio → Account → Opportunity → Activity.

**Question:**

1. **Portfolio** for “Portfolio” dashboards and drill-down:
   - [ ] **Tenant only** (portfolio = all data for the tenant)
   - [ ] **Tenant + user-defined segments** (e.g. “Enterprise”, “Q1 Pipeline”) from day one
   - [ ] **Tenant first;** add segments in a later phase

2. **Activity** at the lowest level: is it a list of **shards** (emails, calls, meetings, notes) from `shard_manager` / relationships?
   - [ ] Yes; we have (or will add) `getRelatedShards(opportunityId, [c_email, c_call, c_meeting, c_note])`
   - [ ] Different shape: _______________

---

## 9. Data Collector and Usage Tracking (Audit)

**ADDITIONAL_ANSWERS** describe a three-tier audit: (1) Logging, (2) Data Collector, (3) Usage (billing).

**Question:**

1. Do **dedicated** “Data Collector” and “Usage Tracking” **services** exist, or is this logic inside `logging` / `analytics-service`?
   - [ ] Separate services: _______________
   - [ ] Inside logging: _______________; analytics: _______________
   - [ ] Not yet; include in plan

2. For **ML audit** (risk assessments, predictions, model inference): should `risk-analytics` and `ml-service` **publish events** consumed by `logging` (or Data Collector), or **call** a logging/audit API directly?
   - [ ] Publish events (e.g. `risk.evaluated`, `ml.prediction.completed`)
   - [ ] Call logging/audit API
   - [ ] Both

---

## Priority

| # | Topic            | Blocks                          |
|---|------------------|----------------------------------|
| 1 | Scope (1.2)      | Phasing, MVP, and scope of plan  |
| 2 | Opportunity schema| Feature pipelines, ML, benchmarks|
| 3 | Industry source  | Model routing, benchmarks       |
| 4 | Graph data       | Propagation, account health      |
| 5 | Leading indicators| Early warning LSTM and rules     |
| 6 | Data Lake / Data Collector | Risk snapshots, backfill   |
| 7 | UI app / dashboard| Where to implement BI UI         |
| 8 | Portfolio / activity | Drill-down and aggregates   |
| 9 | Audit services   | Where to send ML/risk audit      |

**1–5** are required to finalize the implementation plan. **6–9** can use the recommended defaults in the plan if you prefer to decide later; the plan will call out those assumptions.
