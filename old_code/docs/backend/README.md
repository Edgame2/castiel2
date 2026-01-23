# 🔧 Castiel Backend Documentation

> Enterprise-grade API service built with Fastify, TypeScript, and Azure services.

---

## 📁 Project Structure

```
apps/api/
├── src/
│   ├── config/                     # Configuration
│   │   ├── index.ts                # Main config (env vars)
│   │   └── cosmos.ts               # Cosmos DB config
│   │
│   ├── controllers/                # HTTP request handlers
│   │   ├── auth.controller.ts      # Authentication
│   │   ├── user.controller.ts      # User management
│   │   ├── tenant.controller.ts    # Tenant management
│   │   ├── shard.controller.ts     # Shard CRUD
│   │   ├── shard-bulk.controller.ts # Bulk operations
│   │   ├── webhook.controller.ts   # Webhook management
│   │   └── ...
│   │
│   ├── services/                   # Business logic
│   │   ├── auth.service.ts         # Auth operations
│   │   ├── user.service.ts         # User operations
│   │   ├── shard.service.ts        # Shard operations
│   │   ├── mfa.service.ts          # MFA (TOTP, SMS, Email)
│   │   ├── magic-link.service.ts   # Passwordless auth
│   │   ├── oauth.service.ts        # OAuth 2.0
│   │   ├── sso.service.ts          # SAML/SSO
│   │   ├── email.service.ts        # Email delivery
│   │   ├── cache.service.ts        # Redis caching
│   │   └── ...
│   │
│   ├── repositories/               # Data access layer
│   │   ├── user.repository.ts      # Users (Cosmos DB)
│   │   ├── tenant.repository.ts    # Tenants
│   │   ├── shard.repository.ts     # Shards
│   │   ├── shard-type.repository.ts
│   │   └── ...
│   │
│   ├── routes/                     # API routes
│   │   ├── auth.routes.ts          # /api/auth/*
│   │   ├── user.routes.ts          # /api/users/*
│   │   ├── shard.routes.ts         # /api/shards/*
│   │   ├── webhook.routes.ts       # /api/webhooks/*
│   │   └── ...
│   │
│   ├── middleware/                 # Request middleware
│   │   ├── auth.middleware.ts      # JWT validation
│   │   ├── rate-limit.middleware.ts
│   │   ├── tenant.middleware.ts    # Tenant context
│   │   └── ...
│   │
│   ├── graphql/                    # GraphQL schema
│   │   ├── schema.ts               # Type definitions
│   │   ├── resolvers/              # Query/Mutation resolvers
│   │   └── loaders/                # DataLoaders
│   │
│   ├── types/                      # TypeScript definitions
│   │   ├── auth.types.ts
│   │   ├── shard.types.ts
│   │   ├── user.types.ts
│   │   └── ...
│   │
│   ├── seed/                       # Database seed data
│   │   ├── core-shard-types.seed.ts
│   │   └── context-templates.seed.ts
│   │
│   └── index.ts                    # Application entry point
│
├── package.json
├── tsconfig.json
└── .env.example
```

---

## 🔧 Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Fastify 4 | High-performance HTTP server |
| **Language** | TypeScript 5 | Type safety |
| **GraphQL** | Mercurius | Fastify GraphQL integration |
| **Database** | Azure Cosmos DB | NoSQL + Vector search |
| **Cache** | Azure Redis | Session, caching, pub/sub |
| **Auth** | JWT + Argon2 | Token auth, password hashing |
| **MFA** | Speakeasy | TOTP implementation |
| **Email** | Resend | Email delivery |
| **Validation** | Fastify Schema | JSON Schema validation |
| **Monitoring** | App Insights | Telemetry & logging |

---

## 🚀 Development

### Start Development Server

```bash
# From root directory
pnpm dev:api

# Or from apps/api
cd apps/api
pnpm dev
```

The API will be available at `http://localhost:3001`.

### Environment Variables

Create `apps/api/.env`:

```bash
# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Cosmos DB
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE=castiel

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@castiel.com

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Azure Key Vault (production)
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/

# App Insights (optional)
APP_INSIGHTS_CONNECTION_STRING=
```

---

## 🔐 Authentication

### Supported Methods

