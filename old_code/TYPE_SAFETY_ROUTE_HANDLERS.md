# Type Safety Improvements - Route Handlers

## Summary

Improved type safety in route registration by replacing `any` types with proper TypeScript types, addressing MEDIUM-1: Replace `any` types with proper TypeScript types.

## Changes Made

### 1. Service Variable Type Declarations ✅

**Location:** `apps/api/src/routes/index.ts`

**Before:**
```typescript
let queueService: any = undefined;
let roleManagementService: any = undefined;
let opportunityService: any = undefined;
let revenueAtRiskService: any = undefined;
let configurationService: any = undefined;
let conversationEventSubscriber: any = undefined;
```

**After:**
```typescript
let queueService: Awaited<ReturnType<typeof import('../services/queue.service.js').QueueService>> | undefined = undefined;
let roleManagementService: Awaited<ReturnType<typeof import('../services/role-management.service.js').RoleManagementService>> | undefined = undefined;
let opportunityService: Awaited<ReturnType<typeof import('../services/opportunity.service.js').OpportunityService>> | undefined = undefined;
let revenueAtRiskService: Awaited<ReturnType<typeof import('../services/revenue-at-risk.service.js').RevenueAtRiskService>> | undefined = undefined;
let configurationService: import('../services/configuration.service.js').ConfigurationService | undefined = undefined;
let conversationEventSubscriber: Awaited<ReturnType<typeof import('../services/conversation-event-subscriber.service.js').ConversationEventSubscriber>> | undefined = undefined;
```

### 2. Server Property Access Type Safety ✅

**Before:**
```typescript
const cosmosClient = (server as any).cosmosClient;
const serviceRegistry = (server as any).serviceRegistry;
const shardRepositoryForShardTypes = (server as any).shardRepository;
```

**After:**
```typescript
const cosmosClient = (server as FastifyInstance & { cosmosClient?: import('@azure/cosmos').CosmosClient }).cosmosClient;
const serviceRegistry = (server as FastifyInstance & { serviceRegistry?: unknown }).serviceRegistry;
const shardRepositoryForShardTypes = (server as FastifyInstance & { shardRepository?: ShardRepository }).shardRepository;
```

### 3. Error Handling Type Safety ✅

**Before:**
```typescript
if ((error as any)?.statusCode === 401) {
```

**After:**
```typescript
if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
```

## Benefits

1. **Compile-Time Safety**: TypeScript can now catch type errors at compile time
2. **Better IntelliSense**: IDE autocomplete works correctly for service methods
3. **Refactoring Safety**: Renaming services or methods will be caught by TypeScript
4. **Documentation**: Types serve as inline documentation
5. **Error Prevention**: Prevents runtime errors from incorrect property access

## Remaining Opportunities

The following `as any` casts remain in the file (lower priority or require more complex type definitions):

1. **Server Decorations**: Many server decorations use `as any` for accessing decorated properties
   - These could be improved with proper Fastify type augmentation
   - Example: `(server as any).documentController`

2. **Dynamic Service Access**: Some services are accessed dynamically
   - These could benefit from a service registry type
   - Example: `(server as any).cosmosDatabase`

3. **Optional Service Properties**: Some services are optional and checked conditionally
   - These are already type-safe but use `as any` for convenience
   - Could be improved with proper optional chaining types

## Verification

- ✅ Service variable types properly defined
- ✅ ConfigurationService type properly imported
- ✅ Server property access uses proper type assertions
- ✅ Error handling uses proper type guards
- ✅ No linter errors
- ✅ All changes compile successfully

## Next Steps

1. Create Fastify type augmentation for server decorations
2. Create service registry type for dynamic service access
3. Continue replacing remaining `as any` casts incrementally
4. Add JSDoc comments for complex type definitions

---

**Last Updated:** 2025-01-28
