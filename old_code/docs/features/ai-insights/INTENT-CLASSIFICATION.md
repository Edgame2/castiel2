# Intent Classification

## Overview

Intent Classification is the first step in the AI Insights pipeline. It analyzes user queries to determine:
1. **What** the user wants (insight type)
2. **About what** (entities/scope)
3. **How** to respond (format/depth)

> **Goal**: Accurately understand user intent to route to the right insight pipeline and assemble the right context.

---

## Intent Analysis Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTENT ANALYSIS FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User: "What are the risks in the Acme deal and should I be worried?"       │
│                                                                             │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. PREPROCESSING                                                    │   │
│  │     • Normalize text                                                 │   │
│  │     • Resolve pronouns ("it" → current shard)                        │   │
│  │     • Expand abbreviations                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2. INTENT CLASSIFICATION                                            │   │
│  │     • Primary: ANALYSIS (risk analysis)                              │   │
│  │     • Secondary: RECOMMENDATION (should I worry?)                    │   │
│  │     • Confidence: 0.92                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  3. ENTITY EXTRACTION                                                │   │
│  │     • Entity: "Acme" → c_company or c_opportunity                    │   │
│  │     • Type: deal/opportunity                                         │   │
│  │     • Resolved: c_opportunity:opp-acme-q4                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  4. SCOPE RESOLUTION                                                 │   │
│  │     • Scope: SINGLE_SHARD (opportunity)                              │   │
│  │     • Include relationships: Yes (company, contacts, notes)          │   │
│  │     • Depth: 2                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  5. OUTPUT PLANNING                                                  │   │
│  │     • Format: structured_card + chat                                 │   │
│  │     • Include: risk_score, recommendations, sources                  │   │
│  │     • Template: analysis_risk                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  Result: IntentAnalysisResult                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Intent Types

### Classification Taxonomy

```typescript
enum PrimaryIntent {
  // Information retrieval
  SUMMARY = 'summary',
  SEARCH = 'search',
  EXTRACTION = 'extraction',
  
  // Analysis
  ANALYSIS = 'analysis',
  COMPARISON = 'comparison',
  PREDICTION = 'prediction',
  
  // Action-oriented
  RECOMMENDATION = 'recommendation',
  GENERATION = 'generation',
  
  // Meta
  CLARIFICATION = 'clarification',
  NAVIGATION = 'navigation',
  HELP = 'help',
}

enum AnalysisSubtype {
  RISK = 'risk',
  OPPORTUNITY = 'opportunity',
  TREND = 'trend',
  SENTIMENT = 'sentiment',
  RELATIONSHIP = 'relationship',
  GAP = 'gap',
  PERFORMANCE = 'performance',
}

enum GenerationSubtype {
  EMAIL = 'email',
  SUMMARY_DOC = 'summary_doc',
  PROPOSAL = 'proposal',
  AGENDA = 'agenda',
  TALKING_POINTS = 'talking_points',
  REPORT = 'report',
  RESPONSE = 'response',
}
```

### Intent Signals

