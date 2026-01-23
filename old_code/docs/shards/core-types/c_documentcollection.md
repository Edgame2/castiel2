# c_documentcollection - Document Collection ShardType

## Overview

The `c_documentcollection` ShardType represents collections of documents organized by folders, tags, or smart queries. Collections have their own ACL permissions independent of the documents they contain.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_documentcollection` |
| **Display Name** | Document Collection |
| **Category** | DOCUMENT |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `FolderOpen` |
| **Color** | `#f59e0b` (Amber) |
| **Partition Key** | `/tenantId` |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Collection name |
| `description` | string | No | Collection description |
| `collectionType` | enum | **Yes** | Collection type |
| `documentIds` | string[] | **Yes** | Array of document shard IDs |
| `documentNames` | string[] | **Yes** | Parallel array of document names |
| `query` | object | No | Smart collection query (Phase 2) |
| `visibility` | enum | **Yes** | Visibility level |
| `tags` | string[] | **Yes** | Custom tags |
| `createdBy` | string | **Yes** | Creator user ID |
| `createdByEmail` | string | No | Creator email |
| `createdAt` | date | **Yes** | Creation timestamp |
| `lastModifiedBy` | string | No | Last modifier user ID |
| `lastModifiedAt` | date | No | Last modified timestamp |

### Field Details

#### `collectionType`
```typescript
enum CollectionType {
  FOLDER = 'folder',   // Manual folder-based organization
  TAG = 'tag',         // Tag-based collection
  SMART = 'smart'      // Dynamic query-based collection (Phase 2)
}
```

#### `visibility`
```typescript
enum VisibilityLevel {
  PUBLIC = 'public',         // Accessible to all users
  INTERNAL = 'internal',     // Accessible to tenant users
  CONFIDENTIAL = 'confidential'  // Restricted access only
}
```

#### `query` (Smart Collections - Phase 2)
```typescript
interface CollectionQuery {
  filters: {
    category?: string[];
    tags?: string[];
    visibility?: VisibilityLevel[];
    documentType?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
  };
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_documentcollection.json",
  "title": "Document Collection",
  "description": "Collection of related documents",
  "type": "object",
  "required": ["name", "collectionType", "documentIds", "documentNames", "visibility", "tags", "createdBy", "createdAt"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "description": "Collection name"
    },
    "description": {
      "type": "string",
      "maxLength": 1000,
      "description": "Collection description"
    },
    "collectionType": {
      "type": "string",
      "enum": ["folder", "tag", "smart"],
      "default": "folder",
      "description": "Collection type"
    },
    "documentIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": [],
      "description": "Array of document shard IDs"
    },
    "documentNames": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "default": [],
      "description": "Parallel array of document names for display"
    },
    "query": {
      "type": "object",
      "description": "Smart collection query (Phase 2)",
      "properties": {
        "filters": {
          "type": "object",
          "properties": {
            "category": {
              "type": "array",
              "items": { "type": "string" }
            },
            "tags": {
              "type": "array",
              "items": { "type": "string" }
            },
            "visibility": {
              "type": "array",
              "items": { "type": "string", "enum": ["public", "internal", "confidential"] }
            },
            "documentType": {
              "type": "array",
              "items": { "type": "string" }
            },
            "dateRange": {
              "type": "object",
              "properties": {
                "start": { "type": "string", "format": "date-time" },
                "end": { "type": "string", "format": "date-time" }
              }
            }
          }
        }
      }
    },
    "visibility": {
      "type": "string",
      "enum": ["public", "internal", "confidential"],
      "default": "internal",
      "description": "Collection visibility level"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string",
        "maxLength": 50
      },
      "default": [],
      "description": "Custom tags"
    },
    "createdBy": {
      "type": "string",
      "description": "Creator user ID"
    },
    "createdByEmail": {
      "type": "string",
      "format": "email",
      "description": "Creator email"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "Creation timestamp"
    },
    "lastModifiedBy": {
      "type": "string",
      "description": "Last modifier user ID"
    },
    "lastModifiedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Last modified timestamp"
    }
  }
}
```

---

## ACL & Permissions

Collections have their own ACL separate from the documents they contain. Users need:

1. **Collection Access**: Permission to view/modify the collection
2. **Document Access**: Independent permission to access each document

**Permission Model**: Option A - Document keeps its own ACL, collection has separate ACL
- Users must have access to BOTH the collection AND the document to view it through the collection
- Documents maintain their own visibility and ACL regardless of collection membership

---

## Examples

### Example 1: Project Folder

