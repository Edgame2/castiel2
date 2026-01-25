# BI Sales Risk Analysis – Final Questions

**Context:** Most items are resolved in [BI_SALES_RISK_FOLLOW_UP_ANSWERS.md](./BI_SALES_RISK_FOLLOW_UP_ANSWERS.md). This file lists the **few remaining** clarifications.  
**Queuing:** All queuing must use **RabbitMQ** only (no Azure Service Bus or other message brokers).

---

## 1. Salesforce Field Mapping (Short Confirm)

**Your answer:** "use default salesforce fields name"

**Proposed mapping** (we will use unless you correct):

| Purpose | Opportunity (`c_opportunity`.structuredData) | Account (`c_account`.structuredData) |
|---------|-----------------------------------------------|-------------------------------------|
| Deal value | `Amount` | — |
| Stage | `StageName` | — |
| Close date | `CloseDate` | — |
| Probability | `Probability` | — |
| Status (won/lost/open) | `IsClosed` + `IsWon` or infer from `StageName` (`Closed Won`/`Closed Lost`) | — |
| Account ref | `AccountId` | — |
| Owner | `OwnerId` | — |
| Created | `CreatedDate` | — |
| Last activity | `LastActivityDate` (add if missing) | — |
| Industry | `Industry` or `IndustryId` (add if missing) | `Industry` (add if missing) |
| Competitors | `competitorIds` (add; array of IDs or relationship) | — |
| Stage dates / stagnation | `StageUpdatedAt` or `stageDates` (add if missing) | — |

**Question:** Confirm this mapping, or list renames / custom API names to use instead (e.g. `Amount` → `dealValue`): yes more fields can be added if necessary.

---

## 2. Audit (Q9) – Logging, Data Collector, Usage Tracking

**Your answer:** _(empty)_  
**Assumption:** Implement all three tiers; event-based; services consume from RabbitMQ.

**Question:** Please confirm:

- [ ] **A** – Implement **Logging**, **Data Collector**, and **Usage Tracking** as separate services/modules that consume from RabbitMQ (`risk.evaluated`, `ml.prediction.completed`, etc.). None exist today.
- [ X] **B** – **Logging** already exists; only **Data Collector** and **Usage Tracking** need to be added. Logging service name: _______________
- [ ] **C** – Other: _______________
Response B
---

## 3. Data Collector – New Container vs Module

**Your answer:** Include Data Collector in the plan; it does not exist today.

**Question:** How should we implement it?

- [ ] **New container** `data-collector`: standalone service that subscribes to RabbitMQ and writes to Azure Data Lake (and only that).
- [X ] **Module inside `logging`**: logging service also has a “Data Collector” pipeline that consumes the same events and writes to Data Lake.
- [ ] **Other**: _______________
Yes use logging container
---

## 4. RabbitMQ for Batch / Job Queuing

**Constraint:** All queuing must use **RabbitMQ**.

Scheduled jobs: risk-clustering, account-health, industry-benchmarks, risk-snapshot backfill, etc.

**Question:** Preferred pattern:

- [ ] **A** – **Scheduler + RabbitMQ:** A scheduler (e.g. node-cron in `workflow-orchestrator` or a `scheduler` container) runs on a schedule and **publishes** a message to RabbitMQ (e.g. `workflow.job.trigger` with `{ job: 'risk-clustering' }`). A consumer subscribes and runs the job. No separate “job queue” product.
- [ ] **B** – **Dedicated RabbitMQ job queue:** A queue like `bi_batch_jobs` (or `workflow.jobs`) where jobs are enqueued (including from a cron). Consumers read from this queue. Delayed/scheduled via RabbitMQ delayed-message plugin if needed.
- [ ] **C** – **Other**: _______________

---

## 5. RabbitMQ – No Azure Service Bus

**Your requirement:** “For queuing the all system must rely on RabbitMQ.”

**Question:** Confirm:

- [x] All event pub/sub and any job/batch queuing use **RabbitMQ only** (existing `coder_events` exchange and any new queues/exchanges as needed).
- [x] We **do not** use **Azure Service Bus** (or any other queue) for BI/ML/risk. Any references to Azure Service Bus in the BI plan or related docs should be treated as **RabbitMQ**.

**Answer:** **Yes** — All system queuing must rely on RabbitMQ only.

---

## 6. Shard Types and Schemas – Where to Document

**Your answers:** Create shard types and `structuredData` as needed; document them. For leading indicators: create sources if not available.

**Planned artefacts:**

- New or extended shard types: `c_contact` (e.g. `role`), `c_email`, `c_event`/`c_meeting`, activity types; new relationship types for contact–contact; new fields on `c_opportunity` (`lastActivityDate`, `stageUpdatedAt`/`stageDates`, `industry`/`industryId`, `competitorIds`).

**Question:** Where should the full **shard type and `structuredData`** spec live?

- [ ] **In the Implementation Plan** – a “Shard types & schemas” section.
- [X ] **Separate doc** – e.g. `BI_SALES_RISK_SHARD_SCHEMAS.md`, linked from the plan.
- [ ] **No preference** – your choice.

---

## Summary

| # | Topic | Purpose | Status |
|---|--------|---------|--------|
| 1 | Salesforce field mapping | Lock exact `structuredData` names for Opportunity/Account | Open |
| 2 | Audit (Q9) | How to implement Logging, Data Collector, Usage Tracking | Open |
| 3 | Data Collector placement | New `data-collector` container vs module in `logging` | Open |
| 4 | RabbitMQ for batch jobs | How to trigger/run scheduled jobs (scheduler+publish vs job queue) | Open |
| 5 | RabbitMQ only | Confirm no Azure Service Bus; all queuing via RabbitMQ | **Answered: RabbitMQ only** |
| 6 | Shard schema docs | Plan vs separate doc for shard/schema spec | Open |

---

## Already Resolved (No Further Questions)

- **Scope:** Option C (Phases 1–2, Months 1–6).
- **Schema changes:** Yes, fields can be added.
- **Industry:** Not stored today; add; use hierarchy (opportunity → account → tenant → `"general"`).
- **Graph:** Add contact roles and contact–contact **before** Phase 1; create and document shard/relationship schemas.
- **Leading indicators:** Phase 1 only for MVP; **create** any missing (days since activity, activity count, stage stagnation, stakeholder count). Phase 2: create if not available (email, calendar, activity type, roles).
- **Data Lake:** Data Collector in plan; Parquet; path `/risk_evaluations/year=.../month=.../day=.../`; backfill job included.
- **UI:** Extend `containers/ui` and `dashboard` + `dashboard-analytics`.
- **Tenant only:** Use **`tenantId`** only; remove `organizationId` from BI/risk.
- **Portfolio:** Tenant-level first; activity = list of shards via `getRelatedShards`.

---

**Next step:** After these are answered, the implementation plan will be updated to: (1) use **RabbitMQ only** for all queuing and to replace any Azure Service Bus references, (2) apply the confirmed Salesforce mapping, (3) place Data Collector and audit consumers as agreed, (4) use the chosen RabbitMQ pattern for batch jobs, and (5) put the shard/schema spec where you prefer.