```typescript
const INTENT_PATTERNS: IntentPattern[] = [
  // Summary
  {
    intent: 'summary',
    patterns: [
      /summarize|summary|overview|brief|tldr|what.*about/i,
      /catch me up|bring me up to speed|status/i,
      /what('s| is) happening|what('s| is) going on/i,
    ],
    keywords: ['summarize', 'overview', 'status', 'brief', 'update'],
  },
  
  // Analysis - Risk
  {
    intent: 'analysis',
    subtype: 'risk',
    patterns: [
      /risk|danger|concern|worry|threat|issue|problem/i,
      /what could go wrong|red flags|warning signs/i,
      /should I (be )?(worried|concerned)/i,
    ],
    keywords: ['risk', 'concern', 'issue', 'problem', 'threat'],
  },
  
  // Analysis - Opportunity
  {
    intent: 'analysis',
    subtype: 'opportunity',
    patterns: [
      /opportunit|upside|potential|growth|expand/i,
      /what.*missing|what else|more we can/i,
    ],
    keywords: ['opportunity', 'potential', 'growth', 'upsell'],
  },
  
  // Comparison
  {
    intent: 'comparison',
    patterns: [
      /compare|versus|vs\.?|differ|between/i,
      /how does.*compare|which is better/i,
      /q[1-4].*vs|this (year|month|quarter).*last/i,
    ],
    keywords: ['compare', 'versus', 'difference', 'rank'],
  },
  
  // Prediction
  {
    intent: 'prediction',
    patterns: [
      /predict|forecast|will.*close|likely|chance|probability/i,
      /when will|how long until|expected/i,
      /what.*happen|going to/i,
    ],
    keywords: ['predict', 'forecast', 'likely', 'chance', 'when'],
  },
  
  // Recommendation
  {
    intent: 'recommendation',
    patterns: [
      /recommend|suggest|should I|what to do|advice/i,
      /focus on|prioritize|next step|best approach/i,
      /how should|what would you/i,
    ],
    keywords: ['recommend', 'suggest', 'should', 'prioritize', 'focus'],
  },
  
  // Extraction
  {
    intent: 'extraction',
    patterns: [
      /list|extract|find all|show me all/i,
      /action items|tasks|decisions|key points/i,
      /who said|what was mentioned/i,
    ],
    keywords: ['list', 'extract', 'find', 'action items', 'tasks'],
  },
  
  // Search
  {
    intent: 'search',
    patterns: [
      /find|search|look for|where|which/i,
      /who (has|mentioned|said)|anyone/i,
    ],
    keywords: ['find', 'search', 'where', 'who'],
  },
  
  // Generation - Email
  {
    intent: 'generation',
    subtype: 'email',
    patterns: [
      /draft|write|compose|send.*email|email.*to/i,
      /follow[- ]up email|reply to/i,
    ],
    keywords: ['draft', 'write', 'email', 'compose'],
  },
  
  // Generation - Other
  {
    intent: 'generation',
    patterns: [
      /create|generate|make|prepare|build/i,
      /talking points|agenda|report|proposal/i,
    ],
    keywords: ['create', 'generate', 'prepare', 'talking points'],
  },
];
```

---

## Entity Extraction

### Entity Types

```typescript
enum EntityType {
  // Business entities
  PROJECT = 'project',
  COMPANY = 'company',
  CONTACT = 'contact',
  OPPORTUNITY = 'opportunity',
  DOCUMENT = 'document',
  
  // Time references
  DATE = 'date',
  DATE_RANGE = 'date_range',
  RELATIVE_TIME = 'relative_time',
  
  // Metrics
  AMOUNT = 'amount',
  PERCENTAGE = 'percentage',
  
  // Other
  STAGE = 'stage',
  STATUS = 'status',
  TAG = 'tag',
  USER = 'user',
}

interface ExtractedEntity {
  text: string;              // Original text: "Acme"
  type: EntityType;          // company
  normalized: string;        // "Acme Corporation"
  
  // Resolution
  resolved: boolean;
  shardId?: string;          // c_company:company-acme
  shardTypeId?: string;      // c_company
  
  // Confidence
  confidence: number;        // 0.95
  
  // Alternatives
  alternatives?: Array<{
    shardId: string;
    name: string;
    confidence: number;
  }>;
}
```

### Entity Resolution

```typescript
async function resolveEntity(
  entity: ExtractedEntity,
  context: ResolutionContext
): Promise<ExtractedEntity> {
  
  // 1. Check current context first
  if (context.currentShardId) {
    const currentShard = await getShard(context.currentShardId);
    if (matches(entity, currentShard)) {
      return { ...entity, resolved: true, shardId: currentShard.id };
    }
    
    // Check relationships
    for (const rel of currentShard.internal_relationships) {
      const related = await getShard(rel.targetShardId);
      if (matches(entity, related)) {
        return { ...entity, resolved: true, shardId: related.id };
      }
    }
  }
  
  // 2. Check conversation history
  if (context.conversationHistory) {
    const mentioned = context.conversationHistory.mentionedEntities.get(entity.text);
    if (mentioned) {
      return { ...entity, resolved: true, shardId: mentioned };
    }
  }
  
  // 3. Search by name
  const searchResults = await searchShards({
    query: entity.text,
    shardTypes: getShardTypesForEntity(entity.type),
    tenantId: context.tenantId,
    limit: 5,
  });
  
  if (searchResults.length === 1) {
    return { 
      ...entity, 
      resolved: true, 
      shardId: searchResults[0].id,
      confidence: searchResults[0].score,
    };
  }
  
  if (searchResults.length > 1) {
    return {
      ...entity,
      resolved: false,
      alternatives: searchResults.map(r => ({
        shardId: r.id,
        name: r.name,
        confidence: r.score,
      })),
    };
  }
  
  // 4. Not found
  return { ...entity, resolved: false };
}
```

