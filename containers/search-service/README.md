# Search Service Module

Advanced search and vector search service for Castiel.

## Features

- **Vector Search**: Semantic search using embeddings
- **Hybrid Search**: Vector + keyword with configurable weights
- **Field-weighted relevance** (MISSING_FEATURES 2.3): Rerank by keyword overlap in name (weight 1.0), description (0.8), metadata (0.5); configurable `field_weights` and `field_weight_boost`
- **Advanced Search**: Full-text search with filters
- **Search Analytics**: Search query analytics and insights

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Embeddings Service
- Shard Manager Service
- Logging Service

### Database Setup

- `search_queries` - Search query history (partition key: `/tenantId`, TTL: 90 days)
- `search_analytics` - Search analytics data (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3029 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| embeddings.url | string | - | Embeddings Service URL (required) |
| field_weights | object | name=1, description=0.8, metadata=0.5 | Weights for field-weighted relevance (name > description > metadata) |
| field_weight_boost | number | 0.2 | Additive boost to vector score from field-weighted keyword match; 0 = disabled |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/search/vector` | Vector search |
| POST | `/api/v1/search/advanced` | Advanced search |
| GET | `/api/v1/search/analytics` | Get search analytics |

## Dependencies

- **Embeddings**: For vector embeddings
- **Shard Manager**: For data access
- **Logging**: For audit logging

## License

Proprietary

