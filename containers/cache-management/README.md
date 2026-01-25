# Cache Management Module

Advanced cache management and optimization service for Castiel, providing cache monitoring, optimization, semantic caching, vector search caching, and cache warming capabilities.

## Features

- **Cache Monitoring**: Track cache hit rates, response times, and performance metrics
- **Cache Optimization**: Optimize cache strategies and TTL settings
- **Semantic Caching**: Semantic similarity-based caching
- **Vector Search Caching**: Cache vector search results
- **Cache Warming**: Pre-warm cache with frequently accessed data
- **Cache Subscriber**: Subscribe to cache events

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `cache-management_data` - Main data container

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

See [OpenAPI Spec](./openapi.yaml)

## Events

### Published Events

- `cache.metrics.updated` - Cache metrics updated
- `cache.strategy.updated` - Cache strategy updated

### Consumed Events

- (None currently)

## Dependencies

- **cache-service**: For cache operations
- **embeddings**: For semantic caching

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
