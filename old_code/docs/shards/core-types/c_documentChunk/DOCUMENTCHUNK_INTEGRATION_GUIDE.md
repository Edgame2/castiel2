# Document Chunk Integration Guide

**Purpose**: Quick reference for developers implementing `c_documentChunk` features  
**Last Updated**: December 15, 2025

---

## Table of Contents

1. [Schema Integration](#schema-integration)
2. [Cascade Delete Implementation](#cascade-delete-implementation)
3. [API Endpoints](#api-endpoints)
4. [Testing Strategy](#testing-strategy)
5. [Migration Path](#migration-path)

---

## Schema Integration

### Database Schema

```sql
-- Document Chunks table
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  userId UUID NOT NULL,
  shardTypeId UUID NOT NULL,
  parentShardId UUID,
  
  -- Core structured data
  name VARCHAR(500) NOT NULL,
  documentId UUID NOT NULL,
  documentName VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  contentLength INT NOT NULL,
  contentHash VARCHAR(64) NOT NULL,
  
  -- Sequence information
  chunkSequence INT NOT NULL,
  chunkSize INT NOT NULL,
  startOffset INT NOT NULL,
  endOffset INT NOT NULL,
  pageNumber INT,
  sectionTitle VARCHAR(500),
  language VARCHAR(5),
  
  -- Embedding information
  embeddingModel VARCHAR(100),
  embeddingStatus VARCHAR(20) DEFAULT 'pending',
  embeddingTimestamp TIMESTAMP,
  embeddingDimensions INT,
  
  -- Metadata
  metadata JSON,
  tags JSON DEFAULT '[]',
  
  -- Audit fields
  createdBy UUID NOT NULL,
  createdAt TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP NOT NULL,
  deletedBy UUID,
  deletedAt TIMESTAMP,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  
  CONSTRAINT fk_document FOREIGN KEY (documentId) 
    REFERENCES documents(id),
  INDEX idx_documentId (documentId),
  INDEX idx_tenantId (tenantId),
  INDEX idx_embeddingStatus (embeddingStatus),
  INDEX idx_contentHash (contentHash),
  INDEX idx_chunkSequence (documentId, chunkSequence)
);

-- Vector embeddings table (separate for performance)
CREATE TABLE chunk_embeddings (
  chunkId UUID PRIMARY KEY,
  embedding VECTOR(1536),  -- OpenAI text-embedding-3-small
  tenantId UUID NOT NULL,
  
  CONSTRAINT fk_chunk FOREIGN KEY (chunkId) 
    REFERENCES document_chunks(id),
  INDEX idx_tenantId (tenantId),
  VECTOR INDEX ivfflat_embedding ON embedding
);
```

### TypeScript Interface

```typescript
// src/types/chunks.ts

export interface DocumentChunk extends BaseShard {
  structuredData: {
    name: string;
    documentId: string;
    documentName: string;
    content: string;
    contentLength: number;
    contentHash: string;
    
    chunkSequence: number;
    chunkSize: number;
    startOffset: number;
    endOffset: number;
    pageNumber?: number;
    sectionTitle?: string;
    language?: string;
    
    metadata?: Record<string, any>;
    embeddingModel?: string;
    embeddingStatus: 'pending' | 'processing' | 'complete' | 'failed' | 'deprecated';
    embeddingTimestamp?: Date;
    embeddingDimensions?: number;
    
    tags: string[];
    createdBy: string;
    createdAt: Date;
    deletedBy?: string;
    deletedAt?: Date;
  };
  
  unstructuredData: {
    embedding?: number[];
    rawMetadata?: Record<string, any>;
    processingLog?: string;
  };
  
  internal_relationships: InternalRelationship[];
  acl: ACLEntry[];
  status: 'active' | 'deleted';
}

export interface ChunkMetadata {
  sourceFormat?: string;
  extractionMethod?: string;
  confidence?: number;
  isHeader?: boolean;
  isList?: boolean;
  [key: string]: any;
}
```

### Validation Schema

```typescript
// src/schemas/documentChunk.schema.ts

import Joi from 'joi';

export const createChunkSchema = Joi.object({
  name: Joi.string().min(1).max(500).required(),
  documentId: Joi.string().uuid().required(),
  documentName: Joi.string().min(1).max(500).required(),
  content: Joi.string().min(1).required(),
  chunkSequence: Joi.number().integer().min(1).required(),
  chunkSize: Joi.number().integer().min(100).max(4096).required(),
  startOffset: Joi.number().integer().min(0).required(),
  endOffset: Joi.number().integer().min(0).required(),
  pageNumber: Joi.number().integer().min(1),
  sectionTitle: Joi.string().max(500),
  language: Joi.string().pattern(/^[a-z]{2}(-[A-Z]{2})?$/),
  metadata: Joi.object(),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
});

export const batchCreateChunksSchema = Joi.object({
  documentId: Joi.string().uuid().required(),
  chunks: Joi.array()
    .items(createChunkSchema)
    .min(1)
    .max(1000)
    .required(),
});
```

---

## Cascade Delete Implementation

### Repository Pattern

```typescript
// src/repositories/chunkRepository.ts

export class ChunkRepository {
  /**
   * Hard delete chunks by document ID (cascade)
   */
  async deleteByDocumentId(
    documentId: string,
    tenantId: string,
    userId: string
  ): Promise<{ deleted: number; chunkIds: string[] }> {
    // 1. Find all chunks
    const chunks = await this.cosmosContainer
      .items
      .query({
        query: `SELECT c.id FROM c 
                WHERE c.documentId = @docId AND c.tenantId = @tenantId`,
        parameters: [
          { name: '@docId', value: documentId },
          { name: '@tenantId', value: tenantId }
        ]
      })
      .fetchAll();

    // 2. Delete chunks in batches
    const chunkIds: string[] = [];
    for (const chunk of chunks.resources) {
      await this.hardDelete(chunk.id, tenantId);
      chunkIds.push(chunk.id);
    }

    // 3. Audit log
    await auditLog.record({
      action: 'CASCADE_DELETE',
      resourceType: 'document_chunk',
      resourceId: documentId,
      parentResourceType: 'document',
      cascadeCount: chunkIds.length,
      chunkIds,
      performedBy: userId,
      tenantId,
      timestamp: new Date()
    });

    return {
      deleted: chunkIds.length,
      chunkIds
    };
  }

  /**
   * Soft delete chunks by document ID
   */
  async softDeleteByDocumentId(
    documentId: string,
    tenantId: string,
    userId: string
  ): Promise<{ updated: number }> {
    const now = new Date();

    const response = await this.cosmosContainer
      .items
      .query({
        query: `UPDATE c 
                SET c.deletedAt = @now, 
                    c.deletedBy = @userId,
                    c.status = 'deleted'
                WHERE c.documentId = @docId 
                  AND c.tenantId = @tenantId
                  AND c.status != 'deleted'`,
        parameters: [
          { name: '@docId', value: documentId },
          { name: '@tenantId', value: tenantId },
          { name: '@now', value: now },
          { name: '@userId', value: userId }
        ]
      })
      .fetchAll();

    return { updated: response.resources.length };
  }

  /**
   * Detect orphaned chunks
   */
  async findOrphanedChunks(tenantId: string): Promise<string[]> {
    const orphans = await this.cosmosContainer
      .items
      .query({
        query: `SELECT c.id FROM c
                WHERE c.tenantId = @tenantId
                  AND c.status != 'deleted'
                  AND NOT EXISTS (
                    SELECT 1 FROM documents d
                    WHERE d.id = c.documentId
                      AND d.tenantId = @tenantId
                      AND d.status != 'deleted'
                  )`,
        parameters: [{ name: '@tenantId', value: tenantId }]
      })
      .fetchAll();

    return orphans.resources.map(r => r.id);
  }
}
```

### Service Layer

```typescript
// src/services/chunkService.ts

export class ChunkService {
  constructor(
    private chunkRepo: ChunkRepository,
    private documentRepo: DocumentRepository,
    private auditLog: AuditLogService
  ) {}

  /**
   * Delete document with cascade to chunks
   */
  async deleteDocumentWithCascade(
    documentId: string,
    tenantId: string,
    userId: string,
    deleteType: 'hard' | 'soft'
  ) {
    // 1. Validate document exists
    const doc = await this.documentRepo.findById(documentId, tenantId);
    if (!doc) {
      throw new NotFoundError(`Document ${documentId} not found`);
    }

    // 2. Delete chunks first (cascade)
    let cascadeResult;
    if (deleteType === 'hard') {
      cascadeResult = await this.chunkRepo.deleteByDocumentId(
        documentId,
        tenantId,
        userId
      );
    } else {
      cascadeResult = await this.chunkRepo.softDeleteByDocumentId(
        documentId,
        tenantId,
        userId
      );
    }

    // 3. Delete document
    if (deleteType === 'hard') {
      await this.documentRepo.hardDelete(documentId, tenantId);
    } else {
      await this.documentRepo.softDelete(documentId, tenantId, userId);
    }

    // 4. Return cascade info
    return {
      documentDeleted: true,
      chunksDeleted: cascadeResult.deleted,
      cascadeDetails: cascadeResult
    };
  }
}
```

---

## API Endpoints

### REST Endpoints

```typescript
// src/routes/chunks.ts

import { FastifyInstance } from 'fastify';

export async function chunkRoutes(fastify: FastifyInstance) {
  // Create batch chunks
  fastify.post('/api/chunks/batch', {
    schema: {
      body: batchCreateChunksSchema,
      response: { 200: batchChunksResponseSchema }
    }
  }, async (request, reply) => {
    const { documentId, chunks } = request.body;
    const { tenantId, userId } = request.user;

    // Verify parent document exists
    const doc = await documentRepo.findById(documentId, tenantId);
    if (!doc) {
      throw new NotFoundError(`Document ${documentId} not found`);
    }

    // Create chunks
    const created = await chunkService.createBatchChunks(
      documentId,
      doc.structuredData.name,
      chunks,
      tenantId,
      userId
    );

    return {
      success: true,
      created: created.length,
      chunks: created
    };
  });

  // Get chunks by document
  fastify.get('/api/documents/:documentId/chunks', {
    schema: {
      params: Joi.object({
        documentId: Joi.string().uuid().required()
      }),
      query: Joi.object({
        skip: Joi.number().integer().default(0),
        take: Joi.number().integer().default(100),
        sortBy: Joi.string().valid('sequence', 'created'),
        sortOrder: Joi.string().valid('asc', 'desc').default('asc')
      })
    }
  }, async (request, reply) => {
    const { documentId } = request.params;
    const { tenantId } = request.user;
    const { skip, take, sortBy = 'sequence', sortOrder = 'asc' } = request.query;

    const result = await chunkService.getChunksByDocument(
      documentId,
      tenantId,
      { skip, take, sortBy, sortOrder }
    );

    return result;
  });

  // Get chunk by ID
  fastify.get('/api/chunks/:chunkId', async (request, reply) => {
    const { chunkId } = request.params;
    const { tenantId } = request.user;

    const chunk = await chunkService.getChunkById(chunkId, tenantId);
    return chunk;
  });

  // Search chunks (semantic + text)
  fastify.post('/api/chunks/search', {
    schema: {
      body: searchChunksSchema
    }
  }, async (request, reply) => {
    const { query, topK = 10, minSimilarity = 0.5, documentId } = request.body;
    const { tenantId } = request.user;

    const results = await chunkService.searchChunks(
      query,
      tenantId,
      { topK, minSimilarity, documentId }
    );

    return results;
  });

  // Generate embeddings
  fastify.post('/api/chunks/embeddings/generate', {
    schema: {
      body: generateEmbeddingsSchema
    }
  }, async (request, reply) => {
    const { chunkIds, model = 'text-embedding-3-small' } = request.body;
    const { tenantId } = request.user;

    const job = await chunkService.queueEmbeddingGeneration(
      chunkIds,
      tenantId,
      model
    );

    return {
      jobId: job.id,
      status: 'queued',
      chunkCount: chunkIds.length
    };
  });
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/services/chunkService.test.ts

describe('ChunkService', () => {
  describe('deleteDocumentWithCascade', () => {
    it('should cascade delete all chunks when document is deleted', async () => {
      // Arrange
      const documentId = 'doc-123';
      const tenantId = 'tenant-xyz';
      const chunks = [
        { id: 'chunk-1', documentId },
        { id: 'chunk-2', documentId },
        { id: 'chunk-3', documentId }
      ];

      jest.spyOn(documentRepo, 'findById').mockResolvedValue(mockDocument);
      jest.spyOn(chunkRepo, 'deleteByDocumentId').mockResolvedValue({
        deleted: 3,
        chunkIds: ['chunk-1', 'chunk-2', 'chunk-3']
      });

      // Act
      const result = await chunkService.deleteDocumentWithCascade(
        documentId,
        tenantId,
        'user-123',
        'hard'
      );

      // Assert
      expect(result.chunksDeleted).toBe(3);
      expect(chunkRepo.deleteByDocumentId).toHaveBeenCalledWith(
        documentId,
        tenantId,
        'user-123'
      );
      expect(documentRepo.hardDelete).toHaveBeenCalledWith(
        documentId,
        tenantId
      );
    });

    it('should throw error if parent document not found', async () => {
      jest.spyOn(documentRepo, 'findById').mockResolvedValue(null);

      await expect(
        chunkService.deleteDocumentWithCascade('doc-999', 'tenant-xyz', 'user-123', 'hard')
      ).rejects.toThrow(NotFoundError);

      expect(chunkRepo.deleteByDocumentId).not.toHaveBeenCalled();
    });
  });

  describe('createBatchChunks', () => {
    it('should create multiple chunks with validation', async () => {
      const chunks = [
        {
          name: 'Chunk 1',
          content: 'Content 1',
          chunkSequence: 1,
          startOffset: 0,
          endOffset: 100
        }
      ];

      const result = await chunkService.createBatchChunks(
        'doc-123',
        'Test Doc',
        chunks,
        'tenant-xyz',
        'user-123'
      );

      expect(result).toHaveLength(1);
      expect(result[0].embeddingStatus).toBe('pending');
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/chunks.integration.test.ts

describe('Chunk API Integration', () => {
  it('should cascade delete chunks when document is deleted', async () => {
    // Create document
    const docResponse = await app.inject({
      method: 'POST',
      url: '/api/documents',
      payload: { name: 'Test Doc', ... }
    });
    const documentId = docResponse.json().id;

    // Create chunks
    const chunksResponse = await app.inject({
      method: 'POST',
      url: '/api/chunks/batch',
      payload: {
        documentId,
        chunks: [
          { name: 'Chunk 1', content: '...', chunkSequence: 1, ... },
          { name: 'Chunk 2', content: '...', chunkSequence: 2, ... }
        ]
      }
    });
    expect(chunksResponse.json().created).toBe(2);

    // Delete document
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/documents/${documentId}`
    });
    expect(deleteResponse.json().chunksDeleted).toBe(2);

    // Verify chunks are deleted
    const checkResponse = await app.inject({
      method: 'GET',
      url: `/api/documents/${documentId}/chunks`
    });
    expect(checkResponse.json().chunks).toHaveLength(0);
  });
});
```

---

## Migration Path

### Phase 1: Implementation
- [ ] Create database schema
- [ ] Implement repository layer
- [ ] Implement service layer
- [ ] Add API endpoints
- [ ] Write unit tests
- [ ] Write integration tests

### Phase 2: Integration
- [ ] Add document upload chunking
- [ ] Implement embedding generation
- [ ] Implement semantic search
- [ ] Performance testing
- [ ] Load testing

### Phase 3: Production
- [ ] Data migration (existing documents)
- [ ] Monitoring setup
- [ ] Performance tuning
- [ ] User documentation
- [ ] Release notes

---

## Checklist

**Schema & Database:**
- [ ] Document chunks table created
- [ ] Chunk embeddings table created
- [ ] Foreign key constraints added
- [ ] Indexes created (documentId, embeddingStatus, etc.)
- [ ] Partition key set to `/tenantId`

**Code:**
- [ ] TypeScript interfaces defined
- [ ] Validation schemas created
- [ ] Repository methods implemented
- [ ] Service methods implemented
- [ ] API routes implemented
- [ ] Error handling added

**Testing:**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Cascade delete tested
- [ ] Performance tests run
- [ ] Load tests pass

**Documentation:**
- [ ] API documentation updated
- [ ] Developer guide created
- [ ] Database schema documented
- [ ] Example usage provided
