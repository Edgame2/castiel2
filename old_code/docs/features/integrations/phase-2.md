# Phase 2 — Integrations Implementation Plan (Shard + Cosmos DB Vector Search)

This plan operationalizes multi-source ingestion (CRM, Messaging, Drive, SharePoint) into the existing Castiel shard system, enabling project-scoped intelligence and tenant-safe RAG via Cosmos DB Vector Search.

## Goals
- Integrate CRM, Messaging, Google Drive, and SharePoint into the shard system.
- Create new shard types: `c_opportunity`, `c_account`, `c_folder`, `c_file`, `c_sp_site`, `c_channel`.
- Keep data immutable and tenant-separated while enabling project-scoped RAG via `c_project` shards.
- Use Cosmos DB as the source of truth and Cosmos DB Vector Search for semantic retrieval.
- Reuse existing embedding pipeline (Change Feed + Service Bus + ShardEmbeddingService).

## MVP Scope Decisions (Locked)
- **Integrations (Phase 2A)**: Salesforce + Google Drive + Slack.
- **SLA Governance**: Super Admin sets defaults and max; Tenant Admin can override within max.
- **Entity Modeling**: Use separate entity shards (e.g., account, contact), not inline.
- **Enrichment Threshold**: Moderate confidence gate (0.6–0.7).
- **KPI Scope (Initial)**: CRM-focused KPIs; expand later.
- **Write-back Policy**: Full bidirectional possible; default disabled. Tenant Admin gating within Super Admin constraints.
- **Redaction Policy**: Default redaction is none; Tenant Admin configures which PII fields to redact.
- **Project Auto-Attachment**: Aggressive policy — attach with any strong single signal (explicit project reference or authoritative CRM link); allow corrections via unlink.
 
Status: Phase 2A scope is locked and the document is finalized for implementation. Remaining topics are deferred and tracked under Future Considerations.

## Key Concepts

### Shard Structure
Every shard in Cosmos DB has:
```typescript
interface Shard {
  id: string;                          // Unique shard ID
  tenantId: string;                    // Partition key
  userId: string;                      // Creator/owner
  shardTypeId: string;                 // Reference to shard type schema
  
  structuredData: Record<string, any>; // Schema-validated per shardType
  unstructuredData?: string;           // Free-form text (optional)
  
  // Links to other Castiel shards
  internal_relationships?: Array<{
    id: string;                        // Relationship UUID
    targetShardId: string;             // Linked shard ID
    targetShardTypeId: string;         // Linked shard type
    relationshipType: string;          // e.g., "belongs_to", "includes", "concerns"
    label?: string;                    // Human-readable label
    metadata?: Record<string, any>;    // Additional relationship data
    createdAt: Date;
    createdBy: string;
  }>;
  
  // Links to external systems
  external_relationships?: Array<{
    id: string;                        // Relationship UUID
    system: string;                    // System name (e.g., "salesforce", "gdrive")
    systemType: string;                // Type (crm, storage, messaging, etc.)
    externalId: string;                // ID in external system
    label?: string;                    // Human-readable label
    syncStatus: string;                // synced | pending | failed | stale
    syncDirection?: string;            // inbound | outbound | bidirectional
    lastSyncedAt?: Date;
    metadata?: Record<string, any>;    // Data from external system
    createdAt: Date;
    createdBy: string;
  }>;
  
  // Embeddings for semantic search
  vectors?: Array<{
    embedding: number[];               // 1536-dimensional vector
    model: string;                     // e.g., "text-embedding-3-small"
    dimensions: number;
    generatedAt: Date;
  }>;
  
  // Access control
  acl: Array<{
    subject: string;                   // user-id | group-id | *
    permissionLevel: string;           // read | write | delete | admin
  }>;
  
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
    version: number;
    tags: string[];
  };
  status: string;                      // active | archived | deleted | draft
}
```

### Projects as Shards
Projects ARE shards of type `c_project`:
- Aggregate related shards via `internal_relationships[]`
- Bind to external sources via `external_relationships[]`
- Enable filter-first vector search scoped to project-linked shards

---

## Integration Flow

