# Changelog

All notable changes to the API Gateway module will be documented in this file.

## [Unreleased]

### Changed
- **Circuit breaker config:** Config loader now parses `circuit_breaker.threshold` to number when loaded as string (env substitution). Timeout was already parsed; both are passed from config into ProxyService and used when creating ServiceClient.

### Added
- **CORS in config:** `cors.origin` in config/default.yaml (env `FRONTEND_URL`, default `*`) and config/schema.json; server uses config with env fallback. Resolves api-gateway-gaps §4.1.
- **Redis rate limit store (optional):** When `redis.url` (env `REDIS_URL`) is set, rate limiting uses Redis so limits are shared across gateway instances. Otherwise in-memory store is used. New `rateLimitStore.ts` with `createInMemoryStore()` and `createRedisStore(redisUrl)`; middleware takes store. Resolves api-gateway-gaps §3.1.
- **Search and integrations routes:** Route `/api/v1/search` → search_service when configured (enables UI and clients to call vector/hybrid search via gateway). Route `/api/v1/integrations` → integration_manager when configured (tenant-facing settings/integrations detail). Schema entries for `web_search` and `search_service` in config/schema.json.
- **Documentation:** README and architecture.md updated with conditional route list (search, integrations, web-search, prompts, multimodal, conversations), circuit_breaker config (threshold, timeout), and note that routes are in src/routes/index.ts.
- **Public auth paths:** Tenant validation skips login, register, OAuth/SAML callbacks, forgot/reset-password, verify-email, and auth health so unauthenticated auth flows work through the gateway.
- **Auth path rewrite:** Route `/api/auth` uses `pathRewrite: '/api/v1/auth'` so the auth service receives `/api/v1/auth/...` paths.
- **Tests:** Unit tests for tenantValidation (isPublicAuthPath, middleware), ProxyService (findRoute, targetPath with pathRewrite/stripPrefix), rateLimit; integration tests for gateway routes (public auth allowed, protected 401).
- **W11 – risk-analytics proxy:** Config `services.risk_analytics.url` (env `RISK_ANALYTICS_URL`, default http://localhost:3048). Route `/api/v1` → risk_analytics when URL is configured. Enables Super Admin UI to call GET/PUT `/api/v1/tenant-ml-config` and GET/PUT `/api/v1/sales-methodology` via gateway.
- **W11 – risk-catalog proxy:** Config `services.risk_catalog.url` (env `RISK_CATALOG_URL`, default http://localhost:3047). Routes `/api/v1/action-catalog` and `/api/v1/risk-catalog` → risk_catalog when URL is configured (longer path so they take precedence over `/api/v1`). Enables Super Admin UI to call GET `/api/v1/action-catalog/entries` and GET `/api/v1/risk-catalog/tenant-catalog` via gateway.
- **W11 – recommendations proxy (Feedback System):** Config `services.recommendations.url` (env `RECOMMENDATIONS_URL`, default http://localhost:3049). Routes `/api/v1/feedback` (feedback aggregation), `/api/v1/admin/feedback-types`, `/api/v1/admin/feedback-config`, `/api/v1/admin/tenants` → recommendations when URL is configured. Enables Super Admin UI to call feedback-types, global and tenant feedback config and GET `/api/v1/feedback/aggregation` via gateway.
- **W11 – existing admin pages proxy:** Config `services.integration_manager.url` (env `INTEGRATION_MANAGER_URL`, default http://localhost:3026), `services.shard_manager.url` (env `SHARD_MANAGER_URL`, default http://localhost:3023), `services.integration_processors.url` (env `INTEGRATION_PROCESSORS_URL`, default http://localhost:3030). Routes `/api/v1/admin/settings`, `/api/v1/admin/integrations` → integration_manager; `/api/v1/admin/shard-types` → shard_manager; `/api/v1/admin/monitoring` → integration_processors. Wires existing Super Admin pages (System Settings, Integration Catalog, Shard Types, System Monitoring) through the gateway.
- **W11 – ml-service proxy:** Config `services.ml_service.url` (env `ML_SERVICE_URL`, default http://localhost:3033). Route `/api/v1/ml` → ml_service when URL is configured (longer path so it takes precedence over `/api/v1`). Enables Super Admin ML Models page to call GET `/api/v1/ml/models/health` via gateway.

## [1.0.0] - 2025-01-XX

### Added
- Initial implementation of API Gateway
- JWT authentication and validation
- Tenant validation middleware with X-Tenant-ID header injection
- Request proxying to backend microservices
- Route mapping configuration
- Rate limiting middleware (per user and per tenant)
- Circuit breaker support via ServiceClient
- Health check endpoints (/health, /ready)
- CORS support
- Error handling

### Features
- **Request Routing**: Routes requests to appropriate microservices based on path
- **Tenant Isolation**: Extracts tenantId from JWT and injects X-Tenant-ID header
- **Rate Limiting**: Per-user and per-tenant rate limiting
- **Circuit Breakers**: Automatic circuit breaking for unhealthy services
- **Service Discovery**: Config-driven service URLs

