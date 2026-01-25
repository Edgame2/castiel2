# Prompt Service Module

Prompt management and A/B testing service for Castiel.

## Features

- **Prompt Management**: Prompt CRUD operations
- **A/B Testing**: Prompt A/B testing
- **Prompt Analytics**: Prompt performance analytics

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- AI Service
- Logging Service

### Database Setup

- `prompt_prompts` - Prompts (partition key: `/tenantId`)
- `prompt_ab_tests` - A/B test configurations (partition key: `/tenantId`)
- `prompt_analytics` - Prompt analytics (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3036 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| ai_service.url | string | - | AI Service URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/prompts` | List prompts |
| POST | `/api/v1/prompts` | Create prompt |
| GET | `/api/v1/prompts/:id` | Get prompt |
| PUT | `/api/v1/prompts/:id` | Update prompt |
| DELETE | `/api/v1/prompts/:id` | Delete prompt |
| POST | `/api/v1/prompts/ab-test` | Create A/B test |
| GET | `/api/v1/prompts/analytics` | Get prompt analytics |

## Dependencies

- **AI Service**: For prompt execution
- **Logging**: For audit logging

## License

Proprietary

