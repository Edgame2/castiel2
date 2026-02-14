# ai-service

Full specification for the AI Service container.

## 1. Reference

### Purpose

Centralized LLM completions (OpenAI, Anthropic, Ollama), model routing, agents, completion tracking. **Includes merged LLM and reasoning:** reasoning tasks (CRUD), Chain-of-Thought LLM (explain, recommendations, scenarios, summary, playbook, reactivation strategy). Single entry for all AI completion and LLM reasoning traffic; downstream services (ai-insights, content-generation, prompt-service, adaptive-learning, multi-modal-service, context-service, ml-service, risk-analytics for reactivation strategy) call it. **Merged from llm-service and reasoning-engine.**

### Configuration

Main entries from `config/default.yaml`:

- **server:** `port` (3006), `host`
- **cosmos_db:** (if used for insights/prompts) endpoint, key, database_id, containers
- **services:** secret_management.url, logging.url, shard_manager.url, embeddings.url
- **providers:** OpenAI, Anthropic, Ollama (API keys from secret-management or env)
- **jwt:** for optional auth

### Environment variables

- `PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `JWT_SECRET`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (or resolved via secret-management)
- `LOGGING_URL`, `SECRET_MANAGEMENT_URL`, `SHARD_MANAGER_URL`, `EMBEDDINGS_URL`

### API

Client path is `/api/v1/...` per API_RULES. Service routes (see [containers/ai-service/openapi.yaml](../../containers/ai-service/openapi.yaml)):

- Completions, models, agents (exact client path per gateway route and ENDPOINTS.md)
- **Reasoning:** `POST /api/v1/reasoning/tasks` (CRUD for reasoning tasks)
- **LLM CoT:** `POST /api/v1/llm/explain`, `/recommendations`, `/scenarios`, `/summary`, `/playbook`, `POST /api/v1/llm/reactivation/strategy`

### Events

Publishes to RabbitMQ for usage tracking; analytics/logging may consume.

### Dependencies

- **Downstream:** secret-management (API keys), logging, shard-manager, embeddings.
- **Upstream:** ai-insights, content-generation, prompt-service, adaptive-learning, reasoning-engine, multi-modal-service, context-service; ml-service optionally.

### Cosmos DB containers

Used for insights/prompts when configured (container names in config).

---

## 2. Architecture

- **Internal structure:** Completion routes, model router, provider implementations (OpenAI, Anthropic, Ollama), agent service; event publisher.
- **Data flow:** Request → auth → model selection → provider call → response; optional Cosmos/events.
- **Links:** [containers/ai-service/README.md](../../containers/ai-service/README.md).

---

## 3. Deployment

- **Port:** 3006.
- **Health:** `/health` (see server).
- **Scaling:** Stateless; scale horizontally.
- **Docker Compose service name:** `ai-service`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Propagated from gateway; used for tenant-scoped usage and storage.
- **Auth:** JWT validated (via gateway or internal); API keys from secret-management.

---

## 5. Links

- [containers/ai-service/README.md](../../containers/ai-service/README.md)
- [containers/ai-service/config/default.yaml](../../containers/ai-service/config/default.yaml)
- [containers/ai-service/openapi.yaml](../../containers/ai-service/openapi.yaml) (if present)
