# Document Chunk (c_documentChunk) - Implementation Overview

**Document Date**: December 15, 2025  
**Status**: Documentation Complete  
**Phase**: Design & Specification

---

## Executive Summary

The `c_documentChunk` ShardType is a new core data model for storing semantically-chunked document content with vector embeddings. This enables:

✅ **Granular content retrieval** - Get specific document sections relevant to queries  
✅ **Semantic search** - Find similar content via vector embeddings  
✅ **Scalable AI context** - Efficiently assemble context from large documents  
✅ **Referential integrity** - Automatic cascade delete when parent documents are deleted  

---

## Key Design Principles

### 1. **Parent Dependency**
- Every chunk **must** belong to exactly one parent document (`c_document`)
- Immutable parent relationship - cannot be changed after creation
- Enforced via `documentId` field + internal relationship

### 2. **Cascade Delete**
- When a document is deleted, all associated chunks are automatically deleted
- Preserves referential integrity
- Both hard delete and soft delete supported
- Audited for compliance

### 3. **Vector-First**
- Every chunk has an embedding (vector representation)
- Embeddings enable semantic similarity search
- Flexible embedding model support (OpenAI, Ollama, etc.)
- Batch embedding generation for efficiency

### 4. **Immutable Content**
- Chunk content cannot be modified after creation
- Ensures consistency for embeddings
- Promotes versioning: new chunks for new versions

---

## Core Fields

### Structural Fields
```
name              - Chunk identifier/title (e.g., "Section 3: Data Model")
documentId        - Parent document reference (immutable)
documentName      - Parent name (denormalized)
content           - The actual text content
contentLength     - Character count
contentHash       - SHA-256 for deduplication
```

### Sequence Fields
```
chunkSequence     - Order within document (1-based)
chunkSize         - Target size in tokens (default: 512)
startOffset       - Character position in original
endOffset         - Character position in original
pageNumber        - For PDFs, original page
sectionTitle      - Heading/section name from source
```

### Embedding Fields
```
embeddingModel         - Model used (text-embedding-3-small, etc.)
embeddingStatus        - pending | processing | complete | failed | deprecated
embeddingTimestamp     - When embeddings were generated
embeddingDimensions    - Vector size (e.g., 1536)
```

### Metadata
```
language          - ISO 639-1 language code
metadata          - Custom JSON (extraction method, confidence, etc.)
tags              - User-defined tags
```

---

## Embedding Status Lifecycle

```
Creation
   │
   ├─► PENDING ──────────────┐
   │                         │
   │                    PROCESSING ──┐
   │                         │       │
   │                      COMPLETE   │
   │                         │       │
   │                    (DEPRECATED) │
   │                                 │
   └─────────────────────► FAILED ◄──┘
                            │
                        (retry)
```

**Status Details:**
- `pending` - Queued for embedding generation
- `processing` - Currently generating embeddings  
- `complete` - Ready for semantic search
- `failed` - Embedding generation error (retryable)
- `deprecated` - Old version, no longer used (after re-chunking)

---

## Cascade Delete Architecture

### Scenario: User Deletes Document

```
User Action: DELETE /documents/{documentId}
       │
       ▼
┌─────────────────────────────────────┐
│ Hard or Soft Delete?                │
└─────────────────────────────────────┘
       │
       ├─ HARD DELETE ──────┐
       │                    │
       │            ┌───────▼────────┐
       │            │ Find all chunks│
       │            │ with this docId│
       │            └───────┬────────┘
       │                    │
       │            ┌───────▼────────┐
       │            │ Delete chunks  │
       │            │ in batches     │
       │            └───────┬────────┘
       │                    │
       │            ┌───────▼────────┐
       │            │ Delete document│
       │            └───────┬────────┘
       │                    │
       │            ┌───────▼────────┐
       │            │ Audit log all  │
       │            │ cascade events │
       │            └────────────────┘
       │
       └─ SOFT DELETE ──────┐
                            │
                    ┌───────▼────────┐
                    │Set deletedAt & │
                    │deletedBy on    │
                    │all chunks      │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │Mark as deleted │
                    │Hide from search│
                    └────────────────┘
```

