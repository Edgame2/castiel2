# Dashboard Analytics Module

Advanced dashboard and widget analytics service for Castiel, providing admin dashboard data, dashboard caching, and widget data services.

## Features

- **Admin Dashboard**: Admin dashboard data and analytics
- **Dashboard Caching**: Cache dashboard data for performance
- **Widget Data**: Widget data service for dashboard widgets

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `dashboard_admin_data` - Admin dashboard data (partition: `/tenantId`)
- `dashboard_widget_cache` - Widget cache data (partition: `/tenantId`)

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

See [OpenAPI Spec](./openapi.yaml)

### BI/risk (Plan §10, §6.4)

- **GET /api/v1/dashboards/executive** – DashboardAnalyticsService.getExecutiveDashboard; revenue-at-risk, competitive-intel, forecasting; risk_heatmap, industry_benchmark (stub when not wired).
- **GET /api/v1/dashboards/board** – getBoardDashboard; same sources.
- **GET /api/v1/dashboards/manager** – manager view; prioritized opportunities via risk-analytics `GET /api/v1/risk-analysis/tenant/prioritized-opportunities` when configured.

## Events

### Published Events

- `dashboard.analytics.updated` - Dashboard analytics updated

### Consumed Events

- (None currently)

## Dependencies

- **dashboard**: For dashboard CRUD operations
- **analytics-service**: For analytics data
- **cache-service**: For cache operations
- **risk-analytics** (Plan §10): revenue-at-risk, prioritised opportunities, competitive-intel, risk_heatmap
- **forecasting**: scenarios, risk-adjusted, ML forecast for executive/board

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
