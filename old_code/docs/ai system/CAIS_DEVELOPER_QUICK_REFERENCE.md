# CAIS Developer Quick Reference

**Date:** January 2025  
**Status:** 📋 **QUICK REFERENCE GUIDE**  
**Version:** 1.0

---

## Overview

Quick reference guide for developers working with the CAIS adaptive learning system. This guide provides code examples, common patterns, and best practices.

---

## Service Access Patterns

### Accessing Services from Controllers

Services are available on the Fastify server instance:

```typescript
// In a controller or route handler
export async function myRouteHandler(request: FastifyRequest, reply: FastifyReply) {
  const server = request.server;
  
  // Access adaptive learning services
  const adaptiveWeightService = (server as any).adaptiveWeightLearningService;
  const outcomeCollector = (server as any).outcomeCollectorService;
  const performanceTracker = (server as any).performanceTrackerService;
  
  // Use services (with null checks)
  if (adaptiveWeightService) {
    const weights = await adaptiveWeightService.getWeights(
      tenantId,
      contextKey,
      'risk'
    );
  }
}
```

### Injecting Services in Existing Services

Services are injected as optional dependencies:

```typescript
export class MyService {
  constructor(
    private monitoring: IMonitoringProvider,
    // Optional adaptive learning services
    private adaptiveWeightService?: AdaptiveWeightLearningService,
    private outcomeCollector?: OutcomeCollectorService,
    private performanceTracker?: PerformanceTrackerService,
  ) {}
  
  async myMethod(tenantId: string, context: Context) {
    // Get learned weights (with fallback to defaults)
    const weights = this.adaptiveWeightService
      ? await this.adaptiveWeightService.getWeights(tenantId, contextKey, 'risk')
      : DEFAULT_WEIGHTS;
    
    // Use weights...
    
    // Track prediction for learning
    if (this.outcomeCollector) {
      await this.outcomeCollector.recordPrediction(
        tenantId,
        'risk',
        context,
        prediction,
        componentScores,
        weights
      );
    }
  }
}
```

---

## Common Usage Patterns

### Pattern 1: Get Learned Weights

```typescript
// Get weights for a specific context
const weights = await adaptiveWeightService.getWeights(
  tenantId,
  'tech:large:proposal', // contextKey
  'risk' // serviceType: 'risk' | 'forecast' | 'recommendations'
);

// Weights are automatically blended based on learning stage
// - Bootstrap (0-100 examples): 100% default
// - Initial (100-500): 30% learned, 70% default
// - Transition (500-1000): 80% learned, 20% default
// - Mature (1000+): 95% learned, 5% default
```

### Pattern 2: Record Prediction and Outcome

```typescript
// Step 1: Record prediction
const predictionId = await outcomeCollector.recordPrediction(
  tenantId,
  'risk',
  context,
  {
    riskScore: 0.75,
    detectedRisks: [...],
  },
  {
    ml: 0.8,
    rules: 0.9,
    llm: 0.7,
    historical: 0.85,
  },
  weights
);

// Step 2: Later, record actual outcome
await outcomeCollector.recordOutcome(
  predictionId,
  tenantId,
  1.0, // actualOutcome: 1.0 = success, 0.0 = failure
  'success', // outcomeType
  {
    opportunityWon: true,
    revenue: 50000,
  }
);
```

### Pattern 3: Track Component Performance

```typescript
// Track when a component makes a correct/incorrect prediction
await performanceTracker.trackPerformance(
  tenantId,
  'risk',
  context,
  'ml', // component: 'ml' | 'rules' | 'llm' | 'historical'
  true // wasCorrect
);

// Get performance metrics
const metrics = await performanceTracker.getPerformance(
  tenantId,
  'risk',
  context
);
// Returns: { accuracy: 0.85, totalPredictions: 150, ... }
```

### Pattern 4: Model Selection

