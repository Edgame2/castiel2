# secret-management

Full specification for the Secret Management container.

## 1. Reference

### Purpose

Centralized secrets: encryption, RBAC, rotation, versioning, multi-backend (e.g. Azure Key Vault). Consumed by other services (AI, integrations) to resolve API keys and credentials. Notifications via RabbitMQ; logging for audit.

### Configuration

From `config/default.yaml`: server.port (3003), cosmos_db + backend vaults, services (user_management, logging, notification_manager), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `USER_MANAGEMENT_URL`, `LOGGING_URL`, `NOTIFICATION_MANAGER_URL`, vault-specific vars.

### API

Secret CRUD, resolve, rotate, versions, rollback, access grants, vault config, import/export. See [containers/secret-management/openapi.yaml](../../containers/secret-management/openapi.yaml).

### Events

Notifications via RabbitMQ; logging consumes for audit.

### Dependencies

- **Downstream:** user-management, logging, notification-manager; Azure Key Vault / AWS / Vault when configured.
- **Upstream:** auth, ai-service, integration-manager, integration-sync, security-*, api-gateway.

### Cosmos DB containers

Secret metadata and versioning (partition key: tenantId). Vault backends for actual secrets.

---

## 2. Architecture

Secret CRUD and resolve, rotation, multi-backend adapter, Cosmos, event publisher. [containers/secret-management/README.md](../../containers/secret-management/README.md).

---

## 3. Deployment

- **Port:** 3003. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `secret-management`.

---

## 4. Security / tenant isolation

RBAC; tenant-scoped secrets; partition key tenantId; audit via logging.

---

## 5. Links

- [containers/secret-management/README.md](../../containers/secret-management/README.md)
- [containers/secret-management/config/default.yaml](../../containers/secret-management/config/default.yaml)
- [containers/secret-management/openapi.yaml](../../containers/secret-management/openapi.yaml)
- [documentation/integrations/secret-management-usage.md](../integrations/secret-management-usage.md)
