# CAIS Testing Plan

**Date:** January 2025  
**Status:** 📋 **PLANNED** - Test suite structure created, ready for implementation  
**Version:** 1.0

---

## Overview

This document outlines the comprehensive testing strategy for the CAIS adaptive learning system. The test suite covers all 19 services across three phases, ensuring reliability, correctness, and safety of the learning algorithms.

---

## Test Structure

### Test Organization

```
apps/api/tests/services/adaptive-learning/
├── README.md                                    # Test suite documentation
├── adaptive-weight-learning.service.test.ts     # ✅ Created
├── adaptive-model-selection.service.test.ts     # TODO
├── signal-weighting.service.test.ts            # TODO
├── adaptive-feature-engineering.service.test.ts # TODO
├── outcome-collector.service.test.ts           # TODO
├── performance-tracker.service.test.ts         # TODO
├── adaptive-learning-validation.service.test.ts # TODO
├── adaptive-learning-rollout.service.test.ts   # TODO
├── meta-learning.service.test.ts               # TODO
├── active-learning.service.test.ts             # TODO
├── feedback-quality.service.test.ts            # TODO
├── episodic-memory.service.test.ts             # TODO
├── counterfactual.service.test.ts              # TODO
├── causal-inference.service.test.ts            # TODO
├── multimodal-intelligence.service.test.ts     # TODO
├── prescriptive-analytics.service.test.ts      # TODO
├── reinforcement-learning.service.test.ts      # TODO
├── graph-neural-network.service.test.ts        # TODO
├── neuro-symbolic.service.test.ts              # TODO
└── integration/
    ├── adaptive-learning-integration.test.ts    # TODO
    ├── recommendations-service-integration.test.ts # TODO
    └── risk-evaluation-service-integration.test.ts # TODO
```

---

## Phase 1: Foundational Services Tests

### 1. AdaptiveWeightLearningService ✅

**Test Coverage:**
- ✅ Default weights when no learning data
- ✅ Cached weights from Redis
- ✅ Learning from outcomes (Thompson Sampling)
- ✅ Weight blending based on examples
- ✅ Learning curve stages (bootstrap → initial → transition → mature)
- ✅ Cache invalidation
- ✅ Error handling (Redis errors, Cosmos DB errors)
- ✅ Fallback to defaults

**Key Test Scenarios:**
```typescript
describe('AdaptiveWeightLearningService', () => {
  - getWeights: returns defaults, uses cache, handles errors
  - learnFromOutcome: updates bandit, saves to DB, invalidates cache
  - blendWeights: blends based on learning stage
  - learning curve: 0-100 (100% default), 100-500 (30% learned), etc.
});
```

### 2. AdaptiveModelSelectionService

**Test Coverage:**
- Model selection (global → industry → tenant)
- Graduation criteria validation
- Data sufficiency checks
- Performance comparison
- Cache behavior

### 3. SignalWeightingService

**Test Coverage:**
- Signal weight learning
- Correlation calculation
- Reliability scoring
- Weight normalization

### 4. AdaptiveFeatureEngineeringService

**Test Coverage:**
- Feature extraction
- Feature importance learning
- Context-aware feature selection
- SHAP value integration

### 5. OutcomeCollectorService

**Test Coverage:**
- Real-time outcome collection
- Batch processing
- High-value tenant handling
- Queue management

### 6. PerformanceTrackerService

**Test Coverage:**
- Component performance tracking
- Accuracy calculation
- Cache behavior
- Cosmos DB persistence

### 7. AdaptiveLearningValidationService

**Test Coverage:**
- Bootstrap confidence intervals
- Statistical significance testing
- Validation trigger logic
- Performance improvement validation

### 8. AdaptiveLearningRolloutService

**Test Coverage:**
- Gradual rollout stages
- Rollback detection
- Feature flag integration
- Monitoring and alerts

---

## Phase 2: Adaptive Intelligence Tests

### 9. MetaLearningService

**Test Coverage:**
- Component trust score calculation
- Uncertainty-based routing
- Trust learning from outcomes
- Context-aware trust

### 10. ActiveLearningService

**Test Coverage:**
- Query strategy selection
- Sampling rate optimization
- Feedback request generation
- Priority determination

### 11. FeedbackQualityService

**Test Coverage:**
- Quality score calculation
- Bias detection
- User reliability tracking
- Training weight adjustment

### 12. EpisodicMemoryService

**Test Coverage:**
- Significant event identification
- Episode capture
- Similar episode retrieval
- Lesson extraction