### Implementation Details

**Hard Delete (Permanent Removal):**
```typescript
// 1. Query for all chunks
const chunks = await chunkRepo.findByDocumentId(docId, tenantId);

// 2. Delete chunks
for (const chunk of chunks) {
  await chunkRepo.hardDelete(chunk.id);
}

// 3. Delete document
await documentRepo.hardDelete(docId);

// 4. Audit log
auditLog.record({
  action: 'CASCADE_DELETE',
  parentId: docId,
  cascadeCount: chunks.length
});
```

**Soft Delete (Logical Deletion):**
```typescript
// 1. Update chunks
await chunkRepo.updateMany(
  { documentId: docId },
  { deletedAt: now, deletedBy: userId, status: 'deleted' }
);

// 2. Update document
await documentRepo.update(docId, {
  deletedAt: now,
  deletedBy: userId,
  status: 'deleted'
});

// 3. Query filter soft-deleted chunks from searches
SELECT * FROM chunks WHERE status != 'deleted'
```

### Orphan Detection

**Background Job:**
- Scans for chunks without valid parent documents
- Alerts on detection
- Optional automatic cleanup

**Prevention:**
- Database constraints on `documentId` foreign key
- Validation before chunk creation
- Referential integrity checks

---

## Relationships

### Internal Relationships

**Parent Document Link:**
```json
{
  "id": "rel-xxx",
  "targetShardId": "document-uuid",
  "targetShardTypeId": "c_document",
  "relationshipType": "chunk_of",
  "label": "Parent Document",
  "metadata": {
    "isRequired": true,
    "cascadeDelete": true,
    "chunkOrder": 1
  }
}
```

**Why Both Fields?**
- `documentId` (denormalized) - Quick parent lookup
- `internal_relationships` - Formalizes link for knowledge graph
- `cascadeDelete` metadata - Configuration for deletion behavior

---

## Use Cases

### 1. Document Search & Discovery
```
User Query: "data governance policies"
     │
     ▼
[Semantic Search via Embeddings]
     │
     ├─► Chunk 5 (Policy Section 1) - similarity: 0.92
     ├─► Chunk 12 (Policy Section 2) - similarity: 0.88
     └─► Chunk 3 (Overview) - similarity: 0.81
     │
     ▼
[Display with Parent Document Context]
     │
     ├─ Document: "Governance Framework v2.1"
     │  └─ Related Chunks: 3 matches
     └─ Navigate to source or read in context
```

### 2. AI Context Assembly
```
AI Request: "Summarize Project Alpha's documentation"
     │
     ▼
[Find c_project with name="Project Alpha"]
     │
     ▼
[Get related c_documents]
     │
     ▼
[Find top-k c_documentChunks by semantic relevance]
     │
     ├─► Chunk 1: "Project Goals" (top relevant)
     ├─► Chunk 5: "Architecture Overview" 
     ├─► Chunk 12: "Implementation Timeline"
     └─► Chunk 8: "Success Criteria"
     │
     ▼
[Assemble context → Send to LLM → Generate summary]
```

### 3. Compliance & Deletion
```
Legal Request: "Delete all data for Company XYZ"
     │
     ▼
[Find all documents linked to Company XYZ]
     │
     ├─► Document A (5 chunks)
     ├─► Document B (12 chunks)
     └─► Document C (3 chunks)
     │
     ▼
[CASCADE: Delete all 20 chunks + 3 documents]
     │
     ▼
[Audit Trail: 23 cascaded deletions]
```

---

## API Operations

### Create Chunks (Batch)
```
POST /api/chunks/batch
{
  "documentId": "doc-123",
  "chunks": [
    {
      "name": "Section 1",
      "content": "...",
      "chunkSequence": 1,
      "startOffset": 0,
      "endOffset": 1234
    },
    {
      "name": "Section 2",
      "content": "...",
      "chunkSequence": 2,
      "startOffset": 1235,
      "endOffset": 2468
    }
  ]
}
```

