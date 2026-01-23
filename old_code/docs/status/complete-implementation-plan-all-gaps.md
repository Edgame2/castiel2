# Complete Implementation Plan - All Gaps

**Date:** 2025-01-28  
**Status:** ✅ **READY FOR IMPLEMENTATION**  
**Estimated Time:** 14-16 weeks (3.5-4 months)

---

## 📋 Overview

This plan implements **ALL** gaps identified in the comprehensive gap analysis, including:
- Manager Dashboard & Team Management (with hierarchical teams & SSO)
- Close Won/Lost vs Quota (with historical trends)
- Automatic Shard Linking (with configuration UI)
- Risk Analysis Dashboard (standalone & integrated)
- Pipeline Enhancements (team view, analytics, forecasting)
- Risk Catalog Enhancements (UI improvements)
- AI Insights Integration (context templates, quota context)

---

## 🚨 Phase 0: Critical Bug Fixes (P0) - 30 minutes

**Priority**: Must fix before any other work

### 0.1 Fix RiskEvaluationService Initialization

**Files**:
- `apps/api/src/routes/index.ts:2710-2717`
- `apps/api/src/routes/quotas.routes.ts:52-59`

**Fix**:
```typescript
// Add shardTypeRepository as 3rd parameter
const riskEvaluationService = new RiskEvaluationService(
  monitoring,
  shardRepository,
  shardTypeRepository,  // ✅ ADD THIS
  relationshipService,
  riskCatalogService,
  vectorSearchService,
  insightService
);
```

**Testing**: Verify risk evaluation works after fix

---

## 📅 Phase 1: Foundation - Teams & Manager Role (2 weeks)

### Week 1: Core Team Infrastructure

#### 1.1 Create c_userTeams Shard Type (1 day)

**File**: `apps/api/src/types/core-shard-types.ts`

**Fields**:
```typescript
const userTeamsFields: RichFieldDefinition[] = [
  { name: 'name', type: RichFieldType.TEXT, required: true },
  { name: 'manager', type: RichFieldType.JSON, required: true }, // {userId, lastname, firstname, email}
  { name: 'members', type: RichFieldType.JSON }, // Array of {userId, lastname, firstname, email, role, function}
  { name: 'parentTeamId', type: RichFieldType.SHARD, config: { shardTypeId: 'c_userTeams' } },
  { name: 'externalId', type: RichFieldType.TEXT }, // SSO group ID
  { name: 'externalSource', type: RichFieldType.SELECT }, // azure_ad, okta, google, manual
  { name: 'syncEnabled', type: RichFieldType.BOOLEAN },
  { name: 'isManuallyEdited', type: RichFieldType.BOOLEAN, readOnly: true },
  { name: 'syncedAt', type: RichFieldType.DATETIME, readOnly: true },
];
```

**Tasks**:
- [ ] Add `USER_TEAMS: 'c_userTeams'` to `CORE_SHARD_TYPE_NAMES`
- [ ] Define `userTeamsFields` array
- [ ] Create `USER_TEAMS_SHARD_TYPE` definition
- [ ] Add to `CORE_SHARD_TYPES` export
- [ ] Seed in `CoreTypesSeederService`

#### 1.2 Add MANAGER Role (0.5 day)

**File**: `packages/shared-types/src/roles.ts`

**Tasks**:
- [ ] Add `MANAGER = 'manager'` to `UserRole` enum
- [ ] Add `TEAMS`, `OPPORTUNITIES`, `QUOTAS` permissions to `SYSTEM_PERMISSIONS`
- [ ] Add `MANAGER` permissions to `RolePermissions`
- [ ] Update permission checking logic

#### 1.3 Create Team Service (2 days)

**File**: `apps/api/src/services/team.service.ts`

**Methods**:
```typescript
// CRUD
- getTeam(teamId, tenantId)
- getTeams(tenantId, filters?)
- createTeam(input, tenantId, userId)
- updateTeam(teamId, input, tenantId, userId)
- deleteTeam(teamId, tenantId, userId)

// Hierarchy
- getParentTeam(teamId, tenantId)
- getChildTeams(teamId, tenantId)
- getAllDescendantTeams(teamId, tenantId) // Recursive
- getAllAncestorTeams(teamId, tenantId) // Recursive
- validateTeamHierarchy(teamId, parentTeamId, tenantId) // Prevent circular

// Membership
- getTeamMembers(teamId, tenantId)
- getTeamManager(teamId, tenantId)
- getTeamUserIds(teamId, tenantId) // Manager + all members

// User Queries
- getManagerTeams(userId, tenantId)
- getUserTeams(userId, tenantId)
- getTeamForUser(userId, tenantId)

// Validation
- isUserManagerOfTeam(userId, teamId, tenantId)
- isUserMemberOfTeam(userId, teamId, tenantId)

// Bulk Operations
- bulkDeleteTeams(teamIds, tenantId, userId)
- bulkAssignManager(teamIds, managerId, tenantId, userId)
- bulkAddMembers(teamIds, memberIds, tenantId, userId)
- bulkRemoveMembers(teamIds, memberIds, tenantId, userId)
- bulkEnableSync(teamIds, enabled, tenantId, userId)
- exportTeams(tenantId, format: 'csv' | 'json')
- importTeams(tenantId, data, format, userId)
```

**File**: `apps/api/src/types/team.types.ts`

**Types**:
```typescript
export interface TeamManager { userId, lastname, firstname, email }
export interface TeamMember { userId, lastname, firstname, email, role, function }
export interface CreateTeamInput { name, manager, members?, parentTeamId?, externalId?, externalSource?, syncEnabled? }
export interface UpdateTeamInput { name?, manager?, members?, parentTeamId?, syncEnabled? }
export interface TeamFilters { managerId?, parentTeamId?, externalSource?, syncEnabled?, isManuallyEdited? }
```