### Ingestion Functions (HTTP + Timer)
- Per integration (CRM, Slack/Teams, Drive, SharePoint): detect changes via events/cursors/fingerprints.
- Emit `ingestion-events` messages: `{ tenantId, source, sourceId, eventType, observedAt }`.

### Normalization Processor (Functions)
- Consume `ingestion-events`, normalize payloads, compute fingerprints.
- Create source shards (e.g., `c_opportunity`, `c_folder`) with `structuredData` matching shard type schema.
- Populate `external_relationships[]` on each shard: `{ system: 'salesforce', systemType: 'crm', externalId: '006...', syncStatus: 'synced', … }`.
- Store per-integration cursors as state shards (`shardType: 'integration.state'`) in the same container.

### Enrichment Processor (Functions / Durable Orchestrations)
- Extract and create entity shards from source data.
- Link shards via `internal_relationships[]`: add entries to source and entity shards to establish graph structure.
- Assign confidence scores in relationship metadata.

### Embedding Pipeline (Reuse Existing)
- Change Feed → queue `vectorization-jobs`; `EmbeddingWorker` generates vectors with templates.
- Store embeddings in `vectors[]` array on each shard.
- Configure Cosmos DB Vector Search on the `vectors[].embedding` path.

### Project Resolver API (`apps/api`)
- Retrieve `c_project` shards (projects) and traverse:
  1. `internal_relationships[]` to fetch explicitly linked shardIds.
  2. Optionally expand via `external_relationships[]` matching.
  3. Apply overlap rules (entities/actors/time) with confidence gating for soft links.
- Filter-first vector search: scope to project-linked shardIds first, then allow ~20% budget for unlinked high-similarity shards tenant-wide.

### Insight & Provenance Pipeline
- Create insight shards (e.g., `shardType: 'c_insight_kpi'`) with KPI data in `structuredData`.
- Create provenance shards linking back via `internal_relationships[]` to source shards.
- Enforce: insights without provenance excluded from RAG.

### Governance & ACL
- Shard-level `acl[]` array enforced at query time.
- Redaction tracked via `metadata` or custom shard type.

### Observability
- Metrics as shards: ingestion lag, change miss rate, vector hit ratio, confidence drift.

---

## New Shard Types

### `c_opportunity` — Salesforce Opportunity
- **Purpose**: CRM deal or opportunity
- **Key Fields**: name, stage, value, currency, accountId, ownerId, probability, closeDate, expectedRevenue
- **External Relationship**: `{ system: 'salesforce', systemType: 'crm', externalId: '006...' }`

### `c_account` — Salesforce Account
- **Purpose**: CRM company or account
- **Key Fields**: name, industry, revenue, employees, website, description
- **External Relationship**: `{ system: 'salesforce', systemType: 'crm', externalId: '001...' }`

### `c_folder` — Google Drive or SharePoint Folder (NEW)
- **Purpose**: Cloud folder
- **Key Fields**: name, provider (gdrive | sharepoint), externalId, path, parentExternalId, owner, acl, description
- **External Relationship**: `{ system: 'gdrive' | 'sharepoint', systemType: 'storage', externalId: 'folder_id...' }`

### `c_file` — Google Drive or SharePoint File (NEW)
- **Purpose**: Cloud file
- **Key Fields**: name, provider, externalId, mimeType, size, checksum, sourceUrl, parentFolderExternalId, owner, acl, lastModified
- **External Relationship**: `{ system: 'gdrive' | 'sharepoint', systemType: 'storage', externalId: 'file_id...' }`

### `c_sp_site` — SharePoint Site (NEW)
- **Purpose**: SharePoint site
- **Key Fields**: siteId, siteUrl, name, description, owner, acl, collections (lists, libraries)
- **External Relationship**: `{ system: 'sharepoint', systemType: 'storage', externalId: 'site_id...' }`

### `c_channel` — Slack or Teams Channel (NEW)
- **Purpose**: Messaging platform channel
- **Key Fields**: platform (slack | teams), name, externalId, teamExternalId, topic, description, members, acl, isPrivate
- **External Relationship**: `{ system: 'slack' | 'teams', systemType: 'messaging', externalId: 'channel_id...' }`

