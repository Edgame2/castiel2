# configuration-service

Full specification for the Configuration Service container.

## 1. Reference

### Purpose

Centralized configuration storage and retrieval (tenant-scoped). Feature flags and tenant settings.

### Configuration

From `config/default.yaml`: server.port (3034), cosmos_db (configuration_settings), services (logging, context_service, quality_monitoring, knowledge_base).

### Environment variables

`PORT`, `COSMOS_DB_*`, service URLs.

### API

Configuration CRUD, tenant-scoped settings. See [containers/configuration-service/openapi.yaml](../../containers/configuration-service/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** logging, context-service, quality-monitoring.
- **Upstream:** Gateway, logging, secret-management.

### Cosmos DB containers

configuration_settings (partition key: tenantId).

---

## 2. Architecture

Configuration CRUD, Cosmos. [containers/configuration-service/README.md](../../containers/configuration-service/README.md).

---

## 3. Deployment

- **Port:** 3034. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `configuration-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/configuration-service/README.md](../../containers/configuration-service/README.md)
- [containers/configuration-service/config/default.yaml](../../containers/configuration-service/config/default.yaml)
- [containers/configuration-service/openapi.yaml](../../containers/configuration-service/openapi.yaml)
