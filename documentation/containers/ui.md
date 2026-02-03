# ui

Full specification for the UI container (Next.js web application).

## 1. Reference

### Purpose

Next.js 16 web app (App Router, React 19): dashboards, admin, analytics, risk views, auth flows. Single client; all API traffic goes through the API Gateway. No direct backend URLs.

### Configuration

- **Port:** 3000 (container); docker-compose maps host 3000 → 3000.
- **Base URL:** `NEXT_PUBLIC_API_BASE_URL` — must point to API Gateway (e.g. `http://api-gateway:3001` in Docker, or public URL in production).

### Environment variables

- `NODE_ENV`, `PORT` (3000)
- `NEXT_PUBLIC_API_BASE_URL` (required for API client)

### API

UI does not expose a REST API; it consumes APIs via the gateway (Axios/fetch to `NEXT_PUBLIC_API_BASE_URL`). Routes and pages are under `containers/ui/src/app/`.

### Events

None (UI does not publish or consume RabbitMQ).

### Dependencies

- **Upstream:** API Gateway only (all `/api/*` calls go to gateway).

### Cosmos DB

None (UI is frontend only).

---

## 2. Architecture

- **Internal structure:** Next.js App Router; pages under `src/app/`; components, hooks, lib, types under `src/`. API client configured with base URL from env.
- **Data flow:** User → Next.js → HTTP to API Gateway → backend services; response → React state/UI.
- **Links:** [containers/ui/README.md](../../containers/ui/README.md) if present. **Detailed UI architecture:** [documentation/UI_CONTAINER_ARCHITECTURE.md](../UI_CONTAINER_ARCHITECTURE.md).

---

## 3. Deployment

- **Port:** 3000 (host and container).
- **Health:** Next.js default or custom health route if configured.
- **Scaling:** Stateless; scale horizontally behind load balancer.
- **Docker Compose service name:** `ui`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Injected by gateway; UI typically does not set it (gateway adds from JWT). Session/JWT from auth via gateway.
- **Auth:** Login/register via gateway; JWT stored (cookie/localStorage per implementation); subsequent requests include JWT; gateway validates and injects tenant.

---

## 5. Links

- [containers/ui/README.md](../../containers/ui/README.md) (if present)
- [documentation/UI_CONTAINER_ARCHITECTURE.md](../UI_CONTAINER_ARCHITECTURE.md) — UI architecture details