| Method | Description |
|--------|-------------|
| Email/Password | Traditional credentials with Argon2 |
| OAuth 2.0 | Google, GitHub, Microsoft |
| Enterprise SSO | SAML 2.0, Azure AD B2C |
| Magic Links | Passwordless email auth |
| MFA | TOTP, SMS, Email OTP |

### Token Flow

```
1. User logs in → Auth Service validates credentials
2. If MFA enabled → Return mfaChallengeToken
3. User submits MFA code → Auth Service validates
4. Issue Access Token (15 min) + Refresh Token (7 days)
5. Access Token used for API requests
6. Refresh Token used to get new Access Token
```

### Adding New Auth Method

1. Create service in `src/services/`:
```typescript
// src/services/new-auth.service.ts
export class NewAuthService {
  async authenticate(credentials: Credentials): Promise<AuthResult> {
    // Implementation
  }
}
```

2. Create controller in `src/controllers/`:
```typescript
// src/controllers/new-auth.controller.ts
export const newAuthController = {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const result = await newAuthService.authenticate(request.body);
    return reply.send(result);
  }
};
```

3. Create routes in `src/routes/`:
```typescript
// src/routes/new-auth.routes.ts
export async function newAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/login', newAuthController.login);
}
```

4. Register in `src/index.ts`:
```typescript
await app.register(newAuthRoutes, { prefix: '/api/auth/new' });
```

---

## 📦 Database (Cosmos DB)

### Containers

| Container | Partition Key | Purpose |
|-----------|--------------|---------|
| `users` | `/tenantId` | User accounts |
| `tenants` | `/id` | Tenant configuration |
| `shards` | `/tenantId` | Shard documents |
| `shard-types` | `/tenantId` | ShardType definitions |
| `shard-relationships` | `/tenantId` | Graph edges |
| `roles` | `/tenantId` | RBAC roles |
| `audit-logs` | `/tenantId` | Audit trail |
| `sso-configs` | `/tenantId` | SSO configurations |
| `webhooks` | `/tenantId` | Webhook configs |

### Repository Pattern

```typescript
// src/repositories/shard.repository.ts
export class ShardRepository {
  private container: Container;

  constructor(cosmosClient: CosmosClient) {
    this.container = cosmosClient
      .database(config.cosmos.database)
      .container('shards');
  }

  async findById(id: string, tenantId: string): Promise<Shard | null> {
    const { resource } = await this.container
      .item(id, tenantId)
      .read<Shard>();
    return resource ?? null;
  }

  async findByTenant(
    tenantId: string,
    options: QueryOptions
  ): Promise<PaginatedResult<Shard>> {
    const query = `
      SELECT * FROM c 
      WHERE c.tenantId = @tenantId 
      AND c.status = @status
      ORDER BY c.createdAt DESC
      OFFSET @offset LIMIT @limit
    `;
    // ...
  }
}
```

---

## 🗄️ Caching (Redis)

### Cache Keys

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `session:{userId}:{sessionId}` | Active sessions | 7 days |
| `refresh:{tokenId}` | Refresh tokens | 7 days |
| `mfa:{token}` | MFA challenges | 5 min |
| `magic_link:{token}` | Magic link tokens | 15 min |
| `rate:{ip}:{endpoint}` | Rate limiting | 1 min |
| `shard:{tenantId}:{id}` | Shard cache | 1 hour |
| `oauth_state:{state}` | OAuth CSRF | 10 min |

### Cache Service

```typescript
// src/services/cache.service.ts
export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

---

## 📊 GraphQL

### Schema Location

GraphQL schema is defined in `src/graphql/schema.ts` using Mercurius.

### Example Resolver

```typescript
// src/graphql/resolvers/shard.resolver.ts
export const shardResolvers = {
  Query: {
    shards: async (_, args, context) => {
      const { tenantId } = context.user;
      return shardService.findByTenant(tenantId, args);
    },
    shard: async (_, { id }, context) => {
      const { tenantId } = context.user;
      return shardService.findById(id, tenantId);
    },
  },
  Mutation: {
    createShard: async (_, { input }, context) => {
      const { tenantId, userId } = context.user;
      return shardService.create(tenantId, userId, input);
    },
  },
};
```

### DataLoaders

Use DataLoaders to batch database queries:

```typescript
// src/graphql/loaders/user.loader.ts
export function createUserLoader(repo: UserRepository) {
  return new DataLoader<string, User>(async (ids) => {
    const users = await repo.findByIds(ids);
    return ids.map(id => users.find(u => u.id === id) ?? null);
  });
}
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Test Structure

