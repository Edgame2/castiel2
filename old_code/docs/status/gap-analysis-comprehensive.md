# Comprehensive Gap Analysis Report
## Opportunities, Risk Analysis, Pipeline, Quota, and Manager Dashboard

**Date:** 2025-01-28  
**Scope:** Full functional and code-level analysis  
**Status:** Complete Analysis with Recommendations  
**⚠️ CRITICAL**: See [GAP_ANALYSIS_CRITICAL_ISSUES.md](./GAP_ANALYSIS_CRITICAL_ISSUES.md) for critical bugs and architectural questions

---

## Executive Summary

This comprehensive gap analysis evaluates the current implementation status of critical features related to opportunities, risk analysis, pipeline management, quota tracking, and manager dashboards. The analysis identifies both functional gaps and implementation opportunities across backend services, API endpoints, and frontend components.

### ⚠️ CRITICAL ISSUES FOUND

**Before implementing any gaps, the following must be addressed:**

1. **🚨 P0 - CRITICAL BUGS** (See [GAP_ANALYSIS_CRITICAL_ISSUES.md](./GAP_ANALYSIS_CRITICAL_ISSUES.md))
   - `RiskEvaluationService` initialization bug in `apps/api/src/routes/index.ts:2710` - missing `shardTypeRepository` parameter
   - `RiskEvaluationService` initialization bug in `apps/api/src/routes/quotas.routes.ts:52` - missing `shardTypeRepository` parameter
   - **Impact**: Application will fail at runtime when risk evaluation is called

2. **❓ ARCHITECTURAL QUESTIONS** (Must answer before implementation)
   - How are sales teams structured? (No clear data model found)
   - How are managers identified? (No manager role in UserRole enum)
   - How is team membership stored? (Unclear from codebase)
   - Should `teamId` be added to opportunity schema? (Currently missing)

### Key Findings

- **Manager Dashboard View**: ⚠️ **PARTIALLY IMPLEMENTED** - Core infrastructure exists but lacks role-based team aggregation
- **Close Won/Lost vs Quota**: ✅ **IMPLEMENTED** - Basic functionality exists, but historical trends are incomplete
- **Automatic Shard Linking**: ✅ **IMPLEMENTED** - Service exists and is functional, but needs configuration UI
- **Risk Analysis Dashboard**: ✅ **IMPLEMENTED** - Standalone views exist, but manager-level aggregation missing
- **Pipeline**: ✅ **IMPLEMENTED** - All views exist, but manager team view missing
- **Risk Catalog**: ✅ **IMPLEMENTED** - Full CRUD exists, but needs better UI integration
- **AI Insights Integration**: ⚠️ **FUNCTIONAL BUT SUBOPTIMAL** - AI risk detection works but doesn't leverage full context template system

---

## 1. Manager Dashboard View

### Current State

#### ✅ What Exists

1. **Backend Services**
   - `OpportunityService.listOwnedOpportunities()` - Lists opportunities by owner
   - `QuotaService` - Supports individual, team, and tenant quotas
   - `RevenueAtRiskService.calculateForTeam()` - Calculates team revenue at risk
   - `PipelineViewService.getPipelineView()` - Pipeline views (all, active, stage, kanban)
   - `PipelineAnalyticsService` - Pipeline metrics and closed won/lost calculations

2. **API Endpoints**
   - `GET /api/v1/opportunities` - Lists opportunities (filters by ownerId)
   - `GET /api/v1/pipeline` - Pipeline view (user-scoped)
   - `GET /api/v1/quotas` - List quotas (supports team quotas)
   - `GET /api/v1/risk-analysis/teams/:teamId/revenue-at-risk` - Team risk analysis

3. **Frontend Components**
   - `/pipeline` - User pipeline view
   - `/quotas` - Quota dashboard (supports userId/teamId filters)
   - `/risk-analysis/portfolio/[userId]` - Portfolio risk view
   - `/risk-analysis/teams/[teamId]` - Team risk view

#### ❌ What's Missing

1. **Role-Based Access Control**
   - **Gap**: No manager role detection or team membership lookup
   - **Impact**: Managers cannot automatically see team opportunities
   - **Location**: `apps/api/src/services/opportunity.service.ts` - `listOwnedOpportunities()` only filters by `ownerId`
   - **Priority**: **P0 - CRITICAL**
   - **⚠️ BLOCKER**: Need answers to:
     - How are sales managers identified? (No manager role in UserRole enum)
     - How is team membership stored? (Unclear data model)
     - How are opportunities associated with teams? (No `teamId` in opportunity schema)

2. **Team Opportunity Aggregation**
   - **Gap**: No service method to list all team opportunities
   - **Impact**: Managers must manually filter or cannot see team view
   - **Location**: Missing `listTeamOpportunities()` method in `OpportunityService`
   - **Priority**: **P0 - CRITICAL**
   - **⚠️ BLOCKER**: 
     - Opportunities don't have `teamId` field in schema (only in `unstructuredData` or missing)
     - `RevenueAtRiskService.calculateForTeam()` assumes `data?.teamId` exists but it's not in schema
     - Need to clarify: Should `teamId` be added to opportunity schema? How is it currently stored?

3. **Manager Dashboard Page**
   - **Gap**: No dedicated manager dashboard page
   - **Impact**: Managers don't have unified view of team performance
   - **Location**: Missing `/manager/dashboard` or `/dashboard/manager` page
   - **Priority**: **P1 - HIGH**

4. **Team Member View**
   - **Gap**: No component to view individual team member performance
   - **Impact**: Managers cannot drill down into team member details
   - **Location**: Missing team member detail views
   - **Priority**: **P1 - HIGH**

5. **Pipeline View by Stage (Team)**
   - **Gap**: Pipeline view only shows user's opportunities, not team
   - **Impact**: Managers cannot see team pipeline by stage
   - **Location**: `PipelineViewService.getPipelineView()` - needs team aggregation
   - **Priority**: **P1 - HIGH**

6. **Risk View by Team**
   - **Gap**: Risk analysis exists for teams but not integrated into manager dashboard
   - **Impact**: Managers must navigate to separate risk analysis page
   - **Location**: Risk analysis exists but not in unified manager view
   - **Priority**: **P2 - MEDIUM**

7. **Quota View for Team**
   - **Gap**: Quota dashboard supports teamId filter but no manager-specific view
   - **Impact**: Managers can see team quotas but not in unified dashboard
   - **Location**: Quota dashboard exists but needs manager context
   - **Priority**: **P2 - MEDIUM**

8. **Close Won/Lost vs Quota (Team)**
   - **Gap**: Close won/lost metrics exist per user, but not aggregated for team
   - **Impact**: Managers cannot see team performance vs quota
   - **Location**: `PipelineAnalyticsService.calculateClosedWonLost()` - only for individual users
   - **Priority**: **P1 - HIGH**

