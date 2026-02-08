# AI Service

Centralized LLM completion service for Castiel.

## Features

- LLM completions (OpenAI, Anthropic, Ollama)
- Model routing and selection
- Agent management
- Completion tracking
- Event publishing

## API Endpoints

- `POST /api/ai/completions` - Create completion
- `GET /api/ai/models` - List available models
- `GET /api/ai/models/:id` - Get model details
- `GET /api/ai/agents` - List agents
- `GET /api/ai/agents/:id` - Get agent
- `POST /api/ai/agents/:id/execute` - Execute agent

## Configuration

Configuration is in `config/default.yaml` with environment variable overrides. Service URLs and database settings are config-driven, not hardcoded.

### Database

The service uses **Azure Cosmos DB NoSQL** (shared database with prefixed containers). Configure via:

- `cosmos_db.endpoint` – Cosmos DB endpoint (env: `COSMOS_DB_ENDPOINT`, required)
- `cosmos_db.key` – Cosmos DB key (env: `COSMOS_DB_KEY`, required)
- `cosmos_db.database_id` – Database ID (env: `COSMOS_DB_DATABASE_ID`, default: castiel)
- `cosmos_db.containers` – Container names for models, completions, agents, insights, etc.

PostgreSQL and `DATABASE_URL` are not used.

### Environment Variables

- `PORT` – Server port (default: 3006)
- `COSMOS_DB_ENDPOINT` – Cosmos DB endpoint (required)
- `COSMOS_DB_KEY` – Cosmos DB key (required)
- `COSMOS_DB_DATABASE_ID` – Database ID (default: castiel)
- `JWT_SECRET` – JWT secret for authentication (required in production; dev may fall back to default)
- `RABBITMQ_URL` – RabbitMQ connection URL (required)
- `SECRET_MANAGEMENT_URL` – Secret management service URL (default: http://localhost:3003)
- `LOGGING_URL` – Logging service URL (default: http://localhost:3014)
- `SHARD_MANAGER_URL` – Shard manager URL (default: http://localhost:3023)
- `EMBEDDINGS_URL` – Embeddings service URL (default: http://localhost:3005)
- `REDIS_URL` / `REDIS_HOST` / `REDIS_PORT` – Redis (caching)
- `LLM_PROVIDER` / `LLM_MODEL` – LLM provider and model (default: mock, gpt-4)
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` – Provider API keys (optional, for live providers)

## Notes

- Supports multiple providers (OpenAI, Anthropic, Ollama)
- Publishes events to RabbitMQ for usage tracking
- **Agents:** `GET /api/ai/agents` and `GET /api/ai/agents/:id` are tenant-scoped (Cosmos partition key `tenantId`). `POST /api/ai/agents/:id/execute` returns a stub execution; persistence and actual agent run are documented in `AgentService.executeAgent` for future implementation.
