# Document Manager Module - Architecture

## Overview

The Document Manager module provides document and file management service for Castiel, handling document upload, download, storage, and metadata management.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `document_documents` | `/tenantId` | Document metadata |
| `document_collections` | `/tenantId` | Document collections |
| `document_templates` | `/tenantId` | Document templates |

### Storage

Azure Blob Storage is used for file storage, with SAS URLs generated for secure downloads.

## Service Architecture

### Core Services

1. **DocumentService** - Document CRUD operations
2. **FileUploadService** - File upload handling (including chunked uploads)
3. **CollectionService** - Collection management
4. **TemplateService** - Template management

## Data Flow

```
User Request
    ↓
Document Manager Service
    ↓
Azure Blob Storage (store files)
    ↓
Cosmos DB (store metadata)
    ↓
Shard Manager (link to shards)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Azure Blob Storage**: For file storage
- **User Management**: For user context
- **Shard Manager**: For shard linking
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
