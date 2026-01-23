# Embeddings Module Specification

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft  
**Module Category:** AI & Intelligence  
**Vector Storage:** Cosmos DB NoSQL (Vector Search)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Embedding Providers](#4-embedding-providers)
5. [Core Features](#5-core-features)
6. [API Endpoints](#6-api-endpoints)
7. [Configuration](#7-configuration)
8. [UI Views](#8-ui-views)
9. [Implementation Guidelines](#9-implementation-guidelines)

---

## 1. Overview

### 1.1 Purpose

The Embeddings Module provides **centralized vector embedding services** for Coder IDE. It generates, stores, and searches vector embeddings for semantic search, similarity matching, and AI-powered retrieval.

### 1.2 Key Responsibilities

- **Embedding Generation**: Convert text to vector embeddings
- **Vector Storage**: Store embeddings in Cosmos DB NoSQL with vector search
- **Semantic Search**: Find similar content by meaning
- **Batch Processing**: Efficient bulk embedding operations
- **Multi-Provider**: Support multiple embedding models/providers

### 1.3 Technology Choice: Cosmos DB NoSQL Vector Search

**Why Cosmos DB NoSQL over dedicated vector databases:**

| Factor | Decision |
|--------|----------|
| **Scale** | IDE use case: ~1M vectors per org (well within Cosmos DB limits) |
| **Simplicity** | Same database as document data |
| **Data Integrity** | ACID transactions, consistent queries |
| **Cost** | No additional infrastructure |
| **Operational** | Single database to manage |
| **Vector Search** | Built-in vector search capabilities |

**Migration Path**: Abstract interface allows future migration to dedicated vector databases if scale demands.

### 1.4 Consumer Modules

| Module | Usage |
|--------|-------|
| **Knowledge Base** | Document search, semantic retrieval |
| **Code Search** | Find similar code patterns |
| **Agent Memory** | Context retrieval, conversation history |
| **Planning** | Similar plan/task retrieval |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CONSUMER MODULES                                            │
│   Knowledge Base │ Code Search │ Agent Memory │ Planning                                │
└─────────────────────────────────────────┬───────────────────────────────────────────────┘
                                          │ REST API
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              EMBEDDINGS MODULE                                           │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                            Request Handler                                       │   │
│  │  • Authentication   • Validation   • Rate Limiting   • Batch Queue             │   │
│  └─────────────────────────────────────────┬───────────────────────────────────────┘   │
│                                            │                                            │
│  ┌─────────────────────────────────────────▼───────────────────────────────────────┐   │
│  │                         Embedding Service                                        │   │
│  │  • Generate Embeddings   • Chunk Text   • Normalize Vectors                     │   │
│  └─────────────────────────────────────────┬───────────────────────────────────────┘   │
│                                            │                                            │
│       ┌────────────────────────────────────┼────────────────────────────────────┐      │
│       │                                    │                                     │      │
│       ▼                                    ▼                                     ▼      │
│  ┌─────────────┐                    ┌─────────────┐                      ┌──────────┐  │
│  │   OpenAI    │                    │   Ollama    │                      │  Custom  │  │
│  │ Embeddings  │                    │ Embeddings  │                      │ Provider │  │
│  └─────────────┘                    └─────────────┘                      └──────────┘  │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         Vector Store (Cosmos DB)                                 │   │
│  │  • Vector Index   • Cosine Similarity   • Metadata Filtering                    │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │                                            
                    ▼                                            
           ┌───────────────────┐
           │    Cosmos DB      │
           │    (NoSQL)        │
           └───────────────────┘
```

### 2.2 Module Location

```
containers/
└── embeddings/
    ├── src/
    │   ├── index.ts                    # Entry point
    │   ├── server.ts                   # Fastify server
    │   │
    │   ├── routes/
    │   │   ├── embeddings.ts           # Embedding endpoints
    │   │   ├── search.ts               # Search endpoints
    │   │   ├── collections.ts          # Collection management
    │   │   └── health.ts               # Health checks
    │   │
    │   ├── services/
    │   │   ├── EmbeddingService.ts     # Core embedding logic
    │   │   ├── VectorStore.ts          # Cosmos DB vector operations
    │   │   ├── ChunkService.ts         # Text chunking
    │   │   ├── SearchService.ts        # Semantic search
    │   │   └── BatchProcessor.ts       # Batch operations
    │   │
    │   ├── providers/
    │   │   ├── BaseEmbeddingProvider.ts    # Abstract interface
    │   │   ├── OpenAIEmbeddingProvider.ts  # OpenAI embeddings
    │   │   ├── OllamaEmbeddingProvider.ts  # Ollama embeddings
    │   │   └── ProviderFactory.ts          # Provider instantiation
    │   │
    │   ├── vectorstore/
    │   │   ├── CosmosVectorStore.ts    # Cosmos DB vector implementation
    │   │   └── VectorStoreInterface.ts # Abstract interface
    │   │
    │   └── types/
    │       ├── embedding.types.ts
    │       └── search.types.ts
    │
    ├── Dockerfile
    └── package.json
```

---

## 3. Data Models

### 3.1 Database Architecture

> **Shared Database**: All Embeddings data resides in the shared Cosmos DB NoSQL database. The `embeddings` container stores all embedding-related documents.

### 3.2 Cosmos DB Vector Search Setup

- **Container**: `embeddings`
- **Partition Key**: `organizationId` (for multi-tenant isolation)
- **Vector Index**: Configure vector search index on embedding fields
- **Document Types**: Use `type` field to differentiate document types (collection, document, chunk, model, job)

### 3.3 Container Structure

| Document Type | Container | Partition Key | Description |
|--------------|-----------|---------------|-------------|
| `embedding_collection` | `embeddings` | `organizationId` | Logical grouping of embeddings |
| `embedding_document` | `embeddings` | `organizationId` | Source documents |
| `embedding_chunk` | `embeddings` | `organizationId` | Text chunks with vectors |
| `embedding_model` | `embeddings` | `organizationId` | Available embedding models |
| `embedding_job` | `embeddings` | `organizationId` | Batch embedding jobs |

### 3.4 Document Schema

**Container**: `embeddings`  
**Partition Key**: `organizationId`

#### Embedding Collection Document

```typescript
{
  id: string;                    // UUID
  type: "embedding_collection";
  organizationId: string;        // Partition key
  
  // Identification
  name: string;
  description?: string;
  
  // Scope
  scope: "GLOBAL" | "ORGANIZATION" | "PROJECT" | "USER";
  projectId?: string;
  userId?: string;               // For user-specific collections
  
  // Configuration
  embeddingModelId: string;
  dimensions: number;            // Vector dimensions (e.g., 1536, 3072)
  
  // Chunking settings
  chunkSize: number;             // Default: 512 characters
  chunkOverlap: number;          // Default: 50 characters
  
  // Index configuration
  indexType: "IVFFLAT" | "HNSW";
  distanceMetric: "COSINE" | "L2" | "INNER_PRODUCT";
  
  // Metadata
  sourceType?: string;           // knowledge-base, code, agent-memory, etc.
  metadata?: Record<string, any>;
  
  // Stats
  documentCount: number;         // Default: 0
  chunkCount: number;            // Default: 0
  
  // Timestamps
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

**Indexes**:
- Composite index on `(organizationId, scope, projectId, name)` for uniqueness
- Index on `organizationId` (partition key)
- Index on `projectId`

#### Embedding Document Document

```typescript
{
  id: string;                    // UUID
  type: "embedding_document";
  organizationId: string;        // Partition key
  
  // Collection reference
  collectionId: string;
  
  // Source identification
  sourceId: string;              // External ID (e.g., KB article ID)
  sourceType: string;            // knowledge-base, code-file, etc.
  
  // Content
  title?: string;
  content: string;               // Full text content
  contentHash: string;           // Hash for change detection
  
  // Metadata
  metadata?: Record<string, any>; // Source-specific metadata
  
  // Processing status
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "STALE";
  lastProcessedAt?: string;      // ISO 8601
  errorMessage?: string;
  
  // Stats
  chunkCount: number;            // Default: 0
  tokenCount?: number;
  
  // Timestamps
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

**Indexes**:
- Composite unique index on `(collectionId, sourceId)`
- Composite index on `(collectionId, status)`
- Composite index on `(sourceId, sourceType)`

#### Embedding Chunk Document

```typescript
{
  id: string;                    // UUID
  type: "embedding_chunk";
  organizationId: string;        // Partition key
  
  // Document reference
  documentId: string;
  
  // Chunk info
  chunkIndex: number;            // Position in document
  content: string;               // Chunk text
  tokenCount?: number;
  
  // Vector embedding (array of numbers)
  embedding: number[];           // Vector array (e.g., 1536 dimensions)
  
  // Chunk metadata
  startOffset?: number;          // Character offset in source
  endOffset?: number;
  metadata?: Record<string, any>; // Chunk-specific metadata
  
  // Timestamps
  createdAt: string;             // ISO 8601
}
```

**Indexes**:
- Composite index on `(documentId, chunkIndex)`
- Vector index on `embedding` field for similarity search

#### Embedding Model Document

```typescript
{
  id: string;                    // UUID
  type: "embedding_model";
  organizationId: string;        // Partition key (or "GLOBAL" for platform-wide)
  
  // Identification
  provider: string;              // openai, ollama, cohere, etc.
  name: string;                  // text-embedding-3-large, etc.
  displayName: string;
  description?: string;
  
  // Specifications
  dimensions: number;            // Output vector dimensions
  maxInputTokens: number;        // Max tokens per request
  
  // Pricing (per 1M tokens, in cents)
  pricePer1M?: number;
  
  // Status
  isEnabled: boolean;            // Default: true
  isDefault: boolean;             // Default: false
  
  // Timestamps
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

**Indexes**:
- Composite unique index on `(provider, name)`

#### Embedding Job Document

```typescript
{
  id: string;                    // UUID
  type: "embedding_job";
  organizationId: string;        // Partition key
  
  // Scope
  userId: string;
  
  // Job details
  collectionId: string;
  jobType: "FULL_REINDEX" | "INCREMENTAL" | "DELETE";
  
  // Progress
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  totalItems: number;            // Default: 0
  processedItems: number;        // Default: 0
  failedItems: number;           // Default: 0
  
  // Timing
  startedAt?: string;            // ISO 8601
  completedAt?: string;          // ISO 8601
  
  // Error tracking
  errors?: Array<{               // Array of errors
    itemId: string;
    error: string;
    timestamp: string;
  }>;
  
  // Timestamps
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

**Indexes**:
- Composite index on `(organizationId, status)`
- Index on `collectionId`
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

### 3.5 Cosmos DB Container and Index Setup

```sql
-- Create HNSW index for fast similarity search
-- Run after table creation

CREATE INDEX ON emb_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- For IVFFlat (alternative)
-- CREATE INDEX ON emb_chunks 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);
```

---

## 4. Embedding Providers

### 4.1 Provider Interface

```typescript
interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  readonly maxInputTokens: number;
  
  // Generate embeddings
  embed(texts: string[]): Promise<EmbeddingResult[]>;
  
  // Single text embedding
  embedSingle(text: string): Promise<number[]>;
  
  // Health check
  healthCheck(): Promise<boolean>;
}

interface EmbeddingResult {
  index: number;
  embedding: number[];
  tokenCount: number;
}
```

### 4.2 OpenAI Embedding Provider

```typescript
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions: number;
  readonly maxInputTokens = 8191;
  
  private client: OpenAI;
  private model: string;
  
  constructor(config: OpenAIConfig) {
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions || 1536;
  }
  
  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions
    });
    
    return response.data.map((item, index) => ({
      index: item.index,
      embedding: item.embedding,
      tokenCount: response.usage.prompt_tokens / texts.length
    }));
  }
  
  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0].embedding;
  }
}
```

### 4.3 Ollama Embedding Provider (Local)

```typescript
class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'ollama';
  readonly dimensions: number;
  readonly maxInputTokens = 4096;
  
  private baseUrl: string;
  private model: string;
  
  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'nomic-embed-text';
    this.dimensions = config.dimensions || 768;
  }
  
  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    // Ollama processes one at a time
    for (let i = 0; i < texts.length; i++) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: texts[i]
        })
      });
      
      const data = await response.json();
      results.push({
        index: i,
        embedding: data.embedding,
        tokenCount: Math.ceil(texts[i].length / 4)
      });
    }
    
    return results;
  }
}
```

### 4.4 Default Embedding Models

| Provider | Model | Dimensions | Max Tokens | Best For |
|----------|-------|------------|------------|----------|
| **OpenAI** | text-embedding-3-small | 1536 | 8191 | General purpose, cost-effective |
| **OpenAI** | text-embedding-3-large | 3072 | 8191 | High accuracy |
| **OpenAI** | text-embedding-ada-002 | 1536 | 8191 | Legacy support |
| **Ollama** | nomic-embed-text | 768 | 8192 | Local/offline |
| **Ollama** | mxbai-embed-large | 1024 | 512 | Local, higher quality |

---

## 5. Core Features

### 5.1 Text Chunking

```typescript
interface ChunkOptions {
  chunkSize: number;       // Target chunk size in characters
  chunkOverlap: number;    // Overlap between chunks
  splitBy: 'sentence' | 'paragraph' | 'token' | 'custom';
  preserveWords: boolean;  // Don't split mid-word
}