```
apps/api/
├── src/
│   └── services/
│       ├── auth.service.ts
│       └── auth.service.test.ts
└── tests/
    └── integration/
        └── auth.test.ts
```

### Example Test

```typescript
// src/services/auth.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('should validate correct password', async () => {
    const service = new AuthService(mockDeps);
    const result = await service.validatePassword(
      'password123',
      hashedPassword
    );
    expect(result).toBe(true);
  });
});
```

---

## 🏗️ Build & Deploy

### Production Build

```bash
# Build
pnpm build:api

# Start
cd apps/api
pnpm start
```

### Docker

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## 📊 Current Implementation Status

### Services Inventory

**Total Services:** 316 TypeScript service files organized into categories:

#### Service Categories

1. **AI & Intelligence Services** (`apps/api/src/services/ai-insights/`, `apps/api/src/services/ai/`)
   - ✅ `insight.service.ts` - Main AI insight orchestrator (5,091 lines)
   - ✅ `conversation.service.ts` - Conversation management (5,292 lines)
   - ✅ `ai-context-assembly.service.ts` - Context assembly (1,074 lines)
   - ✅ `intent-analyzer.service.ts` - Intent classification (pattern-based only, LLM classification missing)
   - ✅ `prompt-resolver.service.ts` - Prompt management
   - ✅ `vector-search.service.ts` - Vector search
   - ✅ `embedding-template.service.ts` - Embedding templates
   - ✅ `feedback-learning.service.ts` - Feedback loop
   - ✅ `proactive-insight.service.ts` - Proactive insights
   - ✅ `llm.service.ts` - LLM client wrapper
   - ✅ `unified-ai-client.service.ts` - Unified AI client
   - ✅ `ai-connection.service.ts` - AI connection management
   - ✅ `ai-tool-executor.service.ts` - AI tool execution
   - ✅ `ai-model-selection.service.ts` - Model selection
   - ✅ `ai-config.service.ts` - AI configuration
   - ✅ `grounding.service.ts` - Response grounding
   - ✅ `context-quality.service.ts` - Context quality assessment
   - ✅ `context-cache.service.ts` - Context caching
   - ✅ `citation-validation.service.ts` - Citation validation
   - ✅ `prompt-injection-defense.service.ts` - Prompt injection defense
   - ✅ `conversation-summarization.service.ts` - Conversation summarization
   - ✅ `conversation-context-retrieval.service.ts` - Context retrieval

2. **Risk & Revenue Services** (`apps/api/src/services/`)
   - ✅ `risk-evaluation.service.ts` - Risk evaluation (2,508 lines)
   - ✅ `risk-catalog.service.ts` - Risk catalog
   - ✅ `revenue-at-risk.service.ts` - Revenue calculations
   - ✅ `quota.service.ts` - Quota management
   - ✅ `simulation.service.ts` - Risk simulation
   - ✅ `early-warning.service.ts` - Early warnings
   - ✅ `benchmarking.service.ts` - Benchmarks
   - ✅ `data-quality.service.ts` - Data quality validation
   - ✅ `trust-level.service.ts` - Trust level calculation
   - ✅ `risk-ai-validation.service.ts` - AI validation
   - ✅ `risk-explainability.service.ts` - Explainability
   - ✅ `comprehensive-audit-trail.service.ts` - Audit trail

3. **Security Services** (`apps/api/src/services/`)
   - ✅ `pii-detection.service.ts` - PII detection
   - ✅ `pii-redaction.service.ts` - PII redaction
   - ✅ `field-security.service.ts` - Field-level security
   - ✅ `device-security.service.ts` - Device security
   - ✅ `password-history.service.ts` - Password history
   - ✅ `rate-limiter.service.ts` - Rate limiting

4. **Integration Services** (`apps/api/src/services/integrations/`)
   - ✅ `integration.service.ts` - Integration management
   - ✅ `integration-connection.service.ts` - Connection handling
   - ✅ `sync-task.service.ts` - Sync scheduling
   - ✅ `adapter-manager.service.ts` - Adapter orchestration

