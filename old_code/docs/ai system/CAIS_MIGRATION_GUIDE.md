# CAIS Migration Guide

**Date:** January 2025  
**Status:** 📋 **MIGRATION GUIDE**  
**Version:** 1.0

---

## Overview

This guide helps you migrate existing services to use CAIS adaptive learning. It provides step-by-step instructions, code examples, and best practices.

---

## Migration Strategy

### Phase 1: Preparation (Week 1)
- Review existing service code
- Identify hardcoded weights/thresholds
- Plan integration points
- Set up feature flags

### Phase 2: Integration (Week 2-3)
- Add adaptive learning services as optional dependencies
- Replace hardcoded values with learned parameters
- Add prediction tracking
- Add outcome recording

### Phase 3: Testing (Week 4)
- Write integration tests
- Verify fallback behavior
- Test with feature flag disabled
- Test with feature flag enabled

### Phase 4: Rollout (Week 5+)
- Enable feature flag for 10% of tenants
- Monitor performance
- Gradually increase rollout
- Monitor learning progress

---

## Step-by-Step Migration

### Step 1: Identify Hardcoded Values

**Before Migration:**
```typescript
export class RiskEvaluationService {
  // Hardcoded weights
  private readonly WEIGHTS = {
    ml: 0.9,
    rules: 1.0,
    llm: 0.8,
    historical: 0.9,
  };
  
  async evaluateOpportunity(opportunity: Opportunity) {
    // Use hardcoded weights
    const mlScore = mlResult * this.WEIGHTS.ml;
    const rulesScore = rulesResult * this.WEIGHTS.rules;
    // ...
  }
}
```

**Action Items:**
- [ ] List all hardcoded weights
- [ ] List all hardcoded thresholds
- [ ] List all hardcoded selection criteria
- [ ] Document current values

---

### Step 2: Add Service Dependencies

**Add to Constructor:**
```typescript
export class RiskEvaluationService {
  private adaptiveWeightService?: AdaptiveWeightLearningService;
  private outcomeCollector?: OutcomeCollectorService;
  private performanceTracker?: PerformanceTrackerService;
  
  constructor(
    private monitoring: IMonitoringProvider,
    // ... existing dependencies
    // Add as optional dependencies
    adaptiveWeightService?: AdaptiveWeightLearningService,
    outcomeCollector?: OutcomeCollectorService,
    performanceTracker?: PerformanceTrackerService,
  ) {
    this.adaptiveWeightService = adaptiveWeightService;
    this.outcomeCollector = outcomeCollector;
    this.performanceTracker = performanceTracker;
  }
}
```

**Action Items:**
- [ ] Add optional service dependencies
- [ ] Store as private properties
- [ ] Update service initialization

---

### Step 3: Create Context Key Generator

**Add Helper Method:**
```typescript
import { contextKeyGenerator } from '../utils/context-key-generator.js';

export class RiskEvaluationService {
  private generateContextKey(context: Context): string {
    return contextKeyGenerator.generateForRisk(context);
  }
}
```

**Action Items:**
- [ ] Import context key generator
- [ ] Create context key generation method
- [ ] Test context key generation

---

### Step 4: Replace Hardcoded Weights

**Before:**
```typescript
async evaluateOpportunity(opportunity: Opportunity) {
  const mlScore = mlResult * this.WEIGHTS.ml;
  const rulesScore = rulesResult * this.WEIGHTS.rules;
  // ...
}
```

**After:**
```typescript
async evaluateOpportunity(opportunity: Opportunity, context: Context) {
  // Get learned weights (with fallback)
  const weights = await this.getWeightsForContext(
    opportunity.tenantId,
    context
  );
  
  const mlScore = mlResult * weights.ml;
  const rulesScore = rulesResult * weights.rules;
  // ...
}

private async getWeightsForContext(
  tenantId: string,
  context: Context
): Promise<Record<string, number>> {
  if (!this.adaptiveWeightService) {
    return DEFAULT_WEIGHTS; // Fallback
  }
  
  try {
    const contextKey = this.generateContextKey(context);
    return await this.adaptiveWeightService.getWeights(
      tenantId,
      contextKey,
      'risk'
    );
  } catch (error) {
    this.monitoring.trackException(error as Error, {
      operation: 'getWeightsForContext',
      tenantId,
    });
    return DEFAULT_WEIGHTS; // Fallback on error
  }
}
```

**Action Items:**
- [ ] Create `getWeightsForContext` method
- [ ] Replace hardcoded weights with learned weights
- [ ] Add error handling and fallback
- [ ] Test fallback behavior

---

### Step 5: Add Prediction Tracking

