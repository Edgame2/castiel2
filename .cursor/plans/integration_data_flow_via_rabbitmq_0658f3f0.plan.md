---
name: ""
overview: ""
todos: []
isProject: false
---

---

name: Integration Data Flow via RabbitMQ

overview: Refactor integration data flow to use RabbitMQ queuing for async mapping, storage, and vectorization. Verify all integration credentials use Secret Management Service. Implement dedicated mapping consumer that processes raw integration data, applies field mappings, and stores to shards.

todos:

        - id: audit-secret-management

content: Audit all integration credential access to verify Secret Management Service usage - check IntegrationConnectionService, IntegrationService, IntegrationSyncService, and all adapters

status: pending

        - id: create-secret-management-report

content: Create documentation/report of secret management usage patterns and any gaps found

status: pending

        - id: publish-raw-data-events

content: Update IntegrationSyncService.executeSyncTask() to publish integration.data.raw events for each fetched record instead of directly storing

status: pending

        - id: create-field-mapper-service

content: Create FieldMapperService to apply field mappings from integration.syncConfig.entityMappings, handle nested fields, and data type conversions

status: pending

        - id: create-integration-processors-container

content: Create new containers/integration-processors container with directory structure, package.json, Dockerfile, HTTP server (health/metrics/suggested-links API), and consumer starter

status: pending

        - id: create-crm-mapping-consumer

content: Create CRMDataMappingConsumer in integration-processors that consumes integration.data.raw events, applies field mappings, calculates simple ML fields, and stores shards via shard-manager API

status: pending

        - id: create-ml-field-aggregation-consumer

content: Create MLFieldAggregationConsumer in integration-processors that consumes shard.created (Opportunity), calculates relationship counts (documentCount, emailCount, etc.), and updates opportunity shards

status: pending

        - id: create-entity-linking-service

content: Create EntityLinkingService in packages/shared/src/services/EntityLinkingService.ts with fast linking (during shard creation) and deep linking (async) strategies, confidence thresholds (80% auto, 60% suggest)

status: pending

        - id: create-entity-linking-consumer

content: Create EntityLinkingConsumer in integration-processors that consumes shard.created (Document, Email, Message, Meeting) and performs deep entity linking

status: pending

        - id: create-periodic-ml-field-recalculation

content: Create MLFieldRecalculationJob in integration-processors with node-cron (daily at 2 AM) to publish ml_field_aggregation.recalculate events for active opportunities

status: pending

        - id: create-suggested-links-container

content: Create Cosmos DB container suggested_links for storing suggested links (60-80% confidence) with TTL 30 days, partition key tenantId

status: pending

        - id: create-suggested-links-api

content: "Create API endpoints in integration-processors for suggested links: GET /api/v1/suggested-links, POST /api/v1/suggested-links/:id/approve, POST /api/v1/suggested-links/:id/reject"

status: pending

        - id: implement-startup-sequence

content: Implement startup sequence in integration-processors: load config, initialize dependencies, wait for RabbitMQ/Shard Manager (with retries), ensure shard types, start HTTP server, start consumers, start periodic jobs

status: pending

        - id: update-docker-compose-processors

content: Update docker-compose.yml with two separate services: integration-processors-light and integration-processors-heavy with different resource allocations

status: pending

        - id: implement-opportunity-event-debouncer

content: Implement OpportunityEventDebouncer using in-memory Map per consumer instance (per opportunity, 5-second window, flush on timer or shutdown)

status: pending

        - id: implement-ensure-shard-types

content: Implement ensureShardTypes() function that runs on service startup to create/update all shard types (idempotent, version-controlled)

status: pending

        - id: create-shard-type-definitions

content: Create shardTypeDefinitions.ts with all shard type definitions (Document, Email, Message, Meeting, CalendarEvent, etc.) with schemaVersion

status: pending

        - id: setup-consumer-deployment-config

content: "Set up consumer deployment configuration: single container image with CONSUMER_TYPE environment variable (light/heavy/all) for different resource allocations"

status: pending

        - id: implement-custom-transforms

content: Implement custom transform loading from integration config (built-in transforms at startup, custom transforms loaded dynamically per integration)

status: pending

        - id: create-terraform-infrastructure

content: Create Terraform files for Azure Blob Storage and Cognitive Services (Computer Vision, Speech Services) in infrastructure/terraform/integration-infrastructure.tf

status: pending

        - id: setup-azure-infrastructure

content: "Set up Azure Blob Storage (containers: integration-documents, integration-recordings, integration-attachments) and Azure Cognitive Services (Computer Vision, Speech Services) in Phase 1"

status: pending

        - id: setup-all-rabbitmq-queues

content: "Create all RabbitMQ queues upfront: integration_data_raw, integration_documents, integration_communications, integration_meetings, integration_events, shard_ml_aggregation"

status: pending

        - id: update-vectorization-consumer

content: Update data-enrichment vectorization consumer to only vectorize Document, Email, Meeting, Message shards (not Opportunity, Account, Contact)

status: pending

        - id: verify-shard-events

content: Verify shard-manager publishes shard.created and shard.updated events - implement if missing

status: pending

        - id: update-sync-tracking

content: Update IntegrationSyncService to track mapping completion via integration.data.mapped events and update sync execution stats

status: pending

        - id: add-event-schemas

content: Add integration.data.raw, integration.data.mapped, and integration.data.mapping.failed event schemas to logs-events.md

status: pending

        - id: add-mapping-config

content: Add mapping configuration options to integration-sync config schema (queue name, batch size, retry attempts, timeout)

status: pending

        - id: write-field-mapper-tests

content: Write unit tests for FieldMapperService covering field mapping, nested fields, data types, and transform functions

status: pending

        - id: write-mapping-consumer-tests

content: Write unit tests for IntegrationDataMappingConsumer covering event consumption, mapping application, and error handling

status: pending

        - id: write-integration-flow-tests

content: ""

status: pending

        - id: update-documentation

content: Update README.md and CHANGELOG.md with async data flow architecture, field mapping configuration, and event flow diagrams

status: pending

        - id: implement-super-admin-catalog-api

content: Implement integration catalog management API endpoints in integration-manager (GET/POST/PUT/DELETE /api/v1/admin/integrations/catalog)

status: pending

        - id: implement-super-admin-shard-types-api

content: Implement shard type management API endpoints in shard-manager (GET/POST/PUT /api/v1/admin/shard-types, validate, stats)

status: pending

        - id: implement-super-admin-settings-api

content: Implement system settings API endpoints in integration-manager (rate limits, capacity, feature flags)

status: pending

        - id: implement-super-admin-monitoring-api

content: Implement system monitoring API endpoints in integration-processors (health, queues, processors, integrations, errors, performance)

status: pending

        - id: implement-tenant-connections-api

content: Implement integration connections API endpoints in integration-manager (connect, disconnect, test, OAuth URL)

status: pending

        - id: implement-sync-config-api

content: Implement sync configuration API endpoints in integration-manager (get/update sync config, trigger sync, sync history)

status: pending

        - id: implement-field-mappings-api

content: Implement field mapping configuration API endpoints in integration-manager (get/update mappings, external/internal fields, transform functions, test, import/export)

status: pending

        - id: implement-entity-linking-config-api

content: Implement entity linking configuration API endpoints in integration-processors (settings, suggested links, linking rules)

status: pending

        - id: implement-processing-settings-api

content: Implement data processing settings API endpoints in integration-processors (document, email, meeting processing config)

status: pending

        - id: implement-integration-health-api

content: Implement integration health and monitoring API endpoints in integration-manager (health, sync history, errors, data quality, performance)

status: pending

        - id: implement-super-admin-ui

content: Implement Super Admin UI pages (integration catalog, shard types, system settings, monitoring dashboard)

status: pending

        - id: implement-tenant-connections-ui

content: Implement Tenant Admin UI for integration connections (overview, connect, disconnect, test)

status: pending

        - id: implement-sync-config-ui

content: Implement Tenant Admin UI for sync configuration (entity selection, schedule, direction, filters)

status: pending

        - id: implement-field-mappings-ui

content: Implement Tenant Admin UI for field mapping configuration (editor, tester, import/export)

status: pending

        - id: implement-entity-linking-ui

content: Implement Tenant Admin UI for entity linking configuration (settings, suggested links review, manual rules)

status: pending

        - id: implement-processing-settings-ui

content: Implement Tenant Admin UI for data processing settings (document, email, meeting processing)

status: pending

        - id: implement-integration-health-ui

content: Implement Tenant Admin UI for integration health and monitoring (health dashboard, sync history, error logs, metrics)

status: pending

        - id: create-shared-ui-components

content: Create shared UI components library (IntegrationLogo, StatusBadge, SyncStatusIndicator, ConfidenceScore, EntityPreview, MetricCard, etc.)

status: pending

        - id: create-typescript-interfaces-config

content: Create TypeScript interfaces for configuration system (IntegrationType, TenantIntegration, SyncConfig, EntityMapping, FieldMapping, EntityLinkingSettings, DataProcessingSettings, etc.)

status: pending

        - id: implement-dlq

content: Configure dead-letter queue (DLQ) for integration_data_raw queue with retry logic and DLQ monitoring

status: pending

        - id: implement-idempotency

content: Add idempotency key generation and checking in mapping consumer to prevent duplicate processing

status: pending

        - id: implement-batch-processing

content: Add support for batch events (integration.data.raw.batch) for efficient processing of large syncs

status: pending

        - id: implement-config-caching

content: Add Redis caching for integration configs with cache invalidation on integration updates

status: pending

        - id: implement-retry-strategy

content: Implement exponential backoff retry strategy with circuit breaker for shard-manager API calls

status: pending

        - id: add-monitoring-metrics

content: Add Prometheus metrics for integration data flow (published, mapped, failures, queue depth, duration)

status: pending

        - id: configure-prefetch

content: Configure RabbitMQ prefetch settings for mapping consumer based on processing time

status: pending

        - id: add-field-mapper-extensibility

content: "Add plugin system for custom transformers: built-in transforms registered at startup, custom transforms loaded from integration config dynamically"

status: pending

        - id: refactor-integration-sync-immediately

content: Refactor IntegrationSyncService immediately to publish events (no feature flag, can break in development) - remove direct shard creation, add queue routing logic

status: pending

        - id: publish-opportunity-events

content: Add opportunity event publishing in mapping consumer after storing opportunity shards (integration.opportunity.updated and batch events)

status: pending

        - id: update-risk-consumer-batch

content: Update RiskAnalyticsEventConsumer to handle integration.opportunities.updated.batch events and process opportunities in parallel

status: pending

        - id: update-forecast-consumer-integration

content: Update ForecastEventConsumer to handle integration.opportunity.updated events and ensure sequential processing after risk evaluation

status: pending

        - id: update-recommendations-consumer-integration

content: Update RecommendationEventConsumer to handle integration.opportunity.updated events and ensure sequential processing after risk and forecast

status: pending

        - id: create-all-shard-types

content: "Create all shard types upfront in Phase 1: Update Opportunity, verify Account/Contact/Lead, create Document, Email, Message, Meeting, CalendarEvent (Activity/Interaction optional)"

status: pending

        - id: create-typescript-interfaces

content: Create TypeScript interfaces for all shard types in packages/shared/src/types/shards/ with all StructuredData interfaces

status: pending

        - id: implement-shard-validator

content: Implement ShardValidator with configurable strictness (strict/lenient/audit) for validation before shard creation

status: pending

        - id: implement-opportunity-significant-change-detection

content: Implement significant change detection in CRMDataMappingConsumer - only publish opportunity.updated for significant field changes (stage, amount, closeDate, probability, status, ML fields)

status: pending

        - id: implement-opportunity-event-debouncing

content: Implement debouncing for opportunity events - group multiple entity links within 5-second window per opportunity using Redis

status: completed

isProject: false

---

# Integration Data Flow via RabbitMQ Implementation Plan

**Last Updated:** January 28, 2025

**Status:** 📋 Implementation Plan - Updated for Multi-Modal Architecture

**Related Documents:**

- `INTEGRATION_SHARD_TYPES_ARCHITECTURE.md` - Complete shard type definitions
- `MULTI_MODAL_INTEGRATION_PLAN_SHARD_BASED.md` - Multi-modal implementation plan
- `integrations.md` - Integration architecture recommendations
- `INTEGRATION_CONFIGURATION_UI_API_PLAN.md` - Complete configuration UI/API specifications

## Plan Alignment with Specifications

This plan has been updated to align with the multi-modal integration architecture specifications:

