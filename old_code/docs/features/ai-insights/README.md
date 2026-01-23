# AI Insights System

## 🚨 IMPORTANT: Container Architecture

**All AI Insights features now use dedicated Cosmos DB containers with Hierarchical Partition Keys (HPK).**

⚠️ **The `c_` prefix is reserved ONLY for shardTypes in the `c_shard` container.** New feature containers use descriptive names without the `c_` prefix.

📋 **See**: [Container Architecture Document](../generated/ai-insights-containers-architecture.md) for complete specifications  
📋 **See**: [Migration Summary](CONTAINER-MIGRATION-SUMMARY.md) for details on the architecture change

---

## Overview

The AI Insights System is Castiel's intelligence layer that transforms raw data into actionable business insights. It leverages context templates, AI models, and conversation history to deliver accurate, personalized, and grounded insights across all interaction points.

> **Philosophy**: "Every piece of data tells a story—AI Insights helps users discover and act on that story."

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Insight Types](#insight-types)
3. [Triggers](#triggers)
4. [Context Scopes](#context-scopes)
5. [Architecture](#architecture)
6. [Accuracy & Grounding](#accuracy--grounding)
7. [Personalization](#personalization)
8. [Output Formats](#output-formats)
9. [Integration Points](#integration-points)
10. [Authorization & Permissions](#authorization--permissions)
11. [Related Documentation](#related-documentation)

---

## Core Concepts

### The Insight Pipeline

Every insight request flows through five stages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INSIGHT PIPELINE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │  INTENT  │──►│ CONTEXT  │──►│ GENERATE │──►│  GROUND  │──►│ DELIVER  │ │
│  │          │   │          │   │          │   │          │   │          │ │
│  │ Classify │   │ Assemble │   │   LLM    │   │  Verify  │   │  Format  │ │
│  │ request  │   │  context │   │  output  │   │  & cite  │   │ & route  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│       │              │              │              │              │        │
│       ▼              ▼              ▼              ▼              ▼        │
│  User query    c_contextTemplate  c_aimodel    Citations    c_conversation │
│  + metadata    + RAG retrieval    streaming    confidence   + widgets     │
│                                                              + alerts      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | ShardType |
|-----------|---------|-----------|
| **Intent Analyzer** | Understand what user wants | - |
| **Context Planner** | Determine what data to include | `c_contextTemplate` |
| **RAG Retriever** | Find relevant chunks | `c_document` embeddings |
| **Model Router** | Select appropriate AI model | `c_aimodel` |
| **Grounding Engine** | Verify and cite sources | - |
| **Response Formatter** | Structure output | - |
| **Conversation Store** | Save interaction | `c_conversation` |

### AI Model Connections Architecture

AI Insights integrates with Castiel's **AI Model Connections** system to provide flexible, cost-effective model management:

#### 🔑 **Key Features**

1. **Tenant BYOK (Bring Your Own Key)**
   - Tenants can connect their own API keys for any supported model
   - Keys are securely stored in Azure Key Vault
   - Tenant connections always take priority over system defaults

2. **System Fallbacks**
   - System-wide default connections ensure service availability
   - Automatic fallback when tenant doesn't have a custom connection
   - Admins manage system connections centrally

3. **Intelligent Model Selection**
   - Automatic model selection based on insight type and requirements
   - Considers context size, capabilities needed, and cost constraints
   - Users can override and specify preferred models

4. **Cost Tracking & Budget Management**
   - Per-tenant usage and cost tracking
   - Real-time cost estimation before generation
   - Budget limits and alerts (optional)

#### 🔄 **Model Selection Flow**

```
User Request
    │
    ├─► Has specific modelId?
    │       │
    │       ├─► Yes ─► Check tenant connection ─► Found ─► Use tenant connection
    │       │                   │
    │       │                   └─► Not found ─► Check system connection ─► Use system
    │       │
    │       └─► No ─► Auto-select optimal model
    │                     │
    │                     ├─► Get tenant connections (BYOK)
    │                     ├─► Get system connections (fallback)
    │                     ├─► Filter by requirements:
    │                     │     • Context window size
    │                     │     • Capabilities (vision, functions, streaming)
    │                     │     • Cost constraints
    │                     │     • Provider preference
    │                     ├─► Rank by insight type:
    │                     │     • Complex insights → GPT-4, Claude 3
    │                     │     • Simple insights → GPT-3.5, GPT-4o-mini
    │                     └─► Prefer tenant connections over system
    │
    └─► Execute with selected connection credentials
```

#### 💰 **Cost Management**

Every insight generation:
1. **Estimates cost** before execution (optional budget check)
2. **Tracks actual usage** (prompt tokens + completion tokens)
3. **Calculates cost** based on model pricing per million tokens
4. **Records metadata** (tenant, user, model, insight type, conversation)
5. **Aggregates statistics** for reporting and analytics

**Cost Tracking Data**:
- Total spend per tenant (daily, monthly, custom period)
- Breakdown by model (which models cost the most)
- Breakdown by insight type (which use cases are expensive)
- Per-user attribution
- Budget alerts and limits

#### 🎯 **Model Selection Strategy**

| Insight Type | Preferred Models | Reasoning |
|--------------|-----------------|-----------|
| **Summary** | GPT-3.5 Turbo, GPT-4o-mini | Fast, cost-effective for simple text condensation |
| **Analysis** | GPT-4o, Claude 3 Opus | Complex reasoning, nuanced understanding |
| **Comparison** | GPT-4 Turbo, Claude 3 Sonnet | Good at structured comparisons |
| **Recommendation** | GPT-4o, Claude 3 Opus | Requires deep context understanding |
| **Prediction** | GPT-4o, Claude 3 Opus | Advanced reasoning about future outcomes |
| **Extraction** | GPT-3.5 Turbo, GPT-4o-mini | Simple pattern matching and extraction |
| **Search** | GPT-3.5 Turbo | Fast query processing |
| **Generation** | GPT-4o, Claude 3 Sonnet | Creative content generation |

#### 🔐 **Security & Privacy**

- **API keys** stored in Azure Key Vault with RBAC
- **Tenant isolation** - each tenant's connections are separate
- **Audit trail** - all connection usage is logged
- **Key rotation** - tenants can update keys anytime
- **Automatic cleanup** - deleted connections remove Key Vault secrets

> **See**: `docs/guides/AI_IMPLEMENTATION_SUMMARY.md` for full AI Connections architecture details

---

## Insight Types

### 1. Summary

**Purpose**: Condense complex information into digestible overviews.

```typescript
interface SummaryInsight {
  type: 'summary';
  scope: 'shard' | 'project' | 'company' | 'portfolio';
  
  // What to summarize
  target: {
    shardId?: string;
    shardTypeId?: string;
    timeRange?: DateRange;
  };
  
  // Output preferences
  format: 'brief' | 'detailed' | 'executive';
  maxLength?: number;
  focusAreas?: string[];  // e.g., ['risks', 'opportunities']
}
```

**Examples**:
- "Summarize Project Alpha"
- "Give me an executive summary of Acme Corp"
- "What happened this week on the Enterprise deal?"

**Template**: `summary_project`, `summary_company`, `summary_activity`

---

### 2. Analysis

**Purpose**: Deep-dive examination of data with insights and patterns.

```typescript
interface AnalysisInsight {
  type: 'analysis';
  analysisType: 
    | 'risk'           // Identify risks and threats
    | 'opportunity'    // Find growth opportunities
    | 'trend'          // Identify patterns over time
    | 'sentiment'      // Analyze sentiment in communications
    | 'relationship'   // Map stakeholder relationships
    | 'gap'            // Find missing information
    | 'performance';   // Evaluate against goals
  
  target: ShardReference;
  depth: 'quick' | 'standard' | 'comprehensive';
  includeRecommendations: boolean;
}
```

**Examples**:
- "Analyze risks in this deal"
- "What's the sentiment from client communications?"
- "Identify gaps in our proposal"

**Template**: `analysis_risk`, `analysis_sentiment`, `analysis_relationship`

---

### 3. Comparison

**Purpose**: Compare entities, time periods, or scenarios.

```typescript
interface ComparisonInsight {
  type: 'comparison';
  comparisonType:
    | 'versus'         // A vs B
    | 'temporal'       // Now vs Before
    | 'benchmark'      // Against standards
    | 'ranking';       // Order by criteria
  
  subjects: ShardReference[];  // What to compare
  dimensions: string[];        // What aspects to compare
  
  // For temporal
  periods?: {
    current: DateRange;
    previous: DateRange;
  };
  
  // For ranking
  sortBy?: string;
  limit?: number;
}
```

**Examples**:
- "Compare Q1 vs Q2 pipeline"
- "How does this deal compare to similar won deals?"
- "Rank my opportunities by likelihood to close"

**Template**: `comparison_deals`, `comparison_periods`, `comparison_performance`

---

### 4. Recommendation

**Purpose**: Suggest actions based on data analysis.

```typescript
interface RecommendationInsight {
  type: 'recommendation';
  recommendationType:
    | 'next_action'    // What to do next
    | 'priority'       // What to focus on
    | 'strategy'       // How to approach
    | 'resource'       // Who/what to involve
    | 'timing';        // When to act
  
  context: {
    userId: string;
    role: string;
    currentFocus?: string[];  // Projects/accounts user owns
  };
  
  constraints?: {
    timeframe?: string;
    budget?: number;
    resources?: string[];
  };
  
  numberOfRecommendations?: number;
}
```

**Examples**:
- "What should I focus on today?"
- "Who should I bring into this deal?"
- "What's the best strategy for this account?"

**Template**: `recommendation_daily`, `recommendation_deal`, `recommendation_account`

---

### 5. Prediction

**Purpose**: Forecast future outcomes based on patterns.

```typescript
interface PredictionInsight {
  type: 'prediction';
  predictionType:
    | 'outcome'        // Will deal close?
    | 'timeline'       // When will it happen?
    | 'value'          // What will be the value?
    | 'risk'           // What could go wrong?
    | 'trend';         // Where is this heading?
  
  target: ShardReference;
  
  // Confidence requirements
  minConfidence?: number;
  showFactors?: boolean;    // Show contributing factors
  showAlternatives?: boolean;  // Show other scenarios
}
```

**Examples**:
- "Will this deal close this quarter?"
- "What's the likely close date?"
- "Predict Q4 pipeline based on current trends"

**Template**: `prediction_deal_outcome`, `prediction_pipeline`, `prediction_timeline`

---

### 6. Extraction

**Purpose**: Pull structured information from unstructured data.

```typescript
interface ExtractionInsight {
  type: 'extraction';
  extractionType:
    | 'action_items'   // Tasks and follow-ups
    | 'key_points'     // Main takeaways
    | 'decisions'      // Decisions made
    | 'questions'      // Open questions
    | 'entities'       // People, companies, products
    | 'dates'          // Mentioned dates/deadlines
    | 'numbers';       // Financial figures, metrics
  
  sources: ShardReference[];  // Where to extract from
  
  // Filtering
  since?: Date;
  owner?: string;
  status?: string;
}
```

**Examples**:
- "List all action items from recent notes"
- "Extract key decisions from meeting notes"
- "What dates were mentioned in the proposal?"

**Template**: `extraction_action_items`, `extraction_decisions`, `extraction_entities`

---

### 7. Search

**Purpose**: Find information using natural language.

```typescript
interface SearchInsight {
  type: 'search';
  searchType:
    | 'semantic'       // Meaning-based search
    | 'filtered'       // With specific criteria
    | 'aggregated';    // Count/group results
  
  query: string;
  
  // Scope
  shardTypes?: string[];
  scope?: ContextScope;
  
  // Filtering
  filters?: Record<string, any>;
  timeRange?: DateRange;
  
  // Results
  limit?: number;
  includeContext?: boolean;
  highlightMatches?: boolean;
}
```

**Examples**:
- "Find contacts who mentioned budget concerns"
- "Which deals mentioned competitor X?"
- "Search for pricing discussions in enterprise accounts"

**Template**: Uses RAG directly, not template-based

---

### 8. Generation

**Purpose**: Create new content based on context.

```typescript
interface GenerationInsight {
  type: 'generation';
  generationType:
    | 'email'          // Draft email
    | 'summary'        // Written summary
    | 'proposal'       // Proposal content
    | 'agenda'         // Meeting agenda
    | 'talking_points' // Call prep
    | 'report'         // Formatted report
    | 'response';      // Reply to message
  
  context: ShardReference[];
  
  // Style
  tone?: 'formal' | 'casual' | 'professional';
  length?: 'brief' | 'standard' | 'detailed';
  
  // For emails
  emailConfig?: {
    to?: string;
    subject?: string;
    purpose?: string;
  };
}
```

**Examples**:
- "Draft a follow-up email"
- "Create talking points for my call with John"
- "Generate a weekly status report"

**Template**: `generation_email`, `generation_agenda`, `generation_report`

---

## Triggers

### 1. On-Demand

User explicitly requests an insight via chat or UI.

```typescript
interface OnDemandTrigger {
  type: 'on_demand';
  source: 'chat' | 'quick_action' | 'context_menu' | 'search';
  userId: string;
  query: string;
  context?: {
    currentShardId?: string;
    currentPage?: string;
  };
}
```

**Entry Points**:
- Chat interface (c_conversation)
- "Ask AI" button on shard pages
- AI-enhanced search
- Quick actions menu

---

### 2. Proactive

System detects conditions that warrant insight generation.

```typescript
interface ProactiveTrigger {
  type: 'proactive';
  condition: ProactiveCondition;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  relatedShards: string[];
}

type ProactiveCondition =
  | 'deal_at_risk'           // No activity, stuck stage
  | 'milestone_approaching'  // Deadline coming up
  | 'anomaly_detected'       // Unusual pattern
  | 'opportunity_found'      // Potential upsell
  | 'action_required'        // Overdue tasks
  | 'relationship_change'    // Stakeholder changes
  | 'competitor_mention'     // Competitor detected
  | 'sentiment_shift';       // Negative sentiment
```

**Detection Rules**:

```typescript
const PROACTIVE_RULES = [
  {
    id: 'deal_stalled',
    name: 'Deal Stalled',
    condition: {
      shardType: 'c_opportunity',
      rules: [
        { field: 'daysInStage', operator: 'gt', value: 14 },
        { field: 'recentActivityCount', operator: 'lt', value: 1 },
      ],
    },
    insight: 'analysis_risk',
    urgency: 'high',
  },
  {
    id: 'close_date_approaching',
    name: 'Close Date Approaching',
    condition: {
      shardType: 'c_opportunity',
      rules: [
        { field: 'daysUntilClose', operator: 'lte', value: 7 },
        { field: 'stage', operator: 'nin', value: ['won', 'lost'] },
      ],
    },
    insight: 'recommendation_next_action',
    urgency: 'high',
  },
];
```

---

### 3. Scheduled

Regular insight delivery on a schedule.

```typescript
interface ScheduledTrigger {
  type: 'scheduled';
  schedule: 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string;
  timezone: string;
  
  insightType: InsightType;
  scope: ContextScope;
  
  delivery: {
    method: 'in_app' | 'email' | 'slack';
    recipients: string[];
  };
}
```

**Examples**:
- **Daily Briefing**: Morning summary of priorities
- **Weekly Pipeline Review**: Pipeline health analysis
- **Monthly Performance**: Goal progress report

---

### 4. Event-Driven

Insight triggered by shard changes.

```typescript
interface EventDrivenTrigger {
  type: 'event_driven';
  event: ShardEvent;
  
  // Only trigger for certain conditions
  conditions?: {
    shardTypes?: string[];
    fields?: string[];
    changeTypes?: ('created' | 'updated' | 'deleted')[];
  };
  
  // Debounce multiple changes
  debounceMs?: number;
  aggregateChanges?: boolean;
}
```

**Event Examples**:
- Deal stage changed → Suggest next actions
- New note added → Extract action items
- Document uploaded → Summarize content
- Contact added → Suggest connections

---

### 5. Widget

Dashboard widgets that display live insights.

```typescript
interface WidgetTrigger {
  type: 'widget';
  widgetId: string;
  dashboardId: string;
  
  insightType: InsightType;
  refreshInterval: number;  // seconds
  
  // Widget-specific config
  displayConfig: {
    maxItems?: number;
    showSources?: boolean;
    compact?: boolean;
  };
}
```

**Widget Types**:
- **Risk Radar**: Current deals at risk
- **Action Items**: AI-extracted tasks
- **Daily Priorities**: Recommended focus
- **Pipeline Predictions**: Forecast visualization
- **Sentiment Tracker**: Communication sentiment

---

## Context Scopes

### Scope Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTEXT SCOPE HIERARCHY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TENANT-WIDE                                                                │
│  └── All data in tenant                                                     │
│      │                                                                      │
│      ├── COMPANY SCOPE                                                      │
│      │   └── Company + all related                                          │
│      │       ├── Contacts                                                   │
│      │       ├── Opportunities                                              │
│      │       ├── Projects                                                   │
│      │       └── Documents                                                  │
│      │                                                                      │
│      ├── PROJECT SCOPE                                                      │
│      │   └── Project + all related                                          │
│      │       ├── Client (company)                                           │
│      │       ├── Stakeholders (contacts)                                    │
│      │       ├── Opportunities                                              │
│      │       ├── Documents                                                  │
│      │       └── Notes                                                      │
│      │                                                                      │
│      ├── CROSS-PROJECT SCOPE                                                │
│      │   └── Multiple projects for comparison                               │
│      │                                                                      │
│      ├── TIME-BASED SCOPE                                                   │
│      │   └── All activity within time range                                 │
│      │                                                                      │
│      └── SINGLE SHARD SCOPE                                                 │
│          └── One shard + immediate relationships                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scope Definitions

```typescript
type ContextScope =
  | SingleShardScope
  | ProjectScope
  | CompanyScope
  | CrossProjectScope
  | TenantWideScope
  | TimeBasedScope;

interface SingleShardScope {
  type: 'single_shard';
  shardId: string;
  includeRelationships: boolean;
  relationshipDepth: number;  // 0-3
}

interface ProjectScope {
  type: 'project';
  projectId: string;
  includeRelated: {
    company: boolean;
    contacts: boolean;
    opportunities: boolean;
    documents: boolean;
    notes: boolean;
    activities: boolean;
  };
  timeRange?: DateRange;
}

interface CompanyScope {
  type: 'company';
  companyId: string;
  includeRelated: {
    contacts: boolean;
    projects: boolean;
    opportunities: boolean;
    documents: boolean;
  };
  timeRange?: DateRange;
}

interface CrossProjectScope {
  type: 'cross_project';
  projectIds: string[];
  comparisonDimensions: string[];
}

interface TenantWideScope {
  type: 'tenant_wide';
  filters?: {
    shardTypes?: string[];
    owners?: string[];
    status?: string[];
    tags?: string[];
  };
  aggregationLevel: 'summary' | 'detailed';
}

interface TimeBasedScope {
  type: 'time_based';
  range: DateRange;
  shardTypes?: string[];
  groupBy?: 'day' | 'week' | 'month';
}
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI INSIGHTS ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                            ┌─────────────────┐                              │
│                            │   USER REQUEST  │                              │
│                            │                 │                              │
│                            │ Chat / Widget / │                              │
│                            │ Trigger / API   │                              │
│                            └────────┬────────┘                              │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      INTENT ANALYZER                                 │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │    Intent    │  │    Entity    │  │    Scope     │               │   │
│  │  │  Classifier  │  │  Extractor   │  │   Resolver   │               │   │
│  │  │              │  │              │  │              │               │   │
│  │  │ summary      │  │ "Project     │  │ PROJECT      │               │   │
│  │  │ analysis     │  │  Alpha"      │  │ scope with   │               │   │
│  │  │ comparison   │  │ "Q1 deals"   │  │ related      │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CONTEXT PLANNER                                 │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Template   │  │  Permission  │  │    Token     │               │   │
│  │  │   Selector   │  │   Filter     │  │   Budget     │               │   │
│  │  │              │  │              │  │              │               │   │
│  │  │c_context     │  │ Only user's  │  │ Max 8000     │               │   │
│  │  │Template      │  │ accessible   │  │ tokens       │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│           ┌─────────────────────────┼─────────────────────────┐            │
│           │                         │                         │            │
│           ▼                         ▼                         ▼            │
│  ┌────────────────┐      ┌────────────────┐      ┌────────────────┐       │
│  │  RELATIONSHIP  │      │ RAG RETRIEVAL  │      │    DIRECT      │       │
│  │   TRAVERSAL    │      │                │      │    FETCH       │       │
│  │                │      │                │      │                │       │
│  │ Follow shard   │      │ Semantic       │      │ Get shard by   │       │
│  │ relationships  │      │ search on      │      │ ID directly    │       │
│  │ (depth-first)  │      │ embeddings     │      │                │       │
│  └───────┬────────┘      └───────┬────────┘      └───────┬────────┘       │
│          │                       │                       │                 │
│          └───────────────────────┼───────────────────────┘                 │
│                                  │                                          │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CONTEXT ASSEMBLY                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Ranking    │  │   Chunking   │  │  Formatting  │               │   │
│  │  │  & Priority  │  │ & Truncation │  │              │               │   │
│  │  │              │  │              │  │              │               │   │
│  │  │ Score by     │  │ Fit within   │  │ Structure    │               │   │
│  │  │ relevance    │  │ token limit  │  │ for prompt   │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MODEL ROUTER                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │    Model     │  │    Cost      │  │   Fallback   │               │   │
│  │  │  Selection   │  │  Estimation  │  │   Strategy   │               │   │
│  │  │              │  │              │  │              │               │   │
│  │  │ c_aimodel    │  │ Check        │  │ If primary   │               │   │
│  │  │ hierarchy    │  │ budget       │  │ fails, use   │               │   │
│  │  │              │  │ limits       │  │ backup       │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      LLM EXECUTION                                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Prompt     │  │   Streaming  │  │    Token     │               │   │
│  │  │ Construction │  │   Response   │  │   Tracking   │               │   │
│  │  │              │  │              │  │              │               │   │
│  │  │ System +     │  │ Real-time    │  │ Count &      │               │   │
│  │  │ context +    │  │ output       │  │ cost         │               │   │
│  │  │ user query   │  │ streaming    │  │ calculation  │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      GROUNDING ENGINE                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │    Source    │  │  Confidence  │  │ Hallucination│               │   │
│  │  │   Citation   │  │   Scoring    │  │  Detection   │               │   │
│  │  │              │  │              │  │              │               │   │
│  │  │ Link claims  │  │ Calculate    │  │ Flag claims  │               │   │
│  │  │ to sources   │  │ confidence   │  │ not in       │               │   │
│  │  │              │  │ levels       │  │ context      │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      RESPONSE FORMATTER                              │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Output     │  │    Action    │  │   Delivery   │               │   │
│  │  │  Formatting  │  │  Extraction  │  │   Routing    │               │   │
│  │  │              │  │              │  │              │               │   │
│  │  │ Markdown,    │  │ Extract      │  │ Chat, email, │               │   │
│  │  │ cards,       │  │ clickable    │  │ widget,      │               │   │
│  │  │ tables       │  │ actions      │  │ notification │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                      │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│                            ┌─────────────────┐                              │
│                            │   c_conversation│                              │
│                            │                 │                              │
│                            │ Store message,  │                              │
│                            │ context sources,│                              │
│                            │ feedback        │                              │
│                            └─────────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Components

```typescript
// Core services
interface InsightServices {
  intentAnalyzer: IntentAnalyzerService;
  contextPlanner: ContextPlannerService;
  ragRetriever: RAGRetrieverService;
  contextAssembler: ContextAssemblerService;
  modelRouter: ModelRouterService;
  llmExecutor: LLMExecutorService;
  groundingEngine: GroundingEngineService;
  responseFormatter: ResponseFormatterService;
  conversationStore: ConversationService;
}
```

---

## Accuracy & Grounding

### Grounding Principles

1. **Every claim must have a source**
2. **Confidence levels must be explicit**
3. **Unsupported claims are flagged**
4. **Data freshness is shown**

### Source Citations

```typescript
interface SourceCitation {
  id: string;
  
  // Source reference
  shardId: string;
  shardTypeId: string;
  shardName: string;
  
  // Specific location
  fieldPath?: string;
  chunkIndex?: number;
  excerpt: string;           // Relevant excerpt
  
  // Relevance
  relevanceScore: number;    // 0-1
  matchType: 'exact' | 'semantic' | 'inferred';
  
  // Freshness
  dataUpdatedAt: Date;
  retrievedAt: Date;
}

interface GroundedResponse {
  content: string;
  
  // Inline citations: "The deal is at risk [1][2]"
  citations: SourceCitation[];
  
  // Overall grounding
  grounding: {
    citedClaimsCount: number;
    uncitedClaimsCount: number;
    groundingScore: number;    // 0-100%
  };
}
```

### Confidence Scoring

```typescript
interface ConfidenceScore {
  level: 'high' | 'medium' | 'low';
  score: number;              // 0-100
  
  factors: {
    dataQuality: number;      // Completeness of source data
    sourceRecency: number;    // How recent is the data
    modelCertainty: number;   // LLM's self-assessed confidence
    groundingCoverage: number; // % of claims with sources
  };
  
  caveats?: string[];         // "Based on incomplete data..."
}
```

### Hallucination Detection

```typescript
interface HallucinationCheck {
  claim: string;
  status: 'verified' | 'unverified' | 'contradicted';
  
  // If verified
  sources?: SourceCitation[];
  
  // If unverified
  reason?: 'no_source' | 'insufficient_context' | 'low_confidence';
  
  // If contradicted
  contradiction?: {
    source: SourceCitation;
    actualValue: string;
    claimedValue: string;
  };
}

// Post-processing
async function detectHallucinations(
  response: string,
  context: AssembledContext
): Promise<HallucinationCheck[]> {
  // 1. Extract factual claims from response
  // 2. For each claim, search context for support
  // 3. Flag unsupported claims
  // 4. Check for contradictions
}
```

### Data Freshness

```typescript
interface DataFreshness {
  // Overall freshness
  overallFreshness: 'current' | 'recent' | 'stale';
  
  // Per-source freshness
  sources: Array<{
    shardId: string;
    shardName: string;
    updatedAt: Date;
    staleness: 'current' | 'recent' | 'stale';
  }>;
  
  // Freshness thresholds
  staleThresholdDays: number;
  
  // Warning
  freshnessWarning?: string;
}
```

---

## Personalization

### User Context

```typescript
interface UserInsightContext {
  userId: string;
  
  // Role & permissions
  role: string;
  permissions: string[];
  accessibleShards: ShardAccessFilter;
  
  // Focus areas
  ownedProjects: string[];
  ownedAccounts: string[];
  teamMembers: string[];
  
  // Preferences
  preferences: UserInsightPreferences;
  
  // History
  recentConversations: string[];
  recentSearches: string[];
  frequentTopics: string[];
}

interface UserInsightPreferences {
  detailLevel: 'brief' | 'standard' | 'detailed';
  preferredFormat: 'conversational' | 'structured' | 'bullet_points';
  showConfidence: boolean;
  showSources: boolean;
  language: string;
  timezone: string;
}
```

### Role-Based Insights

```typescript
const ROLE_INSIGHT_CONFIG: Record<string, RoleConfig> = {
  sales_rep: {
    defaultScope: 'owned_accounts',
    priorityInsights: ['recommendation', 'analysis_risk'],
    hiddenFields: ['internal_margin', 'cost_breakdown'],
    defaultTemplate: 'sales_rep_daily',
  },
  sales_manager: {
    defaultScope: 'team_pipeline',
    priorityInsights: ['comparison', 'prediction'],
    additionalContext: ['team_performance', 'quota_progress'],
    defaultTemplate: 'manager_overview',
  },
  executive: {
    defaultScope: 'tenant_wide',
    priorityInsights: ['summary', 'prediction', 'comparison'],
    aggregationLevel: 'high',
    defaultTemplate: 'executive_briefing',
  },
};
```

### Conversation History

```typescript
interface ConversationContext {
  // Recent conversations
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    shardReferences: string[];
  }>;
  
  // Topic continuity
  currentTopics: string[];
  mentionedEntities: Map<string, string>; // "the deal" → shardId
  
  // User intents from history
  recentIntents: InsightType[];
  
  // Preferences learned from feedback
  learnedPreferences: {
    preferredDetailLevel: number;
    likedFormats: string[];
    dislikedPatterns: string[];
  };
}
```

---

## Output Formats

### 1. Chat Response

Conversational markdown output.

```typescript
interface ChatResponse {
  format: 'chat';
  content: string;           // Markdown
  citations: SourceCitation[];
  confidence: ConfidenceScore;
  
  // Suggested follow-ups
  suggestions?: string[];
}
```

**Example**:
```markdown
Based on the project data, **Project Alpha is on track** with 3 key milestones completed [1].

However, I noticed a few areas to watch:
- The client hasn't responded to the latest proposal (5 days) [2]
- Budget discussions are pending [3]

**Confidence**: High (based on 12 recent data points)

**Sources**: [1] Project Status Update, [2] Email Thread, [3] Meeting Notes
```

### 2. Structured Card

Formatted card with sections.

```typescript
interface StructuredCard {
  format: 'card';
  title: string;
  subtitle?: string;
  
  sections: Array<{
    type: 'metrics' | 'bullets' | 'text' | 'actions';
    title?: string;
    content: any;
  }>;
  
  footer?: {
    confidence: ConfidenceScore;
    sources: SourceCitation[];
    updatedAt: Date;
  };
}
```

### 3. Table

Comparative or list data.

```typescript
interface TableResponse {
  format: 'table';
  title: string;
  
  columns: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'status' | 'progress';
    sortable?: boolean;
  }>;
  
  rows: Array<Record<string, any>>;
  
  summary?: {
    totals?: Record<string, any>;
    averages?: Record<string, any>;
  };
}
```

### 4. Chart Suggestion

Data visualization recommendation.

```typescript
interface ChartSuggestion {
  format: 'chart';
  
  chart: {
    type: 'bar' | 'line' | 'pie' | 'funnel' | 'scatter';
    title: string;
    data: ChartData;
    options: ChartOptions;
  };
  
  insight: string;           // What the chart shows
  dataSource: SourceCitation[];
}
```

### 5. Action Items

Clickable tasks.

```typescript
interface ActionItemsResponse {
  format: 'actions';
  
  items: Array<{
    id: string;
    title: string;
    description?: string;
    priority: 'high' | 'medium' | 'low';
    dueDate?: Date;
    
    // Action buttons
    actions: Array<{
      label: string;
      type: 'create_task' | 'send_email' | 'schedule_meeting' | 'navigate';
      payload: any;
    }>;
    
    source: SourceCitation;
  }>;
}
```

### 6. Email Draft

Ready-to-send email.

```typescript
interface EmailDraftResponse {
  format: 'email';
  
  email: {
    to?: string[];
    cc?: string[];
    subject: string;
    body: string;            // HTML or plain text
    
    // Metadata
    tone: string;
    purpose: string;
    contextUsed: SourceCitation[];
  };
  
  actions: {
    copy: boolean;
    sendVia: 'outlook' | 'gmail' | 'internal';
    edit: boolean;
  };
}
```

---

## Integration Points

### 1. Chat Interface

Primary AI interaction via `c_conversation`.

```typescript
// Chat endpoint
POST /api/insights/chat
{
  conversationId?: string,   // Continue existing or create new
  message: string,
  context?: {
    currentShardId?: string,
    scope?: ContextScope,
  },
  preferences?: {
    format?: OutputFormat,
    streaming?: boolean,
  }
}

// SSE streaming response
event: token
data: {"token": "Based", "done": false}

event: citation
data: {"citation": {...}}

event: complete
data: {"messageId": "...", "usage": {...}}
```

### 2. Shard Detail Page

Contextual AI button on every shard.

```typescript
// Quick insight for current shard
POST /api/insights/quick
{
  shardId: string,
  insightType: 'summary' | 'analysis' | 'recommendations',
}

// Suggested questions
GET /api/insights/suggestions/:shardId
→ ["What are the risks?", "Who are the stakeholders?", ...]
```

### 3. Dashboard Widgets

Live insight widgets.

```typescript
interface InsightWidget {
  type: 'insight';
  insightConfig: {
    insightType: InsightType;
    scope: ContextScope;
    refreshInterval: number;
    displayFormat: 'card' | 'list' | 'metrics';
  };
}

// Widget data endpoint
GET /api/insights/widget/:widgetId
→ { insight: {...}, updatedAt: Date, nextRefresh: Date }
```

### 4. Notifications

Proactive insight alerts.

```typescript
interface InsightNotification {
  id: string;
  type: 'proactive_insight';
  
  trigger: ProactiveTrigger;
  insight: InsightResponse;
  
  // Delivery
  channels: ('in_app' | 'email' | 'slack' | 'push')[];
  
  // User interaction
  actions: Array<{
    label: string;
    action: string;
  }>;
}
```

### 5. Search Results

AI-enhanced search.

```typescript
// Enhanced search
POST /api/search
{
  query: string,
  aiEnhanced: true,
  includeInsight: true,
}

→ {
  results: SearchResult[],
  aiInsight: {
    summary: string,
    suggestedFilters: [...],
    relatedQuestions: [...],
  }
}
```

### 6. External Delivery

Email and Slack integration.

```typescript
// Schedule insight delivery
POST /api/insights/schedule
{
  insightType: InsightType,
  scope: ContextScope,
  schedule: ScheduleConfig,
  delivery: {
    method: 'email' | 'slack',
    recipients: string[],
    format: 'summary' | 'detailed',
  }
}
```

---

## Authorization & Permissions

### Permission Model

AI Insights features different permission levels for Super Admins and Tenant Admins:

| Feature | Super Admin | Tenant Admin | User |
|---------|-------------|--------------|------|
| **System Prompts** | ✅ Create/Edit/Delete | ❌ View only | ❌ No access |
| **Tenant Prompts** | ✅ Full access | ✅ Create/Edit/Activate | ❌ No access |
| **Intent Patterns** | ✅ Create/Edit/Delete + LLM Assist | ❌ View only | ❌ No access |
| **Web Search Providers** | ✅ Activate/Config/Fallback | ❌ View only | ❌ No access |
| **Web Search Config** | ✅ All tenants | ✅ Own tenant only | ❌ No access |
| **Web Search Usage** | ✅ All tenants | ✅ Own tenant only | ❌ Limited stats |
| **Recurring Searches** | ✅ Full access, Set quotas, Global config | ✅ View all, Configure settings, View analytics | ✅ Create/edit own, View own alerts, Provide feedback |
| **Model Catalog** | ✅ Add/Remove models | ❌ View only | ❌ No access |
| **Model Selection** | ✅ System defaults | ✅ Tenant defaults | ❌ Use tenant defaults |
| **Budget Configuration** | ✅ All tenants | ✅ Own tenant only | ❌ No access |
| **Usage Analytics** | ✅ All tenants | ✅ Own tenant only | ❌ No access |
| **Privacy Settings** | ✅ System-wide | ✅ Tenant-scoped | ❌ No access |
| **Feature Flags** | ✅ System-wide | ✅ Tenant-scoped | ❌ No access |
| **A/B Testing** | ✅ Full control | ❌ No access | ❌ No access |
| **Branding** | ✅ System defaults | ✅ Tenant branding | ❌ No access |
| **Chat & Insights** | ✅ All data | ✅ Tenant data | ✅ Own data |
| **Web Search** | ✅ Auto/Manual | ✅ Auto/Manual | ✅ Manual (if enabled) |

### Super Admin Capabilities

**Super Admins** have system-wide control over AI Insights, including advanced management tools:

#### 1. **Intent Pattern Management**
- View all intent classification patterns and their performance
- Create, edit, and delete intent patterns manually
- **LLM-Assisted Pattern Creation**:
  - Upload sample queries and let LLM suggest intent patterns
  - Analyze historical misclassified queries for pattern gaps
  - Generate regex patterns automatically from natural language descriptions
  - Test patterns against query corpus before deployment
- Performance analytics:
  - Classification accuracy by intent type
  - Misclassification reports with suggestions
  - Pattern coverage analysis (% of queries matched)
- Pattern testing sandbox:
  - Test new patterns against historical queries
  - See classification results in real-time
  - A/B test pattern variations

#### 2. **System Prompt Management**
- Create and edit system-level prompts for all tenants
- Version control and rollback capabilities
- A/B testing of prompt variants across tenants
- Performance metrics (quality, cost, speed) per prompt

#### 3. **Model Catalog Management**
- Add new AI models to the catalog
- Configure model capabilities and pricing
- Set default routing rules
- Monitor model performance and costs

#### 4. **Cross-Tenant Analytics**
- View usage and costs across all tenants
- Identify trends and optimization opportunities
- Budget oversight and alerts
- Performance benchmarking

#### 5. **Intent Auto-Learning System**
- Enable/disable automatic pattern learning from user feedback
- Review and approve LLM-suggested pattern improvements
- Configure confidence thresholds for auto-classification
- Monitor learning system performance

#### 6. **Web Search Provider Management** ✅ NEW
- Activate/deactivate multiple search providers (Azure AI Search, Bing, Google)
- Configure provider API credentials via Azure Key Vault
- Set provider priority and fallback chain
- Monitor provider health (error rate, latency, costs)
- Enable/disable providers globally with one toggle
- Configure cost tracking and budgets per provider
- View provider-specific analytics and usage

#### 7. **Web Search Global Configuration** ✅ NEW
- Set default TTL for cached search results (30 days configurable)
- Configure global auto-trigger keywords
- Quality filter defaults (relevance scores, domain blacklists)
- Privacy and logging settings
- Cost budgets and limits
- Manage multi-tenant fallback chain strategy

#### 8. **Web Search Analytics & Monitoring** ✅ NEW
- Monitor web search usage across all tenants
- Track costs by provider and by tenant
- View cache hit rates and performance metrics
- Analyze search patterns and trending queries
- Monitor provider health dashboards
- Cost breakdown and budget forecasting

#### 9. **Recurring Search System Management** ✅ NEW
- Manage recurring search quotas for all tenants
- Configure global learning system settings
- View learning system performance metrics
- Monitor alert accuracy across all tenants
- Set global confidence thresholds and defaults
- Analyze false positive rates by search type
- Configure global data retention policies
- Access global statistics dashboard

### Tenant Admin Capabilities

**Tenant Admins** can customize AI behavior for their organization through the Tenant Configuration UI:

#### 1. **Web Search Configuration** ✅ NEW
- Enable/disable web search for the tenant
- Configure auto-trigger behavior:
  - Temporal keywords ("latest", "recent", "current", "today", "news")
  - Custom keywords per organization
- Set per-tenant TTL override (default: 30 days)
- Domain management:
  - Whitelist allowed domains
  - Blacklist unwanted domains
- Result quality settings:
  - Minimum relevance threshold
  - Freshness requirements
- Safe search level (off, moderate, strict)
- Result ranking strategy relative to internal RAG

#### 2. **Web Search Usage Monitoring** ✅ NEW
- View tenant-specific search usage statistics
- Monitor costs and cache hit rates
- Track searches by provider and intent type
- Set tenant-level cost alerts and limits
- Export usage reports

#### 3. **Recurring Search Configuration** ✅ NEW
- View all recurring searches in the tenant
- Configure tenant-wide alert settings
- Set default confidence thresholds
- Monitor alert accuracy and false positive rates
- Access tenant-specific statistics dashboard
- Configure data retention policies
- View learning system performance
- Manage team-shared searches

#### 4. **System Prompts**
- View system-level prompts created by Super Admins
- Inherit system prompts with tenant-specific modifications

#### 5. **Model Selection**
- Choose default models for their tenant
- Set fallback models for availability
- View model catalog with pricing and capabilities

#### 6. **Custom Prompts**
- Create tenant-specific prompts that inherit from system prompts
- Add custom instructions appended to system templates
- Test prompts before activation
- View performance metrics (success rate, cost, satisfaction)

#### 7. **Budget Management**
- Set monthly and daily spending limits
- Configure per-insight cost caps
- Create budget alert thresholds (50%, 80%, 90%)
- View real-time usage analytics:
  - Spending by model
  - Spending by insight type
  - Daily breakdown
  - Projected end-of-month cost

#### 8. **Feature Control**
- Enable/disable AI features for the tenant:
  - Proactive Insights
  - Tool Calling (actions)
  - Multi-Modal Analysis
  - Semantic Cache
  - Conversation Memory

#### 9. **Privacy & Compliance**
- Configure data retention policies
- Set PII handling rules (redact, hash, allow)
- Enable/disable audit logging
- Control cross-shard context sharing
- Allow data export for compliance

#### 10. **Branding**
- Customize assistant name and avatar
- Set welcome message
- Choose primary color theme

### Implementation References

- **API Endpoints**: See [Tenant Admin Configuration API](./API.md#tenant-admin-configuration-api)
- **UI Specifications**: See [Tenant Admin Configuration UI](./UI-SPECIFICATION.md#tenant-admin-configuration-ui)
- **Implementation Guide**: See [Step 16: Tenant Admin Configuration](./IMPLEMENTATION-GUIDE.md)

---

## Migration Guide

### v1.0 to v2.0 (Web Search Integration)

**Breaking Changes**: None - backwards compatible

**New Features**:
- Web search providers integration
- `c_search` shard type for search results
- Web search configuration in `c_assistant`

**Migration Steps**:

1. **Update Assistant Configurations**:
   ```typescript
   // Add web search config to existing assistants
   await updateAssistant(assistantId, {
     webSearchConfig: {
       enabled: true,
       providers: ['azure_bing', 'tavily'],
       maxResults: 10,
       requiresCitation: true
     }
   });
   ```

2. **Configure Web Search Providers** (Super Admin):
   - Navigate to Admin → AI Insights → Web Search
   - Add provider API keys in Azure Key Vault
   - Configure provider priorities and fallbacks

3. **Update Context Templates** (Optional):
   ```typescript
   // Include web search results in context
   await updateContextTemplate(templateId, {
     includeSources: ['shards', 'web_search'],
     webSearchQuery: '{{userQuery}}'
   });
   ```

4. **Test Web Search**:
   ```bash
   curl -X POST http://localhost:3001/api/v1/insights/chat \
     -H "Authorization: Bearer $TOKEN" \
     -d '{
       "content": "What are the latest trends in project management?",
       "options": { "webSearchEnabled": true }
     }'
   ```

### v2.0 to v3.0 (Recurring Search)

**Breaking Changes**: None - backwards compatible

**New Features**:
- Recurring search scheduling
- Automated alert detection
- Multi-channel notifications

**Migration Steps**:

1. **Create Recurring Search Container**:
   ```bash
   cd /Users/edouard.gamelin/Documents/Perso/CASTIEL/castiel
   pnpm run migrate:recurring-search
   ```

2. **Deploy Azure Functions**:
   ```bash
   cd terraform
   terraform apply -target=azurerm_function_app.recurring_search
   ```

3. **Configure Notification Channels**:
   - Email: Set up SendGrid/Azure Communication Services
   - In-app: Already configured (no action needed)
   - Webhook: Configure webhook URLs per tenant

4. **Enable for Tenants** (Tenant Admin):
   - Navigate to Settings → Notifications
   - Configure notification preferences
   - Test with a sample recurring search

5. **Verify Deployment**:
   ```bash
   # Check Azure Function logs
   az functionapp logs tail \
     --name castiel-recurring-search \
     --resource-group castiel-prod
   ```

### v3.0 to v4.0 (Advanced Features - Future)

**Planned Features**:
- Multi-agent orchestration
- Advanced reasoning models (o1)
- Custom tool calling
- Fine-tuned models support

**Migration Path**: TBD

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Mostly Complete** - Core features implemented, some advanced features pending

#### Implemented Features (✅)

- ✅ Core insight generation pipeline
- ✅ Intent classification (pattern-based)
- ✅ Context assembly with RAG retrieval
- ✅ AI model connections and BYOK
- ✅ Grounding and citation validation
- ✅ Conversation management
- ✅ Proactive insights
- ✅ Web search integration
- ✅ Feedback and learning system
- ✅ A/B testing framework
- ✅ Multi-modal support
- ✅ Collaborative insights
- ✅ Context caching
- ✅ Prompt injection defense
- ✅ PII detection and redaction

#### Partially Implemented Features (⚠️)

- ⚠️ **LLM-Based Intent Classification** - Pattern-based classification exists, but LLM-based classification (`classifyIntentWithLLM()`) may not be fully implemented
  - **Code Reference:** `apps/api/src/services/intent-analyzer.service.ts`
  - **Impact:** May reduce accuracy from ~95% (LLM) to ~70% (pattern-based)

- ⚠️ **Context Assembly Edge Cases** - Context assembly may:
  - Return empty context without warning
  - Truncate critical context due to token limits
  - Miss related shards silently
  - Include data user doesn't have permission to see
  - **Code References:**
    - `apps/api/src/services/ai-context-assembly.service.ts` (1,074 lines)
    - `apps/api/src/services/ai-insights/project-context.service.ts`
  - **Impact:** Degrades AI quality and may cause security issues

- ⚠️ **Permission Checks in Context Assembly** - Context assembly may include shards without verifying user permissions
  - **Code Reference:** `apps/api/src/services/ai-context-assembly.service.ts`
  - **Impact:** Security risk - users may see data they don't have permission to access

#### Missing Features (❌)

- ❌ **ML-Based Intent Classification** - ML system not implemented (see [Gap Analysis](../GAP_ANALYSIS.md))
- ❌ **Advanced Reasoning Models (o1)** - Planned for v4.0
- ❌ **Custom Tool Calling** - Planned for v4.0
- ❌ **Fine-tuned Models Support** - Planned for v4.0

### Critical Gaps

#### CRITICAL-1: Incomplete Permission Checks in Context Assembly
- **Severity:** Critical
- **Impact:** Security, Data Access
- **Description:** Context assembly includes shards in AI context without verifying user has permission to access them
- **Code References:**
  - `apps/api/src/services/ai-context-assembly.service.ts` - ACL checks needed
  - `apps/api/src/services/ai-insights/project-context.service.ts` - Permission checks needed
- **Recommendation:**
  1. Add ACL checks before including shards in context
  2. Filter context based on user permissions
  3. Log permission violations

#### CRITICAL-2: Context Assembly Edge Cases
- **Severity:** Critical
- **Impact:** AI Quality, User Experience
- **Description:** Context assembly may return empty context, truncate critical context, or miss related shards
- **Code References:**
  - `apps/api/src/services/ai-context-assembly.service.ts`
  - `apps/api/src/services/ai-insights/project-context.service.ts`
- **Recommendation:**
  1. Add warnings for empty context
  2. Improve token limit handling
  3. Add logging for context assembly issues

### High Priority Gaps

#### HIGH-1: LLM-Based Intent Classification Not Fully Implemented
- **Severity:** High
- **Impact:** AI Accuracy
- **Description:** Pattern-based classification exists but LLM-based classification may not be fully implemented
- **Code Reference:** `apps/api/src/services/intent-analyzer.service.ts`
- **Recommendation:**
  1. Complete LLM-based intent classification implementation
  2. Use LLM classification as primary method with pattern-based fallback
  3. Improve accuracy from ~70% to ~95%

#### HIGH-2: Missing Error Handling
- **Severity:** High
- **Impact:** Stability, User Experience
- **Description:** Some code paths may lack proper error handling:
  - AI response parsing failures may be silent
  - Context assembly failures may not be properly surfaced
- **Recommendation:**
  1. Add comprehensive error handling
  2. Improve error logging
  3. Surface errors to users appropriately

### Medium Priority Gaps

#### MEDIUM-1: Advanced Features Not Implemented
- **Severity:** Medium
- **Impact:** Feature Completeness
- **Description:** Some advanced features planned for v4.0 are not yet implemented:
  - Multi-agent orchestration
  - Advanced reasoning models (o1)
  - Custom tool calling
  - Fine-tuned models support
- **Recommendation:**
  1. Prioritize advanced features based on business value
  2. Implement incrementally
  3. Update documentation as features are added

---

## Related Documentation

### Specifications

| Document | Description |
|----------|-------------|
| [Intent Classification](./INTENT-CLASSIFICATION.md) | How user intent is analyzed, **LLM-assisted pattern creation** |
| [Context Assembly](./CONTEXT-ASSEMBLY.md) | How context is built from templates |
| [Web Search Integration](./WEB-SEARCH.md) | **Web search providers, semantic search, c_search shards** ✅ NEW |
| [Recurring Search Overview](./RECURRING-SEARCH-OVERVIEW.md) | **Recurring search architecture, scheduling, alert detection** ✅ NEW |
| [Recurring Search Alerts](./RECURRING-SEARCH-ALERTS.md) | **Alert detection, LLM delta analysis, learning system** ✅ NEW |
| [Recurring Search Database](./RECURRING-SEARCH-DATABASE.md) | **Database schemas with HPK, migration scripts, query patterns** ✅ NEW |
| [Notifications System](./NOTIFICATIONS.md) | **Global notification system, multi-channel delivery, preferences** ✅ NEW |
| [Recurring Search Services](./RECURRING-SEARCH-SERVICES.md) | **TypeScript service implementations, error handling** ✅ NEW |
| [Grounding & Accuracy](./GROUNDING.md) | Verification, citations, hallucination detection, **web source citations** |
| [Prompt Engineering](./PROMPT-ENGINEERING.md) | System prompts, layered architecture |
| [UI Specification](./UI-SPECIFICATION.md) | Chat interface, widgets, notifications, config UI, **web search UI, intent pattern management** |
| [Advanced Features](./ADVANCED-FEATURES.md) | Caching, routing, agents, memory, automation, **continuous improvement** |
| [AI Model Connections](./AI-MODEL-CONNECTIONS.md) | BYOK, model selection, cost tracking |

### Advanced Features

| Document | Description |
|----------|-------------|
| [Feedback & Learning](./FEEDBACK-LEARNING.md) | **Continuous learning system, feedback collection, pattern detection, quality monitoring** ✅ NEW |
| [A/B Testing](./AB-TESTING.md) | **Experimentation framework, variant testing, statistical analysis** ✅ NEW |
| [Advanced Features Extended](./ADVANCED-FEATURES-EXTENDED.md) | **Multi-modal support (images/audio/video), collaborative insights, templates, advanced RAG, audit trail, smart notifications** ✅ NEW |
| [Advanced Features Part 2](./ADVANCED-FEATURES-PART2.md) | **Insight dependencies, export & integration, disaster recovery, multi-language support, super admin configuration** ✅ NEW |

### Operations & Optimization

| Document | Description |
|----------|-------------|
| [Troubleshooting](./TROUBLESHOOTING.md) | **Common issues, diagnostic steps, error messages reference** ✅ NEW |
| [Security](./SECURITY.md) | **Data protection, compliance (GDPR, SOC 2), security best practices** ✅ NEW |
| [Performance](./PERFORMANCE.md) | **Optimization strategies, caching, load testing, profiling** ✅ NEW |
| [Cost Management](./COST-MANAGEMENT.md) | **Usage tracking, budget alerts, cost optimization techniques** ✅ NEW |
| [Monitoring](./MONITORING.md) | **Metrics, alerting, dashboards, Application Insights setup** ✅ NEW |

### Implementation

| Document | Description |
|----------|-------------|
| [API Reference](./API.md) | **REST endpoints, streaming protocol, prompt management API, web search endpoints, intent pattern API** |
| [Implementation Guide](./IMPLEMENTATION-GUIDE.md) | **Step-by-step build guide, service scaffolding, prompt management, web search implementation** |

### ShardTypes

| Document | Description |
|----------|-------------|
| [c_assistant](../../shards/core-types/c_assistant.md) | AI Assistant configuration |
| [c_contextTemplate](../../shards/core-types/c_contextTemplate.md) | Context template definitions |
| [c_aimodel](../../shards/core-types/c_aimodel.md) | AI Model definitions |
| [c_aiconfig](../../shards/core-types/c_aiconfig.md) | Prompt configuration |
| [c_conversation](../../shards/core-types/c_conversation.md) | Conversation storage |
| [c_search](../../shards/core-types/c_search.md) | **Web search results and citations, also reused for recurring search results** ✅ NEW |

---

**Last Updated**: January 2025  
**Version**: 1.1.0  
**Maintainer**: Castiel Development Team

