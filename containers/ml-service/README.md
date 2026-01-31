# ML Service Module

Machine learning model management and prediction service.

## Features

- **Feature Store**: Feature extraction and management
- **Model Management**: Model versioning and deployment
- **Training Service**: Model training and job management
- **Evaluation Service**: Model evaluation and metrics
- **Calibration Service**: Model calibration
- **Synthetic Data**: Synthetic data generation
- **Risk Scoring**: ML-based risk score predictions
- **Forecasting**: ML-based revenue forecasting
- **Recommendations**: ML-based recommendations

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)
- AI Service
- Logging Service

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers):

- `ml_models` - ML models (partition key: `/tenantId`)
- `ml_features` - Feature store (partition key: `/tenantId`)
- `ml_training_jobs` - Training jobs (partition key: `/tenantId`)
- `ml_evaluations` - Evaluation results (partition key: `/tenantId`)
- `ml_predictions` - Prediction history (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3033 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| ai_service.url | string | - | AI Service URL (required) |
| services.shard_manager.url | string | - | Shard-manager URL for `buildVectorForOpportunity` (FEATURE_PIPELINE_SPEC §6, FIRST_STEPS §6). Required for features/build, win-probability, risk-scoring. |
| services.risk_analytics.url | string | - | risk-analytics URL for risk-snapshots and latest-evaluation in `buildVectorForOpportunity`. |
| feature_pipeline.stage_labels | string[] | (code) | Label encoding for `StageName` (FEATURE_PIPELINE_SPEC §6). Default in code: Unknown, Discovery, Proposal, Negotiation, Closed Won, Closed Lost. |
| feature_pipeline.industry_labels | string[] | (code) | Label encoding for `IndustryId`. Default in code: `['general']`. |
| features | object | {} | Feature flags for BI/risk (Plan §895). E.g. use_win_probability_ml, use_risk_scoring_ml (key → boolean). |
| azure_ml.workspace_name | string | "" | Azure ML Workspace name; env `AZURE_ML_WORKSPACE_NAME` (Plan §867, §8.2). |
| azure_ml.resource_group | string | castiel-ml-prod-rg | Azure ML resource group; env `AZURE_ML_RESOURCE_GROUP` (Plan §5.1). |
| azure_ml.subscription_id | string | "" | Azure subscription; env `AZURE_ML_SUBSCRIPTION_ID`. |
| azure_ml.endpoints | object | {} | ModelId → scoring URL (win-probability-model, risk-scoring-model, risk_trajectory_lstm, revenue_forecasting, anomaly, etc.). Env: `AZURE_ML_WIN_PROBABILITY_URL`, `AZURE_ML_RISK_SCORING_URL`; Plan §8.2: `AZURE_ML_ENDPOINT_WIN_PROB`, `AZURE_ML_ENDPOINT_RISK_GLOBAL`, `AZURE_ML_ENDPOINT_LSTM`, etc. See [ml-training-jobs](../../deployment/monitoring/runbooks/ml-training-jobs.md). |
| azure_ml.api_key | string | "" | Optional; env `AZURE_ML_API_KEY`. |

### Azure ML integration (when workspace is ready)

Layer 3 (ML prediction) currently uses mocks when Azure ML endpoints are not configured. When the Azure ML workspace and managed endpoints are provisioned:

1. **Config**: Set `azure_ml.endpoints` (modelId → scoring URL) and `azure_ml.api_key` (or key per endpoint) in `config/default.yaml` or environment (e.g. `AZURE_ML_WIN_PROBABILITY_URL`, `AZURE_ML_RISK_SCORING_URL`, `AZURE_ML_API_KEY`).
2. **Code**: PredictionService and AzureMLClient will call live endpoints instead of returning mock scores. No code change is required beyond ensuring config is loaded; existing circuit breaker, retry, and fallback logic apply.
3. **Deployment**: Register models in Azure ML, create managed endpoints, copy scoring URLs and keys into config. See [ml-training-jobs](../../deployment/monitoring/runbooks/ml-training-jobs.md) and Azure ML docs for model register and endpoint create.
4. **Health**: `GET /api/v1/ml/models/health` reports endpoint status and latency; use it to verify live endpoints after provisioning.
5. **A/B and model selection**: Model selection (global vs industry-specific) and A/B routing use the same config-driven endpoint URLs; ensure `azure_ml.endpoints` includes all required model IDs.

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ml/features/build` | Build feature vector for an opportunity (body: `opportunityId`, `purpose`: risk-scoring \| win-probability \| lstm \| anomaly \| forecasting). Returns `{ features: Record<string, number> }`. FEATURE_PIPELINE_SPEC §6, FIRST_STEPS §6. |
| POST | `/api/v1/ml/risk-scoring/predict` | Predict risk score (buildVector when features missing; Azure ML or Cosmos/heuristic; Plan §5.4) |
| POST | `/api/v1/ml/win-probability/predict` | Predict win probability (Azure ML win-probability-model or heuristic; BI_SALES_RISK Plan §5.4) |
| POST | `/api/v1/ml/anomaly/predict` | Anomaly detection (Isolation Forest; buildVector 'anomaly' → Azure ML anomaly endpoint; Plan §5.5). Returns `{ isAnomaly, anomalyScore }`. |
| POST | `/api/v1/ml/risk-trajectory/predict` | LSTM 30/60/90-day risk (Plan §5.5, §875). Body `{ sequence: number[][] }` from risk_snapshots; returns `{ risk_30, risk_60, risk_90, confidence }`. Requires `azure_ml.endpoints.risk_trajectory_lstm`. |
| POST | `/api/v1/ml/forecast/predict` | Revenue forecast with P10/P50/P90 and scenarios (MISSING_FEATURES 5.1) |
| POST | `/api/v1/ml/forecast/period` | Prophet revenue-forecast for one period (Plan §877). Body `{ history: [[date, value], ...], periods? }`. Returns `{ p10, p50, p90, modelId }`. Requires `azure_ml.endpoints.revenue_forecasting`. 503 when not configured. Consumed by forecasting getMLForecast. |
| POST | `/api/v1/ml/recommendations` | Get ML recommendations |
| GET | `/api/v1/ml/models` | List models |
| POST | `/api/v1/ml/models` | Create model |
| POST | `/api/v1/ml/training/jobs` | Create training job |
| GET | `/api/v1/ml/training/jobs/:id` | Get training job status |
| POST | `/api/v1/ml/evaluation` | Evaluate model |

## Events

### Published Events

- `ml.model.trained` - Model training completed
- `ml.model.deployed` - Model deployed
- `ml.prediction.made` - Prediction made
- `ml.prediction.completed` (Plan §7.1, §3.5) - Emitted after each prediction from `predictWinProbability`, `predictRiskScore`, `predictForecast`. Payload: `{ modelId, opportunityId?, inferenceMs }`. Consumed by: **logging** (MLAuditConsumer), **analytics-service** (UsageTrackingConsumer).

## Dependencies

- **AI Service**: For AI model access
- **Logging**: For audit logging

## License

Proprietary

