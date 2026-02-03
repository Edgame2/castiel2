# forecasting

Full specification for the Forecasting container.

## 1. Reference

### Purpose

Forecast decomposition, consensus, commitment, pipeline health. Risk-adjusted and ML forecasts; calls risk-analytics and ml-service.

### Configuration

From `config/default.yaml`: server.port (3050), cosmos_db (forecast_*), services (risk_analytics, ml_service, analytics_service, pipeline_manager, adaptive_learning), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Forecasts, decompositions, ML and risk integration, pipeline-manager integration, seasonality. See [containers/forecasting/openapi.yaml](../../containers/forecasting/openapi.yaml). GET /api/v1/forecasts/:period/ml calls ml-service.

### Events

- **Published:** forecast.completed; recommendations consumes.
- **Consumed:** opportunity.updated, risk.evaluation.completed.

### Dependencies

- **Downstream:** risk-analytics (risk-adjusted), ml-service (ML forecast), pipeline-manager, analytics-service, adaptive-learning.
- **Upstream:** recommendations, dashboard, workflow-orchestrator.

### Cosmos DB containers

forecast_* (partition key: tenantId).

---

## 2. Architecture

Forecast services, decomposition, consensus, ML/risk client calls, Cosmos. [containers/forecasting/README.md](../../containers/forecasting/README.md).

---

## 3. Deployment

- **Port:** 3050. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `forecasting`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/forecasting/README.md](../../containers/forecasting/README.md)
- [containers/forecasting/config/default.yaml](../../containers/forecasting/config/default.yaml)
- [containers/forecasting/openapi.yaml](../../containers/forecasting/openapi.yaml)
