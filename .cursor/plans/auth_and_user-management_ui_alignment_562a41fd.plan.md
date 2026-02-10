---
name: Auth and User-Management UI Alignment
overview: Fix the register 405 by ensuring API requests are never redirected to /login; align UI, API Gateway, and services for auth and user-management (including correcting wrong /api/users/api/v1/organizations/... paths in admin pages).
todos: []
isProject: false
---

# Auth and User-Management UI / Gateway / Service Alignment

## Root cause of the 405

The error `POST http://51.83.73.52:3000/login?from=%2Fapi%2Fauth%2Fregister 405` means the browser was **redirected** to the UI’s `/login` and then re-sent the **POST** there. The only place that redirects with `from=/api/auth/register` is [containers/ui/src/proxy.ts](containers/ui/src/proxy.ts): it treats any path that is not in `PUBLIC_PATHS` and not under a valid token as protected, and redirects to `/login?from=<pathname>`. So when a **same-origin** request hits the UI (e.g. `/api/auth/register` because `NEXT_PUBLIC_API_BASE_URL` is empty or same as UI), the route protection runs, sees no cookie, and redirects. The browser follows the redirect with the same method (POST), and the `/login` page only serves HTML (GET) → **405 Method Not Allowed**.

Note: You have `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`. When the site is opened at `http://51.83.73.52:3000`, a fetch to `http://localhost:3001` goes to the user’s machine, not the server. For production, the env must be the **public** API Gateway URL (e.g. `http://51.83.73.52:3001` or your real gateway host).

---

## Principles

- **All API calls go through the API Gateway.** The UI must never call a backend service URL directly. Every request must use the single gateway base URL and gateway paths (e.g. `/api/auth`, `/api/users`, `/api/v1/...`). This is enforced by using one base URL everywhere (see §3).
- **Base URL is configuration-only.** To run against a different gateway (e.g. staging, another region), only `NEXT_PUBLIC_API_BASE_URL` (and a rebuild so the client bundle gets the new value) is required; no application code changes. The base URL must never be hardcoded or constructed outside the shared helper.

---

## 1. Route protection: do not redirect `/api/*`

**Rule:** API paths must never be treated as “protected pages”. Only **page** navigations should redirect to login when unauthenticated.

**Current:** [containers/ui/src/proxy.ts](containers/ui/src/proxy.ts) has no special case for `/api`, so `/api/auth/register` is protected and triggers redirect.

**Change:**

- In `proxy.ts`, at the start of the protection logic (before checking `isPublicPath` or token), **allow all `/api/*` requests** to pass through: e.g. `if (pathname.startsWith('/api')) return NextResponse.next();`.
- Ensure this file is actually used as **Next.js middleware**. Next only runs middleware from a file named `middleware.ts` (or `middleware.js`) at project root or under `src/`. Right now the repo has [containers/ui/src/proxy.ts](containers/ui/src/proxy.ts) with a `config` export but **no `middleware.ts`**. So either:
  - Add `src/middleware.ts` that imports and re-exports the proxy (and its `config`), or  
  - Rename `proxy.ts` to `middleware.ts` and keep the same logic.  
  Then the “allow `/api`” change will apply and same-origin API calls will no longer be redirected to `/login`.

**Result:** Same-origin `POST /api/auth/register` will no longer trigger a redirect; it will be handled by Next (rewrites to gateway when `NEXT_PUBLIC_API_BASE_URL` is set) or by the gateway when the request is sent to the gateway URL.

---

## 2. Next.js rewrites: add `/api/users`

**Current:** [containers/ui/next.config.ts](containers/ui/next.config.ts) rewrites only `/api/v1/*`, `/api/profile/*`, and `/api/auth/*` to the gateway when `NEXT_PUBLIC_API_BASE_URL` is set. There is **no** rewrite for `/api/users/*`.

**Change:** Add a rewrite so that same-origin calls to the gateway still work for user-management:

- `source: '/api/users/:path*'` → `destination: '${apiGatewayUrl}/api/users/:path*'`

This keeps the UI contract “call `/api/users/...`” and lets the gateway route `/api/users` to user_management with pathRewrite to `/api/v1/users`.

---

