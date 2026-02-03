# ai-analytics

**Deprecated:** AI analytics is provided by **analytics-service**. This container has been merged into analytics-service. Use `GET /api/v1/analytics/ai/models`, `POST /api/v1/analytics/ai/events`, or the backward-compat alias `GET /api/v1/ai-analytics/models`.

## 1. Reference (historical)

### Purpose

AI usage analytics, chat catalog, AI config, model seeding, proactive insights, feedback learning. Complements analytics-service for AI-specific metrics.

### Configuration

From `config/default.yaml`: server.port (3057), cosmos_db, services (auth, logging, user_management, ai_service, ai_insights, analytics_service), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

See [containers/ai-analytics/openapi.yaml](../../containers/ai-analytics/openapi.yaml). AI usage, chat catalog, config, proactive insights.

### Events

RabbitMQ for AI/usage events. See [containers/ai-analytics/logs-events.md](../../containers/ai-analytics/logs-events.md).

### Dependencies

- **Downstream:** auth, logging, user-management, ai-service, ai-insights, analytics-service.
- **Upstream:** Gateway proxies ai-analytics routes.

### Cosmos DB containers

Per config (partition key: tenantId).

---

## 2. Architecture

AI analytics services, Cosmos, RabbitMQ consumers. [containers/ai-analytics/README.md](../../containers/ai-analytics/README.md).

---

## 3. Deployment

- **Port:** 3057. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `ai-analytics`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/ai-analytics/README.md](../../containers/ai-analytics/README.md)
- [containers/ai-analytics/config/default.yaml](../../containers/ai-analytics/config/default.yaml)
- [containers/ai-analytics/openapi.yaml](../../containers/ai-analytics/openapi.yaml)
