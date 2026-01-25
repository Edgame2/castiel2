# Risk Analytics Module - Architecture

## Overview

The Risk Analytics module provides comprehensive risk evaluation and revenue analytics for the Castiel system. It combines rule-based, AI-powered, and historical pattern matching to evaluate risks for opportunities, calculate revenue at risk, manage quotas, detect early warnings, and provide benchmarking and simulation capabilities.

## Database Architecture

### Cosmos DB NoSQL Structure

The Risk Analytics module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description | TTL |
|----------------|---------------|-------------|-----|
| `risk_evaluations` | `/tenantId` | Risk evaluation results | - |
| `risk_revenue_at_risk` | `/tenantId` | Revenue at risk calculations | - |
| `risk_quotas` | `/tenantId` | Quota definitions and performance | - |
| `risk_warnings` | `/tenantId` | Early warning signals | - |
| `risk_simulations` | `/tenantId` | Risk simulation results | - |

### Partition Key Strategy

All containers use `/tenantId` as the partition key to ensure:
- **Tenant Isolation**: Complete data isolation between tenants
- **Efficient Queries**: All queries include tenantId for optimal performance
- **Scalability**: Even distribution across partitions

## Service Architecture

### Core Services

1. **RiskEvaluationService** - Risk evaluation engine
   - Combines rule-based, AI-powered, and historical pattern matching
   - CAIS integration for adaptive learning weights
   - ML-based risk scoring
   - Asynchronous evaluation via events

2. **RiskCatalogService** - Risk catalog management
   - Global, industry, and tenant-specific risk catalogs
   - Risk definition and configuration
   - Risk weights (ponderation) management

3. **RevenueAtRiskService** - Revenue calculations
   - Calculate revenue at risk for opportunities
   - Portfolio-level revenue at risk
   - Team and tenant-level aggregations

4. **QuotaService** - Quota management
   - Quota definitions (individual, team, tenant)
   - Performance tracking and calculation
   - Risk-adjusted attainment

5. **EarlyWarningService** - Early warning detection
   - Stage stagnation detection
   - Activity drop detection
   - Stakeholder churn detection
   - Risk acceleration detection

6. **BenchmarkingService** - Benchmark calculations
   - Win rate benchmarks
   - Closing time benchmarks
   - Deal size benchmarks

7. **SimulationService** - Risk simulations
   - Run simulations with modified scenarios
   - Compare simulation results
   - What-if analysis

8. **DataQualityService** - Data quality validation
   - Completeness scoring
   - Accuracy assessment
   - Timeliness evaluation
   - Consistency checks

9. **TrustLevelService** - Trust level calculation
   - Calculate trust levels for evaluations
   - Factor in data quality, model confidence, historical accuracy

10. **RiskAIValidationService** - AI validation
    - Validate AI-generated evaluations
    - Detect hallucinations and contradictions
    - Bias detection

11. **RiskExplainabilityService** - Explainability generation
    - Generate summaries and detailed explanations
    - Risk breakdown by category
    - Evidence-based reasoning

## Data Flow

### Risk Evaluation Flow

```
Opportunity Update Event
    ↓
Event Consumer (RiskAnalyticsEventConsumer)
    ↓
RiskEvaluationService.evaluateRisk()
    ↓
├─→ Rule-based detection (RiskCatalogService)
├─→ AI-powered detection (ai-service)
├─→ Historical pattern matching (ml-service)
├─→ Semantic discovery (embeddings)
    ↓
Combine with CAIS weights (adaptive-learning)
    ↓
Calculate risk score and revenue at risk
    ↓
Store in risk_evaluations container
    ↓
Publish risk.evaluation.completed event
```

### Revenue at Risk Calculation Flow

```
RevenueAtRiskService.calculateForOpportunity()
    ↓
Get opportunity from shard-manager
    ↓
Get or trigger risk evaluation
    ↓
Calculate revenue at risk = dealValue × riskScore
    ↓
Store in risk_revenue_at_risk container
    ↓
Publish revenue-at-risk.calculated event
```

## Integration Points

### External Services

- **ai-service**: AI-powered risk detection
- **ai-insights**: AI insight generation
- **ml-service**: ML-based risk scoring
- **analytics-service**: Analytics integration
- **shard-manager**: Opportunity and shard access
- **adaptive-learning**: CAIS integration for learned weights
- **embeddings**: Semantic search and discovery

### Event-Driven Communication

**Consumed Events**:
- `integration.opportunity.updated` - Trigger risk evaluation
- `shard.updated` - Trigger risk evaluation for opportunity shards
- `integration.sync.completed` - Trigger evaluations after sync
- `workflow.risk.analysis.requested` - Process workflow-triggered analysis
- `workflow.risk.scoring.requested` - Process workflow-triggered scoring

**Published Events**:
- `risk.evaluation.completed` - Risk evaluation completed
- `revenue-at-risk.calculated` - Revenue at risk calculated
- `quota.created` - Quota created
- `quota.deleted` - Quota deleted
- `early-warning.signals-detected` - Early warning signals detected
- `risk.simulation.completed` - Risk simulation completed

## CAIS Integration

The Risk Analytics module integrates with the adaptive-learning (CAIS) system using a hybrid approach:

1. **REST API**: Fetch learned weights for risk evaluation
2. **Events**: Publish evaluation outcomes for learning

This allows the system to continuously improve risk detection accuracy based on historical outcomes.

## Security & Compliance

- **Tenant Isolation**: All queries include tenantId in partition key
- **Service-to-Service Auth**: JWT tokens for inter-service communication
- **Audit Logging**: All risk evaluations are logged for compliance
- **Data Privacy**: PII detection and redaction support

## Performance Considerations

- **Caching**: Evaluation results cached for 15 minutes
- **Async Processing**: Risk evaluations processed asynchronously via events
- **Batch Operations**: Bulk quota performance calculations
- **Connection Pooling**: Service client connection pooling
- **Circuit Breakers**: Circuit breakers for external service calls

## Scalability

- **Horizontal Scaling**: Stateless services can scale horizontally
- **Partition Strategy**: Tenant-based partitioning for even distribution
- **Event-Driven**: Async processing reduces request latency
- **Caching**: Reduces database load for frequently accessed data
