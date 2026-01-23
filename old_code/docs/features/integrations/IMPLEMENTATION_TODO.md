# Implementation TODO

## Overview

Implementation checklist for the Integrations System. Items are organized by phase and priority.

**Current Status**: Phase 1-2 Core Implementation Complete ✅

---

## ✅ Completed Items

### Core Types & Services
- [x] Integration types (`integration.types.ts`, `conversion-schema.types.ts`, `sync-task.types.ts`)
- [x] Integration repositories (definitions, tenant integrations, connections)
- [x] Conversion schema service with 30+ transformations
- [x] Sync task service with scheduling
- [x] Integration connection service (OAuth, API key, basic auth)
- [x] Integration controller with all endpoints
- [x] Integration routes

### Adapters
- [x] Base adapter framework (`base-adapter.ts`)
- [x] Salesforce adapter (OAuth, SOQL, entity mapping)
- [x] Google News adapter (API key, RSS fallback)
- [x] Notion adapter (OAuth, databases, pages, blocks)
- [x] Adapter registry

### Frontend UI
- [x] Integration types for frontend
- [x] React Query hooks for all operations
- [x] Integration list page with category filtering
- [x] Integration configuration page (connection, schemas, tasks, history)
- [x] Schema builder component (visual field mapping)
- [x] New/Edit schema pages
- [x] Sync task form component
- [x] New/Edit task pages

### Database
- [x] Cosmos DB containers configured in `env.ts`

---

## Phase 1: Core Infrastructure (Remaining)

### 1.1 Azure Resources (For Production)

- [ ] Create Service Bus namespace `sb-sync-{env}`
  - [ ] Create queue `sync-inbound-webhook`
  - [ ] Create queue `sync-inbound-scheduled`
  - [ ] Create queue `sync-outbound` (sessions enabled)
  - [ ] Configure dead letter queues
- [ ] Create Event Grid subscriptions
  - [ ] `evgs-sync-inbound` → `sync-inbound-*` queues
  - [ ] `evgs-sync-outbound` → `sync-outbound` queue
- [ ] Configure Key Vault access policies for `func-sync`
- [ ] Create Azure Functions app `func-sync-{env}` (Premium plan)
- [ ] Configure managed identity for `func-sync`

### 1.2 Container Architecture

> **Note**: Integrations use dedicated Cosmos DB containers, NOT shard types. See [Container Architecture](./CONTAINER-ARCHITECTURE.md).

- [x] Create `integration_providers` container
  - [x] Define schema
  - [x] Set partition key: `/category`
  - [x] Add unique keys: `[['/category', '/provider']]`
  - [x] Create system-level permissions
- [x] Create `integrations` container
  - [x] Define schema
  - [x] Set partition key: `/tenantId`
  - [x] Add unique keys: `[['/tenantId', '/providerName', '/name']]`
  - [x] Add tenant-level permissions
- [x] Update `integration-connections` container
  - [x] Add support for `scope: 'user'` and `userId` field
  - [x] Update partition key strategy
- [x] Update base schema for `external_relationships` field in shards

### 1.3 Core Services

- [ ] Implement `CredentialService`
  - [ ] Key Vault integration
  - [ ] Store credentials
  - [ ] Retrieve credentials
  - [ ] Update OAuth tokens
  - [ ] List expiring tokens
- [ ] Implement `IntegrationService`
  - [ ] CRUD operations for integrations
  - [ ] Validation logic
  - [ ] Status management
- [ ] Implement `TransformService`
  - [ ] Field mapping application
  - [ ] Reverse mapping (for write-back)
  - [ ] Custom transforms

---

## Phase 2: Sync Engine

### 2.1 Azure Functions

- [ ] Implement `WebhookReceiver`
  - [ ] HTTP trigger for `/webhooks/{provider}`
  - [ ] Signature validation per provider
  - [ ] Event Grid publishing
- [ ] Implement `SyncScheduler`
  - [ ] Timer trigger (every minute)
  - [ ] Query due integrations
  - [ ] Emit sync events
  - [ ] Update `nextSyncAt`
- [ ] Implement `SyncInboundWebhook`
  - [ ] Service Bus trigger
  - [ ] Process single record from webhook
  - [ ] Upsert shard
- [ ] Implement `SyncInboundScheduled`
  - [ ] Service Bus trigger
  - [ ] Load integration config
  - [ ] Connect via adapter
  - [ ] Fetch records (paginated)
  - [ ] Transform and upsert shards
  - [ ] Create sync history record
