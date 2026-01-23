# CAIS Services Integration Tests

## Overview

Integration tests for Compound AI System (CAIS) services, testing end-to-end workflows and service interactions.

## Test Files

### 1. **`forecast-services-integration.test.ts`** ✅
Tests integration between:
- `RevenueForecastService`
- `ForecastDecompositionService`
- `ConsensusForecastingService`
- `ForecastCommitmentService`

**Scenarios:**
- End-to-end forecast generation with all enhancements
- Consensus generation from multiple sources
- Commitment analysis and sandbagging detection
- Handling missing optional services gracefully

### 2. **`explanation-services-integration.test.ts`** ✅
Tests integration between:
- `ExplainableAIService`
- `ExplanationQualityService`
- `ExplanationMonitoringService`

**Scenarios:**
- Explanation generation with quality assessment
- Usage tracking and quality metric updates
- Gap identification in explanation quality
- Feedback loop integration

### 3. **`playbook-recommendations-integration.test.ts`** ✅
Tests integration between:
- `RecommendationsService`
- `PlaybookExecutionService`
- `WorkflowAutomationService`

**Scenarios:**
- Executing playbook from recommendation
- Handling recommendations without playbooks
- Workflow automation from playbook execution

### 4. **`self-healing-anomaly-integration.test.ts`** ✅
Tests integration between:
- `SelfHealingService`
- `AnomalyDetectionService`
- `PlaybookExecutionService`
- `EarlyWarningService`

**Scenarios:**
- Automatic anomaly detection and remediation
- Manual review task creation when auto-execute is disabled
- Handling remediation failures gracefully

### 5. **`pipeline-health-integration.test.ts`** ✅
Tests integration between:
- `PipelineAnalyticsService`
- `PipelineHealthService`

**Scenarios:**
- Health calculation using pipeline analytics
- Critical health issue identification
- Stage health breakdown

## Test Patterns

### Service Initialization
```typescript
// Initialize services with dependencies
const serviceA = new ServiceA(
  mockCosmosClient,
  mockRedis,
  mockMonitoring,
  serviceB // Dependency injection
);
```

### Mocking Strategy
- **CosmosClient**: Fully mocked with query/create/upsert operations
- **Redis**: Fully mocked with get/setex/del operations
- **Monitoring**: Fully mocked with trackEvent/trackException
- **Service Dependencies**: Real service instances with mocked dependencies

### Test Structure
```typescript
describe('Service Integration', () => {
  beforeEach(() => { /* Setup services and mocks */ });
  
  describe('End-to-End Workflow', () => {
    it('should complete full workflow', async () => {
      // Test service interactions
    });
  });
});
```

## Running Tests

```bash
# All integration tests
pnpm --filter @castiel/api test cais-services/integration

# Specific integration test
pnpm --filter @castiel/api test forecast-services-integration

# With coverage
pnpm --filter @castiel/api test:coverage cais-services/integration
```

## Coverage

**Total Integration Tests:** 5 test files

- ✅ Forecast Services Integration
- ✅ Explanation Services Integration
- ✅ Playbook & Recommendations Integration
- ✅ Self-Healing & Anomaly Detection Integration
- ✅ Pipeline Health Integration

## Notes

- Integration tests verify real service interactions, not just mocked responses
- Tests follow dependency injection patterns from actual service constructors
- All tests include error handling and graceful degradation scenarios
- Tests verify that optional services are handled correctly when missing
