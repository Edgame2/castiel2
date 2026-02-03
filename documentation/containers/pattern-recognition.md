# pattern-recognition

Full specification for the Pattern Recognition container.

## 1. Reference

### Purpose

Codebase pattern learning, style consistency, design/anti-pattern detection, pattern scanning. Used by context-service and quality flows.

### Configuration

From `config/default.yaml`: server.port (3037 internal; host 3137 in docker-compose), cosmos_db (pattern_recognition_*), services (context_service, embeddings, knowledge_base, quality_monitoring, logging).

### Environment variables

`PORT`, `COSMOS_DB_*`, service URLs.

### API

Pattern libraries, scans, matches, style analysis, pattern enforcer. See [containers/pattern-recognition/openapi.yaml](../../containers/pattern-recognition/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** context-service, embeddings, quality-monitoring, logging.
- **Upstream:** Gateway.

### Cosmos DB containers

pattern_recognition_* (partition key: tenantId).

---

## 2. Architecture

Pattern library and scan services, Cosmos. [containers/pattern-recognition/README.md](../../containers/pattern-recognition/README.md).

---

## 3. Deployment

- **Port:** 3137 (host) → 3037 (container). **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `pattern-recognition`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/pattern-recognition/README.md](../../containers/pattern-recognition/README.md)
- [containers/pattern-recognition/config/default.yaml](../../containers/pattern-recognition/config/default.yaml)
- [containers/pattern-recognition/openapi.yaml](../../containers/pattern-recognition/openapi.yaml)