**Add Tracking Method:**
```typescript
private async trackPredictionForLearning(
  tenantId: string,
  context: Context,
  evaluation: RiskEvaluation,
  weights: Record<string, number>
): Promise<void> {
  if (!this.outcomeCollector) return;
  
  try {
    // Extract component scores
    const componentScores: Record<string, number> = {};
    evaluation.detectedRisks.forEach(risk => {
      const method = risk.detectionMethod;
      componentScores[method] = risk.confidence;
    });
    
    // Record prediction
    const predictionId = await this.outcomeCollector.recordPrediction(
      tenantId,
      'risk',
      context,
      {
        riskScore: evaluation.overallRiskScore,
        detectedRisks: evaluation.detectedRisks,
      },
      componentScores,
      weights
    );
    
    // Store predictionId for later outcome recording
    await this.storePredictionId(evaluation.opportunityId, predictionId);
  } catch (error) {
    this.monitoring.trackException(error as Error, {
      operation: 'trackPredictionForLearning',
      tenantId,
    });
    // Don't throw - learning is non-critical
  }
}
```

**Update Main Method:**
```typescript
async evaluateOpportunity(opportunity: Opportunity, context: Context) {
  const weights = await this.getWeightsForContext(opportunity.tenantId, context);
  const evaluation = await this.calculateRiskScore(opportunity, weights);
  
  // Track prediction for learning
  await this.trackPredictionForLearning(
    opportunity.tenantId,
    context,
    evaluation,
    weights
  );
  
  return evaluation;
}
```

**Action Items:**
- [ ] Create `trackPredictionForLearning` method
- [ ] Extract component scores
- [ ] Record prediction
- [ ] Store predictionId for later use
- [ ] Add to main evaluation method

---

### Step 6: Add Outcome Recording

**Add Outcome Recording Method:**
```typescript
async onOpportunityOutcome(
  opportunityId: string,
  tenantId: string,
  outcome: 'won' | 'lost' | 'cancelled'
): Promise<void> {
  if (!this.outcomeCollector) return;
  
  try {
    // Retrieve predictionId
    const predictionId = await this.getPredictionId(opportunityId);
    if (!predictionId) return;
    
    // Record outcome
    await this.outcomeCollector.recordOutcome(
      predictionId,
      tenantId,
      outcome === 'won' ? 1.0 : 0.0,
      outcome === 'won' ? 'success' : 'failure',
      {
        opportunityId,
        outcome,
      }
    );
    
    // Track component performance
    if (this.performanceTracker) {
      const evaluation = await this.getEvaluation(opportunityId);
      if (evaluation) {
        const wasCorrect = (outcome === 'won' && evaluation.overallRiskScore < 0.5) ||
                          (outcome === 'lost' && evaluation.overallRiskScore >= 0.5);
        
        evaluation.detectedRisks.forEach(risk => {
          this.performanceTracker!.trackPerformance(
            tenantId,
            'risk',
            evaluation.context,
            risk.detectionMethod,
            wasCorrect
          );
        });
      }
    }
  } catch (error) {
    this.monitoring.trackException(error as Error, {
      operation: 'onOpportunityOutcome',
      tenantId,
      opportunityId,
    });
  }
}
```

**Action Items:**
- [ ] Create `onOpportunityOutcome` method
- [ ] Retrieve predictionId
- [ ] Record outcome
- [ ] Track component performance
- [ ] Hook into opportunity lifecycle events

---

### Step 7: Update Service Initialization

**In routes/index.ts or initialization file:**
```typescript
import { initializeAdaptiveLearningServices } from '../services/initialization/adaptive-learning-services.init.js';

// During application startup
const adaptiveLearningResult = await initializeAdaptiveLearningServices(
  server,
  monitoring,
  cosmosClient,
  redis,
  serviceRegistry
);

// Pass services to your service
const riskEvaluationService = new RiskEvaluationService(
  monitoring,
  // ... existing dependencies
  adaptiveLearningResult.adaptiveWeightLearningService,
  adaptiveLearningResult.outcomeCollectorService,
  adaptiveLearningResult.performanceTrackerService,
);
```

**Action Items:**
- [ ] Import initialization function
- [ ] Initialize adaptive learning services
- [ ] Pass services to your service
- [ ] Verify services are available

---

### Step 8: Add Tests

**Unit Test Example:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskEvaluationService } from '../../src/services/risk-evaluation.service.js';