### Pronoun Resolution

```typescript
const PRONOUN_PATTERNS: Record<string, PronounContext> = {
  // Shard references
  'it': { type: 'current_shard' },
  'this': { type: 'current_shard' },
  'that': { type: 'previous_mentioned' },
  'the deal': { type: 'infer', shardType: 'c_opportunity' },
  'the project': { type: 'infer', shardType: 'c_project' },
  'the company': { type: 'infer', shardType: 'c_company' },
  'the client': { type: 'infer', shardType: 'c_company' },
  
  // Person references
  'they': { type: 'previous_contact' },
  'them': { type: 'previous_contact' },
  'he': { type: 'previous_contact', filter: { gender: 'male' } },
  'she': { type: 'previous_contact', filter: { gender: 'female' } },
  
  // Time references
  'today': { type: 'date', resolve: () => new Date() },
  'yesterday': { type: 'date', resolve: () => subDays(new Date(), 1) },
  'this week': { type: 'date_range', resolve: () => getCurrentWeek() },
  'last week': { type: 'date_range', resolve: () => getLastWeek() },
  'this month': { type: 'date_range', resolve: () => getCurrentMonth() },
  'this quarter': { type: 'date_range', resolve: () => getCurrentQuarter() },
};

async function resolvePronouns(
  query: string,
  context: ConversationContext
): Promise<string> {
  let resolved = query;
  
  for (const [pronoun, config] of Object.entries(PRONOUN_PATTERNS)) {
    if (query.toLowerCase().includes(pronoun)) {
      switch (config.type) {
        case 'current_shard':
          if (context.currentShardId) {
            const shard = await getShard(context.currentShardId);
            resolved = resolved.replace(
              new RegExp(pronoun, 'gi'),
              shard.structuredData.name
            );
          }
          break;
          
        case 'previous_mentioned':
          const lastMentioned = context.recentMentions[0];
          if (lastMentioned) {
            resolved = resolved.replace(
              new RegExp(pronoun, 'gi'),
              lastMentioned.name
            );
          }
          break;
          
        case 'infer':
          // Try to infer from context
          const inferred = await inferEntity(config.shardType!, context);
          if (inferred) {
            resolved = resolved.replace(
              new RegExp(pronoun, 'gi'),
              inferred.name
            );
          }
          break;
      }
    }
  }
  
  return resolved;
}
```

---

## Scope Resolution

### Automatic Scope Detection

```typescript
async function determineScope(
  intent: ClassifiedIntent,
  entities: ExtractedEntity[],
  context: ResolutionContext
): Promise<ContextScope> {
  
  // 1. Explicit scope from entities
  const primaryEntity = entities.find(e => e.resolved);
  if (primaryEntity) {
    switch (primaryEntity.shardTypeId) {
      case 'c_project':
        return {
          type: 'project',
          projectId: primaryEntity.shardId!,
          includeRelated: getDefaultIncludes('project', intent),
        };
        
      case 'c_company':
        return {
          type: 'company',
          companyId: primaryEntity.shardId!,
          includeRelated: getDefaultIncludes('company', intent),
        };
        
      case 'c_opportunity':
        return {
          type: 'single_shard',
          shardId: primaryEntity.shardId!,
          includeRelationships: true,
          relationshipDepth: 2,
        };
    }
  }
  
  // 2. Time-based scope
  const timeEntity = entities.find(e => e.type === 'date_range');
  if (timeEntity && !primaryEntity) {
    return {
      type: 'time_based',
      range: timeEntity.value as DateRange,
      shardTypes: inferShardTypes(intent),
    };
  }
  
  // 3. Comparison scope
  if (intent.type === 'comparison') {
    const comparisonEntities = entities.filter(e => e.resolved);
    if (comparisonEntities.length >= 2) {
      return {
        type: 'cross_project',
        projectIds: comparisonEntities.map(e => e.shardId!),
        comparisonDimensions: inferDimensions(intent),
      };
    }
  }
  
  // 4. Portfolio/tenant-wide
  if (isPortfolioIntent(intent)) {
    return {
      type: 'tenant_wide',
      filters: {
        owners: [context.userId],
      },
      aggregationLevel: 'summary',
    };
  }
  
  // 5. Default: current context
  if (context.currentShardId) {
    return {
      type: 'single_shard',
      shardId: context.currentShardId,
      includeRelationships: true,
      relationshipDepth: 1,
    };
  }
  
  // 6. Fallback: user's focus
  return {
    type: 'tenant_wide',
    filters: {
      owners: [context.userId],
      status: ['active'],
    },
    aggregationLevel: 'summary',
  };
}

function getDefaultIncludes(
  scopeType: 'project' | 'company',
  intent: ClassifiedIntent
): Record<string, boolean> {
  
  const base = {
    project: {
      company: true,
      contacts: true,
      opportunities: true,
      documents: intent.type !== 'summary', // Skip docs for quick summary
      notes: intent.type === 'extraction' || intent.type === 'analysis',
      activities: intent.type === 'analysis',
    },
    company: {
      contacts: true,
      projects: true,
      opportunities: true,
      documents: intent.type !== 'summary',
    },
  };
  
  return base[scopeType];
}
```

