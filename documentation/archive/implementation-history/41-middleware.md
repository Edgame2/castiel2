# Middleware Module

**Category:** Backend Services  
**Location:** `server/src/middleware/`  
**Last Updated:** 2025-01-27

---

## Overview

The Middleware Module provides request middleware for authentication, authorization, validation, rate limiting, metrics, and audit logging in the Coder IDE backend API server.

## Purpose

- Request preprocessing
- Authentication validation
- Authorization checking
- Request validation
- Rate limiting
- Metrics collection
- Audit logging
- Error handling

---

## Key Components

### 1. Authentication Middleware (`auth.ts`)

**Location:** `server/src/middleware/auth.ts`

**Purpose:** JWT authentication

**Features:**
- JWT token extraction
- Token validation
- User verification
- Request user attachment

**Key Functions:**
```typescript
async authenticateRequest(request: FastifyRequest, reply: FastifyReply): Promise<void>
async optionalAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>
```

**Token Extraction:**
1. `Authorization: Bearer <token>` header
2. `accessToken` cookie

**User Attachment:**
```typescript
(request as any).user = {
  id: userId,
  email: userEmail,
  name: userName,
};
```

### 2. RBAC Middleware (`rbac.ts`)

**Location:** `server/src/middleware/rbac.ts`

**Purpose:** Role-based access control

**Features:**
- Permission checking
- Scope validation
- Resource-level permissions
- Super admin bypass

**Key Functions:**
```typescript
async checkPermission(request: FastifyRequest, reply: FastifyReply, check: PermissionCheck): Promise<boolean>
function requirePermission(permission: string, resourceType?: string): FastifyMiddleware
```

**Usage:**
```typescript
fastify.get('/api/projects', {
  preHandler: [
    authenticateRequest,
    requirePermission('projects.project.read.all'),
  ],
  handler: async (request, reply) => {
    // Handler code
  },
});
```

### 3. Validation Middleware (`validation.ts`)

**Location:** `server/src/middleware/validation.ts`

**Purpose:** Request validation

**Features:**
- Schema validation (Zod)
- Type checking
- Value validation
- Error formatting

**Key Functions:**
```typescript
function validateRequest<T>(schema: ZodSchema<T>): FastifyMiddleware
```

**Usage:**
```typescript
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  organizationId: z.string(),
});

fastify.post('/api/projects', {
  preHandler: [
    authenticateRequest,
    requirePermission('projects.project.create'),
    validateRequest(createProjectSchema),
  ],
  handler: async (request, reply) => {
    // request.body is validated and typed
  },
});
```

### 4. Rate Limiting Middleware (`rateLimiting.ts`)

**Location:** `server/src/middleware/rateLimiting.ts`

**Purpose:** Rate limiting

**Features:**
- Request rate limiting
- Per-user limits
- Per-IP limits
- Redis-based tracking

**Configuration:**
```typescript
{
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per window
  keyGenerator: (request) => request.user?.id || request.ip,
}
```

### 5. Metrics Middleware (`metrics.ts`)

**Location:** `server/src/middleware/metrics.ts`

**Purpose:** Request metrics collection

**Features:**
- Request count
- Response time
- Error rate
- Status code tracking

**Key Functions:**
```typescript
async metricsMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void>
async metricsOnSend(request: FastifyRequest, reply: FastifyReply, payload: any): Promise<any>
```

**Metrics Collected:**
- Request duration
- Request count
- Error count
- Status code distribution

### 6. Audit Logging Middleware (`auditLogging.ts`)

**Location:** `server/src/middleware/auditLogging.ts`

**Purpose:** Audit logging

**Features:**
- Action logging
- User tracking
- Resource tracking
- Change tracking

**Logged Actions:**
- Create operations
- Update operations
- Delete operations
- Permission changes
- Role changes

### 7. API Key Authentication (`apiKeyAuth.ts`)

**Location:** `server/src/middleware/apiKeyAuth.ts`

**Purpose:** API key authentication

**Features:**
- API key validation
- Key format checking
- Key expiration
- Key scoping

**Key Functions:**
```typescript
async authenticateApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void>
```

**Usage:**
```typescript
fastify.post('/api/feedback', {
  preHandler: [authenticateApiKey],
  handler: async (request, reply) => {
    // API key validated
    // request.apiKey contains key info
  },
});
```

---

## Middleware Chain

### Execution Order

1. **Metrics Middleware** - Start timing
2. **Rate Limiting** - Check rate limits
3. **Authentication** - Validate JWT
4. **RBAC** - Check permissions
5. **Validation** - Validate request
6. **Audit Logging** - Log action
7. **Route Handler** - Execute handler
8. **Metrics On Send** - Record metrics

### Global Middleware

```typescript
// Applied to all routes
fastify.addHook('onRequest', metricsMiddleware);
fastify.addHook('onSend', metricsOnSend);
```

### Route-Specific Middleware

```typescript
fastify.get('/api/projects', {
  preHandler: [
    authenticateRequest,
    requirePermission('projects.project.read.all'),
    validateRequest(querySchema),
  ],
  handler: async (request, reply) => {
    // Handler
  },
});
```