```typescript
// Select best model for context
const { model, reason, metadata } = await adaptiveModelSelectionService.selectModel(
  tenantId,
  'risk',
  context
);

// model: 'global' | 'industry' | 'tenant'
// reason: Human-readable explanation
// metadata: Additional context (examples, accuracy, etc.)

// Learn from model performance
await adaptiveModelSelectionService.learnSelectionCriteria(
  tenantId,
  'risk',
  context,
  {
    globalAccuracy: 0.75,
    industryAccuracy: 0.82,
    tenantAccuracy: 0.88,
    examples: 200,
  }
);
```

### Pattern 5: Signal Weighting

```typescript
// Combine multiple feedback signals
const signals: Signal[] = [
  { type: 'explicit', value: 0.8, source: 'user_rating' },
  { type: 'implicit', value: 0.6, source: 'time_spent' },
  { type: 'implicit', value: 0.7, source: 'engagement' },
];

const combinedSignal = await signalWeightingService.combineSignals(
  tenantId,
  signals
);

// Learn from signal outcomes
await signalWeightingService.learnSignalWeights(
  tenantId,
  signals,
  1.0 // outcome
);
```

---

## Integration Examples

### Example 1: Risk Evaluation Service Integration

```typescript
// In RiskEvaluationService
async evaluateOpportunity(opportunity: Opportunity, context: Context) {
  // Get learned weights
  const weights = this.adaptiveWeightService
    ? await this.adaptiveWeightService.getWeights(
        opportunity.tenantId,
        this.generateContextKey(context),
        'risk'
      )
    : DEFAULT_RISK_WEIGHTS;
  
  // Evaluate with learned weights
  const evaluation = await this.calculateRiskScore(opportunity, weights);
  
  // Track prediction for learning
  if (this.outcomeCollector) {
    await this.trackPredictionForLearning(
      opportunity.tenantId,
      context,
      evaluation,
      weights
    );
  }
  
  return evaluation;
}

private async trackPredictionForLearning(
  tenantId: string,
  context: Context,
  evaluation: RiskEvaluation,
  weights: Record<string, number>
) {
  const componentScores: Record<string, number> = {};
  evaluation.detectedRisks.forEach(risk => {
    componentScores[risk.detectionMethod] = risk.confidence;
  });
  
  await this.outcomeCollector!.recordPrediction(
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
}

// Later, when opportunity outcome is known
async onOpportunityOutcome(
  opportunityId: string,
  outcome: 'won' | 'lost' | 'cancelled'
) {
  // Record outcome for learning
  // (predictionId should be stored with opportunity)
  if (this.outcomeCollector && predictionId) {
    await this.outcomeCollector.recordOutcome(
      predictionId,
      tenantId,
      outcome === 'won' ? 1.0 : 0.0,
      outcome === 'won' ? 'success' : 'failure'
    );
  }
}
```

### Example 2: Recommendations Service Integration

```typescript
// In RecommendationsService
async getRecommendations(request: RecommendationRequest) {
  const contextKey = this.generateContextKey(request);
  
  // Get learned weights
  const weights = this.adaptiveWeightService
    ? await this.adaptiveWeightService.getWeights(
        request.tenantId,
        contextKey,
        'recommendations'
      )
    : this.DEFAULT_WEIGHTS;
  
  // Generate recommendations with learned weights
  const recommendations = await this.mergeAndScoreRecommendations(
    vectorResults,
    collaborativeResults,
    temporalResults,
    contentResults,
    weights // Use learned weights
  );
  
  // Track prediction
  if (this.outcomeCollector) {
    await this.trackPredictionForLearning(
      request.tenantId,
      contextKey,
      recommendations,
      weights
    );
  }
  
  return recommendations;
}

// When user interacts with recommendation
async onRecommendationAction(
  recommendationId: string,
  action: 'clicked' | 'accepted' | 'dismissed'
) {
  if (this.outcomeCollector && predictionId) {
    const outcome = action === 'accepted' ? 1.0 : action === 'clicked' ? 0.5 : 0.0;
    await this.outcomeCollector.recordOutcome(
      predictionId,
      tenantId,
      outcome,
      action === 'accepted' ? 'success' : 'partial'
    );
  }
}
```

