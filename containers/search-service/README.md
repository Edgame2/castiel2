# Search Service Module

Advanced search and vector search service for Coder IDE.

## Features

- **Vector Search**: Semantic search using embeddings
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