---

## Output Planning

### Format Selection

```typescript
function selectOutputFormat(
  intent: ClassifiedIntent,
  context: ResolutionContext
): OutputFormat[] {
  
  const formatMap: Record<PrimaryIntent, OutputFormat[]> = {
    summary: ['chat'],
    analysis: ['structured_card', 'chat'],
    comparison: ['table', 'chart', 'chat'],
    prediction: ['structured_card', 'chart'],
    recommendation: ['actions', 'chat'],
    extraction: ['table', 'actions'],
    search: ['table'],
    generation: ['email', 'chat'],
    clarification: ['chat'],
    navigation: ['chat'],
    help: ['chat'],
  };
  
  let formats = formatMap[intent.type] || ['chat'];
  
  // User preference override
  if (context.userPreferences?.preferredFormat) {
    formats = [context.userPreferences.preferredFormat, ...formats];
  }
  
  // Device optimization
  if (context.device === 'mobile') {
    formats = formats.filter(f => f !== 'table');
  }
  
  return formats;
}
```

### Template Selection

```typescript
async function selectTemplate(
  intent: ClassifiedIntent,
  scope: ContextScope,
  context: ResolutionContext
): Promise<string> {
  
  // 1. Build template key
  const templateKey = buildTemplateKey(intent, scope);
  
  // 2. Check for custom tenant template
  const tenantTemplate = await findTemplate({
    tenantId: context.tenantId,
    key: templateKey,
    isCustom: true,
  });
  if (tenantTemplate) return tenantTemplate.id;
  
  // 3. Check for role-specific template
  const roleTemplate = await findTemplate({
    key: templateKey,
    role: context.userRole,
  });
  if (roleTemplate) return roleTemplate.id;
  
  // 4. Use system default
  const systemTemplate = await findTemplate({
    key: templateKey,
    isSystem: true,
  });
  return systemTemplate?.id || 'default';
}

function buildTemplateKey(
  intent: ClassifiedIntent,
  scope: ContextScope
): string {
  const parts = [intent.type];
  
  if (intent.subtype) {
    parts.push(intent.subtype);
  }
  
  if (scope.type === 'project') {
    parts.push('project');
  } else if (scope.type === 'company') {
    parts.push('company');
  } else if (scope.type === 'tenant_wide') {
    parts.push('portfolio');
  }
  
  return parts.join('_');
  // e.g., "analysis_risk_project", "summary_company", "recommendation_portfolio"
}
```

---

## Result Structure

```typescript
interface IntentAnalysisResult {
  // Original query
  originalQuery: string;
  normalizedQuery: string;
  
  // Intent classification
  intent: {
    primary: PrimaryIntent;
    subtype?: string;
    confidence: number;
    alternatives?: Array<{
      intent: PrimaryIntent;
      confidence: number;
    }>;
  };
  
  // Extracted entities
  entities: ExtractedEntity[];
  unresolvedEntities: ExtractedEntity[];
  
  // Resolved scope
  scope: ContextScope;
  
  // Output planning
  output: {
    formats: OutputFormat[];
    templateId: string;
    preferences: {
      detailLevel: 'brief' | 'standard' | 'detailed';
      includeConfidence: boolean;
      includeSources: boolean;
    };
  };
  
  // Context requirements
  contextRequirements: {
    shardIds: string[];
    relationshipTypes: string[];
    timeRange?: DateRange;
    ragQuery?: string;
    maxTokens: number;
  };
  
  // Clarification needed?
  needsClarification: boolean;
  clarificationQuestion?: string;
  
  // Processing metadata
  processingTimeMs: number;
}
```

