# Exhaustive UI Page Inventory

All UI pages required for the Castiel application, grouped by access level. Routes use Next.js App Router under `ui/src/app/`.

**See [access-levels.md](./access-levels.md) for Tenant Admin vs Super Admin and how access is enforced.**

**Access levels:**
- **Public** — No auth (login, register, etc.)
- **User** — Any authenticated user
- **Tenant Admin** — Tenant-scoped administration (users, roles, invite within tenant)
- **Super Admin** — Platform-wide administration (tenants, system, all config)

---

## 1. Public (unauthenticated)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/login` | Login | Layout + page |
| `/register` | User registration | Layout + page |
| `/forgot-password` | Request password reset | Layout + page |
| `/reset-password` | Reset password (token from email) | Page |
| `/verify-email` | Verify email (token from email) | Page |
| `/accept-invitation` | Accept tenant invitation (token) | Page |
| `/logout` | Logout (POST then redirect) | Page |
| `/unauthorized` | Shown when user lacks permission | Page |
| `/not-found` | Global 404 with links (Home, Dashboard, Login) | not-found.tsx |

---

## 2. Authenticated — User (all logged-in users)

### 2.1 Home and dashboard

| Route | Purpose | Notes |
|-------|---------|--------|
| `/` | Home / landing (redirect or dashboard entry) | page.tsx |
| `/dashboard` | Dashboard overview | Page |
| `/dashboard/board` | Board view | Page |
| `/dashboard/executive` | Executive dashboard | Page |
| `/dashboard/manager` | Manager dashboard | Page |

### 2.2 Opportunities (CRUD + risk/remediation)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/opportunities` | List opportunities | Data table (real API: shards c_opportunity); first column → detail |
| `/opportunities/[id]` | View/edit opportunity | Detail + actions; real API (anomalies, remediation-workflows) |
| `/opportunities/[id]/risk` | Opportunity risk analysis | Risk gauge, trajectory, velocity, explainability; real API (latest-evaluation, risk-predictions, risk-velocity) |
| `/opportunities/[id]/remediation` | Remediation workflow | Steps, complete step, cancel; real API (remediation-workflows) |
| `/opportunities/[id]/recommendations` | Recommendations for opportunity | In-context recommendations |

### 2.3 Accounts

| Route | Purpose | Notes |
|-------|---------|--------|
| `/accounts` | List accounts | Data table (real API: shards c_account); exists |
| `/accounts/[id]` | View/edit account | Detail; real API (shards/:id, accounts/:id/health) |

### 2.4 Contacts

| Route | Purpose | Notes |
|-------|---------|--------|
| `/contacts` | List contacts | Data table (real API: shards c_contact); Edit, Delete with confirm; exists |
| `/contacts/new` | Create contact | Form (React Hook Form + Zod); POST shards; exists |
| `/contacts/[id]` | View/edit contact | Detail + edit + delete; real API (shards CRUD); exists |
| *(delete)* | Delete contact | In-list or on detail; AlertDialog + toast; exists |

### 2.5 Products (user-facing catalog)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/products` | List products (tenant view) | Data table (real API: GET /api/v1/products); exists |
| `/products/[id]` | View product | Read-only detail (real API: GET /api/v1/products/:id); exists |

*Note: Admin products (Super Admin) are under `/admin/products`.*

### 2.6 Competitors

| Route | Purpose | Notes |
|-------|---------|--------|
| `/settings/competitors` | List/add/edit/delete competitors | Tenant-level; exists |

### 2.7 Recommendations

| Route | Purpose | Notes |
|-------|---------|--------|
| `/recommendations` | List recommendations | Data table; exists |
| `/recommendations/[id]` | Recommendation detail | Exists |

### 2.8 Conversations / messaging

| Route | Purpose | Notes |
|-------|---------|--------|
| `/conversations` | List conversations | List + create; exists |
| `/conversations/[id]` | Single conversation / thread | Exists |

### 2.9 Analytics (user-facing)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/analytics/benchmarks` | Benchmarks | Exists |
| `/analytics/competitive` | Competitive analytics | Exists |
| `/analytics/forecast` | Forecast overview | Exists |
| `/analytics/forecast/[period]` | Forecast by period | Exists |
| `/analytics/forecast/accuracy` | Forecast accuracy | Exists |
| `/analytics/forecast/record-actual` | Record actuals | Exists |
| `/analytics/forecast/team` | Team forecast | Exists |
| `/analytics/forecast/tenant` | Tenant forecast | Exists |
| `/analytics/portfolios` | Portfolios | Exists |

### 2.10 Search

| Route | Purpose | Notes |
|-------|---------|--------|
| `/search` | Global search | Exists |

### 2.11 Models (user-facing)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/models/[id]` | View model (e.g. ML model card) | Exists |

### 2.12 Settings (user and tenant-facing)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/settings` | Settings overview / index | Exists |
| `/settings/profile` | Edit profile (name, email, etc.) | Exists |
| `/settings/security` | Password, sessions, MFA status, API keys | Exists |
| `/settings/mfa/enroll` | Enroll MFA (TOTP) | Exists |
| `/settings/mfa/verify` | Verify MFA or backup code | Exists |
| `/settings/integrations` | List integrations (tenant) | Exists |
| `/settings/integrations/[id]` | Integration overview | Exists |
| `/settings/integrations/[id]/field-mappings` | Field mappings for integration | Exists |
| `/settings/integrations/[id]/health` | Integration health | Exists |
| `/settings/integrations/[id]/sync` | Sync config / trigger sync | Exists |
| `/settings/competitors` | Competitors (see 2.6) | Exists |
| `/settings/industries` | Industries config | Exists |
| `/settings/entity-linking` | Entity linking settings/rules | Exists |
| `/settings/processing` | Processing settings | Exists |

---

## 3. Authenticated — Tenant Admin

Tenant admins manage users, roles, and invitations **within their tenant**. These may live under `/admin` with role-based visibility or under a dedicated `/tenant-admin` (or org) path — **clarify which**.

| Route | Purpose | Notes |
|-------|---------|--------|
| *(Tenant admin home / overview)* | Optional landing | e.g. `/admin` or `/tenant-admin` with tenant-scoped nav |
| **Users** | | |
| `/admin/security/users` | List users (tenant) | Data table; Edit, Delete, Invite; exists |
| `/admin/security/users/[id]` | View/edit user | Exists |
| `/admin/security/users/invite` | Invite user to tenant | Exists |
| **Roles** | | |
| `/admin/security/roles` | List roles (tenant) | Data table; exists |
| `/admin/security/roles/new` | Create role | Exists |
| `/admin/security/roles/[id]` | View/edit role | Exists |
| **Invitations** | | |
| `/admin/security/invitations` | List pending invitations | Exists |
| **API keys (tenant-scoped)** | | |
| `/admin/security/api-keys` | List API keys (tenant) | Exists |
| `/admin/security/api-keys/new` | Create API key | Exists |
| **Audit (tenant-scoped)** | | |
| `/admin/security/audit` | Audit log (tenant) | Exists |

*Note: If Super Admin and Tenant Admin share the same URLs, enforce visibility and actions by role (e.g. tenant admin cannot access Tenants, System, Shard types).*

---

## 4. Authenticated — Super Admin

All under `ui/src/app/admin/`. Only Super Admin role can access (or hide nav items by role).

### 4.1 Admin overview

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin` | Admin overview / landing | Exists |
| `/admin/settings` | Admin settings (if any) | Exists (page) |

### 4.2 Shard management

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/shard-types` | List/manage shard types | Exists |

### 4.3 Web search

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/web-search/schedules` | Web search schedules | Exists |

### 4.4 Action catalog

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/action-catalog` | Action catalog overview | Exists |
| `/admin/action-catalog/categories` | List categories | Exists (categories/page.tsx) |
| `/admin/action-catalog/categories/new` | Create category | Exists |
| `/admin/action-catalog/categories/[id]` | View/edit category | Exists |
| `/admin/action-catalog/entries` | List entries | Exists |
| `/admin/action-catalog/entries/new` | Create entry | Exists |
| `/admin/action-catalog/entries/[id]` | View/edit entry | Exists |
| `/admin/action-catalog/relationships` | List relationships | Exists |
| `/admin/action-catalog/relationships/new` | Create relationship | Exists |
| `/admin/action-catalog/relationships/[id]` | View/edit relationship | Exists |

### 4.5 Analytics (admin)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/analytics` | Analytics overview | Exists |
| `/admin/analytics/dashboards` | List dashboards | Exists |
| `/admin/analytics/dashboards/new` | Create dashboard | Exists |
| `/admin/analytics/dashboards/[id]` | View/edit dashboard | Exists |
| `/admin/analytics/reports` | List reports | Exists |
| `/admin/analytics/reports/new` | Create report | Exists |
| `/admin/analytics/reports/[id]` | View/edit report | Exists |
| `/admin/analytics/export` | Export config | Exists |

### 4.6 CAIS / Context

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/cais` | CAIS (adaptive learning) config | Exists |
| `/admin/context` | Context config | Exists |

### 4.7 Decision rules

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/decision-rules` | Decision rules overview | Exists |
| `/admin/decision-rules/rules` | List rules | Exists |
| `/admin/decision-rules/rules/new` | Create rule | Exists |
| `/admin/decision-rules/rules/[id]` | View/edit rule | Exists |
| `/admin/decision-rules/templates` | List templates | Exists |
| `/admin/decision-rules/templates/new` | Create template | Exists |
| `/admin/decision-rules/templates/[id]` | View/edit template | Exists |
| `/admin/decision-rules/conflicts` | Conflict resolution | Exists |

### 4.8 Feature engineering

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/feature-engineering` | Overview | Exists |
| `/admin/feature-engineering/features` | List features | Exists |
| `/admin/feature-engineering/features/new` | Create feature | Exists |
| `/admin/feature-engineering/features/[id]` | View/edit feature | Exists |
| `/admin/feature-engineering/quality` | Quality rules / checks | Exists |
| `/admin/feature-engineering/versioning` | Versioning policy | Exists |

### 4.9 Feedback

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/feedback` | Feedback overview | Exists |
| `/admin/feedback/types` | List feedback types | Exists |
| `/admin/feedback/types/new` | Create feedback type | Exists |
| `/admin/feedback/types/[id]` | View/edit feedback type | Exists |
| `/admin/feedback/global-settings` | Global feedback settings | Exists |

### 4.10 Integrations catalog (platform)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/integrations/catalog` | Platform integrations catalog | Exists |

### 4.11 ML models

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/ml-models` | ML models overview | Exists |
| `/admin/ml-models/models` | List models | Exists |
| `/admin/ml-models/models/new` | Create model | Exists |
| `/admin/ml-models/models/[id]` | View/edit model | Exists |
| `/admin/ml-models/endpoints` | List endpoints | Exists |
| `/admin/ml-models/endpoints/new` | Create endpoint | Exists |
| `/admin/ml-models/endpoints/[id]` | View/edit endpoint | Exists |
| `/admin/ml-models/features` | ML features | Exists |
| `/admin/ml-models/monitoring` | Monitoring / alerts | Exists |

### 4.12 Monitoring (platform)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/monitoring` | Platform health, queues, processors | Exists |

### 4.13 Multimodal

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/multimodal` | List multimodal configs | Exists |
| `/admin/multimodal/[id]` | View/edit multimodal | Exists |

### 4.14 Products (platform config)

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/products` | List products (platform) | Exists |
| `/admin/products/new` | Create product | Exists |
| `/admin/products/[id]` | View/edit product | Exists |

### 4.15 Prompts

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/prompts` | List prompts | Exists |
| `/admin/prompts/[id]` | View/edit prompt | Exists |
| `/admin/prompts/analytics` | Prompt analytics | Exists |

### 4.16 Risk catalog

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/risk-catalog` | List risk catalog entries | Exists |
| `/admin/risk-catalog/new` | Create risk catalog entry | Exists |
| `/admin/risk-catalog/[id]` | View/edit risk catalog entry | Exists |

### 4.17 Sales methodology

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/sales-methodology` | Sales methodology overview | Exists |
| `/admin/sales-methodology/config` | Methodology config | Exists |
| `/admin/sales-methodology/meddic` | MEDDIC config | Exists |

### 4.18 Security (platform or tenant — see §3)

*Listed in Tenant Admin (§3); same routes used. Super Admin may see additional scope (e.g. all tenants’ audit) or same UI with broader backend scope.*

### 4.19 System

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/system` | System overview | Exists |
| `/admin/system/api-security` | API security config | Exists |
| `/admin/system/data-lake` | Data lake config | Exists |
| `/admin/system/logging` | Logging overview | Exists |
| `/admin/system/logging/config` | Logging config | Exists |
| `/admin/system/performance` | Performance config | Exists |

### 4.20 Tenant ML config

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/tenant-ml-config` | Tenant ML configuration | Exists |

### 4.21 Tenants

| Route | Purpose | Notes |
|-------|---------|--------|
| `/admin/tenants` | Tenants overview (counts, links) | Exists |
| `/admin/tenants/list` | List tenants | Data table; exists |
| `/admin/tenants/new` | Create tenant | Exists |
| `/admin/tenants/[id]` | View/edit tenant | Exists |
| `/admin/tenants/templates` | Tenant templates | Exists |

---

## 5. API communication

All API calls go directly from the browser to the gateway at `NEXT_PUBLIC_API_BASE_URL`. No proxy; gateway must allow CORS from the UI origin.

---

## 6. Gaps and clarifications

- **Tenant Admin vs Super Admin** — Same URLs under `/admin` with role-based visibility, or separate base path (e.g. `/tenant-admin`) for tenant-scoped user/role/invite management. Confirm and document in nav/sidebar logic.
- **Action catalog** — List at `/admin/action-catalog/categories`; overview at `/admin/action-catalog`.
- **i18n** — Requirements require all user-visible strings behind i18n keys and a language switcher; not yet implemented in the UI codebase.

---

## 7. Data table and actions (reminder)

Per requirements, list pages with tabular data must:
- First column (Name/Title/primary id): clickable → detail page.
- Last column: **Actions** (at least **Edit**, **Delete**; dropdown if needed).
- **Delete**: confirmation dialog (AlertDialog); success/error via toast.
- **Edit**: navigate to edit/detail page.

Apply to: opportunities, accounts, contacts, recommendations, all admin list pages (users, roles, tenants, products, risk-catalog, feedback types, etc.).
