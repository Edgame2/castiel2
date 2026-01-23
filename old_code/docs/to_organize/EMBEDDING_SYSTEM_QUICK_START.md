# Embedding System Quick Start Guide

## Overview

The embedding template system automatically generates semantic embeddings for all shards using configurable templates with field weighting, preprocessing, and model selection.

## Key Features

- **Automatic Processing**: Shards get embeddings automatically on create/update
- **Template-Based**: Per-shard-type configuration with field weights
- **Template-Aware Search**: Queries preprocessed same way as content
- **Manual Controls**: API endpoints for manual operations
- **Statistics**: Monitor embedding coverage per tenant

---

## How It Works

### 1. Automatic Embedding Generation

When you create or update a shard:

```typescript
// Create a new shard
POST /api/v1/shards
{
  "shardTypeId": "contract",
  "title": "Employment Agreement",
  "content": "This agreement...",
  "metadata": { ... }
}

// ✨ Embeddings generated automatically within 10 seconds
// No additional action needed!
```

**Behind the scenes**:
1. Shard stored in Cosmos DB
2. Change feed detects change
3. ShardEmbeddingChangeFeedService processes it
4. Embedding template fetched for shard type
5. Text extracted using template field weights
6. Embeddings generated via Azure OpenAI
7. Vectors stored in `shard.vectors[]` array

---

### 2. Embedding Templates

Configure per-shard-type templates for optimal results:

```typescript
// Get template for a shard type
GET /api/v1/embedding-templates/shard-types/:shardTypeId

// Create custom template
POST /api/v1/embedding-templates
{
  "name": "Contract Embedding Template",
  "shardTypeIds": ["contract"],
  "model": "text-embedding-3-small",
  "dimensions": 1536,
  "fieldWeights": {
    "title": 2.0,      // Title is 2x more important
    "content": 1.0,    // Content at baseline
    "metadata.tags": 1.5,
    "metadata.summary": 1.8
  },
  "preprocessing": {
    "normalize": true,
    "removePunctuation": false,
    "lowercase": true,
    "removeStopwords": false
  },
  "chunking": {
    "enabled": true,
    "chunkSize": 8000,
    "overlap": 200
  }
}
```

**Field Weights**:
- `2.0` = Field included twice (high importance)
- `1.0` = Field included once (normal importance)
- `0.5` = Field included with reduced weight
- `0.0` = Field excluded

---

### 3. Manual Embedding Operations

#### Generate Embeddings for One Shard

```bash
POST /api/v1/shards/:shardId/embeddings/generate
{
  "force": false  # Set true to regenerate even if exists
}

# Response
{
  "success": true,
  "shardId": "abc123",
  "vectorsGenerated": 1,
  "model": "text-embedding-ada-002",
  "executionTimeMs": 234
}
```

**Use cases**:
- Manual trigger after template change
- Regenerate after content update
- Testing embedding generation

---

#### Regenerate Embeddings for All Shards of a Type

After updating an embedding template, regenerate all shards:

```bash
POST /api/v1/shard-types/:shardTypeId/embeddings/regenerate
{
  "force": false
}

# Response (202 Accepted - runs in background)
{
  "success": true,
  "shardTypeId": "contract",
  "message": "Regeneration started in background",
  "estimatedShards": 1250
}
```

**Use cases**:
- After template update
- After model change (e.g., ada-002 → 3-small)
- Backfilling for existing shards

**Note**: Admin-only endpoint. Returns immediately; processing happens in background.

---

#### Batch Generate for Multiple Shards

For migrations or bulk operations:

```bash
POST /api/v1/shards/embeddings/batch
{
  "shardIds": ["id1", "id2", "id3", ...],  # Max 100
  "force": false
}

# Response (202 Accepted - runs in background)
{
  "success": true,
  "message": "Batch generation started in background",
  "shardCount": 50
}
```

**Use cases**:
- Migration from old system
- Backfilling for existing tenants
- Regenerating after bug fixes

---

#### Get Embedding Statistics

Monitor embedding coverage for your tenant:

```bash
GET /api/v1/tenants/:tenantId/embeddings/stats

# Response
{
  "tenantId": "tenant123",
  "totalShards": 5000,
  "shardsWithEmbeddings": 4500,
  "shardsWithoutEmbeddings": 500,
  "coveragePercentage": 90.0,
  "modelDistribution": {
    "text-embedding-ada-002": 4000,
    "text-embedding-3-small": 500
  },
  "averageVectorsPerShard": 1.2
}
```

**Use cases**:
- Monitor embedding coverage
- Identify shards needing embeddings
- Track model distribution
- Dashboard metrics

---

### 4. Vector Search (Template-Aware)

