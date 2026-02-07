# Gap Analysis: API Gateway

**Date:** 2026-02-07  
**Scope:** containers/api-gateway  
**Standards:** ModuleImplementationGuide, .cursorrules

---

## Executive Summary

| Area | Status | Critical Gaps |
|------|--------|---------------|
| **API Gateway** | Partial | Circuit breaker not in use (axios used instead of ServiceClient); docs/config port mismatch; rate limit in-memory only; circuit breaker config unused |

---

## 1. Documentation vs Configuration

### 1.1 Port

| Item | Value |
|------|--------|
| README "Port" / architecture.md | 3001 |
| config/default.yaml `server.port` | `${PORT:-3002}` (default 3002) |

**Detail:** README and architecture state the gateway runs on port 3001. The config default is 3002. Either the docs are outdated or the default was changed without updating README and architecture.md.

---

## 2. Circuit Breaker

### 2.1 Circuit Breaker Not Applied

| Item | Status |
|------|--------|
| README / OpenAPI | Claim "Circuit Breakers: Automatic circuit breaking (via ServiceClient)" |
| ProxyService | Creates ServiceClient with `circuitBreaker: { enabled: true, ... }` |
| proxyRequest() | Uses **axios** for the outgoing request; ServiceClient is never used for the call |

**Detail:** In `src/services/ProxyService.ts`, `registerRoute()` creates a `ServiceClient` with circuit breaker options, but `proxyRequest()` builds the request with `axios.request()` (lines 124–131). The ServiceClient is only used to obtain the service URL indirectly via the mapping; the actual HTTP call does not go through ServiceClient, so the circuit breaker never runs. The code does handle a "Circuit breaker" error message (line 136), but the breaker is not invoked.

### 2.2 Circuit Breaker Config Unused

| Item | Status |
|------|--------|
| config/default.yaml | `circuit_breaker.threshold`, `circuit_breaker.timeout` defined |
| ProxyService | Hardcodes `threshold: 5`, `timeout: 30000` when constructing ServiceClient |

**Detail:** Gateway config exposes circuit breaker settings, but ProxyService does not read them. Even if the proxy were switched to use ServiceClient for requests, the config would need to be passed into ProxyService.

---

## 3. Rate Limiting

### 3.1 In-Memory Store Only

| Item | Status |
|------|--------|
| rateLimit.ts | In-memory store with comment "should use Redis in production" |
| Redis or shared store | **Missing** |

**Detail:** Rate limiting is per user/tenant (and per IP for unauthenticated requests) and is applied correctly. With multiple gateway instances, each instance has its own in-memory counter, so limits are not global. For production scale-out, a shared store (e.g. Redis) is recommended.

---

## 4. CORS and Config

### 4.1 CORS Not in Config

| Item | Status |
|------|--------|
| server.ts | `origin: process.env.FRONTEND_URL || '*'` |
| config/default.yaml | No `cors` or `frontend_url` section |

**Detail:** CORS origin is driven only by environment variable. There is no CORS section in the gateway config or schema for consistency with other options.

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
