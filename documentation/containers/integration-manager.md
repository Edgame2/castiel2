# integration-manager

Full specification for the Integration Manager container.

## 1. Reference

### Purpose

Third-party integrations and webhooks: CRUD, sync tasks, adapter catalog (e.g. NewsAPI, Alpha Vantage for competitive intel). Publishes integration.*, webhook.*, sync.task.completed.

### Configuration

From `config/default.yaml`: server.port (3026), cosmos_db (integration_*), services (shard_manager, logging, user_management, secret_management, ai_service), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Integrations, webhooks, connections, sync tasks, catalog. See [containers/integration-manager/openapi.yaml](../../containers/integration-manager/openapi.yaml). Consumes integration.sync.check-due, integration.token.check-expiring.

### Events

- **Published:** integration.*, webhook.*, sync.task.completed.
- **Consumed:** integration.sync.check-due, integration.token.check-expiring, integration.*.

### Dependencies

- **Downstream:** shard-manager, logging, user-management, secret-management, ai-service.
- **Upstream:** integration-sync, integration-processors, workflow-orchestrator, analytics-service, signal-intelligence; Gateway.

### Cosmos DB containers

integration_* (partition key: tenantId).

---

## 2. Architecture

Integration and webhook CRUD, sync task orchestration, adapter catalog, Cosmos, RabbitMQ. [containers/integration-manager/README.md](../../containers/integration-manager/README.md).

---

## 3. Deployment

- **Port:** 3026. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `integration-manager`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId; secrets via secret-management.

---

## 5. Links

- [containers/integration-manager/README.md](../../containers/integration-manager/README.md)
- [containers/integration-manager/config/default.yaml](../../containers/integration-manager/config/default.yaml)
- [containers/integration-manager/openapi.yaml](../../containers/integration-manager/openapi.yaml)
