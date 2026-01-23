# CAIS Services Test Suite

## Overview

Comprehensive test suite for all 22 new Compound AI System (CAIS) services, organized by implementation phase.

## Test Files

### Phase 1: Core Learning Services (3 services) ✅

1. **`conflict-resolution-learning.service.test.ts`** - Conflict resolution strategy learning
   - `resolveConflict` - Resolves conflicts using learned strategies
   - `recordOutcome` - Records outcomes for learning
   - `getLearnedStrategy` - Retrieves learned strategies from cache/Cosmos

2. **`hierarchical-memory.service.test.ts`** - Multi-tiered memory system
   - `storeMemory` - Stores memory in different tiers
   - `retrieveMemory` - Retrieves memories with caching
   - `updateAccess` - Updates access tracking
   - `archiveMemory` - Archives old memories

3. **`adversarial-testing.service.test.ts`** - Adversarial testing and vulnerability detection
   - `runTest` - Runs various adversarial tests
   - `getVulnerabilities` - Retrieves detected vulnerabilities
   - `markResolved` - Marks vulnerabilities as resolved

### Phase 2: Signal Intelligence Services (4 services) ✅

4. **`communication-analysis.service.test.ts`** - Email and meeting analysis
   - `analyzeEmail` - Analyzes email content
   - `analyzeMeetingTranscript` - Analyzes meeting transcripts
   - `analyzeResponseTimePattern` - Analyzes response time patterns

5. **`calendar-intelligence.service.test.ts`** - Calendar pattern analysis
   - `analyzeOpportunityCalendar` - Analyzes opportunity calendar
   - Calendar pattern detection
   - Cancellation pattern identification

6. **`social-signal.service.test.ts`** - Social media monitoring
   - `recordSignal` - Records social signals
   - `getOpportunitySignals` - Gets opportunity signals
   - `generateSummary` - Generates signal summary

7. **`product-usage.service.test.ts`** - Product usage integration
   - `recordEvent` - Records usage events
   - `analyzeUsage` - Analyzes usage patterns
   - `detectChurnRisk` - Detects churn risk
   - `detectExpansionOpportunities` - Detects expansion opportunities

### Phase 3: Quality & Monitoring Services (3 services) ✅

8. **`anomaly-detection.service.test.ts`** - Comprehensive anomaly detection
   - `detectOpportunityAnomalies` - Detects anomalies
   - `detectForecastMiss` - Detects forecast misses
   - Anomaly summary generation

9. **`explanation-quality.service.test.ts`** - Explanation quality assessment
   - `assessQuality` - Assesses explanation quality
   - `recordFeedback` - Records quality feedback
   - `getQualityMetrics` - Gets quality metrics

10. **`explanation-monitoring.service.test.ts`** - Explanation usage monitoring
    - `trackView` - Tracks explanation views
    - `recordInteraction` - Records interactions
    - `getUsageMetrics` - Gets usage metrics
    - `identifyGap` - Identifies quality gaps

### Phase 4: Collaboration & Forecasting Services (4 services) ✅

11. **`collaborative-intelligence.service.test.ts`** - Team learning
    - `learnTeamPattern` - Learns team patterns
    - `generateCollectiveInsight` - Generates collective insights
    - `identifyExpert` - Identifies expert users

12. **`forecast-decomposition.service.test.ts`** - Forecast breakdown
    - `decomposeForecast` - Decomposes forecasts
    - Time, source, confidence, driver decomposition

13. **`consensus-forecasting.service.test.ts`** - Multi-source consensus
    - `generateConsensus` - Generates consensus forecasts
    - Source reliability calculation
    - Disagreement analysis

14. **`forecast-commitment.service.test.ts`** - Commitment intelligence
    - `analyzeCommitment` - Analyzes commitment levels
    - Sandbagging detection
    - Happy ears detection
    - `recordOutcome` - Records forecast outcomes

### Phase 5: Pipeline Services (1 service) ✅

