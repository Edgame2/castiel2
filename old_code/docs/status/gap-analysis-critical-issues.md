# Critical Issues Found During Gap Analysis Review

**Date:** 2025-01-28  
**Status:** ⚠️ **CRITICAL BUGS IDENTIFIED** - Must Fix Before Implementation

---

## 🚨 CRITICAL BUGS

### 1. RiskEvaluationService Initialization Bug

**Location**: `apps/api/src/routes/index.ts:2710-2717`

**Issue**: `RiskEvaluationService` is initialized with incorrect parameters - missing `shardTypeRepository`.

**Current (WRONG)**:
```typescript
const riskEvaluationService = new RiskEvaluationService(
  monitoring,
  shardRepository,
  relationshipService,  // ❌ WRONG - should be shardTypeRepository
  riskCatalogService,
  vectorSearchService,
  insightService
);
```

**Constructor Signature**:
```typescript
constructor(
  private monitoring: IMonitoringProvider,
  private shardRepository: ShardRepository,
  private shardTypeRepository: ShardTypeRepository,  // ← MISSING!
  private relationshipService: ShardRelationshipService,
  private riskCatalogService: RiskCatalogService,
  private vectorSearchService?: VectorSearchService,
  private insightService?: InsightService
) {}
```

**Impact**: This will cause runtime errors when RiskEvaluationService methods are called that require `shardTypeRepository`.

**Fix Required**:
```typescript
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

**Priority**: **P0 - CRITICAL** - Application will fail

---

### 2. RiskEvaluationService Initialization Bug in Quotas Routes

**Location**: `apps/api/src/routes/quotas.routes.ts:52-59`

**Issue**: Same bug - missing `shardTypeRepository` parameter.

**Current (WRONG)**:
```typescript
const riskEvaluationService = new RiskEvaluationService(
  monitoring,
  shardRepository,
  relationshipService,  // ❌ WRONG
  riskCatalogService,
  vectorSearchService,
  insightService
);
```

**Fix Required**: Add `shardTypeRepository` parameter.

**Priority**: **P0 - CRITICAL** - Application will fail

---

## ✅ ARCHITECTURAL QUESTIONS - ANSWERED

**Status**: All questions answered. See [ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md](./ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md) for details.

### Answers Summary:

1. **Sales Team Structure**: ✅ Use `c_userTeams` shard type
2. **Manager Role**: ✅ Create `MANAGER` role in `UserRole` enum
3. **Team Membership**: ✅ Stored in `c_userTeams` shard as array
4. **Opportunity-Team Association**: ✅ Query by `ownerId`, do NOT store `teamId` in opportunity

---

## ❓ REMAINING CLARIFYING QUESTIONS (Optional)

These are nice-to-have clarifications but not blockers:

### ✅ Question 1: Sales Team Structure - ANSWERED

**Answer**: Use `c_userTeams` shard type with:
- `name`: Team name (defaults to Manager Name)
- `manager`: Object with `userId`, `lastname`, `firstname`, `email`
- `members`: Array of objects with `userId`, `lastname`, `firstname`, `email`, `role`, `function`

**Implementation**: See [ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md](./ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md) for full schema definition.

---

### ✅ Question 2: Manager Role Identification - ANSWERED

**Answer**: 
1. Create `MANAGER` role in `UserRole` enum
2. Permissions: See data of all team members
3. Implementation: See [ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md](./ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md) for full permission list

---

### ✅ Question 3: Team Membership Model - ANSWERED

**Answer**: 
1. Stored in `c_userTeams` shard as `members` array
2. Query recommendations: See [ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md](./ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md) for query patterns
3. Use `TeamService` for all team membership queries

---

### ✅ Question 4: Opportunity Team Association - ANSWERED

**Answer**: 
1. **DO NOT** store `teamId` in opportunity schema
2. Query by `ownerId` to find team
3. Implementation: Use `TeamService.getTeamForUser(ownerId)` to find team, then query opportunities by team member `ownerId`s

---

## ✅ ALL REQUIRED CLARIFICATIONS COMPLETE

**Status**: All architectural questions answered. See [ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md](./ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md) for full implementation plan.

### Optional Clarifying Questions (Not Blockers)

See [ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md](./ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md) for optional questions about:
- Team name defaults
- Team uniqueness rules
- Member role/function values
- Manager permissions details

---

## 🔧 IMMEDIATE FIXES REQUIRED

### Fix 1: RiskEvaluationService Initialization (P0)

**File**: `apps/api/src/routes/index.ts:2710-2717`

```typescript
// BEFORE (WRONG)
const riskEvaluationService = new RiskEvaluationService(
  monitoring,
  shardRepository,
  relationshipService,  // ❌
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

### Fix 2: RiskEvaluationService in Quotas Routes (P0)

**File**: `apps/api/src/routes/quotas.routes.ts:52-59`

Same fix as above - add `shardTypeRepository` parameter.

---

## ✅ BLOCKERS RESOLVED

**Status**: All architectural blockers resolved. Ready for implementation.

**Remaining Blockers**:
1. **Critical Bugs** - Must fix before implementation (see Fix 1 and Fix 2 below)

---

## 📝 IMPLEMENTATION PLAN

**Status**: ✅ Complete. See [ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md](./ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md) for full plan.

### Summary:

1. **Team Service Implementation** ✅
   - `c_userTeams` shard type definition
   - `TeamService` with all query methods
   - Team membership queries

2. **Manager Role Implementation** ✅
   - `MANAGER` role in `UserRole` enum
   - Permission definitions
   - Role detection logic

3. **Opportunity Service Updates** ✅
   - `listTeamOpportunities()` method
   - `listManagerOpportunities()` method
   - Query by `ownerId` (no `teamId` in schema)

4. **Service Dependencies** ⚠️
   - Fix RiskEvaluationService initialization bugs (P0)
   - Add ContextTemplateService to RiskEvaluationService constructor (if needed)
   - Add QuotaService to RiskEvaluationService constructor (if needed)

---

**Next Steps**:
1. ✅ ~~Get answers to architectural questions~~ - DONE
2. ✅ ~~Update gap analysis with correct implementation plan~~ - DONE
3. ⚠️ **Fix critical bugs (P0)** - MUST DO FIRST
4. ✅ Proceed with implementation - Ready to start

**Implementation Plan**: See [ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md](./ARCHITECTURAL_DECISIONS_IMPLEMENTATION_PLAN.md)

