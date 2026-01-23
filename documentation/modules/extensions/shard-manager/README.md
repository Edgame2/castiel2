# Shard Manager Module

Core data model management service. Shards are the fundamental data entities representing all business objects.

**Service**: `containers/shard-manager/`  
**Port**: 3023  
**API Base**: `/api/v1/shards`  
**Database**: Cosmos DB NoSQL (containers: `shard_shards`, `shard_types`, `shard_revisions`, `shard_edges`, `shard_relationships`)

## Overview

The Shard Manager module provides core data model management for the Coder IDE system. It manages shard lifecycle, schemas (ShardTypes), relationships, and versioning.

## Features

- Shard CRUD operations
- ShardType management (schema definitions)
- Relationship graph management
- Bulk operations
- Versioning and revision history

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/shard-manager/README.md)
- [Architecture Documentation](../../../../containers/shard-manager/architecture.md)
- [Event Documentation](../../../../containers/shard-manager/docs/logs-events.md)

## Dependencies

- Logging (for audit logging)
- User Management (for user context)

