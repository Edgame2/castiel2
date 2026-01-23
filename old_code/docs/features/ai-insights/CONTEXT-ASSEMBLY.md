# Context Assembly

## Overview

Context Assembly is the process of gathering, prioritizing, and formatting relevant data for AI insights. It uses `c_contextTemplate` definitions to determine what data to include, how to traverse relationships, and how to fit within token budgets.

> **Goal**: Assemble the most relevant context possible within token limits to produce accurate, grounded insights.

---

## Assembly Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONTEXT ASSEMBLY PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input: IntentAnalysisResult + UserContext                                  │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. TEMPLATE SELECTION                                               │   │
│  │     • Match intent + scope to template                               │   │
│  │     • Check user/tenant overrides                                    │   │
│  │     • Fall back to system templates                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2. PERMISSION FILTERING                                             │   │
│  │     • Apply user's access permissions                                │   │
│  │     • Filter by tenant boundary                                      │   │
│  │     • Respect field-level security                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  3. PRIMARY SHARD FETCH                                              │   │
│  │     • Get the main shard (project, company, opportunity)             │   │
│  │     • Apply field selection from template                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  4. RELATIONSHIP TRAVERSAL                                           │   │
│  │     • Follow internal_relationships by template config               │   │
│  │     • Respect depth limits                                           │   │
│  │     • Apply relationship type filters                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  5. RAG RETRIEVAL (Optional)                                         │   │
│  │     • Semantic search on embeddings                                  │   │
│  │     • Retrieve relevant chunks                                       │   │
│  │     • Score by similarity                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  6. RANKING & PRIORITIZATION                                         │   │
│  │     • Score each piece of context                                    │   │
│  │     • Apply template priority weights                                │   │
│  │     • Consider recency, relevance, importance                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  7. TOKEN BUDGETING                                                  │   │
│  │     • Estimate tokens per context piece                              │   │
│  │     • Fit within model's context window                              │   │
│  │     • Reserve space for response                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  8. FORMATTING                                                       │   │
│  │     • Structure context for prompt                                   │   │
│  │     • Add metadata (freshness, sources)                              │   │
│  │     • Apply template format rules                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  Output: AssembledContext                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Template Selection

### Selection Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TEMPLATE SELECTION HIERARCHY                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ASSISTANT-SPECIFIC TEMPLATE                                             │
│     └── c_assistant.defaultTemplateId                                       │
│         ↓ (not set)                                                         │
│                                                                             │
│  2. SHARD-SPECIFIC TEMPLATE                                                 │
│     └── Target shard has relationship to c_contextTemplate                  │
│         ↓ (not found)                                                       │
│                                                                             │
│  3. INTENT + SCOPE MATCH                                                    │
│     └── Template where:                                                     │
│         • applicableInsightTypes includes current intent                    │
│         • applicableShardTypes includes target shard type                   │
│         • scope matches (project, company, tenant-wide)                     │
│         ↓ (not found)                                                       │
│                                                                             │
│  4. SHARDTYPE DEFAULT                                                       │
│     └── Template marked isDefault for this ShardType                        │
│         ↓ (not found)                                                       │
│                                                                             │
│  5. SYSTEM FALLBACK                                                         │
│     └── Generic system template (always exists)                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Template Matching

```typescript
interface TemplateMatchCriteria {
  // Intent matching
  insightType: InsightType;
  insightSubtype?: string;
  
  // Scope matching
  scopeType: 'single_shard' | 'project' | 'company' | 'tenant_wide' | 'time_based';
  primaryShardType?: string;
  
  // Context
  assistantId?: string;
  targetShardId?: string;
  tenantId: string;
}

async function selectTemplate(
  criteria: TemplateMatchCriteria
): Promise<ContextTemplate> {
  
  // 1. Check assistant-specific template
  if (criteria.assistantId) {
    const assistant = await getAssistant(criteria.assistantId);
    if (assistant.defaultTemplateId) {
      const template = await getTemplate(assistant.defaultTemplateId);
      if (template && isApplicable(template, criteria)) {
        return template;
      }
    }
  }
  
  // 2. Check shard-specific template
  if (criteria.targetShardId) {
    const shardTemplate = await findShardTemplate(criteria.targetShardId);
    if (shardTemplate) {
      return shardTemplate;
    }
  }
  
  // 3. Find by intent + scope
  const matchingTemplates = await findTemplates({
    tenantId: criteria.tenantId,
    insightTypes: [criteria.insightType],
    shardTypes: criteria.primaryShardType ? [criteria.primaryShardType] : undefined,
    isActive: true,
  });
  
  // Score and rank matches
  const scored = matchingTemplates.map(t => ({
    template: t,
    score: calculateMatchScore(t, criteria),
  }));
  
  const bestMatch = scored.sort((a, b) => b.score - a.score)[0];
  if (bestMatch && bestMatch.score > 0.5) {
    return bestMatch.template;
  }
  
  // 4. ShardType default
  if (criteria.primaryShardType) {
    const defaultTemplate = await findDefaultTemplate(criteria.primaryShardType);
    if (defaultTemplate) {
      return defaultTemplate;
    }
  }
  
  // 5. System fallback
  return getSystemFallbackTemplate();
}

function calculateMatchScore(
  template: ContextTemplate,
  criteria: TemplateMatchCriteria
): number {
  let score = 0;
  
  // Intent match
  if (template.applicableInsightTypes?.includes(criteria.insightType)) {
    score += 0.4;
    if (criteria.insightSubtype && 
        template.applicableInsightTypes.includes(`${criteria.insightType}_${criteria.insightSubtype}`)) {
      score += 0.1;
    }
  }
  
  // ShardType match
  if (criteria.primaryShardType && 
      template.applicableShardTypes?.includes(criteria.primaryShardType)) {
    score += 0.3;
  }
  
  // Scope match
  if (template.defaultScope === criteria.scopeType) {
    score += 0.2;
  }
  
  return score;
}
```

---

## c_contextTemplate Structure

