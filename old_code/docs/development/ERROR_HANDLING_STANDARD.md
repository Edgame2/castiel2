# Error Handling Standard

## Overview

This document defines the standard error handling patterns for all controllers in the Castiel API. Consistent error handling ensures:
- Predictable API responses
- Better error tracking and monitoring
- Easier debugging
- Improved developer experience

## Standard Error Classes

The following error classes are available in `apps/api/src/middleware/error-handler.ts`:

- `AppError` - Base error class with status code
- `ValidationError` - 400 Bad Request
- `UnauthorizedError` - 401 Unauthorized
- `ForbiddenError` - 403 Forbidden
- `NotFoundError` - 404 Not Found

## Error Handling Patterns

### Pattern 1: Throw Errors (Recommended for Simple Cases)

**Use when:** The error can be handled by Fastify's global error handler.

```typescript
import { AppError, NotFoundError } from '../middleware/error-handler.js';

async getResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id } = request.params as { id: string };
  
  if (!id) {
    throw new AppError('Resource ID is required', 400);
  }
  
  const resource = await this.service.getResource(id);
  
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }
  
  reply.status(200).send(resource);
}
```

**Benefits:**
- Clean, readable code
- Automatic error handling by Fastify
- Consistent error response format
- Automatic monitoring tracking

### Pattern 2: Try-Catch with Re-throw (For Service Errors)

**Use when:** You need to add context or transform service errors.

```typescript
import { AppError, NotFoundError } from '../middleware/error-handler.js';

async createResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const body = request.body as CreateResourceBody;
    
    // Validation
    if (!body.name) {
      throw new AppError('Name is required', 400);
    }
    
    const resource = await this.service.createResource(body);
    reply.status(201).send(resource);
  } catch (error: unknown) {
    // Re-throw AppError instances (will be handled by Fastify error handler)
    if (error instanceof AppError) {
      throw error;
    }
    
    // Transform service errors
    if (error instanceof ServiceError) {
      throw new AppError(error.message, error.statusCode || 500);
    }
    
    // Log and re-throw unknown errors
    request.log.error({ error }, 'Unexpected error in createResource');
    throw new AppError('Failed to create resource', 500);
  }
}
```

### Pattern 3: Try-Catch with Manual Handling (For Complex Cases)

**Use when:** You need custom error response format or special handling.

```typescript
import { AppError, NotFoundError } from '../middleware/error-handler.js';

async complexOperation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Operation logic
  } catch (error: unknown) {
    request.log.error({ error }, 'Failed to perform complex operation');
    
    // Use standard error handling helper
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal server error';
    
    reply.status(statusCode).send({
      error: getErrorName(statusCode),
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error instanceof Error ? error.stack : undefined 
      }),
    });
  }
}
```

## Standard Error Response Format

All error responses should follow this format:

```typescript
{
  error: string;        // Error name (e.g., "Bad Request", "Not Found")
  message: string;      // Human-readable error message
  statusCode: number;   // HTTP status code
  validation?: any;     // Validation errors (if applicable)
  stack?: string;       // Stack trace (development only)
}
```

## Error Status Codes

| Status Code | Error Class | Use Case |
|------------|-------------|----------|
| 400 | `ValidationError` / `AppError` | Invalid input, validation failures |
| 401 | `UnauthorizedError` | Authentication required |
| 403 | `ForbiddenError` | Insufficient permissions |
| 404 | `NotFoundError` | Resource not found |
| 409 | `AppError` | Conflict (e.g., duplicate resource) |
| 422 | `AppError` | Unprocessable entity |
| 429 | `AppError` | Rate limit exceeded |
| 500 | `AppError` | Internal server error |

## Best Practices

### 1. Use Appropriate Error Classes

```typescript
// ✅ Good
if (!userId) {
  throw new AppError('User ID is required', 400);
}

if (!resource) {
  throw new NotFoundError('Resource not found');
}

// ❌ Bad
if (!userId) {
  reply.status(400).send({ error: 'User ID is required' });
  return;
}
```

### 2. Provide Clear Error Messages

```typescript
// ✅ Good
throw new AppError('Email address is required and must be valid', 400);

// ❌ Bad
throw new AppError('Invalid input', 400);
```

### 3. Let Fastify Handle Errors When Possible

```typescript
// ✅ Good - Let Fastify error handler process it
if (!resource) {
  throw new NotFoundError('Resource not found');
}

// ❌ Bad - Manual handling when not needed
if (!resource) {
  reply.status(404).send({ error: 'Not Found', message: 'Resource not found' });
  return;
}
```

### 4. Log Errors Appropriately

