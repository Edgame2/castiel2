# 🚀 Quick Start: Document Chunk (c_documentChunk)

**You're reading this because**: You need to understand or implement document chunks quickly.  
**Time to read**: 5 minutes  
**Time to understand fully**: 30 minutes - 2 hours (depending on depth)

---

## What is a Document Chunk?

A **document chunk** (`c_documentChunk`) is:
- 🔹 A small, discrete piece of a document
- 🔹 Enriched with a **vector embedding** (semantic fingerprint)
- 🔹 Searchable via **semantic similarity** (not just keyword matching)
- 🔹 Automatically deleted when parent document is deleted
- 🔹 Belongs to exactly one document (parent relationship)

**Real Example:**
```
Document: "Q1 2025 Sales Proposal.pdf" (10 pages)
   ├── Chunk 1: "Executive Summary" ← Embedding: [0.12, -0.45, ...]
   ├── Chunk 2: "Implementation Timeline" ← Embedding: [0.34, 0.56, ...]
   ├── Chunk 3: "Pricing & Investment" ← Embedding: [0.78, -0.22, ...]
   └── Chunk 4: "Terms & Conditions" ← Embedding: [0.91, 0.13, ...]
```

---

## Why Do We Need It?

### Problem 1: Large Documents in AI
When asking AI to analyze a 50-page PDF, sending the entire document is:
- ❌ Expensive (more tokens = higher cost)
- ❌ Slow (larger context = slower processing)
- ❌ Inaccurate (diluted with irrelevant content)

### Solution: Chunks + Semantic Search
```
User: "What's the pricing model?"
    ↓
[Search 1000 chunks via embeddings]
    ↓
[Find Chunk 3: "Pricing & Investment" (99% match)]
    ↓
[Send only relevant chunk to AI]
    ↓
[Fast, accurate, cheap response]
```

### Problem 2: Data Integrity
If you delete a document, what happens to its chunks?
- ❌ Orphaned chunks remain (data mess)
- ✅ Chunks automatically deleted (cascade delete)

---

## Key Features at a Glance

