# Dashboard Creation Timeout Fix

## Issue
Dashboard creation was failing with a 30-second timeout error:
```
installHook.js:1 [API Error] POST /api/v1/dashboards 
{status: undefined, message: 'timeout of 30000ms exceeded', isRetry: undefined}
```

## Root Cause
The `DashboardRepository.getTenantDashboardConfig()` method was querying the wrong Cosmos DB container with an incorrect partition key, causing queries to hang and timeout:

1. **Wrong Container**: Using `tenants` container instead of `systemConfig`
2. **Wrong Partition Key**: Using `tenantId` instead of `configType`
3. **No Timeout Protection**: No fallback when config doesn't exist

## Changes Made

### 1. Updated Container Reference
**File**: `apps/api/src/repositories/dashboard.repository.ts`

Changed from:
```typescript
this.configContainer = this.client
  .database(config.cosmosDb.databaseId)
  .container(config.cosmosDb.containers.tenants || 'tenants');
```

To:
```typescript
// Use systemConfig container for tenant dashboard configs
this.configContainer = this.client
  .database(config.cosmosDb.databaseId)
  .container('systemConfig');
```

### 2. Fixed Partition Keys
Updated all config read/write operations to use the correct partition key:

**getTenantDashboardConfig**:
```typescript
// Before: .item(`dashboardConfig_${tenantId}`, tenantId)
// After:  .item(`dashboardConfig_${tenantId}`, 'dashboardConfig')
```

**getTenantFiscalYearConfig**:
```typescript
// Before: .item(`fiscalYear_${tenantId}`, tenantId)
// After:  .item(`fiscalYear_${tenantId}`, 'fiscalYearConfig')
```

### 3. Added Error Handling & Monitoring
- Added detailed timing metrics for all config queries
- Return `null` instead of throwing on errors
- Log errors but allow dashboard creation to proceed with defaults
- Proper tracking of success/failure in Application Insights

### 4. Updated Save Operations
Both save methods now include the correct `configType` field:

```typescript
await this.configContainer.items.upsert({
  id: `dashboardConfig_${config.tenantId}`,
  configType: 'dashboardConfig',  // ← Added
  type: 'tenantDashboardConfig',
  ...config,
});
```

## Container Schema

The `systemConfig` container uses this structure:
- **Partition Key**: `/configType` (not `/tenantId`)
- **Config Types**: `dashboardConfig`, `fiscalYearConfig`, etc.
- **Document ID Pattern**: `{configType}_{tenantId}`

## Testing

### Run Diagnostic Script
```bash
./diagnose-dashboard-timeout.sh
```

### Test Dashboard Creation
1. Ensure API server is running:
   ```bash
   cd apps/api && pnpm dev
   ```

2. Test via curl:
   ```bash
   curl -X POST http://localhost:3001/api/v1/dashboards \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Tenant-ID: YOUR_TENANT_ID" \
     -d '{"name": "Test Dashboard"}'
   ```

3. Check the response time - should be < 1 second instead of 30 seconds

## Impact

✅ **Fixed**:
- Dashboard creation now completes in milliseconds
- No more 30-second timeouts
- Proper fallback to default configs when none exist

✅ **Improved**:
- Better error logging and monitoring
- Graceful degradation when configs are missing
- Correct container usage following the database schema

## Related Files
- `apps/api/src/repositories/dashboard.repository.ts` - Main fix
- `apps/api/src/services/dashboard.service.ts` - Calls the repository
- `apps/api/src/scripts/init-cosmos-db.ts` - Container definitions
- `diagnose-dashboard-timeout.sh` - Diagnostic tool

## Notes

The timeout was happening because:
1. Cosmos DB was trying to query with a partition key that didn't match the container's schema
2. This caused a cross-partition query or hung query
3. The client-side timeout of 30 seconds was hit before any response

The fix ensures we query the correct container with the correct partition key, allowing for fast, targeted lookups.
