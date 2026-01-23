# Complete Implementation Plan - All Gaps

**Date:** 2025-01-28  
**Status:** ✅ **READY FOR IMPLEMENTATION**  
**Estimated Time:** 12-14 days

---

## ✅ All Questions Answered

All architectural and implementation questions have been answered. Ready to proceed with full implementation.

---

## 📋 Implementation Phases

### Phase 1: Critical Bug Fixes (P0) - 30 minutes

**Priority**: Must fix before any other work

#### 1.1 Fix RiskEvaluationService Initialization

**Files**:
- `apps/api/src/routes/index.ts:2710-2717`
- `apps/api/src/routes/quotas.routes.ts:52-59`

**Fix**:
```typescript
// BEFORE (WRONG)
const riskEvaluationService = new RiskEvaluationService(
  monitoring,
  shardRepository,
  relationshipService,  // ❌ WRONG
  riskCatalogService,
  vectorSearchService,
  insightService
);

// AFTER (CORRECT)
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

### Phase 2: Create c_userTeams Shard Type (1 day)

#### 2.1 Add to Core Shard Types

**File**: `apps/api/src/types/core-shard-types.ts`

**Steps**:
1. Add `USER_TEAMS: 'c_userTeams'` to `CORE_SHARD_TYPE_NAMES`
2. Define `userTeamsFields` array with all fields
3. Create `USER_TEAMS_SHARD_TYPE` definition
4. Add to `CORE_SHARD_TYPES` export array

**Field Definitions**:
```typescript
const userTeamsFields: RichFieldDefinition[] = [
  {
    name: 'name',
    label: 'Team Name',
    type: RichFieldType.TEXT,
    required: true,
    config: { maxLength: 200 },
    design: { columns: 12 },
  },
  {
    name: 'manager',
    label: 'Manager',
    type: RichFieldType.JSON,
    required: true,
    config: {
      schema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          lastname: { type: 'string' },
          firstname: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['userId', 'email'],
      },
    },
    design: { columns: 12 },
  },
  {
    name: 'members',
    label: 'Team Members',
    type: RichFieldType.JSON,
    required: false,
    config: {
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            lastname: { type: 'string' },
            firstname: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            function: { type: 'string' },
          },
          required: ['userId', 'email'],
        },
      },
    },
    design: { columns: 12 },
  },
  {
    name: 'parentTeamId',
    label: 'Parent Team',
    type: RichFieldType.SHARD,
    config: { shardTypeId: 'c_userTeams' },
    design: { columns: 6 },
  },
  {
    name: 'externalId',
    label: 'External ID (SSO)',
    type: RichFieldType.TEXT,
    config: { maxLength: 200, readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'externalSource',
    label: 'External Source',
    type: RichFieldType.SELECT,
    config: {
      options: [
        { value: 'azure_ad', label: 'Azure AD' },
        { value: 'okta', label: 'Okta' },
        { value: 'google', label: 'Google Workspace' },
        { value: 'manual', label: 'Manual' },
      ],
    },
    design: { columns: 6 },
  },
  {
    name: 'syncEnabled',
    label: 'SSO Sync Enabled',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', default: true },
    design: { columns: 6 },
  },
  {
    name: 'isManuallyEdited',
    label: 'Manually Edited',
    type: RichFieldType.BOOLEAN,
    config: { displayAs: 'switch', readOnly: true },
    design: { columns: 6 },
  },
  {
    name: 'syncedAt',
    label: 'Last Synced',
    type: RichFieldType.DATETIME,
    config: { readOnly: true },
    design: { columns: 6 },
  },
];
```

#### 2.2 Seed Shard Type

**File**: `apps/api/src/services/core-types-seeder.service.ts`

**Steps**:
1. Add `USER_TEAMS_SHARD_TYPE` to seed list
2. Ensure it's created on tenant setup

---

### Phase 3: Add MANAGER Role (0.5 day)

#### 3.1 Update UserRole Enum

**File**: `packages/shared-types/src/roles.ts`

**Changes**:
```typescript
export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    USER = 'user',
    MANAGER = 'manager',  // ✅ ADD
    GUEST = 'guest',
}
```

#### 3.2 Add MANAGER Permissions

**File**: `packages/shared-types/src/roles.ts`

**Add to SYSTEM_PERMISSIONS**:
```typescript
export const SYSTEM_PERMISSIONS = {
    // ... existing
    TEAMS: {
        READ: 'team:read:own',
        READ_MEMBERS: 'team:read:members',
        UPDATE: 'team:update:own',
        READ_ALL: 'team:read:all',  // For tenant admin
    },
    OPPORTUNITIES: {
        READ_TEAM: 'opportunity:read:team',
        UPDATE_TEAM: 'opportunity:update:team',
    },
    QUOTAS: {
        READ_TEAM: 'quota:read:team',
    },
} as const;
```

**Add to RolePermissions**:
```typescript
[UserRole.MANAGER]: [
    ...ShardTypeRolePermissions[UserRole.USER],
    'shard:create:own',
    'shard:read:team',
    'shard:update:team',
    'shard:delete:own',
    'user:read:own',
    'user:update:own',
    'team:read:own',
    'team:read:members',
    'opportunity:read:team',
    'quota:read:team',
    'integration:read:tenant',
    'integration:search:tenant',
],
```

---

### Phase 4: Create Team Service (2 days)

#### 4.1 Create Team Service

**File**: `apps/api/src/services/team.service.ts`

**Methods**:
```typescript
export class TeamService {
  // Basic CRUD
  async getTeam(teamId: string, tenantId: string): Promise<Shard | null>
  async getTeams(tenantId: string, filters?: TeamFilters): Promise<Shard[]>
  async createTeam(input: CreateTeamInput, tenantId: string, userId: string): Promise<Shard>
  async updateTeam(teamId: string, input: UpdateTeamInput, tenantId: string, userId: string): Promise<Shard>
  async deleteTeam(teamId: string, tenantId: string, userId: string): Promise<void>
  
