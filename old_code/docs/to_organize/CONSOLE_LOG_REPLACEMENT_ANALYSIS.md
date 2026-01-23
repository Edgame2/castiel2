# Console.log Replacement Analysis

**Date:** 2025-01-XX  
**Status:** Analysis Complete - Ready for Implementation

---

## Executive Summary

This document analyzes all `console.log`, `console.error`, `console.warn`, `console.info`, and `console.debug` statements in the codebase and provides a plan for replacing them with structured logging.

---

## Current State

### Backend (API)

**Total Console Statements:** 725
- **Production Code:** ~150-200 (estimated, excluding scripts)
- **Scripts:** ~500-550 (acceptable - not production code)
- **Utils/Logger:** 4 (needs refactoring)

**Files with Console Statements (Production Code):**
- `apps/api/src/index.ts` - Server initialization logging
- `apps/api/src/routes/index.ts` - Route registration logging
- `apps/api/src/services/*.ts` - Various services
- `apps/api/src/utils/logger.ts` - Logger utility (uses console internally)

**Existing Structured Logging Infrastructure:**
- Fastify built-in logger: `request.log.info()`, `request.log.error()`, `server.log.info()`
- Monitoring service: `IMonitoringProvider` with `trackException()`, `trackEvent()`
- Request logger middleware: `apps/api/src/middleware/logger.ts`

### Frontend (Web)

**Total Console Statements:** 444
- **Production Code:** ~300-350 (needs replacement)
- **Development/Debug:** ~50-100 (acceptable in development mode)
- **Analytics/Intentional:** ~50-100 (may need review)

**Files with Console Statements:**
- `apps/web/src/lib/api/client.ts` - API client logging
- `apps/web/src/lib/realtime/*.ts` - WebSocket/SSE logging
- `apps/web/src/components/*.tsx` - Component debugging
- `apps/web/src/hooks/*.ts` - Hook debugging

**Existing Structured Logging Infrastructure:**
- Application Insights: `trackEvent()`, `trackException()`, `trackTrace()`
- Monitoring utilities: `apps/web/src/lib/monitoring/app-insights.ts`

---

## Categorization

### Category 1: Scripts (Keep as-is)
**Location:** `apps/api/src/scripts/*.ts`
**Count:** ~500-550 statements
**Action:** No change required - scripts are not production code

**Examples:**
- `apps/api/src/scripts/seed-core-types.ts`
- `apps/api/src/scripts/init-cosmos-db.ts`
- `apps/api/src/scripts/validate-env.ts`

### Category 2: Logger Utility (Refactor)
**Location:** `apps/api/src/utils/logger.ts`
**Count:** 4 statements
**Action:** Refactor to use Fastify logger or monitoring service

**Current Implementation:**
```typescript
export class Logger {
    debug(message: string, meta?: unknown) {
        console.debug(this.format('DEBUG', message, meta));
    }
    // ... other methods use console
}
```

**Required Change:** Replace console calls with structured logging

### Category 3: Production Code - Backend (Replace)
**Location:** `apps/api/src/**/*.ts` (excluding scripts)
**Count:** ~150-200 statements
**Action:** Replace with `request.log` or `server.log`

**Pattern to Replace:**
```typescript
// Before
console.log('Message', data);
console.error('Error', error);
console.warn('Warning', data);

// After
request.log.info({ data }, 'Message');
request.log.error({ err: error }, 'Error');
request.log.warn({ data }, 'Warning');
```

### Category 4: Production Code - Frontend (Replace)
**Location:** `apps/web/src/**/*.{ts,tsx}`
**Count:** ~300-350 statements
**Action:** Replace with Application Insights or conditional logging

**Pattern to Replace:**
```typescript
// Before
console.log('Message', data);
console.error('Error', error);

// After
if (process.env.NODE_ENV === 'development') {
  console.log('Message', data); // Keep for dev
}
trackTrace('Message', 1, { data }); // Production logging
trackException(error, 2); // Error tracking
```

### Category 5: Development-Only Logging (Conditional)
**Location:** Various files
**Count:** ~50-100 statements
**Action:** Wrap in `if (process.env.NODE_ENV === 'development')`

**Pattern:**
```typescript
// Before
console.log('[Debug]', data);

// After
if (process.env.NODE_ENV === 'development') {
  console.log('[Debug]', data);
}
```

