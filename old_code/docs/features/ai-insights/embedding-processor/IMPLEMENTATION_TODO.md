# Embedding Processor - Implementation TODO

## Overview

Complete implementation checklist for the Castiel Embedding Processor. Tasks are organized by phase with dependencies, priorities, and acceptance criteria.

**Estimated Total Effort**: 8-12 weeks  
**Team Size**: 2-3 developers

---

## Phase 1: Foundation (Week 1-2)

### Task 1.1: Core Types & Interfaces
**Priority**: 🔴 Critical | **Effort**: 1 day

**Files to Create**:
- [ ] `src/embedding-processor/types/embedding.types.ts`
- [ ] `src/embedding-processor/types/job.types.ts`
- [ ] `src/embedding-processor/types/config.types.ts`

**Interfaces Required**:
```typescript
// embedding.types.ts
interface VectorEmbedding {
  id: string;
  field: string;
  model: EmbeddingModel;
  dimensions: number;
  embedding: number[];
  createdAt: Date;
}

interface EmbeddingResult {
  shardId: string;
  tenantId: string;
  vectors: VectorEmbedding[];
  tokensUsed: number;
  processingTimeMs: number;
}

// job.types.ts
interface EmbeddingJob {
  id: string;
  tenantId: string;
  shardId: string;
  shardTypeId: string;
  changeType: 'create' | 'update' | 'reprocess';
  changedFields?: string[];
  priority: 'high' | 'medium' | 'low';
  source: 'change_feed' | 'event_grid' | 'webhook' | 'scheduled';
  createdAt: Date;
  attempts: number;
  lastError?: string;
}

// config.types.ts
interface ShardTypeEmbeddingConfig {
  shardTypeId: string;
  enabled: boolean;
  fields: EmbeddingFieldConfig[];
  model: EmbeddingModelConfig;
  processing: ProcessingConfig;
  output: OutputConfig;
}
```

**Acceptance Criteria**:
- [ ] All interfaces exported and documented
- [ ] Type guards implemented for runtime validation
- [ ] Unit tests for type guards

---

### Task 1.2: Configuration System
**Priority**: 🔴 Critical | **Effort**: 1 day

**Files to Create**:
- [ ] `src/embedding-processor/config/embedding.config.ts`
- [ ] `src/embedding-processor/config/shard-type-configs.ts`
- [ ] `src/embedding-processor/config/queue.config.ts`

**Tasks**:
- [ ] Create base configuration schema
- [ ] Define per-ShardType embedding configurations
- [ ] Define queue configurations (high/medium/low priority)
- [ ] Environment variable mapping
- [ ] Configuration validation on startup

**Default ShardType Configs**:
```typescript
const SHARD_TYPE_CONFIGS: Record<string, ShardTypeEmbeddingConfig> = {
  'c_document': {
    enabled: true,
    fields: [
      { path: 'structuredData.name', weight: 0.2, maxTokens: 100 },
      { path: 'structuredData.description', weight: 0.2, maxTokens: 500 },
      { path: 'unstructuredData.text', weight: 0.6, maxTokens: 8000 }
    ],
    processing: { priority: 'high', triggerOn: ['create', 'update'] }
  },
  'c_note': { /* ... */ },
  'c_contact': { /* ... */ },
  // ... other types
};
```

**Acceptance Criteria**:
- [ ] All configurations load from environment
- [ ] Validation errors logged clearly
- [ ] Per-ShardType configs accessible via lookup

---

### Task 1.3: Environment Setup
**Priority**: 🔴 Critical | **Effort**: 0.5 days

**Files to Update**:
- [ ] `src/config/env.ts` - Add embedding processor variables
- [ ] `.env.example` - Add example values
- [ ] `.env.development` - Add dev values

