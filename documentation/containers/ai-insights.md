# ai-insights

Full specification for the AI Insights container.

## 1. Reference

### Purpose

AI-powered insights, proactive/collaborative insights, risk analysis (evaluate, catalog, revenue-at-risk, early warnings). Used for risk UI and insight APIs.

### Configuration

From `config/default.yaml`: server.port (3027), cosmos_db (ai_insights, ai_risk_analysis), services (ai_service, shard_manager, embeddings, logging).

### Environment variables

`PORT`, `COSMOS_DB_*`, `AI_SERVICE_URL`, `SHARD_MANAGER_URL`, `EMBEDDINGS_URL`, `LOGGING_URL`.

### API

Insight generation, proactive/collaborative insights, risk analysis, risk scoring, revenue-at-risk, early warning. See [containers/ai-insights/openapi.yaml](../../containers/ai-insights/openapi.yaml).

### Events

See container logs-events.md if present.

### Dependencies

- **Downstream:** ai-service, shard-manager, embeddings, logging.
- **Upstream:** risk-analytics, dashboard, collaboration-service, gateway.

### Cosmos DB containers

ai_insights, ai_risk_analysis, etc. (partition key: tenantId).

---

## 2. Architecture

Insight and risk-analysis services, Cosmos, calls to ai-service and shard-manager. [containers/ai-insights/README.md](../../containers/ai-insights/README.md).

---

## 3. Deployment

- **Port:** 3027. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `ai-insights`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/ai-insights/README.md](../../containers/ai-insights/README.md)
- [containers/ai-insights/config/default.yaml](../../containers/ai-insights/config/default.yaml)
- [containers/ai-insights/openapi.yaml](../../containers/ai-insights/openapi.yaml)