**Tasks**:
- [ ] Create TeamService with all methods
- [ ] Implement hierarchy relationships using `internal_relationships`
- [ ] Implement validation (circular hierarchy, user exists, etc.)
- [ ] Implement bulk operations
- [ ] Implement export/import (CSV/JSON)

#### 1.4 Create Team API Routes (1 day)

**File**: `apps/api/src/routes/teams.routes.ts`

**Endpoints**:
```typescript
GET    /api/v1/teams                    // List teams
GET    /api/v1/teams/:teamId            // Get team
POST   /api/v1/teams                    // Create team
PUT    /api/v1/teams/:teamId            // Update team
DELETE /api/v1/teams/:teamId            // Delete team
GET    /api/v1/teams/:teamId/hierarchy // Get hierarchy
GET    /api/v1/teams/:teamId/members    // Get members
POST   /api/v1/teams/:teamId/members   // Add members
DELETE /api/v1/teams/:teamId/members    // Remove members
POST   /api/v1/teams/bulk/delete        // Bulk delete
POST   /api/v1/teams/bulk/assign-manager
POST   /api/v1/teams/bulk/add-members
POST   /api/v1/teams/bulk/remove-members
POST   /api/v1/teams/bulk/enable-sync
GET    /api/v1/teams/export?format=csv|json
POST   /api/v1/teams/import
POST   /api/v1/teams/:teamId/sync       // Manual SSO sync
POST   /api/v1/teams/sync/all           // Sync all teams
```

**Tasks**:
- [ ] Create routes file
- [ ] Add authentication/authorization (tenant admin only for create/update/delete)
- [ ] Add validation middleware
- [ ] Register routes in main router

### Week 2: SSO Integration

#### 1.5 Create SSO Team Sync Service (2 days)

**File**: `apps/api/src/services/sso-team-sync.service.ts`

**Methods**:
```typescript
- syncTeamsFromSSO(tenantId, integrationId, userId?)
- syncTeamFromSSO(teamId, tenantId, integrationId)
- syncTeamsOnLogin(userId, tenantId, ssoGroups)
- getTeamSyncConfig(tenantId, integrationId)
- updateTeamSyncConfig(tenantId, integrationId, config)
- fetchTeamsFromAdapter(adapter, config)
- mapSSOTeamToUserTeam(ssoTeam, config)
```

**Integration Configuration**:
```typescript
// In IntegrationDocument.syncConfig
teamSync?: {
  enabled: boolean;
  entityMappings: {
    groupId: string;
    groupName: string;
    managerId: string;
    parentGroupId?: string;
    memberRole?: string;
    memberFunction?: string;
    [key: string]: any; // Support custom objects
  };
  fieldMappings: {
    name: string;
    manager: Record<string, string>;
    members: Record<string, string>;
    parentTeamId?: string;
    [key: string]: any; // Support custom objects
  };
};
```

**Tasks**:
- [ ] Create SSOTeamSyncService
- [ ] Add teamSync config to IntegrationDocument type
- [ ] Implement sync logic (initial + periodic + on login)
- [ ] Handle conflict resolution (update existing, preserve manual edits)
- [ ] Mark manually edited teams (skip SSO sync)

#### 1.6 Update Integration Adapters (1.5 days)

**Files**:
- `apps/api/src/integrations/adapters/microsoft-graph.adapter.ts`
- `apps/api/src/integrations/adapters/okta.adapter.ts` (create if needed)
- `apps/api/src/integrations/adapters/google-workspace.adapter.ts` (create if needed)

**Tasks**:
- [ ] Add `fetchTeams()` method to IntegrationAdapter interface
- [ ] Implement for Microsoft Graph (Azure AD groups)
- [ ] Implement for Okta (Okta groups)
- [ ] Implement for Google Workspace (Google groups)
- [ ] Support hierarchy (parent groups)
- [ ] Support custom field mapping

#### 1.7 Update SSO Login Handlers (0.5 day)

**Files**:
- `apps/api/src/controllers/sso.controller.ts`
- `apps/api/src/controllers/azure-ad-b2c.controller.ts`

**Tasks**:
- [ ] Extract group IDs from SSO token
- [ ] Call `SSOTeamSyncService.syncTeamsOnLogin()`
- [ ] Create/update team memberships on login

#### 1.8 Create Scheduled Sync Function (0.5 day)

**File**: `apps/functions/src/sync/team-sync-worker.ts`

**Tasks**:
- [ ] Create Azure Function (timer-triggered)
- [ ] Query all tenants with SSO enabled
- [ ] Call `SSOTeamSyncService.syncTeamsFromSSO()` for each
- [ ] Handle errors and retries

---

## 📅 Phase 2: Manager Dashboard & Team Aggregation (2 weeks)

### Week 3: Opportunity Service Updates

#### 2.1 Update Opportunity Service (1.5 days)

**File**: `apps/api/src/services/opportunity.service.ts`

**New Methods**:
```typescript
async listTeamOpportunities(
  teamId: string,
  tenantId: string,
  userId: string,
  filters?: OpportunityFilters
): Promise<OpportunityListResult>

async listManagerOpportunities(
  managerId: string,
  tenantId: string,
  userId: string,
  view: 'my-team' | 'all-teams' = 'my-team',
  filters?: OpportunityFilters
): Promise<OpportunityListResult>

async listAllTeamOpportunities(
  teamId: string,
  tenantId: string,
  userId: string,
  includeSubTeams: boolean = false,
  filters?: OpportunityFilters
): Promise<OpportunityListResult>
```

**Update Existing**:
```typescript
// Update listOwnedOpportunities() to check MANAGER role
// If manager, include team opportunities based on view parameter
```

**Tasks**:
- [ ] Add new methods
- [ ] Update `listOwnedOpportunities()` with manager role check
- [ ] Implement team aggregation logic
- [ ] Implement hierarchy traversal (for all-teams view)
- [ ] Add validation and error handling

#### 2.2 Add ownerIds Filter Support (0.5 day)