**Environment Variables**:
```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# Azure AI Search  
AZURE_SEARCH_ENDPOINT=
AZURE_SEARCH_API_KEY=
AZURE_SEARCH_INDEX_NAME=castiel-vectors

# Processing
EMBEDDING_ENABLED=true
EMBEDDING_ASYNC=true
EMBEDDING_WORKERS_HIGH=10
EMBEDDING_WORKERS_MEDIUM=5
EMBEDDING_WORKERS_LOW=2
EMBEDDING_JOB_TIMEOUT=60000

# Budgets
DEFAULT_DAILY_BUDGET_USD=10
DEFAULT_MONTHLY_BUDGET_USD=100
```

**Acceptance Criteria**:
- [ ] All variables documented
- [ ] Validation on startup
- [ ] Sensible defaults for development

---

## Phase 2: Core Services (Week 2-3)

### Task 2.1: Text Extractor Service
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/embedding-processor/services/text-extractor.service.ts`
- [ ] `src/embedding-processor/services/__tests__/text-extractor.test.ts`

**Methods Required**:
```typescript
class TextExtractorService {
  // Extract text from a Shard based on ShardType config
  extractText(shard: Shard, config: ShardTypeEmbeddingConfig): ExtractedText;
  
  // Extract specific field value by path
  extractField(shard: Shard, fieldPath: string): string | null;
  
  // Combine multiple fields with weights
  combineFields(fields: { text: string; weight: number }[]): string;
  
  // Truncate text to token limit
  truncateToTokens(text: string, maxTokens: number): string;
  
  // Clean and normalize text
  cleanText(text: string): string;
  
  // Estimate token count
  estimateTokens(text: string): number;
}
```

**Acceptance Criteria**:
- [ ] Handles all field types (string, array, nested)
- [ ] Proper truncation without cutting words
- [ ] Cleans HTML, extra whitespace
- [ ] Test coverage > 90%

---

### Task 2.2: Embedding Generator Service
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/embedding-processor/services/embedding-generator.service.ts`
- [ ] `src/embedding-processor/services/__tests__/embedding-generator.test.ts`

**Methods Required**:
```typescript
class EmbeddingGeneratorService {
  // Generate embedding for single text
  generateEmbedding(text: string, options: EmbeddingOptions): Promise<EmbeddingResult>;
  
  // Batch embedding generation
  generateEmbeddingsBatch(texts: string[], options: EmbeddingOptions): Promise<EmbeddingResult[]>;
  
  // Get model info
  getModelInfo(model: EmbeddingModel): ModelInfo;
}
```

**Integration**:
- [ ] Azure OpenAI SDK integration
- [ ] Rate limiting (1000 RPM)
- [ ] Retry logic with exponential backoff
- [ ] Error handling (timeout, rate limit, invalid input)
- [ ] Token usage tracking

**Acceptance Criteria**:
- [ ] Successfully generates embeddings via Azure OpenAI
- [ ] Handles rate limits gracefully
- [ ] Proper error handling and logging
- [ ] Token usage tracked per call

---

### Task 2.3: Vector Store Service
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/embedding-processor/services/vector-store.service.ts`
- [ ] `src/embedding-processor/services/__tests__/vector-store.test.ts`

**Methods Required**:
```typescript
class VectorStoreService {
  // Store embedding in Cosmos DB (Shard.vectors[])
  storeInShard(shardId: string, tenantId: string, embedding: VectorEmbedding): Promise<void>;
  
  // Store embedding in Azure AI Search
  storeInIndex(shardId: string, tenantId: string, embedding: VectorEmbedding, metadata: VectorMetadata): Promise<void>;
  
  // Store in both (dual storage)
  storeDual(shardId: string, tenantId: string, embedding: VectorEmbedding, metadata: VectorMetadata): Promise<void>;
  
  // Delete embeddings for a Shard
  deleteForShard(shardId: string, tenantId: string): Promise<void>;
  
