# Super Admin Integration Catalog Management

## Overview

The Integration Catalog Management system enables Super Admins to:

1. **Manage Integration Types** - Add, update, deprecate integrations
2. **Control Visibility** - Configure which tenants can see/use each integration
3. **Set Pricing Tiers** - Restrict integrations by subscription level
4. **Whitelist/Block Tenants** - Allow or deny specific tenant access
5. **Map Shard Types** - Define which shard types each integration supports
6. **Manage Permissions** - Approve/deny integrations for specific tenants

This system allows **Tenant Admins** to only see and activate integrations that the **Super Admin** has made available to their tier/account.

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│          Integration Catalog Management System            │
├─────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Super Admin UI (/admin/integration-catalog)  │   │
│  │  - List/Create/Edit integrations                 │   │
│  │  - Manage visibility & approval rules             │   │
│  │  - Configure whitelist/blocking                   │   │
│  │  - Set shard type mappings                        │   │
│  └──────────────────────────────────────────────────┘   │
│                          ▲                                 │
│                          │                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │       API Layer (Super Admin Routes)              │   │
│  │  - /api/super-admin/integration-catalog          │   │
│  │  - Catalog CRUD operations                        │   │
│  │  - Visibility rule management                     │   │
│  │  - Whitelist/block operations                     │   │
│  └──────────────────────────────────────────────────┘   │
│                          ▲                                 │
│                          │                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │    Service Layer                                  │   │
│  │  - IntegrationCatalogService                      │   │
│  │  - IntegrationVisibilityService                   │   │
│  └──────────────────────────────────────────────────┘   │
│                          ▲                                 │
│                          │                                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │    Repository Layer (Cosmos DB)                   │   │
│  │  - integration_catalog container                  │   │
│  │  - integration_visibility container               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                            │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

#### integration_catalog (Main Catalog)
```typescript
{
  id: string;                              // Unique identifier
  integrationId: string;                   // Integration name (e.g., "salesforce")
  name: string;                            // Display name
  displayName: string;
  description: string;
  category: 'crm' | 'communication' | ...;
  icon: string;                            // Icon identifier
  color: string;                           // Hex color code

  // Visibility & Access
  visibility: 'public' | 'superadmin_only';
  requiresApproval: boolean;               // Requires approval before use
  beta: boolean;                           // Beta/preview flag
  deprecated: boolean;                     // Deprecated but still usable

  // Pricing
  requiredPlan?: 'free' | 'pro' | 'enterprise' | 'premium';
  allowedTenants?: string[] | null;        // null = all, array = whitelist
  blockedTenants?: string[];               // Explicitly blocked tenants

  // Features
  capabilities: string[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };

  // Authentication
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  oauthConfig?: OAuthConfig;
  requiredScopes?: string[];

  // Shard Type Support (Key Feature)
  supportedShardTypes: string[];           // e.g., ["contact", "account"]
  shardMappings: EntityToShardTypeMapping[];
  relationshipMappings?: RelationshipMapping[];

  // Metadata
  documentationUrl?: string;
  supportUrl?: string;
  setupGuideUrl?: string;
  version: string;
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;                       // Super admin who created it
  updatedBy: string;                       // Super admin who last updated it
}
```

#### integration_visibility (Tenant-Specific Rules)
```typescript
{
  id: string;
  tenantId: string;                        // Tenant this rule applies to
  integrationId: string;                   // Integration this rule applies to

  // Visibility state
  isVisible: boolean;                      // Hidden from this tenant?
  isEnabled: boolean;                      // Can be activated?
  requiresApproval: boolean;               // Requires approval?
  isApproved: boolean;                     // Approved?

  // Pricing
  availableInPlan?: 'free' | 'pro' | 'enterprise';
  billingTierId?: string;

  // Custom overrides for this tenant
  customRateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
  };
  customCapabilities?: string[];           // Subset of available capabilities
  customSyncDirections?: ('pull' | 'push' | 'bidirectional')[];

  // Request/Approval tracking
  requestedAt?: Date;
  requestedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  deniedAt?: Date;
  denialReason?: string;

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Endpoints

### Catalog Management

#### List All Integrations
```bash
GET /api/super-admin/integration-catalog
Query Parameters:
  - limit: number (default: 20)
  - offset: number (default: 0)
  - category: string
  - status: 'active' | 'beta' | 'deprecated'
  - visibility: 'public' | 'superadmin_only'
  - requiredPlan: string
  - searchTerm: string
  - beta: boolean
  - deprecated: boolean