9. **Revenue at Risk vs Quota (Team)**
   - **Gap**: Revenue at risk exists for teams, but not compared to quota
   - **Impact**: Managers cannot see risk-adjusted quota attainment
   - **Location**: Missing comparison logic between team revenue at risk and team quota
   - **Priority**: **P1 - HIGH**

### Implementation Recommendations

**⚠️ NOTE**: These recommendations assume answers to architectural questions in [GAP_ANALYSIS_CRITICAL_ISSUES.md](./GAP_ANALYSIS_CRITICAL_ISSUES.md)

1. **Create Team Service** (After team structure is defined)
   ```typescript
   // apps/api/src/services/team.service.ts
   - getTeamMembers(teamId: string, tenantId: string): Promise<User[]>
   - getManagerTeams(managerId: string, tenantId: string): Promise<Team[]>
   - isUserManagerOfTeam(userId: string, teamId: string): Promise<boolean>
   - getTeamForUser(userId: string, tenantId: string): Promise<Team | null>
   ```
   
   **Questions to answer first**:
   - How are teams stored? (Shard type, user metadata, external system?)
   - How are team members stored? (Array in team shard, user metadata, relationships?)
   - How are managers assigned? (Team owner, custom role, metadata?)

2. **Add teamId to Opportunity Schema** (If not already in unstructuredData)
   ```typescript
   // apps/api/src/types/core-shard-types.ts - opportunityFields
   {
     name: 'teamId',
     label: 'Team ID',
     type: RichFieldType.TEXT, // Or SHARD if teams are shards
     config: { maxLength: 200 },
     design: { columns: 6 },
   }
   ```
   
   **Migration**: Backfill `teamId` from owner's team or external system

3. **Extend Opportunity Service**
   ```typescript
   // apps/api/src/services/opportunity.service.ts
   - listTeamOpportunities(teamId: string, tenantId: string, filters?: OpportunityFilters): Promise<OpportunityListResult>
   - listManagerOpportunities(managerId: string, tenantId: string, filters?: OpportunityFilters): Promise<OpportunityListResult>
   ```

3. **Create Manager Dashboard Service**
   ```typescript
   // apps/api/src/services/manager-dashboard.service.ts
   - getManagerDashboard(managerId: string, tenantId: string): Promise<ManagerDashboard>
   ```

4. **Create Manager Dashboard Page**
   ```
   apps/web/src/app/(protected)/manager/dashboard/page.tsx
   ```

5. **Add Manager Routes**
   ```typescript
   // apps/api/src/routes/manager.routes.ts
   GET /api/v1/manager/dashboard
   GET /api/v1/manager/teams/:teamId/opportunities
   GET /api/v1/manager/teams/:teamId/performance
   ```

---

## 2. Close Won/Lost Against Quota

### Current State

#### ✅ What Exists

1. **Backend Services**
   - `PipelineAnalyticsService.calculateClosedWonLost()` - Calculates closed won/lost for a user
   - `QuotaService.calculatePerformance()` - Calculates quota performance (actual, forecasted, risk-adjusted)
   - `QuotaService.getForecast()` - Gets quota forecast with best/base/worst case scenarios

2. **API Endpoints**
   - `GET /api/v1/pipeline/closed-won-lost` - Closed won/lost metrics
   - `POST /api/v1/quotas/:quotaId/calculate-performance` - Calculate quota performance
   - `GET /api/v1/quotas/:quotaId/forecast` - Get quota forecast

3. **Data Structures**
   - `ClosedWonMetrics` - Contains won/lost counts, values, win rate
   - `QuotaPerformanceDetails` - Contains actual, forecasted, risk-adjusted, attainment
   - `QuotaForecast` - Contains best/base/worst case scenarios

#### ❌ What's Missing

1. **Historical Trends (Daily/Weekly)**
   - **Gap**: `QuotaPerformanceDetails.trends` has empty arrays with TODO comments
   - **Impact**: Cannot show historical trends over time
   - **Location**: `apps/api/src/services/quota.service.ts:414-416`
   ```typescript
   trends: {
     daily: [], // TODO: Calculate daily trends
     weekly: [], // TODO: Calculate weekly trends
   },
   ```
   - **Priority**: **P1 - HIGH**

2. **Team-Level Close Won/Lost**
   - **Gap**: `calculateClosedWonLost()` only works for individual users
   - **Impact**: Managers cannot see team aggregated close won/lost
   - **Location**: `apps/api/src/services/pipeline-analytics.service.ts:119`
   - **Priority**: **P1 - HIGH**

3. **Close Won/Lost vs Quota Comparison**
   - **Gap**: No direct comparison endpoint between close won/lost and quota
   - **Impact**: Must manually compare two separate API calls
   - **Location**: Missing combined endpoint
   - **Priority**: **P1 - HIGH**

4. **Forecast vs Actual Comparison**
   - **Gap**: Forecast exists but no historical comparison with actuals
   - **Impact**: Cannot track forecast accuracy over time
   - **Location**: Missing forecast accuracy tracking
   - **Priority**: **P2 - MEDIUM**

5. **Monthly/Quarterly Aggregations**
   - **Gap**: No time-series aggregation for quota performance
   - **Impact**: Cannot show monthly/quarterly trends
   - **Location**: Missing aggregation service
   - **Priority**: **P1 - HIGH**

6. **Visualizations**
   - **Gap**: Frontend has basic quota charts but no close won/lost vs quota comparison charts
   - **Impact**: Users cannot visually compare performance
   - **Location**: Missing comparison chart components
   - **Priority**: **P2 - MEDIUM**

### Implementation Recommendations

1. **Implement Historical Trends**
   ```typescript
   // apps/api/src/services/quota.service.ts
   private async calculateTrends(
     quota: Quota,
     opportunities: Shard[],
     period: Quota['period']
   ): Promise<{ daily: TrendPoint[]; weekly: TrendPoint[] }> {
     // Calculate daily snapshots
     // Calculate weekly aggregations
   }
   ```

2. **Add Team Close Won/Lost**
   ```typescript
   // apps/api/src/services/pipeline-analytics.service.ts
   async calculateTeamClosedWonLost(
     teamId: string,
     tenantId: string,
     period: { startDate: Date; endDate: Date }
   ): Promise<TeamClosedWonMetrics>
   ```

3. **Create Comparison Endpoint**
   ```typescript
   // apps/api/src/routes/quota.routes.ts
   GET /api/v1/quotas/:quotaId/performance-vs-closed
   // Returns quota performance compared to actual close won/lost
   ```

4. **Add Time-Series Aggregation**
   ```typescript
   // apps/api/src/services/quota-analytics.service.ts (new)
   - getMonthlyPerformance(quotaId: string): Promise<MonthlyPerformance[]>
   - getQuarterlyPerformance(quotaId: string): Promise<QuarterlyPerformance[]>
   ```

---

## 3. Automatic Link Shards to Opportunities

### Current State

#### ✅ What Exists

