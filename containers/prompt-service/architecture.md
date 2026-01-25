# Prompt Service Module - Architecture

## Overview

The Prompt Service module provides prompt management and A/B testing service for Castiel, including prompt CRUD operations, A/B testing, and prompt analytics.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `prompt_prompts` | `/tenantId` | Prompt definitions |
| `prompt_versions` | `/tenantId` | Prompt version history |
| `prompt_ab_tests` | `/tenantId` | A/B test configurations |
| `prompt_analytics` | `/tenantId` | Prompt analytics |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **PromptService** - Prompt CRUD operations
2. **ABTestService** - A/B testing management
3. **AnalyticsService** - Prompt performance analytics

## Data Flow

```
User Request
    ↓
Prompt Service
    ↓
AI Service (test prompts)
    ↓
Cosmos DB (store prompts and analytics)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **AI Service**: For prompt testing
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