**File**: `apps/api/src/repositories/shard.repository.ts`

**Tasks**:
- [ ] Add `ownerIds?: string[]` to `ShardFilter`
- [ ] Implement query filter for ownerIds array
- [ ] Test with Cosmos DB IN clause or ARRAY_CONTAINS

#### 2.3 Update Opportunity Routes (0.5 day)

**File**: `apps/api/src/routes/opportunity.routes.ts`

**New Endpoints**:
```typescript
GET /api/v1/opportunities/manager?view=my-team|all-teams
GET /api/v1/opportunities/team/:teamId?includeSubTeams=true|false
```

**Tasks**:
- [ ] Add manager opportunities endpoint
- [ ] Add team opportunities endpoint
- [ ] Add query parameter validation
- [ ] Add authorization checks (manager role)

### Week 4: Manager Dashboard Service & Routes

#### 2.4 Create Manager Dashboard Service (1.5 days)

**File**: `apps/api/src/services/manager-dashboard.service.ts`

**Methods**:
```typescript
async getManagerDashboard(
  managerId: string,
  tenantId: string,
  view: 'my-team' | 'all-teams' = 'my-team'
): Promise<ManagerDashboard>

async getTeamPerformance(
  teamId: string,
  tenantId: string,
  period?: DateRange
): Promise<TeamPerformance>

async getTeamMemberPerformance(
  teamId: string,
  memberId: string,
  tenantId: string
): Promise<MemberPerformance>
```

**ManagerDashboard Type**:
```typescript
interface ManagerDashboard {
  // Team Overview
  teams: TeamSummary[];
  totalTeamMembers: number;
  
  // Opportunities
  opportunities: {
    total: number;
    totalValue: number;
    expectedRevenue: number;
    revenueAtRisk: number;
    byStage: StageSummary[];
  };
  
  // Quotas
  quotas: {
    teamQuota?: QuotaPerformance;
    individualQuotas: QuotaPerformance[];
    totalTarget: number;
    totalActual: number;
    totalForecasted: number;
    totalRiskAdjusted: number;
    attainment: number;
  };
  
  // Risk Metrics
  risk: {
    totalRevenueAtRisk: number;
    highRiskOpportunities: number;
    mediumRiskOpportunities: number;
    lowRiskOpportunities: number;
    riskDistribution: RiskDistribution;
  };
  
  // Close Won/Lost
  closedWonLost: {
    won: { count: number; value: number };
    lost: { count: number; value: number };
    winRate: number;
  };
  
  // Team Members
  teamMembers: TeamMemberSummary[];
}
```

**Tasks**:
- [ ] Create ManagerDashboardService
- [ ] Aggregate data from multiple services
- [ ] Implement caching for performance
- [ ] Add error handling

#### 2.5 Create Manager Routes (0.5 day)

**File**: `apps/api/src/routes/manager.routes.ts`

**Endpoints**:
```typescript
GET /api/v1/manager/dashboard?view=my-team|all-teams
GET /api/v1/manager/teams/:teamId/opportunities
GET /api/v1/manager/teams/:teamId/performance
GET /api/v1/manager/teams/:teamId/members/:memberId/performance
```

**Tasks**:
- [ ] Create routes file
- [ ] Add authentication (require MANAGER role)
- [ ] Register routes

#### 2.6 Implement Audit Logging (1 day)

**File**: `apps/api/src/services/team-audit.service.ts`

**Methods**:
```typescript
- logTeamCreate(teamId, teamName, tenantId, userId)
- logTeamUpdate(teamId, teamName, changes, tenantId, userId)
- logTeamDelete(teamId, teamName, tenantId, userId)
- logMemberAdd(teamId, memberIds, tenantId, userId)
- logMemberRemove(teamId, memberIds, tenantId, userId)
- logManagerChange(teamId, from, to, tenantId, userId)
- logSSOSync(teamId, result, tenantId, syncedBy)
```

**Tasks**:
- [ ] Create TeamAuditService
- [ ] Integrate with existing `AuditLogService`
- [ ] Log all team operations (create, edit, delete, member changes)
- [ ] Log SSO sync operations
- [ ] Add to TeamService operations

---

## 📅 Phase 3: Close Won/Lost vs Quota Enhancements (1.5 weeks)

### Week 5: Historical Trends & Team Aggregation

#### 3.1 Implement Historical Trends (2 days)

**File**: `apps/api/src/services/quota.service.ts`

**New Method**:
```typescript
private async calculateTrends(
  quota: Quota,
  opportunities: Shard[],
  period: Quota['period']
): Promise<{ daily: TrendPoint[]; weekly: TrendPoint[] }>
```

**TrendPoint Type**:
```typescript
interface TrendPoint {
  date: Date;
  actual: number;
  forecasted: number;
  riskAdjusted: number;
  attainment: number;
  opportunityCount: number;
}
```

**Tasks**:
- [ ] Implement daily trend calculation (snapshot each day)
- [ ] Implement weekly trend calculation (aggregate by week)
- [ ] Store trend data (consider caching or separate collection)
- [ ] Update `calculatePerformance()` to include trends
- [ ] Add date range filtering

#### 3.2 Add Team Close Won/Lost (1 day)

**File**: `apps/api/src/services/pipeline-analytics.service.ts`

**New Method**:
```typescript
async calculateTeamClosedWonLost(
  teamId: string,
  tenantId: string,
  period: { startDate: Date; endDate: Date }
): Promise<TeamClosedWonMetrics>
```

**TeamClosedWonMetrics Type**:
```typescript
interface TeamClosedWonMetrics {
  teamId: string;
  teamName: string;
  period: DateRange;
  won: {
    count: number;
    value: number;
    byMember: Array<{ userId: string; count: number; value: number }>;
  };
  lost: {
    count: number;
    value: number;
    byMember: Array<{ userId: string; count: number; value: number }>;
    byReason: Record<string, number>;
  };
  winRate: number;
  totalOpportunities: number;
}
```

