# Pipeline Manager Module

Sales pipeline and opportunity management service for Coder IDE.

## Features

- **Pipeline Views**: Pipeline visualization and management
- **Opportunity Management**: Opportunity CRUD operations
- **Pipeline Analytics**: Revenue forecasting, pipeline metrics
- **Opportunity Auto-linking**: Automatic linking to related shards

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+
- Shard Manager Service
- Logging Service
- User Management Service

### Database Setup

- `pipeline_opportunities` - Opportunity documents (partition key: `/tenantId`)
- `pipeline_views` - Pipeline view configurations (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3025 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pipelines` | Get pipeline views |
| GET | `/api/v1/pipelines/:id` | Get pipeline view |
| GET | `/api/v1/opportunities` | List opportunities |
| POST | `/api/v1/opportunities` | Create opportunity |
| GET | `/api/v1/opportunities/:id` | Get opportunity |
| PUT | `/api/v1/opportunities/:id` | Update opportunity |
| DELETE | `/api/v1/opportunities/:id` | Delete opportunity |
| GET | `/api/v1/pipelines/analytics` | Get pipeline analytics |
| GET | `/api/v1/pipelines/forecast` | Get revenue forecast |

## Events

### Published Events

- `opportunity.created` - Opportunity created
- `opportunity.updated` - Opportunity updated
- `opportunity.deleted` - Opportunity deleted
- `pipeline.view.created` - Pipeline view created

## Dependencies

- **Shard Manager**: For opportunity shard management
- **Logging**: For audit logging
- **User Management**: For user context

## License

Proprietary

