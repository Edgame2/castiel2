# Architectural Decisions & Implementation Plan

**Date:** 2025-01-28  
**Status:** ✅ Decisions Made - Ready for Implementation

---

## 📋 Decisions Made

### 1. Sales Team Structure

**Decision**: Use `c_userTeams` shard type (to be created)

**Structure**:
```typescript
{
  name: string;              // Team name (defaults to Manager Name)
  manager: {
    userId: string;
    lastname: string;
    firstname: string;
    email: string;
  };
  members: Array<{
    userId: string;
    lastname: string;
    firstname: string;
    email: string;
    role: string;           // e.g., "sales_rep", "account_executive"
    function: string;       // e.g., "sales", "account_management"
  }>;
}
```

### 2. Manager Role

**Decision**: Create `MANAGER` role in `UserRole` enum

**Permissions**: See data of all team members

### 3. Team Membership

**Decision**: Stored in `c_userTeams` shard as array of member objects

### 4. Opportunity-Team Association

**Decision**: **DO NOT** store `teamId` in opportunity schema. Query by `ownerId` to find team.

---

## ❓ Clarifying Questions

Before finalizing the implementation, please confirm:

1. **Team Name Default**:
   - Should `name` default to "Manager Name" (e.g., "John Smith's Team")?
   - Or should it be editable and default to manager's full name?

2. **Team Uniqueness**:
   - Can a user be a manager of multiple teams?
   - Can a user be a member of multiple teams?
   - Can a user be both a manager and a member of different teams?

3. **Member Role/Function Values**:
   - What are the valid values for `role`? (e.g., "sales_rep", "account_executive", "business_development")
   - What are the valid values for `function`? (e.g., "sales", "account_management", "inside_sales")
   - Should these be enums/picklists or free text?

4. **Team ID Format**:
   - Should team ID be the shard ID (UUID)?
   - Or should there be a separate `teamId` field (string/UUID)?

5. **Manager Permissions Details**:
   - Can managers only see their own team's data, or all teams?
   - Can managers edit team member opportunities?
   - Can managers create/edit quotas for team members?
   - Can managers see all team quotas or only their own?

6. **Opportunity Query Pattern**:
   - When querying opportunities by team, should we:
     a) Query all opportunities where `ownerId` is in team's member `userId` array?
     b) Also include opportunities where `ownerId` matches manager's `userId`?
     c) Use a different pattern?

---

## 🏗️ Implementation Plan

### Phase 1: Create c_userTeams Shard Type

**File**: `apps/api/src/types/core-shard-types.ts`

```typescript
// Add to CORE_SHARD_TYPE_NAMES
USER_TEAMS: 'c_userTeams',

// Define fields
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
    type: RichFieldType.JSON, // Or create a custom USER_OBJECT type
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
    type: RichFieldType.JSON, // Array of member objects
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
];

export const USER_TEAMS_SHARD_TYPE: CoreShardTypeDefinition = {
  name: CORE_SHARD_TYPE_NAMES.USER_TEAMS,
  displayName: 'User Team',
  description: 'Sales team with manager and members',
  category: ShardTypeCategory.DATA,
  schema: {
    format: 'rich',
    fields: userTeamsFields,
    formLayout: {
      columns: 12,
      groups: [
        { id: 'main', label: 'Team Information', fields: ['name', 'manager'] },
        { id: 'members', label: 'Team Members', fields: ['members'] },
      ],
    },
  },
  icon: 'users',
  color: '#6366f1',
  tags: ['team', 'sales', 'management'],
};
```

**Alternative**: If JSON fields are not ideal, we could use:
- `managerId` (USER reference) + auto-generated `managerName`, `managerEmail`
- `memberIds` (MULTISELECT USER) + separate `memberRoles` JSON field

**Recommendation**: Use structured fields for better querying:
```typescript
{
  name: RichFieldType.TEXT,
  managerId: RichFieldType.USER,        // Reference to User
  managerName: RichFieldType.TEXT,     // Auto-generated
  managerEmail: RichFieldType.TEXT,     // Auto-generated
  memberIds: RichFieldType.MULTISELECT, // Array of user IDs
  memberDetails: RichFieldType.JSON,     // Array of {userId, role, function}
}
```

