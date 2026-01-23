# Service Migration Guide: old_code/ → containers/

**Purpose:** Smart migration strategy for migrating services from `old_code/` to `containers/` following the new architecture and ModuleImplementationGuide.md standards.

## Platform Context

**Castiel** is an AI-native business intelligence platform that unifies business data from multiple sources and provides intelligent, predictive insights to help businesses make better decisions.

### Critical ML Enhancement Goal

The platform is being enhanced with a **Machine Learning system** focused on three priority use cases that provide the highest business value:

1. **Risk Scoring** ⭐ - ML-powered risk prediction to identify opportunities at risk
2. **Revenue Forecasting** ⭐ - Predictive revenue forecasting across multiple levels
3. **Recommendations** ⭐ - Intelligent next-best-action recommendations

The **ML Service** (`containers/ml-service/`) is already migrated ✅ and serves as the core of this critical ML enhancement. Services that integrate with the ML Service (such as `ai-insights` for risk analysis and `pipeline-manager` for revenue forecasting) should be prioritized in migration efforts.

### Migration Priority

When prioritizing service migrations, consider:
- **BI-focused services** (pipeline-manager, ai-insights, analytics-service) take priority over IDE-specific services
- Services that integrate with **ML Service** should be prioritized to enable ML enhancement goals
- The ML Service itself is already migrated and ready for integration

---

## Table of Contents

