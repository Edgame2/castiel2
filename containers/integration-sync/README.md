# Integration Sync Module

Integration synchronization and adapter management service for Castiel, providing sync task management, bidirectional synchronization, webhook management, and conflict resolution for third-party integrations.

## Features

- **Sync Task Management**: Create, execute, and monitor sync tasks
- **Bidirectional Synchronization**: Two-way data synchronization between Castiel and external systems
- **Webhook Management**: Webhook endpoint configuration and delivery
- **Conflict Resolution**: Automatic and manual conflict resolution strategies
- **Adapter Management**: Integration adapter orchestration
- **Execution Tracking**: Track sync execution history and performance
- **Sync Limits**: Configurable max records per sync (default 1000), min interval between syncs per integration (default 5 min), max concurrent syncs per tenant (default 3)

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

## Events

### Published Events

- `integration.sync.started` - Sync task started
- `integration.sync.completed` - Sync task completed
- `integration.sync.failed` - Sync task failed
- `integration.conflict.detected` - Conflict detected during sync

### Consumed Events

- `shard.updated` - Trigger sync when shards are updated

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
