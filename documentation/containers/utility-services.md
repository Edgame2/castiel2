# utility-services

Full specification for the Utility Services container.

## 1. Reference

### Purpose

Import/export, schema migrations, computed fields, field validation, user onboarding, project activity, service registry. Publishes utility.import.completed, utility.export.completed, utility.migration.completed.

### Configuration

From `config/default.yaml`: server.port (3061), cosmos_db (utility_*), services (auth, logging, user_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `AUTH_URL`, `LOGGING_URL`, `USER_MANAGEMENT_URL`.

### API

Retry, rate limiting, template engine, variable resolution, webhook validation, notification routing, scheduled jobs. See [containers/utility-services/openapi.yaml](../../containers/utility-services/openapi.yaml).

### Events

- **Published:** utility.import.completed, utility.export.completed, utility.migration.completed.

### Dependencies

- **Downstream:** auth, logging, user-management.
- **Upstream:** Gateway, other services using import/export/migrations.

### Cosmos DB containers

utility_* (partition key: tenantId).

---

## 2. Architecture

Import/export, migration, onboarding, registry services, Cosmos, event publisher. [containers/utility-services/README.md](../../containers/utility-services/README.md).

---

## 3. Deployment

- **Port:** 3061. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `utility-services`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/utility-services/README.md](../../containers/utility-services/README.md)
- [containers/utility-services/config/default.yaml](../../containers/utility-services/config/default.yaml)
- [containers/utility-services/openapi.yaml](../../containers/utility-services/openapi.yaml)
