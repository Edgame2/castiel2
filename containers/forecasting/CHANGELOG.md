# Changelog

All notable changes to this module will be documented in this file.

## [Unreleased]

### Added
- **Observability (Plan §8.5, FIRST_STEPS §1):** `@azure/monitor-opentelemetry` in `src/instrumentation.ts` (init before other imports; env `APPLICATIONINSIGHTS_CONNECTION_STRING`, `APPLICATIONINSIGHTS_DISABLE`). `GET /metrics` (prom-client): `http_requests_total`, `http_request_duration_seconds`, `forecasts_generated_total`. Config: `application_insights` (connection_string, disable), `metrics` (path, require_auth, bearer_token); schema. Optional Bearer on /metrics when `metrics.require_auth`.
- `GET /api/v1/forecasts/:period/scenarios` (FIRST_STEPS §8, Plan §4.3, §877): ForecastingService.getScenarioForecast; returns P10/P50/P90 and best/base/worst scenarios. **Wired to ml-service `POST /api/v1/ml/forecast/period`** when `services.ml_service.url` set and history (12 months, chronological) has ≥2 points; uses Prophet p10/p50/p90. Fallback to stub (tenant aggregate, no date filter) on missing URL, history < 2, 503, or failure.
- `GET /api/v1/forecasts/:period/risk-adjusted` (FIRST_STEPS §8, Plan §4.3): ForecastingService.getRiskAdjustedForecast; returns period, forecast, riskAdjustedForecast, opportunityCount, startDate, endDate. Period formats YYYY, YYYY-MM, YYYY-Q1..Q4. Risk from stored riskAdjustedRevenue (risk-analytics at generateForecast); else riskAdjustedForecast = forecast.
- `GET /api/v1/forecasts/:period/ml` (FIRST_STEPS §8, Plan §4.3, §877): ForecastingService.getMLForecast; returns period, pointForecast, uncertainty (p10/p50/p90), modelId, scenarios. **Wired to ml-service `POST /api/v1/ml/forecast/period`** when `services.ml_service.url` set and history (12 months from aggregateTenantForecast, chronological) has ≥2 points; uses Prophet p10/p50/p90. Fallback to stub (tenant aggregate, modelId=stub) on 503, missing URL, history < 2, or other failure.

## [1.3.0] - 2026-01-23

### Fixed
- **Event consumer null-safety**: `opportunity.updated`, `risk.evaluation.completed`, `workflow.forecast.requested`—resolve `opportunityId` from `event.data?.opportunityId`, `tenantId` from `event.tenantId ?? event.data?.tenantId`; skip when missing; forward `workflowId` for workflow. `integration.sync.completed`—`tenantId` from `event.tenantId ?? event.data?.tenantId` for logging.
- **ForecastEventConsumer**: `error: any` → `error: unknown` and type guards in all handler catches; `closeEventConsumer` now calls `await consumer.stop()` before clearing.
- **ForecastingService**: `error: any` → `error: unknown` and type guards in all catches (getLearnedWeights, getModelSelection, ML forecast, generateForecast, decomposeForecast, generateConsensus, analyzeCommitment, calculatePipelineHealth, getOpportunityShard, storeForecast).
- **forecasting routes**: `error: any` → `error: unknown`; `error.statusCode`/`error.message` via `(error as { statusCode?: number })?.statusCode` and `error instanceof Error ? error.message : String(error)`; `/api/v1/accuracy/actuals` and `/api/v1/accuracy/metrics` catches use type guards. Get forecast and team-forecast routes updated.

## [1.2.0] - 2026-01-23

### Added
- Industry seasonality (MISSING_FEATURES 5.6): `industry_seasonality` in config (per-industry Q1–Q4 multipliers, `default` fallback); `getIndustrySeasonalityMultiplier`; decomposition includes `temporalFeatures` (month, quarter, isYearEnd), `industrySeasonalityMultiplier`, `industryId`; year-end factor (×1.05 when month ≥ 10). `decomposeForecast` accepts optional `opportunityShard` to avoid double fetch.

## [1.1.0] - 2026-01-23

### Added
- Forecast accuracy tracking (MISSING_FEATURES 5.4): store predictions on forecast generation, record actuals via POST /api/v1/accuracy/actuals, get MAPE/forecast bias/R² via GET /api/v1/accuracy/metrics
- `forecast_predictions` Cosmos container for prediction–actual pairs
- `ForecastAccuracyService` with `storePrediction`, `recordActual`, `getAccuracyMetrics`
- ML-powered revenue forecasting (MISSING_FEATURES 5.1): `ml` weight in learned-weights default (0.2); `POST /api/v1/ml/forecast/predict` with modelId; `ForecastResult.mlForecast` includes `uncertainty` (P10/P50/P90) and `scenarios` (best/base/worst); `riskAdjustedRevenue` when risk_analytics is configured (from `GET /api/v1/risk/opportunities/:opportunityId/latest-evaluation`)
- Multi-level forecasting (MISSING_FEATURES 5.5): `POST /api/v1/forecasts/team` (teamId, opportunityIds; totalPipeline, totalRiskAdjusted), `GET /api/v1/forecasts/tenant` (totalRevenue, totalRiskAdjusted, opportunityCount; optional startDate/endDate). winRate, quotaAttainment, growthRate, industryBenchmark left for future integration.

## [1.0.0] - 2026-01-23

### Added
- Forecasting service
- Forecast decomposition
- Consensus forecasting
- Forecast commitment management
- Pipeline health analysis
- CAIS integration for adaptive learning
- Event-driven forecasting triggered by opportunity/risk events
- Integration with risk-analytics, analytics-service, ml-service, adaptive-learning, and pipeline-manager
