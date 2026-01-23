# Risk-Aware Revenue Intelligence System

**Status:** ✅ **FULLY IMPLEMENTED**  
**Date:** 2025-01-28

## Overview

The Risk-Aware Revenue Intelligence System provides comprehensive risk analysis, quota management, simulation capabilities, early warning detection, and benchmarking for sales opportunities. The system leverages AI-powered risk detection, historical pattern matching, and real-time revenue at risk calculations.

## Quick Start

### Accessing Risk Analysis

1. **For Opportunities:**
   - Navigate to any opportunity shard (`/shards/[id]` where shard type is `c_opportunity`)
   - Click on the **Risk Analysis** tab (first tab for opportunities)
   - View risk overview, details, timeline, mitigation actions, and early warnings

2. **For Quotas:**
   - Sidebar → Revenue Intelligence → Quotas
   - Or Command Palette (Cmd+K) → "Quotas"
   - Or navigate to `/quotas`

3. **For Benchmarks:**
   - Sidebar → Revenue Intelligence → Benchmarks
   - Or Command Palette (Cmd+K) → "Benchmarks"
   - Or navigate to `/benchmarks`

4. **For Portfolio/Team Analysis:**
   - Navigate to `/risk-analysis/portfolio/[userId]` for user portfolio
   - Navigate to `/risk-analysis/teams/[teamId]` for team analysis

### Running a Risk Simulation

1. Navigate to an opportunity's Risk Analysis tab
2. Scroll to the **Simulation** section at the bottom
3. Click **Run Simulation** tab
4. Configure scenario modifications:
   - Adjust deal parameters (value, probability, close date)
   - Modify risk weights
   - Add/remove risks
5. Click **Run Simulation** to see results
6. Use **Compare Scenarios** tab to compare multiple scenarios side-by-side

## Features

### Risk Analysis
- **Real-time Risk Evaluation**: Automatic risk detection using rule-based, AI-powered, and historical pattern matching
- **Risk Scoring**: Weighted risk scores with explainability
- **Revenue at Risk**: Calculates potential revenue loss based on risk factors
- **Historical Patterns**: Learn from similar past opportunities
- **Risk Categories**: Commercial, Technical, Legal, Financial, Competitive, Operational

### Quota Management
- **Quota Creation**: Individual, team, or tenant-level quotas
- **Performance Tracking**: Real-time performance calculations
- **Forecasting**: Best case, base case, and worst case scenarios
- **Risk-Adjusted Attainment**: Accounts for revenue at risk
- **Hierarchical Rollups**: Automatic rollup from individual to team to tenant

### Risk Simulation
- **Scenario Building**: Create "what-if" scenarios
- **Deal Parameter Modification**: Adjust value, probability, close date
- **Risk Weight Adjustment**: Modify risk weights to see impact
- **Multi-Scenario Comparison**: Compare multiple scenarios side-by-side
- **AI Recommendations**: Get actionable recommendations based on scenarios

### Early Warning Signals
- **Stage Stagnation**: Detect when opportunities stall in a stage
- **Activity Drop**: Identify declining engagement
- **Stakeholder Churn**: Track stakeholder changes
- **Risk Acceleration**: Monitor increasing risk scores
- **Evidence-Based**: Each signal includes supporting evidence

### Benchmarking
- **Win Rates**: Compare against tenant, industry, or peer benchmarks
- **Closing Times**: Average, median, and percentile distributions
- **Deal Sizes**: Distribution analysis (min, p25, median, p75, max)
- **Renewal Estimates**: Probability-based renewal forecasting

## API Endpoints

