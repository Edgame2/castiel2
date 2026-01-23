# AI Insights Container Architecture

## Overview

This document defines the complete Azure Cosmos DB container architecture for AI Insights advanced features. All new containers use dedicated containers (NOT shard types with `c_` prefix) for optimal performance, cost management, and scalability.

> **Important**: The `c_` prefix is reserved for shard types in the `c_shard` container only. New containers for AI Insights features do NOT use the `c_` prefix.

---

## Container Architecture

### Existing Containers (Unchanged)

| Container | Purpose | Partition Key |
|-----------|---------|---------------|
| **c_shard** | Core data with various shardTypes (`c_insight`, `c_assistant`, `c_context`, etc.) | HPK: `[tenantId, shardId]` |
| **c_conversation** | AI chat history and messages | HPK: `[tenantId, conversationId]` |
| **c_search** | Web search results and citations | HPK: `[tenantId, searchId]` |
| **recurring_searches** | Scheduled search configurations | `tenantId` |

### New Containers for AI Insights Advanced Features

| Container | Purpose | Partition Key (HPK) | Type Field Values |
|-----------|---------|---------------------|-------------------|
| **feedback** | User feedback & quality metrics | `[tenantId, insightId, userId]` | `user_feedback`, `quality_metric` |
| **learning** | ML patterns & improvement suggestions | `tenantId` | `pattern`, `improvement_suggestion` |
| **experiments** | A/B testing configs, assignments, events | `[tenantId, experimentId, userId]` | `config`, `assignment`, `event` |
| **media** | Media metadata (files in Blob Storage) | `[tenantId, scopeType, scopeId]` | `image`, `audio`, `video`, `document` |
| **collaboration** | Shares, comments, reactions | `[tenantId, insightId, userId]` | `share`, `comment`, `reaction`, `annotation` |
| **templates** | Insight templates & execution history | `[tenantId, templateId, executionDate]` | `config`, `execution` |
| **audit** | Immutable audit logs (compliance) | `[tenantId, datePartition, resourceId]` | `insight_audit`, `conversation_audit`, etc. |
| **graph** | Insight relationships & dependencies | `tenantId` | `relationship`, `dependency` |
| **exports** | Export history & metadata | `[tenantId, userId, exportId]` | `pdf`, `docx`, `csv`, `json`, `markdown` |
| **backups** | Backup/restore metadata | `tenantId` | `backup_job`, `recovery_point` |

---

## Detailed Container Specifications

### 1. Feedback Container

**Container Name**: `feedback`  
**Partition Key**: `[tenantId, insightId, userId]` (HPK)  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Collect user feedback and quality metrics

#### Document Schema