## 3. Single source for API base URL and 401 handling

**Rule:** Every API call in the UI must use the shared helper from [containers/ui/src/lib/api.ts](containers/ui/src/lib/api.ts): either `getApiBaseUrl()` (for building the URL) or `apiFetch()` (which uses it and adds credentials + 401 redirect). The base URL must never be constructed elsewhere (no local `apiBaseUrl`, no other env vars, no hardcoded host/port). This guarantees all calls go through the gateway and a future base URL change requires only changing `NEXT_PUBLIC_API_BASE_URL`.

**Current:** Register (and some other auth flows) use a local `apiBaseUrl` and raw `fetch` instead of the shared helper.

**Change:**

- **Register:** Use `getApiBaseUrl()` from `@/lib/api` for the base. Keep using raw `fetch` for register if you do not want 401 to trigger the global redirect to `/logout` (or use `apiFetch` with `skip401Redirect: true` and handle 401 in-page if needed).
- **Forgot-password, reset-password, verify-email:** Use the same base URL helper and, where applicable, `apiFetch` with `skip401Redirect` for auth flows so 401 handling is explicit.
- **All other pages:** Audit and ensure every `fetch` to the backend uses `getApiBaseUrl()` or `apiFetch()`; remove any remaining local base URL construction.

No hardcoded URLs or ports; all from env via the single helper.

---

## 4. Gateway ↔ Auth service alignment (already correct)

