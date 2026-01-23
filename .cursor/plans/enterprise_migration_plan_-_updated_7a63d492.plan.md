---
name: Enterprise Migration Plan - Updated
overview: Comprehensive enterprise-grade migration plan with security, performance, and multi-tenancy recommendations integrated throughout all phases.
todos: []
---

# Enterprise Migration P

lan: old_code → containers/ (Updated with Recommendations)

## Overview

Migrate all code from `old_code/` to `containers/` following ModuleImplementationGuide.md standards, creating enterprise-grade microservices with **defense-in-depth security**, **high performance**, and **strict tenant isolation**.

**Important**: The 5 core containers (Auth, User Management, Logging, Notification Manager, Secret Management) are **already complete and production-ready**. They only need `openapi.yaml` files to complete ModuleImplementationGuide.md compliance. No migration needed for these containers.

**⚠️ CRITICAL BLOCKER**: All containers depend on `@coder/shared` functions that are currently **placeholders**. Containers **cannot run** until Phase 0.1 (Shared Package Implementation) is complete. This is the **highest priority**.

## Enterprise-Grade Architecture Decisions

### 1. Service-to-Service Authentication

**Decision**: Service-to-service JWT tokens with service identity verification**Implementation**:

- Service tokens issued by auth service (short-lived: 5-15 minutes)
- Token includes: `serviceId`, `serviceName`, `permissions`, `tenantId` (if applicable)
- Automatic token rotation before expiry
- Service registry tracks all registered services
- Mutual verification: Both services verify each other's tokens
- Rate limiting per service
- Audit logging of all service-to-service calls

**Location**: `containers/shared/src/auth/serviceAuth.ts`

### 2. Tenant Validation (Defense-in-Depth)

**Decision**: Gateway validation + Service-level enforcement (Option C)**Implementation**:**Gateway Layer** (`containers/api-gateway/`):

1. Extract `tenantId` from JWT token (`user.tenantId` claim)
2. Validate `tenantId` format (UUID)
3. Verify tenant exists and is active
4. Inject `X-Tenant-ID` header (immutable, cannot be overridden)
5. Block requests without valid `tenantId`
6. Log all tenant context changes

**Service Layer** (`@coder/shared/src/middleware/tenantEnforcement.ts`):

1. Extract `tenantId` from `X-Tenant-ID` header (trusted, from gateway)
2. Validate `tenantId` matches JWT claim (double-check)
3. Enforce `tenantId` in all database queries (partition key)
4. Reject cross-tenant data access attempts
5. Audit log all tenant-scoped operations

**Database Layer**:

- All Cosmos DB queries MUST include `tenantId` in partition key
- Partition key enforcement prevents cross-tenant queries
- Query validation middleware ensures `tenantId` is always present

### 3. Service Discovery

**Decision**: Hybrid approach - DNS + Config with Service Registry**Implementation**:**Development/Docker**:

- Use Docker service names (DNS-based): `http://auth:3021`

**Production (Config-driven)**:

```yaml
# config/default.yaml
services:
  auth:
    url: ${AUTH_SERVICE_URL:-http://auth-service:3021}
    timeout: 5000
    retries: 3
    circuitBreaker:
      enabled: true
      threshold: 5
      timeout: 30000
```

**Service Registry** (Optional, for dynamic discovery):

- Service registration on startup
- Health check endpoints
- Automatic service discovery
- Load balancing support
- Service versioning

**Location**: `containers/shared/src/services/ServiceRegistry.ts`

### 4. Event Bus Architecture

**Decision**: Topic-based exchanges with routing keys (hybrid pub/sub + queues)**Implementation**:**Exchange Structure**:

1. `coder.events` (Topic Exchange) - Main event bus

- Routing keys: `{module}.{resource}.{action}`
- Example: `auth.user.created`, `shard.document.updated`

2. `coder.notifications` (Topic Exchange) - Notification events
3. `coder.audit` (Direct Exchange) - Audit events

**Queue Structure**:

- Per-service queues: `auth.events`, `user-management.events`, etc.
- Dead letter queue: `coder.dlq` (all failed messages)

**Event Schema**:

```typescript
interface Event {
  id: string;              // UUID
  type: string;            // event.type
  version: string;        // Schema version (v1, v2)
  timestamp: string;      // ISO 8601
  tenantId: string;       // REQUIRED for tenant isolation
  source: {
    service: string;      // Service that emitted event
    instance: string;     // Instance ID
  };
  data: any;              // Event payload (validated against schema)
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
  };
}
```

**Location**: `containers/shared/src/events/`