---

### Phase 2: Add MANAGER Role

**File**: `packages/shared-types/src/roles.ts`

```typescript
export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    USER = 'user',
    MANAGER = 'manager',  // ✅ ADD THIS
    GUEST = 'guest',
}

// Add permissions
export const RolePermissions: Record<UserRole, Permission[]> = {
    // ... existing roles
    [UserRole.MANAGER]: [
        // ShardType permissions
        ...ShardTypeRolePermissions[UserRole.USER], // Same as USER
        
        // Shard permissions - can see team data
        'shard:create:own',
        'shard:read:team',      // ✅ NEW PERMISSION
        'shard:update:team',    // ✅ NEW PERMISSION (if needed)
        'shard:delete:own',
        
        // Profile
        'user:read:own',
        'user:update:own',
        
        // Team management
        'team:read:own',        // ✅ NEW PERMISSION
        'team:update:own',      // ✅ NEW PERMISSION
        'team:read:members',    // ✅ NEW PERMISSION
        
        // Integration permissions
        'integration:read:tenant',
        'integration:search:tenant',
        
        // Opportunity permissions
        'opportunity:read:team',    // ✅ NEW PERMISSION
        'opportunity:update:team',  // ✅ NEW PERMISSION (if needed)
        
        // Quota permissions
        'quota:read:team',          // ✅ NEW PERMISSION
    ],
    // ... rest
};
```

