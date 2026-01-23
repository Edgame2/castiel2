# Embedding Processor

## Overview

The Embedding Processor is a critical AI infrastructure component of Castiel that generates vector embeddings for all Shards, enabling semantic search, similarity matching, and AI-powered insights across the knowledge graph.

> **Mission**: Transform every piece of knowledge (Shard) into a searchable, AI-ready vector representation while maintaining strict tenant isolation and cost efficiency.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Core Components](#core-components)
3. [Processing Flow](#processing-flow)
4. [Embedding Strategies](#embedding-strategies)
5. [Tenant Isolation](#tenant-isolation)
6. [Vector Storage](#vector-storage)
7. [Performance & Scaling](#performance--scaling)
8. [Monitoring & Observability](#monitoring--observability)
9. [Cost Management](#cost-management)
10. [Configuration](#configuration)
11. [API Reference](#api-reference)

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EVENT SOURCES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Cosmos DB Change Feed    │   API Events    │   Scheduled Jobs              │
│  (Shard create/update)    │   (manual)      │   (re-embedding)              │
└──────────────┬────────────┴────────┬────────┴──────────────┬────────────────┘
               │                     │                       │
               └─────────────────────┼───────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EVENT ROUTER                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  - Validate event payload                                             │   │
│  │  - Extract tenantId, shardId, shardTypeId                            │   │
│  │  - Check if embedding needed (config + change detection)             │   │
│  │  - Route to appropriate priority queue                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  HIGH PRIORITY  │     │ MEDIUM PRIORITY │     │  LOW PRIORITY   │
│     QUEUE       │     │     QUEUE       │     │     QUEUE       │
│                 │     │                 │     │                 │
│ • c_document    │     │ • c_note        │     │ • c_contact     │
│ • c_project     │     │ • c_opportunity │     │ • c_company     │
│                 │     │ • c_assistant   │     │ • Others        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EMBEDDING WORKERS                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Worker Pool (Auto-scaled based on queue depth)                      │    │
│  │                                                                      │    │
│  │  1. Dequeue job                                                      │    │
│  │  2. Verify tenant budget/quota                                       │    │
│  │  3. Fetch Shard (tenant-isolated)                                    │    │
│  │  4. Extract text from configured fields                              │    │
│  │  5. Call embedding model (Azure OpenAI)                              │    │
│  │  6. Store vectors (Cosmos DB + Vector Index)                         │    │
│  │  7. Update Shard status                                              │    │
│  │  8. Track usage metrics                                              │    │
│  │  9. Invalidate caches                                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   COSMOS DB     │     │  VECTOR INDEX   │     │     REDIS       │
│   (Shard.       │     │  (Azure AI      │     │   (Cache)       │
│    vectors[])   │     │   Search)       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMBEDDING PROCESSOR SERVICE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Event Listener  │  │ Queue Manager   │  │ Worker Manager  │              │
│  │                 │  │                 │  │                 │              │
│  │ • Change Feed   │  │ • Job enqueue   │  │ • Worker pool   │              │
│  │ • Event Grid    │  │ • Priority      │  │ • Concurrency   │              │
│  │ • HTTP webhook  │  │ • Dead letter   │  │ • Health check  │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                                ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      CORE PROCESSING ENGINE                           │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Budget    │  │    Text     │  │  Embedding  │  │   Vector    │  │  │
│  │  │   Guard     │  │  Extractor  │  │  Generator  │  │   Store     │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   Config    │  │   Change    │  │   Retry     │  │   Metrics   │  │  │
│  │  │   Manager   │  │  Detector   │  │   Handler   │  │   Collector │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Event Listener

Captures Shard creation/update events from multiple sources:

| Source | Trigger | Latency | Use Case |
|--------|---------|---------|----------|
| **Cosmos DB Change Feed** | Automatic on write | ~1-2s | Primary trigger for all Shards |
| **Azure Event Grid** | Published events | ~100ms | Real-time requirements |
| **HTTP Webhook** | API call | Immediate | Manual re-embedding |
| **Scheduled Job** | Cron | Batch | Bulk re-processing |

### 2. Queue Manager

Manages priority-based job queues:

```typescript
interface QueueConfig {
  name: string;
  concurrency: number;
  timeout: number;      // Job timeout in ms
  retries: number;
  backoff: {
    type: 'exponential' | 'linear';
    delay: number;
  };
}

const QUEUE_CONFIG: Record<string, QueueConfig> = {
  'embedding-high': {
    name: 'embedding-high',
    concurrency: 10,
    timeout: 60000,
    retries: 3,
    backoff: { type: 'exponential', delay: 5000 }
  },
  'embedding-medium': {
    name: 'embedding-medium',
    concurrency: 5,
    timeout: 120000,
    retries: 3,
    backoff: { type: 'exponential', delay: 10000 }
  },
  'embedding-low': {
    name: 'embedding-low',
    concurrency: 2,
    timeout: 300000,
    retries: 5,
    backoff: { type: 'exponential', delay: 30000 }
  }
};
```

### 3. Embedding Workers

Process jobs from queues with tenant-isolated operations:

```typescript
interface EmbeddingJob {
  id: string;
  tenantId: string;           // REQUIRED - tenant isolation
  shardId: string;
  shardTypeId: string;
  changeType: 'create' | 'update' | 'reprocess';
  changedFields?: string[];   // For selective re-embedding
  priority: 'high' | 'medium' | 'low';
  source: 'change_feed' | 'event_grid' | 'webhook' | 'scheduled';
  createdAt: Date;
  attempts: number;
  lastError?: string;
}
```

### 4. Text Extractor

Extracts and prepares text content for embedding:

- Combines multiple fields with configurable weights
- Handles structured and unstructured data
- Truncates to model token limits
- Cleans and normalizes text

### 5. Embedding Generator

Interfaces with embedding models:

- Azure OpenAI (primary)
- OpenAI API (fallback)
- Local models (development)

### 6. Vector Store

Dual storage strategy:

- **Cosmos DB**: Stores vectors with Shard (single source of truth)
- **Azure AI Search**: Optimized vector index for search queries

---

## Processing Flow

### Standard Shard Processing

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. EVENT RECEIVED                                                        │
│    ───────────────                                                       │
│    Input: { shardId, tenantId, shardTypeId, operation, changedFields }   │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. VALIDATION & ROUTING                                                  │
│    ────────────────────                                                  │
│    • Validate event payload                                              │
│    • Check ShardType embedding config (enabled?)                         │
│    • Determine if embedding needed (new vs. update)                      │
│    • For updates: check if changed fields require re-embedding           │
│    • Route to priority queue based on ShardType                          │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. BUDGET CHECK                                                          │
│    ────────────                                                          │
│    • Fetch tenant budget (daily/monthly limits)                          │
│    • Estimate job cost (tokens × rate)                                   │
│    • If over budget: queue with delay OR reject                          │
│    • Reserve budget allocation                                           │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. FETCH SHARD                                                           │
│    ───────────                                                           │
│    • Get Shard from Cosmos DB (with tenantId filter!)                    │
│    • Verify tenantId matches (defense in depth)                          │
│    • Check Shard status (skip if deleted/archived)                       │
│    • Get ShardType embedding configuration                               │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. TEXT EXTRACTION                                                       │
│    ───────────────                                                       │
│    For each configured field:                                            │
│    • Extract field value from Shard                                      │
│    • Apply field-specific preprocessing                                  │
│    • Truncate to maxTokens limit                                         │
│    • Apply weight for combined embedding                                 │
│                                                                          │
│    Special handling:                                                     │
│    • c_document: Use unstructuredData.text (from Document Intelligence)  │
│    • c_note: Combine title + content                                     │
│    • c_contact: Name + title + notes                                     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 6. EMBEDDING GENERATION                                                  │
│    ────────────────────                                                  │
│    • Prepare text input (combined or per-field)                          │
│    • Call Azure OpenAI embedding API                                     │
│    • Model: text-embedding-ada-002 (1536 dimensions)                     │
│    • Handle rate limits with retry logic                                 │
│    • Track token usage for billing                                       │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 7. VECTOR STORAGE                                                        │
│    ──────────────                                                        │
│    Cosmos DB (Primary):                                                  │
│    • Update Shard.vectors[] array                                        │
│    • Include: id, field, model, dimensions, embedding, createdAt         │
│                                                                          │
│    Azure AI Search (Secondary):                                          │
│    • Upsert to vector index                                              │
│    • Document ID: {tenantId}:{shardId}:{field}                          │
│    • Include metadata for filtering                                      │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 8. STATUS UPDATE & CLEANUP                                               │
│    ───────────────────────                                               │
│    • Update Shard.enrichment.lastEmbeddedAt                              │
│    • Set processingStatus = 'completed'                                  │
│    • Invalidate search caches for tenant                                 │
│    • Emit 'shard.embedded' event                                         │
│    • Record metrics (latency, tokens, success)                           │
│    • Release budget reservation                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Document-Specific Processing

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        DOCUMENT UPLOAD FLOW                              │
└──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. FILE UPLOAD (Synchronous)                                             │
│    • Upload to Azure Blob Storage                                        │
│    • Create c_document Shard (processingStatus: 'pending')               │
│    • Return immediately to user                                          │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Event: document.uploaded
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. VIRUS SCAN (Async Job)                                                │
│    • Scan with Microsoft Defender / ClamAV                               │
│    • If infected: quarantine, notify admin, stop processing              │
│    • If clean: continue to next step                                     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. DOCUMENT INTELLIGENCE (Async Job)                                     │
│    • Check tenant quota (max_document_intelligence pages)                │
│    • Call Azure Document Intelligence API                                │
│    • Extract: text, layout, tables, key-value pairs, entities            │
│    • Store results in Shard.unstructuredData.text                        │
│    • Store analysis in Shard.analysis                                    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Emit: document.text_extracted
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 4. EMBEDDING GENERATION (Async Job)                                      │
│    • Extract text from unstructuredData.text                             │
│    • Combine with name, description                                      │
│    • Generate embedding (same as standard flow)                          │
│    • Store in vectors[]                                                  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. ADDITIONAL ENRICHMENT (Parallel Jobs)                                 │
│    • Summarization                                                       │
│    • Entity extraction                                                   │
│    • Classification                                                      │
│    • Key phrase extraction                                               │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 6. COMPLETE                                                              │
│    • processingStatus = 'completed'                                      │
│    • Document ready for search and AI insights                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Embedding Strategies

### Per-ShardType Configuration

| ShardType | Priority | Fields | Model | Dimensions | Re-embed Triggers |
|-----------|----------|--------|-------|------------|-------------------|
| `c_document` | High | name, description, text | ada-002 | 1536 | text, name change |
| `c_project` | High | name, description, objectives | ada-002 | 1536 | description change |
| `c_note` | Medium | name, text | ada-002 | 1536 | text change |
| `c_opportunity` | Medium | name, description, notes | ada-002 | 1536 | description change |
| `c_assistant` | Medium | name, description, systemPrompt | ada-002 | 1536 | systemPrompt change |
| `c_contact` | Low | name, title, notes | ada-002 | 1536 | notes change |
| `c_company` | Low | name, description, industry | ada-002 | 1536 | description change |

### Configuration Schema

```typescript
interface ShardTypeEmbeddingConfig {
  shardTypeId: string;
  enabled: boolean;
  
  // Fields to embed
  fields: {
    path: string;                    // JSON path: "structuredData.name"
    weight: number;                  // 0.0 - 1.0, for combined embedding
    maxTokens: number;               // Truncation limit
    preprocessor?: 'none' | 'clean' | 'summarize';
  }[];
  
  // Embedding model configuration
  model: {
    provider: 'azure-openai' | 'openai';
    name: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large';
    dimensions: number;
    maxInputTokens: number;
  };
  
  // Processing behavior
  processing: {
    priority: 'high' | 'medium' | 'low';
    triggerOn: ('create' | 'update' | 'manual')[];
    reembedOnFieldChange: string[];  // Field paths that trigger re-embedding
    batchSize: number;               // For bulk operations
    timeout: number;                 // Job timeout in ms
  };
  
  // Output configuration
  output: {
    storeInShard: boolean;           // Store in Shard.vectors[]
    storeInIndex: boolean;           // Store in Azure AI Search
    indexName?: string;              // Custom index name
  };
}
```

### Combined vs Per-Field Embeddings

**Combined Embedding (Recommended for most cases):**
- Single embedding from concatenated fields
- More efficient (1 API call)
- Good for general search

**Per-Field Embeddings (For advanced use cases):**
- Separate embedding for each field
- Enables field-specific search
- Higher cost (multiple API calls)

```typescript
// Combined embedding example
const combinedText = `
Title: ${shard.structuredData.name}
Description: ${shard.structuredData.description}
Content: ${shard.unstructuredData?.text || ''}
`.trim();

// Per-field embedding example
const fieldEmbeddings = await Promise.all([
  generateEmbedding(shard.structuredData.name, { field: 'name' }),
  generateEmbedding(shard.structuredData.description, { field: 'description' }),
  generateEmbedding(shard.unstructuredData?.text, { field: 'content' })
]);
```

---

## Tenant Isolation

### Critical Isolation Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TENANT ISOLATION CHECKPOINTS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. EVENT INGESTION                                                         │
│     ✓ Extract tenantId from event (from Change Feed document)               │
│     ✓ Validate tenantId is present                                          │
│     ✓ Never trust tenantId from external sources without validation         │
│                                                                             │
│  2. JOB CREATION                                                            │
│     ✓ Include tenantId in every job payload                                 │
│     ✓ Use tenantId in job ID: {tenantId}:{shardId}:{timestamp}             │
│                                                                             │
│  3. SHARD FETCH                                                             │
│     ✓ Always include tenantId in query                                      │
│     ✓ Double-check fetched Shard.tenantId matches job.tenantId              │
│     ✓ Reject if mismatch (log security alert)                               │
│                                                                             │
│  4. EMBEDDING GENERATION                                                    │
│     ✓ No tenant identifiers in text sent to model                           │
│     ✓ Sanitize all data before embedding                                    │
│                                                                             │
│  5. VECTOR STORAGE                                                          │
│     ✓ Include tenantId in vector document ID                                │
│     ✓ Store tenantId in vector metadata                                     │
│     ✓ Cosmos DB: Partition key is tenantId                                  │
│                                                                             │
│  6. SEARCH QUERIES                                                          │
│     ✓ Always filter by tenantId                                             │
│     ✓ tenantId from auth context, NOT from request                          │
│                                                                             │
│  7. CACHING                                                                 │
│     ✓ Include tenantId in all cache keys                                    │
│     ✓ Key format: emb:{tenantId}:{shardId}:{field}                         │
│                                                                             │
│  8. METRICS & LOGGING                                                       │
│     ✓ Include tenantId in all metrics                                       │
│     ✓ Per-tenant usage tracking                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Code Patterns

```typescript
// ✅ CORRECT: Always verify tenant
async function processEmbeddingJob(job: EmbeddingJob): Promise<void> {
  // Fetch with tenant filter
  const shard = await shardRepository.findById(job.shardId, job.tenantId);
  
  // Defense in depth: verify again
  if (!shard || shard.tenantId !== job.tenantId) {
    logger.security('Tenant mismatch in embedding job', {
      jobTenantId: job.tenantId,
      shardTenantId: shard?.tenantId,
      shardId: job.shardId
    });
    throw new SecurityError('Tenant isolation violation');
  }
  
  // Process...
}

// ❌ WRONG: Never do this
async function unsafeProcess(shardId: string): Promise<void> {
  // Missing tenant filter - SECURITY VULNERABILITY
  const shard = await shardRepository.findById(shardId);
}
```

---

## Vector Storage

### Dual Storage Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VECTOR STORAGE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     COSMOS DB (Primary)                              │   │
│  │                                                                      │   │
│  │  Purpose: Source of truth, stored with Shard                         │   │
│  │                                                                      │   │
│  │  Shard {                                                             │   │
│  │    id: "shard-123",                                                  │   │
│  │    tenantId: "tenant-abc",  // Partition key                         │   │
│  │    ...                                                               │   │
│  │    vectors: [                                                        │   │
│  │      {                                                               │   │
│  │        id: "vec-001",                                                │   │
│  │        field: "combined",                                            │   │
│  │        model: "text-embedding-ada-002",                              │   │
│  │        dimensions: 1536,                                             │   │
│  │        embedding: [0.123, -0.456, ...],  // 1536 floats              │   │
│  │        createdAt: "2025-11-30T..."                                   │   │
│  │      }                                                               │   │
│  │    ]                                                                 │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  │  Pros: Single source of truth, transactional with Shard             │   │
│  │  Cons: Vector search less optimized than dedicated index             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   AZURE AI SEARCH (Secondary)                        │   │
│  │                                                                      │   │
│  │  Purpose: Optimized vector search at scale                           │   │
│  │                                                                      │   │
│  │  Index: castiel-vectors-{environment}                                │   │
│  │                                                                      │   │
│  │  Document {                                                          │   │
│  │    id: "tenant-abc:shard-123:combined",                             │   │
│  │    tenantId: "tenant-abc",          // For filtering                 │   │
│  │    shardId: "shard-123",                                            │   │
│  │    shardTypeId: "c_document",                                       │   │
│  │    field: "combined",                                               │   │
│  │    embedding: [0.123, -0.456, ...], // Vector field                  │   │
│  │    name: "Document Title",          // For hybrid search             │   │
│  │    createdAt: "2025-11-30T...",                                     │   │
│  │    updatedAt: "2025-11-30T..."                                      │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  │  Pros: Fast vector search, hybrid search, faceting                   │   │
│  │  Cons: Additional sync required, eventual consistency                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Azure AI Search Index Schema

```json
{
  "name": "castiel-vectors-prod",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true },
    { "name": "tenantId", "type": "Edm.String", "filterable": true },
    { "name": "shardId", "type": "Edm.String", "filterable": true },
    { "name": "shardTypeId", "type": "Edm.String", "filterable": true, "facetable": true },
    { "name": "field", "type": "Edm.String", "filterable": true },
    { "name": "name", "type": "Edm.String", "searchable": true },
    { "name": "embedding", "type": "Collection(Edm.Single)", "dimensions": 1536, "vectorSearchProfile": "default-profile" },
    { "name": "createdAt", "type": "Edm.DateTimeOffset", "sortable": true },
    { "name": "updatedAt", "type": "Edm.DateTimeOffset", "sortable": true }
  ],
  "vectorSearch": {
    "algorithms": [
      { "name": "hnsw-algorithm", "kind": "hnsw", "hnswParameters": { "m": 4, "efConstruction": 400, "efSearch": 500 } }
    ],
    "profiles": [
      { "name": "default-profile", "algorithm": "hnsw-algorithm" }
    ]
  }
}
```

---

## Performance & Scaling

### Concurrency Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKER SCALING STRATEGY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Queue Depth Thresholds:                                                    │
│  ─────────────────────                                                      │
│  < 100 jobs    → 1 worker instance                                          │
│  100-500 jobs  → 2-3 worker instances                                       │
│  500-1000 jobs → 5 worker instances                                         │
│  > 1000 jobs   → Auto-scale up to 10 instances                              │
│                                                                             │
│  Per-Instance Concurrency:                                                  │
│  ─────────────────────────                                                  │
│  High Priority Queue:   10 concurrent jobs                                  │
│  Medium Priority Queue: 5 concurrent jobs                                   │
│  Low Priority Queue:    2 concurrent jobs                                   │
│                                                                             │
│  Rate Limiting:                                                             │
│  ─────────────                                                              │
│  Azure OpenAI: 1000 RPM (requests per minute)                               │
│  Per-tenant:   100 RPM (prevent one tenant from starving others)            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Batching Strategy

```typescript
// Batch multiple shards for efficiency
async function processBatch(jobs: EmbeddingJob[]): Promise<void> {
  // Group by tenant for tenant-isolated batching
  const byTenant = groupBy(jobs, 'tenantId');
  
  for (const [tenantId, tenantJobs] of Object.entries(byTenant)) {
    // Check tenant budget once for batch
    const budget = await checkBudget(tenantId, tenantJobs.length);
    if (!budget.allowed) continue;
    
    // Extract texts
    const texts = await Promise.all(
      tenantJobs.map(j => extractTextForShard(j.shardId, tenantId))
    );
    
    // Batch embedding call (if model supports it)
    const embeddings = await generateEmbeddingsBatch(texts);
    
    // Store all
    await Promise.all(
      tenantJobs.map((job, i) => 
        storeEmbedding(job.shardId, tenantId, embeddings[i])
      )
    );
  }
}
```

---

## Monitoring & Observability

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `embedding_jobs_enqueued` | Counter | Jobs added to queue |
| `embedding_jobs_processed` | Counter | Jobs successfully completed |
| `embedding_jobs_failed` | Counter | Jobs that failed |
| `embedding_latency_ms` | Histogram | End-to-end processing time |
| `embedding_api_latency_ms` | Histogram | Azure OpenAI API call time |
| `embedding_tokens_used` | Counter | Total tokens processed |
| `embedding_queue_depth` | Gauge | Current queue size |
| `embedding_worker_active` | Gauge | Active worker count |

### Per-Tenant Metrics

| Metric | Description |
|--------|-------------|
| `tenant_embeddings_total` | Total embeddings for tenant |
| `tenant_tokens_used` | Tokens consumed by tenant |
| `tenant_cost_usd` | Estimated cost in USD |
| `tenant_quota_remaining` | Remaining daily/monthly quota |

### Logging

```typescript
// Structured logging for embedding operations
logger.info('Embedding job completed', {
  // Job info
  jobId: job.id,
  shardId: job.shardId,
  shardTypeId: job.shardTypeId,
  tenantId: job.tenantId,
  
  // Performance
  latencyMs: endTime - startTime,
  apiLatencyMs: apiEnd - apiStart,
  tokensUsed: tokenCount,
  
  // Status
  status: 'success',
  embeddingId: embedding.id,
  
  // Context
  source: job.source,
  attempt: job.attempts
});
```

---

## Cost Management

### Token Estimation

```typescript
// Rough estimation: ~4 characters per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Cost calculation (ada-002 pricing)
function estimateCost(tokens: number): number {
  const COST_PER_1K_TOKENS = 0.0001; // $0.0001 per 1K tokens
  return (tokens / 1000) * COST_PER_1K_TOKENS;
}
```

### Budget Enforcement

```typescript
interface TenantBudget {
  tenantId: string;
  daily: {
    limit: number;      // USD
    used: number;
    resetAt: Date;
  };
  monthly: {
    limit: number;      // USD
    used: number;
    resetAt: Date;
  };
}

async function checkBudget(tenantId: string, estimatedCost: number): Promise<BudgetCheck> {
  const budget = await getBudget(tenantId);
  
  if (budget.daily.used + estimatedCost > budget.daily.limit) {
    return { allowed: false, reason: 'DAILY_LIMIT_EXCEEDED', retryAfter: budget.daily.resetAt };
  }
  
  if (budget.monthly.used + estimatedCost > budget.monthly.limit) {
    return { allowed: false, reason: 'MONTHLY_LIMIT_EXCEEDED', retryAfter: budget.monthly.resetAt };
  }
  
  return { allowed: true };
}
```

---

## Configuration

### Environment Variables

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_API_KEY=your-api-key
AZURE_SEARCH_INDEX_NAME=castiel-vectors-prod

# Queue (Redis/BullMQ)
REDIS_URL=redis://localhost:6379
EMBEDDING_QUEUE_PREFIX=castiel:embedding

# Processing
EMBEDDING_WORKERS_HIGH=10
EMBEDDING_WORKERS_MEDIUM=5
EMBEDDING_WORKERS_LOW=2
EMBEDDING_BATCH_SIZE=10
EMBEDDING_JOB_TIMEOUT=60000

# Budgets (defaults)
DEFAULT_DAILY_BUDGET_USD=10
DEFAULT_MONTHLY_BUDGET_USD=100
```

### Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `EMBEDDING_ENABLED` | true | Global kill switch |
| `EMBEDDING_ASYNC` | true | Use async processing (false = sync) |
| `EMBEDDING_DUAL_STORAGE` | true | Store in both Cosmos and AI Search |
| `EMBEDDING_BATCH_ENABLED` | true | Enable batch processing |

---

## API Reference

### Manual Re-embedding Endpoint

```http
POST /api/v1/shards/{shardId}/reembed
Authorization: Bearer {token}

Response:
{
  "jobId": "job-uuid",
  "status": "queued",
  "estimatedCompletionMs": 5000
}
```

### Bulk Re-embedding Endpoint

```http
POST /api/v1/shards/bulk-reembed
Authorization: Bearer {token}
Content-Type: application/json

{
  "shardIds": ["shard-1", "shard-2", "shard-3"],
  "force": false  // Re-embed even if unchanged
}

Response:
{
  "batchId": "batch-uuid",
  "jobs": 3,
  "status": "processing"
}
```

### Embedding Status Endpoint

```http
GET /api/v1/shards/{shardId}/embedding-status
Authorization: Bearer {token}

Response:
{
  "shardId": "shard-123",
  "hasEmbedding": true,
  "lastEmbeddedAt": "2025-11-30T10:00:00Z",
  "model": "text-embedding-ada-002",
  "dimensions": 1536,
  "processingStatus": "completed"
}
```

---

## Related Documentation

- [AI Tenant Isolation](../shards/ai-tenant-isolation.md) - Isolation best practices
- [Base Schema](../shards/base-schema.md) - Shard structure including vectors[]
- [c_document](../shards/core-types/c_document.md) - Document processing pipeline
- [Implementation TODO](./IMPLEMENTATION_TODO.md) - Detailed implementation tasks

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team

---## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - Embedding processor documentation complete but implementation may need verification#### Implemented Features (✅)

- ✅ Architecture documented
- ✅ Core components documented
- ✅ Processing flow documented
- ✅ Embedding strategies documented
- ✅ Tenant isolation documented
- ✅ Performance and scaling documented#### Known Limitations- ⚠️ **Implementation Status** - Embedding processor may not be fully implemented
  - **Code Reference:**
    - Embedding processor service may need verification
  - **Recommendation:**
    1. Verify embedding processor implementation
    2. Test embedding generation
    3. Update documentation with actual implementation status

- ⚠️ **Queue System Migration** - Queue system has been migrated to BullMQ/Redis
  - **Code Reference:**
    - Document may reference Service Bus
  - **Recommendation:**
    1. Update documentation to reflect BullMQ/Redis
    2. Update queue references
    3. Document migration changes

### Code References

- **Backend Services:**
  - `apps/api/src/services/embedding-processor.service.ts` - Embedding processor service
  - `apps/api/src/services/vectorization.service.ts` - Vectorization service

### Related Documentation

- [Gap Analysis](../../../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Embedding Templates](../embeddings/README.md) - Embedding template system
- [Backend Documentation](../../../backend/README.md) - Backend implementation
