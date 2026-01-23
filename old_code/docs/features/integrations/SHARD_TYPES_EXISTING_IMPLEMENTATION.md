# Shard Types: Existing Implementation Summary

## Current State

Shard types management **already fully exists and is mature** in the codebase:

### Storage & Management
- **Repository**: `apps/api/src/repositories/shard-type.repository.ts` (1131 lines)
  - Dedicated Cosmos DB container: `config.cosmosDb.containers.shardTypes`
  - Partition key: `/tenantId`
  - Composite indexes on: (tenantId, name), (tenantId, isCustom, createdAt), (tenantId, category, createdAt), (tenantId, status, updatedAt)
  - No caching (ShardTypes are read infrequently)

- **TypeScript Definitions**: `packages/shared-types/src/shard.ts` (642 lines)
  ```typescript
  export interface ShardType {
    id: string;
    tenantId: string;              // "system" for global types
    name: string;                  // Unique identifier (e.g., "c_opportunity")
    displayName: string;           // "Opportunity"
    description?: string;
    version: number;
    schema: {
      fields: Record<string, FieldDefinition>;
      allowUnstructuredData?: boolean;
    };
    uiSchema?: Record<string, any>;
    relationships?: RelationshipDefinition[];
    validationRules?: ValidationRule[];
    workflow?: WorkflowConfiguration;
    enrichment?: EnrichmentConfiguration;
    fieldGroups?: FieldGroup[];
    display: DisplayConfiguration;
    isActive: boolean;
    isSystem: boolean;             // true for built-in types
    isGlobal: boolean;             // true for system-wide types
    isTemplate: boolean;           // Can be cloned by tenants
    clonedFrom?: string;           // Original type if this is a clone
    icon?: string;                 // Lucide icon name
    color?: string;                // Hex color
    tags: string[];
    category: ShardTypeCategory;   // document | data | media | configuration | custom
    status: ShardTypeStatus;       // active | deprecated | deleted
    parentShardTypeId?: string;    // For type inheritance
    isCustom: boolean;
    isBuiltIn: boolean;
    metadata: ShardMetadata;
    deletedAt?: Date;
  }
  ```

### API Endpoints
- **Controller**: `apps/api/src/controllers/shard-types.controller.ts` (680+ lines)
  ```
  POST   /api/v1/shard-types             — Create new type
  GET    /api/v1/shard-types             — List types (paginated)
  GET    /api/v1/shard-types/:id         — Get single type
  PATCH  /api/v1/shard-types/:id         — Update type
  DELETE /api/v1/shard-types/:id         — Soft delete type
  POST   /api/v1/shard-types/:id/clone   — Clone type (not yet documented)
  ```

- **Frontend Client**: `apps/web/src/lib/api/shards.ts`
  ```typescript
  shardTypeApi.list(params?)              // Paginated list
  shardTypeApi.get(id)                    // Single type
  shardTypeApi.create(data)               // Create
  shardTypeApi.update(id, data)           // Update
  shardTypeApi.delete(id)                 // Soft delete
  shardTypeApi.createShardType(data)      // Create via API
  shardTypeApi.updateShardType(id, data)  // Update via API
  shardTypeApi.deleteShardType(id)        // Delete via API
  ```

- **API Documentation**: `docs/api/shard-types.md` (493+ lines)

### Core ShardTypes Already Defined
Located in `docs/shards/core-types/`:

| Type | Status | Purpose |
|------|--------|---------|
| `c_project` | ✅ Defined | Central hub for AI insights |
| `c_company` | ✅ Defined | Organizations |
| `c_contact` | ✅ Defined | People and contacts |
| `c_opportunity` | ✅ Defined | Sales opportunities (483 lines) |
| `c_document` | ✅ Defined | Documents |
| `c_documentChunk` | ✅ Defined | Document chunks with embeddings |
| `c_content` | ✅ Defined | Articles, blog posts |
| `c_assistant` | ✅ Defined | AI Assistant configs |
| `c_aimodel` | ✅ Defined | AI Model definitions |
| `c_aiconfig` | ✅ Defined | AI Prompt configs |
| `c_conversation` | ✅ Defined | AI Conversations |
| `c_note` | ✅ Defined | Notes and memos |
| `c_integration` | ✅ Defined | Integration configs |
| `c_integrationSync` | ✅ Defined | Sync job history |

