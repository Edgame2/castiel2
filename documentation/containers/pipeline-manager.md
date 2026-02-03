# pipeline-manager

Full specification for the Pipeline Manager container.

## 1. Reference

### Purpose

Sales pipeline and opportunity management: pipeline views, opportunity CRUD, pipeline analytics, opportunity auto-linking to shards. Publishes opportunity.created/updated/deleted; consumed by risk-analytics, recommendations, workflow.

### Configuration

From `config/default.yaml`: server.port (3025), cosmos_db (pipeline_opportunities, pipeline_views), services (shard_manager, logging, user_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `SHARD_MANAGER_URL`, `LOGGING_URL`, `USER_MANAGEMENT_URL`.

### API

Pipeline views, opportunity CRUD, opportunity-shard linking. See [containers/pipeline-manager/openapi.yaml](../../containers/pipeline-manager/openapi.yaml).

### Events

- **Published:** opportunity.created, opportunity.updated, opportunity.deleted.

### Dependencies

- **Downstream:** shard-manager, logging, user-management.
- **Upstream:** risk-analytics, recommendations, workflow-orchestrator, forecasting; Gateway.

### Cosmos DB containers

pipeline_opportunities, pipeline_views (partition key: tenantId).

---

## 2. Architecture

Pipeline and opportunity services, shard linking, Cosmos, event publisher. [containers/pipeline-manager/README.md](../../containers/pipeline-manager/README.md).

---

## 3. Deployment

- **Port:** 3025. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `pipeline-manager`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/pipeline-manager/README.md](../../containers/pipeline-manager/README.md)
- [containers/pipeline-manager/config/default.yaml](../../containers/pipeline-manager/config/default.yaml)
- [containers/pipeline-manager/openapi.yaml](../../containers/pipeline-manager/openapi.yaml)