1. **Backend Service**
   - `OpportunityAutoLinkingService` - Full implementation with multi-factor matching
   - `processShardCreated()` - Processes shard creation events
   - Linking rules: content overlap, metadata overlap, temporal overlap, account-based

2. **Azure Function**
   - `opportunity-auto-linking-processor.ts` - Service Bus processor for shard-created events

3. **Linking Logic**
   - Content overlap: accountId, contactId, companyId matching
   - Metadata overlap: ownerId, team members, date proximity
   - Temporal overlap: 30-day activity window
   - Account-based: Relationship-based account linking
   - Confidence scoring: Weighted average with thresholds

#### ❌ What's Missing

1. **Configuration UI**
   - **Gap**: No UI to configure auto-linking rules, thresholds, or time windows
   - **Impact**: Admins cannot customize auto-linking behavior
   - **Location**: Missing admin configuration page
   - **Priority**: **P2 - MEDIUM**

2. **Coverage Verification**
   - **Gap**: No verification that all shard types are covered
   - **Impact**: Some shard types may not auto-link
   - **Location**: `getRelationshipType()` has limited type mapping
   - **Priority**: **P2 - MEDIUM**

3. **Performance Monitoring**
   - **Gap**: Basic monitoring exists but no performance dashboard
   - **Impact**: Cannot track auto-linking performance or issues
   - **Location**: Monitoring events exist but no UI
   - **Priority**: **P3 - LOW**

4. **Manual Override**
   - **Gap**: No UI to manually trigger auto-linking or unlink
   - **Impact**: Users cannot fix incorrect links or force re-linking
   - **Location**: Missing manual controls
   - **Priority**: **P2 - MEDIUM**

5. **Batch Processing**
   - **Gap**: Only processes new shards, no batch re-processing
   - **Impact**: Existing unlinked shards remain unlinked
   - **Location**: Missing batch processing endpoint
   - **Priority**: **P2 - MEDIUM**

6. **Configuration Options**
   - **Gap**: Hardcoded thresholds and time windows
   - **Impact**: Cannot adjust for different business needs
   - **Location**: Constants in `OpportunityAutoLinkingService`
   - **Priority**: **P2 - MEDIUM**

### Implementation Recommendations

1. **Add Configuration Service**
   ```typescript
   // apps/api/src/services/auto-linking-config.service.ts
   - getConfig(tenantId: string): Promise<AutoLinkingConfig>
   - updateConfig(tenantId: string, config: AutoLinkingConfig): Promise<void>
   ```

2. **Create Admin UI**
   ```
   apps/web/src/app/(protected)/admin/auto-linking/page.tsx
   ```

3. **Add Batch Processing**
   ```typescript
   // apps/api/src/routes/auto-linking.routes.ts
   POST /api/v1/auto-linking/batch-process
   POST /api/v1/auto-linking/reprocess/:shardId
   ```

4. **Extend Shard Type Coverage**
   - Review all shard types and add mappings to `getRelationshipType()`
   - Add fallback relationship type for unknown shard types

---

## 4. Risk Analysis Dashboard

### Current State

#### ✅ What Exists

1. **Backend Services**
   - `RiskEvaluationService` - Full risk evaluation with rule-based, AI-powered, and historical pattern matching
   - `RevenueAtRiskService` - Revenue at risk calculations for portfolio, team, and tenant
   - `RiskCatalogService` - Full CRUD for risk catalog
   - `EarlyWarningService` - Early warning signal detection

2. **AI Insights Integration**
   - ✅ `InsightService` integration for AI-powered risk detection
   - ✅ `detectRisksByAI()` method uses `insightService.generate()` with comprehensive prompts
   - ✅ Includes numerical metrics (deal value, probability, days to close, activity gaps)
   - ✅ Includes related shards context (account, contacts, documents, notes)
   - ✅ Uses structured format for parsing AI responses
   - ✅ Vector search integration for historical pattern matching
   - ✅ Opportunity embedding template optimized for risk analysis (quality model: text-embedding-3-large)
   - ✅ Multi-layered detection: rule-based → historical → AI-powered

3. **API Endpoints**
   - `GET /api/v1/risk-analysis/catalog` - Get risk catalog
   - `POST /api/v1/risk-analysis/opportunities/:opportunityId/evaluate` - Evaluate opportunity risk
   - `GET /api/v1/risk-analysis/portfolio/:userId/revenue-at-risk` - Portfolio risk
   - `GET /api/v1/risk-analysis/teams/:teamId/revenue-at-risk` - Team risk
   - `GET /api/v1/risk-analysis/tenant/revenue-at-risk` - Tenant risk

4. **Frontend Components**
   - `/risk-analysis/opportunities/[opportunityId]` - Opportunity risk analysis page
   - `/risk-analysis/portfolio/[userId]` - Portfolio risk page
   - `/risk-analysis/teams/[teamId]` - Team risk page
   - `/risk-analysis/catalog` - Risk catalog management
   - Risk overview, details, timeline, mitigation panels

#### ❌ What's Missing

1. **Standalone Risk Dashboard**
   - **Gap**: Risk analysis exists but no unified dashboard page
   - **Impact**: Users must navigate to individual opportunity/portfolio pages
   - **Location**: Missing `/risk-analysis/dashboard` page
   - **Priority**: **P1 - HIGH**

2. **Integrated Dashboard Widgets**
   - **Gap**: Risk metrics not integrated into main dashboard
   - **Impact**: Risk visibility is limited to dedicated pages
   - **Location**: Dashboard widget system exists but no risk widgets
   - **Priority**: **P2 - MEDIUM**

3. **Manager Risk Aggregation**
   - **Gap**: Team risk exists but not aggregated for manager view
   - **Impact**: Managers cannot see team risk in unified dashboard
   - **Location**: Team risk service exists but not in manager dashboard
   - **Priority**: **P1 - HIGH**

4. **Risk vs Quota Comparison**
   - **Gap**: Risk and quota exist separately, no comparison view
   - **Impact**: Cannot see risk-adjusted quota attainment in one view
   - **Location**: Missing comparison component
   - **Priority**: **P1 - HIGH**

5. **Risk Trends Over Time**
   - **Gap**: Risk snapshots exist but no trend visualization
   - **Impact**: Cannot see how risk changes over time
   - **Location**: Risk timeline exists but no trend charts
   - **Priority**: **P2 - MEDIUM**

6. **Risk Alerts Dashboard**
   - **Gap**: Early warnings exist but no alert dashboard
   - **Impact**: Users must check individual opportunities for alerts
   - **Location**: Missing alert aggregation page
   - **Priority**: **P2 - MEDIUM**

7. **AI Insights Integration Gaps**
   - **Gap**: No dedicated risk analysis context template - using hardcoded prompt
   - **Impact**: Cannot customize AI risk detection prompts per tenant/industry
   - **Location**: `apps/api/src/services/risk-evaluation.service.ts:472-498` - hardcoded prompt
   - **Priority**: **P1 - HIGH**

