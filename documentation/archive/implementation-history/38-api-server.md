# API Server Module

**Category:** Backend Services  
**Location:** `server/src/server.ts`, `server/src/routes/`  
**Last Updated:** 2025-01-27

---

## Overview

The API Server Module provides the RESTful API server for the Coder IDE backend. Built with Fastify, it handles 50+ route modules, request/response processing, middleware chain, and API endpoint management.

## Purpose

- RESTful API endpoint definition
- Request/response handling
- Route registration and management
- Middleware chain execution
- Error handling
- API documentation

---

## Key Components

### 1. Server Setup (`server.ts`)

**Location:** `server/src/server.ts`

**Purpose:** Fastify server initialization

**Features:**
- Fastify instance creation
- Plugin registration
- Route setup
- Middleware configuration
- Resource limits
- Health checks

**Configuration:**
```typescript
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
  bodyLimit: BODY_LIMIT, // 10 MB default
  requestTimeout: REQUEST_TIMEOUT, // 30 seconds
  keepAliveTimeout: KEEP_ALIVE_TIMEOUT, // 5 seconds
});
```

### 2. Route Modules (50+ routes)

**Location:** `server/src/routes/`

**Route Categories:**
- **Authentication:** `auth.ts`
- **Users:** `users.ts`
- **Projects:** `projects.ts`
- **Tasks:** `tasks.ts`
- **Teams:** `teams.ts`
- **Roadmaps:** `roadmaps.ts`
- **Modules:** `modules.ts`
- **Organizations:** `organizations.ts`
- **Roles:** `roles.ts`
- **Memberships:** `memberships.ts`
- **Invitations:** `invitations.ts`
- **Permissions:** `permissions.ts`
- **Audit:** `audit.ts`
- **Health:** `health.ts`
- **Metrics:** `metrics.ts`
- **Logs:** `logs.ts`
- **Feedback:** `feedbacks.ts`
- **Prompts:** `prompts.ts`
- **Dashboards:** `dashboards.ts`
- **MCP:** `mcp.ts`
- **Workflows:** `workflows.ts`
- **Calendar:** `calendar.ts`
- **Messaging:** `messaging.ts`
- **Knowledge:** `knowledge.ts`
- **Reviews:** `reviews.ts`
- **Incidents:** `incidents.ts`
- **Learning:** `learning.ts`
- **Architecture:** `architecture.ts`
- **Releases:** `releases.ts`
- **Dependencies:** `dependencies.ts`
- **Experiments:** `experiments.ts`
- **Debt:** `debt.ts`
- **Pairing:** `pairing.ts`
- **Capacity:** `capacity.ts`
- **Patterns:** `patterns.ts`
- **Observability:** `observability.ts`
- **Compliance:** `compliance.ts`
- **Innovation:** `innovation.ts`
- **Terminal:** `terminal.ts`
- **Problems:** `problems.ts`
- **Output:** `output.ts`
- **Explanations:** `explanations.ts`
- **Environments:** `environments.ts`
- **Application Context:** `applicationContext.ts`
- **Issues:** `issues.ts`
- **Progress:** `progress.ts`
- **Embeddings:** `embeddings.ts`
- **Review Checklists:** `reviewChecklists.ts`
- **Style Guides:** `styleGuides.ts`
- **Team Knowledge:** `teamKnowledge.ts`
- **Cross Project Patterns:** `crossProjectPatterns.ts`
- **Organization Best Practices:** `organizationBestPractices.ts`
- **Benchmarks:** `benchmarks.ts`
- **Agents:** `agents.ts`

### 3. Route Pattern

**Standard Route Structure:**
```typescript
export async function setupXxxRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/xxx
  fastify.get('/api/xxx', {
    preHandler: [
      authenticateRequest,
      requirePermission('xxx.read.all'),
    ],
    handler: async (request, reply) => {
      const items = await xxxService.list();
      return { items };
    },
  });

  // POST /api/xxx
  fastify.post('/api/xxx', {
    preHandler: [
      authenticateRequest,
      requirePermission('xxx.create'),
      validateRequest(createXxxSchema),
    ],
    handler: async (request, reply) => {
      const item = await xxxService.create(request.body);
      return item;
    },
  });

  // GET /api/xxx/:id
  fastify.get('/api/xxx/:id', {
    preHandler: [
      authenticateRequest,
      requirePermission('xxx.read.all', 'xxx'),
    ],
    handler: async (request, reply) => {
      const item = await xxxService.getById(request.params.id);
      if (!item) {
        reply.code(404).send({ error: 'Not found' });
        return;
      }
      return item;
    },
  });

  // PUT /api/xxx/:id
  fastify.put('/api/xxx/:id', {
    preHandler: [
      authenticateRequest,
      requirePermission('xxx.update.all', 'xxx'),
      validateRequest(updateXxxSchema),
    ],
    handler: async (request, reply) => {
      const item = await xxxService.update(request.params.id, request.body);
      return item;
    },
  });

  // DELETE /api/xxx/:id
  fastify.delete('/api/xxx/:id', {
    preHandler: [
      authenticateRequest,
      requirePermission('xxx.delete.all', 'xxx'),
    ],
    handler: async (request, reply) => {
      await xxxService.delete(request.params.id);
      reply.code(204).send();
    },
  });
}
```

---

## Server Configuration

### Resource Limits

