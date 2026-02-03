# llm-service

Full specification for the LLM Service container.

## 1. Reference

### Purpose

LLM reasoning layer: explain, recommendations, scenarios, summary, playbook. Called by risk/insight flows for natural language explanations. Publishes llm.reasoning.requested/completed/failed.

### Configuration

From `config/default.yaml`: server.port (3062), cosmos_db (llm_outputs), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`.

### API

Explain, recommendations, scenarios, summary, playbook. See [containers/llm-service/openapi.yaml](../../containers/llm-service/openapi.yaml).

### Events

- **Published:** llm.reasoning.requested, llm.reasoning.completed, llm.reasoning.failed.

### Dependencies

- **Downstream:** Cosmos, RabbitMQ; may call ai-service for LLM.
- **Upstream:** risk-analytics, ai-insights, reasoning-engine (for natural language output).

### Cosmos DB containers

llm_outputs (partition key: tenantId).

---

## 2. Architecture

Reasoning and explanation services, Cosmos, event publisher. [containers/llm-service/README.md](../../containers/llm-service/README.md).

---

## 3. Deployment

- **Port:** 3062. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `llm-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/llm-service/README.md](../../containers/llm-service/README.md)
- [containers/llm-service/config/default.yaml](../../containers/llm-service/config/default.yaml)
- [containers/llm-service/openapi.yaml](../../containers/llm-service/openapi.yaml)
