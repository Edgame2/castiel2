# Final Implementation Questions

**Date:** 2025-01-28  
**Status:** ⚠️ **FINAL CLARIFICATIONS NEEDED**

---

## ✅ Confirmed from Your Answers

All major questions answered! Just a few final clarifications needed:

---

## ❓ Final Questions

### 1. Relationship to Existing User Groups System

**Question**: I found that Castiel already has a **User Groups** system (`docs/guides/user-groups.md`) that supports SSO groups. 

**Clarification Needed**:
- Is `c_userTeams` **different** from the existing User Groups system?
- Or should we **extend** the existing User Groups system to support sales teams?
- Or should `c_userTeams` be a **separate** system specifically for sales teams with hierarchy?

**Current User Groups** (from docs):
- Supports SSO sync
- Has `source: 'manual' | 'sso'`
- Has `memberUserIds: string[]`
- No hierarchy support
- No manager concept

**Proposed `c_userTeams`**:
- Has hierarchy (`parentTeamId`)
- Has manager object
- Has member objects with roles/functions
- SSO sync support
- UI editing

**Recommendation**: Keep `c_userTeams` separate for sales teams, but leverage existing SSO sync patterns.
yes use this recommendation
---

### 2. Integration Adapter Configuration

**Question**: You mentioned "Tenant Admin must be able to configure that in the integration adapter."

**Clarification Needed**:
- Should team sync configuration be part of the **Integration Document** `settings` or `syncConfig`?
- Should it be a **separate configuration** in the integration adapter UI? 
Yes leverage the Integration system, Tenant Admin must be able to configure the integration adapter for their tenant
- What specific configuration fields are needed?

**Proposed Configuration**:
```typescript
// In IntegrationDocument.syncConfig
syncConfig: {
  // ... existing fields
  teamSync?: {
    enabled: boolean;
    entityMappings: {
      groupId: string;        // SSO group ID field
      groupName: string;      // SSO group name field
      managerId: string;       // SSO manager/user ID field
      parentGroupId?: string;  // SSO parent group ID field (for hierarchy)
      memberRole?: string;     // SSO member role field
      memberFunction?: string; // SSO member function field
    };
    fieldMappings: {
      // Map SSO fields to c_userTeams fields
      name: 'groupName',
      manager: { userId: 'managerId', ... },
      members: { userId: 'memberId', role: 'memberRole', ... },
      parentTeamId: 'parentGroupId',
    };
  };
}
```

**Is this structure correct?** Or should it be different?
Look good but support custom object as well

---

### 3. Team Hierarchy Relationships

**Question**: You chose **Option C (Hybrid)** for storing hierarchy:
- Store in `c_userTeams` itself
- Also maintain relationship shards

**Clarification Needed**:
- Should we use `internal_relationships` to store parent-child relationships? use internal_relationship
- Or create a separate relationship type like `has_parent_team` / `has_child_team`?
- Should `parentTeamId` in `structuredData` be the **primary** reference, with relationships as **secondary** for queries?

**Proposed Structure**:
```typescript
// In structuredData
{
  parentTeamId?: string;  // Primary reference
}

// In internal_relationships
[
  {
    type: 'has_parent_team',
    targetShardId: 'parent-team-id',
    targetShardTypeId: 'c_userTeams',
  },
  {
    type: 'has_child_team',
    targetShardId: 'child-team-id',
    targetShardTypeId: 'c_userTeams',
  }
]
```

**Is this correct?**

---

### 4. SSO Sync Service Location

**Question**: You said "SSO sync should be added to Integration service."

**Clarification Needed**:
- Should it be a **new method** in `IntegrationService` like `syncTeamsFromSSO()`?
- Or a **separate service** like `SSOTeamSyncService` that uses `IntegrationService`?
- Should it be part of the **existing sync engine** that handles user/entity sync?

**Current Structure**:
- `IntegrationService` - Main integration management
- `IntegrationConnectionService` - Connection management
- Sync engine in `apps/functions/src/sync/` - Handles scheduled syncs

**Recommendation**: Create `SSOTeamSyncService` that:
- Uses `IntegrationService` to get SSO connections
- Uses `IntegrationAdapter` to fetch team data
- Creates/updates `c_userTeams` shards
- Can be called from sync engine, login handler, or manual trigger

yes follow this recommendation

**Is this approach correct?**

---

### 5. Manager Dashboard Toggle View Implementation

**Question**: You chose **Option C (Toggle View)** - Manager can switch between "My Team" and "All Teams".

