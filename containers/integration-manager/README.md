# Integration Manager Module

Third-party integrations and webhook management service for Coder IDE.

## Features

- **Integration Management**: CRUD operations for integrations
- **Webhook Management**: Webhook endpoint configuration and delivery
- **Sync Tasks**: Bidirectional sync task management
- **Integration Catalog**: System-wide integration provider catalog
- **Custom Integrations**: User-defined custom API integrations

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+
- Shard Manager Service
- Logging Service
- User Management Service
- Secret Management Service

### Database Setup

- `integration_providers` - Integration provider catalog (partition key: `/category`)
- `integration_integrations` - Tenant integration instances (partition key: `/tenantId`)
- `integration_connections` - Integration connection credentials (partition key: `/integrationId`)
- `integration_webhooks` - Webhook configurations (partition key: `/tenantId`)
- `integration_webhook_deliveries` - Webhook delivery logs (partition key: `/tenantId`, TTL: 7 days)
- `integration_sync_tasks` - Sync task configurations (partition key: `/tenantId`)
- `integration_sync_executions` - Sync execution history (partition key: `/tenantId`, TTL: 30 days)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3026 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/integrations` | List integrations |
| POST | `/api/v1/integrations` | Create integration |
| GET | `/api/v1/integrations/:id` | Get integration |
| PUT | `/api/v1/integrations/:id` | Update integration |
| DELETE | `/api/v1/integrations/:id` | Delete integration |
| GET | `/api/v1/webhooks` | List webhooks |
| POST | `/api/v1/webhooks` | Create webhook |
| GET | `/api/v1/sync-tasks` | List sync tasks |
| POST | `/api/v1/sync-tasks` | Create sync task |

## Events

### Published Events

- `integration.created` - Integration created
- `integration.updated` - Integration updated
- `integration.deleted` - Integration deleted
- `webhook.delivered` - Webhook delivered
- `webhook.failed` - Webhook delivery failed
- `sync.task.completed` - Sync task completed

## Dependencies

- **Shard Manager**: For data synchronization
- **Logging**: For audit logging
- **User Management**: For user context
- **Secret Management**: For credential storage

## License

Proprietary

