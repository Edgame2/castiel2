# Tenant List and Admin Tenants — Plan Feedbacks Remaining Work §1

Super Admin tenant list and tenant detail are backed by user-management (organizations). Recommendations service proxies to user-management for real data.

---

## 1. Flow overview

| Request | Gateway route | Backend | Notes |
|---------|---------------|---------|--------|
| `GET /api/v1/admin/tenants` | → recommendations | recommendations calls user-management `GET /api/v1/admin/organizations` (config `services.user_management.url`), maps orgs → TenantSummary, returns `{ items }`. |
| `GET /api/v1/admin/tenants/:tenantId` | → recommendations | recommendations calls user-management `GET /api/v1/admin/organizations/:tenantId`, maps to tenant detail. |
| `GET /api/v1/admin/organizations` | → user_management | user-management lists all organizations (Super Admin only); gateway route when user_management.url is set. |

---

## 2. Config to verify

- **api-gateway** `config/default.yaml`: `services.user_management.url`, `services.recommendations.url`; routes `/api/v1/admin/organizations` → user_management, `/api/v1/admin/tenants` → recommendations.
- **recommendations** `config/default.yaml`: `services.user_management.url` (no hardcoded URL); used to call admin/organizations with forwarded Authorization header.
- **user-management:** Cosmos/DB for organizations; Super Admin role required for `listAllOrganizationsForSuperAdmin` and `getOrganizationForSuperAdmin`.

---

## 3. How to verify at runtime

1. **Super Admin user:** Ensure the user has at least one organization membership with role `isSuperAdmin: true`.
2. **Tenant list:** As Super Admin, call `GET /api/v1/admin/tenants` (via gateway); expect `items` array of tenants (id, name, status, createdAt, …). If user_management URL is not set in recommendations, list returns empty with a warning in logs.
3. **Tenant detail:** `GET /api/v1/admin/tenants/:id` returns one tenant or 404.
4. **Direct admin orgs:** `GET /api/v1/admin/organizations` (via gateway) returns `{ items: [ … ] }` from user-management when called with Super Admin auth.

---

## 4. Troubleshooting

- **Empty tenant list:** Check recommendations log for "user_management URL not configured"; set `USER_MANAGEMENT_URL` or `services.user_management.url` in recommendations config. Confirm user is Super Admin in at least one org.
- **403 on admin/organizations:** Caller must have Super Admin role in at least one organization (user-management checks `organizationMembership` + `role.isSuperAdmin`).
- **Gateway 404 for /api/v1/admin/tenants:** Ensure recommendations URL is configured in gateway so `/api/v1/admin/tenants` is registered.

See also: [feedback-recommendation-flow.md](feedback-recommendation-flow.md), [deployment/monitoring/README.md](../README.md).
