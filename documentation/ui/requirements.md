# UI Requirements

## API and Backend

- **UI must call the API Gateway only.** All backend requests go through the API Gateway (e.g. `NEXT_PUBLIC_API_BASE_URL`). The UI must never call service URLs or ports directly.
- Use a shared fetch helper (e.g. `apiFetch`) for all backend calls so 401 is handled consistently (redirect to `/logout`); use an option like `skip401Redirect` only for auth flows (login, MFA) where 401 is shown in-page.
- No hardcoded base URLs or ports; all configuration comes from environment (e.g. `NEXT_PUBLIC_API_BASE_URL`).

## Components and Theming

- UI must use shadcn sidebar components: https://ui.shadcn.com/docs/components/radix/sidebar
- UI must use default shadcn components; no custom CSS.
- Tables must use the shadcn data table pattern: sorting, filtering, pagination, search: https://ui.shadcn.com/docs/components/radix/data-table. All list/index pages that show tabular data must use this pattern.
- **Data table conventions:**
  - **First column** (Name, Title, or primary identifier) must be clickable and navigate to the view/detail page (e.g. `/resources/[id]`).
  - **Last column** must be an **Actions** column containing at least **Edit** and **Delete** (e.g. icon or text buttons; use a dropdown if many actions).
  - **Delete** must show a confirmation dialog (e.g. AlertDialog) before submitting; success/error via toast.
  - **Edit** must navigate to the edit page (e.g. `/resources/[id]` or `/resources/[id]/edit`). For read-only entities, omit Edit or show View instead.
- UI must use Sonner for toasts: https://ui.shadcn.com/docs/components/radix/sonner
- UI must use skeletons for loading states.
- UI must use React Hook Form with Joi for validation.
- UI must be available in light and dark theme.
- Sidebar must have a bottom block showing: user name, user email, edit profile, Logout.
- Sidebar must use sidebar group for navigation. (If the app currently uses a top nav, migrate to shadcn Sidebar or document the exception and ensure the user block appears in the nav.)

## Internationalization (i18n)

- UI must be translated; all user-visible strings must use i18n keys.
- User must be able to change language (language switcher in header or sidebar).

## Page Inventory

### User-facing pages (all must be implemented)

- Integrations (list and per-integration: field-mappings, health, sync)
- User management (as exposed to tenant admins; invite, users, roles)
- Opportunities (list, detail, risk, remediation, recommendations)
- Accounts (list and detail)
- Contacts (to be implemented; currently missing)
- Products
- Competitors
- Recommendations
- Conversations (or Messages — one unified messaging/conversations area)
- Risk analysis (e.g. opportunity risk, explainability)
- Settings (profile, security, MFA, integrations, competitors, industries, entity-linking, processing)
- Configuration (tenant/user-facing config as applicable)

### Super Admin / Admin configuration pages (all must be implemented)

- Shard management: Shard types
- Web search (e.g. schedules)
- Action catalog (categories, entries, relationships)
- Analytics (dashboards, reports, export)
- CAIS, Context
- Decision rules (rules, templates, conflicts)
- Feature engineering (features, quality, versioning)
- Feedback (types, global settings)
- Integrations catalog
- ML models (models, endpoints, features, monitoring)
- Monitoring, Multimodal, Products, Prompts
- Risk catalog
- Sales methodology (config, MEDDIC)
- Security (users, roles, api-keys, audit, invitations)
- System (api-security, data-lake, logging, performance)
- Tenant ML config
- Tenants (list, new, templates)

## Implementation Standards

- **Route protection:** Public routes only: login, register, forgot-password, reset-password, verify-email, accept-invitation, logout, unauthorized. All other routes require auth; unauthenticated users redirect to `/login`. Auth state via cookie (e.g. `accessToken`).
- **Error handling:** User-facing errors use a single generic message (e.g. `GENERIC_ERROR_MESSAGE`); never expose raw `e.message` or stack to the UI.
- **TypeScript:** No `any`; proper types for API responses, form state, and filter/condition values.
- **Loading and empty states:** Every data-fetching or list page has explicit loading and empty states (no blank content while loading or when there are zero items).
- **Forms:** Accessible forms: each input has a label and id; required fields have a visible required indicator (and aria where applicable).
- **Metadata and not-found:** All major layouts/pages have appropriate metadata (title, description where relevant). A global not-found page with links (e.g. Home, Dashboard, Login).
- **Navigation:** Main menu/sidebar is shown only on protected routes; hidden on login, register, forgot-password, etc.
- **Styling:** Prefer Tailwind; avoid custom CSS except where necessary; no inline styles except for dynamic values (e.g. widths/colors from data).
