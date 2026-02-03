# ml-service

Full specification for the ML Service container.

## 1. Reference

### Purpose

ML model management, feature store, training jobs, predictions: win probability, risk scoring, LSTM risk trajectory, anomaly, revenue forecasting, recommendations. Azure ML Managed Endpoints when configured. Exposes `buildVectorForOpportunity` for risk/BI feature pipeline.

### Configuration

Main entries from `config/default.yaml`:

- **server:** `port` (3033), `host`
- **cosmos_db:** containers (ml_models, ml_features, ml_training_jobs, ml_evaluations, ml_predictions; partition: tenantId)
- **services:** `shard_manager.url`, `risk_analytics.url`, `ai_service.url`
- **feature_pipeline:** stage_labels, industry_labels
- **features:** feature flags (e.g. use_win_probability_ml, use_risk_scoring_ml)
- **azure_ml:** workspace_name, resource_group, subscription_id, endpoints (modelId → scoring URL), api_key

### Environment variables

- `PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, `SHARD_MANAGER_URL`, `RISK_ANALYTICS_URL`, `AI_SERVICE_URL`
- `AZURE_ML_WORKSPACE_NAME`, `AZURE_ML_RESOURCE_GROUP`, `AZURE_ML_SUBSCRIPTION_ID`, `AZURE_ML_*_URL`, `AZURE_ML_API_KEY`

### API

Feature store, model CRUD, training jobs, evaluations, predictions (risk, win probability, forecast, recommendations), health. See [containers/ml-service/openapi.yaml](../../containers/ml-service/openapi.yaml). Model-monitoring: `POST /api/v1/ml/model-monitoring/run` (called by risk-analytics batch job).

### Events

- **Published:** `ml.prediction.completed`; logging consumes for audit/Data Lake.
- **Consumed:** (optional) bindings for training/outcome events.

### Dependencies

- **Downstream:** shard-manager (buildVectorForOpportunity), risk-analytics (risk snapshots, latest evaluation), forecasting (getMLForecast).
- **Upstream:** risk-analytics, forecasting, recommendations, adaptive-learning; ai-service for optional AI-backed features.

### Cosmos DB containers

- `ml_models`, `ml_features`, `ml_training_jobs`, `ml_evaluations`, `ml_predictions` (partition key: tenantId).

---

## 2. Architecture

- **Internal structure:** Feature store service, model/training/evaluation/prediction services, Azure ML client when configured, buildVectorForOpportunity pipeline.
- **Data flow:** API/events → feature build (shard_manager, risk_analytics) → model scoring (Azure ML or fallback) → Cosmos → events.
- **Links:** [containers/ml-service/README.md](../../containers/ml-service/README.md). Runbooks: deployment/monitoring/runbooks/ml-training-jobs.md.

---

## 3. Deployment

- **Port:** 3033.
- **Health:** `/health`, `/api/v1/ml/models/health` (endpoint status).
- **Scaling:** Stateless; scale horizontally.
- **Docker Compose service name:** `ml-service`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Required; all Cosmos and feature/prediction paths are tenant-scoped.
- **Partition key:** tenantId for all ml_* containers.

---

## 5. Links

- [containers/ml-service/README.md](../../containers/ml-service/README.md)
- [containers/ml-service/config/default.yaml](../../containers/ml-service/config/default.yaml)
- [containers/ml-service/openapi.yaml](../../containers/ml-service/openapi.yaml)
