# Shard Manager Module

Core data model management service for Castiel. Shards are the fundamental data entities in the system, representing all business objects (opportunities, contacts, accounts, etc.).

## Features

- **Shard CRUD Operations**: Create, read, update, delete shards
- **Shard Type Management**: Define and manage shard schemas (ShardTypes)
- **Relationship Graph**: Manage relationships between shards (graph structure)
- **Bulk Operations**: Bulk create, update, delete, restore operations
- **Shard Linking**: Link shards together with metadata
- **Versioning**: Shard revision history and versioning
- **Event Publishing**: Publish events for shard lifecycle changes

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)
- Logging Service (for audit logging)
- User Management Service (for user context)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `shard_shards` - Main shard documents (partition key: `/tenantId`)
- `shard_types` - ShardType definitions (partition key: `/tenantId`)
- `shard_revisions` - Shard revision history (partition key: `/tenantId`)
- `shard_edges` - Relationship graph edges (partition key: `/sourceId`)
- `shard_relationships` - Relationship metadata (partition key: `/tenantId`)

See [architecture.md](./architecture.md) for container structure and partition key details.

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3023 | Server port |
| server.host | string | 0.0.0.0 | Server host |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| cosmos_db.key | string | - | Cosmos DB access key (required) |
| cosmos_db.database_id | string | castiel | Cosmos DB database ID (shared database) |
| cache.enabled | boolean | true | Enable Redis caching |
| cache.ttl | number | 3600 | Cache TTL in seconds |

See `config/default.yaml` for full configuration options.

## API Reference

See [OpenAPI Specification](./docs/openapi.yaml)

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/shards` | Create a new shard |
| GET | `/api/v1/shards` | List shards with filtering |
| GET | `/api/v1/shards/:id` | Get a single shard |
| PUT | `/api/v1/shards/:id` | Update a shard |
| DELETE | `/api/v1/shards/:id` | Delete a shard |
| POST | `/api/v1/shards/bulk` | Bulk create shards |
| PATCH | `/api/v1/shards/bulk` | Bulk update shards |
| DELETE | `/api/v1/shards/bulk` | Bulk delete shards |
| POST | `/api/v1/shard-types` | Create a shard type |
| GET | `/api/v1/shard-types` | List shard types |
| GET | `/api/v1/shard-types/:id` | Get a shard type |
| PUT | `/api/v1/shard-types/:id` | Update a shard type |
| DELETE | `/api/v1/shard-types/:id` | Delete a shard type |
| POST | `/api/v1/shards/:id/relationships` | Create relationship |
| GET | `/api/v1/shards/:id/relationships` | Get shard relationships |
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check |

## Events

For detailed event documentation including schemas and examples, see:
- [Logs Events](./docs/logs-events.md) - Events that get logged
- [Notifications Events](./docs/notifications-events.md) - Events that trigger notifications

### Published Events

| Event | Description |
|-------|-------------|
| `shard.created` | Shard created |
| `shard.updated` | Shard updated |
| `shard.deleted` | Shard deleted |
| `shard.restored` | Shard restored from deletion |
| `shard.type.created` | ShardType created |
| `shard.type.updated` | ShardType updated |
| `shard.type.deleted` | ShardType deleted |
| `shard.relationship.created` | Relationship created |
| `shard.relationship.deleted` | Relationship deleted |

### Consumed Events

The Shard Manager module does not consume events from other modules. It only publishes events.

## Development

### Running Tests

```bash
npm test           # All tests
npm run test:unit  # Unit tests only
npm run test:int   # Integration tests
```

### Code Style

```bash
npm run lint       # Check linting
npm run lint:fix   # Fix linting issues
```

## Dependencies

- **Logging**: For audit logging (via RabbitMQ events)
- **User Management**: For user context and permissions (via REST API)
- **Cache Service**: For shard caching (optional, Redis)

## Architecture

See [architecture.md](./architecture.md) for detailed architecture documentation.

## License

Proprietary

