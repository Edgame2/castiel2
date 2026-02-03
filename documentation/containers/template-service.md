# template-service

Full specification for the Template Service container.

## 1. Reference

### Purpose

Template CRUD: context, email, document templates. Used by notification, content-generation, document-manager.

### Configuration

From `config/default.yaml`: server.port (3037), cosmos_db (template_*), services (ai_service, logging).

### Environment variables

`PORT`, `COSMOS_DB_*`, `AI_SERVICE_URL`, `LOGGING_URL`.

### API

Template CRUD, context/email/document templates. See [containers/template-service/openapi.yaml](../../containers/template-service/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** ai-service, logging.
- **Upstream:** notification-manager, content-generation, document-manager; Gateway.

### Cosmos DB containers

template_* (partition key: tenantId).

---

## 2. Architecture

Template CRUD services, Cosmos. [containers/template-service/README.md](../../containers/template-service/README.md).

---

## 3. Deployment

- **Port:** 3037. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `template-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/template-service/README.md](../../containers/template-service/README.md)
- [containers/template-service/config/default.yaml](../../containers/template-service/config/default.yaml)
- [containers/template-service/openapi.yaml](../../containers/template-service/openapi.yaml)