1. [Migration Strategy](#1-migration-strategy)
2. [Pre-Migration Analysis](#2-pre-migration-analysis)
3. [Migration Process](#3-migration-process)
4. [Migration Checklist](#4-migration-checklist)
5. [Service Prioritization](#5-service-prioritization)
6. [Common Patterns & Transformations](#6-common-patterns--transformations)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Migration Strategy

### 1.1 Principles

1. **Dependency-First**: Migrate services with no dependencies first, then dependent services
2. **Incremental**: Migrate one service at a time, test thoroughly before moving to next
3. **Standards-Compliant**: Every migrated service MUST follow ModuleImplementationGuide.md
4. **No Hardcoded Values**: All URLs, ports, secrets MUST come from config
5. **Tenant Isolation**: All database queries MUST include tenantId in partition key
6. **Event-Driven**: Use RabbitMQ for inter-service communication, not direct HTTP calls

### 1.2 Migration Phases

#### Phase 1: Foundation Services (Core Dependencies)
- ✅ Already migrated: auth, user-management, logging, secret-management
- Services that other services depend on

#### Phase 2: Data Services
- Shard management, document management, cache services
- Services that manage core data structures

#### Phase 3: AI & Intelligence Services
- **ML Service** ⭐ (already migrated ✅) - Core of critical ML enhancement (Risk Scoring, Revenue Forecasting, Recommendations)
- AI insights - ML-enhanced risk analysis (integrates with ML Service)
- Adaptive learning - CAIS adaptive learning system
- Services that provide intelligence capabilities

**Note**: The ML Service is the core of Castiel's critical ML enhancement. Services that integrate with ML Service (AI Insights for risk analysis, Pipeline Manager for forecasting) should be prioritized.

#### Phase 4: Integration & Content Services
- Integration management, content generation, templates
- Services that integrate with external systems

#### Phase 5: Specialized Services
- Analytics, dashboards, notifications, security
- Services that provide specialized functionality

---

## 2. Pre-Migration Analysis

### 2.1 Service Analysis Checklist

Before migrating a service, analyze:

- [ ] **Dependencies**: What services does this service depend on?
- [ ] **Database**: What Cosmos DB containers does it use?
- [ ] **Events**: What events does it publish/consume?
- [ ] **External APIs**: What external services does it call?
- [ ] **Configuration**: What configuration values does it need?
- [ ] **Routes**: What API endpoints does it expose?
- [ ] **Business Logic**: What are the core services/classes?

### 2.2 Dependency Mapping

Create a dependency graph:

```yaml
service-name:
  depends_on:
    - service1 (already migrated ✅)
    - service2 (needs migration ⚠️)
  provides_to:
    - service3
    - service4
```

### 2.3 Service Classification

Classify each service:

- **Core Module**: Required for basic operation (auth, user-management, logging)
- **Extension Module**: Optional functionality (analytics, dashboards)
- **Utility Service**: Shared functionality (cache, search)

---

## 3. Migration Process

### Step 1: Create Module Structure

```bash
# Use the migration script
./scripts/migrate-service.sh <service-name>

# Or manually create:
mkdir -p containers/<service-name>/{config,src/{config,routes,services,types,utils,events,middleware},tests/{unit,integration}}
```

### Step 2: Copy and Transform Code

#### 2.1 Identify Source Files

```bash
# Find service files in old_code
find old_code/apps/api/src/services -name "*<service-name>*" -type f
find old_code/apps/api/src/routes -name "*<service-name>*" -type f
find old_code/apps/api/src/controllers -name "*<service-name>*" -type f
```

#### 2.2 Transform Service Files

**Old Pattern:**
```typescript
// old_code/apps/api/src/services/my-service.service.ts
import { config } from '../config/env.js';
import { CosmosClient } from '@azure/cosmos';

export class MyService {
  private cosmos: CosmosClient;
  
  constructor() {
    this.cosmos = new CosmosClient({
      endpoint: config.cosmos.endpoint, // ❌ Direct config import
      key: config.cosmos.key
    });
  }
  
  async getData(id: string) {
    // ❌ No tenantId in query
    const query = `SELECT * FROM c WHERE c.id = @id`;
    // ...
  }
}
```

**New Pattern:**
```typescript
// containers/my-service/src/services/MyService.ts
import { CosmosDBClient } from '@coder/shared';
import { loadConfig } from '../config';

export class MyService {
  private db: CosmosDBClient;
  
  constructor(db: CosmosDBClient) {
    this.db = db;
  }
  
  async getData(tenantId: string, id: string) {
    // ✅ tenantId required, uses shared client
    const container = this.db.getContainer('my_service_data');
    const query = `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.id = @id`;
    // ...
  }
}
```

### Step 3: Create Configuration

#### 3.1 Create `config/default.yaml`

```yaml
# containers/<service-name>/config/default.yaml
module:
  name: <service-name>
  version: 1.0.0

server:
  port: ${PORT:-3XXX}  # Use port from service registry
  host: ${HOST:-0.0.0.0}

cosmos_db:
  endpoint: ${COSMOS_DB_ENDPOINT}
  key: ${COSMOS_DB_KEY}
  database_id: ${COSMOS_DB_DATABASE_ID:-castiel}
  containers:
    main: <service-name>_data  # Prefixed container name

services:
  # All service URLs from config, not hardcoded
  auth:
    url: ${AUTH_URL:-http://localhost:3021}
  logging:
    url: ${LOGGING_URL:-http://localhost:3014}
  # ... other dependencies

rabbitmq:
  url: ${RABBITMQ_URL}
  exchange: coder_events
  queue: <service-name>_service
  bindings:
    - "event.name"  # Events to consume

features:
  feature_flag: ${FEATURE_FLAG:-true}
```

#### 3.2 Create `config/schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["server", "cosmos_db"],
  "properties": {
    "server": {
      "type": "object",
      "required": ["port"],
      "properties": {
        "port": { "type": "number" },
        "host": { "type": "string" }
      }
    },
    "cosmos_db": {
      "type": "object",
      "required": ["endpoint", "key", "database_id"],
      "properties": {
        "endpoint": { "type": "string" },
        "key": { "type": "string" },
        "database_id": { "type": "string" }
      }
    }
  }
}
```

### Step 4: Create Server Entry Point

#### 4.1 Create `src/server.ts`

```typescript
/**
 * <Service Name> Module Server
 * Per ModuleImplementationGuide Section 3
 */

import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import { initializeDatabase, getDatabaseClient, setupJWT } from '@coder/shared';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { loadConfig } from './config';
import { registerRoutes } from './routes';
import { log } from './utils/logger';

let app: FastifyInstance | null = null;

export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();
  
  const fastify = Fastify({
    logger: false,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: 1048576,
    requestTimeout: 30000,
  });

  // Register Swagger/OpenAPI
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: '<Service Name> API',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1' }],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
  });
  
  // Setup JWT
  await setupJWT(fastify, {
    secret: config.jwt.secret,
  });
  
  // Initialize database
  await initializeDatabase({
    endpoint: config.cosmos_db.endpoint,
    key: config.cosmos_db.key,
    databaseId: config.cosmos_db.database_id,
  });
  
  const db = getDatabaseClient();
  
  // Register middleware
  await fastify.register(require('@coder/shared').tenantEnforcement);
  
  // Register routes
  await registerRoutes(fastify, { db, config });
  
  // Health checks
  fastify.get('/health', async () => ({ status: 'ok' }));
  fastify.get('/ready', async () => ({ status: 'ready' }));
  
  app = fastify;
  return fastify;
}

export async function start(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp();
  
  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });
    log.info(`Service started on ${config.server.host}:${config.server.port}`);
  } catch (err) {
    log.error('Failed to start server', err);
    process.exit(1);
  }
}

