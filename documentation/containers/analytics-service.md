# analytics-service

Full specification for the Analytics Service container.

## 1. Reference

### Purpose

Analytics and reporting: general metrics, project analytics, **AI analytics** (merged from ai-analytics: models, events; backward-compat `GET /api/v1/ai-analytics/models`), API performance. Consumes usage/events for analytics.

### Configuration

From `config/default.yaml`: server.port (3030), cosmos_db (analytics_*), services (shard_manager, logging, user_management, ai_service, ml_service, integration_manager), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Analytics, reports, AI analytics, quality monitoring, signal intelligence, report generation. See [containers/analytics-service/openapi.yaml](../../containers/analytics-service/openapi.yaml).

### Events

Consumes usage and domain events for analytics. See container logs-events.md.

### Dependencies

- **Downstream:** shard-manager, logging, user-management, ai-service, ml-service, integration-manager.
- **Upstream:** dashboard, forecasting, quality-monitoring, recommendations, risk-analytics, signal-intelligence, workflow-orchestrator.

### Cosmos DB containers

analytics_* (partition key: tenantId).

---

## 2. Architecture

Analytics and report services, Cosmos, event consumers. [containers/analytics-service/README.md](../../containers/analytics-service/README.md).

---

## 3. Deployment

- **Port:** 3030. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `analytics-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/analytics-service/README.md](../../containers/analytics-service/README.md)
- [containers/analytics-service/config/default.yaml](../../containers/analytics-service/config/default.yaml)
- [containers/analytics-service/openapi.yaml](../../containers/analytics-service/openapi.yaml)
