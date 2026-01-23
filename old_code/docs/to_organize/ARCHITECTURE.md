# 🏗️ Castiel Architecture

> Comprehensive technical architecture documentation for the Castiel platform.

---

## 📁 Project Structure

```
castiel/
├── apps/                          # Application services
│   ├── api/                       # Backend API (Fastify + TypeScript)
│   │   ├── src/
│   │   │   ├── config/            # Environment & configuration
│   │   │   ├── controllers/       # HTTP request handlers
│   │   │   ├── graphql/           # GraphQL schema & resolvers
│   │   │   ├── middleware/        # Auth, rate limiting, etc.
│   │   │   ├── repositories/      # Data access layer (Cosmos DB)
│   │   │   ├── routes/            # REST API routes
│   │   │   ├── services/          # Business logic
│   │   │   ├── types/             # TypeScript definitions
│   │   │   └── index.ts           # Application entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                       # Frontend (Next.js 16 + React 19)
│       ├── src/
│       │   ├── app/               # Next.js App Router pages
│       │   │   ├── (auth)/        # Auth pages (login, register, etc.)
│       │   │   ├── (dashboard)/   # Dashboard route group
│       │   │   ├── (protected)/   # Protected pages (main app)
│       │   │   ├── (public)/      # Public pages
│       │   │   └── api/           # API routes (BFF)
│       │   ├── components/        # React components
│       │   │   ├── ui/            # shadcn/ui primitives
│       │   │   └── [feature]/     # Feature-specific components
│       │   ├── hooks/             # Custom React hooks
│       │   ├── lib/               # Utilities & API clients
│       │   ├── types/             # TypeScript definitions
│       │   └── i18n/              # Internationalization
│       ├── package.json
│       └── next.config.ts
│
├── packages/                      # Shared libraries
│   ├── azure-ad-b2c/              # Azure AD B2C integration
│   ├── key-vault/                 # Azure Key Vault wrapper
│   ├── monitoring/                # Azure App Insights wrapper
│   ├── redis-utils/               # Redis utilities
│   ├── shared-types/              # Shared TypeScript types
│   └── shared-utils/              # Shared utility functions
│
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # This file
│   ├── MIGRATION_TURBOREPO.md     # Migration guide
│   ├── backend/                   # Backend documentation
│   ├── frontend/                  # Frontend documentation
│   ├── shards/                    # Shards system documentation
│   └── deployment/                # Deployment guides
│
├── scripts/                       # Utility scripts
│   ├── init-database.ts           # Database initialization
│   ├── seed-database.ts           # Database seeding
│   └── provision-*.ts             # Tenant provisioning
│
├── terraform/                     # Infrastructure as Code
│   ├── main.tf
│   ├── cosmos-db.tf
│   ├── redis.tf
│   └── app-services.tf
│
├── tests/                         # Integration tests
├── turbo.json                     # Turborepo configuration
├── pnpm-workspace.yaml            # pnpm workspaces config
└── package.json                   # Root package.json
```

---

## 🔧 Technology Stack

### Backend (`apps/api`)

| Technology | Purpose |
|------------|---------|
| **Fastify 4** | Web framework (2x faster than Express) |
| **TypeScript 5** | Type safety |
| **Mercurius** | GraphQL integration |
| **Azure Cosmos DB** | NoSQL database with vector search |
| **Azure Redis** | Caching & session management |
| **Azure AD B2C** | Identity provider |
| **Argon2** | Password hashing |
| **Speakeasy** | TOTP/MFA |
| **Resend** | Email delivery |

### Frontend (`apps/web`)

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI library |
| **TypeScript 5** | Type safety |
| **TailwindCSS 4** | Styling |
| **shadcn/ui** | UI component library |
| **React Query** | Server state management |
| **React Hook Form** | Form handling |
| **i18next** | Internationalization |

### Infrastructure

| Service | Purpose |
|---------|---------|
| **Azure Cosmos DB** | Primary database (NoSQL + Vector) |
| **Azure Cache for Redis** | Caching, sessions, pub/sub |
| **Azure App Service** | Application hosting |
| **Azure Key Vault** | Secrets management |
| **Azure Application Insights** | Monitoring & logging |

