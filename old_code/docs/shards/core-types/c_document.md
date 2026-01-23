# c_document - Document ShardType

## Overview

The `c_document` ShardType represents documents, files, and content artifacts with enterprise-grade document management capabilities including multi-tenant isolation, versioning, ACL-based permissions, and Azure Blob Storage integration.

> **Phase 1**: Focuses on upload, storage, and management. Virus scanning, text extraction, and PII redaction deferred to Phase 2.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Schema Definition](#schema-definition)
3. [Storage Architecture](#storage-architecture)
4. [Document Permissions](#document-permissions)
5. [Document Features](#document-features)
6. [Relationships](#relationships)
7. [Examples](#examples)
8. [Best Practices](#best-practices)

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_document` |
| **Display Name** | Document |
| **Category** | DOCUMENT |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `FileText` |
| **Color** | `#3b82f6` (Blue) |
| **Partition Key** | `/tenantId` |
| **Storage** | Azure Blob Storage |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Document title/filename |
| `description` | string | No | Document description/summary |
| `documentType` | string | No | Type of document (proposal, contract, etc.) |
| `mimeType` | string | **Yes** | File MIME type |
| `fileSize` | number | **Yes** | File size in bytes |
| `storageProvider` | enum | **Yes** | Storage provider (azure, aws, gcp) |
| `storagePath` | string | **Yes** | Blob storage path |
| `thumbnailPath` | string | No | Thumbnail blob path |
| `previewPath` | string | No | Preview blob path |
| `category` | string | No | Document category |
| `tags` | string[] | **Yes** | Custom tags (default: []) |
| `visibility` | enum | **Yes** | Visibility level |
| `retentionPolicyId` | string | No | Retention policy reference |
| `retentionUntil` | date | No | Retention expiry date |
| `version` | number | **Yes** | Current version number |
| `versionHistory` | array | **Yes** | Version history entries |
| `scanStatus` | enum | No | Virus scan status (Phase 2) |
| `scanTimestamp` | date | No | Last scan timestamp (Phase 2) |
| `extractionStatus` | enum | No | Text extraction status (Phase 2) |
| `extractionTimestamp` | date | No | Extraction timestamp (Phase 2) |
| `uploadedBy` | string | **Yes** | Uploader user ID |
| `uploadedByEmail` | string | No | Uploader email |
| `uploadedAt` | date | **Yes** | Upload timestamp |
| `deletedBy` | string | No | Deleter user ID (soft delete) |
| `deletedAt` | date | No | Deletion timestamp (soft delete) |
| `deletionReason` | string | No | Deletion reason |

### Field Details

#### `storageProvider`
```typescript
enum StorageProvider {
  AZURE = 'azure',  // Azure Blob Storage (default)
  AWS = 'aws',      // AWS S3 (future)
  GCP = 'gcp'       // Google Cloud Storage (future)
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

#### `scanStatus` (Phase 2)
```typescript
enum ScanStatus {
  PENDING = 'pending',   // Awaiting scan
  CLEAN = 'clean',       // No threats detected
  INFECTED = 'infected', // Threat detected
  ERROR = 'error'        // Scan failed
}
```

#### `versionHistory`
```typescript
interface DocumentVersionEntry {
  version: number;           // Version number
  uploadedAt: Date;          // Upload timestamp
  uploadedBy: string;        // User ID
  uploadedByEmail?: string;  // User email
  fileSize: number;          // File size in bytes
  mimeType: string;          // MIME type
  reason?: string;           // Update reason
  storageProvider: string;   // Storage provider
  storagePath: string;       // Blob path
}
```

### unstructuredData Fields

| Field | Type | Description |
|-------|------|-------------|
| `extractedText` | string | Extracted text content (Phase 2) |
| `rawMetadata` | object | Raw file metadata |

### Storage Path Structure

**Quarantine (initial upload):**
```
quarantine/{tenantId}/{shardId}/v{version}/{filename}
```

**Final Storage:**
```
{tenantId}/documents/{shardId}/v{version}/{filename}
```

**Example:**
```
tenant-abc123/documents/doc-xyz789/v1/proposal.pdf
tenant-abc123/documents/doc-xyz789/v2/proposal-revised.pdf
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_document.json",
  "title": "Document",
  "description": "Enterprise document with blob storage",
  "type": "object",
  "required": ["name", "mimeType", "fileSize", "storageProvider", "storagePath", "tags", "visibility", "version", "versionHistory", "uploadedBy", "uploadedAt"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Document title"
    },
    "description": {
      "type": "string",
      "maxLength": 2000,
      "description": "Document description"
    },
    "documentType": {
      "type": "string",
      "maxLength": 100,
      "description": "Type of document"
    },
    "mimeType": {
      "type": "string",
      "description": "File MIME type"
    },
    "fileSize": {
      "type": "integer",
      "minimum": 0,
      "description": "File size in bytes"
    },
    "storageProvider": {
      "type": "string",
      "enum": ["azure", "aws", "gcp"],
      "default": "azure",
      "description": "Storage provider"
    },
    "storagePath": {
      "type": "string",
      "description": "Blob storage path"
    },
    "thumbnailPath": {
      "type": "string",
      "description": "Thumbnail blob path"
    },
    "previewPath": {
      "type": "string",
      "description": "Preview blob path"
    },
    "category": {
      "type": "string",
      "maxLength": 100,
      "description": "Document category"
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
    "visibility": {
      "type": "string",
      "enum": ["public", "internal", "confidential"],
      "default": "internal",
      "description": "Visibility level"
    },
    "retentionPolicyId": {
      "type": "string",
      "description": "Retention policy ID"
    },
    "retentionUntil": {
      "type": "string",
      "format": "date-time",
      "description": "Retention expiry date"
    },
    "version": {
      "type": "integer",
      "minimum": 1,
      "default": 1,
      "description": "Current version number"
    },
    "versionHistory": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["version", "uploadedAt", "uploadedBy", "fileSize", "mimeType", "storageProvider", "storagePath"],
        "properties": {
          "version": { "type": "integer" },
          "uploadedAt": { "type": "string", "format": "date-time" },
          "uploadedBy": { "type": "string" },
          "uploadedByEmail": { "type": "string" },
          "fileSize": { "type": "integer" },
          "mimeType": { "type": "string" },
          "reason": { "type": "string" },
          "storageProvider": { "type": "string" },
          "storagePath": { "type": "string" }
        }
      },
      "default": [],
      "description": "Version history"
    },
    "scanStatus": {
      "type": "string",
      "enum": ["pending", "clean", "infected", "error"],
      "description": "Virus scan status (Phase 2)"
    },
    "scanTimestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Last scan timestamp"
    },
    "extractionStatus": {
      "type": "string",
      "enum": ["pending", "completed", "failed"],
      "description": "Text extraction status (Phase 2)"
    },
    "extractionTimestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Extraction timestamp"
    },
    "uploadedBy": {
      "type": "string",
      "description": "Uploader user ID"
    },
    "uploadedByEmail": {
      "type": "string",
      "format": "email",
      "description": "Uploader email"
    },
    "uploadedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Upload timestamp"
    },
    "deletedBy": {
      "type": "string",
      "description": "Deleter user ID (soft delete)"
    },
    "deletedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Deletion timestamp (soft delete)"
    },
    "deletionReason": {
      "type": "string",
      "maxLength": 500,
      "description": "Deletion reason"
    }
  }
}
```

---

## Storage Architecture
    },
    "pageCount": {
      "type": "integer",
      "minimum": 0,
      "description": "Number of pages"
    },
    "wordCount": {
      "type": "integer",
      "minimum": 0,
      "description": "Word count"
    },
    "isConfidential": {
      "type": "boolean",
      "default": false,
      "description": "Confidentiality flag"
    },
    "accessLevel": {
      "type": "string",
      "enum": ["public", "internal", "confidential", "restricted"],
      "default": "internal",
      "description": "Access restriction level"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Custom tags"
    }
  },
  "required": ["name"]
}
```