### `c_project` — Internal Project (Existing)
- **Purpose**: Central hub aggregating related shards
- **Key Fields**: name, description, status, stage, priority, startDate, targetEndDate, budget, ownerUserId, teamMembers, objectives, risks, milestones
- **Internal Relationships**: Links to c_opportunity, c_document, c_note, c_folder, c_channel, c_contact, etc.
- **External Relationships**: Binds to CRM deals, Drive folders, Slack channels for auto-context expansion

---

## Phase Plan & Tasks

### Phase 2A — Data Model & Infrastructure
- Define shard types in `packages/shared-types` and `docs/shards/core-types/`: c_opportunity, c_account, c_folder, c_file, c_sp_site, c_channel with schema definitions and field validation.
- Verify existing shard document envelope supports `internal_relationships[]`, `external_relationships[]`, and `vectors[]` (confirm field names and structure).
- Verify Cosmos DB indexing policy and enable Vector Search on the `vectors[].embedding` path.
- Establish Service Bus queues: `ingestion-events`, `shard-emission`, `enrichment-jobs`, `vectorization-jobs` (reuse if already present).
- Environment variables and secrets in Key Vault; wire `apps/api` and workers to use them.

### Phase 2B — Ingestion Connectors (MVP)
- **CRM (Salesforce)**: HTTP Function webhook + 5–10 min poll fallback. Ingest opportunities and accounts.
- **Messaging (Slack/Teams)**: HTTP Function for events; throttle & dedupe. Ingest channels.
- **Drive**: Timer Function using delta tokens; 10–15 min polling. Ingest folders and files.
- **SharePoint**: Timer Function; 15 min polling; track `etag`/delta queries. Ingest sites, folders, files.
- Emit `ingestion-events` with `tenantId` ALWAYS.
- Persist per-integration cursors as state shards (`shardType: 'integration.state'`).
- For each source shard, populate `external_relationships[]` with system/systemType/externalId.

### Phase 2C — Normalization & Enrichment
- **Normalization Function**: Map vendor fields → canonical `structuredData` schema per shard type.
- **Enrichment Function**: Extract entities (company, contact, person); create entity shards; link via `internal_relationships[]`.
- **Confidence Policy**: numeric CRM (0.9), LLM inference (0.6), messaging (0.5); configurable by shardType.
- Maintain `external_relationships[]` for authoritative cross-system references.

### Phase 2D — Project Scope & Resolver
- **API Endpoints**:
  - `POST /api/v1/projects` — Create c_project shard with initial scope.
  - `PATCH /api/v1/projects/:id/internal-relationships` — Add internal links.
  - `PATCH /api/v1/projects/:id/external-relationships` — Add external bindings.
  - `GET /api/v1/projects/:id/context` — Resolve project context (traverses relationships, applies confidence gating).
- Auto-attachment on new shards using overlap rules (entities/actors/time); explicit links always override.
- Aggressive auto-attachment policy: attach when any strong single signal exists (e.g., explicit project reference or authoritative CRM link); enable later corrections via unlink.

### Phase 2E — RAG Retrieval (Cosmos Vector Search)
- Filter-first vector queries scoped by project-linked shardIds via `internal_relationships[]` and `external_relationships[]` matching.
- Retrieval order: insight shards → entity shards → supporting source shards.
- Structured payload to LLM with facts, KPIs, citations; include freshness timestamps.

### Phase 2F — Insights & Provenance
- Durable orchestrations recompute KPI shards on CRM changes or nightly.
- Create provenance shards linking back via `internal_relationships[]` to source shards.
- Enforce: "no provenance → no RAG usage" rule.
- Expose `GET /api/v1/projects/:id/insights` with provenance references.

### Phase 2G — Governance & Security
- Implement shard-level `acl[]` array; enforce at query time.
 - Redaction tracked via `metadata` or custom shard type.
 - Redaction defaults to none; Tenant Admin can configure which PII fields must be redacted.
- Audit trails as governance shards for create/update flows.

### Phase 2H — Observability & SLOs
- Metrics-as-shards: ingestion lag, change miss rate, vector hit ratio, insight confidence drift.
- Dashboards in App Insights; alerts on SLO breaches.

---

