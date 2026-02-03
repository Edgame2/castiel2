# context-service

Full specification for the Context Service container.

## 1. Reference

### Purpose

Context management: storage, AST, dependency trees, call graphs, context assembly, token budgeting. Used by pattern-recognition, multi-modal-service, ai-conversation.

### Configuration

From `config/default.yaml`: server.port (3034 internal; host 3134 in docker-compose), cosmos_db (context_service_*), services (embeddings, ai_service, shard_manager, search_service, cache_service, logging).

### Environment variables

`PORT`, `COSMOS_DB_*`, service URLs.

### API

Context assembly, AST/graph/dependency analysis, token budgeting, relevance scoring. See [containers/context-service/openapi.yaml](../../containers/context-service/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** embeddings, ai-service, shard-manager, search-service, cache-service, logging.
- **Upstream:** ai-conversation, pattern-recognition, multi-modal-service, web-search, validation-engine.

### Cosmos DB containers

context_service_* (partition key: tenantId).

---

## 2. Architecture

Context storage, assembly, AST/dependency services, Cosmos. [containers/context-service/README.md](../../containers/context-service/README.md).

---

## 3. Deployment

- **Port:** 3134 (host) → 3034 (container). **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `context-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/context-service/README.md](../../containers/context-service/README.md)
- [containers/context-service/config/default.yaml](../../containers/context-service/config/default.yaml)
- [containers/context-service/openapi.yaml](../../containers/context-service/openapi.yaml)
