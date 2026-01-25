# Changelog

All notable changes to this module will be documented in this file.

## [Unreleased]

### Added
- **GET /api/v1/dashboards/manager** (Plan §4.5, §10 Phase 1, §891): Manager dashboard widget data. Widget types (Plan §6.4): `revenue-at-risk`, `forecast-summary`, `early_warning_list` (from first prioritized opportunity via `GET /api/v1/risk-analysis/opportunities/:id/early-warnings`), `scenario_forecast` (`GET /api/v1/forecasts/:period/scenarios`), `competitive_win_loss` (`GET /api/v1/competitive-intelligence/dashboard`). Aggregates from risk-analytics and forecasting when configured; stubs when unset. Config: `services.risk_analytics.url`, `services.forecasting.url`.
- **GET /api/v1/dashboards/manager/prioritized** (Plan §941): Prioritized opportunities for "Recommended today". Rank by revenue-at-risk × risk × early-warning; suggestedAction. Wired to risk-analytics `GET /api/v1/risk-analysis/tenant/prioritized-opportunities` when `services.risk_analytics.url` is set; fallback to `{ opportunities: [], suggestedAction: null }` when unset or call fails.
- **GET /api/v1/dashboards/executive**, **GET /api/v1/dashboards/board** (Plan §4.5, §932): Executive (C-suite) and board dashboards. Aggregate from risk-analytics (revenue-at-risk, competitive-intelligence) and forecasting; risk_heatmap and industry_benchmark stubbed. Config: `services.risk_analytics.url`, `services.forecasting.url`.

## [1.1.0] - 2026-01-24

### Added
- **Observability (Plan §8.5, FIRST_STEPS §1):** `@azure/monitor-opentelemetry` in `src/instrumentation.ts` (init before other imports; env `APPLICATIONINSIGHTS_CONNECTION_STRING`, `APPLICATIONINSIGHTS_DISABLE`). `GET /metrics` (prom-client): `http_requests_total`, `http_request_duration_seconds`. Config: `application_insights` (connection_string, disable), `metrics` (path, require_auth, bearer_token); schema. Optional Bearer on /metrics when `metrics.require_auth`.

## [1.0.0] - 2026-01-23

### Added
- Dashboard analytics service
- Admin dashboard data management
- Dashboard caching
- Widget data service
- Integration with dashboard and analytics-service