### Generate Embeddings
```
POST /api/embeddings/generate
{
  "chunkIds": ["chunk-1", "chunk-2", ...],
  "model": "text-embedding-3-small"
}
```

### Semantic Search
```
POST /api/chunks/search
{
  "query": "data governance",
  "topK": 10,
  "minSimilarity": 0.7,
  "documentId": "doc-123" (optional filter)
}
```

### Delete Document (Cascade)
```
DELETE /api/documents/{documentId}
→ Automatically cascades to all related chunks
→ Returns: { documentsDeleted: 1, chunksDeleted: 12 }
```

---

## Documentation Files

### Main Documentation
- **[c_documentChunk.md](./docs/shards/core-types/c_documentChunk.md)** - Complete specification

### Related Documentation
- **[c_document.md](./docs/shards/core-types/c_document.md)** - Parent type specification
- **[relationships.md](./docs/shards/relationships.md)** - Relationship patterns
- **[base-schema.md](./docs/shards/base-schema.md)** - Universal shard structure

### Updated Index Files
- **[README.md](./docs/shards/README.md)** - Updated core types table
- **[core-types/README.md](./docs/shards/core-types/README.md)** - Updated type listing

---

## Implementation Phases

### Phase 1: Core Structure (Current)
- ✅ Schema definition
- ✅ Relationship model
- ✅ Cascade delete architecture
- ✅ Documentation

### Phase 2: Embedding Integration (Next)
- API endpoints for chunk creation
- Batch embedding generation
- Vector search implementation
- Embedding status management

### Phase 3: Advanced Features (Future)
- Automatic document chunking
- Multi-language support
- Dynamic chunk size optimization
- Embedding model migration tools
- Performance optimization (indexing, caching)

---

## Best Practices

### For Developers

1. **Immutability**
   - Don't modify chunk content (create new chunk)
   - Parent relationship is immutable
   - Think of chunks as append-only log

2. **Batch Operations**
   - Create multiple chunks in single request
   - Generate embeddings in batches (100+ chunks)
   - Reduce API overhead and costs

3. **Error Handling**
   - Retry failed embedding generations
   - Check `embeddingStatus` before use
   - Monitor orphaned chunks

### For Operations

1. **Cascade Delete Safety**
   - Monitor cascade delete events
   - Alert on bulk deletions (>1000 chunks)
   - Validate audit trails for compliance

2. **Embedding Management**
   - Schedule bulk regeneration during off-peak
   - Plan model upgrades in advance
   - Track embedding costs per model

3. **Storage & Performance**
   - Archive deprecated chunks (status = 'deprecated')
   - Index `documentId` and `embeddingStatus` for queries
   - Monitor chunk table growth

---

## Questions & Next Steps

### Open Questions
- How will chunking be triggered? (manual API, automatic on upload, scheduled job)
- What's the default chunk size in tokens? (recommend: 512)
- Which embedding models will be supported initially? (recommend: OpenAI text-embedding-3-small)
- Should old embeddings be retained when migrating models?

### Next Steps
1. **Implement API endpoints** for chunk CRUD operations
2. **Implement embedding generation** with batch processing
3. **Implement semantic search** with vector similarity
4. **Implement cascade delete** with audit logging
5. **Add UI components** for chunk management
6. **Performance testing** with realistic data volumes

---

## Quick Reference Card

| Aspect | Value |
|--------|-------|
| **ShardType ID** | `c_documentChunk` |
| **Parent Type** | `c_document` (required) |
| **Cascade Delete** | Yes |
| **Immutable After Creation** | content, documentId, contentHash, chunkSequence |
| **Default Embedding Model** | text-embedding-3-small (1536 dims) |
| **Recommended Chunk Size** | 512 tokens |
| **Partition Key** | `/tenantId` |
| **Soft Delete** | Supported |
| **Versioning** | N/A (create new chunks instead) |

---

## Document Metadata

**Created**: December 15, 2025  
**Last Updated**: December 15, 2025  
**Author**: Documentation Team  
**Status**: Complete & Reviewed  
**Version**: 1.0
