# Integration Data Flow Plan - Questions

## Questions Generated from Specification Review

### 1. Shard Type Architecture

**Question 1.1: Opportunity Shard Updates**
- The specification requires adding ML fields (daysInStage, daysSinceLastActivity, etc.) to Opportunity shard type. Should these be calculated during mapping or updated later via a separate process?
- **Options:**
  - A) Calculate during mapping (adds latency but ensures data is complete)
  - B) Calculate asynchronously after shard creation (faster but data may be incomplete initially)
  - C) Hybrid: Calculate basic fields during mapping, complex aggregations async

**Question 1.2: Shard Type Creation**
- Should all new shard types (Document, Email, Message, Meeting, CalendarEvent) be created upfront in Phase 1, or created incrementally as each processor is implemented?
- **Options:**
  - A) Create all shard types upfront (ensures consistency, easier testing)
  - B) Create incrementally per phase (faster initial delivery, but potential inconsistencies)
  - C) Create core shard types (Document, Email) upfront, others incrementally

**Question 1.3: Shard Type Versioning**
- How should we handle shard type schema evolution? If we update Opportunity shard type with new fields, how do we handle existing shards?
- **Options:**
  - A) Backfill existing shards with default values for new fields
  - B) Make new fields optional, populate on next sync
  - C) Version shard types, support multiple versions simultaneously

### 2. Multi-Modal Data Processing

**Question 2.1: Processor Architecture**
- The specification calls for specialized processors (DocumentProcessor, EmailProcessor, etc.) vs. a single mapping consumer. Should we:
- **Options:**
  - A) Implement specialized processors immediately (aligns with spec, better separation)
  - B) Start with unified mapping consumer, refactor to specialized later (faster initial delivery)
  - C) Hybrid: Unified consumer with pluggable processors per data type

**Question 2.2: Queue Strategy**
- Should we create separate queues per data type (integration_documents, integration_communications, etc.) or use routing keys on a single queue?
- **Options:**
  - A) Separate queues per type (better isolation, independent scaling)
  - B) Single queue with routing keys (simpler, but less isolation)
  - C) Hybrid: Core queue (CRM) separate, others grouped (documents+communications, meetings+events)

**Question 2.3: Document Processing Priority**
- Documents require blob storage, text extraction, and analysis. Should document processing be:
- **Options:**
  - A) Fully async: Download → Store → Extract → Analyze → Link (longer latency, better scalability)
  - B) Synchronous for small docs, async for large (balance latency and scalability)
  - C) Streaming: Start analysis as text is extracted (lowest latency, more complex)

### 3. Entity Linking

**Question 3.1: Entity Linking Timing**
- When should entity linking occur?
- **Options:**
  - A) During shard creation (ensures links exist immediately, but may slow processing)
  - B) After shard creation via separate consumer (faster shard creation, links added later)
  - C) Hybrid: Fast linking (participant matching) during creation, deep linking (LLM-based) async

**Question 3.2: Entity Linking Confidence Thresholds**
- What confidence thresholds should we use for auto-linking vs. suggesting?
- **Options:**
  - A) Auto-link > 80%, Suggest 60-80%, Ignore < 60% (conservative, fewer false positives)
  - B) Auto-link > 70%, Suggest 50-70%, Ignore < 50% (more aggressive, more links)
  - C) Configurable per tenant/integration (flexibility, but more complexity)

**Question 3.3: Entity Linking for Opportunities**
- Should entity linking trigger opportunity.updated events (which then trigger risk/forecast/recommendations)?
- **Options:**
  - A) Yes, always (ensures downstream services see all linked data)
  - B) Only if new high-confidence links added (reduces event volume)
  - C) Configurable per integration (flexibility)

### 4. Field Mapping

**Question 4.1: Field Mapping Application**
- The current plan has FieldMapperService applying mappings. Should field mappings be:
- **Options:**
  - A) Applied in mapping consumer (before shard creation, ensures correct data)
  - B) Applied in integration-sync before publishing raw events (earlier, but less flexible)
  - C) Both: Basic mapping in sync, advanced mapping in consumer

**Question 4.2: Shard Type Mapping**
- Integration catalog has `shardMappings` field. Should we use this to determine which shard type to create, or rely on entityMappings.shardTypeId?
- **Options:**
  - A) Use shardMappings from catalog (centralized, consistent)
  - B) Use entityMappings.shardTypeId (per-integration flexibility)
  - C) Prefer entityMappings, fallback to catalog shardMappings

