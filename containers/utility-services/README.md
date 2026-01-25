# Utility Services Module

Utility and helper services for Castiel, providing import/export functionality, schema migrations, computed fields, field validation, user onboarding, project activity tracking, and service registry.

## Features

- **Import/Export**: Import and export data
- **Schema Migration**: Schema migration management
- **Computed Fields**: Computed field processing
- **Field Validation**: Field validation service
- **User Onboarding**: User onboarding workflows
- **Project Activity**: Project activity tracking
- **Service Registry**: Service registry management

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

- `utility_imports` - Import jobs (partition: `/tenantId`)
- `utility_exports` - Export jobs (partition: `/tenantId`)
- `utility_migrations` - Schema migrations (partition: `/tenantId`)

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

- `utility.import.completed` - Import job completed
- `utility.export.completed` - Export job completed
- `utility.migration.completed` - Schema migration completed

### Consumed Events

- (None currently)

## Dependencies

- Various (low coupling)

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