5. **Data Management Services** (`apps/api/src/services/`)
   - ✅ `shard.repository.ts` - Shard CRUD
   - ✅ `shard-relationship.service.ts` - Graph relationships
   - ✅ `document-upload.service.ts` - Document handling
   - ✅ `redaction.service.ts` - PII redaction
   - ✅ `audit-trail.service.ts` - Audit logging
   - ✅ `enrichment.service.ts` - AI enrichment pipeline
   - ✅ `vectorization.service.ts` - Vectorization
   - ✅ `shard-embedding.service.ts` - Shard embeddings
   - ✅ `shard-linking.service.ts` - Shard linking

6. **Content Generation Services** (`apps/api/src/services/content-generation/`)
   - ✅ `template.service.ts` - Template management
   - ✅ `generation-processor.service.ts` - Generation processing (1,774 lines)
   - ✅ `content-sharing.service.ts` - Content sharing

7. **Notification Services** (`apps/api/src/services/notifications/`)
   - ✅ `notification.service.ts` - Notification management (1,376 lines)
   - ✅ Notification digest service
   - ✅ Notification preference service

8. **Dashboard Services** (`apps/api/src/services/`)
   - ✅ `dashboard.service.ts` - Dashboard management (1,332 lines)
   - ✅ `widget-data.service.ts` - Widget data
   - ✅ `dashboard-cache.service.ts` - Dashboard caching

9. **Web Search Services** (`apps/api/src/services/web-search/`)
   - ✅ Web search integration service
   - ✅ Web search Cosmos service

10. **Other Services**
    - ✅ `email.service.ts` - Email delivery
    - ✅ `webhook-management.service.ts` - Webhook management
    - ✅ `import-export.service.ts` - Import/export
    - ✅ `schema-migration.service.ts` - Schema migrations
    - ✅ `computed-field.service.ts` - Computed fields
    - ✅ `field-validation.service.ts` - Field validation
    - ✅ `multimodal-asset.service.ts` - Multimodal assets
    - ✅ `onboarding.service.ts` - User onboarding
    - ✅ `performance-monitoring.service.ts` - Performance monitoring
    - ✅ `search-analytics.service.ts` - Search analytics
    - ✅ `project-activity.service.ts` - Project activity
    - ✅ `admin-dashboard.service.ts` - Admin dashboard
    - ✅ `service-registry.service.ts` - Service registry

### Missing Services (ML System)

- ❌ `feature-store.service.ts` - Feature store (ML system)
- ❌ `risk-ml.service.ts` - ML-based risk scoring (ML system)
- ❌ `model.service.ts` - Model registry (ML system)
- ❌ `training.service.ts` - Training job management (ML system)
- ❌ `llm-fine-tuning.service.ts` - LLM fine-tuning (ML system)
- ❌ `risk-feedback.service.ts` - ML feedback loop (ML system)
- ❌ `evaluation.service.ts` - Model evaluation (ML system)

### Routes Inventory

**Total Routes:** 119 TypeScript route files

All routes are registered in `apps/api/src/routes/index.ts` (4,102 lines). See [Architecture Documentation](../ARCHITECTURE.md) for complete route listing.

---

## 🔍 Gap Analysis

### Critical Gaps

#### CRITICAL-1: Missing ML System Services
- **Severity:** Critical
- **Impact:** Product, Feature Completeness
- **Description:** Entire ML system documented but services not implemented
- **Missing Services:**
  - `apps/api/src/services/feature-store.service.ts` - ❌ Missing
  - `apps/api/src/services/risk-ml.service.ts` - ❌ Missing
  - `apps/api/src/services/model.service.ts` - ❌ Missing
  - `apps/api/src/services/training.service.ts` - ❌ Missing
  - `apps/api/src/services/llm-fine-tuning.service.ts` - ❌ Missing
  - `apps/api/src/services/risk-feedback.service.ts` - ❌ Missing
  - `apps/api/src/services/evaluation.service.ts` - ❌ Missing
- **Missing Routes:**
  - `apps/api/src/routes/risk-ml.routes.ts` - ❌ Missing
- **Blocks Production:** Yes - Features documented but unavailable

