# Content Generation Module

AI-powered content generation service for Castiel.

## Features

- **Content Generation**: Generate content using AI models
- **Template-based Generation**: Generate content from templates

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- AI Service
- Shard Manager Service
- Logging Service

### Database Setup

- `content_generation_jobs` - Content generation jobs (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3028 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| ai_service.url | string | - | AI Service URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/content/generate` | Generate content |
| GET | `/api/v1/content/jobs/:id` | Get generation job status |

## Dependencies

- **AI Service**: For AI model access
- **Shard Manager**: For data access
- **Logging**: For audit logging

## License

Proprietary