---

## Authentication

### JWT Validation

```typescript
// Extract token
const token = extractToken(request);

// Verify token
const decoded = await fastify.jwt.verify(token);

// Validate user
const user = await db.user.findUnique({
  where: { id: decoded.userId },
});

if (!user || !user.isActive) {
  reply.code(401).send({ error: 'User not found or inactive' });
  return;
}

// Attach user to request
(request as any).user = {
  id: user.id,
  email: user.email,
  name: user.name,
};
```

### Optional Authentication

```typescript
// Some routes allow optional auth
fastify.get('/api/public', {
  preHandler: [optionalAuth],
  handler: async (request, reply) => {
    // request.user may be null
    if (request.user) {
      // Authenticated user
    } else {
      // Anonymous user
    }
  },
});
```

---

## Authorization

### Permission Checking

```typescript
// Check permission
const hasPermission = await checkPermission(
  request,
  reply,
  {
    permission: 'projects.project.read.all',
    resourceType: 'project',
    resourceId: request.params.id,
  }
);

if (!hasPermission) {
  reply.code(403).send({ error: 'Permission denied' });
  return;
}
```

### Scope Validation

**Scopes:**
- `all` - No restriction
- `organization` - Within organization
- `team` - Within team
- `own` - Own resources only

### Super Admin Bypass

```typescript
// Super admin bypasses all checks
if (user.role.isSuperAdmin) {
  return true; // Allow
}
```

---

## Validation

### Schema Validation

```typescript
// Define schema
const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['feature', 'bug', 'refactor']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  projectId: z.string(),
});

// Use in route
fastify.post('/api/tasks', {
  preHandler: [
    authenticateRequest,
    validateRequest(createTaskSchema),
  ],
  handler: async (request, reply) => {
    // request.body is validated
    const task = await taskService.create(request.body);
    return task;
  },
});
```

### Validation Errors

```typescript
// Validation errors format
{
  error: 'Validation failed',
  details: [
    {
      field: 'title',
      message: 'Title is required',
    },
  ],
}
```

---

## Rate Limiting

### Rate Limit Configuration

```typescript
const rateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  keyGenerator: (request) => {
    return request.user?.id || request.ip;
  },
  store: redis, // Redis store
});
```

### Rate Limit Headers

```typescript
// Response headers
{
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '95',
  'X-RateLimit-Reset': '1640995200',
}
```

### Rate Limit Errors

```typescript
// Rate limit exceeded
{
  error: 'Rate limit exceeded',
  retryAfter: 60, // seconds
}
```

---

## Metrics

### Metrics Collection

```typescript
// On request
metricsMiddleware: {
  startTime: Date.now(),
  method: request.method,
  url: request.url,
}

// On send
metricsOnSend: {
  duration: Date.now() - startTime,
  statusCode: reply.statusCode,
  error: error ? true : false,
}
```

### Metrics Storage

Metrics stored in:
- Prometheus format
- In-memory counters
- Redis (optional)
- Database (optional)

---

## Audit Logging

### Audit Log Format

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

### Logged Actions

- `create` - Resource creation
- `update` - Resource update
- `delete` - Resource deletion
- `permission.grant` - Permission granted
- `permission.revoke` - Permission revoked
- `role.assign` - Role assigned
- `role.remove` - Role removed

---

## Error Handling

### Error Middleware

Errors are handled at multiple levels:
1. Validation errors → 422
2. Authentication errors → 401
3. Authorization errors → 403
4. Not found errors → 404
5. Server errors → 500

### Error Response Format

```typescript
{
  error: string;
  message?: string;
  code?: string;
  details?: any;
}
```

---

## Usage Examples

### Protected Route

```typescript
fastify.get('/api/projects/:id', {
  preHandler: [
    authenticateRequest,
    requirePermission('projects.project.read.all', 'project'),
  ],
  handler: async (request, reply) => {
    const project = await projectService.getById(request.params.id);
    if (!project) {
      reply.code(404).send({ error: 'Project not found' });
      return;
    }
    return project;
  },
});
```

### Validated Route

```typescript
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

fastify.put('/api/projects/:id', {
  preHandler: [
    authenticateRequest,
    requirePermission('projects.project.update.all', 'project'),
    validateRequest(updateProjectSchema),
  ],
  handler: async (request, reply) => {
    const project = await projectService.update(
      request.params.id,
      request.body
    );
    return project;
  },
});
```

### Rate Limited Route

```typescript
fastify.post('/api/feedback', {
  preHandler: [
    authenticateApiKey,
    rateLimiter.middleware({
      windowMs: 60000,
      maxRequests: 10,
    }),
  ],
  handler: async (request, reply) => {
    // Handler
  },
});
```

---

## Related Modules

- **API Server Module** - Uses middleware
- **Database Module** - Used by middleware
- **Services Module** - Used by middleware

---

## Summary

The Middleware Module provides comprehensive request processing middleware for the Coder IDE backend. With authentication, authorization, validation, rate limiting, metrics, and audit logging, it ensures secure, validated, and monitored API access throughout the application.
