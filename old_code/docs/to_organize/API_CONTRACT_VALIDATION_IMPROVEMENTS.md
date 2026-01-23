# API Contract Validation Improvements

## Summary

Enhanced API contract validation for conversion schema endpoints by adding proper TypeScript types and schema validation, addressing HIGH-7: Frontend-Backend API Contract Mismatches.

## Changes Made

### 1. Added Type Definitions ✅

**Location:** `apps/web/src/lib/api/integrations.ts`

Added proper TypeScript interfaces matching backend types:

```typescript
export interface ConversionSchema {
  id: string;
  tenantIntegrationId: string;
  tenantId: string;
  name: string;
  description?: string;
  source: { entity: string; provider?: string };
  target: { shardTypeId: string; shardTypeName?: string };
  fieldMappings: Array<{...}>;
  relationshipMappings?: Array<{...}>;
  preserveRelationships: boolean;
  deduplication: {...};
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionSchemaListResponse {
  schemas: ConversionSchema[];
  total: number;
  hasMore: boolean;
}
```

### 2. Replaced `any` Types with Proper Types ✅

**Before:**
```typescript
createConversionSchema: async (integrationId: string, data: any): Promise<any>
listConversionSchemas: async (...): Promise<{ schemas: any[]; ... }>
getConversionSchema: async (...): Promise<any>
updateConversionSchema: async (...): Promise<any>
testConversionSchema: async (...): Promise<any>
```

**After:**
```typescript
createConversionSchema: async (integrationId: string, data: {...}): Promise<ConversionSchema>
listConversionSchemas: async (...): Promise<ConversionSchemaListResponse>
getConversionSchema: async (...): Promise<ConversionSchema>
updateConversionSchema: async (...): Promise<ConversionSchema>
testConversionSchema: async (...): Promise<{ success: boolean; ... }>
```

### 3. Added Schema Validation ✅

All conversion schema endpoints now use `createEndpointValidator` with proper schemas:

**Example (createConversionSchema):**
```typescript
const validator = createEndpointValidator<ConversionSchema>(endpoint, 'object', {
  schema: {
    type: 'object',
    required: ['id', 'tenantIntegrationId', 'tenantId', 'name', 'source', 'target', 'fieldMappings', 'deduplication', 'isActive', 'createdBy', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', required: true },
      tenantIntegrationId: { type: 'string', required: true },
      // ... other properties
    },
  },
});

const response = await apiClient.post<ConversionSchema>(endpoint, data);
validator(response.data, 'POST');
```

### 4. Enhanced Input Type Safety ✅

All methods now have properly typed input parameters:

- **createConversionSchema**: Full input type with all required fields
- **updateConversionSchema**: Partial type for updates
- **testConversionSchema**: Proper sample data and result types

## Benefits

1. **Type Safety**: Compile-time checking prevents type mismatches
2. **Runtime Validation**: Schema validation catches contract violations in development
3. **Better Developer Experience**: IntelliSense and autocomplete work correctly
4. **Early Error Detection**: Mismatches are caught during development, not production
5. **Documentation**: Types serve as inline documentation

## Validation Behavior

- **Development Mode**: Validation is enabled by default
- **Production Mode**: Can be enabled via `NEXT_PUBLIC_ENABLE_API_VALIDATION=true`
- **Non-Blocking**: Validation errors are logged but don't break the application
- **Detailed Errors**: Validation provides specific field-level error messages

## Verification

- ✅ All `any` types replaced with proper types
- ✅ Schema validation added to all endpoints
- ✅ Types match backend definitions
- ✅ Input types properly defined
- ✅ No breaking changes to existing code

## Remaining Opportunities

The following API endpoints could benefit from similar improvements:

1. **Integration endpoints**: Add validation for integration CRUD operations
2. **Shard endpoints**: Add validation for shard operations
3. **Risk evaluation endpoints**: Add validation for risk evaluation responses
4. **AI context endpoints**: Add validation for context assembly responses

These can be addressed incrementally as part of ongoing quality improvements.

---

**Last Updated:** 2025-01-28
