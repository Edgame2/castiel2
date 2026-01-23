# Development Standards - Quick Reference

**Last Updated:** 2025-01-XX  
**Purpose:** Quick lookup guide for error handling and input validation patterns

> 📖 For complete details, see:
> - [Error Handling Standard](./ERROR_HANDLING_STANDARD.md) - Full error handling guide
> - [Input Validation Standard](./INPUT_VALIDATION_STANDARD.md) - Full validation guide

---

## 🚀 Quick Start

### Error Handling - Choose Your Pattern

```typescript
// Pattern 1: Throw Errors (Most Common) ✅
if (!id) {
  throw new AppError('ID is required', 400);
}

// Pattern 2: Try-Catch with Re-throw (Service Errors)
try {
  const result = await this.service.doSomething();
} catch (error) {
  if (error instanceof AppError) throw error;
  throw new AppError('Operation failed', 500);
}

// Pattern 3: Try-Catch with Manual Handling (Complex Cases)
try {
  // Complex logic
} catch (error) {
  request.log.error({ error }, 'Operation failed');
  return reply.status(500).send({ error: 'Internal error' });
}
```

### Input Validation - Choose Your Pattern

```typescript
// Pattern 1: Manual Validation (Simple)
if (!name || typeof name !== 'string' || name.trim().length === 0) {
  throw new AppError('Name is required', 400);
}

// Pattern 2: Fastify Schema (Recommended) ✅
const schema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string', minLength: 1 } }
  }
};

// Pattern 3: Service-Based (Complex Data)
const result = await this.shardValidationService.validateShardData(...);

// Pattern 4: Sanitization + Validation (AI Inputs) ✅
const sanitized = sanitizeUserInput(prompt.trim());
```

---

## 📋 Error Handling Cheat Sheet

### Standard Error Classes

```typescript
import { 
  AppError,           // Base error (custom status)
  ValidationError,    // 400 Bad Request
  UnauthorizedError,  // 401 Unauthorized
  ForbiddenError,    // 403 Forbidden
  NotFoundError      // 404 Not Found
} from '../middleware/error-handler.js';
```

### Common Error Patterns

| Scenario | Pattern | Code |
|----------|---------|------|
| Missing required field | Throw AppError | `throw new AppError('Field required', 400)` |
| Resource not found | Throw NotFoundError | `throw new NotFoundError('Resource not found')` |
| Unauthorized access | Throw UnauthorizedError | `throw new UnauthorizedError('Not authenticated')` |
| Forbidden access | Throw ForbiddenError | `throw new ForbiddenError('Access denied')` |
| Validation failed | Throw ValidationError | `throw new ValidationError('Invalid input', errors)` |
| Service error | Try-catch + re-throw | `catch (error) { if (error instanceof AppError) throw error; }` |

### Error Response Format

```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "name", "message": "Name is required", "code": "REQUIRED" }
  ]
}
```

---

## 🔒 Input Validation Cheat Sheet

### Validation Utilities

```typescript
// Input Sanitization (AI inputs)
import { sanitizeUserInput, sanitizeContextData } from '../utils/input-sanitization.js';
const sanitized = sanitizeUserInput(userInput);

// Field Validation (Shard data)
const result = await this.fieldValidationService.validateRichSchema(data, schema, context);

// Shard Validation (Complete shard)
const result = await this.shardValidationService.validateShardData(data, shardTypeId, tenantId);
```

### Common Validation Patterns

| Validation | Pattern | Code |
|------------|---------|------|
| Required field | Manual check | `if (!field \|\| field.trim().length === 0) throw new AppError(...)` |
| String length | Manual or Schema | `if (name.length > 100) throw new AppError(...)` |
| Numeric range | Manual or Schema | `if (temp < 0 \|\| temp > 2) throw new AppError(...)` |
| Enum value | Manual or Schema | `if (!['active', 'inactive'].includes(status)) throw new AppError(...)` |
| Email format | Schema (recommended) | `{ type: 'string', format: 'email' }` |
| UUID format | Schema (recommended) | `{ type: 'string', format: 'uuid' }` |
| Array constraints | Schema (recommended) | `{ type: 'array', maxItems: 10 }` |

### Fastify Schema Quick Reference

```typescript
const schema = {
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100,
        pattern: '^[a-zA-Z0-9\\s-]+$'  // Alphanumeric, spaces, hyphens
      },
      email: { 
        type: 'string', 
        format: 'email' 
      },
      age: { 
        type: 'integer', 
        minimum: 0, 
        maximum: 150 
      },
      tags: { 
        type: 'array', 
        items: { type: 'string' }, 
        maxItems: 10 
      }
    }
  }
};

server.post('/api/v1/resource', { schema }, controller.create);
```

---

## 🛡️ Security Quick Reference

### Prompt Injection Prevention

```typescript
// ✅ ALWAYS sanitize AI inputs
import { sanitizeUserInput } from '../utils/input-sanitization.js';
const sanitizedPrompt = sanitizeUserInput(prompt.trim());
```

### XSS Prevention

```typescript
// For HTML content, use DOMPurify
import DOMPurify from 'isomorphic-dompurify';
const sanitizedHtml = DOMPurify.sanitize(htmlContent);
```

### Input Size Limits

```typescript
// Text input
if (prompt.length > 10000) {
  throw new AppError('Input exceeds maximum length', 400);
}

// File uploads (configure in Fastify)
await server.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
```