---

## Clarification Handling

### When to Clarify

```typescript
function shouldClarify(result: IntentAnalysisResult): boolean {
  // 1. Low confidence intent
  if (result.intent.confidence < 0.7) {
    return true;
  }
  
  // 2. Ambiguous entity
  if (result.unresolvedEntities.some(e => 
    e.alternatives && e.alternatives.length > 1
  )) {
    return true;
  }
  
  // 3. Missing required entity
  const requiresEntity = ['analysis', 'summary', 'prediction'];
  if (requiresEntity.includes(result.intent.primary) && 
      result.entities.length === 0) {
    return true;
  }
  
  // 4. Conflicting signals
  if (result.intent.alternatives && 
      result.intent.alternatives[0].confidence > 0.5) {
    return true;
  }
  
  return false;
}

function generateClarificationQuestion(
  result: IntentAnalysisResult
): string {
  // Ambiguous entity
  const ambiguousEntity = result.unresolvedEntities.find(e => 
    e.alternatives && e.alternatives.length > 1
  );
  if (ambiguousEntity) {
    const options = ambiguousEntity.alternatives!
      .map((a, i) => `${i + 1}. ${a.name}`)
      .join('\n');
    return `Which "${ambiguousEntity.text}" did you mean?\n${options}`;
  }
  
  // Missing entity
  if (result.entities.length === 0) {
    return `Which ${getEntityTypeLabel(result.intent.primary)} would you like me to analyze?`;
  }
  
  // Low confidence intent
  if (result.intent.confidence < 0.7) {
    const options = [result.intent.primary, ...result.intent.alternatives?.map(a => a.intent) || []];
    return `I'm not sure if you want me to ${options.map(formatIntent).join(' or ')}. Could you clarify?`;
  }
  
  return "Could you tell me more about what you're looking for?";
}
```

---

## Examples

### Example 1: Simple Summary

**Input**: "Summarize Project Alpha"

```typescript
{
  originalQuery: "Summarize Project Alpha",
  normalizedQuery: "summarize Project Alpha",
  
  intent: {
    primary: "summary",
    confidence: 0.98,
  },
  
  entities: [{
    text: "Project Alpha",
    type: "project",
    resolved: true,
    shardId: "project-alpha-123",
    confidence: 0.95,
  }],
  
  scope: {
    type: "project",
    projectId: "project-alpha-123",
    includeRelated: {
      company: true,
      contacts: true,
      opportunities: true,
      documents: false,
      notes: false,
    },
  },
  
  output: {
    formats: ["chat"],
    templateId: "summary_project",
    preferences: { detailLevel: "standard" },
  },
  
  needsClarification: false,
}
```

### Example 2: Risk Analysis with Ambiguity

**Input**: "What are the risks with the Acme deal?"

```typescript
{
  originalQuery: "What are the risks with the Acme deal?",
  
  intent: {
    primary: "analysis",
    subtype: "risk",
    confidence: 0.95,
  },
  
  entities: [{
    text: "Acme deal",
    type: "opportunity",
    resolved: false,
    alternatives: [
      { shardId: "opp-acme-q4", name: "Acme Q4 Enterprise", confidence: 0.8 },
      { shardId: "opp-acme-q3", name: "Acme Q3 Expansion", confidence: 0.7 },
    ],
  }],
  
  needsClarification: true,
  clarificationQuestion: `Which "Acme deal" did you mean?
1. Acme Q4 Enterprise
2. Acme Q3 Expansion`,
}
```

### Example 3: Time-Based Recommendation

**Input**: "What should I focus on today?"

```typescript
{
  originalQuery: "What should I focus on today?",
  
  intent: {
    primary: "recommendation",
    subtype: "priority",
    confidence: 0.92,
  },
  
  entities: [{
    text: "today",
    type: "date",
    resolved: true,
    value: "2025-11-30",
  }],
  
  scope: {
    type: "time_based",
    range: { start: "2025-11-30", end: "2025-11-30" },
    shardTypes: ["c_task", "c_opportunity", "c_project"],
  },
  
  output: {
    formats: ["actions", "chat"],
    templateId: "recommendation_daily",
  },
}
```

---

## Intent Pattern Management (Super Admin)

### Overview

Super Admins can manage intent classification patterns through a dedicated UI, enabling continuous improvement of intent recognition accuracy. The system includes **LLM-assisted pattern creation** to automatically generate and suggest patterns based on sample queries and historical data.

### Pattern Management UI

**Route**: `/admin/ai-insights/intent-patterns`

#### Core Features

1. **Pattern Library**
   - View all intent patterns with performance metrics
   - Filter by intent type, confidence threshold, usage frequency
   - Search patterns by keywords or regex
   - Sort by accuracy, coverage, or creation date

2. **Pattern Editor**
   - Create/edit patterns manually with live preview
   - Define regex patterns with syntax highlighting
   - Set keywords and phrases for matching
   - Configure confidence weights and priorities

3. **LLM-Assisted Pattern Creation** 🤖
   - **Sample Query Analysis**: Upload 10-50 sample queries → LLM suggests patterns
   - **Pattern Generation**: Describe intent in natural language → LLM generates regex patterns
   - **Gap Analysis**: LLM analyzes misclassified queries and suggests missing patterns
   - **Pattern Optimization**: LLM refines existing patterns for better coverage

4. **Testing Sandbox**
   - Test patterns against historical query corpus
   - Live classification preview with confidence scores
   - Side-by-side comparison of pattern variations
   - Batch testing with CSV upload

5. **Performance Analytics**
   - Classification accuracy by intent type (precision, recall, F1)
   - Misclassification reports with root cause analysis
   - Pattern coverage metrics (% of queries matched)
   - Confidence distribution charts

### Intent Pattern Structure

```typescript
interface IntentPattern {
  id: string;
  name: string;
  description: string;
  
