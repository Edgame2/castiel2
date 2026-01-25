# Dashboard Analytics Module - Architecture

## Overview

The Dashboard Analytics module provides advanced dashboard and widget analytics capabilities for the Castiel system. It complements the dashboard module by providing analytics, caching, and admin dashboard features.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `dashboard_admin_data` | `/tenantId` | Admin dashboard data |
| `dashboard_widget_cache` | `/tenantId` | Widget cache data |

## Service Architecture

### Core Services

1. **DashboardAnalyticsService** - Dashboard analytics orchestration
   - Admin dashboard data management
   - Dashboard caching
   - Widget data service

## Integration Points

- **dashboard**: Dashboard CRUD operations
- **analytics-service**: Analytics data
- **cache-service**: Cache operations