### Path Traversal Prevention

```typescript
// Validate IDs don't contain path traversal
if (id.includes('..') || id.includes('/') || id.includes('\\')) {
  throw new AppError('Invalid ID format', 400);
}

// Use UUID validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(id)) {
  throw new AppError('Invalid ID format', 400);
}
```

---

## 📝 Common Scenarios

### Scenario 1: Simple Create Endpoint

```typescript
// Route with schema
const createSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 }
    }
  }
};

server.post('/api/v1/resources', { schema: createSchema }, controller.create);

// Controller (validation already done by Fastify)
async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { name } = request.body as { name: string };
  const resource = await this.service.create({ name });
  reply.status(201).send(resource);
}
```

### Scenario 2: AI Endpoint with Sanitization

```typescript
async generateContent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { prompt } = request.body as { prompt: string };

  // 1. Basic validation
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new AppError('Prompt is required', 400);
  }

  // 2. Length check
  if (prompt.length > 10000) {
    throw new AppError('Prompt exceeds maximum length', 400);
  }

  // 3. Sanitize
  const { sanitizeUserInput } = await import('../utils/input-sanitization.js');
  const sanitizedPrompt = sanitizeUserInput(prompt.trim());

  // 4. Generate
  const result = await this.service.generate(sanitizedPrompt);
  reply.status(200).send(result);
}
```

### Scenario 3: Complex Data with Service Validation

```typescript
async createShard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { shardTypeId, structuredData } = request.body as {
    shardTypeId: string;
    structuredData: Record<string, unknown>;
  };

  // 1. Basic validation
  if (!shardTypeId) {
    throw new AppError('shardTypeId is required', 400);
  }

  // 2. Service-based validation
  const result = await this.shardValidationService.validateShardData(
    structuredData,
    shardTypeId,
    tenantId,
    { mode: 'strict', isCreate: true }
  );

  if (!result.valid) {
    throw new ValidationError('Shard validation failed', result.errors);
  }

  // 3. Create
  const shard = await this.service.create({ shardTypeId, structuredData });
  reply.status(201).send(shard);
}
```

---

## ✅ Best Practices Checklist

### Error Handling
- [ ] Use standard error classes (`AppError`, `NotFoundError`, etc.)
- [ ] Throw errors for simple cases (Pattern 1)
- [ ] Use try-catch for service errors (Pattern 2)
- [ ] Provide clear, user-friendly error messages
- [ ] Include error codes for programmatic handling
- [ ] Log errors with context for debugging

### Input Validation
- [ ] Always validate required fields
- [ ] Use Fastify schemas for simple validation
- [ ] Sanitize AI inputs with `sanitizeUserInput()`
- [ ] Set reasonable size/length limits
- [ ] Validate types before use
- [ ] Use service-based validation for complex data
- [ ] Trim string inputs
- [ ] Validate early, fail fast

### Security
- [ ] Sanitize all AI inputs
- [ ] Validate file paths and IDs
- [ ] Set input size limits
- [ ] Use parameterized queries (Cosmos DB handles this)
- [ ] Validate email/UUID formats with schemas
- [ ] Never trust client-side validation

---

## 🔗 Quick Links

- **Full Error Handling Guide:** [ERROR_HANDLING_STANDARD.md](./ERROR_HANDLING_STANDARD.md)
- **Full Validation Guide:** [INPUT_VALIDATION_STANDARD.md](./INPUT_VALIDATION_STANDARD.md)
- **Route Dependencies:** [../ROUTE_REGISTRATION_DEPENDENCIES.md](../ROUTE_REGISTRATION_DEPENDENCIES.md)
- **Error Handler Source:** `apps/api/src/middleware/error-handler.ts`
- **Sanitization Utils:** `apps/api/src/utils/input-sanitization.ts`

---

## 💡 Common Mistakes to Avoid

### ❌ Don't
- Skip validation because "it's a trusted client"
- Use `response.reason` on `ModelUnavailableResponse` (use `response.message`)
- Validate after business logic (validate early)
- Expose internal error details to clients
- Use regex for complex validation (use proper libraries)
- Forget to trim strings
- Trust client-side validation only

### ✅ Do
- Always validate server-side
- Use Fastify schemas when possible
- Sanitize AI inputs
- Provide clear error messages
- Use standard error classes
- Validate early, fail fast
- Set reasonable limits

---

**Quick Reference Version:** 1.0  
**Last Updated:** January 2025

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Quick reference guide fully documented

#### Implemented Features (✅)

- ✅ Error handling patterns
- ✅ Input validation patterns
- ✅ Security quick reference
- ✅ Common patterns and anti-patterns

#### Known Limitations

- ⚠️ **Pattern Compliance** - Not all code may follow documented patterns
  - **Recommendation:**
    1. Audit codebase for pattern compliance
    2. Refactor non-compliant code
    3. Add linting rules

- ⚠️ **Documentation Updates** - Quick reference may need updates
  - **Recommendation:**
    1. Keep quick reference up to date
    2. Add new patterns as they emerge
    3. Document edge cases

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Error Handling Standard](./ERROR_HANDLING_STANDARD.md) - Full error handling guide
- [Input Validation Standard](./INPUT_VALIDATION_STANDARD.md) - Full validation guide