### Template Definition

```typescript
interface ContextTemplateStructuredData {
  // Identity
  name: string;
  description?: string;
  category: TemplateCategory;
  
  // Applicability
  applicableShardTypes: string[];       // e.g., ['c_project', 'c_opportunity']
  applicableInsightTypes: string[];     // e.g., ['summary', 'analysis_risk']
  defaultScope: ContextScopeType;
  
  // Relationship Configuration
  relationships: RelationshipConfig[];
  
  // Field Selection
  fieldSelection: FieldSelectionConfig;
  
  // RAG Configuration
  ragConfig?: RAGConfig;
  
  // Token Management
  tokenLimits: TokenLimitConfig;
  
  // Ordering & Priority
  ordering: OrderingConfig;
  
  // Output Format
  outputFormat: OutputFormatConfig;
  
  // Status
  isDefault: boolean;
  isActive: boolean;
  
  // Hierarchy
  parentTemplateId?: string;            // Inherit from parent
}

type TemplateCategory = 
  | 'general'
  | 'sales'
  | 'project_management'
  | 'customer_success'
  | 'executive'
  | 'custom';
```

### Relationship Configuration

```typescript
interface RelationshipConfig {
  // Which relationship to follow
  relationshipType: string;             // e.g., 'has_client', 'has_stakeholder'
  
  // Target ShardType (optional filter)
  targetShardType?: string;
  
  // Traversal settings
  direction: 'outgoing' | 'incoming' | 'both';
  depth: number;                        // Max depth to traverse (1-3)
  maxCount?: number;                    // Max shards to include
  
  // Filtering
  filters?: {
    status?: string[];
    tags?: string[];
    dateRange?: {
      field: string;
      range: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
    };
  };
  
  // Priority
  priority: number;                     // Higher = more important
  required: boolean;                    // Must include if exists
  
  // Field selection for this relationship
  includeFields?: string[];
  excludeFields?: string[];
}

// Example: Project Overview Template
const projectOverviewRelationships: RelationshipConfig[] = [
  {
    relationshipType: 'has_client',
    targetShardType: 'c_company',
    direction: 'outgoing',
    depth: 1,
    priority: 100,
    required: true,
    includeFields: ['name', 'industry', 'size', 'revenue'],
  },
  {
    relationshipType: 'has_stakeholder',
    targetShardType: 'c_contact',
    direction: 'outgoing',
    depth: 1,
    maxCount: 5,
    priority: 90,
    required: false,
    includeFields: ['name', 'title', 'role', 'email'],
    filters: {
      status: ['active'],
    },
  },
  {
    relationshipType: 'has_opportunity',
    targetShardType: 'c_opportunity',
    direction: 'outgoing',
    depth: 1,
    maxCount: 3,
    priority: 85,
    required: false,
    includeFields: ['name', 'value', 'stage', 'expectedCloseDate'],
    filters: {
      status: ['open', 'negotiation'],
    },
  },
  {
    relationshipType: 'has_document',
    targetShardType: 'c_document',
    direction: 'outgoing',
    depth: 1,
    maxCount: 5,
    priority: 70,
    required: false,
    filters: {
      dateRange: {
        field: 'updatedAt',
        range: 'last_30_days',
      },
    },
  },
  {
    relationshipType: 'has_note',
    targetShardType: 'c_note',
    direction: 'outgoing',
    depth: 1,
    maxCount: 10,
    priority: 75,
    required: false,
    filters: {
      dateRange: {
        field: 'createdAt',
        range: 'last_14_days',
      },
    },
  },
];
```

### Field Selection Configuration

```typescript
interface FieldSelectionConfig {
  // Default behavior
  defaultBehavior: 'include_all' | 'include_none' | 'include_important';
  
  // Per-ShardType field selection
  byShardType: Record<string, ShardTypeFieldConfig>;
  
  // Global excludes (PII, internal fields)
  globalExcludes: string[];
  
  // Summary vs detail mode
  summaryFields: Record<string, string[]>;
  detailFields: Record<string, string[]>;
}

interface ShardTypeFieldConfig {
  // Fields to include
  include: string[];
  
  // Fields to exclude (overrides include)
  exclude: string[];
  
  // Field transformations
  transforms?: Record<string, FieldTransform>;
  
  // Computed fields to add
  computed?: ComputedFieldConfig[];
}

interface FieldTransform {
  type: 'truncate' | 'summarize' | 'format' | 'mask';
  config: Record<string, any>;
}

// Example field selection
const fieldSelection: FieldSelectionConfig = {
  defaultBehavior: 'include_important',
  
  byShardType: {
    'c_project': {
      include: ['name', 'description', 'status', 'stage', 'budget', 'startDate', 'endDate'],
      exclude: ['internalNotes', 'costBreakdown'],
      transforms: {
        description: { type: 'truncate', config: { maxLength: 500 } },
      },
      computed: [
        { name: 'daysRemaining', expression: 'daysBetween(now(), endDate)' },
        { name: 'budgetUtilization', expression: 'actualCost / budget * 100' },
      ],
    },
    'c_company': {
      include: ['name', 'industry', 'size', 'revenue', 'website'],
      exclude: ['taxId', 'bankDetails'],
    },
    'c_contact': {
      include: ['name', 'title', 'email', 'phone', 'role'],
      exclude: ['personalEmail', 'homeAddress', 'ssn'],
      transforms: {
        phone: { type: 'mask', config: { showLast: 4 } },
      },
    },
    'c_opportunity': {
      include: ['name', 'value', 'stage', 'probability', 'expectedCloseDate', 'nextStep'],
      exclude: ['internalMargin', 'competitorInfo'],
    },
    'c_note': {
      include: ['content', 'createdAt', 'author'],
      exclude: [],
      transforms: {
        content: { type: 'truncate', config: { maxLength: 1000 } },
      },
    },
    'c_document': {
      include: ['name', 'type', 'summary', 'createdAt'],
      exclude: ['content'], // Use RAG for document content
    },
  },
  
  globalExcludes: [
    'id', 'tenantId', 'createdBy', 'updatedBy',
    'partitionKey', 'embedding', '_etag',
  ],
  
  summaryFields: {
    'c_project': ['name', 'status', 'stage'],
    'c_company': ['name', 'industry'],
    'c_contact': ['name', 'title'],
    'c_opportunity': ['name', 'value', 'stage'],
  },
  
  detailFields: {
    'c_project': ['name', 'description', 'status', 'stage', 'budget', 'startDate', 'endDate', 'milestones'],
    'c_company': ['name', 'industry', 'size', 'revenue', 'description', 'website'],
    'c_contact': ['name', 'title', 'email', 'phone', 'role', 'notes'],
    'c_opportunity': ['name', 'value', 'stage', 'probability', 'expectedCloseDate', 'nextStep', 'competitors'],
  },
};
```