```typescript
interface FeedbackDocument {
  id: string;
  partitionKey: [string, string, string]; // [tenantId, insightId, userId]
  type: 'user_feedback' | 'quality_metric';
  tenantId: string;
  
  // Reference
  insightId: string;
  conversationId: string;
  messageId: string;
  
  // User feedback (type: 'user_feedback')
  userId?: string;
  rating?: 'thumbs_up' | 'thumbs_down' | 'neutral';
  issues?: Array<'incorrect_information' | 'incomplete_answer' | 'hallucination' | ...>;
  comment?: string;
  suggestedCorrection?: string;
  
  // Quality metrics (type: 'quality_metric')
  qualityScores?: {
    relevance: number;    // 0-1
    accuracy: number;
    completeness: number;
    groundingScore: number;
    overall: number;
  };
  
  // Resolution
  resolved: boolean;
  resolution?: {
    action: string;
    appliedAt: Date;
    notes: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

#### Container Configuration

```typescript
{
  id: 'feedback',
  partitionKey: {
    paths: ['/partitionKey/0', '/partitionKey/1', '/partitionKey/2'],
    kind: 'MultiHash',
    version: 2
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/type/*' },
      { path: '/insightId/*' },
      { path: '/rating/*' },
      { path: '/resolved/*' },
      { path: '/createdAt/*' }
    ],
    excludedPaths: [
      { path: '/comment/*' },
      { path: '/suggestedCorrection/*' }
    ]
  }
}
```

#### Query Patterns

```typescript
// Get all feedback for an insight
SELECT * FROM c 
WHERE c.partitionKey[0] = @tenantId 
  AND c.partitionKey[1] = @insightId
  AND c.type = 'user_feedback'

// Get user's feedback history
SELECT * FROM c 
WHERE c.partitionKey[0] = @tenantId
  AND c.partitionKey[2] = @userId
  AND c.type = 'user_feedback'

// Get quality metrics for insights
SELECT * FROM c 
WHERE c.partitionKey[0] = @tenantId
  AND c.type = 'quality_metric'
  AND c.qualityScores.overall < 0.7
```

---

### 2. Learning Container

**Container Name**: `learning`  
**Partition Key**: `tenantId`  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Store ML-detected patterns and improvement suggestions

#### Document Schema

```typescript
interface LearningDocument {
  id: string;
  partitionKey: string; // tenantId
  type: 'pattern' | 'improvement_suggestion';
  tenantId: string;
  
  // Pattern detection (type: 'pattern')
  patternType?: 'recurring_error' | 'user_correction' | 'low_quality_trend' | 'context_gap';
  patternName?: string;
  description?: string;
  frequency?: number;
  confidence?: number; // 0-1
  affectedInsights?: string[];
  
  // Improvement suggestion (type: 'improvement_suggestion')
  category?: 'context_template' | 'intent_classification' | 'model_config' | 'prompt_engineering';
  recommendation?: string;
  expectedImpact?: 'high' | 'medium' | 'low';
  implementationCost?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'approved' | 'implemented' | 'rejected';
  
  // Evidence
  evidenceCount: number;
  examples: Array<{
    insightId: string;
    feedback: string;
    timestamp: Date;
  }>;
  
  // Timestamps
  detectedAt: Date;
  lastUpdated: Date;
}
```

#### Container Configuration

```typescript
{
  id: 'learning',
  partitionKey: {
    paths: ['/partitionKey'],
    kind: 'Hash'
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/type/*' },
      { path: '/patternType/*' },
      { path: '/category/*' },
      { path: '/status/*' },
      { path: '/confidence/*' },
      { path: '/detectedAt/*' }
    ]
  }
}
```

---

### 3. Experiments Container

**Container Name**: `experiments`  
**Partition Key**: `[tenantId, experimentId, userId]` (HPK)  
**RU Strategy**: Autoscale, 400-2000 RU/s  
**Purpose**: A/B testing configurations, user assignments, and event tracking

#### Document Schema

```typescript
interface ExperimentDocument {
  id: string;
  partitionKey: [string, string, string]; // [tenantId, experimentId, userId]
  type: 'config' | 'assignment' | 'event';
  tenantId: string;
  experimentId: string;
  
  // Configuration (type: 'config', userId = 'config')
  name?: string;
  hypothesis?: string;
  variants?: Array<{
    id: string;
    name: string;
    config: any;
    allocation: number; // 0-1
  }>;
  metrics?: {
    primary: string;
    secondary: string[];
  };
  status?: 'draft' | 'active' | 'paused' | 'completed';
  
  // Assignment (type: 'assignment')
  userId?: string;
  variantId?: string;
  assignedAt?: Date;
  
  // Event (type: 'event')
  eventName?: string;
  eventValue?: number;
  metadata?: Record<string, any>;
  timestamp?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

#### Container Configuration

```typescript
{
  id: 'experiments',
  partitionKey: {
    paths: ['/partitionKey/0', '/partitionKey/1', '/partitionKey/2'],
    kind: 'MultiHash',
    version: 2
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/type/*' },
      { path: '/experimentId/*' },
      { path: '/status/*' },
      { path: '/variantId/*' },
      { path: '/eventName/*' },
      { path: '/timestamp/*' }
    ]
  }
}
```

---

### 4. Media Container

**Container Name**: `media`  
**Partition Key**: `[tenantId, scopeType, scopeId]` (HPK)  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Store metadata for images, audio, video, documents (actual files in Azure Blob Storage)

#### Document Schema

```typescript
interface MediaDocument {
  id: string;
  partitionKey: [string, string, string]; // [tenantId, scopeType, scopeId]
  type: 'image' | 'audio' | 'video' | 'document';
  tenantId: string;
  
  // Scope (project, conversation, insight, etc.)
  scopeType: 'project' | 'conversation' | 'insight' | 'shard';
  scopeId: string;
  
  // File metadata
  fileName: string;
  mimeType: string;
  size: number; // bytes
  blobUrl: string; // Azure Blob Storage URL
  thumbnailUrl?: string;
  
  // Analysis results (embedded)
  analysis?: {
    // Image analysis
    description?: string;
    tags?: string[];
    objects?: Array<{ label: string; confidence: number }>;
    ocrText?: string;
    
    // Audio/Video analysis
    transcript?: string;
    duration?: number;
    language?: string;
    
    // Document analysis
    extractedText?: string;
    pages?: number;
  };
  
  // Vector embedding for semantic search
  embedding?: number[];
  
  // Processing status
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  
  // Upload info
  uploadedBy: string;
  uploadedAt: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

#### Container Configuration

```typescript
{
  id: 'media',
  partitionKey: {
    paths: ['/partitionKey/0', '/partitionKey/1', '/partitionKey/2'],
    kind: 'MultiHash',
    version: 2
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/type/*' },
      { path: '/scopeType/*' },
      { path: '/processingStatus/*' },
      { path: '/uploadedBy/*' },
      { path: '/uploadedAt/*' }
    ],
    excludedPaths: [
      { path: '/analysis/*' },
      { path: '/embedding/*' }
    ]
  }
}
```

---

### 5. Collaboration Container

**Container Name**: `collaboration`  
**Partition Key**: `[tenantId, insightId, userId]` (HPK)  
**RU Strategy**: Autoscale, 400-2000 RU/s  
**Purpose**: Store shared insights, comments, reactions, annotations

#### Document Schema

```typescript
interface CollaborationDocument {
  id: string;
  partitionKey: [string, string, string]; // [tenantId, insightId, userId]
  type: 'share' | 'comment' | 'reaction' | 'annotation';
  tenantId: string;
  insightId: string;
  
  // Share (type: 'share')
  sharedBy?: string;
  sharedWith?: Array<{
    userId?: string;
    groupId?: string;
    permission: 'view' | 'comment' | 'edit';
  }>;
  shareUrl?: string;
  expiresAt?: Date;
  
  // Comment (type: 'comment')
  userId?: string;
  content?: string;
  replyTo?: string; // Comment ID
  mentions?: string[];
  edited?: boolean;
  
  // Reaction (type: 'reaction')
  emoji?: string;
  
  // Annotation (type: 'annotation')
  text?: string;
  highlight?: {
    start: number;
    end: number;
  };
  
  // Common fields
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 6. Templates Container

**Container Name**: `templates`  
**Partition Key**: `[tenantId, templateId, executionDate]` (HPK)  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Store reusable insight templates and execution history

#### Document Schema

```typescript
interface TemplateDocument {
  id: string;
  partitionKey: [string, string, string]; // [tenantId, templateId, executionDate]
  type: 'config' | 'execution';
  tenantId: string;
  templateId: string;
  
  // Configuration (type: 'config', executionDate = 'config')
  name?: string;
  description?: string;
  category?: 'risk' | 'status' | 'forecast' | 'analysis' | 'comparison';
  promptTemplate?: string;
  variables?: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: any;
  }>;
  
  // Scheduling
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  
  // Execution (type: 'execution')
  executionDate?: string; // ISO date for partition
  variables?: Record<string, any>;
  resultInsightId?: string;
  status?: 'success' | 'failed';
  error?: string;
  duration?: number;
  
  // Access control
  visibility: 'private' | 'team' | 'tenant';
  createdBy: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 7. Audit Container

**Container Name**: `audit`  
**Partition Key**: `[tenantId, datePartition, resourceId]` (HPK)  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Immutable audit logs for compliance (7-year retention)

#### Document Schema

```typescript
interface AuditDocument {
  id: string;
  partitionKey: [string, string, string]; // [tenantId, datePartition, resourceId]
  type: 'insight_audit' | 'conversation_audit' | 'search_audit' | 'template_audit';
  tenantId: string;
  
  // Date partition (format: 'YYYY-MM' for monthly partitions)
  datePartition: string;
  
  // Resource reference
  resourceType: 'insight' | 'conversation' | 'search' | 'template';
  resourceId: string;
  
  // Action performed
  action: 'create' | 'read' | 'update' | 'delete' | 'share' | 'execute';
  
  // Actor
  userId: string;
  userAgent: string;
  ipAddress: string;
  
  // Generation details (for insights)
  generation?: {
    modelUsed: string;
    modelVersion: string;
    promptVersion: string;
    temperature: number;
    actualTokens: {
      input: number;
      output: number;
      total: number;
    };
  };
  
  // Context used
  contextUsed?: Array<{
    shardId: string;
    shardType: string;
    relevanceScore: number;
  }>;
  
  // Quality & grounding
  quality?: {
    relevance: number;
    accuracy: number;
    completeness: number;
    groundingScore: number;
  };
  
  // Reproducibility
  reproducible: boolean;
  reproducibilityHash?: string;
  
  // Performance
  performance?: {
    totalDuration: number;
    contextAssemblyDuration: number;
    modelInferenceDuration: number;
  };
  
  // Cost
  cost?: {
    modelCost: number;
    totalCost: number;
  };
  
  // Timestamp (immutable)
  timestamp: Date;
}
```

#### Container Configuration

```typescript
{
  id: 'audit',
  partitionKey: {
    paths: ['/partitionKey/0', '/partitionKey/1', '/partitionKey/2'],
    kind: 'MultiHash',
    version: 2
  },
  defaultTtl: 220752000, // 7 years in seconds
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/type/*' },
      { path: '/resourceType/*' },
      { path: '/action/*' },
      { path: '/userId/*' },
      { path: '/timestamp/*' }
    ]
  }
}
```

---

### 8. Graph Container

**Container Name**: `graph`  
**Partition Key**: `tenantId`  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Store insight relationships and dependencies

#### Document Schema

```typescript
interface GraphDocument {
  id: string;
  partitionKey: string; // tenantId
  type: 'relationship' | 'dependency';
  tenantId: string;
  
  // Source insight
  sourceInsightId: string;
  
  // Relationships
  relationships: Array<{
    targetInsightId: string;
    relationshipType: 'follows' | 'references' | 'updates' | 'contradicts' | 'supports';
    strength: number; // 0-1
    createdAt: Date;
  }>;
  
  // Graph representation
  graph: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: string;
      weight: number;
    }>;
  };
  
  // Impact tracking
  impact: {
    directDependents: number;
    indirectDependents: number;
    totalImpactScore: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 9. Exports Container

**Container Name**: `exports`  
**Partition Key**: `[tenantId, userId, exportId]` (HPK)  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Track export jobs and history

#### Document Schema

```typescript
interface ExportDocument {
  id: string;
  partitionKey: [string, string, string]; // [tenantId, userId, exportId]
  type: 'pdf' | 'docx' | 'csv' | 'json' | 'markdown';
  tenantId: string;
  
  // Export details
  exportType: string;
  scope: {
    conversationIds?: string[];
    insightIds?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  
  // Configuration
  config: {
    includeContext: boolean;
    includeCitations: boolean;
    includeAudit: boolean;
    template?: string;
  };
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  
  // Output
  output?: {
    url: string;
    fileName: string;
    size: number;
    expiresAt: Date;
  };
  
  // Error
  error?: {
    code: string;
    message: string;
  };
  
  // Metadata
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
}
```

---

### 10. Backups Container

**Container Name**: `backups`  
**Partition Key**: `tenantId`  
**RU Strategy**: Manual, 400 RU/s  
**Purpose**: Store backup and recovery point metadata

#### Document Schema

```typescript
interface BackupDocument {
  id: string;
  partitionKey: string; // tenantId
  type: 'backup_job' | 'recovery_point';
  tenantId: string;
  
  // Backup job (type: 'backup_job')
  backupType?: 'full' | 'incremental';
  status?: 'pending' | 'running' | 'completed' | 'failed';
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  
  // Recovery point (type: 'recovery_point')
  backupId?: string;
  timestamp?: Date;
  content?: {
    tenants: string[];
    containers: string[];
    itemCount: number;
    size: number;
  };
  
  // Storage
  storage?: {
    location: string;
    encryption: boolean;
    compressed: boolean;
    checksum: string;
  };
  
  // Verification
  verified: boolean;
  verifiedAt?: Date;
  canRestore: boolean;
  expiresAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Cost Optimization Strategy

### Container Tiers

**HOT Containers** (Autoscale, 1000-10000 RU/s):
- `c_shard` - Active insights
- `c_conversation` - Active chats
- `collaboration` - Real-time comments/reactions
- `experiments` - Active A/B tests

**WARM Containers** (Manual, 400 RU/s):
- `feedback` - User feedback
- `templates` - Template execution
- `media` - Media metadata

**COLD Containers** (Manual, 400 RU/s, with TTL):
- `audit` - Compliance logs (7-year TTL)
- `learning` - Background jobs
- `graph` - Relationship graph

### Estimated Monthly Cost

| Tier | Containers | RU/s | Est. Cost/Month |
|------|----------|------|-----------------|
| HOT (existing) | c_shard, c_conversation | 1000-10000 (autoscale) | $600 |
| HOT (new) | collaboration, experiments | 400-2000 (autoscale) | $150 |
| WARM | feedback, templates, media | 400 (manual) x 3 | $100 |
| COLD | audit, learning, graph | 400 (manual) x 3 | $100 |
| COLD | exports, backups | 400 (manual) x 2 | $70 |
| **TOTAL** | **10 new containers** | | **~$1,020/month** |

---

## Cross-Container Query Patterns

### 1. Insight with All Related Data

```typescript
async function getInsightWithMetadata(insightId: string, tenantId: string) {
  // Parallel queries across containers
  const [insight, feedback, audit, relationships] = await Promise.all([
    // From c_shard
    shardContainer.item(insightId, [tenantId, insightId]).read(),
    
    // From feedback
    feedbackContainer.items.query({
      query: 'SELECT * FROM c WHERE c.partitionKey[0] = @tenantId AND c.partitionKey[1] = @insightId',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@insightId', value: insightId }
      ]
    }).fetchAll(),
    
    // From audit
    auditContainer.items.query({
      query: 'SELECT * FROM c WHERE c.partitionKey[0] = @tenantId AND c.resourceId = @insightId',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@insightId', value: insightId }
      ]
    }).fetchAll(),
    
    // From graph
    graphContainer.items.query({
      query: 'SELECT * FROM c WHERE c.partitionKey = @tenantId AND c.sourceInsightId = @insightId',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@insightId', value: insightId }
      ]
    }).fetchAll()
  ]);
  
  return {
    insight: insight.resource,
    feedback: feedback.resources,
    audit: audit.resources,
    relationships: relationships.resources
  };
}
```

### 2. Using Change Feed for Denormalization

```typescript
// Listen to feedback container changes
const feedbackChangeFeed = feedbackContainer.items.changeFeed({
  startFromBeginning: true
});

for await (const change of feedbackChangeFeed.getIterator()) {
  for (const item of change.result) {
    if (item.type === 'user_feedback') {
      // Update aggregated feedback in c_shard
      await shardContainer.item(item.insightId, [item.tenantId, item.insightId])
        .patch([
          { op: 'incr', path: '/feedbackCount', value: 1 },
          { op: 'set', path: '/lastFeedback', value: item.createdAt }
        ]);
    }
  }
}
```

---

## Migration from ShardTypes to Containers

### Migration Strategy

For features currently documented as ShardTypes (with `c_` prefix), the migration path is:

1. **Create new containers** with proper partition keys
2. **Migrate data** from `c_shard` to new containers
3. **Update application code** to use new containers
4. **Keep both during transition** for rollback capability
5. **Delete from c_shard** once migration is verified

### Example Migration Script

```typescript
async function migrateFeedbackFromShards() {
  // 1. Read all c_insightFeedback from c_shard
  const feedbackShards = await shardContainer.items.query({
    query: 'SELECT * FROM c WHERE c.shardType = "c_insightFeedback"'
  }).fetchAll();
  
  // 2. Write to new feedback container
  for (const shard of feedbackShards.resources) {
    const feedbackDoc = {
      id: shard.id,
      partitionKey: [shard.tenantId, shard.insightId, shard.userId],
      type: 'user_feedback',
      tenantId: shard.tenantId,
      insightId: shard.insightId,
      // ... map other fields
      createdAt: shard.createdAt,
      updatedAt: new Date()
    };
    
    await feedbackContainer.items.create(feedbackDoc);
  }
  
  // 3. Verify migration
  const migratedCount = await feedbackContainer.items.query({
    query: 'SELECT VALUE COUNT(1) FROM c WHERE c.type = "user_feedback"'
  }).fetchAll();
  
  console.log(`Migrated ${migratedCount.resources[0]} feedback records`);
  
  // 4. Optional: Delete from c_shard after verification
  // Only do this after extensive testing!
}
```

---

## Best Practices

### 1. Partition Key Design
- **Use HPK** for containers with >20GB per logical partition
- **Include tenantId** as first level for tenant isolation
- **Add time-based keys** for audit/time-series data
- **Consider query patterns** when designing HPK

### 2. Indexing
- **Index only queried fields** to reduce RU costs
- **Exclude large text fields** (comments, descriptions)
- **Exclude arrays of embeddings** (large vector fields)

### 3. TTL (Time-To-Live)
- **Enable TTL** for audit logs (7-year compliance)
- **Use per-item TTL** for temporary data (export URLs)
- **No RU cost** for automatic deletions

### 4. Monitoring
- **Monitor partition usage** via Azure Monitor
- **Track 429 throttling** by partition
- **Set up alerts** for hot partitions (>70% RU usage)
- **Review cost reports** monthly

### 5. Security
- **Enable RBAC** at container level
- **Use managed identities** for access
- **Encrypt sensitive fields** before storage
- **Audit all access** via Azure Monitor logs

---

## Related Documentation

- [AI Insights README](../ai-insights/README.md)
- [Feedback & Learning](../ai-insights/FEEDBACK-LEARNING.md)
- [A/B Testing](../ai-insights/AB-TESTING.md)
- [Advanced Features Extended](../ai-insights/ADVANCED-FEATURES-EXTENDED.md)
- [Advanced Features Part 2](../ai-insights/ADVANCED-FEATURES-PART2.md)

---

**Last Updated**: December 5, 2025  
**Version**: 2.0.0  
**Status**: Container Architecture Finalized
