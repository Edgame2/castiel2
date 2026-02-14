# Endpoint Templates

Templates for implementing REST endpoints in Castiel containers. Each template covers API Gateway, authentication, authorization, Fastify, Cosmos DB, RabbitMQ, and error handling.

## Legend

| Symbol | Meaning |
|--------|---------|
| `{service}` | Service name (e.g. `risk_catalog`, `shard_manager`) |
| `{resource}` | Resource name (e.g. `risks`, `shards`) |
| `{container}` | Cosmos DB container name (e.g. `risk_catalog_risks`, `shard_shards`) |
| `{eventType}` | Event type (e.g. `risk.created`, `shard.deleted`) |
| `{EventPublisher}` | Event publisher module (e.g. `RiskCatalogEventPublisher`) |
| `{CreateInput}` | TypeScript type for create body |
| `{UpdateInput}` | TypeScript type for update body |

---

## Route Types

| Type | Middleware | Use |
|------|------------|-----|
| **Public** | None | Login, health, public auth endpoints |
| **Protected** | `authenticateRequest()` | Any authenticated user |
| **Tenant-scoped** | `authenticateRequest()` + `tenantEnforcementMiddleware()` | Standard API routes; requires `X-Tenant-ID` header forwarded by gateway |

**Headers:** `tenantEnforcementMiddleware()` expects `X-Tenant-ID`. The API Gateway validates it and forwards it to downstream services.

---

## 1. GET (Single Item)

**Use:** Read one resource by ID.

### API Gateway

Add to `containers/api-gateway/src/routes/index.ts` in `routeMappings`:
```typescript
{ path: '/api/v1/{resource}', service: '{service}', serviceUrl: config.services.{service}.url, stripPrefix: false },
```

### Service Route

```typescript
fastify.get<{ Params: { id: string } }>(
  '/api/v1/{resource}/:id',
  {
    preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
    schema: {
      description: 'Get {resource} by ID',
      tags: ['{Resource}'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: { type: 'object', description: '{Resource} details' },
      },
    },
  },
  async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const entity = await service.getById(request.params.id, tenantId);
    reply.send(entity);
  }
);
```

### Service Layer (Cosmos DB)

```typescript
async getById(id: string, tenantId: string): Promise<Entity> {
  if (!id || !tenantId) {
    throw new BadRequestError('id and tenantId are required');
  }
  try {
    const container = getContainer('{container}');
    const { resource } = await container.item(id, tenantId).read<Entity>();
    if (resource?.deletedAt) {
      throw new NotFoundError('Resource', id);
    }
    return resource!;
  } catch (error: any) {
    if (error.code === 404) {
      throw new NotFoundError('Resource', id);
    }
    throw error;
  }
}
```

> **Note:** Cosmos `item(id, partitionKey).read()` throws when the item does not exist rather than returning null. Catch 404 and map to `NotFoundError`.

---

## 2. GET (List)

**Use:** List resources with filtering and pagination.

### Service Route

```typescript
fastify.get<{
  Querystring: {
    limit?: number;
    continuationToken?: string;
    /** Add resource-specific filters */
  };
}>(
  '/api/v1/{resource}',
  {
    preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
    schema: {
      description: 'List {resource}',
      tags: ['{Resource}'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 5000, default: 100 },
          continuationToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            continuationToken: { type: 'string' },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const { items, continuationToken } = await service.list(tenantId, request.query);
    reply.send({ items, continuationToken });
  }
);
```

### Service Layer (Cosmos DB)

```typescript
async list(
  tenantId: string,
  options?: { limit?: number; continuationToken?: string }
): Promise<{ items: Entity[]; continuationToken?: string }> {
  if (!tenantId) {
    throw new BadRequestError('tenantId is required');
  }
  const container = getContainer('{container}');
  const query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
  const params = [{ name: '@tenantId', value: tenantId }];
  const feedOptions: { maxItemCount?: number; continuationToken?: string } = {};
  if (options?.limit) feedOptions.maxItemCount = options.limit;
  if (options?.continuationToken) feedOptions.continuationToken = options.continuationToken;

  const { resources, continuationToken } = await container.items
    .query({ query, parameters: params }, feedOptions)
    .fetchNext();

  return { items: resources, continuationToken };
}
```