Response: CatalogListResult
{
  entries: IntegrationCatalogEntry[];
  total: number;
  hasMore: boolean;
}
```

#### Get Integration Details
```bash
GET /api/super-admin/integration-catalog/:integrationId

Response: IntegrationCatalogEntry
```

#### Create Integration
```bash
POST /api/super-admin/integration-catalog
Body: CreateIntegrationCatalogInput
{
  integrationId: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon?: string;
  color?: string;
  visibility: 'public' | 'superadmin_only';
  requiredPlan?: 'free' | 'pro' | 'enterprise' | 'premium';
  capabilities: string[];
  supportedSyncDirections: string[];
  authType: string;
  supportedShardTypes: string[];
  shardMappings: EntityToShardTypeMapping[];
  // ... more fields
}

Response: IntegrationCatalogEntry
```

#### Update Integration
```bash
PATCH /api/super-admin/integration-catalog/:integrationId
Body: UpdateIntegrationCatalogInput (partial)

Response: IntegrationCatalogEntry
```

#### Delete Integration
```bash
DELETE /api/super-admin/integration-catalog/:integrationId

Response: 204 No Content
```

#### Deprecate Integration (Soft Delete)
```bash
POST /api/super-admin/integration-catalog/:integrationId/deprecate

Response: IntegrationCatalogEntry (with deprecated: true)
```

### Visibility Management

#### Get Visibility Rules for Integration
```bash
GET /api/super-admin/integration-catalog/:integrationId/visibility

Response: IntegrationVisibilityRule[]
```

#### Get Visibility Rules for Tenant
```bash
GET /api/super-admin/tenants/:tenantId/integration-visibility

Response: IntegrationVisibilityRule[]
```

#### Create/Update Visibility Rule
```bash
POST /api/super-admin/integration-catalog/:integrationId/visibility/:tenantId
Body:
{
  isVisible?: boolean;
  isEnabled?: boolean;
  isApproved?: boolean;
  availableInPlan?: 'free' | 'pro' | 'enterprise';
  customCapabilities?: string[];
  customSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
}

Response: IntegrationVisibilityRule
```

#### Approve Integration for Tenant
```bash
POST /api/super-admin/integration-catalog/:integrationId/approve/:tenantId

Response: IntegrationVisibilityRule
```

#### Deny Integration for Tenant
```bash
POST /api/super-admin/integration-catalog/:integrationId/deny/:tenantId
Body: { reason: string }

Response: IntegrationVisibilityRule
```

#### Hide Integration from Tenant
```bash
POST /api/super-admin/integration-catalog/:integrationId/hide/:tenantId
Body: { reason?: string }

Response: IntegrationVisibilityRule
```

#### Show Integration to Tenant
```bash
POST /api/super-admin/integration-catalog/:integrationId/show/:tenantId

Response: IntegrationVisibilityRule
```

### Whitelist Management

#### Add Tenant to Whitelist
```bash
POST /api/super-admin/integration-catalog/:integrationId/whitelist/:tenantId

Response: IntegrationCatalogEntry
```

#### Remove Tenant from Whitelist
```bash
DELETE /api/super-admin/integration-catalog/:integrationId/whitelist/:tenantId

Response: IntegrationCatalogEntry
```

#### Block Tenant
```bash
POST /api/super-admin/integration-catalog/:integrationId/block/:tenantId

Response: IntegrationCatalogEntry
```

#### Unblock Tenant
```bash
DELETE /api/super-admin/integration-catalog/:integrationId/block/:tenantId

Response: IntegrationCatalogEntry
```

#### Make Integration Public (Remove Whitelist)
```bash
POST /api/super-admin/integration-catalog/:integrationId/make-public

Response: IntegrationCatalogEntry
```

#### Make Integration Private (Enable Whitelist)
```bash
POST /api/super-admin/integration-catalog/:integrationId/make-private
Body: { allowedTenants: string[] }

Response: IntegrationCatalogEntry
```

### Shard Type Mappings

#### Get Shard Mappings
```bash
GET /api/super-admin/integration-catalog/:integrationId/shard-mappings

