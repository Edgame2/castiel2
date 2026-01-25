# AI Service Module - Architecture

## Overview

The AI Service module provides centralized LLM completion service for Castiel, including model routing, agent management, and completion tracking.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `ai_models` | `/tenantId` | Model definitions and configurations |
| `ai_completions` | `/tenantId` | Completion history and results |
| `ai_agents` | `/tenantId` | Agent definitions |
| `ai_insights` | `/tenantId` | AI-generated insights |
| `ai_proactive_insights` | `/tenantId` | Proactive insight data |
| `ai_collaborative_insights` | `/tenantId` | Collaborative insight data |
| `ai_risk_analysis` | `/tenantId` | Risk analysis results |
| `reasoning_tasks` | `/tenantId` | Reasoning task data |
| `prompt_prompts` | `/tenantId` | Prompt definitions |
| `prompt_versions` | `/tenantId` | Prompt version history |
| `prompt_ab_tests` | `/tenantId` | A/B test data |
| `prompt_analytics` | `/tenantId` | Prompt analytics |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **Model Router** - Routes requests to appropriate LLM providers
2. **Completion Service** - Handles LLM completions
3. **Agent Management** - Manages AI agents
4. **Event Publishing** - Publishes usage tracking events

## Data Flow

```
User Request
    ↓
API Gateway
    ↓
AI Service
    ↓
Model Router (select provider)
    ↓
LLM Provider (OpenAI/Anthropic/Ollama)
    ↓
Cosmos DB (store completion)
    ↓
Event Publisher (RabbitMQ)
```

## Event Publishing

The module publishes events to RabbitMQ for usage tracking and analytics.

## External Dependencies

- **Secret Management**: For API keys
- **Logging Service**: For audit logging
- **Shard Manager**: For data sharding
- **Embeddings Service**: For vector operations
- **Redis**: For caching

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
