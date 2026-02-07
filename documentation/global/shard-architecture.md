# Shard Architecture

This document explains how the **shard** data model works in Castiel, how it is stored and consumed, and what benefits it provides.

---

## What Is a Shard?

A **shard** is the fundamental business entity in Castiel. All core objects (opportunities, accounts, contacts, activities, documents, etc.) are represented as shards. Instead of each service owning its own copy of “opportunity” or “contact” data, there is a **single, tenant-scoped source of truth** managed by the **shard-manager** service.

- **Shard** = one document (e.g. one opportunity, one account, one email).
- **Shard type** = the schema/category of that document (e.g. `c_opportunity`, `c_account`, `c_contact`).
- Shards can reference each other via **relationships** (e.g. opportunity → account, opportunity → contacts, opportunity → activities).

---

## How It Works

### 1. Storage and Partitioning

- **Container:** Shards are stored in Cosmos DB in the `shard_shards` container (name may be prefixed per environment).
- **Partition key:** `tenantId`. All shards for a tenant live in the same partition, which:
  - Enforces **tenant isolation** (queries always scoped by tenant).
  - Keeps cross-tenant data strictly separated.
- **Shard types** live in `shard_types` (partition key `tenantId`). Each type has a name (e.g. `c_opportunity`), a JSON schema for validation, and optional parent type (inheritance).

### 2. Shard Document Shape

Each shard document includes (conceptually):

| Field | Purpose |
|-------|---------|
| `id` | Unique shard ID (e.g. opportunity ID). |
| `tenantId` | Tenant isolation (partition key). |
| `shardTypeId` / `shardTypeName` | Type of entity (e.g. `c_opportunity`). |
| `structuredData` | Main business fields (Amount, StageName, CloseDate, AccountId, etc.), validated by the shard type schema. |
| `unstructuredData` | Free-form or rich content (e.g. notes, long text). |
| `metadata` | Tags, custom fields, redaction info. |
| `internal_relationships` | Links to other shards (e.g. `has_activity`, `has_contact`). |
| `external_relationships` | Links to external systems (CRM id, sync status). |
| `vectors` | Embeddings for semantic search (optional). |
| `enrichment` | Enrichment config and last-enriched state. |
| `status` | `active` \| `archived` \| `deleted` \| `draft`. |
| `source` | Origin: `ui`, `api`, `import`, `integration`, `system`. |
| `revisionId` / `revisionNumber` | Versioning. |
| `createdAt` / `updatedAt` / `lastActivityAt` | Timestamps. |
| `acl` | Access control entries. |

So: **one document per entity**, with structured + unstructured data, relationships, and optional embeddings/enrichment.

### 3. Relationships and Graph

- **Internal relationships** point from one shard to another (e.g. opportunity → account, opportunity → contact).
- **Relationship types** are named (e.g. `has_activity`, `has_contact`, `reports_to`). Risk and ML use these to traverse the graph (e.g. “all activities for this opportunity”, “stakeholder graph”).
- **Edges** can be stored in `shard_edges` (partition key `sourceId`) for efficient traversal.
- **Relationship metadata** is stored in `shard_relationships` (partition key `tenantId`).

Downstream services (e.g. ml-service `buildVectorForOpportunity`) call shard-manager APIs to get a shard by `id` and optionally related shards (e.g. by relationship type) to build features or run analytics.

### 4. Shard Types (Examples)

- **c_opportunity** – Sales opportunity (Amount, StageName, CloseDate, Probability, AccountId, OwnerId, etc.).
- **c_account** – Account/company.
- **c_contact** – Contact (e.g. linked to account, opportunity).
- **c_email**, **c_call**, **c_meeting** – Activity shards linked to opportunities via `has_activity` (or similar).
- **risk_catalog**, **action_catalog** – Catalog entities stored as shards.
- **c_competitor** – Tenant competitor master (name, segment, strengths, weaknesses, differentiation). Used with **c_opportunity_competitor** for competitive intelligence; risk-analytics can use shards when `features.competitors_use_shards` is enabled (new data written to shards; legacy containers remain for existing data).
- **c_opportunity_competitor** – Link shard: competitor detected on an opportunity (opportunityId, competitorId, mentionCount, sentiment, winLikelihood, detectedAt, lastMentionDate). Relationships to `c_opportunity` and `c_competitor`.
- **c_product** – Product catalog (name, description, category, status) with **goodFitIf** / **badFitIf** rule arrays for product-fit evaluation.
- **product_fit** – Product-fit assessment per opportunity/product (opportunityId, productId, score, dimensions, source, timestamp). Relationships to `c_opportunity` and `c_product`.
- **c_recommendation** – Recommendation entity (type, source, title, confidence, score, status, etc.); relationships to `c_opportunity`. Used when recommendations are dual-written to shards.
- Others (documents, projects, etc.) as defined by ShardType definitions.