| Feature | What It Does |
|---------|--------------|
| **Vector Embedding** | Each chunk has a 1536-dimensional vector for similarity search |
| **Parent Relationship** | Immutable link to parent document (can't be changed) |
| **Cascade Delete** | Delete document → auto-delete all chunks |
| **Soft Delete** | Chunks marked as deleted (not removed, hidden from search) |
| **Status Tracking** | pending → processing → complete (for embeddings) |
| **Semantic Search** | Find similar chunks using vector similarity |
| **Denormalization** | Parent doc name stored for quick access |
| **Sequence Ordering** | Chunks ordered within document (chunk #1, #2, etc.) |
| **Metadata** | Custom JSON, tags, extraction confidence, etc. |
| **Audit Trail** | All deletes logged for compliance |

---

## The Shard Structure

```
c_documentChunk {
  // Identity
  id: "chunk-001-uuid"
  tenantId: "tenant-xyz"                    ← Multi-tenant isolation
  
  // Structured Data
  name: "Executive Summary"                 ← Human-readable name
  documentId: "doc-abc123"                  ← Parent (immutable)
  documentName: "Proposal.pdf"              ← Denormalized
  content: "This proposal outlines..."      ← Actual text
  chunkSequence: 1                          ← Order (1, 2, 3, ...)
  startOffset: 0                            ← Position in original
  endOffset: 1245
  
  // Embeddings
  embeddingStatus: "complete"               ← pending|processing|complete|failed
  embeddingModel: "text-embedding-3-small"  ← Model used
  embeddingDimensions: 1536                 ← Vector size
  
  // Unstructured Data
  unstructuredData: {
    embedding: [0.12, -0.45, 0.78, ...]    ← 1536 dimensions
  }
  
  // Relationships
  internal_relationships: [
    {
      targetShardId: "doc-abc123"           ← Parent link
      relationshipType: "chunk_of"
      metadata: {
        cascadeDelete: true                 ← Cascade on parent delete
      }
    }
  ]
  
  // Timestamps
  createdAt: "2025-01-15T10:00:00Z"
  createdBy: "user-123"
}
```

---

## Core Use Cases

### 1. **Semantic Document Search**
```
User searches: "data governance policies"
    ↓
System embeds query: [0.45, -0.12, 0.89, ...]
    ↓
Finds 5 chunks with cosine similarity > 0.7
    ↓
User sees results:
  • Governance Framework v2.1
    → Chunk 5: "Data Governance Policies" (92% match)
    → Chunk 12: "Policy Implementation" (88% match)
```

### 2. **AI Context Assembly**
```
AI Request: "Summarize Project Alpha's documentation"
    ↓
Find documents linked to "Project Alpha"
    ↓
Find most relevant chunks (semantic search)
    ↓
Send top-k chunks to LLM
    ↓
LLM generates summary
```

### 3. **Compliance & Deletion**
```
Legal Request: "Delete all data for Company XYZ"
    ↓
Find 5 documents linked to Company XYZ
    ↓
CASCADE: Delete all 47 chunks
    ↓
Audit log: "47 chunks deleted (cascade from 5 documents)"
    ↓
Compliance verified
```

---

## The Cascade Delete Guarantee

**Scenario**: Someone deletes a document

```
Document "Proposal.pdf" deleted
    ↓
✅ Chunk 1: "Executive Summary" → DELETED
✅ Chunk 2: "Timeline" → DELETED
✅ Chunk 3: "Pricing" → DELETED
✅ Chunk 4: "Terms" → DELETED
    ↓
No orphaned chunks left behind
Referential integrity maintained
```

**This happens automatically** - you don't need to code it!

---

## API Overview

### Create Chunks
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
      "endOffset": 100
    }
  ]
}
```

### Generate Embeddings
```
POST /api/embeddings/generate
{
  "chunkIds": ["chunk-1", "chunk-2"],
  "model": "text-embedding-3-small"
}
```

### Semantic Search
```
POST /api/chunks/search
{
  "query": "data governance",
  "topK": 10,
  "minSimilarity": 0.7
}
```

### Delete Document (Cascades)
```
DELETE /api/documents/{documentId}
→ Automatically deletes all related chunks
```

---

## Status Lifecycle (Embeddings)

```
Created
  ↓
📋 PENDING (waiting to embed)
  ↓
⚙️ PROCESSING (calling API)
  ↓
✅ COMPLETE (ready for search)

OR

❌ FAILED (error, will retry)
  ↓
📋 PENDING (retry)

OR

🔄 DEPRECATED (model changed)
  ↓
⚙️ PROCESSING (re-embed with new model)
  ↓
