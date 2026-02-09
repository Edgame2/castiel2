# API Gateway

API Gateway for Castiel - Routes requests to microservices with authentication, tenant isolation, and rate limiting.

## Overview

The API Gateway acts as the single entry point for all client requests, routing them to appropriate microservices. It handles authentication, tenant validation, rate limiting, and request proxying.

## Features

- **JWT Authentication**: Validates JWT tokens and extracts user context
- **Tenant Validation**: Extracts tenantId from JWT and injects X-Tenant-ID header (defense-in-depth)
- **Request Routing**: Routes requests to backend microservices based on path patterns
- **Rate Limiting**: Per-user and per-tenant rate limiting with configurable limits
- **Circuit Breakers**: Automatic circuit breaking for unhealthy services (via ServiceClient)
- **Error Handling**: Graceful error handling and response transformation
- **CORS Support**: Configurable CORS for frontend integration

## Port

3002 (configurable via `PORT` environment variable; see `config/default.yaml`)

## Route Mappings

The gateway routes requests to microservices. Paths are registered in `src/routes/index.ts`; only services with a URL in config are active.

**Core routes:**
- `/api/auth/*` → Auth Service (port 3021)
- `/api/users/*` → User Management Service (port 3022)
- `/api/secrets/*` → Secret Management Service (port 3003)
- `/api/logging/*` → Logging Service (port 3014)
- `/api/notifications/*` → Notification Manager (port 3001)
- `/api/ai/*` → AI Service (port 3006)
- `/api/embeddings/*` → Embeddings Service (port 3005)
- `/api/dashboard/*` → Dashboard Service (port 3011)

**When configured:** `/api/v1/search/*` → Search Service; `/api/v1/integrations/*` → Integration Manager (tenant-facing); `/api/v1/schedules`, `/api/v1/web-search` → Web Search; `/api/v1/prompts`, `/api/v1/multimodal`, `/api/conversations` → Prompt, Multi-Modal, AI Conversation; `/api/v1/*` (risk-analytics, recommendations, ML, etc.) per `config/default.yaml`.

## Configuration

See `config/default.yaml` for configuration options. Key settings:

- `jwt.secret`: JWT secret for token validation
- `services.*.url`: Backend service URLs
- `rate_limit.max`: Maximum requests per time window
- `rate_limit.timeWindow`: Time window in milliseconds
- `circuit_breaker.threshold`: Failure count before opening the circuit (default 5)
- `circuit_breaker.timeout`: Time in ms before half-open retry (default 30000)
- `cors.origin`: Allowed CORS origin (env `FRONTEND_URL`; default `*`)
- `redis.url`: Optional. When set (env `REDIS_URL`), rate limits use Redis so multiple gateway instances share the same limits; otherwise in-memory (single instance).

## Architecture

```
Client Request
    ↓
API Gateway (Port 3002)
    ↓
JWT Validation
    ↓
Tenant Validation (extract tenantId, inject X-Tenant-ID)
    ↓
Rate Limiting
    ↓
Route Matching
    ↓
Proxy to Backend Service
    ↓
Response
```

## Security

- **Tenant Isolation**: All requests must include valid tenantId in JWT
- **Header Injection**: X-Tenant-ID header is injected and cannot be overridden
- **Rate Limiting**: Prevents abuse with per-user and per-tenant limits
- **Circuit Breakers**: Prevents cascading failures

## Running

From the module root: `pnpm run dev` (development), `pnpm run build` then `pnpm start` (production). Set `JWT_SECRET` and optional service URLs (or use `config/default.yaml` defaults).

## Testing

From the module root: `pnpm test` (all tests), `pnpm test:unit`, or `pnpm test:integration`. Unit tests cover tenant validation, rate limiting, and ProxyService; integration tests hit gateway routes (public auth, protected 401).

## Status

✅ **Production Ready** - Full implementation with all required features.

