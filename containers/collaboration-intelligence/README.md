# Collaboration Intelligence Module

Collaborative intelligence and insights service for Castiel, providing collaborative insights, collaborative intelligence, memory context, and sharing capabilities.

## Features

- **Collaborative Insights**: Generate insights from collaborative data
- **Collaborative Intelligence**: Collaborative intelligence processing
- **Memory Context**: Memory context service for conversations
- **Sharing**: Sharing service for collaborative features

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

- `collaboration-intelligence_data` - Main data container

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

- `collaboration.insight.generated` - Collaborative insight generated
- `collaboration.memory.updated` - Collaboration memory updated

### Consumed Events

- (None currently)

## Dependencies

- **collaboration-service**: For collaboration features
- **ai-insights**: For AI-powered insights

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
