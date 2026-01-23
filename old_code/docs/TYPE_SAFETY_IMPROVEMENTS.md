# Type Safety Improvements

**Date:** January 2025  
**Status:** In Progress  
**Type:** Technical Debt Reduction

---

## Overview

This document tracks type safety improvements made to the Castiel platform codebase. The goal is to eliminate `any` types, `@ts-nocheck`, and `@ts-ignore` directives to improve type safety, developer experience, and catch errors at compile time.

---

## Current State

### Statistics
- **Files with `@ts-nocheck` or `@ts-ignore`:** 138 files
- **Route files with `any` types:** 15 files
- **Priority:** Medium (MEDIUM-1)

### Impact
- **Developer Experience:** Reduced autocomplete and type checking
- **Runtime Errors:** Type errors only discovered at runtime
- **Maintainability:** Harder to refactor safely

---

## Completed Improvements

### ✅ risk-analysis.routes.ts

**Changes Made:**
1. **Replaced `queueService?: any`** with `queueService?: QueueService`
   - Imported `QueueService` type from service file
   - Improved type safety for queue service usage

2. **Replaced `Body: any` with proper types:**
   - `Body: UpdateRiskInput` for update risk endpoint
   - `Body: CreateRiskInput` for create risk endpoint
   - `Body?: RiskEvaluationOptions` for risk evaluation endpoint

3. **Created `RiskEvaluationOptions` interface:**
   - Properly typed request body for risk evaluation
   - Includes: `queueAsync`, `includeHistorical`, `includeAI`, `includeSemanticDiscovery`, `forceRefresh`

4. **Removed `as any` casts:**
   - Replaced `request.body as any` with typed request bodies
   - Replaced `(request.body as any)?.catalogType` with `request.body.catalogType`

**Files Modified:**
- `apps/api/src/routes/risk-analysis.routes.ts`

**Benefits:**
- ✅ Type-safe API contracts
- ✅ Better IDE autocomplete
- ✅ Compile-time error detection
- ✅ Improved maintainability

---

## Remaining Work

### High Priority (Route Files - API Contracts)

These files define API contracts and should be prioritized:

1. **sync-task.routes.ts** - Check for `any` types in request bodies
2. **document.routes.ts** - Check for `any` types
3. **admin/tenant-project-config.routes.ts** - Check for `any` types
4. **adaptive-learning.routes.ts** - Check for `any` types
5. **redaction.routes.ts** - Check for `any` types
6. **teams.routes.ts** - Check for `any` types
7. **websocket.routes.ts** - Check for `any` types
8. **web-search.routes.ts** - Check for `any` types
9. **webhooks.routes.ts** - Check for `any` types
10. **templates.routes.ts** - Check for `any` types
11. **role-management.routes.ts** - Check for `any` types
12. **project-resolver.routes.ts** - Check for `any` types
13. **prompt-ab-test.routes.ts** - Check for `any` types

### Medium Priority (Service Files)

Service files with `@ts-nocheck` that should be addressed:

1. **queue.service.ts** - Has `@ts-nocheck` due to queue package type mismatches
2. **ai-tool-executor.service.ts** - Check for `any` types
3. **ai-insights/cosmos.service.ts** - Check for `any` types
4. **ai/ai-connection.service.ts** - Check for `any` types
5. **project-activity.service.ts** - Check for `any` types
6. **performance-monitoring.service.ts** - Check for `any` types

### Low Priority (Scripts and Utilities)

Scripts and utility files can be addressed incrementally:

- Various script files in `apps/api/src/scripts/`
- Seed files in `apps/api/src/seed/`
- Adapter files

---

## Best Practices

### When Fixing Type Issues

1. **Start with API contracts (route files):**
   - These define the public API
   - Type errors here affect all consumers
   - Highest impact on developer experience

2. **Create proper type definitions:**
   - Use existing types from `types/` directory
   - Create new interfaces when needed
   - Avoid `any` as a shortcut

3. **Handle optional properties correctly:**
   - Use `?` for optional properties
   - Use `| undefined` when needed
   - Provide default values when appropriate

4. **Type Fastify request/response:**
   - Use `FastifyRequest<{ Params: {...}, Body: {...}, Querystring: {...} }>`
   - Use `FastifyReply` for responses
   - Avoid `as any` casts

5. **Handle dynamic properties:**
   - For Fastify decorators: `(server as any).property` is acceptable
   - Document why it's needed
   - Consider creating proper type definitions

### Common Patterns

#### Before (Bad)
```typescript
async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as any;
  const data = body.data;
}
```

#### After (Good)
```typescript
interface RequestBody {
  data: string;
}

async (request: FastifyRequest<{ Body: RequestBody }>, reply: FastifyReply) => {
  const body = request.body;
  const data = body.data; // Type-safe!
}
```

---

## Tools and Commands

### Find Type Issues

```bash
# Find files with @ts-nocheck or @ts-ignore
grep -r "@ts-nocheck\|@ts-ignore" apps/api/src

# Find files with 'any' types in routes
grep -r ": any\|as any" apps/api/src/routes

# Count type issues
grep -r "@ts-nocheck\|@ts-ignore" apps/api/src | wc -l
```

### Type Checking

```bash
# Run TypeScript compiler to check types
pnpm --filter @castiel/api type-check

# Or use tsc directly
cd apps/api && npx tsc --noEmit
```

---

## Progress Tracking

### Completed
- ✅ `risk-analysis.routes.ts` - All `any` types replaced with proper types

### In Progress
- 🔄 Route files type safety improvements

### Planned
- ⏳ Service files type safety improvements
- ⏳ Script files type safety improvements

---

## Notes

### Acceptable Uses of `any`

Some uses of `any` are acceptable:

1. **Third-party library types:**
   - When library types are incomplete or incorrect
   - Document why `any` is used
   - Consider creating wrapper types

2. **Dynamic properties (Fastify decorators):**
   - `(server as any).property` for Fastify decorators
   - Consider creating proper type definitions

3. **Migration period:**
   - Temporary `any` during refactoring
   - Must be replaced before merge

### Files with `@ts-nocheck`

Files with `@ts-nocheck` typically have:
- Complex type issues that need refactoring
- Third-party library type mismatches
- Legacy code that needs gradual migration

These should be addressed incrementally, starting with the most critical files.

---

**Last Updated:** January 2025  
**Next Review:** When significant progress is made
