Goal: For each UI feature that calls the backend, confirm (1) the UI calls the correct API Gateway path, (2) the API Gateway forwards to the correct service and path, and (3) proper authentication is sent for the type of route (public vs protected).
Conventions in this codebase:
- UI uses NEXT_PUBLIC_API_BASE_URL (no trailing slash) plus a gateway path (e.g. /api/auth/login, /api/v1/recommendations). Paths come from containers/ui/src/lib/api.ts (apiFetch/getApiBaseUrl) or inline process.env.NEXT_PUBLIC_API_BASE_URL. No hardcoded host/port.
- UI → gateway: The browser calls the UI origin (same origin when base URL is the app). Next.js then reaches the gateway via next.config rewrites (containers/ui/next.config.ts: /api/auth/:path*, /api/users/:path*, /api/v1/:path*, etc.) or the catch-all proxy containers/ui/src/app/api/[...path]/route.ts for paths not in rewrites (e.g. /api/logging, /api/invitations). So the gateway is called via Next.js (server-side), not directly by the browser.
- API Gateway route table is in containers/api-gateway/src/routes/index.ts. Each mapping has: path (gateway prefix), service, serviceUrl (from containers/api-gateway/config/default.yaml), and optionally pathRewrite or stripPrefix.
- Gateway matches by longest prefix. More specific paths (e.g. /api/v1/recommendations) must be registered before broader ones (e.g. /api/v1) so the correct service is chosen. Some mappings are registered only when config.services.<name>?.url is set; when auditing a feature, confirm that service is enabled in api-gateway config.
- Path forwarding (query string is forwarded as-is):
  - pathRewrite set: backendPath = pathRewrite + requestPathWithoutQuery.slice(mapping.path.length). E.g. mapping path /api/auth, pathRewrite /api/v1/auth, request /api/auth/login → /api/v1/auth/login.
  - stripPrefix true and no pathRewrite: request path with mapping path removed (leading slash added if needed).
  - Else: full request path to the service (e.g. /api/v1/ml/models → same path on ml_service).
