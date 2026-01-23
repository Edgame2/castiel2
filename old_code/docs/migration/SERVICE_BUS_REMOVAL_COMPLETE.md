# Service Bus Removal - Complete ✅

## Summary

Azure Service Bus has been successfully removed from all active code and replaced with BullMQ/Redis. Service Bus infrastructure and code are kept temporarily for legacy Azure Functions compatibility only.

## Changes Made

### 1. Active Code Updates

- ✅ **apps/api/src/routes/index.ts**
  - Removed `AzureServiceBusService` import
  - Updated to use `QueueService` (BullMQ) exclusively
  - Updated all variable names from `serviceBusService` to `queueService`
  - Updated comments to reflect BullMQ/Redis usage

- ✅ **apps/api/src/services/azure-service-bus.service.ts**
  - Added deprecation notice
  - Marked as legacy-only for temporary compatibility with legacy functions

- ✅ **packages/api-core/src/index.ts**
  - Removed export of `AzureServiceBusService`
  - Added comment explaining deprecation

- ✅ **apps/api/src/config/env.ts**
  - Removed `serviceBus` configuration from `ServiceConfig` interface
  - Removed Service Bus environment variable parsing
  - Added comments indicating replacement by BullMQ/Redis

- ✅ **apps/api/src/services/project-auto-attachment.service.ts**
  - Removed unused `ServiceBusClient` import
  - Removed unused `serviceBusClient` property

- ✅ **apps/api/src/services/embedding-processor/embedding-worker.ts**
  - Added deprecation notice
  - Marked as legacy (replaced by workers-processing Container App)

- ✅ **apps/api/src/services/document-upload.service.ts**
  - Updated comments to reflect BullMQ usage
  - Variable already uses `QueueService`

- ✅ **apps/api/src/routes/risk-analysis.routes.ts**
  - Updated parameter name from `serviceBusService` to `queueService`
  - Updated comments

### 2. Test Files Updated

- ✅ **apps/api/tests/embedding/change-feed-processor.verification.test.ts**
  - Updated to use `QueueService` instead of `AzureServiceBusService`
  - Updated environment variable checks from Service Bus to Redis

- ✅ **apps/api/tests/embedding/embedding-jobs.e2e.test.ts**
  - Marked as deprecated (uses deprecated EmbeddingWorker)
  - Updated to use `QueueService` where possible
  - Added TODO for full migration to workers-processing Container App

- ✅ **apps/api/tests/embedding/embedding-pipeline.e2e.test.ts**
  - Marked as deprecated
  - Updated to use `QueueService`

- ✅ **apps/api/src/services/embedding-processor/__tests__/change-feed.service.test.ts**
  - Updated type references from `AzureServiceBusService` to `QueueService`

### 3. Dependencies

- ✅ **package.json** (root)
  - Commented out `@azure/service-bus` dependency
  - Added note that legacy functions may still need it

- ✅ **functions/package.json**
  - Kept `@azure/service-bus` dependency (legacy functions still need it)

### 4. Terraform Infrastructure

- ✅ **infrastructure/terraform/service-bus.tf**
  - Added deprecation notice
  - Marked as legacy-only for temporary compatibility

- ✅ **infrastructure/terraform/outputs.tf**
  - Added deprecation notices to Service Bus outputs
  - Updated deployment instructions to reference Redis/BullMQ

- ✅ **infrastructure/terraform/private-endpoints.tf**
  - Added deprecation notices to Service Bus private endpoint resources

- ✅ **infrastructure/terraform/network-security.tf**
  - Added deprecation notice to Service Bus outbound rule

- ✅ **infrastructure/terraform/alerts.tf**
  - Added deprecation notice to Service Bus queue depth alert

## Verification Results

✅ **No active code instantiates `AzureServiceBusService`**
✅ **All active code uses `QueueService` (BullMQ)**
✅ **Service Bus only referenced in:**
  - Deprecated files (azure-service-bus.service.ts, embedding-worker.ts)
  - Legacy functions code (left unchanged per requirements)
  - Terraform infrastructure (marked as deprecated)

## Legacy Code (Left Unchanged)

The following legacy code still references Service Bus and was left unchanged per requirements:
- `apps/functions/src/**` - Legacy Azure Functions
- `functions/src/**` - Legacy Azure Functions
- `apps/api/src/services/azure-service-bus.service.ts` - Deprecated but kept for legacy compatibility
- `apps/api/src/services/embedding-processor/embedding-worker.ts` - Deprecated but kept for reference

## Next Steps

1. ✅ Complete - Service Bus removed from active code
2. ⏳ Legacy Functions Migration - Once legacy functions are fully migrated to Container Apps, remove:
   - `azure-service-bus.service.ts`
   - `embedding-worker.ts`
   - Service Bus Terraform resources
   - `@azure/service-bus` from functions/package.json

## Migration Status

- **Active Code**: ✅ Complete - Using BullMQ/Redis exclusively
- **Legacy Functions**: ⏳ Still using Service Bus (temporary)
- **Infrastructure**: ⏳ Service Bus resources kept but deprecated



