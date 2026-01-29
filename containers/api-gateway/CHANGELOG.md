# Changelog

All notable changes to the API Gateway module will be documented in this file.

## [Unreleased]

### Added
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