  // Classification
  intentType: PrimaryIntent;
  subtype?: string;
  
  // Matching rules
  patterns: RegExp[];              // Regex patterns
  keywords: string[];              // Required keywords
  phrases: string[];               // Common phrases
  
  // Weighting
  priority: number;                // 1-10 (higher = checked first)
  confidenceWeight: number;        // Multiplier for confidence score
  
  // Context requirements
  requiresContext?: {
    shardTypes?: string[];         // Only match in certain contexts
    userRoles?: string[];          // Only for certain roles
  };
  
  // Exclusions
  excludePatterns?: RegExp[];      // Don't match if these patterns present
  
  // Performance tracking
  metrics: {
    totalMatches: number;
    accuracyRate: number;          // % correctly classified
    avgConfidence: number;
    lastMatched: Date;
  };
  
  // Metadata
  source: 'manual' | 'llm_assisted' | 'auto_learned';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isActive: boolean;
}
```

### LLM-Assisted Pattern Creation Workflows

#### Workflow 1: Pattern Generation from Sample Queries

```typescript
// Super Admin provides sample queries
const sampleQueries = [
  "What are the risks in this deal?",
  "Should I be worried about Project Alpha?",
  "Any red flags in the Acme opportunity?",
  "What could go wrong with this account?",
  "Identify threats to closing this quarter"
];

// LLM analyzes and suggests patterns
POST /api/admin/intent-patterns/suggest-from-samples
{
  samples: sampleQueries,
  targetIntent: "analysis",
  targetSubtype: "risk"
}

// Response: Suggested patterns
{
  suggestedPatterns: [
    {
      pattern: /risk|danger|concern|worry|threat|red flag|warning/i,
      confidence: 0.95,
      reasoning: "Common risk-related keywords detected across 5/5 samples",
      coverage: 5 // Matches all 5 samples
    },
    {
      pattern: /should (I|we) (be )?(worried|concerned)/i,
      confidence: 0.88,
      reasoning: "Anxiety-expressing pattern found in 2/5 samples",
      coverage: 2
    },
    {
      pattern: /what (could|might) go wrong|identify threats/i,
      confidence: 0.92,
      reasoning: "Problem anticipation language in 2/5 samples",
      coverage: 2
    }
  ],
  keywords: ["risk", "worry", "threat", "red flag", "warning", "concern"],
  explanation: "The samples indicate a risk analysis intent with focus on potential problems and threats. Suggested patterns cover explicit risk keywords, anxiety expressions, and problem anticipation language."
}
```

#### Workflow 2: Pattern Generation from Natural Language Description

```typescript
// Super Admin describes the intent
POST /api/admin/intent-patterns/generate-from-description
{
  description: "Users asking to compare two or more deals, projects, or companies. They want to understand differences, similarities, or relative performance.",
  examples: [
    "Compare Project Alpha and Project Beta",
    "How does this deal stack up against similar ones?"
  ]
}

