# Cursor Configuration Recommendations for BI Sales Risk Implementation

**Date:** January 2026  
**Goal:** Improve implementation speed and quality for BI Sales Risk and aligned containers.

---

## 1. .cursorrules Additions

Add these **short paragraphs** to `.cursorrules` (after "Event-Driven Communication" or in a new "Platform" section):

```
## Platform Conventions
- **Queuing:** RabbitMQ only. Do not use Azure Service Bus, Event Grid, or other message brokers for events or job queuing.
- **Tenant context:** Use `tenantId` for tenant context in events, DB, and APIs. Prefer `tenantId` over `organizationId` in new code.

## When Working on BI Sales Risk
- For risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator, logging (DataLake/MLAudit), dashboard-analytics: read `documentation/requirements/BI_SALES_RISK_IMPLEMENTATION_PLAN.md` and `documentation/requirements/BI_SALES_RISK_SHARD_SCHEMAS.md` for scope, events, batch jobs, and shard/structuredData.
- Use Salesforce field names for shards (Amount, StageName, CloseDate, Probability, IsClosed, IsWon, AccountId, OwnerId, CreatedDate; add LastActivityDate, Industry, IndustryId, CompetitorIds, StageUpdatedAt, StageDates per plan).
```

---

## 2. New Skills

### 2.1 setup-batch-job-workers

**Path:** `.cursor/skills/setup-batch-job-workers/`

**When to use:** Adding scheduled/batch jobs triggered via RabbitMQ (e.g. risk-clustering, account-health, industry-benchmarks, backfill). Follows ModuleImplementationGuide §9.6.

**Creates:**
- `jobs/BatchJobScheduler.ts` in workflow-orchestrator: node-cron, publish `workflow.job.trigger` to `coder_events` with `{ job, metadata, triggeredBy, timestamp }`.
- `events/consumers/BatchJobWorker.ts` in worker containers: consume queue `bi_batch_jobs` bound to `workflow.job.trigger`, switch on `job`, run service, publish `workflow.job.completed` or `workflow.job.failed`.
- Config: `rabbitmq` queue `bi_batch_jobs`; cron schedules from config or env.

---

### 2.2 add-datalake-consumer

**Path:** `.cursor/skills/add-datalake-consumer/`

**When to use:** Adding an event consumer that writes to Azure Data Lake (e.g. DataLakeCollector in logging for `risk.evaluated`).

**Creates:**
- `events/consumers/[Name]DataLakeCollector.ts`: subscribe to RabbitMQ routing keys, build Parquet rows, write to Data Lake path `/…/year=YYYY/month=MM/day=DD/` via `@azure/storage-blob` or Data Lake client.
- Config: `data_lake.connection_string`, `data_lake.container`, `data_lake.path_prefix`; `config/schema.json` update.

---

## 3. New Cursor Rule (.cursor/rules/)

### 3.1 bi-sales-risk-context.mdc

**Path:** `.cursor/rules/bi-sales-risk-context.mdc`

**Scope:** `globs: containers/risk-analytics/**/*,containers/ml-service/**/*,containers/forecasting/**/*,containers/logging/**/*,containers/workflow-orchestrator/**/*,containers/recommendations/**/*,containers/dashboard-analytics/**/*`  
**alwaysApply:** false

**Content:** Short reminder to read BI_SALES_RISK_IMPLEMENTATION_PLAN and BI_SALES_RISK_SHARD_SCHEMAS; use `tenantId`; RabbitMQ only; Salesforce shard field names; batch jobs via `workflow.job.trigger` and `bi_batch_jobs`.

---

## 4. New Command

### 4.1 bi-risk-step

**Path:** `.cursor/commands/bi-risk-step.md`

**Purpose:** Implement one BI Sales Risk task with plan awareness and quality checks.

**Behavior:**
1. Read `BI_SALES_RISK_IMPLEMENTATION_PLAN.md` (Phases 1–2) and the relevant Phase 1/2 checklist.
2. Identify the **one** next unchecked task for the current file/container (or the task the user names).
3. Follow ModuleImplementationGuide, .cursorrules, and BI_SALES_RISK_SHARD_SCHEMAS.
4. Implement in small, buildable steps; run tests/lint.
5. Output: progress (X/Y tasks), next task, and any new config/events to document.

---

## 5. Skill Updates (Existing)

### 5.1 create-event-handlers

**Updates:**
- In **DomainEvent** and **createBaseEvent:** use `tenantId` (preferred); keep `organizationId` only as deprecated/optional. In **logs-events** JSON Schema use `tenantId`.
- Add a **"RabbitMQ only"** note: "Use RabbitMQ only. Do not use Azure Service Bus or other brokers. Config: `config.rabbitmq.url`."

---

### 5.2 setup-container-config

**Updates:**
- In the **rabbitmq** example, add an optional `queues` block for batch job queues, e.g. `bi_batch_jobs` with `routing_keys: ['workflow.job.trigger']`.
- In **config types:** add optional `data_lake?: { connection_string, container, path_prefix }` for containers that read/write Data Lake.

---

### 5.3 validate-container-compliance

**Updates:**
- In the checklist: "No Azure Service Bus or other message brokers; RabbitMQ only."
- "Events and job triggers use `tenantId` (not only `organizationId`)."

---

## 6. Optional: Rule for RabbitMQ + tenantId

**Path:** `.cursor/rules/rabbitmq-tenantid.mdc`

**globs:** `**/events/**/*.ts`,`**/jobs/**/*.ts`  
**alwaysApply:** false

**Content:** Use RabbitMQ for all events and job triggers. In `DomainEvent` and `createBaseEvent` use `tenantId` for tenant context. Do not use Azure Service Bus.

---

## 7. Summary

| Item | Type | Purpose |
|------|------|---------|
| .cursorrules | Edit | RabbitMQ only; tenantId; BI Sales Risk doc refs |
| setup-batch-job-workers | Skill | Batch jobs via workflow.job.trigger + bi_batch_jobs |
| add-datalake-consumer | Skill | Event → Data Lake Parquet consumer |
| bi-sales-risk-context | Rule | BI plan + shard schemas when in risk/ml/forecasting/logging/workflow/recommendations/dashboard-analytics |
| bi-risk-step | Command | One BI task at a time with plan + quality |
| create-event-handlers | Skill | tenantId, RabbitMQ only |
| setup-container-config | Skill | data_lake, batch job queue |
| validate-container-compliance | Skill | RabbitMQ only, tenantId |
| rabbitmq-tenantid | Rule | Events/jobs: RabbitMQ + tenantId |

---

## 8. Application Order

1. **.cursorrules** – fast, project-wide. ✅ *Applied*
2. **create-event-handlers** + **setup-container-config** + **validate-container-compliance** – align existing skills. ✅ *Applied*
3. **setup-batch-job-workers** + **add-datalake-consumer** – new skills. ✅ *Created*
4. **.cursor/rules/bi-sales-risk-context.mdc**. ✅ *Created*
5. **.cursor/commands/bi-risk-step.md**. ✅ *Created*
6. **.cursor/rules/rabbitmq-tenantid.mdc**. ✅ *Created*

---

**Note:** Cursor rules can use `.mdc` (frontmatter) or `.md` depending on Cursor version; if `.mdc` is unsupported, use `.md` with the same content and omit frontmatter, or use `description:` in a minimal frontmatter block.