// Start if run directly
if (require.main === module) {
  start();
}
```

### Step 5: Transform Routes

#### 5.1 Old Route Pattern

```typescript
// old_code/apps/api/src/routes/my-service.routes.ts
export async function myServiceRoutes(fastify: FastifyInstance) {
  fastify.get('/api/my-service/data', async (request, reply) => {
    // ❌ Direct service instantiation
    const service = new MyService();
    // ❌ No tenant validation
    const data = await service.getData(request.params.id);
    return reply.send(data);
  });
}
```

#### 5.2 New Route Pattern

```typescript
// containers/my-service/src/routes/index.ts
import { FastifyInstance } from 'fastify';
import { MyService } from '../services/MyService';
import { getTenantId } from '@coder/shared';

export async function registerRoutes(
  fastify: FastifyInstance,
  deps: { db: CosmosDBClient; config: Config }
) {
  const service = new MyService(deps.db);
  
  fastify.get('/api/v1/data/:id', {
    preHandler: [fastify.authenticate], // ✅ JWT auth
  }, async (request, reply) => {
    const tenantId = getTenantId(request); // ✅ Extract tenantId
    const data = await service.getData(tenantId, request.params.id);
    return reply.send({ data });
  });
}
```

### Step 6: Transform Database Queries

#### 6.1 Always Include tenantId

```typescript
// ❌ OLD: No tenantId
const query = `SELECT * FROM c WHERE c.id = @id`;

// ✅ NEW: Always include tenantId in partition key
const query = `SELECT * FROM c WHERE c.tenantId = @tenantId AND c.id = @id`;
const parameters = [
  { name: '@tenantId', value: tenantId },
  { name: '@id', value: id }
];
```

#### 6.2 Use Prefixed Container Names

```typescript
// ❌ OLD: Direct container name
const container = cosmosClient.database('castiel').container('data');

// ✅ NEW: Prefixed container name from config
const container = db.getContainer(config.cosmos_db.containers.main);
// Container name: <service-name>_data
```

### Step 7: Transform Service Communication

#### 7.1 Old Pattern (Direct HTTP)

```typescript
// ❌ OLD: Hardcoded URL
const response = await fetch('http://localhost:3021/api/users/123');

// ❌ OLD: Direct import
import { UserService } from '../services/user.service';
```

#### 7.2 New Pattern (Config-Driven)

```typescript
// ✅ NEW: Use ServiceClient from @coder/shared
import { ServiceClient } from '@coder/shared';

const client = new ServiceClient({
  baseUrl: config.services.auth.url, // From config
  timeout: 5000,
});

