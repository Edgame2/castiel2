# Hierarchical Teams & SSO Integration - Clarifying Questions

**Date:** 2025-01-28  
**Status:** ⚠️ **CLARIFICATION NEEDED**

---

## 📋 New Requirements

1. **Hierarchical Teams**: A manager can have managers in their own team
2. **Automatic Team Creation**: Teams must be created automatically using SSO integration
3. **UI Editing**: Tenant admin must be able to edit teams in the UI

---

## ❓ Clarifying Questions

### 1. Hierarchical Teams Structure

**Question 1.1**: How should hierarchical teams be structured?

**Options**:
- **A) Parent-Child Relationship**: Teams have a `parentTeamId` field pointing to parent team
  ```typescript
  {
    name: "Sales Team",
    manager: { userId: "manager1", ... },
    members: [...],
    parentTeamId?: string,  // Points to parent team
  }
  ```

- **B) Nested Members**: Managers within a team are also members, creating implicit hierarchy
  ```typescript
  {
    name: "Sales Team",
    manager: { userId: "senior-manager", ... },
    members: [
      { userId: "mid-manager", role: "manager", ... },  // Manager who manages sub-team
      { userId: "rep1", role: "sales_rep", ... },
    ],
  }
  ```

- **C) Separate Teams with Manager Reference**: Each level is a separate team, linked by manager
  ```typescript
  // Senior team
  {
    name: "Sales Team",
    manager: { userId: "senior-manager", ... },
    members: [...],
  }
  
  // Sub-team (manager is member of senior team)
  {
    name: "Enterprise Sales",
    manager: { userId: "mid-manager", ... },  // This manager is also a member of Sales Team
    members: [...],
  }
  ```

**Recommendation**: Option A (parent-child) is clearest for hierarchy queries.
Use Option A
---

**Question 1.2**: What is the maximum depth of team hierarchy?

- Unlimited depth? Unlimited
- Maximum 3-4 levels (e.g., VP → Director → Manager → Rep)?
- Only 2 levels (Manager → Rep)?

---
 

- **A) Flat View**: Manager sees only direct team members (not sub-teams)
- **B) Rollup View**: Manager sees all opportunities from their team + all sub-teams
- **C) Toggle View**: Manager can switch between "My Team" and "All Teams" (including sub-teams)

option C

**Example**:
```
VP (Manager)
  ├─ Director A (Manager, member of VP's team)
  │   ├─ Manager 1 (Manager, member of Director A's team)
  │   │   ├─ Rep 1
  │   │   └─ Rep 2
  │   └─ Manager 2
  │       ├─ Rep 3
  │       └─ Rep 4
  └─ Director B
      └─ Manager 3
          └─ Rep 5
```

If VP views dashboard:
- **Flat View**: Only Director A and Director B's opportunities
- **Rollup View**: All opportunities from Director A, Director B, and all their sub-teams (Rep 1-5)
- **Toggle View**: Can switch between views

---

**Question 1.4**: Can a user be a manager of multiple teams at the same level?

- **A) Yes**: User can manage Team A and Team B (both report to same parent)
- **B) No**: User can only manage one team
Option A, yes
---

**Question 1.5**: Can a user be both a manager and a regular member in different teams?

- **A) Yes**: User manages Team A but is a member of Team B
- **B) No**: User is either a manager or a member, not both

option B, No
---

### 2. SSO Integration & Automatic Team Creation

**Question 2.1**: Which SSO providers need to be supported?

- [ X] Azure AD / Microsoft Entra ID
- [ X] Okta
- [ X] Google Workspace
- [ ] Other (please specify): _______________

---

**Question 2.2**: What team/group data comes from SSO?

**Azure AD Example**:
- Group Name
- Group ID
- Group Members (user IDs)
- Group Owner/Manager
- Group Hierarchy (parent groups)

**Questions**:
- Does SSO provide team hierarchy information? 
- Does SSO provide manager assignments?
- Does SSO provide role/function information for members?
- What fields are available from SSO that should map to `c_userTeams`?

Tenant Admin must be able to configure that in the integration adpater.
Check current implementation and documentation

---

**Question 2.3**: When are teams created automatically?

- **A) On User Login**: When user logs in via SSO, create/update their team
- **B) On Tenant Setup**: When tenant is configured with SSO, sync all teams
- **C) Scheduled Sync**: Periodic sync (hourly/daily) to create/update teams
- **D) Webhook/Event**: Real-time sync when teams change in SSO provider
- **E) Manual Trigger**: Admin can trigger sync manually

**Recommendation**: Combination of B (initial sync) + C (periodic sync) + D (real-time if available).
Yes use this recommendation

---

**Question 2.4**: How should team creation conflict be handled?

**Scenario**: Team already exists in Castiel, but SSO sync wants to create it again.