### 13. CounterfactualService

**Test Coverage:**
- Counterfactual scenario generation
- Feasibility estimation
- Outcome prediction
- Validation against actual outcomes

### 14. CausalInferenceService

**Test Coverage:**
- Causal relationship discovery
- Opportunity causal analysis
- Relationship validation
- Evidence collection

### 15. MultiModalIntelligenceService

**Test Coverage:**
- Cross-modal analysis
- Contradiction detection
- Synergy identification
- Contribution calculation

### 16. PrescriptiveAnalyticsService

**Test Coverage:**
- Action plan generation
- Risk-based actions
- Causal-based actions
- Impact calculation

---

## Phase 3: Autonomous Intelligence Tests

### 17. ReinforcementLearningService

**Test Coverage:**
- Q-learning updates
- Epsilon-greedy policy
- Deal nurturing strategy
- Stakeholder engagement paths

### 18. GraphNeuralNetworkService

**Test Coverage:**
- Graph construction
- Influence propagation
- Community detection
- Path finding (Dijkstra's)

### 19. NeuroSymbolicService

**Test Coverage:**
- Constrained optimization
- Symbolic explanation
- Knowledge integration
- Rule application

---

## Integration Tests

### Adaptive Learning Integration

**Test Scenarios:**
- Full learning pipeline (prediction → outcome → learning → validation)
- Service interactions (weight learning → recommendations)
- Cache invalidation across services
- Rollback propagation

### RecommendationsService Integration

**Test Scenarios:**
- Adaptive weights integration
- Outcome collection
- Performance tracking
- Fallback to defaults

### RiskEvaluationService Integration

**Test Scenarios:**
- Adaptive weights integration
- Risk prediction tracking
- Outcome recording
- Weight updates

---

## Test Patterns

### Mocking Strategy

```typescript
// Cosmos DB
const mockCosmosClient = {
  database: vi.fn().mockReturnValue({
    container: vi.fn().mockReturnValue({
      items: { query, create, upsert },
      item: { read },
    }),
  }),
} as unknown as CosmosClient;

// Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
} as unknown as Redis;

// Monitoring
const mockMonitoring: IMonitoringProvider = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackMetric: vi.fn(),
} as any;
```

### Test Structure

```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    // Setup mocks
  });

  describe('methodName', () => {
    it('should handle happy path', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Error handling test
    });
  });
});
```

---

## Test Metrics

### Coverage Targets

- **Unit Tests**: 90% coverage for learning algorithms
- **Integration Tests**: 80% coverage for service interactions
- **E2E Tests**: Critical paths only

### Performance Targets

- **Unit Test Execution**: < 5 seconds per service
- **Integration Test Execution**: < 30 seconds per integration
- **Total Test Suite**: < 10 minutes

---

## Running Tests

```bash
# All adaptive learning tests
pnpm --filter @castiel/api test adaptive-learning

# Phase 1 only
pnpm --filter @castiel/api test adaptive-learning/phase1

# Phase 2 only
pnpm --filter @castiel/api test adaptive-learning/phase2

# Phase 3 only
pnpm --filter @castiel/api test adaptive-learning/phase3

# Integration tests
pnpm --filter @castiel/api test adaptive-learning/integration

# With coverage
pnpm --filter @castiel/api test:coverage adaptive-learning
```

---

## Test Data

### Test Fixtures

- Sample opportunities
- Sample outcomes
- Sample feedback
- Sample relationships
- Sample graphs

### Test Scenarios

- Bootstrap stage (0-100 examples)
- Initial stage (100-500 examples)
- Transition stage (500-1000 examples)
- Mature stage (1000+ examples)

---

## Next Steps

1. **Complete Phase 1 Tests** - Finish remaining 7 service tests
2. **Complete Phase 2 Tests** - Create 8 service tests
3. **Complete Phase 3 Tests** - Create 3 service tests
4. **Integration Tests** - Create integration test suite
5. **E2E Tests** - Create end-to-end test scenarios
6. **Performance Tests** - Validate performance targets
7. **Documentation** - Update test documentation

---

## Status

- ✅ Test structure created
- ✅ Sample test file created (AdaptiveWeightLearningService)
- ✅ Test documentation created
- ⏳ Remaining tests: 18 service tests + 3 integration tests

---

## Notes

- All tests use Vitest framework
- Dependencies are fully mocked
- Tests are isolated and fast
- Error handling is thoroughly tested
- Learning algorithms are tested in isolation
- Integration tests verify service interactions
