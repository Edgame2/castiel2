# Embeddings Module Specification

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft  
**Module Category:** AI & Intelligence  
**Vector Storage:** pgvector (PostgreSQL)

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
- **Vector Storage**: Store embeddings in pgvector (PostgreSQL)
- **Semantic Search**: Find similar content by meaning
- **Batch Processing**: Efficient bulk embedding operations
- **Multi-Provider**: Support multiple embedding models/providers

### 1.3 Technology Choice: pgvector

**Why pgvector over dedicated vector databases:**

| Factor | Decision |
|--------|----------|
| **Scale** | IDE use case: ~1M vectors per org (well within pgvector limits) |
| **Simplicity** | Same database as relational data |
| **Data Integrity** | ACID transactions, consistent joins |
| **Cost** | No additional infrastructure |
| **Operational** | Single database to manage |

**Migration Path**: Abstract interface allows future migration to Pinecone/Qdrant if scale demands.

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
│  │                         Vector Store (pgvector)                                  │   │
│  │  • HNSW Index   • Cosine Similarity   • Metadata Filtering                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │                                            
                    ▼                                            
           ┌───────────────────┐
           │    PostgreSQL     │
           │    (pgvector)     │
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
    │   │   ├── VectorStore.ts          # pgvector operations
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
    │   │   ├── PgVectorStore.ts        # pgvector implementation
    │   │   └── VectorStoreInterface.ts # Abstract interface
    │   │
    │   └── types/
    │       ├── embedding.types.ts
    │       └── search.types.ts
    │
    ├── prisma/
    │   └── schema.prisma
    │
    ├── Dockerfile
    └── package.json
```

---

## 3. Data Models

### 3.1 Database Architecture

> **Shared Database**: All Embeddings tables reside in the shared PostgreSQL database (`coder_ide`). Tables are prefixed with `emb_`.

### 3.2 pgvector Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable HNSW index support (pgvector 0.5.0+)
-- HNSW provides faster queries at the cost of more memory
```

### 3.3 Table Mapping

| Prisma Model | Database Table | Description |
|--------------|----------------|-------------|
| `EmbeddingCollection` | `emb_collections` | Logical grouping of embeddings |
| `EmbeddingDocument` | `emb_documents` | Source documents |
| `EmbeddingChunk` | `emb_chunks` | Text chunks with vectors |
| `EmbeddingModel` | `emb_models` | Available embedding models |
| `EmbeddingJob` | `emb_jobs` | Batch embedding jobs |

### 3.4 Database Schema