### Authorization & Governance
- **Role-based Access**:
  - Super Admin: Can create/update/delete global types
  - Admin: Can only create/update/delete tenant-specific types
  - Users: Read-only access to active types

- **Workflow Protection**:
  - Built-in types (`isBuiltIn: true`) cannot be deleted
  - Global types (`isGlobal: true`) protected from tenant modification
  - Soft deletes only (sets `deletedAt` and `status: 'deleted'`)

---

## What's Missing for Phase 2

### New Core Types to Add
These **6 new types** for Phase 2 need to be documented in `docs/shards/core-types/`:

1. **`c_folder`** — Cloud storage folder (Google Drive, SharePoint, OneDrive)
   - Fields: provider, externalId, name, path, parentExternalId, owner, acl, description

2. **`c_file`** — Cloud storage file
   - Fields: provider, externalId, name, mimeType, size, checksum, sourceUrl, parentFolderExternalId, lastModified

3. **`c_sp_site`** — SharePoint site
   - Fields: siteId, siteUrl, name, description, owner, acl, collections

4. **`c_channel`** — Slack or Teams channel
   - Fields: platform, externalId, teamExternalId, name, topic, description, members, isPrivate

5. **`c_account`** — Salesforce Account (if not already defined)
   - Fields: name, industry, revenue, employees, website

6. Potentially: **`c_contact_salesforce`** or use generic `c_contact` with source tracking

### Template-Based Shard Creation
- Add TypeScript initialization in `scripts/init-cosmos-db.ts` to auto-create these core types on tenant provisioning
- Use existing `ShardTypeRepository.create()` method

### Integration State Tracking
- Define `c_integration_state` shard type for cursor/watermark storage
  - Fields: integrationName, lastSyncToken, lastEtag, watermark, lastSyncedAt, error, retryCount
  - Use `shardType: 'c_integration_state'` partitioned by `/tenantId/integrationName`

---

## Recommendations for Q1

**Q1: Shard Type Repository** — ALREADY ANSWERED
→ **Shard types are stored in `packages/shared-types/src/shard.ts`** (TypeScript types)
→ **Cosmos DB container `shardTypes`** (instances)
→ **API-driven**: Create via `POST /api/v1/shard-types`

**Action for Phase 2**:
1. Create markdown documentation for 6 new types in `docs/shards/core-types/`
2. Add TypeScript seed/init scripts to auto-provision core types on tenant creation
3. Document external_relationships structure and how Phase 2 ingestion will populate it

---

## Implementation Notes

### Creating New Core Types Programmatically
```typescript
// From shard-type.repository.ts
await shardTypeRepository.create({
  tenantId: 'system',  // Global type
  name: 'c_folder',
  displayName: 'Folder',
  category: ShardTypeCategory.DATA,
  schema: {
    fields: {
      provider: { type: 'string', required: true },
      externalId: { type: 'string', required: true },
      name: { type: 'string', required: true },
      // ...
    }
  },
  isGlobal: true,
  isSystem: true,
  icon: 'Folder',
  color: '#f59e0b',
  tags: ['integration', 'storage']
});
```

### Schema Validation
- Uses JSON Schema (draft-07+) for `structuredData` validation
- Enums, references, field groups all supported
- UI Schema for custom form rendering in frontend

### Inheritance Support
- Shard types can inherit from parent types via `parentShardTypeId`
- Schema merging via `mergeSchemas()` utility
- Useful for custom variants of core types

---

## Files to Update for Phase 2

1. ✅ **`docs/shards/core-types/c_folder.md`** — Create
2. ✅ **`docs/shards/core-types/c_file.md`** — Create
3. ✅ **`docs/shards/core-types/c_sp_site.md`** — Create
4. ✅ **`docs/shards/core-types/c_channel.md`** — Create
5. ✅ **`docs/shards/core-types/c_account.md`** — Create (or verify exists)
6. ✅ **`docs/shards/core-types/README.md`** — Update table to include new types
7. ✅ **`scripts/init-cosmos-db.ts`** — Add shard type seeding for Phase 2 types
8. ✅ **`docs/features/integrations/phase-2.md`** — Update with correct shard type storage location

---

## Conclusion

**Shard types are fully implemented and mature.** Phase 2 does **NOT** require architectural changes to storage or management. 

We only need to:
1. Define the 6 new core types in documentation
2. Add them to the tenant provisioning seed scripts
3. Implement the integration ingestion layer to populate shard instances

This is a **documentation + seeding task**, not an architecture task.
