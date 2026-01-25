# Integration Manager Module - Architecture

## Overview

The Integration Manager module provides third-party integrations and webhook management service for Castiel, including integration management, webhook delivery, and sync task management.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `integration_providers` | `/category` | Integration provider catalog |
| `integration_integrations` | `/tenantId` | Tenant integration instances |
| `integration_connections` | `/integrationId` | Integration connection credentials |
| `integration_webhooks` | `/tenantId` | Webhook configurations |
| `integration_sync_tasks` | `/tenantId` | Sync task configurations |
| `integration_executions` | `/tenantId` | Integration execution history |
| `integration_conflicts` | `/tenantId` | Sync conflict data |
| `integration_catalog` | `/category` | Integration catalog |
| `integration_visibility` | `/tenantId` | Integration visibility settings |
| `integration_sync_conflicts` | `/tenantId` | Sync conflict resolution |

### Partition Key Strategy

Most containers are partitioned by `/tenantId` for tenant isolation. Provider catalog uses `/category` for global access.

## Service Architecture

### Core Services

1. **IntegrationService** - Integration CRUD operations
2. **WebhookService** - Webhook management and delivery
3. **SyncService** - Bidirectional sync task management
4. **CatalogService** - Integration catalog management

## Data Flow

```
User Request / Webhook Event
    ↓
Integration Manager Service
    ↓
Secret Management (retrieve credentials)
    ↓
External API / Webhook Delivery
    ↓
Shard Manager (sync data)
    ↓
Cosmos DB (store integration data)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Secret Management**: For credential storage
- **Shard Manager**: For data sharding
- **User Management**: For user context
- **AI Service**: For integration intelligence
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
