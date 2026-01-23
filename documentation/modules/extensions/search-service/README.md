# Search Service Module

Advanced search and vector search service.

**Service**: `containers/search-service/`  
**Port**: 3029  
**API Base**: `/api/v1/search`  
**Database**: Cosmos DB NoSQL (containers: `search_queries`, `search_analytics`)

## Overview

The Search Service module provides vector search, advanced full-text search, and search analytics.

## Features

- Vector search using embeddings
- Advanced full-text search
- Search analytics

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/search-service/README.md)

## Dependencies

- Embeddings (for vector embeddings)
- Shard Manager (for data access)
- Logging (for audit logging)