  // Hierarchy
  async getParentTeam(teamId: string, tenantId: string): Promise<Shard | null>
  async getChildTeams(teamId: string, tenantId: string): Promise<Shard[]>
  async getAllDescendantTeams(teamId: string, tenantId: string): Promise<Shard[]>
  async getAllAncestorTeams(teamId: string, tenantId: string): Promise<Shard[]>
  
  // Membership
  async getTeamMembers(teamId: string, tenantId: string): Promise<TeamMember[]>
  async getTeamManager(teamId: string, tenantId: string): Promise<TeamManager | null>
  async getTeamUserIds(teamId: string, tenantId: string): Promise<string[]>
  
  // User Queries
  async getManagerTeams(userId: string, tenantId: string): Promise<Shard[]>
  async getUserTeams(userId: string, tenantId: string): Promise<Shard[]>
  async getTeamForUser(userId: string, tenantId: string): Promise<Shard | null>
  
  // Validation
  async isUserManagerOfTeam(userId: string, teamId: string, tenantId: string): Promise<boolean>
  async isUserMemberOfTeam(userId: string, teamId: string, tenantId: string): Promise<boolean>
  async validateTeamHierarchy(teamId: string, parentTeamId: string | null, tenantId: string): Promise<boolean>
  
  // Bulk Operations
  async bulkDeleteTeams(teamIds: string[], tenantId: string, userId: string): Promise<BulkOperationResult>
  async bulkAssignManager(teamIds: string[], managerId: string, tenantId: string, userId: string): Promise<BulkOperationResult>
  async bulkAddMembers(teamIds: string[], memberIds: string[], tenantId: string, userId: string): Promise<BulkOperationResult>
  async bulkRemoveMembers(teamIds: string[], memberIds: string[], tenantId: string, userId: string): Promise<BulkOperationResult>
  async bulkEnableSync(teamIds: string[], enabled: boolean, tenantId: string, userId: string): Promise<BulkOperationResult>
  async exportTeams(tenantId: string, format: 'csv' | 'json'): Promise<string>
  async importTeams(tenantId: string, data: string, format: 'csv' | 'json', userId: string): Promise<ImportResult>
}
```

#### 4.2 Create Team Types

**File**: `apps/api/src/types/team.types.ts`

**Types**:
```typescript
export interface TeamManager {
  userId: string;
  lastname: string;
  firstname: string;
  email: string;
}