```json
{
  "id": "collection-abc123",
  "tenantId": "tenant-xyz",
  "userId": "user-123",
  "shardTypeId": "c_documentcollection",
  "structuredData": {
    "name": "Project Alpha Documents",
    "description": "All documents related to Project Alpha",
    "collectionType": "folder",
    "documentIds": ["doc-001", "doc-002", "doc-003"],
    "documentNames": ["Proposal.pdf", "Contract.docx", "Specifications.pdf"],
    "visibility": "internal",
    "tags": ["project-alpha", "active"],
    "createdBy": "user-123",
    "createdByEmail": "john@example.com",
    "createdAt": "2025-12-10T10:00:00Z"
  },
  "acl": [
    {
      "userId": "user-123",
      "permissions": ["read", "write", "delete", "admin"],
      "grantedBy": "user-123",
      "grantedAt": "2025-12-10T10:00:00Z"
    },
    {
      "roleId": "project-alpha-team",
      "permissions": ["read", "write"],
      "grantedBy": "user-123",
      "grantedAt": "2025-12-10T10:00:00Z"
    }
  ],
  "status": "active",
  "createdAt": "2025-12-10T10:00:00Z",
  "updatedAt": "2025-12-10T10:00:00Z"
}
```

### Example 2: Tag-Based Collection

```json
{
  "id": "collection-xyz789",
  "tenantId": "tenant-xyz",
  "userId": "user-456",
  "shardTypeId": "c_documentcollection",
  "structuredData": {
    "name": "Q4 Reports",
    "description": "All quarterly reports for Q4 2025",
    "collectionType": "tag",
    "documentIds": ["doc-101", "doc-102", "doc-103", "doc-104"],
    "documentNames": ["Financial Report Q4.pdf", "Sales Report Q4.xlsx", "Marketing Report Q4.docx", "Product Report Q4.pdf"],
    "visibility": "confidential",
    "tags": ["q4-2025", "reports", "quarterly"],
    "createdBy": "user-456",
    "createdByEmail": "sarah@example.com",
    "createdAt": "2025-10-01T09:00:00Z",
    "lastModifiedBy": "user-456",
    "lastModifiedAt": "2025-12-01T14:30:00Z"
  },
  "acl": [
    {
      "userId": "user-456",
      "permissions": ["read", "write", "delete", "admin"],
      "grantedBy": "user-456",
      "grantedAt": "2025-10-01T09:00:00Z"
    },
    {
      "roleId": "finance-team",
      "permissions": ["read"],
      "grantedBy": "user-456",
      "grantedAt": "2025-10-01T09:00:00Z"
    }
  ],
  "status": "active",
  "createdAt": "2025-10-01T09:00:00Z",
  "updatedAt": "2025-12-01T14:30:00Z"
}
```

---

## Best Practices

1. **Keep documentNames in Sync**: Always update `documentNames` array when modifying `documentIds` for better UX
2. **Separate ACLs**: Remember collections and documents have independent ACLs - manage both
3. **Use Visibility Appropriately**: Set collection visibility to match or exceed the most restrictive document
4. **Regular Cleanup**: Remove references to deleted documents from collections
5. **Naming Convention**: Use clear, descriptive collection names
6. **Tag Consistency**: Use consistent tagging across collections for better organization
7. **Audit Changes**: Track all collection modifications for compliance

---

## Operations

### Adding Documents

When adding documents to a collection:
1. Verify user has write permission on collection
2. Verify documents exist and user has read permission on each
3. Update both `documentIds` and `documentNames` arrays
4. Update `lastModifiedBy` and `lastModifiedAt`
5. Log audit event `document_moved_to_collection`

### Removing Documents

When removing documents from a collection:
1. Verify user has write permission on collection
2. Remove from both `documentIds` and `documentNames` arrays (maintain parallel structure)
3. Update `lastModifiedBy` and `lastModifiedAt`
4. Log audit event `document_removed_from_collection`

### Bulk Assignment

Use bulk operations service for adding multiple documents:
- Create bulk job
- Process each document individually
- Track success/failure per document
- Update collection atomically after validation

---

## Relationships

- **Parent**: None (top-level entity)
- **Children**: References `c_document` shards via `documentIds`
- **Related**: May reference `c_user` (createdBy, lastModifiedBy)

---

## Phase 2 Enhancements

Future smart collections will support dynamic queries:

```typescript
// Example smart collection query
{
  "query": {
    "filters": {
      "category": ["contract", "legal"],
      "tags": ["2025", "active"],
      "visibility": ["internal", "confidential"],
      "dateRange": {
        "start": "2025-01-01",
        "end": "2025-12-31"
      }
    }
  }
}
```

Smart collections automatically update when documents matching the query are created/modified.
