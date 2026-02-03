# shard-manager

Full specification for the Shard Manager container.

## 1. Reference

### Purpose

Core data model: shards (e.g. c_opportunity, c_account, c_contact), shard types, relationships, edges, linking, versioning. Central source of business entities for risk, pipeline, integrations, AI, and analytics.

### Configuration

Main entries from `config/default.yaml`:

- **server:** `port` (3023), `host`
- **cosmos_db:** `endpoint`, `key`, `database_id`, `containers` (shards, shard_types, relationships, links)
- **cache:** `enabled`, `url` (Redis), `ttl`, `shard_type_ttl`
- **services:** `logging.url`, `user_management.url`
- **rabbitmq:** `url`, `exchange`, `queue`, `bindings` (shard.created/updated/deleted, shard.type.*, shard.relationship.*)
- **features:** `bulk_operations`, `relationships`, `versioning`, `caching`

### Environment variables

- `PORT`, `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `COSMOS_DB_DATABASE_ID`, `REDIS_URL`, `RABBITMQ_URL`
- `LOGGING_URL`, `USER_MANAGEMENT_URL`, `CACHE_ENABLED`, `CACHE_TTL`

### API

- Shard CRUD: POST/GET/PUT/DELETE `/api/v1/shards`, bulk operations.
- Shard types: POST/GET/PUT/DELETE `/api/v1/shard-types`.
- Relationships: POST/GET `/api/v1/shards/:id/relationships`.
- Health: `/health`, `/ready`.
- Full spec: [containers/shard-manager/openapi.yaml](../../containers/shard-manager/openapi.yaml) or docs/openapi.yaml in repo.

### Events

- **Published:** `shard.created`, `shard.updated`, `shard.deleted`, `shard.type.created/updated/deleted`, `shard.relationship.created/deleted`.
- **Consumed:** Same bindings for internal or cross-service sync.

### Dependencies

- **Downstream:** ml-service (buildVector), pipeline-manager, document-manager, search-service, ai-insights, analytics-service, collaboration-service, integration-manager, data-enrichment, risk-analytics, recommendations, integration-processors, workflow-orchestrator.
- **Upstream:** logging, user-management (config).

### Cosmos DB containers

- `shard_shards` (partition key: tenantId), `shard_shard_types`, `shard_relationships`, `shard_links`; optionally `shard_revisions`, `shard_edges` per architecture.

---

## 2. Architecture

- **Internal structure:** Shard CRUD services, shard-type service, relationship/link services, bulk operations, event publisher; Cosmos and Redis clients.
- **Data flow:** API → validation → Cosmos (with tenantId) → cache invalidation → RabbitMQ events.
- **Links:** [containers/shard-manager/README.md](../../containers/shard-manager/README.md), [containers/shard-manager/architecture.md](../../containers/shard-manager/architecture.md).

---

## 3. Deployment

- **Port:** 3023.
- **Health:** `/health`, `/ready`.
- **Scaling:** Stateless; scale horizontally.
- **Docker Compose service name:** `shard-manager`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Required on all mutations; all Cosmos queries use tenantId in partition key.
- **Partition key:** tenantId for shards, shard_types, relationships.

---

## 5. Links

- [containers/shard-manager/README.md](../../containers/shard-manager/README.md)
- [containers/shard-manager/config/default.yaml](../../containers/shard-manager/config/default.yaml)
- [containers/shard-manager/openapi.yaml](../../containers/shard-manager/openapi.yaml) or docs/openapi.yaml
