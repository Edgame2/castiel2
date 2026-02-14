# API Path Rules

**Purpose:** One convention for all API paths. Client path = gateway path = `/api/v1/<service-path>`.

---

## 1. Single Rule

**Client path is always `/api/v1/<service-path>`.**

- All clients (UI, external integrations, tests) call the gateway using `/api/v1/...`.
- No alternate prefixes from the client (e.g. no `/api/auth`, `/api/users`, `/api/notifications` without `v1`).
- ENDPOINTS.md documents the **client path** (same as gateway path).

---

## 2. Gateway

- **Register routes by backend path** when the backend already uses `/api/v1/...`:
  - Example: `/api/v1/auth`, `/api/v1/users`, `/api/v1/notifications`, `/api/v1/dashboards` → proxy with **no path rewrite** (`stripPrefix: false`, no `pathRewrite`).
- **Use pathRewrite only when the backend uses a different prefix:**
  - Example: backend serves at `/api/secrets` but we expose `/api/v1/secrets` to clients → gateway route path `/api/v1/secrets`, `pathRewrite` so backend receives the path it expects (e.g. `/api/secrets` or whatever the service uses).
- Prefer adding gateway routes that match `/api/v1/...` so the client never has to use a non‑v1 path.

---

## 3. UI

- **Always call `/api/v1/...`.** Examples:
  - `/api/v1/auth/login`
  - `/api/v1/users/me`
  - `/api/v1/dashboards/manager`
  - `/api/v1/tenants/:tenantId/roles`
- **Do not call** legacy-style paths from the UI (e.g. `/api/auth/login`, `/api/users/me`).
- Use `apiFetch('/api/v1/...')` (or equivalent) with paths from ENDPOINTS.md / this document.

---

## 4. ENDPOINTS.md

- **Document the client path** = gateway path = `/api/v1/...`.
- Each row’s “Path” is the path the **client** uses (and the gateway exposes). No separate “backend path” column unless a pathRewrite exists; then note it briefly in Notes.
- Keeps one convention and ensures ENDPOINTS.md matches what the UI and gateway use.

---

## 5. Summary

| Layer        | Rule |
|-------------|------|
| **Client path** | Always `/api/v1/<service-path>` |
| **Gateway**     | Register `/api/v1/...`; no rewrite when backend uses `/api/v1/...`; pathRewrite only when backend prefix differs |
| **UI**          | Only call `/api/v1/...`; no `/api/auth`, `/api/users`, etc. |
| **ENDPOINTS.md** | Path column = client path = gateway path = `/api/v1/...` |

---

## 6. Enforcement

Run **`pnpm run check:api-rules`** (from repo root) to verify:

- ENDPOINTS.md Path column uses `/api/v1/...` (or allowed exceptions).
- Gateway route table covers all required path prefixes.
- UI uses only `/api/v1/...` in `apiFetch` and URL construction.

CI runs this step (`.github/workflows/quality.yml` job `api-rules`) and fails the build on violations.
