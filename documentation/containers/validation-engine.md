# validation-engine

Full specification for the Validation Engine container.

## 1. Reference

### Purpose

Validation: syntax, semantic, architecture, security, performance, consistency; rule management. Used by quality-monitoring.

### Configuration

From `config/default.yaml`: server.port (3036 internal; host 3136 in docker-compose), cosmos_db (validation_engine_*), services (quality_monitoring, context_service, knowledge_base, logging).

### Environment variables

`PORT`, `COSMOS_DB_*`, service URLs.

### API

Validators, consistency, standards, policy, custom rules. See [containers/validation-engine/openapi.yaml](../../containers/validation-engine/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** quality-monitoring, context-service, logging.
- **Upstream:** quality-monitoring; Gateway.

### Cosmos DB containers

validation_engine_* (partition key: tenantId).

---

## 2. Architecture

Validation pipeline and rule services, Cosmos. [containers/validation-engine/README.md](../../containers/validation-engine/README.md).

---

## 3. Deployment

- **Port:** 3136 (host) → 3036 (container). **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `validation-engine`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/validation-engine/README.md](../../containers/validation-engine/README.md)
- [containers/validation-engine/config/default.yaml](../../containers/validation-engine/config/default.yaml)
- [containers/validation-engine/openapi.yaml](../../containers/validation-engine/openapi.yaml)
