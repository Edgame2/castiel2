# Changelog

All notable changes to this module will be documented in this file.

## [Unreleased]

### Added
- **Mitigation actions (Plan §428, §927):** `MitigationRankingService.rankMitigationActions(opportunityId, tenantId)` returning ranked mitigation actions. Reads from `recommendation_mitigation_actions` (Plan §3.1.4) when tenant has custom actions; stub otherwise. Future: ml-service `mitigation-ranking-model` (Azure ML). `GET /api/v1/opportunities/:id/mitigation-actions`. Types `RankedMitigationAction`, `RankedMitigationResponse`. OpenAPI tag Mitigation, path `/opportunities/{id}/mitigation-actions`.
- **recommendation_mitigation_actions (Plan §3.1.4, §927):** `cosmos_db.containers.mitigation_actions` → `recommendation_mitigation_actions` (partition `tenantId`). Catalog doc: id, tenantId, actionId, title, description, rank?, estimatedImpact?, estimatedEffort?. Config and schema updated.
- **remediation.workflow.completed (Plan §10, §929):** `publishRemediationWorkflowCompleted(tenantId, { workflowId, opportunityId, status, completedAt?, userId?, duration? })` in RecommendationEventPublisher. Consumed by logging MLAuditConsumer. Call when RemediationWorkflowService completes or cancels a workflow.
- **Remediation workflows (Plan §927–929):** `cosmos_db.containers.remediation_workflows` (recommendation_remediation_workflows). `RemediationWorkflowService`: `createWorkflow`, `getWorkflow`, `getWorkflowsByOpportunity`, `completeStep`, `cancelWorkflow`. `POST /api/v1/remediation-workflows` (body: opportunityId, riskId?, assignedTo?, steps), `GET /api/v1/remediation-workflows?opportunityId=`, `GET /api/v1/remediation-workflows/:id`, `POST /api/v1/remediation-workflows/:id/steps/:stepNumber/complete`, `PUT /api/v1/remediation-workflows/:id/steps/:stepNumber/complete` (Plan §4.4: PUT or POST; both accepted), `PUT /api/v1/remediation-workflows/:id/cancel` (Plan §928, §435). Publishes `remediation.workflow.created`, `remediation.step.completed`, `remediation.workflow.completed` (with duration when all steps done). Events in logs-events.md.

## [1.3.0] - 2026-01-24

### Added
- **Observability (Plan §8.5, FIRST_STEPS §1):** `@azure/monitor-opentelemetry` in `src/instrumentation.ts` (init before other imports; env `APPLICATIONINSIGHTS_CONNECTION_STRING`, `APPLICATIONINSIGHTS_DISABLE`). `GET /metrics` (prom-client): `http_requests_total`, `http_request_duration_seconds`. Config: `application_insights` (connection_string, disable), `metrics` (path, require_auth, bearer_token); schema. Optional Bearer on /metrics when `metrics.require_auth`.

## [1.2.0] - 2026-01-23

### Fixed
- **RecommendationEventConsumer**: `error: any` → `error: unknown` and type guards in all handler catches; `forecast.completed` null-safe `event?.data`, guard for `opportunityId`/`tenantId`; `closeEventConsumer` now calls `await consumer.stop()` before clearing.

## [1.1.0] - 2026-01-23

### Fixed
- **Event consumer null-safety**: `opportunity.updated`, `risk.evaluation.completed`, `forecast.completed`, `workflow.recommendation.requested`—resolve `opportunityId` from `event.data?.opportunityId`, `tenantId` from `event.tenantId ?? event.data?.tenantId`; skip and log when missing. `shard.updated`—`shardId` from `event.data?.shardId ?? event.data?.id`; skip when `shardId` or `tenantId` missing.

## [1.0.0] - 2026-01-23

### Added
- Initial migration from old_code/
- Core functionality