---

## Storage Providers

`c_document` supports multiple storage backends. The actual file content is stored externally, with Castiel maintaining metadata and references.

### Supported Storage Providers

| Provider | Type | Features |
|----------|------|----------|
| **Azure Blob Storage** | Primary | Document Intelligence integration, automatic text extraction |
| **Google Drive** | External | OAuth integration, real-time sync |
| **OneDrive** | External | Microsoft 365 integration |
| **SharePoint** | External | Enterprise collaboration, version control |
| **Dropbox** | External | Cross-platform sync |

### Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         c_document Shard                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ structuredData                                           │    │
│  │   name, documentType, status, mimeType, fileSize, ...    │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ storage                                                  │    │
│  │   provider: "azure" | "google_drive" | "onedrive" | ...  │    │
│  │   storageId: "unique-storage-id"                         │    │
│  │   containerOrBucket: "tenant-documents"                  │    │
│  │   path: "/projects/acme/proposals/v2.1.pdf"              │    │
│  │   downloadUrl: "https://..."  (time-limited SAS/signed)  │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ external_relationships (for linked external files)       │    │
│  │   system: "google-drive", externalId: "1ABC...", ...     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │ Azure Blob  │  │ Google Drive│  │ SharePoint  │
     │  Storage    │  │             │  │             │
     └─────────────┘  └─────────────┘  └─────────────┘
```

### Storage Field Schema

```typescript
interface DocumentStorage {
  provider: StorageProvider;
  storageId: string;              // Unique ID in storage system
  containerOrBucket?: string;     // Azure container / S3 bucket
  path: string;                   // Full path to file
  downloadUrl?: string;           // Time-limited download URL
  downloadUrlExpiry?: Date;       // URL expiration
  uploadedAt: Date;
  uploadedBy: string;
  checksum?: string;              // File hash for integrity
  isProcessed: boolean;           // Has Document Intelligence run?
  processingStatus?: ProcessingStatus;
}

enum StorageProvider {
  AZURE = 'azure',
  GOOGLE_DRIVE = 'google_drive',
  ONEDRIVE = 'onedrive',
  SHAREPOINT = 'sharepoint',
  DROPBOX = 'dropbox',
  S3 = 's3',
  LOCAL = 'local'  // For development only
}

enum ProcessingStatus {
  PENDING = 'pending',
  SCANNING = 'scanning',          // Virus scanning
  PROCESSING = 'processing',      // Document Intelligence
  COMPLETED = 'completed',
  FAILED = 'failed',
  QUARANTINED = 'quarantined',    // Virus/DLP issue
  SKIPPED = 'skipped'             // Non-processable file type
}
```

### Azure Blob Storage (Primary)

Azure is the primary storage provider with deep integration:

```typescript
interface AzureStorageConfig {
  accountName: string;
  containerName: string;          // Per-tenant container
  useManagedIdentity: boolean;
  sasTokenDurationHours: number;  // For download URLs
}