Response:
{
  integrationId: string;
  shardMappings: EntityToShardTypeMapping[];
  supportedShardTypes: string[];
  relationshipMappings?: RelationshipMapping[];
}
```

#### Update Shard Mappings
```bash
PATCH /api/super-admin/integration-catalog/:integrationId/shard-mappings
Body:
{
  mappings: EntityToShardTypeMapping[]
}

Response:
{
  integrationId: string;
  shardMappings: EntityToShardTypeMapping[];
  supportedShardTypes: string[];
}
```

---

## Frontend Hooks Usage

### List Integrations
```typescript
import { useCatalogEntries } from '@/hooks/use-integration-catalog';

function CatalogList() {
  const { data, isLoading, error } = useCatalogEntries({
    limit: 20,
    offset: 0,
    category: 'crm'
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.entries.map(entry => (
        <div key={entry.id}>{entry.displayName}</div>
      ))}
    </div>
  );
}
```

### Create Integration
```typescript
import { useCreateCatalogEntry } from '@/hooks/use-integration-catalog';

function CreateIntegration() {
  const { mutate, isPending } = useCreateCatalogEntry();

  const handleSubmit = async (formData) => {
    mutate(formData, {
      onSuccess: (data) => {
        console.log('Created:', data);
      },
      onError: (error) => {
        console.error('Failed:', error);
      }
    });
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(new FormData(e.currentTarget));
    }}>
      {/* Form fields */}
      <button type="submit" disabled={isPending}>
        Create Integration
      </button>
    </form>
  );
}
```

### Manage Visibility
```typescript
import { 
  useApproveIntegration, 
  useDenyIntegration 
} from '@/hooks/use-integration-catalog';

function ApprovalControls({ integrationId, tenantId }) {
  const approve = useApproveIntegration(integrationId, tenantId);
  const deny = useDenyIntegration(integrationId, tenantId);

  return (
    <div>
      <button 
        onClick={() => approve.mutate()}
        disabled={approve.isPending}
      >
        Approve
      </button>
      <button 
        onClick={() => deny.mutate('Not suitable for this tenant')}
        disabled={deny.isPending}
      >
        Deny
      </button>
    </div>
  );
}
```

---

## Integration with Tenant API

When a Tenant Admin requests available integrations:

1. **Fetch from Catalog**: Get all active integrations
2. **Apply Visibility Rules**: Filter by:
   - `visibility === 'public'` (or already have special access)
   - `allowedTenants` (if whitelist is enabled)
   - NOT in `blockedTenants`
   - `requiredPlan` matches tenant's pricing tier
   - Visibility rule `isVisible && isApproved` (if rule exists)
3. **Return Filtered List**: Only show available integrations

### Example Flow:

```
Tenant Admin calls: GET /api/tenant/integrations
↓
Tenant Service fetches from catalog
↓
IntegrationVisibilityService filters by:
  - Check visibility (public/private)
  - Check whitelisting
  - Check blocking
  - Check pricing tier
  - Check approval status
↓
Return filtered list to tenant
```

---

## Use Cases

### 1. Add New Enterprise Integration

```typescript
// Super Admin creates Salesforce for Enterprise tier only
POST /api/super-admin/integration-catalog
{
  integrationId: 'salesforce',
  name: 'Salesforce',
  displayName: 'Salesforce CRM',
  description: 'Cloud-based CRM system',
  category: 'crm',
  visibility: 'public',
  requiredPlan: 'enterprise',  // Only Enterprise tenants see it
  capabilities: ['read', 'write', 'delete', 'realtime'],
  supportedSyncDirections: ['pull', 'push', 'bidirectional'],
  authType: 'oauth2',
  supportedShardTypes: ['contact', 'account', 'opportunity'],
  shardMappings: [
    {
      integrationEntity: 'Contact',
      supportedShardTypes: ['contact'],
      defaultShardType: 'contact',
      bidirectionalSync: true
    },
    // ... more mappings
  ]
}

// Result: Only Enterprise tier tenants see Salesforce
```

### 2. Beta Integration with Approval

```typescript
// Super Admin adds beta integration requiring approval
POST /api/super-admin/integration-catalog
{
  integrationId: 'hubspot-beta',
  // ...
  beta: true,
  requiresApproval: true,  // Must be approved before use
  visibility: 'public'
}

