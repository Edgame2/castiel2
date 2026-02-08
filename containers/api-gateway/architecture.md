# API Gateway Module - Architecture

## Overview

The API Gateway acts as the single entry point for all client requests, routing them to appropriate microservices. It handles authentication, tenant validation, rate limiting, and request proxying.

## Architecture

### Core Components

1. **Authentication Middleware** - Validates JWT tokens and extracts user context
2. **Tenant Validation** - Extracts tenantId from JWT and injects X-Tenant-ID header
3. **Request Router** - Routes requests to backend microservices based on path patterns
4. **Rate Limiter** - Per-user and per-tenant rate limiting
5. **Circuit Breakers** - Automatic circuit breaking for unhealthy services
6. **Proxy Service** - Proxies requests to backend services

## Data Flow

```
Client Request
    ↓
API Gateway (Port 3002)
    ↓
JWT Authentication
    ↓
Tenant Validation (X-Tenant-ID header)
    ↓
Rate Limiting Check
    ↓
Route to Backend Service
    ↓
ServiceClient (with circuit breaker)
    ↓
Backend Microservice
    ↓
Response
```

## Route Mappings

- `/api/auth/*` → Auth Service
- `/api/users/*` → User Management Service
- `/api/secrets/*` → Secret Management Service
- `/api/logging/*` → Logging Service
- `/api/notifications/*` → Notification Manager
- `/api/ai/*` → AI Service
- `/api/embeddings/*` → Embeddings Service
- `/api/dashboard/*` → Dashboard Service

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.

## Security

- JWT token validation
- Tenant isolation enforcement
- Rate limiting per user and tenant
- Circuit breakers for service resilience