// Document path structure in Azure:
// {tenantId}/{shardId}/{version}/{filename}
// Example: tenant-123/doc-456/v1/proposal.pdf
```

### External Provider Integration

For Google Drive, OneDrive, SharePoint, Dropbox:

- File remains in external system
- Castiel syncs metadata via `external_relationships`
- Content extracted on demand or scheduled
- Two-way sync optional (configurable per tenant)

```typescript
// Example: Google Drive linked document
{
  "external_relationships": [{
    "id": "ext-gdrive-1",
    "system": "google-drive",
    "systemType": "storage",
    "externalId": "1ABC123def456",
    "externalUrl": "https://drive.google.com/file/d/1ABC123def456",
    "syncStatus": "synced",
    "syncDirection": "pull",
    "lastSyncedAt": "2025-11-29T10:00:00Z",
    "metadata": {
      "driveId": "shared-drive-123",
      "parentFolderId": "folder-456",
      "owners": ["user@company.com"],
      "permissions": ["view", "download"]
    }
  }]
}
```

---

## Azure Document Intelligence

Azure Document Intelligence (formerly Form Recognizer) provides advanced AI-powered document analysis for `c_document` shards stored in Azure.

### Capabilities

| Feature | Description | Output |
|---------|-------------|--------|
| **Text Extraction** | OCR for images, scanned PDFs | `unstructuredData.text` |
| **Layout Analysis** | Tables, paragraphs, headers | `analysis.layout` |
| **Key-Value Pairs** | Form fields extraction | `analysis.keyValuePairs` |
| **Entity Recognition** | People, organizations, dates | `analysis.entities` |
| **Document Classification** | Auto-classify document type | `analysis.classification` |
| **Table Extraction** | Structured table data | `analysis.tables` |
| **Signature Detection** | Identify signatures | `analysis.signatures` |
| **Language Detection** | Detect document language | `structuredData.language` |

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOCUMENT UPLOAD FLOW                        │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Upload to Azure Blob Storage                                 │
│    → Tenant container: {tenantId}-documents                     │
│    → Path: {shardId}/{version}/{filename}                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Virus Scan (Microsoft Defender / ClamAV)                     │
│    → If infected → Quarantine, notify admin                     │
│    → If clean → Continue                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Trigger Document Intelligence (Event Grid / Queue)           │
│    → Check tenant quota (max_document_intelligence)             │
│    → Queue job if quota available                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Azure Document Intelligence Processing                       │
│    → Layout Analysis (prebuilt-layout)                          │
│    → Read API (OCR)                                             │
│    → Optional: Custom model for specific document types         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. DLP Scan (Optional)                                          │
│    → Check for PII, financial data, credentials                 │
│    → If violation → Quarantine or redact                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Store Results in Shard                                       │
│    → unstructuredData.text (extracted text)                     │
│    → analysis.* (structured analysis results)                   │
│    → Update processingStatus to 'completed'                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. AI Enrichment Pipeline                                       │
│    → Generate embeddings for semantic search                    │
│    → Entity extraction, summarization                           │
│    → Store in vectors[], enrichment                             │
└─────────────────────────────────────────────────────────────────┘
```

→ See the **[Embedding Processor](../../embedding-processor/README.md)** for detailed implementation of the AI enrichment pipeline.

### Analysis Schema

```typescript
interface DocumentAnalysis {
  // Processing metadata
  processedAt: Date;
  processingDurationMs: number;
  modelId: string;                 // e.g., "prebuilt-layout"
  apiVersion: string;
  
  // Content
  content: string;                 // Full extracted text
  pageCount: number;
  
  // Structural analysis
  pages: PageAnalysis[];
  paragraphs: Paragraph[];
  tables: Table[];
  keyValuePairs: KeyValuePair[];
  
  // Entity extraction
  entities: Entity[];
  
  // Document classification
  classification?: {
    documentType: string;
    confidence: number;
  };
  
  // Signatures/handwriting
  signatures?: SignatureInfo[];
  handwriting?: HandwritingInfo[];
  
  // Language
  languages: {
    code: string;
    confidence: number;
  }[];
}

interface PageAnalysis {
  pageNumber: number;
  width: number;
  height: number;
  unit: 'inch' | 'pixel';
  lines: Line[];
  words: Word[];
  selectionMarks: SelectionMark[];
}

interface Table {
  rowCount: number;
  columnCount: number;
  cells: TableCell[];
  boundingRegions: BoundingRegion[];
}

interface KeyValuePair {
  key: {
    content: string;
    boundingRegions: BoundingRegion[];
  };
  value: {
    content: string;
    boundingRegions: BoundingRegion[];
  };
  confidence: number;
}
```

### Supported File Types

| Type | Extensions | Document Intelligence Support |
|------|------------|------------------------------|
| PDF | `.pdf` | ✅ Full (text + OCR) |
| Images | `.jpg`, `.png`, `.tiff`, `.bmp` | ✅ OCR |
| Office | `.docx`, `.xlsx`, `.pptx` | ✅ Text extraction |
| Text | `.txt`, `.md`, `.csv` | ⚡ Direct (no DI needed) |
| Email | `.eml`, `.msg` | ✅ Text + metadata |
| HTML | `.html`, `.htm` | ⚡ Direct parsing |

### Usage Tracking

Document Intelligence usage is tracked per tenant:

```typescript
interface DocumentIntelligenceUsage {
  tenantId: string;
  period: 'daily' | 'monthly';
  periodStart: Date;
  
  // Page counts
  pagesProcessed: number;
  pagesQuota: number;  // From max_document_intelligence setting
  
  // Cost tracking
  estimatedCost: number;
  currency: string;
  
  // Breakdown
  byModel: {
    [modelId: string]: number;
  };
  byDocumentType: {
    [type: string]: number;
  };
}
```

---

## Document Permissions

Documents have granular access control through ACL (Access Control List) inherited from the base Shard schema, plus document-specific permission levels.

### Permission Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT PERMISSION LAYERS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Tenant Isolation                                      │
│  └── All documents scoped to tenantId (enforced at DB level)    │
│                                                                 │
│  Layer 2: Shard ACL                                             │
│  └── acl: [{ principalType, principalId, permissions[] }]       │
│                                                                 │
│  Layer 3: Access Level (Document-specific)                      │
│  └── accessLevel: public | internal | confidential | restricted │
│                                                                 │
│  Layer 4: Parent Inheritance (Optional)                         │
│  └── Inherit from parentShardId (e.g., project)                 │
│                                                                 │
│  Layer 5: Storage-Level Permissions                             │
│  └── Azure SAS tokens, Google Drive sharing, etc.               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ACL Configuration

