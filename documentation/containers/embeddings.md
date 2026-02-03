# embeddings

Full specification for the Embeddings container.

## 1. Reference

### Purpose

Vector embeddings store and semantic search (e.g. code/document-style). For **shard** embeddings see data-enrichment. risk-analytics uses search-service for similar-opportunity search when configured.

### Configuration

From `config/default.yaml`: server.port (3005), storage (PostgreSQL pgvector or Cosmos per deployment), services (ai_service, logging).

### Environment variables

`PORT`, `DATABASE_URL` or `COSMOS_DB_*`, `AI_SERVICE_URL`, `LOGGING_URL`.

### API

Store/update/delete embeddings, batch ops, similarity search, project-scoped. **Shard embeddings:** `POST /api/v1/shard-embeddings/generate`, `/batch`, `/regenerate-type`, `GET /api/v1/shard-embeddings/statistics`. See [containers/embeddings/openapi.yaml](../../containers/embeddings/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** ai-service, logging.
- **Upstream:** search-service, ai-insights, risk-analytics (via search-service), cache-service, data-enrichment, recommendations, web-search, context-service.

### Cosmos DB containers

PostgreSQL with pgvector or Cosmos per deployment (see config).

---

## 2. Architecture

Embedding store, similarity search, ai-service for generation. [containers/embeddings/README.md](../../containers/embeddings/README.md).

---

## 3. Deployment

- **Port:** 3005. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `embeddings`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; tenant-scoped keys or partition key.

---

## 5. Links

- [containers/embeddings/README.md](../../containers/embeddings/README.md)
- [containers/embeddings/config/default.yaml](../../containers/embeddings/config/default.yaml)
- [containers/embeddings/openapi.yaml](../../containers/embeddings/openapi.yaml)
