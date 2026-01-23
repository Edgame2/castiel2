# Changelog

All notable changes to the API Gateway module will be documented in this file.

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

