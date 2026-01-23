# Embedding Processor Configuration Reference

Quick reference for all configuration options.

---

## Environment Variables

### Azure OpenAI

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_OPENAI_ENDPOINT` | ✅ | - | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_API_KEY` | ✅ | - | API key for Azure OpenAI |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | ✅ | - | Deployment name for embedding model |
| `AZURE_OPENAI_API_VERSION` | ❌ | `2024-02-01` | API version |

### Azure AI Search

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AZURE_SEARCH_ENDPOINT` | ✅ | - | Azure AI Search endpoint |
| `AZURE_SEARCH_API_KEY` | ✅ | - | Admin API key |
| `AZURE_SEARCH_INDEX_NAME` | ❌ | `castiel-vectors` | Vector index name |

### Redis / Queue

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | ✅ | - | Redis connection URL |
| `EMBEDDING_QUEUE_PREFIX` | ❌ | `castiel:emb` | Queue key prefix |

### Processing

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMBEDDING_ENABLED` | ❌ | `true` | Global enable/disable |
| `EMBEDDING_ASYNC` | ❌ | `true` | Async processing |
| `EMBEDDING_WORKERS_HIGH` | ❌ | `10` | High priority concurrency |
| `EMBEDDING_WORKERS_MEDIUM` | ❌ | `5` | Medium priority concurrency |
| `EMBEDDING_WORKERS_LOW` | ❌ | `2` | Low priority concurrency |
| `EMBEDDING_JOB_TIMEOUT` | ❌ | `60000` | Job timeout (ms) |
| `EMBEDDING_BATCH_SIZE` | ❌ | `10` | Batch size for bulk ops |
| `EMBEDDING_DUAL_STORAGE` | ❌ | `true` | Store in both Cosmos & AI Search |

### Budgets

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEFAULT_DAILY_BUDGET_USD` | ❌ | `10` | Default daily limit |
| `DEFAULT_MONTHLY_BUDGET_USD` | ❌ | `100` | Default monthly limit |

---

## ShardType Embedding Configurations

### c_document (High Priority)

```typescript
{
  shardTypeId: 'c_document',
  enabled: true,
  fields: [
    { path: 'structuredData.name', weight: 0.2, maxTokens: 100 },
    { path: 'structuredData.description', weight: 0.2, maxTokens: 500 },
    { path: 'unstructuredData.text', weight: 0.6, maxTokens: 8000 }
  ],
  model: { name: 'text-embedding-ada-002', dimensions: 1536 },
  processing: {
    priority: 'high',
    triggerOn: ['create', 'update'],
    reembedOnFieldChange: ['structuredData.name', 'unstructuredData.text']
  }
}
```

### c_project (High Priority)

```typescript
{
  shardTypeId: 'c_project',
  enabled: true,
  fields: [
    { path: 'structuredData.name', weight: 0.3, maxTokens: 100 },
    { path: 'structuredData.description', weight: 0.5, maxTokens: 1000 },
    { path: 'structuredData.objectives', weight: 0.2, maxTokens: 500 }
  ],
  processing: {
    priority: 'high',
    triggerOn: ['create', 'update'],
    reembedOnFieldChange: ['structuredData.name', 'structuredData.description']
  }
}
```

### c_note (Medium Priority)

```typescript
{
  shardTypeId: 'c_note',
  enabled: true,
  fields: [
    { path: 'structuredData.name', weight: 0.3, maxTokens: 100 },
    { path: 'unstructuredData.text', weight: 0.7, maxTokens: 4000 }
  ],
  processing: {
    priority: 'medium',
    triggerOn: ['create', 'update'],
    reembedOnFieldChange: ['structuredData.name', 'unstructuredData.text']
  }
}
```

### c_opportunity (Medium Priority)

```typescript
{
  shardTypeId: 'c_opportunity',
  enabled: true,
  fields: [
    { path: 'structuredData.name', weight: 0.3, maxTokens: 100 },
    { path: 'structuredData.description', weight: 0.4, maxTokens: 500 },
    { path: 'structuredData.notes', weight: 0.3, maxTokens: 500 }
  ],
  processing: {
    priority: 'medium',
    triggerOn: ['create', 'update'],
    reembedOnFieldChange: ['structuredData.description', 'structuredData.notes']
  }
}
```

### c_contact (Low Priority)

```typescript
{
  shardTypeId: 'c_contact',
  enabled: true,
  fields: [
    { path: 'structuredData.name', weight: 0.5, maxTokens: 100 },
    { path: 'structuredData.title', weight: 0.2, maxTokens: 50 },
    { path: 'structuredData.notes', weight: 0.3, maxTokens: 300 }
  ],
  processing: {
    priority: 'low',
    triggerOn: ['create', 'update'],
    reembedOnFieldChange: ['structuredData.name', 'structuredData.notes']
  }
}
```

### c_company (Low Priority)

```typescript
{
  shardTypeId: 'c_company',
  enabled: true,
  fields: [
    { path: 'structuredData.name', weight: 0.4, maxTokens: 100 },
    { path: 'structuredData.description', weight: 0.4, maxTokens: 500 },
    { path: 'structuredData.industry', weight: 0.2, maxTokens: 50 }
  ],
  processing: {
    priority: 'low',
    triggerOn: ['create', 'update'],
    reembedOnFieldChange: ['structuredData.name', 'structuredData.description']
  }
}
```

---

## Queue Configuration

| Queue | Concurrency | Timeout | Retries | Backoff |
|-------|-------------|---------|---------|---------|
| `embedding-high` | 10 | 60s | 3 | Exponential (5s) |
| `embedding-medium` | 5 | 120s | 3 | Exponential (10s) |
| `embedding-low` | 2 | 300s | 5 | Exponential (30s) |

### ShardType → Queue Routing

| ShardType | Queue |
|-----------|-------|
| `c_document` | `embedding-high` |
| `c_project` | `embedding-high` |
| `c_note` | `embedding-medium` |
| `c_opportunity` | `embedding-medium` |
| `c_assistant` | `embedding-medium` |
| `c_contact` | `embedding-low` |
| `c_company` | `embedding-low` |
| Others | `embedding-medium` |

---

## Model Specifications

### text-embedding-ada-002

| Property | Value |
|----------|-------|
| Provider | Azure OpenAI |
| Dimensions | 1536 |
| Max Input Tokens | 8191 |
| Cost | $0.0001 / 1K tokens |

### text-embedding-3-small (Future)

| Property | Value |
|----------|-------|
| Provider | Azure OpenAI |
| Dimensions | 512 (default), 256-1536 |
| Max Input Tokens | 8191 |
| Cost | $0.00002 / 1K tokens |

---

## Rate Limits

| Resource | Limit | Scope |
|----------|-------|-------|
| Azure OpenAI | 1000 RPM | Account |
| Per Tenant | 100 RPM | Soft limit |
| Bulk Reembed API | 100 shards | Per request |

---

## Cache Keys

| Cache | Key Format | TTL |
|-------|------------|-----|
| Embedding | `emb:{tenantId}:{shardId}:{field}` | 24h |
| Budget | `budget:{tenantId}` | 1h |
| Search | `search:{tenantId}:{queryHash}` | 5m |

---

## Monitoring Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Overall health status |
| `GET /health/ready` | Readiness probe |
| `GET /health/live` | Liveness probe |
| `GET /metrics` | Prometheus metrics |
| `GET /api/v1/admin/embedding/stats` | Queue statistics |

---

**Last Updated**: November 2025

