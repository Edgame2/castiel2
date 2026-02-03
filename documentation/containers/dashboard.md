# dashboard

Full specification for the Dashboard container.

## 1. Reference

### Purpose

Dashboard CRUD, widget management, organization-scoped dashboards; executive/manager/board views, prioritized opportunities, portfolio drill-down, view recording, widget cache.

### Configuration

From `config/default.yaml`: server.port (3011), cosmos_db, services (logging, analytics_service, cache_service, risk_analytics, forecasting, shard_manager).

### Environment variables

`PORT`, `COSMOS_DB_*`, service URLs.

### API

Dashboard and widget CRUD, views, prioritized opportunities. See [containers/dashboard/openapi.yaml](../../containers/dashboard/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** risk-analytics, forecasting, analytics-service, shard-manager, cache-service, logging.
- **Upstream:** Gateway, UI.

### Cosmos DB containers

Dashboard and widget containers (partition key: tenantId). See config.

---

## 2. Architecture

Dashboard and widget services, Cosmos, cache. [containers/dashboard/README.md](../../containers/dashboard/README.md).

---

## 3. Deployment

- **Port:** 3011. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `dashboard`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/dashboard/README.md](../../containers/dashboard/README.md)
- [containers/dashboard/config/default.yaml](../../containers/dashboard/config/default.yaml)
- [containers/dashboard/openapi.yaml](../../containers/dashboard/openapi.yaml)
