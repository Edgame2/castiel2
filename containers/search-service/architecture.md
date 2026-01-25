# Search Service Module - Architecture

## Overview

The Search Service module provides advanced search and vector search service for Castiel, including semantic search using embeddings and full-text search with filters.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `search_queries` | `/tenantId` | Search query history (TTL: 90 days) |
| `search_analytics` | `/tenantId` | Search analytics data |
| `web_search_cache` | `/tenantId` | Web search cache |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **SearchService** - Vector search and full-text search
2. **AnalyticsService** - Search query analytics

## Data Flow

```
User Request
    ↓
Search Service
    ↓
Embeddings Service (vector search)
    ↓
Shard Manager (data access)
    ↓
Cosmos DB (store queries and analytics)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Embeddings Service**: For vector operations
- **Shard Manager**: For data access
- **AI Service**: For search intelligence
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