```prisma
// ============================================================
// EMBEDDING COLLECTIONS
// ============================================================

model EmbeddingCollection {
  @@map("emb_collections")
  
  id                    String                @id @default(uuid())
  
  // Identification
  name                  String
  description           String?
  
  // Scope
  scope                 EmbeddingScope        @default(PROJECT)
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  projectId             String?
  project               Project?              @relation(fields: [projectId], references: [id])
  userId                String?               // For user-specific collections
  user                  User?                 @relation(fields: [userId], references: [id])
  
  // Configuration
  embeddingModelId      String
  embeddingModel        EmbeddingModel        @relation(fields: [embeddingModelId], references: [id])
  dimensions            Int                   // Vector dimensions (e.g., 1536, 3072)
  
  // Chunking settings
  chunkSize             Int                   @default(512)    // Characters
  chunkOverlap          Int                   @default(50)     // Overlap characters
  
  // Index configuration
  indexType             VectorIndexType       @default(HNSW)
  distanceMetric        DistanceMetric        @default(COSINE)
  
  // Metadata
  sourceType            String?               // knowledge-base, code, agent-memory, etc.
  metadata              Json?
  
  // Stats
  documentCount         Int                   @default(0)
  chunkCount            Int                   @default(0)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  documents             EmbeddingDocument[]
  
  @@unique([scope, organizationId, projectId, name])
  @@index([organizationId])
  @@index([projectId])
}

enum EmbeddingScope {
  GLOBAL                // Platform-wide (Super Admin)
  ORGANIZATION          // Organization-wide
  PROJECT               // Project-specific
  USER                  // User-specific (agent memory)
}

enum VectorIndexType {
  IVFFLAT               // Faster build, good for < 1M vectors
  HNSW                  // Faster query, better recall
}

enum DistanceMetric {
  COSINE                // Normalized vectors (most common)
  L2                    // Euclidean distance
  INNER_PRODUCT         // Dot product
}

// ============================================================
// EMBEDDING DOCUMENTS
// ============================================================

model EmbeddingDocument {
  @@map("emb_documents")
  
  id                    String                @id @default(uuid())
  
  // Collection
  collectionId          String
  collection            EmbeddingCollection   @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  
  // Source identification
  sourceId              String                // External ID (e.g., KB article ID)
  sourceType            String                // knowledge-base, code-file, etc.
  
  // Content
  title                 String?
  content               String                // Full text content
  contentHash           String                // Hash for change detection
  
  // Metadata
  metadata              Json?                 // Source-specific metadata
  
  // Processing status
  status                DocumentStatus        @default(PENDING)
  lastProcessedAt       DateTime?
  errorMessage          String?
  
  // Stats
  chunkCount            Int                   @default(0)
  tokenCount            Int?
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  chunks                EmbeddingChunk[]
  
  @@unique([collectionId, sourceId])
  @@index([collectionId, status])
  @@index([sourceId, sourceType])
}

enum DocumentStatus {
  PENDING               // Awaiting processing
  PROCESSING            // Currently being embedded
  COMPLETED             // Successfully embedded
  FAILED                // Processing failed
  STALE                 // Content changed, needs re-embedding
}

// ============================================================
// EMBEDDING CHUNKS (with pgvector)
// ============================================================

model EmbeddingChunk {
  @@map("emb_chunks")
  
  id                    String                @id @default(uuid())
  
  // Document
  documentId            String
  document              EmbeddingDocument     @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  // Chunk info
  chunkIndex            Int                   // Position in document
  content               String                // Chunk text
  tokenCount            Int?
  
  // Vector embedding (pgvector type)
  // Using Unsupported type for pgvector
  // In raw SQL: embedding vector(1536)
  embedding             Unsupported("vector")?
  
  // Chunk metadata
  startOffset           Int?                  // Character offset in source
  endOffset             Int?
  metadata              Json?                 // Chunk-specific metadata
  
  // Timestamps
  createdAt             DateTime              @default(now())
  
  @@index([documentId, chunkIndex])
}

// ============================================================
// EMBEDDING MODELS
// ============================================================

model EmbeddingModel {
  @@map("emb_models")
  
  id                    String                @id @default(uuid())
  
  // Identification
  provider              String                // openai, ollama, cohere, etc.
  name                  String                // text-embedding-3-large, etc.
  displayName           String
  description           String?
  
  // Specifications
  dimensions            Int                   // Output vector dimensions
  maxInputTokens        Int                   // Max tokens per request
  
  // Pricing (per 1M tokens, in cents)
  pricePer1M            Int?
  
  // Status
  isEnabled             Boolean               @default(true)
  isDefault             Boolean               @default(false)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  collections           EmbeddingCollection[]
  
  @@unique([provider, name])
}

// ============================================================
// BATCH JOBS
// ============================================================

model EmbeddingJob {
  @@map("emb_jobs")
  
  id                    String                @id @default(uuid())
  
  // Scope
  organizationId        String
  organization          Organization          @relation(fields: [organizationId], references: [id])
  userId                String
  user                  User                  @relation(fields: [userId], references: [id])
  
  // Job details
  collectionId          String
  jobType               EmbeddingJobType
  
  // Progress
  status                JobStatus             @default(PENDING)
  totalItems            Int                   @default(0)
  processedItems        Int                   @default(0)
  failedItems           Int                   @default(0)
  
  // Timing
  startedAt             DateTime?
  completedAt           DateTime?
  
  // Error tracking
  errors                Json?                 // Array of errors
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@index([organizationId, status])
  @@index([collectionId])
}

enum EmbeddingJobType {
  FULL_REINDEX          // Re-embed all documents
  INCREMENTAL           // Embed new/changed only
  DELETE                // Remove embeddings
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

### 3.5 pgvector Index Creation

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

### 5.2 Vector Store (pgvector)

```typescript
class PgVectorStore implements VectorStoreInterface {
  /**
   * Insert embedding chunks
   */
  async upsert(
    collectionId: string,
    documentId: string,
    chunks: ChunkWithEmbedding[]
  ): Promise<void> {
    // Delete existing chunks for document
    await prisma.$executeRaw`
      DELETE FROM emb_chunks WHERE document_id = ${documentId}
    `;
    
    // Insert new chunks with embeddings
    for (const chunk of chunks) {
      await prisma.$executeRaw`
        INSERT INTO emb_chunks (
          id, document_id, chunk_index, content, 
          token_count, embedding, start_offset, end_offset, 
          created_at
        ) VALUES (
          ${chunk.id},
          ${documentId},
          ${chunk.index},
          ${chunk.content},
          ${chunk.tokenCount},
          ${chunk.embedding}::vector,
          ${chunk.startOffset},
          ${chunk.endOffset},
          NOW()
        )
      `;
    }
    
    // Update document stats
    await prisma.embeddingDocument.update({
      where: { id: documentId },
      data: {
        chunkCount: chunks.length,
        status: 'COMPLETED',
        lastProcessedAt: new Date()
      }
    });
  }
  
