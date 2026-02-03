# integration-processors

Full specification for the Integration Processors container (light and heavy deployments).

## 1. Reference

### Purpose

Multi-modal integration data processing: CRM mapping, documents, emails, messages, meetings, calendar. Consumes `integration.data.raw` (and related queues), applies mappings, writes shards via shard-manager, entity linking, ML field aggregation. Single image deployed as **integration-processors-light** (fast consumers, 0.5 CPU / 1GB) or **integration-processors-heavy** (DocumentProcessor, MeetingProcessor, 2 CPU / 4GB).

### Configuration

Main entries from `config/default.yaml`:

- **server:** `port` (3000), `host`
- **cosmos_db:** endpoint, key, database_id; containers (integration_suggested_links, integration_entity_linking_settings, integration_linking_rules, integration_processing_settings)
- **services:** auth.url, logging.url, integration_manager.url, shard_manager.url, secret_management.url
- **rabbitmq:** url, exchange, queues (integration_data_raw, integration_documents, integration_communications, integration_meetings, integration_events, shard_ml_aggregation, entity_linking), dlq
- **consumer.type:** `CONSUMER_TYPE` = light | heavy | all

### Environment variables

- `PORT`, `COSMOS_DB_*`, `JWT_SECRET`, `RABBITMQ_URL`
- `AUTH_URL`, `LOGGING_URL`, `INTEGRATION_MANAGER_URL`, `SHARD_MANAGER_URL`, `SECRET_MANAGEMENT_URL`
- `CONSUMER_TYPE` (light / heavy / all)
- `AZURE_BLOB_CONNECTION_STRING`, `AZURE_COMPUTER_VISION_*`, `AZURE_SPEECH_*` for heavy processors

### API

Health, metrics (Prometheus), monitoring, processing status, suggested links. See [containers/integration-processors](../../containers/integration-processors/) routes; openapi.yaml if present.

### Events

- **Consumed:** integration.data.raw, integration_documents, integration_communications, integration_meetings, integration_events, shard_ml_aggregation, entity_linking (queues per config).
- **Published:** (downstream) writes to shard-manager; may publish integration.opportunity.updated or similar for risk-analytics.

### Dependencies

- **Downstream:** shard-manager (write shards), integration-manager, logging, auth (optional), Azure Blob and Cognitive Services (heavy).
- **Upstream:** integration-sync, integration-manager (publish raw data to queues).

### Cosmos DB containers

- `integration_suggested_links`, `integration_entity_linking_settings`, `integration_linking_rules`, `integration_processing_settings` (partition key per schema). Shard data written via shard-manager API.

---

## 2. Architecture

- **Internal structure:** Multiple RabbitMQ consumers (CRMDataMapping, DocumentProcessor, EmailProcessor, MessageProcessor, MeetingProcessor, EventProcessor, EntityLinking, MLFieldAggregation, ActivityAggregation); HTTP server for health/metrics/suggested links; BlobStorage, TextExtraction, Transcription services (heavy).
- **Data flow:** Queue message → consumer → mapping/linking/aggregation → shard-manager API / Cosmos / Blob.
- **Links:** [containers/integration-processors/README.md](../../containers/integration-processors/README.md), [containers/integration-processors/logs-events.md](../../containers/integration-processors/logs-events.md).

---

## 3. Deployment

- **Port:** 3000 (internal); docker-compose does not expose host port for light/heavy (internal network only).
- **Health:** `/health` (see health.routes).
- **Scaling:** Light and heavy run as separate compose services (integration-processors-light, integration-processors-heavy); scale each independently.
- **Docker Compose service names:** `integration-processors-light`, `integration-processors-heavy`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Required; all shard writes and Cosmos access are tenant-scoped; events carry tenantId.

---

## 5. Links

- [containers/integration-processors/README.md](../../containers/integration-processors/README.md)
- [containers/integration-processors/config/default.yaml](../../containers/integration-processors/config/default.yaml)
- [containers/integration-processors/logs-events.md](../../containers/integration-processors/logs-events.md)