**New Permissions to Add**:
```typescript
export const SYSTEM_PERMISSIONS = {
    // ... existing
    TEAMS: {
        READ: 'team:read:own',
        READ_MEMBERS: 'team:read:members',
        UPDATE: 'team:update:own',
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

---

### Phase 3: Create Team Service

**File**: `apps/api/src/services/team.service.ts`

```typescript
export class TeamService {
  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository,
    private userService: UserService
  ) {}

  /**
   * Get team by ID
   */
  async getTeam(teamId: string, tenantId: string): Promise<Shard | null> {
    const team = await this.shardRepository.findById(teamId, tenantId);
    if (!team || team.shardTypeId !== CORE_SHARD_TYPE_NAMES.USER_TEAMS) {
      return null;
    }
    return team;
  }

  /**
   * Get all teams for a tenant
   */
  async getTeams(tenantId: string, filters?: { managerId?: string }): Promise<Shard[]> {
    const query = `SELECT * FROM c WHERE c.shardTypeId = @shardTypeId AND c.tenantId = @tenantId`;
    const parameters = [
      { name: '@shardTypeId', value: CORE_SHARD_TYPE_NAMES.USER_TEAMS },
      { name: '@tenantId', value: tenantId },
    ];
    
    if (filters?.managerId) {
      query += ' AND c.structuredData.managerId = @managerId';
      parameters.push({ name: '@managerId', value: filters.managerId });
    }
    
    return await this.shardRepository.query(query, parameters);
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string, tenantId: string): Promise<TeamMember[]> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team) return [];
    
    const data = team.structuredData as any;
    return data?.members || [];
  }

  /**
   * Get team manager
   */
  async getTeamManager(teamId: string, tenantId: string): Promise<TeamManager | null> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team) return null;
    
    const data = team.structuredData as any;
    return data?.manager || null;
  }

  /**
   * Get teams where user is manager
   */
  async getManagerTeams(userId: string, tenantId: string): Promise<Shard[]> {
    return await this.getTeams(tenantId, { managerId: userId });
  }

  /**
   * Get teams where user is a member
   */
  async getUserTeams(userId: string, tenantId: string): Promise<Shard[]> {
    // Query teams where userId is in members array
    const query = `
      SELECT * FROM c 
      WHERE c.shardTypeId = @shardTypeId 
        AND c.tenantId = @tenantId
        AND ARRAY_CONTAINS(c.structuredData.members, { userId: @userId }, true)
    `;
    const parameters = [
      { name: '@shardTypeId', value: CORE_SHARD_TYPE_NAMES.USER_TEAMS },
      { name: '@tenantId', value: tenantId },
      { name: '@userId', value: userId },
    ];
    
    return await this.shardRepository.query(query, parameters);
  }

  /**
   * Get team for a user (as member or manager)
   */
  async getTeamForUser(userId: string, tenantId: string): Promise<Shard | null> {
    // First check if user is a manager
    const managerTeams = await this.getManagerTeams(userId, tenantId);
    if (managerTeams.length > 0) {
      return managerTeams[0]; // Return first team (or handle multiple teams)
    }
    
    // Then check if user is a member
    const memberTeams = await this.getUserTeams(userId, tenantId);
    return memberTeams.length > 0 ? memberTeams[0] : null;
  }

  /**
   * Check if user is manager of team
   */
  async isUserManagerOfTeam(userId: string, teamId: string, tenantId: string): Promise<boolean> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team) return false;
    
    const data = team.structuredData as any;
    return data?.manager?.userId === userId;
  }

  /**
   * Check if user is member of team
   */
  async isUserMemberOfTeam(userId: string, teamId: string, tenantId: string): Promise<boolean> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team) return false;
    
    const data = team.structuredData as any;
    const members = data?.members || [];
    return members.some((m: any) => m.userId === userId);
  }

  /**
   * Get all user IDs in a team (manager + members)
   */
  async getTeamUserIds(teamId: string, tenantId: string): Promise<string[]> {
    const team = await this.getTeam(teamId, tenantId);
    if (!team) return [];
    
    const data = team.structuredData as any;
    const userIds: string[] = [];
    
    // Add manager
    if (data?.manager?.userId) {
      userIds.push(data.manager.userId);
    }
    
    // Add members
    const members = data?.members || [];
    members.forEach((m: any) => {
      if (m.userId && !userIds.includes(m.userId)) {
        userIds.push(m.userId);
      }
    });
    
    return userIds;
  }
}
```

**Types**:
```typescript
// apps/api/src/types/team.types.ts
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
```

---

### Phase 4: Update Opportunity Service

**File**: `apps/api/src/services/opportunity.service.ts`

```typescript
// Add method to list team opportunities
async listTeamOpportunities(
  teamId: string,
  tenantId: string,
  userId: string,
  filters?: OpportunityFilters
): Promise<OpportunityListResult> {
  // Get team user IDs
  const teamService = new TeamService(...);
  const teamUserIds = await teamService.getTeamUserIds(teamId, tenantId);
  
  if (teamUserIds.length === 0) {
    return { opportunities: [], total: 0, hasMore: false };
  }
  
  // Query opportunities where ownerId is in teamUserIds
  const opportunities = await this.shardRepository.list({
    shardTypeId: CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
    tenantId,
    filters: {
      ...filters,
      ownerIds: teamUserIds, // Need to add this filter support
    },
  });
  
  return {
    opportunities: opportunities.shards,
    total: opportunities.total,
    hasMore: opportunities.hasMore,
  };
}

// Add method to list manager opportunities
async listManagerOpportunities(
  managerId: string,
  tenantId: string,
  userId: string,
  filters?: OpportunityFilters
): Promise<OpportunityListResult> {
  // Get all teams where user is manager
  const teamService = new TeamService(...);
  const managerTeams = await teamService.getManagerTeams(managerId, tenantId);
  
  if (managerTeams.length === 0) {
    return { opportunities: [], total: 0, hasMore: false };
  }
  
  // Aggregate opportunities from all teams
  const allOpportunities: Shard[] = [];
  for (const team of managerTeams) {
    const teamOpps = await this.listTeamOpportunities(team.id, tenantId, userId, filters);
    allOpportunities.push(...teamOpps.opportunities);
  }
  
  // Deduplicate by opportunity ID
  const uniqueOpportunities = Array.from(
    new Map(allOpportunities.map(opp => [opp.id, opp])).values()
  );
  
  return {
    opportunities: uniqueOpportunities,
    total: uniqueOpportunities.length,
    hasMore: false,
  };
}
```

**Note**: Need to add `ownerIds` filter support to `ShardRepository.list()` if not already present.

---

### Phase 5: Query Recommendations

#### Query Team Members

**Option 1: Direct Query (Recommended)**
```typescript
// Get team shard
const team = await shardRepository.findById(teamId, tenantId);
const members = team.structuredData.members; // Array of member objects
```

**Option 2: Cosmos DB Query**
```typescript
// If you need to query across teams (e.g., find all teams with specific member)
const query = `
  SELECT c.id, c.structuredData.name, c.structuredData.members
  FROM c
  WHERE c.shardTypeId = @shardTypeId
    AND c.tenantId = @tenantId
    AND ARRAY_CONTAINS(c.structuredData.members, { userId: @userId }, true)
`;
```

#### Query Opportunities by Team

**Recommended Pattern**:
```typescript
// 1. Get team user IDs
const teamUserIds = await teamService.getTeamUserIds(teamId, tenantId);