export interface TeamMember {
  userId: string;
  lastname: string;
  firstname: string;
  email: string;
  role: string;
  function: string;
}

export interface CreateTeamInput {
  name: string;
  manager: TeamManager;
  members?: TeamMember[];
  parentTeamId?: string;
  externalId?: string;
  externalSource?: 'azure_ad' | 'okta' | 'google' | 'manual';
  syncEnabled?: boolean;
}

export interface UpdateTeamInput {
  name?: string;
  manager?: TeamManager;
  members?: TeamMember[];
  parentTeamId?: string;
  syncEnabled?: boolean;
}

export interface TeamFilters {
  managerId?: string;
  parentTeamId?: string;
  externalSource?: string;
  syncEnabled?: boolean;
  isManuallyEdited?: boolean;
}
```

#### 4.3 Implement Hierarchy Relationships

**Implementation**:
- Store `parentTeamId` in `structuredData` (primary reference)
- Create `internal_relationships` with types:
  - `has_parent_team` (from child to parent)
  - `has_child_team` (from parent to child) - bidirectional
- Use `ShardRelationshipService` to manage relationships

---

### Phase 5: Create SSO Team Sync Service (2 days)

#### 5.1 Create SSOTeamSyncService

**File**: `apps/api/src/services/sso-team-sync.service.ts`

**Methods**:
```typescript
export class SSOTeamSyncService {
  // Sync Methods
  async syncTeamsFromSSO(tenantId: string, integrationId: string, userId?: string): Promise<SyncResult>
  async syncTeamFromSSO(teamId: string, tenantId: string, integrationId: string): Promise<SyncResult>
  async syncTeamsOnLogin(userId: string, tenantId: string, ssoGroups: string[]): Promise<void>
  
  // Configuration
  async getTeamSyncConfig(tenantId: string, integrationId: string): Promise<TeamSyncConfig | null>
  async updateTeamSyncConfig(tenantId: string, integrationId: string, config: TeamSyncConfig): Promise<void>
  
  // Adapter Integration
  private async fetchTeamsFromAdapter(adapter: IntegrationAdapter, config: TeamSyncConfig): Promise<SSOTeam[]>
  private async mapSSOTeamToUserTeam(ssoTeam: SSOTeam, config: TeamSyncConfig): Promise<CreateTeamInput>
}
```

#### 5.2 Integration Adapter Configuration

**File**: `apps/api/src/types/integration.types.ts`

**Add to IntegrationDocument**:
```typescript
syncConfig?: {
  // ... existing fields
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
};
```

#### 5.3 Update Integration Adapters

**Files**:
- `apps/api/src/integrations/adapters/microsoft-graph.adapter.ts`
- `apps/api/src/integrations/adapters/okta.adapter.ts` (create if needed)
- `apps/api/src/integrations/adapters/google-workspace.adapter.ts` (create if needed)

**Add Methods**:
```typescript
// In IntegrationAdapter interface
fetchTeams?(config: TeamSyncConfig): Promise<SSOTeam[]>;
```

#### 5.4 Update SSO Login Handlers

**Files**:
- `apps/api/src/controllers/sso.controller.ts`
- `apps/api/src/controllers/azure-ad-b2c.controller.ts`

**Add Logic**:
- Extract group IDs from SSO token
- Call `SSOTeamSyncService.syncTeamsOnLogin()`
- Create/update team memberships

#### 5.5 Create Scheduled Sync Function

**File**: `apps/functions/src/sync/team-sync-worker.ts`

**Implementation**:
- Azure Function triggered by timer
- Calls `SSOTeamSyncService.syncTeamsFromSSO()` for all tenants with SSO enabled
- Runs on schedule (configurable per tenant)

---

### Phase 6: Update Opportunity Service (1.5 days)

#### 6.1 Add Team Methods

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

#### 6.2 Update listOwnedOpportunities

**Changes**:
- Check if user has MANAGER role
- If manager, include team opportunities based on view parameter
- Use `TeamService` to get team user IDs

#### 6.3 Add ownerIds Filter Support

**File**: `apps/api/src/repositories/shard.repository.ts`

**Add Filter**:
```typescript
ownerIds?: string[]; // Array of user IDs to filter by
```

**Query Implementation**:
```typescript
if (filter.ownerIds && filter.ownerIds.length > 0) {
  // Use IN clause or ARRAY_CONTAINS for Cosmos DB
  query += ' AND ARRAY_CONTAINS(@ownerIds, c.structuredData.ownerId)';
  parameters.push({ name: '@ownerIds', value: filter.ownerIds });
}
```

---

### Phase 7: Create Team API Routes (1 day)

#### 7.1 Create Team Routes

**File**: `apps/api/src/routes/teams.routes.ts`

**Endpoints**:
```typescript
// List teams
GET /api/v1/teams
  - Query params: managerId, parentTeamId, externalSource, syncEnabled
  - Returns: TeamListResult