---

## 🔐 Authentication Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│   API Gateway   │────▶│   Auth Service  │
│   (Next.js)     │     │   (Fastify)     │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   OAuth 2.0     │     │   JWT Tokens    │     │   Azure AD B2C  │
│   (Google,      │     │   (Access +     │     │   (Enterprise   │
│    GitHub,      │     │    Refresh)     │     │    SSO)         │
│    Microsoft)   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Supported Auth Methods

1. **Email/Password** - Traditional credentials with Argon2 hashing
2. **OAuth 2.0** - Google, GitHub, Microsoft social login
3. **Enterprise SSO** - SAML 2.0, Azure AD B2C
4. **Magic Links** - Passwordless email authentication
5. **MFA** - TOTP, SMS, Email OTP, Recovery codes

### Token Flow

```
1. User authenticates → API issues tokens
2. Access Token (15min) - Used for API requests
3. Refresh Token (7d) - Stored in Redis, used to get new access tokens
4. MFA Challenge Token (5min) - Temporary token for MFA flow
```

---

## 📦 Shards System Architecture

Shards are the core data entities - atomic units of knowledge that can be linked into a knowledge graph.

```
┌─────────────────────────────────────────────────────────────────┐
│                         SHARD                                   │
├─────────────────────────────────────────────────────────────────┤
│  id: string (UUID)                                              │
│  tenantId: string (Partition Key)                               │
│  shardTypeId: string (References ShardType)                     │
│  userId: string (Creator)                                       │
├─────────────────────────────────────────────────────────────────┤
│  structuredData: { ... }   ← Schema-validated, cacheable       │
│  unstructuredData: { ... } ← Large content, not cached         │
│  metadata: { tags, category, ... }                              │
├─────────────────────────────────────────────────────────────────┤
│  acl: [ { userId, permissions, ... } ]  ← Access control       │
│  vectors: [ { embedding, ... } ]         ← AI embeddings        │
├─────────────────────────────────────────────────────────────────┤
│  status: active | archived | deleted | draft                    │
│  schemaVersion: number                                          │
│  revisionNumber: number                                         │
│  createdAt, updatedAt, deletedAt                                │
└─────────────────────────────────────────────────────────────────┘
```

### Core ShardTypes

| Type | Purpose |
|------|---------|
| `c_contact` | Contact information |
| `c_company` | Company/organization data |
| `c_note` | Notes and memos |
| `c_task` | Tasks and todos |
| `c_event` | Calendar events |
| `c_email` | Email messages |
| `c_document` | Documents and files |
| `c_project` | Project containers |
| `c_contextTemplate` | AI context templates |

### Shard Features

- **Schema Evolution** - Migrate shard schemas with lazy/eager strategies
- **Field-Level Security** - Per-field encryption, masking, access control
- **Relationships** - Link shards into knowledge graph
- **Computed Fields** - Derived fields calculated from other data
- **Webhooks** - Real-time event notifications
- **Bulk Operations** - Batch create/update/delete (up to 100)
- **Import/Export** - CSV, JSON, NDJSON support

---

## 🗄️ Data Architecture

### Cosmos DB Containers

**Total Containers:** 60+ containers initialized

#### Core Data Containers

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `shards` | `/tenantId` | Main container for all shard documents (business data) | ✅ Implemented |
| `shard-types` | `/tenantId` | ShardType definitions (schemas for shards) | ✅ Implemented |
| `revisions` | `/tenantId` | Shard revision history for versioning | ✅ Implemented |
| `shard-edges` | `/sourceId` | Relationship graph edges between shards | ✅ Implemented |
| `shard-relationships` | `/tenantId` | Shard relationship metadata | ✅ Implemented |

#### Authentication & User Management

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `users` | `/partitionKey` | User accounts and profiles | ✅ Implemented |
| `roles` | `/tenantId` | User roles and permissions | ✅ Implemented |
| `RoleIdPMappings` | `/tenantId` | Role to Identity Provider group mappings | ✅ Implemented |
| `mfa-audit` | `/tenantId` | MFA audit logs (TTL: 90 days) | ✅ Implemented |