## Deliverables & Acceptance Criteria
- **Shard Types**: Defined in `packages/shared-types` and documented. c_opportunity, c_account, c_folder, c_file, c_sp_site, c_channel ready for use.
- **Single Shards Container**: Partitioned by `/tenantId`, vector search enabled on `vectors[].embedding`.
- **Queues & Functions**: Deployed connectors with DLQ/retry; cursors persisted as state shards per integration.
- **Normalization & Enrichment**: Canonical mapping → shard creation; entity/relationship shards with confidence.
- **Project Resolver**: API returns scoped shard sets via `internal_relationships[]` and `external_relationships[]` traversal within target latency (< 300 ms P95 within tenant partition).
- **RAG Retrieval**: Filter-first vector search scoped by project links; citations present; freshness included.
- **Insights & Provenance**: KPI shards recomputed on change; provenance attached; audit-ready.
- **Governance**: ACL enforced at query time; redactions respected.
- **Observability**: Baseline metrics and alerts configured; dashboards published; metrics-as-shards available.

---

## Rollout & Tenant Separation
- Default: logical separation via `/tenantId` with shared infra; strict tenantId propagation on all messages, shards, queries.
- Option: promote large tenants to dedicated Service Bus/Cosmos containers without code changes.

---

## Integration Points in Monorepo
- `apps/api`: Add endpoints for project context resolution and insights retrieval.
- `packages/shared-types`: Shard type definitions and type guards.
- `packages/shared-utils`: Normalization helpers, confidence scoring utilities.
- `packages/monitoring`: Metrics emitters and tracing.
- `scripts/init-cosmos-db.ts`: Container/index/vector configuration.
- Existing embedding pipeline: `ChangeFeedProcessor`, `EmbeddingWorker`, `ShardEmbeddingService`.

---

## Future Considerations (Deferred beyond Phase 2A)

These items are out of scope for Phase 2A. They are captured here for subsequent phases and do not block current implementation.

### Architecture & Infrastructure
1. **Shard Type Repository**: Should shard type definitions live in `packages/shared-types` or a dedicated `packages/shard-types` package?
2. **Vector Field Path**: Confirm Cosmos Vector Search on `vectors[].embedding` and dimensions (1536 for text-embedding-3-small)?
3. **State Shard Storage**: Persist per-integration cursors (lastSyncToken, etag, watermark) as `shardType: 'integration.state'` shards in the same container? Or use blob/table storage?
4. **Cosmos DB Partition Strategy**: As integrations scale to thousands of shards, is `/tenantId` sufficient or should we consider `/tenantId/source` or `/tenantId/shardTypeId`?
5. **Change Feed Catch-up**: How many partitions for Change Feed processor? Dedicated CosmosDB account or shared with API reads?

### Integration Scope & Priorities
6. **Priority Integrations (MVP)**: Which integrations in Phase 2A?
   - CRM: Salesforce only? (or OpenCRM, HubSpot, Pipedrive)?
   - Messaging: Slack, Teams, both, or neither?
   - Drive: Google Drive, OneDrive, SharePoint, or combination?
   - SharePoint: On-prem vs. Online? Site collections scope?
7. **External System Coverage**: Should phase 2 include:
   - Email (Outlook/Gmail) for context threading?
   - Calendar (shared events, attendees)?
   - Document collaboration (Word, Sheets real-time edits)?
   - Custom APIs (JIRA, GitHub, Linear)?

### Data Freshness & Sync
8. **Target SLAs**: 
   - CRM (Salesforce): What freshness? (< 15 min, hourly, next business day)?
   - Messaging (Slack/Teams): Real-time, 5 min, or end-of-day summary?
   - Drive/SharePoint: Hourly, 4-hour batch, or change-driven?
   - Should phase miss a change, how long before reindex (24 h, 7 d)?
9. **Bidirectional Sync Scope**: Which shards support write-back to external systems?
   - CRM fields only (stage, amount, close date)?
   - Messaging (post replies, reactions)?
   - Drive (folder structure, file metadata)?
   - Which tenant roles can trigger write-back?
10. **Deleted Content Handling**: On external deletion (Salesforce record deleted, Drive file trashed):
    - Soft-delete shards (set status: 'archived')?
    - Hard-delete immediately?
    - Redact content but preserve metadata for audit?
    - Retention window before permanent deletion?

