# recommendations

Full specification for the Recommendations container.

## 1. Reference

### Purpose

Mitigation ranking, remediation workflows, next-best-action. Consumes opportunity.updated, integration.opportunity.updated, risk.evaluation.completed, forecast.completed, shard.updated, workflow.recommendation.requested; publishes recommendation events.

### Configuration

From `config/default.yaml`: server.port (3049), cosmos_db (recommendations_data), services (ml_service, ai_service, embeddings, shard_manager, adaptive_learning, analytics_service, auth, logging, user_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Recommendation generation, ranking, ML and embeddings. See [containers/recommendations/openapi.yaml](../../containers/recommendations/openapi.yaml).

### Events

- **Consumed:** opportunity.updated, integration.opportunity.updated, risk.evaluation.completed, forecast.completed, shard.updated, workflow.recommendation.requested.
- **Published:** recommendation.*.

### Dependencies

- **Downstream:** ml-service, ai-service, embeddings, shard-manager, adaptive-learning, analytics-service.
- **Upstream:** risk-analytics, forecasting (complete before recommendation flow); workflow-orchestrator; Gateway.

### Cosmos DB containers

recommendations_data (partition key: tenantId).

---

## 2. Architecture

Recommendation and ranking services, event consumers, Cosmos. [containers/recommendations/README.md](../../containers/recommendations/README.md).

---

## 3. Deployment

- **Port:** 3049. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `recommendations`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/recommendations/README.md](../../containers/recommendations/README.md)
- [containers/recommendations/config/default.yaml](../../containers/recommendations/config/default.yaml)
- [containers/recommendations/openapi.yaml](../../containers/recommendations/openapi.yaml)