// When tenant admin tries to use it:
// 1. Sees integration marked as BETA
// 2. Must request approval
// 3. Super admin approves/denies with reason
// 4. Only after approval can tenant use it
```

### 3. Whitelist Specific Tenants

```typescript
// Super Admin allows only certain customers to use premium integration
POST /api/super-admin/integration-catalog/:integrationId/make-private
{
  allowedTenants: ['tenant-uuid-1', 'tenant-uuid-2', 'tenant-uuid-3']
}

// Now: Only these 3 tenants see the integration
// Other tenants: Integration marked as "unavailable"
```

### 4. Block Tenant from Integration

```typescript
// Super Admin blocks a tenant from using an integration
POST /api/super-admin/integration-catalog/:integrationId/block/:tenantId

// Result: Tenant cannot activate this integration
//         Tenant sees "This integration is not available for your account"
```

### 5. Custom Capabilities Restriction

```typescript
// Super Admin restricts this tenant to only "read" capability
POST /api/super-admin/integration-catalog/:integrationId/visibility/:tenantId
{
  customCapabilities: ['read']  // Can only read, not write/delete
}

// Result: Tenant can only pull data, cannot push
```

---

## Best Practices

### 1. Shard Type Mapping
Always define clear shard type mappings when adding integrations:
- Each external entity must map to at least one shard type
- Set a default shard type for convenience
- Document relationships between entities

### 2. Pricing Tiers
Use pricing restrictions to monetize features:
- Free: Basic integrations (email, basic forms)
- Pro: Advanced CRM/communication tools
- Enterprise: Premium integrations (Salesforce, complex systems)

### 3. Approval Workflows
Require approval for:
- New integrations (while testing)
- Complex integrations (custom setup needed)
- Resource-heavy integrations (rate limiting)

### 4. Documentation
Always include:
- Setup guide URL
- Documentation URL
- Support contact
- Scopes required
- Limitations

---

## Migration Guide

If migrating from existing integration system:

1. **Create catalog entries** for all existing integrations
2. **Set default visibility rules** for all tenants
3. **Map shard types** for each integration
4. **Review pricing tiers** and adjust as needed
5. **Set up approval rules** for beta/new integrations
6. **Test thoroughly** with tenant admins

---

## Troubleshooting

### Tenant can't see integration

**Check:**
1. Is integration `visibility === 'public'`?
2. Is integration NOT in `blockedTenants`?
3. If whitelist enabled, is tenant in `allowedTenants`?
4. Does tenant's tier meet `requiredPlan`?
5. Is visibility rule `isVisible === true`?
6. Is visibility rule `isApproved === true` (if required)?

### Integration marked as deprecated

**Action:**
- Existing connections continue working
- New tenants cannot activate it
- Encourage migration to new alternative

### Rate limit issues

**Solutions:**
1. Super Admin can increase `rateLimit` for specific tenant
2. Check `customRateLimit` overrides
3. Monitor tenant usage patterns

---

## Related Documentation

- **Integration System Complete**: See INTEGRATION-SYSTEM-COMPLETE.md
- **Visibility Service**: IntegrationVisibilityService in services/
- **Shard Type Mappings**: EntityToShardTypeMapping in types/
- **Tenant Integration API**: See routes/tenant.routes.ts

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Super admin catalog management fully implemented

#### Implemented Features (✅)

- ✅ Integration catalog management
- ✅ Visibility rule management
- ✅ Whitelist/block tenant management
- ✅ Shard type mappings
- ✅ Pricing tier restrictions
- ✅ API endpoints
- ✅ Super admin UI

#### Known Limitations

- ⚠️ **Catalog UI** - Super admin UI may need verification
  - **Code Reference:**
    - Frontend components may need review
  - **Recommendation:**
    1. Verify super admin UI implementation
    2. Test catalog management workflows
    3. Document UI usage

- ⚠️ **Visibility Rules** - Visibility rule resolution may need testing
  - **Recommendation:**
    1. Test visibility rule resolution
    2. Verify tenant filtering
    3. Document visibility behavior

### Code References

- **Backend Services:**
  - `apps/api/src/services/integration-catalog.service.ts` - Catalog service
  - `apps/api/src/services/integration-visibility.service.ts` - Visibility service

- **API Routes:**
  - `/api/v1/super-admin/integration-catalog/*` - Catalog management
  - `/api/v1/super-admin/integration-visibility/*` - Visibility management

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Integrations Feature](../features/integrations/README.md) - Integration system
- [Backend Documentation](../backend/README.md) - Backend implementation