```typescript
interface DocumentACL {
  acl: ACLEntry[];
}

interface ACLEntry {
  id: string;
  principalType: 'user' | 'role' | 'group' | 'tenant';
  principalId: string;
  permissions: DocumentPermission[];
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;  // Time-limited access
}

enum DocumentPermission {
  VIEW = 'view',           // View metadata
  READ = 'read',           // Read content / download
  WRITE = 'write',         // Edit metadata
  DELETE = 'delete',       // Delete document
  SHARE = 'share',         // Share with others
  MANAGE = 'manage',       // Full control + ACL management
  DOWNLOAD = 'download',   // Download original file
  PRINT = 'print',         // Print document (if enforced)
  COMMENT = 'comment'      // Add notes/comments
}
```

### Access Level Enforcement

```typescript
// Permission check flow
async function canAccessDocument(
  document: Shard,
  userId: string,
  permission: DocumentPermission
): Promise<boolean> {
  // 1. Check tenant match
  if (document.tenantId !== getUserTenantId(userId)) {
    return false;
  }
  
  // 2. Check owner (always has full access)
  if (document.userId === userId) {
    return true;
  }
  
  // 3. Check ACL
  const userPermissions = await resolveUserPermissions(document.acl, userId);
  if (userPermissions.includes(permission) || userPermissions.includes('manage')) {
    return true;
  }
  
  // 4. Check access level + user roles
  const accessLevel = document.structuredData.accessLevel;
  if (accessLevel === 'public') {
    return permission === 'view' || permission === 'read';
  }
  
  // 5. Check parent inheritance
  if (document.parentShardId) {
    return await canAccessDocument(
      await getShard(document.parentShardId),
      userId,
      permission
    );
  }
  
  return false;
}
```

### Download URL Security

File downloads use time-limited signed URLs:

```typescript
async function getSecureDownloadUrl(
  document: Shard,
  userId: string
): Promise<string> {
  // Verify permission
  if (!await canAccessDocument(document, userId, 'download')) {
    throw new ForbiddenError('No download permission');
  }
  
  // Generate time-limited URL
  const storage = document.storage;
  
  if (storage.provider === 'azure') {
    return generateAzureSasUrl(storage.path, {
      expiresIn: 3600,  // 1 hour
      permissions: 'r',  // Read only
      ipRestriction: getUserIp(userId)  // Optional: IP lock
    });
  }
  
  // Similar for other providers...
}
```

---

## Tenant Settings

Document-related settings are configured at the tenant level with different admin permissions.

### Settings Overview

| Setting | Type | Default | Editable By | Description |
|---------|------|---------|-------------|-------------|
| `max_storage` | number (bytes) | 10 GB | Super Admin | Maximum total storage per tenant |
| `max_document_intelligence` | number (pages/month) | 1,000 | Super Admin | Monthly Document Intelligence quota |
| `documents_conservation_days` | number (days) | 365 | Tenant Admin | Days before auto-archival |

### Settings Schema

```typescript
interface TenantDocumentSettings {
  // Storage limits (Super Admin only)
  max_storage: number;                    // Bytes (default: 10737418240 = 10GB)
  storage_warning_threshold: number;      // Percentage (default: 80)
  
  // Document Intelligence limits (Super Admin only)
  max_document_intelligence: number;      // Pages per month (default: 1000)
  document_intelligence_warning: number;  // Percentage (default: 80)
  
  // Retention (Tenant Admin can edit)
  documents_conservation_days: number;    // Days (default: 365)
  deleted_documents_retention_days: number; // Soft delete retention (default: 30)
  
  // Auto-processing (Tenant Admin can edit)
  auto_process_uploads: boolean;          // Auto-run Document Intelligence
  auto_generate_thumbnails: boolean;      // Generate preview thumbnails
  auto_extract_text: boolean;             // Extract text on upload
  auto_virus_scan: boolean;               // Virus scan on upload (default: true)
  
  // File restrictions (Tenant Admin can edit)
  allowed_mime_types: string[];           // Allowed file types
  max_file_size: number;                  // Max single file size (bytes)
  blocked_extensions: string[];           // Blocked file extensions
  
  // DLP (Super Admin can configure, Tenant Admin can enable/disable)
  dlp_enabled: boolean;
  dlp_action_on_violation: 'block' | 'quarantine' | 'warn' | 'redact';
}
```

### Permission Matrix

```
┌────────────────────────────────────┬─────────────┬──────────────┐
│ Setting                            │ Super Admin │ Tenant Admin │
├────────────────────────────────────┼─────────────┼──────────────┤
│ max_storage                        │     ✅      │      ❌      │
│ max_document_intelligence          │     ✅      │      ❌      │
│ documents_conservation_days        │     ✅      │      ✅      │
│ deleted_documents_retention_days   │     ✅      │      ✅      │
│ auto_process_uploads               │     ✅      │      ✅      │
│ allowed_mime_types                 │     ✅      │      ✅      │
│ max_file_size                      │     ✅      │      ✅      │
│ dlp_enabled                        │     ✅      │      ✅      │
│ dlp_policies (configure)           │     ✅      │      ❌      │
└────────────────────────────────────┴─────────────┴──────────────┘
```

### Storage Quota Enforcement