### 5. Performance Caching

**Decision**: Multi-layer cache with cache-aside pattern**Implementation**:**Cache Layers**:

1. **Layer 1**: In-memory cache (per service instance)

- LRU cache with size limits
- TTL: 1-5 minutes (hot data)
- Key pattern: `service:{serviceName}:{key}`

2. **Layer 2**: Redis cache (shared across instances)

- TTL: 5-60 minutes (warm data)
- Key pattern: `tenant:{tenantId}:{resource}:{id}`
- Automatic invalidation on updates

3. **Layer 3**: Database (source of truth)

**Cache Strategies by Data Type**:

- User sessions: 15 min (Redis only)
- Shard data: 5-15 min (multi-layer)
- Shard types: 1 hour (Redis only)
- Query results: 1-5 min (multi-layer)
- ACL permissions: 10 min (multi-layer)

**Location**: `containers/shared/src/cache/`

### 6. Connection Pooling

**Decision**: Shared connection pool with per-service limits**Implementation**:**Shared Pool Architecture**:

- Cosmos DB connection pool (max 50, per-service limit: 10)
- Redis connection pool (max 20, per-service limit: 5)
- RabbitMQ connection pool (max 100 channels, per-service limit: 10)

**Configuration**:

```yaml
database:
  cosmos:
    maxConnections: 50
    perServiceLimit: 10
    idleTimeout: 30000
    connectionTimeout: 5000
```

**Features**:

- Connection health monitoring
- Automatic reconnection
- Per-service quotas
- Connection leak detection
- Metrics and monitoring
- Graceful degradation

**Location**: `containers/shared/src/database/ConnectionPool.ts`

## Preliminary Steps (Critical Foundation)

### Phase 0: Infrastructure Setup - CRITICAL BLOCKER (Week 1-2)

**⚠️ BLOCKER**: All containers depend on `@coder/shared` functions that are currently placeholders. Containers **cannot run** until Phase 0 is complete.

#### 0.1 Implement Shared Package (`containers/shared/`) - PRIORITY 1

**Current State**: Placeholders only - containers import non-existent functions

**Required**: Full implementation before any container can function

**Critical Functions Needed** (used by all containers):

- `getDatabaseClient()` - Cosmos DB client singleton
- `connectDatabase()` - Initialize database connection
- `disconnectDatabase()` - Graceful shutdown
- `setupJWT(fastify, options)` - JWT authentication setup
- `setupHealthCheck(fastify)` - Health/ready endpoints

**Structure**:

```javascript
containers/shared/
├── package.json                    ✅ Exists
├── tsconfig.json                   ✅ Exists
├── src/
│   ├── database/
│   │   ├── CosmosDBClient.ts       ❌ MUST IMPLEMENT
│   │   ├── ConnectionPool.ts       ❌ MUST IMPLEMENT
│   │   ├── containerManager.ts     ❌ MUST IMPLEMENT
│   │   └── index.ts                ⚠️ Currently placeholder
│   ├── cache/
│   │   ├── RedisClient.ts          ❌ MUST IMPLEMENT
│   │   ├── MultiLayerCache.ts      ❌ MUST IMPLEMENT
│   │   └── index.ts                ⚠️ Currently placeholder
│   ├── events/
│   │   ├── EventPublisher.ts       ❌ MUST IMPLEMENT
│   │   ├── EventConsumer.ts        ❌ MUST IMPLEMENT
│   │   ├── EventSchema.ts          ❌ MUST IMPLEMENT
│   │   └── index.ts                ⚠️ Currently placeholder
│   ├── auth/
│   │   ├── jwt.ts                  ❌ MUST IMPLEMENT (setupJWT)
│   │   ├── serviceAuth.ts          ❌ MUST IMPLEMENT
│   │   └── index.ts                ⚠️ Currently placeholder
│   ├── middleware/
│   │   ├── tenantEnforcement.ts    ✅ Exists (already implemented)
│   │   └── index.ts                ✅ Exists
│   ├── services/
│   │   ├── ServiceRegistry.ts      ❌ MUST IMPLEMENT
│   │   ├── ServiceClient.ts        ❌ MUST IMPLEMENT
│   │   └── index.ts                ⚠️ Currently placeholder
│   ├── types/
│   │   ├── user.types.ts           ✅ Exists
│   │   ├── api.types.ts            ✅ Exists
│   │   ├── events.types.ts         ✅ Exists
│   │   └── index.ts                ✅ Exists
│   ├── utils/
│   │   ├── validation.ts            ✅ Exists
│   │   ├── errors.ts               ✅ Exists
│   │   └── index.ts                ✅ Exists
│   └── index.ts                    ⚠️ Missing database/auth/cache/events/services exports
└── README.md                       ✅ Exists
```