```typescript
// ✅ Good - Log unexpected errors
catch (error: unknown) {
  if (error instanceof AppError) {
    throw error; // Let Fastify handle known errors
  }
  request.log.error({ error }, 'Unexpected error in operation');
  throw new AppError('Operation failed', 500);
}

// ❌ Bad - Logging everything
catch (error: unknown) {
  request.log.error({ error }, 'Error'); // Too generic
  reply.status(500).send({ error: 'Error' });
}
```

### 5. Include Context in Error Messages

```typescript
// ✅ Good
throw new NotFoundError(`User with ID ${userId} not found`);

// ❌ Bad
throw new NotFoundError('User not found');
```

### 6. Handle Service Errors Consistently

```typescript
// ✅ Good
try {
  const result = await this.service.operation();
} catch (error: unknown) {
  if (error instanceof ServiceError) {
    throw new AppError(error.message, error.statusCode || 500);
  }
  throw error; // Re-throw AppError instances
}

// ❌ Bad
try {
  const result = await this.service.operation();
} catch (error: any) {
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Error',
  });
}
```

## Migration Guide

### Step 1: Identify Current Pattern

Review your controller to identify which pattern it currently uses.

### Step 2: Choose Appropriate Pattern

- **Simple validation/not found**: Use Pattern 1 (throw errors)
- **Service error transformation**: Use Pattern 2 (try-catch with re-throw)
- **Complex custom handling**: Use Pattern 3 (try-catch with manual handling)

### Step 3: Refactor Gradually

1. Replace manual error responses with error throws
2. Remove unnecessary try-catch blocks
3. Ensure all errors use standard error classes
4. Test error responses match standard format

### Example Migration

**Before:**
```typescript
async getResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { id } = request.params as { id: string };
    if (!id) {
      reply.status(400).send({ error: 'ID required' });
      return;
    }
    const resource = await this.service.getResource(id);
    if (!resource) {
      reply.status(404).send({ error: 'Not found' });
      return;
    }
    reply.status(200).send(resource);
  } catch (error: any) {
    request.log.error({ error }, 'Error');
    reply.status(500).send({ error: 'Internal error' });
  }
}
```

**After:**
```typescript
async getResource(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { id } = request.params as { id: string };
  
  if (!id) {
    throw new AppError('Resource ID is required', 400);
  }
  
  const resource = await this.service.getResource(id);
  
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }
  
  reply.status(200).send(resource);
}
```

## Error Handler Middleware

The global error handler (`apps/api/src/middleware/error-handler.ts`) automatically:
- Logs errors
- Tracks exceptions in monitoring
- Formats error responses consistently
- Includes stack traces in development
- Handles validation errors
- Provides helpful 401 error messages

## Monitoring

All errors are automatically tracked via the `IMonitoringProvider`:
- `trackException()` - For unexpected errors
- Error events include context (method, URL, status code)

## Testing Error Handling

When testing controllers, verify:
1. Correct status codes
2. Standard error response format
3. Appropriate error messages
4. Error logging (if applicable)

```typescript
it('should return 404 when resource not found', async () => {
  (mockService.getResource as any).mockResolvedValue(null);
  
  await expect(controller.getResource(mockRequest, mockReply)).rejects.toThrow(NotFoundError);
});
```

## Summary

- **Prefer throwing errors** over manual error handling
- **Use standard error classes** (AppError, NotFoundError, etc.)
- **Let Fastify error handler** process errors when possible
- **Provide clear, contextual error messages**
- **Log unexpected errors** before re-throwing
- **Follow standard error response format**

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Standard Defined** - Error handling standard documented and implemented

#### Implemented Features (✅)

- ✅ Standard error classes (AppError, ValidationError, etc.)
- ✅ Error handling patterns documented
- ✅ Fastify error handler middleware
- ✅ Standard error response format
- ✅ Error logging integration

#### Known Gaps

- ⚠️ **Inconsistent Error Handling** - Some services may not follow the standard consistently
  - **Code References:**
    - Various service files may need review
    - Some routes may have custom error handling
  - **Recommendation:**
    1. Audit all services for error handling compliance
    2. Refactor services to use standard patterns
    3. Add linting rules to enforce standards

- ⚠️ **Missing Error Handling in Some Paths** - Some code paths may lack proper error handling
  - **Code References:**
    - AI response parsing may have silent failures
    - Context assembly failures may not be properly surfaced
    - Queue processing errors may not be logged
  - **Recommendation:**
    1. Add comprehensive error handling review
    2. Ensure all error paths are covered
    3. Add error handling tests

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Input Validation Standard](./INPUT_VALIDATION_STANDARD.md) - Input validation patterns
- [Quick Reference](./QUICK_REFERENCE.md) - Quick lookup guide


