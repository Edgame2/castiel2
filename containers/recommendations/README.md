# Recommendations Module

[Description of what this service does]

## Features

- Feature 1
- Feature 2

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

- `recommendations_data` - Main data container

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

- `recommendations.event.name`

### Consumed Events

- `opportunity.updated` - Trigger recommendations when opportunity changes
- `integration.opportunity.updated` - Trigger recommendations when opportunities change via integration sync (waits for risk and forecast to complete)
- `risk.evaluation.completed` - Generate risk-based recommendations
- `forecast.completed` - Generate forecast-based recommendations (ensures sequential processing after risk and forecast)
- `shard.updated` - May trigger contextual recommendations for specific shard types
- `workflow.recommendation.requested` - Triggered by workflow-orchestrator
- `opportunity.outcome.recorded` - Record won/lost for accepted recommendations (dataflow Phase 2.3); calls adaptive-learning record-outcome per accepted rec

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
