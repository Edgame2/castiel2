# Integration Sync Module - Architecture

## Overview

The Integration Sync module provides synchronization and adapter management for third-party integrations in the Castiel system. It manages sync tasks, bidirectional synchronization, webhook handling, and conflict resolution.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `integration_sync_tasks` | `/tenantId` | Sync task configurations |
| `integration_executions` | `/tenantId` | Sync execution history |
| `integration_conflicts` | `/tenantId` | Sync conflicts |
| `integration_webhooks` | `/tenantId` | Webhook configurations |

## Service Architecture

### Core Services

1. **IntegrationSyncService** - Main sync orchestration
   - Sync task creation and execution
   - Bidirectional synchronization
   - Conflict detection and resolution
   - Webhook management

## Integration Points

- **integration-manager**: Integration configuration and catalog
- **secret-management**: Integration credentials
- **shard-manager**: Shard access and updates
