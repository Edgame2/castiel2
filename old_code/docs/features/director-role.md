# Director Role Features

## Overview

The Director role provides department-level access and cross-team visibility for strategic oversight. Directors have tenant-wide read access to enable comprehensive visibility across teams and departments.

## Permissions

Directors have the following permissions (defined in `packages/shared-types/src/roles.ts`):

### Data Access
- **Shards**: `shard:read:all` - Can read all shards in tenant (department-level access)
- **Users**: `user:read:tenant` - Can read all users in tenant
- **Teams**: `team:read:tenant` - Can read all teams in tenant

### Analytics & Reporting
- **Dashboards**: `dashboard:read:tenant` - Department/tenant-wide dashboard access
- **Quotas**: `quota:read:tenant` - Department/tenant-wide quota access
- **Pipeline**: `pipeline:read:tenant` - Department/tenant-wide pipeline access
- **Risk Analysis**: `risk:read:tenant` - Department/tenant-wide risk access
- **Audit Logs**: `audit:read:tenant` - Can read audit logs for strategic analysis

### Integrations
- **Integration Read**: `integration:read:tenant` - Can view all integrations
- **Integration Search**: `integration:search:tenant` - Can search across all integrations

## Key Features

### 1. Department-Level Access
Directors can access data across all teams in their tenant, providing:
- Cross-team visibility for strategic planning
- Department-wide analytics and reporting
- Comprehensive risk assessment across teams

### 2. Cross-Team Visibility
Directors can:
- View opportunities across all teams
- Access dashboards and analytics for all teams
- Review quotas and performance metrics tenant-wide
- Analyze risks across the entire department

### 3. Strategic Analytics
Directors have access to:
- Tenant-wide audit logs for compliance and analysis
- Cross-team pipeline visibility
- Department-level revenue at risk calculations
- Strategic insights and recommendations

## Implementation

### Authorization Middleware

Use the director authorization middleware for director-specific routes:

```typescript
import { requireDirector, requireDirectorOrAdmin } from '@/middleware/director-authorization';

// Require director role
server.get('/api/v1/director/dashboard', {
  preHandler: [requireAuth(), requireDirector()],
  handler: async (request, reply) => {
    // Director-specific logic
  }
});
```

### Permission Checks

Services should check director permissions when filtering data:

```typescript
import { UserRole, hasPermission } from '@castiel/shared-types';

// Check if user has director-level access
if (user.roles?.includes(UserRole.DIRECTOR)) {
  // Directors can see all tenant data
  const opportunities = await getOpportunities(tenantId);
} else {
  // Other roles see filtered data
  const opportunities = await getOpportunities(tenantId, { teamId: user.teamId });
}
```

### ACL Integration

Directors' tenant-level read permissions are automatically enforced by the ACL system when:
- Context assembly filters shards
- Data queries are executed
- API endpoints are accessed

## Usage Examples

### Viewing All Teams
Directors can view all teams in the tenant:
```typescript
// GET /api/v1/teams
// Returns all teams for directors (tenant-wide)
```

### Cross-Team Analytics
Directors can access analytics across all teams:
```typescript
// GET /api/v1/analytics/pipeline
// Returns pipeline data for all teams in tenant
```

### Strategic Risk Analysis
Directors can view risks across the entire department:
```typescript
// GET /api/v1/risk-analysis/tenant
// Returns risk analysis for all opportunities in tenant
```

## Notes

- Directors have **read-only** access at the tenant level
- Directors cannot modify data they don't own (except their own)
- Directors can create their own shards but cannot modify others' shards
- Department-level access is implemented via tenant-wide read permissions
- Cross-team visibility is automatic due to tenant-level permissions

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - Director role partially implemented

#### Implemented Features (✅)

- ✅ Director role permissions defined
- ✅ Authorization middleware created
- ✅ Permission checks documented
- ✅ ACL integration documented

#### Known Limitations

- ⚠️ **Director Role Features** - Director role features may not be fully implemented
  - **Code Reference:**
    - `apps/api/src/middleware/director-authorization.ts` - Middleware exists
    - Director-specific routes may not be fully implemented
  - **Recommendation:**
    1. Complete director role implementation
    2. Test director role features
    3. Verify tenant-wide access works correctly
    4. Document director role usage

- ⚠️ **Frontend Integration** - Frontend may not have director-specific UI
  - **Code Reference:**
    - Frontend components may need director role support
  - **Recommendation:**
    1. Add director-specific UI components
    2. Test director role workflows
    3. Document frontend director features

### Code References

- **Backend Services:**
  - `apps/api/src/middleware/director-authorization.ts` - Director authorization middleware
  - `packages/shared-types/src/roles.ts` - Director role permissions

- **API Routes:**
  - Director-specific routes may need verification

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Backend Documentation](../backend/README.md) - Backend implementation
- [Authentication Guide](../guides/authentication.md) - Authentication implementation