#### Multi-Tenancy

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `tenants` | `/partitionKey` | Tenant definitions and settings | ✅ Implemented |
| `tenant-join-requests` | `/tenantId` | Requests to join tenants | ✅ Implemented |
| `tenant-invitations` | `/tenantId` | Invitations to join tenants (TTL: 7 days) | ✅ Implemented |

#### SSO & OAuth

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `sso-configs` | `/tenantId` | SSO provider configurations per tenant | ✅ Implemented |
| `oauth2-clients` | `/tenantId` | OAuth2 client applications | ✅ Implemented |

#### Integrations

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `integration_providers` | `/category` | Integration provider definitions (system-level catalog) | ✅ Implemented |
| `integrations` | `/tenantId` | Tenant integration instances with configuration | ✅ Implemented |
| `integration-connections` | `/integrationId` | Integration connection credentials | ✅ Implemented |
| `conversion-schemas` | `/tenantId` | Data conversion schemas for integrations | ✅ Implemented |
| `sync-tasks` | `/tenantId` | Sync task configurations | ✅ Implemented |
| `sync-executions` | `/tenantId` | Sync execution history and logs (TTL: 30 days) | ✅ Implemented |
| `sync-conflicts` | `/tenantId` | Sync conflict records for resolution | ✅ Implemented |
| `custom-integrations` | `/tenantId` | User-defined custom API integrations | ✅ Implemented |
| `tenant-integrations` | `/tenantId` | Tenant-specific integration configurations | ✅ Implemented |

#### Webhooks & Events

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `webhooks` | `/tenantId` | Webhook endpoint configurations | ✅ Implemented |
| `webhook-deliveries` | `/tenantId` | Webhook delivery attempts and logs (TTL: 7 days) | ✅ Implemented |

#### Schema Management

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `schema-migrations` | `/tenantId` | Schema migration history | ✅ Implemented |

#### Option Lists

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `optionLists` | `/tenantId` | Reusable dropdown option lists | ✅ Implemented |

#### Widget Catalog

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `widgetCatalog` | `/catalogType` | System-wide widget catalog definitions | ✅ Implemented |
| `tenantWidgetOverrides` | `/tenantId` | Tenant-specific widget visibility overrides | ✅ Implemented |
| `tenantWidgetConfigs` | `/tenantId` | Tenant-specific widget catalog configuration | ✅ Implemented |

#### AI & Insights

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `aimodel` | `/provider` | AI model catalog (LLM, Embedding, etc.) | ✅ Implemented |
| `aiconnexion` | `/tenantId` | AI connection configurations with credentials | ✅ Implemented |
| `systemConfig` | `/configType` | System-wide AI and app configuration | ✅ Implemented |
| `tenantAIConfig` | `/tenantId` | Tenant-specific AI configuration | ✅ Implemented |
| `aiUsage` | `/tenantId` | AI usage tracking and billing | ✅ Implemented |
| `semantic-cache` | `/tenantId` | Semantic cache for AI responses (TTL: 24 hours) | ✅ Implemented |
| `insight-templates` | `/tenantId` | Pre-built and custom insight templates | ✅ Implemented |
| `scheduled-insights` | `/tenantId` | Scheduled insight configurations | ✅ Implemented |
| `insight-feedback` | `/tenantId` | User feedback on AI insights | ✅ Implemented |
| `entity-memory` | `/tenantId` | Long-term memory for entities | ✅ Implemented |
| `user-preferences` | `/tenantId` | User AI preferences and learned facts | ✅ Implemented |
| `shared-insights` | `/tenantId` | Shared insights and collaborative features | ✅ Implemented |