class ChunkService {
  /**
   * Split text into chunks for embedding
   */
  chunk(text: string, options: ChunkOptions): Chunk[] {
    const chunks: Chunk[] = [];
    
    // Split by sentences first
    const sentences = this.splitSentences(text);
    
    let currentChunk = '';
    let startOffset = 0;
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      // If adding this sentence exceeds chunk size
      if (currentChunk.length + sentence.length > options.chunkSize) {
        if (currentChunk.length > 0) {
          chunks.push({
            index: chunkIndex++,
            content: currentChunk.trim(),
            startOffset,
            endOffset: startOffset + currentChunk.length
          });
          
          // Start new chunk with overlap
          const overlapStart = Math.max(0, currentChunk.length - options.chunkOverlap);
          currentChunk = currentChunk.slice(overlapStart) + sentence;
          startOffset = startOffset + overlapStart;
        } else {
          // Single sentence is too long, force split
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence;
      }
    }
    
    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        index: chunkIndex,
        content: currentChunk.trim(),
        startOffset,
        endOffset: startOffset + currentChunk.length
      });
    }
    
    return chunks;
  }
  
  private splitSentences(text: string): string[] {
    // Simple sentence splitting (can be enhanced)
    return text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  }
}

interface Chunk {
  index: number;
  content: string;
  startOffset: number;
  endOffset: number;
}
```

### 5.2 Vector Store (Cosmos DB)

```typescript
import { CosmosClient, Container } from '@azure/cosmos';