**Tasks**:
- [ ] Add method to PipelineAnalyticsService
- [ ] Get team user IDs from TeamService
- [ ] Aggregate close won/lost for all team members
- [ ] Calculate win rate
- [ ] Group by member and reason

#### 3.3 Create Comparison Endpoint (0.5 day)

**File**: `apps/api/src/routes/quota.routes.ts`

**New Endpoint**:
```typescript
GET /api/v1/quotas/:quotaId/performance-vs-closed
```

**Response**:
```typescript
interface QuotaVsClosedPerformance {
  quota: QuotaPerformanceDetails;
  closedWonLost: ClosedWonMetrics;
  comparison: {
    actualVsWon: number; // Difference
    forecastedVsWon: number;
    riskAdjustedVsWon: number;
    attainmentVsWinRate: number;
  };
}
```

**Tasks**:
- [ ] Create endpoint
- [ ] Get quota performance
- [ ] Get close won/lost for same period
- [ ] Calculate comparisons
- [ ] Return combined response

#### 3.4 Add Time-Series Aggregation (1 day)

**File**: `apps/api/src/services/quota-analytics.service.ts` (new)

**Methods**:
```typescript
async getMonthlyPerformance(
  quotaId: string,
  tenantId: string
): Promise<MonthlyPerformance[]>

async getQuarterlyPerformance(
  quotaId: string,
  tenantId: string
): Promise<QuarterlyPerformance[]>

async getForecastAccuracy(
  quotaId: string,
  tenantId: string,
  period: DateRange
): Promise<ForecastAccuracy>
```

**Tasks**:
- [ ] Create QuotaAnalyticsService
- [ ] Implement monthly aggregation
- [ ] Implement quarterly aggregation
- [ ] Implement forecast vs actual comparison
- [ ] Add routes for new endpoints

### Week 6: Comparison Views & Visualizations

#### 3.5 Create Comparison Components (1 day)

**Files**:
- `apps/web/src/components/quota/quota-vs-closed-comparison.tsx`
- `apps/web/src/components/quota/historical-trends-chart.tsx`

**Tasks**:
- [ ] Create comparison chart component
- [ ] Create historical trends chart
- [ ] Add to quota dashboard page
- [ ] Add date range selector

---

## 📅 Phase 4: Pipeline Enhancements (1 week)

### Week 7: Team Pipeline & Analytics

#### 4.1 Extend Pipeline View Service (1 day)

**File**: `apps/api/src/services/pipeline-view.service.ts`

**New Method**:
```typescript
async getTeamPipelineView(
  teamId: string,
  tenantId: string,
  viewType: PipelineViewType,
  filters?: PipelineFilters,
  includeSubTeams?: boolean
): Promise<PipelineView>
```

**Tasks**:
- [ ] Add team pipeline method
- [ ] Get team user IDs from TeamService
- [ ] Filter opportunities by team user IDs
- [ ] Support hierarchy (includeSubTeams)
- [ ] Calculate team summary metrics

#### 4.2 Add Pipeline Analytics Integration (1 day)

**File**: `apps/web/src/components/pipeline/pipeline-analytics-panel.tsx`

**Features**:
- Win rate by stage
- Average deal size by stage
- Time in stage
- Conversion rates
- Risk distribution

**Tasks**:
- [ ] Create analytics panel component
- [ ] Integrate with PipelineAnalyticsService
- [ ] Add to pipeline page
- [ ] Add filters and date range

#### 4.3 Create Pipeline vs Quota Component (1 day)

**File**: `apps/web/src/components/pipeline/pipeline-vs-quota.tsx`

**Features**:
- Pipeline value vs quota target
- Expected revenue vs quota
- Risk-adjusted pipeline vs quota
- Gap analysis

**Tasks**:
- [ ] Create comparison component
- [ ] Get pipeline metrics
- [ ] Get quota for user/team
- [ ] Calculate gaps
- [ ] Visualize comparison

#### 4.4 Add Historical Pipeline Tracking (1 day)

**File**: `apps/api/src/services/pipeline-history.service.ts` (new)

**Methods**:
```typescript
async snapshotPipeline(
  userId: string,
  tenantId: string,
  date: Date
): Promise<PipelineSnapshot>

async getPipelineHistory(
  userId: string,
  tenantId: string,
  period: DateRange
): Promise<PipelineSnapshot[]>
```

**PipelineSnapshot Type**:
```typescript
interface PipelineSnapshot {
  userId: string;
  tenantId: string;
  snapshotDate: Date;
  totalValue: number;
  expectedRevenue: number;
  revenueAtRisk: number;
  opportunityCount: number;
  byStage: Record<string, { count: number; value: number }>;
}
```

**Tasks**:
- [ ] Create PipelineHistoryService
- [ ] Implement snapshot creation
- [ ] Store snapshots (consider separate collection)
- [ ] Implement history retrieval
- [ ] Add scheduled snapshot job (daily)

#### 4.5 Enhance Pipeline Filters (0.5 day)

**File**: `apps/api/src/types/pipeline.types.ts`

**Update PipelineFilters**:
```typescript
interface PipelineFilters {
  stage?: string[];
  accountId?: string;
  riskLevel?: 'high' | 'medium' | 'low';
  // Add:
  dateRange?: { startDate: Date; endDate: Date };
  ownerIds?: string[];
  teamId?: string;
  minValue?: number;
  maxValue?: number;
  probabilityRange?: { min: number; max: number };
}
```

**Tasks**:
- [ ] Extend PipelineFilters type
- [ ] Update PipelineViewService to support new filters
- [ ] Update frontend filter UI

---

## 📅 Phase 5: Risk Analysis Dashboard (1.5 weeks)

### Week 8: Standalone Risk Dashboard

#### 5.1 Create Risk Dashboard Service (1 day)

**File**: `apps/api/src/services/risk-dashboard.service.ts` (new)