### Category 6: Analytics/Intentional (Review)
**Location:** `apps/web/src/lib/analytics.ts`, etc.
**Count:** ~50-100 statements
**Action:** Review - may be intentional for analytics

---

## Implementation Plan

### Phase 1: Backend Logger Utility Refactoring
**Priority:** High
**Effort:** 1-2 hours

1. Refactor `apps/api/src/utils/logger.ts` to use Fastify logger
2. Update all usages of `Logger` class
3. Remove console dependencies

### Phase 2: Backend Production Code
**Priority:** High
**Effort:** 4-6 hours

1. Replace console statements in:
   - `apps/api/src/index.ts`
   - `apps/api/src/routes/index.ts`
   - `apps/api/src/services/*.ts`
   - `apps/api/src/controllers/*.ts` (if any)
   - `apps/api/src/middleware/*.ts` (if any)

2. Use patterns:
   - `request.log.info({ data }, 'Message')` for request context
   - `server.log.info({ data }, 'Message')` for server context
   - `monitoring.trackException(error, { context })` for errors

### Phase 3: Frontend Production Code
**Priority:** Medium
**Effort:** 6-8 hours

1. Replace console statements in:
   - `apps/web/src/lib/api/client.ts`
   - `apps/web/src/lib/realtime/*.ts`
   - `apps/web/src/components/*.tsx` (production code only)
   - `apps/web/src/hooks/*.ts` (production code only)

2. Use patterns:
   - `trackTrace('Message', severity, { data })` for info
   - `trackException(error, severity)` for errors
   - Conditional console.log for development

### Phase 4: Development-Only Logging
**Priority:** Low
**Effort:** 2-3 hours

1. Wrap development-only console statements in conditionals
2. Ensure production builds don't include debug logs

---

## Replacement Patterns

### Backend Pattern 1: Request Context
```typescript
// Before
console.log('Processing request', { userId, action });

// After
request.log.info({ userId, action }, 'Processing request');
```

### Backend Pattern 2: Server Context
```typescript
// Before
console.log('Server initialized');

// After
server.log.info('Server initialized');
```

### Backend Pattern 3: Errors
```typescript
// Before
console.error('Error occurred', error);

// After
request.log.error({ err: error }, 'Error occurred');
monitoring.trackException(error, { context: 'operation' });
```

### Frontend Pattern 1: Info Logging
```typescript
// Before
console.log('API Request', { method, url });

// After
if (process.env.NODE_ENV === 'development') {
  console.log('API Request', { method, url });
}
trackTrace('API Request', 1, { method, url });
```

### Frontend Pattern 2: Error Logging
```typescript
// Before
console.error('API Error', error);

// After
trackException(error, 2, { context: 'api-request' });
if (process.env.NODE_ENV === 'development') {
  console.error('API Error', error);
}
```

### Frontend Pattern 3: WebSocket/SSE
```typescript
// Before
console.log('[WebSocket] Connected');

// After
trackEvent('websocket.connected', {});
if (process.env.NODE_ENV === 'development') {
  console.log('[WebSocket] Connected');
}
```

---

## Files Requiring Immediate Attention

### High Priority (Backend)
1. `apps/api/src/utils/logger.ts` - Refactor entire class
2. `apps/api/src/index.ts` - Server initialization
3. `apps/api/src/routes/index.ts` - Route registration

### High Priority (Frontend)
1. `apps/web/src/lib/api/client.ts` - API client (42 statements)
2. `apps/web/src/lib/realtime/websocket-client.ts` - WebSocket (34 statements)
3. `apps/web/src/lib/realtime/sse-client.ts` - SSE (26 statements)

---

## Testing Strategy

1. **Unit Tests:** Verify logging calls use structured logging
2. **Integration Tests:** Verify logs appear in Application Insights
3. **Manual Testing:** Verify no console.log in production builds
4. **Performance Testing:** Verify no performance degradation

---

## Success Criteria

- [ ] All production code uses structured logging
- [ ] No console.log in production builds (except scripts)
- [ ] All errors tracked in Application Insights
- [ ] Development logging still works
- [ ] Performance metrics show no degradation

---

## Notes

- Scripts can keep console.log (they're not production code)
- Development-only logging should be conditional
- Analytics console.log may be intentional (review case-by-case)
- Frontend console.log in development is acceptable for debugging