8. **Context Template Integration**
   - **Gap**: AI risk detection doesn't use context template system for better context assembly
   - **Impact**: Missing opportunity to leverage full RAG pipeline and relationship traversal
   - **Location**: `detectRisksByAI()` manually builds context instead of using `ContextTemplateService`
   - **Priority**: **P1 - HIGH**

9. **Quota Context in AI Analysis**
   - **Gap**: Quota context is incomplete (just a placeholder note, not actual quota data)
   - **Impact**: AI cannot consider quota pressure when evaluating risks
   - **Location**: `apps/api/src/services/risk-evaluation.service.ts:424-436`
   - **Priority**: **P1 - HIGH**

10. **Risk-Specific AI Prompts**
    - **Gap**: System has risk analysis prompts in `data/prompts/system-prompts.json` but not used
    - **Impact**: Missing opportunity to use optimized risk analysis prompts
    - **Location**: Risk evaluation uses generic prompt instead of risk-specific system prompt
    - **Priority**: **P2 - MEDIUM**

11. **AI Response Parsing Robustness**
    - **Gap**: AI response parsing has fallback but could be more robust
    - **Impact**: May miss risks if AI response format varies
    - **Location**: `apps/api/src/services/risk-evaluation.service.ts:514-583`
    - **Priority**: **P2 - MEDIUM**

### Implementation Recommendations

1. **Create Risk Dashboard Page**
   ```
   apps/web/src/app/(protected)/risk-analysis/dashboard/page.tsx
   ```

2. **Add Risk Widgets**
   ```
   apps/web/src/components/dashboard/widgets/risk-overview-widget.tsx
   apps/web/src/components/dashboard/widgets/risk-alerts-widget.tsx
   apps/web/src/components/dashboard/widgets/revenue-at-risk-widget.tsx
   ```

3. **Create Risk vs Quota Component**
   ```
   apps/web/src/components/risk-analysis/risk-vs-quota-comparison.tsx
   ```

4. **Add Risk Trends Service**
   ```typescript
   // apps/api/src/services/risk-trends.service.ts
   - getRiskTrends(opportunityId: string, period: DateRange): Promise<RiskTrend[]>
   - getPortfolioRiskTrends(userId: string, period: DateRange): Promise<RiskTrend[]>
   ```

---

## 5. Pipeline

### Current State

#### ✅ What Exists

1. **Backend Services**
   - `PipelineViewService` - Supports all, active, stage, and kanban views
   - `PipelineAnalyticsService` - Pipeline metrics, closed won/lost, risk organization
   - `PipelineSummaryService` - Pipeline summary calculations

2. **API Endpoints**
   - `GET /api/v1/pipeline` - Pipeline view (supports viewType: all, active, stage, kanban)
   - `GET /api/v1/pipeline/metrics` - Pipeline metrics
   - `GET /api/v1/pipeline/closed-won-lost` - Closed won/lost
   - `GET /api/v1/pipeline/risk-organization` - Risk-based organization
   - `GET /api/v1/pipeline/summary` - Pipeline summary

3. **Frontend Components**
   - `/pipeline` - Main pipeline page with view type selector
   - Pipeline summary cards (total value, expected revenue, revenue at risk, count)
   - Kanban/stage view with drag-and-drop support
   - List view with opportunity cards

4. **Integration**
   - Risk evaluation integrated into pipeline view
   - Revenue at risk shown in summary
   - Risk scores displayed on opportunity cards

#### ❌ What's Missing

1. **Team Pipeline View**
   - **Gap**: Pipeline view only shows user's opportunities, not team
   - **Impact**: Managers cannot see team pipeline
   - **Location**: `PipelineViewService.getPipelineView()` - only uses `listOwnedOpportunities()`
   - **Priority**: **P1 - HIGH**

2. **Pipeline Analytics Integration**
   - **Gap**: Analytics exist but not fully integrated into pipeline view
   - **Impact**: Users must navigate to separate analytics page
   - **Location**: Analytics service exists but not in pipeline UI
   - **Priority**: **P2 - MEDIUM**

3. **Forecasting in Pipeline**
   - **Gap**: Forecast exists but not shown in pipeline view
   - **Impact**: Cannot see forecasted revenue in pipeline
   - **Location**: Forecast service exists but not integrated
   - **Priority**: **P2 - MEDIUM**

4. **Pipeline vs Quota Comparison**
   - **Gap**: Pipeline and quota exist separately, no comparison
   - **Impact**: Cannot see pipeline value vs quota target
   - **Location**: Missing comparison component
   - **Priority**: **P1 - HIGH**

5. **Historical Pipeline Trends**
   - **Gap**: No historical pipeline snapshots
   - **Impact**: Cannot see how pipeline changes over time
   - **Location**: Missing historical tracking
   - **Priority**: **P2 - MEDIUM**

6. **Pipeline Filters**
   - **Gap**: Basic filters exist but limited (stage, account, risk level)
   - **Impact**: Cannot filter by date range, owner, team, etc.
   - **Location**: `PipelineFilters` type is limited
   - **Priority**: **P2 - MEDIUM**

### Implementation Recommendations

1. **Extend Pipeline View Service**
   ```typescript
   // apps/api/src/services/pipeline-view.service.ts
   async getTeamPipelineView(
     teamId: string,
     tenantId: string,
     viewType: PipelineViewType,
     filters?: PipelineFilters
   ): Promise<PipelineView>
   ```

2. **Add Pipeline Analytics Widget**
   ```
   apps/web/src/components/pipeline/pipeline-analytics-panel.tsx
   ```

3. **Create Pipeline vs Quota Component**
   ```
   apps/web/src/components/pipeline/pipeline-vs-quota.tsx
   ```

4. **Add Historical Tracking**
   ```typescript
   // apps/api/src/services/pipeline-history.service.ts
   - snapshotPipeline(userId: string, date: Date): Promise<PipelineSnapshot>
   - getPipelineHistory(userId: string, period: DateRange): Promise<PipelineSnapshot[]>
   ```

---

## 6. AI Insights Integration for Risk Analysis

### Current State

#### ✅ What Exists

1. **Core Integration**
   - ✅ `RiskEvaluationService` integrates with `InsightService` for AI-powered risk detection
   - ✅ `detectRisksByAI()` method uses `insightService.generate()` with comprehensive prompts
   - ✅ Multi-layered detection approach: Rule-based → Historical patterns → AI-powered
   - ✅ Structured response format for reliable parsing
   - ✅ Fallback parsing for natural language responses

2. **Context Assembly**
   - ✅ Includes numerical metrics (deal value, probability, days to close, activity gaps)
   - ✅ Includes related shards context (account, contacts, documents, notes, meetings)
   - ✅ Calculates time-based metrics (days to close, days since activity)
   - ✅ Includes opportunity structured data

