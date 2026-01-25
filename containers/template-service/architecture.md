# Template Service Module - Architecture

## Overview

The Template Service module provides template management service for Castiel, including template CRUD operations, context templates, and email templates.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `template_templates` | `/tenantId` | Template definitions |
| `template_versions` | `/tenantId` | Template version history |
| `template_context_templates` | `/tenantId` | Context templates |
| `template_email_templates` | `/tenantId` | Email templates |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **TemplateService** - Template CRUD operations
2. **ContextTemplateService** - Context-aware templates
3. **EmailTemplateService** - Email template management

## Data Flow

```
User Request
    ↓
Template Service
    ↓
AI Service (template generation)
    ↓
Cosmos DB (store templates)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **AI Service**: For template generation
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