**Implementation Priority**:

1. **Database Module** (BLOCKER - used by all containers):

   - `CosmosDBClient.ts` - Singleton client with connection pooling
   - `containerManager.ts` - Container initialization and management
   - `getDatabaseClient()` - Export function
   - `connectDatabase()` - Export function
   - `disconnectDatabase()` - Export function

2. **Auth Module** (BLOCKER - used by all containers):

   - `jwt.ts` - `setupJWT(fastify, options)` function
   - JWT verification utilities
   - Token generation helpers

3. **Cache Module** (HIGH PRIORITY - used by auth, user-management):

   - `RedisClient.ts` - Singleton Redis client
   - `MultiLayerCache.ts` - Multi-layer caching implementation
   - Connection pooling

4. **Events Module** (HIGH PRIORITY - used by auth, user-management, logging):

   - `EventPublisher.ts` - RabbitMQ publisher
   - `EventConsumer.ts` - RabbitMQ consumer
   - `EventSchema.ts` - Schema validation

5. **Services Module** (MEDIUM PRIORITY - for inter-service communication):

   - `ServiceClient.ts` - HTTP client with circuit breaker
   - `ServiceRegistry.ts` - Service discovery

6. **Health Check** (BLOCKER - used by ai-service, embeddings, dashboard):

   - `setupHealthCheck(fastify)` - Add to utils or create health module

**Migration Sources** (from old_code):

- Cosmos DB client patterns from `old_code/apps/api/src/`
- Redis client from `old_code/packages/redis-utils/`
- JWT setup from `old_code/apps/api/src/middleware/authenticate.ts`
- Event patterns from `old_code/packages/queue/`

#### 0.2 Update Shared Package Exports

**Critical**: Update `containers/shared/src/index.ts` to export all implemented modules:

```typescript
// Utils
export * from './utils';

// Types
export * from './types';

// Middleware
export * from './middleware';

// Database (MUST EXPORT after implementation)
export * from './database';

// Cache (MUST EXPORT after implementation)
export * from './cache';

// Events (MUST EXPORT after implementation)
export * from './events';

// Auth (MUST EXPORT after implementation)
export * from './auth';

// Services (MUST EXPORT after implementation)
export * from './services';
```

#### 0.3 Create API Gateway Container (`containers/api-gateway/`)

**Key Features**:

- JWT validation and user context injection
- **Tenant validation** (extract from JWT, inject `X-Tenant-ID` header)
- Service routing with circuit breakers
- Rate limiting (per user, per tenant)
- Request/response logging
- Service-to-service authentication

**Port**: 3001

**Dependencies**: Requires `@coder/shared` to be complete (Phase 0.1)

#### 0.4 Infrastructure Setup (Docker Compose)

**Services**:

- **Redis**: Port 6379 (caching, sessions)
- **RabbitMQ**: Ports 5672 (AMQP), 15672 (Management UI)
- Exchanges: `coder.events`, `coder.notifications`, `coder.audit`
- Dead letter queue: `coder.dlq`
- **API Gateway**: Port 3001
- **All microservices**: Ports 3002-3046
- **UI Container**: Port 3000

**Network**: `coder-network` (bridge)

#### 0.5 Environment Configuration

**Create**: `.env.example` with all required variables:

- Cosmos DB connection
- Redis connection
- RabbitMQ connection
- JWT secrets (user tokens + service tokens)
- Service URLs (for inter-service communication)
- Service registry configuration

## Migration Phases

### Phase 1: Core Modules - Documentation Completion (Week 1)

**Status**: ✅ **Core containers are already complete and production-ready**

**Assessment Results**:

- ✅ **Auth** (`containers/auth/`): Complete, uses `@coder/shared`, Cosmos DB, no old_code dependencies
- ✅ **User Management** (`containers/user-management/`): Complete, uses `@coder/shared`, Cosmos DB, no old_code dependencies
- ✅ **Logging** (`containers/logging/`): Complete, uses `@coder/shared`, Cosmos DB, has openapi.yaml
- ✅ **Notification Manager** (`containers/notification-manager/`): Complete, uses `@coder/shared`, no old_code dependencies
- ✅ **Secret Management** (`containers/secret-management/`): Complete, uses `@coder/shared`, multiple backend providers, no old_code dependencies

**Action Required**: Add missing `openapi.yaml` files to complete ModuleImplementationGuide.md compliance

