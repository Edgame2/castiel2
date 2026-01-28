# Forecasting Module

Forecasting and prediction service for Castiel, providing forecast decomposition, consensus forecasting, forecast commitment, and pipeline health analysis.

## Features

- **Forecast Decomposition**: Decompose forecasts into components
- **Consensus Forecasting**: Generate consensus forecasts
- **Forecast Commitment**: Manage forecast commitments
- **Pipeline Health**: Analyze pipeline health

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

#### Industry seasonality (5.6)

`industry_seasonality` in config: per-industry quarterly multipliers (keys `Q1`–`Q4`) and `default` fallback. Example: `default: 1`, `retail: { Q4: 1.15, Q1: 0.95 }`, `tech: { Q4: 1.1 }`. Decomposition includes `temporalFeatures` (month, quarter, isYearEnd), `industrySeasonalityMultiplier`, and `industryId` when the opportunity or account has an industry.

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `forecast_decompositions` - Forecast decompositions (partition: `/tenantId`)
- `forecast_consensus` - Consensus forecasts (partition: `/tenantId`)
- `forecast_commitments` - Forecast commitments (partition: `/tenantId`)
- `forecast_pipeline_health` - Pipeline health data (partition: `/tenantId`)
- `forecast_predictions` - Forecast predictions for accuracy tracking (partition: `/tenantId`)

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

See [OpenAPI Spec](./openapi.yaml)

### BI/risk (Plan §10, FIRST_STEPS §8)

- **GET /api/v1/forecasts/:period/scenarios** – ForecastingService.getScenarioForecast; tenant aggregate or stub.
- **GET /api/v1/forecasts/:period/risk-adjusted** – getRiskAdjustedForecast; risk from risk-analytics when configured.
- **GET /api/v1/forecasts/:period/ml** – getMLForecast; ml-service `POST /api/v1/ml/forecast/period` when configured; 503 when not.

### Multi-level aggregates (5.5)

- **POST /api/v1/forecasts/team** – Team-level: body `{ teamId, opportunityIds, startDate?, endDate? }`; returns totalPipeline, totalRiskAdjusted, opportunityCount. opportunityIds from pipeline/shard/analytics.
- **GET /api/v1/forecasts/tenant** – Tenant-level: optional `startDate`, `endDate`; returns totalRevenue, totalRiskAdjusted, opportunityCount.

### Accuracy endpoints

- **POST /api/v1/accuracy/actuals** – Record actual outcome for a prediction (opportunityId, forecastType, actualValue; optional actualAt, predictionId).
- **GET /api/v1/accuracy/metrics** – Get accuracy metrics (MAPE, forecastBias, R²). Query: `forecastType`, `startDate`, `endDate`.

## Events

### Published Events

- `forecast.decomposition.completed` - Forecast decomposition completed
- `forecast.consensus.generated` - Consensus forecast generated
- `forecast.commitment.created` - Forecast commitment created
- `pipeline.health.analyzed` - Pipeline health analyzed

### Consumed Events

- `opportunity.updated` - Update forecasts when opportunities change
- `integration.opportunity.updated` - Update forecasts when opportunities change via integration sync (waits for risk evaluation to complete)
- `risk.evaluation.completed` - Update forecasts when risk evaluations complete (ensures sequential processing after risk evaluation)
- `integration.sync.completed` - Update forecasts after sync
- `workflow.forecast.requested` - Process workflow-triggered forecast

## Dependencies

- **risk-analytics**: For risk data
- **analytics-service**: For analytics
- **ml-service**: For ML-based forecasting (P10/P50/P90, scenarios); `GET .../ml` and `GET .../scenarios` call `POST /api/v1/ml/forecast/period` when `services.ml_service.url` set. When `risk_analytics` is configured, `riskAdjustedRevenue` is from risk-analytics.
- **adaptive-learning**: For CAIS integration
- **pipeline-manager**: For pipeline data

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
