# Gap Analysis: API Gateway

**Date:** 2026-02-07  
**Scope:** containers/api-gateway  
**Standards:** ModuleImplementationGuide, .cursorrules

---

## Executive Summary

| Area | Status | Critical Gaps |
|------|--------|---------------|
| **API Gateway** | Partial | Rate limit in-memory only (P2: Redis for multi-instance). Port and circuit breaker aligned: docs 3002; ProxyService uses ServiceClient.requestWithFullResponse and config circuit_breaker.threshold/timeout. |

---

## 1. Documentation vs Configuration

### 1.1 Port — Resolved

| Item | Value |
|------|--------|
| README "Port" / architecture.md | 3002 (default) |
| config/default.yaml `server.port` | `${PORT:-3002}` (default 3002) |

**Detail:** README and architecture state the gateway default port is 3002, consistent with config.

---

## 2. Circuit Breaker — Resolved

### 2.1 Circuit Breaker Applied

| Item | Status |
|------|--------|
| ProxyService.proxyRequest() | Uses `ServiceClient.requestWithFullResponse()` for the outgoing request; circuit breaker is applied |
| server.ts | Passes `config.circuit_breaker` into `new ProxyService({ circuitBreaker: config.circuit_breaker })` |

**Detail:** The actual HTTP call goes through ServiceClient; circuit breaker runs and returns 503 when open.

### 2.2 Circuit Breaker Config From Config

| Item | Status |
|------|--------|
| config/default.yaml | `circuit_breaker.threshold`, `circuit_breaker.timeout` defined |
| config/index.ts | Parses threshold and timeout to numbers when loaded as strings (env substitution) |
| ProxyService | Uses `this.circuitBreakerConfig` (from constructor) when creating each ServiceClient |

---

## 3. Rate Limiting — Resolved (optional Redis)

### 3.1 Store: In-Memory or Redis

| Item | Status |
|------|--------|
| config/default.yaml | Optional `redis.url` (env `REDIS_URL`); when set, rate limit store uses Redis |
| rateLimitStore.ts | `createInMemoryStore()` (default) and `createRedisStore(redisUrl)`; middleware accepts store |
| server.ts | Creates Redis store when `config.redis?.url` is set, else in-memory |

**Detail:** Rate limits are per user/tenant (and per IP when unauthenticated). With Redis configured, limits are shared across gateway instances. Without Redis, single-instance in-memory store is used.

---

## 4. CORS and Config — Resolved

### 4.1 CORS in Config

| Item | Status |
|------|--------|
| config/default.yaml | `cors.origin: \${FRONTEND_URL:-*}` |
| config/schema.json | `cors.origin` (string) in schema |
| server.ts | Uses `config.cors?.origin ?? process.env.FRONTEND_URL ?? '*'` |

**Detail:** CORS origin is config-driven with env substitution; server falls back to env then '*' if unset.

---

## 5. What Is in Place

- **Tenant validation:** Public auth paths (login, register, callbacks, password reset, verify-email, etc.) are excluded; non-public `/api/*` requires JWT and gets X-Tenant-ID injected.
- **Routing:** Service URLs and route mappings are config-driven; no hardcoded production URLs.
- **Rate limiting:** Applied in onRequest (except /health, /ready); per user/tenant/IP with headers.
- **Tests:** Unit tests for ProxyService, tenantValidation, rateLimit; integration tests for gateway routes (per existing gap analysis).
- **Structure:** Dockerfile, README, CHANGELOG, config/default.yaml, schema.json, openapi.yaml, architecture.md present.

---

## 6. Cross-References

- **API Gateway:** [containers/api-gateway/README.md](../../containers/api-gateway/README.md), [containers/api-gateway/architecture.md](../../containers/api-gateway/architecture.md)
- **Broader gap analysis:** [gap-analysis-ui-auth-usermgmt-gateway.md](../gap-analysis-ui-auth-usermgmt-gateway.md)

---

## 7. Recommendations (Priority)

| Priority | Area | Action |
|----------|------|--------|
| P1 | Docs | Align README and architecture.md with config: state gateway default port 3002 (or change config to 3001 and document). |
| P1 | ProxyService | Use ServiceClient for proxied requests (or equivalent) so circuit breaker is applied; pass circuit_breaker config from config into ProxyService. |
| P2 | Config | Wire config `circuit_breaker.threshold` and `circuit_breaker.timeout` into ProxyService/ServiceClient. |
| P2 | Rate limiting | Add optional Redis-backed rate limit store for production when running multiple gateway instances. |
| P3 | Config | Add CORS/frontend origin to config (and schema) and use it in server.ts instead of only env. |

---

*End of API Gateway gap analysis.*
