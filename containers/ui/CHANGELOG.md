# Changelog

All notable changes to the UI Container module will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Routes (Plan §889, §6.2, §932, §936):** `/dashboard`, `/dashboard/manager`, `/dashboard/executive` (ExecutiveDashboardPage; revenue-at-risk, forecast, competitive, RiskHeatmap, industry_benchmark stub; GET /api/v1/dashboards/executive), `/dashboard/board` (Plan §6.5, §932: BoardDashboardPage; revenue-at-risk, competitive win/loss, forecast; GET /api/v1/dashboards/board), `/opportunities`, `/opportunities/[id]`, `/opportunities/[id]/risk`, `/opportunities/[id]/remediation`, `/accounts/[id]`, `/analytics/competitive`, `/analytics/benchmarks`, `/analytics/portfolios` (Plan §6.5, §957: PortfolioDrillDownPage; DrillDownBreadcrumb; portfolio → account → opportunity → activity; data from GET /api/v1/portfolios/:id/summary, .../accounts; GET /api/v1/accounts/:id/opportunities; GET /api/v1/opportunities/:id/activities), `/settings/competitors`, `/settings/industries` (Plan §6.2, §6.5: IndustrySettingsPage; industry list and tenant enable/disable; stub until GET /api/v1/industries; link to benchmarks). Nav: Home, Dashboard, Manager, Opportunities, Competitive, Benchmarks, Portfolios, Competitors, Industries (§6.5). Opportunity detail links to Risk and Remediation; risk and remediation pages cross-link.
- **BI Sales Risk Gaps (Plan §14):** `SentimentTrendChart` (Gap 2; GET /api/v1/opportunities/:id/sentiment-trends). `WinProbabilityTrendChart` (Gap 1; GET /api/v1/opportunities/:id/win-probability/trend). `ClusterVisualization` (Gap 3; GET /api/v1/risk-clustering/clusters; list/card + optional 2D scatter). `CompetitorSelectModal` (Gap 4; GET /competitors, POST /competitors/:id/track). `LeadingIndicatorsCard` (Gap 5; GET /api/v1/opportunities/:id/leading-indicators). All use apiBaseUrl, getHeaders; no hardcoded URLs.
- **LinkCompetitorCard (Plan §14):** "Link competitor" button and CompetitorSelectModal; used on `/opportunities/[id]`.
- **Page integrations (Plan §14):** LeadingIndicatorsCard, SentimentTrendChart, WinProbabilityTrendChart, LinkCompetitorCard on `/opportunities/[id]`; ClusterVisualization on `/analytics/benchmarks`.
- **Components (Plan §890, §6.3):** `DrillDownBreadcrumb` (Plan §6.3: portfolio → account → opportunity → activity; segment types with links to /analytics/portfolios?portfolioId=, /accounts/:id, /opportunities/:id), `BenchmarkComparison` (Plan §6.3, §953: bar vs industry percentiles P10–P90; optional currentValue reference line; data from industries/:id/benchmarks, opportunities/:id/benchmark-comparison), `CompetitorWinLossChart` (Plan §6.3: win/loss by competitor, bar chart; data from GET /api/v1/analytics/competitive-win-loss), `AccountHealthCard` (Plan §6.3, §917: health score, trend, critical opportunities; data from GET /api/v1/accounts/:id/health), `RiskGauge` (risk score 0–1, radial gauge, color bands green/yellow/red), `RiskTrajectoryChart` (30/60/90-day risk predictions; data from GET /api/v1/opportunities/:id/risk-predictions), `RiskVelocityChart` (velocity and acceleration; data from GET /api/v1/opportunities/:id/risk-velocity), `RiskHeatmap` (Plan §6.3, §932: portfolio heatmap, segments with riskScore; data from GET /api/v1/dashboards/executive risk_heatmap), `DashboardGrid` (responsive 1/2/3 columns), `WinProbabilityGauge` (win prob 0–1 + optional CI; higher=green), `EarlyWarningCard` (signals list, severity, acknowledge, Quick actions: create task, log activity, start remediation; §942), `ScenarioForecastChart` (P10/P50/P90 bar chart; data from GET /api/v1/forecasts/:period/scenarios), `CompetitorMentionsCard` (mentions per competitor; data from GET /api/v1/opportunities/:opportunityId/competitors or GET /api/v1/competitive-intelligence/dashboard topCompetitorsByMentions), `ExplainabilityCard` (Plan §6.3, §11.2: top drivers for risk and win-probability; data from GET /api/v1/opportunities/:id/risk-explainability or .../win-probability/explain), `AnomalyCard` (Plan §6.3, §937: anomaly list and severity; Quick actions create_task, log_activity, start_remediation; data from GET /api/v1/opportunities/:id/anomalies), `RemediationWorkflowCard` (Plan §6.3, §937: steps, progress, complete; data from GET /api/v1/remediation-workflows?opportunityId=; onCompleteStep, onCancel). Opportunity detail uses ExplainabilityCard, AnomalyCard, RemediationWorkflowCard. Manager dashboard uses DashboardGrid + RiskGauge + RiskTrajectoryChart + RiskVelocityChart + WinProbabilityGauge + EarlyWarningCard + CompetitorMentionsCard + ScenarioForecastChart.

### Fixed

- **Build:** PostCSS config uses `@tailwindcss/postcss` (Tailwind v4). Recharts Tooltip formatters updated for `value?: number` in BenchmarkComparison, ClusterVisualization, SentimentTrendChart, WinProbabilityTrendChart, ScenarioForecastChart, CompetitorWinLossChart, RiskTrajectoryChart. ManagerDashboardContent: conditional spread `(x && {})` replaced with `(x ? {} : {})` to satisfy "Spread types may only be created from object types". Next.js: `turbopack.root` set to repo root to silence multi-lockfile warning; removed redundant `package-lock.json` in `containers/ui` (monorepo uses pnpm).

## [1.0.0] - 2024-01-XX

### Added

- Initial implementation of UI Container
- Next.js 16 with App Router
- React 19
- TypeScript configuration
- Shadcn UI components
- Tailwind CSS styling
- TanStack Query for data fetching
- React Hook Form + Zod for forms
- i18next for internationalization
- Dockerfile for containerization
- API Gateway integration
- Authentication flow
- Protected routes
- Public routes

