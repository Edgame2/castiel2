# Advanced AI Insights Features

## Overview

This document outlines advanced features and recommendations to enhance the AI Insights system beyond the core functionality. These features focus on learning, optimization, automation, and differentiation.

> **Philosophy**: "AI should get smarter over time, not just answer questions."

---

## Table of Contents

1. [Learning & Continuous Improvement](#learning--continuous-improvement)
2. [Semantic Caching](#semantic-caching)
3. [Smart Model Routing](#smart-model-routing)
4. [Chain-of-Thought Reasoning](#chain-of-thought-reasoning)
5. [Proactive Insight Agents](#proactive-insight-agents)
6. [Multi-Modal Insights](#multi-modal-insights)
7. [Memory & Long-Term Context](#memory--long-term-context)
8. [Collaborative Insights](#collaborative-insights)
9. [Workflow Automation](#workflow-automation)
10. [Explainable AI (XAI)](#explainable-ai-xai)
11. [Insight Templates Library](#insight-templates-library)
12. [Quality Monitoring Dashboard](#quality-monitoring-dashboard)
13. [Hybrid RAG + Graph Retrieval](#hybrid-rag--graph-retrieval)
14. [Insight Scheduling](#insight-scheduling)
15. [Recurring Search with AI Alert Detection](#recurring-search-with-ai-alert-detection)
16. [Implementation Priority](#implementation-priority)

---

## Learning & Continuous Improvement

### Overview

Use feedback data from `c_conversation.messages[].feedback` to continuously improve AI performance. This system integrates with the **Prompt Management System** (see [Prompt Management UI](./UI-SPECIFICATION.md#prompt-management-ui)) to enable super admins to optimize prompts based on real usage data.

### Feedback Learning System

```typescript
interface FeedbackLearningSystem {
  // Data collection
  collection: {
    trackThumbsUp: boolean;
    trackThumbsDown: boolean;
    trackRegeneration: boolean;
    trackFollowUpQuestions: boolean;
    trackCopyActions: boolean;
  };
  
  // Aggregation
  aggregation: {
    byInsightType: boolean;
    byModel: boolean;
    byTemplate: boolean;
    byPromptVersion: boolean;      // NEW: Track by prompt version
    byUser: boolean;
    byTenant: boolean;
  };
  
  // Learning actions
  actions: {
    adjustPrompts: boolean;
    adjustModelSelection: boolean;
    adjustTemplates: boolean;
    alertOnQualityDrop: boolean;
    suggestPromptImprovements: boolean;  // NEW: Suggest to super admins
  };
}
```

### Prompt Improvement Workflow

The Prompt Management System provides a structured workflow for continuous improvement:

1. **Collect Feedback**: User feedback (thumbs up/down, ratings) automatically saved with each AI response
2. **Aggregate Metrics**: Performance metrics calculated per prompt version (success rate, satisfaction, cost)
3. **Identify Issues**: Dashboard alerts super admins when prompt performance drops below threshold
4. **Create Variant**: Super admin creates new prompt version with improvements
5. **Test**: Test new prompt with sample inputs in Prompt Tester
6. **A/B Test**: Run A/B test to compare control vs. variant in production
7. **Analyze Results**: Review statistical significance and user satisfaction
8. **Promote Winner**: Activate best-performing version as new default

> **See**: [IMPLEMENTATION-GUIDE.md - Step 15: Prompt Management System](./IMPLEMENTATION-GUIDE.md#step-15-prompt-management-system)

### Feedback Metrics

```typescript
interface FeedbackMetrics {
  // Per insight type
  insightType: InsightType;
  
  // Quality metrics
  metrics: {
    thumbsUpRate: number;           // % positive feedback
    thumbsDownRate: number;         // % negative feedback
    regenerationRate: number;       // % asked to try again
    followUpRate: number;           // % asked clarifying questions
    completionRate: number;         // % read full response
    promptVersionId?: string;       // NEW: Track which prompt version
  };
  
  // Negative feedback analysis
  thumbsDownReasons: {
    inaccurate: number;
    incomplete: number;
    too_long: number;
    too_short: number;
    not_relevant: number;
    wrong_tone: number;
    other: number;
  };
  
  // Improvement suggestions
  suggestedAdjustments: string[];
}
```

### A/B Testing Framework

```typescript
interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  
  // Test variants
  variants: ABTestVariant[];
  
  // Traffic allocation
  trafficAllocation: Record<string, number>; // variant -> % of traffic
  
  // Success metrics
  successMetrics: {
    primary: 'thumbs_up_rate' | 'completion_rate' | 'latency' | 'cost';
    secondary: string[];
  };
  
  // Duration
  startDate: Date;
  endDate?: Date;
  minSampleSize: number;
  
  // Status
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  winner?: string;
}

interface ABTestVariant {
  id: string;
  name: string;
  
  // What's different
  changes: {
    promptOverride?: string;
    modelOverride?: string;
    templateOverride?: string;
    configOverrides?: Partial<AIPromptSystemConfig>;
  };
}
```

### Prompt Version Control

```typescript
interface PromptVersion {
  id: string;
  promptType: 'system' | 'insight_type' | 'tool' | 'safety';
  promptKey: string;
  
  // Version info
  version: number;
  content: string;
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  changeDescription: string;
  
  // Performance tracking
  metrics: {
    usageCount: number;
    thumbsUpRate: number;
    avgLatencyMs: number;
    avgCost: number;
  };
  
  // Rollback capability
  isActive: boolean;
  previousVersionId?: string;
}
```

---

## Semantic Caching

### Overview

Cache responses to semantically similar queries to reduce latency and cost by 70-90%.

### Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SEMANTIC CACHE FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User Query: "What are the risks in Project Alpha?"                         │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. GENERATE QUERY EMBEDDING                                         │   │
│  │     embedding = embed("What are the risks in Project Alpha?")        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2. SEARCH CACHE                                                     │   │
│  │     Find entries where:                                              │   │
│  │     - tenantId matches                                               │   │
│  │     - scope matches (projectId, etc.)                                │   │
│  │     - similarity(embedding, cached_embedding) > 0.95                 │   │
│  │     - not expired (TTL)                                              │   │
│  │     - not invalidated (shard updates)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ├─── CACHE HIT ──────────────────────────────────────────────────┐ │
│         │                                                                 │ │
│         │    Return cached response immediately (~50ms)                  │ │
│         │    Increment hit count, update lastAccessedAt                  │ │
│         │                                                                 │ │
│         ├─── CACHE MISS ─────────────────────────────────────────────────┘ │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  3. GENERATE RESPONSE                                                │   │
│  │     Run full insight pipeline                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  4. STORE IN CACHE                                                   │   │
│  │     Store response with embedding, metadata                          │   │
│  │     Set TTL based on content type                                    │   │
│  │     Track dependent shardIds for invalidation                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cache Entry Structure

```typescript
interface SemanticCacheEntry {
  id: string;
  tenantId: string;
  
  // Query representation
  query: {
    originalText: string;
    normalizedText: string;
    embedding: number[];
    insightType: InsightType;
  };
  
  // Scope (for filtering)
  scope: {
    type: 'single_shard' | 'project' | 'company' | 'tenant_wide';
    shardId?: string;
    projectId?: string;
    companyId?: string;
  };
  
  // Cached response
  response: {
    content: string;
    citations: SourceCitation[];
    confidence: ConfidenceScore;
    format: OutputFormat;
  };
  
  // Dependencies (for invalidation)
  dependencies: {
    shardIds: string[];           // Invalidate if any of these change
    shardTypes: string[];         // Types involved
    lastDataTimestamp: Date;      // When source data was last updated
  };
  
  // Cache metadata
  cache: {
    createdAt: Date;
    expiresAt: Date;
    ttlSeconds: number;
    hitCount: number;
    lastAccessedAt: Date;
  };
  
  // Quality tracking
  quality: {
    feedbackScore?: number;       // Aggregate feedback on cached response
    wasRegenerated: boolean;      // Did a user ask to regenerate?
  };
}
```

### Cache Configuration

```typescript
interface SemanticCacheConfig {
  enabled: boolean;
  
  // Similarity threshold
  similarityThreshold: number;    // Default: 0.95
  
  // TTL by content type
  ttlByType: {
    summary: number;              // 1 hour
    analysis: number;             // 30 minutes
    prediction: number;           // 15 minutes (data changes fast)
    extraction: number;           // 2 hours
    generation: number;           // Don't cache (unique each time)
    search: number;               // 10 minutes
  };
  
  // Invalidation
  invalidation: {
    onShardUpdate: boolean;       // Invalidate when source shard changes
    onRelationshipChange: boolean;// Invalidate when relationships change
    maxAge: number;               // Force refresh after N hours
  };
  
  // Scope
  scope: {
    perTenant: boolean;           // Tenant-isolated cache
    perUser: boolean;             // User-isolated cache (more granular)
  };
  
  // Size limits
  limits: {
    maxEntriesPerTenant: number;
    maxSizePerEntryBytes: number;
    evictionPolicy: 'lru' | 'lfu' | 'ttl';
  };
}
```

### Cache Invalidation

```typescript
interface CacheInvalidator {
  // Listen to shard events
  onShardEvent(event: ShardEventPayload): Promise<void>;
  
  // Invalidation logic
  async invalidateForShard(shardId: string): Promise<number> {
    // Find all cache entries that depend on this shard
    const entries = await findEntriesWithDependency(shardId);
    
    // Invalidate them
    for (const entry of entries) {
      await deleteEntry(entry.id);
    }
    
    return entries.length;
  }
  
  // Bulk invalidation
  async invalidateForTenant(tenantId: string): Promise<number>;
  async invalidateForScope(scope: ContextScope): Promise<number>;
  async invalidateStale(maxAgeHours: number): Promise<number>;
}
```

### Benefits

| Metric | Without Cache | With Cache |
|--------|---------------|------------|
| Latency (p50) | 2-5 seconds | 50-100ms |
| Latency (p95) | 8-15 seconds | 200ms |
| Cost per query | $0.02-0.10 | $0.002-0.01 |
| Cache hit rate | N/A | 40-70% |

---

## Smart Model Routing

### Overview

Automatically select the optimal AI model based on query complexity, cost constraints, and quality requirements. The routing system integrates with **AI Model Connections** and **Prompt Management** to ensure the best model is used with the best prompt for each insight type.

> **See**: [AI-MODEL-CONNECTIONS.md](./AI-MODEL-CONNECTIONS.md) for full model selection architecture

### Routing Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MODEL ROUTING FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Intent Analysis Result                                                     │
│  - insightType: "analysis"                                                  │
│  - subtype: "risk"                                                          │
│  - complexity: "high"                                                       │
│  - estimatedContextTokens: 4500                                             │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PROMPT TEMPLATE SELECTION                                          │   │
│  │  - Get active prompt for insightType: "analysis"                    │   │
│  │  - Check tenant-specific prompt → Fallback to system prompt         │   │
│  │  - Extract model requirements from prompt template                  │   │
│  │    • Preferred models: ["gpt-4o", "claude-3-5-sonnet"]              │   │
│  │    • Min context window: 8000                                       │   │
│  │    • Required capabilities: ["json_mode"]                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MODEL ROUTER                                                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  Rule 1: Check prompt.modelRequirements.preferredModels             │   │
│  │  Rule 2: insightType == 'extraction' → gpt-4o-mini (cheap, fast)    │   │
│  │  Rule 3: complexity == 'high' → gpt-4o (accurate)                   │   │
│  │  Rule 4: contextTokens > 100K → claude-3.5-sonnet (200K context)    │   │
│  │  Rule 5: generation.type == 'code' → claude-3.5-sonnet              │   │
│  │  Rule 6: userTier == 'free' → gpt-4o-mini (cost control)            │   │
│  │                                                                      │   │
│  │  Selected: gpt-4o (Prompt preference + Rule 3 matched)              │   │
│  │  Fallback: claude-3.5-sonnet                                        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  COST ESTIMATION                                                     │   │
│  │                                                                      │   │
│  │  Input: 4500 tokens × $2.50/M = $0.011                              │   │
│  │  Output (est): 500 tokens × $10.00/M = $0.005                       │   │
│  │  Total: ~$0.016                                                      │   │
│  │                                                                      │   │
│  │  Within budget? ✓                                                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  Execute with gpt-4o + selected prompt template                             │
│  (If fails, retry with claude-3-5-sonnet)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Integration with Prompt Management

The Smart Model Routing system reads model preferences directly from active prompt templates:

```typescript
// In AIModelSelectionService
async selectModel(requirements: ModelSelectionRequirements): Promise<AIConnection> {
  // Get active prompt template for this insight type
  const prompt = await this.promptManagementService.getActivePrompt(
    requirements.tenantId,
    requirements.insightType
  );
  
  // Use prompt's preferred models as first priority
  if (prompt?.modelRequirements?.preferredModels) {
    requirements.preferredModels = prompt.modelRequirements.preferredModels;
    requirements.minContextWindow = prompt.modelRequirements.minContextWindow;
    requirements.requiredCapabilities = prompt.modelRequirements.requiredCapabilities;
  }
  
  // Continue with normal model selection logic...
  return this.selectBestModel(requirements);
}
```

This allows super admins to optimize not just prompts, but also model selection through the Prompt Management UI.

### Routing Configuration

```typescript
interface ModelRoutingConfig {
  enabled: boolean;
  
  // Default model hierarchy (from c_aimodel)
  defaultHierarchy: {
    assistantModel: boolean;      // Check assistant-specific first
    promptPreference: boolean;    // NEW: Check prompt template preferences
    tenantDefault: boolean;       // Then tenant default
    systemDefault: boolean;       // Then system default
  };
  
  // Routing rules (evaluated in order)
  rules: ModelRoutingRule[];
  
  // Cost controls
  costControl: {
    enabled: boolean;
    maxCostPerQuery: number;      // e.g., $0.10
    monthlyBudgetPerTenant: number;
    downgradeOnBudgetExceed: boolean;
  };
  
  // Fallback strategy
  fallback: {
    enabled: boolean;
    maxRetries: number;
    retryDelayMs: number;
  };
}

interface ModelRoutingRule {
  id: string;
  name: string;
  priority: number;               // Higher = evaluated first
  
  // Conditions (all must match)
  conditions: {
    insightTypes?: InsightType[];
    insightSubtypes?: string[];
    complexity?: ('low' | 'medium' | 'high')[];
    contextTokens?: { min?: number; max?: number };
    userTiers?: string[];
    tenantIds?: string[];         // Specific tenants
    timeOfDay?: { start: string; end: string }; // Off-peak routing
  };
  
  // Model selection
  model: {
    primary: string;              // c_aimodel ID or model name
    fallback?: string;
  };
  
  // Optimization priority
  priority: 'cost' | 'quality' | 'speed' | 'balanced';
}
```

### Complexity Estimation

```typescript
interface ComplexityEstimator {
  estimate(intent: IntentAnalysisResult, context: AssembledContext): ComplexityScore;
}

interface ComplexityScore {
  level: 'low' | 'medium' | 'high';
  score: number;                  // 0-100
  
  factors: {
    queryComplexity: number;      // Based on intent analysis
    contextSize: number;          // Token count
    relationshipDepth: number;    // Graph complexity
    reasoningRequired: number;    // Does it need multi-step reasoning?
    outputComplexity: number;     // Expected output complexity
  };
}

function estimateComplexity(
  intent: IntentAnalysisResult,
  context: AssembledContext
): ComplexityScore {
  let score = 0;
  
  // Query complexity
  if (['prediction', 'comparison', 'recommendation'].includes(intent.type)) {
    score += 30;
  }
  if (intent.subtype === 'risk' || intent.subtype === 'sentiment') {
    score += 15;
  }
  
  // Context size
  const contextTokens = context.tokenUsage.total;
  if (contextTokens > 8000) score += 20;
  else if (contextTokens > 4000) score += 10;
  
  // Relationship depth
  if (context.relatedShards.length > 10) score += 15;
  
  // Reasoning required
  if (intent.type === 'prediction' || intent.type === 'analysis') {
    score += 20;
  }
  
  // Output complexity
  if (intent.output.formats.includes('chart') || intent.output.formats.includes('table')) {
    score += 10;
  }
  
  const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  
  return { level, score, factors: { /* ... */ } };
}
```

### Model Capability Matrix

```typescript
const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  'gpt-4o': {
    strengths: ['reasoning', 'analysis', 'complex_tasks'],
    weaknesses: ['cost'],
    maxContext: 128000,
    costPerMillion: { input: 2.50, output: 10.00 },
    latency: 'medium',
    qualityScore: 95,
  },
  'gpt-4o-mini': {
    strengths: ['speed', 'cost', 'simple_tasks'],
    weaknesses: ['complex_reasoning'],
    maxContext: 128000,
    costPerMillion: { input: 0.15, output: 0.60 },
    latency: 'fast',
    qualityScore: 80,
  },
  'claude-3.5-sonnet': {
    strengths: ['long_context', 'code', 'writing'],
    weaknesses: ['speed'],
    maxContext: 200000,
    costPerMillion: { input: 3.00, output: 15.00 },
    latency: 'slow',
    qualityScore: 93,
  },
  'claude-3.5-haiku': {
    strengths: ['speed', 'cost', 'extraction'],
    weaknesses: ['complex_reasoning'],
    maxContext: 200000,
    costPerMillion: { input: 0.25, output: 1.25 },
    latency: 'fast',
    qualityScore: 78,
  },
};
```

---

## Chain-of-Thought Reasoning

### Overview

Enable the AI to "think out loud" for complex questions, improving accuracy and providing transparency.

### Configuration

```typescript
interface ChainOfThoughtConfig {
  enabled: boolean;
  
  // When to use CoT
  triggers: ChainOfThoughtTrigger[];
  
  // Display options
  display: {
    showToUser: boolean;          // Show thinking process
    collapsible: boolean;         // Collapse by default
    formatAs: 'bullets' | 'numbered' | 'prose';
  };
  
  // Verification
  selfVerification: {
    enabled: boolean;
    checkFactsAgainstContext: boolean;
    flagContradictions: boolean;
  };
  
  // Token management
  tokens: {
    maxThinkingTokens: number;    // Limit thinking length
    includeInResponse: boolean;   // Include in final response
  };
}

type ChainOfThoughtTrigger =
  | 'complex_analysis'
  | 'prediction'
  | 'recommendation'
  | 'comparison'
  | 'multi_step_reasoning'
  | 'always'
  | 'never';
```

### Reasoning Prompt

```handlebars
## CHAIN-OF-THOUGHT REASONING

{{#if chainOfThought.enabled}}
For complex questions, think through the problem step by step before answering.

### Reasoning Process

1. **Understand**: What is the user asking?
2. **Gather**: What relevant information is in the context?
3. **Analyze**: What patterns or insights emerge?
4. **Verify**: Do my conclusions match the data?
5. **Synthesize**: What's the final answer?

### Format

{{#if chainOfThought.display.showToUser}}
Show your reasoning in a <thinking> block:

<thinking>
1. The user wants to know about risks...
2. Looking at the activity log, I see...
3. The meeting notes mention...
4. Synthesizing these findings...
</thinking>

Then provide your final answer.
{{else}}
Think through the problem internally, then provide only the final answer.
{{/if}}

{{#if chainOfThought.selfVerification.enabled}}
### Self-Verification

Before finalizing your response:
- [ ] Have I cited sources for all factual claims?
- [ ] Do my conclusions follow from the evidence?
- [ ] Have I addressed the user's actual question?
- [ ] Are there any contradictions in my reasoning?
{{/if}}
{{/if}}
```

### Example Output

```markdown
<thinking>
**Understanding the question**: The user wants to know if Deal X is at risk.

**Gathering relevant information**:
1. Activity log: Last contact was November 16 (14 days ago)
2. Deal stage: Negotiation (stuck for 3 weeks)
3. Meeting notes from Nov 15: "Client mentioned budget constraints"
4. Competitor mention in email: "Evaluating Competitor Y as well"

**Analysis**:
- 14-day gap in contact is concerning (our benchmark is 7 days max)
- Deal has been in negotiation longer than average (avg: 2 weeks, this: 3 weeks)
- Budget concerns + competitor evaluation = high risk combination

**Verification**:
- ✓ All facts sourced from context
- ✓ Conclusions logically follow from evidence
- ✓ Addresses the user's question about risk

**Confidence**: High (based on 4 concrete data points)
</thinking>

## Risk Assessment: Deal X

**Risk Level: HIGH** 🔴

Based on my analysis, this deal shows **3 significant risk indicators**:

1. **Engagement Gap** [1]
   - Last contact: 14 days ago (Nov 16)
   - Benchmark: Contact every 7 days in negotiation

2. **Stage Stagnation** [2]
   - In negotiation for 3 weeks
   - Average negotiation duration: 2 weeks

3. **Competitive Pressure** [3]
   - Client evaluating Competitor Y
   - Combined with budget concerns = high risk

**Recommended Actions**:
1. Schedule urgent call with stakeholder this week
2. Prepare ROI justification for budget concerns
3. Identify and address competitor differentiators

---
**Sources**:
[1] Activity Log
[2] Deal Stage History
[3] Email Thread - Nov 10
```

---

## Proactive Insight Agents

### Overview

Background agents that continuously monitor data and generate insights when conditions are met.

### Agent Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PROACTIVE AGENT ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      EVENT STREAM                                    │   │
│  │  (Shard created, updated, deleted, relationship changed)             │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                          │
│                                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      AGENT EVALUATOR                                 │   │
│  │                                                                      │   │
│  │  For each event:                                                     │   │
│  │  1. Find agents subscribed to this shard type                        │   │
│  │  2. Evaluate agent conditions against shard data                     │   │
│  │  3. If conditions met, queue insight generation                      │   │
│  │                                                                      │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                          │
│           ┌─────────────────────┴─────────────────────┐                   │
│           │                                           │                   │
│           ▼                                           ▼                   │
│  ┌─────────────────────┐                   ┌─────────────────────┐       │
│  │  DEAL AT RISK       │                   │  MILESTONE SLIP     │       │
│  │  Agent              │                   │  Agent              │       │
│  ├─────────────────────┤                   ├─────────────────────┤       │
│  │                     │                   │                     │       │
│  │  Conditions:        │                   │  Conditions:        │       │
│  │  - No activity 14d  │                   │  - Milestone overdue│       │
│  │  - Stage unchanged  │                   │  - No update 7d     │       │
│  │  - Close date < 30d │                   │                     │       │
│  │                     │                   │                     │       │
│  │  Actions:           │                   │  Actions:           │       │
│  │  - Generate insight │                   │  - Generate insight │       │
│  │  - Notify owner     │                   │  - Notify PM        │       │
│  │  - Create task      │                   │  - Create task      │       │
│  │                     │                   │                     │       │
│  └──────────┬──────────┘                   └──────────┬──────────┘       │
│             │                                         │                   │
│             └───────────────────┬─────────────────────┘                   │
│                                 │                                          │
│                                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      NOTIFICATION SYSTEM                             │   │
│  │                                                                      │   │
│  │  - In-app notification                                               │   │
│  │  - Email digest                                                      │   │
│  │  - Slack message                                                     │   │
│  │  - Dashboard widget                                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Configuration

```typescript
interface ProactiveAgent {
  id: string;
  name: string;
  description: string;
  
  // Scope
  tenantId?: string;              // Tenant-specific or global
  userId?: string;                // User-specific
  
  // What to monitor
  monitor: {
    shardTypes: string[];
    events: ShardEvent[];
    checkIntervalMinutes: number; // For scheduled checks
  };
  
  // Conditions (all must be true)
  conditions: AgentCondition[];
  
  // Actions when triggered
  actions: AgentAction[];
  
  // Delivery
  delivery: {
    recipients: AgentRecipient[];
    channels: ('in_app' | 'email' | 'slack' | 'webhook')[];
    digest: {
      enabled: boolean;
      frequency: 'immediate' | 'hourly' | 'daily';
    };
  };
  
  // Status
  isActive: boolean;
  lastTriggeredAt?: Date;
  triggerCount: number;
  
  // Throttling
  throttle: {
    maxTriggersPerHour: number;
    cooldownMinutes: number;      // After triggering, wait before re-triggering
  };
}

interface AgentCondition {
  type: 'field_value' | 'time_since' | 'count' | 'comparison' | 'custom';
  
  // For field_value
  field?: string;
  operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value?: any;
  
  // For time_since
  sinceField?: string;            // e.g., 'lastActivityAt'
  durationDays?: number;
  
  // For count
  countOf?: string;               // e.g., 'relationships.has_stakeholder'
  countOperator?: 'gt' | 'lt' | 'eq';
  countValue?: number;
  
  // For custom
  expression?: string;            // Custom expression
}

interface AgentAction {
  type: 'generate_insight' | 'send_notification' | 'create_task' | 'update_shard' | 'webhook';
  
  // For generate_insight
  insightConfig?: {
    type: InsightType;
    template?: string;
  };
  
  // For send_notification
  notificationConfig?: {
    title: string;
    body: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
  };
  
  // For create_task
  taskConfig?: {
    title: string;
    description?: string;
    dueDate?: string;             // Expression like '+3d'
    assignTo: 'owner' | 'manager' | 'specific';
    specificUserId?: string;
  };
  
  // For webhook
  webhookConfig?: {
    webhookId: string;
    payload?: Record<string, any>;
  };
}

interface AgentRecipient {
  type: 'owner' | 'manager' | 'team' | 'specific_user' | 'role';
  userId?: string;
  roleId?: string;
  teamId?: string;
}
```

### Built-in Agent Templates

```typescript
const BUILT_IN_AGENTS: ProactiveAgent[] = [
  // Deal at Risk
  {
    id: 'agent_deal_at_risk',
    name: 'Deal at Risk',
    description: 'Alerts when a deal shows risk indicators',
    monitor: {
      shardTypes: ['c_opportunity'],
      events: ['shard.updated'],
      checkIntervalMinutes: 60,
    },
    conditions: [
      { type: 'field_value', field: 'stage', operator: 'not_contains', value: 'closed' },
      { type: 'time_since', sinceField: 'lastActivityAt', durationDays: 14 },
      { type: 'field_value', field: 'expectedCloseDate', operator: 'lte', value: '+30d' },
    ],
    actions: [
      { type: 'generate_insight', insightConfig: { type: 'analysis', template: 'deal_risk' } },
      { type: 'send_notification', notificationConfig: { title: 'Deal at Risk', priority: 'high' } },
    ],
    delivery: {
      recipients: [{ type: 'owner' }],
      channels: ['in_app', 'email'],
      digest: { enabled: false },
    },
  },
  
  // Milestone Slipping
  {
    id: 'agent_milestone_slip',
    name: 'Milestone Slipping',
    description: 'Alerts when a project milestone is overdue',
    monitor: {
      shardTypes: ['c_project'],
      events: ['shard.updated'],
      checkIntervalMinutes: 120,
    },
    conditions: [
      { type: 'field_value', field: 'status', operator: 'eq', value: 'active' },
      { type: 'custom', expression: 'any(milestones, m => m.status == "pending" && m.dueDate < today())' },
    ],
    actions: [
      { type: 'generate_insight', insightConfig: { type: 'analysis', template: 'milestone_risk' } },
      { type: 'create_task', taskConfig: { title: 'Review overdue milestone', dueDate: '+1d', assignTo: 'owner' } },
    ],
    delivery: {
      recipients: [{ type: 'owner' }, { type: 'manager' }],
      channels: ['in_app'],
      digest: { enabled: true, frequency: 'daily' },
    },
  },
  
  // Competitor Mention
  {
    id: 'agent_competitor_mention',
    name: 'Competitor Mentioned',
    description: 'Alerts when a competitor is mentioned in notes or documents',
    monitor: {
      shardTypes: ['c_note', 'c_document'],
      events: ['shard.created', 'shard.updated'],
      checkIntervalMinutes: 0, // Real-time
    },
    conditions: [
      { type: 'custom', expression: 'matchesAny(content, tenantConfig.competitorKeywords)' },
    ],
    actions: [
      { type: 'send_notification', notificationConfig: { title: 'Competitor Mentioned', priority: 'normal' } },
    ],
    delivery: {
      recipients: [{ type: 'owner' }],
      channels: ['in_app'],
      digest: { enabled: true, frequency: 'daily' },
    },
  },
  
  // Sentiment Shift
  {
    id: 'agent_sentiment_shift',
    name: 'Sentiment Shift',
    description: 'Alerts when communication sentiment turns negative',
    monitor: {
      shardTypes: ['c_note', 'c_email'],
      events: ['shard.created'],
      checkIntervalMinutes: 0,
    },
    conditions: [
      { type: 'custom', expression: 'analyzeSentiment(content) < -0.3' },
    ],
    actions: [
      { type: 'generate_insight', insightConfig: { type: 'analysis', template: 'sentiment_analysis' } },
      { type: 'send_notification', notificationConfig: { title: 'Negative Sentiment Detected', priority: 'high' } },
    ],
    delivery: {
      recipients: [{ type: 'owner' }],
      channels: ['in_app'],
      digest: { enabled: false },
    },
  },
  
  // Stakeholder Change
  {
    id: 'agent_stakeholder_change',
    name: 'Stakeholder Change',
    description: 'Alerts when a key stakeholder leaves or changes role',
    monitor: {
      shardTypes: ['c_contact'],
      events: ['shard.updated', 'shard.deleted'],
      checkIntervalMinutes: 0,
    },
    conditions: [
      { type: 'field_value', field: 'role', operator: 'eq', value: 'champion' },
      { type: 'custom', expression: 'changed("status") || changed("company") || event == "deleted"' },
    ],
    actions: [
      { type: 'send_notification', notificationConfig: { title: 'Key Stakeholder Change', priority: 'urgent' } },
      { type: 'create_task', taskConfig: { title: 'Review stakeholder change impact', dueDate: '+1d', assignTo: 'owner' } },
    ],
    delivery: {
      recipients: [{ type: 'owner' }],
      channels: ['in_app', 'email'],
      digest: { enabled: false },
    },
  },
];
```

---

## Multi-Modal Insights

### Overview

Support for images, charts, audio, and document analysis in both input and output.

### Configuration

```typescript
interface MultiModalConfig {
  // Input modalities
  input: {
    text: boolean;                // Always true
    images: {
      enabled: boolean;
      supportedFormats: ('jpg' | 'png' | 'gif' | 'webp')[];
      maxSizeBytes: number;
      analysis: {
        ocr: boolean;             // Extract text from images
        objectDetection: boolean;
        chartParsing: boolean;    // Parse charts/graphs
      };
    };
    audio: {
      enabled: boolean;
      supportedFormats: ('mp3' | 'wav' | 'm4a' | 'webm')[];
      maxDurationSeconds: number;
      transcription: {
        model: string;            // e.g., 'whisper-1'
        language: 'auto' | string;
      };
    };
    documents: {
      enabled: boolean;
      supportedFormats: ('pdf' | 'docx' | 'pptx' | 'xlsx')[];
      extraction: {
        text: boolean;
        tables: boolean;
        images: boolean;
      };
    };
  };
  
  // Output modalities
  output: {
    text: boolean;                // Always true
    charts: {
      enabled: boolean;
      types: ('bar' | 'line' | 'pie' | 'scatter' | 'funnel' | 'area')[];
      renderLibrary: 'recharts' | 'chart.js' | 'echarts';
    };
    diagrams: {
      enabled: boolean;
      types: ('flowchart' | 'sequence' | 'mindmap' | 'gantt' | 'er')[];
      renderLibrary: 'mermaid' | 'd3';
    };
    audio: {
      enabled: boolean;
      tts: {
        model: string;            // e.g., 'tts-1'
        voice: string;
        speed: number;
      };
    };
  };
}
```

### Chart Generation

```typescript
interface ChartSuggestion {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'funnel' | 'area';
  title: string;
  
  // Data
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  
  // Options
  options: {
    xAxis?: { label: string; type: 'category' | 'time' | 'linear' };
    yAxis?: { label: string; format: 'number' | 'currency' | 'percentage' };
    legend?: boolean;
    stacked?: boolean;
  };
  
  // Insight about the chart
  insight: string;
  
  // Source data
  sourceShards: string[];
}

// Example prompt instruction for chart generation:
const CHART_GENERATION_PROMPT = `
## CHART GENERATION

When data can be visualized, suggest an appropriate chart.

### Format

\`\`\`chart
{
  "type": "bar",
  "title": "Pipeline by Stage",
  "data": {
    "labels": ["Qualification", "Proposal", "Negotiation", "Closed"],
    "datasets": [{
      "label": "Deal Value ($)",
      "data": [150000, 280000, 420000, 350000]
    }]
  },
  "insight": "Most value is in Negotiation stage, indicating strong near-term potential."
}
\`\`\`

### Chart Type Selection

- **Bar**: Comparing categories
- **Line**: Trends over time
- **Pie**: Part-to-whole relationships
- **Funnel**: Stage progression (pipeline)
- **Scatter**: Correlations between metrics
`;
```

---

## Memory & Long-Term Context

### Overview

Remember important information across conversations and sessions.

### Memory Types

```typescript
interface MemorySystem {
  // Memory categories
  categories: {
    // User preferences learned over time
    userPreferences: UserPreferenceMemory[];
    
    // Facts about users
    userFacts: UserFactMemory[];
    
    // Facts about entities (companies, contacts, etc.)
    entityFacts: EntityFactMemory[];
    
    // Compressed conversation summaries
    conversationSummaries: ConversationSummary[];
    
    // Explicit memories (user said "remember this")
    explicitMemories: ExplicitMemory[];
  };
  
  // Configuration
  config: MemoryConfig;
}

interface MemoryConfig {
  enabled: boolean;
  
  // Storage limits
  limits: {
    maxMemoriesPerUser: number;
    maxMemoriesPerEntity: number;
    retentionDays: number;
  };
  
  // Learning settings
  learning: {
    learnPreferencesAutomatically: boolean;
    learnFactsAutomatically: boolean;
    requireConfirmation: boolean;
  };
  
  // Retrieval
  retrieval: {
    includeInContext: boolean;
    maxMemoriesPerQuery: number;
    relevanceThreshold: number;
  };
}

interface UserPreferenceMemory {
  id: string;
  userId: string;
  
  // What was learned
  preference: {
    type: 'response_length' | 'format' | 'tone' | 'detail_level' | 'focus_area' | 'custom';
    value: string;
    confidence: number;
  };
  
  // How it was learned
  source: {
    type: 'explicit' | 'inferred';
    conversationId?: string;
    messageId?: string;
    inferredFrom?: string;
  };
  
  // Metadata
  createdAt: Date;
  lastUsedAt: Date;
  useCount: number;
}

interface EntityFactMemory {
  id: string;
  tenantId: string;
  
  // Entity reference
  entity: {
    shardId: string;
    shardTypeId: string;
    name: string;
  };
  
  // The fact
  fact: {
    content: string;
    category: 'process' | 'preference' | 'history' | 'relationship' | 'custom';
    confidence: number;
  };
  
  // Source
  source: {
    type: 'explicit' | 'extracted' | 'inferred';
    sourceShardId?: string;
    conversationId?: string;
  };
  
  // Metadata
  createdAt: Date;
  lastVerifiedAt: Date;
  verificationCount: number;
}

interface ExplicitMemory {
  id: string;
  userId: string;
  tenantId: string;
  
  // The memory
  content: string;
  
  // Context
  context: {
    relatedShardIds: string[];
    conversationId: string;
    createdAt: Date;
  };
  
  // User instruction
  instruction: string;            // "Remember that..." or "Don't forget..."
}
```

### Memory Prompt Integration

```handlebars
## MEMORY CONTEXT

{{#if memory.enabled}}
### Relevant Memories

{{#if memory.userPreferences.length}}
**User Preferences** (learned from past interactions):
{{#each memory.userPreferences}}
- {{preference.type}}: {{preference.value}}
{{/each}}
{{/if}}

{{#if memory.entityFacts.length}}
**Entity Facts** (known information):
{{#each memory.entityFacts}}
- {{entity.name}}: {{fact.content}}
{{/each}}
{{/if}}

{{#if memory.explicitMemories.length}}
**Explicit Memories** (user asked to remember):
{{#each memory.explicitMemories}}
- {{content}}
{{/each}}
{{/if}}

### Using Memories

- Reference relevant memories when they apply
- Update or correct memories if user provides new information
- If user says "remember X", create an explicit memory
- If user says "forget X", mark the memory as deleted
{{/if}}
```

---

## Collaborative Insights

### Overview

Enable team collaboration on AI insights.

### Features

```typescript
interface CollaborativeFeatures {
  // Sharing
  sharing: {
    shareInsight: {
      enabled: boolean;
      shareWith: ('team' | 'tenant' | 'specific_users')[];
      includeContext: boolean;    // Include source context?
      includeConversation: boolean; // Include full conversation?
    };
    
    shareConversation: {
      enabled: boolean;
      shareWith: ('team' | 'tenant' | 'specific_users')[];
      readOnly: boolean;          // Can others continue the conversation?
    };
  };
  
  // Mentions
  mentions: {
    enabled: boolean;
    notifyMentioned: boolean;
    mentionSyntax: '@username';
  };
  
  // Team context
  teamContext: {
    // Aggregate data across team
    aggregateTeamData: boolean;
    
    // Compare user to team
    benchmarkAgainstTeam: boolean;
    
    // Cross-user insights
    crossUserInsights: boolean;
  };
  
  // Comments
  comments: {
    enabled: boolean;
    onInsights: boolean;
    onConversations: boolean;
    threadedReplies: boolean;
  };
}
```

### Shared Insight

```typescript
interface SharedInsight {
  id: string;
  
  // Original insight
  insightId: string;
  conversationId: string;
  messageId: string;
  
  // Sharing details
  sharedBy: string;
  sharedAt: Date;
  sharedWith: {
    type: 'team' | 'tenant' | 'users';
    teamId?: string;
    userIds?: string[];
  };
  
  // Content snapshot
  content: {
    query: string;
    response: string;
    citations: SourceCitation[];
  };
  
  // Engagement
  engagement: {
    views: number;
    reactions: Reaction[];
    comments: Comment[];
  };
  
  // Permissions
  permissions: {
    canComment: boolean;
    canReact: boolean;
    canContinue: boolean;         // Can continue the conversation
  };
}
```

---

## Workflow Automation

### Overview

Automatically trigger actions based on AI insights.

### Automation Rules

```typescript
interface WorkflowAutomation {
  id: string;
  name: string;
  description: string;
  
  // Trigger
  trigger: {
    type: 'on_insight' | 'on_risk_detected' | 'on_action_extracted' | 'on_schedule';
    
    // Conditions
    conditions: {
      insightTypes?: InsightType[];
      confidenceMin?: number;
      riskLevel?: ('high' | 'critical')[];
      actionTypes?: string[];
    };
  };
  
  // Actions
  actions: WorkflowAction[];
  
  // Approval
  approval: {
    required: boolean;
    approvers: string[];
    autoApproveAfter?: number;    // Auto-approve after N hours
  };
  
  // Status
  isActive: boolean;
}

interface WorkflowAction {
  type: 'create_task' | 'send_notification' | 'update_shard' | 'send_email' | 'trigger_webhook' | 'start_workflow';
  
  // Action configuration
  config: Record<string, any>;
  
  // Conditions for this specific action
  conditions?: Record<string, any>;
  
  // Delay
  delayMinutes?: number;
}
```

### Example Workflows

```typescript
const EXAMPLE_WORKFLOWS: WorkflowAutomation[] = [
  {
    id: 'workflow_risk_to_task',
    name: 'Risk Detection → Task Creation',
    description: 'Automatically create a task when a high-risk deal is detected',
    trigger: {
      type: 'on_risk_detected',
      conditions: {
        insightTypes: ['analysis'],
        riskLevel: ['high', 'critical'],
      },
    },
    actions: [
      {
        type: 'create_task',
        config: {
          title: 'Review at-risk deal: {{shard.name}}',
          description: 'AI detected risk: {{insight.summary}}',
          dueDate: '+2d',
          priority: 'high',
          assignTo: 'owner',
        },
      },
      {
        type: 'send_notification',
        config: {
          title: 'Deal at Risk',
          body: '{{shard.name}} has been flagged as at-risk. A task has been created.',
          channels: ['in_app', 'email'],
        },
      },
    ],
    approval: { required: false },
    isActive: true,
  },
  
  {
    id: 'workflow_action_items',
    name: 'Extracted Actions → Tasks',
    description: 'Convert AI-extracted action items into tasks',
    trigger: {
      type: 'on_action_extracted',
      conditions: {
        actionTypes: ['follow_up', 'meeting', 'deliverable'],
      },
    },
    actions: [
      {
        type: 'create_task',
        config: {
          title: '{{action.title}}',
          description: 'Extracted from: {{source.name}}\n\n{{action.description}}',
          dueDate: '{{action.dueDate}}',
          assignTo: '{{action.owner}}',
        },
      },
    ],
    approval: { required: true, approvers: ['owner'] },
    isActive: true,
  },
];
```

---

## Explainable AI (XAI)

### Overview

Help users understand WHY the AI made specific recommendations or conclusions.

### Explainability Configuration

```typescript
interface ExplainabilityConfig {
  enabled: boolean;
  
  // What to explain
  explain: {
    reasoning: boolean;           // Why this conclusion?
    sources: boolean;             // What data was used?
    confidence: boolean;          // Why this confidence level?
    alternatives: boolean;        // What other options exist?
    methodology: boolean;         // How was this calculated?
  };
  
  // Presentation
  presentation: {
    showByDefault: boolean;       // Show explanation without asking
    expandable: boolean;          // Collapse by default
    visualize: boolean;           // Show decision tree/flowchart
  };
  
  // Interactivity
  interactivity: {
    allowDrillDown: boolean;      // Click to see more detail
    allowWhatIf: boolean;         // "What if X was different?"
    allowSourceInspection: boolean; // Click to see source data
  };
}
```

### Explanation Format

```typescript
interface InsightExplanation {
  // Summary
  summary: string;
  
  // Reasoning steps
  reasoning: ReasoningStep[];
  
  // Data sources used
  sources: {
    shards: SourceCitation[];
    ragChunks: RetrievedChunk[];
    externalData?: ExternalDataSource[];
  };
  
  // Confidence breakdown
  confidence: {
    overall: number;
    factors: {
      name: string;
      score: number;
      explanation: string;
    }[];
  };
  
  // Alternative conclusions
  alternatives?: {
    conclusion: string;
    probability: number;
    reasoning: string;
  }[];
  
  // Methodology
  methodology?: {
    approach: string;
    assumptions: string[];
    limitations: string[];
  };
}

interface ReasoningStep {
  step: number;
  action: string;                 // "Analyzed", "Compared", "Concluded"
  description: string;
  evidence?: string;
  source?: SourceCitation;
}
```

### Explanation Prompt

```handlebars
## EXPLAINABILITY

{{#if explainability.enabled}}
### Providing Explanations

When generating insights, provide clear explanations:

{{#if explainability.explain.reasoning}}
**Reasoning**: Walk through your thought process step by step.
{{/if}}

{{#if explainability.explain.sources}}
**Sources**: Cite specific data that supports each conclusion.
{{/if}}

{{#if explainability.explain.confidence}}
**Confidence**: Explain why you are confident (or not) in your conclusion.
{{/if}}

{{#if explainability.explain.alternatives}}
**Alternatives**: If other conclusions are possible, mention them.
{{/if}}

### Format

Provide explanations in a collapsible section:

<explanation>
**Why this conclusion?**
1. I analyzed the activity log and found...
2. Comparing to similar deals, I noticed...
3. Based on these factors, I concluded...

**Key Evidence**:
- [1] Activity gap of 14 days (vs. benchmark of 7 days)
- [2] Budget concern mentioned in meeting notes
- [3] Competitor evaluation in progress

**Confidence: 85%**
- Data quality: High (recent, complete)
- Pattern match: Strong (similar to 12 at-risk deals)
- Uncertainty: Close date could slip

**Alternative interpretation**:
There's a 15% chance this is normal due to holiday season.
</explanation>
{{/if}}
```

---

## Insight Templates Library

### Overview

Pre-built, customizable insight templates that users can browse and use.

### Template Library

```typescript
interface InsightTemplateLibrary {
  // Built-in templates by category
  categories: Record<string, InsightTemplate[]>;
  
  // User favorites
  userFavorites: Record<string, string[]>; // userId -> templateIds
  
  // User custom templates
  userTemplates: Record<string, InsightTemplate[]>; // userId -> templates
  
  // Tenant custom templates
  tenantTemplates: Record<string, InsightTemplate[]>; // tenantId -> templates
  
  // Usage analytics
  analytics: {
    popular: string[];            // Most used templates
    trending: string[];           // Growing in usage
    recommended: Record<string, string[]>; // Per-user recommendations
  };
}

interface InsightTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  
  // Template configuration
  config: {
    insightType: InsightType;
    defaultScope: ContextScopeType;
    contextTemplate?: string;     // c_contextTemplate ID
    promptOverrides?: Partial<AIPromptSystemConfig>;
  };
  
  // Applicable shard types
  applicableShardTypes: string[];
  
  // Example prompts
  examplePrompts: string[];
  
  // Preview
  preview: {
    thumbnail?: string;           // Preview image
    sampleOutput?: string;        // Example output
  };
  
  // Metadata
  metadata: {
    author: string;
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
    rating: number;
  };
  
  // Permissions
  visibility: 'public' | 'tenant' | 'private';
  tenantId?: string;
  userId?: string;
}
```

### Built-in Templates

```typescript
const INSIGHT_TEMPLATE_LIBRARY: Record<string, InsightTemplate[]> = {
  sales: [
    {
      id: 'tpl_deal_health_check',
      name: 'Deal Health Check',
      description: 'Comprehensive analysis of deal health and risk factors',
      category: 'sales',
      config: {
        insightType: 'analysis',
        defaultScope: 'single_shard',
        contextTemplate: 'deal_analysis',
      },
      applicableShardTypes: ['c_opportunity'],
      examplePrompts: [
        'How healthy is this deal?',
        'What are the risks?',
        'Should I be worried about this opportunity?',
      ],
    },
    {
      id: 'tpl_pipeline_forecast',
      name: 'Pipeline Forecast',
      description: 'Predict pipeline outcomes and identify focus areas',
      category: 'sales',
      config: {
        insightType: 'prediction',
        defaultScope: 'tenant_wide',
      },
      applicableShardTypes: ['c_opportunity'],
      examplePrompts: [
        'What will my pipeline look like at end of quarter?',
        'Which deals are likely to close this month?',
        'Where should I focus my time?',
      ],
    },
    {
      id: 'tpl_competitor_analysis',
      name: 'Competitor Analysis',
      description: 'Analyze competitor mentions and positioning',
      category: 'sales',
      config: {
        insightType: 'analysis',
        defaultScope: 'project',
      },
      applicableShardTypes: ['c_opportunity', 'c_project'],
      examplePrompts: [
        'What competitors are involved?',
        'How are we positioned against the competition?',
        'What are our differentiators?',
      ],
    },
    {
      id: 'tpl_account_expansion',
      name: 'Account Expansion',
      description: 'Identify upsell and cross-sell opportunities',
      category: 'sales',
      config: {
        insightType: 'recommendation',
        defaultScope: 'company',
      },
      applicableShardTypes: ['c_company'],
      examplePrompts: [
        'What expansion opportunities exist?',
        'Where can we grow this account?',
        'What other products might they need?',
      ],
    },
  ],
  
  projects: [
    {
      id: 'tpl_project_status',
      name: 'Project Status',
      description: 'Comprehensive project status summary',
      category: 'projects',
      config: {
        insightType: 'summary',
        defaultScope: 'project',
        contextTemplate: 'project_overview',
      },
      applicableShardTypes: ['c_project'],
      examplePrompts: [
        'What\'s the status of this project?',
        'Summarize project progress',
        'Give me a project update',
      ],
    },
    {
      id: 'tpl_risk_assessment',
      name: 'Risk Assessment',
      description: 'Identify and analyze project risks',
      category: 'projects',
      config: {
        insightType: 'analysis',
        defaultScope: 'project',
      },
      applicableShardTypes: ['c_project'],
      examplePrompts: [
        'What are the risks?',
        'What could go wrong?',
        'Are there any red flags?',
      ],
    },
    {
      id: 'tpl_milestone_tracking',
      name: 'Milestone Tracking',
      description: 'Track milestone progress and predict delays',
      category: 'projects',
      config: {
        insightType: 'comparison',
        defaultScope: 'project',
      },
      applicableShardTypes: ['c_project'],
      examplePrompts: [
        'How are milestones progressing?',
        'Are we on track?',
        'Which milestones are at risk?',
      ],
    },
  ],
  
  executive: [
    {
      id: 'tpl_weekly_briefing',
      name: 'Weekly Briefing',
      description: 'Executive summary of the week\'s activities and priorities',
      category: 'executive',
      config: {
        insightType: 'summary',
        defaultScope: 'time_based',
      },
      applicableShardTypes: [],
      examplePrompts: [
        'Give me my weekly briefing',
        'What happened this week?',
        'What should I know?',
      ],
    },
    {
      id: 'tpl_portfolio_overview',
      name: 'Portfolio Overview',
      description: 'High-level view of all projects and deals',
      category: 'executive',
      config: {
        insightType: 'summary',
        defaultScope: 'tenant_wide',
      },
      applicableShardTypes: [],
      examplePrompts: [
        'How is my portfolio doing?',
        'Overview of all projects',
        'What\'s the state of the business?',
      ],
    },
    {
      id: 'tpl_team_performance',
      name: 'Team Performance',
      description: 'Analyze team metrics and identify coaching opportunities',
      category: 'executive',
      config: {
        insightType: 'analysis',
        defaultScope: 'tenant_wide',
      },
      applicableShardTypes: [],
      examplePrompts: [
        'How is my team performing?',
        'Who needs coaching?',
        'What are the team metrics?',
      ],
    },
  ],
  
  communication: [
    {
      id: 'tpl_meeting_prep',
      name: 'Meeting Preparation',
      description: 'Talking points and background for upcoming meetings',
      category: 'communication',
      config: {
        insightType: 'generation',
        defaultScope: 'project',
      },
      applicableShardTypes: ['c_project', 'c_opportunity', 'c_contact'],
      examplePrompts: [
        'Help me prepare for my meeting with...',
        'What should I discuss?',
        'Give me talking points',
      ],
    },
    {
      id: 'tpl_email_draft',
      name: 'Email Draft',
      description: 'Draft professional emails based on context',
      category: 'communication',
      config: {
        insightType: 'generation',
        defaultScope: 'single_shard',
      },
      applicableShardTypes: ['c_contact', 'c_opportunity', 'c_project'],
      examplePrompts: [
        'Draft a follow-up email',
        'Write an introduction email',
        'Help me respond to...',
      ],
    },
  ],
};
```

---

## Quality Monitoring Dashboard

### Overview

Track AI quality metrics over time to ensure continuous improvement.

### Quality Metrics

```typescript
interface QualityDashboard {
  // Time range
  timeRange: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  
  // Accuracy metrics
  accuracy: AccuracyMetrics;
  
  // User satisfaction metrics
  satisfaction: SatisfactionMetrics;
  
  // Performance metrics
  performance: PerformanceMetrics;
  
  // Cost metrics
  cost: CostMetrics;
  
  // Alerts
  alerts: QualityAlert[];
  
  // Trends
  trends: TrendAnalysis;
}

interface AccuracyMetrics {
  // Grounding
  avgGroundingScore: number;
  groundingTrend: number;         // % change vs previous period
  
  // Hallucinations
  hallucinationRate: number;
  hallucinationTrend: number;
  hallucinationsByType: Record<string, number>;
  
  // Factual errors
  factualErrorRate: number;
  factualErrorsByCategory: Record<string, number>;
  
  // Citation quality
  avgCitationCount: number;
  citationCoverage: number;       // % of claims with citations
}

interface SatisfactionMetrics {
  // Feedback
  thumbsUpRate: number;
  thumbsDownRate: number;
  feedbackTrend: number;
  
  // Engagement
  avgConversationLength: number;
  regenerationRate: number;
  followUpRate: number;
  completionRate: number;         // % who read full response
  
  // By insight type
  satisfactionByType: Record<InsightType, number>;
  
  // By model
  satisfactionByModel: Record<string, number>;
  
  // Feedback reasons (when thumbs down)
  negativeReasons: Record<string, number>;
}

interface PerformanceMetrics {
  // Latency
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  latencyTrend: number;
  
  // Caching
  cacheHitRate: number;
  cacheMissRate: number;
  avgCachedLatencyMs: number;
  
  // Errors
  errorRate: number;
  errorsByType: Record<string, number>;
  
  // Throughput
  totalQueries: number;
  queriesPerHour: number;
  peakQueriesPerHour: number;
}

interface CostMetrics {
  // Token usage
  avgInputTokens: number;
  avgOutputTokens: number;
  totalTokens: number;
  
  // Cost
  avgCostPerQuery: number;
  totalCost: number;
  costTrend: number;
  
  // By model
  costByModel: Record<string, number>;
  tokensByModel: Record<string, number>;
  
  // Savings from caching
  estimatedCacheSavings: number;
}

interface QualityAlert {
  id: string;
  type: 'accuracy_drop' | 'satisfaction_drop' | 'latency_spike' | 'error_spike' | 'cost_spike';
  severity: 'warning' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  triggeredAt: Date;
  acknowledged: boolean;
}

interface TrendAnalysis {
  // Overall quality score (composite)
  qualityScore: number;
  qualityScoreTrend: number;
  
  // Top improvements
  improvements: string[];
  
  // Areas needing attention
  areasToImprove: string[];
  
  // Recommended actions
  recommendations: string[];
}
```

### Alert Configuration

```typescript
interface QualityAlertConfig {
  // Accuracy alerts
  accuracy: {
    groundingScoreThreshold: number;  // Alert if below
    hallucinationRateThreshold: number;
  };
  
  // Satisfaction alerts
  satisfaction: {
    thumbsUpRateThreshold: number;
    regenerationRateThreshold: number;
  };
  
  // Performance alerts
  performance: {
    p95LatencyThreshold: number;
    errorRateThreshold: number;
  };
  
  // Cost alerts
  cost: {
    dailyBudgetThreshold: number;
    avgCostPerQueryThreshold: number;
  };
  
  // Notification
  notification: {
    channels: ('email' | 'slack' | 'in_app')[];
    recipients: string[];
  };
}
```

---

## Hybrid RAG + Graph Retrieval

### Overview

Combine vector search (semantic) with graph traversal (structural) for better retrieval.

### Hybrid Retrieval Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     HYBRID RETRIEVAL FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Query: "What did John say about budget in the Acme project?"               │
│                                                                             │
│         │                                                                   │
│         ├─────────────────────────────────────────────────────────────────┐ │
│         │                                                                 │ │
│         ▼                                                                 ▼ │
│  ┌─────────────────────┐                               ┌─────────────────┐ │
│  │  VECTOR SEARCH      │                               │  GRAPH TRAVERSE │ │
│  │  (Semantic)         │                               │  (Structural)   │ │
│  ├─────────────────────┤                               ├─────────────────┤ │
│  │                     │                               │                 │ │
│  │  embed("budget      │                               │  1. Find John   │ │
│  │   discussion")      │                               │     (c_contact) │ │
│  │                     │                               │                 │ │
│  │  Search notes,      │                               │  2. Find notes  │ │
│  │  documents for      │                               │     linked to   │ │
│  │  semantic match     │                               │     John        │ │
│  │                     │                               │                 │ │
│  │  Results:           │                               │  3. Filter by   │ │
│  │  - Note A (0.92)    │                               │     Acme project│ │
│  │  - Note B (0.87)    │                               │                 │ │
│  │  - Doc C (0.81)     │                               │  Results:       │ │
│  │                     │                               │  - Note A       │ │
│  └──────────┬──────────┘                               │  - Note D       │ │
│             │                                          └────────┬────────┘ │
│             │                                                   │          │
│             └───────────────────┬───────────────────────────────┘          │
│                                 │                                          │
│                                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  KEYWORD SEARCH (Optional)                                          │   │
│  │  - Exact match: "budget"                                            │   │
│  │  - Results: Note A, Note E                                          │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                          │
│                                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FUSION (Reciprocal Rank Fusion)                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  Note A: Vector(0.92) + Graph(match) + Keyword(match) = Score 0.95  │   │
│  │  Note B: Vector(0.87) + Graph(no) + Keyword(no) = Score 0.70        │   │
│  │  Note D: Vector(0.65) + Graph(match) + Keyword(no) = Score 0.75     │   │
│  │  Note E: Vector(0.50) + Graph(no) + Keyword(match) = Score 0.65     │   │
│  │                                                                      │   │
│  │  Final ranking: Note A > Note D > Note B > Note E                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuration

```typescript
interface HybridRetrievalConfig {
  enabled: boolean;
  
  // Vector search (semantic)
  vectorSearch: {
    enabled: boolean;
    weight: number;               // 0-1, contribution to final score
    topK: number;
    minScore: number;
  };
  
  // Graph traversal (structural)
  graphTraversal: {
    enabled: boolean;
    weight: number;
    maxDepth: number;
    relationshipTypes?: string[]; // Which relationships to follow
  };
  
  // Keyword search (exact)
  keywordSearch: {
    enabled: boolean;
    weight: number;
    boostExactMatch: number;      // Boost for exact phrase match
    fields: string[];             // Which fields to search
  };
  
  // Fusion strategy
  fusion: {
    method: 'rrf' | 'weighted_sum' | 'cascade';
    
    // For RRF (Reciprocal Rank Fusion)
    rrfK: number;                 // Default: 60
    
    // For cascade
    cascadeOrder: ('vector' | 'graph' | 'keyword')[];
    cascadeThreshold: number;     // Min results before using next method
  };
  
  // Result merging
  merging: {
    maxResults: number;
    deduplication: boolean;
    preserveSourceScores: boolean;
  };
}
```

### Fusion Algorithms

```typescript
// Reciprocal Rank Fusion (RRF)
function reciprocalRankFusion(
  rankings: Map<string, number>[],  // docId -> rank per method
  k: number = 60
): Map<string, number> {
  const fusedScores = new Map<string, number>();
  
  for (const ranking of rankings) {
    for (const [docId, rank] of ranking) {
      const currentScore = fusedScores.get(docId) || 0;
      fusedScores.set(docId, currentScore + (1 / (k + rank)));
    }
  }
  
  return fusedScores;
}

// Weighted Sum Fusion
function weightedSumFusion(
  scores: Map<string, number>[],    // docId -> score per method
  weights: number[]
): Map<string, number> {
  const fusedScores = new Map<string, number>();
  
  for (let i = 0; i < scores.length; i++) {
    for (const [docId, score] of scores[i]) {
      const currentScore = fusedScores.get(docId) || 0;
      fusedScores.set(docId, currentScore + (score * weights[i]));
    }
  }
  
  return fusedScores;
}
```

---

## Insight Scheduling

### Overview

Allow users to schedule regular insight delivery.

### Configuration

```typescript
interface ScheduledInsight {
  id: string;
  userId: string;
  tenantId: string;
  
  // What to generate
  insight: {
    name: string;
    type: InsightType;
    template?: string;
    scope: ContextScope;
    customPrompt?: string;
  };
  
  // When to generate
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    
    // For daily
    timeOfDay?: string;           // "09:00"
    
    // For weekly
    dayOfWeek?: number;           // 0-6 (Sunday-Saturday)
    
    // For monthly
    dayOfMonth?: number;          // 1-31
    
    // For custom
    cronExpression?: string;      // "0 9 * * 1" (9am every Monday)
    
    timezone: string;
  };
  
  // How to deliver
  delivery: {
    channels: ScheduledDeliveryChannel[];
    format: 'full' | 'summary' | 'digest';
  };
  
  // Status
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt: Date;
  runCount: number;
  
  // History
  history: ScheduledInsightRun[];
}

interface ScheduledDeliveryChannel {
  type: 'in_app' | 'email' | 'slack';
  config: Record<string, any>;
}

interface ScheduledInsightRun {
  id: string;
  runAt: Date;
  status: 'success' | 'failed' | 'skipped';
  insightId?: string;             // Generated insight ID
  error?: string;
  deliveryResults: {
    channel: string;
    status: 'delivered' | 'failed';
    error?: string;
  }[];
}
```

### Scheduling UI Examples

```typescript
const SCHEDULE_PRESETS = [
  {
    name: 'Daily Morning Briefing',
    schedule: {
      frequency: 'daily',
      timeOfDay: '09:00',
      timezone: 'user',
    },
    insight: {
      type: 'summary',
      template: 'daily_briefing',
    },
  },
  {
    name: 'Weekly Pipeline Review',
    schedule: {
      frequency: 'weekly',
      dayOfWeek: 1,               // Monday
      timeOfDay: '09:00',
      timezone: 'user',
    },
    insight: {
      type: 'analysis',
      template: 'pipeline_review',
    },
  },
  {
    name: 'Monthly Performance Report',
    schedule: {
      frequency: 'monthly',
      dayOfMonth: 1,
      timeOfDay: '08:00',
      timezone: 'user',
    },
    insight: {
      type: 'summary',
      template: 'monthly_performance',
    },
  },
];
```

---

---

## Recurring Search with AI Alert Detection

### Overview

Recurring Search enables users to set up automated searches that run on a schedule (hourly, daily, weekly, etc.) and leverage AI-powered delta analysis to detect significant changes and trigger intelligent alerts. This feature combines scheduled execution, LLM-based change detection, and a learning system that improves accuracy over time through user feedback.

### Core Capabilities

**Automated Monitoring**:
- Schedule searches to run automatically (6 frequency options: hourly to yearly)
- Monitor RAG (internal data), Web Search (fresh data), or both
- Support for 5 search types: Sales Opportunity, Risk Monitoring, Competitor Tracking, Regulatory Compliance, Custom

**AI-Powered Alert Detection**:
- LLM-based delta analysis compares current vs. previous results
- Confidence scoring (0-1) with configurable thresholds
- Custom detection prompts or search type-optimized defaults
- Volume and sensitivity level controls

**Learning System**:
- User feedback loop (Relevant ✅ / Not Relevant ❌)
- Automatic prompt refinement based on feedback patterns
- Suppression rules for repeated false positives
- Continuous accuracy improvement (avg +8-10% over time)

**Multi-Channel Notifications**:
- Email, In-App, Webhook, Push, Slack, Teams
- Digest mode (daily/weekly summaries)
- User-configurable notification preferences
- Snooze functionality (1 hour, 1 day, 1 week, custom)

### Architecture Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RECURRING SEARCH SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │
│  │   Schedule   │──►│    Search    │──►│    Alert     │               │
│  │   Manager    │   │   Executor   │   │   Detector   │               │
│  │ (Timer Func) │   │ (Queue Work) │   │  (LLM Delta) │               │
│  └──────────────┘   └──────────────┘   └──────────────┘               │
│         │                    │                   │                     │
│         │                    │                   │                     │
│         ▼                    ▼                   ▼                     │
│  ┌──────────────────────────────────────────────────────┐             │
│  │           Cosmos DB (6 Containers with HPK)           │             │
│  │  • recurringSearches  • searchExecutions              │             │
│  │  • notifications      • suppressionRules              │             │
│  │  • searchStatistics   • c_search (reused)             │             │
│  └──────────────────────────────────────────────────────┘             │
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │
│  │  Learning    │   │ Notification │   │  Statistics  │               │
│  │   System     │   │   Service    │   │   Service    │               │
│  │ (Feedback)   │   │ (6 Channels) │   │ (Analytics)  │               │
│  └──────────────┘   └──────────────┘   └──────────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Use Cases

**Sales Opportunity Monitoring**:
- Track enterprise deals for budget or timeline changes
- Detect new stakeholders or decision-makers entering deals
- Alert on competitor mentions or pricing discussions
- Monitor deal progression and velocity changes

**Risk Monitoring**:
- Identify potential project delays or budget overruns
- Detect sentiment shifts in client communications
- Alert on contract renewal risks or churn signals
- Monitor compliance issues or regulatory concerns

**Competitor Tracking**:
- Track competitor product launches, pricing changes, partnerships
- Monitor competitor mentions in customer conversations
- Alert on competitive threats or market positioning shifts
- Aggregate web + internal data for comprehensive intelligence

**Regulatory Compliance**:
- Monitor for regulatory changes affecting your industry
- Track compliance-related communications and documentation
- Alert on policy violations or audit requirements
- Maintain audit trail with search execution history

### Technical Highlights

**Database Design**:
- 6 Cosmos DB containers with Hierarchical Partition Keys (HPK)
- Optimized indexing for single-partition queries (~2-5 RU)
- Automatic TTL for data retention (30-180 days configurable)
- Migration script provided for container creation

**Alert Detection Flow**:
1. Scheduled execution retrieves current results (RAG/Web)
2. Compare with previous execution results (stored in `c_search`)
3. LLM performs delta analysis with custom or default prompt
4. Calculate confidence scores and filter by threshold
5. Check suppression rules to reduce false positives
6. Create alerts and send multi-channel notifications
7. Store execution statistics for learning system

**Learning System**:
- User feedback: Relevant (✅) or False Positive (❌)
- Analyze feedback patterns to identify common false positives
- Automatically refine detection prompts based on learnings
- Create suppression rules for recurring non-relevant patterns
- Track accuracy metrics (precision, recall, F1 score)
- Typical improvement: 75% → 85%+ accuracy over 30 days

**Performance Metrics**:
- Alert accuracy: 80-85% after learning period
- False positive rate: 15-20% (decreases with feedback)
- Avg execution time: 2-5 seconds (depending on data sources)
- Avg confidence improvement: +8-10% over first month
- Cache hit rate: 60-70% for web search results

### Quota Management

**Default Quotas** (per tenant):
- Free tier: 5 recurring searches
- Standard tier: 10 recurring searches
- Enterprise tier: 50 recurring searches
- Custom: Up to 1,000 (Super Admin override)

**Quota Enforcement**:
- User-level: Count active + paused searches
- Tenant-level: Aggregate across all users
- Super Admin: Can set custom quotas per tenant
- Graceful degradation: Pause oldest searches if quota exceeded

### Integration Points

Recurring Search integrates with existing AI Insights features:

1. **Web Search Integration**: Reuses `c_search` container for web results caching
2. **RAG System**: Leverages existing RAG pipeline for internal data search
3. **Notification System**: NEW global notification service (reusable app-wide)
4. **AI Model Selection**: Uses tenant BYOK or system defaults for LLM calls
5. **Cost Tracking**: Integrates with existing cost tracking system
6. **Access Control**: Respects tenant admin, user, and sharing permissions
7. **Audit Trail**: Execution history stored with full audit details

### Implementation Status

**Documentation**: ✅ Complete (5 new docs + 5 updated docs)
- `RECURRING-SEARCH-OVERVIEW.md` - Architecture and components
- `RECURRING-SEARCH-ALERTS.md` - Alert detection and learning system
- `RECURRING-SEARCH-DATABASE.md` - Database schemas with HPK
- `NOTIFICATIONS.md` - Global notification system (6 channels)
- `RECURRING-SEARCH-SERVICES.md` - TypeScript service implementations

**API**: ✅ Complete (20 endpoints documented)
- 8 User endpoints (CRUD, pause/resume, history)
- 4 Alert endpoints (list, details, feedback, snooze)
- 5 Tenant Admin endpoints (view all, stats, config, analytics, alerts)
- 3 Super Admin endpoints (global stats, quota management, learning metrics)

**UI**: ✅ Complete (4 sections specified)
- Recurring Search Management page (list, create/edit, execution history)
- Alert Dashboard (feed, detail view, feedback, snooze)
- Statistics Dashboard (accuracy charts, quota usage, trends)
- Configuration page (thresholds, digest, retention, learning system)

**Implementation**: 📋 Ready (Step 18 in Implementation Guide)
- Database migration scripts
- Service implementations (RecurringSearchService, AlertAnalysisService, NotificationService)
- Azure Functions (Timer Trigger, Queue Worker)
- API routes and middleware
- Testing strategy (80% coverage target)

### Related Documentation

- [Recurring Search Overview](./RECURRING-SEARCH-OVERVIEW.md)
- [Alert Detection & Learning](./RECURRING-SEARCH-ALERTS.md)
- [Database Schemas](./RECURRING-SEARCH-DATABASE.md)
- [Notification System](./NOTIFICATIONS.md)
- [Service Implementations](./RECURRING-SEARCH-SERVICES.md)
- [API Reference](./API.md#recurring-search-api)
- [UI Specification](./UI-SPECIFICATION.md#recurring-search-management)
- [Implementation Guide](./IMPLEMENTATION-GUIDE.md#step-18-recurring-search-implementation)

---

## Implementation Priority

### Phase 5: Core Features (Already Implemented)

| Priority | Feature | Status | Notes |
|----------|---------|--------|-------|
| ✅ Complete | Prompt Management System | Implemented | Super Admin UI, Versioning, A/B Testing |
| ✅ Complete | Intent Pattern Management | Implemented | LLM-Assisted Pattern Creation |
| ✅ Complete | Web Search Integration | Implemented | Multi-provider, Auto-trigger, Caching |
| ✅ Complete | AI Model Connections | Implemented | Tenant BYOK, Cost Tracking |
| ✅ Complete | **Recurring Search & Alerts** | **Documented** | **Ready for Step 18 Implementation** |

### Phase 6: Performance & Cost Optimization

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 High | Semantic Caching | Medium | High (70-90% cost savings) |
| 🔴 High | Smart Model Routing | Medium | High (cost + quality) |
| 🔴 High | Quality Monitoring Dashboard | Medium | High (continuous improvement) |
| 🟡 Medium | Hybrid RAG + Graph | Medium | Medium (better retrieval) |
| 🟡 Medium | Chain-of-Thought Reasoning | Low | Medium (accuracy) |

### Phase 7: Automation & Intelligence

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 High | Proactive Insight Agents | High | High (differentiation) |
| 🔴 High | Feedback Learning System | Medium | High (long-term quality) |
| 🔴 High | **Recurring Search** (Code) | **High** | **High (automation, alerts)** |
| 🟡 Medium | Workflow Automation | High | Medium (productivity) |
| 🟡 Medium | Insight Scheduling | Medium | Medium (engagement) |
| 🟢 Lower | A/B Testing Framework | Medium | Medium (optimization) |

### Phase 8: User Experience

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 High | Explainable AI (XAI) | Medium | High (trust) |
| 🔴 High | Insight Templates Library | Medium | High (adoption) |
| 🟡 Medium | Memory & Long-Term Context | High | Medium (personalization) |
| 🟡 Medium | Collaborative Insights | Medium | Medium (team value) |
| 🟢 Lower | Multi-Modal Insights | High | Low (future-proofing) |

---

## Related Documentation

- [AI Insights Overview](./README.md)
- [Intent Classification](./INTENT-CLASSIFICATION.md)
- [Web Search Integration](./WEB-SEARCH.md) ✅ NEW
- [Context Assembly](./CONTEXT-ASSEMBLY.md)
- [Grounding & Accuracy](./GROUNDING.md)
- [Prompt Engineering](./PROMPT-ENGINEERING.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0











