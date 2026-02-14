# Container build health

Track build status for `docker compose build --no-cache`.

## Buildable services (image-only services excluded)

api-gateway, auth, user-management, secret-management, logging, notification-manager, integration-processors-light, integration-processors-heavy, ai-service, embeddings, shard-manager, document-manager, pipeline-manager, integration-manager, ai-insights, content-generation, search-service, analytics-service, collaboration-service, adaptive-learning, ml-service, configuration-service, context-service, cache-service, prompt-service, template-service, multi-modal-service, ai-conversation, data-enrichment, risk-catalog, risk-analytics, recommendations, forecasting, workflow-orchestrator, integration-sync, security-scanning, web-search, signal-intelligence, quality-monitoring, utility-services, learning-service, dashboard, pattern-recognition, validation-engine

## Status (updated after each build)

- **Healthy:** All 44 buildable services. Logging was failing (TypeScript); fixed and rebuilt.
- **Failing:** None.

## Last run

- Full build: **success** (all 44 images built). EXIT=0.
- Latest run: client connection closing (canceled). No code failures.

## Fixes applied this session

- **logging:** routes/index.ts — cast `tenantEnforcementMiddleware()` for addHook; QueryService.ts — pass `{ tenantId: auditLog.tenantId, userId: auditLog.userId ?? undefined }` to canAccessLog; UserManagementClient.ts — use `(data.data as { organizationId?: string }).organizationId` for backward compat.