describe('RiskEvaluationService with Adaptive Learning', () => {
  let riskService: RiskEvaluationService;
  let adaptiveWeightService: any;
  let outcomeCollector: any;
  
  beforeEach(() => {
    adaptiveWeightService = {
      getWeights: vi.fn().mockResolvedValue({
        ml: 0.9,
        rules: 1.0,
        llm: 0.8,
        historical: 0.9,
      }),
    };
    
    outcomeCollector = {
      recordPrediction: vi.fn().mockResolvedValue('prediction-id'),
      recordOutcome: vi.fn().mockResolvedValue(undefined),
    };
    
    riskService = new RiskEvaluationService(
      mockMonitoring,
      // ... other dependencies
      adaptiveWeightService,
      outcomeCollector,
      undefined,
    );
  });
  
  it('should use learned weights', async () => {
    const evaluation = await riskService.evaluateOpportunity(
      { id: 'opp-1', tenantId: 'tenant-1' },
      { industry: 'tech', dealSize: 'large' }
    );
    
    expect(adaptiveWeightService.getWeights).toHaveBeenCalled();
    expect(evaluation).toBeDefined();
  });
  
  it('should fallback to defaults when service unavailable', async () => {
    const serviceWithoutAdaptive = new RiskEvaluationService(
      mockMonitoring,
      // ... other dependencies
      undefined, // No adaptive service
      undefined,
      undefined,
    );
    
    const evaluation = await serviceWithoutAdaptive.evaluateOpportunity(
      { id: 'opp-1', tenantId: 'tenant-1' },
      { industry: 'tech', dealSize: 'large' }
    );
    
    expect(evaluation).toBeDefined();
    // Should work with defaults
  });
});
```

**Action Items:**
- [ ] Write unit tests
- [ ] Test with adaptive services
- [ ] Test without adaptive services (fallback)
- [ ] Test error handling

---

## Migration Checklist

### Pre-Migration
- [ ] Review existing service code
- [ ] Identify hardcoded values
- [ ] Document current behavior
- [ ] Plan integration points
- [ ] Set up feature flags

### Integration
- [ ] Add service dependencies
- [ ] Create context key generator
- [ ] Replace hardcoded weights
- [ ] Add prediction tracking
- [ ] Add outcome recording
- [ ] Update service initialization

### Testing
- [ ] Write unit tests
- [ ] Test fallback behavior
- [ ] Test with feature flag disabled
- [ ] Test with feature flag enabled
- [ ] Integration tests

### Deployment
- [ ] Code review
- [ ] Deploy to staging
- [ ] Enable feature flag for 10%
- [ ] Monitor performance
- [ ] Gradually increase rollout

---

## Common Migration Patterns

### Pattern 1: Weight-Based Services

**Services:** Risk Evaluation, Recommendations, Forecasts

**Steps:**
1. Identify weight constants
2. Replace with `getWeights()` call
3. Add prediction tracking
4. Add outcome recording

### Pattern 2: Threshold-Based Services

**Services:** Risk thresholds, Quality thresholds

**Steps:**
1. Identify threshold constants
2. Replace with learned thresholds (future)
3. Add prediction tracking
4. Add outcome recording

### Pattern 3: Selection-Based Services

**Services:** Model selection, Algorithm selection

**Steps:**
1. Identify selection logic
2. Replace with `selectModel()` call
3. Add performance tracking
4. Add learning from outcomes

---

## Troubleshooting

### Issue: Services Not Available

**Symptoms:**
- `adaptiveWeightService` is undefined
- Services not initialized

**Solution:**
1. Check service initialization in `routes/index.ts`
2. Verify Cosmos DB connection
3. Verify Redis connection
4. Check service registry

### Issue: Weights Not Learning

**Symptoms:**
- Weights remain at defaults
- No improvement over time

**Solution:**
1. Check outcome collection is working
2. Verify sufficient examples (>100)
3. Check learning rate > 0
4. Verify feature flag enabled

### Issue: Performance Degradation

**Symptoms:**
- Accuracy decreased
- User complaints

**Solution:**
1. Check validation status
2. Review rollback triggers
3. Consider manual rollback
4. Investigate root cause

---

## Best Practices

### 1. Always Provide Fallbacks
```typescript
const weights = adaptiveWeightService
  ? await adaptiveWeightService.getWeights(...)
  : DEFAULT_WEIGHTS;
```

### 2. Make Learning Non-Critical
```typescript
try {
  await outcomeCollector.recordPrediction(...);
} catch (error) {
  // Log but don't throw
  this.monitoring.trackException(error, { ... });
}
```

### 3. Track Predictions Before Returning
```typescript
const result = await calculateResult(...);
await trackPredictionForLearning(...);
return result;
```

### 4. Record Outcomes Promptly
```typescript
// Record as soon as outcome is known
await outcomeCollector.recordOutcome(predictionId, tenantId, outcome);
```

### 5. Use Context Keys Consistently
```typescript
const contextKey = contextKeyGenerator.generateSimple(context);
```

---

## Migration Timeline

### Week 1: Preparation
- Review code
- Plan integration
- Set up feature flags

### Week 2-3: Integration
- Add dependencies
- Replace hardcoded values
- Add tracking
- Write tests

### Week 4: Testing
- Unit tests
- Integration tests
- Staging deployment
- Performance testing

### Week 5+: Rollout
- 10% rollout
- Monitor performance
- Gradually increase
- Full rollout

---

## Conclusion

This migration guide provides step-by-step instructions for integrating CAIS adaptive learning into existing services. Follow the checklist and best practices for a smooth migration.

**Status:** ✅ **MIGRATION GUIDE COMPLETE**
