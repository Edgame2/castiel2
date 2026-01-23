# Risk analysis features integration plan
_Exported on 12/30/2025 at 11:19:01 GMT from Cursor (2.2.43)_

---

**User**

@docs/features/risk-analysis/brief.md 
I want to work on the plan to integrate those additional features. 
Those additional features must fully leverage the current implementation. 
The plan must cover all the requirements: UI, API and Database.
Ask all the necessary questions.

---

**Cursor**


Reviewing the current implementation to understand what's already built, then clarifying which additional features to integrate.



Reviewing the database schema and existing risk-related implementations:



Checking for existing risk analysis implementation:



Clarifying which additional features to integrate. The brief lists:
- Section 16 (Out of Scope): Automated deal execution, Pricing approvals, Contract generation
- Section 17 (Advanced Features): Cross-opportunity dependency modeling, Advanced causal AI, Prescriptive quota optimization

Which set should we prioritize?



Clarifying a few implementation details:



Reviewing the database structure to understand how to integrate risk data:



Creating the implementation plan:


---

**User**

 risk-catalogs Container
risk-evaluations Container
risk-snapshots Container
risk-ponderations Container
quotas Container
risk-simulations Container
early-warning-signals Container
 benchmarks Container
risk-mitigation-actions Container

I think that those should not be individual containers but store as shards.
Each one should be a new shard type. Each Shard should respect the shard base schema.
Let me know what you think. And ask questions you may have. 

---

**Cursor**


Using shards aligns with the existing architecture. Asking a few clarifying questions:



A few more clarifications:



Updating the plan to use a shard-based architecture aligned with your answers.



Updating the plan to use a shard-based architecture:



Updating the plan to use a shard-based architecture:


```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```



## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

```typescript
{
  id: string;                    // UUID
  tenantId: string;               // "global" | "industry:{id}" | "{tenantId}"
  catalogType: 'global' | 'industry' | 'tenant';
  industryId?: string;            // For industry-specific catalogs
  riskId: string;                 // Unique risk identifier
  name: string;
  description: string;
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';
  defaultPonderation: number;     // 0-1 weight
  sourceShardTypes: string[];     // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;  // Template for explainability summary
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```



### 2. risk-evaluations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk evaluations for opportunities**Document Structure**:

```typescript
{
  id: string;                     // UUID
  tenantId: string;
  opportunityId: string;          // Reference to c_opportunity shard
  evaluationDate: Date;
  riskScore: number;              // 0-1 aggregated score
  revenueAtRisk: number;          // Calculated revenue at risk
  risks: Array<{
    riskId: string;               // Reference to risk catalog
    riskName: string;
    category: string;
    ponderation: number;          // Applied weight (may be overridden)
    confidence: number;            // 0-1 confidence score
    contribution: number;         // Contribution to overall risk score
    explainability: string;       // Explainability summary
    sourceShards: string[];        // Shard IDs that triggered this risk
    lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
    ownerId?: string;             // User ID of risk owner
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    dismissedAt?: Date;
    dismissedBy?: string;
    dismissedReason?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
  calculatedAt: Date;
  calculatedBy: string;           // System or user ID
}
```



### 3. risk-snapshots Container

**Partition Key**: `/tenantId`

**Purpose**: Immutable historical snapshots of risk evaluations

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  evaluationId: string;           // Reference to risk-evaluations
  snapshotDate: Date;
  riskScore: number;
  revenueAtRisk: number;
  risks: Array<{...}>;            // Full risk details at snapshot time
  metadata: {...};
  _ttl?: number;                  // Optional TTL for old snapshots
}
```



### 4. risk-ponderations Container

**Partition Key**: `/tenantId`

**Purpose**: Tenant and industry-specific risk weight overrides

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  scope: 'tenant' | 'industry' | 'opportunity_type';
  scopeId?: string;               // Industry ID or opportunity type
  riskId: string;
  ponderation: number;            // Override weight
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  createdBy: string;
}
```



### 5. quotas Container

**Partition Key**: `/tenantId`

**Purpose**: Quota definitions and tracking

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  quotaType: 'individual' | 'team' | 'tenant';
  targetUserId?: string;          // For individual quotas
  teamId?: string;                // For team quotas
  period: {
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {
    amount: number;
    currency: string;
    opportunityCount?: number;    // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;          // Forecast minus revenue at risk
    attainment: number;           // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;         // For hierarchical rollup
  createdAt: Date;
  updatedAt: Date;
}
```



### 6. risk-simulations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk simulation scenarios**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```



### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```



### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```



### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```



## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:
- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:
```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:
- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. risk-evaluations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk evaluations for opportunities**Document Structure**:

```typescript
{
  id: string;                     // UUID
  tenantId: string;
  opportunityId: string;          // Reference to c_opportunity shard
  evaluationDate: Date;
  riskScore: number;              // 0-1 aggregated score
  revenueAtRisk: number;          // Calculated revenue at risk
  risks: Array<{
    riskId: string;               // Reference to risk catalog
    riskName: string;
    category: string;
    ponderation: number;          // Applied weight (may be overridden)
    confidence: number;            // 0-1 confidence score
    contribution: number;         // Contribution to overall risk score
    explainability: string;       // Explainability summary
    sourceShards: string[];        // Shard IDs that triggered this risk
    lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
    ownerId?: string;             // User ID of risk owner
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    dismissedAt?: Date;
    dismissedBy?: string;
    dismissedReason?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
  calculatedAt: Date;
  calculatedBy: string;           // System or user ID
}
```

### 3. risk-snapshots Container

**Partition Key**: `/tenantId`

**Purpose**: Immutable historical snapshots of risk evaluations

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  evaluationId: string;           // Reference to risk-evaluations
  snapshotDate: Date;
  riskScore: number;
  revenueAtRisk: number;
  risks: Array<{...}>;            // Full risk details at snapshot time
  metadata: {...};
  _ttl?: number;                  // Optional TTL for old snapshots
}
```

### 4. risk-ponderations Container

**Partition Key**: `/tenantId`

**Purpose**: Tenant and industry-specific risk weight overrides

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  scope: 'tenant' | 'industry' | 'opportunity_type';
  scopeId?: string;               // Industry ID or opportunity type
  riskId: string;
  ponderation: number;            // Override weight
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  createdBy: string;
}
```

### 5. quotas Container

**Partition Key**: `/tenantId`

**Purpose**: Quota definitions and tracking

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  quotaType: 'individual' | 'team' | 'tenant';
  targetUserId?: string;          // For individual quotas
  teamId?: string;                // For team quotas
  period: {
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {
    amount: number;
    currency: string;
    opportunityCount?: number;    // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;          // Forecast minus revenue at risk
    attainment: number;           // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;         // For hierarchical rollup
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. risk-simulations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk simulation scenarios**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
{
  id: string;                     // UUID
  tenantId: string;
  opportunityId: string;          // Reference to c_opportunity shard
  evaluationDate: Date;
  riskScore: number;              // 0-1 aggregated score
  revenueAtRisk: number;          // Calculated revenue at risk
  risks: Array<{
    riskId: string;               // Reference to risk catalog
    riskName: string;
    category: string;
    ponderation: number;          // Applied weight (may be overridden)
    confidence: number;            // 0-1 confidence score
    contribution: number;         // Contribution to overall risk score
    explainability: string;       // Explainability summary
    sourceShards: string[];        // Shard IDs that triggered this risk
    lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
    ownerId?: string;             // User ID of risk owner
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    dismissedAt?: Date;
    dismissedBy?: string;
    dismissedReason?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
  calculatedAt: Date;
  calculatedBy: string;           // System or user ID
}
```

### 3. risk-snapshots Container

**Partition Key**: `/tenantId`

**Purpose**: Immutable historical snapshots of risk evaluations

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  evaluationId: string;           // Reference to risk-evaluations
  snapshotDate: Date;
  riskScore: number;
  revenueAtRisk: number;
  risks: Array<{...}>;            // Full risk details at snapshot time
  metadata: {...};
  _ttl?: number;                  // Optional TTL for old snapshots
}
```

### 4. risk-ponderations Container

**Partition Key**: `/tenantId`

**Purpose**: Tenant and industry-specific risk weight overrides

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  scope: 'tenant' | 'industry' | 'opportunity_type';
  scopeId?: string;               // Industry ID or opportunity type
  riskId: string;
  ponderation: number;            // Override weight
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  createdBy: string;
}
```