### RAG Configuration

```typescript
interface RAGConfig {
  // Enable RAG for this template
  enabled: boolean;
  
  // When to use RAG
  triggers: RAGTrigger[];
  
  // Search configuration
  search: {
    // Which shard types to search
    shardTypes: string[];
    
    // Which fields have embeddings
    embeddingFields: string[];
    
    // Search parameters
    topK: number;                       // Number of chunks to retrieve
    minScore: number;                   // Minimum similarity score
    
    // Scope restrictions
    scopeToRelated: boolean;            // Only search related shards
    scopeToTimeRange?: string;          // 'last_30_days', etc.
  };
  
  // Chunk configuration
  chunks: {
    maxChunks: number;
    maxTokensPerChunk: number;
    deduplication: boolean;
    includeMetadata: boolean;
  };
}

type RAGTrigger = 
  | 'always'                            // Always do RAG
  | 'on_search_intent'                  // When intent is search
  | 'on_document_reference'             // When documents are mentioned
  | 'on_question'                       // When user asks a question
  | 'on_insufficient_context';          // When structured data isn't enough

// Example RAG config for document-heavy insights
const documentRAGConfig: RAGConfig = {
  enabled: true,
  
  triggers: ['on_question', 'on_document_reference'],
  
  search: {
    shardTypes: ['c_document', 'c_note'],
    embeddingFields: ['content', 'summary'],
    topK: 10,
    minScore: 0.7,
    scopeToRelated: true,
    scopeToTimeRange: 'last_90_days',
  },
  
  chunks: {
    maxChunks: 5,
    maxTokensPerChunk: 500,
    deduplication: true,
    includeMetadata: true,
  },
};
```

### Token Management

```typescript
interface TokenLimitConfig {
  // Total budget
  maxTotalTokens: number;               // e.g., 8000
  
  // Reserved for response
  reserveForResponse: number;           // e.g., 2000
  
  // Allocation by category
  allocation: {
    primaryShard: number;               // % of budget, e.g., 20
    relatedShards: number;              // e.g., 40
    ragChunks: number;                  // e.g., 30
    metadata: number;                   // e.g., 10
  };
  
  // Per-shard limits
  perShardLimit: number;                // Max tokens per shard
  
  // Truncation strategy
  truncation: {
    strategy: 'priority' | 'recency' | 'relevance';
    preserveRequired: boolean;          // Never truncate required relationships
  };
}

// Example token config for 8K context model
const tokenConfig: TokenLimitConfig = {
  maxTotalTokens: 8000,
  reserveForResponse: 2000,
  
  allocation: {
    primaryShard: 20,     // 1200 tokens
    relatedShards: 40,    // 2400 tokens
    ragChunks: 30,        // 1800 tokens
    metadata: 10,         // 600 tokens
  },
  
  perShardLimit: 500,
  
  truncation: {
    strategy: 'priority',
    preserveRequired: true,
  },
};
```

---

## Relationship Traversal

### Traversal Algorithm

```typescript
interface TraversalContext {
  visited: Set<string>;                 // Prevent cycles
  depth: number;
  tokenBudget: number;
  tokenUsed: number;
  results: TraversedShard[];
}

interface TraversedShard {
  shard: Shard;
  relationshipType: string;
  depth: number;
  priority: number;
  estimatedTokens: number;
}

async function traverseRelationships(
  startShard: Shard,
  config: RelationshipConfig[],
  context: TraversalContext
): Promise<TraversedShard[]> {
  
  const results: TraversedShard[] = [];
  
  // Sort configs by priority
  const sortedConfigs = [...config].sort((a, b) => b.priority - a.priority);
  
  for (const relConfig of sortedConfigs) {
    // Check token budget
    if (context.tokenUsed >= context.tokenBudget) {
      break;
    }
    
    // Find matching relationships
    const matchingRels = startShard.internal_relationships.filter(rel => 
      rel.relationshipType === relConfig.relationshipType &&
      (!relConfig.targetShardType || rel.targetShardType === relConfig.targetShardType)
    );
    
    // Limit count
    const limitedRels = matchingRels.slice(0, relConfig.maxCount || Infinity);
    
    for (const rel of limitedRels) {
      // Skip if visited
      if (context.visited.has(rel.targetShardId)) {
        continue;
      }
      context.visited.add(rel.targetShardId);
      
      // Fetch shard
      const shard = await getShard(rel.targetShardId);
      if (!shard) continue;
      
      // Apply filters
      if (!passesFilters(shard, relConfig.filters)) {
        continue;
      }
      
      // Estimate tokens
      const estimatedTokens = estimateShardTokens(shard, relConfig);
      
      // Check budget
      if (context.tokenUsed + estimatedTokens > context.tokenBudget) {
        if (relConfig.required) {
          // Truncate but include
          results.push({
            shard,
            relationshipType: relConfig.relationshipType,
            depth: context.depth,
            priority: relConfig.priority,
            estimatedTokens: Math.min(estimatedTokens, context.tokenBudget - context.tokenUsed),
          });
        }
        continue;
      }
      
      // Add to results
      results.push({
        shard,
        relationshipType: relConfig.relationshipType,
        depth: context.depth,
        priority: relConfig.priority,
        estimatedTokens,
      });
      context.tokenUsed += estimatedTokens;
      
      // Recursive traversal (if depth allows)
      if (context.depth < relConfig.depth) {
        const nestedResults = await traverseRelationships(
          shard,
          config.filter(c => c.depth > context.depth),
          { ...context, depth: context.depth + 1 }
        );
        results.push(...nestedResults);
      }
    }
  }
  
  return results;
}

function passesFilters(shard: Shard, filters?: RelationshipConfig['filters']): boolean {
  if (!filters) return true;
  
  // Status filter
  if (filters.status && !filters.status.includes(shard.status)) {
    return false;
  }
  
  // Tags filter
  if (filters.tags && !filters.tags.some(t => shard.tags?.includes(t))) {
    return false;
  }
  
  // Date range filter
  if (filters.dateRange) {
    const fieldValue = getFieldValue(shard, filters.dateRange.field);
    if (!isWithinRange(fieldValue, filters.dateRange.range)) {
      return false;
    }
  }
  
  return true;
}
```

