# Data Enrichment Module

Data enrichment and vectorization pipeline service for Castiel, providing AI-powered enrichment, vectorization, shard embedding management, and relationship processing.

## Features

- **AI Enrichment**: Entity extraction, classification, summarization, sentiment analysis, key phrase extraction
- **Vectorization**: Convert shard content to embeddings for semantic search
- **Enrichment-before-embedding**: On shard create/update, runs enrichment then calls the **embeddings** service (`POST /api/v1/shard-embeddings/generate`) for shard embedding generation. Supported shard types for vectorization: `document`, `email`, `meeting`, `message`, `calendarevent`.
- **Re-embedding scheduler**: Scheduled batch re-embedding (calls embeddings service `POST /api/v1/shard-embeddings/regenerate-type`). Template-based shard embeddings are owned by the **embeddings** service.
- **Relationship Processing**: Process shard relationships and links
- **ACL Integration**: Access control list processing
- **Batch Processing**: Bulk enrichment operations

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

- `data-enrichment_data` - Main data container

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

- `enrichment.job.completed` - Enrichment job completed
- `enrichment.job.failed` - Enrichment job failed
- `vectorization.completed` - Vectorization completed

### Consumed Events

- `shard.created` - Trigger enrichment and embedding generation for new shards
- `shard.updated` - Trigger re-enrichment and embedding generation for updated shards

## Dependencies

- **shard-manager**: For shard access
- **embeddings**: For embedding storage and similarity search
- **ai-service**: For AI-powered enrichment processing

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
