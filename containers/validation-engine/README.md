# Validation Engine Module

Comprehensive validation service for Coder IDE, providing syntax validation, semantic validation, architecture validation, security validation, performance validation, and consistency validation.

## Features

- **Syntax Validation**: Validate code syntax
- **Semantic Validation**: Validate code semantics
- **Architecture Validation**: Validate architecture compliance
- **Security Validation**: Validate security requirements
- **Performance Validation**: Validate performance requirements
- **Consistency Validation**: Validate code consistency
- **Rule Management**: Manage validation rules
- **Multi-Stage Validation**: Run validations in stages
- **Validation Results**: Track validation results
- **Custom Rules**: Support for custom validation rules

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Quality Service (for quality checks)
- Security Service (for security validation)

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

- `validation_engine_rules` - Validation rule data
- `validation_engine_runs` - Validation run data

### Environment Variables

```bash
PORT=3036
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
QUALITY_URL=http://localhost:3017
SECURITY_SERVICE_URL=http://localhost:3042
RABBITMQ_URL=amqp://localhost:5672
```

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

## Architecture

The Validation Engine provides multiple validation types:

1. **Syntax**: Code syntax validation
2. **Semantic**: Code semantics validation
3. **Architecture**: Architecture compliance validation
4. **Security**: Security requirements validation
5. **Performance**: Performance requirements validation
6. **Consistency**: Code consistency validation

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `validation.run.created` | `{ runId, type, tenantId }` | Validation run created |
| `validation.run.completed` | `{ runId, passed, errors }` | Validation run completed |
| `validation.rule.violated` | `{ ruleId, violation, location }` | Validation rule violated |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3036 | Server port |
| `server.host` | string | 0.0.0.0 | Server host |
| `cosmos_db.endpoint` | string | - | Cosmos DB endpoint |
| `cosmos_db.key` | string | - | Cosmos DB key |
| `cosmos_db.database_id` | string | castiel | Database ID |

## Testing

```bash
npm test
```

## License

Proprietary - Coder IDE