  // Search vectors (semantic search)
  search(query: string, tenantId: string, options: SearchOptions): Promise<SearchResult[]>;
}
```

**Acceptance Criteria**:
- [ ] Writes to Cosmos DB successfully
- [ ] Writes to Azure AI Search successfully
- [ ] Search returns relevant results
- [ ] Tenant isolation enforced on all operations

---

### Task 2.4: Budget Guard Service
**Priority**: 🟡 High | **Effort**: 1.5 days

**Files to Create**:
- [ ] `src/embedding-processor/services/budget-guard.service.ts`
- [ ] `src/embedding-processor/services/__tests__/budget-guard.test.ts`

**Methods Required**:
```typescript
class BudgetGuardService {
  // Check if tenant can afford operation
  checkBudget(tenantId: string, estimatedCost: number): Promise<BudgetCheckResult>;
  
  // Reserve budget for pending operation
  reserveBudget(tenantId: string, amount: number): Promise<string>;
  
  // Confirm or release reservation
  confirmReservation(reservationId: string): Promise<void>;
  releaseReservation(reservationId: string): Promise<void>;
  
  // Track actual usage
  trackUsage(tenantId: string, usage: UsageRecord): Promise<void>;
  
  // Get tenant budget status
  getBudgetStatus(tenantId: string): Promise<TenantBudgetStatus>;
}
```

**Acceptance Criteria**:
- [ ] Daily/monthly limits enforced
- [ ] Reservation system prevents race conditions
- [ ] Usage tracked accurately
- [ ] Budget resets at correct intervals

---

## Phase 3: Queue Infrastructure (Week 3-4)

### Task 3.1: Queue Manager
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/embedding-processor/queue/queue-manager.ts`
- [ ] `src/embedding-processor/queue/job-router.ts`
- [ ] `src/embedding-processor/queue/__tests__/queue-manager.test.ts`

**Implementation**:
```typescript
class QueueManager {
  // Initialize all queues
  initialize(): Promise<void>;
  
  // Enqueue a job
  enqueue(job: EmbeddingJob): Promise<string>;
  
  // Get queue stats
  getStats(): Promise<QueueStats>;
  
  // Pause/resume processing
  pause(): Promise<void>;
  resume(): Promise<void>;
  
  // Clean completed/failed jobs
  clean(age: number): Promise<number>;
}

class JobRouter {
  // Determine queue based on ShardType
  getQueueForJob(job: EmbeddingJob): string;
  
  // Determine priority
  getPriority(shardTypeId: string): 'high' | 'medium' | 'low';
}
```

**Technology**: BullMQ with Redis

**Acceptance Criteria**:
- [ ] Three priority queues operational
- [ ] Job routing by ShardType works
- [ ] Stats endpoint functional
- [ ] Clean shutdown handling

---

### Task 3.2: Worker Manager
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/embedding-processor/workers/worker-manager.ts`
- [ ] `src/embedding-processor/workers/embedding-worker.ts`
- [ ] `src/embedding-processor/workers/__tests__/embedding-worker.test.ts`

**Implementation**:
```typescript
class WorkerManager {
  // Start workers for all queues
  start(): Promise<void>;
  
  // Stop all workers gracefully
  stop(): Promise<void>;
  
  // Get worker status
  getStatus(): WorkerStatus[];
  
  // Scale workers dynamically
  scale(queue: string, count: number): Promise<void>;
}

class EmbeddingWorker {
  // Process a single job
  process(job: Job<EmbeddingJob>): Promise<void>;
  
