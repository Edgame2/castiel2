# Container up status

Track services that come up successfully (upy) vs failing. Update after each `docker compose up` or `docker compose build --no-cache [services]`.

**Build status:** 53 buildable services (compliance-service removed).

## Upy (build verified)
- **ui, embeddings, context-service, integration-manager, signal-intelligence** – as before. Build OK.
- **ai-conversation** – tsconfig bundler, events/routes/services TS fixes. Build OK.
- **utility-services** – config, EventPublisher/Consumer, optional deps, db casts. Build OK.
- **integration-sync** – tsconfig bundler, SyncTaskStatus 'processing', routes request.user, duplicate id/tenantId, Cosmos partitionKey as any, log args, unused vars. Build OK.
- **workflow-orchestrator** – preHandler/registerRoutes/setupJWT cast to any, request.user→(request as any).user. Build OK.
- **data-enrichment** – tsconfig bundler + noImplicitAny false, EventConsumer routingKeys, routes preHandler/request.user, server/reembedding/setupJWT/registerRoutes casts, EnrichmentService/VectorizationService/BaseProcessor/ReembeddingSchedulerService generateServiceToken(app as any), duplicate id/tenantId, partitionKey as any, unused vars. Build OK.
- **recommendations** – Build OK (cached).
- **web-search** – Dockerfile repo-root pattern (containers/web-search + shared), npm install --legacy-peer-deps; tsconfig bundler, routes _config/preHandler/request.user, WebSearchService unused clients/partitionKey as any, uuid.d.ts. Build OK.
- **quality-monitoring** – Dockerfile repo-root pattern; tsconfig bundler, routes _config/preHandler/request.user/partitionKey as any, QualityMonitoringService unused clients/partitionKey as any. Build OK.
- **security-scanning** – Dockerfile repo-root pattern; tsconfig/routes/services fixes; SecurityScanningService partitionKey as any (lines 113, 326). Build OK.
- **learning-service** – package.json workspace→file:../shared; Dockerfile repo-root pattern. Build OK.
- **risk-catalog** – Dockerfile repo-root pattern. Build OK.
- **forecasting** – Dockerfile repo-root; tsconfig bundler/noImplicitAny/noUnused; ForecastEventConsumer routingKeys; routes/server/services (request.user, registerRoutes, partitionKey, parameters, duplicate tenantId, _commitment/_mlForecast, uuid.d.ts). Build OK.
- **risk-analytics** – Dockerfile repo-root; generateServiceToken(app/fastify as any), setupJWT/registerRoutes(fastify as any), preHandler as any. Build OK.

## Failing (build errors)
- (none)

## Last updates
- **compose-up:** RabbitMQ host ports set to `${RABBITMQ_PORT:-5673}:5672` and `${RABBITMQ_MGMT_PORT:-15673}:15672` to avoid conflict when 5672/15672 in use. `docker compose up -d` succeeds.
- All 53 buildable services build OK; no failing.

## Health count
- **Containers healthy:** 2 out of 55 total (redis, rabbitmq). Many app containers Restarting (runtime/config e.g. Cosmos).
