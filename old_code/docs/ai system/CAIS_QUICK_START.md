# CAIS Quick Start Guide

**Date:** January 2025  
**Status:** 📋 **QUICK START GUIDE**  
**Version:** 1.0

---

## Overview

Quick start guide to get CAIS adaptive learning up and running in 15 minutes.

---

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ pnpm installed
- ✅ Azure Cosmos DB account
- ✅ Redis instance
- ✅ Application Insights (optional)

---

## Step 1: Database Setup (5 minutes)

### 1.1 Initialize Cosmos DB Collections

```bash
cd apps/api
pnpm run init:cosmos
```

This creates:
- `adaptiveWeights`
- `modelSelectionHistory`
- `signalWeights`
- `learningOutcomes`
- `parameterHistory`

### 1.2 Verify Collections

```bash
# Check collections were created
az cosmosdb sql container list \
  --account-name <your-account> \
  --database-name <your-database>
```

---

## Step 2: Configuration (2 minutes)

### 2.1 Environment Variables

Ensure these are set:

```bash
# Cosmos DB
COSMOS_DB_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_DB_KEY=your-key
COSMOS_DB_DATABASE=your-database

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6380
REDIS_KEY=your-redis-key

# Application Insights (optional)
APPLICATIONINSIGHTS_CONNECTION_STRING=your-connection-string
```

### 2.2 Feature Flag

Enable adaptive learning:

```typescript
// Via API or feature flag service
await featureFlagService.setFlag('adaptive_learning_enabled', {
  enabled: true,
  rolloutPercentage: 0, // Start at 0% (data collection only)
});
```

---

## Step 3: Integration (5 minutes)

### 3.1 Integrate into Existing Service

**Example: Risk Evaluation Service**

```typescript
import { AdaptiveWeightLearningService } from './adaptive-weight-learning.service.js';
import { OutcomeCollectorService } from './outcome-collector.service.js';

export class RiskEvaluationService {
  constructor(
    private monitoring: IMonitoringProvider,
    // Add as optional dependencies
    private adaptiveWeightService?: AdaptiveWeightLearningService,
    private outcomeCollector?: OutcomeCollectorService,
  ) {}

  async evaluateOpportunity(opportunity: Opportunity, context: Context) {
    // Get learned weights (with fallback)
    const weights = this.adaptiveWeightService
      ? await this.adaptiveWeightService.getWeights(
          opportunity.tenantId,
          this.generateContextKey(context),
          'risk'
        )
      : DEFAULT_WEIGHTS;

    // Use weights in evaluation
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
}
```

### 3.2 Service Initialization

Services are automatically initialized in `routes/index.ts`. No additional setup needed.

---

## Step 4: Record Outcomes (3 minutes)

### 4.1 Record Prediction

Already done in Step 3.1 - predictions are automatically tracked.

### 4.2 Record Outcome

When outcome is known:

```typescript
// In your service
async onOpportunityOutcome(
  opportunityId: string,
  tenantId: string,
  outcome: 'won' | 'lost' | 'cancelled'
) {
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

---

## Step 5: Verify (2 minutes)

### 5.1 Check Learning Status

```bash
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123
```

### 5.2 Check API Endpoints

```bash
# Get learned weights
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/weights/tenant-123?contextKey=tech:large:proposal&serviceType=risk" \
  -H "Authorization: Bearer <token>"

# Get performance
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/performance/tenant-123?contextKey=tech:large:proposal&serviceType=risk" \
  -H "Authorization: Bearer <token>"
```

---

## What Happens Next?

### Week 1-4: Data Collection
- System collects outcomes
- No learning yet (rollout at 0%)
- Verify data collection is working

### Week 5-8: Learning Phase
- System learns parameters in background
- Validates learned parameters
- Prepares for rollout

### Week 9+: Gradual Rollout
- Week 9: 10% learned weight
- Week 10: 30% learned weight
- Week 11: 50% learned weight
- Week 12: 80% learned weight
- Week 13+: 95% learned weight

---

## Monitoring

### Key Metrics to Watch

1. **Outcome Collection Rate**
   - Should see outcomes being collected
   - Check: `adaptive_learning.outcome_recorded` events

2. **Learning Progress**
   - Examples collected per context
   - Check: `check-learning-status.ts` script

3. **Performance Improvement**
   - Accuracy improvements
   - Check: Performance API endpoint

### Dashboards

Set up dashboards using `CAIS_MONITORING_GUIDE.md`:
- Learning Overview
- Performance Monitoring
- System Health
- Business Impact

---

## Troubleshooting

### Issue: No Learning Records

**Check:**
- Outcome collection is working
- Feature flag enabled
- Sufficient examples (>100)

**Solution:**
```bash
# Check status
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123

# Check outcomes
# Query learningOutcomes container in Cosmos DB
```

### Issue: Weights Not Updating

**Check:**
- Learning rate > 0
- Examples > 100
- Validation passing

**Solution:**
```bash
# Check learning status
pnpm tsx scripts/adaptive-learning/check-learning-status.ts tenant-123

# Check validation status
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/validation-status/tenant-123?contextKey=tech:large:proposal&serviceType=risk"
```

### Issue: Performance Degradation

**Check:**
- Validation status
- Rollback triggers
- Recent changes

**Solution:**
```bash
# Check validation
curl -X GET "http://localhost:3000/api/v1/adaptive-learning/validation-status/tenant-123?contextKey=tech:large:proposal&serviceType=risk"

# Reset if needed
pnpm tsx scripts/adaptive-learning/reset-learning.ts tenant-123 "tech:large:proposal" risk
```

---

## Next Steps

1. **Read Full Documentation:**
   - `CAIS_DEVELOPER_QUICK_REFERENCE.md` - Daily development
   - `CAIS_INTEGRATION_EXAMPLES.md` - Complete examples
   - `CAIS_DEPLOYMENT_GUIDE.md` - Production deployment

2. **Integrate More Services:**
   - Follow `CAIS_MIGRATION_GUIDE.md`
   - Add to RecommendationsService
   - Add to ForecastService

3. **Set Up Monitoring:**
   - Follow `CAIS_MONITORING_GUIDE.md`
   - Configure dashboards
   - Set up alerts

---

## Resources

- **Documentation Index:** `CAIS_DOCUMENTATION_INDEX.md`
- **Complete Summary:** `CAIS_COMPLETE_SUMMARY.md`
- **Implementation Details:** `CAIS_IMPLEMENTATION_COMPLETE.md`
- **Utility Scripts:** `scripts/adaptive-learning/README.md`

---

## Conclusion

You're now ready to use CAIS adaptive learning! The system will:
1. Collect outcomes automatically
2. Learn optimal parameters
3. Validate improvements
4. Gradually roll out learned parameters
5. Monitor and rollback if needed

**Status:** ✅ **QUICK START GUIDE COMPLETE**
