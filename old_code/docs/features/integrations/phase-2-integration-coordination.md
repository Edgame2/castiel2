# Phase 2 Integration Coordination Guide

## Overview

This document explains how Phase 2 ingestion functions relate to the existing integration system, when to use each approach, and how they work together.

---

## Integration Points

### Phase 2 Ingestion Functions

**Purpose:** Phase 2-specific ingestion for Salesforce, Google Drive, and Slack that emit `ingestion-events` to Service Bus.

**Location:** `src/functions/ingestion-*.ts`

**Functions:**
- `ingestion-salesforce.ts` - HTTP webhook + timer polling
- `ingestion-gdrive.ts` - Timer polling with delta tokens
- `ingestion-slack.ts` - HTTP webhook with throttling

**Output:** Emit to `ingestion-events` Service Bus queue

### Existing Integration System

**Purpose:** General-purpose integration framework with adapters, conversion schemas, and sync tasks.

**Location:** `docs/features/integrations/`

**Components:**
- Integration adapters (Salesforce, Google Drive, Notion, etc.)
- Conversion schemas (field mapping)
- Sync tasks (scheduling)
- Azure Functions: `SyncScheduler`, `SyncInboundWorker`, `SyncOutboundWorker`

**Output:** Direct shard creation via `IntegrationShardService`

---

## Decision Matrix

### When to Use Phase 2 Ingestion Functions

Use Phase 2 ingestion functions for:
- **Salesforce** - Opportunities and Accounts (MVP)
- **Google Drive** - Folders and Files (MVP)
- **Slack** - Channels (MVP)

**Why:** Phase 2 functions are optimized for the new shard types (`c_opportunity`, `c_account`, `c_folder`, `c_file`, `c_channel`) and emit events that flow through the normalization and enrichment pipeline.

### When to Use Existing Integration System

Use existing integration system for:
- **Notion** - Databases and pages
- **Google News** - News feeds
- **Other integrations** - Any integration not in Phase 2 MVP scope

**Why:** Existing system provides flexible field mapping, conversion schemas, and supports any shard type.

### Hybrid Approach

**Option:** Existing adapters can opt-in to emit `ingestion-events` in addition to direct shard creation.

**Benefits:**
- Leverage Phase 2 normalization and enrichment pipeline
- Maintain backward compatibility
- Gradual migration path

**Implementation:** Modify existing adapters to emit `ingestion-events` after creating shards, or emit events instead of direct shard creation.

---

## Integration Flow Comparison

### Phase 2 Flow

```
External System → Phase 2 Ingestion Function → ingestion-events Queue
  → Normalization Processor → shard-emission Queue
  → Enrichment Processor → enrichment-jobs Queue
  → Embedding Pipeline → embedding-jobs Queue
  → Shard with relationships and embeddings
```

### Existing Integration Flow

```
External System → Existing Adapter → Conversion Schema
  → IntegrationShardService → Direct Shard Creation
  → Change Feed → embedding-jobs Queue
  → Shard with embeddings
```

### Hybrid Flow

```
External System → Existing Adapter → Conversion Schema
  → IntegrationShardService → Direct Shard Creation
  → Emit ingestion-events → Normalization Processor
  → (Continue Phase 2 flow for enrichment)
```

---

## Migration Path

### For Existing Integrations

1. **Phase 1: Opt-In Enhancement**
   - Existing integrations continue working as-is
   - Optionally emit `ingestion-events` for Phase 2 processing
   - Enhanced `external_relationships` populated on next sync

2. **Phase 2: Automatic Enhancement**
   - On next sync, existing integrations populate new `external_relationships` fields
   - No manual migration needed for active integrations

3. **Phase 3: Full Migration (Optional)**
   - Migrate existing integrations to use Phase 2 ingestion functions
   - Benefits: Unified pipeline, enrichment, project auto-attachment

### For New Integrations

- **Phase 2 sources (Salesforce, GDrive, Slack):** Use Phase 2 ingestion functions
- **Other sources:** Use existing integration system
- **Future:** All integrations can migrate to Phase 2 pipeline