### Enrichment & Relationships
11. **Entity Linking Strategy**: When normalizing source shards (e.g., Salesforce opportunity):
    - Always create separate entity shards (c_account, c_contact) or inline in structuredData?
    - How to detect entity matches across sources (Salesforce account vs. Google org)?
    - Should entity shards be source-agnostic or source-specific?
12. **Relationship Confidence Gating**:
    - Minimum confidence threshold for auto-attachment (0.6, 0.7, 0.8)?
    - Which relationship types allow soft links vs. require explicit links?
    - Can users override confidence or remove auto-links?
13. **Project Auto-Attachment Rules**:
    - Detection signals: entity/actor overlap, time window (30d, 90d), shared accounts/contacts?
    - Should auto-attachment apply on ingestion or only on project creation/update?
    - Can tenant admins customize auto-attachment rules per project type?

### Insights & Analytics
14. **KPI Catalog for Phase 2**:
    - CRM: expected revenue, close probability, win rate, sales cycle duration, churn risk?
    - Drive/SharePoint: document age, sharing scope, active contributors?
    - Messaging: team velocity, engagement score, sentiment?
    - Should KPIs be computed incrementally or nightly batch?
15. **Insight Recompute Triggers**:
    - Real-time on source change (high cost) or nightly batch (low cost, stale)?
    - Should changing a shard trigger recompute of dependent insights?
    - Retention: keep historical KPI snapshots or only current?
16. **Provenance & Citation**:
    - Should shards track lineage (e.g., KPI depends on 3 Salesforce records, 2 Drive docs)?
    - Citation format: JSON reference or Markdown links?
    - Should RAG responses include confidence scores alongside citations?

### Governance & Security
17. **Redaction Scope**:
    - Which fields require redaction initially (email bodies, message content, API keys, PII)?
    - Should redaction be at the field level or document level?
    - Can certain roles view unredacted content (compliance, admins)?
    - How to track who accessed redacted data (audit)?
18. **Tenant Data Isolation**:
    - Can tenant A see tenant B's metadata or only their own data?
    - Should cross-tenant sharing be possible (e.g., external collaboration)?
    - If external user from Org B joins Org A project, what access level?
19. **Shard-Level Permissions**:
    - Should every shard have `acl[]`? Or inherit from project ACL?
    - Can individual shards have stricter permissions than project?
    - What roles: reader, editor, admin, owner?
    - Should external system sync respect shard ACL (don't sync if user lost access)?

### Observability & Operations
20. **Metrics & Observability**:
    - Key metrics: ingestion lag (P50, P95, P99), change miss rate, vector hit ratio, query latency?
    - Should metrics themselves be stored as shards for historical analysis?
    - Alert thresholds: lag > 1 h, miss rate > 0.1%, latency P95 > 500 ms?
21. **Cost Optimization**:
    - Expected data volume? (shards/day, vectors/day, storage/month)?
    - Vector embeddings cost: pre-compute all shards or on-demand?
    - Cosmos RU utilization targets (peak vs. average)?
    - Should old data be archived to blob storage with fallback retrieval?
22. **Debugging & Troubleshooting**:
    - Should shard creation/sync errors be surfaced in a UI (sync history)?
    - How to replay ingestion for a specific date range?
    - Should tenant admins see sync logs for their integrations?
    - Rollback strategy if a function pushes bad data?

### Data Quality & Governance
23. **Schema Evolution**:
    - If Salesforce adds a new field, should it auto-populate existing shards or only new ones?
    - How to handle breaking schema changes (rename field, type change)?
    - Versioning strategy for shard types?
24. **Data Validation**:
    - Which fields are required vs. optional per shard type?
    - Format validation (email, URL, date)?
    - Should invalid shards be quarantined or auto-fixed?
    - Who can create/modify shard types (schema admins, developers)?
25. **Change Tracking**:
    - Should shards track full audit log (all field changes) or just created/updated timestamps?
    - How far back to retain audit logs (30d, 1y, indefinite)?
    - Should audit logs themselves be shards or separate storage?

---

## Next Steps
- Answer open questions to lock MVP scope and SLAs.
- I will scaffold the new shard types, wire the ingestion connectors, and implement the project resolver API.