```typescript
async function checkStorageQuota(
  tenantId: string,
  newFileSize: number
): Promise<QuotaCheckResult> {
  const settings = await getTenantSettings(tenantId);
  const usage = await getTenantStorageUsage(tenantId);
  
  const currentUsage = usage.totalBytes;
  const maxStorage = settings.max_storage;
  const afterUpload = currentUsage + newFileSize;
  
  if (afterUpload > maxStorage) {
    return {
      allowed: false,
      reason: 'STORAGE_QUOTA_EXCEEDED',
      currentUsage,
      maxStorage,
      requestedSize: newFileSize,
      available: maxStorage - currentUsage
    };
  }
  
  // Check warning threshold
  const usagePercentage = (afterUpload / maxStorage) * 100;
  if (usagePercentage >= settings.storage_warning_threshold) {
    await notifyTenantAdmins(tenantId, 'STORAGE_WARNING', {
      usagePercentage,
      threshold: settings.storage_warning_threshold
    });
  }
  
  return { allowed: true, usagePercentage };
}
```

### Document Conservation (Auto-Archive)

```typescript
// Scheduled job: Archive old documents
async function processDocumentConservation(): Promise<void> {
  const tenants = await getAllTenants();
  
  for (const tenant of tenants) {
    const settings = await getTenantSettings(tenant.id);
    const cutoffDate = subDays(new Date(), settings.documents_conservation_days);
    
    // Find documents to archive
    const documentsToArchive = await findShards({
      tenantId: tenant.id,
      shardTypeId: 'c_document',
      'structuredData.status': { $nin: ['archived', 'expired'] },
      updatedAt: { $lt: cutoffDate }
    });
    
    for (const doc of documentsToArchive) {
      await updateShard(doc.id, {
        structuredData: { status: 'archived' },
        metadata: {
          archivedReason: 'conservation_policy',
          archivedAt: new Date(),
          conservationDays: settings.documents_conservation_days
        }
      });
    }
  }
}
```

---

## Document Features

### Document Preview

Users can view documents in-browser without downloading.

```typescript
interface DocumentPreview {
  previewUrl: string;              // Rendered preview URL
  previewType: 'pdf' | 'image' | 'office' | 'html';
  pages: PreviewPage[];            // For multi-page docs
  generatedAt: Date;
  expiresAt: Date;
}

interface PreviewPage {
  pageNumber: number;
  thumbnailUrl: string;            // Page thumbnail
  fullUrl: string;                 // Full resolution
  width: number;
  height: number;
}
```

#### Preview Providers

| File Type | Preview Method |
|-----------|----------------|
| PDF | PDF.js renderer |
| Images | Direct display / Image CDN |
| Office (.docx, .xlsx, .pptx) | Office Online Viewer / LibreOffice conversion |
| Text/Code | Syntax-highlighted HTML |
| HTML | Iframe sandbox |

#### API

```http
GET /api/v1/documents/{id}/preview
Authorization: Bearer {token}

Response:
{
  "previewUrl": "https://preview.castiel.app/docs/...",
  "previewType": "pdf",
  "pageCount": 24,
  "expiresAt": "2025-11-29T12:00:00Z"
}
```

---

### Virus/Malware Scanning

**Critical security feature**: All uploads are scanned before processing.

```typescript
interface VirusScanResult {
  scannedAt: Date;
  scanProvider: 'microsoft_defender' | 'clamav' | 'custom';
  status: 'clean' | 'infected' | 'suspicious' | 'scan_failed';
  threats?: string[];
  quarantined: boolean;
  scanDurationMs: number;
}
```

#### Scan Flow

```
Upload → Quarantine Storage → Scan → 
  ├─ Clean → Move to permanent storage → Process
  └─ Infected → Keep in quarantine → Notify admin → Delete after 7 days
```

#### Configuration

```typescript
interface VirusScanConfig {
  enabled: boolean;                    // Default: true
  provider: 'microsoft_defender' | 'clamav';
  scanOnUpload: boolean;               // Scan immediately
  quarantineInfected: boolean;         // Keep infected files
  notifyOnInfection: ('owner' | 'admin' | 'security')[];
  autoDeleteAfterDays: number;         // Delete quarantined files
}
```

---

### DLP (Data Loss Prevention)

Detect and protect sensitive content.

```typescript
interface DLPScanResult {
  scannedAt: Date;
  policies: DLPPolicy[];
  status: 'clean' | 'violation' | 'warning';
  
  findings: DLPFinding[];
  
  action: 'allowed' | 'blocked' | 'quarantined' | 'redacted';
  actionReason?: string;
}

interface DLPFinding {
  policyId: string;
  policyName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dataType: DLPDataType;
  
  matches: {
    type: string;                      // "SSN", "Credit Card", "Email"
    count: number;
    redacted: boolean;
    locations?: {
      page?: number;
      offset?: number;
      length?: number;
    }[];
  }[];
}

enum DLPDataType {
  PII = 'pii',                        // Personal Identifiable Information
  FINANCIAL = 'financial',            // Credit cards, bank accounts
  HEALTH = 'health',                  // PHI (HIPAA)
  CREDENTIALS = 'credentials',        // Passwords, API keys
  LEGAL = 'legal',                    // Legal privileged info
  CUSTOM = 'custom'                   // Tenant-defined patterns
}

interface DLPPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // What to detect
  patterns: {
    type: DLPDataType;
    patterns: string[];               // Regex patterns
    keywords?: string[];              // Keyword triggers
  }[];
  
  // What to do
  action: 'warn' | 'block' | 'quarantine' | 'redact';
  notifyOnViolation: string[];        // User IDs or roles
  
  // Exceptions
  excludeRoles?: string[];            // Roles exempt from policy
  excludeDocumentTypes?: string[];    // Document types exempt
}
```

---

### Full-Text Search

Beyond vector search—exact phrase matching and advanced queries.