// Get team
GET /api/v1/teams/:teamId
  - Returns: Team

// Create team
POST /api/v1/teams
  - Body: CreateTeamInput
  - Returns: Team

// Update team
PUT /api/v1/teams/:teamId
  - Body: UpdateTeamInput
  - Returns: Team

// Delete team
DELETE /api/v1/teams/:teamId
  - Returns: void

// Get team hierarchy
GET /api/v1/teams/:teamId/hierarchy
  - Returns: { parent: Team | null, children: Team[] }

// Get team members
GET /api/v1/teams/:teamId/members
  - Returns: TeamMember[]

// Add members
POST /api/v1/teams/:teamId/members
  - Body: { members: TeamMember[] }
  - Returns: Team

// Remove members
DELETE /api/v1/teams/:teamId/members
  - Body: { memberIds: string[] }
  - Returns: Team

// Bulk operations
POST /api/v1/teams/bulk/delete
POST /api/v1/teams/bulk/assign-manager
POST /api/v1/teams/bulk/add-members
POST /api/v1/teams/bulk/remove-members
POST /api/v1/teams/bulk/enable-sync

// Export/Import
GET /api/v1/teams/export?format=csv|json
POST /api/v1/teams/import
  - Body: { data: string, format: 'csv' | 'json' }

// SSO Sync
POST /api/v1/teams/:teamId/sync
POST /api/v1/teams/sync/all
```

#### 7.2 Update Opportunity Routes

**File**: `apps/api/src/routes/opportunity.routes.ts`

**Add Endpoints**:
```typescript
// Manager opportunities
GET /api/v1/opportunities/manager
  - Query params: view=my-team|all-teams, filters
  - Returns: OpportunityListResult

// Team opportunities
GET /api/v1/opportunities/team/:teamId
  - Query params: includeSubTeams, filters
  - Returns: OpportunityListResult
