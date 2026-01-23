# c_documentChunk - Document Chunk ShardType

## Overview

The `c_documentChunk` ShardType represents atomic chunks of document content with semantic embeddings. Each chunk is a discrete portion of a parent document, enriched with vector embeddings for semantic search and AI-powered context retrieval. Document chunks are strictly dependent on their parent documents—when a document is deleted, all associated chunks are automatically cascaded.

> **Purpose**: Enable granular, vector-searchable segments of documents for improved context assembly and semantic similarity matching in AI workflows.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Schema Definition](#schema-definition)
3. [Chunk Lifecycle](#chunk-lifecycle)
4. [Relationships](#relationships)
5. [Vector Embeddings](#vector-embeddings)
6. [Cascade Delete Behavior](#cascade-delete-behavior)
7. [Examples](#examples)
8. [Best Practices](#best-practices)

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_documentChunk` |
| **Display Name** | Document Chunk |
| **Category** | DOCUMENT |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `BookOpen` |
| **Color** | `#6366f1` (Indigo) |
| **Partition Key** | `/tenantId` |
| **Parent Relationship** | `c_document` (Required) |
| **Cascade Delete** | Yes |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Chunk identifier/title (e.g., "Chapter 2 - Section 3") |
| `documentId` | string | **Yes** | Parent document shard ID |
| `documentName` | string | **Yes** | Parent document name (denormalized for display) |
| `content` | string | **Yes** | Raw text content of the chunk |
| `contentLength` | number | **Yes** | Length of content in characters |
| `contentHash` | string | **Yes** | SHA-256 hash of content for deduplication |
| `chunkSequence` | number | **Yes** | Sequential order within document (1-based) |
| `chunkSize` | number | **Yes** | Target chunk size in tokens (e.g., 512, 1024) |
| `language` | string | No | Detected language code (ISO 639-1) |
| `startOffset` | number | **Yes** | Character offset in original document |
| `endOffset` | number | **Yes** | Character offset in original document |
| `pageNumber` | number | No | Original page number (for PDFs, etc.) |
| `sectionTitle` | string | No | Section/heading from source document |
| `metadata` | object | No | Custom metadata (e.g., source type, context) |
| `embeddingModel` | string | No | Model used for embeddings (e.g., "text-embedding-3-small") |
| `embeddingStatus` | enum | **Yes** | Status of embedding generation |
| `embeddingTimestamp` | date | No | When embeddings were generated |
| `embeddingDimensions` | number | No | Vector dimensions (e.g., 1536) |
| `tags` | string[] | **Yes** | Custom tags (default: []) |
| `createdBy` | string | **Yes** | Creator user ID |
| `createdAt` | date | **Yes** | Creation timestamp |
| `deletedBy` | string | No | Deleter user ID (soft delete) |
| `deletedAt` | date | No | Deletion timestamp (soft delete) |

### Field Details

#### `documentId`
- **Required**: Must reference a valid `c_document` shard
- **Immutable**: Cannot be changed after creation
- **Validation**: Document must exist and belong to same tenant
- **Cascade**: When parent document is deleted, all chunks are deleted

#### `content`
- **Required**: Non-empty text content
- **Constraints**: Should respect chunk size limits (typically 512-2048 tokens)
- **Processing**: May be extracted from various document formats (PDF, DOCX, etc.)
- **Immutable**: Content should not be modified; create new chunk instead

#### `contentHash`
- **Algorithm**: SHA-256
- **Purpose**: Deduplication and integrity verification
- **Immutable**: Computed at creation time
- **Usage**: Detect duplicate chunks during re-chunking

#### `chunkSequence`
- **Purpose**: Preserve order within document
- **Type**: 1-based integer index
- **Usage**: Enable ordered retrieval of chunks
- **Immutable**: Set at creation, reflects original document order

#### `embeddingStatus`
```typescript
enum EmbeddingStatus {
  PENDING = 'pending',       // Awaiting embedding generation
  PROCESSING = 'processing', // Currently generating embeddings
  COMPLETE = 'complete',     // Embeddings successfully generated
  FAILED = 'failed',         // Embedding generation failed
  DEPRECATED = 'deprecated'  // Embeddings stale, needs regeneration
}
```

#### `metadata`
```typescript
interface ChunkMetadata {
  sourceFormat?: string;     // Original format (pdf, docx, txt, etc.)
  extractionMethod?: string; // How chunk was extracted
  confidence?: number;       // Extraction confidence (0-1)
  isHeader?: boolean;        // Whether chunk is a header/title
  isList?: boolean;          // Whether chunk is list content
  customField?: any;         // User-defined metadata
}
```

### unstructuredData Fields

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Extracted or raw text content |
| `rawMetadata` | object | Raw extraction metadata (format, confidence, etc.) |
| `processingLog` | string | Processing steps and notes |

**Note**: Vector embeddings are stored in the base schema's `vectors` field (see [Vector Embeddings](#vector-embeddings) section).

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_documentChunk.json",
  "title": "Document Chunk",
  "description": "Chunked and embedded segment of a document",
  "type": "object",
  "required": [
    "name",
    "documentId",
    "documentName",
    "content",
    "contentLength",
    "contentHash",
    "chunkSequence",
    "chunkSize",
    "startOffset",
    "endOffset",
    "embeddingStatus",
    "tags",
    "createdBy",
    "createdAt"
  ],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Chunk identifier or title"
    },
    "documentId": {
      "type": "string",
      "pattern": "^[a-f0-9-]{36}$",
      "description": "Parent document shard ID (UUID)"
    },
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Parent document name (denormalized)"
    },
    "content": {
      "type": "string",
      "minLength": 1,
      "description": "Raw text content of chunk"
    },
    "contentLength": {
      "type": "integer",
      "minimum": 1,
      "description": "Character count of content"
    },
    "contentHash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "description": "SHA-256 hash of content"
    },
    "chunkSequence": {
      "type": "integer",
      "minimum": 1,
      "description": "Sequential order within document"
    },
    "chunkSize": {
      "type": "integer",
      "minimum": 100,
      "maximum": 4096,
      "description": "Target chunk size in tokens"
    },
    "language": {
      "type": "string",
      "pattern": "^[a-z]{2}(-[A-Z]{2})?$",
      "description": "ISO 639-1 language code"
    },
    "startOffset": {
      "type": "integer",
      "minimum": 0,
      "description": "Character offset in original document"
    },
    "endOffset": {
      "type": "integer",
      "minimum": 0,
      "description": "Character offset in original document"
    },
    "pageNumber": {
      "type": "integer",
      "minimum": 1,
      "description": "Original page number (for PDFs)"
    },
    "sectionTitle": {
      "type": "string",
      "maxLength": 500,
      "description": "Section heading or title from source"
    },
    "metadata": {
      "type": "object",
      "additionalProperties": true,
      "description": "Custom metadata"
    },
    "embeddingModel": {
      "type": "string",
      "description": "Model used for embeddings"
    },
    "embeddingStatus": {
      "type": "string",
      "enum": ["pending", "processing", "complete", "failed", "deprecated"],
      "default": "pending",
      "description": "Status of embedding generation"
    },
    "embeddingTimestamp": {
      "type": "string",
      "format": "date-time",
      "description": "When embeddings were generated"
    },
    "embeddingDimensions": {
      "type": "integer",
      "minimum": 1,
      "description": "Vector embedding dimensions"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string", "maxLength": 50 },
      "default": [],
      "description": "Custom tags"
    },
    "createdBy": {
      "type": "string",
      "pattern": "^[a-f0-9-]{36}$",
      "description": "Creator user ID"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "Creation timestamp"
    },
    "deletedBy": {
      "type": "string",
      "pattern": "^[a-f0-9-]{36}$",
      "description": "Deleter user ID (soft delete)"
    },
    "deletedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Deletion timestamp (soft delete)"
    }
  }
}
```

---

## Chunk Lifecycle

### Creation Phase

1. **Document Upload**: User uploads document to `c_document`
2. **Extraction**: Document content extracted (Phase 2: automatic; Phase 1: manual)
3. **Chunking**: Content split into semantic chunks (default: 512-token chunks with 50-token overlap)
4. **Hashing**: SHA-256 hash computed for deduplication
5. **Chunk Creation**: `c_documentChunk` shards created with `embeddingStatus = 'pending'`

### Embedding Phase

1. **Queued**: Chunks queued for embedding generation
2. **Processing**: Embeddings generated using configured model
3. **Stored**: Vector embeddings stored in `unstructuredData.embedding`
4. **Status Update**: `embeddingStatus = 'complete'`

### Active Phase

- Chunks available for semantic search
- Used in context assembly for AI queries
- Searchable via vector and text similarity

### Deprecation Phase

- **Trigger**: Document updated/re-chunked, or embedding model changes
- **Status**: `embeddingStatus = 'deprecated'`
- **Action**: Old chunks retained for history; new chunks created
- **Cleanup**: Optional background job to clean deprecated chunks

### Deletion Phase

- **Direct**: User explicitly deletes a chunk (soft delete)
- **Cascade**: Parent document deleted → all chunks deleted
- **Soft Delete**: `deletedAt` and `deletedBy` set; status = 'deleted'

---

## Relationships

### Internal Relationships

#### Parent Document (Required)

```typescript
internal_relationships: [
  {
    id: "rel-parent-uuid",
    targetShardId: "document-uuid",        // Parent document ID
    targetShardTypeId: "c_document",
    relationshipType: "chunk_of",          // Semantic relationship type
    label: "Parent Document",
    metadata: {
      isRequired: true,                    // Critical for cascade delete
      cascadeDelete: true,                 // Delete chunk when parent deleted
      chunkOrder: 1                        // Preserve order information
    },
    createdAt: "2025-01-15T10:00:00Z",
    createdBy: "system"
  }
]
```

**Validation Rules:**
- `targetShardId` must reference a valid `c_document`
- Must be in same tenant as chunk
- Cannot be changed after creation (immutable)
- Exactly one parent relationship per chunk

### Why `documentId` AND Internal Relationship?

- **Denormalized `documentId`**: Quick parent lookup without relationship traversal
- **Internal Relationship**: Formalizes the semantic link for AI and knowledge graph queries
- **Cascade Information**: Metadata contains cascade delete configuration

---

## Vector Embeddings

### Embedding Storage (Base Schema Compliance)

Vector embeddings are stored using the base schema's `vectors` field, which is an array of `VectorEmbedding` objects:

```typescript
// From base schema
vectors?: VectorEmbedding[];

interface VectorEmbedding {
  id: string;                          // Embedding ID (UUID)
  field: string;                       // Source field (e.g., "content", "name")
  model: string;                       // Model used (e.g., "text-embedding-3-small")
  dimensions: number;                  // Vector dimensions (e.g., 1536)
  embedding: number[];                 // The actual vector
  createdAt: Date;                     // When generated
}
```

### Example: Document Chunk with Embeddings

```typescript
{
  id: "chunk-001-uuid",
  tenantId: "tenant-xyz",
  shardTypeId: "c_documentChunk",
  
  // ... other fields ...
  
  // Vector embeddings per base schema
  vectors: [
    {
      id: "vec-001-uuid",
      field: "content",                        // Embedding of chunk content
      model: "text-embedding-3-small",
      dimensions: 1536,
      embedding: [0.123, -0.456, 0.789, ...],  // Dense vector
      createdAt: "2025-01-15T10:05:00Z"
    },
    {
      id: "vec-002-uuid",
      field: "name",                           // Embedding of chunk title
      model: "text-embedding-3-small",
      dimensions: 1536,
      embedding: [0.234, 0.567, -0.890, ...],
      createdAt: "2025-01-15T10:05:00Z"
    }
  ],
  
  // AI enrichment data
  enrichment?: {
    config: {
      enabled: true,
      providers: ["azure-openai"],
      autoEnrich: true,
      enrichmentTypes: ["summary", "keywords", "sentiment"]
    },
    lastEnrichedAt: "2025-01-15T10:10:00Z",
    enrichmentData: {
      summary: "Executive overview of the proposal...",
      keywords: ["proposal", "sales", "implementation"],
      sentiment: "positive"
    }
  },
  
  // Unstructured data
  unstructuredData: {
    text: "This proposal outlines our comprehensive solution...",
    rawMetadata: {
      extractionMethod: "pypdf",
      extractionConfidence: 0.98,
      sourceFormat: "pdf"
    }
  }
}
```

### Supported Embedding Models

**Embedding Models:**
- `text-embedding-3-small` (1536 dimensions) - Default for cost-efficient semantic search
- `text-embedding-3-large` (3072 dimensions) - High-accuracy embeddings for critical use cases
- `text-embedding-ada-002` (1536 dimensions) - Legacy model (supported for backwards compatibility)

### Embedding Status (structuredData Field)

The `embeddingStatus` field in `structuredData` tracks the lifecycle of embedding generation:

```typescript
enum EmbeddingStatus {
  PENDING = 'pending',           // Awaiting embedding generation
  PROCESSING = 'processing',     // Currently generating embeddings
  COMPLETE = 'complete',         // Embeddings successfully generated
  FAILED = 'failed',             // Embedding generation failed
  DEPRECATED = 'deprecated'      // Embeddings stale (model changed, re-chunking)
}
```

### Embedding Lifecycle

```
Creation
   |
   ├──→ PENDING (embeddingStatus field in structuredData)
   |   └──→ vectors array is empty or absent
   |
   ▼
PROCESSING
   └──→ vectors field being populated from embedding API
   |
   ▼
COMPLETE
   └──→ vectors field populated with VectorEmbedding objects
   └──→ Ready for semantic search
   |
   ├──→ error
   |   ▼
   |  FAILED (retryable)
   |   |
   |   └──→ Return to PENDING for retry
   |
   └──→ model change / re-chunking
       ▼
       DEPRECATED
       |
       └──→ New vectors field generated with new model
           └──→ Status returns to PROCESSING → COMPLETE
           └──→ Old vectors retained for history (optional)
```

### Enrichment Data (Base Schema Compliance)

Document chunks can leverage the base schema's `enrichment` field for AI-powered insights:

```typescript
// From base schema
enrichment?: Enrichment;
lastEnrichedAt?: Date;

interface Enrichment {
  config: EnrichmentConfig;
  lastEnrichedAt?: Date;
  enrichmentData?: Record<string, any>;
  error?: string;
}

interface EnrichmentConfig {
  enabled: boolean;
  providers?: string[];                    // e.g., ['azure-openai']
  autoEnrich?: boolean;                    // Enrich on create/update
  enrichmentTypes?: string[];              // e.g., ['summary', 'keywords', 'sentiment']
}
```

**Example Enrichment Data for Chunks:**
```json
{
  "enrichment": {
    "config": {
      "enabled": true,
      "providers": ["azure-openai"],
      "autoEnrich": true,
      "enrichmentTypes": ["summary", "keywords", "sentiment", "entities"]
    },
    "lastEnrichedAt": "2025-01-15T10:10:00Z",
    "enrichmentData": {
      "summary": "Executive overview of sales proposal including pricing and implementation timeline",
      "keywords": ["proposal", "sales", "pricing", "implementation", "timeline"],
      "sentiment": "positive",
      "entities": [
        { "type": "ORGANIZATION", "value": "Acme Corp" },
        { "type": "PERSON", "value": "John Smith" },
        { "type": "MONEY", "value": "$500K" }
      ]
    }
  }
}
```

### Bulk Embedding Operations

**Use Cases:**
- Initial chunking: Generate embeddings for new document chunks
- Model migration: Re-embed chunks with new model
- Cost optimization: Batch embedding generation

**API:**
```
POST /api/embeddings/bulk
{
  "chunkIds": ["chunk-1", "chunk-2", ...],
  "model": "text-embedding-3-small"
}

Response:
{
  "jobId": "job-uuid",
  "status": "queued",
  "chunkCount": 100,
  "estimatedCompletionTime": "2025-01-15T10:30:00Z"
}
```

---

## Cascade Delete Behavior

### Overview

Cascade delete ensures **referential integrity**:

> **Principle**: When a `c_document` is deleted, ALL associated `c_documentChunk` shards are automatically deleted.

### Implementation Strategy

#### Hard Delete Path

1. **Trigger**: Document hard delete requested
2. **Query**: Find all chunks with `documentId = deleted_document_id`
3. **Delete**: Hard delete all matching chunks
4. **Verify**: Confirm all chunks removed
5. **Log**: Audit log cascade delete event

```typescript
// Pseudocode
async function hardDeleteDocument(documentId: string, tenantId: string) {
  // Find parent document
  const document = await documentRepo.findById(documentId, tenantId);
  
  // Find all associated chunks
  const chunks = await chunkRepo.findByDocumentId(documentId, tenantId);
  
  // Delete all chunks first (cascade)
  for (const chunk of chunks) {
    await chunkRepo.hardDelete(chunk.id, tenantId);
    auditLog.record({
      action: 'CHUNK_DELETED',
      reason: 'CASCADE_FROM_DOCUMENT',
      chunkId: chunk.id,
      parentDocumentId: documentId
    });
  }
  
  // Then delete document
  await documentRepo.hardDelete(documentId, tenantId);
  
  return {
    documentDeleted: 1,
    chunksDeleted: chunks.length
  };
}
```

#### Soft Delete Path

1. **Trigger**: Document soft delete requested
2. **Mark Document**: Set `deletedAt`, `deletedBy` on document
3. **Mark Chunks**: Set `deletedAt`, `deletedBy` on all associated chunks
4. **Query Filter**: Soft-deleted chunks excluded from search/AI operations

```typescript
// Pseudocode
async function softDeleteDocument(documentId: string, tenantId: string, userId: string) {
  const now = new Date();
  
  // Soft delete all chunks
  await chunkRepo.updateMany(
    { documentId, tenantId },
    {
      deletedAt: now,
      deletedBy: userId,
      status: 'deleted'
    }
  );
  
  // Soft delete document
  await documentRepo.update(documentId, tenantId, {
    deletedAt: now,
    deletedBy: userId,
    status: 'deleted'
  });
}
```

### Orphan Prevention

**Constraint**: Chunks cannot exist without a parent document.

- **Validation**: All reads/writes validate parent document exists
- **Cleanup Job**: Background job detects and cleans orphaned chunks
- **Monitoring**: Alert on orphaned chunk detection

### Cascade Monitoring & Auditing

**Audit Trail:**
```json
{
  "event": "CASCADE_DELETE",
  "timestamp": "2025-01-15T14:30:00Z",
  "userId": "user-123",
  "parentShardId": "document-xyz",
  "parentShardType": "c_document",
  "cascadeTargets": [
    {
      "shardId": "chunk-001",
      "shardType": "c_documentChunk",
      "reason": "PARENT_DELETED"
    },
    {
      "shardId": "chunk-002",
      "shardType": "c_documentChunk",
      "reason": "PARENT_DELETED"
    }
  ],
  "totalDeleted": 2,
  "deletionType": "hard|soft"
}
```

---

## Examples

### Example 1: Full Document Chunk Set

**Scenario**: PDF proposal chunked into 5 parts

```json
{
  "id": "chunk-001-uuid",
  "tenantId": "tenant-xyz",
  "userId": "user-123",
  "shardTypeId": "c_documentChunk",
  "parentShardId": "document-abc123",
  "structuredData": {
    "name": "Executive Summary",
    "documentId": "document-abc123",
    "documentName": "Q1 2025 Sales Proposal.pdf",
    "content": "This proposal outlines our comprehensive solution for enterprise data management...",
    "contentLength": 1245,
    "contentHash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f",
    "chunkSequence": 1,
    "chunkSize": 512,
    "language": "en",
    "startOffset": 0,
    "endOffset": 1245,
    "pageNumber": 1,
    "sectionTitle": "Executive Summary",
    "metadata": {
      "sourceFormat": "pdf",
      "extractionMethod": "pypdf",
      "confidence": 0.98,
      "isHeader": false,
      "isList": false
    },
    "embeddingModel": "text-embedding-3-small",
    "embeddingStatus": "complete",
    "embeddingTimestamp": "2025-01-15T10:05:00Z",
    "embeddingDimensions": 1536,
    "tags": ["proposal", "sales", "q1-2025"],
    "createdBy": "user-123",
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "unstructuredData": {
    "embedding": [0.123, -0.456, 0.789, ...],  // 1536-dimensional vector
    "rawMetadata": {
      "generationModel": "text-embedding-3-small",
      "generationTime": "2025-01-15T10:05:00Z",
      "tokenCount": 287
    }
  },
  "internal_relationships": [
    {
      "id": "rel-parent-uuid",
      "targetShardId": "document-abc123",
      "targetShardTypeId": "c_document",
      "relationshipType": "chunk_of",
      "label": "Parent Document",
      "metadata": {
        "isRequired": true,
        "cascadeDelete": true,
        "chunkOrder": 1
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "system"
    }
  ],
  "acl": [
    {
      "userId": "user-123",
      "permissions": ["read", "write", "delete"],
      "grantedBy": "system",
      "grantedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "status": "active",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:05:00Z"
}
```

### Example 2: Chunk with Pending Embeddings

```json
{
  "id": "chunk-002-uuid",
  "tenantId": "tenant-xyz",
  "userId": "user-123",
  "shardTypeId": "c_documentChunk",
  "parentShardId": "document-abc123",
  "structuredData": {
    "name": "Implementation Timeline - Section 2",
    "documentId": "document-abc123",
    "documentName": "Q1 2025 Sales Proposal.pdf",
    "content": "Phase 1: Requirements gathering (Weeks 1-2)...",
    "contentLength": 892,
    "contentHash": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    "chunkSequence": 2,
    "chunkSize": 512,
    "language": "en",
    "startOffset": 1246,
    "endOffset": 2138,
    "pageNumber": 2,
    "sectionTitle": "Implementation Timeline",
    "metadata": {
      "sourceFormat": "pdf",
      "extractionMethod": "pypdf",
      "confidence": 0.97,
      "isHeader": false,
      "isList": true
    },
    "embeddingStatus": "pending",
    "tags": ["proposal", "sales", "q1-2025", "timeline"],
    "createdBy": "user-123",
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "unstructuredData": {
    "rawMetadata": {
      "queuedAt": "2025-01-15T10:01:00Z",
      "retries": 0
    }
  },
  "internal_relationships": [
    {
      "id": "rel-parent-uuid-2",
      "targetShardId": "document-abc123",
      "targetShardTypeId": "c_document",
      "relationshipType": "chunk_of",
      "label": "Parent Document",
      "metadata": {
        "isRequired": true,
        "cascadeDelete": true,
        "chunkOrder": 2
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "system"
    }
  ],
  "status": "active",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

### Example 3: Deleted Chunk (Cascade Delete)

```json
{
  "id": "chunk-003-uuid",
  "tenantId": "tenant-xyz",
  "userId": "user-123",
  "shardTypeId": "c_documentChunk",
  "parentShardId": "document-abc123",
  "structuredData": {
    "name": "Pricing & Investment",
    "documentId": "document-abc123",
    "documentName": "Q1 2025 Sales Proposal.pdf",
    "content": "Our pricing model offers flexibility...",
    "contentLength": 1102,
    "contentHash": "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3",
    "chunkSequence": 3,
    "chunkSize": 512,
    "embeddingStatus": "complete",
    "tags": ["proposal", "sales", "pricing"],
    "createdBy": "user-123",
    "createdAt": "2025-01-15T10:00:00Z",
    "deletedBy": "system",
    "deletedAt": "2025-01-16T09:30:00Z"
  },
  "status": "deleted",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-16T09:30:00Z",
  "deletionReason": "Parent document deleted"
}
```

---

## Best Practices

### Chunk Creation

1. **Optimal Chunk Size**
   - Use 512-token chunks for most use cases
   - 256-token chunks for high-recall similarity search
   - 1024-token chunks for context preservation
   - Overlap 50 tokens to maintain context at boundaries

2. **Meaningful Names**
   - Use section titles when available
   - Example: "Chapter 3 - Data Architecture" vs "Chunk 1"
   - Aids in understanding during search results

3. **Metadata Enrichment**
   - Include source format, extraction method
   - Add confidence scores
   - Mark special content types (lists, headers, tables)

### Embedding Management

1. **Batch Operations**
   - Group 100+ chunks for embedding generation
   - Reduces API costs and improves throughput
   - Monitor batch job progress

2. **Model Selection**
   - `text-embedding-3-small` (1536 dims): Default for most uses
   - `text-embedding-3-large` (3072 dims): High-accuracy use cases
   - Balance cost vs. quality per use case

3. **Deprecation Handling**
   - Plan model upgrades in advance
   - Batch re-embed during off-peak hours
   - Keep old embeddings until new ones complete

### Cascade Delete Safety

1. **Validation**
   - Always validate parent document exists before chunk creation
   - Prevent orphaned chunks via database constraints

2. **Monitoring**
   - Monitor cascade delete events
   - Alert on bulk chunk deletions
   - Track deletion patterns for compliance

3. **Testing**
   - Test cascade delete with realistic data volumes
   - Verify audit trails are complete
   - Validate performance with large chunk sets

### Search Optimization

1. **Vector Search**
   - Use embeddings for semantic similarity
   - Combine with text search for best results
   - Implement hybrid search (vector + BM25)

2. **Filtering**
   - Filter by `embeddingStatus = 'complete'` for search
   - Exclude `status = 'deleted'` chunks
   - Use `chunkSequence` for ordered results

3. **Context Assembly**
   - Retrieve top-k semantically similar chunks
   - Preserve chunk order for document flow
   - Include parent document context

---

## Related Documentation

- **[c_document](./c_document.md)** - Parent document specification
- **[Relationships](../relationships.md)** - Shard relationship patterns
- **[Base Schema](../base-schema.md)** - Universal shard structure
- **[Field Types](../field-types.md)** - Field validation and configuration
