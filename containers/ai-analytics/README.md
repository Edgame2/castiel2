# AI Analytics Module

AI usage analytics and monitoring service for Castiel, providing AI analytics, chat catalog, AI configuration, model seeding, proactive insights, and feedback learning.

## Features

- **AI Analytics**: Track AI usage and performance
- **Chat Catalog**: Manage AI chat catalogs
- **AI Configuration**: AI configuration management
- **Model Seeding**: Seed AI models
- **Proactive Insights**: Generate proactive insights
- **Feedback Learning**: Feedback loop for AI improvement

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

- `ai-analytics_data` - Main data container

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

- `ai.analytics.event.recorded` - AI analytics event recorded
- `ai.feedback.received` - AI feedback received

### Consumed Events

- (None currently)

## Dependencies

- **ai-service**: For AI operations
- **ai-insights**: For insight generation
- **analytics-service**: For analytics integration

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