**Methods**:
```typescript
async getRiskDashboard(
  userId: string,
  tenantId: string,
  scope: 'user' | 'team' | 'tenant',
  scopeId?: string
): Promise<RiskDashboard>

async getRiskTrends(
  opportunityId: string,
  period: DateRange
): Promise<RiskTrend[]>

async getPortfolioRiskTrends(
  userId: string,
  period: DateRange
): Promise<RiskTrend[]>
```

**RiskDashboard Type**:
```typescript
interface RiskDashboard {
  overview: {
    totalRevenueAtRisk: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    averageRiskScore: number;
  };
  byCategory: Record<string, { count: number; revenueAtRisk: number }>;
  topRisks: DetectedRisk[];
  earlyWarnings: EarlyWarning[];
  trends: RiskTrend[];
}
```

**Tasks**:
- [ ] Create RiskDashboardService
- [ ] Aggregate risk data from multiple sources
- [ ] Calculate trends
- [ ] Add caching

#### 5.2 Create Risk Dashboard Page (1.5 days)

**File**: `apps/web/src/app/(protected)/risk-analysis/dashboard/page.tsx`

**Features**:
- Risk overview cards
- Risk distribution charts
- Top risks list
- Early warnings panel
- Risk trends chart
- Filter by category, severity, date range

**Tasks**:
- [ ] Create dashboard page
- [ ] Add overview cards
- [ ] Add charts (distribution, trends)
- [ ] Add filters
- [ ] Add drill-down to opportunity details

#### 5.3 Create Risk vs Quota Component (1 day)

**File**: `apps/web/src/components/risk-analysis/risk-vs-quota-comparison.tsx`

**Features**:
- Quota target vs actual
- Risk-adjusted quota attainment
- Revenue at risk vs quota gap
- Risk impact on quota

**Tasks**:
- [ ] Create comparison component
- [ ] Get quota performance
- [ ] Get revenue at risk
- [ ] Calculate risk-adjusted metrics
- [ ] Visualize comparison

### Week 9: Risk Widgets & Manager Aggregation

#### 5.4 Add Risk Widgets to Dashboard (1 day)

**Files**:
- `apps/web/src/components/dashboard/widgets/risk-overview-widget.tsx`
- `apps/web/src/components/dashboard/widgets/risk-alerts-widget.tsx`
- `apps/web/src/components/dashboard/widgets/revenue-at-risk-widget.tsx`

**Tasks**:
- [ ] Create risk overview widget
- [ ] Create risk alerts widget
- [ ] Create revenue at risk widget
- [ ] Add to dashboard widget library
- [ ] Make configurable (user can add/remove)

#### 5.5 Add Manager Risk Aggregation (1 day)

**File**: `apps/api/src/services/manager-dashboard.service.ts`

**Update**:
- Add risk aggregation to `getManagerDashboard()`
- Aggregate team risk metrics
- Include risk distribution by team member

**Tasks**:
- [ ] Add risk metrics to ManagerDashboard type
- [ ] Aggregate team risk in service
- [ ] Update manager dashboard UI to show risk

#### 5.6 Create Risk Alerts Dashboard (0.5 day)

**File**: `apps/web/src/app/(protected)/risk-analysis/alerts/page.tsx`

**Features**:
- List all early warnings
- Filter by severity, category, team
- Group by opportunity
- Action items

**Tasks**:
- [ ] Create alerts page
- [ ] Aggregate early warnings
- [ ] Add filters
- [ ] Add action buttons

---

## 📅 Phase 6: AI Insights Integration for Risk Analysis (1 week)

### Week 10: Context Template Integration

#### 6.1 Create Risk Analysis Context Template (1 day)

**File**: `apps/api/src/seed/context-templates.seed.ts`

**Template**:
```typescript
{
  name: 'risk_analysis_opportunity',
  displayName: 'Risk Analysis - Opportunity',
  templateType: 'risk_analysis',
  description: 'Comprehensive context for AI-powered risk analysis',
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

Risk Categories: {{risk_categories}}

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

**Tasks**:
- [ ] Create context template seed
- [ ] Add to seed function
- [ ] Test template selection

#### 6.2 Integrate Context Template Service (1.5 days)

**File**: `apps/api/src/services/risk-evaluation.service.ts`

**Update Constructor**:
```typescript
constructor(
  // ... existing params
  private contextTemplateService?: ContextTemplateService,
  private quotaService?: QuotaService
) {}
```

**Update detectRisksByAI()**:
```typescript
// Use context template instead of manual context building
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

