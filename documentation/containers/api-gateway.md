# api-gateway

Full specification for the API Gateway container.

## 1. Reference

### Purpose

Single entry point for all client requests. Validates JWT, extracts tenantId and injects X-Tenant-ID header, applies rate limiting, and proxies to backend microservices using config-driven URLs. No hardcoded service addresses.

### Configuration

Main entries from `config/default.yaml`:

- **server:** `port` (default 3001), `host` (0.0.0.0)
- **jwt:** `secret` (required, from env)
- **services:** `auth.url`, `user_management.url`, `secret_management.url`, `logging.url`, `notification.url`, `ai_service.url`, `embeddings.url`, `dashboard.url`, `risk_analytics.url`, `risk_catalog.url`, `recommendations.url`, `integration_manager.url`, `shard_manager.url`, `integration_processors.url`, `ml_service.url`, `configuration_service.url`, `adaptive_learning.url` (all override via env, e.g. `AUTH_URL`, `USER_MANAGEMENT_URL`)
- **rate_limit:** `max`, `timeWindow` (ms)
- **circuit_breaker:** `threshold`, `timeout` (ms)

### Environment variables

- `PORT`, `HOST`, `JWT_SECRET`
- `AUTH_URL`, `USER_MANAGEMENT_URL`, `SECRET_MANAGEMENT_URL`, `LOGGING_URL`, `NOTIFICATION_MANAGER_URL`, `AI_SERVICE_URL`, `EMBEDDINGS_URL`, `DASHBOARD_URL`, `RISK_ANALYTICS_URL`, `RISK_CATALOG_URL`, `RECOMMENDATIONS_URL`, `INTEGRATION_MANAGER_URL`, `SHARD_MANAGER_URL`, `INTEGRATION_PROCESSORS_URL`, `ML_SERVICE_URL`, `CONFIGURATION_SERVICE_URL`, `ADAPTIVE_LEARNING_URL`
- `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`, `CIRCUIT_BREAKER_THRESHOLD`, `CIRCUIT_BREAKER_TIMEOUT`

### API

Gateway does not expose its own OpenAPI; it proxies. Route mappings (from container README):

- `/api/auth/*` → Auth Service
- `/api/users/*` → User Management
- `/api/secrets/*` → Secret Management
- `/api/logging/*` → Logging
- `/api/notifications/*` → Notification Manager
- `/api/ai/*` → AI Service
- `/api/embeddings/*` → Embeddings
- `/api/dashboard/*` → Dashboard  
(plus risk-analytics, risk-catalog, recommendations, integration-manager, integration-processors, ml-service, configuration-service, adaptive-learning as configured)

### Events

None (gateway does not publish or consume domain events).

### Dependencies

- **Downstream (proxied):** auth, user-management, secret-management, logging, notification-manager, ai-service, embeddings, dashboard, risk-analytics, risk-catalog, recommendations, integration-manager, integration-processors, ml-service, configuration-service, adaptive-learning.
- **Upstream:** UI and all API clients call the gateway only.

### Cosmos DB

None (gateway is stateless).

---

## 2. Architecture

- **Internal structure:** Fastify server; JWT validation middleware; tenant extraction and X-Tenant-ID injection; rate limiter; route table keyed by path prefix; proxy to backend via ServiceClient or HTTP forward.
- **Data flow:** Client → Gateway → JWT validation → Tenant validation → Rate limit → Route match → Proxy → Response.
- **Diagrams:** See [containers/api-gateway/README.md](../../containers/api-gateway/README.md).

---

## 3. Deployment

- **Port:** 3001 (host and container in docker-compose).
- **Health:** Typically `/health` or root; confirm in container server.
- **Scaling:** Stateless; scale horizontally.
- **Docker Compose service name:** `api-gateway`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Extracted from JWT and injected into every proxied request; clients cannot override.
- **Auth:** All routes require valid JWT (except public auth routes e.g. login/register).
- **Partition key:** N/A (no DB).

---

## 5. Links

- [containers/api-gateway/README.md](../../containers/api-gateway/README.md)
- [containers/api-gateway/config/default.yaml](../../containers/api-gateway/config/default.yaml)
- No openapi.yaml (proxy-only).