// LLM generates patterns
{
  suggestedPattern: {
    name: "Comparison Intent",
    intentType: "comparison",
    patterns: [
      /compar(e|ison)|versus|vs\.?|against|stack up|differ(ence|ent)|similar/i,
      /how does .* (compare|stack|measure)/i,
      /(which|what) (is|are) (better|worse|best|worst)/i
    ],
    keywords: ["compare", "versus", "vs", "difference", "similar"],
    reasoning: "Comparison intents typically use explicit comparison language (compare, versus, vs) or relative evaluation (better, worse). Also includes phrases like 'stack up' or 'measure against'."
  }
}
```

#### Workflow 3: Gap Analysis from Misclassified Queries

```typescript
// System identifies misclassified queries
POST /api/admin/intent-patterns/analyze-gaps
{
  timeRange: "last_30_days",
  minMisclassifications: 5
}

// LLM analyzes gaps
{
  gaps: [
    {
      misclassifiedQueries: [
        "Who owns this deal?",
        "Which rep is handling the Acme account?",
        "Who's responsible for Project Alpha?"
      ],
      currentClassification: "search",
      suggestedClassification: "extraction",
      suggestedSubtype: "owner",
      reasoning: "These queries ask for ownership/responsibility information, which is a specific type of extraction. Current 'search' classification is too broad.",
      suggestedPattern: {
        pattern: /who (owns|is (handling|responsible|assigned|managing))/i,
        keywords: ["who", "owns", "responsible", "handling"],
        intentType: "extraction",
        subtype: "owner"
      },
      frequency: 12,
      impact: "medium"
    }
  ],
  summary: "Found 3 significant pattern gaps affecting 47 queries in the last 30 days."
}
```

#### Workflow 4: Pattern Optimization

```typescript
// Optimize existing pattern
POST /api/admin/intent-patterns/:id/optimize
{
  patternId: "pattern_risk_001",
  optimizationGoal: "increase_coverage" | "improve_precision" | "balance"
}

// LLM suggests improvements
{
  currentPattern: {
    pattern: /risk|danger|concern/i,
    metrics: {
      accuracy: 0.85,
      coverage: 320,
      precision: 0.88,
      recall: 0.72
    }
  },
  suggestedOptimizations: [
    {
      type: "expand_coverage",
      newPattern: /risk|danger|concern|threat|issue|problem|red flag|warning/i,
      projectedMetrics: {
        accuracy: 0.87,
        coverage: 450,
        precision: 0.86,
        recall: 0.89
      },
      reasoning: "Adding 'threat', 'issue', 'problem', 'red flag', 'warning' will capture 130 additional queries while maintaining precision."
    },
    {
      type: "improve_precision",
      newPattern: /risk|danger|concern|threat/i,
      excludePatterns: [/minor concern|small risk/i],
      projectedMetrics: {
        accuracy: 0.91,
        coverage: 280,
        precision: 0.94,
        recall: 0.70
      },
      reasoning: "Narrowing to stronger risk keywords and excluding minimizing language improves precision but reduces coverage."
    }
  ]
}
```

### Pattern Performance Dashboard

```typescript
interface PatternPerformanceMetrics {
  // Overall statistics
  totalPatterns: number;
  activePatterns: number;
  avgAccuracy: number;
  
  // Top performing patterns
  topPatterns: Array<{
    id: string;
    name: string;
    intentType: string;
    accuracy: number;
    coverage: number;
    confidence: number;
  }>;
  
  // Patterns needing attention
  lowPerformancePatterns: Array<{
    id: string;
    name: string;
    intentType: string;
    accuracy: number;
    issue: 'low_accuracy' | 'low_coverage' | 'low_confidence';
    suggestedAction: string;
  }>;
  
  // Misclassification analysis
  misclassifications: {
    total: number;
    byIntentType: Record<string, number>;
    topMisclassifiedQueries: Array<{
      query: string;
      predictedIntent: string;
      actualIntent: string;
      confidence: number;
      frequency: number;
    }>;
  };
  
  // Coverage analysis
  coverage: {
    classifiedQueries: number;
    unclassifiedQueries: number;
    lowConfidenceQueries: number;
    coverageByIntentType: Record<string, number>;
  };
  