### Traversal Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RELATIONSHIP TRAVERSAL EXAMPLE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Starting Shard: c_project "Project Alpha"                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DEPTH 1                                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  has_client (priority: 100, required: true)                          │   │
│  │  └── c_company "Acme Corporation" ✓ [~200 tokens]                    │   │
│  │                                                                      │   │
│  │  has_stakeholder (priority: 90, max: 5)                              │   │
│  │  ├── c_contact "John Smith" ✓ [~100 tokens]                          │   │
│  │  ├── c_contact "Jane Doe" ✓ [~100 tokens]                            │   │
│  │  └── c_contact "Bob Wilson" ✓ [~100 tokens]                          │   │
│  │                                                                      │   │
│  │  has_opportunity (priority: 85, max: 3)                              │   │
│  │  └── c_opportunity "Q4 Enterprise Deal" ✓ [~150 tokens]              │   │
│  │                                                                      │   │
│  │  has_note (priority: 75, max: 10, last 14 days)                      │   │
│  │  ├── c_note "Kickoff Meeting Notes" ✓ [~300 tokens]                  │   │
│  │  ├── c_note "Weekly Update 11/22" ✓ [~250 tokens]                    │   │
│  │  └── c_note "Budget Discussion" ✓ [~200 tokens]                      │   │
│  │                                                                      │   │
│  │  has_document (priority: 70, max: 5, last 30 days)                   │   │
│  │  ├── c_document "Proposal v2" ✓ [~100 tokens] (summary only)         │   │
│  │  └── c_document "Requirements" ✓ [~100 tokens] (summary only)        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DEPTH 2                                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  From c_company "Acme Corporation":                                  │   │
│  │  └── has_contact (inherited config)                                  │   │
│  │      └── (already included via has_stakeholder, skipped)             │   │
│  │                                                                      │   │
│  │  From c_opportunity "Q4 Enterprise Deal":                            │   │
│  │  └── has_competitor                                                  │   │
│  │      └── c_company "Competitor X" ✓ [~100 tokens]                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Total Tokens Used: ~1,700 / 2,400 budget                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## RAG Retrieval

### Retrieval Process

```typescript
interface RAGRetrievalResult {
  chunks: RetrievedChunk[];
  query: string;
  totalMatches: number;
  tokensUsed: number;
}

async function performRAGRetrieval(
  query: string,
  config: RAGConfig,
  scope: ContextScope,
  tokenBudget: number
): Promise<RAGRetrievalResult> {
  
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Build search filters
  const filters = buildRAGFilters(config, scope);
  
  // 3. Perform vector search
  const searchResults = await vectorSearch({
    embedding: queryEmbedding,
    topK: config.search.topK,
    minScore: config.search.minScore,
    filters,
  });
  
  // 4. Deduplicate if configured
  let chunks = searchResults;
  if (config.chunks.deduplication) {
    chunks = deduplicateChunks(chunks);
  }
  
  // 5. Fit within token budget
  const fittedChunks = fitChunksToTokenBudget(chunks, tokenBudget, config.chunks);
  
  // 6. Enhance with metadata if configured
  if (config.chunks.includeMetadata) {
    for (const chunk of fittedChunks) {
      chunk.metadata = await getChunkMetadata(chunk);
    }
  }
  
  return {
    chunks: fittedChunks,
    query,
    totalMatches: searchResults.length,
    tokensUsed: fittedChunks.reduce((sum, c) => sum + c.tokens, 0),
  };
}

function buildRAGFilters(
  config: RAGConfig,
  scope: ContextScope
): VectorSearchFilters {
  const filters: VectorSearchFilters = {
    shardTypes: config.search.shardTypes,
  };
  
  // Scope to related shards
  if (config.search.scopeToRelated && scope.type !== 'tenant_wide') {
    filters.shardIds = scope.relatedShardIds;
  }
  
  // Time range
  if (config.search.scopeToTimeRange) {
    filters.dateRange = parseDateRange(config.search.scopeToTimeRange);
  }
  
  // Tenant filter (always applied)
  filters.tenantId = scope.tenantId;
  
  return filters;
}

function deduplicateChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Map<string, RetrievedChunk>();
  
  for (const chunk of chunks) {
    const key = `${chunk.shardId}:${chunk.chunkIndex}`;
    const existing = seen.get(key);
    
    if (!existing || chunk.score > existing.score) {
      seen.set(key, chunk);
    }
  }
  
  return Array.from(seen.values());
}

function fitChunksToTokenBudget(
  chunks: RetrievedChunk[],
  budget: number,
  config: RAGConfig['chunks']
): RetrievedChunk[] {
  const result: RetrievedChunk[] = [];
  let tokensUsed = 0;
  
  // Sort by score
  const sorted = [...chunks].sort((a, b) => b.score - a.score);
  
  for (const chunk of sorted) {
    // Check limits
    if (result.length >= config.maxChunks) break;
    
    // Estimate tokens
    let chunkTokens = estimateTokens(chunk.content);
    
    // Truncate if needed
    if (chunkTokens > config.maxTokensPerChunk) {
      chunk.content = truncateToTokens(chunk.content, config.maxTokensPerChunk);
      chunk.isTruncated = true;
      chunkTokens = config.maxTokensPerChunk;
    }
    
    // Check budget
    if (tokensUsed + chunkTokens > budget) {
      // Try to fit a truncated version
      const remainingBudget = budget - tokensUsed;
      if (remainingBudget > 100) { // Minimum useful chunk size
        chunk.content = truncateToTokens(chunk.content, remainingBudget);
        chunk.isTruncated = true;
        result.push(chunk);
      }
      break;
    }
    
    result.push(chunk);
    tokensUsed += chunkTokens;
  }
  
  return result;
}
```