### Risk Analysis
```
GET    /api/v1/risk-analysis/catalog
POST   /api/v1/risk-analysis/catalog
PUT    /api/v1/risk-analysis/catalog/risks/:riskId
POST   /api/v1/risk-analysis/opportunities/:opportunityId/evaluate
GET    /api/v1/risk-analysis/opportunities/:opportunityId/revenue-at-risk
POST   /api/v1/risk-analysis/opportunities/:opportunityId/early-warnings
GET    /api/v1/risk-analysis/opportunities/:opportunityId/historical-patterns
GET    /api/v1/risk-analysis/portfolio/:userId/revenue-at-risk
GET    /api/v1/risk-analysis/teams/:teamId/revenue-at-risk
GET    /api/v1/risk-analysis/tenant/revenue-at-risk
```

### Quotas
```
GET    /api/v1/quotas
POST   /api/v1/quotas
GET    /api/v1/quotas/:quotaId
PUT    /api/v1/quotas/:quotaId
POST   /api/v1/quotas/:quotaId/performance
GET    /api/v1/quotas/:quotaId/forecast
POST   /api/v1/quotas/:quotaId/rollup
```

### Simulation
```
POST   /api/v1/simulations/opportunities/:opportunityId/run
POST   /api/v1/simulations/opportunities/:opportunityId/compare
GET    /api/v1/simulations/:simulationId
GET    /api/v1/simulations/opportunities/:opportunityId
```

### Benchmarks
```
GET    /api/v1/benchmarks/win-rates
GET    /api/v1/benchmarks/closing-times
GET    /api/v1/benchmarks/deal-sizes
GET    /api/v1/benchmarks/renewals/:contractId
```

## Architecture

### Data Storage
All risk-related data is stored as shards in Cosmos DB:
- `c_risk_catalog` - Risk definitions and catalogs
- `c_risk_snapshot` - Historical risk snapshots
- `c_quota` - Quota definitions
- `c_risk_simulation` - Simulation scenarios and results
- `c_benchmark` - Benchmark data

Risk evaluation results are embedded in `c_opportunity` shards:
- `riskEvaluation` - Current risk evaluation
- `earlyWarnings` - Early warning signals
- `mitigationActions` - Mitigation actions

### Services
- **RiskCatalogService**: Manages risk definitions
- **RiskEvaluationService**: Core risk evaluation engine
- **RevenueAtRiskService**: Revenue at risk calculations
- **QuotaService**: Quota management and performance
- **SimulationService**: Risk simulation and scenario analysis
- **EarlyWarningService**: Early warning signal detection
- **BenchmarkingService**: Benchmark calculations

### AI Integration
- **InsightService**: AI-powered risk detection
- **VectorSearchService**: Historical pattern matching
- **ExplainableAIService**: Risk score explanations
- **RecommendationService**: Mitigation action recommendations

## Performance

The system is designed to meet the following performance targets:
- Risk evaluation: <5 seconds per opportunity
- Revenue at Risk calculation: <2 seconds
- Simulation results: <1 second
- Portfolio rollups: <10 seconds for 1,000 opportunities
- Early warning detection: Within 1 hour of trigger

## Dependencies

### Required Services
- ShardRepository (existing)
- ShardTypeRepository (existing)
- ShardRelationshipService (existing)
- VectorSearchService (existing)
- InsightService (existing)
- RevisionRepository (existing)

### Optional Services
- Redis (for caching - improves performance)
- Azure Service Bus (for batch processing - improves scalability)

## Configuration

No additional configuration required. The system automatically:
- Detects opportunity shards
- Evaluates risks on demand
- Caches results for performance
- Integrates with existing AI services

## Troubleshooting

### Risk Analysis Not Appearing
- Verify the shard type is `c_opportunity`
- Check that the opportunity shard exists
- Ensure user has proper permissions

### Performance Issues
- Enable Redis caching for better performance
- Use batch processing for large portfolios
- Consider pagination for large datasets

### Missing AI Features
- Ensure InsightService is properly configured
- Verify VectorSearchService is available
- Check AI service credentials

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Mostly Complete** - Core features implemented, some gaps identified

#### Implemented Features (✅)

