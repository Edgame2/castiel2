# Dashboard Service Module - Architecture

## Overview

The Dashboard Service module provides dashboard management for Castiel, including dashboard CRUD operations, widget management, and organization-scoped dashboards.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `dashboard_dashboards` | `/tenantId` | Dashboard definitions |
| `dashboard_widgets` | `/tenantId` | Widget configurations |
| `dashboard_admin_data` | `/tenantId` | Admin dashboard data |
| `dashboard_widget_cache` | `/tenantId` | Widget cache data |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **DashboardService** - Dashboard CRUD operations and widget management

## Data Flow

```
User Request
    ↓
Dashboard Service
    ↓
Cosmos DB (store/retrieve dashboard)
    ↓
Analytics Service (fetch widget data)
    ↓
Cache Service (cache widget data)
    ↓
Return Dashboard
```

## External Dependencies

- **Analytics Service**: For dashboard data
- **Cache Service**: For widget caching
- **Logging Service**: For audit logging
- **Redis**: For caching

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
