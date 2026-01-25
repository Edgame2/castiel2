# Recommendations to Update ModuleImplementationGuide.md

**Date:** January 2026  
**Context:** BI Sales Risk implementation; all queuing via RabbitMQ; `tenantId` only.

**Applied to ModuleImplementationGuide.md:** §9.1 RabbitMQ-only, §9.2 tenantId/organizationId, §9.6 Scheduled and Batch Jobs, §5.2 Azure Service Bus forbidden. §3.1 (collectors note) left as optional; DataLakeCollector in `events/consumers/` is already compliant.

---

## 1. Section 9 – Event-Driven Communication

### 1.1 RabbitMQ Only (new paragraph in §9.1 or after the "Event Naming Convention" heading)

**Add after 9.1 "Event Naming Convention" (before 9.2):**

> **Message broker:** All event-driven communication MUST use **RabbitMQ**. Do not use Azure Service Bus, Event Grid, or other message brokers. The `coder_events` exchange and all queues are on RabbitMQ. Config: `config.rabbitmq.url` (or equivalent from env).

---

### 1.2 DomainEvent: tenantId vs organizationId (§9.2)

**Current:** `organizationId?: string; // Tenant context`

**Recommended change:**

```typescript
  // Context
  tenantId?: string;             // Tenant context (PREFERRED; use for all new modules)
  organizationId?: string;        // DEPRECATED for new modules; legacy only. Prefer tenantId.
  userId?: string;               // Actor
```

**And in the example:** Replace `organizationId: "org_789"` with `tenantId: "tenant_789"`.

**Rule to add:** "For all new modules and events, use `tenantId` for tenant context. `organizationId` is deprecated; existing modules may retain it during migration."

---

### 1.3 Scheduled and Batch Jobs (new §9.6)

**Add new subsection 9.6 "Scheduled and Batch Jobs":**

> When a module needs to run **scheduled or batch jobs** (e.g. nightly clustering, backfill, benchmarks):
>
> 1. **Scheduler:** A scheduler (e.g. `node-cron` in `workflow-orchestrator` or a dedicated `jobs/` in a container) runs on a schedule and **publishes** a message to RabbitMQ with a routing key such as `workflow.job.trigger`. Payload: `{ job: string, metadata?: object, triggeredBy: 'scheduler'|'manual', timestamp }`.
> 2. **Queue:** A durable queue (e.g. `bi_batch_jobs`) is bound to the `coder_events` exchange with that routing key.
> 3. **Workers:** One or more containers consume from the queue in `events/consumers/` (e.g. `BatchJobWorker.ts`). The worker executes the job by `job` type and publishes `workflow.job.completed` or `workflow.job.failed` on RabbitMQ.
>
> **Prefer this pattern** over a separate job-queue product (e.g. Azure Functions, Bull with Redis-only, etc.) so all queuing stays on RabbitMQ. For cron-only logic, `jobs/` in the same container may publish to RabbitMQ; the actual work runs in the consumer container.

---

## 2. Section 3 – Module Structure

### 2.1 Event consumers that write to external stores (§3.1)

**Optional addendum** to 3.1 "Standard Directory Layout" under `events/consumers/`:

> Event consumers that **write to external stores** (e.g. Data Lake, Blob, data warehouse) belong in `events/consumers/` like any other consumer. If the logic is large, it may be split into a `services/` class (e.g. `DataLakeWriterService`) called from the consumer. A separate top-level `collectors/` folder is acceptable only if the module’s primary purpose is collection; otherwise prefer `events/consumers/[Name]Collector.ts`.

This supports the **Data Collector inside logging** pattern: `events/consumers/DataLakeCollector.ts` is compliant.

---

## 3. Section 5 – Dependency Rules

### 3.1 Explicit “no Azure Service Bus” in Forbidden

**In 5.2 "Forbidden Dependencies", add:**

- ❌ Azure Service Bus, Event Grid, or any message broker other than RabbitMQ for events or job queuing

---

## 4. Summary Table

| Location | Change | Purpose |
|----------|--------|---------|
| §9.1 | Add "RabbitMQ only" paragraph | Align with BI/risk and platform standard |
| §9.2 | `tenantId` preferred; `organizationId` deprecated | BI Sales Risk and future modules use `tenantId` only |
| §9.6 (new) | Scheduled and batch jobs via RabbitMQ | Pattern for workflow.job.trigger, `bi_batch_jobs`, BatchJobWorker |
| §3.1 | Optional note on consumers → external stores | DataLakeCollector in `events/consumers/` |
| §5.2 | Forbid Azure Service Bus / other brokers | Reinforce RabbitMQ-only |

---

**Next step:** Apply these edits to `documentation/global/ModuleImplementationGuide.md` as needed. For BI Sales Risk, the implementation plan already follows these rules; the Guide updates help future modules and avoid drift.
