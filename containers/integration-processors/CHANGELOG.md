# Changelog

All notable changes to this module will be documented in this file.

## [Unreleased]

### Changed
- **Shard type seeding**: Removed `ensureShardTypes()` and local shard type definitions. Shard types (system and platform) are now seeded only by shard-manager bootstrap. Start shard-manager with `bootstrap.enabled` (and optionally `bootstrap.ensure_cosmos_containers`) before starting integration-processors.

## [1.0.0] - 2026-01-28

### Added
- **Integration Processors Container**: New container for processing integration data
  - HTTP server with health checks, metrics, and suggested links API
  - Consumer starter with `CONSUMER_TYPE` support (light/heavy/all)
  - Startup sequence with dependency checks and shard type initialization
- **CRMDataMappingConsumer**: Consumes `integration.data.raw` events
  - Applies field mappings using `FieldMapperService`
  - Calculates simple ML fields (daysInStage, daysSinceLastActivity, etc.)
  - Stores shards via shard-manager API
  - Publishes opportunity events (with debouncing)
  - Idempotency checking (in-memory, Redis support planned)
  - Integration config caching (10-minute TTL)
  - Batch event processing support
- **Shard Type Management**: Automatic shard type creation/update on startup
  - `ensureShardTypes()` function creates/updates all required shard types
  - Supports Opportunity, Document, Email, Message, Meeting, CalendarEvent, Activity, Interaction
  - Idempotent (safe to run multiple times)
- **DocumentProcessorConsumer**: Consumes `integration.document.detected` events
  - Downloads documents from external URLs
  - Stores documents in Azure Blob Storage
  - Extracts text from various formats (PDF, DOCX, XLSX, TXT, HTML)
  - Creates Document shards with extracted content
  - Publishes `document.processed` events
- **EmailProcessorConsumer**: Consumes `integration.email.received` events
  - Parses email metadata (from, to, subject, body)
  - Processes attachments (creates Document shards)
  - Extracts plain text from HTML
  - Creates Email shards
  - Publishes `email.processed` events
- **MessageProcessorConsumer**: Consumes `integration.message.received` events
  - Parses message metadata (from, text, mentions, reactions)
  - Processes attachments (creates Document shards)
  - Classifies channel types (direct, group, public, private)
  - Creates Message shards
  - Publishes `message.processed` events
- **MeetingProcessorConsumer**: Consumes `integration.meeting.completed` events
  - Downloads and stores meeting recordings in Azure Blob Storage
  - Downloads/parses transcripts (JSON, VTT formats)
  - Analyzes meeting content using LLM (meeting type, topics, action items, objections, commitments)
  - Calculates engagement metrics
  - Creates Meeting shards with intelligence
  - Publishes `meeting.processed` events
- **EventProcessorConsumer**: Consumes `integration.event.created` events
  - Parses calendar event metadata
  - Classifies event types (meeting, call, interview, demo, training, personal, other)
  - Classifies attendees (internal vs external)
  - Determines if event is deal-related
  - Creates CalendarEvent shards
  - Publishes `event.processed` events
- **ActivityAggregationConsumer**: Consumes `shard.created` events (Email, Meeting, Message)
  - Creates unified Activity shards from Email, Meeting, and Message shards
  - Creates Interaction shards for relationship tracking
  - Aggregates activities for unified timeline view
  - Publishes `activity.created` events
- **ActivityAggregationService**: Service for activity aggregation
  - Transforms Email/Meeting/Message shards to Activity format
  - Extracts participants, subject, description, duration, sentiment
  - Creates Interaction shards for person-to-person relationships
  - Calculates importance and engagement metrics
- **Multi-Modal Services**: Supporting services for multi-modal processing
  - `BlobStorageService`: Azure Blob Storage integration for documents and recordings
  - `DocumentDownloadService`: Safe file downloads with timeout and size limits
  - `TextExtractionService`: Text extraction from various document formats
  - `TranscriptionService`: Transcript parsing (JSON, VTT formats) with Azure Speech Services placeholder
  - `MeetingAnalysisService`: LLM-based meeting content analysis
- **Health & Metrics**: HTTP endpoints for monitoring
  - `/health` - Basic health check
  - `/ready` - Readiness check (RabbitMQ, Shard Manager, Blob Storage)
  - `/metrics` - Prometheus metrics
- **Suggested Links API**: API for reviewing entity linking suggestions
  - `GET /api/v1/suggested-links` - Get pending suggestions
  - `POST /api/v1/suggested-links/:id/approve` - Approve link
  - `POST /api/v1/suggested-links/:id/reject` - Reject link
- **Periodic Jobs**: ML field recalculation job (daily at 2 AM)
  - Runs in 'light' or 'all' consumer mode
  - Publishes recalculation events for active opportunities

### Configuration

- `consumer.type` - Consumer type: `light`, `heavy`, or `all`
- `mapping.queue_name` - RabbitMQ queue for raw data events
- `mapping.prefetch` - RabbitMQ prefetch count (default: 20)
- `mapping.batch_size` - Batch size for batch events (default: 50)
- `mapping.batch_threshold` - Threshold for batch events (default: 100)
- Azure Blob Storage and Cognitive Services configuration
