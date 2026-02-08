# Integration Processors Module - Architecture

## Overview

The Integration Processors module consumes raw integration data from RabbitMQ, applies field mappings and multi-modal processing (documents, emails, messages, meetings, calendar events), and persists results as shards via the Shard Manager. It also exposes HTTP APIs for entity linking settings, processing settings, suggested links, and admin monitoring.

## Data Flow

```
RabbitMQ (integration.data.raw, integration.document.detected, etc.)
    ↓
Consumers (CRMDataMapping, DocumentProcessor, EmailProcessor, etc.)
    ↓
Integration Manager (config) / Shard Manager (create/update shards)
    ↓
Cosmos DB (shards) / Azure Blob (documents, recordings)
    ↓
Published events (integration.data.mapped, integration.document.processed, etc.)
```

HTTP API (separate path):

```
Client (JWT + X-Tenant-ID)
    ↓
Routes (entity-linking, processing, suggested-links, admin/monitoring)
    ↓
Services / Cosmos DB (settings, suggested links)
    ↓
Shard Manager (relationships, when approving links)
```

## Core Components

### Consumers (event-driven)

- **CRMDataMappingConsumer** – Consumes `integration.data.raw`, applies field mappings, writes shards.
- **DocumentProcessorConsumer** – Documents; text extraction, OCR, content analysis.
- **EmailProcessorConsumer** – Email processing pipeline.
- **MessageProcessorConsumer** – Message processing.
- **MeetingProcessorConsumer** – Meeting/recording processing (transcription, etc.).
- **EventProcessorConsumer** – Calendar events.
- **EntityLinkingConsumer** – Suggests/creates entity links from shard events.
- **MLFieldAggregationConsumer** – Computes relationship counts (documentCount, emailCount, etc.).
- **ActivityAggregationConsumer** – Unified activity tracking across Email/Meeting/Message.

Consumer type is controlled by `CONSUMER_TYPE` (light / heavy / all). Light runs fast processors; heavy runs document and meeting processors; all runs everything (e.g. development).

### HTTP Routes

- **Health** – `GET /health`, `GET /ready` (dependencies: RabbitMQ, Shard Manager, optional Blob).
- **Metrics** – `GET /metrics` (Prometheus; optional Bearer auth).
- **Suggested Links** – `GET/POST /api/v1/suggested-links`, approve/reject (legacy and entity-linking variants).
- **Entity Linking** – `GET/PUT /api/v1/entity-linking/settings`, `GET/POST /api/v1/entity-linking/rules`, suggested-links approve/reject/approve-all.
- **Processing** – `GET/PUT /api/v1/processing/settings` (document, email, meeting processing config).
- **Admin Monitoring** – `GET /api/v1/admin/monitoring/health|queues|dlq|processors|integrations|errors|performance` (Super Admin).

### Services

- **MonitoringService** – System health, queue metrics, DLQ, processor status, integration/error/performance metrics.
- **BlobStorageService**, **DocumentDownloadService**, **TextExtractionService**, **TranscriptionService**, **MeetingAnalysisService** – Used by document/meeting processors.
- **ActivityAggregationService**, **ActivityAggregationConsumer** – Activity aggregation.

## Database and Storage

- **Cosmos DB** (config-driven containers): suggested links, entity linking settings, linking rules, processing settings. Partitioning is tenant-scoped where applicable.
- **Azure Blob Storage** – Documents, recordings, attachments (containers from config).
- **Shard Manager** – Creation/update of shards and relationships (no direct DB from this module for shard data).

## External Dependencies

- **RabbitMQ** – Event consumption and publishing.
- **Integration Manager** – Integration configuration and field mappings.
- **Shard Manager** – Shard types, create/update shards, relationships.
- **Secret Management** – Credentials (via Integration Manager).
- **Azure Cognitive Services** – Computer Vision (OCR), Speech (transcription) when configured.

## Configuration

All configuration is in `config/default.yaml` with environment variable overrides. No hardcoded service URLs. Key sections: `server`, `cosmos_db`, `jwt`, `services` (auth, logging, integration_manager, shard_manager, secret_management), `rabbitmq`, `consumer.type`, `mapping`, `azure` (blob_storage, cognitive_services), `metrics`.
