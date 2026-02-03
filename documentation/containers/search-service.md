# search-service

Full specification for the Search Service container.

## 1. Reference

### Purpose

Vector + keyword hybrid search, advanced search, search analytics. risk-analytics calls for similar-opportunity search when services.search_service.url is set.

### Configuration

From `config/default.yaml`: server.port (3029), cosmos_db (search_queries, search_analytics), services (embeddings, shard_manager, logging, ai_service).

### Environment variables

`PORT`, `COSMOS_DB_*`, `EMBEDDINGS_URL`, `SHARD_MANAGER_URL`, `LOGGING_URL`, `AI_SERVICE_URL`.

### API

Vector search, full-text, hybrid, field weights, search analytics. See [containers/search-service/openapi.yaml](../../containers/search-service/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** embeddings, shard-manager, logging, ai-service.
- **Upstream:** risk-analytics (optional), ai-conversation, ai-insights; Gateway.

### Cosmos DB containers

search_queries, search_analytics (partition key: tenantId).

---

## 2. Architecture

Search and analytics services, embeddings and shard-manager clients, Cosmos. [containers/search-service/README.md](../../containers/search-service/README.md).

---

## 3. Deployment

- **Port:** 3029. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `search-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/search-service/README.md](../../containers/search-service/README.md)
- [containers/search-service/config/default.yaml](../../containers/search-service/config/default.yaml)
- [containers/search-service/openapi.yaml](../../containers/search-service/openapi.yaml)