---

## Ranking & Prioritization

### Scoring Factors

```typescript
interface ContextItemScore {
  // Base scores (0-1)
  relationshipPriority: number;         // From template config
  relevanceScore: number;               // Semantic similarity
  recencyScore: number;                 // How recent
  importanceScore: number;              // Business importance
  
  // Weights
  weights: {
    relationshipPriority: number;       // Default: 0.3
    relevance: number;                  // Default: 0.3
    recency: number;                    // Default: 0.2
    importance: number;                 // Default: 0.2
  };
  
  // Final score
  totalScore: number;
}

function scoreContextItem(
  item: TraversedShard | RetrievedChunk,
  intent: ClassifiedIntent,
  template: ContextTemplate
): ContextItemScore {
  
  const weights = template.ordering.weights || DEFAULT_WEIGHTS;
  
  // Relationship priority (for traversed shards)
  const relationshipPriority = 'priority' in item 
    ? item.priority / 100 
    : 0.5;
  
  // Relevance score (semantic similarity or query match)
  const relevanceScore = 'score' in item
    ? item.score
    : calculateRelevance(item.shard, intent.query);
  
  // Recency score
  const recencyScore = calculateRecencyScore(
    item.shard?.updatedAt || item.metadata?.updatedAt
  );
  
  // Importance score (business rules)
  const importanceScore = calculateImportance(item, template);
  
  // Weighted total
  const totalScore = 
    (relationshipPriority * weights.relationshipPriority) +
    (relevanceScore * weights.relevance) +
    (recencyScore * weights.recency) +
    (importanceScore * weights.importance);
  
  return {
    relationshipPriority,
    relevanceScore,
    recencyScore,
    importanceScore,
    weights,
    totalScore,
  };
}

function calculateRecencyScore(updatedAt: Date | undefined): number {
  if (!updatedAt) return 0.5;
  
  const daysSince = differenceInDays(new Date(), updatedAt);
  
  if (daysSince <= 1) return 1.0;      // Today/yesterday
  if (daysSince <= 7) return 0.9;      // This week
  if (daysSince <= 30) return 0.7;     // This month
  if (daysSince <= 90) return 0.5;     // This quarter
  if (daysSince <= 365) return 0.3;    // This year
  return 0.1;                          // Older
}

function calculateImportance(
  item: TraversedShard | RetrievedChunk,
  template: ContextTemplate
): number {
  let score = 0.5; // Base
  
  const shard = 'shard' in item ? item.shard : null;
  if (!shard) return score;
  
  // High-value opportunities
  if (shard.shardTypeId === 'c_opportunity') {
    const value = shard.structuredData.value || 0;
    if (value > 100000) score += 0.2;
    if (value > 500000) score += 0.2;
  }
  
  // Required relationships
  if ('required' in item && item.required) {
    score += 0.3;
  }
  
  // Primary contact
  if (shard.shardTypeId === 'c_contact' && 
      shard.structuredData.role === 'primary') {
    score += 0.2;
  }
  
  // Recent activity indicator
  if (shard.shardTypeId === 'c_note' || shard.shardTypeId === 'c_activity') {
    const daysAgo = differenceInDays(new Date(), shard.createdAt);
    if (daysAgo <= 3) score += 0.2;
  }
  
  return Math.min(score, 1.0);
}
```

### Ordering Configuration

```typescript
interface OrderingConfig {
  // Primary sort
  primarySort: 'priority' | 'relevance' | 'recency' | 'importance' | 'score';
  
  // Secondary sort
  secondarySort?: 'priority' | 'relevance' | 'recency' | 'importance';
  
  // Custom weights (override defaults)
  weights?: {
    relationshipPriority: number;
    relevance: number;
    recency: number;
    importance: number;
  };
  
  // Grouping
  groupBy?: 'shardType' | 'relationshipType' | 'none';
  
  // Within groups
  groupOrder?: string[];  // e.g., ['c_company', 'c_contact', 'c_opportunity', 'c_note']
}

// Example ordering configs
const orderingConfigs: Record<string, OrderingConfig> = {
  // For summaries: prioritize structure
  summary: {
    primarySort: 'priority',
    groupBy: 'shardType',
    groupOrder: ['c_company', 'c_contact', 'c_opportunity', 'c_document', 'c_note'],
  },
  
  // For analysis: prioritize relevance
  analysis: {
    primarySort: 'relevance',
    secondarySort: 'recency',
    weights: {
      relationshipPriority: 0.2,
      relevance: 0.4,
      recency: 0.2,
      importance: 0.2,
    },
  },
  
  // For recent activity: prioritize recency
  activity: {
    primarySort: 'recency',
    groupBy: 'none',
    weights: {
      relationshipPriority: 0.1,
      relevance: 0.2,
      recency: 0.5,
      importance: 0.2,
    },
  },
};
```

---

## Token Budgeting

### Budget Allocation

```typescript
interface TokenBudget {
  total: number;
  
  // Allocations
  systemPrompt: number;
  context: number;
  reservedForResponse: number;
  
  // Context breakdown
  contextBreakdown: {
    primaryShard: number;
    relatedShards: number;
    ragChunks: number;
    metadata: number;
  };
}

function calculateTokenBudget(
  model: AIModel,
  template: ContextTemplate
): TokenBudget {
  const maxContext = model.contextWindow;
  const config = template.tokenLimits;
  
  // Reserve for response
  const reservedForResponse = Math.min(
    config.reserveForResponse,
    maxContext * 0.25 // Never more than 25%
  );
  
  // Reserve for system prompt (~500 tokens typical)
  const systemPrompt = 500;
  
  // Available for context
  const availableContext = maxContext - reservedForResponse - systemPrompt;
  const contextBudget = Math.min(availableContext, config.maxTotalTokens);
  
  // Allocate by percentages
  const breakdown = {
    primaryShard: Math.floor(contextBudget * config.allocation.primaryShard / 100),
    relatedShards: Math.floor(contextBudget * config.allocation.relatedShards / 100),
    ragChunks: Math.floor(contextBudget * config.allocation.ragChunks / 100),
    metadata: Math.floor(contextBudget * config.allocation.metadata / 100),
  };
  
  return {
    total: maxContext,
    systemPrompt,
    context: contextBudget,
    reservedForResponse,
    contextBreakdown: breakdown,
  };
}
```

### Token Estimation

```typescript
// Approximate tokens per character (varies by model)
const TOKENS_PER_CHAR = 0.25;

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

function estimateShardTokens(
  shard: Shard,
  fieldConfig: ShardTypeFieldConfig
): number {
  let tokens = 0;
  
  // Include fields
  for (const field of fieldConfig.include) {
    const value = shard.structuredData[field];
    if (value !== undefined) {
      tokens += estimateFieldTokens(field, value);
    }
  }
  
  // Add overhead for formatting
  tokens += 50; // Headers, separators, etc.
  
  return tokens;
}

function estimateFieldTokens(name: string, value: any): number {
  // Field name
  let tokens = estimateTokens(name) + 2; // ": "
  
  // Value
  if (typeof value === 'string') {
    tokens += estimateTokens(value);
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    tokens += 5;
  } else if (Array.isArray(value)) {
    tokens += value.reduce((sum, v) => sum + estimateTokens(String(v)) + 2, 0);
  } else if (typeof value === 'object') {
    tokens += estimateTokens(JSON.stringify(value));
  }
  
  return tokens;
}
```

### Truncation Strategy

```typescript
async function truncateContext(
  items: ScoredContextItem[],
  budget: number,
  config: TokenLimitConfig
): Promise<ScoredContextItem[]> {
  
  // Sort by score
  const sorted = [...items].sort((a, b) => b.score.totalScore - a.score.totalScore);
  
  // Separate required vs optional
  const required = sorted.filter(i => i.required);
  const optional = sorted.filter(i => !i.required);
  
  const result: ScoredContextItem[] = [];
  let tokensUsed = 0;
  
  // 1. Always include required items (possibly truncated)
  for (const item of required) {
    if (tokensUsed + item.estimatedTokens <= budget) {
      result.push(item);
      tokensUsed += item.estimatedTokens;
    } else {
      // Truncate but include
      const truncated = truncateItem(item, budget - tokensUsed);
      result.push(truncated);
      tokensUsed = budget;
      break;
    }
  }
  
  // 2. Add optional items by priority
  for (const item of optional) {
    if (tokensUsed >= budget) break;
    
    if (tokensUsed + item.estimatedTokens <= budget) {
      result.push(item);
      tokensUsed += item.estimatedTokens;
    } else if (config.truncation.strategy === 'priority') {
      // Try to fit truncated version
      const remaining = budget - tokensUsed;
      if (remaining > 100) {
        const truncated = truncateItem(item, remaining);
        result.push(truncated);
        tokensUsed = budget;
      }
    }
  }
  
  return result;
}

function truncateItem(
  item: ScoredContextItem,
  maxTokens: number
): ScoredContextItem {
  const truncated = { ...item };
  
  if (item.type === 'shard') {
    // Reduce to summary fields
    truncated.content = summarizeShard(item.shard, maxTokens);
  } else if (item.type === 'chunk') {
    // Truncate content
    truncated.content = truncateToTokens(item.content, maxTokens);
  }
  
  truncated.estimatedTokens = maxTokens;
  truncated.isTruncated = true;
  
  return truncated;
}
```

---

## Context Formatting

### Format Structure

```typescript
interface FormattedContext {
  // Structured sections
  sections: ContextSection[];
  
  // Total statistics
  stats: {
    totalTokens: number;
    shardCount: number;
    chunkCount: number;
    truncatedItems: number;
  };
  
  // For citation linking
  sourceMap: Map<string, SourceReference>;
}

interface ContextSection {
  id: string;
  title: string;
  type: 'primary' | 'related' | 'rag' | 'metadata';
  content: string;
  tokens: number;
  sources: SourceReference[];
}

interface SourceReference {
  id: string;                           // For citation linking
  shardId: string;
  shardType: string;
  shardName: string;
  fieldPath?: string;
  updatedAt: Date;
}
```

### Formatting Functions

