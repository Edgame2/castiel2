# Agent Registry Module

Management of specialized AI agents for Castiel, providing agent registration, agent selection, execution tracking, and versioning.

## Features

- **Agent Management**: Register and manage specialized AI agents
- **Agent Selection**: Select agents based on capabilities and requirements
- **Execution Tracking**: Track agent execution and results
- **Agent Versioning**: Version management for agents
- **Capability Matching**: Match agents to tasks based on capabilities
- **Performance Tracking**: Track agent performance metrics
- **Agent Lifecycle**: Manage agent lifecycle (active, inactive, deprecated)

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- AI Service (for agent execution)

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

- `agent_registry_agents` - Agent data
- `agent_registry_executions` - Agent execution data

### Environment Variables

```bash
PORT=3035
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

The Agent Registry provides:

1. **Agent Management**: CRUD operations for agents
2. **Agent Selection**: Select agents for tasks
3. **Execution Tracking**: Track agent executions
4. **Performance Metrics**: Track agent performance
5. **Versioning**: Manage agent versions

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `agent.registered` | `{ agentId, name, capabilities }` | Agent registered |
| `agent.selected` | `{ agentId, taskId, reason }` | Agent selected for task |
| `agent.executed` | `{ executionId, agentId, result }` | Agent executed |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3035 | Server port |
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

