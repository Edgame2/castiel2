# Changelog

## [1.0.0] - 2025-01-28

### Added

- Learning service module (Plan W6 Layer 7 – Feedback Loop)
- Cosmos DB containers: `user_feedback`, `outcome` (partitionKey `tenantId`)
- Config-driven server, JWT, RabbitMQ; health and ready endpoints
- FeedbackLearningService: recordFeedback, recordOutcome, linkFeedbackToPrediction, aggregateFeedback, calculateUserSatisfaction, identifyPredictionErrors, generateFeedbackReport, trackFeedbackTrends
- APIs: POST /api/v1/feedback, POST /api/v1/outcomes, GET /api/v1/feedback/summary/:modelId, GET /api/v1/feedback/trends/:modelId
- Events: feedback.recorded, outcome.recorded, feedback.trend.alert (FeedbackLearningEventPublisher)
- Types: UserFeedback, Outcome, RecordFeedbackRequest, RecordOutcomeRequest, FeedbackSummary, FeedbackTrends
