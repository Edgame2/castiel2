# Adaptive Learning Services Test Suite

## Overview

Comprehensive test suite for the CAIS adaptive learning services, covering all three phases of implementation.

## Test Files

### Phase 1: Foundational Services
- **`adaptive-weight-learning.service.test.ts`** - Thompson Sampling weight learning
- **`adaptive-model-selection.service.test.ts`** - Model selection and auto-graduation
- **`signal-weighting.service.test.ts`** - Feedback signal weighting
- **`adaptive-feature-engineering.service.test.ts`** - Context-aware feature engineering
- **`outcome-collector.service.test.ts`** - Outcome collection (real-time and batch)
- **`performance-tracker.service.test.ts`** - Component performance tracking
- **`adaptive-learning-validation.service.test.ts`** - Statistical validation
- **`adaptive-learning-rollout.service.test.ts`** - Gradual rollout management

### Phase 2: Adaptive Intelligence
- **`meta-learning.service.test.ts`** - Component trust learning
- **`active-learning.service.test.ts`** - Intelligent feedback requests
- **`feedback-quality.service.test.ts`** - Feedback quality assessment
- **`episodic-memory.service.test.ts`** - Notable event learning
- **`counterfactual.service.test.ts`** - What-if scenario generation
- **`causal-inference.service.test.ts`** - Causal relationship discovery
- **`multimodal-intelligence.service.test.ts`** - Cross-modal insights
- **`prescriptive-analytics.service.test.ts`** - Actionable recommendations

### Phase 3: Autonomous Intelligence
- **`reinforcement-learning.service.test.ts`** - Q-learning for action sequences
- **`graph-neural-network.service.test.ts`** - Graph-based relationship analysis
- **`neuro-symbolic.service.test.ts`** - Hybrid neural-symbolic reasoning

### Integration Tests
- **`adaptive-learning-integration.test.ts`** - End-to-end integration tests
- **`recommendations-service-integration.test.ts`** - RecommendationsService with adaptive weights
- **`risk-evaluation-service-integration.test.ts`** - RiskEvaluationService with adaptive weights

## Test Coverage

### Core Functionality
- ✅ Weight learning with Thompson Sampling
- ✅ Model selection and auto-graduation
- ✅ Signal weighting and feedback quality
- ✅ Feature engineering with context awareness
- ✅ Outcome collection (real-time and batch)
- ✅ Performance tracking and validation
- ✅ Gradual rollout with monitoring

### Learning Algorithms
- ✅ Thompson Sampling bandit updates
- ✅ Q-learning policy updates
- ✅ Bootstrap confidence intervals
- ✅ Learning rate calculation (inverse decay)
- ✅ Learning curve stages (bootstrap → initial → transition → mature)

### Safety Mechanisms
- ✅ Statistical validation
- ✅ Automatic rollback on degradation
- ✅ Circuit breaker behavior
- ✅ Request deduplication
- ✅ Default fallbacks

### Integration
- ✅ RecommendationsService with adaptive weights
- ✅ RiskEvaluationService with adaptive weights
- ✅ FeedbackLearningService with implicit signals
- ✅ Cache invalidation
- ✅ Cosmos DB persistence

## Running Tests

```bash
# Run all adaptive learning tests
pnpm --filter @castiel/api test adaptive-learning

# Run Phase 1 tests only
pnpm --filter @castiel/api test adaptive-learning/phase1

# Run Phase 2 tests only
pnpm --filter @castiel/api test adaptive-learning/phase2

# Run Phase 3 tests only
pnpm --filter @castiel/api test adaptive-learning/phase3

# Run integration tests
pnpm --filter @castiel/api test adaptive-learning/integration

# Run with coverage
pnpm --filter @castiel/api test:coverage adaptive-learning
```

## Test Structure

Tests follow the existing patterns:
- Use Vitest testing framework
- Mock all external dependencies (Cosmos DB, Redis, Monitoring)
- Test happy paths, error cases, and edge cases
- Use descriptive test names
- Group related tests with `describe` blocks
- Test both with and without Redis (optional dependency)
- Test learning curve stages
- Test rollback mechanisms

## Dependencies Mocked

- `CosmosClient` - Database operations
- `Redis` - Caching (optional)
- `IMonitoringProvider` - Monitoring and logging
- `OpportunityService` - Opportunity data (for some services)
- `RiskEvaluationService` - Risk evaluation (for some services)
- `RecommendationsService` - Recommendations (for some services)

## Key Test Scenarios

### Weight Learning
- Default weights when no learning data
- Cached weights from Redis
- Learning from outcomes
- Weight blending based on examples
- Learning curve stages
- Cache invalidation

### Model Selection
- Global model selection
- Industry model graduation
- Tenant-specific model selection
- Graduation criteria validation

### Validation
- Bootstrap confidence intervals
- Statistical significance testing
- Performance improvement validation
- Degradation detection

### Rollout
- Gradual rollout stages
- Rollback triggers
- Feature flag behavior
- Monitoring and alerts

## Notes

- Tests are isolated and don't require external services
- All dependencies are mocked for fast execution
- Tests verify both success and failure scenarios
- Learning algorithms are tested in isolation
- Integration tests verify service interactions
