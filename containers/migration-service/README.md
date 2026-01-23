# Migration Service Module

Code migrations and refactoring service for Coder IDE, providing migration management, step-based execution, rollback capabilities, and version upgrade handling.

## Features

- **Migration Management**: Create, update, and track code migrations
- **Step-Based Execution**: Execute migrations in discrete steps
- **Rollback Support**: Rollback migrations to previous states
- **Version Upgrades**: Handle version upgrades and breaking changes
- **Migration Planning**: Plan migrations with multiple steps
- **Execution Tracking**: Track migration execution status
- **Result Tracking**: Track migration results and changes
- **Breaking Change Handling**: Handle breaking changes safely

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Execution Service (for code execution)
- Validation Engine (for validation)

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

- `migration_migrations` - Migration data
- `migration_steps` - Migration step data

### Environment Variables

```bash
PORT=3038
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
EXECUTION_URL=http://localhost:3019
VALIDATION_ENGINE_URL=http://localhost:3036
RABBITMQ_URL=amqp://localhost:5672
```

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

The Migration Service provides:

1. **Migration Management**: CRUD operations for migrations
2. **Step Management**: Manage migration steps
3. **Execution**: Execute migrations step-by-step
4. **Rollback**: Rollback migrations safely
5. **Tracking**: Track migration status and results

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `migration.created` | `{ migrationId, name, tenantId }` | Migration created |
| `migration.started` | `{ migrationId, stepId }` | Migration started |
| `migration.completed` | `{ migrationId, result }` | Migration completed |
| `migration.rolled_back` | `{ migrationId, reason }` | Migration rolled back |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3038 | Server port |
| `server.host` | string | 0.0.0.0 | Server host |
| `cosmos_db.endpoint` | string | - | Cosmos DB endpoint |
| `cosmos_db.key` | string | - | Cosmos DB key |
| `cosmos_db.database_id` | string | castiel | Database ID |

## Testing

```bash
npm test
```

## License

Proprietary - Coder IDE