#### 1.1 Authentication (`containers/auth/`)

**Status**: ✅ Complete - Only needs `openapi.yaml`

**Tasks**:

- [ ] Generate `openapi.yaml` from Fastify Swagger configuration
- [ ] Place in container root (`containers/auth/openapi.yaml`)
- [ ] Verify all endpoints are documented

**Port**: 3021

#### 1.2 User Management (`containers/user-management/`)

**Status**: ✅ Complete - Only needs `openapi.yaml`

**Tasks**:

- [ ] Generate `openapi.yaml` from Fastify Swagger configuration
- [ ] Place in container root (`containers/user-management/openapi.yaml`)
- [ ] Verify all endpoints are documented

**Port**: 3022

#### 1.3 Secret Management (`containers/secret-management/`)

**Status**: ✅ Complete - Only needs `openapi.yaml`

**Tasks**:

- [ ] Generate `openapi.yaml` from Fastify Swagger configuration (already configured in server.ts)
- [ ] Place in container root (`containers/secret-management/openapi.yaml`)
- [ ] Verify all endpoints are documented

**Port**: 3003

#### 1.4 Logging (`containers/logging/`)

**Status**: ✅ Complete - Has `openapi.yaml` in docs/

**Tasks**:

- [ ] Move `docs/openapi.yaml` to root (`containers/logging/openapi.yaml`) OR verify docs/ location is acceptable
- [ ] Verify all endpoints are documented

**Port**: 3014

#### 1.5 Notification Manager (`containers/notification-manager/`)

**Status**: ✅ Complete - Only needs `openapi.yaml`

**Tasks**:

- [ ] Generate `openapi.yaml` from Fastify Swagger configuration
- [ ] Place in container root (`containers/notification-manager/openapi.yaml`)
- [ ] Verify all endpoints are documented

**Port**: 3001

### Phase 2-6: Extension Modules

[Same structure as original plan, but with added security/performance requirements]

## Critical Security Requirements

### Tenant Isolation (MANDATORY)

1. **Gateway Layer**:

- Extract `tenantId` from JWT
- Validate and inject `X-Tenant-ID` header
- Block invalid tenant requests

2. **Service Layer**:

- Validate `X-Tenant-ID` header
- Enforce `tenantId` in all database queries
- Reject cross-tenant requests

3. **Database Layer**:

- All queries MUST include `tenantId` in partition key
- Partition key enforcement prevents cross-tenant access

### Service-to-Service Security

1. **Authentication**:

- Service tokens (JWT) with short expiry
- Service identity verification
- Token rotation

2. **Authorization**:

- Service permissions in tokens
- Rate limiting per service
- Audit logging

### Performance Requirements

1. **Caching**:

- Multi-layer cache (in-memory + Redis)
- Cache-aside pattern
- Automatic invalidation

2. **Connection Pooling**:

- Shared pools with per-service limits
- Health monitoring
- Automatic reconnection

3. **Database Queries**:

- Always use partition key (`tenantId`)
- Composite indexes for common queries
- Query result caching

## Success Criteria

- ✅ All code in `containers/`
- ✅ No imports from `old_code/`
- ✅ All containers follow ModuleImplementationGuide.md
- ✅ **Tenant isolation enforced at all layers**
- ✅ **Service-to-service authentication implemented**
- ✅ **Multi-layer caching operational**
- ✅ **Connection pooling configured**
- ✅ **Event bus with RabbitMQ functional**
- ✅ All containers have tests ≥ 80% coverage
- ✅ All containers documented
- ✅ Infrastructure setup complete

## Timeline Estimate

- **Phase 0** (Infrastructure - CRITICAL BLOCKER): 1-2 weeks
  - **0.1** Shared Package Implementation: 1-1.5 weeks (BLOCKER)
  - **0.2** Update Exports: 1 day
  - **0.3** API Gateway: 2-3 days
  - **0.4** Docker Compose: 1 day
  - **0.5** Environment Config: 1 day
- **Phase 1** (Core Modules - Documentation): 1 week (only openapi.yaml files needed)
- **Phase 2** (Foundation Extensions): 3 weeks
- **Phase 3** (Business Logic Extensions): 4 weeks
- **Phase 4** (Advanced Features): 4 weeks
- **Phase 5** (Remaining Extensions): 3 weeks
- **Phase 6** (UI Container): 1 week

**Total**: ~18-19 weeks

**⚠️ CRITICAL**: Phase 0.1 (Shared Package) is a **BLOCKER** - no containers can run until it's complete.