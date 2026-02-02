# Integration Sync Module

Integration synchronization and adapter management service for Castiel, providing sync task management, bidirectional synchronization, webhook management, and conflict resolution for third-party integrations.

## Features

- **Async Data Flow**: All integration data flows through RabbitMQ for asynchronous processing
- **Sync Task Management**: Create, execute, and monitor sync tasks
- **Bidirectional Synchronization**: Two-way data synchronization between Castiel and external systems
- **Webhook Management**: Webhook endpoint configuration and delivery
- **Conflict Resolution**: Automatic and manual conflict resolution strategies
- **Adapter Management**: Integration adapter orchestration
- **Execution Tracking**: Track sync execution history and performance (updated asynchronously via events)
- **Sync Limits**: Configurable max records per sync (default 1000), min interval between syncs per integration (default 5 min), max concurrent syncs per tenant (default 3)
- **Batch Processing**: Automatic batch event publishing for large syncs (>100 records)
- **Event-Driven Architecture**: Integration data published to RabbitMQ for async mapping, storage, and vectorization

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

Key options: `sync_limits.max_records_per_sync`, `sync_limits.min_interval_minutes`, `sync_limits.max_concurrent_syncs_per_tenant` (env: `SYNC_MAX_RECORDS`, `SYNC_MIN_INTERVAL_MINUTES`, `SYNC_MAX_CONCURRENT_PER_TENANT`).

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `integration-sync_data` - Main data container

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

See [OpenAPI Spec](./openapi.yaml)

## Architecture

### Async Data Flow

Integration data now flows asynchronously through RabbitMQ:

1. **Fetch**: Integration adapter fetches data from external system
2. **Publish Raw**: `IntegrationSyncService` publishes `integration.data.raw` (or `integration.data.raw.batch`) events
3. **Map**: `CRMDataMappingConsumer` (in integration-processors) consumes events, applies field mappings, stores shards
4. **Store**: Shards created via shard-manager API
5. **Vectorize**: Data-enrichment consumes `shard.created` events for vectorization
6. **Downstream**: Opportunity events trigger risk → forecast → recommendations chain

### Event Flow Diagram

```
External System → Integration Adapter → IntegrationSyncService
                                              ↓
                                    RabbitMQ (integration.data.raw)
                                              ↓
                                    CRMDataMappingConsumer
                                    (integration-processors)
                                              ↓
                                    Shard Manager API
                                              ↓
                                    RabbitMQ (shard.created)
                                              ↓
                                    Data Enrichment (vectorization)
                                    Risk Analytics (evaluation)
                                    Forecasting (forecast)
                                    Recommendations (recommendations)
```

## Events

### Published Events

- `integration.sync.started` - Sync task started
- `integration.sync.completed` - Sync task completed (published when all records mapped)
- `integration.sync.failed` - Sync task failed
- `integration.data.raw` - Raw data fetched from external system (single record)
- `integration.data.raw.batch` - Batch of raw data records (for large syncs)
- `integration.conflict.detected` - Conflict detected during sync

### Consumed Events

- `integration.data.mapped` - Record successfully mapped and stored (updates sync execution stats)
- `integration.data.mapping.failed` - Mapping failed for a record (updates sync execution stats)
- `shard.updated` - Trigger sync when shards are updated (bidirectional sync)
- `integration.token.refresh-requested` - OAuth token refresh requested for a connection (see OAuth token refresh below)

## OAuth token refresh

A dedicated timer (TokenRefreshService) runs inside integration-sync to refresh OAuth tokens before they expire.

**Flow**

1. **Timer**: On startup, TokenRefreshService starts and runs `checkAndRefreshTokens()` immediately, then on an interval (default 1 hour). Config: `token_refresh.enabled`, `token_refresh.interval_ms`, `token_refresh.expiration_threshold_ms`.
2. **Check-expiring**: integration-sync publishes `integration.token.check-expiring` (with `timestamp`, `thresholdTime`) to RabbitMQ.
3. **integration-manager**: Consumes `integration.token.check-expiring`, queries `integration_connections` for OAuth connections with `oauth.expiresAt <= thresholdTime`, and publishes `integration.token.refresh-requested` for each expiring connection.
4. **integration-sync**: SyncTaskEventConsumer consumes `integration.token.refresh-requested` and calls TokenRefreshService.refreshConnectionTokens(), which calls integration-manager `POST /api/v1/integrations/:integrationId/connections/:connectionId/refresh`.

**Config keys**

- `token_refresh.enabled` (env: `TOKEN_REFRESH_ENABLED`, default: true)
- `token_refresh.interval_ms` (env: `TOKEN_REFRESH_INTERVAL_MS`, default: 3600000 — 1 hour)
- `token_refresh.expiration_threshold_ms` (env: `TOKEN_REFRESH_EXPIRATION_THRESHOLD_MS`, default: 3600000 — 1 hour before expiry)

## Dependencies

- **integration-manager**: For integration configuration and catalog
- **secret-management**: For integration credentials
- **shard-manager**: For shard access and updates

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
