# Context Service Module

Centralized context management service for Coder IDE, providing context storage, AST analysis, dependency tree building, call graph construction, and dynamic context assembly.

## Features

- **Context Management**: Store and retrieve code context
- **AST Analysis**: Analyze Abstract Syntax Trees
- **Dependency Trees**: Build dependency trees
- **Call Graphs**: Construct call graphs
- **Context Assembly**: Dynamically assemble context for tasks
- **Token Budgeting**: Manage context token budgets
- **Multi-Level Analysis**: File, module, and project-level analysis
- **Context Caching**: Cache context for performance
- **Context Versioning**: Version context snapshots

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- AI Service (for context analysis)

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

- `context_service_contexts` - Context data
- `context_service_analyses` - Context analysis data
- `context_service_dependencies` - Dependency tree data
- `context_service_callgraphs` - Call graph data

### Environment Variables

```bash
PORT=3034
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
AI_SERVICE_URL=http://localhost:3006
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

The Context Service provides:

1. **Context Storage**: Store code context
2. **AST Analysis**: Analyze code structure
3. **Dependency Trees**: Build dependency relationships
4. **Call Graphs**: Build function call relationships
5. **Context Assembly**: Assemble context for tasks

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `context.created` | `{ contextId, type, tenantId }` | Context created |
| `context.analyzed` | `{ contextId, analysis }` | Context analyzed |
| `context.assembled` | `{ assemblyId, contextIds }` | Context assembled |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3034 | Server port |
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