```typescript
interface DocumentSearchConfig {
  // Search backend
  backend: 'azure_cognitive_search' | 'elasticsearch';
  indexName: string;
  
  // Indexed fields
  indexedFields: string[];
  
  // Search capabilities
  fullTextSearch: boolean;             // Exact phrase match
  fuzzySearch: boolean;                // Typo tolerance
  wildcardSearch: boolean;             // Pattern matching
  proximitySearch: boolean;            // Words near each other
  facetedSearch: boolean;              // Filter by metadata
  highlightResults: boolean;           // Show matching snippets
}

interface DocumentSearchQuery {
  // Text query
  query: string;
  queryType: 'simple' | 'full' | 'semantic';
  
  // Filters
  filters?: {
    documentType?: string[];
    status?: string[];
    author?: string[];
    dateRange?: { from: Date; to: Date };
    tags?: string[];
    accessLevel?: AccessLevel[];
  };
  
  // Facets to return
  facets?: string[];
  
  // Pagination
  skip?: number;
  limit?: number;
  
  // Options
  highlight?: boolean;
  fuzzy?: boolean;
}

interface DocumentSearchResult {
  results: {
    document: Shard;
    score: number;
    highlights?: {
      field: string;
      snippets: string[];
    }[];
  }[];
  
  facets?: {
    [field: string]: {
      value: string;
      count: number;
    }[];
  };
  
  total: number;
  took: number;                        // Query time in ms
}
```

#### API

```http
POST /api/v1/documents/search
{
  "query": "implementation timeline budget",
  "queryType": "semantic",
  "filters": {
    "documentType": ["proposal", "contract"],
    "dateRange": { "from": "2025-01-01", "to": "2025-12-31" }
  },
  "highlight": true,
  "limit": 20
}
```

---

### Expiry Notifications

Alert before documents expire.

```typescript
interface ExpiryNotificationConfig {
  enabled: boolean;
  notifyDaysBefore: number[];          // [30, 7, 1]
  notifyUsers: ('owner' | 'acl_users' | 'tenant_admins')[];
  
  // Auto-action
  autoAction?: 'archive' | 'delete' | 'extend' | 'none';
  autoExtendDays?: number;
  
  // Notification channels
  channels: ('email' | 'in_app' | 'slack' | 'teams')[];
}

interface ExpiryNotification {
  documentId: string;
  documentName: string;
  expiryDate: Date;
  daysRemaining: number;
  notifiedUsers: string[];
  notifiedAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  action?: 'renewed' | 'archived' | 'deleted' | 'ignored';
}
```

#### Scheduled Job

```typescript
// Run daily
async function processExpiryNotifications(): Promise<void> {
  const tenants = await getAllTenants();
  
  for (const tenant of tenants) {
    const config = await getExpiryNotificationConfig(tenant.id);
    if (!config.enabled) continue;
    
    for (const daysBefore of config.notifyDaysBefore) {
      const targetDate = addDays(new Date(), daysBefore);
      
      const expiringDocs = await findShards({
        tenantId: tenant.id,
        shardTypeId: 'c_document',
        'structuredData.expiryDate': {
          $gte: startOfDay(targetDate),
          $lte: endOfDay(targetDate)
        },
        'structuredData.status': { $nin: ['archived', 'expired'] }
      });
      
      for (const doc of expiringDocs) {
        await sendExpiryNotification(doc, daysBefore, config);
      }
    }
  }
}
```

---

### Document Collections

Virtual groupings beyond relationships.

```typescript
interface DocumentCollection {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'folder' | 'smart_collection';
  icon?: string;
  color?: string;
  
  // For folder: explicit membership
  documentIds?: string[];
  
  // For smart collection: dynamic query
  query?: {
    documentType?: string[];
    status?: string[];
    tags?: string[];
    author?: string[];
    dateRange?: { from: Date; to: Date };
    accessLevel?: AccessLevel[];
    customFilters?: Record<string, any>;
  };
  
  // Auto-update for smart collections
  refreshInterval?: number;            // Seconds
  lastRefreshedAt?: Date;
  cachedCount?: number;
  
  // Permissions (inherit or explicit)
  inheritPermissions: boolean;
  acl?: ACLEntry[];
  
  // Hierarchy
  parentCollectionId?: string;
  childCollectionIds?: string[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Example: Smart Collection

```json
{
  "name": "Active Proposals",
  "type": "smart_collection",
  "query": {
    "documentType": ["proposal"],
    "status": ["draft", "in_review", "approved"],
    "dateRange": { "from": "2025-01-01" }
  },
  "refreshInterval": 300,
  "inheritPermissions": true
}
```

> **Note**: Document Collections could be implemented as a new ShardType `c_documentCollection` to leverage Shard features (versioning, ACL, relationships).

---

### Batch Operations

Bulk operations for multiple documents.

```typescript
interface BatchOperation {
  id: string;
  tenantId: string;
  operation: BatchOperationType;
  documentIds: string[];
  params: Record<string, any>;
  
  // Progress
  status: 'pending' | 'processing' | 'completed' | 'partial_failure' | 'failed';
  progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  };
  
  // Results
  results?: {
    documentId: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }[];
  
  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // User
  createdBy: string;
}

enum BatchOperationType {
  TAG = 'tag',
  UNTAG = 'untag',
  MOVE = 'move',                       // Move to collection
  ARCHIVE = 'archive',
  DELETE = 'delete',
  RESTORE = 'restore',
  SHARE = 'share',
  UPDATE_ACL = 'update_acl',
  UPDATE_METADATA = 'update_metadata',
  REPROCESS = 'reprocess',             // Re-run Document Intelligence
  EXPORT = 'export'
}
```

#### API

```http
# Start batch operation
POST /api/v1/documents/batch
{
  "operation": "tag",
  "documentIds": ["doc-1", "doc-2", "doc-3"],
  "params": {
    "tags": ["q1-2025", "reviewed"]
  }
}

Response:
{
  "batchId": "batch-uuid",
  "status": "processing",
  "progress": { "total": 3, "processed": 0 }
}

# Check status
GET /api/v1/documents/batch/{batchId}