```typescript
function formatContext(
  assembled: AssembledContext,
  template: ContextTemplate
): FormattedContext {
  const sections: ContextSection[] = [];
  const sourceMap = new Map<string, SourceReference>();
  let sourceCounter = 1;
  
  // 1. Primary shard section
  if (assembled.primaryShard) {
    const section = formatPrimaryShardSection(
      assembled.primaryShard,
      template.fieldSelection,
      sourceCounter
    );
    sections.push(section);
    sourceCounter += section.sources.length;
    section.sources.forEach(s => sourceMap.set(s.id, s));
  }
  
  // 2. Related shards sections (grouped by type)
  const groupedRelated = groupByShardType(assembled.relatedShards);
  for (const [shardType, shards] of groupedRelated) {
    const section = formatRelatedShardsSection(
      shardType,
      shards,
      template.fieldSelection,
      sourceCounter
    );
    sections.push(section);
    sourceCounter += section.sources.length;
    section.sources.forEach(s => sourceMap.set(s.id, s));
  }
  
  // 3. RAG chunks section
  if (assembled.ragResults?.chunks.length > 0) {
    const section = formatRAGSection(
      assembled.ragResults,
      sourceCounter
    );
    sections.push(section);
    sourceCounter += section.sources.length;
    section.sources.forEach(s => sourceMap.set(s.id, s));
  }
  
  // 4. Metadata section
  const metadataSection = formatMetadataSection(assembled);
  sections.push(metadataSection);
  
  return {
    sections,
    stats: {
      totalTokens: sections.reduce((sum, s) => sum + s.tokens, 0),
      shardCount: assembled.primaryShard ? 1 + assembled.relatedShards.length : 0,
      chunkCount: assembled.ragResults?.chunks.length || 0,
      truncatedItems: assembled.truncatedItems?.length || 0,
    },
    sourceMap,
  };
}

function formatPrimaryShardSection(
  shard: Shard,
  fieldConfig: FieldSelectionConfig,
  startSourceId: number
): ContextSection {
  const shardConfig = fieldConfig.byShardType[shard.shardTypeId];
  const fields = selectFields(shard, shardConfig);
  
  let content = `## ${shard.shardTypeId.replace('c_', '').toUpperCase()}: ${shard.structuredData.name}\n`;
  content += `Last updated: ${formatRelativeTime(shard.updatedAt)}\n\n`;
  
  for (const [key, value] of Object.entries(fields)) {
    content += formatField(key, value, shardConfig?.transforms?.[key]);
  }
  
  const source: SourceReference = {
    id: `src_${startSourceId}`,
    shardId: shard.id,
    shardType: shard.shardTypeId,
    shardName: shard.structuredData.name,
    updatedAt: shard.updatedAt,
  };
  
  return {
    id: 'primary',
    title: `${shard.shardTypeId}: ${shard.structuredData.name}`,
    type: 'primary',
    content,
    tokens: estimateTokens(content),
    sources: [source],
  };
}

function formatRelatedShardsSection(
  shardType: string,
  shards: TraversedShard[],
  fieldConfig: FieldSelectionConfig,
  startSourceId: number
): ContextSection {
  const typeName = shardType.replace('c_', '');
  const shardConfig = fieldConfig.byShardType[shardType];
  
  let content = `## Related ${typeName.toUpperCase()}S (${shards.length})\n\n`;
  const sources: SourceReference[] = [];
  
  for (let i = 0; i < shards.length; i++) {
    const { shard } = shards[i];
    const fields = selectFields(shard, shardConfig);
    
    content += `### ${i + 1}. ${shard.structuredData.name}\n`;
    content += `Updated: ${formatRelativeTime(shard.updatedAt)}\n`;
    
    for (const [key, value] of Object.entries(fields)) {
      content += formatField(key, value, shardConfig?.transforms?.[key]);
    }
    content += '\n';
    
    sources.push({
      id: `src_${startSourceId + i}`,
      shardId: shard.id,
      shardType: shard.shardTypeId,
      shardName: shard.structuredData.name,
      updatedAt: shard.updatedAt,
    });
  }
  
  return {
    id: `related_${shardType}`,
    title: `Related ${typeName}s`,
    type: 'related',
    content,
    tokens: estimateTokens(content),
    sources,
  };
}

function formatRAGSection(
  ragResults: RAGRetrievalResult,
  startSourceId: number
): ContextSection {
  let content = `## RELEVANT CONTENT EXCERPTS\n\n`;
  content += `Query: "${ragResults.query}"\n`;
  content += `Found: ${ragResults.totalMatches} matches, showing top ${ragResults.chunks.length}\n\n`;
  
  const sources: SourceReference[] = [];
  
  for (let i = 0; i < ragResults.chunks.length; i++) {
    const chunk = ragResults.chunks[i];
    
    content += `### [Excerpt ${i + 1}] From: ${chunk.shardName}\n`;
    content += `Type: ${chunk.shardTypeId} | Relevance: ${Math.round(chunk.score * 100)}%\n`;
    content += `Updated: ${formatRelativeTime(chunk.metadata?.updatedAt)}\n`;
    content += `---\n${chunk.content}\n---\n\n`;
    
    sources.push({
      id: `src_${startSourceId + i}`,
      shardId: chunk.shardId,
      shardType: chunk.shardTypeId,
      shardName: chunk.shardName,
      fieldPath: chunk.fieldPath,
      updatedAt: chunk.metadata?.updatedAt,
    });
  }
  
  return {
    id: 'rag_chunks',
    title: 'Relevant Content Excerpts',
    type: 'rag',
    content,
    tokens: estimateTokens(content),
    sources,
  };
}

function formatMetadataSection(assembled: AssembledContext): ContextSection {
  let content = `## CONTEXT METADATA\n\n`;
  content += `- Primary: ${assembled.primaryShard?.structuredData.name || 'N/A'}\n`;
  content += `- Related Shards: ${assembled.relatedShards.length}\n`;
  content += `- RAG Chunks: ${assembled.ragResults?.chunks.length || 0}\n`;
  content += `- Data Range: ${formatDateRange(assembled.dateRange)}\n`;
  content += `- Assembly Time: ${new Date().toISOString()}\n`;
  
  if (assembled.truncatedItems?.length > 0) {
    content += `\n⚠️ Note: ${assembled.truncatedItems.length} items were truncated to fit token limit.\n`;
  }
  
  return {
    id: 'metadata',
    title: 'Context Metadata',
    type: 'metadata',
    content,
    tokens: estimateTokens(content),
    sources: [],
  };
}
```

---

## Output: AssembledContext

```typescript
interface AssembledContext {
  // Template used
  templateId: string;
  templateName: string;
  
  // Primary shard
  primaryShard: Shard | null;
  