  // Handle job failure
  handleFailure(job: Job<EmbeddingJob>, error: Error): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Workers process jobs from all queues
- [ ] Concurrency limits respected
- [ ] Graceful shutdown (finish in-progress jobs)
- [ ] Failed jobs retry with backoff

---

### Task 3.3: Dead Letter Queue Handler
**Priority**: 🟡 High | **Effort**: 1 day

**Files to Create**:
- [ ] `src/embedding-processor/queue/dead-letter-handler.ts`

**Tasks**:
- [ ] Move permanently failed jobs to DLQ
- [ ] Notification on DLQ threshold
- [ ] Manual retry from DLQ
- [ ] DLQ cleanup policy

**Acceptance Criteria**:
- [ ] Failed jobs captured in DLQ
- [ ] Admin can inspect DLQ
- [ ] Manual retry works

---

## Phase 4: Event Integration (Week 4-5)

### Task 4.1: Cosmos DB Change Feed Listener
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/embedding-processor/events/change-feed-listener.ts`
- [ ] `src/embedding-processor/events/__tests__/change-feed-listener.test.ts`

**Implementation**:
```typescript
class ChangeFeedListener {
  // Start listening to Shards container changes
  start(): Promise<void>;
  
  // Stop listening
  stop(): Promise<void>;
  
  // Process a change event
  processChange(change: ShardChangeEvent): Promise<void>;
  
  // Determine if change requires embedding
  shouldEmbed(change: ShardChangeEvent): boolean;
}
```

**Tasks**:
- [ ] Connect to Cosmos DB Change Feed
- [ ] Filter for create/update operations
- [ ] Detect which fields changed
- [ ] Enqueue embedding jobs
- [ ] Handle feed lease management

**Acceptance Criteria**:
- [ ] Receives all Shard changes
- [ ] Correctly filters by operation type
- [ ] Field change detection works
- [ ] No duplicate processing

---

### Task 4.2: Change Detection Logic
**Priority**: 🔴 Critical | **Effort**: 1 day

**Files to Create**:
- [ ] `src/embedding-processor/services/change-detector.service.ts`

**Implementation**:
```typescript
class ChangeDetectorService {
  // Check if Shard change requires re-embedding
  requiresReembedding(
    oldShard: Shard | null,
    newShard: Shard,
    config: ShardTypeEmbeddingConfig
  ): ChangeDetectionResult;
  
  // Get list of changed fields
  getChangedFields(oldShard: Shard, newShard: Shard): string[];
  
  // Check if any embedding-relevant fields changed
  hasRelevantChanges(changedFields: string[], config: ShardTypeEmbeddingConfig): boolean;
}
```

**Acceptance Criteria**:
- [ ] Correctly identifies new Shards
- [ ] Correctly identifies field changes
- [ ] Only triggers re-embedding for relevant fields
- [ ] Handles edge cases (null values, missing fields)

---

### Task 4.3: Manual Trigger API
**Priority**: 🟡 High | **Effort**: 1 day

**Files to Create**:
- [ ] `src/embedding-processor/api/embedding.controller.ts`
- [ ] `src/embedding-processor/api/embedding.routes.ts`

**Endpoints**:
```typescript
// Single Shard re-embed
POST /api/v1/shards/:shardId/reembed

// Bulk re-embed
POST /api/v1/shards/bulk-reembed
Body: { shardIds: string[], force?: boolean }

// Get embedding status
GET /api/v1/shards/:shardId/embedding-status

// Get queue stats
GET /api/v1/admin/embedding/stats
```

**Acceptance Criteria**:
- [ ] Authentication required
- [ ] Tenant isolation enforced
- [ ] Rate limiting on bulk operations
- [ ] Returns job IDs for tracking

---

## Phase 5: Azure AI Search Integration (Week 5-6)

### Task 5.1: Search Index Setup
**Priority**: 🔴 Critical | **Effort**: 1 day

**Files to Create**:
- [ ] `src/embedding-processor/search/index-schema.ts`
- [ ] `scripts/create-search-index.ts`

**Index Schema**:
```json
{
  "name": "castiel-vectors",
  "fields": [
    { "name": "id", "type": "Edm.String", "key": true },
    { "name": "tenantId", "type": "Edm.String", "filterable": true },
    { "name": "shardId", "type": "Edm.String", "filterable": true },
    { "name": "shardTypeId", "type": "Edm.String", "filterable": true, "facetable": true },
    { "name": "field", "type": "Edm.String", "filterable": true },
    { "name": "name", "type": "Edm.String", "searchable": true },
    { "name": "embedding", "type": "Collection(Edm.Single)", "dimensions": 1536, "vectorSearchProfile": "default" },
    { "name": "createdAt", "type": "Edm.DateTimeOffset", "sortable": true }
  ],
  "vectorSearch": {
    "algorithms": [{ "name": "hnsw", "kind": "hnsw" }],
    "profiles": [{ "name": "default", "algorithm": "hnsw" }]
  }
}
```

**Acceptance Criteria**:
- [ ] Index created in Azure AI Search
- [ ] Vector search configured
- [ ] Script is idempotent

---

### Task 5.2: Search Client Service
**Priority**: 🔴 Critical | **Effort**: 1.5 days

**Files to Create**:
- [ ] `src/embedding-processor/search/search-client.service.ts`
- [ ] `src/embedding-processor/search/__tests__/search-client.test.ts`

**Methods**:
```typescript
class SearchClientService {
  // Upsert vector document
  upsert(document: VectorDocument): Promise<void>;
  
