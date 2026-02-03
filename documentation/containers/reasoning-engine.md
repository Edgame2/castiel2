# reasoning-engine

Full specification for the Reasoning Engine container.

## 1. Reference

### Purpose

Advanced reasoning: chain-of-thought, tree-of-thought, analogical, counterfactual, causal. Used for explainability and scenario analysis.

### Configuration

From `config/default.yaml`: server.port (3045 internal; host 3145 in docker-compose), cosmos_db (reasoning_tasks), services (ai_service, prompt_service, knowledge_base, logging).

### Environment variables

`PORT`, `COSMOS_DB_*`, `AI_SERVICE_URL`, `PROMPT_SERVICE_URL`, `LOGGING_URL`.

### API

Reasoning tasks, CoT, ToT, analogy, counterfactual, causal. See [containers/reasoning-engine/openapi.yaml](../../containers/reasoning-engine/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** ai-service, prompt-service, logging.
- **Upstream:** risk-analytics, ai-insights; Gateway.

### Cosmos DB containers

reasoning_tasks (partition key: tenantId).

---

## 2. Architecture

Reasoning task services, ai-service and prompt-service clients, Cosmos. [containers/reasoning-engine/README.md](../../containers/reasoning-engine/README.md).

---

## 3. Deployment

- **Port:** 3145 (host) → 3045 (container). **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `reasoning-engine`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/reasoning-engine/README.md](../../containers/reasoning-engine/README.md)
- [containers/reasoning-engine/config/default.yaml](../../containers/reasoning-engine/config/default.yaml)
- [containers/reasoning-engine/openapi.yaml](../../containers/reasoning-engine/openapi.yaml)
