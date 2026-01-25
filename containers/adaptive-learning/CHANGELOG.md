# Changelog

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