class CosmosVectorStore implements VectorStoreInterface {
  private container: Container;
  
  constructor(cosmosClient: CosmosClient, databaseId: string) {
    this.container = cosmosClient.database(databaseId).container('embeddings');
  }
  
  /**
   * Insert embedding chunks
   */
  async upsert(
    collectionId: string,
    documentId: string,
    chunks: ChunkWithEmbedding[],
    organizationId: string
  ): Promise<void> {
    // Delete existing chunks for document
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.type = @type AND c.documentId = @documentId',
      parameters: [
        { name: '@type', value: 'embedding_chunk' },
        { name: '@documentId', value: documentId }
      ]
    };
    
    const { resources: existingChunks } = await this.container.items
      .query(querySpec)
      .fetchAll();
    
    for (const chunk of existingChunks) {
      await this.container.item(chunk.id, organizationId).delete();
    }
    
    // Insert new chunks with embeddings
    for (const chunk of chunks) {
      const chunkDoc = {
        id: chunk.id,
        type: 'embedding_chunk',
        organizationId,
        documentId,
        chunkIndex: chunk.index,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        embedding: chunk.embedding,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        metadata: chunk.metadata || {},
        createdAt: new Date().toISOString()
      };
      
      await this.container.items.upsert(chunkDoc);
    }
    
