# cache-service

Full specification for the Cache Service container.

## 1. Reference

### Purpose

Cache administration: stats, clear, warm. Uses Redis. Used by other services that need cache control.

### Configuration

From `config/default.yaml`: server.port (3035), redis/cache url, services (logging, embeddings optional).

### Environment variables

`PORT`, `REDIS_URL`, `LOGGING_URL`, `EMBEDDINGS_URL`.

### API

Get/set/delete, TTL, metrics, optimize, strategies; optional embeddings integration. See [containers/cache-service/openapi.yaml](../../containers/cache-service/openapi.yaml).

### Events

May publish cache_management.* events. See container logs-events.md.

### Dependencies

- **Downstream:** Redis; logging for audit; optional embeddings.
- **Upstream:** dashboard, context-service, other services using cache.

### Cosmos DB containers

None (Redis only).

---

## 2. Architecture

Cache API, Redis client, optional metrics/optimize. [containers/cache-service/README.md](../../containers/cache-service/README.md).

---

## 3. Deployment

- **Port:** 3035. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `cache-service`.

---

## 4. Security / tenant isolation

Tenant-scoped keys when applicable; X-Tenant-ID for audit.

---

## 5. Links

- [containers/cache-service/README.md](../../containers/cache-service/README.md)
- [containers/cache-service/config/default.yaml](../../containers/cache-service/config/default.yaml)
- [containers/cache-service/openapi.yaml](../../containers/cache-service/openapi.yaml)