#### CRITICAL-2: Service Initialization Complexity
- **Severity:** Critical
- **Impact:** Maintainability, Reliability
- **Description:** `apps/api/src/routes/index.ts` has 4,102 lines of initialization logic with:
  - Many optional services with try-catch blocks that silently fail
  - Unclear service dependencies
  - Difficult to understand initialization order
- **Code Reference:**
  - `apps/api/src/routes/index.ts` - 4,102 lines
  - Multiple try-catch blocks with silent failures
- **Blocks Production:** Yes - Maintenance nightmare

#### CRITICAL-3: Incomplete Intent Classification
- **Severity:** Critical
- **Impact:** AI Quality
- **Description:** `intent-analyzer.service.ts` only implements pattern-based classification. LLM-based classification method exists but may not be fully implemented.
- **Code Reference:**
  - `apps/api/src/services/intent-analyzer.service.ts` - Pattern-based only
  - Missing: `classifyIntentWithLLM()` method implementation
- **Blocks Production:** No - But degrades AI accuracy

### High Priority Gaps

#### HIGH-1: Large Service Files
- **Severity:** High
- **Impact:** Maintainability, Performance
- **Description:** Several service files exceed 2,000 lines:
  - `insight.service.ts` - 5,091 lines
  - `conversation.service.ts` - 5,292 lines
  - `risk-evaluation.service.ts` - 2,508 lines
  - `generation-processor.service.ts` - 1,774 lines
- **Code References:**
  - `apps/api/src/services/insight.service.ts` - 5,091 lines
  - `apps/api/src/services/conversation.service.ts` - 5,292 lines
  - `apps/api/src/services/risk-evaluation.service.ts` - 2,508 lines
- **Recommendation:** Refactor into smaller, focused services

#### HIGH-2: Missing Error Handling
- **Severity:** High
- **Impact:** Stability, User Experience
- **Description:** Some code paths lack proper error handling:
  - AI response parsing failures may be silent
  - Context assembly failures may not be properly surfaced
  - Queue processing errors may not be logged
- **Code References:**
  - Various service files need error handling review
- **Blocks Production:** No - But causes silent failures

#### HIGH-3: Type Safety Gaps
- **Severity:** High
- **Impact:** Developer Experience, Runtime Errors
- **Description:** Some areas use `any` types or `@ts-nocheck`:
  - `risk-analysis.routes.ts` has `@ts-nocheck`
  - Some service methods use `any` for request bodies
- **Code References:**
  - `apps/api/src/routes/risk-analysis.routes.ts` - Has `@ts-nocheck`
- **Blocks Production:** No - But reduces type safety

### Medium Priority Gaps

#### MEDIUM-1: Configuration Management
- **Severity:** Medium
- **Impact:** Reliability, Deployment
- **Description:**
  - Environment variables scattered across multiple files
  - No centralized configuration validation
  - Missing configuration can cause silent failures
- **Code References:**
  - `apps/api/src/config/env.ts` - Needs validation layer
- **Blocks Production:** No - But causes deployment issues

#### MEDIUM-2: Missing Test Coverage
- **Severity:** Medium
- **Impact:** Quality, Reliability
- **Description:**
  - Limited test coverage for large service files
  - Missing integration tests for critical paths
  - ML services have no tests (services don't exist)
- **Code References:**
  - `apps/api/tests/` - Limited coverage
- **Blocks Production:** No - But reduces confidence

### Technical Debt

#### DEBT-1: Service Initialization Refactoring Needed
- **Description:** Service initialization logic should be moved to dedicated initialization modules
- **Code Reference:**
  - `apps/api/src/services/initialization/` - Partial implementation exists
  - `apps/api/src/routes/index.ts` - Still contains most initialization logic
- **Recommendation:** Complete migration to initialization modules

#### DEBT-2: Optional Service Dependencies
- **Description:** Many services have optional dependencies that may cause silent failures
- **Code Reference:**
  - Multiple services with optional constructor parameters
- **Recommendation:** Make dependencies explicit or provide clear fallback behavior

---

## 📚 Related Documentation

- [Architecture](../ARCHITECTURE.md) - System architecture
- [API Reference](./API.md) - API endpoints
- [Authentication](./AUTHENTICATION.md) - Auth flows
- [Caching](./CACHING.md) - Redis caching strategy
- [Shards System](../shards/README.md) - Shards documentation