    // Update document stats
    const docQuery = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
      parameters: [
        { name: '@id', value: documentId },
        { name: '@type', value: 'embedding_document' }
      ]
    };
    
    const { resources: docs } = await this.container.items
      .query(docQuery)
      .fetchAll();
    
    if (docs.length > 0) {
      const doc = docs[0];
      doc.chunkCount = chunks.length;
      doc.status = 'COMPLETED';
      doc.lastProcessedAt = new Date().toISOString();
      await this.container.item(doc.id, organizationId).replace(doc);
    }
  }
  
  /**
   * Semantic search using Cosmos DB vector search
   */
  async search(
    collectionId: string,
    queryEmbedding: number[],
    options: SearchOptions,
    organizationId: string
  ): Promise<SearchResult[]> {
    const { topK = 10, threshold = 0.7, filter } = options;
    
    // Build filter conditions
    let filterConditions = 'c.type = @type AND c.organizationId = @orgId';
    const parameters = [
      { name: '@type', value: 'embedding_chunk' },
      { name: '@orgId', value: organizationId }
    ];
    
    if (filter?.sourceType) {
      filterConditions += ' AND EXISTS(SELECT VALUE d FROM d IN c.document WHERE d.sourceType = @sourceType)';
      parameters.push({ name: '@sourceType', value: filter.sourceType });
    }
    
    // Use Cosmos DB vector search
    const querySpec = {
      query: `
        SELECT TOP @topK
          c.id,
          c.content,
          c.chunkIndex,
          c.metadata,
          c.documentId,
          VectorDistance(c.embedding, @queryEmbedding) AS similarity
        FROM c
        WHERE ${filterConditions}
        ORDER BY VectorDistance(c.embedding, @queryEmbedding)
      `,
      parameters: [
        ...parameters,
        { name: '@topK', value: topK },
        { name: '@queryEmbedding', value: queryEmbedding }
      ]
    };
    
    const { resources } = await this.container.items
      .query(querySpec)
      .fetchAll();
    
    // Filter by threshold and fetch document details
    const results: SearchResult[] = [];
    for (const chunk of resources) {
      const similarity = 1 - chunk.similarity; // Convert distance to similarity
      if (similarity >= threshold) {
        // Fetch document details
        const docQuery = {
          query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
          parameters: [
            { name: '@id', value: chunk.documentId },
            { name: '@type', value: 'embedding_document' }
          ]
        };
        
        const { resources: docs } = await this.container.items
          .query(docQuery)
          .fetchAll();
        
        if (docs.length > 0) {
          const doc = docs[0];
          results.push({
            id: chunk.id,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            documentId: chunk.documentId,
            sourceId: doc.sourceId,
            sourceType: doc.sourceType,
            title: doc.title,
            similarity,
            metadata: chunk.metadata
          });
        }
      }
    }
    
    return results.sort((a, b) => b.similarity - a.similarity);
  }
  
  /**
   * Delete embeddings for a document
   */
  async delete(documentId: string, organizationId: string): Promise<void> {
    // Delete chunks
    const chunkQuery = {
      query: 'SELECT * FROM c WHERE c.type = @type AND c.documentId = @documentId',
      parameters: [
        { name: '@type', value: 'embedding_chunk' },
        { name: '@documentId', value: documentId }
      ]
    };
    
    const { resources: chunks } = await this.container.items
      .query(chunkQuery)
      .fetchAll();
    
    for (const chunk of chunks) {
      await this.container.item(chunk.id, organizationId).delete();
    }
    
    // Delete document
    const docQuery = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
      parameters: [
        { name: '@id', value: documentId },
        { name: '@type', value: 'embedding_document' }
      ]
    };
    
    const { resources: docs } = await this.container.items
      .query(docQuery)
      .fetchAll();
    
    for (const doc of docs) {
      await this.container.item(doc.id, organizationId).delete();
    }
  }
  
  /**
   * Get collection statistics
   */
  async getStats(collectionId: string, organizationId: string): Promise<CollectionStats> {
    const docQuery = {
      query: 'SELECT VALUE COUNT(1) FROM c WHERE c.type = @type AND c.collectionId = @collectionId AND c.organizationId = @orgId',
      parameters: [
        { name: '@type', value: 'embedding_document' },
        { name: '@collectionId', value: collectionId },
        { name: '@orgId', value: organizationId }
      ]
    };
    
    const chunkQuery = {
      query: `
        SELECT VALUE {
          chunkCount: COUNT(1),
          totalTokens: SUM(c.tokenCount)
        }
        FROM c
        WHERE c.type = @type 
          AND EXISTS(SELECT VALUE d FROM d IN c.document WHERE d.collectionId = @collectionId)
          AND c.organizationId = @orgId
      `,
      parameters: [
        { name: '@type', value: 'embedding_chunk' },
        { name: '@collectionId', value: collectionId },
        { name: '@orgId', value: organizationId }
      ]
    };
    
    const { resources: docCount } = await this.container.items
      .query(docQuery)
      .fetchAll();
    
    const { resources: chunkStats } = await this.container.items
      .query(chunkQuery)
      .fetchAll();
    
    return {
      documentCount: docCount[0] || 0,
      chunkCount: chunkStats[0]?.chunkCount || 0,
      totalTokens: chunkStats[0]?.totalTokens || 0,
      storageBytes: 0 // Cosmos DB doesn't expose per-container size easily
    };
  }
}