const response = await client.get('/api/v1/users/123', {
  headers: {
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${serviceToken}`,
  },
});
```

#### 7.3 Event-Driven Communication

```typescript
// ✅ NEW: Use events for async operations
import { EventPublisher } from '@coder/shared';

const publisher = new EventPublisher(config.rabbitmq);
await publisher.publish('my-service.data.created', {
  id: data.id,
  tenantId: tenantId,
  timestamp: new Date().toISOString(),
});
```

### Step 8: Create OpenAPI Spec

Create `openapi.yaml` in module root:

```yaml
openapi: 3.0.3
info:
  title: <Service Name> API
  version: 1.0.0
servers:
  - url: /api/v1
paths:
  /data:
    get:
      summary: Get data
      tags: [Data]
      security:
        - bearerAuth: []
      parameters:
        - name: X-Tenant-ID
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
```

### Step 9: Create Documentation

#### 9.1 README.md Template

```markdown
# <Service Name> Module

<Description>

## Features

- Feature 1
- Feature 2

## Quick Start

### Prerequisites
- Node.js 20+
- Azure Cosmos DB NoSQL account

### Installation
\`\`\`bash
npm install
\`\`\`

### Configuration
\`\`\`bash
cp config/default.yaml config/local.yaml
\`\`\`

### Running
\`\`\`bash
npm run dev
\`\`\`

## API Reference

See [OpenAPI Spec](./openapi.yaml)

## Events

### Published Events
- \`service.event.name\`

### Consumed Events
- \`other.event.name\`
```

#### 9.2 Create CHANGELOG.md

```markdown
# Changelog

## [1.0.0] - 2026-01-23

### Added
- Initial migration from old_code/
- Core functionality
```

### Step 10: Create Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3XXX
CMD ["node", "dist/server.js"]
```

### Step 11: Update package.json

```json
{
  "name": "@coder/<service-name>",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "lint": "eslint src"
  },
  "dependencies": {
    "@coder/shared": "workspace:*",
    "fastify": "^4.24.0",
    "@fastify/swagger": "^8.12.0",
    "@fastify/swagger-ui": "^1.9.3"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 4. Migration Checklist

For each service migration, complete:

### Pre-Migration
- [ ] Analyze dependencies
- [ ] Map database containers
- [ ] Identify events (published/consumed)
- [ ] List API endpoints
- [ ] Document configuration needs

### Code Migration
- [ ] Create module directory structure
- [ ] Copy service files
- [ ] Transform imports (use @coder/shared)
- [ ] Add tenantId to all database queries
- [ ] Replace hardcoded URLs with config
- [ ] Transform routes (add auth, tenant enforcement)
- [ ] Update error handling (use AppError)
- [ ] Add event publishing/consuming

### Configuration
- [ ] Create config/default.yaml
- [ ] Create config/schema.json
- [ ] Create config/index.ts loader
- [ ] Add environment variable documentation

### Infrastructure
- [ ] Create Dockerfile
- [ ] Update package.json
- [ ] Create tsconfig.json
- [ ] Add health check endpoints

### Documentation
- [ ] Create README.md
- [ ] Create CHANGELOG.md
- [ ] Create openapi.yaml
- [ ] Document events (if applicable)
- [ ] Create architecture.md (if complex)

### Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test tenant isolation
- [ ] Test error handling
- [ ] Test event publishing/consuming

### Validation
- [ ] Linter passes
- [ ] TypeScript compiles
- [ ] Tests pass
- [ ] Follows ModuleImplementationGuide.md
- [ ] No hardcoded ports/URLs
- [ ] All queries include tenantId
- [ ] Service-to-service auth implemented

---

## 5. Service Prioritization

**Note**: BI-focused services (pipeline-manager, ai-insights, analytics-service) take priority over IDE-specific services. Services that integrate with the ML Service should be prioritized to enable the critical ML enhancement goals.

### Priority 1: Core Dependencies (Already Migrated ✅)
- auth
- user-management
- logging
- secret-management
- api-gateway

### Priority 2: Data Services
1. **shard-manager** ✅ (already migrated)
2. **document-manager** ✅ (already migrated)
3. **cache-service** ✅ (already migrated)
4. **embeddings** ✅ (already migrated)
5. **search-service** ✅ (already migrated)

### Priority 3: AI Services
1. **ml-service** ⭐ ✅ (already migrated) - **CRITICAL**: Core of ML enhancement (Risk Scoring, Revenue Forecasting, Recommendations)
2. **ai-insights** ✅ (already migrated) - ML-enhanced risk analysis (integrates with ML Service)
3. **ai-service** ✅ (already migrated) - LLM completions and reasoning
4. **adaptive-learning** ✅ (already migrated) - CAIS adaptive learning system
5. **context-service** ✅ (already migrated) - Context orchestration

**Still Need Migration:**
- ai-context-assembly
- ai-model-selection
- grounding
- intent-analyzer
- conversation
- enrichment
- vectorization

### Priority 4: Integration Services
1. **integration-manager** ✅ (already migrated)
2. **content-generation** ✅ (already migrated)
3. **template-service** ✅ (already migrated)

**Still Need Migration:**
- integration-catalog
- integration-connection
- adapter-manager
- bidirectional-sync

### Priority 5: Specialized Services
1. **pipeline-manager** ✅ (already migrated) - ML-enhanced revenue forecasting (integrates with ML Service)
2. **analytics-service** ✅ (already migrated) - Analytics and reporting for BI platform
3. **dashboard** ✅ (already migrated)
4. **notification-manager** ✅ (already migrated)
5. **security-service** ✅ (already migrated)
6. **compliance-service** ✅ (already migrated)

**Still Need Migration:**
- admin-dashboard
- benchmarking
- early-warning
- quota
- risk-evaluation
- revenue-at-risk

---

## 6. Common Patterns & Transformations

### Pattern 1: Service Initialization

**Old:**
```typescript
const service = new MyService(cosmosClient, redis, monitoring);
```

**New:**
```typescript
import { getDatabaseClient, getCacheClient } from '@coder/shared';
const db = getDatabaseClient();
const cache = getCacheClient();
const service = new MyService(db, cache);
```

### Pattern 2: Error Handling

**Old:**
```typescript
throw new Error('Something went wrong');
```

**New:**
```typescript
import { AppError } from '@coder/shared';
throw new AppError('Something went wrong', 400, 'BAD_REQUEST');
```

### Pattern 3: Logging

**Old:**
```typescript
console.log('Info message');
```

**New:**
```typescript
import { log } from './utils/logger';
log.info('Info message', { context });
```

### Pattern 4: Validation

**Old:**
```typescript
if (!data.name) throw new Error('Name required');
```

**New:**
```typescript
import { validate } from '@coder/shared';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1) });
validate(schema, data);
```

---

## 7. Troubleshooting

### Issue: Service can't find dependencies

**Solution:**
- Check if dependency service is migrated
- Use ServiceClient with config URL
- Verify service registry configuration

### Issue: Database queries fail

**Solution:**
- Ensure tenantId is in partition key
- Check container name prefix
- Verify Cosmos DB connection

### Issue: Events not working

**Solution:**
- Verify RabbitMQ connection
- Check event naming convention
- Ensure event schema matches

### Issue: Authentication fails

**Solution:**
- Verify JWT secret matches auth service
- Check X-Tenant-ID header
- Ensure service-to-service auth tokens

---

## Next Steps

1. **Run Migration Script**: Use the automated migration script (see `scripts/migrate-service.sh`)
2. **Start with Priority 2**: Begin with data services that have minimal dependencies
3. **Test Thoroughly**: Each migrated service should be fully tested before moving to next
4. **Update Documentation**: Keep FEATURE_COMPARISON_REPORT.md updated as services migrate

---

_Last Updated: 2026-01-23_