  // Related shards (from relationship traversal)
  relatedShards: TraversedShard[];
  
  // RAG results
  ragResults: RAGRetrievalResult | null;
  
  // Formatted content
  formatted: FormattedContext;
  
  // Prompt-ready string
  promptContent: string;
  
  // Token usage
  tokenUsage: {
    primaryShard: number;
    relatedShards: number;
    ragChunks: number;
    metadata: number;
    total: number;
    budget: number;
    utilization: number;
  };
  
  // Quality metrics
  quality: {
    completeness: number;       // % of requested data included
    freshness: number;          // Avg recency score
    relevance: number;          // Avg relevance score
  };
  
  // Truncation info
  truncatedItems: TruncatedItem[];
  
  // Scope info
  scope: ContextScope;
  dateRange: DateRange;
  
  // Timing
  assemblyTimeMs: number;
}

interface TruncatedItem {
  shardId: string;
  shardName: string;
  originalTokens: number;
  truncatedTokens: number;
  reason: 'budget' | 'per_shard_limit' | 'field_limit';
}
```

---

## System Templates

### Built-in Templates

| Template | Purpose | Scope | Key Relationships |
|----------|---------|-------|-------------------|
| `project_overview` | General project summary | Project | Company, contacts, opportunities, recent notes |
| `project_risk_analysis` | Risk analysis | Project | All + activities, competitor mentions |
| `deal_analysis` | Opportunity deep-dive | Opportunity | Company, contacts, documents, competing deals |
| `company_profile` | Company overview | Company | Contacts, opportunities, projects, news |
| `contact_briefing` | Contact background | Contact | Company, interactions, opportunities |
| `daily_briefing` | Daily priorities | Time-based | Tasks, meetings, deal updates |
| `pipeline_review` | Pipeline health | Tenant-wide | All opportunities, aggregated |
| `activity_summary` | Recent activity | Time-based | Notes, emails, meetings |

### Template Example: Project Overview

```typescript
const PROJECT_OVERVIEW_TEMPLATE: ContextTemplateStructuredData = {
  name: 'Project Overview',
  description: 'Comprehensive project context for summaries and general insights',
  category: 'project_management',
  
  applicableShardTypes: ['c_project'],
  applicableInsightTypes: ['summary', 'analysis', 'recommendation'],
  defaultScope: 'project',
  
  relationships: [
    {
      relationshipType: 'has_client',
      targetShardType: 'c_company',
      direction: 'outgoing',
      depth: 1,
      priority: 100,
      required: true,
      includeFields: ['name', 'industry', 'size', 'revenue', 'description'],
    },
    {
      relationshipType: 'has_stakeholder',
      targetShardType: 'c_contact',
      direction: 'outgoing',
      depth: 1,
      maxCount: 5,
      priority: 90,
      required: false,
      includeFields: ['name', 'title', 'role', 'email'],
      filters: { status: ['active'] },
    },
    {
      relationshipType: 'has_opportunity',
      targetShardType: 'c_opportunity',
      direction: 'outgoing',
      depth: 1,
      maxCount: 3,
      priority: 85,
      required: false,
      includeFields: ['name', 'value', 'stage', 'probability', 'expectedCloseDate'],
    },
    {
      relationshipType: 'has_note',
      targetShardType: 'c_note',
      direction: 'outgoing',
      depth: 1,
      maxCount: 10,
      priority: 75,
      required: false,
      filters: { dateRange: { field: 'createdAt', range: 'last_14_days' } },
    },
    {
      relationshipType: 'has_document',
      targetShardType: 'c_document',
      direction: 'outgoing',
      depth: 1,
      maxCount: 5,
      priority: 70,
      required: false,
      includeFields: ['name', 'type', 'summary'],
      filters: { dateRange: { field: 'updatedAt', range: 'last_30_days' } },
    },
  ],
  
  fieldSelection: {
    defaultBehavior: 'include_important',
    byShardType: {
      'c_project': {
        include: ['name', 'description', 'status', 'stage', 'budget', 'startDate', 'endDate', 'objectives'],
        exclude: ['internalNotes', 'costBreakdown'],
        transforms: {
          description: { type: 'truncate', config: { maxLength: 1000 } },
        },
      },
      // ... other shardTypes
    },
    globalExcludes: ['id', 'tenantId', 'createdBy', 'updatedBy', 'embedding'],
    summaryFields: {
      'c_project': ['name', 'status', 'stage'],
    },
    detailFields: {
      'c_project': ['name', 'description', 'status', 'stage', 'budget', 'startDate', 'endDate'],
    },
  },
  
  ragConfig: {
    enabled: true,
    triggers: ['on_question', 'on_document_reference'],
    search: {
      shardTypes: ['c_document', 'c_note'],
      embeddingFields: ['content'],
      topK: 5,
      minScore: 0.75,
      scopeToRelated: true,
    },
    chunks: {
      maxChunks: 3,
      maxTokensPerChunk: 500,
      deduplication: true,
      includeMetadata: true,
    },
  },
  
  tokenLimits: {
    maxTotalTokens: 6000,
    reserveForResponse: 2000,
    allocation: {
      primaryShard: 25,
      relatedShards: 40,
      ragChunks: 25,
      metadata: 10,
    },
    perShardLimit: 500,
    truncation: {
      strategy: 'priority',
      preserveRequired: true,
    },
  },
  
  ordering: {
    primarySort: 'priority',
    groupBy: 'shardType',
    groupOrder: ['c_company', 'c_contact', 'c_opportunity', 'c_note', 'c_document'],
  },
  
  outputFormat: {
    includeMetadata: true,
    includeFreshness: true,
    showTruncationWarning: true,
  },
  
  isDefault: true,
  isActive: true,
};
```

---

## Related Documentation

- [AI Insights Overview](./README.md)
- [Intent Classification](./INTENT-CLASSIFICATION.md)
- [Grounding & Accuracy](./GROUNDING.md)
- [c_contextTemplate](../../shards/core-types/c_contextTemplate.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0