---

## Developer Guide

### Adding a New Phase 2 Ingestion Source

1. **Create Ingestion Function**
   - File: `src/functions/ingestion-{source}.ts`
   - Follow pattern from `ingestion-salesforce.ts`
   - Emit `IngestionEvent` to `ingestion-events` queue
   - Store cursors as `integration.state` shards

2. **Define Shard Types**
   - Add to `apps/api/src/types/core-shard-types.ts`
   - Add to `apps/api/src/seed/core-shard-types.seed.ts`
   - Document in `docs/shards/core-types/`

3. **Create Normalization Mapping**
   - Add mapping logic to `normalization-processor.ts`
   - Map vendor fields → canonical shard type schema

4. **Test End-to-End**
   - Test ingestion → normalization → enrichment → embedding
   - Verify shards created with correct structure
   - Verify relationships and embeddings generated

### Integrating with Existing Adapters

**Option A: Emit Events After Shard Creation**
```typescript
// In existing adapter
const shard = await integrationShardService.createShard(...);

// Emit ingestion event for Phase 2 processing
await serviceBusService.sendIngestionEvent({
  tenantId,
  source: 'notion',
  sourceId: externalId,
  eventType: 'create',
  observedAt: new Date(),
  payload: rawData,
});
```

**Option B: Emit Events Instead of Direct Creation**
```typescript
// In existing adapter
// Instead of creating shard directly, emit event
await serviceBusService.sendIngestionEvent({
  tenantId,
  source: 'notion',
  sourceId: externalId,
  eventType: 'create',
  observedAt: new Date(),
  payload: rawData,
});

// Let Phase 2 pipeline handle shard creation
```

---

## Best Practices

### Choosing Integration Approach

1. **Use Phase 2 if:**
   - Source is in Phase 2 MVP (Salesforce, GDrive, Slack)
   - You want enrichment and entity extraction
   - You need project auto-attachment
   - You want unified pipeline

2. **Use Existing System if:**
   - Source is not in Phase 2 MVP
   - You need custom field mapping per tenant
   - You want direct shard creation without enrichment
   - You're extending existing integration

3. **Use Hybrid if:**
   - You want benefits of both systems
   - You're migrating gradually
   - You need backward compatibility

### Coordination Guidelines

- **Don't duplicate:** Don't create shards via both systems for the same external record
- **State management:** Use `integration.state` shards for cursors/tokens (Phase 2) or sync state (existing system)
- **Error handling:** Both systems should handle errors gracefully and not block each other
- **Monitoring:** Track metrics separately for Phase 2 vs existing system

---

## Future Considerations

### Unified Pipeline (Future)

Long-term goal: All integrations use Phase 2 pipeline:
- Unified normalization and enrichment
- Consistent relationship creation
- Project auto-attachment for all sources
- Single observability dashboard

### Migration Strategy

1. Phase 2 MVP: Salesforce, GDrive, Slack
2. Phase 2 Expansion: Add more sources to Phase 2
3. Migration Tools: Scripts to migrate existing integrations
4. Deprecation: Eventually deprecate direct shard creation in favor of event-driven pipeline

---

## Questions & Answers

**Q: Can existing adapters emit `ingestion-events`?**
A: Yes, they can opt-in to emit events for Phase 2 processing while maintaining direct shard creation.

**Q: Will Phase 2 replace the existing integration system?**
A: Not initially. Phase 2 extends the system. Long-term, all integrations may migrate to Phase 2 pipeline.

**Q: How do I know which system to use for a new integration?**
A: Use Phase 2 for MVP sources (Salesforce, GDrive, Slack). Use existing system for others. Consider hybrid for gradual migration.

**Q: Can I use both systems for the same integration?**
A: Not recommended - it will create duplicate shards. Choose one approach per integration.

---

## Related Documentation

- [Phase 2 Implementation Plan](./phase-2.md)
- [Integration System README](./README.md)
- [Sync Engine](./SYNC-ENGINE.md)
- [Container Architecture](./CONTAINER-ARCHITECTURE.md)