interface SearchOptions {
  topK?: number;           // Number of results
  threshold?: number;      // Minimum similarity (0-1)
  filter?: {
    sourceType?: string;
    sourceIds?: string[];
    metadata?: Record<string, any>;
  };
}

interface SearchResult {
  id: string;
  content: string;
  chunkIndex: number;
  documentId: string;
  sourceId: string;
  sourceType: string;
  title: string | null;
  similarity: number;
  metadata: Record<string, any>;
}
```

### 5.3 Batch Processor

```typescript
class BatchProcessor {
  private readonly BATCH_SIZE = 100;
  
  /**
   * Process documents in batches
   */
  async processCollection(
    collectionId: string,
    options: ProcessOptions
  ): Promise<EmbeddingJob> {
    // Get collection
    const collectionQuery = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
      parameters: [
        { name: '@id', value: collectionId },
        { name: '@type', value: 'embedding_collection' }
      ]
    };
    
    const { resources: collections } = await this.container.items
      .query(collectionQuery)
      .fetchAll();
    
    const collection = collections[0];
    if (!collection) throw new Error('Collection not found');
    
    // Get embedding model
    const modelQuery = {
      query: 'SELECT * FROM c WHERE c.id = @id AND c.type = @type',
      parameters: [
        { name: '@id', value: collection.embeddingModelId },
        { name: '@type', value: 'embedding_model' }
      ]
    };
    
