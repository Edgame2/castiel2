# web-search

Full specification for the Web Search container.

## 1. Reference

### Purpose

Web search integration, result caching, context for AI. Used by AI conversation and search flows.

### Configuration

From `config/default.yaml`: server.port (3056), cosmos_db (web_search_*), services (ai_service, context_service, embeddings, auth, logging, user_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Web search, context and embeddings for AI. See [containers/web-search/openapi.yaml](../../containers/web-search/openapi.yaml).

### Events

RabbitMQ for search/cache events. See [containers/web-search/logs-events.md](../../containers/web-search/logs-events.md).

### Dependencies

- **Downstream:** ai-service, context-service, embeddings, auth, logging, user-management.
- **Upstream:** ai-conversation, search-service; Gateway.

### Cosmos DB containers

web_search_* (partition key: tenantId).

---

## 2. Architecture

Web search adapter, cache, Cosmos, event publisher/consumer. [containers/web-search/README.md](../../containers/web-search/README.md).

---

## 3. Deployment

- **Port:** 3056. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `web-search`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/web-search/README.md](../../containers/web-search/README.md)
- [containers/web-search/config/default.yaml](../../containers/web-search/config/default.yaml)
- [containers/web-search/openapi.yaml](../../containers/web-search/openapi.yaml)