- ✅ Risk evaluation service (2,508 lines)
- ✅ Risk catalog management
- ✅ Revenue at risk calculations
- ✅ Quota management
- ✅ Risk simulation
- ✅ Early warning detection
- ✅ Benchmarking
- ✅ Data quality validation
- ✅ Trust level calculation
- ✅ AI validation
- ✅ Explainability
- ✅ Comprehensive audit trail

#### Critical Gaps (❌)

#### CRITICAL-1: Incomplete Assumption Tracking
- **Severity:** Critical
- **Impact:** User Trust, Data Quality
- **Description:** Risk evaluations include `assumptions` object but:
  - Not consistently populated across all evaluation paths
  - Not surfaced to users in UI
  - Missing data quality warnings not displayed
  - Staleness indicators not shown
- **Affected Components:**
  - `apps/api/src/services/risk-evaluation.service.ts` (2,508 lines)
  - `apps/web/src/components/risk-analysis/assumption-display.tsx` - Component exists but may not be fully integrated
  - `apps/web/src/components/risk-analysis/data-quality-warnings.tsx` - Component exists but may not be displayed
  - `apps/web/src/components/risk-analysis/risk-overview.tsx` - May not show assumptions
  - `apps/web/src/components/risk-analysis/risk-details-panel.tsx` - May not show assumptions
- **Code References:**
  - `risk-evaluation.service.ts` - Assumptions object exists but may not be consistently populated
  - Frontend components need to display assumption data
- **Recommendation:**
  1. Ensure all evaluation paths populate assumptions object
  2. Integrate assumption display components in all risk views
  3. Display data quality warnings prominently
  4. Show staleness indicators

#### CRITICAL-2: Missing Automatic Risk Evaluation Triggers
- **Severity:** Critical
- **Impact:** User Experience, Data Freshness
- **Description:** Risk evaluations must be manually triggered via API. No automatic triggers when:
  - Opportunities are created/updated
  - Related shards change
  - Risk catalog is updated
- **Affected Components:**
  - Event handlers for shard updates
  - Queue service integration
  - `apps/api/src/services/shard-event.service.ts` - May need integration
- **Recommendation:**
  1. Implement automatic triggers for risk evaluation
  2. Integrate with shard event system
  3. Add queue-based async evaluation
  4. Document trigger conditions

### High Priority Gaps

#### HIGH-1: AI Response Parsing Fragility
- **Severity:** High
- **Impact:** Stability, Data Quality
- **Description:** Risk Analysis AI detection relies on JSON parsing with fallback to regex:
  - No validation that parsed risks match catalog definitions
  - Silent failures when AI returns unexpected formats
  - No confidence calibration based on parsing success
- **Affected Components:**
  - `apps/api/src/services/risk-evaluation.service.ts` (AI detection logic)
  - `apps/api/src/services/risk-ai-validation.service.ts` (validation exists but may not catch all cases)
- **Recommendation:**
  1. Add validation for parsed risks against catalog
  2. Improve error handling and logging
  3. Add confidence scoring based on parsing success

### Medium Priority Gaps

#### MEDIUM-1: Missing ML-Based Risk Scoring
- **Severity:** Medium
- **Impact:** Accuracy, Feature Completeness
- **Description:** ML-based risk scoring not implemented (ML system not implemented)
- **Code References:**
  - Missing: `apps/api/src/services/risk-ml.service.ts`
  - Missing: ML model management endpoints
- **Recommendation:**
  1. Implement ML system (see [Gap Analysis](../GAP_ANALYSIS.md))
  2. Add ML-based risk scoring
  3. Integrate with existing risk evaluation

---

## Support

For issues or questions:
1. Check the implementation documentation: `docs/features/risk-analysis/IMPLEMENTATION_COMPLETE.md`
2. Review API documentation in the codebase
3. Check error logs for detailed error messages

## Next Steps

1. **Testing**: Run integration tests
2. **Performance Tuning**: Optimize for large datasets
3. **User Training**: Train users on new features
4. **Monitoring**: Set up alerts for critical metrics


