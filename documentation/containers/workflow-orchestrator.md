# workflow-orchestrator

Full specification for the Workflow Orchestrator container.

## 1. Reference

### Purpose

Batch job **scheduler** (node-cron): publishes `workflow.job.trigger` to queue `bi_batch_jobs`. Jobs: risk-snapshot-backfill, outcome-sync, industry-benchmarks, risk-clustering, account-health, propagation, model-monitoring. HITL approvals and workflow execution (workflow_workflows, workflow_steps, workflow_executions).

### Configuration

Main entries from `config/default.yaml`:

- **server:** `port` (3051), `host`
- **cosmos_db:** containers (workflow_workflows, workflow_steps, workflow_executions, hitl_approvals; partition: tenantId for hitl_approvals)
- **rabbitmq:** exchange, queue `bi_batch_jobs` for workflow.job.trigger
- **batch_jobs:** cron expressions per job (risk_snapshot_backfill_cron, outcome_sync_cron, industry_benchmarks_cron, risk_clustering_cron, account_health_cron, propagation_cron, model_monitoring_cron)
- **services:** integration_manager, risk_analytics, ml_service, forecasting, recommendations, adaptive_learning (for workflow steps)

### Environment variables

- `PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, plus service URLs

### API

- Workflow run, task distribution, progress.
- HITL: GET/POST `/hitl/approvals` (or under /api).
- See [containers/workflow-orchestrator/openapi.yaml](../../containers/workflow-orchestrator/openapi.yaml).

### Events

- **Published:** `workflow.job.trigger` to queue `bi_batch_jobs` (payload: job name, metadata). Consumer: risk-analytics BatchJobWorker.
- **Consumed:** `shard.updated`, `integration.opportunity.updated` for HITL/workflow flows.

### Dependencies

- **Downstream:** risk-analytics (consumes job triggers), integration-manager, ml-service, forecasting, recommendations, adaptive-learning (workflow steps).
- **Upstream:** (none for scheduler); workflow steps may call services.

### Cosmos DB containers

- `workflow_workflows`, `workflow_steps`, `workflow_executions`, `hitl_approvals` (partition key: tenantId for hitl_approvals).

---

## 2. Architecture

- **Internal structure:** BatchJobScheduler (node-cron), HITL approval API, workflow execution engine; RabbitMQ publisher; Cosmos clients.
- **Data flow:** Cron → publish workflow.job.trigger → bi_batch_jobs; API → HITL/workflow CRUD → Cosmos; event consumers for shard/integration events.
- **Links:** [containers/workflow-orchestrator/README.md](../../containers/workflow-orchestrator/README.md). Runbooks: model-monitoring.md, backfill-failure.md, hitl-approval-flow.md.

---

## 3. Deployment

- **Port:** 3051.
- **Health:** `/health` (see server).
- **Scaling:** Single scheduler instance recommended; workflow execution can scale.
- **Docker Compose service name:** `workflow-orchestrator`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Required for HITL and workflow APIs; hitl_approvals partitioned by tenantId.

---

## 5. Links

- [containers/workflow-orchestrator/README.md](../../containers/workflow-orchestrator/README.md)
- [containers/workflow-orchestrator/config/default.yaml](../../containers/workflow-orchestrator/config/default.yaml)
- [containers/workflow-orchestrator/openapi.yaml](../../containers/workflow-orchestrator/openapi.yaml)
