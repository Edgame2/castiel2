# LLM Service Module (Plan W5 Layer 5)

LLM reasoning service: natural language explanations, recommendations, scenarios, summary, and playbook generation. Part of the Feedbacks and Recommendations plan (Layer 5 – LLM Reasoning).

## Features

- **ChainOfThoughtService:** explain, generateRecommendations, analyzeScenarios, generateSummary, generatePlaybook (stub; real LLM configurable via `llm.provider`).
- **LLMOutput storage:** Cosmos DB container `llm_outputs` (partitionKey tenantId).
- **Events:** `llm.reasoning.requested`, `llm.reasoning.completed`, `llm.reasoning.failed`.
- **APIs:** POST /api/v1/llm/explain, /recommendations, /scenarios, /summary, /playbook (body: opportunityId required, predictionId?, explanationId?, context?).

## Quick Start

### Prerequisites

- Node.js 20+
- Cosmos DB (endpoint, key)
- JWT secret (shared with auth)
- RabbitMQ URL (optional, for events)

### Configuration

Port and all service URLs come from config (no hardcoded ports/URLs).

- `config/default.yaml` – defaults; override via env (e.g. `PORT`, `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `JWT_SECRET`, `RABBITMQ_URL`).

### Running

```bash
pnpm install
pnpm run dev
```

Health: `GET /health`, readiness: `GET /ready`.

## API Reference

See [openapi.yaml](./openapi.yaml). All five LLM endpoints require JWT and X-Tenant-ID.

## Events

See [logs-events.md](./logs-events.md).

### Published

- `llm.reasoning.requested` – at start of each LLM API call (requestId, reasoningType, opportunityId, predictionId?, correlationId?).
- `llm.reasoning.completed` – on success (requestId, output, latency, correlationId?).
- `llm.reasoning.failed` – on error (requestId, error, correlationId?).

### Consumed

- (Optional bindings later)