- [ ] Implement `SyncOutbound`
  - [ ] Service Bus trigger (sessions)
  - [ ] Reverse field mapping
  - [ ] Call external API
  - [ ] Update sync status
  - [ ] Handle conflicts
- [ ] Implement `TokenRefresher`
  - [ ] Timer trigger (hourly)
  - [ ] Find expiring tokens
  - [ ] Refresh OAuth tokens
  - [ ] Handle refresh failures

### 2.2 Adapter Framework

- [ ] Define `IntegrationAdapter` interface
  - [ ] `connect()` / `disconnect()`
  - [ ] `testConnection()`
  - [ ] `fetchRecords()`
  - [ ] `createRecord()` / `updateRecord()` / `deleteRecord()`
  - [ ] `registerWebhook()` / `validateWebhookSignature()`
- [ ] Implement base adapter class
  - [ ] Common HTTP client
  - [ ] Rate limiting
  - [ ] Error handling
  - [ ] Retry logic

### 2.3 Error Handling

- [ ] Implement error classification
  - [ ] Retryable vs non-retryable
  - [ ] Provider-specific error codes
- [ ] Implement retry logic
  - [ ] Exponential backoff
  - [ ] Max attempts
- [ ] Implement dead letter processing
  - [ ] Move failed jobs to DLQ
  - [ ] Admin notification
- [ ] Implement circuit breaker
  - [ ] Per-integration circuit
  - [ ] Auto-recovery

---

## Phase 3: CRM Adapters

### 3.1 Salesforce Adapter

- [ ] Implement OAuth flow
  - [ ] Authorization URL generation
  - [ ] Token exchange
  - [ ] Token refresh
- [ ] Implement `fetchRecords()`
  - [ ] SOQL query builder
  - [ ] Pagination (queryMore)
  - [ ] Field selection
- [ ] Implement write operations
  - [ ] `createRecord()` (sobjects API)
  - [ ] `updateRecord()`
  - [ ] `deleteRecord()`
- [ ] Implement webhook support
  - [ ] Change Data Capture subscription
  - [ ] Outbound message handling
  - [ ] Signature validation
- [ ] Entity mappings
  - [ ] Account → c_company
  - [ ] Contact → c_contact
  - [ ] Opportunity → c_opportunity
  - [ ] Task/Event → c_note

### 3.2 Dynamics 365 Adapter

- [ ] Implement OAuth flow (Azure AD)
- [ ] Implement `fetchRecords()`
  - [ ] OData query builder
  - [ ] Delta sync support
- [ ] Implement write operations
- [ ] Implement webhook support
- [ ] Entity mappings
  - [ ] account → c_company
  - [ ] contact → c_contact
  - [ ] opportunity → c_opportunity

### 3.3 HubSpot Adapter

- [ ] Implement OAuth flow
- [ ] Implement `fetchRecords()` (REST API)
- [ ] Implement write operations
- [ ] Implement webhook support
- [ ] Entity mappings

---

## Phase 4: Communication Adapters

### 4.1 Microsoft Teams Adapter

- [ ] Implement OAuth flow (Microsoft Identity)
- [ ] Implement message fetching
  - [ ] Channel messages
  - [ ] Chat messages
- [ ] Implement meeting transcript fetching
- [ ] Implement file fetching
- [ ] Implement webhook support
- [ ] Entity mappings
  - [ ] Message → c_note
  - [ ] File → c_document

### 4.2 Zoom Adapter

- [ ] Implement OAuth flow
- [ ] Implement meeting fetching
- [ ] Implement recording download
- [ ] Implement transcript fetching
- [ ] Implement webhook support
- [ ] Entity mappings

### 4.3 Gong Adapter

- [ ] Implement API key authentication
- [ ] Implement call fetching
- [ ] Implement transcript fetching
- [ ] Implement webhook support
- [ ] Entity mappings

---

## Phase 5: Storage & Productivity Adapters

### 5.1 Google Drive Adapter

- [ ] Implement OAuth flow
- [ ] Implement service account support
- [ ] Implement file listing
- [ ] Implement file download
- [ ] Implement Google Docs export
- [ ] Implement webhook (Push notifications)
- [ ] Entity mappings
  - [ ] File → c_document

### 5.2 OneDrive Adapter

- [ ] Implement OAuth flow (Microsoft Identity)
- [ ] Implement file listing
- [ ] Implement delta sync
- [ ] Implement file download
- [ ] Implement webhook support
- [ ] Entity mappings

### 5.3 Notion Adapter ✅

