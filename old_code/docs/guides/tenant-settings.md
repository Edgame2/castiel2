# 🏢 Tenant Settings

> Configure tenant-specific settings including fiscal year, feature flags, and preferences.

---

## Table of Contents

1. [Overview](#overview)
2. [Fiscal Year Configuration](#fiscal-year-configuration)
3. [Dashboard Configuration](#dashboard-configuration)
4. [SSO Configuration](#sso-configuration)
5. [API Reference](#api-reference)

---

## Overview

Tenant Admins can configure various settings for their organization. These settings affect how the platform behaves for all users within the tenant.

### Available Settings

| Setting | Description | Configured By |
|---------|-------------|---------------|
| Fiscal Year | Start of fiscal year (month/day) | Tenant Admin |
| Dashboard Limits | Override global dashboard limits | Super Admin |
| Dashboard Features | Enable/disable dashboard features | Super Admin |
| SSO Group Mapping | Map SSO groups to platform groups | Tenant Admin |

---

## Fiscal Year Configuration

The fiscal year configuration determines how date presets like "This Fiscal Quarter" and "This Fiscal Year" are calculated.

### Configuration Model

```typescript
interface TenantFiscalYearConfig {
  tenantId: string;
  
  fiscalYearStart: {
    month: number;    // 1-12 (1 = January)
    day: number;      // 1-31
  };
  
  // Metadata
  configuredAt: Date;
  configuredBy: string;
}
```

### Common Fiscal Year Starts

| Region/Standard | Month | Day | Example |
|-----------------|-------|-----|---------|
| Calendar Year (US) | 1 | 1 | Jan 1 |
| US Federal Government | 10 | 1 | Oct 1 |
| UK Tax Year | 4 | 6 | Apr 6 |
| Australia/NZ | 7 | 1 | Jul 1 |
| India | 4 | 1 | Apr 1 |
| Japan | 4 | 1 | Apr 1 |

### Fiscal Period Calculations

Given a fiscal year start of **October 1**:

| Date | Fiscal Year | Fiscal Quarter |
|------|-------------|----------------|
| Sep 15, 2025 | FY2025 | Q4 |
| Oct 15, 2025 | FY2026 | Q1 |
| Jan 15, 2026 | FY2026 | Q2 |
| Apr 15, 2026 | FY2026 | Q3 |
| Jul 15, 2026 | FY2026 | Q4 |

### Dashboard Date Presets

When fiscal year is configured, these presets become available:

| Preset | Description |
|--------|-------------|
| `this_fiscal_quarter` | Current fiscal quarter |
| `last_fiscal_quarter` | Previous fiscal quarter |
| `this_fiscal_year` | Current fiscal year |
| `last_fiscal_year` | Previous fiscal year |

### API Endpoints

```http
# Get fiscal year configuration
GET /api/tenant/fiscal-year

Response:
{
  "tenantId": "tenant-123",
  "fiscalYearStart": {
    "month": 10,
    "day": 1
  },
  "configuredAt": "2025-01-15T10:00:00Z",
  "configuredBy": "user-456"
}

# Update fiscal year configuration
PATCH /api/tenant/fiscal-year
Body: {
  "fiscalYearStart": {
    "month": 10,
    "day": 1
  }
}
```

---

## Dashboard Configuration

Super Admin can configure dashboard settings per tenant, overriding global defaults.

### Configuration Model

```typescript
interface TenantDashboardConfig {
  tenantId: string;
  
  // Enable/disable dashboards for this tenant
  dashboardsEnabled: boolean;
  
  // Feature overrides
  features?: {
    customDashboards?: boolean;
    dashboardSharing?: boolean;
    customWidgets?: boolean;
    dashboardTemplates?: boolean;
    dashboardExport?: boolean;
    realTimeUpdates?: boolean;
  };
  
  // Limit overrides
  limits?: {
    maxDashboardsPerUser?: number;
    maxDashboardsPerTenant?: number;
    maxWidgetsPerDashboard?: number;
    maxCustomQueries?: number;
  };
  
  // Metadata
  configuredAt: Date;
  configuredBy: string;
}
```

### Override Behavior

| Setting | Tenant Config | Global Config | Result |
|---------|---------------|---------------|--------|
| `dashboardsEnabled` | `true` | `false` | **Disabled** (global takes precedence) |
| `dashboardsEnabled` | `false` | `true` | **Disabled** (tenant override) |
| `maxDashboardsPerUser` | `20` | `10` | **20** (tenant override) |
| `maxDashboardsPerUser` | not set | `10` | **10** (global default) |

### API Endpoints (Super Admin)

```http
# Get tenant dashboard config
GET /api/admin/tenants/:tenantId/dashboard-config

# Update tenant dashboard config
PATCH /api/admin/tenants/:tenantId/dashboard-config
Body: {
  "dashboardsEnabled": true,
  "limits": {
    "maxDashboardsPerUser": 20
  }
}

# Reset to global defaults
DELETE /api/admin/tenants/:tenantId/dashboard-config
```

---

## SSO Configuration

Tenant Admin configures how SSO groups are mapped to platform groups.

See [User Groups - SSO Groups](./user-groups.md#sso-groups) for full documentation.

### Quick Reference

```http
# Get SSO group mapping
GET /api/tenant/sso/group-mapping

# Update SSO group mapping
PATCH /api/tenant/sso/group-mapping
Body: {
  "groupClaim": {
    "claimName": "groups",
    "claimType": "array"
  },
  "mappings": [
    {
      "externalGroupId": "azure-group-123",
      "platformGroupId": "sales-group"
    }
  ],
  "autoCreateGroups": true,
  "syncOnLogin": true
}

# Trigger manual sync
POST /api/tenant/sso/group-mapping/sync
```

---

## API Reference

### Fiscal Year

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tenant/fiscal-year` | Get fiscal year config |
| `PATCH` | `/api/tenant/fiscal-year` | Update fiscal year |

### Dashboard Config (Super Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/tenants/:id/dashboard-config` | Get tenant config |
| `PATCH` | `/api/admin/tenants/:id/dashboard-config` | Update tenant config |
| `DELETE` | `/api/admin/tenants/:id/dashboard-config` | Reset to defaults |

### SSO Group Mapping

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tenant/sso/group-mapping` | Get mapping config |
| `PATCH` | `/api/tenant/sso/group-mapping` | Update mapping |
| `POST` | `/api/tenant/sso/group-mapping/sync` | Trigger sync |
| `POST` | `/api/tenant/sso/group-mapping/test` | Test token parsing |

---

## Related Documentation

- [Dashboard System](../features/dashboard/README.md)
- [User Groups](./user-groups.md)
- [Authentication](./authentication.md)

---

**Last Updated**: January 2025  
**Version**: 1.0.0

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Tenant settings fully documented

#### Implemented Features (✅)

- ✅ Fiscal year configuration
- ✅ Dashboard configuration
- ✅ SSO configuration
- ✅ API endpoints
- ✅ Configuration models

#### Known Limitations

- ⚠️ **Fiscal Year Calculations** - Fiscal year calculations may need verification
  - **Recommendation:**
    1. Test fiscal year calculations
    2. Verify date preset calculations
    3. Document edge cases

- ⚠️ **Dashboard Configuration** - Dashboard configuration may not be fully integrated
  - **Recommendation:**
    1. Verify dashboard configuration integration
    2. Test configuration overrides
    3. Document configuration behavior

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Dashboard System](../features/dashboard/README.md) - Dashboard documentation
- [Authentication Guide](./authentication.md) - SSO configuration