### 5. quotas Container

**Partition Key**: `/tenantId`

**Purpose**: Quota definitions and tracking

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  quotaType: 'individual' | 'team' | 'tenant';
  targetUserId?: string;          // For individual quotas
  teamId?: string;                // For team quotas
  period: {
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {
    amount: number;
    currency: string;
    opportunityCount?: number;    // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;          // Forecast minus revenue at risk
    attainment: number;           // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;         // For hierarchical rollup
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. risk-simulations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk simulation scenarios**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. risk-snapshots Container

**Partition Key**: `/tenantId`

**Purpose**: Immutable historical snapshots of risk evaluations

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  evaluationId: string;           // Reference to risk-evaluations
  snapshotDate: Date;
  riskScore: number;
  revenueAtRisk: number;
  risks: Array<{...}>;            // Full risk details at snapshot time
  metadata: {...};
  _ttl?: number;                  // Optional TTL for old snapshots
}
```

### 4. risk-ponderations Container

**Partition Key**: `/tenantId`

**Purpose**: Tenant and industry-specific risk weight overrides

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  scope: 'tenant' | 'industry' | 'opportunity_type';
  scopeId?: string;               // Industry ID or opportunity type
  riskId: string;
  ponderation: number;            // Override weight
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  createdBy: string;
}
```

### 5. quotas Container

**Partition Key**: `/tenantId`

**Purpose**: Quota definitions and tracking

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  quotaType: 'individual' | 'team' | 'tenant';
  targetUserId?: string;          // For individual quotas
  teamId?: string;                // For team quotas
  period: {
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {
    amount: number;
    currency: string;
    opportunityCount?: number;    // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;          // Forecast minus revenue at risk
    attainment: number;           // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;         // For hierarchical rollup
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. risk-simulations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk simulation scenarios**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:
- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  id: string;
  tenantId: string;
  evaluationId: string;           // Reference to risk-evaluations
  snapshotDate: Date;
  riskScore: number;
  revenueAtRisk: number;
  risks: Array<{...}>;            // Full risk details at snapshot time
  metadata: {...};
  _ttl?: number;                  // Optional TTL for old snapshots
}
```

### 4. risk-ponderations Container

**Partition Key**: `/tenantId`

**Purpose**: Tenant and industry-specific risk weight overrides

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  scope: 'tenant' | 'industry' | 'opportunity_type';
  scopeId?: string;               // Industry ID or opportunity type
  riskId: string;
  ponderation: number;            // Override weight
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  createdBy: string;
}
```

### 5. quotas Container

**Partition Key**: `/tenantId`

**Purpose**: Quota definitions and tracking

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  quotaType: 'individual' | 'team' | 'tenant';
  targetUserId?: string;          // For individual quotas
  teamId?: string;                // For team quotas
  period: {
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {
    amount: number;
    currency: string;
    opportunityCount?: number;    // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;          // Forecast minus revenue at risk
    attainment: number;           // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;         // For hierarchical rollup
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. risk-simulations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk simulation scenarios**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:
- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:
- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. risk-ponderations Container

**Partition Key**: `/tenantId`

**Purpose**: Tenant and industry-specific risk weight overrides

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  scope: 'tenant' | 'industry' | 'opportunity_type';
  scopeId?: string;               // Industry ID or opportunity type
  riskId: string;
  ponderation: number;            // Override weight
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  createdBy: string;
}
```

### 5. quotas Container

**Partition Key**: `/tenantId`

**Purpose**: Quota definitions and tracking

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  quotaType: 'individual' | 'team' | 'tenant';
  targetUserId?: string;          // For individual quotas
  teamId?: string;                // For team quotas
  period: {
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {
    amount: number;
    currency: string;
    opportunityCount?: number;    // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;          // Forecast minus revenue at risk
    attainment: number;           // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;         // For hierarchical rollup
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. risk-simulations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk simulation scenarios**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:
- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. quotas Container

**Partition Key**: `/tenantId`

**Purpose**: Quota definitions and tracking

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  quotaType: 'individual' | 'team' | 'tenant';
  targetUserId?: string;          // For individual quotas
  teamId?: string;                // For team quotas
  period: {
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {
    amount: number;
    currency: string;
    opportunityCount?: number;    // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;          // Forecast minus revenue at risk
    attainment: number;           // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;         // For hierarchical rollup
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. risk-simulations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk simulation scenarios**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:
- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  id: string;
  tenantId: string;
  quotaType: 'individual' | 'team' | 'tenant';
  targetUserId?: string;          // For individual quotas
  teamId?: string;                // For team quotas
  period: {
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {
    amount: number;
    currency: string;
    opportunityCount?: number;    // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;          // Forecast minus revenue at risk
    attainment: number;           // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;         // For hierarchical rollup
  createdAt: Date;
  updatedAt: Date;
}
```

### 6. risk-simulations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk simulation scenarios**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:
- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:
- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. risk-simulations Container

**Partition Key**: `/tenantId`

**Purpose**: Store risk simulation scenarios**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:
- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: {
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>; // Risk weight overrides
  };
  results: {
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
  createdAt: Date;
  createdBy: string;
}
```

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:
- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:
- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. early-warning-signals Container

**Partition Key**: `/tenantId`

**Purpose**: Early-warning signals for opportunities

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Array<{
    type: string;
    label: string;
    value: any;
  }>;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}
```

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:
- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. benchmarks Container

**Partition Key**: `/tenantId`

**Purpose**: Historical analytics and benchmarks

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:
- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  id: string;
  tenantId: string;
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';
  scope: 'tenant' | 'industry' | 'peer';
  industryId?: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    winRate?: number;
    avgClosingTime?: number;       // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;
}
```

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:
- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. risk-mitigation-actions Container

**Partition Key**: `/tenantId`

**Purpose**: Recommended mitigation actions

**Document Structure**:

```typescript
{
  id: string;
  tenantId: string;
  opportunityId: string;
  riskId: string;
  actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;         // 0-1 impact on risk reduction
  explainability: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create Cosmos DB containers: risk-catalogs, risk-evaluations, risk-snapshots, risk-ponderations, quotas, risk-simulations, early-warning-signals, benchmarks, risk-mitigation-actions"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:

- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. Risk Mitigation Actions (Embedded in c_opportunity)

**Purpose**: Recommended mitigation actions are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.mitigationActions[]` (see section 2 above)

**Notes**:
- Mitigation actions are embedded in the opportunity shard
- No separate shard type needed

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create shard type definitions: c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark. Update c_opportunity schema to include embedded riskEvaluation, earlyWarnings, and mitigationActions fields"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: risk-repositories
    content: "Implement repositories: risk.repository.ts, quota.repository.ts for Cosmos DB operations"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:

- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. Risk Mitigation Actions (Embedded in c_opportunity)

**Purpose**: Recommended mitigation actions are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.mitigationActions[]` (see section 2 above)

**Notes**:

- Mitigation actions are embedded in the opportunity shard
- No separate shard type needed

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create shard type definitions: c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark. Update c_opportunity schema to include embedded riskEvaluation, earlyWarnings, and mitigationActions fields"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: shard-repository-integration
    content: "Leverage existing ShardRepository for all risk-related shard operations. No custom repositories needed - use shard repository with shard type filtering"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - risk-repositories
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:

- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. Risk Mitigation Actions (Embedded in c_opportunity)

**Purpose**: Recommended mitigation actions are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.mitigationActions[]` (see section 2 above)

**Notes**:

- Mitigation actions are embedded in the opportunity shard
- No separate shard type needed

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
    dependencies:
      - shard-repository-integration
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create shard type definitions: c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark. Update c_opportunity schema to include embedded riskEvaluation, earlyWarnings, and mitigationActions fields"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: shard-repository-integration
    content: "Leverage existing ShardRepository for all risk-related shard operations. No custom repositories needed - use shard repository with shard type filtering"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - shard-repository-integration
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:

- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. Risk Mitigation Actions (Embedded in c_opportunity)

**Purpose**: Recommended mitigation actions are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.mitigationActions[]` (see section 2 above)

**Notes**:

- Mitigation actions are embedded in the opportunity shard
- No separate shard type needed

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/repositories/risk.repository.ts` (NEW)

- `apps/api/src/repositories/quota.repository.ts` (NEW)

- `apps/api/src/scripts/init-cosmos-db.ts` (MODIFY - add containers)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
    dependencies:
      - shard-repository-integration
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create shard type definitions: c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark. Update c_opportunity schema to include embedded riskEvaluation, earlyWarnings, and mitigationActions fields"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: shard-repository-integration
    content: "Leverage existing ShardRepository for all risk-related shard operations. No custom repositories needed - use shard repository with shard type filtering"
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - shard-repository-integration
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:

- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. Risk Mitigation Actions (Embedded in c_opportunity)

**Purpose**: Recommended mitigation actions are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.mitigationActions[]` (see section 2 above)

**Notes**:

- Mitigation actions are embedded in the opportunity shard
- No separate shard type needed

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Database Migration

**Migration File**: `apps/api/migrations/005_risk_analysis_containers.sql`

Add container definitions to `init-cosmos-db.ts`:

- risk-catalogs

- risk-evaluations
- risk-snapshots

- risk-ponderations
- quotas
- risk-simulations
- early-warning-signals
- benchmarks
- risk-mitigation-actions

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/types/core-shard-types.ts` (MODIFY - add new shard type definitions)
- `apps/api/src/seed/core-shard-types.seed.ts` (MODIFY - add seed data for new shard types)
- `docs/shards/core-types/c_risk_catalog.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_snapshot.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_quota.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_simulation.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_benchmark.md` (NEW - shard type documentation)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create shard type definitions: c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark. Update c_opportunity schema to include embedded riskEvaluation, earlyWarnings, and mitigationActions fields"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: shard-repository-integration
    content: Leverage existing ShardRepository for all risk-related shard operations. No custom repositories needed - use shard repository with shard type filtering
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - shard-repository-integration
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Data Layer"
        RC[risk-catalogs]
        RE[risk-evaluations]
        RS[risk-snapshots]
        QM[quotas]
        BM[benchmarks]
    end
    
    subgraph "Service Layer"
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR[simulation.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
    end
    
    RC --> RCS
    RE --> RES
    RS --> RES
    QM --> QS
    BM --> RAS
    
    RCS --> RR
    RES --> RR
    RAS --> RR
    QS --> QR
    SS --> SR
    EWS --> RR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR --> SV
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:

- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. Risk Mitigation Actions (Embedded in c_opportunity)

**Purpose**: Recommended mitigation actions are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.mitigationActions[]` (see section 2 above)

**Notes**:

- Mitigation actions are embedded in the opportunity shard
- No separate shard type needed

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Shard Type Registration

**No Database Migration Needed** - All entities stored in existing `shards` container

**Shard Type Registration**:
- Add shard type definitions to `apps/api/src/types/core-shard-types.ts`
- Add seed data to `apps/api/src/seed/core-shard-types.seed.ts`
- Update `c_opportunity` schema to include embedded risk fields
- Register shard types via existing ShardTypeRepository

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/types/core-shard-types.ts` (MODIFY - add new shard type definitions)
- `apps/api/src/seed/core-shard-types.seed.ts` (MODIFY - add seed data for new shard types)
- `docs/shards/core-types/c_risk_catalog.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_snapshot.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_quota.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_simulation.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_benchmark.md` (NEW - shard type documentation)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```

```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create shard type definitions: c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark. Update c_opportunity schema to include embedded riskEvaluation, earlyWarnings, and mitigationActions fields"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: shard-repository-integration
    content: Leverage existing ShardRepository for all risk-related shard operations. No custom repositories needed - use shard repository with shard type filtering
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - shard-repository-integration
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Shard Data Layer - shards container"
        OPP[c_opportunity<br/>with embedded risk data]
        RC[c_risk_catalog<br/>with embedded ponderations]
        RS[c_risk_snapshot]
        QM[c_quota]
        SIM[c_risk_simulation]
        BM[c_benchmark]
    end
    
    subgraph "Service Layer"
        SR[ShardRepository]
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
        BS[BenchmarkingService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR2[simulation.routes.ts]
        BR[benchmarks.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
        BD[BenchmarkDashboard]
    end
    
    OPP --> SR
    RC --> SR
    RS --> SR
    QM --> SR
    SIM --> SR
    BM --> SR
    
    SR --> RES
    SR --> RCS
    SR --> RAS
    SR --> QS
    SR --> SS
    SR --> BS
    SR --> EWS
    
    RES --> RR
    RCS --> RR
    RAS --> RR
    EWS --> RR
    QS --> QR
    SS --> SR2
    BS --> BR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR2 --> SV
    BR --> BD
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:

- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. Risk Mitigation Actions (Embedded in c_opportunity)

**Purpose**: Recommended mitigation actions are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.mitigationActions[]` (see section 2 above)

**Notes**:

- Mitigation actions are embedded in the opportunity shard
- No separate shard type needed

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Shard Type Registration

**No Database Migration Needed** - All entities stored in existing `shards` container

**Shard Type Registration**:

- Add shard type definitions to `apps/api/src/types/core-shard-types.ts`
- Add seed data to `apps/api/src/seed/core-shard-types.seed.ts`
- Update `c_opportunity` schema to include embedded risk fields
- Register shard types via existing ShardTypeRepository

## Implementation Todos

1. **Database Schema** - Create all Cosmos DB containers

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/types/core-shard-types.ts` (MODIFY - add new shard type definitions)
- `apps/api/src/seed/core-shard-types.seed.ts` (MODIFY - add seed data for new shard types)
- `docs/shards/core-types/c_risk_catalog.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_snapshot.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_quota.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_simulation.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_benchmark.md` (NEW - shard type documentation)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```


Fixing the remaining updates:



Updating the remaining sections:


```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create shard type definitions: c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark. Update c_opportunity schema to include embedded riskEvaluation, earlyWarnings, and mitigationActions fields"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: shard-repository-integration
    content: Leverage existing ShardRepository for all risk-related shard operations. No custom repositories needed - use shard repository with shard type filtering
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - shard-repository-integration
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Overview

```mermaid
graph TB
    subgraph "Shard Data Layer - shards container"
        OPP[c_opportunity<br/>with embedded risk data]
        RC[c_risk_catalog<br/>with embedded ponderations]
        RS[c_risk_snapshot]
        QM[c_quota]
        SIM[c_risk_simulation]
        BM[c_benchmark]
    end
    
    subgraph "Service Layer"
        SR[ShardRepository]
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
        BS[BenchmarkingService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR2[simulation.routes.ts]
        BR[benchmarks.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
        BD[BenchmarkDashboard]
    end
    
    OPP --> SR
    RC --> SR
    RS --> SR
    QM --> SR
    SIM --> SR
    BM --> SR
    
    SR --> RES
    SR --> RCS
    SR --> RAS
    SR --> QS
    SR --> SS
    SR --> BS
    SR --> EWS
    
    RES --> RR
    RCS --> RR
    RAS --> RR
    EWS --> RR
    QS --> QR
    SS --> SR2
    BS --> BR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR2 --> SV
    BR --> BD
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:

- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. Risk Mitigation Actions (Embedded in c_opportunity)

**Purpose**: Recommended mitigation actions are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.mitigationActions[]` (see section 2 above)

**Notes**:

- Mitigation actions are embedded in the opportunity shard
- No separate shard type needed

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Shard Type Registration

**No Database Migration Needed** - All entities stored in existing `shards` container

**Shard Type Registration**:

- Add shard type definitions to `apps/api/src/types/core-shard-types.ts`
- Add seed data to `apps/api/src/seed/core-shard-types.seed.ts`
- Update `c_opportunity` schema to include embedded risk fields
- Register shard types via existing ShardTypeRepository

## Implementation Todos

1. **Shard Type Definitions** - Create shard type definitions for c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark, and update c_opportunity schema

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/types/core-shard-types.ts` (MODIFY - add new shard type definitions)
- `apps/api/src/seed/core-shard-types.seed.ts` (MODIFY - add seed data for new shard types)
- `docs/shards/core-types/c_risk_catalog.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_snapshot.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_quota.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_simulation.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_benchmark.md` (NEW - shard type documentation)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```


Adding a summary section explaining the shard-based approach:


```markdown
---
name: Risk Analysis Full PRD Implementation
overview: Implement the complete risk-aware revenue intelligence system per the PRD, including risk catalogs, risk evaluation engine, revenue at risk calculations, quota management, risk simulation, portfolio visibility, early-warning signals, and benchmarking. All features will leverage the existing shard-based architecture and Cosmos DB infrastructure.
todos:
  - id: db-schema
    content: "Create shard type definitions: c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark. Update c_opportunity schema to include embedded riskEvaluation, earlyWarnings, and mitigationActions fields"
    status: pending
  - id: risk-types
    content: "Create TypeScript types for risk analysis: risk-analysis.types.ts, quota.types.ts with all interfaces"
    status: pending
  - id: shard-repository-integration
    content: Leverage existing ShardRepository for all risk-related shard operations. No custom repositories needed - use shard repository with shard type filtering
    status: pending
    dependencies:
      - db-schema
      - risk-types
  - id: risk-catalog-service
    content: "Implement RiskCatalogService: getCatalog, createCustomRisk, updateRisk, getPonderation methods"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-evaluation-service
    content: "Implement RiskEvaluationService: evaluateOpportunity, calculateRiskScore, detectRisks, getHistoricalPatterns"
    status: pending
    dependencies:
      - risk-repositories
      - risk-catalog-service
  - id: revenue-at-risk-service
    content: "Implement RevenueAtRiskService: calculateForOpportunity, calculateForPortfolio, calculateForTeam, calculateForTenant"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: quota-service
    content: "Implement QuotaService: createQuota, updateQuota, calculatePerformance, rollupQuotas, getForecast"
    status: pending
    dependencies:
      - shard-repository-integration
      - revenue-at-risk-service
  - id: simulation-service
    content: "Implement SimulationService: runSimulation, compareScenarios methods"
    status: pending
    dependencies:
      - risk-evaluation-service
      - revenue-at-risk-service
  - id: early-warning-service
    content: "Implement EarlyWarningService: detectSignals, checkStageStagnation, checkActivityDrop, checkStakeholderChurn, checkRiskAcceleration"
    status: pending
    dependencies:
      - risk-evaluation-service
  - id: benchmarking-service
    content: "Implement BenchmarkingService: calculateWinRates, calculateClosingTimes, calculateDealSizeDistribution, estimateRenewal"
    status: pending
    dependencies:
      - risk-repositories
  - id: risk-api-routes
    content: Implement risk.routes.ts with all risk management endpoints
    status: pending
    dependencies:
      - risk-evaluation-service
      - risk-catalog-service
      - revenue-at-risk-service
      - early-warning-service
  - id: quota-api-routes
    content: Implement quota.routes.ts with all quota management endpoints
    status: pending
    dependencies:
      - quota-service
  - id: simulation-api-routes
    content: Implement simulation.routes.ts with simulation endpoints
    status: pending
    dependencies:
      - simulation-service
  - id: benchmarks-api-routes
    content: Implement benchmarks.routes.ts with benchmarking endpoints
    status: pending
    dependencies:
      - benchmarking-service
  - id: register-routes
    content: Register all new routes in apps/api/src/routes/index.ts
    status: pending
    dependencies:
      - risk-api-routes
      - quota-api-routes
      - simulation-api-routes
      - benchmarks-api-routes
  - id: risk-api-client
    content: Create apps/web/src/lib/api/risk-analysis.ts with API client functions
    status: pending
    dependencies:
      - risk-api-routes
  - id: quota-api-client
    content: Create apps/web/src/lib/api/quotas.ts with API client functions
    status: pending
    dependencies:
      - quota-api-routes
  - id: simulation-api-client
    content: Create apps/web/src/lib/api/simulation.ts with API client functions
    status: pending
    dependencies:
      - simulation-api-routes
  - id: risk-overview-ui
    content: Create risk-overview.tsx, risk-details-panel.tsx, risk-timeline.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: risk-mitigation-ui
    content: Create risk-mitigation-panel.tsx, risk-catalog-manager.tsx, risk-ponderation-editor.tsx components
    status: pending
    dependencies:
      - risk-api-client
  - id: quota-dashboard-ui
    content: Create quota-dashboard.tsx, quota-card.tsx, quota-performance-chart.tsx, quota-forecast-view.tsx, quota-manager.tsx
    status: pending
    dependencies:
      - quota-api-client
  - id: simulation-ui
    content: Create simulation-panel.tsx, scenario-builder.tsx, simulation-results.tsx, scenario-comparison.tsx
    status: pending
    dependencies:
      - simulation-api-client
  - id: portfolio-ui
    content: Create portfolio-risk-overview.tsx, team-risk-dashboard.tsx, risk-distribution-chart.tsx, high-risk-opportunities-list.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: early-warning-ui
    content: Create early-warning-panel.tsx, early-warning-card.tsx, signal-details-modal.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: benchmarking-ui
    content: Create benchmark-dashboard.tsx, win-rate-chart.tsx, closing-time-chart.tsx, renewal-intelligence-panel.tsx
    status: pending
    dependencies:
      - risk-api-client
  - id: opportunity-risks-page
    content: Create apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx
    status: pending
    dependencies:
      - risk-overview-ui
      - risk-mitigation-ui
  - id: quotas-page
    content: Create apps/web/src/app/(dashboard)/quotas/page.tsx
    status: pending
    dependencies:
      - quota-dashboard-ui
  - id: portfolio-risks-page
    content: Create apps/web/src/app/(dashboard)/portfolio/risks/page.tsx
    status: pending
    dependencies:
      - portfolio-ui
      - early-warning-ui
---

# Risk Analysis Full PRD Implementation Plan

## Overview

This plan implements the complete risk-aware revenue intelligence system as specified in the PRD. The implementation will leverage the existing shard-based architecture, Cosmos DB infrastructure, and multi-tenant design patterns already established in the codebase.

## Architecture Decision: Shard-Based Approach

All risk analysis entities are stored as **shards** in the existing `shards` container rather than separate Cosmos DB containers. This approach:

1. **Leverages Existing Infrastructure**: Uses the existing ShardRepository, relationships, embeddings, and audit mechanisms
2. **Consistency**: Follows the same patterns as other entities (c_opportunity, c_account, etc.)
3. **Relationships**: Native shard relationships for linking risk catalogs to opportunities, quotas to teams, etc.
4. **Embeddings**: Can leverage vector search for historical pattern matching
5. **Simplified Queries**: Standard shard queries with type filtering
6. **Embedded Data**: Current risk evaluations, early warnings, and mitigation actions are embedded in opportunity shards for performance
7. **Versioning**: Uses existing revisions mechanism for risk catalog versioning

### New Shard Types

- `c_risk_catalog` - Risk catalog definitions (global, industry, tenant)
- `c_risk_snapshot` - Historical risk evaluation snapshots
- `c_quota` - Quota definitions and tracking
- `c_risk_simulation` - Risk simulation scenarios
- `c_benchmark` - Benchmark data (single shard per tenant)

### Embedded Data (in c_opportunity)

- `structuredData.riskEvaluation` - Current risk evaluation
- `structuredData.earlyWarnings[]` - Active early-warning signals
- `structuredData.mitigationActions[]` - Recommended mitigation actions

### Embedded Data (in c_risk_catalog)

- `structuredData.ponderations[]` - Risk weight overrides

## Architecture Overview

```mermaid
graph TB
    subgraph "Shard Data Layer - shards container"
        OPP[c_opportunity<br/>with embedded risk data]
        RC[c_risk_catalog<br/>with embedded ponderations]
        RS[c_risk_snapshot]
        QM[c_quota]
        SIM[c_risk_simulation]
        BM[c_benchmark]
    end
    
    subgraph "Service Layer"
        SR[ShardRepository]
        RES[RiskEvaluationService]
        RCS[RiskCatalogService]
        RAS[RevenueAtRiskService]
        QS[QuotaService]
        SS[SimulationService]
        EWS[EarlyWarningService]
        BS[BenchmarkingService]
    end
    
    subgraph "API Layer"
        RR[risk.routes.ts]
        QR[quota.routes.ts]
        SR2[simulation.routes.ts]
        BR[benchmarks.routes.ts]
    end
    
    subgraph "UI Layer"
        RO[RiskOverview]
        RD[RiskDetails]
        QD[QuotaDashboard]
        SV[SimulationView]
        BD[BenchmarkDashboard]
    end
    
    OPP --> SR
    RC --> SR
    RS --> SR
    QM --> SR
    SIM --> SR
    BM --> SR
    
    SR --> RES
    SR --> RCS
    SR --> RAS
    SR --> QS
    SR --> SS
    SR --> BS
    SR --> EWS
    
    RES --> RR
    RCS --> RR
    RAS --> RR
    EWS --> RR
    QS --> QR
    SS --> SR2
    BS --> BR
    
    RR --> RO
    RR --> RD
    QR --> QD
    SR2 --> SV
    BR --> BD
```

## Shard Type Definitions

All risk analysis entities will be stored as shards in the existing `shards` container, leveraging the shard-based architecture. Each entity type will be a new shard type with the `c_` prefix.

### 1. c_risk_catalog Shard Type

**Purpose**: Store risk catalog definitions (global, industry-specific, tenant-specific)

**Shard Type Definition**:

**Shard Type Properties**:

- **Name**: `c_risk_catalog`
- **Display Name**: Risk Catalog
- **Category**: `DATA`
- **Global**: Yes (for global risks), No (for tenant-specific)
- **System**: Yes

**structuredData Schema**:

```typescript
{
  catalogType: 'global' | 'industry' | 'tenant';  // Required
  industryId?: string;                             // For industry-specific catalogs
  riskId: string;                                   // Unique risk identifier (required)
  name: string;                                     // Required
  description: string;                             // Required
  category: 'Commercial' | 'Technical' | 'Legal' | 'Financial' | 'Competitive' | 'Operational';  // Required
  defaultPonderation: number;                       // 0-1 weight (required)
  sourceShardTypes: string[];                      // Which shard types can trigger this risk
  detectionRules: {
    type: 'attribute' | 'relationship' | 'historical' | 'ai';
    conditions: any[];
    confidenceThreshold: number;
  };
  explainabilityTemplate: string;                 // Template for explainability summary
  ponderations?: Array<{                           // Weight overrides (embedded)
    scope: 'tenant' | 'industry' | 'opportunity_type';
    scopeId?: string;
    ponderation: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
  }>;
  isActive: boolean;                                // Required
  version: number;                                 // Version for catalog entry
}
```

**Notes**:

- Global risks use `tenantId="global"` (or special system tenant)
- Industry-specific risks reference industry via `industryId`
- Tenant-specific risks use actual `tenantId`
- Ponderations (weight overrides) are embedded in the catalog shard
- Versioning handled via revisions container

### 2. Risk Evaluation (Embedded in c_opportunity)

**Purpose**: Current risk evaluation is embedded in the opportunity shard's structuredData

**Embedded in c_opportunity.structuredData**:

```typescript
// In c_opportunity.structuredData
{
  // ... existing opportunity fields ...
  
  riskEvaluation?: {
    evaluationDate: Date;
    riskScore: number;              // 0-1 aggregated score
    revenueAtRisk: number;          // Calculated revenue at risk
    risks: Array<{
      riskId: string;               // Reference to c_risk_catalog shard
      riskName: string;
      category: string;
      ponderation: number;          // Applied weight (may be overridden)
      confidence: number;            // 0-1 confidence score
      contribution: number;         // Contribution to overall risk score
      explainability: string;       // Explainability summary
      sourceShards: string[];      // Shard IDs that triggered this risk
      lifecycleState: 'identified' | 'acknowledged' | 'mitigated' | 'accepted' | 'closed';
      ownerId?: string;             // User ID of risk owner
      acknowledgedAt?: Date;
      acknowledgedBy?: string;
      dismissedAt?: Date;
      dismissedBy?: string;
      dismissedReason?: string;
    }>;
    calculatedAt: Date;
    calculatedBy: string;           // System or user ID
  };
  
  earlyWarnings?: Array<{            // Early-warning signals (embedded)
    id: string;
    signalType: 'stage_stagnation' | 'activity_drop' | 'stakeholder_churn' | 'risk_acceleration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Array<{
      type: string;
      label: string;
      value: any;
    }>;
    detectedAt: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    resolvedAt?: Date;
  }>;
  
  mitigationActions?: Array<{        // Mitigation actions (embedded)
    id: string;
    riskId: string;
    actionType: 'engage_stakeholder' | 'accelerate_review' | 'technical_validation' | 'custom';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;         // 0-1 impact on risk reduction
    explainability: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    createdAt: Date;
    createdBy: string;
  }>;
}
```

### 3. c_risk_snapshot Shard Type

**Purpose**: Immutable historical snapshots of risk evaluations

**Shard Type Properties**:

- **Name**: `c_risk_snapshot`
- **Display Name**: Risk Snapshot
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;           // Reference to c_opportunity shard (required)
  snapshotDate: Date;              // Required
  riskScore: number;               // Required
  revenueAtRisk: number;           // Required
  risks: Array<{                   // Full risk details at snapshot time
    riskId: string;
    riskName: string;
    category: string;
    ponderation: number;
    confidence: number;
    contribution: number;
    explainability: string;
    sourceShards: string[];
    lifecycleState: string;
    ownerId?: string;
  }>;
  metadata: {
    dealValue: number;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseDate?: Date;
  };
}
```

**Relationships**:

- `snapshot_of` → `c_opportunity` (links to opportunity shard)

**Notes**:

- Snapshots are immutable (created, never updated)
- Use TTL field in shard metadata for automatic cleanup of old snapshots
- Linked to opportunity via relationship

### 4. Risk Ponderations (Embedded in c_risk_catalog)

**Purpose**: Tenant and industry-specific risk weight overrides are embedded in the risk catalog shard

**Location**: `c_risk_catalog.structuredData.ponderations[]` (see section 1 above)

**Notes**:

- Ponderations are stored as an array within the risk catalog shard
- Each entry includes scope, scopeId, ponderation, and effective dates
- No separate shard type needed

### 5. c_quota Shard Type

**Purpose**: Quota definitions and tracking

**Shard Type Properties**:

- **Name**: `c_quota`
- **Display Name**: Quota
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  quotaType: 'individual' | 'team' | 'tenant';  // Required
  targetUserId?: string;                         // For individual quotas
  teamId?: string;                               // For team quotas
  period: {                                      // Required
    type: 'monthly' | 'quarterly' | 'yearly';
    startDate: Date;
    endDate: Date;
  };
  target: {                                      // Required
    amount: number;
    currency: string;
    opportunityCount?: number;                  // Optional: target number of deals
  };
  performance: {
    actual: number;
    forecasted: number;
    riskAdjusted: number;                       // Forecast minus revenue at risk
    attainment: number;                         // Percentage
    riskAdjustedAttainment: number;
  };
  parentQuotaId?: string;                       // For hierarchical rollup
}
```

**Relationships**:

- `parent_of` → `c_quota` (for hierarchical quotas)
- `child_of` → `c_quota` (for hierarchical quotas)
- `quota_for` → User or Team (via targetUserId or teamId)

**Notes**:

- Both `parentQuotaId` field and relationships are used for flexibility
- Performance metrics are calculated dynamically but cached in structuredData

### 6. c_risk_simulation Shard Type

**Purpose**: Store risk simulation scenarios

**Shard Type Properties**:

- **Name**: `c_risk_simulation`
- **Display Name**: Risk Simulation
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  opportunityId: string;                          // Reference to c_opportunity (required)
  scenarioName: string;                          // Required
  modifications: {                               // Required
    risks?: Array<{
      action: 'add' | 'remove' | 'modify';
      riskId: string;
      ponderation?: number;
    }>;
    dealParameters?: {
      value?: number;
      probability?: number;
      closeDate?: Date;
    };
    weights?: Record<string, number>;            // Risk weight overrides
  };
  results: {                                     // Required
    riskScore: number;
    revenueAtRisk: number;
    expectedCloseDate: Date;
    forecastScenarios: {
      bestCase: number;
      baseCase: number;
      worstCase: number;
    };
  };
}
```

**Relationships**:

- `simulates` → `c_opportunity` (links to opportunity shard)

**Notes**:

- All simulations are stored permanently as shards
- Linked to opportunity via relationship

### 7. Early-Warning Signals (Embedded in c_opportunity)

**Purpose**: Early-warning signals are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.earlyWarnings[]` (see section 2 above)

**Notes**:

- Active signals are embedded in the opportunity shard
- No separate shard type needed

### 8. c_benchmark Shard Type

**Purpose**: Historical analytics and benchmarks (single shard per tenant with all benchmark types)

**Shard Type Properties**:

- **Name**: `c_benchmark`
- **Display Name**: Benchmark
- **Category**: `DATA`
- **Global**: No
- **System**: Yes

**structuredData Schema**:

```typescript
{
  benchmarkType: 'win_rate' | 'closing_time' | 'deal_size' | 'renewal';  // Required
  scope: 'tenant' | 'industry' | 'peer';                                  // Required
  industryId?: string;
  period: {                                                               // Required
    startDate: Date;
    endDate: Date;
  };
  metrics: {                                                              // Required
    winRate?: number;
    avgClosingTime?: number;                                              // Days
    dealSizeDistribution?: {
      min: number;
      p25: number;
      median: number;
      p75: number;
      max: number;
    };
    renewalProbability?: number;
  };
  calculatedAt: Date;                                                    // Required
}
```

**Notes**:

- Single shard per tenant contains all benchmark types
- Benchmarks are recalculated periodically and updated in place
- Historical benchmarks can be snapshotted via revisions if needed

### 9. Risk Mitigation Actions (Embedded in c_opportunity)

**Purpose**: Recommended mitigation actions are embedded in the opportunity shard

**Location**: `c_opportunity.structuredData.mitigationActions[]` (see section 2 above)

**Notes**:

- Mitigation actions are embedded in the opportunity shard
- No separate shard type needed

## API Implementation

### Risk Management Routes (`apps/api/src/routes/risk.routes.ts`)

**Endpoints**:

- `GET /api/v1/opportunities/:opportunityId/risks` - Get risks for an opportunity

- `POST /api/v1/opportunities/:opportunityId/risks/evaluate` - Trigger risk evaluation

- `GET /api/v1/opportunities/:opportunityId/risks/:riskId` - Get specific risk details

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/acknowledge` - Acknowledge risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/dismiss` - Dismiss risk

- `PUT /api/v1/opportunities/:opportunityId/risks/:riskId/lifecycle` - Update risk lifecycle

- `GET /api/v1/opportunities/:opportunityId/revenue-at-risk` - Get revenue at risk

- `GET /api/v1/portfolio/risks` - Get portfolio risk overview

- `GET /api/v1/teams/:teamId/risks` - Get team risk overview

- `GET /api/v1/risks/catalogs` - Get risk catalogs (global, industry, tenant)

- `POST /api/v1/risks/catalogs` - Create custom risk (tenant admin)

- `PUT /api/v1/risks/catalogs/:riskId` - Update risk catalog entry

- `GET /api/v1/risks/ponderations` - Get risk weight overrides

- `POST /api/v1/risks/ponderations` - Create weight override

- `GET /api/v1/opportunities/:opportunityId/early-warnings` - Get early-warning signals

- `GET /api/v1/opportunities/:opportunityId/mitigation-actions` - Get recommended actions

### Quota Management Routes (`apps/api/src/routes/quota.routes.ts`)

**Endpoints**:

- `GET /api/v1/quotas` - List quotas (filtered by user/team/tenant)

- `POST /api/v1/quotas` - Create quota

- `GET /api/v1/quotas/:quotaId` - Get quota details

- `PUT /api/v1/quotas/:quotaId` - Update quota

- `GET /api/v1/quotas/:quotaId/performance` - Get quota performance

- `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

- `GET /api/v1/users/:userId/quotas` - Get user quotas

- `GET /api/v1/teams/:teamId/quotas` - Get team quotas

### Simulation Routes (`apps/api/src/routes/simulation.routes.ts`)

**Endpoints**:

- `POST /api/v1/opportunities/:opportunityId/simulate` - Run risk simulation

- `GET /api/v1/opportunities/:opportunityId/simulations` - List simulations

- `GET /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Get simulation details

- `DELETE /api/v1/opportunities/:opportunityId/simulations/:simulationId` - Delete simulation

### Benchmarking Routes (`apps/api/src/routes/benchmarks.routes.ts`)

**Endpoints**:

- `GET /api/v1/benchmarks/win-rates` - Get win rate benchmarks

- `GET /api/v1/benchmarks/closing-times` - Get closing time benchmarks

- `GET /api/v1/benchmarks/deal-sizes` - Get deal size benchmarks

- `GET /api/v1/benchmarks/renewals` - Get renewal intelligence

- `POST /api/v1/benchmarks/calculate` - Trigger benchmark calculation

## Service Layer Implementation

### RiskEvaluationService (`apps/api/src/services/risk-evaluation.service.ts`)

**Key Methods**:

- `evaluateOpportunity(opportunityId: string): Promise<RiskEvaluation>` - Main evaluation method

- `calculateRiskScore(risks: Risk[]): number` - Aggregate risk score

- `calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number` - Calculate revenue at risk

- `detectRisks(opportunity: Shard, relatedShards: Shard[]): Promise<Risk[]>` - Risk detection logic

- `getHistoricalPatterns(opportunity: Shard): Promise<HistoricalPattern[]>` - Historical analysis

### RiskCatalogService (`apps/api/src/services/risk-catalog.service.ts`)

**Key Methods**:

- `getCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]>` - Get applicable risks

- `createCustomRisk(tenantId: string, risk: CreateRiskInput): Promise<RiskCatalog>` - Create tenant risk

- `updateRisk(riskId: string, updates: UpdateRiskInput): Promise<RiskCatalog>` - Update risk

- `getPonderation(riskId: string, tenantId: string, industryId?: string): number` - Get effective weight

### RevenueAtRiskService (`apps/api/src/services/revenue-at-risk.service.ts`)

**Key Methods**:

- `calculateForOpportunity(opportunityId: string): Promise<RevenueAtRisk>` - Calculate for single opportunity

- `calculateForPortfolio(userId: string): Promise<PortfolioRevenueAtRisk>` - Portfolio rollup

- `calculateForTeam(teamId: string): Promise<TeamRevenueAtRisk>` - Team rollup

- `calculateForTenant(tenantId: string): Promise<TenantRevenueAtRisk>` - Tenant rollup

### QuotaService (`apps/api/src/services/quota.service.ts`)

**Key Methods**:

- `createQuota(input: CreateQuotaInput): Promise<Quota>` - Create quota

- `updateQuota(quotaId: string, updates: UpdateQuotaInput): Promise<Quota>` - Update quota

- `calculatePerformance(quotaId: string): Promise<QuotaPerformance>` - Calculate performance

- `rollupQuotas(parentQuotaId: string): Promise<Quota>` - Hierarchical rollup

- `getForecast(quotaId: string): Promise<QuotaForecast>` - Get forecast

### SimulationService (`apps/api/src/services/simulation.service.ts`)

**Key Methods**:

- `runSimulation(opportunityId: string, scenario: SimulationScenario): Promise<SimulationResult>` - Run simulation

- `compareScenarios(opportunityId: string, scenarios: SimulationScenario[]): Promise<ComparisonResult>` - Compare multiple scenarios

### EarlyWarningService (`apps/api/src/services/early-warning.service.ts`)

**Key Methods**:

- `detectSignals(opportunityId: string): Promise<EarlyWarningSignal[]>` - Detect early-warning signals

- `checkStageStagnation(opportunity: Shard): Promise<Signal | null>` - Check for stagnation

- `checkActivityDrop(opportunity: Shard): Promise<Signal | null>` - Check for activity drop

- `checkStakeholderChurn(opportunity: Shard): Promise<Signal | null>` - Check for churn

- `checkRiskAcceleration(opportunityId: string): Promise<Signal | null>` - Check for risk acceleration

### BenchmarkingService (`apps/api/src/services/benchmarking.service.ts`)

**Key Methods**:

- `calculateWinRates(tenantId: string, industryId?: string): Promise<WinRateBenchmark>` - Calculate win rates

- `calculateClosingTimes(tenantId: string, industryId?: string): Promise<ClosingTimeBenchmark>` - Calculate closing times

- `calculateDealSizeDistribution(tenantId: string, industryId?: string): Promise<DealSizeBenchmark>` - Deal size analysis

- `estimateRenewal(contractId: string): Promise<RenewalEstimate>` - Renewal intelligence

## UI Implementation

### Risk Overview Components (`apps/web/src/components/risk-analysis/`)

**Files to Create**:

- `risk-overview.tsx` - Main risk dashboard for opportunities

- `risk-details-panel.tsx` - Detailed risk view

- `risk-timeline.tsx` - Risk history visualization

- `risk-mitigation-panel.tsx` - Mitigation actions UI

- `risk-catalog-manager.tsx` - Risk catalog administration (tenant admin)

- `risk-ponderation-editor.tsx` - Weight override editor

### Quota Components (`apps/web/src/components/quotas/`)

**Files to Create**:

- `quota-dashboard.tsx` - Main quota dashboard

- `quota-card.tsx` - Individual quota card

- `quota-performance-chart.tsx` - Performance visualization
- `quota-forecast-view.tsx` - Forecast visualization

- `quota-manager.tsx` - Quota creation/editing (admin)

### Simulation Components (`apps/web/src/components/simulation/`)

**Files to Create**:

- `simulation-panel.tsx` - Simulation interface

- `scenario-builder.tsx` - Build simulation scenarios

- `simulation-results.tsx` - Display simulation results

- `scenario-comparison.tsx` - Compare multiple scenarios

### Portfolio/Team Views (`apps/web/src/components/portfolio/`)

**Files to Create**:

- `portfolio-risk-overview.tsx` - Portfolio risk dashboard

- `team-risk-dashboard.tsx` - Team risk view

- `risk-distribution-chart.tsx` - Risk category distribution

- `high-risk-opportunities-list.tsx` - List of high-risk deals

### Early Warning Components (`apps/web/src/components/early-warnings/`)

**Files to Create**:

- `early-warning-panel.tsx` - Early-warning signals display

- `early-warning-card.tsx` - Individual signal card

- `signal-details-modal.tsx` - Signal details modal

### Benchmarking Components (`apps/web/src/components/benchmarks/`)

**Files to Create**:

- `benchmark-dashboard.tsx` - Benchmark overview

- `win-rate-chart.tsx` - Win rate visualization

- `closing-time-chart.tsx` - Closing time analysis

- `renewal-intelligence-panel.tsx` - Renewal insights

## Integration Points

### Leverage Existing Services

1. **ShardRepository** - Query opportunities and related shards

2. **ProactiveAgentService** - Extend for risk-based proactive insights

3. **InsightService** - Generate AI-driven risk explanations

4. **AuditLogs** - Full audit trail for risk operations

5. **NotificationService** - Early-warning alerts

6. **EmbeddingService** - Historical pattern matching using embeddings

### Shard Type Registration

**No Database Migration Needed** - All entities stored in existing `shards` container

**Shard Type Registration**:

- Add shard type definitions to `apps/api/src/types/core-shard-types.ts`
- Add seed data to `apps/api/src/seed/core-shard-types.seed.ts`
- Update `c_opportunity` schema to include embedded risk fields
- Register shard types via existing ShardTypeRepository

## Implementation Todos

1. **Shard Type Definitions** - Create shard type definitions for c_risk_catalog, c_risk_snapshot, c_quota, c_risk_simulation, c_benchmark, and update c_opportunity schema

2. **Risk Catalog Service** - Implement risk catalog management

3. **Risk Evaluation Engine** - Core risk detection and scoring

4. **Revenue at Risk Calculator** - Calculate and rollup revenue at risk

5. **Risk API Routes** - All risk management endpoints

6. **Quota Service** - Quota management and performance tracking
7. **Quota API Routes** - Quota endpoints

8. **Simulation Service** - Risk simulation engine

9. **Simulation API Routes** - Simulation endpoints

10. **Early Warning Service** - Signal detection

11. **Benchmarking Service** - Historical analytics

12. **Risk Overview UI** - Main risk dashboard

13. **Risk Details UI** - Detailed risk views

14. **Quota Dashboard UI** - Quota management interface

15. **Simulation UI** - Simulation interface

16. **Portfolio Views UI** - Team/portfolio dashboards

17. **Early Warning UI** - Signal display

18. **Benchmarking UI** - Benchmark dashboards

19. **Risk Catalog Admin UI** - Tenant admin risk management

20. **Integration Testing** - End-to-end tests

## Key Files to Modify/Create

### API Layer

- `apps/api/src/routes/risk.routes.ts` (NEW)

- `apps/api/src/routes/quota.routes.ts` (NEW)

- `apps/api/src/routes/simulation.routes.ts` (NEW)

- `apps/api/src/routes/benchmarks.routes.ts` (NEW)

- `apps/api/src/services/risk-evaluation.service.ts` (NEW)

- `apps/api/src/services/risk-catalog.service.ts` (NEW)
- `apps/api/src/services/revenue-at-risk.service.ts` (NEW)

- `apps/api/src/services/quota.service.ts` (NEW)

- `apps/api/src/services/simulation.service.ts` (NEW)

- `apps/api/src/services/early-warning.service.ts` (NEW)

- `apps/api/src/services/benchmarking.service.ts` (NEW)

- `apps/api/src/types/risk-analysis.types.ts` (NEW)
- `apps/api/src/types/quota.types.ts` (NEW)

- `apps/api/src/types/core-shard-types.ts` (MODIFY - add new shard type definitions)
- `apps/api/src/seed/core-shard-types.seed.ts` (MODIFY - add seed data for new shard types)
- `docs/shards/core-types/c_risk_catalog.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_snapshot.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_quota.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_risk_simulation.md` (NEW - shard type documentation)
- `docs/shards/core-types/c_benchmark.md` (NEW - shard type documentation)

### Web Layer

- `apps/web/src/components/risk-analysis/` (NEW directory)

- `apps/web/src/components/quotas/` (NEW directory)

- `apps/web/src/components/simulation/` (NEW directory)

- `apps/web/src/components/portfolio/` (NEW directory)

- `apps/web/src/components/early-warnings/` (NEW directory)

- `apps/web/src/components/benchmarks/` (NEW directory)

- `apps/web/src/lib/api/risk-analysis.ts` (NEW)

- `apps/web/src/lib/api/quotas.ts` (NEW)

- `apps/web/src/lib/api/simulation.ts` (NEW)

- `apps/web/src/app/(dashboard)/opportunities/[id]/risks/page.tsx` (NEW)
- `apps/web/src/app/(dashboard)/quotas/page.tsx` (NEW)

- `apps/web/src/app/(dashboard)/portfolio/risks/page.tsx` (NEW)

## Testing Strategy

1. **Unit Tests** - All service methods

2. **Integration Tests** - API endpoints
3. **E2E Tests** - Critical user flows

4. **Performance Tests** - Risk evaluation performance with large datasets

## Success Metrics

- Risk evaluation completes in <2 seconds per opportunity

- Revenue at Risk calculations accurate to within 5%

- Quota performance updates in real-time

- Simulation results generated in <1 second
```


I've updated the plan to use a shard-based architecture. Summary of changes:

## Updated Plan Summary

### Shard-based architecture

Instead of separate Cosmos DB containers, all entities are stored as shards in the existing `shards` container:

1. New shard types (with `c_` prefix):
   - `c_risk_catalog` - Risk catalog definitions with embedded ponderations
   - `c_risk_snapshot` - Historical risk snapshots (immutable)
   - `c_quota` - Quota definitions with hierarchical relationships
   - `c_risk_simulation` - Simulation scenarios (permanently stored)
   - `c_benchmark` - Benchmark data (single shard per tenant)

2. Embedded data (in `c_opportunity.structuredData`):
   - `riskEvaluation` - Current risk evaluation
   - `earlyWarnings[]` - Active early-warning signals
   - `mitigationActions[]` - Recommended mitigation actions

3. Embedded data (in `c_risk_catalog.structuredData`):
   - `ponderations[]` - Risk weight overrides

### Benefits

- Uses existing ShardRepository (no custom repositories needed)
- Native shard relationships for linking entities
- Leverages existing revision system for versioning
- Can use vector embeddings for historical pattern matching
- Consistent with existing codebase patterns
- No database migrations needed (uses existing `shards` container)

### Updated todos

- Changed from "Create Cosmos DB containers" to "Create shard type definitions"
- Changed from "Implement repositories" to "Leverage existing ShardRepository"
- Updated file list to include shard type definitions instead of container migrations

The plan is ready for implementation. All services will use the existing ShardRepository with shard type filtering, and the embedded data approach keeps current risk data co-located with opportunities for better performance.

Should I proceed with implementation, or do you have any other questions or adjustments?

---

**User**

Will the plan offer the best performances in risk analysis for the users ? is there anything that should be changed ?

---

**Cursor**


Analyzing performance implications and identifying potential optimizations:



Analyzing performance implications and identifying optimizations:


