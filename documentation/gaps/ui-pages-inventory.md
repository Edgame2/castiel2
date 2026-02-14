# UI Pages Inventory — ui

**Date:** 2026-02-07  
**Scope:** All pages that exist or should exist in `ui` (Next.js App Router).  
**Includes:** Full CRUD per resource; Super Admin, Tenant Admin, and User audiences.

---

## 1. Decisions (product answers)

| Topic | Decision |
|-------|----------|
| **Auth** | Implemented in this UI (login, register, forgot-password, reset-password, verify-email, logout, accept-invitation). Pages call gateway `/api/v1/auth/*` and redirect as needed. |
| **MFA** | Full pages (enroll, verify). |
| **User management** | Admin user detail `/admin/security/users/[id]` and tenant “my profile” `/settings/profile` — all required. |
| **AI** | Expose ai-conversation, prompt-service, multi-modal in UI. Implemented: conversations, prompts, and multimodal pages (see §3.11–§3.13). |
| **Search/context** | Yes — add `/search` (and context if applicable). |
| **Logging** | View-only + Search for audit/data collection (no edit of data collection config in UI). |
| **Integration detail** | One page `/settings/integrations/[id]` with health, sync, and field-mappings on it. |
| **Recommendations / forecast** | Yes — all tenant-facing pages. |
| **Errors** | Yes — explicit `not-found` and unauthorized (401) pages. |
| **Tenant creation** | Super Admin creates tenants from UI (`/admin/tenants/new`). |
| **Organization vs tenant** | No "Organization" concept in UI; only tenants. All settings under `admin/settings`. |
| **Forecast UX** | Both an overview page and detailed pages. |
| **Recommendations UX** | Primarily per opportunity + a page listing all recommendations. |
| **CRUD** | Explicit `/new` and `/[id]` pages for all admin resources (action-catalog, decision-rules, ML, feedback, products, risk-catalog, dashboards/reports). |
| **Context** | Super Admin page (platform context) and Tenant Admin page (tenant context). |
| **Pending invitations** | Yes — dedicated page for Tenant Admin to list, resend, and cancel pending invites. |
| **User sessions** | Yes — user detail includes a "Sessions" section to view/revoke active sessions. |
| **Record actual (forecast)** | Dedicated page at `/analytics/forecast/record-actual`. |

---

## 2. Audience legend

- **Super Admin** — Platform-level; all tenants, system config, tenant CRUD.
- **Tenant Admin** — Organization/tenant-scoped; users, roles, org settings, security within tenant.
- **User** — Tenant member; own profile, dashboard, opportunities, settings (no user/role admin).

CRUD: **L**ist | **C**reate | **R**ead (detail) | **U**pdate | **D**elete.  
Status: **Done** = page exists; **Todo** = to implement.

---

## 3. Master list (all pages)

### 3.1 Auth & session (User; unauthenticated for login/register)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/login` | Login (credentials, OAuth entry) | — | Done |
| `/register` | Registration | — | Done |
| `/forgot-password` | Request password reset | — | Done |
| `/reset-password` | Reset password (token in query) | — | Done |
| `/verify-email` | Email verification (token in query) | — | Done |
| `/logout` | Logout (action or redirect; may be no dedicated page) | — | Done |
| `/accept-invitation` | Accept invitation (invitee; token in query) | — | Done |

### 3.2 MFA (User / Tenant Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/settings/security` | Account security (MFA entry, sessions) | R, U | Done |
| `/settings/mfa/enroll` | MFA enrollment (TOTP, backup codes) | C | Done |
| `/settings/mfa/verify` | MFA verification (e.g. after login) | — | Done |

### 3.3 Profile & account (User)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/settings/profile` | Current user profile (edit self) | R, U | Done |

### 3.4 Public / app shell (User)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/` | Home | — | Done |
| `/dashboard` | Dashboard landing | — | Done |
| `/dashboard/manager` | Manager view | — | Done |
| `/dashboard/executive` | Executive view | — | Done |
| `/dashboard/board` | Board view | — | Done |

### 3.5 Opportunities & accounts (User)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/opportunities` | Opportunities list | L | Done |
| `/opportunities/[id]` | Opportunity detail | R | Done |
| `/opportunities/[id]/risk` | Opportunity risk | R | Done |
| `/opportunities/[id]/remediation` | Opportunity remediation | R, U | Done |
| `/accounts/[id]` | Account detail | R | Done |

### 3.6 Models (User)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/models/[id]` | Model detail | R | Done |

### 3.7 Analytics — tenant (User)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/analytics/competitive` | Competitive analytics | L, R | Done |
| `/analytics/benchmarks` | Benchmarks | L, R | Done |
| `/analytics/portfolios` | Portfolios | L, R | Done |
| `/analytics/forecast` | Forecast overview / scenarios | L, R | Done |
| `/analytics/forecast/[period]` | Period scenario / risk-adjusted / ML | R | Done |
| `/analytics/forecast/team` | Team-level forecast aggregate | L, R | Done |
| `/analytics/forecast/tenant` | Tenant-level forecast aggregate | L, R | Done |
| `/analytics/forecast/accuracy` | Forecast accuracy (MAPE, bias, R²) | R | Done |
| `/analytics/forecast/record-actual` | Record actual for prediction (dedicated page) | C, U | Done |

### 3.8 Recommendations (User)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/recommendations` | All recommendations list (with filters) | L | Done |
| `/opportunities/[id]/recommendations` | Recommendations for one opportunity | L, R, U (feedback) | Done |
| `/recommendations/[id]` | Recommendation detail + feedback | R, U (feedback) | Done |

### 3.9 Search (User / Tenant Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/search` | Global or scoped search | L | Done |

### 3.10 Settings — tenant (User / Tenant Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/settings` | Settings landing (links to competitors, industries, integrations, etc.) | — | Done |
| `/settings/competitors` | Competitors | L, C, R, U, D | Done |
| `/settings/industries` | Industries | L, R | Done |
| `/settings/integrations` | Integrations list | L, C (connect) | Done |
| `/settings/integrations/[id]` | Integration detail (health + sync + field-mappings on one page) | R, U | Done |
| `/settings/integrations/[id]/field-mappings` | Field mappings (if kept as sub-route) | R, U | Done |
| `/settings/integrations/[id]/health` | Health (if kept as sub-route) | R | Done |
| `/settings/integrations/[id]/sync` | Sync (if kept as sub-route) | R, U | Done |
| `/settings/entity-linking` | Entity linking | L, R, U | Done |
| `/settings/processing` | Processing | R, U | Done |

### 3.11 AI — conversations (User)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/conversations` | List or entry for AI conversations | L, C | Done |
| `/conversations/[id]` | Single conversation (chat) | R, U | Done |

### 3.12 AI — prompts (Tenant Admin / Super Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/admin/prompts` | Prompt list | L, C | Done |
| `/admin/prompts/[id]` | Prompt detail / edit | R, U, D | Done |
| `/admin/prompts/analytics` | Prompt analytics | R | Done |

### 3.13 AI — multi-modal (User or Tenant Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/admin/multimodal` or `/tools/multimodal` | Multi-modal jobs list / upload | L, C | Done |
| `/admin/multimodal/[id]` or `/tools/multimodal/[id]` | Job status / result | R | Done |

### 3.14 Admin — overview (Tenant Admin / Super Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/admin` | Admin overview | — | Done |

### 3.15 Admin — security (Tenant Admin; Super Admin for cross-tenant if needed)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/admin/security` | Security overview | — | Done |
| `/admin/security/users` | Users list | L | Done |
| `/admin/security/users/[id]` | User detail (admin view; includes Sessions to view/revoke) | R, U, D (e.g. deactivate) | Done |
| `/admin/security/users/invite` | Invite user | C | Done |
| `/admin/security/invitations` | Pending invitations (list, resend, cancel) | L, R, U, D | Done |
| `/admin/security/roles` | Roles list | L, C | Done |
| `/admin/security/roles/[id]` | Role detail / edit | R, U, D | Done |
| `/admin/security/roles/new` | Create role | C | Done |
| `/admin/security/api-keys` | API keys | L, C, D (revoke) | Done |
| `/admin/security/api-keys/new` | Create API key | C | Done |
| `/admin/security/audit` | Audit logs | L, R | Done |

### 3.16 Admin — tenants (Super Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/admin/tenants` | Tenants overview | — | Done |
| `/admin/tenants/list` | Tenants list | L | Done |
| `/admin/tenants/[id]` | Tenant detail | R, U | Done |
| `/admin/tenants/new` | Create tenant | C | Done |
| `/admin/tenants/templates` | Tenant templates | L, C, R, U, D | Done |

### 3.17 Admin — action catalog (Tenant Admin / Super Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/admin/action-catalog` | Overview | — | Done |
| `/admin/action-catalog/categories` | Categories list | L | Done |
| `/admin/action-catalog/categories/new` | Create category | C | Done |
| `/admin/action-catalog/categories/[id]` | Category detail / edit | R, U, D | Done |
| `/admin/action-catalog/entries` | Entries list | L | Done |
| `/admin/action-catalog/entries/new` | Create entry | C | Done |
| `/admin/action-catalog/entries/[id]` | Entry detail / edit | R, U, D | Done |
| `/admin/action-catalog/relationships` | Relationships list | L | Done |
| `/admin/action-catalog/relationships/new` | Create relationship | C | Done |
| `/admin/action-catalog/relationships/[id]` | Relationship detail / edit | R, U, D | Done |

### 3.18 Admin — decision rules (Tenant Admin / Super Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/admin/decision-rules` | Overview | — | Done |
| `/admin/decision-rules/rules` | Rules list | L | Done |
| `/admin/decision-rules/rules/new` | Create rule | C | Done |
| `/admin/decision-rules/rules/[id]` | Rule detail / edit | R, U, D | Done |
| `/admin/decision-rules/templates` | Templates list | L | Done |
| `/admin/decision-rules/templates/new` | Create template | C | Done |
| `/admin/decision-rules/templates/[id]` | Template detail / edit | R, U, D | Done |
| `/admin/decision-rules/conflicts` | Conflicts | L, R | Done |

### 3.19 Admin — feature engineering, ML, feedback, products, risk, sales (Tenant Admin / Super Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/admin/feature-engineering` | Overview | — | Done |
| `/admin/feature-engineering/features` | Features list | L | Done |
| `/admin/feature-engineering/features/new` | Create feature | C | Done |
| `/admin/feature-engineering/features/[id]` | Feature detail / edit | R, U, D | Done |
| `/admin/feature-engineering/quality` | Quality | R | Done |
| `/admin/feature-engineering/versioning` | Versioning | L, R | Done |
| `/admin/ml-models` | ML models overview | — | Done |
| `/admin/ml-models/models` | Models list | L | Done |
| `/admin/ml-models/models/new` | Create model | C | Done |
| `/admin/ml-models/models/[id]` | Model detail / edit | R, U, D | Done |
| `/admin/ml-models/endpoints` | Endpoints list | L | Done |
| `/admin/ml-models/endpoints/new` | Create endpoint | C | Done |
| `/admin/ml-models/endpoints/[id]` | Endpoint detail / edit | R, U, D | Done |
| `/admin/ml-models/features` | ML features | L, R | Done |
| `/admin/ml-models/monitoring` | ML monitoring | R | Done |
| `/admin/feedback` | Feedback overview | — | Done |
| `/admin/feedback/types` | Feedback types list | L | Done |
| `/admin/feedback/types/new` | Create feedback type | C | Done |
| `/admin/feedback/types/[id]` | Feedback type detail / edit | R, U, D | Done |
| `/admin/feedback/global-settings` | Global settings | R, U | Done |
| `/admin/products` | Products list | L | Done |
| `/admin/products/new` | Create product | C | Done |
| `/admin/products/[id]` | Product detail / edit | R, U, D | Done |
| `/admin/risk-catalog` | Risk catalog list | L | Done |
| `/admin/risk-catalog/new` | Create risk catalog entry | C | Done |
| `/admin/risk-catalog/[id]` | Risk catalog detail / edit | R, U, D | Done |
| `/admin/sales-methodology` | Overview | — | Done |
| `/admin/sales-methodology/config` | Config | R, U | Done |
| `/admin/sales-methodology/meddic` | MEDDIC | R, U | Done |

### 3.20 Admin — analytics, CAIS, integrations, monitoring, system (Tenant Admin / Super Admin)

| Route | Description | CRUD | Status |
|-------|-------------|------|--------|
| `/admin/analytics` | Overview | — | Done |
| `/admin/analytics/dashboards` | Dashboards list | L | Done |
| `/admin/analytics/dashboards/new` | Create dashboard | C | Done |
| `/admin/analytics/dashboards/[id]` | Dashboard detail / edit | R, U, D | Done |
| `/admin/analytics/reports` | Reports list | L | Done |
| `/admin/analytics/reports/new` | Create report | C | Done |
| `/admin/analytics/reports/[id]` | Report detail / edit | R, U, D | Done |
| `/admin/analytics/export` | Data export | L, R | Done |
| `/admin/cais` | CAIS | R, U | Done |
| `/admin/integrations/catalog` | Integrations catalog | L, R | Done |
| `/admin/monitoring` | Monitoring | R | Done |
| `/admin/settings` | Admin settings | R, U | Done |
| `/admin/shard-types` | Shard types | L, R | Done |
| `/admin/tenant-ml-config` | Tenant ML config | R, U | Done |
| `/admin/system` | System overview | — | Done |
| `/admin/system/performance` | Performance | R | Done |
| `/admin/system/data-lake` | Data lake | R | Done |
| `/admin/system/logging` | Logging (view + search) | L, R | Done |
| `/admin/system/logging/config` | Data collection config (view-only + search) | R | Done |
| `/admin/system/api-security` | API security | R, U | Done |
| `/admin/context` | Context config — Super Admin: platform; Tenant Admin: tenant context | R, U | Done |

### 3.21 Error pages

| Route / file | Description | Status |
|--------------|-------------|--------|
| `not-found.tsx` (404) | Custom not-found page | Done |
| `/unauthorized` or 401 handler | Unauthorized page | Done |

---

## 4. Summary counts

| Category | Done | Todo |
|----------|------|------|
| Auth & session | 7 | 0 |
| MFA | 3 | 0 |
| Profile | 1 | 0 |
| Public / dashboard | 5 | 0 |
| Opportunities & accounts | 6 | 0 |
| Models | 1 | 0 |
| Analytics (incl. forecast) | 9 | 0 |
| Recommendations | 3 | 0 |
| Search | 1 | 0 |
| Settings | 10 | 0 |
| AI (conversations, prompts, multimodal) | 6 | 0 |
| Admin (all sections) | 84 | 0 |
| Error pages | 2 | 0 |
| **Total** | **138** | **0** |

---

## 5. Further questions (optional)

All answers incorporated in §1 Decisions and §3 Master list. No open questions.

---

*End of UI pages inventory.*