  // Batch upsert
  upsertBatch(documents: VectorDocument[]): Promise<void>;
  
  // Delete document
  delete(documentId: string): Promise<void>;
  
  // Vector search
  vectorSearch(queryEmbedding: number[], tenantId: string, options: SearchOptions): Promise<SearchResult[]>;
  
  // Hybrid search (vector + keyword)
  hybridSearch(query: string, queryEmbedding: number[], tenantId: string, options: SearchOptions): Promise<SearchResult[]>;
}
```

**Acceptance Criteria**:
- [ ] Upsert operations work
- [ ] Vector search returns relevant results
- [ ] Tenant filter always applied
- [ ] Hybrid search works

---

### Task 5.3: Semantic Search API
**Priority**: 🟡 High | **Effort**: 1 day

**Files to Create**:
- [ ] `src/embedding-processor/api/search.controller.ts`
- [ ] `src/embedding-processor/api/search.routes.ts`

**Endpoints**:
```typescript
// Semantic search
POST /api/v1/search/semantic
Body: {
  query: string,
  shardTypes?: string[],
  limit?: number,
  minScore?: number
}

// Similar shards
GET /api/v1/shards/:shardId/similar
Query: { limit?: number }
```

**Acceptance Criteria**:
- [ ] Search endpoint works
- [ ] Tenant isolation enforced
- [ ] Results include score and metadata
- [ ] Similar shards API works

---

## Phase 6: Document Processing Pipeline (Week 6-7)

### Task 6.1: Document Intelligence Integration
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/embedding-processor/document/document-intelligence.service.ts`
- [ ] `src/embedding-processor/document/__tests__/document-intelligence.test.ts`

**Methods**:
```typescript
class DocumentIntelligenceService {
  // Analyze document and extract text
  analyzeDocument(blobUrl: string, options: AnalyzeOptions): Promise<DocumentAnalysisResult>;
  
  // Check tenant quota
  checkQuota(tenantId: string, pageCount: number): Promise<QuotaCheckResult>;
  
  // Track usage
  trackUsage(tenantId: string, usage: DocumentIntelligenceUsage): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Extracts text from PDF, images, Office docs
- [ ] Extracts tables and key-value pairs
- [ ] Quota enforcement works
- [ ] Usage tracked per tenant

---

### Task 6.2: Document Processing Orchestrator
**Priority**: 🔴 Critical | **Effort**: 1.5 days

**Files to Create**:
- [ ] `src/embedding-processor/document/document-processor.ts`

**Processing Flow**:
```
1. Document uploaded
2. Virus scan (if enabled)
3. Document Intelligence extraction
4. Store text in Shard.unstructuredData.text
5. Trigger embedding generation
6. Additional enrichments (summarization, etc.)
```

**Acceptance Criteria**:
- [ ] Full pipeline works end-to-end
- [ ] Each step handles failures gracefully
- [ ] Status updates at each step
- [ ] Timeout handling

---

## Phase 7: Monitoring & Observability (Week 7-8)

### Task 7.1: Metrics Collection
**Priority**: 🟡 High | **Effort**: 1.5 days

**Files to Create**:
- [ ] `src/embedding-processor/monitoring/metrics.service.ts`
- [ ] `src/embedding-processor/monitoring/metrics.ts`

**Metrics to Collect**:
- [ ] `embedding_jobs_enqueued` (Counter)
- [ ] `embedding_jobs_processed` (Counter)
- [ ] `embedding_jobs_failed` (Counter)
- [ ] `embedding_latency_ms` (Histogram)
- [ ] `embedding_api_latency_ms` (Histogram)
- [ ] `embedding_tokens_used` (Counter)
- [ ] `embedding_queue_depth` (Gauge)
- [ ] `embedding_worker_active` (Gauge)
- [ ] Per-tenant metrics

**Acceptance Criteria**:
- [ ] All metrics collected
- [ ] Prometheus endpoint exposed
- [ ] Grafana dashboard created

---

### Task 7.2: Structured Logging
**Priority**: 🟡 High | **Effort**: 1 day

**Files to Update**:
- [ ] `src/embedding-processor/logging/logger.ts`

**Log Events**:
```typescript
// Job lifecycle
logger.info('embedding.job.started', { jobId, shardId, tenantId });
logger.info('embedding.job.completed', { jobId, shardId, tenantId, latencyMs, tokensUsed });
logger.error('embedding.job.failed', { jobId, shardId, tenantId, error, attempt });

// Security
logger.security('embedding.tenant_mismatch', { jobTenantId, shardTenantId });

// Budget
logger.warn('embedding.budget.exceeded', { tenantId, limit, current });
```

**Acceptance Criteria**:
- [ ] All operations logged
- [ ] Structured JSON format
- [ ] TenantId in all logs
- [ ] No PII in logs

---

### Task 7.3: Health Checks
**Priority**: 🟡 High | **Effort**: 0.5 days

**Files to Create**:
- [ ] `src/embedding-processor/health/health.controller.ts`

**Health Checks**:
- [ ] Redis connection
- [ ] Azure OpenAI availability
- [ ] Azure AI Search availability
- [ ] Queue health (depth, lag)
- [ ] Worker health

**Acceptance Criteria**:
- [ ] `/health` endpoint works
- [ ] `/health/ready` for readiness
- [ ] `/health/live` for liveness
- [ ] Detailed status for each dependency

---

## Phase 8: Testing & Quality (Week 8-9)

### Task 8.1: Unit Tests
**Priority**: 🔴 Critical | **Effort**: 3 days

**Test Files**:
- [ ] All services have corresponding test files
- [ ] Mock Azure services for unit tests

**Coverage Targets**:
- [ ] Core services: > 90%
- [ ] Queue/Worker: > 80%
- [ ] API endpoints: > 80%

---

### Task 8.2: Integration Tests
**Priority**: 🔴 Critical | **Effort**: 2 days

**Files to Create**:
- [ ] `src/embedding-processor/__tests__/integration/full-flow.test.ts`
- [ ] `src/embedding-processor/__tests__/integration/tenant-isolation.test.ts`

**Test Scenarios**:
- [ ] New Shard → Embedding generated
- [ ] Shard updated → Re-embedding triggered (if relevant field)
- [ ] Shard updated → No re-embedding (if irrelevant field)
- [ ] Document upload → Full pipeline
- [ ] Budget exceeded → Job queued with delay
- [ ] Tenant A cannot see Tenant B embeddings

---

### Task 8.3: Load Testing
**Priority**: 🟡 High | **Effort**: 1 day

**Scenarios**:
- [ ] 1000 concurrent embedding jobs
- [ ] Large document (100 pages)
- [ ] Rate limit handling

---

## Phase 9: Production Readiness (Week 9-10)

### Task 9.1: Error Handling & Resilience
**Priority**: 🔴 Critical | **Effort**: 1.5 days

**Tasks**:
- [ ] Circuit breaker for Azure OpenAI
- [ ] Graceful degradation
- [ ] Retry strategies finalized
- [ ] DLQ alerting

---

### Task 9.2: Security Review
**Priority**: 🔴 Critical | **Effort**: 1 day

**Checklist**:
- [ ] Tenant isolation verified
- [ ] No secrets in logs
- [ ] API authentication required
- [ ] Rate limiting on APIs
- [ ] Input validation

---

### Task 9.3: Documentation
**Priority**: 🟡 High | **Effort**: 1 day

**Documents**:
- [ ] API documentation (OpenAPI spec)
- [ ] Operations runbook
- [ ] Troubleshooting guide
- [ ] Configuration reference

---

### Task 9.4: Deployment Setup
**Priority**: 🔴 Critical | **Effort**: 1 day

**Tasks**:
- [ ] Docker container configuration
- [ ] Kubernetes deployment manifests
- [ ] Environment-specific configs
- [ ] CI/CD pipeline updates
- [ ] Azure resource provisioning scripts

---

## Quick Reference: File Structure

```
src/embedding-processor/
├── types/
│   ├── embedding.types.ts
│   ├── job.types.ts
│   └── config.types.ts
├── config/
│   ├── embedding.config.ts
│   ├── shard-type-configs.ts
│   └── queue.config.ts
├── services/
│   ├── text-extractor.service.ts
│   ├── embedding-generator.service.ts
│   ├── vector-store.service.ts
│   ├── budget-guard.service.ts
│   ├── change-detector.service.ts
│   └── __tests__/
├── queue/
│   ├── queue-manager.ts
│   ├── job-router.ts
│   └── dead-letter-handler.ts
├── workers/
│   ├── worker-manager.ts
│   └── embedding-worker.ts
├── events/
│   ├── change-feed-listener.ts
│   └── event-handlers.ts
├── search/
│   ├── index-schema.ts
│   └── search-client.service.ts
├── document/
│   ├── document-intelligence.service.ts
│   └── document-processor.ts
├── api/
│   ├── embedding.controller.ts
│   ├── embedding.routes.ts
│   ├── search.controller.ts
│   └── search.routes.ts
├── monitoring/
│   ├── metrics.service.ts
│   └── metrics.ts
├── health/
│   └── health.controller.ts
└── __tests__/
    ├── integration/
    └── load/
```

---

## Dependency Summary

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Core Services) ──────────────────┐
    │                                      │
    ▼                                      ▼
Phase 3 (Queue)              Phase 5 (Azure Search)
    │                                      │
    ▼                                      │
Phase 4 (Events) ─────────────────────────┤
    │                                      │
    ▼                                      ▼
Phase 6 (Document Pipeline) ◄─────────────┘
    │
    ▼
Phase 7 (Monitoring)
    │
    ▼
Phase 8 (Testing)
    │
    ▼
Phase 9 (Production)
```

---

## Success Criteria

### Functional
- [ ] All ShardTypes automatically generate embeddings on create/update
- [ ] Documents fully processed (text extraction → embedding)
- [ ] Semantic search returns relevant results
- [ ] Tenant isolation verified

### Performance
- [ ] Average embedding latency < 2s (excluding Document Intelligence)
- [ ] Document processing < 30s for typical documents
- [ ] Search latency < 500ms

### Reliability
- [ ] 99.9% job success rate (after retries)
- [ ] Zero cross-tenant data exposure
- [ ] Graceful handling of Azure service outages

### Observability
- [ ] All operations logged with correlation IDs
- [ ] Metrics visible in Grafana
- [ ] Alerts configured for failures

---

**Created**: November 2025  
**Status**: Planning  
**Owner**: Castiel Development Team