---

## 3. POST (Create)

**Use:** Create a new resource. Publish events when relevant.

### Service Route

```typescript
fastify.post<{ Body: CreateInput }>(
  '/api/v1/{resource}',
  {
    preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
    schema: {
      description: 'Create {resource}',
      tags: ['{Resource}'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'], // adjust as needed
        properties: {
          name: { type: 'string' },
          // ... other fields
        },
      },
      response: {
        201: { type: 'object', description: 'Resource created' },
      },
    },
  },
  async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const userId = request.user!.id;
    const input = { ...request.body, tenantId, userId };
    const entity = await service.create(input);
    reply.code(201).send(entity);
  }
);
```

### Service Layer (Cosmos DB + RabbitMQ)

```typescript
async create(input: CreateInput): Promise<Entity> {
  if (!input.tenantId) {
    throw new BadRequestError('tenantId is required');
  }
  const entity: Entity = {
    id: uuidv4(),
    tenantId: input.tenantId,
    ...input,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const container = getContainer('{container}');
  const { resource } = await container.items.create(entity, {
    partitionKey: input.tenantId,
  });

  const { publishEvent } = await import('../events/publishers/{EventPublisher}');
  // Event naming: {domain}.{resource}.{action} (e.g. risk_catalog.risk.created)
  await publishEvent('{eventType}.created', input.tenantId, {
    id: resource.id,
    resourceType: '{resource}',
  }, { userId: input.userId });

  return resource as Entity;
}
```

> **Note:** Cosmos `items.create()` accepts `(body, options)` where `options.partitionKey` must be the tenant ID. SDK may vary; ensure `partitionKey` is passed.
>
> **Note:** Event publishing is optional. When RabbitMQ is not configured, publishers should log a warning and skip (no throw).

---

## 4. PUT (Full Update)

**Use:** Replace entire resource. Client sends full resource; server merges with existing and replaces. Publish events when relevant.

### Service Route

```typescript
fastify.put<{ Params: { id: string }; Body: UpdateInput }>(
  '/api/v1/{resource}/:id',
  {
    preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
    schema: {
      description: 'Update {resource}',
      tags: ['{Resource}'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          // ... other fields
        },
      },
      response: {
        200: { type: 'object', description: 'Resource updated' },
      },
    },
  },
  async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const entity = await service.update(request.params.id, tenantId, request.body);
    reply.send(entity);
  }
);
```

### Service Layer (Cosmos DB + RabbitMQ)

```typescript
async update(id: string, tenantId: string, input: UpdateInput): Promise<Entity> {
  const existing = await this.getById(id, tenantId);

  if (existing.deletedAt) {
    throw new ForbiddenError('Cannot update deleted resource');
  }

  const updated: Entity = {
    ...existing,
    ...input,
    updatedAt: new Date(),
  };

  const container = getContainer('{container}');
  const { resource } = await container.item(id, tenantId).replace(updated);

  const { publishEvent } = await import('../events/publishers/{EventPublisher}');
  await publishEvent('{eventType}.updated', tenantId, {
    id: resource.id,
    resourceType: '{resource}',
  });

  return resource as Entity;
}
```

---

## 5. PATCH (Partial Update)

**Use:** Update a subset of fields only. Client sends only changed fields; server merges with existing. Prefer PATCH over PUT when updating a single field (e.g. toggle flag).

### Service Route

```typescript
fastify.patch<{ Params: { id: string }; Body: Partial<UpdateInput> }>(
  '/api/v1/{resource}/:id',
  {
    preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
    schema: {
      description: 'Partially update {resource}',
      tags: ['{Resource}'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          // ... only the fields that can be patched
        },
      },
      response: {
        200: { type: 'object', description: 'Resource updated' },
      },
    },
  },
  async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const entity = await service.patch(request.params.id, tenantId, request.body);
    reply.send(entity);
  }
);
```