Search uses templates for query preprocessing:

```typescript
POST /api/v1/vector-search/semantic
{
  "query": "employment agreement confidentiality clause",
  "topK": 10,
  "filter": {
    "tenantId": "tenant123",
    "shardTypeId": "contract",  // ✨ Triggers template usage
    "status": "active"
  },
  "minScore": 0.7,
  "similarityMetric": "cosine"
}

// Response
{
  "results": [
    {
      "shard": { ... },
      "score": 0.89,
      "highlights": [ ... ]
    },
    ...
  ],
  "totalCount": 10,
  "executionTimeMs": 456,
  "fromCache": false
}
```

**How it works**:
1. If `filter.shardTypeId` provided → fetch template
2. Apply same preprocessing to query as used for shards
3. Generate query embedding with template's model
4. Perform vector search in Cosmos DB
5. Apply ACL filtering
6. Cache results (if Redis available)

**Benefits**:
- Better similarity matching (aligned embeddings)
- Consistent preprocessing
- Model alignment per shard type

---

## Common Workflows

### Workflow 1: New Tenant Setup

```bash
# 1. Create shard types
POST /api/v1/shard-types { ... }

# 2. (Optional) Create custom embedding templates
POST /api/v1/embedding-templates { ... }

# 3. Create shards
POST /api/v1/shards { ... }

# 4. Embeddings generated automatically! ✨
# Check after ~10 seconds

# 5. Verify coverage
GET /api/v1/tenants/:tenantId/embeddings/stats
```

---

### Workflow 2: Updating Embedding Template

```bash
# 1. Update template
PUT /api/v1/embedding-templates/:templateId
{
  "fieldWeights": {
    "title": 3.0,  # Increased from 2.0
    "content": 1.0
  }
}

# 2. Regenerate all shards using this template
POST /api/v1/shard-types/:shardTypeId/embeddings/regenerate
{
  "force": true
}

# 3. Monitor progress via logs or statistics
GET /api/v1/tenants/:tenantId/embeddings/stats
```

---

### Workflow 3: Migrating Existing Shards

For tenants with existing shards (no embeddings):

```bash
# 1. Get all shard IDs (via your own query)
GET /api/v1/shards?tenantId=tenant123

# 2. Batch generate embeddings (max 100 per request)
POST /api/v1/shards/embeddings/batch
{
  "shardIds": [...first 100 IDs...],
  "force": false
}

# 3. Repeat for remaining shards

# 4. Verify complete coverage
GET /api/v1/tenants/:tenantId/embeddings/stats
```

---

## Monitoring

### Check Logs

```bash
# Server startup
✅ Embedding Template service initialized
✅ Embedding service initialized
✅ Vector Search service initialized with embedding template support
✅ Shard Embedding service initialized
✅ Shard Embedding Change Feed processor started

# During operation
[ChangeFeed] Processed batch: 50 shards, 45 succeeded, 5 skipped
[ShardEmbedding] Generated embeddings for shard abc123: 1 vectors, model: text-embedding-ada-002

# Graceful shutdown
Shard embedding change feed processor stopped
```

### Check Metrics (Application Insights)

Key events tracked:
- `embedding.manual_generation`
- `embedding.regeneration_started`
- `embedding.regeneration_completed`
- `embedding.batch_generation_started`
- `embedding.batch_generation_completed`
- `embedding.change_feed_batch_processed`
- `query_embedding_with_template`

---

## Troubleshooting

### Problem: Shard Created But No Embeddings

**Possible causes**:
1. Change feed processor not running
2. Shard has no content (`title`, `content` both empty)
3. Shard is archived/deleted
4. Azure OpenAI error

**Check**:
```bash
# 1. Check server logs for change feed
grep "Shard Embedding Change Feed processor started" server.log

# 2. Check shard content
GET /api/v1/shards/:shardId

# 3. Manually trigger generation
POST /api/v1/shards/:shardId/embeddings/generate
{
  "force": true
}
```

---

### Problem: Low Coverage Percentage

**Possible causes**:
1. Many shards created before system was enabled
2. Change feed lag during high volume
3. Shards with no content

**Solution**:
```bash
# Backfill existing shards
POST /api/v1/shards/embeddings/batch
{
  "shardIds": [...IDs of shards without embeddings...],
  "force": false
}
```

---

### Problem: Vector Search Returns Poor Results

**Possible causes**:
1. Query not using template (missing `shardTypeId` in filter)
2. Template field weights not optimal
3. Different models used for shards vs. queries

