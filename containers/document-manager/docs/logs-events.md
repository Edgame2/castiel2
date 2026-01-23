# Document Manager Module - Logs Events

## Published Events

### document.uploaded

**Description**: Emitted when a document is uploaded.

**Event Schema**: Standard DomainEvent structure with `data` containing:
- `documentId`: string (UUID)
- `tenantId`: string (UUID)
- `fileName`: string
- `fileSize`: number
- `mimeType`: string

### document.updated

**Description**: Emitted when document metadata is updated.

### document.deleted

**Description**: Emitted when a document is deleted.

### document.downloaded

**Description**: Emitted when a document is downloaded.

