# Reasoning Engine Module

Advanced reasoning capabilities service for Coder IDE, providing chain-of-thought, tree-of-thought, analogical, counterfactual, and causal reasoning.

## Features

- **Chain-of-Thought Reasoning**: Sequential reasoning steps with observations, hypotheses, inferences, and conclusions
- **Tree-of-Thought Reasoning**: Multi-branch exploration with path evaluation
- **Analogical Reasoning**: Finding and adapting solutions from similar problems
- **Counterfactual Reasoning**: Exploring "what-if" scenarios and alternative outcomes
- **Causal Reasoning**: Analyzing causal relationships and root causes
- **Probabilistic Reasoning**: Uncertainty quantification and confidence scoring
- **Meta-Reasoning**: Reasoning about reasoning processes

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- AI Service (for actual reasoning execution)
- Prompt Management Service (for prompt templates)
- Knowledge Base Service (for context retrieval)

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

- `reasoning_tasks` - Reasoning task data

### Environment Variables

```bash
PORT=3045
HOST=0.0.0.0
COSMOS_DB_ENDPOINT=your_cosmos_endpoint
COSMOS_DB_KEY=your_cosmos_key
COSMOS_DB_DATABASE_ID=castiel
JWT_SECRET=your_jwt_secret
AI_SERVICE_URL=http://localhost:3006
PROMPT_MANAGEMENT_URL=http://localhost:3021
KNOWLEDGE_BASE_URL=http://localhost:3022
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

The Reasoning Engine provides multiple reasoning strategies:

1. **Chain-of-Thought**: Linear reasoning with sequential steps
2. **Tree-of-Thought**: Branching exploration with multiple paths
3. **Analogical**: Pattern matching and solution adaptation
4. **Counterfactual**: Scenario analysis and outcome prediction
5. **Causal**: Cause-effect analysis and intervention planning

## Events Published

| Event | Payload | Description |
|-------|---------|-------------|
| `reasoning.task.created` | `{ taskId, type, tenantId }` | Reasoning task created |
| `reasoning.task.completed` | `{ taskId, conclusion, confidence }` | Reasoning task completed |
| `reasoning.task.failed` | `{ taskId, error }` | Reasoning task failed |

## Events Consumed

| Event | Handler | Description |
|-------|---------|-------------|
| N/A | - | Currently no event consumption |

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `server.port` | number | 3045 | Server port |
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

