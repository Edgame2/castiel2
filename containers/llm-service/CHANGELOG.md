# Changelog

All notable changes to this module will be documented in this file.

## [Unreleased]

### Added

- **W9 – Reactivation strategy (Layer 5, FR-5.4):** Types `ReactivationRecommendation`, `ReactivationStrategyRequest`, and nested types in `llm.types.ts`. `LLMOutputType` extended with `reactivation_strategy`. `ChainOfThoughtService.generateReactivationStrategy(request, tenantId)`: stub builds strategy from optional `dormantFeatures` and `reactivationPrediction` (priority from reactivationProbability, outreach from recommendedApproach). Persists to Cosmos as `reactivation_strategy`. `POST /api/v1/llm/reactivation/strategy` (body: opportunityId, dormantFeatures?, reactivationPrediction?) returns `{ reactivationStrategy }`. Events: llm.reasoning.requested/completed/failed with reasoningType `reactivation_strategy`.
- **W5 Layer 5 – ChainOfThoughtService, LLMOutput, 5 APIs, events:** ChainOfThoughtService with stub implementation (explain, generateRecommendations, analyzeScenarios, generateSummary, generatePlaybook). LLMOutput persisted to Cosmos `llm_outputs` (partitionKey tenantId). APIs: POST /api/v1/llm/explain, /recommendations, /scenarios, /summary, /playbook (body opportunityId required, predictionId?, explanationId?, context?). Events: llm.reasoning.requested at start, llm.reasoning.completed on success, llm.reasoning.failed on error. Types: LLMOutput, LLMInputContext, LLMOutputData, Recommendation, Scenario in src/types/llm.types.ts. Real LLM provider can replace stub later.
- **W5 Layer 5 – llm-service scaffold:** New container for LLM reasoning (Plan W5, COMPREHENSIVE_LAYER_REQUIREMENTS_SUMMARY). Config-driven port (PORT:-3062), Cosmos `llm_outputs` container, JWT, services URLs, RabbitMQ placeholders, llm provider/config. Server with health and ready; routes skeleton.

## [1.0.0] – (scaffold)

- Initial scaffold: config, server, health/ready, OpenAPI stub.