**Clarification Needed**:
- Should this be a **UI toggle** (button/switch) that filters data client-side?
- Or should it be a **query parameter** (`?view=my-team` vs `?view=all-teams`) that filters server-side? server side
- Should the default view be "My Team" or "All Teams"? My Team

**Proposed Implementation**:
```typescript
// API endpoint
GET /api/v1/opportunities/manager?view=my-team | all-teams

// Service method
async listManagerOpportunities(
  managerId: string,
  tenantId: string,
  view: 'my-team' | 'all-teams' = 'my-team'
): Promise<OpportunityListResult>
```

**Is this correct?**

---

### 6. Validation Rules Details

**Question**: You chose **Option A (Yes)** for validation.

**Clarification Needed**: What specific validations are needed?

**Proposed Validations**:
- ✅ Manager exists and is active user
- ✅ All members exist and are active users
- ✅ No circular hierarchy (team cannot be parent of its own ancestor)
- ✅ Manager is not a member of the same team
- ✅ Parent team exists (if `parentTeamId` provided)
- ✅ Team name is unique within tenant (or allow duplicates?)
- ✅ Manager has MANAGER role (or allow any user to be manager?)

**Are these correct? Any additional validations?**
Yes
---

### 7. Team Creation Page

**Question**: You checked **Team creation page (`/teams/new`)**.

**Clarification Needed**:
- Should tenant admins be able to create teams **manually** even if SSO sync is enabled?
- Or should manual creation be **disabled** when SSO sync is enabled?
- Should manually created teams be **marked differently** from SSO-synced teams?

**Proposed Behavior**:
- Tenant admins can always create teams manually
- Manually created teams have `source: 'manual'` (or `isManuallyCreated: true`)
- SSO sync only updates teams with `externalId` (SSO-synced teams)
- Manually created teams are preserved during SSO sync

**Is this correct?**
yes

---

### 8. Bulk Team Operations

**Question**: You checked **Bulk team operations**.

**Clarification Needed**: What bulk operations are needed?

**Proposed Operations**:
- ✅ Bulk delete teams
- ✅ Bulk assign manager
- ✅ Bulk add/remove members
- ✅ Bulk enable/disable SSO sync
- ✅ Bulk export teams (CSV/JSON)
- ✅ Bulk import teams (CSV/JSON)

**Which ones are needed?**
All
---

### 9. SSO Sync Log/History

**Question**: You checked **SSO sync log/history**.

**Clarification Needed**:
- Should this be stored in the **team shard** itself (`structuredData.syncHistory`)? No
- Or in a **separate audit log** system? Yes use the already implemented audit log service. Check current implementation
- What information should be logged? create, edit, delete for team and users

**Proposed Log Structure**:
```typescript
{
  syncHistory: Array<{
    syncedAt: Date;
    syncedBy: string; // 'system' or userId
    source: 'sso' | 'manual';
    changes: {
      membersAdded: string[];
      membersRemoved: string[];
      managerChanged?: { from: string, to: string };
      nameChanged?: { from: string, to: string };
    };
    status: 'success' | 'partial' | 'failed';
    error?: string;
  }>;
}
```

**Is this correct?**

---

### 10. Integration with Existing User Sync

**Question**: You chose **Option C (Both)** - User sync creates teams, separate sync updates teams.

**Clarification Needed**:
- Should team creation happen **during user login** (when SSO token contains group info)? yes
- Or should it be a **separate scheduled job** that runs after user sync? yes
- Should team membership be updated **every time** a user logs in, or only during scheduled sync? every time

**Proposed Flow**:
1. **User Login**: Extract group IDs from SSO token → Create/update user's team memberships
2. **Scheduled Sync**: Full team sync (create teams, update members, sync hierarchy)
3. **Manual Trigger**: Admin can trigger full sync on-demand

**Is this correct?**
Yes Correct use recommendation
---

## 📋 Summary

### Critical Questions (Must Answer):
1. Relationship to existing User Groups system
2. Integration adapter configuration structure
3. Team hierarchy relationship storage
4. SSO sync service location/architecture

### Important Questions (Should Answer):
5. Manager dashboard toggle implementation
6. Validation rules details
7. Manual team creation behavior
8. Bulk operations needed
9. SSO sync log structure
10. User sync integration flow

---

## 🎯 Next Steps

Once these questions are answered:
1. ✅ Finalize data model
2. ✅ Create implementation plan
3. ✅ Start implementation

**Estimated Time to Answer**: 15-30 minutes  
**Estimated Implementation Time**: 10-12 days (with hierarchical teams and SSO)

---

## 📝 Notes

- All major architectural decisions are made
- These are implementation detail questions
- Answers will finalize the technical design
- Ready to start coding once answered!

