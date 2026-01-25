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

## Environment Variables

- `PORT` - Server port (default: 3006)
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)
- `JWT_SECRET` - JWT secret for authentication
- `RABBITMQ_URL` - RabbitMQ connection string

## Notes

- Model Router and provider implementations should be moved from `src/core/models/`
- Supports multiple providers (OpenAI, Anthropic, Ollama)
- Publishes events to RabbitMQ for usage tracking
