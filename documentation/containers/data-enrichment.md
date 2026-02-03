# data-enrichment

Full specification for the Data Enrichment container.

## 1. Reference

### Purpose

Enrichment and vectorization: entity extraction, classification, summarization. **Does not own shard embeddings:** runs enrichment then calls **embeddings** service (`POST /api/v1/shard-embeddings/generate`) for shard embedding; re-embedding scheduler calls embeddings for regenerate-type. Consumes shard.created/updated; publishes enrichment.job.completed, vectorization.completed.

### Configuration

From `config/default.yaml`: server.port (3046), cosmos_db, services (shard_manager, embeddings, ai_service, auth, logging, user_management), rabbitmq bindings (shard.created, shard.updated).

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Enrichment jobs, embeddings, AI enrichment, re-embedding scheduler. See [containers/data-enrichment/openapi.yaml](../../containers/data-enrichment/openapi.yaml).

### Events

- **Consumed:** shard.created, shard.updated.
- **Published:** enrichment.job.completed, vectorization.completed.

### Dependencies

- **Downstream:** shard-manager, embeddings, ai-service, auth, logging, user-management.
- **Upstream:** risk-analytics, search-service (use shard-level vectors).

### Cosmos DB containers

Per config (partition key: tenantId).

---

## 2. Architecture

Enrichment and vectorization services, event consumers, shard-manager and embeddings clients. [containers/data-enrichment/README.md](../../containers/data-enrichment/README.md).

---

## 3. Deployment

- **Port:** 3046. **Health:** /health. **Scaling:** Stateless or worker scaling. **Docker Compose:** `data-enrichment`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId; events carry tenantId.

---

## 5. Links

- [containers/data-enrichment/README.md](../../containers/data-enrichment/README.md)
- [containers/data-enrichment/config/default.yaml](../../containers/data-enrichment/config/default.yaml)
- [containers/data-enrichment/openapi.yaml](../../containers/data-enrichment/openapi.yaml)
