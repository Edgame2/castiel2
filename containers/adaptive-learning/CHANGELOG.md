# Changelog

## [Unreleased]

### Added
- **Phase 12 – Automatic learning (batch job):** For tenants with `automaticLearningEnabled` (Phase 10), `CaisLearningService.runLearningJob()` loads recent outcomes from `adaptive_outcomes` (type=outcome, optional date filter), correlates with predictions (same tenant, predictionId) to get (predictedValue, outcomeValue) per component, then updates `adaptive_weights` (exponential moving average of accuracy per component, weights clamped [0.1, 0.95]) and `adaptive_model_selections` (confidence updated from accuracy). `AdaptiveWeightsService.listTenantIdsWithAutomaticLearning()` (cross-partition query on `adaptive_tenant_config`). `CaisLearningJobConsumer` listens for `workflow.job.trigger` with job `cais-learning` on queue `cais_batch_jobs`, runs the learning job, publishes `workflow.job.completed` or `workflow.job.failed`. Config: `rabbitmq.batch_jobs.queue`, `rabbitmq.batch_jobs.routing_keys`. Workflow-orchestrator: `batch_jobs.cais_learning_cron` (default `0 7 * * *` = 7 AM daily) publishes `workflow.job.trigger` with job `cais-learning`.

## [1.1.0] - 2026-01-23

### Added
- OutcomeCollectorService (MISSING_FEATURES 3.2): recordPrediction, recordOutcome, recordFromEvent
- REST: POST /api/v1/adaptive-learning/outcomes/record-prediction, record-outcome
- OutcomeEventConsumer: consumes adaptive.learning.outcome.recorded, stores via recordFromEvent
- Cosmos container `adaptive_outcomes`; rabbitmq bindings for adaptive.learning.outcome.recorded

## [1.0.0] - 2025-01-22

### Added
- Initial module extraction from monolithic API
- CAIS Adaptive Learning system (22 services)
- Adaptive weight learning
- Adaptive model selection
- Signal weighting
- Feature engineering
- Outcome collection
- Performance tracking
- Validation and rollout management
- Event publishing
- Cosmos DB NoSQL integration

