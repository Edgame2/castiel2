# Integration Manager Module

Third-party integrations and webhook management service.

**Service**: `containers/integration-manager/`  
**Port**: 3026  
**API Base**: `/api/v1/integrations`, `/api/v1/webhooks`, `/api/v1/sync-tasks`  
**Database**: Cosmos DB NoSQL (containers: `integration_providers`, `integration_integrations`, `integration_connections`, `integration_webhooks`, etc.)

## Overview

The Integration Manager module handles third-party integrations, webhook management, and bidirectional sync tasks.

## Features

- Integration CRUD operations
- Webhook management and delivery
- Sync task management
- Integration catalog
- Custom integrations

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/integration-manager/README.md)

## Dependencies

- Shard Manager (for data synchronization)
- Logging (for audit logging)
- User Management (for user context)
- Secret Management (for credential storage)

