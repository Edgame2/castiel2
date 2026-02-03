# risk-catalog

Full specification for the Risk Catalog container.

## 1. Reference

### Purpose

Global, industry, and tenant-specific risk catalog (risk types, definitions). Publishes catalog updates; risk-analytics consumes for re-evaluation.

### Configuration

From `config/default.yaml`: server.port (3047), cosmos_db, services (shard_manager, auth, logging, user_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `SHARD_MANAGER_URL`.

### API

Risk catalog CRUD, taxonomy. See [containers/risk-catalog/openapi.yaml](../../containers/risk-catalog/openapi.yaml).

### Events

- **Published:** risk.catalog.* (updates); risk-analytics consumes.

### Dependencies

- **Downstream:** shard-manager, auth, logging, user-management.
- **Upstream:** risk-analytics; Gateway.

### Cosmos DB containers

Risk catalog containers (partition key: tenantId/global). See config.

---

## 2. Architecture

Risk catalog CRUD, Cosmos, event publisher. [containers/risk-catalog/README.md](../../containers/risk-catalog/README.md).

---

## 3. Deployment

- **Port:** 3047. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `risk-catalog`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId (and global/industry scope per schema).

---

## 5. Links

- [containers/risk-catalog/README.md](../../containers/risk-catalog/README.md)
- [containers/risk-catalog/config/default.yaml](../../containers/risk-catalog/config/default.yaml)
- [containers/risk-catalog/openapi.yaml](../../containers/risk-catalog/openapi.yaml)