**Solution**:
```bash
# 1. Always provide shardTypeId in search filter
POST /api/v1/vector-search/semantic
{
  "query": "...",
  "filter": {
    "shardTypeId": "contract"  # ✨ Required for template
  }
}

# 2. Adjust template field weights
PUT /api/v1/embedding-templates/:templateId
{
  "fieldWeights": { ... }
}

# 3. Regenerate embeddings after template change
POST /api/v1/shard-types/:shardTypeId/embeddings/regenerate
```

---

## Configuration

### Environment Variables

```bash
# Azure OpenAI (required)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Change Feed (optional)
EMBEDDING_CHANGE_FEED_MAX_ITEM_COUNT=100  # Batch size
EMBEDDING_CHANGE_FEED_POLL_INTERVAL=5000  # Poll every 5 seconds
EMBEDDING_CHANGE_FEED_MAX_CONCURRENCY=5   # Process 5 shards in parallel

# Redis for caching (optional)
REDIS_ENABLED=true
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

### Default Models

- **Default embedding model**: `text-embedding-ada-002`
- **Recommended for production**: `text-embedding-3-small` (better quality, lower cost)
- **Recommended for high precision**: `text-embedding-3-large`

### Performance Tuning

**Change Feed Concurrency**:
- Low load: 3-5 parallel
- Medium load: 5-10 parallel
- High load: 10-20 parallel (requires more CPU/memory)

**Cache TTL**:
- Vector search cache: 1 hour (default)
- Template cache: 15 minutes (default)

---

## Best Practices

### 1. Template Configuration

✅ **Do**:
- Create custom templates for important shard types
- Weight title/summary fields higher than content
- Use `text-embedding-3-small` for most use cases
- Enable chunking for long documents

❌ **Don't**:
- Set all field weights to 1.0 (defeats purpose)
- Use very high weights (> 5.0) - diminishing returns
- Disable preprocessing unless you have specific needs
- Use `text-embedding-ada-002` for new templates (older model)

### 2. Manual Operations

✅ **Do**:
- Use batch endpoint for > 10 shards
- Set `force: false` unless regeneration needed
- Monitor statistics after bulk operations
- Regenerate after template updates

❌ **Don't**:
- Call single-shard endpoint in a loop (use batch instead)
- Set `force: true` unnecessarily (wastes API calls)
- Regenerate during peak hours
- Forget to check completion status

### 3. Vector Search

✅ **Do**:
- Always provide `shardTypeId` in filter
- Use `topK` appropriate for UI (10-20 typically)
- Set `minScore` to filter low-quality results (0.7 recommended)
- Enable caching (Redis) for production

❌ **Don't**:
- Search without `shardTypeId` (misses template benefits)
- Request large `topK` values (> 100) - slow
- Set `minScore` too low (< 0.5) - irrelevant results
- Search across all shard types with single query (use specific types)

---

## API Reference Summary

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/v1/shards/:id/embeddings/generate` | POST | Generate embeddings for one shard | 200 JSON |
| `/api/v1/shard-types/:id/embeddings/regenerate` | POST | Regenerate all shards of type | 202 Accepted |
| `/api/v1/shards/embeddings/batch` | POST | Batch generate for multiple shards | 202 Accepted |
| `/api/v1/tenants/:id/embeddings/stats` | GET | Get embedding statistics | 200 JSON |
| `/api/v1/vector-search/semantic` | POST | Semantic search (template-aware) | 200 JSON |
| `/api/v1/embedding-templates` | GET/POST | List/create templates | 200 JSON |
| `/api/v1/embedding-templates/:id` | GET/PUT/DELETE | Get/update/delete template | 200 JSON |

---

## Support

### Documentation
- Full implementation summary: `EMBEDDING_TEMPLATE_INTEGRATION_SUMMARY.md`
- AI insights system review: `AI_INSIGHTS_SYSTEM_REVIEW.md`
- Quick action plan: `QUICK_ACTION_PLAN.md`

### Logs Location
- Application logs: Standard Fastify logger
- Monitoring: Application Insights (if configured)
- Change feed: `[ChangeFeed]` prefix in logs

### Getting Help
1. Check logs for errors: `grep "embedding" server.log`
2. Verify service status: Check startup logs for "✅ Embedding services initialized"
3. Check statistics: `GET /api/v1/tenants/:tenantId/embeddings/stats`
4. Review integration summary document for architecture details

---

## Next Steps

After setting up embeddings:
1. **Implement RAG** - Add retrieval-augmented generation to context assembly
2. **Add monitoring dashboard** - Visualize embedding coverage and performance
3. **Optimize performance** - Tune concurrency and caching settings
4. **Run integration tests** - Validate end-to-end pipeline

---

**Status**: Production Ready ✅  
**Version**: 1.0.0  
**Last Updated**: January 2025
