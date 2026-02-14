# UI Requirements

## Authentication (UI → API Gateway → Services)

Authentication must be consistent so every request sends the same credentials and the gateway can forward them to downstream services.

- **How the UI sends auth:** The UI must send credentials on **every** backend request using the shared `apiFetch` helper. The helper must use `credentials: 'include'` so the browser sends the **cookie** `accessToken` (and `refreshToken` when needed) set by the auth service on login. The UI must **not** set `Authorization: Bearer` manually for normal API calls; the gateway accepts the `accessToken` cookie and may add or forward `Authorization` to downstream services.
- **Single fetch helper:** All backend calls MUST use `apiFetch` (or the project’s single shared fetch helper). Never use raw `fetch(process.env.NEXT_PUBLIC_API_BASE_URL + path)` or construct URLs manually. This ensures:
  - The same `credentials: 'include'` (and any future auth headers) are sent on every request.
  - 401 responses are handled in one place (redirect to `/logout` then `/login`).
- **When to skip 401 redirect:** Use `skip401Redirect: true` only on routes where 401 is expected and shown in-page (e.g. login form, MFA step). On all other pages, 401 must trigger redirect to `/logout` so the user is not left on a broken page.
- **Route protection:** Protected routes require an `accessToken` cookie. Middleware must run before rendering and redirect unauthenticated users to `/login` (and set `from` so they can return after login). Public routes: login, register, forgot-password, reset-password, verify-email, accept-invitation, logout, unauthorized.
- **Logout:** The logout route must call the auth logout endpoint (to clear server session) and then clear or expire the `accessToken` (and `refreshToken`) cookie and redirect to `/login`.
- **Canonical API paths:** The client path is always `/api/v1/<service-path>`. The UI must only call gateway paths using `/api/v1/...` (e.g. `/api/v1/auth/login`, `/api/v1/users/me`). See `documentation/endpoints/ENDPOINTS.md` for the full list.

## API and Backend

- **UI must call the API Gateway only.** All backend requests go through the API Gateway (e.g. `NEXT_PUBLIC_API_BASE_URL`). The UI must never call service URLs or ports directly.
- **Use the shared fetch helper for every request.** Use `apiFetch` for all backend calls so credentials and 401 handling are consistent. Use `skip401Redirect` only for auth flows (login, MFA) where 401 is shown in-page. No raw `fetch` with a manually built base URL.
- **No hardcoded base URLs or ports.** All configuration comes from environment (e.g. `NEXT_PUBLIC_API_BASE_URL`).
- **Canonical paths and methods.** The list of API paths and methods is in `documentation/endpoints/ENDPOINTS.md`. Use those paths when calling the gateway. For patterns (tenant headers, errors), see `documentation/endpoints/endpoint_templates.md`. The gateway sets or forwards tenant context (e.g. `X-Tenant-ID`); the UI does not set tenant headers unless specified.

## Components and Theming

- UI must use shadcn sidebar components: https://ui.shadcn.com/docs/components/radix/sidebar
- UI must use default shadcn components; no custom CSS.
- **Toaster:** The root layout must include `<Toaster />` from `sonner` so that `toast()` calls display. Use Sonner for all toasts: https://ui.shadcn.com/docs/components/radix/sonner
- Tables must use the shadcn data table pattern: sorting, filtering, pagination, search: https://ui.shadcn.com/docs/components/radix/data-table. All list/index pages that show tabular data must use this pattern. Prefer a shared DataTable (or table layout) component so behavior and styling are consistent.
- **Data table conventions:**
  - **First column** (Name, Title, or primary identifier) must be clickable and navigate to the view/detail page (e.g. `/resources/[id]`).
  - **Last column** must be an **Actions** column containing at least **Edit** and **Delete** (e.g. icon or text buttons; use a dropdown if many actions).
  - **Delete** must show a confirmation dialog (e.g. AlertDialog) before submitting; success/error via toast.
  - **Edit** must navigate to the edit page (e.g. `/resources/[id]` or `/resources/[id]/edit`). For read-only entities, omit Edit or show View instead.
- UI must use skeletons for loading states (Shadcn Skeleton). Use a shared empty-state pattern (e.g. Card + message + optional CTA) so all data pages are consistent.
- **Forms and validation:** The project uses **Zod** for schema-based validation with React Hook Form. All form validation must go through a Zod schema. Use `useForm` from `react-hook-form` with `zodResolver` from `@hookform/resolvers/zod`; define schemas with `z.object()`, `z.string()`, etc. from `zod`. Example: `useForm({ resolver: zodResolver(mySchema), defaultValues: { ... } })`. Do not use Joi or other schema libraries for form validation.
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

- **Route protection:** Public routes only: login, register, forgot-password, reset-password, verify-email, accept-invitation, logout, unauthorized. All other routes require auth; unauthenticated users redirect to `/login`. Auth state via cookie (e.g. `accessToken`). See **Authentication** above for how the UI sends auth on every request.
- **Error handling:** User-facing errors use a single generic message (e.g. `GENERIC_ERROR_MESSAGE` or i18n equivalent); never expose raw `e.message` or stack to the UI. Use `apiFetch` so 401 is always handled by redirect to `/logout`.
- **TypeScript:** No `any`; proper types for API responses, form state, and filter/condition values.
- **Loading and empty states:** Every data-fetching or list page has explicit loading and empty states (no blank content while loading or when there are zero items). Use Shadcn Skeleton for loading; use a shared empty-state pattern for zero items.
- **Forms:** Use React Hook Form with Zod (see **Forms and validation** above). Accessible forms: each input has a label and id; required fields have a visible required indicator (and aria where applicable).
- **Metadata and not-found:** All major layouts/pages have appropriate metadata (title, description where relevant). A global not-found page with links (e.g. Home, Dashboard, Login).
- **Navigation:** Main menu/sidebar is shown only on protected routes; hidden on login, register, forgot-password, etc.
- **Styling:** Prefer Tailwind; avoid custom CSS except where necessary; no inline styles except for dynamic values (e.g. widths/colors from data).
