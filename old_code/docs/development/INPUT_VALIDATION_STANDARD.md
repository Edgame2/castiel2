# Input Validation Standard

## Overview

This document defines the standard input validation patterns for all controllers in the Castiel API. Consistent input validation ensures:
- Security against injection attacks (XSS, prompt injection, SQL injection)
- Data integrity and type safety
- Predictable API behavior
- Better error messages for clients
- Compliance with security best practices

## Table of Contents

1. [Validation Utilities](#validation-utilities)
2. [Validation Patterns](#validation-patterns)
3. [Common Validation Scenarios](#common-validation-scenarios)
4. [Security Considerations](#security-considerations)
5. [Error Handling](#error-handling)
6. [Migration Guide](#migration-guide)

---

## Validation Utilities

### 1. Input Sanitization (`utils/input-sanitization.ts`)

**Purpose:** Prevent prompt injection attacks and sanitize user input for AI interactions.

**Functions:**
- `sanitizeUserInput(input: string): string` - Sanitizes text input for AI prompts
- `sanitizeContextData(data: Record<string, any>): Record<string, any>` - Sanitizes context data
- `detectCredentials(text: string): boolean` - Detects potential credential leakage

**When to Use:**
- User-provided text that will be sent to AI models
- Prompts, queries, or user-generated content
- Context data that will be included in AI requests

**Example:**
```typescript
import { sanitizeUserInput } from '../utils/input-sanitization.js';

const prompt = request.body.prompt;
const sanitizedPrompt = sanitizeUserInput(prompt.trim());
```

---

### 2. Field Validation Service (`services/field-validation.service.ts`)

**Purpose:** Schema-based validation for structured data (shards, forms, etc.).

**When to Use:**
- Validating shard structured data against ShardType schemas
- Form data validation
- Complex nested object validation

**Example:**
```typescript
const result = await this.fieldValidationService.validateRichSchema(
  structuredData,
  schema,
  context
);

if (!result.valid) {
  throw new ValidationError('Validation failed', result.errors);
}
```

---

### 3. Shard Validation Service (`services/shard-validation.service.ts`)

**Purpose:** High-level validation for shard data, including schema validation and business rules.

**When to Use:**
- Validating complete shard data before creation/update
- Validating against ShardType requirements
- Business rule validation

**Example:**
```typescript
const result = await this.shardValidationService.validateShardData(
  structuredData,
  shardTypeId,
  tenantId,
  { mode: 'strict', isCreate: true }
);

if (!result.valid) {
  throw new ValidationError('Shard validation failed', result.errors);
}
```

---

### 4. Fastify Schema Validation

**Purpose:** Request-level validation using JSON Schema (Fastify built-in).

**When to Use:**
- Simple request body/query/params validation
- Type checking and basic constraints
- API contract enforcement

**Example:**
```typescript
const schema = {
  body: {
    type: 'object',
    required: ['query'],
    properties: {
      query: { type: 'string', minLength: 1, maxLength: 1000 },
      topK: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
};

server.post('/api/v1/search', { schema }, controller.search);
```

---

## Validation Patterns

### Pattern 1: Manual Validation (Simple Cases)

**Use when:** Simple validation that doesn't require schema validation.

```typescript
async createResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { name, description } = request.body as { name?: string; description?: string };

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new AppError('Name is required and must be a non-empty string', 400);
  }

  // Validate length constraints
  if (name.length > 100) {
    throw new AppError('Name must be 100 characters or less', 400);
  }

  // Validate optional fields if provided
  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw new AppError('Description must be a string', 400);
    }
    if (description.length > 1000) {
      throw new AppError('Description must be 1000 characters or less', 400);
    }
  }

  // Continue with business logic...
}
```

**Benefits:**
- Simple and readable
- No external dependencies
- Fast execution

**Limitations:**
- Doesn't scale well for complex validation
- Duplication across controllers
- No automatic type checking

---

### Pattern 2: Fastify Schema Validation (Recommended for Simple APIs)

**Use when:** Standard REST endpoints with well-defined request shapes.

```typescript
// Define schema
const createResourceSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z0-9\\s-]+$', // Alphanumeric, spaces, hyphens
      },
      description: {
        type: 'string',
        maxLength: 1000,
      },
      tags: {
        type: 'array',
        items: { type: 'string', maxLength: 50 },
        maxItems: 10,
      },
    },
  },
};

// Register route with schema
server.post('/api/v1/resources', { schema: createResourceSchema }, controller.create);

// Controller (validation already done by Fastify)
async createResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { name, description, tags } = request.body as {
    name: string;
    description?: string;
    tags?: string[];
  };

  // No validation needed - Fastify already validated
  // Continue with business logic...
}
```

**Benefits:**
- Automatic validation before controller execution
- Type-safe request bodies
- Consistent error responses
- No code duplication

**Limitations:**
- Less flexible for complex business rules
- Requires schema definition upfront

---

### Pattern 3: Service-Based Validation (Complex Data)

**Use when:** Validating complex structured data (shards, forms, nested objects).

```typescript
async createShard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { shardTypeId, structuredData } = request.body as {
    shardTypeId: string;
    structuredData: Record<string, unknown>;
  };

  // Basic validation
  if (!shardTypeId) {
    throw new AppError('shardTypeId is required', 400);
  }

  // Use service for complex validation
  const validationResult = await this.shardValidationService.validateShardData(
    structuredData,
    shardTypeId,
    tenantId,
    { mode: 'strict', isCreate: true }
  );

  if (!validationResult.valid) {
    throw new ValidationError('Shard validation failed', validationResult.errors);
  }

  // Continue with creation...
}
```

**Benefits:**
- Handles complex validation logic
- Reusable across controllers
- Supports multiple schema formats
- Business rule validation

---

### Pattern 4: Sanitization + Validation (AI Interactions)

**Use when:** User input that will be sent to AI models or external services.

```typescript
async generateContent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { prompt, variables } = request.body as {
    prompt: string;
    variables?: Record<string, string>;
  };

  // 1. Basic validation
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new AppError('Prompt is required and must be a non-empty string', 400);
  }

  // 2. Length validation (prevent token exhaustion)
  if (prompt.length > 10000) {
    throw new AppError('Prompt exceeds maximum length of 10000 characters', 400);
  }

  // 3. Sanitize to prevent injection attacks
  const { sanitizeUserInput } = await import('../utils/input-sanitization.js');
  const sanitizedPrompt = sanitizeUserInput(prompt.trim());

  // 4. Sanitize variables if provided
  let sanitizedVariables: Record<string, string> | undefined;
  if (variables) {
    sanitizedVariables = {};
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        sanitizedVariables[key] = sanitizeUserInput(value);
      }
    }
  }

  // Continue with generation using sanitized input...
}
```

**Benefits:**
- Prevents prompt injection attacks
- Protects against token exhaustion
- Safe for AI model interactions

---

## Common Validation Scenarios

### 1. Required Fields

```typescript
// Pattern 1: Manual check
if (!field || typeof field !== 'string' || field.trim().length === 0) {
  throw new AppError('Field is required', 400);
}

// Pattern 2: Fastify schema
{
  type: 'object',
  required: ['field'],
  properties: {
    field: { type: 'string', minLength: 1 },
  },
}
```

### 2. String Length Constraints

```typescript
// Pattern 1: Manual check
if (name.length > 100) {
  throw new AppError('Name must be 100 characters or less', 400);
}

// Pattern 2: Fastify schema
{
  type: 'string',
  minLength: 1,
  maxLength: 100,
}
```

### 3. Numeric Ranges

```typescript
// Pattern 1: Manual check
if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
  throw new AppError('Temperature must be between 0 and 2', 400);
}

// Pattern 2: Fastify schema
{
  type: 'number',
  minimum: 0,
  maximum: 2,
}
```

### 4. Enum Values

```typescript
// Pattern 1: Manual check
const validStatuses = ['active', 'inactive', 'pending'];
if (status && !validStatuses.includes(status)) {
  throw new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
}

// Pattern 2: Fastify schema
{
  type: 'string',
  enum: ['active', 'inactive', 'pending'],
}
```

### 5. Array Constraints

```typescript
// Pattern 1: Manual check
if (tags && (!Array.isArray(tags) || tags.length > 10)) {
  throw new AppError('Tags must be an array with at most 10 items', 400);
}

// Pattern 2: Fastify schema
{
  type: 'array',
  items: { type: 'string' },
  maxItems: 10,
}
```

### 6. Email Validation

```typescript
// Pattern 1: Manual check
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw new AppError('Invalid email format', 400);
}

// Pattern 2: Fastify schema
{
  type: 'string',
  format: 'email',
}
```

### 7. UUID Validation

```typescript
// Pattern 1: Manual check
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(id)) {
  throw new AppError('Invalid UUID format', 400);
}

// Pattern 2: Fastify schema
{
  type: 'string',
  format: 'uuid',
}
```

### 8. Date/DateTime Validation

```typescript
// Pattern 1: Manual check
const date = new Date(dateString);
if (isNaN(date.getTime())) {
  throw new AppError('Invalid date format', 400);
}

// Pattern 2: Fastify schema
{
  type: 'string',
  format: 'date-time',
}
```

---

## Security Considerations

### 1. Prompt Injection Prevention

**Always sanitize user input before sending to AI models:**

```typescript
import { sanitizeUserInput } from '../utils/input-sanitization.js';

const sanitizedPrompt = sanitizeUserInput(userPrompt);
```

**What it prevents:**
- Code block injections
- System message injections
- Instruction overrides
- Token exhaustion attacks

### 2. XSS Prevention

**For HTML content, use proper sanitization:**

```typescript
// If accepting HTML content, use a library like DOMPurify
import DOMPurify from 'isomorphic-dompurify';

const sanitizedHtml = DOMPurify.sanitize(htmlContent);
```

### 3. SQL Injection Prevention

**Use parameterized queries (Cosmos DB handles this automatically):**

```typescript
// ✅ Good - Cosmos DB parameterized query
const querySpec = {
  query: 'SELECT * FROM c WHERE c.tenantId = @tenantId',
  parameters: [{ name: '@tenantId', value: tenantId }],
};

// ❌ Bad - Never do this (Cosmos DB doesn't support string interpolation anyway)
// const query = `SELECT * FROM c WHERE c.tenantId = '${tenantId}'`;
```

### 4. Path Traversal Prevention

**Validate file paths and IDs:**

```typescript
// Validate that ID doesn't contain path traversal characters
if (id.includes('..') || id.includes('/') || id.includes('\\')) {
  throw new AppError('Invalid ID format', 400);
}

// Use UUID validation for IDs
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(id)) {
  throw new AppError('Invalid ID format', 400);
}
```

### 5. Rate Limiting

**Use Fastify rate limiting for endpoints that accept user input:**

```typescript
import rateLimit from '@fastify/rate-limit';

await server.register(rateLimit, {
  max: 100, // Maximum 100 requests
  timeWindow: '1 minute',
});
```

### 6. Input Size Limits

**Always validate input size to prevent DoS attacks:**

```typescript
// For text input
if (prompt.length > 10000) {
  throw new AppError('Input exceeds maximum length', 400);
}

// For file uploads (configure in Fastify)
await server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
```

---

## Error Handling

### Standard Error Responses

**Use consistent error classes from `middleware/error-handler.ts`:**

```typescript
import { AppError, ValidationError, NotFoundError } from '../middleware/error-handler.js';

// For validation errors
if (!name) {
  throw new AppError('Name is required', 400);
}

// For complex validation errors
if (!validationResult.valid) {
  throw new ValidationError('Validation failed', validationResult.errors);
}

// For not found errors
if (!resource) {
  throw new NotFoundError('Resource not found');
}
```

### Error Response Format

**All validation errors should follow this format:**

```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "name",
      "message": "Name is required",
      "code": "REQUIRED"
    }
  ]
}
```

---

## Migration Guide

### Step 1: Identify Validation Gaps

1. Review controller methods
2. Identify missing validation
3. Prioritize security-critical endpoints (AI interactions, file uploads, etc.)

### Step 2: Choose Validation Pattern

- **Simple endpoints:** Use Fastify schema validation
- **Complex data:** Use service-based validation
- **AI interactions:** Use sanitization + validation
- **Legacy code:** Add manual validation incrementally

### Step 3: Implement Validation

1. Add validation to controller method
2. Use appropriate error classes
3. Test with invalid input
4. Update API documentation

### Step 4: Monitor and Iterate

1. Monitor validation error rates
2. Adjust validation rules based on feedback
3. Document edge cases

---

## Best Practices

### ✅ Do

- **Always validate required fields** - Never trust client input
- **Use type checking** - Validate types before use
- **Sanitize AI inputs** - Always use `sanitizeUserInput()` for AI prompts
- **Set reasonable limits** - Prevent DoS attacks with size/length limits
- **Use Fastify schemas** - For simple, standard validation
- **Validate at controller level** - Don't rely on service-level validation only
- **Provide clear error messages** - Help clients fix their requests

### ❌ Don't

- **Don't skip validation** - Even for "trusted" clients
- **Don't trust client-side validation** - Always validate server-side
- **Don't expose internal errors** - Return user-friendly messages
- **Don't validate in multiple places** - Choose one validation point
- **Don't use regex for complex validation** - Use proper validation libraries
- **Don't forget to trim strings** - Always trim user input
- **Don't validate after business logic** - Validate early, fail fast

---

## Examples

### Example 1: Simple Endpoint with Fastify Schema

```typescript
// Route definition
const createUserSchema = {
  body: {
    type: 'object',
    required: ['email', 'name'],
    properties: {
      email: { type: 'string', format: 'email' },
      name: { type: 'string', minLength: 1, maxLength: 100 },
      role: { type: 'string', enum: ['user', 'admin'] },
    },
  },
};

server.post('/api/v1/users', { schema: createUserSchema }, controller.createUser);

// Controller
async createUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { email, name, role } = request.body as {
    email: string;
    name: string;
    role?: 'user' | 'admin';
  };

  // No validation needed - Fastify already validated
  const user = await this.userService.create({ email, name, role: role || 'user' });
  reply.status(201).send(user);
}
```

### Example 2: AI Endpoint with Sanitization

```typescript
async generateInsight(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { query, context } = request.body as {
    query: string;
    context?: Record<string, any>;
  };

  // 1. Basic validation
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new AppError('Query is required', 400);
  }

  if (query.length > 5000) {
    throw new AppError('Query exceeds maximum length of 5000 characters', 400);
  }

  // 2. Sanitize
  const { sanitizeUserInput, sanitizeContextData } = await import('../utils/input-sanitization.js');
  const sanitizedQuery = sanitizeUserInput(query.trim());
  const sanitizedContext = context ? sanitizeContextData(context) : undefined;

  // 3. Generate insight
  const insight = await this.insightService.generate(sanitizedQuery, sanitizedContext);
  reply.status(200).send(insight);
}
```

### Example 3: Complex Data with Service Validation

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
  const validationResult = await this.shardValidationService.validateShardData(
    structuredData,
    shardTypeId,
    tenantId,
    { mode: 'strict', isCreate: true }
  );

  if (!validationResult.valid) {
    throw new ValidationError('Shard validation failed', validationResult.errors);
  }

  // 3. Create shard
  const shard = await this.shardService.create({ shardTypeId, structuredData });
  reply.status(201).send(shard);
}
```

---

## Related Documentation

- [Error Handling Standard](./ERROR_HANDLING_STANDARD.md) - Standard error handling patterns
- [Security Guidelines](../security/SECURITY.md) - Security best practices
- [API Documentation](../api/API.md) - API endpoint documentation

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Standard Defined** - Input validation standard documented and implemented

#### Implemented Features (✅)

- ✅ Input sanitization utilities
- ✅ Field validation service
- ✅ Shard validation service
- ✅ Fastify schema validation
- ✅ Validation patterns documented
- ✅ Security considerations documented

#### Known Gaps

- ⚠️ **Inconsistent Validation** - Some endpoints may not follow the standard consistently
  - **Code References:**
    - Various route files may need validation review
    - Some services may have custom validation logic
  - **Recommendation:**
    1. Audit all endpoints for validation compliance
    2. Refactor endpoints to use standard patterns
    3. Add linting rules to enforce standards

- ⚠️ **Missing Validation in Some Paths** - Some code paths may lack proper validation
  - **Code References:**
    - AI input may not be fully sanitized in all paths
    - Some service methods may accept unvalidated input
  - **Recommendation:**
    1. Add comprehensive validation review
    2. Ensure all input paths are validated
    3. Add validation tests

- ⚠️ **Prompt Injection Defense** - Prompt injection defense service exists but may not be used consistently
  - **Code References:**
    - `apps/api/src/services/prompt-injection-defense.service.ts` - Service exists
    - May not be integrated in all AI interaction paths
  - **Recommendation:**
    1. Ensure prompt injection defense is used in all AI interactions
    2. Add validation tests for prompt injection
    3. Document integration points

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Error Handling Standard](./ERROR_HANDLING_STANDARD.md) - Error handling patterns
- [Quick Reference](./QUICK_REFERENCE.md) - Quick lookup guide

---

**Last Updated:** January 2025  
**Version:** 1.0