- **Gateway:** [containers/api-gateway/src/routes/index.ts](containers/api-gateway/src/routes/index.ts) maps `/api/auth` → auth service with `pathRewrite: '/api/v1/auth'`.
- **Auth service:** [containers/auth/src/routes/auth.ts](containers/auth/src/routes/auth.ts) exposes `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, etc.
- **Tenant middleware:** [containers/api-gateway/src/middleware/tenantValidation.ts](containers/api-gateway/src/middleware/tenantValidation.ts) marks `/api/auth/register` (and other auth paths) as public.

No gateway or auth route changes required for register; the 405 is fixed by not redirecting `/api/*` on the UI.

---

## 5. User-management: fix wrong UI paths (Gateway expects `/api/v1/organizations`, not `/api/users/api/v1/...`)

**Gateway routes:**

- `/api/users` → user_management with **pathRewrite** `/api/v1/users` → backend sees `/api/v1/users/me`, `/api/v1/users/:id`, etc.
- `/api/v1/organizations` → user_management (no pathRewrite; backend path `/api/v1/organizations/...`).

So organization-scoped endpoints (members, roles, api-keys, invitations) must be called as **`/api/v1/organizations/:orgId/...`** via the gateway, **not** as `/api/users/api/v1/organizations/...`. The latter would be forwarded as `/api/v1/users/api/v1/organizations/...`, which user-management does not implement.

**UI files to fix (replace `/api/users/api/v1/organizations/...` with `/api/v1/organizations/...`):**

| File | Current pattern | Correct pattern |
|------|------------------|-----------------|
| [containers/ui/src/app/admin/security/users/page.tsx](containers/ui/src/app/admin/security/users/page.tsx) | `/api/users/api/v1/organizations/${encoded}/member-count`, `member-limit`, `members` | `/api/v1/organizations/${encoded}/member-count`, etc. |
| [containers/ui/src/app/admin/security/roles/page.tsx](containers/ui/src/app/admin/security/roles/page.tsx) | `/api/users/api/v1/organizations/.../roles`, `.../permissions` | `/api/v1/organizations/.../roles`, `.../permissions` |
| [containers/ui/src/app/admin/security/roles/[id]/page.tsx](containers/ui/src/app/admin/security/roles/[id]/page.tsx) | `/api/users/api/v1/organizations/.../roles/...`, `.../permissions` | `/api/v1/organizations/.../roles/...`, `.../permissions` |
| [containers/ui/src/app/admin/security/api-keys/page.tsx](containers/ui/src/app/admin/security/api-keys/page.tsx) | `/api/users/api/v1/organizations/.../api-keys` | `/api/v1/organizations/.../api-keys` |

**Already correct (no change):**  
[containers/ui/src/app/admin/security/users/invite/page.tsx](containers/ui/src/app/admin/security/users/invite/page.tsx), [containers/ui/src/app/admin/security/invitations/page.tsx](containers/ui/src/app/admin/security/invitations/page.tsx), [containers/ui/src/app/admin/security/roles/new/page.tsx](containers/ui/src/app/admin/security/roles/new/page.tsx), [containers/ui/src/app/admin/security/api-keys/new/page.tsx](containers/ui/src/app/admin/security/api-keys/new/page.tsx), and [containers/ui/src/app/admin/tenants/new/page.tsx](containers/ui/src/app/admin/tenants/new/page.tsx) already use `/api/v1/organizations/...`.

**Profile and sessions:**  
[containers/ui/src/app/settings/profile/page.tsx](containers/ui/src/app/settings/profile/page.tsx) and [containers/ui/src/app/settings/security/page.tsx](containers/ui/src/app/settings/security/page.tsx) correctly use `/api/users/me` and `/api/users/me/sessions` (gateway maps to `/api/v1/users/me`, etc.). No change.

---

## 6. Endpoint matrix (reference)

| UI page / action | UI calls | Gateway route | Backend (auth or user-management) |
|------------------|----------|---------------|-----------------------------------|
| Register | POST `/api/auth/register` | `/api/auth` → auth | POST `/api/v1/auth/register` |
| Login | POST `/api/auth/login` | `/api/auth` → auth | POST `/api/v1/auth/login` |
| Forgot password | POST `/api/auth/forgot-password` | `/api/auth` → auth | POST `/api/v1/auth/forgot-password` |
| Reset password | POST `/api/auth/reset-password` | `/api/auth` → auth | POST `/api/v1/auth/reset-password` |
| Verify email | GET `/api/auth/verify-email?token=...` | `/api/auth` → auth | GET `/api/v1/auth/verify-email` |
| Profile | GET/PUT `/api/users/me` | `/api/users` → user_management | GET/PUT `/api/v1/users/me` |
| Sessions | GET/DELETE `/api/users/me/sessions` | `/api/users` → user_management | `/api/v1/users/me/sessions` |
| Admin org members/roles/api-keys | GET/POST/DELETE `/api/v1/organizations/:id/...` | `/api/v1/organizations` → user_management | `/api/v1/organizations/...` |

---

## 7. Configuration and env

- **Production:** Set `NEXT_PUBLIC_API_BASE_URL` to the **public** API Gateway URL (e.g. `http://51.83.73.52:3001` or your real host). Using `http://localhost:3001` when the UI is at `http://51.83.73.52:3000` sends API requests to the user’s machine, not the server.
- **Changing the gateway without recoding:** To run against a different gateway (e.g. staging, another region), change only `NEXT_PUBLIC_API_BASE_URL` and rebuild; no application code changes are required.
- **Same-origin / reverse proxy:** If the UI is deployed behind a reverse proxy that routes `/api/*` to the gateway on the same origin, set `NEXT_PUBLIC_API_BASE_URL` to that origin (or leave empty and rely on relative URLs); the existing rewrites in Next.js and the single base-URL helper keep all API traffic going through the gateway.
- Document in UI README or env example that auth and user-management require this to point at the gateway.

---

## Summary of code changes

1. **Route protection:** In [containers/ui/src/proxy.ts](containers/ui/src/proxy.ts) (or the file that becomes middleware), add an early return for `pathname.startsWith('/api')` so API requests are never redirected to `/login`. Ensure this logic runs by adding or renaming to `src/middleware.ts`.
2. **Rewrites:** In [containers/ui/next.config.ts](containers/ui/next.config.ts), add rewrite for `'/api/users/:path*'` to the gateway.
3. **Single API base:** Use `getApiBaseUrl()` or `apiFetch()` from `@/lib/api` for all API calls (register, forgot-password, reset-password, verify-email, and any other pages that still use a local base URL). No base URL construction outside the shared helper.
4. **User-management admin:** In the four admin pages listed in §5, replace every `/api/users/api/v1/organizations/` with `/api/v1/organizations/` so UI, gateway, and user-management paths align.

No changes to API Gateway route definitions or auth/user-management service routes are required beyond ensuring the gateway config has the correct service URLs.