# Cancel batch
DELETE /api/v1/documents/batch/{batchId}
```

---

### Offline Access

Enable document access without internet connectivity.

```typescript
interface OfflineAccessConfig {
  documentId: string;
  userId: string;
  deviceId: string;
  
  // Sync config
  syncedAt: Date;
  syncedVersion: string;               // Document version synced
  expiresAt: Date;
  
  // Security
  encryptedLocally: boolean;
  encryptionKey?: string;              // Device-specific key
  pinProtected: boolean;
  
  // File
  localPath?: string;                  // On-device path
  localFileSize: number;
  
  // Status
  needsSync: boolean;                  // Online version changed
  syncPending: boolean;                // Has local changes
  localChanges?: OfflineChange[];
  
  // Settings
  autoSync: boolean;
  syncOnWifiOnly: boolean;
}

interface OfflineChange {
  changeType: 'annotation' | 'comment' | 'metadata';
  changeData: Record<string, any>;
  changedAt: Date;
  synced: boolean;
  syncedAt?: Date;
}
```

#### Tenant Settings

```typescript
{
  "allow_offline_access": true,
  "max_offline_days": 30,              // Auto-expire offline copies
  "require_pin_for_offline": true,
  "allowed_offline_access_levels": ["public", "internal"]
}
```

---

### Audit Trail

Comprehensive logging of all document activities.

```typescript
interface DocumentAuditLog {
  id: string;
  documentId: string;
  tenantId: string;
  
  // Event
  action: DocumentAuditAction;
  performedBy: string;
  performedAt: Date;
  
  // Context
  ip: string;
  userAgent: string;
  location?: {
    country: string;
    region?: string;
    city?: string;
  };
  deviceId?: string;
  sessionId?: string;
  
  // Details
  details?: {
    previousValue?: any;
    newValue?: any;
    sharedWith?: string[];
    downloadFormat?: string;
    searchQuery?: string;
  };
  
  // Result
  success: boolean;
  errorMessage?: string;
}

enum DocumentAuditAction {
  // View/Access
  VIEW = 'view',
  PREVIEW = 'preview',
  DOWNLOAD = 'download',
  PRINT = 'print',
  
  // Modifications
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',
  ARCHIVE = 'archive',
  
  // Sharing
  SHARE_INTERNAL = 'share_internal',
  
  // Permissions
  ACL_GRANT = 'acl_grant',
  ACL_REVOKE = 'acl_revoke',
  ACL_MODIFY = 'acl_modify',
  
  // Processing
  UPLOAD = 'upload',
  PROCESS = 'process',
  VIRUS_SCAN = 'virus_scan',
  DLP_SCAN = 'dlp_scan',
  
  // Version
  VERSION_CREATE = 'version_create',
  VERSION_RESTORE = 'version_restore'
}
```

#### API

```http
# Get audit trail
GET /api/v1/documents/{id}/audit-trail?limit=100&from=2025-01-01

Response:
{
  "entries": [
    {
      "action": "download",
      "performedBy": "user-uuid",
      "performedByName": "John Smith",
      "performedAt": "2025-11-29T10:30:00Z",
      "ip": "192.168.1.100",
      "location": { "country": "US", "city": "New York" }
    }
  ],
  "total": 47,
  "hasMore": true
}

# Export audit trail
GET /api/v1/documents/{id}/audit-trail/export?format=csv
```

#### Tenant Settings

```typescript
{
  "audit_retention_days": 365,         // How long to keep audit logs
  "audit_detail_level": "full",        // "minimal" | "standard" | "full"
  "audit_pii_masking": true            // Mask user IPs in audit
}
```

---

## Relationships

### Internal Relationships (Typical)

| Relationship Type | Target | Description |
|-------------------|--------|-------------|
| `belongs_to` | `c_project` | Attached to project |
| `belongs_to` | `c_opportunity` | Attached to deal |
| `belongs_to` | `c_company` | Company document |
| `supersedes` | `c_document` | Previous version |
| `references` | Any | Referenced entities |
| `in_collection` | `c_documentCollection` | Collection membership |

### Incoming Relationships

| From | Relationship Type | Description |
|------|-------------------|-------------|
| `c_project` | `has_document` | Project's document |
| `c_opportunity` | `has_document` | Deal's document |
| `c_note` | `references` | Note referencing doc |
| `c_documentCollection` | `contains` | Collection's document |

### External Relationships (Common)

| System Type | System | Description |
|-------------|--------|-------------|
| `storage` | Azure Blob, Google Drive, SharePoint, Dropbox, OneDrive | File storage |
| `crm` | Salesforce Files | CRM attachments |

---

## AI Context Role

### Content Source

`c_document` is the primary content source for AI:

- **Text extraction**: Via Azure Document Intelligence
- **Summarization**: AI generates summaries
- **Entity extraction**: People, companies, dates, amounts
- **Semantic search**: Vector embeddings for similarity
- **Classification**: Document type and category

### AI Enrichment Configuration

```json
{
  "enabled": true,
  "fields": [
    {
      "fieldName": "summary",
      "enrichmentType": "summarize",
      "sourceFields": ["unstructuredData.text"],
      "autoApply": true,
      "prompt": "Summarize this document in 3-5 sentences"
    },
    {
      "fieldName": "keyPhrases",
      "enrichmentType": "extract",
      "sourceFields": ["unstructuredData.text"],
      "autoApply": true
    },
    {
      "fieldName": "entities",
      "enrichmentType": "extract",
      "sourceFields": ["unstructuredData.text"],
      "autoApply": true,
      "prompt": "Extract named entities (people, companies, dates, amounts)"
    }
  ],
  "frequency": "on_create"
}
```

### AI Prompt Fragment

```
Document: {name}
Type: {documentType} | Status: {status}
Version: {version}
Author: {author} | Published: {publishDate}
Word Count: {wordCount} | Pages: {pageCount}