  // Trending
  trends: {
    newIntentTypes: string[];         // Emerging intent types
    decliningPatterns: string[];      // Patterns matching fewer queries
    growingPatterns: string[];        // Patterns matching more queries
  };
}
```

### Auto-Learning System

The system can automatically learn and suggest pattern improvements based on user feedback and classification accuracy.

```typescript
interface AutoLearningConfig {
  enabled: boolean;
  
  // Learning sources
  sources: {
    userFeedback: boolean;           // Learn from thumbs up/down
    explicitCorrections: boolean;    // Learn when user corrects classification
    conversationContext: boolean;    // Learn from follow-up questions
  };
  
  // Thresholds
  thresholds: {
    minSamples: number;              // Min samples before suggesting pattern
    minConfidence: number;           // Min confidence for auto-suggestion
    requireApproval: boolean;        // Super Admin must approve
  };
  
  // Review cadence
  reviewCadence: 'daily' | 'weekly' | 'monthly';
  
  // Notification settings
  notifications: {
    newSuggestionsAlert: boolean;
    performanceDegradationAlert: boolean;
    coverageGapAlert: boolean;
  };
}

interface LearningInsight {
  id: string;
  type: 'new_pattern' | 'pattern_improvement' | 'pattern_deprecation';
  
  // Suggestion
  suggestion: {
    action: string;
    pattern?: IntentPattern;
    changes?: any;
    reasoning: string;
  };
  
  // Supporting data
  evidence: {
    sampleQueries: string[];
    frequency: number;
    userFeedback: number;
    accuracy: number;
  };
  
  // Review status
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  
  createdAt: Date;
}
```

### API Endpoints

```typescript
// List all intent patterns
GET /api/admin/intent-patterns
→ { patterns: IntentPattern[], metrics: PatternPerformanceMetrics }

// Create pattern manually
POST /api/admin/intent-patterns
{ name, description, intentType, patterns, keywords, ... }

// LLM-assisted pattern generation
POST /api/admin/intent-patterns/suggest-from-samples
{ samples: string[], targetIntent?, targetSubtype? }

POST /api/admin/intent-patterns/generate-from-description
{ description: string, examples?: string[] }

// Gap analysis
POST /api/admin/intent-patterns/analyze-gaps
{ timeRange: string, minMisclassifications: number }

// Optimize existing pattern
POST /api/admin/intent-patterns/:id/optimize
{ optimizationGoal: 'increase_coverage' | 'improve_precision' | 'balance' }

// Test pattern
POST /api/admin/intent-patterns/test
{ pattern: IntentPattern, testQueries: string[] }
→ { results: Array<{ query, matched, confidence, intentType }> }

// Get performance metrics
GET /api/admin/intent-patterns/metrics
→ PatternPerformanceMetrics

// Auto-learning
GET /api/admin/intent-patterns/learning-insights
→ { insights: LearningInsight[] }

POST /api/admin/intent-patterns/learning-insights/:id/approve
→ { pattern: IntentPattern }

POST /api/admin/intent-patterns/learning-insights/:id/reject
{ reason: string }

// Update pattern
PATCH /api/admin/intent-patterns/:id
{ changes: Partial<IntentPattern> }

// Delete pattern
DELETE /api/admin/intent-patterns/:id
```

### Usage Example

```typescript
// 1. Super Admin analyzes recent misclassifications
const gaps = await analyzePatternGaps({
  timeRange: 'last_30_days',
  minMisclassifications: 5
});

// 2. LLM identifies a gap in "ownership query" patterns
// Gap: Queries like "Who owns this deal?" are misclassified as "search"

// 3. LLM suggests new pattern
const suggestion = gaps[0].suggestedPattern;

// 4. Super Admin tests the pattern
const testResults = await testPattern({
  pattern: suggestion,
  testQueries: historicalQueries.filter(q => q.actualIntent === 'extraction')
});

// 5. Review results: 95% accuracy, good coverage
// 6. Approve and activate pattern
await createIntentPattern(suggestion);

// 7. Monitor performance over next week
// 8. System auto-learns refinements based on user feedback
```

---

## Related Documentation

- [Context Assembly](./CONTEXT-ASSEMBLY.md)
- [AI Insights Overview](./README.md)
- [c_contextTemplate](../../shards/core-types/c_contextTemplate.md)

---

**Last Updated**: November 2025  
**Version**: 1.0.0