1. **Shard-Based Storage**: All integration data (CRM, Documents, Emails, Messages, Meetings, Calendar Events) MUST be stored as shards with `structuredData` field
2. **Specialized Processors**: Different processors for different data types (CRM Mapping Consumer, Document Processor, Email Processor, etc.)
3. **Multi-Queue Architecture**: Separate RabbitMQ queues per data type for independent scaling
4. **Entity Linking**: Automatic linking of documents, emails, meetings to CRM entities (opportunities, accounts, contacts)
5. **Activity Aggregation**: Unified activity tracking across all interaction types

**Implementation Strategy**: Complete multi-modal foundation from day 1, but phased delivery:

- **Phase 1 (Weeks 1-2)**: Foundation + CRM (all shard types, queues, infrastructure, CRM processors)
- **Phase 2 (Weeks 2-3)**: Documents (processor, blob storage, text extraction, entity linking)
- **Phase 3 (Weeks 3-4)**: Communications (Email + Message processors)
- **Phase 4 (Weeks 4-5)**: Meetings & Calendar (Meeting processor, transcription, CalendarEvent processor)
- **Phase 5 (Weeks 5-6)**: Entity Linking & Activities (deep linking, activity aggregation)
- **Phase 6 (Weeks 6-7)**: Testing & Refinement

## Key Decisions from Final Answers

Based on `INTEGRATION_FINAL_QUESTIONS_ANSWERS.md`:

1. **Processor Container**: Create new `containers/integration-processors` container (separate from `integration-sync`)

            - All processors (CRM, Document, Email, Message, Meeting, Event) in new container
            - EntityLinkingConsumer and MLFieldAggregationConsumer in new container
            - HTTP server for health checks, metrics, and suggested links API
            - Startup logic (ensureShardTypes, dependency checks) in new container
            - Periodic jobs (ML field recalculation cron) in new container

2. **Service Structure**: Minimal HTTP server (health checks, metrics, suggested links API) + RabbitMQ consumers
3. **Docker Compose**: Two separate services (`integration-processors-light` and `integration-processors-heavy`) with different resource allocations
4. **Periodic ML Field Recalculation**: Cron job directly in `integration-processors` container (not workflow-orchestrator)
5. **Suggested Links API**: Located in `integration-processors` container (routes: `/api/v1/suggested-links`)
6. **Entity Linking Consumer**: Located in `integration-processors` container (same as other processors)
7. **ML Field Aggregation Consumer**: Located in `integration-processors` container (same as other processors)
8. **Startup Order**: Sequential startup with health checks (wait for RabbitMQ/Shard Manager, ensure shard types, start HTTP server, start consumers)
9. **Error Handling**: Retry with exponential backoff for missing shard types (3 attempts, fail fast on startup, on-the-fly creation at runtime)

## Key Decisions from Previous Answers

Based on `INTEGRATION_QUESTIONS_ANSWERS_PART1.md` and `INTEGRATION_QUESTIONS_ANSWERS_PART2.md`:

1. **ML Fields**: Hybrid approach - simple fields (daysInStage, daysSinceLastActivity, dealVelocity) calculated during mapping, relationship counts (documentCount, emailCount, etc.) calculated async by MLFieldAggregationConsumer
2. **Shard Types**: Create ALL shard types upfront in Phase 1 (Week 1, Days 1-2) before processors
3. **Schema Evolution**: All new fields optional, lazy migration (populate on next sync)
4. **Processors**: Specialized processors from day 1 (CRMDataMappingConsumer, DocumentProcessorConsumer, etc.)
5. **Queues**: Separate queues per data type (6 queues total)
6. **Document Processing**: Synchronous for small docs (< 5MB), async for large (>= 5MB)
7. **Entity Linking**: Hybrid - fast linking (explicit reference, participant matching) during shard creation, deep linking (LLM, vector similarity) async
8. **Confidence Thresholds**: Conservative - auto-link >= 80%, suggest 60-80%, ignore < 60%
9. **Opportunity Events**: Only publish on significant changes (stage, amount, closeDate, probability, status, ML fields)
10. **Vectorization**: Only for Document, Email, Meeting, Message shards (not CRM shards)
11. **Infrastructure**: Azure Blob Storage + Cognitive Services set up in Phase 1
12. **Processing**: Dedicated consumer instances for heavy processing (Document, Meeting)
13. **Test Data**: Synthetic for unit tests, real sanitized for integration tests
14. **Validation**: Configurable strictness (strict/lenient/audit)
15. **Migration**: Lazy migration for existing shards, direct refactoring for IntegrationSyncService (no feature flag)

## Current State Analysis

### What's Implemented ✅

1. **Secret Management Integration**:

                                                - `IntegrationConnectionService` stores OAuth tokens in Secret Management Service
                                                - `IntegrationService` uses Secret Management Service
                                                - Credentials stored via `secretManagementClient.post('/api/v1/secrets/...')`

2. **RabbitMQ Event Publishing**:

                                                - Integration-sync publishes: `integration.sync.started`, `integration.sync.completed`, `integration.sync.failed`, `integration.data.synced`
                                                - Integration-manager publishes: `integration.sync.scheduled`, `integration.token.refresh-requested`

3. **Event Consumption for Vectorization**:

                                                - `data-enrichment` consumes `shard.created` and `shard.updated` events
                                                - `risk-analytics` consumes `shard.updated` events
                                                - `integration-sync` consumes `shard.updated` for bidirectional sync

### What's Missing ❌

1. **Async Data Flow**:

                                                - Integration data is NOT published to RabbitMQ for async processing
                                                - Current flow: `fetch → transform → store` (synchronous, direct API calls)
                                                - No `integration.data.raw` event published

2. **Field Mapping Application**:

                                                - `IntegrationSyncService.transformToShard()` does basic transformation only
                                                - Does NOT use `integration.syncConfig.entityMappings[].fieldMappings`
                                                - Field mappings documented but not applied

3. **Dedicated Mapping Consumer**:

                                                - No RabbitMQ consumer for processing raw integration data
                                                - No service that applies field mappings and stores to shards

4. **Shard Event Publishing**:

                                                - Shard-manager documentation says it publishes `shard.created`/`shard.updated` but code may not implement it
                                                - Need to verify and ensure events are published

5. **Secret Management Audit**:

                                                - Need to verify ALL credential access goes through Secret Management
                                                - No hardcoded credentials or direct storage

## Implementation Tasks

### Phase 0: Foundation Setup (Week 1 - Days 1-2)

#### 0.1 Create All Shard Types Upfront

**Decision**: Create ALL shard types in Phase 1 (Week 1, Days 1-2) before any processors are built.

**Files**:

- `containers/integration-processors/src/startup/ensureShardTypes.ts` (new)
- `containers/integration-processors/src/startup/shardTypeDefinitions.ts` (new)
- `packages/shared/src/types/shards/` (TypeScript interfaces)

**Note**: The `integration-processors` container will be created in Phase 2 (Section 2.2). Shard types are created on container startup via `ensureShardTypes()` function.

**Shard Types to Create/Update**:

**CRM Shards (Updates)**:

- **Opportunity**: Update with ML fields and integration tracking
                                - ML fields: `daysInStage`, `daysSinceLastActivity`, `dealVelocity`, `competitorCount`, `stakeholderCount`, `documentCount`, `emailCount`, `meetingCount`, `callCount` (all optional)
                                - Integration tracking: `integrationSource`, `externalId`, `lastSyncedAt`, `syncStatus`
- **Account**: Verify/add integration tracking fields
- **Contact**: Verify/add integration tracking and engagement fields
- **Lead**: Verify/add integration tracking fields

**Multi-Modal Shards (New)**:

- **Document**: Create new shard type (see `INTEGRATION_SHARD_TYPES_ARCHITECTURE.md` Part 2.1)
- **Email**: Create new shard type (see Part 3.1)
- **Message**: Create new shard type (see Part 3.3)
- **Meeting**: Create new shard type (see Part 4.1)
- **CalendarEvent**: Create new shard type (see Part 5.1)
- **Activity**: Create new shard type (see Part 6.1) - optional, can defer
- **Interaction**: Create new shard type (see Part 6.2) - optional, can defer

**Implementation**:

- Create `ensureShardTypes()` function that runs on service startup
- Check if shard type exists (by name), create if missing
- Update if schema version changed
- Idempotent (safe to run multiple times)
- Fail startup if shard types can't be created

**TypeScript Interfaces** (Week 1, Days 3-5):

- Define all `StructuredData` interfaces in `packages/shared/src/types/shards/`
- Define all `Shard` interfaces
- Generate JSON schemas for validation
- Export types for use in processors

**Schema Strategy**: All new fields are **optional** (TypeScript: `field?: type`)

- Existing shards continue working without changes
- New fields populated on next sync (lazy migration)
- Schema versioning: Track `schemaVersion` in shard type definition
- Auto-update shard types if schema version changes

**Reference**: `INTEGRATION_SHARD_TYPES_ARCHITECTURE.md` for complete schemas, `INTEGRATION_ADDITIONAL_QUESTIONS_ANSWERS.md` Section 7 for implementation pattern

#### 0.2 Set Up Azure Infrastructure

**Decision**: Create Azure infrastructure via Terraform/Infrastructure as Code in Phase 1 (Day 1).

**Terraform Files**: `infrastructure/terraform/integration-infrastructure.tf`

**Azure Blob Storage**:

- Storage Account: `castielintegrations{env}`
- Containers:
                                - `integration-documents` (documents from Google Drive, SharePoint, etc.)
                                - `integration-recordings` (meeting recordings)
                                - `integration-attachments` (email attachments)
- Configuration: Private access, SAS tokens for download
- Retention: Documents (365 days), Recordings (90 days), Attachments (180 days)
- Store connection string in Key Vault

**Azure Cognitive Services**:

- **Computer Vision** (OCR): For image text extraction, scanned PDFs
                                - SKU: S1 (Standard)
                                - Store API key in Key Vault
- **Speech Services** (Transcription): For meeting transcription with speaker diarization
                                - SKU: S0 (Standard)
                                - Store API key in Key Vault

**Reference**: See `INTEGRATION_QUESTIONS_ANSWERS_PART2.md` Section 6.1, 6.2 and `INTEGRATION_ADDITIONAL_QUESTIONS_ANSWERS.md` Section 10 for Terraform setup

#### 0.3 Set Up All RabbitMQ Queues

**Decision**: Create separate queues per data type for independent scaling.

**Queues to Create**:

1. `integration_data_raw` - CRM entities (prefetch: 20, TTL: 24h)
2. `integration_documents` - Documents (prefetch: 5, TTL: 48h, max message size: 10MB)
3. `integration_communications` - Emails + Messages (prefetch: 10, TTL: 24h)
4. `integration_meetings` - Meetings (prefetch: 3, TTL: 72h, max message size: 10MB)
5. `integration_events` - Calendar events (prefetch: 15, TTL: 24h)
6. `shard_ml_aggregation` - ML field calculation triggers (prefetch: 10, TTL: 24h)

**All queues**: Durable, persistent messages, DLQ configured, circuit breaker protection

**Reference**: See `INTEGRATION_QUESTIONS_ANSWERS_PART2.md` Section 2.2 for queue configuration

### Phase 1: Secret Management Audit & Verification (Week 1)

#### 1.1 Audit Integration Credential Access

**Files to Review**:

- `containers/integration-manager/src/services/IntegrationConnectionService.ts`
- `containers/integration-manager/src/services/IntegrationService.ts`
- `containers/integration-sync/src/services/IntegrationSyncService.ts`
- All adapter implementations (when created)

**Actions**:

- Verify all OAuth tokens stored via Secret Management Service
- Verify all API keys stored via Secret Management Service
- Verify no hardcoded credentials in code
- Verify no direct Cosmos DB credential storage
- Document any gaps found

#### 1.2 Create Secret Management Usage Report

**File**: `documentation/integrations/secret-management-usage.md`

- Document all credential storage locations
- Document all credential retrieval patterns
- List any exceptions or gaps
- Create checklist for future integrations

### Phase 2: Implement Async RabbitMQ Data Flow for CRM (Week 1-2)

**Scope**: This phase focuses on CRM entities (Opportunities, Accounts, Contacts). Multi-modal data types (Documents, Emails, Meetings) will be added in Phase 3+.

**Decision**: Refactor `IntegrationSyncService` immediately (no feature flag, can break in development).

**Consumer Deployment**: Single container image (`integration-processors`) with `CONSUMER_TYPE` environment variable:

- `light`: CRMDataMappingConsumer, EmailProcessorConsumer, MessageProcessorConsumer, EventProcessorConsumer
                                - Resources: 0.5 CPU, 1GB memory (Docker Compose) or equivalent in Azure Container Apps
- `heavy`: DocumentProcessorConsumer, MeetingProcessorConsumer
                                - Resources: 2 CPU, 4GB memory (Docker Compose) or equivalent in Azure Container Apps
- `all`: All consumers (for development)
- Same Docker image, different environment variable controls which consumers run
- Different resource allocations per deployment type

