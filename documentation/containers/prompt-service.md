# prompt-service

Full specification for the Prompt Service container.

## 1. Reference

### Purpose

Prompt CRUD, A/B testing, prompt analytics. Used by AI and reasoning flows.

### Configuration

From `config/default.yaml`: server.port (3036), cosmos_db (prompt_*), services (ai_service, logging).

### Environment variables

`PORT`, `COSMOS_DB_*`, `AI_SERVICE_URL`, `LOGGING_URL`.

### API

Prompt CRUD, A/B tests, prompt analytics. See [containers/prompt-service/openapi.yaml](../../containers/prompt-service/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** ai-service, logging.
- **Upstream:** ai-service, reasoning-engine; Gateway.

### Cosmos DB containers

prompt_* (partition key: tenantId).

---

## 2. Architecture

Prompt and A/B test services, Cosmos. [containers/prompt-service/README.md](../../containers/prompt-service/README.md).

---

## 3. Deployment

- **Port:** 3036. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `prompt-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/prompt-service/README.md](../../containers/prompt-service/README.md)
- [containers/prompt-service/config/default.yaml](../../containers/prompt-service/config/default.yaml)
- [containers/prompt-service/openapi.yaml](../../containers/prompt-service/openapi.yaml)
