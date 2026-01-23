# Adaptive Learning Service Module

CAIS (Compound AI System) Adaptive Learning system for automatically learning optimal parameters for AI/ML components.

## Features

- **Adaptive Weight Learning**: Learns optimal component weights
- **Adaptive Model Selection**: Selects best model automatically
- **Signal Weighting**: Learns optimal signal weights
- **Feature Engineering**: Context-aware feature engineering
- **Outcome Collection**: Collects predictions and outcomes
- **Performance Tracking**: Tracks component performance
- **Validation**: Validates learned parameters
- **Rollout Management**: Manages gradual rollout
- **22 CAIS Services**: Complete CAIS system with all phases

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Redis (for caching)
- RabbitMQ 3.12+ (for event publishing)
- AI Service
- Logging Service

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers):

- `adaptive_weights` - Learned weights (partition key: `/tenantId`)
- `adaptive_model_selections` - Model selection history (partition key: `/tenantId`)
- `adaptive_outcomes` - Outcome collection data (partition key: `/tenantId`)
- `adaptive_performance` - Performance metrics (partition key: `/tenantId`)
- `adaptive_validations` - Validation results (partition key: `/tenantId`)
- `adaptive_rollouts` - Rollout status (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3032 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| redis.url | string | - | Redis URL (required) |
| ai_service.url | string | - | AI Service URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/adaptive-learning/weights/:tenantId` | Get learned weights |
| GET | `/api/v1/adaptive-learning/performance/:tenantId` | Get performance metrics |
| POST | `/api/v1/adaptive-learning/reset/:tenantId` | Reset learned parameters |
| GET | `/api/v1/adaptive-learning/validation-status/:tenantId` | Get validation status |
| GET | `/api/v1/adaptive-learning/rollout-status/:tenantId` | Get rollout status |
| GET | `/api/v1/cais-services/*` | CAIS services endpoints (22 services) |

## CAIS Services (22 Total)

### Phase 1: Foundational (8 services)
- AdaptiveWeightLearningService
- AdaptiveModelSelectionService
- SignalWeightingService
- AdaptiveFeatureEngineeringService
- OutcomeCollectorService
- PerformanceTrackerService
- AdaptiveLearningValidationService
- AdaptiveLearningRolloutService

### Phase 2: Adaptive Intelligence (8 services)
- MetaLearningService
- ActiveLearningService
- FeedbackQualityService
- EpisodicMemoryService
- CounterfactualService
- CausalInferenceService
- MultiModalIntelligenceService
- PrescriptiveAnalyticsService

### Phase 3: Autonomous Intelligence (3 services)
- ReinforcementLearningService
- GraphNeuralNetworkService
- NeuroSymbolicService

### Phase 4-7: Additional Services (3 services)
- ConflictResolutionLearningService
- HierarchicalMemoryService
- AdversarialTestingService

## Events

### Published Events

- `adaptive.learning.weight_updated` - Weight updated
- `adaptive.learning.model_selected` - Model selected
- `adaptive.learning.validated` - Parameters validated
- `adaptive.learning.rolled_out` - Rollout status changed

## Dependencies

- **AI Service**: For AI model access
- **Shard Manager**: For data access
- **Logging**: For audit logging

## Documentation

For complete CAIS documentation, see:
- [CAIS README](../../old_code/apps/api/src/services/adaptive-learning/README.md)
- [CAIS Documentation](../../old_code/apps/api/docs/ai system/)

## License

Proprietary