**Reference**: See `INTEGRATION_ADDITIONAL_QUESTIONS_ANSWERS.md` Section 1 for deployment configuration

#### 2.1 Update Integration Sync Service to Publish Raw Data

**File**: `containers/integration-sync/src/services/IntegrationSyncService.ts`

**Changes**:

- In `executeSyncTask()`, after fetching data from integration-manager:
                                - Support both single-record and batch events based on config
                                - For large syncs (>100 records): publish `integration.data.raw.batch` events with arrays of records
                                - For small syncs or webhooks: publish `integration.data.raw` events for individual records
                                - Generate idempotency key: `${integrationId}-${externalId}-${syncTaskId}` for each record
                                - Event payload: `{ integrationId, tenantId, entityType, rawData, externalId, syncTaskId, idempotencyKey, metadata, correlationId }`
                                - Keep sync execution tracking (recordsProcessed, etc.) but update after mapping consumer completes

**New Event Types**:

- `integration.data.raw` - Single raw record fetched from external system
                                - Contains: `integrationId`, `tenantId`, `entityType`, `rawData`, `externalId`, `syncTaskId`, `idempotencyKey`, `correlationId`, `metadata`
- `integration.data.raw.batch` - Batch of raw records (for large syncs)
                                - Contains: `integrationId`, `tenantId`, `entityType`, `records[]`, `syncTaskId`, `correlationId`, `batchSize`, `metadata`
                                - Each record in batch has its own `idempotencyKey`

#### 2.2 Create Integration Processors Container

**Decision**: Create new `containers/integration-processors` container from scratch (based on standard template).

**Directory Structure**:

```
containers/integration-processors/
├── src/
│   ├── consumers/
│   │   ├── CRMDataMappingConsumer.ts
│   │   ├── DocumentProcessorConsumer.ts
│   │   ├── EmailProcessorConsumer.ts
│   │   ├── MessageProcessorConsumer.ts
│   │   ├── MeetingProcessorConsumer.ts
│   │   ├── EventProcessorConsumer.ts
│   │   ├── EntityLinkingConsumer.ts
│   │   └── MLFieldAggregationConsumer.ts
│   ├── services/
│   │   ├── BlobStorageService.ts
│   │   ├── OCRService.ts
│   │   ├── TranscriptionService.ts
│   │   ├── TextExtractionService.ts
│   │   └── SuggestedLinksService.ts
│   ├── routes/
│   │   ├── health.routes.ts           (Health checks)
│   │   ├── metrics.routes.ts          (Prometheus metrics)
│   │   └── suggestedLinks.routes.ts   (Suggested links API)
│   ├── jobs/
│   │   └── mlFieldRecalculation.ts    (Cron job)
│   ├── startup/
│   │   ├── ensureShardTypes.ts
│   │   └── shardTypeDefinitions.ts
│   └── index.ts
├── package.json
├── Dockerfile
└── config/
    ├── default.yaml
    └── schema.json
```

**Service Structure**: Minimal HTTP server (health checks, metrics, suggested links API) + RabbitMQ consumers

**HTTP Server Endpoints**:

- `GET /health` - Health check (required for container orchestration)
- `GET /metrics` - Prometheus metrics
- `GET /ready` - Readiness check (dependencies healthy)
- `GET /api/v1/suggested-links` - Get pending suggested links
- `POST /api/v1/suggested-links/:id/approve` - Approve suggested link
- `POST /api/v1/suggested-links/:id/reject` - Reject suggested link

**Startup Sequence**:

1. Load configuration (env vars, config files)
2. Initialize dependencies (create clients)
3. Wait for RabbitMQ to be ready (with retries, max 30 attempts, 2s delay)
4. Wait for Shard Manager to be ready (with retries)
5. Ensure shard types exist (create if missing, update if schema version changed)
6. Start HTTP server (health checks available immediately)
7. Start consumers (based on CONSUMER_TYPE)
8. Start periodic jobs (ML field recalculation, only in 'light' or 'all' mode)

**Error Handling for Missing Shard Types**:

- Retry with exponential backoff (3 attempts, 1s base delay)
- If startup fails, fail fast (don't start consumers)
- If shard type missing at runtime (edge case), try to create it on-the-fly
- If still fails, send message to DLQ for manual review

**Reference**: See `INTEGRATION_FINAL_QUESTIONS_ANSWERS.md` Sections 1, 2, 6, 9, 10 for complete implementation details

#### 2.3 Create CRM Data Mapping Consumer

**File**: `containers/integration-processors/src/consumers/CRMDataMappingConsumer.ts`

**Decision**: Specialized processor for CRM data (not generic mapping consumer). Other processors (Document, Email, etc.) will be created in later phases.

**Responsibilities**:

- Consume `integration.data.raw` and `integration.data.raw.batch` events from `integration_data_raw` queue
- **Idempotency Check**: Check if `idempotencyKey` already processed (Redis/Cosmos lookup)
                                - If processed: ack message without reprocessing
                                - If not: continue processing and mark as processed
- **Config Caching**: Get integration config from cache (Redis, TTL: 5-10 min)
                                - Cache key: `integration_config:${integrationId}:${tenantId}`
                                - Cache miss: fetch from integration-manager, store in cache
                                - Invalidate cache on integration update events
- **Field Mapping**: Apply field mappings using `FieldMapperService`
                                - Get entity mapping from `integration.syncConfig.entityMappings[]`
                                - Use `entityMapping.shardTypeId` and `entityMapping.shardTypeName` (NOT catalog shardMappings)
                                - Transform raw data to shard `structuredData` format
- **ML Field Calculation (Hybrid Approach)**:
                                - **During Mapping (Synchronous)**: Calculate simple ML fields
                                                                - `daysInStage`: From current stage + lastStageChangeDate
                                                                - `daysSinceLastActivity`: From lastActivityDate
                                                                - `dealVelocity`: From stage progression history
                                                                - `competitorCount`: Count from relationships if < 10 (otherwise set to 0, updated async)
                                                                - `stakeholderCount`: Count from relationships if < 10 (otherwise set to 0, updated async)
                                - **After Mapping (Asynchronous)**: Set count fields to 0 initially
                                                                - `documentCount`: 0 (updated by MLFieldAggregationConsumer)
                                                                - `emailCount`: 0 (updated by MLFieldAggregationConsumer)
                                                                - `meetingCount`: 0 (updated by MLFieldAggregationConsumer)
                                                                - `callCount`: 0 (updated by MLFieldAggregationConsumer)
- **Shard Validation**: Validate mapped data with configurable strictness
                                - Development: Strict (reject on errors/warnings)
                                - Production: Lenient (log warnings, continue)
- **Batch Processing**: For batch events, process records in parallel (configurable concurrency)
- Store transformed shard via shard-manager API (with circuit breaker)
- **Fast Entity Linking**: Apply fast linking strategies during shard creation
                                - Strategy 1: Explicit Reference (100% confidence)
                                - Strategy 2: Participant Matching (80-90% confidence) - for Account/Contact
                                - Create high-confidence relationships immediately
- **Publish Opportunity Events (Significant Changes Only)**:
                                - **For New Opportunities**: Always publish `integration.opportunity.created`
                                - **For Updates**: Only publish `integration.opportunity.updated` if significant fields changed:
                                                                - Significant fields: `stage`, `amount`, `closeDate`, `probability`, `status`
                                                                - ML fields: `documentCount`, `emailCount`, `meetingCount`, `stakeholderCount`
                                - **For Large Syncs**: Batch opportunity events (see event batching below)
- **Retry Logic**: Exponential backoff (1s, 2s, 4s, 8s) for transient errors
                                - Max retries: 3
                                - Retry on: network errors, 5xx errors, rate limits
                                - Don't retry on: 4xx errors, validation errors
- Publish `integration.data.mapped` event on success
- Handle errors and publish `integration.data.mapping.failed` event
- **DLQ**: After max retries, nack message (goes to DLQ)

**Event Batching for Opportunity Updates**:

- **Small Syncs** (< `config.mapping.opportunity_batch_threshold`, default: 100):
                                - Publish `integration.opportunity.updated` immediately for each opportunity (if significant changes)
                                - Allows real-time processing
- **Large Syncs** (>= threshold):
                                - Collect opportunity IDs in memory (only for opportunities with significant changes)
                                - Publish `integration.opportunities.updated.batch` event when:
                                                                - Batch size reached (default: 50 opportunities)
                                                                - Or sync completes (flush remaining)
                                - Payload: `{ integrationId, tenantId, opportunityIds[], syncTaskId, correlationId, batchSize, changedFields[] }`
                                - Reduces RabbitMQ message volume while maintaining parallel processing
- **Debouncing**: In-memory Map per consumer instance (per opportunity, 5-second window)
                                - Group multiple entity links to same opportunity within 5 seconds
                                - Flush on timer expiration or service shutdown
                                - Simple implementation, no Redis dependency
                                - Scope: Per opportunity (not per tenant or integration)

**Reference**: See `INTEGRATION_ADDITIONAL_QUESTIONS_ANSWERS.md` Sections 6 and 9 for debouncing implementation

**Dependencies**:

- `IntegrationService` (from integration-manager) - Get integration config (with caching)
- `FieldMapperService` (from @castiel/shared) - Apply field mappings
- `ShardManagerClient` (from @castiel/shared) - Store shards (with circuit breaker)
- `EventPublisher` (from @castiel/shared) - Publish mapping and opportunity events
- `EntityLinkingService` (from @castiel/shared) - Fast entity linking during shard creation
- `RedisClient` - Idempotency tracking and config caching
- `CircuitBreaker` - Protect against cascading failures

**Configuration**:

- `prefetch`: 20 (configurable based on processing time)
- `batch_concurrency`: 10 (parallel processing for batch events)
- `idempotency_ttl`: 86400 (24 hours)
- `config_cache_ttl`: 600 (10 minutes)
- `opportunity_batch_threshold`: 100 (switch to batch events)
- `opportunity_batch_size`: 50 (opportunities per batch event)
- `batch_concurrency`: 10 (parallel processing for batch events)
- `idempotency_ttl`: 86400 (24 hours)
- `config_cache_ttl`: 600 (10 minutes)
- `circuit_breaker_threshold`: 5 (failure threshold)
- `circuit_breaker_timeout`: 60000 (timeout in ms)

#### 2.5 Create Field Mapper Service

**File**: `packages/shared/src/services/FieldMapperService.ts` (shared library)

**Responsibilities**:

- Apply field mappings from `integration.syncConfig.entityMappings[].fieldMappings`
- **Shard Type Determination**: Use `entityMapping.shardTypeId` and `entityMapping.shardTypeName` (NOT catalog shardMappings)
- Transform external field names to shard `structuredData` field names
- Handle nested fields (e.g., `Account.Industry` → `Industry`)
- **Transform Functions**: Support built-in and custom transform functions
                                - **Built-in Transforms** (registered at service startup):
                                                                - Date: `dateToISO`, `dateToUnix`
                                                                - Number: `stringToNumber`, `roundToDecimals`
                                                                - String: `toLowerCase`, `toUpperCase`, `trim`
                                                                - Array: `arrayToString`, `arrayFirst`
                                                                - Boolean: `booleanToString`, `booleanToYesNo`
                                                                - Null: `nullToDefault`
                                - **Custom Transforms** (loaded from integration config):
                                                                - Per-integration transforms (e.g., `salesforceStageToInternal`)
                                                                - Registered dynamically with prefixed name: `${integrationId}:${transformName}`
                                                                - Can be JavaScript code (compiled safely) or pre-compiled functions
- Handle data type conversions (string → number, date parsing, etc.)
- Support NEW BI Sales Risk fields (LastActivityDate, Industry, IndustryId, etc.)
- **Error Handling**: Log mapping failures with context, continue with partial mappings (partial mapping OK)

**Reference**: See `INTEGRATION_ADDITIONAL_QUESTIONS_ANSWERS.md` Section 8 for transform registration details

**Methods**:

- `mapFields(rawData: any, entityMapping: EntityMapping): Record<string, any>`
- `applyTransform(value: any, transform?: string, options?: any): any`
- `extractNestedField(data: any, fieldPath: string): any`
- `registerTransformer(name: string, transformer: TransformFunction): void`
- `validateMappedData(data: Record<string, any>, schema?: any): ValidationResult`

**Transform Function Interface**:

```typescript
type TransformFunction = (value: any, options?: Record<string, any>) => any;
```

#### 2.4 Create ML Field Aggregation Consumer

**File**: `containers/integration-processors/src/consumers/MLFieldAggregationConsumer.ts` (new)

**Decision**: Separate consumer for async ML field calculation (relationship counts).

**Responsibilities**:

- Consume `shard.created` events (filter: Opportunity shard type)
- Query relationship counts:
                                - `documentCount`: Count Document shards linked to opportunity
                                - `emailCount`: Count Email shards linked to opportunity
                                - `meetingCount`: Count Meeting shards linked to opportunity (type="meeting")
                                - `callCount`: Count Meeting shards linked to opportunity (type="call")
                                - `competitorCount`: Count Contact shards linked (isCompetitor=true)
                                - `stakeholderCount`: Count Contact shards linked (isStakeholder=true)
- **Smart Publishing**: Only publish `integration.opportunity.ml_fields_updated` if:
                                - New opportunity created (always publish)
                                - Counts changed significantly (>= 10% change for counts >= 10, any change for counts < 10)
- Update opportunity shard with calculated counts (always, even if no significant change)
- **Latency**: 1-2 seconds after shard creation

**Reference**: See `INTEGRATION_QUESTIONS_ANSWERS_PART1.md` Section 1.1 and `INTEGRATION_ADDITIONAL_QUESTIONS_ANSWERS.md` Section 2 for implementation details

#### 2.5 Update Integration Sync Event Consumer

**File**: `containers/integration-sync/src/events/consumers/SyncTaskEventConsumer.ts`

**Changes**:

- Add consumer for `integration.data.mapped` events
- Update sync execution stats when mapping completes
- Track mapping success/failure rates

#### 2.6 Add Opportunity Event Publishers

**File**: `containers/integration-sync/src/events/publishers/IntegrationOpportunityEventPublisher.ts` (new)

**Responsibilities**:

- Publish `integration.opportunity.created` for new opportunities
- Publish `integration.opportunity.updated` after opportunity shard is stored (only if significant changes)
- Publish `integration.opportunities.updated.batch` for large syncs
- Publish `integration.opportunity.ml_fields_updated` when ML fields are updated

**Event Payloads**:

- `integration.opportunity.created`:
                                - `{ integrationId, tenantId, opportunityId, shardId, syncTaskId, correlationId, metadata }`
- `integration.opportunity.updated`:
                                - `{ integrationId, tenantId, opportunityId, shardId, syncTaskId, correlationId, changedFields[], trigger, metadata }`
- `integration.opportunities.updated.batch`:
                                - `{ integrationId, tenantId, opportunityIds[], syncTaskId, correlationId, batchSize, changedFields[], metadata }`
- `integration.opportunity.ml_fields_updated`:
                                - `{ opportunityId, tenantId, fieldsUpdated[], trigger, metadata }`

### Phase 3: Downstream Service Integration & Entity Linking (Week 2)

**Scope**: Integration with risk-analytics, forecasting, and recommendations for CRM data (opportunities). Entity linking service for fast linking during shard creation.

#### 3.1 Update Risk Analytics Event Consumer

**File**: `containers/risk-analytics/src/events/consumers/RiskAnalyticsEventConsumer.ts`

**Changes**:

- Ensure `integration.opportunity.updated` handler is working correctly
- Ensure `integration.opportunities.updated.batch` handler processes batch events
                                - For batch events: Process each opportunity in parallel (up to concurrency limit)
                                - Trigger risk evaluation for each opportunity in the batch
- Add metrics for batch event processing

#### 3.2 Update Forecasting Event Consumer

**File**: `containers/forecasting/src/events/consumers/ForecastEventConsumer.ts`

**Changes**:

- Add handler for `integration.opportunity.updated` events
                                - Generate forecast after opportunity is updated from integration
                                - Wait for risk evaluation if sequential order is required
- Add handler for `integration.opportunities.updated.batch` events
                                - Process opportunities in batch (parallel with concurrency limit)
- Ensure sequential processing: Wait for `risk.evaluation.completed` before generating forecast
                                - Use correlation IDs to link risk → forecast
                                - Or consume `risk.evaluation.completed` events (already implemented)

#### 3.3 Update Recommendations Event Consumer

**File**: `containers/recommendations/src/events/consumers/RecommendationEventConsumer.ts`

**Changes**:

- Add handler for `integration.opportunity.updated` events
                                - Generate recommendations after opportunity is updated
                                - Wait for both risk and forecast if sequential order is required
- Add handler for `integration.opportunities.updated.batch` events
                                - Process opportunities in batch (parallel with concurrency limit)
- Ensure sequential processing: Wait for `risk.evaluation.completed` and `forecast.completed`
                                - Use correlation IDs to link events
                                - Or consume existing events (already implemented)

#### 3.4 Create Entity Linking Service

**File**: `packages/shared/src/services/EntityLinkingService.ts` (new)

**Decision**: Shared library in `packages/shared` (not separate service, not per-processor). Hybrid approach - fast linking during shard creation, deep linking async.

#### 3.5 Create Entity Linking Consumer

**File**: `containers/integration-processors/src/consumers/EntityLinkingConsumer.ts` (new)

**Decision**: Entity linking consumer located in `integration-processors` container (same as other processors).

**Responsibilities**:

- Consume `shard.created` events (filter: Document, Email, Message, Meeting shard types)
- Perform deep entity linking using EntityLinkingService
- Strategies: Content Analysis (LLM), Temporal Correlation, Vector Similarity
- Create relationships for confidence >= 80% (auto-link)
- Store suggested links (60-80% confidence) in `suggested_links` Cosmos DB container
- Update opportunity ML fields if high-confidence links created
- Consumer type: Light (entity linking is relatively fast)

**Reference**: See `INTEGRATION_FINAL_QUESTIONS_ANSWERS.md` Section 7 for location decision

**Fast Linking (During Shard Creation)**:

- **Strategy 1: Explicit Reference** (100% confidence)
                                - Document/email contains opportunity ID
                                - Message @mentions deal name
                                - Calendar event has deal in title
- **Strategy 2: Participant Matching** (80-90% confidence)
                                - Email to/from contact in opportunity
                                - Meeting participants match stakeholders
                                - Message in channel with stakeholder
- **Latency**: +100-300ms per shard
- **Implementation**: Simple database queries, no LLM calls

**Deep Linking (Async After Shard Creation)**:

- **Strategy 3: Content Analysis** (60-80% confidence) - LLM-based
- **Strategy 4: Temporal Correlation** (40-60% confidence)
- **Strategy 5: Vector Similarity** (30-50% confidence)
- **Consumer**: `EntityLinkingConsumer` (listens to `shard.created` for Document, Email, Message, Meeting)
- **Latency**: 1-5 seconds after shard creation

**Confidence Thresholds**:

- **Auto-link**: confidence >= 80% (create relationship immediately)
- **Suggest**: 60% <= confidence < 80% (store as suggested link for user review)
- **Ignore**: confidence < 60% (log for analysis, don't create)

**Entity Linking Triggers Opportunity Events**:

- Only trigger `integration.opportunity.ml_fields_updated` for high-confidence links (>= 80%)
- Update ML field counts (documentCount, emailCount, meetingCount)
- **Debouncing**: In-memory Map per consumer instance (per opportunity, 5-second window)
                                - Group multiple links to same opportunity within 5 seconds
                                - Flush on timer or shutdown
                                - Simple, no Redis dependency

**Suggested Links Storage**:

- Store suggested links (60-80% confidence) in separate Cosmos DB container `suggested_links`
- Partition key: `tenantId`
- TTL: 30 days (auto-expire)
- Status: `pending_review` | `approved` | `rejected` | `expired`
- User review API: `POST /api/v1/suggested-links/:id/approve` or `/reject`

**Reference**: See `INTEGRATION_QUESTIONS_ANSWERS_PART1.md` Section 3 and `INTEGRATION_ADDITIONAL_QUESTIONS_ANSWERS.md` Sections 3, 4, 6, 9 for complete implementation

#### 3.6 Implement Periodic ML Field Recalculation

**File**: `containers/integration-processors/src/jobs/mlFieldRecalculation.ts` (new)

**Decision**: Cron job directly in `integration-processors` container (not workflow-orchestrator).

**Implementation**:

- Use `node-cron` to schedule daily job (2 AM)
- Query active opportunities (closeDate in future)
- Publish `ml_field_aggregation.recalculate` events for each opportunity
- Only runs in 'light' or 'all' consumer mode
- Self-contained (all ML field logic in one place)

**Reference**: See `INTEGRATION_FINAL_QUESTIONS_ANSWERS.md` Section 4 for implementation details

#### 3.7 Create Suggested Links API

**File**: `containers/integration-processors/src/routes/suggestedLinks.routes.ts` (new)

**Decision**: Suggested links API located in `integration-processors` container.

**Endpoints**:

- `GET /api/v1/suggested-links` - Get pending suggested links (filter by tenantId, status)
- `POST /api/v1/suggested-links/:id/approve` - Approve suggested link (creates relationship)
- `POST /api/v1/suggested-links/:id/reject` - Reject suggested link (marks as rejected)

**Why integration-processors**:

- Entity linking logic runs in this container
- Has access to EntityLinkingService
- Has access to Cosmos DB (for suggested_links container)
- Natural home for entity linking APIs
- Already has HTTP server (for health checks)

**Reference**: See `INTEGRATION_FINAL_QUESTIONS_ANSWERS.md` Section 5 for location decision

#### 3.8 Sequential Event Processing

**Implementation Strategy**:

- **Event Chaining** (Recommended)
                                - Risk publishes `risk.evaluation.completed` → triggers forecast
                                - Forecast publishes `forecast.completed` → triggers recommendations
                                - Already implemented, just ensure events are published correctly
                                - Uses correlation IDs to link events

**Recommendation**: Use event chaining - simpler and already implemented

### Phase 4: Verify Shard Event Publishing & Vectorization (Week 2)

#### 4.1 Verify Shard Manager Event Publishing

**Files to Check**:

- `containers/shard-manager/src/services/ShardService.ts`
- `containers/shard-manager/src/routes/index.ts`

**Actions**:

- Check if `shard.created` and `shard.updated` events are published
- If not implemented, add event publishing:
                                - After `ShardService.create()` - publish `shard.created`
                                - After `ShardService.update()` - publish `shard.updated`
- Use `EventPublisher` from `@coder/shared`
- Event payload: `{ shardId, tenantId, shardTypeId, shardTypeName, opportunityId? }`

#### 4.2 Create Shard Manager Event Publisher

**File**: `containers/shard-manager/src/events/publishers/ShardEventPublisher.ts` (new or update)

**Responsibilities**:

- Publish `shard.created` event after shard is created
- Publish `shard.updated` event after shard is updated
- Include shard metadata: `shardId`, `tenantId`, `shardTypeId`, `shardTypeName`, `opportunityId?` (if applicable)

#### 4.3 Update Vectorization Consumer

**File**: `containers/data-enrichment/src/events/consumers/EnrichmentEventConsumer.ts`

**Decision**: Only vectorize specific shard types (Document, Email, Meeting, Message).

**Changes**:

- Filter `shard.created` and `shard.updated` events by shard type
- **Vectorize**: Document, Email, Meeting, Message shards
- **Don't Vectorize**: Opportunity, Account, Contact, CalendarEvent, Activity shards
- Extract text for vectorization:
                                - Document: `structuredData.extractedText`
                                - Email: `structuredData.bodyPlainText`
                                - Meeting: `structuredData.fullTranscript`
                                - Message: `structuredData.text`
- Chunk long text (> 8000 characters) with 200-character overlap
- Generate embeddings per chunk
- Store embeddings in vector database

**Reference**: See `INTEGRATION_QUESTIONS_ANSWERS_PART2.md` Section 5.3 for implementation

**File**: `containers/shard-manager/src/events/publishers/ShardEventPublisher.ts` (if not exists)

- Initialize `EventPublisher` with RabbitMQ config
- Publish `shard.created` after shard creation
- Publish `shard.updated` after shard update
- Include all required fields in event payload

### Phase 5: Update Integration Sync Flow (Week 2-3)

**Decision**: Refactor `IntegrationSyncService` immediately (no feature flag, can break in development).

#### 4.1 Refactor IntegrationSyncService.executeSyncTask()

**File**: `containers/integration-sync/src/services/IntegrationSyncService.ts`

**New Flow (Hybrid Approach - Option C)**:

1. Fetch data from integration-manager (via `/api/v1/integrations/:id/fetch`)
2. Generate correlation ID for this sync execution
3. **Batch Decision**: If records > `config.mapping.batch_threshold` (default: 100):

                                                - Group records into batches of `config.mapping.batch_size` (default: 50)
                                                - Publish `integration.data.raw.batch` events
                                                - Track batch IDs in sync execution

4. **Single Records**: If records <= threshold or webhook-triggered:

                                                - Publish `integration.data.raw` event for each record
                                                - Track individual record IDs

5. **Immediate Response**: Return sync execution with status `processing`

                                                - Don't wait for mapping to complete
                                                - Client can poll sync execution status

6. **Async Tracking**: Listen for `integration.data.mapped` and `integration.data.mapping.failed` events

                                                - Update sync execution stats in Cosmos DB as events arrive
                                                - Use correlation ID to link events to sync execution

7. Publish `integration.sync.completed` when all records processed (or failed)

**Tracking Implementation**:

- Use in-memory Map for active sync executions: `Map<syncTaskId, { total, processed, created, updated, failed }>`
- Update Cosmos DB sync execution record periodically (every 10 records or 5 seconds)
- Handle partial failures: Continue processing other records even if some fail
- Timeout handling: Mark sync as `partial` if not completed within timeout (default: 1 hour)

#### 5.2 Add Mapping Completion Tracking

**File**: `containers/integration-sync/src/services/IntegrationSyncService.ts`

- **Event Listener**: Add handler in `SyncTaskEventConsumer` for:
                                - `integration.data.mapped` - Increment success counters
                                - `integration.data.mapping.failed` - Increment failure counters
- Track mapping completion per record using correlation ID
- Update `recordsProcessed`, `recordsCreated`, `recordsUpdated`, `recordsFailed` in real-time
- Handle mapping failures and retries (track retry attempts)
- Update sync execution status: `processing` → `completed` / `partial` / `failed`
- **Metrics**: Emit Prometheus metrics for sync execution progress

### Phase 6: Docker Compose Configuration (Week 3)

#### 6.1 Update Docker Compose for Integration Processors

**File**: `docker-compose.yml`

**Decision**: Two separate services for light and heavy processors.

**Configuration**:

```yaml
services:
  # Light processors (fast processing)
  integration-processors-light:
    build:
      context: .
      dockerfile: containers/integration-processors/Dockerfile
    container_name: integration-processors-light
    environment:
      CONSUMER_TYPE: light
      NODE_ENV: development
      RABBITMQ_URL: amqp://rabbitmq:5672
      SHARD_MANAGER_URL: http://shard-manager:3000
      REDIS_URL: redis://redis:6379
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    depends_on:
      rabbitmq:
        condition: service_healthy
      shard-manager:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - castiel-network
  
  # Heavy processors (slow processing)
  integration-processors-heavy:
    build:
      context: .
      dockerfile: containers/integration-processors/Dockerfile
    container_name: integration-processors-heavy
    environment:
      CONSUMER_TYPE: heavy
      NODE_ENV: development
      RABBITMQ_URL: amqp://rabbitmq:5672
      SHARD_MANAGER_URL: http://shard-manager:3000
      AZURE_BLOB_CONNECTION_STRING: ${AZURE_BLOB_CONNECTION_STRING}
      AZURE_COMPUTER_VISION_ENDPOINT: ${AZURE_COMPUTER_VISION_ENDPOINT}
      AZURE_COMPUTER_VISION_KEY: ${AZURE_COMPUTER_VISION_KEY}
      AZURE_SPEECH_ENDPOINT: ${AZURE_SPEECH_ENDPOINT}
      AZURE_SPEECH_KEY: ${AZURE_SPEECH_KEY}
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
    depends_on:
      rabbitmq:
        condition: service_healthy
      shard-manager:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - castiel-network
```

**Reference**: See `INTEGRATION_FINAL_QUESTIONS_ANSWERS.md` Section 3 for Docker Compose configuration

### Phase 7: Configuration & Event Schema (Week 3)

**Decision**: Add configurable validation strictness, test data strategy (synthetic + real).

#### 6.1 Add Integration Data Events to Schema

**Files**:

- `containers/integration-sync/logs-events.md`
- `containers/integration-manager/logs-events.md`

**New Events**:

- `integration.data.raw` - Raw CRM data fetched (single record)
- `integration.data.raw.batch` - Batch of raw CRM data (for large syncs)
- `integration.data.mapped` - CRM data mapped and stored to shard
- `integration.data.mapping.failed` - Mapping failed
- `integration.opportunity.created` - New opportunity created from integration
- `integration.opportunity.updated` - Opportunity updated from integration (only significant changes)
- `integration.opportunities.updated.batch` - Batch of opportunities updated (for large syncs)
- `integration.opportunity.ml_fields_updated` - ML fields updated (triggers risk recalculation)
- `integration.document.detected` - Document detected from integration (Phase 3+)
- `integration.document.processed` - Document processing completed (Phase 3+)
- `integration.email.received` - Email received from integration (Phase 3+)
- `integration.email.processed` - Email processing completed (Phase 3+)
- `integration.message.received` - Message received from integration (Phase 3+)
- `integration.message.processed` - Message processing completed (Phase 3+)
- `integration.meeting.completed` - Meeting completed from integration (Phase 4+)
- `integration.meeting.processed` - Meeting processing completed (Phase 4+)
- `integration.event.created` - Calendar event created from integration (Phase 4+)
- `entity.linked` - Entity linking completed (high-confidence links created)

#### 6.2 Update Configuration Schema

**File**: `containers/integration-sync/config/schema.json`

- Add `mapping` section:
                                - `mapping.queue_name` - RabbitMQ queue for mapping consumer (default: `integration_data_raw`)
                                - `mapping.dlq_name` - Dead-letter queue name (default: `integration_data_raw.dlq`)
                                - `mapping.batch_size` - Batch size for batch events (default: 50)
                                - `mapping.batch_threshold` - Threshold to use batch events (default: 100 records)
                                - `mapping.batch_concurrency` - Parallel processing for batch events (default: 10)
                                - `mapping.retry_attempts` - Max retry attempts (default: 3)
                                - `mapping.retry_backoff_ms` - Initial retry backoff in ms (default: 1000)
                                - `mapping.timeout_seconds` - Mapping timeout per record (default: 30)
                                - `mapping.prefetch` - RabbitMQ prefetch count (default: 20)
                                - `mapping.idempotency_ttl` - Idempotency key TTL in seconds (default: 86400)
                                - `mapping.config_cache_ttl` - Integration config cache TTL in seconds (default: 600)
                                - `mapping.circuit_breaker_threshold` - Circuit breaker failure threshold (default: 5)
                                - `mapping.circuit_breaker_timeout` - Circuit breaker timeout in ms (default: 60000)
                                - `mapping.opportunity_batch_threshold` - Threshold for batching opportunity events (default: 100)
                                - `mapping.opportunity_batch_size` - Opportunities per batch event (default: 50)
                                - `mapping.publish_opportunity_events` - Publish opportunity events (default: `immediate` | `batch` | `debounce` | `none`)

- Add `rabbitmq.queues` section for queue configuration:
                                - `integration_data_raw`: Queue config with DLQ settings
                                - `integration_data_raw.dlq`: DLQ configuration

### Phase 8: Dead-Letter Queue & Error Handling (Week 3)

#### 7.1 Configure Dead-Letter Queue

**File**: `containers/integration-sync/src/events/consumers/CRMDataMappingConsumer.ts`

**DLQ Configuration**:

- Create DLQ exchange: `coder_events.dlx`
- Create DLQ queue: `integration_data_raw.dlq`
- Configure main queue with DLQ arguments:
  ```yaml
  arguments:
    'x-dead-letter-exchange': 'coder_events.dlx'
    'x-dead-letter-routing-key': 'integration.data.raw.dlq'
    'x-message-ttl': 86400000  # 24 hours
  ```

- After max retries, nack message (goes to DLQ)
- Add DLQ monitoring and alerting

#### 6.2 Implement Retry Strategy

**File**: `containers/integration-sync/src/services/RetryService.ts` (new)

**Retry Logic**:

- Exponential backoff: `delay = min(initialBackoff * 2^attempt, maxBackoff)`
- Max retries: 3 (configurable)
- Retry on: network errors, 5xx errors, rate limits (429), timeouts
- Don't retry on: 4xx errors (except 429), validation errors, permanent failures
- Add retry metrics: `integration_data_retry_attempts_total`, `integration_data_retry_duration_seconds`

#### 6.3 Add Circuit Breaker

**File**: `containers/integration-sync/src/services/CircuitBreakerService.ts` (new)

**Circuit Breaker**:

- Protect shard-manager API calls
- States: CLOSED → OPEN → HALF_OPEN
- Threshold: 5 failures in 60 seconds → OPEN
- Timeout: 60 seconds before attempting HALF_OPEN
- Add metrics: `integration_circuit_breaker_state`, `integration_circuit_breaker_failures_total`

### Phase 9: Monitoring & Observability (Week 3-4)

#### 8.1 Add Prometheus Metrics

**File**: `containers/integration-sync/src/utils/metrics.ts` (new)

**Metrics to Add**:

- `integration_data_raw_published_total{integration_id, entity_type}` - Counter
- `integration_data_raw_batch_published_total{integration_id, batch_size}` - Counter
- `integration_data_mapped_total{integration_id, status}` - Counter (status: success/failed)
- `integration_data_mapping_duration_seconds{integration_id}` - Histogram
- `integration_data_queue_depth{queue_name}` - Gauge
- `integration_data_idempotency_hits_total` - Counter (duplicate events detected)
- `integration_data_config_cache_hits_total` - Counter
- `integration_data_config_cache_misses_total` - Counter
- `integration_data_retry_attempts_total{integration_id, error_type}` - Counter
- `integration_circuit_breaker_state{service}` - Gauge (0=closed, 1=open, 2=half-open)

#### 8.2 Add Distributed Tracing

**File**: `containers/integration-sync/src/utils/tracing.ts` (new)

- Use correlation IDs for request tracing
- Add trace spans for: fetch → publish → map → store
- Integrate with existing tracing infrastructure (if available)

#### 8.3 Create Grafana Dashboard

**File**: `deployment/monitoring/grafana/dashboards/integration-data-flow.json` (new)

**Dashboard Panels**:

- Integration data flow rate (published, mapped, failed)
- Queue depth over time
- Mapping duration percentiles (p50, p95, p99)
- Error rate by integration
- Circuit breaker state
- Idempotency hit rate
- Config cache hit rate

### Phase 10: Configuration UI & API Implementation (Weeks 4-17)

**Reference**: `INTEGRATION_CONFIGURATION_UI_API_PLAN.md` - Complete configuration system specifications

**Scope**: Implement comprehensive configuration system for Super Admin and Tenant Admin with 80+ API endpoints and 50+ UI components.

**Configuration Hierarchy**:

- **Super Admin**: System-wide configuration (integration catalog, shard types, system settings, monitoring)
- **Tenant Admin**: Tenant-specific configuration (connections, sync config, field mappings, entity linking, processing, health)

#### 10.1 Super Admin Configuration APIs (Week 4-5)

**Integration Catalog Management**:

- **File**: `containers/integration-manager/src/routes/admin/catalog.routes.ts` (new)
- **Endpoints**:
        - `GET /api/v1/admin/integrations/catalog` - List all integration types
        - `GET /api/v1/admin/integrations/catalog/:id` - Get single integration type
        - `POST /api/v1/admin/integrations/catalog` - Create integration type
        - `PUT /api/v1/admin/integrations/catalog/:id` - Update integration type
        - `DELETE /api/v1/admin/integrations/catalog/:id` - Delete integration type
- **Features**: Manage integration types, default field mappings, capabilities, rate limits

**Shard Type Management**:

- **File**: `containers/shard-manager/src/routes/admin/shardTypes.routes.ts` (new)
- **Endpoints**:
        - `GET /api/v1/admin/shard-types` - List all shard types
        - `GET /api/v1/admin/shard-types/:id` - Get single shard type
        - `POST /api/v1/admin/shard-types` - Create shard type
        - `PUT /api/v1/admin/shard-types/:id` - Update shard type
        - `POST /api/v1/admin/shard-types/:id/validate` - Validate test data
        - `GET /api/v1/admin/shard-types/:id/stats` - Get usage statistics
- **Features**: Create/update shard types, schema validation, version management

**System Settings**:

- **File**: `containers/integration-manager/src/routes/admin/settings.routes.ts` (new)
- **Endpoints**:
        - `GET /api/v1/admin/settings` - Get all system settings
        - `PUT /api/v1/admin/settings` - Update system settings
        - `GET /api/v1/admin/settings/rate-limits` - Get rate limit settings
        - `PUT /api/v1/admin/settings/rate-limits` - Update rate limits
        - `GET /api/v1/admin/settings/capacity` - Get processing capacity settings
        - `PUT /api/v1/admin/settings/capacity` - Update capacity settings
        - `GET /api/v1/admin/settings/feature-flags` - Get feature flags
        - `PUT /api/v1/admin/settings/feature-flags` - Update feature flags
        - `PATCH /api/v1/admin/settings/feature-flags/:flagName` - Toggle single flag
- **Features**: Global rate limits, processing capacity, queue config, feature flags

**System Monitoring**:

- **File**: `containers/integration-processors/src/routes/admin/monitoring.routes.ts` (new)
- **Endpoints**:
        - `GET /api/v1/admin/monitoring/health` - Get overall system health
        - `GET /api/v1/admin/monitoring/queues` - Get queue metrics
        - `GET /api/v1/admin/monitoring/processors` - Get processor status
        - `GET /api/v1/admin/monitoring/integrations` - Get integration health across tenants
        - `GET /api/v1/admin/monitoring/errors` - Get error analytics
        - `GET /api/v1/admin/monitoring/performance` - Get performance metrics
- **Features**: System health dashboard, queue metrics, processor status, error analytics

#### 10.2 Tenant Admin Configuration APIs - Connections & Sync (Week 6-7)

**Integration Connections**:

- **File**: `containers/integration-manager/src/routes/integrations.routes.ts` (update)
- **Endpoints**:
        - `GET /api/v1/integrations` - List tenant's integrations
        - `GET /api/v1/integrations/available` - Get available integration types
        - `POST /api/v1/integrations/connect` - Connect integration (OAuth2)
        - `POST /api/v1/integrations/connect-api-key` - Connect integration (API Key)
        - `DELETE /api/v1/integrations/:id` - Disconnect integration
        - `POST /api/v1/integrations/:id/test` - Test connection
        - `GET /api/v1/integrations/oauth-url/:integrationType` - Get OAuth URL
- **Features**: OAuth flow, API key management, connection testing

**Sync Configuration**:

- **File**: `containers/integration-manager/src/routes/syncConfig.routes.ts` (new)
- **Endpoints**:
        - `GET /api/v1/integrations/:id/sync-config` - Get sync configuration
        - `PUT /api/v1/integrations/:id/sync-config` - Update sync configuration
        - `POST /api/v1/integrations/:id/sync` - Trigger manual sync
        - `GET /api/v1/integrations/:id/sync-history` - Get sync history
- **Features**: Entity selection, sync schedule, sync direction, filters

**Field Mapping Configuration**:

- **File**: `containers/integration-manager/src/routes/fieldMappings.routes.ts` (new)
- **Endpoints**:
        - `GET /api/v1/integrations/:id/field-mappings/:entityType` - Get field mappings
        - `PUT /api/v1/integrations/:id/field-mappings/:entityType` - Update field mappings
        - `GET /api/v1/integrations/:id/external-fields/:entityType` - Get available external fields
        - `GET /api/v1/integrations/:id/internal-fields/:entityType` - Get available internal fields
        - `GET /api/v1/integrations/transform-functions` - Get available transform functions
        - `POST /api/v1/integrations/:id/field-mappings/:entityType/test` - Test field mappings
        - `GET /api/v1/integrations/:id/field-mappings/:entityType/export` - Export mappings
        - `POST /api/v1/integrations/:id/field-mappings/:entityType/import` - Import mappings
- **Features**: Field mapping editor, transform functions, test mappings, import/export

#### 10.3 Tenant Admin Configuration APIs - Entity Linking & Processing (Week 8-9)

**Entity Linking Configuration**:

- **File**: `containers/integration-processors/src/routes/entityLinking.routes.ts` (new)
- **Endpoints**:
        - `GET /api/v1/entity-linking/settings` - Get entity linking settings
        - `PUT /api/v1/entity-linking/settings` - Update entity linking settings
        - `GET /api/v1/entity-linking/suggested-links` - Get suggested links (pending review)
        - `POST /api/v1/entity-linking/suggested-links/:id/approve` - Approve suggested link
        - `POST /api/v1/entity-linking/suggested-links/:id/reject` - Reject suggested link
        - `POST /api/v1/entity-linking/suggested-links/approve-all` - Approve all suggested links
        - `GET /api/v1/entity-linking/rules` - Get linking rules
        - `POST /api/v1/entity-linking/rules` - Create linking rule
- **Features**: Auto-link thresholds, suggested links review, manual linking rules
- **Note**: Some endpoints already exist in `suggestedLinks.routes.ts` - consolidate or update

**Data Processing Settings**:

- **File**: `containers/integration-processors/src/routes/processing.routes.ts` (new)
- **Endpoints**:
        - `GET /api/v1/processing/settings` - Get processing settings
        - `PUT /api/v1/processing/settings` - Update processing settings
- **Features**: Document processing, email processing, meeting transcription, processing priorities

#### 10.4 Tenant Admin Configuration APIs - Health & Monitoring (Week 10)

**Integration Health & Monitoring**:

- **File**: `containers/integration-manager/src/routes/health.routes.ts` (new)
- **Endpoints**:
        - `GET /api/v1/integrations/:id/health` - Get integration health
        - `GET /api/v1/integrations/:id/sync-history` - Get sync history (detailed)
        - `GET /api/v1/integrations/:id/sync-history/:syncId` - Get sync execution details
        - `GET /api/v1/integrations/:id/errors` - Get error logs
        - `GET /api/v1/integrations/:id/data-quality` - Get data quality metrics
        - `GET /api/v1/integrations/:id/performance` - Get performance metrics
- **Features**: Health status, sync history, error logs, data quality, performance metrics

#### 10.5 Super Admin UI Implementation (Week 11-12)

**UI Pages**:

- `/admin/integrations/catalog` - Integration catalog management
- `/admin/shard-types` - Shard type management
- `/admin/settings` - System settings (rate limits, capacity, queues, feature flags)
- `/admin/monitoring` - System monitoring dashboard

**UI Components**:

- `IntegrationCatalogList.tsx`, `IntegrationTypeEditor.tsx`
- `ShardTypeList.tsx`, `ShardTypeEditor.tsx`, `ShardTypeSchemaEditor.tsx`, `ShardTypeValidator.tsx`
- `SystemSettings.tsx` with tabs: RateLimitsTab, ProcessingCapacityTab, QueueConfigurationTab, FeatureFlagsTab
- `SystemHealthDashboard.tsx`, `QueueMetricsCard.tsx`, `ProcessorStatusCard.tsx`, `IntegrationHealthTable.tsx`, `ErrorAnalyticsChart.tsx`

#### 10.6 Tenant Admin UI Implementation - Connections & Sync (Week 13-14)

**UI Pages**:

- `/settings/integrations` - Integration connections overview
- `/settings/integrations/:id/sync` - Sync configuration

**UI Components**:

- `IntegrationsOverview.tsx`, `IntegrationCard.tsx`, `ConnectIntegrationModal.tsx`, `IntegrationStatusBadge.tsx`
- `SyncConfiguration.tsx` with tabs: EntitySelectionTab, SyncScheduleTab, SyncDirectionTab, SyncFiltersTab

#### 10.7 Tenant Admin UI Implementation - Field Mappings (Week 15)

**UI Pages**:

- `/settings/integrations/:id/field-mappings` - Field mapping configuration

**UI Components**:

- `FieldMappingsEditor.tsx`, `FieldMappingRow.tsx`, `FieldMappingEditor.tsx`, `FieldMappingTester.tsx`

#### 10.8 Tenant Admin UI Implementation - Entity Linking & Processing (Week 16)

**UI Pages**:

- `/settings/integrations/:id/entity-linking` - Entity linking configuration
- `/settings/integrations/:id/processing` - Data processing settings

**UI Components**:

- `EntityLinkingSettings.tsx` with tabs: AutoLinkSettingsTab, SuggestedLinksReviewTab, ManualLinkingRulesTab
- `SuggestedLinkCard.tsx`
- `DataProcessingSettings.tsx` with sections: DocumentProcessingSettings, EmailProcessingSettings, MeetingProcessingSettings, ProcessingPriorities`

#### 10.9 Tenant Admin UI Implementation - Health & Monitoring (Week 17)

**UI Pages**:

- `/settings/integrations/:id/health` - Integration health dashboard

**UI Components**:

- `IntegrationHealthDashboard.tsx` with sections: HealthOverviewCard, SyncHistoryTable.tsx, ErrorLogsTable.tsx, DataQualityMetrics.tsx, PerformanceMetricsChart.tsx`

#### 10.10 Shared UI Components Library (Week 17)

**Shared Components** (in `containers/ui/src/components/integrations/`):

- `IntegrationLogo.tsx`, `StatusBadge.tsx`, `SyncStatusIndicator.tsx`, `ConfidenceScore.tsx`
- `EntityPreview.tsx`, `MetricCard.tsx`, `TimeSeriesChart.tsx`, `ErrorSummary.tsx`
- `LoadingSpinner.tsx`, `EmptyState.tsx`, `ConfirmDialog.tsx`

#### 10.11 TypeScript Interfaces (Week 4-5)

**Files**: `packages/shared/src/types/integrations/` (new directory)

**Interfaces**:

- `IntegrationType`, `TenantIntegration`, `SyncConfig`, `EntityMapping`, `FieldMapping`, `SyncFilter`, `SyncExecution`, `ErrorLog`
- `EntityLinkingSettings`, `SuggestedLink`, `LinkingRule`
- `DataProcessingSettings`, `DocumentProcessingConfig`, `EmailProcessingConfig`, `MeetingProcessingConfig`

**Reference**: See `INTEGRATION_CONFIGURATION_UI_API_PLAN.md` Part 4 for complete interface definitions

### Phase 11: Testing & Documentation (Week 18)

**Decision**: Use both synthetic and real test data. Configurable validation strictness.

#### 11.1 Unit Tests

**Files**:

- `containers/integration-sync/tests/unit/services/FieldMapperService.test.ts`
- `containers/integration-sync/tests/unit/events/consumers/IntegrationDataMappingConsumer.test.ts`

**Test Cases**:

- Field mapping application
- Nested field extraction
- Data type conversion
- Transform functions
- Error handling

#### 11.2 Integration Tests

**Files**:

- `containers/integration-sync/tests/integration/events/integration-data-flow.test.ts`

**Test Scenarios**:

- End-to-end: fetch → publish raw → map → store → opportunity events → risk → forecast → recommendations
- Verify events published in correct order
- Verify field mappings applied correctly
- Verify shard events trigger vectorization
- Verify sequential processing: risk → forecast → recommendations
- Verify batch event processing for large syncs
- Verify opportunity events trigger downstream services

#### 11.3 Update Documentation

**Files**:

- `containers/integration-sync/README.md`
- `containers/integration-manager/README.md`
- `containers/integration-sync/CHANGELOG.md`

**Documentation Updates**:

- New async data flow architecture
- Field mapping configuration
- Event flow diagram
- Secret management usage

## Architecture Diagram

```
┌─────────────────┐
│ Salesforce API  │
│ (and other      │
│  integrations)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Integration Adapter      │
│ (fetchRecords)           │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Integration Sync Service │
│ (executeSyncTask)        │
│ - Route by entity type   │
│ - Generate idempotencyKey│
│ - Generate correlationId │
│ - Batch if > threshold   │
└────────┬─────────────────┘
         │
         │ Route to appropriate queue
         ├─→ integration.data.raw (CRM)
         ├─→ integration.document.detected (Documents)
         ├─→ integration.email.received (Emails)
         ├─→ integration.message.received (Messages)
         ├─→ integration.meeting.completed (Meetings)
         └─→ integration.event.created (Calendar)
         │
┌────────┴──────────────────────────────────────────┐
│              RabbitMQ Queues                       │
│  - integration_data_raw (prefetch: 20)            │
│  - integration_documents (prefetch: 5)             │
│  - integration_communications (prefetch: 10)      │
│  - integration_meetings (prefetch: 3)             │
│  - integration_events (prefetch: 15)               │
│  - shard_ml_aggregation (prefetch: 10)             │
│  + DLQs for all queues                             │
└────────┬──────────────────────────────────────────┘
         │
         │
         │ All consumers run in integration-processors container
         │
         ├─→ CRMDataMappingConsumer (integration-processors)
         │   - Apply field mappings
         │   - Calculate simple ML fields
         │   - Fast entity linking
         │   - Store Opportunity/Account/Contact shards
         │   - Publish opportunity events (significant changes only)
         │
         ├─→ DocumentProcessorConsumer (integration-processors, Phase 2+)
         │   - Download & store in Blob Storage
         │   - Extract text
         │   - Analyze content (LLM)
         │   - Fast entity linking
         │   - Store Document shards
         │
         ├─→ EmailProcessorConsumer (integration-processors, Phase 3+)
         │   - Parse email metadata
         │   - Process attachments
         │   - Content analysis
         │   - Fast entity linking
         │   - Store Email shards
         │
         ├─→ MessageProcessorConsumer (integration-processors, Phase 3+)
         │   - Parse message metadata
         │   - Channel classification
         │   - Fast entity linking
         │   - Store Message shards
         │
         ├─→ MeetingProcessorConsumer (integration-processors, Phase 4+)
         │   - Download recording (Blob Storage)
         │   - Transcribe (Azure Speech)
         │   - Meeting intelligence
         │   - Fast entity linking
         │   - Store Meeting shards
         │
         ├─→ EventProcessorConsumer (integration-processors, Phase 4+)
         │   - Parse event metadata
         │   - Attendee matching
         │   - Fast entity linking
         │   - Store CalendarEvent shards
         │
         ├─→ EntityLinkingConsumer (integration-processors)
         │   - Deep entity linking (LLM, vector similarity)
         │   - Creates relationships (confidence >= 80%)
         │   - Stores suggested links (60-80% confidence)
         │
         └─→ MLFieldAggregationConsumer (integration-processors)
             - Calculates relationship counts
             - Updates opportunity ML fields
             - Publishes ml_fields_updated events
         │
         │ All processors create shards via shard-manager
         ▼
┌─────────────────────────┐
│ Shard Manager Service   │
│ (create/update shard)   │
│ - Publish shard.created │
│   / shard.updated       │
└────────┬─────────────────┘
         │
         │ shard.created events
         │
┌────────┴──────────────────────────────────────────┐
│         Downstream Consumers                       │
│                                                     │
│  MLFieldAggregationConsumer                        │
│  - Consumes shard.created (Opportunity)            │
│  - Calculates relationship counts                  │
│  - Updates opportunity ML fields                   │
│  - Publishes integration.opportunity.ml_fields_    │
│    updated                                         │
│                                                     │
│  EntityLinkingConsumer (Deep Linking)              │
│  - Consumes shard.created (Document, Email, etc.) │
│  - LLM-based content analysis                      │
│  - Vector similarity search                        │
│  - Temporal correlation                            │
│  - Creates relationships (confidence >= 60%)       │
│  - Updates opportunity ML fields (if >= 80%)       │
│                                                     │
│  VectorizationConsumer (data-enrichment)          │
│  - Consumes shard.created (Document, Email,        │
│    Meeting, Message only)                          │
│  - Generates embeddings                            │
│  - Stores in vector database                       │
│                                                     │
│  Risk Analytics Consumer (Sequential Chain)        │
│  - Consumes integration.opportunity.updated        │
│  - Evaluates risk                                  │
│  - Publishes risk.evaluation.completed             │
│                                                     │
│  Forecasting Consumer                             │
│  - Consumes risk.evaluation.completed             │
│  - Generates forecast                              │
│  - Publishes forecast.completed                    │
│                                                     │
│  Recommendations Consumer                          │
│  - Consumes forecast.completed                     │
│  - Generates recommendations                      │
└────────────────────────────────────────────────────┘

┌─────────────────────────┐
│ Azure Infrastructure    │
│ - Blob Storage          │
│ - Computer Vision (OCR) │
│ - Speech Services       │
└─────────────────────────┘

┌─────────────────────────┐
│ Monitoring & Metrics    │
│ - Prometheus metrics    │
│ - Grafana dashboards    │
│ - Distributed tracing   │
└─────────────────────────┘
```

## Event Flow

### Integration Data Flow

1. **integration.data.raw** (published by integration-sync)

                                                - Payload: `{ integrationId, tenantId, entityType, rawData, externalId, syncTaskId, idempotencyKey, correlationId, metadata }`
                                                - Consumer: `IntegrationDataMappingConsumer`
                                                - DLQ: `integration_data_raw.dlq` (after max retries)

2. **integration.data.raw.batch** (published by integration-sync for large syncs)

                                                - Payload: `{ integrationId, tenantId, entityType, records[], syncTaskId, correlationId, batchSize, metadata }`
                                                - Each record has: `{ rawData, externalId, idempotencyKey }`
                                                - Consumer: `IntegrationDataMappingConsumer` (processes in parallel)

3. **integration.data.mapped** (published by mapping consumer)

                                                - Payload: `{ integrationId, tenantId, shardId, externalId, syncTaskId, idempotencyKey, correlationId, success, duration }`
                                                - Consumer: `SyncTaskEventConsumer` (updates sync stats)

4. **integration.data.mapping.failed** (published by mapping consumer)

                                                - Payload: `{ integrationId, tenantId, externalId, syncTaskId, idempotencyKey, correlationId, error, retryAttempt }`
                                                - Consumer: `SyncTaskEventConsumer` (tracks failures)

### Opportunity Update Flow (Sequential)

5. **integration.opportunity.updated** (published by mapping consumer after storing opportunity shard)

                                                - Payload: `{ integrationId, tenantId, opportunityId, shardId, syncTaskId, correlationId, changes?, metadata }`
                                                - Consumers: `risk-analytics` (triggers risk evaluation)

6. **integration.opportunities.updated.batch** (published by mapping consumer for large syncs)

                                                - Payload: `{ integrationId, tenantId, opportunityIds[], syncTaskId, correlationId, batchSize, metadata }`
                                                - Consumers: `risk-analytics` (processes each opportunity in parallel)

7. **risk.evaluation.completed** (published by risk-analytics after evaluation)

                                                - Payload: `{ opportunityId, tenantId, riskScore, evaluationId, correlationId, ... }`
                                                - Consumers: `forecasting` (triggers forecast generation)

8. **forecast.completed** (published by forecasting after forecast generation)

                                                - Payload: `{ opportunityId, tenantId, forecastId, revenueForecast, correlationId, ... }`
                                                - Consumers: `recommendations` (triggers recommendation generation)

9. **recommendation.generation.completed** (published by recommendations)

                                                - Payload: `{ opportunityId, tenantId, recommendationIds[], correlationId, ... }`
                                                - Consumers: `notification-manager` (optional), `logging`

### Shard Events (Parallel Processing)

10. **shard.created** / **shard.updated** (published by shard-manager)

                                                                - Payload: `{ shardId, tenantId, shardTypeId, shardTypeName, opportunityId? }`
                                                                - Consumers: 
                                                                                                - `data-enrichment` (vectorization - parallel)
                                                                                                - `risk-analytics` (if opportunity type - triggers risk evaluation)
                                                                                                - `integration-sync` (bidirectional sync)
                                                                                                - `ai-conversation` (context updates)

### Event Processing Order

**Sequential Chain** (for opportunities):

```
integration.opportunity.updated 
  → risk.evaluation.completed 
  → forecast.completed 
  → recommendation.generation.completed
```

**Parallel Processing** (independent):

- Vectorization (from shard events)
- Bidirectional sync (from shard events)
- Context updates (from shard events)

## Secret Management Verification Checklist

- [ ] All OAuth tokens stored in Secret Management Service
- [ ] All API keys stored in Secret Management Service
- [ ] No hardcoded credentials in code
- [ ] No direct Cosmos DB credential storage
- [ ] All credential retrieval uses `SecretManagementClient`
- [ ] Credentials retrieved with proper tenant context
- [ ] Token refresh uses Secret Management Service
- [ ] Connection credentials encrypted at rest

## Future Scalability Considerations

### When Adding Many Integrations

As the number of integrations grows, consider these enhancements:

#### 1. Queue Partitioning

**Option A: Per-Integration Queues**

- Create separate queues per integration: `integration_data_raw_salesforce`, `integration_data_raw_hubspot`, etc.
- Benefits: Isolation, independent scaling, priority per integration
- Implementation: Dynamic queue creation based on integration type

**Option B: Priority Queues**

- High/Medium/Low priority queues based on integration importance
- Benefits: Critical integrations processed first
- Implementation: Route events to priority queues based on integration config

**Option C: Tenant-Based Partitioning**

- Separate queues per tenant (if multi-tenancy is a concern)
- Benefits: Tenant isolation, compliance
- Implementation: Queue name includes tenant ID

**Recommendation**: Start with single queue, add partitioning when queue depth > 10,000 messages

#### 2. Horizontal Scaling

- **Mapping Consumers**: Scale horizontally (multiple instances)
- **RabbitMQ**: Use RabbitMQ cluster for high availability
- **Load Balancing**: RabbitMQ automatically distributes messages across consumers
- **Auto-scaling**: Scale consumers based on queue depth metrics

#### 3. Rate Limiting

- **Per Integration**: Limit API calls per integration to avoid throttling
- **Per Tenant**: Limit syncs per tenant to prevent resource exhaustion
- **Implementation**: Token bucket or sliding window algorithm
- **Config**: `rate_limits.requests_per_minute` per integration

#### 4. Integration Health Monitoring

- **Health Checks**: Periodic connectivity tests for each integration
- **Status Dashboard**: Show integration status (connected, error, rate-limited)
- **Auto-Disable**: Temporarily disable integrations with repeated failures
- **Alerting**: Alert on integration health degradation

#### 5. Data Validation

- **Schema Validation**: Validate mapped data against shard schemas
- **Data Quality**: Check for required fields, data types, ranges
- **Rejection**: Reject invalid data, send to DLQ with reason
- **Metrics**: Track validation failure rate

#### 6. Integration-Specific Queues (Future)

When volume grows significantly:

- Consider dedicated queues for high-volume integrations (Salesforce, HubSpot)
- Separate queues for different entity types (Opportunities, Accounts, Contacts)
- Queue routing based on integration priority and volume

## Complete Integration Data Flow Summary

### End-to-End Flow for Opportunity Updates

When integration data (e.g., Salesforce opportunity) is synced, the complete flow is:

1. **Fetch** → Integration adapter fetches data from Salesforce
2. **Publish Raw** → Integration-sync publishes `integration.data.raw` (or batch) to RabbitMQ
3. **Map** → Mapping consumer applies field mappings, transforms data
4. **Store** → Mapping consumer stores shard via shard-manager API
5. **Publish Opportunity Event** → Mapping consumer publishes `integration.opportunity.updated` (or batch)
6. **Risk Evaluation** → Risk-analytics consumes event, evaluates risk, publishes `risk.evaluation.completed`
7. **Forecast** → Forecasting consumes `risk.evaluation.completed`, generates forecast, publishes `forecast.completed`
8. **Recommendations** → Recommendations consumes `forecast.completed`, generates recommendations
9. **Vectorization** → Data-enrichment consumes `shard.created/updated`, generates embeddings (parallel)

### Key Features

- **Fully Async**: All processing via RabbitMQ queues
- **Sequential Chain**: Risk → Forecast → Recommendations (event-driven, uses correlation IDs)
- **Parallel Processing**: Vectorization, bidirectional sync (independent of sequential chain)
- **Batch Support**: Large syncs use batch events to reduce message volume
- **Idempotency**: Prevents duplicate processing
- **Error Handling**: Retry logic, DLQ, circuit breakers
- **Monitoring**: Comprehensive metrics and tracing

### Event Batching Recommendations

**For Opportunity Updates**:

- **Small Syncs** (< 100 opportunities): Publish `integration.opportunity.updated` immediately
                                - **Pros**: Real-time processing, immediate risk/forecast/recommendations
                                - **Cons**: More RabbitMQ messages
                                - **Use Case**: Webhooks, incremental syncs, manual syncs

- **Large Syncs** (>= 100 opportunities): Publish `integration.opportunities.updated.batch`
                                - **Pros**: Reduced message volume, efficient processing
                                - **Cons**: Slight delay (batches processed together)
                                - **Use Case**: Full syncs, initial syncs, bulk imports
                                - **Batch Size**: 50 opportunities per batch event (configurable)
                                - **Processing**: Risk-analytics processes batch in parallel (up to concurrency limit)

**Recommendation**: Use immediate events for webhooks and small syncs, batch events for large syncs. This balances real-time processing with efficiency.

## Future Phases: Multi-Modal Data Types

**Note**: The following phases extend the plan to support Documents, Emails, Messages, Meetings, and Calendar Events. These phases will be implemented after the core CRM flow is complete and validated.

**Consumer Deployment**: All processors use the same container image with `CONSUMER_TYPE` environment variable to control which consumers run. Light and heavy processors run in separate deployments with different resource allocations.

### Phase 10: Document Shards & Processing (Future - Week 8-9)

**Reference**: `INTEGRATION_SHARD_TYPES_ARCHITECTURE.md` Part 2, `MULTI_MODAL_INTEGRATION_PLAN_SHARD_BASED.md` Phase 2

#### 10.1 Create Document Shard Type

- Document shard type created in Phase 0 (via ensureShardTypes)
- TypeScript interface `DocumentStructuredData` defined in Phase 0
- Schema includes: title, documentType, mimeType, size, blobStorageUrl, extractedText, summary, keyTopics, linkedOpportunityIds, etc.

#### 10.2 Implement Document Processing Pipeline

- Create `DocumentProcessorConsumer` for `integration.document.detected` events
- **Processing Strategy**: Synchronous for small docs (< 5MB), async for large (>= 5MB)
- **Small Documents** (< 5MB):
                                - Download → Store in Blob → Extract → Analyze → Link → Store complete shard (all in one consumer)
                                - Latency: 5-30 seconds
- **Large Documents** (>= 5MB):
                                - Download → Store in Blob → Create **partial shard** immediately (processingStatus="pending")
                                - Partial shard is **immediately visible to users** with "Processing..." badge
                                - Publish `document.processing_required` event
                                - Separate `DocumentAnalysisConsumer` processes: Extract → Analyze → Update shard
                                - Latency: Initial shard in 2-5 seconds, full analysis in 1-5 minutes
- Entity linking: Fast linking during shard creation, deep linking async
- Publish `document.processed` and `shard.created` events

**Reference**: See `INTEGRATION_QUESTIONS_ANSWERS_PART1.md` Section 2.3 and `INTEGRATION_ADDITIONAL_QUESTIONS_ANSWERS.md` Section 5 for implementation details

#### 10.3 Create Document Queue

- Create `integration_documents` RabbitMQ queue
- DLQ: `integration_documents.dlq`
- Prefetch: 5 (slow processing)
- TTL: 24 hours

### Phase 11: Communication Shards (Future - Week 9-10)

**Reference**: `INTEGRATION_SHARD_TYPES_ARCHITECTURE.md` Part 3

#### 11.1 Create Email Shard Type

- Create Email shard type
- Schema includes: subject, threadId, from, to, body, sentiment, actionItems, linkedOpportunityIds, etc.

#### 11.2 Implement Email Processing Pipeline

- Create `EmailProcessorConsumer` for `integration.email.received` events
- Parse email metadata
- Process attachments (create Document shards)
- Content analysis: sentiment, topics, action items
- Participant matching to contacts
- Entity linking to opportunities
- Create Email shard
- Publish `email.processed` and `shard.created` events

#### 11.3 Create Message Shard Type

- Create Message shard type for Slack/Teams
- Schema includes: messageId, channelId, text, mentions, reactions, linkedOpportunityIds, etc.

#### 11.4 Implement Message Processing Pipeline

- Create `MessageProcessorConsumer` for `integration.message.received` events
- Parse message metadata
- Channel classification
- Content analysis
- Entity extraction and linking
- Create Message shard

#### 11.5 Create Communications Queue

- Create `integration_communications` RabbitMQ queue
- Handles both emails and messages
- Prefetch: 10 (medium processing)

### Phase 12: Meeting & Calendar Shards (Future - Week 10-11)

**Reference**: `INTEGRATION_SHARD_TYPES_ARCHITECTURE.md` Parts 4-5

#### 12.1 Create Meeting Shard Type

- Create Meeting shard type
- Schema includes: meetingId, title, participants, recording, transcript, analysis (actionItems, objections, commitments), engagement metrics, etc.

#### 12.2 Implement Meeting Processing Pipeline

- Create `MeetingProcessorConsumer` for `integration.meeting.completed` events
- Download recording (store in Blob Storage)
- Transcribe (Azure Speech Services or existing transcript)
- Content analysis: meeting type, key moments, action items, objections, commitments
- Engagement metrics: talk time ratio, question count
- Participant mapping to contacts
- Entity linking to opportunities
- Recommendation generation
- Create Meeting shard

#### 12.3 Create Calendar Event Shard Type

- Create CalendarEvent shard type
- Schema includes: eventId, title, startTime, attendees, meetingShardId, linkedOpportunityIds, etc.

#### 12.4 Implement Event Processing Pipeline

- Create `EventProcessorConsumer` for `integration.event.created` events
- Parse event metadata
- Attendee matching
- Event classification
- Entity linking
- Create CalendarEvent shard

#### 12.5 Create Meetings & Events Queues

- Create `integration_meetings` queue (prefetch: 3, very slow processing)
- Create `integration_events` queue (prefetch: 15, fast processing)

### Phase 13: Entity Linking Service (Future - Week 11-12)

**Reference**: `MULTI_MODAL_INTEGRATION_PLAN_SHARD_BASED.md` Phase 5

#### 13.1 Create Entity Linking Service

- Create `EntityLinkingService` in `integration-sync` or new service
- Implement multiple linking strategies:

                                1. Explicit Reference (confidence: 100%)
                                2. Participant Matching (confidence: 80-90%)
                                3. Content Analysis / LLM-based (confidence: 60-80%)
                                4. Temporal Correlation (confidence: 40-60%)
                                5. Vector Similarity (confidence: 30-50%)

- Apply all strategies in parallel
- Merge and deduplicate results
- Apply confidence threshold (> 60%)
- Create shard relationships via shard-manager

#### 13.2 Integrate Entity Linking

- Call entity linking service from:
                                - Document processor (after content analysis)
                                - Email processor (after participant matching)
                                - Message processor (after content analysis)
                                - Meeting processor (after participant mapping)
- Auto-attach if confidence > 80%
- Suggest if confidence 60-80% (user review)
- Ignore if confidence < 60%

### Phase 14: Activity Aggregation (Future - Week 12)

**Reference**: `INTEGRATION_SHARD_TYPES_ARCHITECTURE.md` Part 6

#### 14.1 Create Activity Shard Type

- Create Activity shard type for unified activity tracking
- Aggregate from: Email, Meeting, Message shards
- Schema includes: activityType, sourceShardId, participants, activityDate, engagementScore, etc.

#### 14.2 Create Interaction Shard Type

- Create Interaction shard type for relationship tracking
- Track person-to-person interactions
- Calculate relationship strength
- Schema includes: fromContactId, toContactIds, interactionType, strength, frequency, recency, etc.

#### 14.3 Implement Activity Aggregation Service

- Create `ActivityAggregationService`
- Listen for `shard.created` events (Email, Meeting, Message)
- Create corresponding Activity shards
- Create Interaction shards for relationships
- Update aggregate statistics
- Enable timeline queries

### Phase 15: Multi-Modal Integration Updates (Future - Week 12-13)

#### 15.1 Update Integration Sync Service for Multi-Modal

- Add routing logic to publish events to appropriate queues:
                                - CRM entities → `integration_data_raw`
                                - Documents → `integration_documents`
                                - Emails → `integration_communications`
                                - Messages → `integration_communications`
                                - Meetings → `integration_meetings`
                                - Calendar Events → `integration_events`
- Add data type detection
- Update event publishers

#### 15.2 Update Field Mapper for All Shard Types

- Extend `FieldMapperService` to support:
                                - Document field mappings
                                - Email field mappings
                                - Message field mappings
                                - Meeting field mappings
                                - Calendar event field mappings
- Add shard-type-specific transformation logic

#### 15.3 Update Event Schemas

- Add new event types:
                                - `integration.document.detected`, `integration.document.processed`
                                - `integration.email.received`, `integration.email.processed`
                                - `integration.message.received`, `integration.message.processed`
                                - `integration.meeting.completed`, `integration.meeting.processed`
                                - `integration.event.created`, `integration.event.processed`
                                - `entity.linked`
- Update `logs-events.md` documentation

## Success Criteria

### Phase 0-3 (CRM Data Flow)

1. ✅ Opportunity shard type updated with ML and integration tracking fields
2. ✅ Account and Contact shard types verified/updated
3. ✅ All integration data flows through RabbitMQ for async processing
4. ✅ Field mappings applied correctly via dedicated consumer
5. ✅ Shard events published and trigger vectorization
6. ✅ Opportunity events trigger risk → forecast → recommendations chain (sequential)
7. ✅ Batch events supported for large syncs (integration.opportunities.updated.batch)
8. ✅ All credentials use Secret Management Service (verified)
9. ✅ Dead-letter queue configured and monitored
10. ✅ Idempotency keys prevent duplicate processing
11. ✅ Batch processing implemented for large syncs
12. ✅ Integration config caching reduces API calls
13. ✅ Retry strategy with exponential backoff implemented
14. ✅ Circuit breaker protects against cascading failures
15. ✅ Prometheus metrics and Grafana dashboard created
16. ✅ Sequential processing: risk → forecast → recommendations
17. ✅ Unit tests achieve 80%+ coverage
18. ✅ Integration tests verify end-to-end flow including downstream services
19. ✅ Documentation updated with new architecture
20. ✅ Backward compatibility maintained with feature flag

### Future Phases (Multi-Modal)

21. ✅ All new shard types created (Document, Email, Message, Meeting, CalendarEvent, Activity, Interaction)
22. ✅ All specialized processors implemented
23. ✅ All multi-modal queues created and configured
24. ✅ Entity linking service implemented with all strategies
25. ✅ Activity aggregation service implemented
26. ✅ Azure Blob Storage integrated for documents and recordings
27. ✅ Azure Cognitive Services integrated (OCR, Speech-to-Text)
28. ✅ All event schemas documented
29. ✅ Multi-modal integration tests passing
30. ✅ Performance targets met for all data types

### Configuration System (Phase 10)

31. ✅ Super Admin APIs implemented (integration catalog, shard types, system settings, monitoring)
32. ✅ Tenant Admin APIs implemented (connections, sync config, field mappings, entity linking, processing, health)
33. ✅ Super Admin UI implemented (4 main pages, 30+ API endpoints)
34. ✅ Tenant Admin UI implemented (6 main pages, 50+ API endpoints)
35. ✅ Shared UI components library created (IntegrationLogo, StatusBadge, etc.)
36. ✅ TypeScript interfaces created for all configuration types
37. ✅ OAuth flow implemented for integration connections
38. ✅ Field mapping editor with test functionality
39. ✅ Suggested links review UI implemented
40. ✅ Integration health dashboard with metrics and charts
41. ✅ All 80+ API endpoints documented and tested
42. ✅ All 50+ UI components implemented and tested

## Best Practices & Recommendations

### 1. Dead-Letter Queue (DLQ)

- **Configuration**: All queues must have DLQ configured
- **Monitoring**: Alert on DLQ depth > 100 messages
- **Handling**: DLQ handler for manual review and replay
- **TTL**: Messages in DLQ expire after 7 days

### 2. Idempotency

- **Key Format**: `${integrationId}-${externalId}-${syncTaskId}`
- **Storage**: Redis with 24-hour TTL (or Cosmos DB with TTL)
- **Check**: Before processing, verify idempotency key not seen
- **Metrics**: Track idempotency hit rate (duplicate detection)

### 3. Batch Processing

- **Threshold**: Use batch events when sync > 100 records
- **Batch Size**: 50 records per batch (configurable)
- **Concurrency**: Process batches in parallel (10 concurrent)
- **Fallback**: Single events for webhooks and small syncs

### 4. Integration Config Caching

- **Cache**: Redis with 10-minute TTL
- **Key**: `integration_config:${integrationId}:${tenantId}`
- **Invalidation**: On `integration.updated` events
- **Fallback**: Fetch from integration-manager on cache miss

### 5. Error Handling & Retries

- **Retry Strategy**: Exponential backoff (1s, 2s, 4s, 8s)
- **Max Retries**: 3 attempts
- **Retry On**: Network errors, 5xx, 429 (rate limit), timeouts
- **Don't Retry**: 4xx (except 429), validation errors
- **Circuit Breaker**: Protect shard-manager API calls

### 6. Monitoring & Observability

- **Metrics**: Prometheus metrics for all key operations
- **Tracing**: Distributed tracing with correlation IDs
- **Logging**: Structured logging with context (integrationId, tenantId, correlationId)
- **Dashboards**: Grafana dashboard for integration data flow
- **Alerts**: Queue depth, error rate, circuit breaker state

### 7. Prefetch Configuration

- **Mapping Consumer**: `prefetch(20)` - fast processing
- **Vectorization Consumer**: `prefetch(5-10)` - slower processing
- **Tuning**: Adjust based on processing time and memory

### 8. Message Ordering

- **Default**: No ordering guarantees (parallel processing)
- **If Needed**: Use single consumer per integration or RabbitMQ consumer groups
- **Document**: Ordering requirements per integration type

### 9. Field Mapper Extensibility

- **Plugin System**: Register custom transformers per integration
- **Transform Functions**: Support in field mappings (`transform: "customFunction"`)
- **Validation**: Validate mapped data before storage
- **Conditional Mappings**: Support if/then/else logic

### 10. Backward Compatibility

- **Migration Strategy**: Direct refactoring (no feature flag needed in development)
- **Shard Migration**: Lazy migration (optional fields, populate on next sync)
- **Schema Evolution**: Optional fields, version-controlled shard types

## Risk Mitigation

- **Event Ordering**: Use correlation IDs to track record processing (no strict ordering required)
- **Mapping Failures**: Retry logic (3 attempts) + dead-letter queue + monitoring
- **Performance**: Batch processing for large syncs, prefetch tuning, parallel processing
- **Secret Management**: Audit tool to verify compliance, no hardcoded credentials
- **Backward Compatibility**: Feature flag, support both sync and async flows during migration
- **Idempotency**: Prevent duplicate processing with idempotency keys
- **Circuit Breaker**: Protect against cascading failures
- **Config Caching**: Reduce load on integration-manager
- **Monitoring**: Comprehensive metrics and alerting for early problem detection