15. **`pipeline-health.service.test.ts`** - Pipeline health scoring
    - `calculateHealth` - Calculates pipeline health
    - Stage health breakdown
    - Coverage health assessment

### Phase 6: Execution & Intelligence Services (5 services) ✅

16. **`playbook-execution.service.test.ts`** - Automated playbook execution
    - `executePlaybook` - Executes playbooks
    - `createPlaybook` - Creates playbooks
    - Step execution handling

17. **`negotiation-intelligence.service.test.ts`** - Negotiation support
    - `analyzeNegotiation` - Analyzes negotiations
    - Strategy recommendation
    - `recordOutcome` - Records negotiation outcomes

18. **`relationship-evolution.service.test.ts`** - Relationship tracking
    - `trackEvolution` - Tracks relationship evolution
    - Stage transitions
    - Health scoring

19. **`competitive-intelligence.service.test.ts`** - Competitive intelligence
    - `analyzeCompetition` - Analyzes competition
    - Threat detection
    - Win/loss pattern analysis

20. **`customer-success-integration.service.test.ts`** - CS integration
    - `integrateCSData` - Integrates CS data
    - Expansion opportunity detection
    - Renewal risk assessment

### Phase 7: Advanced Services (2 services) ✅

21. **`self-healing.service.test.ts`** - Automatic remediation
    - `detectAndRemediate` - Detects and remediates issues
    - `createPolicy` - Creates remediation policies

22. **`federated-learning.service.test.ts`** - Privacy-preserving learning
    - `startRound` - Starts learning rounds
    - `submitContribution` - Submits contributions
    - `aggregateContributions` - Aggregates contributions
    - `getGlobalModel` - Gets global models

## Test Patterns

All tests follow consistent patterns established in the adaptive learning test suite:

### Mocking Strategy
```typescript
- CosmosClient: Fully mocked with query/create/upsert
- Redis: Fully mocked with get/setex/del
- Monitoring: Fully mocked with trackEvent/trackException
- Optional services: Mocked when needed
```

### Test Structure
```typescript
describe('ServiceName', () => {
  beforeEach(() => { /* Setup mocks */ });
  
  describe('methodName', () => {
    it('should handle happy path', async () => { /* ... */ });
    it('should handle error case', async () => { /* ... */ });
    it('should handle edge case', async () => { /* ... */ });
  });
});
```

### Coverage Areas
- ✅ Happy paths
- ✅ Error handling
- ✅ Edge cases
- ✅ Cache behavior (Redis optional)
- ✅ Fallback mechanisms
- ✅ Learning algorithms
- ✅ Integration scenarios

## Running Tests

```bash
# All CAIS services tests
pnpm --filter @castiel/api test cais-services

# Phase 1 only
pnpm --filter @castiel/api test cais-services/conflict-resolution-learning

# Phase 2 only
pnpm --filter @castiel/api test cais-services/communication-analysis

# With coverage
pnpm --filter @castiel/api test:coverage cais-services
```

## Test Status

**Unit Tests:**
- **Phase 1:** ✅ Complete (3/3 test files)
- **Phase 2:** ✅ Complete (4/4 test files)
- **Phase 3:** ✅ Complete (3/3 test files)
- **Phase 4:** ✅ Complete (4/4 test files)
- **Phase 5:** ✅ Complete (1/1 test files)
- **Phase 6:** ✅ Complete (5/5 test files)
- **Phase 7:** ✅ Complete (2/2 test files)

**Integration Tests:**
- ✅ Forecast Services Integration
- ✅ Explanation Services Integration
- ✅ Playbook & Recommendations Integration
- ✅ Self-Healing & Anomaly Detection Integration
- ✅ Pipeline Health Integration

**Total:** 22 unit test files + 5 integration test files (27 total)

## Notes

- All tests use Vitest testing framework
- Tests follow existing patterns from adaptive learning suite
- Mock all external dependencies (Cosmos DB, Redis, Monitoring)
- Test both with and without Redis (optional dependency)
- Include comprehensive error handling tests