// Get quota context
if (this.quotaService && opportunityData.ownerId) {
  const activeQuotas = await this.quotaService.listQuotas(tenantId, {
    quotaType: 'individual',
    targetUserId: opportunityData.ownerId,
  });
  
  const currentQuota = activeQuotas.find(q => {
    const now = new Date();
    return now >= q.period.startDate && now <= q.period.endDate;
  });
  
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
```

**Update All Initializations**:
- `apps/api/src/routes/risk-analysis.routes.ts:56`
- `apps/api/src/routes/simulation.routes.ts:51`
- `apps/api/src/routes/index.ts:2710` (also fix missing shardTypeRepository)
- `apps/api/src/routes/quotas.routes.ts:52` (also fix missing shardTypeRepository)

**Tasks**:
- [ ] Add ContextTemplateService and QuotaService to constructor
- [ ] Update detectRisksByAI() to use context template
- [ ] Implement quota context retrieval
- [ ] Add quota pressure calculation
- [ ] Update all RiskEvaluationService initializations
- [ ] Test with context template

#### 6.3 Add Quota Pressure Calculation (0.5 day)

**File**: `apps/api/src/services/risk-evaluation.service.ts`

**Method**:
```typescript
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
  
  if (attainment < progress * 0.8) return 'high';
  if (attainment < progress * 0.95) return 'medium';
  return 'low';
}
```

**Tasks**:
- [ ] Implement quota pressure calculation
- [ ] Add to quota context
- [ ] Test calculation logic

#### 6.4 Enhance AI Response Parsing (1 day)

**File**: `apps/api/src/services/risk-evaluation.service.ts`

**Improvements**:
- Use JSON schema validation (Ajv)
- Better error handling
- Track parsing failures
- Return partial results with error indicator

**Tasks**:
- [ ] Add Ajv schema validation
- [ ] Create risk response schema
- [ ] Validate AI responses
- [ ] Improve error handling
- [ ] Add monitoring for parsing failures

#### 6.5 Use Risk-Specific System Prompts (0.5 day)

**File**: `apps/api/src/services/risk-evaluation.service.ts`

**Update**:
```typescript
const insightRequest = {
  // ... existing fields
  options: {
    format: 'structured' as const,
    includeReasoning: true,
    systemPromptId: 'risk-analysis', // Use risk-specific system prompt
    contextTemplateId: template?.id,
  },
};
```

**Tasks**:
- [ ] Verify risk-analysis system prompt exists in `data/prompts/system-prompts.json`
- [ ] Update insight request to use systemPromptId
- [ ] Test with risk-specific prompt

---

## 📅 Phase 7: Automatic Shard Linking Enhancements (1 week)

### Week 11: Configuration & Coverage

#### 7.1 Create Auto-Linking Configuration Service (1 day)

**File**: `apps/api/src/services/auto-linking-config.service.ts` (new)

**Methods**:
```typescript
async getConfig(tenantId: string): Promise<AutoLinkingConfig>
async updateConfig(tenantId: string, config: AutoLinkingConfig, userId: string): Promise<void>
```

**AutoLinkingConfig Type**:
```typescript
interface AutoLinkingConfig {
  enabled: boolean;
  confidenceThreshold: number; // Default 0.5
  timeWindowDays: number; // Default 30
  rules: {
    contentOverlap: { enabled: boolean; weight: number };
    metadataOverlap: { enabled: boolean; weight: number };
    temporalOverlap: { enabled: boolean; weight: number; windowDays: number };
    accountBased: { enabled: boolean; weight: number };
  };
  shardTypeCoverage: Record<string, { enabled: boolean; relationshipType: string }>;
}
```

**Tasks**:
- [ ] Create AutoLinkingConfigService
- [ ] Store config in tenant settings or separate collection
- [ ] Add CRUD operations
- [ ] Add validation

#### 7.2 Create Auto-Linking Admin UI (1.5 days)

**File**: `apps/web/src/app/(protected)/admin/auto-linking/page.tsx`

**Features**:
- Enable/disable auto-linking
- Configure confidence threshold
- Configure time windows
- Configure rule weights
- Configure shard type coverage
- Test configuration

**Tasks**:
- [ ] Create admin page
- [ ] Add configuration form
- [ ] Add test/preview functionality
- [ ] Add save/load configuration

#### 7.3 Extend Shard Type Coverage (1 day)

**File**: `apps/api/src/services/opportunity-auto-linking.service.ts`

**Update getRelationshipType()**:
```typescript
private getRelationshipType(shardTypeId: string): string {
  const mapping: Record<string, string> = {
    'c_document': 'has_document',
    'c_note': 'has_note',
    'c_task': 'has_task',
    'c_meeting': 'has_meeting',
    'c_call': 'has_call',
    'c_email': 'has_email',
    'c_contact': 'has_stakeholder',
    'c_account': 'opportunity_for',
    'c_project': 'belongs_to',
    // Add all shard types
    // ... more mappings
  };
  
  return mapping[shardTypeId] || 'related_to'; // Fallback
}
```

**Tasks**:
- [ ] Review all shard types
- [ ] Add mappings for all types
- [ ] Add fallback relationship type
- [ ] Test with all shard types

#### 7.4 Add Batch Processing (1 day)

**File**: `apps/api/src/routes/auto-linking.routes.ts` (new)

**Endpoints**:
```typescript
POST /api/v1/auto-linking/batch-process
  Body: { shardTypeId?, dateRange?, limit? }
  
POST /api/v1/auto-linking/reprocess/:shardId

GET /api/v1/auto-linking/stats
```

**Tasks**:
- [ ] Create routes file
- [ ] Add batch processing endpoint
- [ ] Add reprocess endpoint
- [ ] Add stats endpoint
- [ ] Implement batch processing logic
- [ ] Add progress tracking

#### 7.5 Add Manual Override UI (0.5 day)

**File**: `apps/web/src/components/opportunities/manual-linking-controls.tsx`

**Features**:
- Manually link shard to opportunity
- Unlink shard from opportunity
- Trigger re-linking for shard
- View linking confidence

**Tasks**:
- [ ] Create manual linking component
- [ ] Add to opportunity detail page
- [ ] Add to shard detail page
- [ ] Add API endpoints for manual operations

---

## 📅 Phase 8: Risk Catalog Enhancements (1 week)

### Week 12: UI Improvements

#### 8.1 Create Detection Rules Editor (2 days)

**File**: `apps/web/src/components/risk-analysis/detection-rules-editor.tsx`

**Features**:
- Visual rule builder (no JSON editing)
- Condition builder (field, operator, value)
- Rule groups (AND/OR)
- Rule testing/preview
- Save/load rules

**Tasks**:
- [ ] Create visual rule editor component
- [ ] Support condition building
- [ ] Support rule groups
- [ ] Add test/preview functionality
- [ ] Integrate with risk catalog form

#### 8.2 Add Risk Testing Functionality (1 day)

**File**: `apps/api/src/routes/risk-analysis.routes.ts`

**New Endpoint**:
```typescript
POST /api/v1/risk-analysis/catalog/test-rule
  Body: { rule: DetectionRule, opportunityId: string }
  Returns: { matches: boolean, explanation: string }