    const { resources: models } = await this.container.items
      .query(modelQuery)
      .fetchAll();
    
    const embeddingModel = models[0];
    
    // Get documents to process
    let docQuery = {
      query: 'SELECT * FROM c WHERE c.type = @type AND c.collectionId = @collectionId',
      parameters: [
        { name: '@type', value: 'embedding_document' },
        { name: '@collectionId', value: collectionId }
      ]
    };
    
    if (!options.fullReindex) {
      docQuery.query += ' AND c.status IN (@status1, @status2)';
      docQuery.parameters.push(
        { name: '@status1', value: 'PENDING' },
        { name: '@status2', value: 'STALE' }
      );
    }
    
    const { resources: documents } = await this.container.items
      .query(docQuery)
      .fetchAll();
    
    // Create job
    const jobDoc = {
      id: crypto.randomUUID(),
      type: 'embedding_job',
      organizationId: collection.organizationId,
      userId: options.userId,
      collectionId,
      jobType: options.fullReindex ? 'FULL_REINDEX' : 'INCREMENTAL',
      status: 'RUNNING',
      totalItems: documents.length,
      processedItems: 0,
      failedItems: 0,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.container.items.create(jobDoc);
    const job = jobDoc;
    
    // Process in batches
    await this.processBatches(documents, collection, job);
    
    return job;
  }
  
  private async processBatches(
    documents: EmbeddingDocument[],
    collection: EmbeddingCollection & { embeddingModel: EmbeddingModel },
    job: EmbeddingJob
  ): Promise<void> {
    const provider = await this.getProvider(collection.embeddingModel);
    const chunkService = new ChunkService();
    
    let processed = 0;
    let failed = 0;
    const errors: any[] = [];
    
    for (const doc of documents) {
      try {
        // Mark as processing
        doc.status = 'PROCESSING';
        await this.container.item(doc.id, doc.organizationId).replace(doc);
        
        // Chunk the document
        const chunks = chunkService.chunk(doc.content, {
          chunkSize: collection.chunkSize,
          chunkOverlap: collection.chunkOverlap,
          splitBy: 'sentence',
          preserveWords: true
        });
        
        // Embed chunks in batches
        const chunkTexts = chunks.map(c => c.content);
        const embeddings = await this.embedInBatches(chunkTexts, provider);
        
        // Combine chunks with embeddings
        const chunksWithEmbeddings = chunks.map((chunk, i) => ({
          id: crypto.randomUUID(),
          ...chunk,
          embedding: embeddings[i],
          tokenCount: Math.ceil(chunk.content.length / 4)
        }));
        
        // Store in vector DB
        await this.vectorStore.upsert(
          collection.id,
          doc.id,
          chunksWithEmbeddings,
          doc.organizationId
        );
        
        processed++;
      } catch (error) {
        failed++;
        errors.push({
          documentId: doc.id,
          error: error.message
        });
        
        doc.status = 'FAILED';
        doc.errorMessage = error.message;
        await this.container.item(doc.id, doc.organizationId).replace(doc);
      }
      
      // Update job progress
      job.processedItems = processed;
      job.failedItems = failed;
      job.updatedAt = new Date().toISOString();
      await this.container.item(job.id, job.organizationId).replace(job);
    }
    
    // Complete job
    job.status = failed === documents.length ? 'FAILED' : 'COMPLETED';
    job.completedAt = new Date().toISOString();
    job.errors = errors.length > 0 ? errors : undefined;
    job.updatedAt = new Date().toISOString();
    await this.container.item(job.id, job.organizationId).replace(job);
  }
  