3. **Vector Search Integration**
   - ✅ Historical pattern matching using `VectorSearchService`
   - ✅ Finds similar opportunities for pattern-based risk detection
   - ✅ Opportunity embedding template optimized for risk analysis
   - ✅ Uses quality model (`text-embedding-3-large`) for high precision

4. **AI Prompt Structure**
   - ✅ Comprehensive prompt covering financial, timeline, stage, and entity risks
   - ✅ Includes risk categories from catalog
   - ✅ Requests structured output with risk ID, category, confidence, explanation
   - ✅ Includes mitigation action recommendations

#### ❌ What's Missing

1. **Context Template Integration**
   - **Gap**: AI risk detection uses hardcoded prompt instead of context template system
   - **Impact**: Cannot leverage full RAG pipeline, relationship traversal, or customizable templates
   - **Location**: `apps/api/src/services/risk-evaluation.service.ts:472-498` - hardcoded prompt
   - **Current**: Manual context building in `detectRisksByAI()`
   - **Should Use**: `ContextTemplateService.assembleContext()` for better context assembly
   - **Priority**: **P1 - HIGH**

2. **Dedicated Risk Analysis Context Template**
   - **Gap**: No dedicated `c_contextTemplate` for risk analysis
   - **Impact**: Missing opportunity to customize risk analysis context per tenant/industry
   - **Location**: Missing in `apps/api/src/seed/context-templates.seed.ts`
   - **Priority**: **P1 - HIGH**

3. **Quota Context Integration**
   - **Gap**: Quota context is incomplete (placeholder note, not actual quota data)
   - **Impact**: AI cannot consider quota pressure when evaluating risks
   - **Location**: `apps/api/src/services/risk-evaluation.service.ts:424-436`
   - **Current**: `quotaContext = { ownerId, note: 'Quota information would be included...' }`
   - **Should Include**: Active quotas, quota attainment, quota pressure metrics
   - **Priority**: **P1 - HIGH**

4. **Risk-Specific System Prompts**
   - **Gap**: System has risk analysis prompts in `data/prompts/system-prompts.json` but not used
   - **Impact**: Missing optimized risk analysis system prompts
   - **Location**: Risk evaluation uses generic prompt instead of risk-specific system prompt
   - **Priority**: **P2 - MEDIUM**

5. **Relationship Traversal**
   - **Gap**: Manual related shards collection instead of using context template relationship traversal
   - **Impact**: May miss relevant shards or relationships
   - **Location**: `detectRisksByAI()` manually maps related shards
   - **Priority**: **P2 - MEDIUM**

6. **RAG Retrieval for Historical Context**
   - **Gap**: Not leveraging RAG retrieval for historical risk patterns
   - **Impact**: Missing opportunity to find similar risk scenarios from past opportunities
   - **Location**: Historical pattern matching exists but not integrated with AI context
   - **Priority**: **P2 - MEDIUM**

7. **AI Response Parsing Robustness**
   - **Gap**: Parsing has fallback but could be more robust with schema validation
   - **Impact**: May miss risks if AI response format varies
   - **Location**: `apps/api/src/services/risk-evaluation.service.ts:514-583`
   - **Priority**: **P2 - MEDIUM**

8. **Error Handling and Fallbacks**
   - **Gap**: AI detection failures are silent (returns empty array)
   - **Impact**: Users may not know AI analysis failed
   - **Location**: `detectRisksByAI()` catch block returns empty array
   - **Priority**: **P3 - LOW**

### Implementation Recommendations

1. **Create Risk Analysis Context Template**
   ```typescript
   // apps/api/src/seed/context-templates.seed.ts
   {
     name: 'risk_analysis_opportunity',
     displayName: 'Risk Analysis - Opportunity',
     templateType: 'risk_analysis',
     description: 'Comprehensive context for AI-powered risk analysis of opportunities',
     applicableShardTypes: ['c_opportunity'],
     prompt: `You are a risk analysis expert. Analyze this opportunity for potential risks.

Opportunity Context:
{{opportunity_data}}

Related Entities:
{{related_entities}}

Historical Patterns:
{{historical_patterns}}

Quota Context:
{{quota_context}}

Risk Categories to Consider: {{risk_categories}}

For each risk identified, provide:
- Risk ID (from catalog if matching)
- Risk category
- Confidence level (0-1)
- Explanation with specific numerical evidence
- Recommended mitigation actions

Format as structured JSON.`,
     relationships: {
       include: [
         'opportunity_for',      // Account
         'has_stakeholder',      // Contacts
         'has_document',         // Documents
         'has_note',             // Notes
         'has_meeting',          // Meetings
         'has_call',             // Calls
         'has_task',             // Tasks
         'has_competitor',       // Competitors
       ],
       maxDepth: 2,
       maxShards: 50,
     },
     ragConfig: {
       enabled: true,
       topK: 10,
       minScore: 0.3,
       searchShardTypes: ['c_opportunity'],
       filters: {
         status: ['closed_won', 'closed_lost'],
       },
     },
   }
   ```

2. **Integrate Context Template Service**
   ```typescript
   // apps/api/src/services/risk-evaluation.service.ts
   constructor(
     private monitoring: IMonitoringProvider,
     private shardRepository: ShardRepository,
     private shardTypeRepository: ShardTypeRepository,
     private relationshipService: ShardRelationshipService,
     private riskCatalogService: RiskCatalogService,
     private vectorSearchService?: VectorSearchService,
     private insightService?: InsightService,
     // ✅ ADD THESE:
     private contextTemplateService?: ContextTemplateService,
     private quotaService?: QuotaService
   ) {}
   
   // ⚠️ NOTE: Also need to update all RiskEvaluationService initializations:
   // - apps/api/src/routes/risk-analysis.routes.ts:56
   // - apps/api/src/routes/simulation.routes.ts:51
   // - apps/api/src/routes/index.ts:2710 (also fix missing shardTypeRepository bug)
   // - apps/api/src/routes/quotas.routes.ts:52 (also fix missing shardTypeRepository bug)
   
   private async detectRisksByAI(...) {
     if (!this.insightService || !this.contextTemplateService) {
       return [];
     }
     
     // Use context template for better context assembly
     const template = await this.contextTemplateService.selectTemplate(tenantId, {
       insightType: 'risk_analysis',
       shardTypeName: 'c_opportunity',
       scopeMode: 'shard',
     });
     
     const assembledContext = await this.contextTemplateService.assembleContext(
       opportunity.id,
       tenantId,
       {
         templateId: template?.id,
         includeRelated: true,
         includeRAG: true,
       }
     );
     
     // Get quota context if available
     let quotaContext = null;
     if (this.quotaService && opportunityData.ownerId) {
       const activeQuotas = await this.quotaService.listQuotas(tenantId, {
         quotaType: 'individual',
         targetUserId: opportunityData.ownerId,
       });
       
       const now = new Date();
       const currentQuota = activeQuotas.find(q => 
         now >= q.period.startDate && now <= q.period.endDate
       );
       
       if (currentQuota) {
         const performance = await this.quotaService.calculatePerformance(
           currentQuota.id,
           tenantId,
           opportunityData.ownerId
         );
         
         quotaContext = {
           target: currentQuota.target.amount,
           actual: performance.performance.actual,
           forecasted: performance.performance.forecasted,
           attainment: performance.performance.attainment,
           riskAdjustedAttainment: performance.performance.riskAdjustedAttainment,
           quotaPressure: calculateQuotaPressure(currentQuota, performance),
         };
       }
     }
     
     // Build enhanced prompt with assembled context
     const insightRequest = {
       tenantId,
       userId,
       query: `Analyze this opportunity for potential risks using the provided context.