- **A) Skip**: Don't create if team already exists
- **B) Update**: Update existing team with SSO data
- **C) Merge**: Merge SSO data with existing team data
- **D) Replace**: Replace existing team with SSO data (lose manual edits)

**Recommendation**: B (Update) with option to preserve manual edits.
Yes B 

---

**Question 2.5**: What happens to manually created teams when SSO sync runs?

- **A) Preserve**: Keep manually created teams, only sync SSO teams
- **B) Delete**: Delete manually created teams not in SSO
- **C) Mark**: Mark manually created teams, sync only SSO teams
- **D) Merge**: Try to match and merge with SSO teams

Option C
---

**Question 2.6**: Should SSO be the source of truth?

- **A) Yes**: SSO data always wins, manual edits are overwritten on sync
- **B) No**: Manual edits take precedence, SSO only fills in missing data
- **C) Hybrid**: Some fields from SSO (members), some manual (team name, custom fields)
Option C
---

**Question 2.7**: How should team hierarchy be synced from SSO?

**Example**: Azure AD has nested groups:
```
- Sales Department (Group)
  - Enterprise Sales (Sub-group)
    - Enterprise Sales Team 1 (Sub-group)
  - SMB Sales (Sub-group)
```

- Should this create 3 teams with parent-child relationships? Yes
- Or should it create 1 team with all members flattened?

---

**Question 2.8**: What SSO fields map to team fields?

**Mapping Example**:
```typescript
// SSO Group → c_userTeams
{
  // SSO Data
  groupId: "azure-ad-group-id",
  groupName: "Enterprise Sales Team",
  groupOwner: { id: "user-id", email: "manager@company.com" },
  groupMembers: [
    { id: "user-1", email: "rep1@company.com", role: "Sales Rep" },
    { id: "user-2", email: "rep2@company.com", role: "Account Executive" },
  ],
  parentGroupId: "parent-group-id",
  
  // Maps to c_userTeams
  name: groupName,
  manager: { userId: groupOwner.id, email: groupOwner.email, ... },
  members: groupMembers.map(m => ({ userId: m.id, email: m.email, role: m.role, ... })),
  parentTeamId: parentGroupId,  // If hierarchical
  externalId: groupId,  // Store SSO group ID for sync
}
```

**Questions**:
- What SSO fields are available? Configure in integration adapater by Tenant Admin
- How to map SSO roles to Castiel roles? Configure in integration adapater by Tenant Admin
- How to handle missing data (e.g., no manager in SSO)? Configure in integration adapater by Tenant Admin

---

### 3. UI Editing Requirements

**Question 3.1**: What can tenant admins edit in the UI?

- [ x] Team name
- [x ] Manager assignment
- [ x] Add/remove team members
- [x ] Edit member roles/functions
- [ x] Change team hierarchy (parent team)
- [x ] Custom fields (if any)
- [ ] Other: _______________

---

**Question 3.2**: What happens when admin edits a team that was created from SSO?

- **A) Locked**: Cannot edit SSO-synced teams, only view
- **B) Editable**: Can edit, but changes are overwritten on next SSO sync
- **C) Preserve Edits**: Edits are preserved, SSO only updates non-edited fields
- **D) Mark as Manual**: Editing marks team as "manually edited", SSO sync skips it

**Recommendation**: D (Mark as manual) with option to re-enable SSO sync.
Yes option D
---

**Question 3.3**: Should there be a "Sync from SSO" button in the UI?

- **A) Yes**: Admin can manually trigger SSO sync for a team
- **B) No**: Only automatic sync
- **C) Yes, but**: Only for teams that were originally synced from SSO
Option C
---

**Question 3.4**: What UI components are needed?

- [x ] Team list page (`/teams`)
- [ x] Team detail/edit page (`/teams/[id]`)
- [x ] Team creation page (`/teams/new`)
- [x ] Team hierarchy view (tree/graph)
- [x ] SSO sync status indicator
- [x ] SSO sync log/history
- [ x] Bulk team operations
- [ ] Other: _______________

---

**Question 3.5**: Should there be a team hierarchy visualization?

- **A) Yes**: Tree view showing parent-child relationships
- **B) No**: Flat list only
- **C) Optional**: Can toggle between flat and hierarchy view
Option C
---

**Question 3.6**: What permissions are needed for team editing?

- **A) Only Tenant Admin**: Only tenant admins can edit teams
- **B) Team Managers**: Team managers can edit their own team
- **C) Both**: Tenant admins can edit all teams, managers can edit their team
- **D) Custom Role**: Create "Team Admin" role with team editing permissions

**Recommendation**: A (Only Tenant Admin) for initial implementation, can expand later.
Yes option A
---

**Question 3.7**: Should there be validation when editing teams?

- **A) Yes**: Validate that manager exists, members exist, no circular hierarchy, etc.
- **B) No**: Allow any edits, validate on save
- **C) Hybrid**: Real-time validation for some fields, validate all on save
Option A
---

### 4. Data Model Updates