  private async embedInBatches(
    texts: string[],
    provider: EmbeddingProvider
  ): Promise<number[][]> {
    const results: number[][] = [];
    
    for (let i = 0; i < texts.length; i += this.BATCH_SIZE) {
      const batch = texts.slice(i, i + this.BATCH_SIZE);
      const embeddings = await provider.embed(batch);
      results.push(...embeddings.map(e => e.embedding));
    }
    
    return results;
  }
}
```

---

## 6. API Endpoints

### 6.1 Embedding Endpoints

```typescript
// POST /api/embeddings/generate
// Generate embeddings for text(s)
interface GenerateEmbeddingsRequest {
  texts: string[];                    // Texts to embed
  model?: string;                     // Embedding model (default: text-embedding-3-small)
}

interface GenerateEmbeddingsResponse {
  embeddings: Array<{
    index: number;
    embedding: number[];
    tokenCount: number;
  }>;
  model: string;
  dimensions: number;
}

// POST /api/embeddings/upsert
// Upsert document with embeddings
interface UpsertDocumentRequest {
  collectionId: string;
  sourceId: string;                   // External ID
  sourceType: string;                 // knowledge-base, code, etc.
  title?: string;
  content: string;
  metadata?: Record<string, any>;
}

// DELETE /api/embeddings/documents/:sourceId
// Delete document and its embeddings
```

### 6.2 Search Endpoints

```typescript
// POST /api/embeddings/search
// Semantic search
interface SearchRequest {
  collectionId: string;
  query: string;                      // Text query (will be embedded)
  topK?: number;                      // Number of results (default: 10)
  threshold?: number;                 // Min similarity (default: 0.7)
  filter?: {
    sourceType?: string;
    sourceIds?: string[];
    metadata?: Record<string, any>;
  };
}

interface SearchResponse {
  results: Array<{
    id: string;
    content: string;
    sourceId: string;
    sourceType: string;
    title: string | null;
    similarity: number;
    metadata: Record<string, any>;
  }>;
  query: string;
  totalResults: number;
}

// POST /api/embeddings/search/hybrid
// Hybrid search (semantic + keyword)
interface HybridSearchRequest extends SearchRequest {
  keywordWeight?: number;             // Weight for keyword results (0-1)
}
```

### 6.3 Collection Endpoints

```typescript
// POST /api/embeddings/collections
// Create collection
interface CreateCollectionRequest {
  name: string;
  description?: string;
  scope: 'ORGANIZATION' | 'PROJECT' | 'USER';
  projectId?: string;
  embeddingModelId: string;
  chunkSize?: number;
  chunkOverlap?: number;
  sourceType?: string;
}

// GET /api/embeddings/collections
// List collections

// GET /api/embeddings/collections/:id
// Get collection details with stats

// DELETE /api/embeddings/collections/:id
// Delete collection and all embeddings

// POST /api/embeddings/collections/:id/reindex
// Trigger full re-indexing
```

### 6.4 Job Endpoints

```typescript
// GET /api/embeddings/jobs
// List embedding jobs

// GET /api/embeddings/jobs/:id
// Get job status and progress

// POST /api/embeddings/jobs/:id/cancel
// Cancel running job
```

### 6.5 Endpoint Permission Matrix

| Endpoint | Super Admin | Org Admin | User |
|----------|-------------|-----------|------|
| `POST /api/embeddings/generate` | ✅ | ✅ | ✅ (via module) |
| `POST /api/embeddings/search` | ✅ | ✅ | ✅ (via module) |
| `POST /api/embeddings/collections` | ✅ | ✅ | ❌ |
| `DELETE /api/embeddings/collections/:id` | ✅ | ✅ | ❌ |
| `POST /api/embeddings/collections/:id/reindex` | ✅ | ✅ | ❌ |

---

## 7. Configuration

### 7.1 Environment Variables

```bash
# Embeddings Service Configuration
EMBEDDINGS_SERVICE_PORT=3002
EMBEDDINGS_SERVICE_HOST=0.0.0.0

# Database (shared)
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;

# Default embedding model
DEFAULT_EMBEDDING_MODEL=text-embedding-3-small
DEFAULT_EMBEDDING_DIMENSIONS=1536

# Chunking defaults
DEFAULT_CHUNK_SIZE=512
DEFAULT_CHUNK_OVERLAP=50

# Batch processing
EMBEDDING_BATCH_SIZE=100
EMBEDDING_CONCURRENCY=5

# Search defaults
DEFAULT_SEARCH_TOP_K=10
DEFAULT_SIMILARITY_THRESHOLD=0.7

# AI Service (for embeddings)
AI_SERVICE_URL=http://ai-service:3001