${assembledContext.promptContent}

${quotaContext ? `Quota Context: ${JSON.stringify(quotaContext)}` : ''}

Identify specific risks from these categories: ${catalog.map(c => c.category).join(', ')}

For each risk identified, provide:
- Risk ID (from catalog if matching)
- Risk category
- Confidence level (0-1)
- Explanation with specific numerical evidence
- Recommended mitigation actions`,
       scope: {
         shardId: opportunity.id,
       },
       options: {
         format: 'structured' as const,
         includeReasoning: true,
         systemPromptId: 'risk-analysis', // Use risk-specific system prompt
         contextTemplateId: template?.id,
       },
     };
     
     const response = await this.insightService.generate(
       tenantId,
       userId,
       insightRequest
     );
     
     // ... rest of parsing logic
   }
   ```

3. **Add Quota Pressure Calculation**
   ```typescript
   // apps/api/src/services/risk-evaluation.service.ts
   private calculateQuotaPressure(
     quota: Quota,
     performance: QuotaPerformanceDetails
   ): 'high' | 'medium' | 'low' {
     const daysRemaining = Math.ceil(
       (quota.period.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
     );
     const daysElapsed = Math.ceil(
       (new Date().getTime() - quota.period.startDate.getTime()) / (1000 * 60 * 60 * 24)
     );
     const progress = daysElapsed / (daysElapsed + daysRemaining);
     const attainment = performance.performance.attainment / 100;
     
     // High pressure: behind schedule and low attainment
     if (attainment < progress * 0.8) return 'high';
     // Medium pressure: slightly behind
     if (attainment < progress * 0.95) return 'medium';
     return 'low';
   }
   ```

4. **Enhance AI Response Parsing**
   ```typescript
   // Use JSON schema validation for more robust parsing
   import Ajv from 'ajv';
   
   const riskResponseSchema = {
     type: 'object',
     properties: {
       risks: {
         type: 'array',
         items: {
           type: 'object',
           properties: {
             riskId: { type: 'string' },
             riskName: { type: 'string' },
             category: { type: 'string' },
             confidence: { type: 'number', minimum: 0, maximum: 1 },
             explanation: { type: 'string' },
             mitigationActions: { type: 'array', items: { type: 'string' } },
           },
           required: ['riskId', 'category', 'confidence'],
         },
       },
     },
     required: ['risks'],
   };
   
   const ajv = new Ajv();
   const validate = ajv.compile(riskResponseSchema);
   
   if (validate(parsedContent)) {
     // Process validated risks
   }
   ```

5. **Add Error Reporting**
   ```typescript
   // Track AI detection failures for monitoring
   catch (error: any) {
     this.monitoring.trackException(error, {
       operation: 'risk-evaluation.detectRisksByAI',
       tenantId,
       opportunityId: opportunity.id,
       errorType: 'ai_detection_failed',
     });
     
     // Return partial results with error indicator
     return [{
       riskId: 'ai_analysis_failed',
       riskName: 'AI Analysis Unavailable',
       category: 'Operational',
       confidence: 0,
       explainability: 'AI risk analysis could not be completed. Using rule-based detection only.',
       lifecycleState: 'identified',
     }];
   }
   ```

### Benefits of Enhanced Integration

1. **Better Context Assembly**
   - Leverages full relationship traversal
   - Includes RAG-retrieved historical patterns
   - Better token budgeting and prioritization

2. **Customizable Prompts**
   - Per-tenant customization
   - Industry-specific templates
   - A/B testing capabilities

3. **More Accurate Risk Detection**
   - Quota pressure context improves risk assessment
   - Historical patterns from RAG improve confidence
   - Better understanding of related entities

4. **Improved Performance**
   - Context template caching
   - Optimized context assembly
   - Better token usage

---

## 7. Risk Catalog

### Current State

#### ✅ What Exists

1. **Backend Service**
   - `RiskCatalogService` - Full CRUD operations
   - `getCatalog()` - Returns global, industry, and tenant-specific risks
   - `createCustomRisk()` - Create custom risks
   - `updateRisk()` - Update risk definitions
   - `deleteRisk()` - Delete tenant-specific risks
   - `duplicateRisk()` - Duplicate global/industry risks to tenant

2. **API Endpoints**
   - `GET /api/v1/risk-analysis/catalog` - Get catalog
   - `POST /api/v1/risk-analysis/catalog` - Create risk
   - `PUT /api/v1/risk-analysis/catalog/risks/:riskId` - Update risk
   - `DELETE /api/v1/risk-analysis/catalog/risks/:riskId` - Delete risk
   - `POST /api/v1/risk-analysis/catalog/risks/:riskId/duplicate` - Duplicate risk

3. **Frontend Components**
   - `/risk-analysis/catalog` - Risk catalog management page
   - `risk-catalog-form-dialog.tsx` - Create/edit risk form

4. **Data Model**
   - `RiskCatalog` - Full type definition with catalogType, category, detectionRules, etc.
   - Shard type: `c_risk_catalog` - Stored as shards in Cosmos DB

#### ❌ What's Missing

1. **Detection Rules UI**
   - **Gap**: Detection rules are JSON but no visual editor
   - **Impact**: Admins must write JSON manually
   - **Location**: `risk-catalog-form-dialog.tsx` - rules field is text/JSON
   - **Priority**: **P2 - MEDIUM**

2. **Risk Testing/Preview**
   - **Gap**: No way to test risk detection rules before saving
   - **Impact**: Cannot verify rules work correctly
   - **Location**: Missing test/preview functionality
   - **Priority**: **P2 - MEDIUM**

3. **Risk Usage Analytics**
   - **Gap**: Cannot see which risks are most commonly detected
   - **Impact**: Cannot optimize risk catalog
   - **Location**: Missing analytics endpoint
   - **Priority**: **P3 - LOW**

4. **Risk Templates**
   - **Gap**: No templates for common risk types
   - **Impact**: Admins must create risks from scratch
   - **Location**: Missing template library
   - **Priority**: **P3 - LOW**