```

**Tasks**:
- [ ] Add test endpoint
- [ ] Implement rule evaluation
- [ ] Return match result and explanation
- [ ] Add test button to risk catalog form

#### 8.3 Add Risk Usage Analytics (1 day)

**File**: `apps/api/src/services/risk-catalog.service.ts`

**New Methods**:
```typescript
async getRiskUsageStats(
  riskId: string,
  tenantId: string,
  period?: DateRange
): Promise<RiskUsageStats>

async getCatalogAnalytics(
  tenantId: string
): Promise<CatalogAnalytics>
```

**Tasks**:
- [ ] Add usage stats method
- [ ] Query risk snapshots for usage
- [ ] Calculate detection frequency
- [ ] Add analytics endpoint
- [ ] Create analytics UI component

#### 8.4 Create Risk Templates (1 day)

**File**: `apps/web/src/components/risk-analysis/risk-templates.tsx`

**Features**:
- Template library
- Common risk templates (price, competition, timing, etc.)
- Apply template to create risk
- Customize template

**Tasks**:
- [ ] Create template library (hardcoded or stored)
- [ ] Create template component
- [ ] Add apply template functionality
- [ ] Add to risk catalog page

#### 8.5 Add Industry Risk Management UI (1 day)

**File**: `apps/web/src/app/(protected)/risk-analysis/catalog/industry/page.tsx`

**Features**:
- List industry-specific risks
- Create industry risk
- Edit industry risk (if allowed)
- Assign risks to industries

**Tasks**:
- [ ] Create industry risk management page
- [ ] Add industry filter to risk catalog
- [ ] Add industry assignment UI
- [ ] Add permissions check

---

## 📅 Phase 9: Frontend - Manager Dashboard & Team UI (2 weeks)

### Week 13: Manager Dashboard Pages

#### 9.1 Create Manager Dashboard Page (2 days)

**File**: `apps/web/src/app/(protected)/manager/dashboard/page.tsx`

**Features**:
- Toggle view (My Team / All Teams) - server-side filtering
- Team overview cards
- Team opportunities list
- Team quotas view
- Team risk metrics
- Team close won/lost
- Team member list with drill-down

**Tasks**:
- [ ] Create dashboard page
- [ ] Add view toggle (query parameter)
- [ ] Add overview cards
- [ ] Add opportunities section
- [ ] Add quotas section
- [ ] Add risk section
- [ ] Add team members section
- [ ] Add filters and date range

#### 9.2 Create Team List Page (1 day)

**File**: `apps/web/src/app/(protected)/teams/page.tsx`

**Features**:
- List all teams
- Filter by manager, parent team, source
- Toggle between flat and hierarchy view
- SSO sync status indicator
- Bulk operations UI
- Export/import buttons

**Tasks**:
- [ ] Create team list page
- [ ] Add filters
- [ ] Add hierarchy toggle
- [ ] Add sync status indicators
- [ ] Add bulk operation buttons
- [ ] Add export/import UI

#### 9.3 Create Team Detail/Edit Page (1.5 days)

**File**: `apps/web/src/app/(protected)/teams/[id]/page.tsx`

**Features**:
- View team details
- Edit team (tenant admin only)
- Add/remove members
- Change manager
- Change parent team
- Enable/disable SSO sync
- View sync history (from audit log)
- Manual sync button

**Tasks**:
- [ ] Create team detail page
- [ ] Add edit form
- [ ] Add member management
- [ ] Add manager assignment
- [ ] Add parent team selector
- [ ] Add SSO sync controls
- [ ] Add audit log viewer

#### 9.4 Create Team Creation Page (0.5 day)

**File**: `apps/web/src/app/(protected)/teams/new/page.tsx`

**Tasks**:
- [ ] Create team creation form
- [ ] Add manager selector
- [ ] Add member selector
- [ ] Add parent team selector (optional)
- [ ] Add validation

### Week 14: Team Hierarchy & Additional Components

#### 9.5 Create Team Hierarchy View (1 day)

**File**: `apps/web/src/components/teams/team-hierarchy-tree.tsx`

**Features**:
- Tree visualization
- Expand/collapse nodes
- Click to navigate to team
- Show manager and member count
- Drag-and-drop to change hierarchy (optional)

**Tasks**:
- [ ] Create tree component
- [ ] Implement hierarchy rendering
- [ ] Add expand/collapse
- [ ] Add navigation
- [ ] Add team info display

#### 9.6 Update Pipeline Page for Teams (1 day)

**File**: `apps/web/src/app/(protected)/pipeline/page.tsx`

**Updates**:
- Add team filter
- Add manager view toggle
- Show team pipeline when manager

**Tasks**:
- [ ] Add team filter dropdown
- [ ] Add manager view toggle
- [ ] Update API calls for team pipeline
- [ ] Update summary cards for team

#### 9.7 Update Quota Dashboard for Teams (1 day)

**File**: `apps/web/src/app/(protected)/quotas/page.tsx`

**Updates**:
- Add team quota view
- Add team member quota aggregation
- Add team vs quota comparison

**Tasks**:
- [ ] Add team filter
- [ ] Add team quota aggregation
- [ ] Add comparison views
- [ ] Update charts for team data

---

## 📅 Phase 10: Testing & Refinement (1.5 weeks)

### Week 15: Unit & Integration Tests

#### 10.1 Unit Tests (2 days)

**Files**:
- `apps/api/src/services/__tests__/team.service.test.ts`
- `apps/api/src/services/__tests__/sso-team-sync.service.test.ts`
- `apps/api/src/services/__tests__/manager-dashboard.service.test.ts`
- `apps/api/src/services/__tests__/quota.service.test.ts` (update)
- `apps/api/src/services/__tests__/pipeline-analytics.service.test.ts` (update)
- `apps/api/src/services/__tests__/risk-evaluation.service.test.ts` (update)

**Tasks**:
- [ ] Write unit tests for all new services
- [ ] Test hierarchy logic
- [ ] Test SSO sync logic
- [ ] Test validation logic
- [ ] Test aggregation logic

#### 10.2 Integration Tests (2 days)

**Files**:
- `tests/integration/teams.test.ts`
- `tests/integration/sso-team-sync.test.ts`
- `tests/integration/manager-dashboard.test.ts`
- `tests/integration/team-opportunities.test.ts`
- `tests/integration/quota-trends.test.ts`

**Tasks**:
- [ ] Write integration tests
- [ ] Test end-to-end flows
- [ ] Test API endpoints
- [ ] Test SSO integration
- [ ] Test hierarchy queries

#### 10.3 Manual Testing (1 day)

**Checklist**:
- [ ] Create team manually
- [ ] Edit team
- [ ] Delete team
- [ ] Add/remove members
- [ ] Change manager
- [ ] Change parent team
- [ ] SSO sync (Azure AD, Okta, Google)
- [ ] Manager dashboard (My Team / All Teams toggle)
- [ ] Team opportunity filtering
- [ ] Team quota aggregation
- [ ] Team risk metrics
- [ ] Bulk operations
- [ ] Export/import
- [ ] Audit logging
- [ ] Validation (circular hierarchy, etc.)
- [ ] Historical trends
- [ ] Close won/lost vs quota
- [ ] Pipeline team view
- [ ] Risk dashboard
- [ ] Auto-linking configuration
- [ ] AI insights integration

### Week 16: Performance Optimization & Documentation

#### 10.4 Performance Optimization (1 day)

**Areas**:
- Team hierarchy queries (caching)
- Opportunity aggregation (pagination, indexing)
- SSO sync (batch processing)
- Dashboard data loading (caching, parallel requests)

**Tasks**:
- [ ] Add caching for team queries
- [ ] Optimize hierarchy queries
- [ ] Add pagination where needed
- [ ] Add database indexes
- [ ] Optimize dashboard data loading

#### 10.5 Documentation (1 day)

**Files**:
- `docs/features/teams/README.md`
- `docs/features/teams/SSO_INTEGRATION.md`
- `docs/features/manager-dashboard/README.md`
- `docs/features/auto-linking/CONFIGURATION.md`

**Tasks**:
- [ ] Create team management documentation
- [ ] Create SSO integration guide
- [ ] Create manager dashboard guide
- [ ] Update API documentation
- [ ] Create user guides

---

## 📊 Implementation Summary

### Total Estimated Time: 14-16 weeks (3.5-4 months)

### Phase Breakdown:
- **Phase 0**: Critical Bugs (0.5 day)
- **Phase 1**: Foundation - Teams & Manager Role (2 weeks)
- **Phase 2**: Manager Dashboard & Team Aggregation (2 weeks)
- **Phase 3**: Close Won/Lost vs Quota (1.5 weeks)
- **Phase 4**: Pipeline Enhancements (1 week)
- **Phase 5**: Risk Analysis Dashboard (1.5 weeks)
- **Phase 6**: AI Insights Integration (1 week)
- **Phase 7**: Auto-Linking Enhancements (1 week)
- **Phase 8**: Risk Catalog Enhancements (1 week)
- **Phase 9**: Frontend - Manager Dashboard & Team UI (2 weeks)
- **Phase 10**: Testing & Refinement (1.5 weeks)

### Priority Breakdown:
- **P0 (Critical)**: 2.5 weeks
- **P1 (High)**: 8 weeks
- **P2 (Medium)**: 3 weeks
- **P3 (Low)**: 0.5 weeks

---

## ✅ Success Criteria

### Manager Dashboard
- [x] Managers can view all team opportunities (My Team / All Teams toggle)
- [x] Managers can see team performance vs quota
- [x] Managers can see team risk metrics
- [x] Managers can drill down to individual team members
- [x] Hierarchical teams supported (unlimited depth)
- [x] SSO auto-sync working (Azure AD, Okta, Google)

### Close Won/Lost vs Quota
- [x] Historical trends available (daily/weekly/monthly)
- [x] Team-level aggregation working
- [x] Forecast vs actual comparison available
- [x] Visualizations showing comparison

### Auto-Linking
- [x] Configuration UI available
- [x] All shard types covered
- [x] Manual override available
- [x] Batch processing available

### Risk Analysis Dashboard
- [x] Standalone dashboard page
- [x] Integrated into main dashboard (widgets)
- [x] Manager-level aggregation
- [x] Risk vs quota comparison

### Pipeline
- [x] Team pipeline view available
- [x] Analytics integrated
- [x] Pipeline vs quota comparison
- [x] Historical tracking

### Risk Catalog
- [x] Visual rules editor
- [x] Risk testing available
- [x] Usage analytics available
- [x] Templates library available

### AI Insights Integration
- [x] Risk analysis context template created
- [x] Context template service integrated
- [x] Quota context included in AI analysis
- [x] Risk-specific system prompts used
- [x] Robust AI response parsing

---

## 🎯 Implementation Order

1. **Phase 0**: Fix critical bugs (MUST DO FIRST)
2. **Phase 1**: Foundation (teams, manager role, SSO)
3. **Phase 2**: Manager dashboard (core functionality)
4. **Phase 3**: Close won/lost vs quota (analytics)
5. **Phase 4**: Pipeline enhancements
6. **Phase 5**: Risk dashboard
7. **Phase 6**: AI insights integration
8. **Phase 7**: Auto-linking enhancements
9. **Phase 8**: Risk catalog enhancements
10. **Phase 9**: Frontend UI
11. **Phase 10**: Testing & refinement

---

## 📝 Notes

- All fields go in `structuredData` (confirmed)
- Use `internal_relationships` for hierarchy (confirmed)
- Use existing `AuditLogService` (confirmed)
- Support custom objects in integration config (confirmed)
- Server-side filtering for manager dashboard (confirmed)
- Default view: "My Team" (confirmed)

---

**Status**: ✅ **READY TO START IMPLEMENTATION**

**Next Step**: Begin with Phase 0 (Critical Bug Fixes)