# Secret Management
SECRET_SERVICE_URL=http://secret-management:3000
```

### 7.2 Cosmos DB Vector Index Configuration

Configure vector search indexes in Cosmos DB for optimal performance:

```json
{
  "indexingMode": "consistent",
  "includedPaths": [
    {
      "path": "/*",
      "indexes": [
        {
          "kind": "Range",
          "dataType": "String",
          "precision": -1
        },
        {
          "kind": "Range",
          "dataType": "Number",
          "precision": -1
        }
      ]
    }
  ],
  "vectorIndexes": [
    {
      "path": "/embedding",
      "type": "quantizedFlat"
    }
  ]
}
```

**Vector Index Types**:
- **quantizedFlat**: Good for small to medium collections (< 1M vectors)
- **flat**: Best recall, higher memory usage
- **hnsw**: Faster queries, good for large collections

**Distance Metrics**: Configure cosine similarity in vector search queries.

---

## 8. UI Views

### 8.1 View Overview

```
src/renderer/
├── components/embeddings/
│   ├── CollectionList/          # List of collections
│   ├── CollectionConfig/        # Collection configuration
│   ├── DocumentList/            # Documents in collection
│   └── JobProgress/             # Batch job progress
│
├── pages/embeddings/
│   ├── CollectionsPage.tsx      # Collection management (Admin)
│   ├── DocumentsPage.tsx        # Document management
│   └── JobsPage.tsx             # Batch job monitoring
```

### 8.2 Admin: Collection Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Embedding Collections                                    [+ New Collection] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📚 Knowledge Base Articles                              Organization    │ │
│ │    Model: text-embedding-3-small (1536d)                                │ │
│ │    Documents: 1,234 │ Chunks: 8,567 │ Last indexed: 2 hours ago        │ │
│ │                                                   [View] [Reindex] [⚙️] │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 💻 Code Repository                                      Project: main   │ │
│ │    Model: text-embedding-3-small (1536d)                                │ │
│ │    Documents: 456 │ Chunks: 12,345 │ Last indexed: 1 day ago           │ │
│ │                                                   [View] [Reindex] [⚙️] │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 🤖 Agent Memory                                         User: personal  │ │
│ │    Model: nomic-embed-text (768d)                                       │ │
│ │    Documents: 89 │ Chunks: 234                                          │ │
│ │                                                          [View] [Clear] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Guidelines

### 9.1 Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)
- [ ] Database schema with Cosmos DB vector search
- [ ] OpenAI embedding provider
- [ ] Basic embedding generation
- [ ] Vector store operations

#### Phase 2: Search & Collections (Week 2)
- [ ] Semantic search implementation
- [ ] Collection CRUD
- [ ] Text chunking service
- [ ] Document management

#### Phase 3: Batch Processing (Week 3)
- [ ] Batch processor
- [ ] Job tracking
- [ ] Progress updates
- [ ] Error handling

#### Phase 4: Integration & UI (Week 4)
- [ ] Knowledge Base integration
- [ ] Admin UI for collections
- [ ] Job monitoring UI
- [ ] Search testing

### 9.2 Dependencies

| Dependency | Purpose |
|------------|---------|
| `@azure/cosmos` | Cosmos DB SDK |
| `openai` | OpenAI embeddings |
| `tiktoken` | Token counting |

### 9.3 Events Published (RabbitMQ)

```typescript
type EmbeddingEvent =
  | { type: 'embedding.document.created'; documentId: string; collectionId: string }
  | { type: 'embedding.document.updated'; documentId: string; chunkCount: number }
  | { type: 'embedding.document.deleted'; documentId: string; sourceId: string }
  | { type: 'embedding.job.started'; jobId: string; collectionId: string }
  | { type: 'embedding.job.progress'; jobId: string; processed: number; total: number }
  | { type: 'embedding.job.completed'; jobId: string; documentsProcessed: number }
  | { type: 'embedding.job.failed'; jobId: string; error: string };
```

---

## Summary

The Embeddings Module provides a robust, scalable vector embedding system for Coder IDE:

1. **Cosmos DB Vector Search**: Leverages Cosmos DB NoSQL built-in vector search capabilities
2. **Multi-Provider**: OpenAI, Ollama for different needs
3. **Efficient Chunking**: Smart text splitting with overlap
4. **Semantic Search**: Fast similarity search with filtering
5. **Batch Processing**: Background jobs for large collections
6. **Abstracted Interface**: Ready for future migration if needed

---

**Related Documents:**
- [Architecture](../architecture.md)
- [AI Service](../AI%20Service/ai-service-specification.md)
- [Knowledge Base](../Knowledge%20base/knowledge-base-spec-v2-part1.md)

