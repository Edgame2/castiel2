# Functions Folder Removal Plan

> **Status**: ✅ **COMPLETE** - Functions folder has been removed  
> **Date**: 2025-01-28  
> **Completion Date**: 2025-01-28

---

## Current Situation

The `functions/` folder cannot be removed yet because it contains **shared services** that are actively imported by Container Apps workers:

### Active Dependencies

1. **Content Generation Worker** (`apps/workers-processing/src/workers/content-generation-worker.ts`)
   - Imports: `LightweightNotificationService`

2. **Document Check Worker** (`apps/workers-processing/src/workers/document-check-worker.ts`)
   - Imports: `DocumentCheckOrchestrator`
   - Imports: Types (`DocumentCheckMessage`, `SecurityCheckConfig`)

3. **Document Chunker Orchestrator Wrapper** (`apps/workers-processing/src/shared/document-chunker-orchestrator-wrapper.ts`)
   - Imports: `TextExtracterService`
   - Imports: `TextNormalizerService`
   - Imports: `ChunkingEngineService`
   - Imports: `ShardCreatorService`
   - Imports: `DocumentRelationshipUpdaterService`
   - Imports: Types (`DocumentChunkJobMessage`, `ProcessingResult`)

---

## Migration Plan

### Step 1: Move Services to Shared Package

**Target Package**: `packages/api-core` (or create `packages/processing-services`)

**Services to Move**:
- ✅ `LightweightNotificationService` → `packages/api-core/src/services/lightweight-notification.service.ts`
- ✅ `DocumentCheckOrchestrator` → `packages/api-core/src/services/document-check-orchestrator.service.ts`
- ✅ `TextExtracterService` → `packages/api-core/src/services/text-extractor.service.ts`
- ✅ `TextNormalizerService` → `packages/api-core/src/services/text-normalizer.service.ts`
- ✅ `ChunkingEngineService` → `packages/api-core/src/services/chunking-engine.service.ts`
- ✅ `ShardCreatorService` → `packages/api-core/src/services/shard-creator.service.ts`
- ✅ `DocumentRelationshipUpdaterService` → `packages/api-core/src/services/document-relationship-updater.service.ts`

**Types to Move**:
- ✅ `DocumentCheckMessage`, `SecurityCheckConfig` → `packages/api-core/src/types/document-check.types.ts`
- ✅ `DocumentChunkJobMessage`, `ProcessingResult` → `packages/api-core/src/types/document-chunking.types.ts`

### Step 2: Update Imports in Worker Applications

**Files to Update**:
1. `apps/workers-processing/src/workers/content-generation-worker.ts`
   ```typescript
   // Before:
   import { LightweightNotificationService } from '../../../functions/src/services/lightweight-notification.service.js';
   
   // After:
   import { LightweightNotificationService } from '@castiel/api-core';
   ```

2. `apps/workers-processing/src/workers/document-check-worker.ts`
   ```typescript
   // Before:
   import { DocumentCheckOrchestrator } from '../../../functions/src/services/document-check-orchestrator.service.js';
   import type { DocumentCheckMessage, SecurityCheckConfig } from '../../../functions/src/types/document-check.types.js';
   
   // After:
   import { DocumentCheckOrchestrator } from '@castiel/api-core';
   import type { DocumentCheckMessage, SecurityCheckConfig } from '@castiel/api-core';
   ```

3. `apps/workers-processing/src/shared/document-chunker-orchestrator-wrapper.ts`
   ```typescript
   // Before:
   import type { DocumentChunkJobMessage, ProcessingResult } from '../../../functions/src/types/document-chunking.types.js';
   import { TextExtracterService } from '../../../functions/src/services/text-extractor.service.js';
   import { TextNormalizerService } from '../../../functions/src/services/text-normalizer.service.js';
   import { ChunkingEngineService } from '../../../functions/src/services/chunking-engine.service.js';
   import { ShardCreatorService } from '../../../functions/src/services/shard-creator.service.js';
   import { DocumentRelationshipUpdaterService } from '../../../functions/src/services/document-relationship-updater.service.js';
   
   // After:
   import type { DocumentChunkJobMessage, ProcessingResult } from '@castiel/api-core';
   import { 
     TextExtracterService,
     TextNormalizerService,
     ChunkingEngineService,
     ShardCreatorService,
     DocumentRelationshipUpdaterService
   } from '@castiel/api-core';
   ```

### Step 3: Update Package Exports

**File**: `packages/api-core/src/index.ts`

Add exports for all moved services and types:
```typescript
// Services
export { LightweightNotificationService } from './services/lightweight-notification.service.js';
export { DocumentCheckOrchestrator } from './services/document-check-orchestrator.service.js';
export { TextExtracterService } from './services/text-extractor.service.js';
export { TextNormalizerService } from './services/text-normalizer.service.js';
export { ChunkingEngineService } from './services/chunking-engine.service.js';
export { ShardCreatorService } from './services/shard-creator.service.js';
export { DocumentRelationshipUpdaterService } from './services/document-relationship-updater.service.js';

// Types
export type { DocumentCheckMessage, SecurityCheckConfig } from './types/document-check.types.js';
export type { DocumentChunkJobMessage, ProcessingResult } from './types/document-chunking.types.js';
```

### Step 4: Verify No Other Dependencies

**Check for remaining imports**:
```bash
# Search for any remaining imports from functions folder
grep -r "from.*functions/src" apps/
grep -r "from.*\.\.\/\.\.\/functions" apps/
```

### Step 5: Remove Functions Folder

**After verification**:
1. Remove `functions/` from `pnpm-workspace.yaml`
2. Delete the `functions/` directory
3. Update documentation to remove references to functions folder
4. Update `.gitignore` if needed

---

## Checklist

### Pre-Migration
- [ ] Identify all services and types used by Container Apps workers
- [ ] Verify no other code depends on functions folder
- [ ] Review service dependencies (what do these services depend on?)

### Migration
- [ ] Move services to `packages/api-core`
- [ ] Move types to `packages/api-core`
- [ ] Update package exports
- [ ] Update imports in worker applications
- [ ] Verify TypeScript compilation
- [ ] Run tests to ensure nothing breaks

### Post-Migration
- [ ] Verify no remaining imports from functions folder
- [ ] Remove functions from workspace
- [ ] Delete functions folder
- [ ] Update documentation
- [ ] Update CI/CD if needed

---

## Estimated Effort

- **Services Migration**: 2-3 hours
- **Import Updates**: 1 hour
- **Testing & Verification**: 1-2 hours
- **Documentation**: 30 minutes

**Total**: ~4-6 hours

---

## Risks

1. **Service Dependencies**: Some services may have dependencies on Azure Functions-specific code
   - **Mitigation**: Review each service's dependencies before moving

2. **Type Compatibility**: Types may reference Azure Functions types
   - **Mitigation**: Update types to use generic interfaces where possible

3. **Breaking Changes**: Moving services may break existing code
   - **Mitigation**: Test thoroughly after migration

---

## Related Documentation

- [Migration Complete Summary](./MIGRATION_COMPLETE_SUMMARY.md)
- [Service Bus Removal Complete](./SERVICE_BUS_REMOVAL_COMPLETE.md)

---

## ✅ Migration Complete

All services and types have been successfully migrated to `packages/api-core/`, and the `functions/` folder has been removed.

**See**: [Functions Folder Migration Complete](./FUNCTIONS_FOLDER_MIGRATION_COMPLETE.md) for details.

---

**Status**: ✅ **COMPLETE - FUNCTIONS FOLDER REMOVED**

**Completion Date**: 2025-01-28