---

## Context Key Generation

### Standard Context Keys

```typescript
import { contextKeyGenerator } from '../utils/context-key-generator.js';

// Simple context key
const context: Context = {
  industry: 'tech',
  dealSize: 'large',
  stage: 'proposal',
};
const key = contextKeyGenerator.generateSimple(context);
// Result: "tech:large:proposal"

// Optimized context key (with deal value)
const key2 = contextKeyGenerator.generateOptimized({
  ...context,
  dealValue: 500000,
});
// Result: "tech:large:proposal" (deal value bucketed)

// Service-specific context keys
const riskKey = contextKeyGenerator.generateForRisk(context);
const recKey = contextKeyGenerator.generateForRecommendations(context);
const forecastKey = contextKeyGenerator.generateForForecast(context);
```

---

## Error Handling

### Graceful Degradation

```typescript
async getWeightsSafely(
  tenantId: string,
  contextKey: string,
  serviceType: ServiceType
): Promise<Record<string, number>> {
  try {
    if (this.adaptiveWeightService) {
      return await this.adaptiveWeightService.getWeights(
        tenantId,
        contextKey,
        serviceType
      );
    }
  } catch (error) {
    this.monitoring.trackException(error, {
      operation: 'getWeights',
      tenantId,
      contextKey,
    });
    // Fallback to defaults
  }
  
  return DEFAULT_WEIGHTS;
}
```

### Circuit Breaker Pattern

```typescript
// Services automatically handle circuit breaker
// If service is unavailable, falls back to defaults
// No additional code needed - built into services
```

---

## Validation and Rollback

### Check Validation Status

```typescript
const validationStatus = await adaptiveLearningValidationService.shouldValidate(
  tenantId,
  contextKey,
  'risk'
);

if (validationStatus.shouldValidate) {
  const result = await adaptiveLearningValidationService.validateWeights(
    tenantId,
    contextKey,
    'risk'
  );
  
  if (!result.validated) {
    // Learned weights didn't pass validation
    // System will continue using defaults
  }
}
```

### Manual Rollback

```typescript
// Check if rollback is needed
const rollbackDecision = await adaptiveLearningRolloutService.shouldRollback(
  tenantId,
  contextKey,
  'risk'
);

if (rollbackDecision.shouldRollback) {
  await adaptiveLearningRolloutService.executeRollback(
    tenantId,
    contextKey,
    'risk',
    rollbackDecision.reason
  );
}
```

---

## API Endpoints

### Get Learned Weights

```bash
GET /api/v1/adaptive-learning/weights/:tenantId?contextKey=tech:large:proposal&serviceType=risk
```

### Get Performance Metrics

```bash
GET /api/v1/adaptive-learning/performance/:tenantId?contextKey=tech:large:proposal&serviceType=risk
```

### Reset Learning

```bash
POST /api/v1/adaptive-learning/reset/:tenantId
{
  "contextKey": "tech:large:proposal",
  "serviceType": "risk"
}
```

### Override Weights (Admin)

```bash
POST /api/v1/adaptive-learning/override/:tenantId
{
  "contextKey": "tech:large:proposal",
  "serviceType": "risk",
  "weights": {
    "ml": 0.95,
    "rules": 0.90
  }
}
```

### Get Validation Status

```bash
GET /api/v1/adaptive-learning/validation-status/:tenantId?contextKey=tech:large:proposal&serviceType=risk
```

### Get Rollout Status

```bash
GET /api/v1/adaptive-learning/rollout-status/:tenantId?serviceType=risk
```

---

## Best Practices

### 1. Always Provide Fallbacks

```typescript
// ✅ Good
const weights = adaptiveWeightService
  ? await adaptiveWeightService.getWeights(...)
  : DEFAULT_WEIGHTS;

// ❌ Bad
const weights = await adaptiveWeightService.getWeights(...); // May throw
```

### 2. Track Predictions Before Returning