Shard types are tenant-scoped: each tenant can have its own set of types and schemas (with system types as baseline). The types **c_competitor**, **c_opportunity_competitor**, **c_product**, **product_fit**, and **c_recommendation** are registered via a single bootstrap on shard-manager startup (config `bootstrap.enabled`, `bootstrap.tenant_id`, `bootstrap.created_by`).

### 5. Lifecycle and Events

- **CRUD:** Shard-manager exposes REST APIs (create, read, update, delete) and validates payloads against the shard type schema.
- **Versioning:** Revisions can be stored in `shard_revisions` for history and rollback.
- **Events:** On create/update/delete, shard-manager publishes events (e.g. `shard.created`, `shard.updated`, `shard.deleted`) to RabbitMQ. Downstream services (risk-analytics, data-enrichment, integration-processors, workflow-orchestrator, recommendations, ml-service, etc.) consume these to:
  - Recompute risk or forecasts.
  - Enrich or vectorize content.
  - Sync to external systems or run batch jobs.
  - Refresh recommendations.

So the flow is: **write once in shard-manager → event → many consumers**.

### 6. How Downstream Services Use Shards

- **risk-analytics:** Fetches opportunity shard (e.g. `GET /api/v1/shards/{opportunityId}`) to get `structuredData` (Amount, StageName, OwnerId, etc.) for risk evaluation, anomaly detection, and stakeholder graph (via relationships).
- **ml-service:** Uses shard-manager to build feature vectors (`buildVectorForOpportunity`): gets opportunity shard, optional account shard, and related activity/contact shards to compute features for risk-scoring, win-probability, and other models.
- **recommendations:** Fetches opportunity shard to extract features (amount, stage, probability, etc.) for ML-based recommendations.
- **forecasting:** Fetches opportunity shard for revenue and forecast logic.
- **integration-processors:** Create/update shards from CRM or other integrations (source = `integration`).
- **data-enrichment / ai-insights:** Read shards, enrich content (e.g. sentiment, entities), write back enrichment or store results in related containers; search and context use shard content and vectors.

All access is **config-driven** (service URL from config, no hardcoded endpoints), with **tenant context** (`X-Tenant-ID`, partition key) and **service-to-service auth** (e.g. JWT).

---

## Benefits

1. **Single source of truth**  
   One place for each entity (e.g. opportunity). Risk, ML, recommendations, forecasting, and integrations all read from the same shard instead of duplicating or reconciling data.

2. **Tenant isolation**  
   Partition key `tenantId` and enforced tenant headers ensure multi-tenancy at the data layer. Queries and events are always tenant-scoped.

3. **Schema flexibility**  
   Shard types and JSON schemas allow different entity shapes per tenant or use case while keeping a uniform storage and API model. New types (e.g. new activity types) can be added without changing every consumer.

4. **Event-driven updates**  
   Consumers react to `shard.created` / `shard.updated` / `shard.deleted` so that risk, ML, recommendations, and sync stay in sync with the canonical data without polling.

5. **Relationship graph**  
   Explicit relationships (e.g. `has_activity`, `has_contact`, `reports_to`) support graph traversal for stakeholder analysis, activity aggregation, and feature building (e.g. activity_count_30d, stakeholder_count) without each service re-implementing linking logic.

6. **Unified model for AI and analytics**  
   Embeddings, enrichment, and structured data live on the same document. Search, context assembly, and ML feature pipelines can all use the same shard APIs and event stream.

7. **Audit and versioning**  
   Revisions and event publishing support audit trails and optional rollback, and integrate with the logging and compliance requirements of the platform.

---

## Summary

| Aspect | Detail |
|--------|--------|
| **What** | Shards = core business entities (opportunities, accounts, contacts, activities, etc.); one document per entity in Cosmos DB. |
| **Where** | `shard_shards` (and related containers: `shard_types`, `shard_edges`, `shard_relationships`, `shard_revisions`), managed by **shard-manager**. |
| **Partition** | `tenantId` for isolation and efficient tenant-scoped queries. |
| **How consumed** | REST APIs (e.g. `GET /api/v1/shards/:id`), config-driven URLs, tenant headers; RabbitMQ events for reactive updates. |
| **Benefits** | Single source of truth, tenant isolation, schema flexibility, event-driven propagation, relationship graph, unified model for AI/analytics, audit/versioning. |

For implementation details, API specs, and event contracts, see the **shard-manager** container documentation (e.g. `containers/shard-manager/architecture.md`, `containers/shard-manager/openapi.yaml`, and `documentation/containers/shard-manager.md`).
