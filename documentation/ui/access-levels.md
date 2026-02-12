# UI Access Levels

This document defines who can access what in the Castiel UI. For the full route inventory, see [pages.md](./pages.md).

## Access levels

| Level | Description |
|-------|-------------|
| **Public** | No authentication. Login, register, forgot-password, reset-password, verify-email, accept-invitation, logout, unauthorized, not-found. |
| **User** | Any authenticated user. Dashboard, opportunities, accounts, contacts, products, recommendations, settings (profile, security, MFA, integrations, competitors, etc.). |
| **Tenant Admin** | Tenant-scoped administration. Users, roles, invitations, API keys, and audit **within their tenant only**. |
| **Super Admin** | Platform-wide administration. Tenants, system config, shard types, all catalogs, and cross-tenant configuration. |

## Tenant Admin vs Super Admin

- **Tenant Admin**  
  - **Scope:** Single tenant (organization).  
  - **Can do:** Manage users, roles, invitations, API keys, audit log, and tenant-facing config (e.g. integrations, competitors) for **that tenant only**.  
  - **Cannot do:** Create/delete tenants, change system-wide config, access other tenants’ data, or manage platform catalogs (e.g. shard types, integration catalog) in a platform-wide way.

- **Super Admin**  
  - **Scope:** Entire platform.  
  - **Can do:** Everything Tenant Admin can do (per tenant) **plus** tenant CRUD, system config (logging, performance, data lake, API security), shard types, web search schedules, action catalog, analytics, CAIS, decision rules, feature engineering, feedback types, ML models, risk catalog, sales methodology, security (users/roles/invitations across tenants if applicable), and system admin settings.  
  - **Backend:** APIs under `/api/v1/admin/*` and `/api/v1/super-admin/*` enforce Super Admin or equivalent permission.

## How the UI enforces access

- **Shared `/admin` routes:** Tenant Admin and Super Admin both use routes under `/admin` (e.g. `/admin/security/users`, `/admin/security/roles`).  
- **Role-based visibility:** Nav/sidebar and page-level checks should hide or disable Super-Admin–only areas (e.g. Tenants, System, Shard types) for Tenant Admin. The backend must enforce scope: Tenant Admin calls return only their tenant’s data; Super Admin calls can operate platform-wide where allowed.  
- **Alternative (if adopted):** A dedicated base path (e.g. `/tenant-admin`) for tenant-scoped user/role/invite management could be used; today the plan is shared URLs with role-based visibility.  
- **Auth:** All protected routes require a valid session (e.g. `accessToken` cookie). Unauthorized users are redirected to `/login`. Unauthorized actions return 403; the UI can show `/unauthorized` or a message.

## References

- [pages.md](./pages.md) — Full UI page inventory by access level.  
- [requirements.md](./requirements.md) — Auth, API usage, and implementation standards.  
- Backend permission matrix and gateway role checks — see project docs for API-level enforcement.
