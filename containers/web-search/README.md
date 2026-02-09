# Web Search Module

Web search integration and context service for Castiel, providing web search integration, result caching, and context integration for AI conversations.

## Features

- **Web Search Integration**: Integrate with web search providers
- **Search Result Caching**: Cache web search results
- **Context Integration**: Integrate web search results into AI context

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

- `web_search_results` - Web search results (partition: `/tenantId`)
- `web_search_cache` - Web search cache (partition: `/tenantId`)
- `web_search_schedules` - Recurring search schedules (partition: `/tenantId`)

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

- `web-search.completed` - Web search completed

### Consumed Events

- (None currently)

## Dependencies

- **ai-service**: For AI-powered search processing
- **context-service**: For context integration
- **embeddings**: For semantic search

## Runbooks (dataflow Phase 4.3)

- **DLQ for failed enrichment/search**: Inspect RabbitMQ dead-letter queues (e.g. `usage_ingestion.dlq`, `integration_data_raw.dlq`) for failed messages; fix payload or consumer and replay.
- **Replay with idempotency**: Usage ingestion uses in-process idempotency key `tenantId:accountId:date`; c_search creation is one-per-search (no dedup). For schedule replay, re-trigger via API or scheduler.
- **Verify policy**: Check Cosmos `integration_processing_settings` (per-tenant document) for `documentProcessing`, `emailProcessing`, `meetingProcessing` flags. Check `risk_tenant_ml_config` (document id = tenantId) for `shardTypeAnalysisPolicy` (useForRiskAnalysis, useForRecommendationGeneration per shard type).

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