✅ COMPLETE (new embeddings ready)
```

---

## Field Categories

### Must-Have Fields
```
name              - "Executive Summary"
documentId        - "doc-123" (parent)
content           - "This proposal..."
chunkSequence     - 1 (order)
startOffset       - 0 (position)
endOffset         - 1245
embeddingStatus   - "pending" | "complete"
```

### Nice-to-Have Fields
```
pageNumber        - 1 (for PDFs)
sectionTitle      - "Section 1"
language          - "en"
metadata          - { confidence: 0.98 }
tags              - ["proposal", "sales"]
```

### Auto-Generated Fields
```
contentHash       - SHA-256 (for deduplication)
embeddingModel    - "text-embedding-3-small"
embeddingTimestamp - "2025-01-15T10:05:00Z"
```

---

## Design Principles (Remember These!)

### 1. **Immutable Parent**
Once created, you can't change the parent document. This ensures:
- ✅ Referential integrity
- ✅ Simple cascade delete logic
- ✅ Data consistency

### 2. **Immutable Content**
Don't modify chunk content. Instead:
- Create new chunks (v2)
- Mark old chunks as deprecated
- Update embeddings for new chunks

### 3. **One-to-Many Parent-Child**
- ✅ One document has many chunks
- ❌ One chunk cannot have multiple parents
- ❌ Chunks cannot exist without a parent

### 4. **Vector-First**
- Chunks are designed for semantic search
- Every chunk should have embeddings
- Embeddings enable AI context assembly

---

## Next Steps

### For Understanding
1. **Read in 5 min**: This document ✅
2. **Read in 30 min**: [DOCUMENTCHUNK_OVERVIEW.md](./DOCUMENTCHUNK_OVERVIEW.md)
3. **Read in 1 hour**: [core-types/c_documentChunk.md](./core-types/c_documentChunk.md)

### For Implementation
1. **Setup Database**: Copy SQL from [Integration Guide](./DOCUMENTCHUNK_INTEGRATION_GUIDE.md)
2. **Code Repository**: Use code examples from [Integration Guide](./DOCUMENTCHUNK_INTEGRATION_GUIDE.md)
3. **Test Cascade Delete**: Use test examples from [Integration Guide](./DOCUMENTCHUNK_INTEGRATION_GUIDE.md)
4. **Add API Endpoints**: Use Fastify examples from [Integration Guide](./DOCUMENTCHUNK_INTEGRATION_GUIDE.md)

### For Architecture
1. **Review Diagrams**: Check [DOCUMENTCHUNK_DIAGRAMS.md](./DOCUMENTCHUNK_DIAGRAMS.md)
2. **Understand Cascade**: Study cascade delete diagrams
3. **Plan Embeddings**: Review embedding generation pipeline

---

## Common Questions

**Q: Can a chunk belong to multiple documents?**  
A: No. Each chunk belongs to exactly one document. This ensures cascade delete works correctly.

**Q: What if the embedding model changes?**  
A: Old chunks get `embeddingStatus = 'deprecated'`. New embeddings are generated. Old embeddings are kept for history.

**Q: Can I modify chunk content?**  
A: No. Chunks are immutable. Create new chunks instead (chunk v2).

**Q: What happens to chunks when document is deleted?**  
A: They're automatically cascade deleted (hard or soft). It's guaranteed.

**Q: How big should a chunk be?**  
A: Typically 512 tokens (~2000 characters). Can vary: 256 for high-recall search, 1024 for context preservation.

**Q: Why both `documentId` and internal_relationships`?**  
A: Fast parent lookup (`documentId`) + formal graph representation (`internal_relationships`).

**Q: Can I search across all chunks?**  
A: Yes. Semantic search finds similar chunks across all documents in a tenant.

**Q: How do I know if embeddings are ready?**  
A: Check `embeddingStatus = 'complete'` before using chunk in semantic search.

---

## Documentation Map

| Need | Document | Time |
|------|----------|------|
| Quick overview | This page | 5 min |
| Executive summary | [DOCUMENTCHUNK_OVERVIEW.md](./DOCUMENTCHUNK_OVERVIEW.md) | 30 min |
| Complete spec | [c_documentChunk.md](./core-types/c_documentChunk.md) | 1-2 hours |
| Visual diagrams | [DOCUMENTCHUNK_DIAGRAMS.md](./DOCUMENTCHUNK_DIAGRAMS.md) | 20 min |
| Implementation | [DOCUMENTCHUNK_INTEGRATION_GUIDE.md](./DOCUMENTCHUNK_INTEGRATION_GUIDE.md) | 2-4 hours |
| Doc navigation | [DOCUMENTCHUNK_INDEX.md](./DOCUMENTCHUNK_INDEX.md) | 10 min |

---

## One-Minute Summary

✅ **What**: Chunks are small, semantic-searchable pieces of documents  
✅ **Why**: Enable efficient, accurate AI context and semantic search  
✅ **How**: Each chunk has a vector embedding for similarity search  
✅ **Safety**: Cascade delete ensures data integrity  
✅ **Status**: pending → processing → complete (for embeddings)  
✅ **Parent**: Immutable link to document (can't be changed)  
✅ **Deletion**: Document deletion → auto-delete all chunks  
✅ **Future**: Enables RAG (Retrieval-Augmented Generation) for AI  

---

**Ready to dive deeper?** → Start with [DOCUMENTCHUNK_OVERVIEW.md](./DOCUMENTCHUNK_OVERVIEW.md)

**Ready to implement?** → Start with [DOCUMENTCHUNK_INTEGRATION_GUIDE.md](./DOCUMENTCHUNK_INTEGRATION_GUIDE.md)

**Want architecture details?** → Check [DOCUMENTCHUNK_DIAGRAMS.md](./DOCUMENTCHUNK_DIAGRAMS.md)