```typescript
const BODY_LIMIT = parseInt(process.env.MAX_BODY_SIZE || '10485760', 10); // 10 MB
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10); // 30s
const KEEP_ALIVE_TIMEOUT = parseInt(process.env.KEEP_ALIVE_TIMEOUT || '5000', 10); // 5s
```

### Plugins

**CORS:**
```typescript
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
});
```

**JWT:**
```typescript
await fastify.register(jwt, {
  secret: JWT_SECRET,
});
```

**Google OAuth:**
```typescript
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  setupGoogleOAuth(fastify, {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });
}
```

---

## Middleware Chain

### Middleware Order

1. **Metrics Middleware** - Request metrics
2. **Authentication Middleware** - JWT validation
3. **RBAC Middleware** - Permission checking
4. **Validation Middleware** - Request validation
5. **Rate Limiting Middleware** - Rate limiting
6. **Audit Logging Middleware** - Audit logging

### Global Middleware

```typescript
// Metrics (all routes)
fastify.addHook('onRequest', metricsMiddleware);
fastify.addHook('onSend', metricsOnSend);
```

---

## Route Registration

### Route Setup

All routes are registered in `server.ts`:

```typescript
await setupAuthRoutes(fastify);
await setupUserRoutes(fastify);
await setupProjectRoutes(fastify);
// ... 50+ more route setups
```

### Route Organization

Routes organized by feature:
- Authentication routes
- User management routes
- Project management routes
- Collaboration routes
- Productivity routes
- System routes

---

## API Endpoints

### Base Path

All API endpoints use `/api` prefix:

- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/projects/*` - Project management
- `/api/tasks/*` - Task management
- `/api/teams/*` - Team management
- `/api/organizations/*` - Organization management
- `/api/roadmaps/*` - Roadmap management
- `/api/modules/*` - Module management
- `/api/calendar/*` - Calendar
- `/api/messaging/*` - Messaging
- `/api/knowledge/*` - Knowledge base
- `/api/reviews/*` - Code reviews
- `/api/incidents/*` - Incident management
- `/api/learning/*` - Learning resources
- `/api/architecture/*` - Architecture
- `/api/releases/*` - Release management
- `/api/dependencies/*` - Dependencies
- `/api/debt/*` - Technical debt
- `/api/pairing/*` - Pair programming
- `/api/capacity/*` - Capacity planning
- `/api/patterns/*` - Pattern library
- `/api/compliance/*` - Compliance
- `/api/innovation/*` - Innovation
- `/api/experiments/*` - Experiments
- `/api/metrics/*` - Metrics
- `/api/logs/*` - Logs
- `/api/feedback/*` - Feedback
- `/api/prompts/*` - Prompts
- `/api/dashboards/*` - Dashboards
- `/api/mcp/*` - MCP servers
- `/api/workflows/*` - Workflows
- `/api/agents/*` - Agents
- `/api/observability/*` - Observability
- `/api/benchmarks/*` - Benchmarks
- `/api/health` - Health check

---

## Error Handling

### Error Response Format

```typescript
{
  error: string;
  message?: string;
  code?: string;
  details?: any;
}
```

### Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

### Error Middleware

Errors are handled by:
- Validation middleware
- Authentication middleware
- RBAC middleware
- Route handlers
- Global error handler

---

## Health Checks

### Health Endpoint

```typescript
GET /api/health
```

**Response:**
```typescript
{
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
  timestamp: string;
}
```

### Health Check Implementation

```typescript
const { setupHealthRoutes } = await import('./routes/health');
await setupHealthRoutes(fastify);
```

---

## Metrics

### Metrics Endpoint

```typescript
GET /api/metrics
```

**Metrics Collected:**
- Request count
- Response time
- Error rate
- Active connections
- Resource usage

### Metrics Middleware

```typescript
fastify.addHook('onRequest', metricsMiddleware);
fastify.addHook('onSend', metricsOnSend);
```

---

## API Documentation

### OpenAPI Specification

**Location:** `server/src/docs/openapi.yaml`

**Features:**
- API endpoint documentation
- Request/response schemas
- Authentication requirements
- Example requests/responses

---

## Security

### Authentication

All protected routes require:
- JWT token in `Authorization` header
- Valid token signature
- Non-expired token
- User exists in database

### Authorization

All protected routes check:
- User permissions
- Resource ownership
- Organization membership
- Role-based access

### CORS

CORS configured for:
- Frontend origin
- Credentials support
- Preflight handling

---

## Performance

### Resource Limits

- **Body Limit:** 10 MB (configurable)
- **Request Timeout:** 30 seconds (configurable)
- **Keep-Alive:** 5 seconds (configurable)

### Optimization

- Fastify high performance
- Async/await throughout
- Database connection pooling
- Response compression
- Caching where appropriate

---

## Usage Examples

### Start Server

```typescript
const server = await buildServer();

await server.listen({
  port: PORT,
  host: '0.0.0.0',
});

console.log(`Server listening on port ${PORT}`);
```

### Add Custom Route

```typescript
export async function setupCustomRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/custom', {
    preHandler: [authenticateRequest],
    handler: async (request, reply) => {
      return { message: 'Custom endpoint' };
    },
  });
}
```

---

## Related Modules

- **Database Module** - Data persistence
- **Services Module** - Business logic
- **Middleware Module** - Request processing

---

## Summary

The API Server Module provides a comprehensive RESTful API for the Coder IDE backend. With 50+ route modules, middleware chain, error handling, and security features, it enables reliable and secure API access for all application features.