// 2. Query opportunities where ownerId is in teamUserIds
const opportunities = await shardRepository.list({
  shardTypeId: CORE_SHARD_TYPE_NAMES.OPPORTUNITY,
  tenantId,
  filters: {
    ownerIds: teamUserIds, // Array filter
  },
});
```

**Alternative: Cosmos DB Query**
```typescript
const query = `
  SELECT * FROM c
  WHERE c.shardTypeId = @opportunityType
    AND c.tenantId = @tenantId
    AND c.structuredData.ownerId IN (@teamUserIds)
`;
// Note: Cosmos DB IN clause has limits, may need to batch
```

#### Query User's Team

**Recommended Pattern**:
```typescript
// 1. Check if user is manager
const managerTeams = await teamService.getManagerTeams(userId, tenantId);
if (managerTeams.length > 0) {
  return managerTeams[0];
}

// 2. Check if user is member
const memberTeams = await teamService.getUserTeams(userId, tenantId);
return memberTeams.length > 0 ? memberTeams[0] : null;
```

---

## 🔧 Required Updates

### 1. Fix Critical Bugs (P0)

- [ ] Fix `RiskEvaluationService` initialization in `apps/api/src/routes/index.ts`
- [ ] Fix `RiskEvaluationService` initialization in `apps/api/src/routes/quotas.routes.ts`

### 2. Create c_userTeams Shard Type

- [ ] Add `USER_TEAMS` to `CORE_SHARD_TYPE_NAMES`
- [ ] Define `userTeamsFields` array
- [ ] Create `USER_TEAMS_SHARD_TYPE` definition
- [ ] Add to `CORE_SHARD_TYPES` export array
- [ ] Seed in `CoreTypesSeederService`

### 3. Add MANAGER Role

- [ ] Add `MANAGER` to `UserRole` enum
- [ ] Add `MANAGER` permissions to `RolePermissions`
- [ ] Add new permissions to `SYSTEM_PERMISSIONS`
- [ ] Update permission checking logic

### 4. Create Team Service

- [ ] Create `apps/api/src/services/team.service.ts`
- [ ] Create `apps/api/src/types/team.types.ts`
- [ ] Register service in route initialization

### 5. Update Opportunity Service

- [ ] Add `listTeamOpportunities()` method
- [ ] Add `listManagerOpportunities()` method
- [ ] Update `listOwnedOpportunities()` to check manager role
- [ ] Add `ownerIds` filter support to `ShardRepository` if needed

### 6. Update API Routes

- [ ] Add team routes (`/api/v1/teams`)
- [ ] Update opportunity routes to support team filtering
- [ ] Add manager role checks

---

## 📝 Next Steps

1. **Answer clarifying questions** (if any)
2. **Fix critical bugs** (1 day)
3. **Implement c_userTeams shard type** (1 day)
4. **Add MANAGER role** (0.5 day)
5. **Create Team Service** (2 days)
6. **Update Opportunity Service** (1 day)
7. **Update API routes** (1 day)
8. **Test** (1 day)

**Total Estimated Time**: 7.5 days

---

## ⚠️ Notes

1. **Team ID**: Use shard ID (UUID) as team identifier
2. **Opportunity-Team Association**: Query by `ownerId`, do NOT store `teamId` in opportunity
3. **Performance**: Consider caching team membership for frequently accessed teams
4. **Indexing**: Ensure Cosmos DB has indexes on:
   - `structuredData.managerId`
   - `structuredData.members[].userId`
   - `structuredData.ownerId` (for opportunities)