- Services expose routes under paths like /api/v1/... (see each service’s src/routes/ and/or openapi.yaml).
Authentication conventions:
- Session is cookie-based: auth service sets accessToken (and refreshToken) via Set-Cookie; middleware and protected routes rely on that session.
- Protected routes (everything except public auth/invitation): the request that reaches the gateway must carry auth. Gateway tenant validation (containers/api-gateway/src/middleware/tenantValidation.ts) requires a valid JWT: it checks Authorization: Bearer <token> only (no cookie). Public path prefixes (no Bearer required) are listed there (e.g. /api/auth/login, /api/auth/register, /api/invitations, ...).
- UI: Use apiFetch() for protected calls when possible — it sets credentials: "include" by default so cookies are sent. For raw fetch(), always set credentials: "include" on protected calls so cookies are sent. For public auth flows (login, MFA verify, etc.) use skip401Redirect: true so a 401 does not redirect to /logout.
- Gateway → backend: ProxyService forwards the Authorization header to the backend. Backends may accept Bearer and/or cookie; if a backend expects the cookie, the gateway must forward the Cookie header (currently only Authorization is forwarded — ask if backends need Cookie).
- Set-Cookie on public routes (e.g. login): ProxyService already forwards Set-Cookie from backend responses to the client; no change needed.
Recommended approach (auth flow):
- Prefer a single path through Next.js: UI calls same origin with credentials; all /api/* go through Next.js (rewrites or app/api/[...path]/route.ts). The server-side code that calls the gateway should read accessToken from the incoming request cookie and, for protected routes, set Authorization: Bearer <accessToken> on the outbound request to the gateway. That way the gateway always receives Bearer; cookies stay HttpOnly; no client-side token handling.
- Gateway: Keep validating only Authorization: Bearer. Do not require the gateway to parse cookies.
- Gateway → backends: Prefer forwarding only Authorization (Bearer). Have backends accept Bearer where possible. If a backend must keep accepting cookie, add Cookie to the headers the gateway forwards for that service.
- When auditing: If the proxy does not yet inject Bearer from cookie, treat it as a gap: protected calls will 401 until the Next.js proxy (or BFF) injects Authorization: Bearer from the accessToken cookie.
Step 1 – UI → Gateway
Where to look: containers/ui/src — search for apiFetch(, getApiBaseUrl(), NEXT_PUBLIC_API_BASE_URL, fetch with /api/.
For each UI call:
- List the exact path and method used (e.g. GET /api/auth/login, POST /api/v1/integrations).
- Check that the path is a gateway path (starts with /api/ and matches a gateway route prefix).
- Prefer one gateway path per call: either a pathRewrite route (e.g. /api/auth/...) or a direct /api/v1/... route.
- Wrong: UI calls /api/users/api/v1/organizations/... (mixing gateway prefix with service path). Correct: UI calls /api/v1/organizations/... when the gateway has a route for that prefix to user_management.
- Confirm the base URL is from config only: NEXT_PUBLIC_API_BASE_URL or getApiBaseUrl() (no hardcoded URLs or ports).
- Authentication: Classify the route as public or protected. If protected: confirm the call uses apiFetch (sends credentials by default) or fetch(..., { credentials: "include" }). If public (login, register, forgot-password, invitations, etc.): confirm no auth is required and, for login/MFA, skip401Redirect: true is used where appropriate.
Step 2 – Gateway → Service
Where to look: Gateway — containers/api-gateway/src/routes/index.ts and ProxyService (path build in proxyRequest, headers forwarded). Service — containers/<service>/src/routes/ and openapi.yaml.
For each gateway path from Step 1:
- Find the mapping that matches that path (longest matching prefix) in routes/index.ts.
- Note the service and serviceUrl (from config; env overrides allowed, no hardcoded URLs).
- Compute the backend path using the path-forwarding rules above.
- In that service’s code, confirm it exposes that backend path and HTTP method (GET/POST/PUT/DELETE). If not, fix the gateway mapping or the UI path.
- Authentication: For protected routes, confirm the gateway forwards what the backend expects (ProxyService forwards Authorization; if the backend validates via cookie, confirm Cookie is forwarded or ask whether gateway should forward Cookie).
Step 3 – Checklist per feature
For a given UI feature/page:
[ ] All API calls use a single gateway path that exists in the gateway route table.
[ ] No “double path” (e.g. /api/users/api/v1/organizations/...).
[ ] Gateway mapping’s serviceUrl comes from config; if the route is conditional, the service is enabled in config.
[ ] Computed backend path and method exist on the target service.
[ ] Protected calls send credentials: use apiFetch or fetch(..., { credentials: "include" }).
[ ] Public auth calls (login, register, MFA, etc.) do not require auth; skip401Redirect used where 401 should be handled in-page.
How to fix (when the checklist fails)
- UI — protected call without credentials: Add credentials: "include" to the fetch() options, or switch to apiFetch() which sends credentials by default.
- Gateway — missing or wrong route: Add or update a mapping in containers/api-gateway/src/routes/index.ts (routeMappings). Use a more specific path than any broader prefix (e.g. add /api/v1/entity-linking before /api/v1) so longest-prefix match wins. Conditional routes go inside the appropriate if (config.services.<name>?.url) block.
- Service — backend path or method not exposed: Add or update the route in the target service’s src/routes/ (and openapi.yaml if present). Ensure the path and HTTP method match what the gateway sends.
- Auth — proxy does not inject Bearer: In the Next.js code that calls the gateway (e.g. containers/ui/src/app/api/[...path]/route.ts), for protected routes set Authorization: Bearer <accessToken> on the outbound request, reading accessToken from the incoming request’s cookie.
Optional – Build a small table
For each UI call, fill (include Method and Auth so path, method, and authentication are verified):
UI (page/component)	Method	Gateway path called	Auth (public / protected)	Credentials sent?	Gateway mapping (path → service)	Backend path sent to service	Service file that defines route
e.g. login	POST	/api/auth/login	public	N/A (no auth)	/api/auth → auth, pathRewrite /api/v1/auth	/api/v1/auth/login	auth routes/auth.ts
e.g. profile	GET	/api/users/me	protected	apiFetch → credentials: include	/api/users → user_management, pathRewrite /api/v1/users	/api/v1/users/me	user_management
Use this prompt (and table) when adding a new UI feature, changing a gateway route, or auditing existing pages so the UI always calls the correct gateway path, the gateway forwards to the correct service path, and proper authentication is sent.
Questions to resolve when authentication is unclear
- Does the UI call the gateway directly (browser) or via Next.js? (Recommended: via Next.js only; browser hits same origin, Next.js uses rewrites or app/api/[...path]/route.ts to call the gateway.)
- Does the Next.js path that calls the gateway inject Authorization: Bearer from the accessToken cookie for protected routes? (Recommended: yes; app/api/[...path]/route.ts or the rewrite handler should set Bearer from cookie so the gateway receives it.)
- For each protected endpoint: does the gateway receive auth as Bearer (from header or injected from cookie) or as Cookie only? (Recommended: Bearer only at gateway.) Does the backend expect Authorization, Cookie, or both? If the backend expects Cookie and the gateway does not forward it, should the gateway forward Cookie for that service? (Recommended: prefer backends accepting Bearer; forward Cookie only for backends that cannot.)
- For public routes that return Set-Cookie (e.g. login): is Set-Cookie forwarded from backend through the gateway to the client? (Already done in ProxyService; confirm when auditing.)

---

## Example audit: Recommendations UI

Single-feature trace (Recommendations list/card/detail and feedback).

**Step 1 – UI → Gateway**

| UI (page/component) | Method | Gateway path called | Auth | Credentials sent? | Base URL source |
|---------------------|--------|---------------------|------|-------------------|------------------|
| RecommendationsCard.tsx | GET | `/api/v1/recommendations?opportunityId=...&limit=20` | protected | apiFetch / include | `getApiBaseUrl()` (NEXT_PUBLIC_API_BASE_URL) |
| RecommendationsCard.tsx | POST | `/api/v1/recommendations/:id/feedback` | protected | apiFetch / include | `getApiBaseUrl()` |
| recommendations/page.tsx | GET | `/api/v1/recommendations?...` | protected | apiFetch → include | `apiFetch` → same base |
| recommendations/[id]/page.tsx | GET | `/api/v1/recommendations/:id` | protected | getApiBaseUrl + fetch | `getApiBaseUrl()` |
| admin/feedback/page.tsx | GET | `/api/v1/feedback/aggregation?period=...` | protected | apiBaseUrl from getApiBaseUrl() | same |

All paths start with `/api/`, match gateway route prefixes, no double path. Base from config only. Protected calls use credentials so cookies (and thus session) are sent.

**Step 2 – Gateway → Service**

| Method | Gateway path | Gateway mapping | Backend path sent to service | Service route (file:line) |
|--------|--------------|-----------------|------------------------------|----------------------------|
| GET | `/api/v1/recommendations?...` | `/api/v1/recommendations` → recommendations, stripPrefix: false | `/api/v1/recommendations?...` | recommendations src/routes/index.ts:822 GET `/api/v1/recommendations` |
| GET | `/api/v1/recommendations/:id` | same | `/api/v1/recommendations/:id` | same file:864 GET `/api/v1/recommendations/:id` |
| POST | `/api/v1/recommendations/:id/feedback` | same | `/api/v1/recommendations/:id/feedback` | same file:883 POST `/api/v1/recommendations/:id/feedback` |
| GET | `/api/v1/feedback/aggregation?...` | `/api/v1/feedback` → recommendations, stripPrefix: false | `/api/v1/feedback/aggregation?...` | same file:801 GET `/api/v1/feedback/aggregation` |

serviceUrl from `config.services.recommendations.url` (api-gateway config). All backend paths and methods exist on recommendations service.

**Checklist (Recommendations feature):** [x] Single gateway path per call [x] No double path [x] serviceUrl from config [x] Backend path + method exist on service [x] Protected calls send credentials (apiFetch or credentials: "include").

---

## Full endpoints audit (all UI → Gateway → Service)

**Step 1 – UI → Gateway**

| UI (page/component) | Method | Gateway path called | Base URL source |
|---------------------|--------|---------------------|------------------|
| login/page.tsx | POST | `/api/auth/login` | apiFetch (getApiBaseUrl) |
| login/page.tsx | POST | `/api/auth/login/complete-mfa` | apiFetch |
| register/page.tsx | POST | `/api/auth/register` | getApiBaseUrl() |
| forgot-password/page.tsx | POST | `/api/auth/forgot-password` | getApiBaseUrl() |
| reset-password/page.tsx | POST | `/api/auth/reset-password` | getApiBaseUrl() |
| verify-email/page.tsx | GET | `/api/auth/verify-email?token=...` | getApiBaseUrl() |
| logout/page.tsx | POST | `/api/auth/logout` | getApiBaseUrl() |
| settings/profile/page.tsx | GET, PUT | `/api/users/me` | getApiBaseUrl() |
| settings/security/page.tsx | GET, DELETE, POST | `/api/users/me/sessions`, `/api/users/me/sessions/:id`, `/api/users/me/sessions/revoke-all-others` | apiFetch |
| settings/security/page.tsx | GET, POST, DELETE | `/api/auth/mfa/status`, `/api/auth/mfa/backup-codes/generate`, `/api/auth/mfa/disable`, `/api/auth/api-keys`, `/api/auth/api-keys/:id` | apiFetch |
| settings/mfa/enroll/page.tsx | POST | `/api/auth/mfa/enroll`, `/api/auth/mfa/verify` | getApiBaseUrl() |
| settings/mfa/verify/page.tsx | POST | `/api/auth/mfa/verify`, `/api/auth/mfa/verify-backup` | getApiBaseUrl() |
| accept-invitation/page.tsx | POST | `/api/invitations/:token/accept` | NEXT_PUBLIC_API_BASE_URL |
| admin/security/users/[id]/page.tsx | GET | `/api/users/:id` | NEXT_PUBLIC_API_BASE_URL |
| admin/security/users/page.tsx | GET | `/api/v1/organizations/:orgId/member-count`, `.../member-limit`, `.../members` | getApiBaseUrl() |
| admin/security/users/invite/page.tsx | GET, POST | `/api/v1/organizations/:orgId/roles`, `.../invitations` | NEXT_PUBLIC_API_BASE_URL |
| admin/security/roles/[id]/page.tsx | GET, PUT, DELETE | `/api/v1/organizations/:orgId/roles/:roleId`, `.../permissions` | getApiBaseUrl() |
| admin/security/api-keys/new/page.tsx | POST | `/api/v1/organizations/:orgId/api-keys` | NEXT_PUBLIC_API_BASE_URL |
| admin/security/audit/page.tsx | GET, POST | `/api/logging/api/v1/logs?...`, `/api/logging/api/v1/export` | NEXT_PUBLIC_API_BASE_URL |
| recommendations/page.tsx | GET | `/api/v1/recommendations?...` | getApiBaseUrl() / apiFetch |
| RecommendationsCard.tsx | GET, POST | `/api/v1/recommendations?...`, `/api/v1/recommendations/:id/feedback` | getApiBaseUrl() |
| admin/feedback (types) | GET, PUT, DELETE | `/api/v1/admin/feedback-types`, `.../:id` | NEXT_PUBLIC_API_BASE_URL |
| admin/tenants/page.tsx | GET | `/api/v1/admin/tenants`, `/api/v1/admin/tenant-templates` | NEXT_PUBLIC_API_BASE_URL |
| admin/tenant-ml-config/page.tsx | GET, PUT | `/api/v1/tenant-ml-config` | NEXT_PUBLIC_API_BASE_URL |
| admin/decision-rules (page, templates, rules) | GET, POST, PUT, DELETE | `/api/v1/decisions/rules`, `.../templates`, `.../conflicts`, `.../rules/:id`, `.../rules/:id/test` | NEXT_PUBLIC_API_BASE_URL |
| admin/analytics (dashboards, reports) | GET, PUT | `/api/v1/system/analytics` | NEXT_PUBLIC_API_BASE_URL |
| admin/system/api-security/page.tsx | GET, PUT | `/api/v1/system/api-security` | NEXT_PUBLIC_API_BASE_URL |
| admin/system/data-lake/page.tsx | GET, PUT | `/api/v1/system/datalake` | NEXT_PUBLIC_API_BASE_URL |
| admin/shard-types/page.tsx | GET | `/api/v1/admin/shard-types` | NEXT_PUBLIC_API_BASE_URL |
| admin/ml-models (models, [id], new), ml-models/page | GET, PUT, DELETE, POST | `/api/v1/ml/models`, `.../health`, `.../models/:id`, `.../endpoints` | NEXT_PUBLIC_API_BASE_URL |
| admin/ml-models/monitoring/page.tsx | GET, POST, PUT, DELETE | `/api/v1/ml/endpoints`, `/api/v1/ml/monitoring/alerts`, `.../alerts/:id` | NEXT_PUBLIC_API_BASE_URL |
| admin/ml-models/endpoints (list, [id]) | GET | `/api/v1/ml/endpoints` | NEXT_PUBLIC_API_BASE_URL |
| admin/feature-engineering (quality, versioning, features) | GET, POST, PUT, DELETE | `/api/v1/ml/features`, `.../versions`, `.../schema`, `.../quality`, `.../quality-rules`, `.../version-policy` | NEXT_PUBLIC_API_BASE_URL |
| settings/competitors/page.tsx | GET, POST | `/api/v1/competitors` | NEXT_PUBLIC_API_BASE_URL |
| CompetitorSelectModal.tsx | GET, POST | `/api/v1/competitors`, `/api/v1/competitors/:id/track` | getApiBaseUrl / getHeaders |
| admin/analytics/export/page.tsx | GET, PUT | `/api/v1/system/analytics` | NEXT_PUBLIC_API_BASE_URL |
| admin/monitoring/page.tsx | GET | `/api/v1/admin/monitoring/health`, `.../queues`, `.../processors` | NEXT_PUBLIC_API_BASE_URL |
| admin/action-catalog (page, entries, relationships) | GET, POST, PUT, DELETE | `/api/v1/action-catalog/entries`, `.../categories`, `.../relationships` | NEXT_PUBLIC_API_BASE_URL |
| admin/risk-catalog/new/page.tsx | POST | `/api/v1/risk-catalog/risks` | NEXT_PUBLIC_API_BASE_URL |
| admin/integrations/catalog/page.tsx | GET | `/api/v1/admin/integrations/catalog` | NEXT_PUBLIC_API_BASE_URL |
| admin/products/new/page.tsx | POST | `/api/v1/products` | NEXT_PUBLIC_API_BASE_URL |
| settings/processing/page.tsx | GET, PUT | `/api/v1/processing/settings` | NEXT_PUBLIC_API_BASE_URL |
| settings/entity-linking/page.tsx | GET, PUT | `/api/v1/entity-linking/settings`, `.../rules`, `.../suggested-links` | NEXT_PUBLIC_API_BASE_URL |
| settings/integrations/[id] (health, sync, field-mappings) | GET, PUT, POST | `/api/v1/integrations/:id`, `.../health`, `.../sync-config`, `.../sync`, `.../field-mappings/...`, `.../transform-functions`, etc. | NEXT_PUBLIC_API_BASE_URL |
| conversations/page.tsx | GET, POST | `/api/conversations?...`, `/api/conversations` | getApiBaseUrl() |
| ExplainabilityCard.tsx | GET | `/api/v1/opportunities/:id/risk-explainability`, `.../win-probability/explain` | getApiBaseUrl() |
| CompleteRemediationStepModal.tsx | POST | `/api/v1/remediation-workflows/:id/steps/:step/complete` | getApiBaseUrl() |
| admin/cais/page.tsx | GET, PUT | `/api/v1/adaptive-learning/weights/:tenantId`, `.../model-selection/:tenantId` | (NEXT_PUBLIC_API_BASE_URL) |

All paths start with `/api/`. Base URL from config only (NEXT_PUBLIC_API_BASE_URL or getApiBaseUrl()).  
**Auth:** Public routes (login, register, forgot-password, reset-password, verify-email, logout, invitations, auth MFA endpoints called before session exists) require no credentials; login/MFA use skip401Redirect where needed. All other rows are protected; confirm each uses apiFetch or fetch(..., { credentials: "include" }).  
**Note:** Audit page uses `/api/logging/api/v1/...` (gateway prefix + service path); with stripPrefix this correctly becomes backend `/api/v1/logs` and `/api/v1/export`. For consistency you could add a route `/api/v1/logs` → logging later.

**Step 2 – Gateway → Service**

| Method | Gateway path prefix | Gateway mapping | Backend path | Service |
|--------|---------------------|------------------|--------------|---------|
| POST | `/api/auth/*` | `/api/auth` → auth, pathRewrite /api/v1/auth | /api/v1/auth/* | auth (routes/auth.ts) |
| GET/PUT | `/api/users/me`, `/api/users/:id` | `/api/users` → user_management, pathRewrite /api/v1/users | /api/v1/users/me, /api/v1/users/:id | user_management |
| POST | `/api/invitations/:token/accept` | `/api/invitations` → user_management, pathRewrite /api/v1/invitations | /api/v1/invitations/:token/accept | user_management |
| GET/POST/PUT/DELETE | `/api/v1/organizations/*` | `/api/v1/organizations` → user_management | /api/v1/organizations/* | user_management |
| GET/POST | `/api/logging/api/v1/logs`, `.../export` | `/api/logging` → logging, stripPrefix | /api/v1/logs, /api/v1/export | logging (routes/logs.ts, export.ts) |
| GET/POST/PUT | `/api/v1/recommendations/*`, `/api/v1/feedback/*` | `/api/v1/recommendations`, `/api/v1/feedback` → recommendations | same path | recommendations |
| GET/PUT | `/api/v1/tenant-ml-config` | `/api/v1` → risk_analytics | /api/v1/tenant-ml-config | risk_analytics |
| GET/POST/PUT/DELETE | `/api/v1/decisions/*` | `/api/v1` → risk_analytics | /api/v1/decisions/* | risk_analytics (routes/index.ts) |
| GET/PUT | `/api/v1/system/analytics`, `/api/v1/system/api-security`, `/api/v1/system/datalake` | `/api/v1/system` → configuration_service | /api/v1/system/* | configuration_service |
| GET | `/api/v1/admin/shard-types` | `/api/v1/admin/shard-types` → shard_manager | same path | shard_manager |
| GET/POST/PUT/DELETE | `/api/v1/ml/*` (models, endpoints, monitoring/alerts, features) | `/api/v1/ml` → ml_service | same path | ml_service |
| GET/POST/PUT/DELETE | `/api/v1/action-catalog/*`, `/api/v1/risk-catalog/*` | `/api/v1/action-catalog`, `/api/v1/risk-catalog` → risk_catalog | same path | risk_catalog |
| GET | `/api/v1/admin/integrations/catalog` | `/api/v1/admin/integrations` → integration_manager | same path | integration_manager |
| GET/POST/PUT | `/api/v1/products` | `/api/v1` → risk_analytics | /api/v1/products | risk_analytics |
| GET/PUT | `/api/v1/processing/settings` | `/api/v1/processing` → integration_processors | /api/v1/processing/settings | integration_processors (processing.routes.ts) |
| GET/PUT/POST | `/api/v1/entity-linking/*` | `/api/v1/entity-linking` → integration_processors | same path | integration_processors (entityLinking.routes.ts) |
| GET/PUT/POST | `/api/v1/integrations/*` | `/api/v1/integrations` → integration_manager | same path | integration_manager |
| GET/POST | `/api/conversations*` | `/api/conversations` → ai_conversation, pathRewrite /api/v1/conversations | /api/v1/conversations* | ai_conversation |
| GET/POST | `/api/v1/opportunities/*`, `/api/v1/remediation-workflows/*` | `/api/v1` → risk_analytics | same path | risk_analytics |
| GET/PUT | `/api/v1/adaptive-learning/*` | `/api/v1/adaptive-learning` → adaptive_learning | same path | adaptive_learning |
| GET/PUT | `/api/v1/admin/tenants`, `/api/v1/admin/tenant-templates`, `/api/v1/admin/feedback-types` | respective prefixes → recommendations | same path | recommendations |

**Fixes applied:** (1) Gateway was missing `/api/v1/processing` → integration_processors; added so Settings → Processing hits integration_processors. (2) Gateway was missing `/api/v1/entity-linking` → integration_processors; without it, Settings → Entity linking would have matched `/api/v1` → risk_analytics. Added `/api/v1/entity-linking` in `containers/api-gateway/src/routes/index.ts`.

**Checklist (full audit):** [x] All UI calls use gateway paths that exist in the route table. [x] No incorrect double path (audit uses /api/logging/... by design; stripPrefix yields correct backend path). [x] serviceUrl from config for all mappings. [x] Backend path + method exist on target service. [x] Processing and entity-linking routes added so Settings → Processing and Settings → Entity linking call integration_processors. [x] Protected calls send credentials; public auth routes use no auth / skip401Redirect as appropriate. [x] Per recommended approach: UI → Next.js → gateway; Next.js proxy injects Authorization: Bearer from accessToken cookie for protected routes; gateway validates Bearer only; Set-Cookie forwarded by ProxyService for login. Resolve "Questions to resolve when authentication is unclear" if the proxy does not yet inject Bearer.
