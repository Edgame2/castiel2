# Analytics Service Module

Analytics and reporting service for Coder IDE.

## Features

- **Analytics**: General analytics and metrics
- **Project Analytics**: Project-specific analytics
- **AI Analytics**: AI usage analytics
- **API Performance**: API performance metrics

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Shard Manager Service
- Logging Service
- User Management Service

### Database Setup

- `analytics_metrics` - Analytics metrics (partition key: `/tenantId`)
- `analytics_reports` - Analytics reports (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3030 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics` | Get analytics |
| GET | `/api/v1/analytics/projects` | Get project analytics |
| GET | `/api/v1/analytics/ai` | Get AI analytics |
| GET | `/api/v1/analytics/api-performance` | Get API performance metrics |

## Dependencies

- **Shard Manager**: For data access
- **Logging**: For audit logging
- **User Management**: For user context

## License

Proprietary