**Question 4.3: ML Field Population**
- ML fields (daysInStage, documentCount, etc.) require aggregations. Should these be:
- **Options:**
  - A) Calculated during mapping (requires queries to other shards, slower)
  - B) Calculated via separate batch job (faster mapping, but data may be stale)
  - C) Calculated on-demand when needed (no storage overhead, but query cost)

### 5. Integration with Current Plan

**Question 5.1: Plan Scope**
- The current plan focuses on CRM data (Opportunities, Accounts, Contacts). Should we:
- **Options:**
  - A) Complete CRM flow first, then add multi-modal (phased approach, lower risk)
  - B) Implement multi-modal architecture from start (more work upfront, but better foundation)
  - C) Implement CRM + Documents in parallel (balance of speed and completeness)

**Question 5.2: Opportunity Event Publishing**
- Should we publish `integration.opportunity.updated` for all opportunity shard updates, or only for specific changes?
- **Options:**
  - A) Always publish (simple, ensures all changes trigger downstream)
  - B) Only publish on significant changes (stage, amount, close date) (reduces event volume)
  - C) Configurable per integration (flexibility)

**Question 5.3: Vectorization Integration**
- Documents, emails, and meetings need vectorization. Should vectorization:
- **Options:**
  - A) Happen automatically on shard.created for all shard types (consistent, but may vectorize unnecessary data)
  - B) Only for specific shard types (Document, Email, Meeting) (more targeted)
  - C) Configurable per shard type (flexibility)

### 6. Infrastructure & Dependencies

**Question 6.1: Azure Blob Storage**
- Documents and recordings need blob storage. Should we:
- **Options:**
  - A) Set up blob storage in Phase 1 (ready for Phase 2 documents)
  - B) Set up blob storage in Phase 2 when needed (just-in-time)
  - C) Use existing blob storage if available, create new if not

**Question 6.2: Azure Cognitive Services**
- Document processing requires OCR, speech-to-text. Should we:
- **Options:**
  - A) Set up Azure services in Phase 1 (ready for all phases)
  - B) Set up incrementally per phase (just-in-time)
  - C) Use existing services if available, create new if not

**Question 6.3: Processing Capacity**
- Document and meeting processing is CPU/memory intensive. Should we:
- **Options:**
  - A) Use dedicated consumer instances for heavy processing (better isolation)
  - B) Use same consumer pool with different prefetch settings (simpler, but may impact other processing)
  - C) Use serverless functions (Azure Functions) for heavy processing (auto-scaling, but more complexity)

### 7. Testing & Validation

**Question 7.1: Test Data**
- For testing document/email/meeting processing, should we:
- **Options:**
  - A) Use real integration data (realistic, but may have PII)
  - B) Use synthetic test data (safe, but may not catch edge cases)
  - C) Use both: synthetic for unit tests, real for integration tests (comprehensive)

**Question 7.2: Shard Validation**
- Should we validate shard data against shard type schema before storing?
- **Options:**
  - A) Always validate (ensures data quality, but adds latency)
  - B) Validate in development, skip in production (faster, but risk of bad data)
  - C) Validate with configurable strictness (flexibility)

### 8. Migration & Backward Compatibility

**Question 8.1: Existing Shards**
- If we update Opportunity shard type schema, how do we handle existing shards?
- **Options:**
  - A) Backfill migration script (ensures all shards have new fields)
  - B) Lazy migration (update on next sync) (simpler, but inconsistent state)
  - C) Version shard types, support both old and new (no migration needed, but more complexity)

**Question 8.2: Current Integration Sync**
- The current IntegrationSyncService directly stores shards. Should we:
- **Options:**
  - A) Refactor immediately to publish events (aligns with plan, but breaks existing functionality)
  - B) Add event publishing alongside direct storage (backward compatible, but duplicate work)
  - C) Feature flag: Use events when enabled, direct storage when disabled (smooth migration)

---

## Priority Questions (Must Answer Before Implementation)

1. **Question 1.1** - ML field calculation timing (affects mapping consumer design)
2. **Question 2.1** - Processor architecture (affects overall architecture)
3. **Question 2.2** - Queue strategy (affects infrastructure setup)
4. **Question 5.1** - Plan scope (affects timeline and deliverables)
5. **Question 8.2** - Migration strategy (affects backward compatibility)

## Questions by Category

- **Architecture**: 1.2, 1.3, 2.1, 2.2, 5.1, 8.2
- **Implementation**: 1.1, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3, 5.2, 5.3
- **Infrastructure**: 6.1, 6.2, 6.3
- **Quality**: 7.1, 7.2
- **Migration**: 8.1, 8.2
