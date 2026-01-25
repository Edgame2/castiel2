# Template Service Module

Template management service for Castiel.

## Features

- **Template Management**: Template CRUD operations
- **Context Templates**: Context-aware templates
- **Email Templates**: Email template management
- **Document Templates**: Document template management

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Logging Service

### Database Setup

- `template_templates` - Templates (partition key: `/tenantId`)
- `template_context_templates` - Context templates (partition key: `/tenantId`)
- `template_email_templates` - Email templates (partition key: `/tenantId`)

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3037 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/templates` | List templates |
| POST | `/api/v1/templates` | Create template |
| GET | `/api/v1/templates/:id` | Get template |
| PUT | `/api/v1/templates/:id` | Update template |
| DELETE | `/api/v1/templates/:id` | Delete template |

## Dependencies

- **Logging**: For audit logging

## License

Proprietary

