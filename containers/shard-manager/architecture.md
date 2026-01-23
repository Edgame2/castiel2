# Shard Manager Module - Architecture

## Overview

The Shard Manager module provides core data model management for the Coder IDE system. Shards are the fundamental data entities representing all business objects (opportunities, contacts, accounts, projects, etc.). This module manages shard lifecycle, schemas (ShardTypes), relationships, and versioning.

## Database Architecture

### Cosmos DB NoSQL Structure

The Shard Manager module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description | Unique Keys | TTL |
|----------------|---------------|-------------|-------------|-----|
| `shard_shards` | `/tenantId` | Main container for all shard documents | - | - |
| `shard_types` | `/tenantId` | ShardType definitions (schemas for shards) | `['/tenantId', '/name']` | - |
| `shard_revisions` | `/tenantId` | Shard revision history for versioning | - | - |
| `shard_edges` | `/sourceId` | Relationship graph edges between shards | - | - |
| `shard_relationships` | `/tenantId` | Shard relationship metadata | - | - |

### Partition Key Strategy

- **Shards**: Partitioned by `/tenantId` for tenant isolation and efficient queries
- **ShardTypes**: Partitioned by `/tenantId` for tenant-scoped schema management
- **Revisions**: Partitioned by `/tenantId` for version history queries
- **Edges**: Partitioned by `/sourceId` for efficient relationship traversal
- **Relationships**: Partitioned by `/tenantId` for tenant isolation

### Indexing Strategy

**Required Composite Indexes**:

```json
{
  "compositeIndexes": [
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/shardTypeId", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/status", "order": "ascending" },
      { "path": "/updatedAt", "order": "descending" }
    ],
    [
      { "path": "/sourceId", "order": "ascending" },
      { "path": "/relationshipType", "order": "ascending" }
    ],
    [
      { "path": "/tenantId", "order": "ascending" },
      { "path": "/name", "order": "ascending" }
    ]
  ]
}
```

## Service Architecture

### Core Services

1. **ShardService** - Shard lifecycle management
   - CRUD operations
   - Validation against ShardType schema
   - Soft delete and restore

2. **ShardTypeService** - Schema management
   - ShardType CRUD operations
   - Schema validation
   - Schema versioning

3. **ShardRelationshipService** - Relationship management
   - Create/delete relationships
   - Graph traversal
   - Relationship queries

4. **ShardBulkService** - Bulk operations
   - Bulk create/update/delete
   - Bulk restore
   - Bulk status changes

5. **ShardRevisionService** - Versioning
   - Revision history
   - Version comparison
   - Rollback capabilities

### Data Flow

```
User Request
    ↓
Authorization Middleware (RBAC)
    ↓
ShardService / ShardTypeService / RelationshipService
    ↓
Cosmos DB Repository
    ↓
Event Publisher (RabbitMQ)
    ↓
Response
```

## Event-Driven Architecture

### RabbitMQ Integration

- **Exchange**: `coder_events` (topic exchange)
- **Queue**: `shard_manager_service`
- **Routing Patterns**: 
  - `shard.*` - Shard lifecycle events
  - `shard.type.*` - ShardType events
  - `shard.relationship.*` - Relationship events

### Event Publishing

All shard management events are published to RabbitMQ for:
- Audit logging (consumed by Logging module)
- Real-time updates (consumed by frontend)
- Integration triggers (consumed by other modules)

See [logs-events.md](./docs/logs-events.md) and [notifications-events.md](./docs/notifications-events.md) for complete event documentation.

## Shard Data Model

### Shard Document Structure

```typescript
interface Shard {
  id: string;                    // Unique shard ID
  tenantId: string;              // Tenant isolation
  shardTypeId: string;           // Reference to ShardType
  status: 'active' | 'deleted' | 'archived';
  data: Record<string, any>;     // Shard data (validated against ShardType schema)
  metadata?: Record<string, any>; // Additional metadata
  tags?: string[];               // Tags for categorization
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;             // User ID
  updatedBy: string;             // User ID
  version: number;                // Version number
}
```

### ShardType Document Structure

```typescript
interface ShardType {
  id: string;                    // Unique ShardType ID
  tenantId: string;              // Tenant isolation
  name: string;                   // Unique name per tenant
  description?: string;
  schema: JSONSchema;            // JSON Schema for validation
  parentTypeId?: string;          // Parent ShardType (inheritance)
  isSystem: boolean;              // System-defined vs user-defined
  createdAt: Date;
  updatedAt: Date;
}
```

### Relationship Document Structure

```typescript
interface ShardRelationship {
  id: string;                    // Unique relationship ID
  tenantId: string;              // Tenant isolation
  sourceId: string;              // Source shard ID
  targetId: string;               // Target shard ID
  relationshipType: string;      // Relationship type (e.g., 'parent', 'related')
  label?: string;                // Optional label
  weight?: number;               // Optional weight for graph algorithms
  bidirectional: boolean;        // Whether relationship is bidirectional
  metadata?: Record<string, any>; // Additional metadata
  createdAt: Date;
  createdBy: string;             // User ID
}
```

## Caching Strategy

### Redis Caching

- **Shard Cache**: Cache frequently accessed shards (TTL: 1 hour)
- **ShardType Cache**: Cache ShardType definitions (TTL: 24 hours)
- **Cache Invalidation**: On shard/shardtype updates/deletes via events

## Performance Considerations

### Cosmos DB Optimization

1. **Partition Key Selection**: `/tenantId` for tenant isolation and efficient queries
2. **Indexing**: Composite indexes for common query patterns
3. **Request Units**: Monitor RU consumption, optimize queries
4. **Bulk Operations**: Use batch operations for better performance

### Query Patterns

- **List Shards**: Filter by `tenantId`, `shardTypeId`, `status`
- **Get Relationships**: Query by `sourceId` (partition key)
- **Search**: Use Cosmos DB SQL queries with indexes

## Scalability

- **Horizontal Scaling**: Cosmos DB auto-scales based on RU configuration
- **Partition Distribution**: Even distribution via `/tenantId` partition key
- **Caching**: Redis caching reduces database load

## Monitoring

- **Health Endpoints**: `/health` (liveness), `/ready` (readiness)
- **Metrics**: Shard creation rate, query performance, cache hit rate
- **Logging**: Structured logging for all operations
- **Audit Trail**: All events published to RabbitMQ for logging

## Dependencies

### External Services

- **Logging**: Audit trail (via RabbitMQ events)
- **User Management**: User context and permissions (via REST API)
- **Cache Service**: Redis for caching (optional)

### Infrastructure

- **Cosmos DB**: Shared database, prefixed containers
- **RabbitMQ**: Event publishing (`coder_events` exchange)
- **Redis**: Caching (optional)

## Future Enhancements

- GraphQL API for complex queries
- Full-text search integration
- Advanced relationship queries (graph algorithms)
- Shard templates
- Bulk import/export
- Shard archiving strategy

