# Content Generation Module - Architecture

## Overview

The Content Generation module provides AI-powered content generation service for Castiel, including template-based generation and content job management.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `content_generation_jobs` | `/tenantId` | Content generation jobs |
| `content_templates` | `/tenantId` | Content templates |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **ContentGenerationService** - Generate content using AI models
2. **ContentTemplateService** - Template-based generation

## Data Flow

```
User Request
    ↓
Content Generation Service
    ↓
AI Service (generate content)
    ↓
Shard Manager (store data)
    ↓
Cosmos DB (store jobs and templates)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **AI Service**: For content generation
- **Shard Manager**: For data sharding
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
