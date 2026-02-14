# user-management

Full specification for the User Management container.

## 1. Reference

### Purpose

User profiles, tenants, teams, RBAC, invitations, memberships, user analytics. Referenced by auth, shard-manager, pipeline-manager, document-manager, collaboration-service, analytics-service for user/tenant context. Consumes auth.login.*, user.registered.

### Configuration

From `config/default.yaml`: server.port (3022), cosmos_db (user_*), services (auth, logging, notification_manager, secret_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `AUTH_URL`, `LOGGING_URL`, `NOTIFICATION_MANAGER_URL`, `SECRET_MANAGEMENT_URL`.

### API

Users, tenants, teams, roles, invitations, memberships. See [containers/user-management/openapi.yaml](../../containers/user-management/openapi.yaml) or docs.

### Events

- **Published:** user lifecycle events.
- **Consumed:** auth.login.*, user.registered.

### Dependencies

- **Downstream:** auth, logging, notification-manager, secret-management.
- **Upstream:** auth, api-gateway, shard-manager, pipeline-manager, document-manager, collaboration-service, analytics-service, and many others.

### Cosmos DB containers

user_* (partition key: tenantId). See config.

---

## 2. Architecture

User, tenant, team, RBAC, invitation services, Cosmos, event publisher/consumer. [containers/user-management/README.md](../../containers/user-management/README.md) or docs.

---

## 3. Deployment

- **Port:** 3022. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `user-management`.

---

## 4. Security / tenant isolation

X-Tenant-ID and tenant-scoped data; partition key tenantId; RBAC enforced.

---

## 5. Links

- [containers/user-management/README.md](../../containers/user-management/README.md) or docs
- [containers/user-management/config/default.yaml](../../containers/user-management/config/default.yaml)
- [containers/user-management/openapi.yaml](../../containers/user-management/openapi.yaml) (if present)