5. **Industry Customization UI**
   - **Gap**: Industry risks exist but no UI to manage industry-specific risks
   - **Impact**: Must use API to manage industry risks
   - **Location**: Missing industry risk management UI
   - **Priority**: **P2 - MEDIUM**

6. **Risk Versioning**
   - **Gap**: Risks have version field but no version history
   - **Impact**: Cannot track changes or rollback
   - **Location**: Missing version history tracking
   - **Priority**: **P3 - LOW**

### Implementation Recommendations

1. **Create Detection Rules Editor**
   ```
   apps/web/src/components/risk-analysis/detection-rules-editor.tsx
   ```

2. **Add Risk Testing**
   ```typescript
   // apps/api/src/routes/risk-analysis.routes.ts
   POST /api/v1/risk-analysis/catalog/test-rule
   ```

3. **Add Risk Analytics**
   ```typescript
   // apps/api/src/services/risk-catalog.service.ts
   - getRiskUsageStats(riskId: string, tenantId: string): Promise<RiskUsageStats>
   - getCatalogAnalytics(tenantId: string): Promise<CatalogAnalytics>
   ```

4. **Create Risk Templates**
   ```
   apps/web/src/components/risk-analysis/risk-templates.tsx
   ```

5. **Create Risk Analysis Context Template**
   ```typescript
   // apps/api/src/seed/context-templates.seed.ts
   {
     name: 'risk_analysis_opportunity',
     templateType: 'risk_analysis',
     description: 'Comprehensive context for AI-powered risk analysis of opportunities',
     prompt: `Analyze this opportunity for potential risks...
     // Optimized prompt for risk detection
     `,
     applicableShardTypes: ['c_opportunity'],
     relationships: {
       include: ['opportunity_for', 'has_stakeholder', 'has_document', 'has_note', 'has_meeting'],
       maxDepth: 2,
     },
   }
   ```

6. **Integrate Context Template Service**
   ```typescript
   // apps/api/src/services/risk-evaluation.service.ts
   private async detectRisksByAI(...) {
     // Use ContextTemplateService to assemble context
     const template = await this.contextTemplateService.selectTemplate(tenantId, {
       insightType: 'risk_analysis',
       shardTypeName: 'c_opportunity',
       scopeMode: 'shard',
     });
     
     const assembledContext = await this.contextTemplateService.assembleContext(
       opportunity.id,
       tenantId,
       { templateId: template?.id }
     );
     
     // Use assembled context instead of manual context building
   }
   ```

7. **Add Quota Service Integration**
   ```typescript
   // apps/api/src/services/risk-evaluation.service.ts
   constructor(
     // ... existing params
     private quotaService?: QuotaService
   ) {}
   
   // In detectRisksByAI, get actual quota data
   if (this.quotaService && opportunityData.ownerId) {
     const quotas = await this.quotaService.listQuotas(tenantId, {
       quotaType: 'individual',
       targetUserId: opportunityData.ownerId,
     });
     quotaContext = {
       activeQuotas: quotas.filter(q => {
         const now = new Date();
         return now >= q.period.startDate && now <= q.period.endDate;
       }),
       quotaPressure: calculateQuotaPressure(quotas, opportunityData),
     };
   }
   ```

8. **Use Risk-Specific System Prompts**
   ```typescript
   // apps/api/src/services/risk-evaluation.service.ts
   const insightRequest = {
     // ... existing fields
     options: {
       format: 'structured' as const,
       includeReasoning: true,
       systemPromptId: 'risk-analysis', // Use risk-specific system prompt
     },
   };
   ```

---

## Priority Matrix

### P0 - CRITICAL (Must Have)

1. **Manager Role Detection & Team Access**
   - Manager cannot see team opportunities
   - Blocks core manager functionality
   - **Estimated Effort**: 3-5 days

2. **Team Opportunity Aggregation**
   - Required for manager dashboard
   - **Estimated Effort**: 2-3 days

### P1 - HIGH (Should Have)

1. **Manager Dashboard Page**
   - Unified view for managers
   - **Estimated Effort**: 5-7 days

2. **Historical Trends for Quota**
   - Daily/weekly trend calculations
   - **Estimated Effort**: 3-4 days

3. **Team Close Won/Lost**
   - Team-level aggregation
   - **Estimated Effort**: 2-3 days

4. **Close Won/Lost vs Quota Comparison**
   - Combined endpoint/component
   - **Estimated Effort**: 2-3 days

5. **Team Pipeline View**
   - Manager pipeline view
   - **Estimated Effort**: 3-4 days

6. **Risk Dashboard**
   - Standalone risk dashboard
   - **Estimated Effort**: 4-5 days

7. **Risk vs Quota Comparison**
   - Risk-adjusted quota view
   - **Estimated Effort**: 3-4 days

8. **Pipeline vs Quota Comparison**
   - Pipeline value vs quota
   - **Estimated Effort**: 2-3 days

9. **AI Insights Integration for Risk Analysis**
   - Context template integration
   - Quota context in AI analysis
   - Risk-specific prompts
   - **Estimated Effort**: 3-4 days

### P2 - MEDIUM (Nice to Have)

1. **Auto-Linking Configuration UI**
   - Admin configuration page
   - **Estimated Effort**: 3-4 days

2. **Risk Detection Rules Editor**
   - Visual rules editor
   - **Estimated Effort**: 5-7 days

3. **Pipeline Analytics Integration**
   - Analytics in pipeline view
   - **Estimated Effort**: 2-3 days

4. **Forecasting in Pipeline**
   - Forecast display
   - **Estimated Effort**: 2-3 days

5. **Risk Widgets for Dashboard**
   - Dashboard integration
   - **Estimated Effort**: 3-4 days

### P3 - LOW (Future Enhancement)

1. **Auto-Linking Performance Dashboard**
   - Monitoring UI
   - **Estimated Effort**: 2-3 days

2. **Risk Usage Analytics**
   - Risk catalog analytics
   - **Estimated Effort**: 2-3 days

3. **Risk Templates**
   - Template library
   - **Estimated Effort**: 3-4 days

---

## Implementation Roadmap

### Phase 1: Critical Manager Features (2-3 weeks)

1. **Week 1**
   - Implement manager role detection
   - Create team service
   - Extend opportunity service for team aggregation
   - Add team pipeline view

2. **Week 2**
   - Create manager dashboard page
   - Implement team close won/lost
   - Add team quota aggregation
   - Create manager API routes

3. **Week 3**
   - Integrate risk analysis into manager dashboard
   - Add revenue at risk vs quota comparison
   - Testing and refinement

### Phase 2: Historical Trends & Comparisons (1-2 weeks)

1. **Week 1**
   - Implement daily/weekly trend calculations
   - Add monthly/quarterly aggregations
   - Create comparison endpoints

2. **Week 2**
   - Build comparison UI components
   - Add forecast vs actual tracking
   - Testing

### Phase 3: Enhanced Features (2-3 weeks)

