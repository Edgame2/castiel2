# adaptive-learning

Full specification for the Adaptive Learning container.

## 1. Reference

### Purpose

CAIS adaptive learning: component weights, model selection, signal weighting, outcome collection, performance tracking, rollout. Feeds model improvement and BI/risk quality.

### Configuration

From `config/default.yaml`: server.port (3032), cosmos_db, services (ai_service, ml_service, logging), rabbitmq, cache (Redis).

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `REDIS_URL`, `AI_SERVICE_URL`, `ML_SERVICE_URL`, `LOGGING_URL`.

### API

See [containers/adaptive-learning/openapi.yaml](../../containers/adaptive-learning/openapi.yaml). Adaptive weight/model/signal APIs, outcome collection, rollout.

### Events

Publishes and consumes via RabbitMQ (adaptive learning events). See container logs-events.md if present.

### Dependencies

- **Downstream:** ai-service, ml-service, logging; Redis for cache.
- **Upstream:** risk-analytics, ml-service, forecasting, recommendations, workflow-orchestrator.

### Cosmos DB containers

adaptive_* (partition key: tenantId). See container config.

---

## 2. Architecture

Services for weights, model selection, signal weighting, outcomes, rollout; Cosmos and Redis; event publisher/consumer. [containers/adaptive-learning/README.md](../../containers/adaptive-learning/README.md).

---

## 3. Deployment

- **Port:** 3032. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `adaptive-learning`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; Cosmos partition key tenantId.

---

## 5. Links

- [containers/adaptive-learning/README.md](../../containers/adaptive-learning/README.md)
- [containers/adaptive-learning/config/default.yaml](../../containers/adaptive-learning/config/default.yaml)
- [containers/adaptive-learning/openapi.yaml](../../containers/adaptive-learning/openapi.yaml)