```typescript
// ✅ Good
const result = await calculateResult(...);
await trackPredictionForLearning(...);
return result;

// ❌ Bad
return result; // Prediction not tracked
```

### 3. Record Outcomes Promptly

```typescript
// ✅ Good - Record outcome as soon as known
await outcomeCollector.recordOutcome(predictionId, tenantId, outcome);

// ❌ Bad - Delayed outcome recording
// (Outcomes may be lost or delayed)
```

### 4. Use Context Keys Consistently

```typescript
// ✅ Good - Use utility function
const contextKey = contextKeyGenerator.generateSimple(context);

// ❌ Bad - Manual string concatenation
const contextKey = `${industry}:${dealSize}:${stage}`; // Inconsistent
```

### 5. Handle Optional Services Gracefully

```typescript
// ✅ Good - Check if service exists
if (adaptiveWeightService) {
  // Use service
}

// ❌ Bad - Assume service exists
await adaptiveWeightService.getWeights(...); // May be undefined
```

---

## Debugging Tips

### Check Service Availability

```typescript
// In route handler
const server = request.server;
console.log('Adaptive Weight Service:', (server as any).adaptiveWeightLearningService);
console.log('Outcome Collector:', (server as any).outcomeCollectorService);
```

### Monitor Learning Progress

```typescript
// Check examples collected
const learning = await adaptiveWeightService.getOrCreateLearning(
  tenantId,
  contextKey,
  'risk'
);
console.log('Examples:', learning.examples);
console.log('Learning Stage:', learning.stage);
console.log('Blend Ratio:', learning.blendRatio);
```

### Check Cache Status

```typescript
// Redis cache keys
// Pattern: learned_params:{tenantId}:weights:{contextKey}:{serviceType}
const cacheKey = `learned_params:${tenantId}:weights:${contextKey}:risk`;
// Check in Redis CLI: GET <cacheKey>
```

---

## Common Issues and Solutions

### Issue: Weights Not Updating

**Check:**
1. Outcome collection is working (`outcomeCollector.recordOutcome`)
2. Sufficient examples collected (>100 for initial learning)
3. Learning rate > 0
4. Feature flag enabled

**Solution:**
```typescript
// Verify outcome collection
const outcome = await outcomeCollector.recordOutcome(...);
console.log('Outcome recorded:', outcome);

// Check learning progress
const learning = await adaptiveWeightService.getOrCreateLearning(...);
console.log('Examples:', learning.examples);
```

### Issue: High Cache Miss Rate

**Check:**
1. Redis connection health
2. Cache key patterns
3. Cache invalidation logic

**Solution:**
```typescript
// Verify Redis connection
const redis = (server as any).redis;
await redis.ping(); // Should return 'PONG'

// Check cache key
const cacheKey = `learned_params:${tenantId}:weights:${contextKey}:risk`;
const cached = await redis.get(cacheKey);
console.log('Cached value:', cached);
```

### Issue: Performance Degradation

**Check:**
1. Validation status
2. Rollback triggers
3. Recent weight updates

**Solution:**
```typescript
// Check validation
const validation = await adaptiveLearningValidationService.validateWeights(...);
console.log('Validated:', validation.validated);
console.log('Improvement:', validation.improvement);

// Check rollback
const rollback = await adaptiveLearningRolloutService.shouldRollback(...);
if (rollback.shouldRollback) {
  console.log('Rollback needed:', rollback.reason);
}
```

---

## Additional Resources

- **Full Documentation:** `CAIS_IMPLEMENTATION_COMPLETE.md`
- **Deployment Guide:** `CAIS_DEPLOYMENT_GUIDE.md`
- **Monitoring Guide:** `CAIS_MONITORING_GUIDE.md`
- **Testing Guide:** `CAIS_TESTING_PLAN.md`

---

## Conclusion

This quick reference provides common patterns and examples for working with the CAIS adaptive learning system. For detailed information, refer to the full documentation.

**Status:** ✅ **QUICK REFERENCE COMPLETE**
