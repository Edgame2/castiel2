# Code Generation Module

Specialized code generation tasks service for Castiel, providing UI component generation, API endpoint generation, database schema generation, test data generation, and configuration generation.

## Features

- **UI Component Generation**: Generate React/Vue/Angular components from specifications
- **API Endpoint Generation**: Generate REST API endpoints from requirements
- **Database Schema Generation**: Generate database schemas from models
- **Test Data Generation**: Generate test data and fixtures
- **Configuration Generation**: Generate configuration files
- **Migration Generation**: Generate database migrations
- **IaC Generation**: Generate Infrastructure as Code
- **Template-Based Generation**: Customizable generation templates
- **Natural Language Specification**: Generate code from natural language
- **Context-Aware Generation**: Use codebase context for generation
- **Example-Based Generation**: Learn from examples

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- AI Service (for code generation)
- Context Service (for context assembly)
- Quality Service (for code quality)
- Pattern Recognition Service (for pattern matching)

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

- `codegen_jobs` - Code generation job data
- `codegen_templates` - Generation template data

### Environment Variables

```bash
PORT=3040
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
AI_SERVICE_URL=http://localhost:3006
CONTEXT_SERVICE_URL=http://localhost:3034
QUALITY_URL=http://localhost:3017
PATTERN_RECOGNITION_URL=http://localhost:3037
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

The Code Generation service provides multiple generation types:

1. **UI Component**: React/Vue/Angular components
2. **API Endpoint**: REST API endpoints
3. **Database Schema**: Database schemas
4. **Test Data**: Test data and fixtures
5. **Configuration**: Configuration files
6. **Migration**: Database migrations
7. **IaC**: Infrastructure as Code

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `codegen.job.created` | `{ jobId, type, tenantId }` | Generation job created |
| `codegen.job.completed` | `{ jobId, output, validation }` | Generation job completed |
| `codegen.job.failed` | `{ jobId, error }` | Generation job failed |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3040 | Server port |
| `server.host` | string | 0.0.0.0 | Server host |
| `cosmos_db.endpoint` | string | - | Cosmos DB endpoint |
| `cosmos_db.key` | string | - | Cosmos DB key |
| `cosmos_db.database_id` | string | castiel | Database ID |

## Testing

```bash
npm test
```

## License

Proprietary - Castiel