#### AI Insights Advanced Features (HPK Containers)

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `feedback` | `/partitionKey` (HPK: [tenantId, insightId, userId]) | User feedback and quality metrics | ✅ Implemented |
| `prompts` | `/tenantId` | System, Tenant, and User prompts | ✅ Implemented |
| `learning` | `/tenantId` | Pattern detection and improvement suggestions | ✅ Implemented |
| `experiments` | `/partitionKey` (HPK: [tenantId, experimentId, userId]) | A/B testing experiments | ✅ Implemented |
| `media` | `/partitionKey` (HPK: [tenantId, insightId, assetId]) | Multi-modal assets (TTL: 1 year) | ✅ Implemented |
| `templates` | `/tenantId` | Insight templates and template executions | ✅ Implemented |
| `proactive-insights` | `/tenantId` | Proactive insights generated from triggers | ✅ Implemented |
| `proactive-triggers` | `/tenantId` | Proactive trigger configurations | ✅ Implemented |
| `audit` | `/partitionKey` (HPK: [tenantId, insightId, auditEntryId]) | Audit trail (TTL: 7 days) | ✅ Implemented |
| `graph` | `/partitionKey` (HPK: [tenantId, sourceInsightId, targetInsightId]) | Insight dependencies (TTL: 6 months) | ✅ Implemented |
| `exports` | `/partitionKey` (HPK: [tenantId, exportJobId, integrationId]) | Export jobs (TTL: 90 days) | ✅ Implemented |
| `backups` | `/partitionKey` (HPK: [tenantId, backupJobId, recoveryPointId]) | Backup jobs (TTL: 30 days) | ✅ Implemented |

#### Audit & Monitoring

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `AuditLogs` | `/tenantId` | Audit log entries for compliance (TTL: 1 year) | ✅ Implemented |

#### Change Feed & Processing

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `leases` | `/id` | Change Feed Processor leases for distributed processing | ✅ Implemented |

#### Content Generation

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `document-templates` | `/tenantId` | Document templates for Content Generation system | ✅ Implemented |

#### Notifications (HPK Containers)

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `notifications` | `/partitionKey` (HPK: [tenantId, userId, id]) | User notifications (TTL: 90 days) | ✅ Implemented |
| `notification-preferences` | `/partitionKey` (HPK: [tenantId, userId]) | User notification preferences | ✅ Implemented |
| `notification-digests` | `/partitionKey` (HPK: [tenantId, userId, id]) | Notification digests (TTL: 30 days) | ✅ Implemented |

#### Collaborative Features

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `collaborative-insights` | `/partitionKey` (HPK: [tenantId, id]) | Collaborative insights | ✅ Implemented |

#### Bulk Operations

| Container | Partition Key | Purpose | Status |
|-----------|--------------|---------|--------|
| `bulk-jobs` | `/tenantId` | Bulk document operation jobs | ✅ Implemented |

**Note:** HPK = Hierarchical Partition Key (MultiHash). Containers with HPK use multiple partition key paths for better query performance.

### Redis Data Structure

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `session:{userId}:{sessionId}` | Active sessions | 7 days |
| `refresh_token:{tokenId}` | Refresh tokens | 7 days |
| `mfa_challenge:{token}` | MFA challenges | 5 min |
| `rate_limit:{ip}:{endpoint}` | Rate limiting | 1 min |
| `shard_cache:{tenantId}:{shardId}` | Shard data cache | 1 hour |
| `oauth_state:{state}` | OAuth CSRF protection | 10 min |
| `webhooks:{tenantId}:{id}` | Webhook configs | Forever |

---

## 🔄 Request Flow

### REST API Request

```
Client Request
      │
      ▼
┌─────────────────┐
│  Rate Limiter   │ ── Exceeds limit? → 429 Too Many Requests
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Auth Middleware │ ── Invalid token? → 401 Unauthorized
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Tenant Context │ ── Set tenantId from token
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Controller     │ ── Validate input, call service
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Service        │ ── Business logic
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Repository     │ ── Data access (Cosmos DB)
└─────────────────┘
      │
      ▼
Response
```

### GraphQL Request

```
Client Query/Mutation
      │
      ▼
┌─────────────────┐
│  Mercurius      │ ── Parse GraphQL
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Auth Context   │ ── Inject user into context
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Resolvers      │ ── Execute query
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  DataLoaders    │ ── Batch & cache DB calls
└─────────────────┘
      │
      ▼
Response
```

