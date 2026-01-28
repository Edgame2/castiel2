# Integration Processors Module

Integration data processors for multi-modal data (CRM, Documents, Emails, Messages, Meetings, Calendar Events). Processes raw integration data, applies field mappings, and stores as shards.

## Features

- **CRM Data Mapping**: Consumes `integration.data.raw` events, applies field mappings, calculates ML fields, stores shards
- **Multi-Modal Processing**: Specialized processors for Documents, Emails, Messages, Meetings, Calendar Events
- **Entity Linking**: Automatic linking of documents, emails, meetings to CRM entities
- **ML Field Aggregation**: Asynchronous calculation of relationship counts (documentCount, emailCount, etc.)
- **Activity Aggregation**: Unified activity tracking across all interaction types (Email, Meeting, Message)
- **Relationship Tracking**: Person-to-person interaction tracking with relationship strength calculation
- **Health & Metrics**: HTTP server with health checks, Prometheus metrics, and suggested links API
- **Flexible Deployment**: Single container image with `CONSUMER_TYPE` environment variable (light/heavy/all)

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+
- Azure Blob Storage (for documents/recordings)
- Azure Cognitive Services (for OCR and transcription)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

Key environment variables:
- `CONSUMER_TYPE` - Consumer type: `light`, `heavy`, or `all` (default: `all`)
- `RABBITMQ_URL` - RabbitMQ connection URL
- `SHARD_MANAGER_URL` - Shard manager service URL
- `INTEGRATION_MANAGER_URL` - Integration manager service URL
- `AZURE_BLOB_CONNECTION_STRING` - Azure Blob Storage connection string
- `AZURE_COMPUTER_VISION_ENDPOINT` - Computer Vision endpoint
- `AZURE_COMPUTER_VISION_KEY` - Computer Vision API key
- `AZURE_SPEECH_ENDPOINT` - Speech Services endpoint
- `AZURE_SPEECH_KEY` - Speech Services API key

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Architecture

### Consumer Types

- **Light** (`CONSUMER_TYPE=light`): Fast processors
  - CRMDataMappingConsumer
  - EmailProcessorConsumer
  - MessageProcessorConsumer
  - EventProcessorConsumer
  - EntityLinkingConsumer
  - MLFieldAggregationConsumer
  - ActivityAggregationConsumer
  - Resources: 0.5 CPU, 1GB memory

- **Heavy** (`CONSUMER_TYPE=heavy`): Slow processors
  - DocumentProcessorConsumer
  - MeetingProcessorConsumer
  - Resources: 2 CPU, 4GB memory

- **All** (`CONSUMER_TYPE=all`): All consumers (development)

### Startup Sequence

1. Load configuration
2. Initialize dependencies (ServiceClient instances)
3. Wait for RabbitMQ (max 30 retries, 2s delay)
4. Wait for Shard Manager (max 30 retries, 2s delay)
5. Ensure all shard types exist (create/update if needed)
6. Start HTTP server (health checks available immediately)
7. Start consumers (based on CONSUMER_TYPE)
8. Start periodic jobs (ML field recalculation, if applicable)

## API Reference

### Health Endpoints

- `GET /health` - Basic health check
- `GET /ready` - Readiness check (dependencies healthy)
- `GET /metrics` - Prometheus metrics

### Suggested Links API

- `GET /api/v1/suggested-links` - Get pending suggested links
- `POST /api/v1/suggested-links/:id/approve` - Approve suggested link
- `POST /api/v1/suggested-links/:id/reject` - Reject suggested link

## Events

### Consumed Events

- `integration.data.raw` - Single raw record from integration-sync
- `integration.data.raw.batch` - Batch of raw records
- `integration.document.detected` - Document detected in external integration
- `integration.email.received` - Email received from external integration
- `integration.message.received` - Message received from external integration
- `integration.meeting.completed` - Meeting completed in external integration
- `integration.event.created` - Calendar event created in external integration
- `shard.created` - Shard created (for ML field aggregation, entity linking, activity aggregation)

### Published Events

- `integration.data.mapped` - Record successfully mapped and stored
- `integration.data.mapping.failed` - Mapping failed
- `integration.opportunity.updated` - Opportunity updated (significant changes only)
- `integration.opportunities.updated.batch` - Batch of opportunities updated
- `integration.opportunity.ml_fields_updated` - ML fields updated
- `integration.document.processed` - Document processed successfully
- `integration.document.processing.failed` - Document processing failed
- `integration.email.processed` - Email processed successfully
- `integration.email.processing.failed` - Email processing failed
- `integration.message.processed` - Message processed successfully
- `integration.message.processing.failed` - Message processing failed
- `integration.meeting.processed` - Meeting processed successfully
- `integration.meeting.processing.failed` - Meeting processing failed
- `integration.event.processed` - Calendar event processed successfully
- `integration.event.processing.failed` - Calendar event processing failed
- `entity.linked` - Entity automatically linked to CRM entity
- `activity.created` - Activity shard created from Email/Meeting/Message
- `activity.aggregation.failed` - Activity aggregation failed

See `logs-events.md` for complete event schemas and documentation.

## Dependencies

- **integration-manager**: For integration configuration
- **shard-manager**: For shard creation/updates
- **secret-management**: For integration credentials (via integration-manager)
- **RabbitMQ**: For event consumption and publishing
- **Azure Blob Storage**: For document/recording storage
- **Azure Cognitive Services**: For OCR and transcription

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
