Goal: For each UI feature that calls the backend, confirm (1) the UI calls the correct API Gateway path, and (2) the API Gateway forwards to the correct service and path.
Conventions in this codebase:
- UI uses NEXT_PUBLIC_API_BASE_URL (no trailing slash) plus a gateway path (e.g. /api/auth/login, /api/v1/recommendations). Paths come from containers/ui/src/lib/api.ts (apiFetch/getApiBaseUrl) or inline process.env.NEXT_PUBLIC_API_BASE_URL. No hardcoded host/port.
- API Gateway route table is in containers/api-gateway/src/routes/index.ts. Each mapping has: path (gateway prefix), service, serviceUrl (from containers/api-gateway/config/default.yaml), and optionally pathRewrite or stripPrefix.
- Gateway matches by longest prefix. More specific paths (e.g. /api/v1/recommendations) must be registered before broader ones (e.g. /api/v1) so the correct service is chosen. Some mappings are registered only when config.services.<name>?.url is set; when auditing a feature, confirm that service is enabled in api-gateway config.
- Path forwarding (query string is forwarded as-is):
  - pathRewrite set: backendPath = pathRewrite + requestPathWithoutQuery.slice(mapping.path.length). E.g. mapping path /api/auth, pathRewrite /api/v1/auth, request /api/auth/login → /api/v1/auth/login.
  - stripPrefix true and no pathRewrite: request path with mapping path removed (leading slash added if needed).
  - Else: full request path to the service (e.g. /api/v1/ml/models → same path on ml_service).
- Services expose routes under paths like /api/v1/... (see each service’s src/routes/ and/or openapi.yaml).
Step 1 – UI → Gateway
Where to look: containers/ui/src — search for apiFetch(, getApiBaseUrl(), NEXT_PUBLIC_API_BASE_URL, fetch with /api/.
For each UI call:
- List the exact path and method used (e.g. GET /api/auth/login, POST /api/v1/integrations).
- Check that the path is a gateway path (starts with /api/ and matches a gateway route prefix).
- Prefer one gateway path per call: either a pathRewrite route (e.g. /api/auth/...) or a direct /api/v1/... route.
- Wrong: UI calls /api/users/api/v1/organizations/... (mixing gateway prefix with service path). Correct: UI calls /api/v1/organizations/... when the gateway has a route for that prefix to user_management.
- Confirm the base URL is from config only: NEXT_PUBLIC_API_BASE_URL or getApiBaseUrl() (no hardcoded URLs or ports).
Step 2 – Gateway → Service
Where to look: Gateway — containers/api-gateway/src/routes/index.ts and ProxyService (path build in proxyRequest). Service — containers/<service>/src/routes/ and openapi.yaml.
For each gateway path from Step 1:
- Find the mapping that matches that path (longest matching prefix) in routes/index.ts.
- Note the service and serviceUrl (from config; env overrides allowed, no hardcoded URLs).
- Compute the backend path using the path-forwarding rules above.
- In that service’s code, confirm it exposes that backend path and HTTP method (GET/POST/PUT/DELETE). If not, fix the gateway mapping or the UI path.
Step 3 – Checklist per feature
For a given UI feature/page:
[ ] All API calls use a single gateway path that exists in the gateway route table.
[ ] No “double path” (e.g. /api/users/api/v1/organizations/...).
[ ] Gateway mapping’s serviceUrl comes from config; if the route is conditional, the service is enabled in config.
[ ] Computed backend path and method exist on the target service.
Optional – Build a small table
For each UI call, fill (include Method so path and HTTP method are both verified):
UI (page/component)	Method	Gateway path called	Gateway mapping (path → service)	Backend path sent to service	Service file that defines route
e.g. login	POST	/api/auth/login	/api/auth → auth, pathRewrite /api/v1/auth	/api/v1/auth/login	auth routes/auth.ts
Use this prompt (and table) when adding a new UI feature, changing a gateway route, or auditing existing pages so the UI always calls the correct gateway path and the gateway forwards to the correct service path.

---

## Example audit: Recommendations UI

Single-feature trace (Recommendations list/card/detail and feedback).

**Step 1 – UI → Gateway**

| UI (page/component) | Method | Gateway path called | Base URL source |
|---------------------|--------|---------------------|------------------|
| RecommendationsCard.tsx | GET | `/api/v1/recommendations?opportunityId=...&limit=20` | `getApiBaseUrl()` (NEXT_PUBLIC_API_BASE_URL) |
| RecommendationsCard.tsx | POST | `/api/v1/recommendations/:id/feedback` | `getApiBaseUrl()` |
| recommendations/page.tsx | GET | `/api/v1/recommendations?...` | `apiFetch` → same base |
| recommendations/[id]/page.tsx | GET | `/api/v1/recommendations/:id` | `getApiBaseUrl()` |
| admin/feedback/page.tsx | GET | `/api/v1/feedback/aggregation?period=...` | `apiBaseUrl` from getApiBaseUrl() |

All paths start with `/api/`, match gateway route prefixes, no double path. Base from config only.

**Step 2 – Gateway → Service**

| Method | Gateway path | Gateway mapping | Backend path sent to service | Service route (file:line) |
|--------|--------------|-----------------|------------------------------|----------------------------|
| GET | `/api/v1/recommendations?...` | `/api/v1/recommendations` → recommendations, stripPrefix: false | `/api/v1/recommendations?...` | recommendations src/routes/index.ts:822 GET `/api/v1/recommendations` |
| GET | `/api/v1/recommendations/:id` | same | `/api/v1/recommendations/:id` | same file:864 GET `/api/v1/recommendations/:id` |
| POST | `/api/v1/recommendations/:id/feedback` | same | `/api/v1/recommendations/:id/feedback` | same file:883 POST `/api/v1/recommendations/:id/feedback` |
| GET | `/api/v1/feedback/aggregation?...` | `/api/v1/feedback` → recommendations, stripPrefix: false | `/api/v1/feedback/aggregation?...` | same file:801 GET `/api/v1/feedback/aggregation` |

serviceUrl from `config.services.recommendations.url` (api-gateway config). All backend paths and methods exist on recommendations service.

**Checklist (Recommendations feature):** [x] Single gateway path per call [x] No double path [x] serviceUrl from config [x] Backend path + method exist on service.
