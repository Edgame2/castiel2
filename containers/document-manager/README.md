# Document Manager Module

Document and file management service for Coder IDE. Handles document upload, download, storage, and metadata management.

## Features

- **Document CRUD**: Create, read, update, delete document metadata
- **File Upload/Download**: Upload files to Azure Blob Storage, generate SAS URLs for download
- **Chunked Upload**: Support for large file uploads (>100MB) with chunked upload
- **Document Collections**: Organize documents into collections
- **Document Templates**: Template management for document generation
- **Bulk Operations**: Bulk document operations
- **Versioning**: Document version history

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- Azure Blob Storage account
- RabbitMQ 3.12+ (for event publishing)
- Logging Service (for audit logging)
- User Management Service (for user context)
- Shard Manager Service (for shard linking)

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers):

- `document_documents` - Document metadata (partition key: `/tenantId`)
- `document_collections` - Document collections (partition key: `/tenantId`)
- `document_templates` - Document templates (partition key: `/tenantId`)

Storage: Azure Blob Storage for file storage.

## Configuration

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3024 | Server port |
| cosmos_db.endpoint | string | - | Cosmos DB endpoint URL (required) |
| cosmos_db.key | string | - | Cosmos DB access key (required) |
| storage.azure.account_name | string | - | Azure Storage account name (required) |
| storage.azure.account_key | string | - | Azure Storage account key (required) |
| storage.azure.container_name | string | documents | Blob container name |

## API Reference

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/documents/upload` | Upload document |
| GET | `/api/v1/documents` | List documents |
| GET | `/api/v1/documents/:id` | Get document metadata |
| GET | `/api/v1/documents/:id/download` | Download document (SAS URL) |
| PUT | `/api/v1/documents/:id` | Update document metadata |
| DELETE | `/api/v1/documents/:id` | Delete document |
| POST | `/api/v1/documents/upload/chunked/init` | Initialize chunked upload |
| POST | `/api/v1/documents/upload/chunked/:sessionId/chunk` | Upload chunk |

## Events

### Published Events

- `document.uploaded` - Document uploaded
- `document.updated` - Document updated
- `document.deleted` - Document deleted
- `document.downloaded` - Document downloaded

See [logs-events.md](./docs/logs-events.md) for complete event documentation.

## Dependencies

- **Shard Manager**: For shard linking
- **Logging**: For audit logging
- **User Management**: For user context

## License

Proprietary

