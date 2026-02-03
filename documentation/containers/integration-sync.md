# integration-sync

Full specification for the Integration Sync container.

## 1. Reference

### Purpose

Sync task execution, bidirectional sync, conflict resolution, adapter orchestration. Publishes integration data to RabbitMQ for async processing; integration-processors and risk-analytics consume (e.g. integration.opportunity.updated, integration.sync.completed).

### Configuration

From `config/default.yaml`: server.port (3052), cosmos_db, services (integration_manager, secret_management, shard_manager), rabbitmq, sync_limits.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `INTEGRATION_MANAGER_URL`, `SECRET_MANAGEMENT_URL`, `SHARD_MANAGER_URL`.

### API

Sync tasks, token refresh, scheduled sync. See [containers/integration-sync/openapi.yaml](../../containers/integration-sync/openapi.yaml). Consumes shard.updated, integration.sync.scheduled, integration.webhook.received.

### Events

- **Published:** integration.opportunity.updated, integration.sync.completed, integration data to queues.
- **Consumed:** shard.updated, integration.sync.scheduled, integration.webhook.received.

### Dependencies

- **Downstream:** integration-manager, secret-management, shard-manager.
- **Upstream:** integration-processors, risk-analytics (consume integration events).

### Cosmos DB containers

Per config (partition key: tenantId).

---

## 2. Architecture

Sync executor, adapter orchestration, conflict resolution, RabbitMQ publisher/consumer. [containers/integration-sync/README.md](../../containers/integration-sync/README.md).

---

## 3. Deployment

- **Port:** 3052. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `integration-sync`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId; events carry tenantId.

---

## 5. Links

- [containers/integration-sync/README.md](../../containers/integration-sync/README.md)
- [containers/integration-sync/config/default.yaml](../../containers/integration-sync/config/default.yaml)
- [containers/integration-sync/openapi.yaml](../../containers/integration-sync/openapi.yaml)
