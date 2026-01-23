# Document Manager Module

Document and file management service.

**Service**: `containers/document-manager/`  
**Port**: 3024  
**API Base**: `/api/v1/documents`  
**Database**: Cosmos DB NoSQL (containers: `document_documents`, `document_collections`, `document_templates`)  
**Storage**: Azure Blob Storage

## Overview

The Document Manager module handles document upload, download, storage, and metadata management.

## Features

- Document CRUD operations
- File upload/download (Azure Blob Storage)
- Chunked upload for large files
- Document collections
- Document templates

## Documentation

For complete documentation, see:
- [Module README](../../../../containers/document-manager/README.md)
- [Event Documentation](../../../../containers/document-manager/docs/logs-events.md)

## Dependencies

- Shard Manager (for shard linking)
- Logging (for audit logging)
- User Management (for user context)