**Question 4.1**: Should `c_userTeams` shard have these additional fields?

```typescript
{
  // Existing
  name: string;
  manager: { userId, lastname, firstname, email };
  members: Array<{ userId, lastname, firstname, email, role, function }>;
  
  // New for hierarchy
  parentTeamId?: string;  // Reference to parent team shard ID
  childTeamIds?: string[];  // Array of child team shard IDs (for quick lookup)
  
  // New for SSO
  externalId?: string;  // SSO group ID (e.g., Azure AD group ID)
  externalSource?: string;  // 'azure_ad', 'okta', 'google', etc.
  syncedAt?: Date;  // Last SSO sync timestamp
  syncEnabled?: boolean;  // Whether SSO sync is enabled for this team
  isManuallyEdited?: boolean;  // True if manually edited (skip SSO sync)
  lastSyncedBy?: string;  // User ID or 'system' for automatic sync
}
```
Yes looks good but must part of shard sturucted data.
Check shard base schema if needed.

**Questions**:
- Are these fields correct?
- Any additional fields needed?
- Should `childTeamIds` be stored or computed on-the-fly? on the fly

---

**Question 4.2**: How should team hierarchy be queried?

**Options**:
- **A) Recursive Query**: Query parent, then recursively query children
- **B) Stored Path**: Store full path (e.g., "team1/team2/team3") for quick lookup
- **C) Materialized View**: Pre-compute all team relationships in a separate collection
- **D) Graph Query**: Use Cosmos DB graph API (if available)

**Recommendation**: A (Recursive) for simplicity, optimize later if needed.
Yes option A
---

**Question 4.3**: Should there be a separate `c_teamHierarchy` shard type for relationships?

- **A) Yes**: Separate shard type for better query performance
- **B) No**: Store in `c_userTeams` itself
- **C) Hybrid**: Store in `c_userTeams` but also maintain relationship shards
Option C
---

### 5. SSO Integration Implementation

**Question 5.1**: Where should SSO team sync logic live?

- **A) New Service**: `apps/api/src/services/sso-team-sync.service.ts`
- **B) Existing Service**: Extend existing SSO integration service
- **C) Azure Function**: Separate function for scheduled sync
- **D) All of the above**: Service for logic, Function for scheduled sync
SSO sync should be added to Integration service. 
---

**Question 5.2**: Should SSO team sync be part of existing user sync?

- **A) Yes**: When users are synced, also sync their teams
- **B) No**: Separate sync process for teams
- **C) Both**: User sync creates teams, separate sync updates teams
Option C
---

**Question 5.3**: What SSO integration adapters need team sync support?

- [x ] Azure AD / Microsoft Graph
- [x ] Okta
- [ x] Google Workspace
- [ ] Other: _______________

---

**Question 5.4**: Should team sync be configurable per tenant?

- **A) Yes**: Tenant admin can enable/disable SSO team sync
- **B) No**: Always enabled if SSO is configured
- **C) Per Team**: Each team can have sync enabled/disabled
Option A per Tenant
---

### 6. Migration & Backward Compatibility

**Question 6.1**: What about existing teams (if any)?

- **A) Migrate**: Convert existing teams to `c_userTeams` format
- **B) Keep Separate**: Keep existing teams, only new teams use `c_userTeams`
- **C) Not Applicable**: No existing teams
Option C
---

**Question 6.2**: Should there be a migration script for SSO teams?

- **A) Yes**: One-time script to import all teams from SSO
- **B) No**: Only incremental sync
- **C) Both**: Initial import + incremental sync
Option C
---

## 📋 Summary of Questions

### Critical (Must Answer):
1. Hierarchical team structure (parent-child vs nested vs separate)
2. Maximum hierarchy depth
3. Manager dashboard view (flat vs rollup vs toggle)
4. SSO providers to support
5. SSO team data mapping
6. When teams are created (login vs setup vs scheduled)
7. SSO sync conflict handling
8. What tenant admins can edit
9. What happens when admin edits SSO-synced team

### Important (Should Answer):
10. Can user manage multiple teams
11. Can user be manager and member in different teams
12. SSO as source of truth
13. UI components needed
14. Team editing permissions
15. Additional `c_userTeams` fields needed

### Nice to Have (Optional):
16. Team hierarchy visualization
17. Validation rules
18. Query optimization strategy
19. Migration strategy

---

## 🎯 Recommended Next Steps

1. **Answer Critical Questions** (1-9)
2. **Review Implementation Plan** with hierarchical teams support
3. **Design SSO Integration** based on answers
4. **Update Data Model** with hierarchy and SSO fields
5. **Create UI Mockups** for team editing

---

## 📝 Notes

- Hierarchical teams add complexity but provide better organizational structure
- SSO integration ensures teams stay in sync with external systems
- UI editing allows flexibility while maintaining SSO sync capability
- Need to balance SSO as source of truth vs manual editing flexibility

