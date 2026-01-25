# Quality Monitoring Module

Quality monitoring and anomaly detection service for Castiel, providing anomaly detection, explanation quality assessment, explanation monitoring, explainable AI, and data quality validation.

## Features

- **Anomaly Detection**: Detect anomalies in data and AI outputs
- **Explanation Quality**: Assess explanation quality
- **Explanation Monitoring**: Monitor AI explanations
- **Explainable AI**: Generate explainable AI outputs
- **Data Quality**: Validate data quality

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

- `quality-monitoring_data` - Main data container

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

- `quality.anomaly.detected` - Anomaly detected
- `quality.explanation.assessed` - Explanation quality assessed

### Consumed Events

- (None currently)

## Dependencies

- **ai-service**: For AI operations
- **ml-service**: For ML-based quality assessment
- **analytics-service**: For analytics

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