- [x] Implement OAuth flow
- [x] Implement database listing/querying
- [x] Implement page CRUD operations
- [x] Implement block operations (append, update, delete)
- [x] Implement database creation/updates
- [x] Implement dynamic schema from databases
- [x] Entity mappings
  - [x] Database → c_document
  - [x] Page → c_note
  - [x] Database Page → dynamic ShardType

---

## Phase 6: API & UI

### 6.1 Backend API

- [ ] Integration CRUD endpoints
  - [ ] `POST /api/integrations`
  - [ ] `GET /api/integrations`
  - [ ] `GET /api/integrations/:id`
  - [ ] `PATCH /api/integrations/:id`
  - [ ] `DELETE /api/integrations/:id`
- [ ] OAuth endpoints
  - [ ] `GET /api/integrations/oauth/authorize/:provider`
  - [ ] `GET /api/integrations/oauth/callback/:provider`
- [ ] Sync endpoints
  - [ ] `POST /api/integrations/:id/sync` (manual trigger)
  - [ ] `GET /api/integrations/:id/sync-history`
- [ ] Provider endpoints
  - [ ] `GET /api/integration-providers`
  - [ ] `GET /api/integration-providers/:id`
- [ ] Test connection endpoint
  - [ ] `POST /api/integrations/:id/test`

### 6.2 Frontend UI

- [ ] Integration list page
  - [ ] List tenant integrations
  - [ ] Status indicators
  - [ ] Last sync time
- [ ] Add integration wizard
  - [ ] Provider selection
  - [ ] OAuth flow / API key entry
  - [ ] Entity selection
  - [ ] Field mapping UI
  - [ ] Sync schedule configuration
- [ ] Integration detail page
  - [ ] Configuration editing
  - [ ] Sync history
  - [ ] Manual sync trigger
  - [ ] Connection test
- [ ] Conflict resolution UI
  - [ ] List conflicts
  - [ ] Side-by-side comparison
  - [ ] Resolution actions

---

## Phase 7: Monitoring & Operations

### 7.1 Logging

- [ ] Structured logging for all functions
- [ ] Correlation IDs across services
- [ ] Sensitive data masking

### 7.2 Metrics

- [ ] `sync_jobs_processed` counter
- [ ] `sync_jobs_failed` counter
- [ ] `sync_records_created` counter
- [ ] `sync_records_updated` counter
- [ ] `sync_latency_ms` histogram
- [ ] `sync_queue_depth` gauge
- [ ] `writeback_latency_ms` histogram
- [ ] `token_refresh_failures` counter

### 7.3 Alerts

- [ ] High failure rate alert (>10%)
- [ ] Queue backlog alert (>100 pending)
- [ ] Token refresh failure alert
- [ ] Dead letter accumulation alert

### 7.4 Admin Dashboard

- [ ] System-wide sync status
- [ ] Per-tenant sync activity
- [ ] Error rates by provider
- [ ] Dead letter queue viewer
- [ ] Manual retry capability

---

## Phase 8: Third-Party Extensions

### 8.1 Adapter SDK

- [ ] Define adapter SDK interface
- [ ] Create adapter template
- [ ] Create testing harness
- [ ] Document development process

### 8.2 Webhook API

- [ ] Webhook registration endpoint
- [ ] Event delivery to third-party
- [ ] Signature generation
- [ ] Retry logic

### 8.3 Review Process

- [ ] Security review checklist
- [ ] Performance review checklist
- [ ] Deployment pipeline for third-party

---

## Dependencies

```
Phase 1 (Infrastructure) → Phase 2 (Sync Engine)
Phase 2 (Sync Engine) → Phase 3-5 (Adapters)
Phase 3-5 (Adapters) → Phase 6 (API & UI)
Phase 6 (API & UI) → Phase 7 (Monitoring)
Phase 7 (Monitoring) → Phase 8 (Extensions)
```

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Infrastructure | 2 weeks | - |
| Phase 2: Sync Engine | 3 weeks | Phase 1 |
| Phase 3: CRM Adapters | 4 weeks | Phase 2 |
| Phase 4: Communication Adapters | 3 weeks | Phase 2 |
| Phase 5: Storage Adapters | 2 weeks | Phase 2 |
| Phase 6: API & UI | 3 weeks | Phase 3 |
| Phase 7: Monitoring | 2 weeks | Phase 6 |
| Phase 8: Extensions | 3 weeks | Phase 7 |

**Total**: ~22 weeks (5.5 months)

---

**Last Updated**: November 2025  
**Version**: 1.0.0

