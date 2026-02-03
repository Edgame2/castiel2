# content-generation

Full specification for the Content Generation container.

## 1. Reference

### Purpose

AI-powered content generation from templates. Jobs and templates; calls ai-service.

### Configuration

From `config/default.yaml`: server.port (3028), cosmos_db (content_generation_jobs), services (ai_service, shard_manager, logging).

### Environment variables

`PORT`, `COSMOS_DB_*`, `AI_SERVICE_URL`, `SHARD_MANAGER_URL`, `LOGGING_URL`.

### API

Content generation jobs, templates, AI-based generation. See [containers/content-generation/openapi.yaml](../../containers/content-generation/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** ai-service, shard-manager, logging.
- **Upstream:** Gateway, template-service, document-manager.

### Cosmos DB containers

content_generation_jobs (partition key: tenantId).

---

## 2. Architecture

Content generation jobs, template resolution, ai-service calls, Cosmos. [containers/content-generation/README.md](../../containers/content-generation/README.md).

---

## 3. Deployment

- **Port:** 3028. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `content-generation`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/content-generation/README.md](../../containers/content-generation/README.md)
- [containers/content-generation/config/default.yaml](../../containers/content-generation/config/default.yaml)
- [containers/content-generation/openapi.yaml](../../containers/content-generation/openapi.yaml)