Summary: {enrichment.summary}
Key Phrases: {enrichment.keyPhrases}

Content:
{unstructuredData.text}
```

---

## Examples

### Example: Proposal Document with Full Features

```json
{
  "id": "doc-001-uuid",
  "shardTypeId": "c_document-type-uuid",
  "tenantId": "tenant-123",
  "userId": "user-456",
  
  "structuredData": {
    "name": "Acme Corp Enterprise Proposal v2.1",
    "description": "Comprehensive proposal for enterprise-wide Castiel implementation",
    "documentType": "proposal",
    "status": "approved",
    "version": "2.1",
    "author": "Sales Team",
    "publishDate": "2025-01-15",
    "expiryDate": "2025-04-15",
    "language": "en",
    "mimeType": "application/pdf",
    "fileSize": 2456789,
    "pageCount": 24,
    "wordCount": 8500,
    "isConfidential": true,
    "accessLevel": "confidential",
    "tags": ["proposal", "enterprise", "q1-2025"]
  },
  
  "storage": {
    "provider": "azure",
    "storageId": "blob-id-123",
    "containerOrBucket": "tenant-123-documents",
    "path": "doc-001-uuid/v2.1/acme-proposal.pdf",
    "checksum": "sha256:abc123...",
    "isProcessed": true,
    "processingStatus": "completed",
    "uploadedAt": "2025-01-15T09:00:00Z",
    "uploadedBy": "user-456"
  },
  
  "security": {
    "virusScan": {
      "scannedAt": "2025-01-15T09:01:00Z",
      "scanProvider": "microsoft_defender",
      "status": "clean"
    },
    "dlpScan": {
      "scannedAt": "2025-01-15T09:02:00Z",
      "status": "clean",
      "findings": []
    }
  },
  
  "unstructuredData": {
    "text": "Executive Summary\n\nThis proposal outlines our comprehensive approach...",
    "files": [{
      "id": "file-001",
      "name": "acme-proposal-v2.1.pdf",
      "mimeType": "application/pdf",
      "size": 2456789
    }]
  },
  
  "analysis": {
    "processedAt": "2025-01-15T09:05:00Z",
    "modelId": "prebuilt-layout",
    "pageCount": 24,
    "tables": [
      { "rowCount": 5, "columnCount": 4, "cells": [...] }
    ],
    "keyValuePairs": [
      { "key": "Total Investment", "value": "$500,000", "confidence": 0.95 }
    ],
    "entities": [
      { "type": "organization", "text": "Acme Corporation", "confidence": 0.98 }
    ]
  },
  
  "internal_relationships": [
    {
      "id": "rel-1",
      "targetShardId": "opportunity-uuid",
      "relationshipType": "belongs_to",
      "label": "Enterprise Deal Proposal"
    },
    {
      "id": "rel-2",
      "targetShardId": "doc-prev-uuid",
      "relationshipType": "supersedes",
      "label": "Previous Version (v2.0)"
    }
  ],
  
  "external_relationships": [
    {
      "id": "ext-1",
      "system": "google-drive",
      "systemType": "storage",
      "externalId": "1ABC123def456",
      "externalUrl": "https://drive.google.com/file/d/1ABC123def456",
      "syncStatus": "synced",
      "lastSyncedAt": "2025-01-15T10:00:00Z"
    }
  ],
  
  "acl": [
    {
      "principalType": "user",
      "principalId": "user-789",
      "permissions": ["view", "read", "download"]
    },
    {
      "principalType": "role",
      "principalId": "sales-team",
      "permissions": ["view", "read", "download", "comment"]
    }
  ],
  
  "metadata": {
    "enrichment": {
      "summary": {
        "text": "This proposal presents a 3-phase implementation plan for Castiel platform deployment at Acme Corporation...",
        "keyPoints": [
          "3-phase implementation approach",
          "12-week timeline",
          "$500,000 total investment"
        ]
      }
    }
  },
  
  "status": "active",
  "createdAt": "2025-01-15T00:00:00Z",
  "updatedAt": "2025-01-20T10:30:00Z"
}
```

---

## Best Practices

### Upload & Processing
1. **Enable virus scanning**: Always scan uploads before processing
2. **Extract text**: Ensure Azure Document Intelligence runs on upload
3. **Generate thumbnails**: Create previews for quick browsing

### Security
4. **Set access levels**: Use appropriate `accessLevel` for sensitivity
5. **Configure ACL**: Grant minimum required permissions
6. **Use DLP**: Detect sensitive data before it spreads

### Organization
7. **Version properly**: Use version field and `supersedes` relationship
8. **Set expiry**: Add expiry dates for time-sensitive documents
9. **Tag consistently**: Use tags for organization
10. **Link appropriately**: Connect to projects, opportunities, etc.

### Compliance
11. **Configure retention**: Set `documents_conservation_days` per requirements
12. **Enable audit logging**: Keep comprehensive audit trail
13. **Track access**: Review audit logs regularly
14. **Review DLP findings**: Address violations promptly

---

## Feature Priority Matrix

| Feature | Priority | Status | Phase |
|---------|----------|--------|-------|
| Virus Scanning | 🔴 Critical | Planned | 1 |
| Document Preview | 🔴 High | Planned | 1 |
| Full-Text Search | 🔴 High | Planned | 1 |
| Audit Trail | 🔴 High | Planned | 1 |
| Expiry Notifications | 🟡 Medium | Planned | 2 |
| Batch Operations | 🟡 Medium | Planned | 2 |
| DLP | 🟡 Medium | Planned | 2 |
| Document Collections | 🟢 Lower | Planned | 3 |
| Offline Access | 🟢 Lower | Planned | 3 |

---

**Last Updated**: November 2025  
**Version**: 2.0.0  
**Maintainer**: Castiel Development Team
