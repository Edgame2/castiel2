# Data Enrichment Module

Data enrichment and vectorization pipeline service for Castiel, providing AI-powered enrichment, vectorization, shard embedding management, and relationship processing.

## Features

- **AI Enrichment**: Entity extraction, classification, summarization, sentiment analysis, key phrase extraction
- **Vectorization**: Convert shard content to embeddings for semantic search
- **Shard Embedding Management**: Manage embeddings for shards; automatic embedding generation on shard create/update (via EmbeddingTemplateService); scheduled batch re-embedding (reembedding_scheduler)
- **Embedding templates**: This module is the **owner** of template-based shard embeddings. EmbeddingTemplateService and ShardEmbeddingService provide templates, field weights, preprocessing, normalization, and per-shard-type model selection. Supported shard types for vectorization: `document`, `email`, `meeting`, `message`, `calendarevent`. Callers that need template-based shard embeddings (e.g. semantic search over shards, ML feature vectors from shard content) should use data-enrichment APIs (e.g. generate embeddings for a shard via the enrichment/embedding routes).
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
