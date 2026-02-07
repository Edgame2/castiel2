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

### Platform bootstrap (Cosmos containers and shard types)

Shard-manager can ensure **all platform Cosmos DB containers** and **all shard types** at startup. This is the single place for platform bootstrap.

| Config | Default | Description |
|--------|---------|-------------|
| `bootstrap.ensure_cosmos_containers` | false | If true, ensure every container in `config/cosmos-containers.yaml` exists (partition key `/tenantId`, optional TTL). |
| `bootstrap.cosmos_containers_manifest_path` | config/cosmos-containers.yaml | Path to the central container manifest (relative to shard-manager root). |
| `bootstrap.enabled` | false | If true, seed system and platform shard types for `bootstrap.tenant_id` (created by `bootstrap.created_by`). |

**Order of operations for new environments:**

1. Start shard-manager with bootstrap enabled (e.g. `BOOTSTRAP_ENSURE_COSMOS_CONTAINERS=true` and `BOOTSTRAP_SHARD_TYPES=true` and `BOOTSTRAP_TENANT_ID`, `BOOTSTRAP_CREATED_BY` set). This creates all Cosmos containers from the central manifest and seeds all shard types.
2. Optionally run recommendations migrations 001 and 002 from `containers/recommendations` (feedback containers and feedback-type seed data). See `containers/recommendations/migrations/README.md`.
3. Start other services (integration-processors, recommendations, etc.). They rely on shard-manager having already run bootstrap.

**Optional script (containers only):** From `containers/shard-manager`, run `pnpm run ensure-containers` to ensure all Cosmos containers from the central manifest without starting the server. Requires `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`. Shard type seeding is not performed; start the server with `bootstrap.enabled` for that.

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). When bootstrap is not used, ensure the following containers exist:

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

## BI Sales Risk – Shard Fields

Optional `structuredData` fields for c_opportunity, c_account, c_contact used by BI Sales Risk. Shard-manager does not validate or reject documents that omit them. See [docs/BI_SALES_RISK_SHARD_FIELDS.md](./docs/BI_SALES_RISK_SHARD_FIELDS.md) and [BI_SALES_RISK_SHARD_SCHEMAS.md](../../documentation/requirements/BI_SALES_RISK_SHARD_SCHEMAS.md).

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

