# risk-analytics

Full specification for the Risk Analytics container.

## 1. Reference

### Purpose

Risk evaluation, revenue-at-risk, quotas, early warning, benchmarking, simulations, data quality, explainability. **BatchJobWorker** runs jobs: risk-snapshot-backfill, outcome-sync, industry-benchmarks, risk-clustering, account-health, propagation, model-monitoring. Consumes workflow.job.trigger from queue `bi_batch_jobs`.

### Configuration

Main entries from `config/default.yaml`:

- **server:** `port` (3048), `host`
- **cosmos_db:** containers for `risk_evaluations`, `risk_revenue_at_risk`, `risk_quotas`, `risk_warnings`, `risk_simulations` (partition: tenantId)
- **services:** `ai_insights.url`, `ml_service.url`, `analytics_service.url`, `shard_manager.url`, `adaptive_learning.url`, `embeddings.url`, `search_service.url` (optional; enables vector similar-opportunity search)
- **rabbitmq:** event bindings and `batch_jobs` queue (bi_batch_jobs)
- **auto_evaluation:** `enabled`, `trigger_on_opportunity_update`, `trigger_on_shard_update`, `trigger_on_risk_catalog_update`, `max_reevaluations_per_catalog_event`
- **data_lake:** (optional) for risk-snapshot-backfill; connection_string, path prefix

### Environment variables

- `PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `SEARCH_SERVICE_URL`, `ML_SERVICE_URL`, `SHARD_MANAGER_URL`, etc.

### API

Risk evaluation, revenue-at-risk, quotas, early warnings, benchmarking, simulations, data quality, explainability, trust level, AI validation. See [containers/risk-analytics/openapi.yaml](../../containers/risk-analytics/openapi.yaml).

### Events

- **Published:** `risk.evaluation.completed`, `revenue-at-risk.calculated`, `quota.created`, `early-warning.signals-detected`, etc.
- **Consumed:** `opportunity.updated`, `shard.*`, `risk.catalog.*`, `workflow.job.trigger`, `integration.opportunity.updated`, `integration.sync.completed`, `opportunity.outcome.recorded`.

### Dependencies

- **Downstream:** ml-service (features, risk snapshots, model-monitoring), search-service (optional similar-opportunity), logging (DataLakeCollector for Parquet when configured).
- **Upstream:** workflow-orchestrator (batch triggers), pipeline-manager (opportunity events), shard-manager (shard events), risk-catalog, integration-sync, integration-processors.

### Cosmos DB containers

- `risk_evaluations`, `risk_revenue_at_risk`, `risk_quotas`, `risk_warnings`, `risk_simulations` (partition key: tenantId).

---

## 2. Architecture

- **Internal structure:** Risk evaluation service, revenue-at-risk, quotas, early warning, benchmarking, simulation, BatchJobWorker (consumes workflow.job.trigger), event consumers for opportunity/shard/catalog/integration/outcome.
- **Data flow:** API/events → evaluation pipeline → ML/search when configured → Cosmos → events; batch jobs → backfill/outcome-sync/benchmarks/clustering/account-health/propagation/model-monitoring.
- **Links:** [containers/risk-analytics/README.md](../../containers/risk-analytics/README.md). Runbooks: deployment/monitoring/runbooks/model-monitoring.md, backfill-failure.md.

---

## 3. Deployment

- **Port:** 3048.
- **Health:** `/health` (see server).
- **Scaling:** BatchJobWorker can be scaled; ensure single consumer per job type or use job locking if required.
- **Docker Compose service name:** `risk-analytics`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Required; all queries and writes use tenantId in partition key.
- **Partition key:** tenantId for all risk_* containers.

---

## 5. Links

- [containers/risk-analytics/README.md](../../containers/risk-analytics/README.md)
- [containers/risk-analytics/config/default.yaml](../../containers/risk-analytics/config/default.yaml)
- [containers/risk-analytics/openapi.yaml](../../containers/risk-analytics/openapi.yaml)