---

## 📊 Monitoring & Observability

### Application Insights Integration

```typescript
// All services use @castiel/monitoring package
import { monitoring } from '@castiel/monitoring';

// Track events
monitoring.trackEvent('user.login', { userId, method: 'oauth' });

// Track dependencies
monitoring.trackDependency('cosmosdb', 'query', duration, success);

// Track exceptions
monitoring.trackException(error, { context: 'auth.mfa' });
```

### Key Metrics

- Request duration (P50, P95, P99)
- Error rate by endpoint
- Active sessions count
- Database RU consumption
- Cache hit/miss ratio

---

## 🚀 Development Workflow

### Start Development

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev

# Start specific service
pnpm dev:api
pnpm dev:web
```

### Build & Test

```bash
# Build all
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Environment Variables

Create `.env` files in each app:

```bash
# apps/api/.env
NODE_ENV=development
PORT=3001
COSMOS_ENDPOINT=https://...
COSMOS_KEY=...
REDIS_URL=redis://localhost:6379
JWT_SECRET=...

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📊 Current Implementation Status

### Backend Services

**Total Services:** 316 TypeScript service files

#### Core Service Categories

1. **AI & Intelligence Services** (✅ Complete)
   - `insight.service.ts` - AI insight generation (5,091 lines)
   - `llm.service.ts` - LLM client wrapper
   - `intent-analyzer.service.ts` - Intent classification (pattern-based, LLM classification pending)
   - `prompt-resolver.service.ts` - Prompt management
   - `vector-search.service.ts` - Vector search
   - `embedding-template.service.ts` - Embedding templates
   - `feedback-learning.service.ts` - Feedback loop
   - `proactive-insight.service.ts` - Proactive insights
   - `ai-context-assembly.service.ts` - Context assembly (1,074 lines)
   - `conversation.service.ts` - Conversation management (5,292 lines)

2. **Risk & Revenue Services** (✅ Complete)
   - `risk-evaluation.service.ts` - Risk evaluation (2,508 lines)
   - `risk-catalog.service.ts` - Risk catalog
   - `revenue-at-risk.service.ts` - Revenue calculations
   - `quota.service.ts` - Quota management
   - `simulation.service.ts` - Risk simulation
   - `early-warning.service.ts` - Early warnings
   - `benchmarking.service.ts` - Benchmarks
   - `data-quality.service.ts` - Data quality validation
   - `trust-level.service.ts` - Trust level calculation
   - `risk-ai-validation.service.ts` - AI validation
   - `risk-explainability.service.ts` - Explainability
   - `comprehensive-audit-trail.service.ts` - Audit trail

3. **Security Services** (✅ Complete)
   - `pii-detection.service.ts` - PII detection
   - `pii-redaction.service.ts` - PII redaction
   - `prompt-injection-defense.service.ts` - Prompt injection defense
   - `citation-validation.service.ts` - Citation validation
   - `context-quality.service.ts` - Context quality assessment
   - `context-cache.service.ts` - Context caching

4. **Integration Services** (✅ Complete)
   - `integration.service.ts` - Integration management
   - `integration-connection.service.ts` - Connection handling
   - `sync-task.service.ts` - Sync scheduling
   - `adapter-manager.service.ts` - Adapter orchestration

5. **Data Management Services** (✅ Complete)
   - `shard.repository.ts` - Shard CRUD
   - `shard-relationship.service.ts` - Graph relationships
   - `document-upload.service.ts` - Document handling
   - `redaction.service.ts` - PII redaction
   - `audit-trail.service.ts` - Audit logging

### API Routes

**Total Routes:** 119 TypeScript route files

Key route categories:
- Authentication & Authorization (auth, mfa, magic-link, sso, oauth, oauth2, azure-ad-b2c)
- User Management (user-management, user-security, session-management, role-management)
- Tenant Management (tenant, tenant-membership)
- Shards & Data (shards, shard-types, shard-bulk, shard-relationship, revisions, documents, document-bulk)
- AI & Insights (ai-insights, ai-recommendation, ai-connections, ai-tools, ai-settings, ai-analytics, prompts, intent-patterns)
- Risk Analysis (risk-analysis, simulation, quotas, benchmarks)
- Integrations (integration routes, integration-monitoring)
- Content Generation (content-generation, document-templates, templates)
- Dashboards & Widgets (dashboard, widget-catalog)
- Notifications (notification routes)
- Webhooks (webhook routes)
- Vector Search & Embeddings (vector-search, vector-search-ui, embedding, embedding-jobs, embedding-template, embedding-template-generation)
- Collaboration (collaboration routes, collaborative-insights)
- Admin (admin routes, admin-dashboard, cache-admin, cache-optimization)
- Audit & Monitoring (audit-log, mfa-audit, phase2-audit-trail, comprehensive-audit-trail, phase2-metrics)
- Other (health, protected, sse, websocket, web-search, import-export, schema-migration, scim, teams, project-resolver, project-analytics, search-analytics, option-list, context-template, proactive-insights, proactive-triggers)

### Frontend Components

**Total Components:** 388 TypeScript React components

Key component categories:
- AI Insights components (49 files)
- Risk Analysis components (12 files)
- Dashboard & Widget components
- Form components
- UI primitives (shadcn/ui)
- Feature-specific components

---

## 🔍 Gap Analysis

### Critical Gaps

#### CRITICAL-1: Missing ML System Implementation
- **Severity:** Critical
- **Impact:** Product, Feature Completeness
- **Description:** Entire ML system is documented but not implemented:
  - Feature store service missing (`feature-store.service.ts`)
  - Model training service missing (`training.service.ts`)
  - Model registry missing (`model.service.ts`)
  - Training job management missing
  - ML feedback loop missing (`risk-feedback.service.ts`)
  - Model evaluation service missing (`evaluation.service.ts`)
  - LLM fine-tuning service missing (`llm-fine-tuning.service.ts`)
- **Affected Components:**
  - All ML-related services (none exist)
  - ML API endpoints (`/api/v1/risk-ml/*`) - Missing
  - ML UI components - Missing
- **Code References:**
  - Missing: `apps/api/src/services/feature-store.service.ts`
  - Missing: `apps/api/src/services/risk-ml.service.ts`
  - Missing: `apps/api/src/services/model.service.ts`
  - Missing: `apps/api/src/services/training.service.ts`
  - Missing: `apps/api/src/routes/risk-ml.routes.ts`
- **Blocks Production:** Yes - Features documented but unavailable

#### CRITICAL-2: Incomplete Assumption Tracking in Risk Analysis
- **Severity:** Critical
- **Impact:** User Trust, Data Quality
- **Description:** Risk evaluations include `assumptions` object but:
  - Not consistently populated across all evaluation paths
  - Not surfaced to users in UI
  - Missing data quality warnings not displayed
  - Staleness indicators not shown
- **Affected Components:**
  - `apps/api/src/services/risk-evaluation.service.ts` (lines 2508)
  - `apps/web/src/components/risk-analysis/risk-overview.tsx`
  - `apps/web/src/components/risk-analysis/risk-details-panel.tsx`
- **Code References:**
  - `risk-evaluation.service.ts` - Assumptions object exists but may not be consistently populated
  - Frontend components need to display assumption data
- **Blocks Production:** Yes - Users cannot assess reliability of risk scores

#### CRITICAL-3: Missing Automatic Risk Evaluation Triggers
- **Severity:** Critical
- **Impact:** User Experience, Data Freshness
- **Description:** Risk evaluations must be manually triggered via API. No automatic triggers when:
  - Opportunities are created/updated
  - Related shards change
  - Risk catalog is updated
- **Affected Components:**
  - Event handlers for shard updates
  - Queue service integration
- **Code References:**
  - Missing automatic triggers in shard event handlers
  - `apps/api/src/services/shard-event.service.ts` - May need integration
- **Blocks Production:** Yes - Manual process required

#### CRITICAL-4: Service Initialization Complexity
- **Severity:** Critical
- **Impact:** Maintainability, Reliability
- **Description:** `apps/api/src/routes/index.ts` has 4,000+ lines of initialization logic:
  - Many optional services with try-catch blocks that silently fail
  - Unclear what happens when optional services (grounding, vector search) are unavailable
  - Difficult to understand service dependencies
- **Affected Components:**
  - `apps/api/src/routes/index.ts` (4,102 lines)
- **Code References:**
  - File: `apps/api/src/routes/index.ts`
  - Multiple try-catch blocks with silent failures
  - Service initialization scattered throughout file
- **Blocks Production:** Yes - Maintenance nightmare

### High Priority Gaps

#### HIGH-1: AI Response Parsing Fragility
- **Severity:** High
- **Impact:** Stability, Data Quality
- **Description:** Risk Analysis AI detection relies on JSON parsing with fallback to regex:
  - No validation that parsed risks match catalog definitions
  - Silent failures when AI returns unexpected formats
  - No confidence calibration based on parsing success
- **Affected Components:**
  - `apps/api/src/services/risk-evaluation.service.ts` (AI detection logic)
  - `apps/api/src/services/risk-ai-validation.service.ts` (validation exists but may not catch all cases)
- **Code References:**
  - `risk-evaluation.service.ts` - JSON parsing logic needs validation
- **Blocks Production:** No - But causes silent failures

#### HIGH-2: Context Assembly Edge Cases
- **Severity:** High
- **Impact:** AI Quality, User Experience
- **Description:** Context assembly may:
  - Return empty context without warning
  - Truncate critical context due to token limits
  - Miss related shards silently
  - Include data user doesn't have permission to see
- **Affected Components:**
  - `apps/api/src/services/ai-context-assembly.service.ts` (1,074 lines)
  - `apps/api/src/services/ai-insights/project-context.service.ts`
- **Code References:**
  - `ai-context-assembly.service.ts` - Edge case handling needed
  - Permission checks may be missing
- **Blocks Production:** No - But degrades AI quality

#### HIGH-3: Incomplete Permission Checks in Context Assembly
- **Severity:** High
- **Impact:** Security, Data Access
- **Description:** Context assembly includes shards in AI context without verifying user has permission to access them
- **Affected Components:**
  - `apps/api/src/services/ai-context-assembly.service.ts`
  - `apps/api/src/services/ai-insights/project-context.service.ts`
- **Code References:**
  - `ai-context-assembly.service.ts` - ACL checks needed before including shards
- **Blocks Production:** No - But security risk

#### HIGH-4: Configuration Management Gaps
- **Severity:** High
- **Impact:** Reliability, Deployment
- **Description:**
  - Environment variables scattered across multiple files
  - No centralized configuration validation
  - Missing configuration can cause silent failures
- **Affected Components:**
  - `apps/api/src/config/env.ts`
  - Service initialization
- **Code References:**
  - `apps/api/src/config/env.ts` - Needs validation layer
- **Blocks Production:** No - But causes deployment issues

#### HIGH-5: Missing Error Handling in Some Paths
- **Severity:** High
- **Impact:** Stability, User Experience
- **Description:** Some code paths lack proper error handling:
  - AI response parsing failures may be silent
  - Context assembly failures may not be properly surfaced
  - Queue processing errors may not be logged
- **Affected Components:**
  - Multiple services
- **Code References:**
  - Various service files need error handling review
- **Blocks Production:** No - But causes silent failures

#### HIGH-6: Frontend-Backend API Contract Mismatches
- **Severity:** High
- **Impact:** User Experience, Stability
- **Description:** Potential mismatches between:
  - Frontend API client expectations
  - Backend API responses
  - Type definitions in shared-types
- **Affected Components:**
  - API client in `apps/web/src/lib/api/`
  - Backend route handlers
  - Shared type definitions in `packages/shared-types/`
- **Code References:**
  - Need comprehensive API contract validation
- **Blocks Production:** No - But causes runtime errors

### Medium Priority Gaps

#### MEDIUM-1: Missing Director Role Features
- **Severity:** Medium
- **Impact:** User Experience, Product
- **Description:** Director role exists but some features may not be fully implemented:
  - Department-level access controls
  - Cross-team visibility
  - Strategic analytics
- **Affected Components:**
  - Role management service
  - Permission guards
- **Code References:**
  - `apps/api/src/services/auth/role-management.service.ts`
- **Blocks Production:** No - But incomplete feature set

#### MEDIUM-2: Incomplete Tool Permission System
- **Severity:** Medium
- **Impact:** Security, Authorization
- **Description:** Tool executor has permission checking framework but:
  - Implementation is partial
  - Some tools available to all users without proper authorization
  - No audit trail for tool executions
- **Affected Components:**
  - `apps/api/src/services/ai/ai-tool-executor.service.ts`
- **Code References:**
  - `ai-tool-executor.service.ts` - Permission checks need completion
- **Blocks Production:** No - But security concern

#### MEDIUM-3: Type Safety Gaps
- **Severity:** Medium
- **Impact:** Developer Experience, Runtime Errors
- **Description:** Some areas use `any` types or `@ts-nocheck`:
  - `risk-analysis.routes.ts` has `@ts-nocheck`
  - Some service methods use `any` for request bodies
- **Affected Components:**
  - Multiple route files
  - Service methods
- **Code References:**
  - `apps/api/src/routes/risk-analysis.routes.ts` - Has `@ts-nocheck`
- **Blocks Production:** No - But reduces type safety

#### MEDIUM-4: Missing API Versioning Strategy
- **Severity:** Medium
- **Impact:** Maintainability, Backward Compatibility
- **Description:** APIs use `/api/v1/` prefix but:
  - No clear versioning strategy
  - No deprecation process
  - No backward compatibility guarantees
- **Affected Components:**
  - All API routes
- **Code References:**
  - All route files use `/api/v1/` prefix
- **Blocks Production:** No - But future maintenance issue

### Testing Gaps

#### CRITICAL-5: Missing Test Coverage for Critical Paths
- **Severity:** Critical
- **Impact:** Quality, Reliability
- **Description:**
  - Risk Analysis: Limited test coverage (only security/permission tests)
  - AI Response Parsing: Some edge case tests exist but not comprehensive
  - Context Assembly: Edge case tests exist but may not cover all scenarios
  - ML Services: ❌ No tests (services don't exist)
- **Affected Components:**
  - Risk evaluation service
  - AI services
  - Context assembly
- **Code References:**
  - `apps/api/tests/services/risk-evaluation.test.ts` - Limited coverage
  - `apps/api/tests/services/ai-insights/context-assembly-edge-cases.test.ts` - Exists but incomplete
- **Blocks Production:** Yes - Cannot verify correctness

#### HIGH-7: Missing Integration Tests
- **Severity:** High
- **Impact:** Quality, Reliability
- **Description:** Limited integration tests for:
  - End-to-end risk evaluation flow
  - AI chat with context assembly
  - Integration sync workflows
- **Affected Components:**
  - Multiple services
- **Code References:**
  - `apps/api/tests/integration/` - Limited coverage
- **Blocks Production:** No - But reduces confidence

### Performance Gaps

#### MEDIUM-5: Potential Performance Issues
- **Severity:** Medium
- **Impact:** User Experience, Scalability
- **Description:**
  - Large service files (5,000+ lines) may impact performance
  - No query optimization documented
  - Cache invalidation strategies may be incomplete
- **Affected Components:**
  - Large service files
  - Database queries
  - Cache management
- **Code References:**
  - `insight.service.ts` - 5,091 lines
  - `conversation.service.ts` - 5,292 lines
- **Blocks Production:** No - But may impact scalability

---

## 🔗 Related Documentation

- [Migration Guide](./MIGRATION_TURBOREPO.md) - Turborepo migration steps
- [Authentication](./backend/AUTHENTICATION.md) - Auth system details
- [Shards System](./shards/README.md) - Shards architecture
- [API Reference](./api/README.md) - REST & GraphQL APIs
- [Backend Documentation](./backend/README.md) - Backend implementation details
- [Frontend Documentation](./frontend/README.md) - Frontend implementation details