1. **Week 1**
   - Risk dashboard page
   - Risk widgets for main dashboard
   - Risk vs quota comparison
   - **AI Insights Integration** (Context templates, quota context, risk-specific prompts)

2. **Week 2**
   - Auto-linking configuration UI
   - Detection rules editor
   - Risk testing functionality

3. **Week 3**
   - Pipeline analytics integration
   - Forecasting in pipeline
   - Historical pipeline tracking

---

## Risk Assessment

### High Risk Items

1. **Team Structure Assumptions**
   - **Risk**: Current code assumes `teamId` in opportunity structuredData
   - **Mitigation**: Verify team structure, may need relationship-based lookup
   - **Impact**: Could require data migration

2. **Performance at Scale**
   - **Risk**: Team aggregation may be slow with large teams
   - **Mitigation**: Implement caching, pagination, and async processing
   - **Impact**: May need performance optimization

3. **Role-Based Access Complexity**
   - **Risk**: Manager role detection may be complex depending on user model
   - **Mitigation**: Review user/team relationship model first
   - **Impact**: Could require schema changes

### Medium Risk Items

1. **Historical Data Availability**
   - **Risk**: Historical trends require historical data
   - **Mitigation**: Start tracking now, backfill if possible
   - **Impact**: Trends may be limited initially

2. **Auto-Linking Accuracy**
   - **Risk**: False positives/negatives in auto-linking
   - **Mitigation**: Provide manual override, confidence thresholds
   - **Impact**: May need tuning

---

## Success Metrics

### Manager Dashboard
- ✅ Managers can view all team opportunities
- ✅ Managers can see team performance vs quota
- ✅ Managers can see team risk metrics
- ✅ Managers can drill down to individual team members

### Close Won/Lost vs Quota
- ✅ Historical trends available (daily/weekly/monthly)
- ✅ Team-level aggregation working
- ✅ Forecast vs actual comparison available
- ✅ Visualizations showing comparison

### Auto-Linking
- ✅ Configuration UI available
- ✅ All shard types covered
- ✅ Manual override available
- ✅ Performance monitoring in place

### Risk Analysis Dashboard
- ✅ Standalone dashboard page
- ✅ Integrated into main dashboard
- ✅ Manager-level aggregation
- ✅ Risk vs quota comparison

### Pipeline
- ✅ Team pipeline view available
- ✅ Analytics integrated
- ✅ Forecasting visible
- ✅ Pipeline vs quota comparison

### Risk Catalog
- ✅ Visual rules editor
- ✅ Risk testing available
- ✅ Usage analytics available
- ✅ Templates library available

### AI Insights Integration
- ✅ Risk analysis context template created
- ✅ Context template service integrated
- ✅ Quota context included in AI analysis
- ✅ Risk-specific system prompts used
- ✅ Robust AI response parsing

---

## Critical Bugs to Fix First

**⚠️ MUST FIX BEFORE ANY IMPLEMENTATION**:

1. **RiskEvaluationService Initialization Bug** (P0)
   - **File**: `apps/api/src/routes/index.ts:2710-2717`
   - **Issue**: Missing `shardTypeRepository` parameter
   - **Fix**: Add `shardTypeRepository` as 3rd parameter
   - **Impact**: Application will fail when risk evaluation is called

2. **RiskEvaluationService in Quotas Routes** (P0)
   - **File**: `apps/api/src/routes/quotas.routes.ts:52-59`
   - **Issue**: Same bug - missing `shardTypeRepository`
   - **Fix**: Add `shardTypeRepository` parameter

See [GAP_ANALYSIS_CRITICAL_ISSUES.md](./GAP_ANALYSIS_CRITICAL_ISSUES.md) for details.

---

## Conclusion

The codebase has a solid foundation with most core services implemented. However, **critical bugs and architectural questions must be resolved before implementing gaps**. The primary gaps are:

1. **Manager role-based access and team aggregation** - Critical for manager functionality
2. **Historical trends and time-series data** - Important for analytics
3. **Unified dashboard views** - Better user experience
4. **Comparison views** - Risk vs quota, pipeline vs quota, etc.
5. **Configuration UIs** - Better admin experience
6. **AI Insights Integration for Risk Analysis** - Currently functional but could be significantly improved with proper context template integration

### AI Insights Integration Status

**Current State**: ✅ **FUNCTIONAL BUT SUBOPTIMAL**

The risk analysis system **does integrate with AI insights** through `InsightService`, but there are opportunities to make it more efficient and powerful:

- ✅ AI-powered risk detection is working
- ✅ Uses structured format for parsing
- ✅ Includes numerical metrics and related shards
- ⚠️ Uses hardcoded prompt instead of context template system
- ⚠️ Manual context building instead of leveraging full RAG pipeline
- ⚠️ Incomplete quota context (placeholder only)
- ⚠️ Not using risk-specific system prompts

**Recommendation**: Enhance AI integration in Phase 3 to leverage the full context template system, which will provide:
- Better context assembly through relationship traversal
- RAG retrieval for historical patterns
- Customizable prompts per tenant/industry
- More accurate risk detection with quota pressure context

### Implementation Order

1. **First**: Fix critical bugs (P0) - 1 day
2. **Second**: Get answers to architectural questions - 1-2 days
3. **Third**: Update implementation plan based on answers
4. **Fourth**: Implement manager features (P0/P1) - 2-3 weeks
5. **Fifth**: Historical trends and comparisons - 1-2 weeks
6. **Sixth**: Enhanced AI integration and other features - 2-3 weeks

The implementation should prioritize manager features first, as they are critical for the core use case. Historical trends and comparisons can follow, with enhanced AI integration and other features coming last.

**⚠️ BLOCKED**: Implementation is blocked until:
- Critical bugs are fixed
- Architectural questions are answered
- Team structure is defined

**Estimated Total Effort**: 6-8 weeks for all P0 and P1 items (including AI insights integration improvements)  
**Estimated Blocked Time**: 1-2 days to resolve architectural questions

---

**Document Version**: 1.1  
**Last Updated**: 2025-01-28  
**Next Review**: After Phase 1 completion

---

## ⚠️ CRITICAL: Read This First

**Before implementing any gaps, you MUST:**

1. **Fix Critical Bugs** (See [GAP_ANALYSIS_CRITICAL_ISSUES.md](./GAP_ANALYSIS_CRITICAL_ISSUES.md))
   - Fix `RiskEvaluationService` initialization bugs (missing `shardTypeRepository`)
   - These will cause runtime failures

2. **Answer Architectural Questions** (See [GAP_ANALYSIS_CRITICAL_ISSUES.md](./GAP_ANALYSIS_CRITICAL_ISSUES.md))
   - Sales team structure and data model
   - Manager role identification
   - Team membership storage
   - Opportunity-team association

3. **Update Implementation Plan**
   - Based on answers to architectural questions
   - Adjust recommendations accordingly

**Without these, the application will not work correctly after implementing gaps.**