  /**
   * Semantic search using cosine similarity
   */
  async search(
    collectionId: string,
    queryEmbedding: number[],
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { topK = 10, threshold = 0.7, filter } = options;
    
    // Build filter conditions
    let filterSQL = '';
    if (filter?.sourceType) {
      filterSQL += ` AND d.source_type = '${filter.sourceType}'`;
    }
    if (filter?.sourceIds?.length) {
      filterSQL += ` AND d.source_id IN (${filter.sourceIds.map(s => `'${s}'`).join(',')})`;
    }
    
    const results = await prisma.$queryRaw<SearchResult[]>`
      SELECT 
        c.id,
        c.content,
        c.chunk_index,
        c.metadata,
        d.id as document_id,
        d.source_id,
        d.source_type,
        d.title,
        d.metadata as document_metadata,
        1 - (c.embedding <=> ${queryEmbedding}::vector) as similarity
      FROM emb_chunks c
      JOIN emb_documents d ON c.document_id = d.id
      WHERE d.collection_id = ${collectionId}
        AND 1 - (c.embedding <=> ${queryEmbedding}::vector) >= ${threshold}
        ${Prisma.raw(filterSQL)}
      ORDER BY c.embedding <=> ${queryEmbedding}::vector
      LIMIT ${topK}
    `;
    
    return results;
  }
  
  /**
   * Delete embeddings for a document
   */
  async delete(documentId: string): Promise<void> {
    await prisma.$executeRaw`
      DELETE FROM emb_chunks WHERE document_id = ${documentId}
    `;
    
    await prisma.embeddingDocument.delete({
      where: { id: documentId }
    });
  }
  
  /**
   * Get collection statistics
   */
  async getStats(collectionId: string): Promise<CollectionStats> {
    const stats = await prisma.$queryRaw<CollectionStats[]>`
      SELECT 
        COUNT(DISTINCT d.id) as document_count,
        COUNT(c.id) as chunk_count,
        SUM(c.token_count) as total_tokens,
        pg_total_relation_size('emb_chunks') as storage_bytes
      FROM emb_documents d
      LEFT JOIN emb_chunks c ON d.id = c.document_id
      WHERE d.collection_id = ${collectionId}
    `;
    
    return stats[0];
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
    const collection = await prisma.embeddingCollection.findUnique({
      where: { id: collectionId },
      include: { embeddingModel: true }
    });
    
    // Get documents to process
    const documents = await prisma.embeddingDocument.findMany({
      where: {
        collectionId,
        status: options.fullReindex ? undefined : { in: ['PENDING', 'STALE'] }
      }
    });
    
    // Create job
    const job = await prisma.embeddingJob.create({
      data: {
        organizationId: collection.organizationId,
        userId: options.userId,
        collectionId,
        jobType: options.fullReindex ? 'FULL_REINDEX' : 'INCREMENTAL',
        status: 'RUNNING',
        totalItems: documents.length,
        startedAt: new Date()
      }
    });
    
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
        await prisma.embeddingDocument.update({
          where: { id: doc.id },
          data: { status: 'PROCESSING' }
        });
        
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
          chunksWithEmbeddings
        );
        
        processed++;
      } catch (error) {
        failed++;
        errors.push({
          documentId: doc.id,
          error: error.message
        });
        
        await prisma.embeddingDocument.update({
          where: { id: doc.id },
          data: { status: 'FAILED', errorMessage: error.message }
        });
      }
      
      // Update job progress
      await prisma.embeddingJob.update({
        where: { id: job.id },
        data: { processedItems: processed, failedItems: failed }
      });
    }
    
    // Complete job
    await prisma.embeddingJob.update({
      where: { id: job.id },
      data: {
        status: failed === documents.length ? 'FAILED' : 'COMPLETED',
        completedAt: new Date(),
        errors: errors.length > 0 ? errors : undefined
      }
    });
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
DATABASE_URL=postgresql://coder:password@postgres:5432/coder_ide

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

### 7.2 pgvector Index Tuning

```sql
-- HNSW parameters
-- m: Max connections per node (higher = better recall, more memory)
-- ef_construction: Build-time search width (higher = better recall, slower build)

-- For small collections (< 100K vectors)
CREATE INDEX ON emb_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- For medium collections (100K - 1M vectors)
CREATE INDEX ON emb_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 100);

-- For large collections (> 1M vectors)
CREATE INDEX ON emb_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 200);
```

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
- [ ] Database schema with pgvector
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
| `@prisma/client` | Database ORM |
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

1. **pgvector**: Leverages PostgreSQL extension for vector storage
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