### Service Layer (Cosmos DB + RabbitMQ)

```typescript
async patch(id: string, tenantId: string, input: Partial<UpdateInput>): Promise<Entity> {
  const existing = await this.getById(id, tenantId);

  if (existing.deletedAt) {
    throw new ForbiddenError('Cannot update deleted resource');
  }

  const updated: Entity = {
    ...existing,
    ...input,
    updatedAt: new Date(),
  };

  const container = getContainer('{container}');
  const { resource } = await container.item(id, tenantId).replace(updated);

  const { publishEvent } = await import('../events/publishers/{EventPublisher}');
  await publishEvent('{eventType}.updated', tenantId, {
    id: resource.id,
    resourceType: '{resource}',
  });

  return resource as Entity;
}
```

---

## 6. DELETE (Soft Delete)

**Use:** Soft delete (set `deletedAt`, optional status). Publish events when relevant.

### Service Route

```typescript
fastify.delete<{ Params: { id: string } }>(
  '/api/v1/{resource}/:id',
  {
    preHandler: [authenticateRequest(), tenantEnforcementMiddleware()],
    schema: {
      description: 'Delete {resource} (soft delete)',
      tags: ['{Resource}'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        204: { type: 'null', description: 'Resource deleted' },
      },
    },
  },
  async (request, reply) => {
    const tenantId = request.user!.tenantId;
    await service.delete(request.params.id, tenantId);
    reply.code(204).send();
  }
);
```

### Service Layer (Cosmos DB + RabbitMQ)

```typescript
async delete(id: string, tenantId: string): Promise<void> {
  const existing = await this.getById(id, tenantId);

  if (existing.deletedAt) {
    return; // Idempotent
  }

  const deleted: Entity = {
    ...existing,
    status: 'deleted',
    deletedAt: new Date(),
    updatedAt: new Date(),
  };

  const container = getContainer('{container}');
  await container.item(id, tenantId).replace(deleted);

  const { publishEvent } = await import('../events/publishers/{EventPublisher}');
  await publishEvent('{eventType}.deleted', tenantId, {
    id: existing.id,
    resourceType: '{resource}',
  });
}
```

---

## 7. Error Handling

Use shared errors from `@coder/shared/utils/errors`:

| Error | HTTP | When |
|-------|------|------|
| `BadRequestError` | 400 | Invalid input, missing required fields |
| `ValidationError` | 400 | Schema validation failed |
| `UnauthorizedError` | 401 | No valid token |
| `ForbiddenError` | 403 | Tenant mismatch, RBAC denial |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | Duplicate ID |

**Route handler error handling:**

```typescript
// Preferred: Central setErrorHandler in server.ts (handles AppError, validation errors)
fastify.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
  if (error.validation) {
    return reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.validation },
    });
  }
  const status = error.statusCode ?? 500;
  reply.status(status).send({
    error: { code: (error as any).code ?? 'INTERNAL_ERROR', message: error.message },
  });
});

// Use try/catch only when handler needs custom response shaping
```

---

## 8. Optional RBAC

For permission-based routes (e.g. Super Admin):

```typescript
// auth container uses requirePermission
preHandler: [authenticateRequest, requirePermission('tenants.sso.manage', 'tenant')],

// Other containers: use checkPermission or ensureCanAccessUser (or equivalent)
preHandler: [authenticateRequest(), tenantEnforcementMiddleware(), ensureCanAccessUser(request.params.id)],
```

---

## 9. Checklist

- [ ] Route registered in API Gateway `routeMappings`
- [ ] `authenticateRequest()` on all protected routes
- [ ] `tenantEnforcementMiddleware()` for tenant-scoped routes
- [ ] `tenantId` from `request.user!.tenantId` (never from body)
- [ ] Cosmos DB: `partitionKey` = `tenantId` for all queries
- [ ] Events: publish `{domain}.{resource}.{action}` via RabbitMQ; gracefully skip when RabbitMQ not configured
- [ ] Schema: params, body, querystring, response defined
- [ ] Errors: use `AppError` subclasses