```

---

### Phase 8: Implement Audit Logging (1 day)

#### 8.1 Create Team Audit Helper

**File**: `apps/api/src/services/team-audit.service.ts`

**Methods**:
```typescript
export class TeamAuditService {
  async logTeamCreate(teamId: string, teamName: string, tenantId: string, userId: string): Promise<void>
  async logTeamUpdate(teamId: string, teamName: string, changes: TeamChanges, tenantId: string, userId: string): Promise<void>
  async logTeamDelete(teamId: string, teamName: string, tenantId: string, userId: string): Promise<void>
  async logMemberAdd(teamId: string, memberIds: string[], tenantId: string, userId: string): Promise<void>
  async logMemberRemove(teamId: string, memberIds: string[], tenantId: string, userId: string): Promise<void>
  async logManagerChange(teamId: string, from: string, to: string, tenantId: string, userId: string): Promise<void>
  async logSSOSync(teamId: string, result: SyncResult, tenantId: string, syncedBy: string): Promise<void>
}
```

#### 8.2 Integrate with AuditLogService

**Usage**:
```typescript
await auditLogService.log({
  tenantId,
  category: 'TEAM',
  eventType: 'TEAM_CREATE',
  outcome: 'SUCCESS',
  actorId: userId,
  targetId: teamId,
  targetType: 'c_userTeams',
  targetName: teamName,
  message: `Team "${teamName}" created`,
  details: { teamId, managerId, memberCount },
});
```

---

### Phase 9: Create Frontend Components (2 days)

#### 9.1 Team List Page

**File**: `apps/web/src/app/(protected)/teams/page.tsx`

**Features**:
- List all teams
- Filter by manager, parent team, source
- Toggle between flat and hierarchy view
- SSO sync status indicator
- Bulk operations UI

#### 9.2 Team Detail/Edit Page

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

#### 9.3 Team Creation Page

**File**: `apps/web/src/app/(protected)/teams/new/page.tsx`

**Features**:
- Create new team form
- Select manager
- Add members
- Select parent team (optional)
- Mark as manual

#### 9.4 Team Hierarchy View

**File**: `apps/web/src/components/teams/team-hierarchy-tree.tsx`

**Features**:
- Tree visualization
- Expand/collapse nodes
- Click to navigate to team
- Show manager and member count

#### 9.5 Manager Dashboard Updates

**Files**:
- `apps/web/src/app/(protected)/dashboard/page.tsx`
- `apps/web/src/components/dashboard/manager-dashboard.tsx`

**Features**:
- Toggle view (My Team / All Teams)
- Team opportunity list
- Team quota view
- Team risk metrics
- Team performance metrics

---

### Phase 10: Update Quota Service (1 day)

#### 10.1 Add Team Quota Methods

**File**: `apps/api/src/services/quota.service.ts`

**Update**:
- `getQuotaOpportunities()` - Support team quotas
- `calculatePerformance()` - Support team aggregation
- Add `getTeamQuotas()` method

---

### Phase 11: Testing (1.5 days)

#### 11.1 Unit Tests

**Files**:
- `apps/api/src/services/__tests__/team.service.test.ts`
- `apps/api/src/services/__tests__/sso-team-sync.service.test.ts`
- `apps/api/src/services/__tests__/opportunity.service.test.ts` (update)

#### 11.2 Integration Tests

**Files**:
- `tests/integration/teams.test.ts`
- `tests/integration/sso-team-sync.test.ts`
- `tests/integration/manager-dashboard.test.ts`

#### 11.3 Manual Testing

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
- [ ] Bulk operations
- [ ] Export/import
- [ ] Audit logging
- [ ] Validation (circular hierarchy, etc.)

---

## 📋 Implementation Checklist

### Critical Bugs
- [ ] Fix RiskEvaluationService initialization (2 locations)

### Core Implementation
- [ ] Create c_userTeams shard type
- [ ] Add MANAGER role
- [ ] Create TeamService
- [ ] Create SSOTeamSyncService
- [ ] Update OpportunityService
- [ ] Create Team API routes
- [ ] Implement audit logging
- [ ] Create frontend components
- [ ] Update QuotaService

### SSO Integration
- [ ] Update Microsoft Graph adapter
- [ ] Create/update Okta adapter
- [ ] Create/update Google Workspace adapter
- [ ] Update SSO login handlers
- [ ] Create scheduled sync function

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

---

## 🎯 Success Criteria

1. ✅ Teams can be created manually and via SSO
2. ✅ Teams support unlimited hierarchy depth
3. ✅ Managers can view team opportunities (My Team / All Teams toggle)
4. ✅ SSO sync works for Azure AD, Okta, Google Workspace
5. ✅ Tenant admins can edit teams in UI
6. ✅ All operations are audited
7. ✅ Validation prevents circular hierarchy
8. ✅ Bulk operations work
9. ✅ Export/import works

---

## 📝 Notes

- All fields go in `structuredData` (confirmed)
- Use `internal_relationships` for hierarchy (confirmed)
- Use existing `AuditLogService` (confirmed)
- Support custom objects in integration config (confirmed)
- Server-side filtering for manager dashboard (confirmed)

---

**Status**: ✅ **READY TO START IMPLEMENTATION**

