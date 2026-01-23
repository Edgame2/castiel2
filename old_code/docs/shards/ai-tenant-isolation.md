# AI Best Practices: Tenant Isolation

## Overview

Castiel is a multi-tenant platform where AI insights are generated from Shard data. This document outlines best practices for obtaining **optimal AI results** while maintaining **strict tenant isolation**.

> **Golden Rule**: A tenant's data must NEVER influence, appear in, or be accessible to another tenant's AI operations.

---

## Table of Contents

1. [Isolation Architecture](#isolation-architecture)
2. [Context Assembly Rules](#context-assembly-rules)
3. [Vector Search Isolation](#vector-search-isolation)
4. [Prompt Engineering](#prompt-engineering)
5. [Caching Strategies](#caching-strategies)
6. [Enrichment Isolation](#enrichment-isolation)
7. [Assistant Configuration](#assistant-configuration)
8. [Audit & Compliance](#audit--compliance)
9. [Performance vs Isolation Trade-offs](#performance-vs-isolation-trade-offs)

---

## Isolation Architecture

### Partition-First Design

All AI operations must be scoped to a single tenant:

```
┌─────────────────────────────────────────────────────────────┐
│                    AI REQUEST                               │
│                                                             │
│  User: "Summarize Project Alpha"                            │
│  tenantId: tenant-123                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              TENANT ISOLATION LAYER                         │
│                                                             │
│  ✓ Validate tenantId from auth token                        │
│  ✓ Inject tenantId into all queries                         │
│  ✓ Filter all data by tenantId                              │
│  ✓ Log operation with tenantId                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              CONTEXT ASSEMBLY                               │
│                                                             │
│  Only shards where tenantId = tenant-123                    │
│  Only relationships within tenant-123                       │
│  Only vectors from tenant-123                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              AI PROCESSING                                  │
│                                                             │
│  Prompt: Context + User Question                            │
│  No tenant identifiers in prompt                            │
│  Response cached with tenantId key                          │
└─────────────────────────────────────────────────────────────┘
```

### Isolation Checkpoints

| Checkpoint | Validation |
|------------|------------|
| **Authentication** | Extract tenantId from JWT, reject if missing |
| **Query Layer** | Append `WHERE tenantId = ?` to ALL queries |
| **Relationship Traversal** | Verify target Shard has same tenantId |
| **Vector Search** | Filter results by tenantId |
| **Cache Keys** | Include tenantId in all cache keys |
| **Audit Logs** | Record tenantId for every AI operation |

---

## Context Assembly Rules

### Rule 1: Start from Verified Shard

Always begin context assembly from a Shard the user has access to:

```typescript
async function assembleContext(
  shardId: string,
  tenantId: string,  // From auth context, NOT from request
  userId: string
): Promise<AIContext> {
  // 1. Fetch the starting shard
  const shard = await getShard(shardId, tenantId);
  
  // 2. Verify ownership
  if (shard.tenantId !== tenantId) {
    throw new ForbiddenError('Cross-tenant access denied');
  }
  
  // 3. Check user permissions
  if (!hasAccess(shard, userId)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  
  // 4. Begin context assembly (tenant-scoped)
  return buildContext(shard, tenantId);
}
```

### Rule 2: Tenant-Scoped Relationship Traversal

When following relationships, ALWAYS verify tenant boundaries:

```typescript
async function traverseRelationships(
  shard: Shard,
  tenantId: string,
  depth: number = 2
): Promise<Shard[]> {
  const relatedShards: Shard[] = [];
  
  for (const rel of shard.internal_relationships) {
    // CRITICAL: Verify same tenant before fetching
    const related = await getShard(rel.targetShardId, tenantId);
    
    // Double-check tenant (defense in depth)
    if (related && related.tenantId === tenantId) {
      relatedShards.push(related);
      
      // Recursive traversal (with depth limit)
      if (depth > 1) {
        const nested = await traverseRelationships(related, tenantId, depth - 1);
        relatedShards.push(...nested);
      }
    }
  }
  
  return relatedShards;
}
```

### Rule 3: Limit Context Size Intelligently

Balance context richness with relevance:

```typescript
interface ContextLimits {
  maxShards: number;           // Max shards to include
  maxTokens: number;           // Max total tokens
  maxDepth: number;            // Max relationship depth
  priorityFields: string[];    // Fields to prioritize
  recencyWeight: number;       // Weight recent items higher
}

const DEFAULT_LIMITS: ContextLimits = {
  maxShards: 50,
  maxTokens: 8000,
  maxDepth: 2,
  priorityFields: ['name', 'description', 'summary', 'content'],
  recencyWeight: 0.3
};
```

### Rule 4: Prioritize by Relevance

Not all related Shards are equally important:

```typescript
function prioritizeContext(
  shards: Shard[],
  centralShard: Shard,
  userQuery: string
): ScoredShard[] {
  return shards.map(shard => ({
    shard,
    score: calculateRelevance(shard, centralShard, userQuery)
  }))
  .sort((a, b) => b.score - a.score);
}

function calculateRelevance(
  shard: Shard,
  central: Shard,
  query: string
): number {
  let score = 0;
  
  // Relationship type weight
  const relType = findRelationshipType(central, shard);
  score += RELATIONSHIP_WEIGHTS[relType] || 0.5;
  
  // Recency weight
  const daysSinceUpdate = daysBetween(shard.updatedAt, new Date());
  score += Math.max(0, 1 - (daysSinceUpdate / 30)) * 0.3;
  
  // Query keyword overlap
  const queryTerms = tokenize(query.toLowerCase());
  const shardText = extractText(shard).toLowerCase();
  const overlap = queryTerms.filter(t => shardText.includes(t)).length;
  score += (overlap / queryTerms.length) * 0.4;
  
  return score;
}

const RELATIONSHIP_WEIGHTS = {
  'has_client': 1.0,
  'has_stakeholder': 0.9,
  'has_opportunity': 0.85,
  'has_document': 0.8,
  'has_note': 0.7,
  'related_to': 0.5
};
```

---

## Vector Search Isolation

### Approach 1: Partition Key Filtering (Recommended)

Include tenantId as a filter in vector search:

```typescript
async function semanticSearch(
  query: string,
  tenantId: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  
  // Search with tenant filter
  const results = await vectorIndex.search({
    vector: queryEmbedding,
    filter: {
      tenantId: tenantId  // CRITICAL: Always filter by tenant
    },
    topK: options.limit || 10,
    minScore: options.minScore || 0.7
  });
  
  return results;
}
```

### Approach 2: Tenant-Specific Indexes (High Isolation)

For maximum isolation, maintain separate vector indexes per tenant:

```typescript
// For high-value/regulated tenants
async function getTenantVectorIndex(tenantId: string): Promise<VectorIndex> {
  const indexName = `vectors_${tenantId}`;
  
  // Check if tenant has dedicated index
  if (await indexExists(indexName)) {
    return getIndex(indexName);
  }
  
  // Fall back to shared index with filtering
  return getSharedIndex();
}
```

**Trade-offs:**

| Approach | Isolation | Cost | Performance |
|----------|-----------|------|-------------|
| Filtered shared index | Good | Low | Fast |
| Per-tenant indexes | Maximum | High | Variable |
| Hybrid (large tenants separate) | Excellent | Medium | Optimized |

### Approach 3: Hybrid Strategy

```typescript
const LARGE_TENANT_THRESHOLD = 100000; // Shards

async function getVectorSearchStrategy(tenantId: string): Promise<SearchStrategy> {
  const shardCount = await getTenantShardCount(tenantId);
  
  if (shardCount > LARGE_TENANT_THRESHOLD) {
    return {
      type: 'dedicated_index',
      indexName: `vectors_${tenantId}`
    };
  }
  
  return {
    type: 'shared_filtered',
    indexName: 'vectors_shared',
    filter: { tenantId }
  };
}
```

---

## Prompt Engineering

### Rule 1: Never Include Tenant Identifiers in Prompts

```typescript
// ❌ BAD: Tenant ID in prompt
const prompt = `
  Tenant: tenant-123
  Analyze data for Acme Corporation...
`;

// ✅ GOOD: No tenant identifiers
const prompt = `
  Analyze the following project data and provide insights...
`;
```

### Rule 2: Sanitize All Data Before Including in Prompts

```typescript
function sanitizeForPrompt(shard: Shard): SanitizedData {
  return {
    // Include business data
    name: shard.structuredData.name,
    description: shard.structuredData.description,
    // ... other fields
    
    // EXCLUDE system identifiers
    // id: shard.id,              // Don't include
    // tenantId: shard.tenantId,  // Don't include
    // userId: shard.userId,      // Don't include
  };
}
```

### Rule 3: Structure Prompts for Optimal Results

```typescript
function buildProjectInsightPrompt(
  project: Shard,
  context: ContextData,
  assistant: AssistantConfig,
  userQuery: string
): string {
  return `
${assistant.systemPrompt}

## Context

### Project Overview
Name: ${project.structuredData.name}
Status: ${project.structuredData.status}
Description: ${project.structuredData.description}

### Client Information
${formatCompanyContext(context.company)}

### Key Stakeholders
${formatStakeholders(context.contacts)}

### Related Opportunity
${formatOpportunity(context.opportunity)}

### Recent Activity (Last 30 days)
${formatRecentNotes(context.notes)}

### Key Documents
${formatDocumentSummaries(context.documents)}

---

## User Question
${userQuery}

## Instructions
Provide a comprehensive answer based ONLY on the context provided above.
If the context doesn't contain enough information to answer, say so.
Do not make up information that isn't in the context.
`.trim();
}
```

### Rule 4: Use System Prompts for Tenant-Specific Behavior

Instead of putting tenant info in prompts, configure behavior via `c_assistant`:

```typescript
// Assistant configuration (stored per tenant)
const salesAssistant = {
  name: "Sales Coach",
  systemPrompt: `You are a sales coach for a B2B software company.
Focus on enterprise sales strategies.
Always consider: deal value, stakeholder alignment, competitive positioning.
Response style: professional, actionable, data-driven.`,
  
  // Tenant can customize without exposing tenant ID
  focusAreas: ["Enterprise B2B", "SaaS", "Technical sales"],
  constraints: ["Don't discuss pricing below $50K deals"]
};
```

---

## Caching Strategies

### Tenant-Scoped Cache Keys

ALL cache keys must include tenantId:

```typescript
const CACHE_KEYS = {
  // Shard cache
  shard: (tenantId: string, shardId: string) => 
    `shard:${tenantId}:${shardId}`,
  
  // AI response cache
  aiResponse: (tenantId: string, promptHash: string) => 
    `ai:${tenantId}:${promptHash}`,
  
  // Embedding cache
  embedding: (tenantId: string, shardId: string, field: string) => 
    `emb:${tenantId}:${shardId}:${field}`,
  
  // Search results cache
  searchResults: (tenantId: string, queryHash: string) => 
    `search:${tenantId}:${queryHash}`,
  
  // Context assembly cache
  context: (tenantId: string, shardId: string, depth: number) => 
    `ctx:${tenantId}:${shardId}:${depth}`
};
```

### Cache Invalidation

When a Shard changes, invalidate related caches:

```typescript
async function invalidateTenantCaches(
  tenantId: string,
  shardId: string
): Promise<void> {
  // Invalidate shard cache
  await cache.del(CACHE_KEYS.shard(tenantId, shardId));
  
  // Invalidate embedding cache
  await cache.del(CACHE_KEYS.embedding(tenantId, shardId, '*'));
  
  // Invalidate context caches that might include this shard
  await cache.delPattern(`ctx:${tenantId}:*`);
  
  // Invalidate search results (they might include this shard)
  await cache.delPattern(`search:${tenantId}:*`);
  
  // Note: AI response cache can be kept (prompts are deterministic)
}
```

### Response Caching Strategy

Cache AI responses for identical queries within a tenant:

```typescript
async function getCachedOrGenerateResponse(
  tenantId: string,
  prompt: string,
  options: AIOptions
): Promise<AIResponse> {
  const promptHash = hash(prompt + JSON.stringify(options));
  const cacheKey = CACHE_KEYS.aiResponse(tenantId, promptHash);
  
  // Check cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  
  // Generate new response
  const response = await generateAIResponse(prompt, options);
  
  // Cache with TTL (e.g., 1 hour)
  await cache.set(cacheKey, response, { ttl: 3600 });
  
  return { ...response, fromCache: false };
}
```

---

## Enrichment Isolation

### Per-Tenant Enrichment Jobs

Enrichment jobs must be tenant-scoped:

```typescript
interface EnrichmentJob {
  id: string;
  tenantId: string;      // Always required
  shardId: string;
  shardTypeId: string;
  processors: string[];
  priority: number;
  createdAt: Date;
}

async function processEnrichmentJob(job: EnrichmentJob): Promise<void> {
  // Verify tenant context
  const shard = await getShard(job.shardId, job.tenantId);
  
  if (!shard || shard.tenantId !== job.tenantId) {
    throw new Error('Tenant mismatch in enrichment job');
  }
  
  // Get tenant-specific enrichment config
  const config = await getTenantEnrichmentConfig(job.tenantId);
  
  // Process with tenant's budget limits
  await processWithLimits(shard, config);
}
```

### Budget Isolation

Track AI costs per tenant:

```typescript
interface TenantAIBudget {
  tenantId: string;
  dailyLimit: number;      // USD
  monthlyLimit: number;    // USD
  currentDayUsage: number;
  currentMonthUsage: number;
}

async function checkBudget(
  tenantId: string,
  estimatedCost: number
): Promise<boolean> {
  const budget = await getTenantBudget(tenantId);
  
  if (budget.currentDayUsage + estimatedCost > budget.dailyLimit) {
    throw new BudgetExceededError('Daily AI budget exceeded');
  }
  
  if (budget.currentMonthUsage + estimatedCost > budget.monthlyLimit) {
    throw new BudgetExceededError('Monthly AI budget exceeded');
  }
  
  return true;
}
```

---

## Assistant Configuration

### Tenant-Specific Assistants

Each tenant can have custom AI assistants:

```typescript
// Global assistants (c_assistant with isGlobal: true)
// - Available to all tenants as templates
// - Cannot be modified by tenants

// Tenant assistants (c_assistant with isGlobal: false)
// - Created by tenant admins
// - Fully customizable
// - Isolated to tenant
```

### Assistant Selection Hierarchy

```typescript
async function selectAssistant(
  tenantId: string,
  projectId?: string,
  preferredAssistantId?: string
): Promise<AssistantConfig> {
  // 1. User-specified assistant
  if (preferredAssistantId) {
    const assistant = await getAssistant(preferredAssistantId, tenantId);
    if (assistant) return assistant;
  }
  
  // 2. Project-specific assistant
  if (projectId) {
    const project = await getShard(projectId, tenantId);
    const projectAssistant = project.internal_relationships
      .find(r => r.relationshipType === 'uses_assistant');
    
    if (projectAssistant) {
      const assistant = await getAssistant(projectAssistant.targetShardId, tenantId);
      if (assistant) return assistant;
    }
  }
  
  // 3. Tenant default assistant
  const tenantDefault = await getTenantDefaultAssistant(tenantId);
  if (tenantDefault) return tenantDefault;
  
  // 4. Global default assistant
  return getGlobalDefaultAssistant();
}
```

---

## Audit & Compliance

### Comprehensive Logging

Log all AI operations for compliance:

```typescript
interface AIAuditLog {
  id: string;
  tenantId: string;
  userId: string;
  operation: 'insight' | 'search' | 'enrichment' | 'embedding';
  
  // Context
  shardIds: string[];         // Shards included in context
  assistantId?: string;       // Assistant used
  
  // Request
  userQuery?: string;
  promptTokens: number;
  
  // Response
  completionTokens: number;
  responseLength: number;
  
  // Cost
  estimatedCost: number;
  model: string;
  
  // Timing
  startedAt: Date;
  completedAt: Date;
  duration: number;
  
  // Status
  status: 'success' | 'error' | 'budget_exceeded';
  errorMessage?: string;
}

async function logAIOperation(log: AIAuditLog): Promise<void> {
  // Store in audit log (partitioned by tenantId)
  await auditCollection.create({
    ...log,
    partitionKey: log.tenantId
  });
  
  // Update metrics
  await updateTenantMetrics(log.tenantId, {
    aiOperations: 1,
    tokens: log.promptTokens + log.completionTokens,
    cost: log.estimatedCost
  });
}
```

### Data Retention

Tenant-specific retention policies:

```typescript
interface TenantRetentionPolicy {
  tenantId: string;
  aiLogsRetention: number;     // Days to keep AI logs
  embeddingsRetention: number; // Days to keep embeddings
  cacheRetention: number;      // Hours for cache TTL
}

// Default: 90 days for logs, 365 days for embeddings
// Enterprise tenants may have longer retention
```

---

## Performance vs Isolation Trade-offs

### Optimization Strategies

| Strategy | Isolation | Performance | Recommendation |
|----------|-----------|-------------|----------------|
| Shared vector index + filter | Good | Excellent | Default for most tenants |
| Per-tenant vector index | Maximum | Good | Large/regulated tenants |
| Shared embedding model | Good | Excellent | Default |
| Fine-tuned model per tenant | Maximum | Variable | Not recommended (cost) |
| Shared cache + tenant keys | Excellent | Excellent | Always use |
| No caching | Maximum | Poor | Not recommended |

### Recommended Configuration

```typescript
const AI_CONFIG = {
  // Vector search
  vectorSearch: {
    strategy: 'shared_filtered',  // Use shared index with tenant filter
    dedicatedThreshold: 100000,   // Dedicated index for large tenants
  },
  
  // Embeddings
  embeddings: {
    model: 'text-embedding-ada-002',  // Shared model
    batchSize: 100,
    cacheEnabled: true,
    cacheTTL: 86400  // 24 hours
  },
  
  // Context assembly
  context: {
    maxDepth: 2,
    maxShards: 50,
    maxTokens: 8000,
    cacheEnabled: true,
    cacheTTL: 300  // 5 minutes
  },
  
  // Response generation
  generation: {
    model: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.7,
    cacheEnabled: true,
    cacheTTL: 3600  // 1 hour
  }
};
```

---

## Checklist for AI Operations

Before shipping any AI feature, verify:

### Isolation
- [ ] TenantId from auth token (not request body)
- [ ] All queries include tenant filter
- [ ] Relationship traversal checks tenant boundaries
- [ ] Vector search filtered by tenant
- [ ] Cache keys include tenantId
- [ ] No tenant identifiers in prompts
- [ ] Audit logs include tenantId

### Quality
- [ ] Context prioritization implemented
- [ ] Relevant shards selected (not just all)
- [ ] Recent data weighted higher
- [ ] Prompt structured for clarity
- [ ] Assistant configuration applied
- [ ] Response validated for relevance

### Performance
- [ ] Caching enabled with tenant keys
- [ ] Context size limits enforced
- [ ] Embeddings cached
- [ ] Batch operations where possible

### Compliance
- [ ] AI operations logged
- [ ] Cost tracking per tenant
- [ ] Budget limits enforced
- [ ] Retention policies applied

---

## Summary

**Key Principles:**

1. **Tenant ID from Auth**: Never trust tenantId from request body
2. **Filter Everything**: Every query must include tenant filter
3. **Verify Boundaries**: Check tenant match on every relationship traversal
4. **Sanitize Prompts**: No system identifiers in AI prompts
5. **Tenant-Scoped Caching**: All cache keys include tenantId
6. **Audit Everything**: Log all AI operations with tenant context
7. **Budget Per Tenant**: Track and limit AI costs per tenant

Following these practices ensures optimal AI results while maintaining the trust and security of multi-tenant isolation.

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team






