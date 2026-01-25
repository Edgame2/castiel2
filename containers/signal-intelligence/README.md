# Signal Intelligence Module

Signal analysis and intelligence service for Castiel, providing communication analysis, calendar intelligence, social signal monitoring, product usage integration, competitive intelligence, and customer success integration.

## Features

- **Communication Analysis**: Analyze email and meeting communications
- **Calendar Intelligence**: Calendar pattern analysis
- **Social Signal**: Social media monitoring
- **Product Usage**: Product usage integration
- **Competitive Intelligence**: Competitive intelligence gathering
- **Customer Success Integration**: Customer success data integration

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

- `signal_communications` - Communication analysis data (partition: `/tenantId`)
- `signal_calendar` - Calendar intelligence data (partition: `/tenantId`)
- `signal_social` - Social signal data (partition: `/tenantId`)

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

- `signal.communication.analyzed` - Communication analyzed
- `signal.calendar.analyzed` - Calendar analyzed
- `signal.social.detected` - Social signal detected

### Consumed Events

- (None currently)

## Dependencies

- **ai-service**: For AI-powered analysis
- **analytics-service**: For analytics
- **integration-manager**: For integration access

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
