# AI Insights Implementation Guide

## Overview

This guide provides a step-by-step implementation plan for the AI Insights system. Follow this order to build the system incrementally with testable milestones.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 5A: Foundation](#phase-5a-foundation)
3. [Phase 5B: Core Pipeline](#phase-5b-core-pipeline)
4. [Phase 5C: Frontend](#phase-5c-frontend)
5. [Phase 5D: Advanced Features](#phase-5d-advanced-features)
6. [Step 18: Recurring Search Implementation](#step-18-recurring-search-implementation)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Checklist](#deployment-checklist)

---

## Prerequisites

### Required Services (Already Implemented)

| Service | Location | Status |
|---------|----------|--------|
| Azure OpenAI Service | `apps/api/src/services/azure-openai.service.ts` | ✅ |
| Vectorization Service | `apps/api/src/services/vectorization.service.ts` | ✅ |
| Event Service | `apps/api/src/services/event.service.ts` | ✅ |
| Redis | `apps/api/src/config/redis.ts` | ✅ |
| AI Config Service | `apps/api/src/services/ai-config.service.ts` | ✅ |
| **AI Model Service** | `apps/api/src/services/ai/ai-model.service.ts` | ✅ |
| **AI Connection Service** | `apps/api/src/services/ai/ai-connection.service.ts` | ✅ |
| **Key Vault Service** | `packages/key-vault/src/index.ts` | ✅ |

### Required Services (To Be Created)

| Service | Location | Status |
|---------|----------|--------|
| AI Model Selection Service | `apps/api/src/services/ai/ai-model-selection.service.ts` | ❌ Need |
| AI Cost Tracking Service | `apps/api/src/services/ai/ai-cost-tracking.service.ts` | ❌ Need |
| Model Capability Validator | `apps/api/src/services/ai/model-capability-validator.service.ts` | ❌ Need |

### Required ShardTypes (Already Defined)

| ShardType | Documentation | TypeScript Types |
|-----------|---------------|------------------|
| `c_assistant` | ✅ `docs/shards/core-types/c_assistant.md` | ❌ Need |
| `c_aimodel` | ✅ `docs/shards/core-types/c_aimodel.md` | ✅ Exists |
| `c_contextTemplate` | ✅ `docs/shards/core-types/c_contextTemplate.md` | ❌ Need |
| `c_conversation` | ✅ `docs/shards/core-types/c_conversation.md` | ✅ Exists |
| `c_aiconfig` | ✅ `docs/shards/core-types/c_aiconfig.md` | ❌ Need |

### AI Model Connections Architecture

The AI Insights system integrates with Castiel's **AI Model Connections** architecture, which provides:

- **Model Catalog**: Centralized registry of available AI models (GPT-4, Claude, etc.)
- **Tenant BYOK**: Tenants can bring their own API keys for specific models
- **System Defaults**: Fallback to system-wide connections when tenants don't have custom keys
- **Key Vault Integration**: Secure storage of API keys in Azure Key Vault
- **Cost Tracking**: Per-tenant usage and cost tracking based on model pricing
- **Model Selection**: Automatic selection of optimal model based on insight requirements

> **See**: `docs/guides/AI_IMPLEMENTATION_SUMMARY.md` for full AI Connections architecture

---

## Phase 5A: Foundation

**Duration**: ~1 week  
**Goal**: Create all TypeScript types and basic services

### Step 1: Create TypeScript Interfaces

#### 1.1 AI Insights Types

Create `apps/api/src/types/ai-insights.types.ts`:

```typescript
/**
 * AI Insights Types
 * Core types for the insight generation pipeline
 */

// ============================================
// Insight Types
// ============================================

export type InsightType =
  | 'summary'
  | 'analysis'
  | 'comparison'
  | 'recommendation'
  | 'prediction'
  | 'extraction'
  | 'search'
  | 'generation';

export type InsightTrigger =
  | 'on_demand'
  | 'proactive'
  | 'scheduled'
  | 'event_driven'
  | 'widget';

export type InsightFormat =
  | 'brief'
  | 'detailed'
  | 'bullets'
  | 'table'
  | 'chart'
  | 'structured';

// ============================================
// Context Scope
// ============================================

export interface ContextScope {
  // Primary target
  shardId?: string;
  shardTypeId?: string;
  
  // Broader scope
  projectId?: string;
  companyId?: string;
  portfolioId?: string;
  
  // Time constraints
  timeRange?: {
    from: Date;
    to: Date;
  };
  
  // Filters
  tags?: string[];
  status?: string[];
  
  // Limits
  maxShards?: number;
  maxTokens?: number;
}

// ============================================
// Intent Analysis
// ============================================

export interface IntentAnalysisResult {
  // Classification
  insightType: InsightType;
  confidence: number;
  
  // Extracted entities
  entities: ExtractedEntity[];
  
  // Resolved scope
  scope: ContextScope;
  
  // Template recommendation
  suggestedTemplateId?: string;
  
  // Complexity assessment
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTokens: number;
}

export interface ExtractedEntity {
  type: 'shard' | 'shard_type' | 'time_range' | 'metric' | 'action' | 'comparison_target';
  value: string;
  shardId?: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

// ============================================
// Context Assembly
// ============================================

export interface AssembledContext {
  // Primary context
  primary: ContextChunk;
  
  // Related context
  related: ContextChunk[];
  
  // RAG results
  ragChunks: RAGChunk[];
  
  // Metadata
  metadata: {
    templateId: string;
    templateName: string;
    totalTokens: number;
    sourceCount: number;
    assembledAt: Date;
  };
  
  // Formatted for LLM
  formattedContext: string;
}

export interface ContextChunk {
  shardId: string;
  shardName: string;
  shardTypeId: string;
  shardTypeName: string;
  
  content: Record<string, any>;
  tokenCount: number;
  
  // Relationship info
  relationshipType?: string;
  depth?: number;
}

export interface RAGChunk {
  id: string;
  shardId: string;
  shardName: string;
  shardTypeId: string;
  
  content: string;
  chunkIndex: number;
  
  score: number;
  highlight?: string;
  
  tokenCount: number;
}

// ============================================
// LLM Execution
// ============================================

export interface LLMExecutionRequest {
  // Model selection
  modelId: string;
  
  // Prompts
  systemPrompt: string;
  userPrompt: string;
  
  // Context
  context: AssembledContext;
  
  // Options
  options: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stream: boolean;
    tools?: ToolDefinition[];
    responseFormat?: 'text' | 'json';
  };
}

export interface LLMExecutionResult {
  content: string;
  
  // Tool calls
  toolCalls?: ToolCallResult[];
  
  // Usage
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  // Metadata
  model: string;
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}

// ============================================
// Grounding
// ============================================

export interface GroundedResponse {
  // Original content
  originalContent: string;
  
  // With citations
  groundedContent: string;
  
  // Citations
  citations: Citation[];
  
  // Confidence
  overallConfidence: number;
  groundingScore: number;
  
  // Claims analysis
  claims: VerifiedClaim[];
  
  // Potential issues
  warnings: GroundingWarning[];
}

export interface Citation {
  id: string;
  text: string;
  
  source: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    fieldPath?: string;
  };
  
  confidence: number;
  matchType: 'exact' | 'paraphrase' | 'inference';
}

export interface VerifiedClaim {
  claim: string;
  verified: boolean;
  confidence: number;
  sources: string[];          // Citation IDs
  category: 'factual' | 'analytical' | 'opinion' | 'prediction';
}

export interface GroundingWarning {
  type: 'unverified_claim' | 'low_confidence' | 'stale_data' | 'potential_hallucination';
  message: string;
  severity: 'low' | 'medium' | 'high';
  claimIndex?: number;
}

// ============================================
// Insight Request/Response
// ============================================

export interface InsightRequest {
  // User input
  query: string;
  
  // Conversation context
  conversationId?: string;
  parentMessageId?: string;
  
  // Scope
  scope?: ContextScope;
  
  // AI configuration
  assistantId?: string;
  modelId?: string;
  templateId?: string;
  
  // Options
  options?: {
    temperature?: number;
    maxTokens?: number;
    format?: InsightFormat;
    includeReasoning?: boolean;
    webSearchEnabled?: boolean;
    toolsEnabled?: boolean;
  };
}

export interface InsightResponse {
  // Generated content
  content: string;
  format: InsightFormat;
  
  // Grounding
  citations: Citation[];
  confidence: number;
  groundingScore: number;
  
  // Context used
  sources: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    relevance: number;
  }[];
  
  // Suggested follow-ups
  suggestedQuestions: string[];
  
  // Actions
  suggestedActions?: {
    type: string;
    label: string;
    parameters: Record<string, any>;
  }[];
  
  // Usage
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  latencyMs: number;
  
  // Metadata
  insightType: InsightType;
  model: string;
  templateId: string;
  createdAt: Date;
}

// ============================================
// Streaming Events
// ============================================

export type InsightStreamEvent =
  | { type: 'start'; messageId: string; conversationId: string; model: string }
  | { type: 'context'; sources: ContextChunk[]; ragChunks: RAGChunk[] }
  | { type: 'delta'; content: string; index: number }
  | { type: 'tool_use'; toolCallId: string; name: string; status: string; result?: any }
  | { type: 'citation'; citations: Citation[] }
  | { type: 'reasoning'; step: string; content: string }
  | { type: 'complete'; response: InsightResponse }
  | { type: 'error'; code: string; message: string };

// ============================================
// Proactive Insights
// ============================================

export interface ProactiveInsightConfig {
  id: string;
  name: string;
  
  // Trigger
  trigger: {
    type: 'schedule' | 'event' | 'condition';
    
    // Schedule
    cron?: string;
    interval?: number;
    
    // Event
    eventTypes?: string[];
    
    // Condition
    conditions?: {
      field: string;
      operator: 'eq' | 'gt' | 'lt' | 'contains' | 'changed';
      value: any;
    }[];
  };
  
  // Scope
  scope: ContextScope;
  
  // Insight configuration
  insightType: InsightType;
  templateId?: string;
  customPrompt?: string;
  
  // Notification
  notification: {
    channels: ('email' | 'in_app' | 'webhook')[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    recipients?: string[];
  };
  
  // Status
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface ProactiveInsightResult {
  configId: string;
  
  // Generated insight
  insight: InsightResponse;
  
  // What triggered it
  trigger: {
    type: string;
    details: Record<string, any>;
  };
  
  // Notifications sent
  notifications: {
    channel: string;
    recipient: string;
    status: 'sent' | 'failed';
    sentAt?: Date;
  }[];
  
  createdAt: Date;
}
```

#### 1.2 Context Template Types

Create `apps/api/src/types/context-template.types.ts`:

```typescript
/**
 * Context Template Types
 * Types for c_contextTemplate ShardType
 */

// ============================================
// Template Scope
// ============================================

export type TemplateScope = 'system' | 'tenant' | 'user';
export type TemplateCategory = 
  | 'summary'
  | 'analysis'
  | 'comparison'
  | 'extraction'
  | 'generation'
  | 'custom';

// ============================================
// Source Selection
// ============================================

export interface SourceSelection {
  // Primary source
  primary: {
    shardTypeId: string;
    fields: FieldSelection[];
    required: boolean;
  };
  
  // Related sources via relationships
  relationships: RelationshipSource[];
  
  // RAG retrieval
  rag?: RAGConfiguration;
}

export interface FieldSelection {
  fieldPath: string;                 // e.g., 'structuredData.status'
  alias?: string;                    // Rename in output
  required?: boolean;
  transform?: FieldTransform;
}

export interface FieldTransform {
  type: 'truncate' | 'summarize' | 'extract' | 'format';
  
  // For truncate
  maxLength?: number;
  
  // For summarize
  targetLength?: number;
  
  // For extract
  pattern?: string;
  
  // For format
  template?: string;
}

export interface RelationshipSource {
  // Which relationship to traverse
  relationshipType: string;          // e.g., 'belongs_to', 'references'
  direction: 'outgoing' | 'incoming' | 'both';
  
  // Target shard types
  targetShardTypeIds?: string[];     // Filter by type
  
  // What to include
  fields: FieldSelection[];
  
  // Traversal limits
  depth?: number;                    // Max traversal depth
  limit?: number;                    // Max shards per relationship
  
  // Ordering
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  // Filtering
  filters?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
    value: any;
  }[];
}

// ============================================
// RAG Configuration
// ============================================

export interface RAGConfiguration {
  enabled: boolean;
  
  // Query strategy
  queryStrategy: 'user_query' | 'generated' | 'both';
  maxQueries?: number;
  
  // Chunk retrieval
  maxChunks: number;
  minScore: number;
  
  // Source filtering
  shardTypeIds?: string[];           // Limit to types
  excludeShardIds?: string[];        // Exclude specific
  
  // Recency
  preferRecent?: boolean;
  maxAge?: number;                   // Days
  
  // Diversity
  diversityPenalty?: number;         // 0-1
}

// ============================================
// Token Limits
// ============================================

export interface TokenLimits {
  // Overall limit
  maxTotalTokens: number;
  
  // Per-section limits
  primaryTokens?: number;
  relatedTokens?: number;
  ragTokens?: number;
  
  // Priority when truncating
  truncationPriority: ('rag' | 'related' | 'primary')[];
}

// ============================================
// Output Configuration
// ============================================

export interface OutputConfiguration {
  format: 'structured' | 'narrative' | 'list' | 'table';
  
  // Ordering
  ordering?: {
    sections: string[];              // Section order
    withinSection?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
  
  // Grouping
  groupBy?: string;                  // Group by field
  
  // Separators
  sectionSeparator?: string;
  itemSeparator?: string;
  
  // Headers
  includeHeaders?: boolean;
  headerTemplate?: string;
}

// ============================================
// Context Template Structured Data
// ============================================

export interface ContextTemplateStructuredData {
  // Identity
  name: string;
  description?: string;
  category: TemplateCategory;
  scope: TemplateScope;
  
  // Source selection
  sources: SourceSelection;
  
  // Token limits
  limits: TokenLimits;
  
  // Output
  output: OutputConfiguration;
  
  // Metadata
  isDefault: boolean;
  isActive: boolean;
  
  // Usage tracking
  usageCount?: number;
  lastUsedAt?: Date;
  
  // Tags
  tags?: string[];
  
  // Versioning
  version?: number;
}

// ============================================
// Built-in Templates
// ============================================

export const SYSTEM_TEMPLATES = {
  // Project templates
  PROJECT_OVERVIEW: 'tpl_project_overview',
  PROJECT_RISKS: 'tpl_project_risks',
  PROJECT_ACTIVITY: 'tpl_project_activity',
  
  // Company templates
  COMPANY_PROFILE: 'tpl_company_profile',
  COMPANY_RELATIONSHIPS: 'tpl_company_relationships',
  
  // Document templates
  DOCUMENT_SUMMARY: 'tpl_document_summary',
  DOCUMENT_EXTRACT: 'tpl_document_extract',
  
  // General templates
  SHARD_SUMMARY: 'tpl_shard_summary',
  COMPARISON: 'tpl_comparison',
  TIMELINE: 'tpl_timeline',
} as const;

// ============================================
// Template API Types
// ============================================

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: TemplateCategory;
  sources: SourceSelection;
  limits: TokenLimits;
  output?: OutputConfiguration;
  tags?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  sources?: Partial<SourceSelection>;
  limits?: Partial<TokenLimits>;
  output?: Partial<OutputConfiguration>;
  isActive?: boolean;
  tags?: string[];
}

export interface TemplateQueryOptions {
  category?: TemplateCategory;
  scope?: TemplateScope;
  search?: string;
  tags?: string[];
  isActive?: boolean;
  limit?: number;
  offset?: number;
}
```

#### 1.3 AI Config Shard Types

Create `apps/api/src/types/ai-config-shard.types.ts`:

```typescript
/**
 * AI Config Shard Types
 * Types for c_aiconfig ShardType
 */

// ============================================
// Configuration Scope
// ============================================

export type AIConfigScope = 'system' | 'tenant' | 'assistant';

export type AIConfigLevel = 
  | 'system_default'
  | 'tenant_override'
  | 'assistant_override';

// ============================================
// Persona Configuration
// ============================================

export interface PersonaConfig {
  // Identity
  name: string;
  role: string;
  
  // Personality
  traits: string[];                  // e.g., ['analytical', 'friendly']
  expertise: string[];               // e.g., ['sales', 'risk analysis']
  
  // Tone
  tone: 'formal' | 'professional' | 'friendly' | 'casual';
  verbosity: 'concise' | 'balanced' | 'detailed';
  
  // Behavior
  proactivity: 'reactive' | 'balanced' | 'proactive';
  creativity: number;                // 0-1
}

// ============================================
// Style Configuration
// ============================================

export interface StyleConfig {
  // Response format
  defaultFormat: 'paragraph' | 'bullets' | 'structured' | 'conversational';
  
  // Language
  useMarkdown: boolean;
  useEmoji: boolean;
  useHeadings: boolean;
  
  // Length
  preferredLength: 'brief' | 'moderate' | 'detailed';
  maxParagraphs?: number;
  
  // Structure
  includeIntro: boolean;
  includeConclusion: boolean;
  includeSummary: boolean;
  
  // Citations
  citationStyle: 'inline' | 'footnote' | 'endnote' | 'none';
  showConfidence: boolean;
}

// ============================================
// Tool Configuration
// ============================================

export interface ToolConfig {
  // Enabled tools
  enabledTools: string[];
  
  // Tool-specific settings
  toolSettings: Record<string, ToolSettings>;
  
  // Execution
  maxToolCalls: number;
  toolTimeout: number;               // Seconds
  parallelExecution: boolean;
}

export interface ToolSettings {
  enabled: boolean;
  config: Record<string, any>;
  rateLimit?: number;
}

// Available tools
export const AVAILABLE_TOOLS = [
  'web_search',
  'calculator',
  'code_interpreter',
  'image_generation',
  'document_search',
  'calendar',
  'email_draft',
  'data_visualization',
] as const;

// ============================================
// Web Search Configuration
// ============================================

export interface WebSearchConfig {
  enabled: boolean;
  
  // When to search
  autoSearch: boolean;
  searchTriggers: string[];          // Keywords that trigger search
  
  // Search parameters
  maxResults: number;
  preferredSources?: string[];       // Domain allowlist
  blockedSources?: string[];         // Domain blocklist
  
  // Freshness
  requireRecent: boolean;
  maxAge?: string;                   // e.g., '7d', '1m'
  
  // Safety
  safeSearch: boolean;
}

// ============================================
// Domain Knowledge Configuration
// ============================================

export interface DomainKnowledgeConfig {
  // Industry context
  industry?: string;
  subIndustry?: string;
  
  // Terminology
  customTerminology: Record<string, string>;
  
  // Frameworks
  frameworks: string[];              // e.g., 'MEDDIC', 'BANT'
  
  // Guidelines
  guidelines: string[];
  
  // Templates
  responseTemplates: Record<string, string>;
}

// ============================================
// Safety Configuration
// ============================================

export interface SafetyConfig {
  // Content filtering
  contentFiltering: 'strict' | 'balanced' | 'minimal';
  
  // Blocked topics
  blockedTopics: string[];
  
  // Required disclaimers
  disclaimers: {
    topic: string;
    disclaimer: string;
  }[];
  
  // Boundaries
  allowPersonalAdvice: boolean;
  allowFinancialAdvice: boolean;
  allowLegalAdvice: boolean;
  allowMedicalAdvice: boolean;
  
  // Transparency
  disclosureLevel: 'full' | 'minimal' | 'none';
  admitUncertainty: boolean;
  
  // Data handling
  piiHandling: 'mask' | 'redact' | 'allow';
  retainConversations: boolean;
}

// ============================================
// Localization Configuration
// ============================================

export interface LocalizationConfig {
  // Language
  defaultLanguage: string;           // ISO 639-1
  supportedLanguages: string[];
  autoDetectLanguage: boolean;
  
  // Regional
  dateFormat: string;
  numberFormat: string;
  currency: string;
  timezone: string;
  
  // Units
  measurementSystem: 'metric' | 'imperial';
}

// ============================================
// Customization Control
// ============================================

export interface CustomizationControl {
  // What can be overridden
  allowPersonaOverride: boolean;
  allowStyleOverride: boolean;
  allowToolOverride: boolean;
  allowSafetyOverride: boolean;
  allowDomainOverride: boolean;
  
  // Locked settings
  lockedSettings: string[];          // Field paths that can't be changed
  
  // Inheritance
  inheritFrom?: string;              // Parent config ID
}

// ============================================
// AI Config Structured Data
// ============================================

export interface AIConfigStructuredData {
  // Identity
  name: string;
  description?: string;
  scope: AIConfigScope;
  
  // Reference (for tenant/assistant configs)
  tenantId?: string;
  assistantId?: string;
  
  // Configuration sections
  persona: PersonaConfig;
  style: StyleConfig;
  tools: ToolConfig;
  webSearch: WebSearchConfig;
  domainKnowledge: DomainKnowledgeConfig;
  safety: SafetyConfig;
  localization: LocalizationConfig;
  
  // Customization control
  customization: CustomizationControl;
  
  // Status
  isActive: boolean;
  isDefault: boolean;
  
  // Versioning
  version: number;
  
  // Tags
  tags?: string[];
}

// ============================================
// Merged Configuration
// ============================================

export interface MergedAIConfig {
  // Resolved configuration
  persona: PersonaConfig;
  style: StyleConfig;
  tools: ToolConfig;
  webSearch: WebSearchConfig;
  domainKnowledge: DomainKnowledgeConfig;
  safety: SafetyConfig;
  localization: LocalizationConfig;
  
  // Source tracking
  sources: {
    section: string;
    configId: string;
    level: AIConfigLevel;
  }[];
  
  // Computed at
  resolvedAt: Date;
}

// ============================================
// API Types
// ============================================

export interface CreateAIConfigInput {
  name: string;
  description?: string;
  scope: AIConfigScope;
  tenantId?: string;
  assistantId?: string;
  
  persona?: Partial<PersonaConfig>;
  style?: Partial<StyleConfig>;
  tools?: Partial<ToolConfig>;
  webSearch?: Partial<WebSearchConfig>;
  domainKnowledge?: Partial<DomainKnowledgeConfig>;
  safety?: Partial<SafetyConfig>;
  localization?: Partial<LocalizationConfig>;
  customization?: Partial<CustomizationControl>;
  
  tags?: string[];
}

export interface UpdateAIConfigInput {
  name?: string;
  description?: string;
  
  persona?: Partial<PersonaConfig>;
  style?: Partial<StyleConfig>;
  tools?: Partial<ToolConfig>;
  webSearch?: Partial<WebSearchConfig>;
  domainKnowledge?: Partial<DomainKnowledgeConfig>;
  safety?: Partial<SafetyConfig>;
  localization?: Partial<LocalizationConfig>;
  customization?: Partial<CustomizationControl>;
  
  isActive?: boolean;
  tags?: string[];
}
```

#### 1.3 AI Model Connection Types

Create `apps/api/src/types/ai-model-selection.types.ts`:

```typescript
/**
 * AI Model Selection Types
 * Types for integrating with AI Connection Service
 */

import type { 
  AIConnection, 
  AIModel, 
  AIConnectionCredentials 
} from '@castiel/shared-types';
import type { InsightType } from './ai-insights.types';

// ============================================
// Model Selection Requirements
// ============================================

export interface ModelSelectionRequirements {
  // Insight context
  insightType: InsightType;
  contextTokens: number;
  
  // Required capabilities
  requiresVision?: boolean;
  requiresFunctions?: boolean;
  requiresStreaming?: boolean;
  requiresJSONMode?: boolean;
  
  // Budget constraints
  maxCost?: number;
  
  // Preferences
  preferredProvider?: string;  // 'openai', 'anthropic', 'google'
  preferredModel?: string;     // Specific model ID
}

// ============================================
// Model Selection Result
// ============================================

export interface ModelSelectionResult {
  // Selected connection (with credentials from Key Vault)
  connection: AIConnectionCredentials;
  
  // Model details
  model: AIModel;
  
  // Selection reasoning
  reason: string;
  alternatives: {
    modelId: string;
    reason: string;
  }[];
  
  // Cost estimation
  estimatedCost: number;
}

// ============================================
// Model Capability Validation
// ============================================

export interface CapabilityValidationResult {
  valid: boolean;
  missingCapabilities: string[];
  recommendations: string[];
}

// ============================================
// Cost Tracking
// ============================================

export interface CostRecord {
  id: string;
  tenantId: string;
  userId: string;
  connectionId: string;
  modelId: string;
  
  // Usage metrics
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  // Cost calculation
  cost: {
    input: number;
    output: number;
    total: number;
  };
  
  // Context
  metadata: {
    conversationId?: string;
    insightType: InsightType;
    shardId?: string;
    duration: number;
  };
  
  timestamp: Date;
}

export interface TenantUsageStats {
  tenantId: string;
  period: {
    from: Date;
    to: Date;
  };
  
  // Aggregate metrics
  totalCost: number;
  totalTokens: number;
  insightCount: number;
  
  // Breakdown by model
  byModel: {
    modelId: string;
    modelName: string;
    cost: number;
    tokens: number;
    requests: number;
  }[];
  
  // Breakdown by insight type
  byInsightType: {
    insightType: InsightType;
    cost: number;
    tokens: number;
    requests: number;
  }[];
  
  // Daily breakdown
  dailyBreakdown: {
    date: string;
    cost: number;
    tokens: number;
    requests: number;
  }[];
  
  // Budget status
  budget?: {
    limit: number;
    used: number;
    remaining: number;
    percentUsed: number;
  };
}
```

---

### Step 2: Add ShardType Definitions

Update `apps/api/src/types/core-shard-types.ts` to add `c_aiconfig` and `c_contextTemplate`:

```typescript
// Add to CORE_SHARD_TYPE_NAMES
export const CORE_SHARD_TYPE_NAMES = {
  // ... existing types
  AI_CONFIG: 'c_aiconfig',
  CONTEXT_TEMPLATE: 'c_contextTemplate',
} as const;

// Add field definitions and ShardType configurations
// See existing patterns in the file for c_aimodel, c_conversation
```

---

### Step 3: Create Basic Services

#### 3.1 Context Template Service

Create `apps/api/src/services/context-template.service.ts`:

```typescript
/**
 * Context Template Service
 * Manages c_contextTemplate shards
 */

import { CosmosClient, Container } from '@azure/cosmos';
import { RedisClientType } from 'redis';
import {
  ContextTemplateStructuredData,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateQueryOptions,
  SYSTEM_TEMPLATES,
} from '../types/context-template.types.js';

export class ContextTemplateService {
  private container: Container;
  private redis: RedisClientType;
  
  constructor(cosmosClient: CosmosClient, redis: RedisClientType) {
    // Initialize
  }
  
  // CRUD operations
  async create(tenantId: string, input: CreateTemplateInput): Promise<string>;
  async get(tenantId: string, templateId: string): Promise<ContextTemplateStructuredData>;
  async update(tenantId: string, templateId: string, input: UpdateTemplateInput): Promise<void>;
  async delete(tenantId: string, templateId: string): Promise<void>;
  
  // Query
  async list(tenantId: string, options: TemplateQueryOptions): Promise<ContextTemplateStructuredData[]>;
  async getAvailable(tenantId: string): Promise<ContextTemplateStructuredData[]>;
  
  // Resolution
  async resolveTemplate(
    tenantId: string,
    context: { shardTypeId: string; insightType: string }
  ): Promise<ContextTemplateStructuredData>;
  
  // System templates
  async seedSystemTemplates(): Promise<void>;
}
```

#### 3.2 AI Config Shard Service

Create `apps/api/src/services/ai-config-shard.service.ts`:

```typescript
/**
 * AI Config Shard Service
 * Manages c_aiconfig shards
 */

import {
  AIConfigStructuredData,
  MergedAIConfig,
  CreateAIConfigInput,
  UpdateAIConfigInput,
} from '../types/ai-config-shard.types.js';

export class AIConfigShardService {
  // CRUD operations
  async create(input: CreateAIConfigInput): Promise<string>;
  async get(configId: string): Promise<AIConfigStructuredData>;
  async update(configId: string, input: UpdateAIConfigInput): Promise<void>;
  async delete(configId: string): Promise<void>;
  
  // Resolution hierarchy
  async getMergedConfig(
    tenantId: string,
    assistantId?: string
  ): Promise<MergedAIConfig>;
  
  // Defaults
  async getSystemDefault(): Promise<AIConfigStructuredData>;
  async getTenantDefault(tenantId: string): Promise<AIConfigStructuredData | null>;
  async getAssistantConfig(assistantId: string): Promise<AIConfigStructuredData | null>;
  
  // Seeding
  async seedSystemConfig(): Promise<void>;
}
```

#### 3.3 Conversation Service

Create `apps/api/src/services/conversation.service.ts`:

```typescript
/**
 * Conversation Service
 * Manages c_conversation shards
 */

import {
  ConversationStructuredData,
  ConversationMessage,
  CreateConversationInput,
  UpdateConversationInput,
  SendMessageInput,
  ConversationQueryOptions,
} from '../types/conversation.types.js';

export class ConversationService {
  // Conversation CRUD
  async create(tenantId: string, userId: string, input: CreateConversationInput): Promise<string>;
  async get(tenantId: string, conversationId: string): Promise<ConversationStructuredData>;
  async update(tenantId: string, conversationId: string, input: UpdateConversationInput): Promise<void>;
  async delete(tenantId: string, conversationId: string, permanent?: boolean): Promise<void>;
  
  // Query
  async list(tenantId: string, userId: string, options: ConversationQueryOptions): Promise<ConversationStructuredData[]>;
  
  // Messages
  async addMessage(conversationId: string, message: ConversationMessage): Promise<string>;
  async updateMessage(conversationId: string, messageId: string, updates: Partial<ConversationMessage>): Promise<void>;
  async getMessages(conversationId: string, options: { limit?: number; offset?: number; branchIndex?: number }): Promise<ConversationMessage[]>;
  
  // Participants
  async addParticipant(conversationId: string, userId: string, role: string): Promise<void>;
  async removeParticipant(conversationId: string, userId: string): Promise<void>;
  
  // Feedback
  async addFeedback(conversationId: string, messageId: string, feedback: any): Promise<void>;
  
  // Stats
  async updateStats(conversationId: string): Promise<void>;
}
```

#### 3.4 AI Model Selection Service

Create `apps/api/src/services/ai-model-selection.service.ts`:

```typescript
/**
 * AI Model Selection Service
 * Integrates with AI Connection Service to select optimal models for insights
 */

import { AIConnectionService } from './ai/ai-connection.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import type {
  AIConnectionCredentials,
  AIModel,
} from '@castiel/shared-types';
import type {
  ModelSelectionRequirements,
  ModelSelectionResult,
} from '../types/ai-model-selection.types.js';
import { InsightType } from '../types/ai-insights.types.js';

export class AIModelSelectionService {
  constructor(
    private aiConnectionService: AIConnectionService,
    private monitoring: IMonitoringProvider
  ) {}

  /**
   * Get default LLM connection for a tenant
   * Respects tenant BYOK if available, falls back to system
   */
  async getDefaultLLMConnection(tenantId: string): Promise<AIConnectionCredentials> {
    const startTime = Date.now();

    try {
      // Try tenant default first
      const connections = await this.aiConnectionService.listConnections({
        tenantId,
        isDefaultModel: true,
        modelType: 'LLM',
        status: 'active',
      });

      if (connections.connections.length > 0) {
        this.monitoring.trackEvent('ai-insights.model-selection.default-found', {
          tenantId,
          source: 'tenant',
          modelId: connections.connections[0].modelId,
        });

        return this.aiConnectionService.getConnectionWithCredentials(
          connections.connections[0].id
        );
      }

      // Fall back to system default
      const systemConnections = await this.aiConnectionService.listConnections({
        tenantId: 'system',
        isDefaultModel: true,
        modelType: 'LLM',
        status: 'active',
      });

      if (systemConnections.connections.length === 0) {
        throw new Error('No default LLM connection available');
      }

      this.monitoring.trackEvent('ai-insights.model-selection.default-found', {
        tenantId,
        source: 'system',
        modelId: systemConnections.connections[0].modelId,
      });

      return this.aiConnectionService.getConnectionWithCredentials(
        systemConnections.connections[0].id
      );
    } finally {
      this.monitoring.trackMetric('ai-insights.model-selection.default-duration', 
        Date.now() - startTime);
    }
  }

  /**
   * Get connection for specific model with tenant override support
   */
  async getConnectionForModel(
    modelId: string,
    tenantId: string
  ): Promise<AIConnectionCredentials> {
    // Check if tenant has their own connection for this model
    const tenantConnections = await this.aiConnectionService.listConnections({
      tenantId,
      modelId,
      status: 'active',
    });

    if (tenantConnections.connections.length > 0) {
      this.monitoring.trackEvent('ai-insights.model-selection.tenant-override', {
        tenantId,
        modelId,
      });

      return this.aiConnectionService.getConnectionWithCredentials(
        tenantConnections.connections[0].id
      );
    }

    // Fall back to system connection
    const systemConnections = await this.aiConnectionService.listConnections({
      tenantId: 'system',
      modelId,
      status: 'active',
    });

    if (systemConnections.connections.length === 0) {
      throw new Error(`No connection available for model: ${modelId}`);
    }

    this.monitoring.trackEvent('ai-insights.model-selection.system-fallback', {
      tenantId,
      modelId,
    });

    return this.aiConnectionService.getConnectionWithCredentials(
      systemConnections.connections[0].id
    );
  }

  /**
   * Select optimal model based on requirements
   */
  async selectOptimalModel(
    tenantId: string,
    requirements: ModelSelectionRequirements
  ): Promise<ModelSelectionResult> {
    const startTime = Date.now();

    try {
      // Get available connections for tenant
      const connections = await this.aiConnectionService.listConnections({
        tenantId,
        modelType: 'LLM',
        status: 'active',
      });

      // Also get system connections
      const systemConnections = await this.aiConnectionService.listConnections({
        tenantId: 'system',
        modelType: 'LLM',
        status: 'active',
      });

      const allConnections = [...connections.connections, ...systemConnections.connections];

      // Get model details for each connection
      const modelsWithConnections = await Promise.all(
        allConnections.map(async (conn) => {
          const model = await this.aiConnectionService['getModelById'](conn.modelId);
          return { connection: conn, model };
        })
      );

      // Filter by requirements
      let candidates = modelsWithConnections.filter(({ model, connection }) => {
        if (!model) return false;
        
        // Context window check
        const contextWindow = connection.contextWindow || model.contextWindow;
        if (requirements.contextTokens > contextWindow) return false;

        // Vision check
        if (requirements.requiresVision && !model.vision) return false;

        // Functions check
        if (requirements.requiresFunctions && !model.functions) return false;

        // Streaming check
        if (requirements.requiresStreaming && !model.streaming) return false;

        // JSON mode check
        if (requirements.requiresJSONMode && !model.jsonMode) return false;

        // Cost check (estimate)
        if (requirements.maxCost) {
          const estimatedCost =
            (requirements.contextTokens / 1_000_000) * model.pricing.inputPricePerMillion +
            (1000 / 1_000_000) * model.pricing.outputPricePerMillion; // Assume 1k output
          if (estimatedCost > requirements.maxCost) return false;
        }

        // Provider preference
        if (requirements.preferredProvider && 
            model.provider.toLowerCase() !== requirements.preferredProvider.toLowerCase()) {
          return false;
        }

        return true;
      });

      if (candidates.length === 0) {
        throw new Error('No model meets the requirements');
      }

      // Prefer tenant connections over system
      const tenantCandidates = candidates.filter(
        ({ connection }) => connection.tenantId === tenantId
      );
      if (tenantCandidates.length > 0) {
        candidates = tenantCandidates;
      }

      // Select best model based on insight type
      const selected = this.selectBestForInsightType(
        candidates,
        requirements.insightType
      );

      // Get connection with credentials
      const connectionWithCreds = await this.aiConnectionService.getConnectionWithCredentials(
        selected.connection.id
      );

      // Calculate estimated cost
      const estimatedCost = this.estimateCost(
        selected.model!,
        requirements.contextTokens,
        1000 // Assume 1k output tokens
      );

      this.monitoring.trackEvent('ai-insights.model-selection.optimal-selected', {
        tenantId,
        modelId: selected.model!.id,
        insightType: requirements.insightType,
        estimatedCost,
        contextTokens: requirements.contextTokens,
      });

      return {
        connection: connectionWithCreds,
        model: selected.model!,
        reason: `Optimal for ${requirements.insightType} with ${requirements.contextTokens} tokens`,
        alternatives: candidates
          .filter(c => c.connection.id !== selected.connection.id)
          .slice(0, 3)
          .map(c => ({
            modelId: c.model!.id,
            reason: c.model!.name,
          })),
        estimatedCost,
      };
    } finally {
      this.monitoring.trackMetric('ai-insights.model-selection.optimal-duration', 
        Date.now() - startTime);
    }
  }

  /**
   * Select best model for specific insight type
   */
  private selectBestForInsightType(
    candidates: { connection: any; model: AIModel | null }[],
    insightType: InsightType
  ): { connection: any; model: AIModel } {
    const complexInsights: InsightType[] = ['analysis', 'recommendation', 'prediction'];
    
    if (complexInsights.includes(insightType)) {
      // Prefer GPT-4 or Claude for complex insights
      const gpt4Candidates = candidates.filter(({ model }) =>
        model?.modelIdentifier?.includes('gpt-4') ||
        model?.modelIdentifier?.includes('claude-3')
      );
      if (gpt4Candidates.length > 0) {
        return gpt4Candidates[0] as any;
      }
    }

    // For simple insights, prefer faster/cheaper models
    if (insightType === 'summary' || insightType === 'extraction') {
      const fastModels = candidates.filter(({ model }) =>
        model?.modelIdentifier?.includes('gpt-3.5') ||
        model?.modelIdentifier?.includes('gpt-4o-mini')
      );
      if (fastModels.length > 0) {
        return fastModels[0] as any;
      }
    }

    // Default to first candidate
    return candidates[0] as any;
  }

  /**
   * Estimate cost for model usage
   */
  private estimateCost(
    model: AIModel,
    inputTokens: number,
    outputTokens: number
  ): number {
    const inputCost = (inputTokens / 1_000_000) * model.pricing.inputPricePerMillion;
    const outputCost = (outputTokens / 1_000_000) * model.pricing.outputPricePerMillion;
    return inputCost + outputCost;
  }
}
```

#### 3.5 AI Cost Tracking Service

Create `apps/api/src/services/ai-cost-tracking.service.ts`:

```typescript
/**
 * AI Cost Tracking Service
 * Tracks AI usage and costs per tenant
 */

import { CosmosClient, Container } from '@azure/cosmos';
import { IMonitoringProvider } from '@castiel/monitoring';
import { AIConnectionService } from './ai/ai-connection.service.js';
import type {
  CostRecord,
  TenantUsageStats,
} from '../types/ai-model-selection.types.js';
import type { InsightType } from '../types/ai-insights.types.js';

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class AICostTrackingService {
  private container: Container;

  constructor(
    private cosmosClient: CosmosClient,
    private aiConnectionService: AIConnectionService,
    private monitoring: IMonitoringProvider,
    private databaseId: string,
    private containerId: string = 'aiCosts'
  ) {
    const database = this.cosmosClient.database(this.databaseId);
    this.container = database.container(this.containerId);
  }

  /**
   * Calculate and record cost for an insight generation
   */
  async recordInsightCost(
    tenantId: string,
    userId: string,
    connectionId: string,
    usage: TokenUsage,
    metadata: {
      conversationId?: string;
      insightType: InsightType;
      shardId?: string;
      duration: number;
    }
  ): Promise<number> {
    const startTime = Date.now();

    try {
      // Get model pricing from connection
      const connection = await this.aiConnectionService.getConnection(connectionId);
      if (!connection) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const model = await this.aiConnectionService['getModelById'](connection.modelId);
      if (!model) {
        throw new Error(`Model not found: ${connection.modelId}`);
      }

      const inputCost =
        (usage.promptTokens / 1_000_000) * model.pricing.inputPricePerMillion;
      const outputCost =
        (usage.completionTokens / 1_000_000) * model.pricing.outputPricePerMillion;
      const totalCost = inputCost + outputCost;

      // Create cost record
      const costRecord: CostRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        userId,
        connectionId,
        modelId: connection.modelId,
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
        cost: {
          input: inputCost,
          output: outputCost,
          total: totalCost,
        },
        metadata,
        timestamp: new Date(),
      };

      // Store in Cosmos DB
      await this.container.items.create(costRecord);

      // Update tenant usage metrics
      await this.updateTenantUsageMetrics(tenantId, totalCost, usage.totalTokens);

      this.monitoring.trackEvent('ai-insights.cost-recorded', {
        tenantId,
        modelId: connection.modelId,
        cost: totalCost,
        tokens: usage.totalTokens,
        insightType: metadata.insightType,
      });

      this.monitoring.trackMetric('ai-insights.cost', totalCost, {
        tenantId,
        modelId: connection.modelId,
        insightType: metadata.insightType,
      });

      return totalCost;
    } finally {
      this.monitoring.trackMetric('ai-insights.cost-tracking.record-duration', 
        Date.now() - startTime);
    }
  }

  /**
   * Check if tenant has budget remaining
   */
  async checkBudget(tenantId: string, estimatedCost: number): Promise<boolean> {
    const usage = await this.getTenantMonthlyUsage(tenantId);
    const budget = await this.getTenantBudget(tenantId);
    
    if (!budget) {
      return true; // No budget limit set
    }

    return usage.totalCost + estimatedCost <= budget.monthlyLimit;
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(
    tenantId: string,
    options?: {
      from?: Date;
      to?: Date;
    }
  ): Promise<TenantUsageStats> {
    const from = options?.from || this.getMonthStart();
    const to = options?.to || new Date();

    const query = {
      query: `SELECT * FROM c WHERE c.tenantId = @tenantId 
              AND c.timestamp >= @from AND c.timestamp <= @to`,
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@from', value: from.toISOString() },
        { name: '@to', value: to.toISOString() },
      ],
    };

    const { resources: records } = await this.container.items
      .query<CostRecord>(query)
      .fetchAll();

    // Aggregate data
    const totalCost = records.reduce((sum, r) => sum + r.cost.total, 0);
    const totalTokens = records.reduce((sum, r) => sum + r.usage.totalTokens, 0);
    const insightCount = records.length;

    // Group by model
    const byModel = this.groupByModel(records);

    // Group by insight type
    const byInsightType = this.groupByInsightType(records);

    // Daily breakdown
    const dailyBreakdown = this.getDailyBreakdown(records);

    // Get budget info
    const budget = await this.getTenantBudget(tenantId);

    return {
      tenantId,
      period: { from, to },
      totalCost,
      totalTokens,
      insightCount,
      byModel,
      byInsightType,
      dailyBreakdown,
      budget: budget
        ? {
            limit: budget.monthlyLimit,
            used: totalCost,
            remaining: budget.monthlyLimit - totalCost,
            percentUsed: (totalCost / budget.monthlyLimit) * 100,
          }
        : undefined,
    };
  }

  private async getTenantMonthlyUsage(tenantId: string) {
    return this.getTenantUsage(tenantId, {
      from: this.getMonthStart(),
      to: new Date(),
    });
  }

  private async getTenantBudget(tenantId: string): Promise<{ monthlyLimit: number } | null> {
    // TODO: Implement budget retrieval from tenant settings
    return null;
  }

  private async updateTenantUsageMetrics(
    tenantId: string,
    cost: number,
    tokens: number
  ): Promise<void> {
    // Track in monitoring system
    this.monitoring.trackMetric('tenant.ai-usage.cost', cost, { tenantId });
    this.monitoring.trackMetric('tenant.ai-usage.tokens', tokens, { tenantId });
  }

  private groupByModel(records: CostRecord[]) {
    const grouped = new Map<string, { cost: number; tokens: number; requests: number }>();

    for (const record of records) {
      const existing = grouped.get(record.modelId) || { cost: 0, tokens: 0, requests: 0 };
      grouped.set(record.modelId, {
        cost: existing.cost + record.cost.total,
        tokens: existing.tokens + record.usage.totalTokens,
        requests: existing.requests + 1,
      });
    }

    return Array.from(grouped.entries()).map(([modelId, stats]) => ({
      modelId,
      modelName: modelId, // TODO: Get from model service
      ...stats,
    }));
  }

  private groupByInsightType(records: CostRecord[]) {
    const grouped = new Map<InsightType, { cost: number; tokens: number; requests: number }>();

    for (const record of records) {
      const type = record.metadata.insightType;
      const existing = grouped.get(type) || { cost: 0, tokens: 0, requests: 0 };
      grouped.set(type, {
        cost: existing.cost + record.cost.total,
        tokens: existing.tokens + record.usage.totalTokens,
        requests: existing.requests + 1,
      });
    }

    return Array.from(grouped.entries()).map(([insightType, stats]) => ({
      insightType,
      ...stats,
    }));
  }

  private getDailyBreakdown(records: CostRecord[]) {
    const grouped = new Map<string, { cost: number; tokens: number; requests: number }>();

    for (const record of records) {
      const date = record.timestamp.toISOString().split('T')[0];
      const existing = grouped.get(date) || { cost: 0, tokens: 0, requests: 0 };
      grouped.set(date, {
        cost: existing.cost + record.cost.total,
        tokens: existing.tokens + record.usage.totalTokens,
        requests: existing.requests + 1,
      });
    }

    return Array.from(grouped.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
```

#### 3.6 Model Capability Validator Service

Create `apps/api/src/services/model-capability-validator.service.ts`:

```typescript
/**
 * Model Capability Validator Service
 * Validates that models support required capabilities
 */

import { AIConnectionService } from './ai/ai-connection.service.js';
import { IMonitoringProvider } from '@castiel/monitoring';
import type { CapabilityValidationResult } from '../types/ai-model-selection.types.js';

export class ModelCapabilityValidator {
  constructor(
    private aiConnectionService: AIConnectionService,
    private monitoring: IMonitoringProvider
  ) {}

  /**
   * Validate that a model supports required capabilities
   */
  async validateCapabilities(
    modelId: string,
    requirements: {
      streaming?: boolean;
      vision?: boolean;
      functions?: boolean;
      jsonMode?: boolean;
      minContextWindow?: number;
    }
  ): Promise<CapabilityValidationResult> {
    const model = await this.aiConnectionService['getModelById'](modelId);
    if (!model) {
      return {
        valid: false,
        missingCapabilities: ['Model not found'],
        recommendations: [],
      };
    }

    const missing: string[] = [];
    const recommendations: string[] = [];

    if (requirements.streaming && !model.streaming) {
      missing.push('streaming');
      recommendations.push('Use a model that supports streaming responses');
    }
    if (requirements.vision && !model.vision) {
      missing.push('vision');
      recommendations.push('Use GPT-4 Vision or similar multimodal model');
    }
    if (requirements.functions && !model.functions) {
      missing.push('function calling');
      recommendations.push('Use GPT-4 or Claude 3 which support function calling');
    }
    if (requirements.jsonMode && !model.jsonMode) {
      missing.push('JSON mode');
      recommendations.push('Use GPT-4 Turbo or similar model with JSON mode');
    }
    if (
      requirements.minContextWindow &&
      model.contextWindow < requirements.minContextWindow
    ) {
      missing.push(`context window >= ${requirements.minContextWindow}`);
      recommendations.push(
        `Use a model with larger context window (current: ${model.contextWindow})`
      );
    }

    const valid = missing.length === 0;

    if (!valid) {
      this.monitoring.trackEvent('ai-insights.capability-validation.failed', {
        modelId,
        missingCapabilities: missing,
      });
    }

    return {
      valid,
      missingCapabilities: missing,
      recommendations,
    };
  }

  /**
   * Get recommended models for capabilities
   */
  async getRecommendedModels(requirements: {
    streaming?: boolean;
    vision?: boolean;
    functions?: boolean;
    jsonMode?: boolean;
    minContextWindow?: number;
  }): Promise<string[]> {
    // Get all active models
    const connections = await this.aiConnectionService.listConnections({
      tenantId: 'system',
      status: 'active',
    });

    const recommended: string[] = [];

    for (const connection of connections.connections) {
      const validation = await this.validateCapabilities(
        connection.modelId,
        requirements
      );

      if (validation.valid) {
        recommended.push(connection.modelId);
      }
    }

    return recommended;
  }
}
```

---

## Phase 5B: Core Pipeline

**Duration**: ~2 weeks  
**Goal**: Build the insight generation pipeline

### Step 4: Intent Analyzer Service

Create `apps/api/src/services/intent-analyzer.service.ts`:

```typescript
/**
 * Intent Analyzer Service
 * Analyzes user queries to determine intent, extract entities, and resolve scope
 */

import { IntentAnalysisResult, InsightType, ContextScope, ExtractedEntity } from '../types/ai-insights.types.js';

export class IntentAnalyzerService {
  /**
   * Analyze user query to determine intent
   */
  async analyze(
    query: string,
    context: {
      conversationHistory?: string[];
      currentScope?: ContextScope;
      userPreferences?: Record<string, any>;
    }
  ): Promise<IntentAnalysisResult>;
  
  /**
   * Classify insight type from query
   */
  private classifyInsightType(query: string): { type: InsightType; confidence: number };
  
  /**
   * Extract entities (shards, time ranges, metrics, etc.)
   */
  private extractEntities(query: string): ExtractedEntity[];
  
  /**
   * Resolve entity references to shard IDs
   */
  private resolveEntityReferences(entities: ExtractedEntity[], tenantId: string): Promise<ExtractedEntity[]>;
  
  /**
   * Determine optimal context scope
   */
  private determineScope(entities: ExtractedEntity[], currentScope?: ContextScope): ContextScope;
  
  /**
   * Estimate complexity and tokens
   */
  private estimateComplexity(type: InsightType, scope: ContextScope): { complexity: string; tokens: number };
}
```

### Step 5: Context Assembler Service

Create `apps/api/src/services/context-assembler.service.ts`:

```typescript
/**
 * Context Assembler Service
 * Builds context from templates, relationships, and RAG
 */

import { AssembledContext, ContextChunk, RAGChunk, ContextScope } from '../types/ai-insights.types.js';
import { ContextTemplateStructuredData } from '../types/context-template.types.js';

export class ContextAssemblerService {
  /**
   * Assemble context for insight generation
   */
  async assemble(
    templateId: string,
    scope: ContextScope,
    userQuery: string,
    options?: {
      maxTokens?: number;
      includeRAG?: boolean;
    }
  ): Promise<AssembledContext>;
  
  /**
   * Get primary shard data
   */
  private async getPrimaryContext(
    shardId: string,
    template: ContextTemplateStructuredData
  ): Promise<ContextChunk>;
  
  /**
   * Traverse relationships
   */
  private async getRelatedContext(
    shardId: string,
    template: ContextTemplateStructuredData
  ): Promise<ContextChunk[]>;
  
  /**
   * Perform RAG retrieval
   */
  private async performRAG(
    query: string,
    scope: ContextScope,
    template: ContextTemplateStructuredData
  ): Promise<RAGChunk[]>;
  
  /**
   * Apply token budget
   */
  private applyTokenBudget(
    primary: ContextChunk,
    related: ContextChunk[],
    rag: RAGChunk[],
    template: ContextTemplateStructuredData
  ): { primary: ContextChunk; related: ContextChunk[]; rag: RAGChunk[] };
  
  /**
   * Format context for LLM
   */
  private formatContext(
    primary: ContextChunk,
    related: ContextChunk[],
    rag: RAGChunk[],
    template: ContextTemplateStructuredData
  ): string;
}
```

### Step 6: Grounding Service

Create `apps/api/src/services/grounding.service.ts`:

```typescript
/**
 * Grounding Service
 * Verifies AI outputs and adds citations
 */

import { GroundedResponse, Citation, VerifiedClaim, GroundingWarning } from '../types/ai-insights.types.js';
import { AssembledContext } from '../types/ai-insights.types.js';

export class GroundingService {
  /**
   * Ground AI response with citations
   */
  async ground(
    response: string,
    context: AssembledContext
  ): Promise<GroundedResponse>;
  
  /**
   * Extract claims from response
   */
  private extractClaims(response: string): string[];
  
  /**
   * Verify claims against context
   */
  private verifyClaims(
    claims: string[],
    context: AssembledContext
  ): VerifiedClaim[];
  
  /**
   * Find citations for verified claims
   */
  private findCitations(
    claims: VerifiedClaim[],
    context: AssembledContext
  ): Citation[];
  
  /**
   * Detect potential hallucinations
   */
  private detectHallucinations(
    claims: VerifiedClaim[]
  ): GroundingWarning[];
  
  /**
   * Calculate grounding score
   */
  private calculateGroundingScore(claims: VerifiedClaim[]): number;
  
  /**
   * Inject citations into response
   */
  private injectCitations(
    response: string,
    citations: Citation[]
  ): string;
}
```

### Step 7: Insight Service (Orchestrator)

Create `apps/api/src/services/insight.service.ts`:

```typescript
/**
 * Insight Service
 * Main orchestrator for insight generation with AI Model Connections integration
 */

import { 
  InsightRequest, 
  InsightResponse, 
  InsightStreamEvent,
  IntentAnalysisResult,
  AssembledContext,
  GroundedResponse,
} from '../types/ai-insights.types.js';
import { AIModelSelectionService } from './ai-model-selection.service.js';
import { AICostTrackingService } from './ai-cost-tracking.service.js';
import { ModelCapabilityValidator } from './model-capability-validator.service.js';
import type { AIConnectionCredentials } from '@castiel/shared-types';

export class InsightService {
  constructor(
    private intentAnalyzer: IntentAnalyzerService,
    private contextAssembler: ContextAssemblerService,
    private groundingService: GroundingService,
    private aiConfigService: AIConfigShardService,
    private conversationService: ConversationService,
    private azureOpenAI: AzureOpenAIService,
    private modelSelectionService: AIModelSelectionService,    // ✅ NEW
    private costTracking: AICostTrackingService,              // ✅ NEW
    private capabilityValidator: ModelCapabilityValidator,    // ✅ NEW
    private monitoring: IMonitoringProvider
  ) {}
  
  /**
   * Generate insight (non-streaming)
   */
  async generate(
    tenantId: string,
    userId: string,
    request: InsightRequest
  ): Promise<InsightResponse> {
    const startTime = Date.now();

    // 1. Analyze intent
    const intent = await this.intentAnalyzer.analyze(request.query, {
      conversationHistory: [], // TODO: Get from conversation
      currentScope: request.scope,
    });

    // 2. Resolve template
    const templateId = request.templateId || intent.suggestedTemplateId || 'default';
    
    // 3. Assemble context
    const context = await this.contextAssembler.assemble(
      templateId,
      intent.scope,
      request.query,
      {
        maxTokens: request.options?.maxTokens,
        includeRAG: true,
      }
    );

    // 4. ✅ SELECT MODEL USING CONNECTION SERVICE
    let connectionWithCreds: AIConnectionCredentials;
    
    if (request.modelId) {
      // User specified a model - use tenant override if available
      connectionWithCreds = await this.modelSelectionService.getConnectionForModel(
        request.modelId,
        tenantId
      );
    } else {
      // Auto-select optimal model
      const selectionResult = await this.modelSelectionService.selectOptimalModel(
        tenantId,
        {
          insightType: intent.insightType,
          contextTokens: context.metadata.totalTokens,
          requiresVision: false,
          requiresFunctions: false,
          requiresStreaming: false,
        }
      );
      connectionWithCreds = selectionResult.connection;
    }

    const modelId = connectionWithCreds.connection.modelId;

    // 5. ✅ VALIDATE CAPABILITIES (Optional but recommended)
    const validation = await this.capabilityValidator.validateCapabilities(
      modelId,
      {
        streaming: false,
        minContextWindow: context.metadata.totalTokens + 4000, // + expected output
      }
    );

    if (!validation.valid) {
      this.monitoring.trackEvent('ai-insights.capability-validation-warning', {
        tenantId,
        modelId,
        missingCapabilities: validation.missingCapabilities,
      });
      // Continue anyway with warning
    }

    // 6. Build prompts
    const config = await this.aiConfigService.getMergedConfig(tenantId, request.assistantId);
    const { systemPrompt, userPrompt } = this.buildPrompts(
      intent, 
      context, 
      request.query, 
      request.options
    );

    // 7. ✅ EXECUTE LLM WITH CONNECTION CREDENTIALS
    const llmResponse = await this.executeLLM(
      connectionWithCreds,  // Pass full connection with credentials
      systemPrompt,
      userPrompt,
      request.options?.temperature,
      request.options?.maxTokens
    );

    // 8. Ground response
    const grounded = await this.groundingService.ground(
      llmResponse.content,
      context,
      {
        verifyClaims: true,
        addCitations: true,
      }
    );

    // 9. Generate suggestions
    const suggestedQuestions = this.generateSuggestions(intent, context);

    // 10. ✅ TRACK COSTS
    const cost = await this.costTracking.recordInsightCost(
      tenantId,
      userId,
      connectionWithCreds.connection.id,
      llmResponse.usage,
      {
        conversationId: request.conversationId,
        insightType: intent.insightType,
        shardId: request.scope?.shardId,
        duration: Date.now() - startTime,
      }
    );

    // 11. Build response
    const response: InsightResponse = {
      content: grounded.groundedContent,
      format: request.options?.format || 'detailed',
      citations: grounded.citations,
      confidence: grounded.overallConfidence,
      groundingScore: grounded.groundingScore,
      sources: context.related.map((chunk) => ({
        shardId: chunk.shardId,
        shardName: chunk.shardName,
        shardTypeId: chunk.shardTypeId,
        relevance: 1,
      })),
      suggestedQuestions,
      usage: llmResponse.usage,
      cost,  // ✅ Include actual cost
      latencyMs: Date.now() - startTime,
      insightType: intent.insightType,
      model: modelId,  // ✅ Include model used
      templateId: context.metadata.templateId,
      createdAt: new Date(),
    };

    return response;
  }
  
  /**
   * Generate insight with streaming
   */
  async *generateStream(
    tenantId: string,
    userId: string,
    request: InsightRequest
  ): AsyncGenerator<InsightStreamEvent> {
    try {
      const startTime = Date.now();
      const messageId = uuidv4();
      const conversationId = request.conversationId || uuidv4();

      // ✅ Get connection with credentials
      let connectionWithCreds: AIConnectionCredentials;
      
      if (request.modelId) {
        connectionWithCreds = await this.modelSelectionService.getConnectionForModel(
          request.modelId,
          tenantId
        );
      } else {
        connectionWithCreds = await this.modelSelectionService.getDefaultLLMConnection(tenantId);
      }

      yield {
        type: 'start',
        messageId,
        conversationId,
        model: connectionWithCreds.connection.modelId,
      };

      // Analyze intent
      const intent = await this.intentAnalyzer.analyze(request.query, {
        conversationHistory: [],
        currentScope: request.scope,
      });

      // Assemble context
      const context = await this.contextAssembler.assemble(
        request.templateId || intent.suggestedTemplateId || 'default',
        intent.scope,
        request.query
      );

      yield {
        type: 'context',
        sources: context.related,
        ragChunks: context.ragChunks,
      };

      // Build prompts
      const config = await this.aiConfigService.getMergedConfig(tenantId, request.assistantId);
      const { systemPrompt, userPrompt } = this.buildPrompts(intent, context, request.query, request.options);

      // ✅ Stream from Azure OpenAI with connection credentials
      const stream = await this.azureOpenAI.streamChat({
        endpoint: connectionWithCreds.connection.endpoint,
        apiKey: connectionWithCreds.credentials.apiKey,  // ✅ From Key Vault
        deploymentName: connectionWithCreds.connection.deploymentName!,
        apiVersion: connectionWithCreds.connection.version || '2024-10-01-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: request.options?.temperature ?? 0.7,
        maxTokens: request.options?.maxTokens ?? 4000,
      });

      let fullContent = '';
      let index = 0;
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          yield {
            type: 'delta',
            content: delta,
            index: index++,
          };
        }

        // Capture usage if available
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          };
        }
      }

      // Ground response
      const grounded = await this.groundingService.ground(fullContent, context);

      yield {
        type: 'citation',
        citations: grounded.citations,
      };

      // Generate suggestions
      const suggestedQuestions = this.generateSuggestions(intent, context);

      // ✅ Track costs
      const cost = await this.costTracking.recordInsightCost(
        tenantId,
        userId,
        connectionWithCreds.connection.id,
        usage,
        {
          conversationId,
          insightType: intent.insightType,
          shardId: request.scope?.shardId,
          duration: Date.now() - startTime,
        }
      );

      // Build final response
      const response: InsightResponse = {
        content: grounded.groundedContent,
        format: request.options?.format || 'detailed',
        citations: grounded.citations,
        confidence: grounded.overallConfidence,
        groundingScore: grounded.groundingScore,
        sources: context.related.map((chunk) => ({
          shardId: chunk.shardId,
          shardName: chunk.shardName,
          shardTypeId: chunk.shardTypeId,
          relevance: 1,
        })),
        suggestedQuestions,
        usage,
        cost,
        latencyMs: Date.now() - startTime,
        insightType: intent.insightType,
        model: connectionWithCreds.connection.modelId,
        templateId: context.metadata.templateId,
        createdAt: new Date(),
      };

      yield {
        type: 'complete',
        response,
      };

      // Save to conversation
      if (conversationId) {
        await this.saveToConversation(
          conversationId,
          tenantId,
          userId,
          request.query,
          response,
          connectionWithCreds.connection.modelId,
          context
        );
      }
    } catch (error) {
      yield {
        type: 'error',
        code: 'GENERATION_FAILED',
        message: (error as Error).message,
      };
    }
  }
  
  /**
   * Generate quick insight for shard
   */
  async quickInsight(
    tenantId: string,
    shardId: string,
    type: string,
    options?: any
  ): Promise<InsightResponse>;
  
  /**
   * Get suggested questions for shard
   */
  async getSuggestions(
    tenantId: string,
    shardId: string
  ): Promise<string[]>;
  
  /**
   * ✅ Execute LLM with connection credentials
   */
  private async executeLLM(
    connection: AIConnectionCredentials,
    systemPrompt: string,
    userPrompt: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<{ content: string; usage: TokenUsage }> {
    try {
      // Use Azure OpenAI service with connection details
      const response = await this.azureOpenAI.chat({
        endpoint: connection.connection.endpoint,
        apiKey: connection.credentials.apiKey,  // ✅ From Key Vault
        deploymentName: connection.connection.deploymentName!,
        apiVersion: connection.connection.version || '2024-10-01-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 4000,
      });

      return {
        content: response.choices[0].message.content,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'insight.executeLLM',
        modelId: connection.connection.modelId,
        connectionId: connection.connection.id,
      });
      throw error;
    }
  }
  
  /**
   * Internal: Build system prompt
   */
  private buildSystemPrompt(
    config: MergedAIConfig,
    intent: IntentAnalysisResult
  ): string;
  
  /**
   * Internal: Build prompts
   */
  private buildPrompts(
    intent: IntentAnalysisResult,
    context: AssembledContext,
    query: string,
    options?: any
  ): { systemPrompt: string; userPrompt: string };
  
  /**
   * Internal: Generate suggested questions
   */
  private generateSuggestions(
    intent: IntentAnalysisResult,
    context: AssembledContext
  ): string[];
  
  /**
   * Internal: Save to conversation
   */
  private async saveToConversation(
    conversationId: string,
    tenantId: string,
    userId: string,
    query: string,
    response: InsightResponse,
    modelId: string,
    context: AssembledContext
  ): Promise<void>;
}
```

### Step 8: API Routes

Create `apps/api/src/routes/insights.routes.ts`:

```typescript
/**
 * Insight API Routes
 */

import { FastifyInstance } from 'fastify';
import { InsightService } from '../services/insight.service.js';

export async function insightRoutes(fastify: FastifyInstance) {
  // Chat endpoint (streaming)
  fastify.post('/insights/chat', {
    schema: { /* ... */ },
    handler: async (request, reply) => {
      // Set SSE headers
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      
      // Stream response
      const stream = insightService.generateStream(
        request.tenantId,
        request.userId,
        request.body
      );
      
      for await (const event of stream) {
        reply.raw.write(`event: ${event.type}\n`);
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      
      reply.raw.end();
    },
  });
  
  // Quick insight
  fastify.post('/insights/quick', { /* ... */ });
  
  // Suggestions
  fastify.get('/insights/suggestions/:shardId', { /* ... */ });
  
  // Conversations CRUD
  fastify.get('/insights/conversations', { /* ... */ });
  fastify.post('/insights/conversations', { /* ... */ });
  fastify.get('/insights/conversations/:id', { /* ... */ });
  fastify.patch('/insights/conversations/:id', { /* ... */ });
  fastify.delete('/insights/conversations/:id', { /* ... */ });
  
  // Messages
  fastify.post('/insights/conversations/:id/messages/:messageId/regenerate', { /* ... */ });
  fastify.post('/insights/conversations/:id/messages/:messageId/stop', { /* ... */ });
  
  // Feedback
  fastify.post('/insights/messages/:messageId/feedback', { /* ... */ });
  
  // Templates
  fastify.get('/insights/templates', { /* ... */ });
  fastify.post('/insights/templates', { /* ... */ });
  fastify.get('/insights/templates/:id', { /* ... */ });
  fastify.put('/insights/templates/:id', { /* ... */ });
  fastify.delete('/insights/templates/:id', { /* ... */ });
  
  // Configuration
  fastify.get('/ai-config', { /* ... */ });
  fastify.get('/ai-config/system', { /* ... */ });
  fastify.put('/ai-config/system', { /* ... */ });
  fastify.get('/ai-config/tenant/:tenantId', { /* ... */ });
  fastify.put('/ai-config/tenant/:tenantId', { /* ... */ });
  
  // ✅ Model Management (NEW)
  /**
   * List available models for insights
   * GET /insights/models/available
   */
  fastify.get('/insights/models/available', {
    onRequest: [authDecorator],
    schema: {
      description: 'List available AI models for insights generation',
      tags: ['insights', 'models'],
    },
    handler: async (request, reply) => {
      const { tenantId } = request.user!;
      
      // Get tenant connections
      const tenantConnections = await aiConnectionService.listConnections({
        tenantId,
        modelType: 'LLM',
        status: 'active',
      });

      // Get system connections
      const systemConnections = await aiConnectionService.listConnections({
        tenantId: 'system',
        modelType: 'LLM',
        status: 'active',
      });

      // Get model details
      const models = await Promise.all(
        [...tenantConnections.connections, ...systemConnections.connections].map(
          async (conn) => {
            const model = await aiConnectionService['getModelById'](conn.modelId);
            return {
              connectionId: conn.id,
              modelId: conn.modelId,
              name: conn.name,
              model: model,
              isDefault: conn.isDefaultModel,
              isTenantOwned: conn.tenantId === tenantId,
              capabilities: model
                ? {
                    streaming: model.streaming,
                    vision: model.vision,
                    functions: model.functions,
                    jsonMode: model.jsonMode,
                  }
                : null,
              limits: {
                contextWindow: conn.contextWindow || model?.contextWindow,
                maxOutputs: model?.maxOutputs,
              },
              pricing: model?.pricing,
            };
          }
        )
      );

      return { models };
    },
  });

  /**
   * Get recommended model for specific insight type
   * POST /insights/models/recommend
   */
  fastify.post<{ Body: ModelSelectionRequirements }>(
    '/insights/models/recommend',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Get recommended model for insight requirements',
        tags: ['insights', 'models'],
        body: {
          type: 'object',
          required: ['insightType', 'contextTokens'],
          properties: {
            insightType: { type: 'string' },
            contextTokens: { type: 'number' },
            requiresVision: { type: 'boolean' },
            requiresFunctions: { type: 'boolean' },
            requiresStreaming: { type: 'boolean' },
            maxCost: { type: 'number' },
          },
        },
      },
      handler: async (request, reply) => {
        const { tenantId } = request.user!;
        const requirements = request.body;

        const result = await modelSelectionService.selectOptimalModel(
          tenantId,
          requirements
        );

        return {
          recommended: {
            connectionId: result.connection.connection.id,
            modelId: result.connection.connection.modelId,
            name: result.connection.connection.name,
            reason: result.reason,
            estimatedCost: result.estimatedCost,
          },
          alternatives: result.alternatives,
        };
      },
    }
  );

  /**
   * Get AI usage and costs
   * GET /insights/usage
   */
  fastify.get<{ Querystring: { from?: string; to?: string } }>(
    '/insights/usage',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Get AI usage statistics and costs',
        tags: ['insights', 'analytics'],
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
          },
        },
      },
      handler: async (request, reply) => {
        const { tenantId } = request.user!;
        const { from, to } = request.query;

        const usage = await costTracking.getTenantUsage(tenantId, {
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined,
        });

        return {
          totalCost: usage.totalCost,
          totalTokens: usage.totalTokens,
          insightCount: usage.insightCount,
          byModel: usage.byModel,
          byInsightType: usage.byInsightType,
          dailyBreakdown: usage.dailyBreakdown,
          budget: usage.budget,
        };
      },
    }
  );

  /**
   * Check budget before generating insight
   * POST /insights/budget/check
   */
  fastify.post<{ Body: { estimatedCost: number } }>(
    '/insights/budget/check',
    {
      onRequest: [authDecorator],
      schema: {
        description: 'Check if tenant has budget remaining for estimated cost',
        tags: ['insights', 'budget'],
        body: {
          type: 'object',
          required: ['estimatedCost'],
          properties: {
            estimatedCost: { type: 'number' },
          },
        },
      },
      handler: async (request, reply) => {
        const { tenantId } = request.user!;
        const { estimatedCost } = request.body;

        const hasCapacity = await costTracking.checkBudget(tenantId, estimatedCost);

        return {
          hasCapacity,
          estimatedCost,
        };
      },
    }
  );
}
```

---

## Phase 5C: Frontend

**Duration**: ~2 weeks  
**Goal**: Build the UI components

### Step 9: React Components

#### 9.1 Chat Interface

Create `apps/web/src/components/ai-insights/ChatInterface.tsx`

#### 9.2 Streaming Text

Create `apps/web/src/components/ai-insights/StreamingText.tsx`

#### 9.3 Citation Link

Create `apps/web/src/components/ai-insights/CitationLink.tsx`

#### 9.4 Quick Insight Panel

Create `apps/web/src/components/ai-insights/QuickInsightPanel.tsx`

#### 9.5 Insight Widget

Create `apps/web/src/components/ai-insights/InsightWidget.tsx`

#### 9.6 Feedback Buttons

Create `apps/web/src/components/ai-insights/FeedbackButtons.tsx`

### Step 10: React Query Hooks

Create `apps/web/src/hooks/use-insights.ts`:

```typescript
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';

export function useChat(conversationId?: string);
export function useSendMessage();
export function useRegenerateMessage();
export function useConversations(options);
export function useConversation(id: string);
export function useQuickInsight();
export function useSuggestions(shardId: string);
export function useInsightStream();
```

### Step 11: Pages

- `/chat` - Full chat interface
- `/chat/:conversationId` - Specific conversation
- `/settings/ai` - AI configuration (admin)
- Dashboard widgets integration

---

## Phase 5D: Advanced Features

**Duration**: ~2-3 weeks  
**Goal**: Proactive insights, caching, monitoring, prompt management

### Step 12: Proactive Agent Service

Create `apps/api/src/services/proactive-agent.service.ts`

### Step 13: Semantic Cache Service

Create `apps/api/src/services/semantic-cache.service.ts`

### Step 14: Quality Monitoring

Create `apps/api/src/services/insight-quality.service.ts`

### Step 15: Prompt Management System

**Goal**: Enable super admins to manage, version, test, and optimize AI prompts via UI.

#### 15.1 Database Schema

Create Cosmos DB container `promptTemplates` with the following partition key strategy:

```typescript
// Container: promptTemplates
// Partition Key: /sk (shardKey)
// Hierarchical Partition Keys: [/tenantId, /insightType, /id]
```

**Schema Structure**:

```typescript
interface PromptTemplate {
  // Standard Shard Fields
  id: string; // Unique prompt template ID (UUID)
  pk: string; // Partition key: tenantId for tenant-specific, "SYSTEM" for system-wide
  sk: string; // Sort key: `PROMPT#${insightType}#${version}`
  tenantId: string; // "SYSTEM" for system-wide prompts, tenantId for tenant overrides
  
  // Prompt Metadata
  name: string; // Human-readable name: "Dashboard Summary Prompt"
  description: string; // Purpose and usage notes
  insightType: InsightType; // Which insight type this prompt is for
  category: 'system' | 'tenant'; // System-wide or tenant override
  
  // NEW: Tenant customization support
  inheritFrom?: string; // ID of system prompt to extend (for tenant prompts)
  overrides?: {
    template?: string; // Override system template
    variables?: PromptVariable[]; // Add/override variables
  };
  
  // Template Content
  template: string; // Handlebars template with variables
  variables: PromptVariable[]; // Required and optional variables
  
  // Model Configuration
  modelRequirements?: {
    preferredModels?: string[]; // ["gpt-4o", "claude-3-5-sonnet"]
    minContextWindow?: number; // Minimum context window required
    requiredCapabilities?: ModelCapability[]; // ["vision", "json_mode"]
  };
  
  // Versioning & Lifecycle
  version: number; // Integer version: 1, 2, 3...
  isActive: boolean; // Currently active version
  status: 'draft' | 'testing' | 'active' | 'deprecated';
  
  // Version History
  previousVersionId?: string; // ID of previous version
  changeLog?: string; // What changed in this version
  
  // Testing & Metrics
  testResults?: PromptTestResult[];
  performanceMetrics?: {
    avgResponseTime?: number;
    avgTokenUsage?: number;
    avgCost?: number;
    successRate?: number; // % of successful generations
    userSatisfactionScore?: number; // Based on feedback
  };
  
  // A/B Testing
  abTest?: PromptABTest;
  
  // Audit Fields
  createdAt: Date;
  createdBy: string; // User ID
  updatedAt: Date;
  updatedBy: string;
  activatedAt?: Date;
  activatedBy?: string;
  deprecatedAt?: Date;
  deprecatedBy?: string;
}

interface PromptVariable {
  name: string; // Variable name in template: {{dashboardName}}
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string; // Usage instructions
  defaultValue?: any;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string; // Regex pattern
    enum?: any[]; // Allowed values
  };
}

interface PromptTestResult {
  testId: string;
  testDate: Date;
  testedBy: string;
  testInputs: Record<string, any>; // Variable values used
  generatedPrompt: string; // Final rendered prompt
  modelUsed: string;
  response: string; // AI response
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  responseTime: number; // milliseconds
  success: boolean;
  errors?: string[];
  notes?: string; // Tester's observations
  rating?: 1 | 2 | 3 | 4 | 5; // Quality rating
}

interface PromptABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  
  // Variants
  controlVersionId: string; // Current active version
  variantVersionId: string; // New version being tested
  
  // Traffic Split
  trafficSplit: {
    control: number; // Percentage: 50
    variant: number; // Percentage: 50
  };
  
  // Success Metrics
  successMetrics: {
    primaryMetric: 'responseTime' | 'tokenUsage' | 'cost' | 'successRate' | 'userSatisfaction';
    targetImprovement: number; // Percentage improvement needed
  };
  
  // Results
  results?: {
    control: PromptTestResult[];
    variant: PromptTestResult[];
    winner?: 'control' | 'variant' | 'inconclusive';
    winnerReason?: string;
  };
  
  // Decision
  decision?: {
    decidedAt: Date;
    decidedBy: string;
    action: 'promote_variant' | 'keep_control' | 'continue_testing';
    notes?: string;
  };
}
```

#### 15.2 Create TypeScript Types

Add to `apps/api/src/types/ai-insights.types.ts`:

```typescript
export interface PromptTemplate {
  id: string;
  pk: string;
  sk: string;
  tenantId: string;
  name: string;
  description: string;
  insightType: InsightType;
  category: 'system' | 'tenant';
  template: string;
  variables: PromptVariable[];
  modelRequirements?: {
    preferredModels?: string[];
    minContextWindow?: number;
    requiredCapabilities?: ModelCapability[];
  };
  version: number;
  isActive: boolean;
  status: 'draft' | 'testing' | 'active' | 'deprecated';
  previousVersionId?: string;
  changeLog?: string;
  testResults?: PromptTestResult[];
  performanceMetrics?: {
    avgResponseTime?: number;
    avgTokenUsage?: number;
    avgCost?: number;
    successRate?: number;
    userSatisfactionScore?: number;
  };
  abTest?: PromptABTest;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  activatedAt?: Date;
  activatedBy?: string;
  deprecatedAt?: Date;
  deprecatedBy?: string;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface PromptTestResult {
  testId: string;
  testDate: Date;
  testedBy: string;
  testInputs: Record<string, any>;
  generatedPrompt: string;
  modelUsed: string;
  response: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  responseTime: number;
  success: boolean;
  errors?: string[];
  notes?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

export interface PromptABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  controlVersionId: string;
  variantVersionId: string;
  trafficSplit: {
    control: number;
    variant: number;
  };
  successMetrics: {
    primaryMetric: 'responseTime' | 'tokenUsage' | 'cost' | 'successRate' | 'userSatisfaction';
    targetImprovement: number;
  };
  results?: {
    control: PromptTestResult[];
    variant: PromptTestResult[];
    winner?: 'control' | 'variant' | 'inconclusive';
    winnerReason?: string;
  };
  decision?: {
    decidedAt: Date;
    decidedBy: string;
    action: 'promote_variant' | 'keep_control' | 'continue_testing';
    notes?: string;
  };
}

// ============================================
// Tenant AI Configuration Types (NEW)
// ============================================

export interface TenantAIConfiguration {
  id: string; // Tenant ID
  pk: string; // Partition key: tenantId
  sk: string; // Sort key: "CONFIG#AI"
  tenantId: string;
  
  // Model Preferences
  defaultModel?: {
    modelId: string; // Preferred model from catalog
    fallbackModelId?: string; // Fallback if preferred unavailable
  };
  
  // Budget Controls
  budget: {
    monthlyLimitUSD: number; // Max spend per month
    dailyLimitUSD?: number; // Optional daily limit
    alertThresholds: Array<{
      percentage: number; // Alert at 50%, 80%, 90%
      action: 'email' | 'notification' | 'pause';
      recipients: string[]; // Email addresses or user IDs
    }>;
    costPerInsight: {
      max: number; // Max cost per insight
      target: number; // Target cost
    };
    currentMonth: {
      spent: number; // Current month spending
      insightCount: number; // Number of insights generated
      periodStart: Date;
      periodEnd: Date;
    };
  };
  
  // Quality Controls
  quality: {
    minConfidenceScore: number; // Min confidence to show insight (0-1)
    requireCitations: boolean; // Always show citations
    enableGrounding: boolean; // Enable grounding checks
    maxRetries: number; // Max retries on failure
  };
  
  // Feature Flags (Tenant-level)
  features: {
    enableProactiveInsights: boolean;
    enableMultiModal: boolean; // Vision, audio
    enableToolCalling: boolean;
    enableSemanticCache: boolean;
    enableConversationMemory: boolean;
  };
  
  // Privacy & Compliance
  privacy: {
    dataRetentionDays: number; // How long to keep conversations
    enableAuditLog: boolean;
    allowCrossShardContext: boolean; // Can access other tenants' data
    piiHandling: 'redact' | 'encrypt' | 'allow';
    enableExport: boolean; // Allow data export
  };
  
  // Prompt Customization
  prompts: {
    allowCustomPrompts: boolean; // Can tenant create prompts?
    maxActivePrompts: number; // Limit on active prompts
    requireApproval: boolean; // Need super admin approval?
  };
  
  // Branding
  branding?: {
    assistantName?: string; // Custom assistant name
    assistantAvatar?: string; // Avatar URL
    welcomeMessage?: string;
    primaryColor?: string;
  };
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface BudgetAlert {
  id: string;
  tenantId: string;
  alertType: 'threshold_reached' | 'limit_exceeded' | 'anomaly_detected';
  threshold: number; // Percentage (50, 80, 90)
  currentSpend: number;
  monthlyLimit: number;
  message: string;
  sentAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface TenantUsageSnapshot {
  tenantId: string;
  date: Date;
  totalSpend: number;
  insightCount: number;
  byModel: Array<{
    modelId: string;
    modelName: string;
    insightCount: number;
    spend: number;
    avgCostPerInsight: number;
  }>;
  byInsightType: Array<{
    insightType: InsightType;
    count: number;
    spend: number;
  }>;
}
```

#### 15.3 Create Prompt Management Service

Create `apps/api/src/services/prompt-management.service.ts`:

```typescript
import { Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import Handlebars from 'handlebars';
import { PromptTemplate, PromptTestResult, PromptABTest } from '../types/ai-insights.types';
import { AIConnectionService } from './ai/ai-connection.service';
import { AICostTrackingService } from './ai/ai-cost-tracking.service';

export class PromptManagementService {
  private container: Container;
  private aiConnectionService: AIConnectionService;
  private costTrackingService: AICostTrackingService;
  
  constructor(
    container: Container,
    aiConnectionService: AIConnectionService,
    costTrackingService: AICostTrackingService
  ) {
    this.container = container;
    this.aiConnectionService = aiConnectionService;
    this.costTrackingService = costTrackingService;
  }
  
  /**
   * Get active prompt template for insight type
   */
  async getActivePrompt(
    tenantId: string,
    insightType: InsightType
  ): Promise<PromptTemplate | null> {
    // Try tenant-specific prompt first
    const tenantPrompt = await this.findActivePrompt(tenantId, insightType);
    if (tenantPrompt) return tenantPrompt;
    
    // Fallback to system prompt
    return this.findActivePrompt('SYSTEM', insightType);
  }
  
  private async findActivePrompt(
    tenantId: string,
    insightType: InsightType
  ): Promise<PromptTemplate | null> {
    const query = `
      SELECT * FROM c
      WHERE c.tenantId = @tenantId
        AND c.insightType = @insightType
        AND c.isActive = true
        AND c.status = 'active'
      ORDER BY c.version DESC
    `;
    
    const { resources } = await this.container.items
      .query({
        query,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@insightType', value: insightType }
        ]
      })
      .fetchAll();
    
    return resources[0] || null;
  }
  
  /**
   * List all prompts (with filtering)
   */
  async listPrompts(options?: {
    tenantId?: string;
    insightType?: InsightType;
    status?: 'draft' | 'testing' | 'active' | 'deprecated';
    category?: 'system' | 'tenant';
  }): Promise<PromptTemplate[]> {
    let query = 'SELECT * FROM c WHERE 1=1';
    const parameters: any[] = [];
    
    if (options?.tenantId) {
      query += ' AND c.tenantId = @tenantId';
      parameters.push({ name: '@tenantId', value: options.tenantId });
    }
    if (options?.insightType) {
      query += ' AND c.insightType = @insightType';
      parameters.push({ name: '@insightType', value: options.insightType });
    }
    if (options?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: options.status });
    }
    if (options?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: options.category });
    }
    
    query += ' ORDER BY c.insightType, c.version DESC';
    
    const { resources } = await this.container.items
      .query({ query, parameters })
      .fetchAll();
    
    return resources;
  }
  
  /**
   * Get specific prompt by ID
   */
  async getPrompt(id: string, tenantId: string): Promise<PromptTemplate | null> {
    try {
      const { resource } = await this.container.item(id, tenantId).read();
      return resource || null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Create new prompt template
   */
  async createPrompt(
    data: Omit<PromptTemplate, 'id' | 'pk' | 'sk' | 'version' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<PromptTemplate> {
    const id = uuidv4();
    const now = new Date();
    
    const prompt: PromptTemplate = {
      ...data,
      id,
      pk: data.tenantId,
      sk: `PROMPT#${data.insightType}#1`,
      version: 1,
      isActive: false,
      status: data.status || 'draft',
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId
    };
    
    // Validate template syntax
    this.validateTemplate(prompt.template, prompt.variables);
    
    await this.container.items.create(prompt);
    return prompt;
  }
  
  /**
   * Update existing prompt (creates new version)
   */
  async updatePrompt(
    id: string,
    tenantId: string,
    updates: Partial<PromptTemplate>,
    userId: string,
    changeLog?: string
  ): Promise<PromptTemplate> {
    const existing = await this.getPrompt(id, tenantId);
    if (!existing) throw new Error('Prompt not found');
    
    // Create new version
    const newVersion = existing.version + 1;
    const newId = uuidv4();
    const now = new Date();
    
    const newPrompt: PromptTemplate = {
      ...existing,
      ...updates,
      id: newId,
      sk: `PROMPT#${existing.insightType}#${newVersion}`,
      version: newVersion,
      isActive: false,
      status: 'draft',
      previousVersionId: existing.id,
      changeLog: changeLog || `Updated from v${existing.version}`,
      updatedAt: now,
      updatedBy: userId,
      testResults: [], // Reset test results for new version
      performanceMetrics: undefined // Reset metrics
    };
    
    // Validate template syntax
    if (newPrompt.template) {
      this.validateTemplate(newPrompt.template, newPrompt.variables);
    }
    
    await this.container.items.create(newPrompt);
    return newPrompt;
  }
  
  /**
   * Activate a prompt version
   */
  async activatePrompt(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<PromptTemplate> {
    const prompt = await this.getPrompt(id, tenantId);
    if (!prompt) throw new Error('Prompt not found');
    
    // Deactivate all other versions of this prompt
    await this.deactivateAllVersions(tenantId, prompt.insightType);
    
    // Activate this version
    const now = new Date();
    const updated = {
      ...prompt,
      isActive: true,
      status: 'active' as const,
      activatedAt: now,
      activatedBy: userId,
      updatedAt: now,
      updatedBy: userId
    };
    
    await this.container.item(id, tenantId).replace(updated);
    return updated;
  }
  
  /**
   * Deactivate a prompt
   */
  async deactivatePrompt(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<PromptTemplate> {
    const prompt = await this.getPrompt(id, tenantId);
    if (!prompt) throw new Error('Prompt not found');
    
    const now = new Date();
    const updated = {
      ...prompt,
      isActive: false,
      status: 'deprecated' as const,
      deprecatedAt: now,
      deprecatedBy: userId,
      updatedAt: now,
      updatedBy: userId
    };
    
    await this.container.item(id, tenantId).replace(updated);
    return updated;
  }
  
  /**
   * Test a prompt with sample inputs
   */
  async testPrompt(
    id: string,
    tenantId: string,
    testInputs: Record<string, any>,
    userId: string,
    notes?: string,
    rating?: 1 | 2 | 3 | 4 | 5
  ): Promise<PromptTestResult> {
    const prompt = await this.getPrompt(id, tenantId);
    if (!prompt) throw new Error('Prompt not found');
    
    // Render template with inputs
    const renderedPrompt = this.renderTemplate(prompt.template, testInputs);
    
    // Get AI connection
    const connection = await this.aiConnectionService.getConnectionForTenant(
      tenantId,
      prompt.modelRequirements?.preferredModels
    );
    
    // Generate response
    const startTime = Date.now();
    let response: string;
    let tokenUsage: { prompt: number; completion: number; total: number };
    let success = true;
    let errors: string[] = [];
    
    try {
      const result = await this.aiConnectionService.generateCompletion(
        connection,
        renderedPrompt,
        { maxTokens: 2000 }
      );
      response = result.content;
      tokenUsage = result.usage;
    } catch (error) {
      success = false;
      errors.push(error.message);
      response = '';
      tokenUsage = { prompt: 0, completion: 0, total: 0 };
    }
    
    const responseTime = Date.now() - startTime;
    
    // Calculate cost
    const cost = await this.costTrackingService.calculateCost(
      connection.modelId,
      tokenUsage.prompt,
      tokenUsage.completion
    );
    
    // Create test result
    const testResult: PromptTestResult = {
      testId: uuidv4(),
      testDate: new Date(),
      testedBy: userId,
      testInputs,
      generatedPrompt: renderedPrompt,
      modelUsed: connection.modelName,
      response,
      tokenUsage,
      cost,
      responseTime,
      success,
      errors: errors.length > 0 ? errors : undefined,
      notes,
      rating
    };
    
    // Save test result to prompt
    const updated = {
      ...prompt,
      testResults: [...(prompt.testResults || []), testResult],
      updatedAt: new Date(),
      updatedBy: userId
    };
    
    await this.container.item(id, tenantId).replace(updated);
    
    return testResult;
  }
  
  /**
   * Rollback to previous version
   */
  async rollbackToPreviousVersion(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<PromptTemplate> {
    const current = await this.getPrompt(id, tenantId);
    if (!current) throw new Error('Prompt not found');
    if (!current.previousVersionId) throw new Error('No previous version');
    
    const previous = await this.getPrompt(current.previousVersionId, tenantId);
    if (!previous) throw new Error('Previous version not found');
    
    // Activate previous version
    return this.activatePrompt(previous.id, tenantId, userId);
  }
  
  /**
   * Create A/B test
   */
  async createABTest(
    controlVersionId: string,
    variantVersionId: string,
    tenantId: string,
    testConfig: {
      name: string;
      description: string;
      trafficSplit: { control: number; variant: number };
      primaryMetric: 'responseTime' | 'tokenUsage' | 'cost' | 'successRate' | 'userSatisfaction';
      targetImprovement: number;
    },
    userId: string
  ): Promise<PromptABTest> {
    const control = await this.getPrompt(controlVersionId, tenantId);
    const variant = await this.getPrompt(variantVersionId, tenantId);
    
    if (!control || !variant) throw new Error('Prompt versions not found');
    if (control.insightType !== variant.insightType) {
      throw new Error('Prompts must be for same insight type');
    }
    
    const abTest: PromptABTest = {
      id: uuidv4(),
      name: testConfig.name,
      description: testConfig.description,
      status: 'draft',
      controlVersionId,
      variantVersionId,
      trafficSplit: testConfig.trafficSplit,
      successMetrics: {
        primaryMetric: testConfig.primaryMetric,
        targetImprovement: testConfig.targetImprovement
      }
    };
    
    // Update both versions with A/B test info
    await this.updatePromptABTest(control, abTest, userId);
    await this.updatePromptABTest(variant, abTest, userId);
    
    return abTest;
  }
  
  /**
   * Start A/B test
   */
  async startABTest(
    testId: string,
    controlVersionId: string,
    tenantId: string,
    userId: string
  ): Promise<PromptABTest> {
    const control = await this.getPrompt(controlVersionId, tenantId);
    if (!control?.abTest || control.abTest.id !== testId) {
      throw new Error('A/B test not found');
    }
    
    const updatedTest = {
      ...control.abTest,
      status: 'running' as const,
      startDate: new Date()
    };
    
    await this.updatePromptABTest(control, updatedTest, userId);
    
    // Also update variant
    const variant = await this.getPrompt(control.abTest.variantVersionId, tenantId);
    if (variant) {
      await this.updatePromptABTest(variant, updatedTest, userId);
    }
    
    return updatedTest;
  }
  
  // Helper Methods
  
  private validateTemplate(template: string, variables: PromptVariable[]): void {
    try {
      Handlebars.compile(template);
    } catch (error) {
      throw new Error(`Invalid template syntax: ${error.message}`);
    }
    
    // Extract required variables from template
    const matches = template.match(/{{\s*(\w+)\s*}}/g) || [];
    const usedVars = matches.map(m => m.replace(/[{}]/g, '').trim());
    
    // Check all required variables are used
    const requiredVars = variables.filter(v => v.required).map(v => v.name);
    const missingVars = requiredVars.filter(v => !usedVars.includes(v));
    
    if (missingVars.length > 0) {
      throw new Error(`Template missing required variables: ${missingVars.join(', ')}`);
    }
  }
  
  private renderTemplate(template: string, inputs: Record<string, any>): string {
    const compiled = Handlebars.compile(template);
    return compiled(inputs);
  }
  
  private async deactivateAllVersions(tenantId: string, insightType: InsightType): Promise<void> {
    const prompts = await this.listPrompts({ tenantId, insightType, status: 'active' });
    
    for (const prompt of prompts) {
      await this.container.item(prompt.id, tenantId).replace({
        ...prompt,
        isActive: false,
        updatedAt: new Date()
      });
    }
  }
  
  private async updatePromptABTest(
    prompt: PromptTemplate,
    abTest: PromptABTest,
    userId: string
  ): Promise<void> {
    const updated = {
      ...prompt,
      abTest,
      updatedAt: new Date(),
      updatedBy: userId
    };
    await this.container.item(prompt.id, prompt.tenantId).replace(updated);
  }
}
```

#### 15.4 Integrate with InsightService

Update `apps/api/src/services/insight.service.ts` to use prompt templates:

```typescript
export class InsightService {
  private promptManagementService: PromptManagementService;
  
  async generateInsight(request: InsightRequest): Promise<InsightResponse> {
    // Get active prompt template for this insight type
    const promptTemplate = await this.promptManagementService.getActivePrompt(
      request.tenantId,
      request.type
    );
    
    if (!promptTemplate) {
      throw new Error(`No active prompt template for insight type: ${request.type}`);
    }
    
    // Check if in A/B test
    const shouldUseVariant = promptTemplate.abTest?.status === 'running' &&
      Math.random() * 100 < promptTemplate.abTest.trafficSplit.variant;
    
    const activePrompt = shouldUseVariant && promptTemplate.abTest?.variantVersionId
      ? await this.promptManagementService.getPrompt(
          promptTemplate.abTest.variantVersionId,
          request.tenantId
        )
      : promptTemplate;
    
    // Assemble context as usual
    const context = await this.contextAssembler.assembleContext(request);
    
    // Render prompt with context variables
    const promptInputs = {
      userQuery: request.query,
      context: JSON.stringify(context, null, 2),
      dashboardName: context.dashboard?.name,
      // ... other variables from context
    };
    
    const renderedPrompt = this.renderPromptTemplate(
      activePrompt.template,
      promptInputs
    );
    
    // Continue with AI generation...
    const response = await this.generateWithAI(renderedPrompt, activePrompt);
    
    // Track test result if in A/B test
    if (shouldUseVariant && promptTemplate.abTest) {
      await this.trackABTestResult(activePrompt, response);
    }
    
    return response;
  }
  
  private renderPromptTemplate(
    template: string,
    inputs: Record<string, any>
  ): string {
    const Handlebars = require('handlebars');
    const compiled = Handlebars.compile(template);
    return compiled(inputs);
  }
}
```

#### 15.5 API Routes

Add to `apps/api/src/routes/insights.routes.ts`:

```typescript
// Prompt Management Routes (Super Admin Only)

/**
 * List all prompt templates
 * GET /api/insights/prompts
 */
router.get('/prompts', requireSuperAdmin, async (req, res) => {
  const { tenantId, insightType, status, category } = req.query;
  
  const prompts = await promptManagementService.listPrompts({
    tenantId: tenantId as string,
    insightType: insightType as InsightType,
    status: status as any,
    category: category as any
  });
  
  res.json(prompts);
});

/**
 * Get specific prompt
 * GET /api/insights/prompts/:id
 */
router.get('/prompts/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.query;
  
  const prompt = await promptManagementService.getPrompt(id, tenantId as string);
  
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  
  res.json(prompt);
});

/**
 * Create new prompt
 * POST /api/insights/prompts
 */
router.post('/prompts', requireSuperAdmin, async (req, res) => {
  const userId = req.user.id;
  const promptData = req.body;
  
  try {
    const prompt = await promptManagementService.createPrompt(promptData, userId);
    res.status(201).json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update prompt (creates new version)
 * PUT /api/insights/prompts/:id
 */
router.put('/prompts/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { tenantId, changeLog, ...updates } = req.body;
  const userId = req.user.id;
  
  try {
    const prompt = await promptManagementService.updatePrompt(
      id,
      tenantId,
      updates,
      userId,
      changeLog
    );
    res.json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Activate prompt version
 * POST /api/insights/prompts/:id/activate
 */
router.post('/prompts/:id/activate', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.body;
  const userId = req.user.id;
  
  try {
    const prompt = await promptManagementService.activatePrompt(id, tenantId, userId);
    res.json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Deactivate prompt
 * POST /api/insights/prompts/:id/deactivate
 */
router.post('/prompts/:id/deactivate', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.body;
  const userId = req.user.id;
  
  try {
    const prompt = await promptManagementService.deactivatePrompt(id, tenantId, userId);
    res.json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Test prompt with sample inputs
 * POST /api/insights/prompts/:id/test
 */
router.post('/prompts/:id/test', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { tenantId, testInputs, notes, rating } = req.body;
  const userId = req.user.id;
  
  try {
    const result = await promptManagementService.testPrompt(
      id,
      tenantId,
      testInputs,
      userId,
      notes,
      rating
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Rollback to previous version
 * POST /api/insights/prompts/:id/rollback
 */
router.post('/prompts/:id/rollback', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.body;
  const userId = req.user.id;
  
  try {
    const prompt = await promptManagementService.rollbackToPreviousVersion(
      id,
      tenantId,
      userId
    );
    res.json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create A/B test
 * POST /api/insights/prompts/ab-tests
 */
router.post('/prompts/ab-tests', requireSuperAdmin, async (req, res) => {
  const {
    controlVersionId,
    variantVersionId,
    tenantId,
    name,
    description,
    trafficSplit,
    primaryMetric,
    targetImprovement
  } = req.body;
  const userId = req.user.id;
  
  try {
    const abTest = await promptManagementService.createABTest(
      controlVersionId,
      variantVersionId,
      tenantId,
      { name, description, trafficSplit, primaryMetric, targetImprovement },
      userId
    );
    res.status(201).json(abTest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Start A/B test
 * POST /api/insights/prompts/ab-tests/:id/start
 */
router.post('/prompts/ab-tests/:id/start', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { controlVersionId, tenantId } = req.body;
  const userId = req.user.id;
  
  try {
    const abTest = await promptManagementService.startABTest(
      id,
      controlVersionId,
      tenantId,
      userId
    );
    res.json(abTest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Middleware for super admin authorization
function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}
```

#### 15.6 Frontend UI Components

Create `apps/web/src/components/admin/prompt-management/PromptManagementPage.tsx`:

```typescript
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Modal, Select, Tag, Space, Tabs } from 'antd';
import { PromptEditor } from './PromptEditor';
import { PromptTester } from './PromptTester';
import type { PromptTemplate, InsightType } from '@/types/ai-insights';

export const PromptManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [filterInsightType, setFilterInsightType] = useState<InsightType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Fetch prompts
  const { data: prompts, isLoading } = useQuery({
    queryKey: ['prompts', filterInsightType, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterInsightType !== 'all') params.append('insightType', filterInsightType);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      
      const res = await fetch(`/api/insights/prompts?${params}`);
      return res.json();
    }
  });
  
  // Activate prompt mutation
  const activateMutation = useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      const res = await fetch(`/api/insights/prompts/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    }
  });
  
  // Deactivate prompt mutation
  const deactivateMutation = useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      const res = await fetch(`/api/insights/prompts/${id}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    }
  });
  
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Insight Type',
      dataIndex: 'insightType',
      key: 'insightType',
      render: (type: InsightType) => <Tag>{type}</Tag>
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: PromptTemplate) => (
        <Space>
          <Tag color={getStatusColor(status)}>{status}</Tag>
          {record.isActive && <Tag color="green">ACTIVE</Tag>}
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag color={cat === 'system' ? 'blue' : 'purple'}>{cat}</Tag>
    },
    {
      title: 'Performance',
      key: 'performance',
      render: (record: PromptTemplate) => {
        if (!record.performanceMetrics) return '-';
        return (
          <div>
            <div>Success: {(record.performanceMetrics.successRate || 0).toFixed(1)}%</div>
            <div>Avg Cost: ${(record.performanceMetrics.avgCost || 0).toFixed(4)}</div>
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: PromptTemplate) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>Edit</Button>
          <Button size="small" onClick={() => handleTest(record)}>Test</Button>
          {!record.isActive ? (
            <Button
              size="small"
              type="primary"
              onClick={() => activateMutation.mutate({ id: record.id, tenantId: record.tenantId })}
            >
              Activate
            </Button>
          ) : (
            <Button
              size="small"
              danger
              onClick={() => deactivateMutation.mutate({ id: record.id, tenantId: record.tenantId })}
            >
              Deactivate
            </Button>
          )}
        </Space>
      )
    }
  ];
  
  const handleEdit = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setIsEditorOpen(true);
  };
  
  const handleTest = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setIsTesterOpen(true);
  };
  
  return (
    <div className="prompt-management-page">
      <h1>Prompt Management</h1>
      
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={filterInsightType}
          onChange={setFilterInsightType}
          style={{ width: 200 }}
        >
          <Select.Option value="all">All Insight Types</Select.Option>
          <Select.Option value="summary">Summary</Select.Option>
          <Select.Option value="analysis">Analysis</Select.Option>
          <Select.Option value="comparison">Comparison</Select.Option>
          <Select.Option value="recommendation">Recommendation</Select.Option>
        </Select>
        
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          style={{ width: 200 }}
        >
          <Select.Option value="all">All Statuses</Select.Option>
          <Select.Option value="draft">Draft</Select.Option>
          <Select.Option value="testing">Testing</Select.Option>
          <Select.Option value="active">Active</Select.Option>
          <Select.Option value="deprecated">Deprecated</Select.Option>
        </Select>
        
        <Button type="primary" onClick={() => handleEdit(null)}>
          Create New Prompt
        </Button>
      </Space>
      
      <Table
        columns={columns}
        dataSource={prompts}
        loading={isLoading}
        rowKey="id"
      />
      
      {/* Editor Modal */}
      <Modal
        title={selectedPrompt ? `Edit Prompt: ${selectedPrompt.name}` : 'Create New Prompt'}
        open={isEditorOpen}
        onCancel={() => setIsEditorOpen(false)}
        width={1200}
        footer={null}
      >
        <PromptEditor
          prompt={selectedPrompt}
          onClose={() => {
            setIsEditorOpen(false);
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
          }}
        />
      </Modal>
      
      {/* Tester Modal */}
      <Modal
        title={`Test Prompt: ${selectedPrompt?.name}`}
        open={isTesterOpen}
        onCancel={() => setIsTesterOpen(false)}
        width={1000}
        footer={null}
      >
        <PromptTester
          prompt={selectedPrompt}
          onClose={() => setIsTesterOpen(false)}
        />
      </Modal>
    </div>
  );
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'green';
    case 'testing': return 'blue';
    case 'draft': return 'default';
    case 'deprecated': return 'red';
    default: return 'default';
  }
}
```

Create `apps/web/src/components/admin/prompt-management/PromptEditor.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Space, Divider, Card } from 'antd';
import MonacoEditor from '@monaco-editor/react';
import type { PromptTemplate, PromptVariable, InsightType } from '@/types/ai-insights';

interface PromptEditorProps {
  prompt: PromptTemplate | null;
  onClose: () => void;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ prompt, onClose }) => {
  const [form] = Form.useForm();
  const [template, setTemplate] = useState(prompt?.template || '');
  const [variables, setVariables] = useState<PromptVariable[]>(prompt?.variables || []);
  
  useEffect(() => {
    if (prompt) {
      form.setFieldsValue({
        name: prompt.name,
        description: prompt.description,
        insightType: prompt.insightType,
        category: prompt.category,
        status: prompt.status
      });
      setTemplate(prompt.template);
      setVariables(prompt.variables);
    }
  }, [prompt]);
  
  const handleSave = async () => {
    const values = await form.validateFields();
    
    const data = {
      ...values,
      template,
      variables,
      tenantId: values.category === 'system' ? 'SYSTEM' : values.tenantId
    };
    
    const url = prompt
      ? `/api/insights/prompts/${prompt.id}`
      : '/api/insights/prompts';
    
    const method = prompt ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    onClose();
  };
  
  return (
    <Form form={form} layout="vertical">
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input placeholder="Dashboard Summary Prompt" />
      </Form.Item>
      
      <Form.Item label="Description" name="description">
        <Input.TextArea rows={2} placeholder="Generates summaries for dashboard insights" />
      </Form.Item>
      
      <Space>
        <Form.Item label="Insight Type" name="insightType" rules={[{ required: true }]}>
          <Select style={{ width: 200 }}>
            <Select.Option value="summary">Summary</Select.Option>
            <Select.Option value="analysis">Analysis</Select.Option>
            <Select.Option value="comparison">Comparison</Select.Option>
            <Select.Option value="recommendation">Recommendation</Select.Option>
          </Select>
        </Form.Item>
        
        <Form.Item label="Category" name="category" rules={[{ required: true }]}>
          <Select style={{ width: 150 }}>
            <Select.Option value="system">System</Select.Option>
            <Select.Option value="tenant">Tenant</Select.Option>
          </Select>
        </Form.Item>
        
        <Form.Item label="Status" name="status" rules={[{ required: true }]}>
          <Select style={{ width: 150 }}>
            <Select.Option value="draft">Draft</Select.Option>
            <Select.Option value="testing">Testing</Select.Option>
            <Select.Option value="active">Active</Select.Option>
          </Select>
        </Form.Item>
      </Space>
      
      <Divider>Template</Divider>
      
      <Card>
        <MonacoEditor
          height="300px"
          language="handlebars"
          value={template}
          onChange={(value) => setTemplate(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14
          }}
        />
      </Card>
      
      <Divider>Variables</Divider>
      
      {/* Variable editor UI here */}
      
      <Space style={{ marginTop: 16 }}>
        <Button type="primary" onClick={handleSave}>
          {prompt ? 'Update (New Version)' : 'Create'}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </Space>
    </Form>
  );
};
```

Create `apps/web/src/components/admin/prompt-management/PromptTester.tsx`:

```typescript
import React, { useState } from 'react';
import { Form, Input, Button, Card, Divider, Rate, Spin, Alert } from 'antd';
import type { PromptTemplate, PromptTestResult } from '@/types/ai-insights';

interface PromptTesterProps {
  prompt: PromptTemplate | null;
  onClose: () => void;
}

export const PromptTester: React.FC<PromptTesterProps> = ({ prompt, onClose }) => {
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<PromptTestResult | null>(null);
  
  const handleTest = async () => {
    if (!prompt) return;
    
    setTesting(true);
    const values = await form.validateFields();
    
    try {
      const res = await fetch(`/api/insights/prompts/${prompt.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: prompt.tenantId,
          testInputs: values,
          notes: values.notes,
          rating: values.rating
        })
      });
      
      const testResult = await res.json();
      setResult(testResult);
    } finally {
      setTesting(false);
    }
  };
  
  return (
    <div>
      <Form form={form} layout="vertical">
        <h3>Test Inputs</h3>
        {prompt?.variables.map((variable) => (
          <Form.Item
            key={variable.name}
            label={variable.name}
            name={variable.name}
            rules={[{ required: variable.required }]}
            help={variable.description}
          >
            <Input.TextArea rows={2} placeholder={`Enter ${variable.name}`} />
          </Form.Item>
        ))}
        
        <Button type="primary" onClick={handleTest} loading={testing}>
          Run Test
        </Button>
      </Form>
      
      {testing && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Spin size="large" />
          <p>Testing prompt...</p>
        </div>
      )}
      
      {result && (
        <>
          <Divider>Test Results</Divider>
          
          {!result.success && (
            <Alert
              type="error"
              message="Test Failed"
              description={result.errors?.join(', ')}
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Card title="Generated Prompt">
            <pre>{result.generatedPrompt}</pre>
          </Card>
          
          <Card title="AI Response" style={{ marginTop: 16 }}>
            <p>{result.response}</p>
          </Card>
          
          <Card title="Metrics" style={{ marginTop: 16 }}>
            <p>Model: {result.modelUsed}</p>
            <p>Response Time: {result.responseTime}ms</p>
            <p>Tokens: {result.tokenUsage.total} (Prompt: {result.tokenUsage.prompt}, Completion: {result.tokenUsage.completion})</p>
            <p>Cost: ${result.cost.toFixed(4)}</p>
          </Card>
          
          <Form form={form} style={{ marginTop: 16 }}>
            <Form.Item label="Rating" name="rating">
              <Rate />
            </Form.Item>
            <Form.Item label="Notes" name="notes">
              <Input.TextArea rows={3} placeholder="Test observations..." />
            </Form.Item>
          </Form>
        </>
      )}
    </div>
  );
};
```

#### 15.7 Database Migration

Create seed script for system prompts in `scripts/seed-prompt-templates.ts`:

```typescript
import { CosmosClient } from '@azure/cosmos';

const systemPrompts: Partial<PromptTemplate>[] = [
  {
    tenantId: 'SYSTEM',
    name: 'Dashboard Summary System Prompt',
    description: 'Default system prompt for dashboard summaries',
    insightType: 'summary',
    category: 'system',
    template: `You are an AI assistant helping users understand their dashboard data.

Dashboard: {{dashboardName}}
User Question: {{userQuery}}

Data Context:
{{context}}

Generate a concise, informative summary that:
1. Highlights key metrics and trends
2. Identifies notable changes or anomalies
3. Provides actionable insights
4. Uses clear, professional language

Format your response in markdown.`,
    variables: [
      {
        name: 'dashboardName',
        type: 'string',
        required: true,
        description: 'Name of the dashboard being analyzed'
      },
      {
        name: 'userQuery',
        type: 'string',
        required: true,
        description: 'User question or request'
      },
      {
        name: 'context',
        type: 'string',
        required: true,
        description: 'JSON context with dashboard data'
      }
    ],
    version: 1,
    isActive: true,
    status: 'active'
  }
  // Add more system prompts...
];

async function seedPrompts() {
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
  const database = client.database('castiel');
  const container = database.container('promptTemplates');
  
  for (const prompt of systemPrompts) {
    const fullPrompt = {
      ...prompt,
      id: uuidv4(),
      pk: 'SYSTEM',
      sk: `PROMPT#${prompt.insightType}#1`,
      createdAt: new Date(),
      createdBy: 'SYSTEM',
      updatedAt: new Date(),
      updatedBy: 'SYSTEM'
    };
    
    await container.items.create(fullPrompt);
    console.log(`Created prompt: ${fullPrompt.name}`);
  }
}

seedPrompts().catch(console.error);
```

---

### Step 16: Tenant Admin Configuration

**Goal**: Enable tenant admins to configure AI Insights for their organization including model selection, budget limits, and custom prompts.

#### 16.1 Database Schema

Create Cosmos DB container `tenantAIConfigurations`:

```typescript
// Container: tenantAIConfigurations
// Partition Key: /tenantId
// Purpose: Store tenant-level AI configuration

const containerDef = {
  id: 'tenantAIConfigurations',
  partitionKey: {
    paths: ['/tenantId'],
    kind: 'Hash'
  },
  defaultTtl: -1, // No TTL
  indexingPolicy: {
    automatic: true,
    includedPaths: [
      { path: '/tenantId/?' },
      { path: '/budget/monthlyLimitUSD/?' },
      { path: '/budget/currentMonth/spent/?' },
      { path: '/features/*/?' },
      { path: '/defaultModel/modelId/?' },
      { path: '/updatedAt/?' }
    ],
    excludedPaths: [
      { path: '/budget/currentMonth/periodStart/?' },
      { path: '/budget/currentMonth/periodEnd/?' }
    ]
  }
};
```

**Update `promptTemplates` container to support tenant inheritance**:

```typescript
// Add to indexing policy
indexingPolicy: {
  automatic: true,
  includedPaths: [
    // ... existing paths
    { path: '/inheritFrom/?' },      // NEW: For prompt inheritance
    { path: '/category/?' },          // 'system' | 'tenant'
    { path: '/overrides/*/?' }        // NEW: For tenant overrides
  ]
}
```

#### 16.2 Create Tenant Configuration Service

Create `apps/api/src/services/tenant-ai-config.service.ts`:

```typescript
import { Container } from '@azure/cosmos';
import { TenantAIConfiguration, BudgetAlert, TenantUsageSnapshot } from '../types/ai-insights.types';
import { AICostTrackingService } from './ai/ai-cost-tracking.service';

export class TenantAIConfigService {
  private container: Container;
  private costTrackingService: AICostTrackingService;
  
  constructor(
    container: Container,
    costTrackingService: AICostTrackingService
  ) {
    this.container = container;
    this.costTrackingService = costTrackingService;
  }
  
  /**
   * Get tenant AI configuration
   */
  async getConfig(tenantId: string): Promise<TenantAIConfiguration> {
    try {
      const { resource } = await this.container.item(tenantId, tenantId).read();
      
      if (!resource) {
        // Return default configuration
        return this.createDefaultConfig(tenantId);
      }
      
      return resource as TenantAIConfiguration;
    } catch (error) {
      if (error.code === 404) {
        return this.createDefaultConfig(tenantId);
      }
      throw error;
    }
  }
  
  /**
   * Update tenant AI configuration
   */
  async updateConfig(
    tenantId: string,
    updates: Partial<TenantAIConfiguration>,
    userId: string
  ): Promise<TenantAIConfiguration> {
    const existing = await this.getConfig(tenantId);
    
    const updated: TenantAIConfiguration = {
      ...existing,
      ...updates,
      tenantId,
      updatedAt: new Date(),
      updatedBy: userId
    };
    
    // Validate budget limits
    if (updates.budget) {
      this.validateBudgetLimits(updated.budget);
    }
    
    // Validate model selection
    if (updates.defaultModel) {
      await this.validateModelSelection(updates.defaultModel.modelId);
    }
    
    await this.container.items.upsert(updated);
    return updated;
  }
  
  /**
   * Check if tenant is within budget
   */
  async checkBudget(tenantId: string): Promise<{
    withinBudget: boolean;
    currentSpend: number;
    monthlyLimit: number;
    percentageUsed: number;
    alertLevel?: 'warning' | 'critical' | 'exceeded';
  }> {
    const config = await this.getConfig(tenantId);
    const currentSpend = config.budget.currentMonth.spent;
    const monthlyLimit = config.budget.monthlyLimitUSD;
    const percentageUsed = (currentSpend / monthlyLimit) * 100;
    
    let alertLevel: 'warning' | 'critical' | 'exceeded' | undefined;
    
    if (percentageUsed >= 100) {
      alertLevel = 'exceeded';
    } else if (percentageUsed >= 90) {
      alertLevel = 'critical';
    } else if (percentageUsed >= 80) {
      alertLevel = 'warning';
    }
    
    return {
      withinBudget: currentSpend < monthlyLimit,
      currentSpend,
      monthlyLimit,
      percentageUsed,
      alertLevel
    };
  }
  
  /**
   * Track insight cost and update budget
   */
  async trackInsightCost(
    tenantId: string,
    cost: number,
    insightType: InsightType
  ): Promise<void> {
    const config = await this.getConfig(tenantId);
    
    // Check if within per-insight limit
    if (cost > config.budget.costPerInsight.max) {
      throw new Error(
        `Insight cost $${cost.toFixed(4)} exceeds maximum allowed $${config.budget.costPerInsight.max}`
      );
    }
    
    // Update current month spending
    config.budget.currentMonth.spent += cost;
    config.budget.currentMonth.insightCount += 1;
    
    // Check budget alerts
    await this.checkAndSendBudgetAlerts(tenantId, config);
    
    // Update configuration
    await this.container.item(tenantId, tenantId).replace(config);
  }
  
  /**
   * Get usage snapshot for tenant
   */
  async getUsageSnapshot(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TenantUsageSnapshot> {
    const usage = await this.costTrackingService.getTenantUsage(
      tenantId,
      startDate,
      endDate
    );
    
    return {
      tenantId,
      date: new Date(),
      totalSpend: usage.totalCost,
      insightCount: usage.totalInsights,
      byModel: usage.byModel.map(m => ({
        modelId: m.modelId,
        modelName: m.modelName,
        insightCount: m.insightCount,
        spend: m.totalCost,
        avgCostPerInsight: m.avgCostPerInsight
      })),
      byInsightType: usage.byInsightType.map(t => ({
        insightType: t.insightType,
        count: t.count,
        spend: t.totalCost
      }))
    };
  }
  
  /**
   * Reset monthly budget (called by cron job)
   */
  async resetMonthlyBudget(tenantId: string): Promise<void> {
    const config = await this.getConfig(tenantId);
    
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    config.budget.currentMonth = {
      spent: 0,
      insightCount: 0,
      periodStart,
      periodEnd
    };
    
    await this.container.item(tenantId, tenantId).replace(config);
  }
  
  // Private helper methods
  
  private createDefaultConfig(tenantId: string): TenantAIConfiguration {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      id: tenantId,
      pk: tenantId,
      sk: 'CONFIG#AI',
      tenantId,
      budget: {
        monthlyLimitUSD: 1000,
        alertThresholds: [
          { percentage: 50, action: 'email', recipients: [] },
          { percentage: 80, action: 'notification', recipients: [] },
          { percentage: 90, action: 'pause', recipients: [] }
        ],
        costPerInsight: {
          max: 0.50,
          target: 0.10
        },
        currentMonth: {
          spent: 0,
          insightCount: 0,
          periodStart,
          periodEnd
        }
      },
      quality: {
        minConfidenceScore: 0.7,
        requireCitations: true,
        enableGrounding: true,
        maxRetries: 3
      },
      features: {
        enableProactiveInsights: false,
        enableMultiModal: false,
        enableToolCalling: true,
        enableSemanticCache: true,
        enableConversationMemory: true
      },
      privacy: {
        dataRetentionDays: 90,
        enableAuditLog: true,
        allowCrossShardContext: false,
        piiHandling: 'redact',
        enableExport: true
      },
      prompts: {
        allowCustomPrompts: true,
        maxActivePrompts: 10,
        requireApproval: false
      },
      createdAt: now,
      createdBy: 'SYSTEM',
      updatedAt: now,
      updatedBy: 'SYSTEM'
    };
  }
  
  private validateBudgetLimits(budget: TenantAIConfiguration['budget']): void {
    if (budget.monthlyLimitUSD <= 0) {
      throw new Error('Monthly budget limit must be greater than 0');
    }
    
    if (budget.costPerInsight.max <= 0) {
      throw new Error('Max cost per insight must be greater than 0');
    }
    
    if (budget.costPerInsight.target > budget.costPerInsight.max) {
      throw new Error('Target cost cannot exceed max cost');
    }
  }
  
  private async validateModelSelection(modelId: string): Promise<void> {
    // Validate that model exists in catalog
    // Implementation depends on AIModelService
  }
  
  private async checkAndSendBudgetAlerts(
    tenantId: string,
    config: TenantAIConfiguration
  ): Promise<void> {
    const percentageUsed = 
      (config.budget.currentMonth.spent / config.budget.monthlyLimitUSD) * 100;
    
    for (const threshold of config.budget.alertThresholds) {
      if (percentageUsed >= threshold.percentage) {
        await this.sendBudgetAlert(tenantId, config, threshold);
      }
    }
  }
  
  private async sendBudgetAlert(
    tenantId: string,
    config: TenantAIConfiguration,
    threshold: TenantAIConfiguration['budget']['alertThresholds'][0]
  ): Promise<void> {
    const percentageUsed = 
      (config.budget.currentMonth.spent / config.budget.monthlyLimitUSD) * 100;
    
    const alert: BudgetAlert = {
      id: `${tenantId}-${threshold.percentage}-${Date.now()}`,
      tenantId,
      alertType: percentageUsed >= 100 ? 'limit_exceeded' : 'threshold_reached',
      threshold: threshold.percentage,
      currentSpend: config.budget.currentMonth.spent,
      monthlyLimit: config.budget.monthlyLimitUSD,
      message: `AI Insights budget at ${threshold.percentage}% ($${config.budget.currentMonth.spent.toFixed(2)}/$${config.budget.monthlyLimitUSD})`,
      sentAt: new Date(),
      acknowledged: false
    };
    
    // Send notification/email based on threshold.action
    // Implementation depends on notification service
    
    if (threshold.action === 'pause') {
      // Pause AI insights for tenant
      config.features.enableProactiveInsights = false;
    }
  }
}
```

#### 16.3 Update Prompt Management Service

Add tenant prompt support to `apps/api/src/services/prompt-management.service.ts`:

```typescript
/**
 * Get active prompt with tenant override support
 */
async getActivePrompt(
  tenantId: string,
  insightType: InsightType
): Promise<PromptTemplate | null> {
  // Try tenant-specific prompt first
  const tenantPrompt = await this.findActivePrompt(tenantId, insightType);
  if (tenantPrompt) {
    // If tenant prompt inherits from system prompt, merge them
    if (tenantPrompt.inheritFrom) {
      const systemPrompt = await this.getPrompt(tenantPrompt.inheritFrom, 'SYSTEM');
      if (systemPrompt) {
        return this.mergePrompts(systemPrompt, tenantPrompt);
      }
    }
    return tenantPrompt;
  }
  
  // Fallback to system prompt
  return this.findActivePrompt('SYSTEM', insightType);
}

/**
 * Merge system prompt with tenant overrides
 */
private mergePrompts(
  systemPrompt: PromptTemplate,
  tenantPrompt: PromptTemplate
): PromptTemplate {
  return {
    ...systemPrompt,
    id: tenantPrompt.id,
    name: tenantPrompt.name,
    tenantId: tenantPrompt.tenantId,
    category: 'tenant',
    // Merge template
    template: tenantPrompt.overrides?.template 
      ? `${systemPrompt.template}\n\n${tenantPrompt.overrides.template}`
      : systemPrompt.template,
    // Merge variables
    variables: [
      ...systemPrompt.variables,
      ...(tenantPrompt.overrides?.variables || [])
    ],
    // Keep tenant prompt metadata
    version: tenantPrompt.version,
    isActive: tenantPrompt.isActive,
    status: tenantPrompt.status,
    testResults: tenantPrompt.testResults,
    performanceMetrics: tenantPrompt.performanceMetrics
  };
}

/**
 * Create tenant prompt (inherits from system prompt)
 */
async createTenantPrompt(
  tenantId: string,
  systemPromptId: string,
  data: {
    name: string;
    description: string;
    overrides?: {
      template?: string;
      variables?: PromptVariable[];
    };
  },
  userId: string
): Promise<PromptTemplate> {
  const systemPrompt = await this.getPrompt(systemPromptId, 'SYSTEM');
  if (!systemPrompt) {
    throw new Error('System prompt not found');
  }
  
  const id = uuidv4();
  const now = new Date();
  
  const tenantPrompt: PromptTemplate = {
    id,
    pk: tenantId,
    sk: `PROMPT#${systemPrompt.insightType}#1`,
    tenantId,
    name: data.name,
    description: data.description,
    insightType: systemPrompt.insightType,
    category: 'tenant',
    template: systemPrompt.template, // Base template
    variables: systemPrompt.variables,
    inheritFrom: systemPromptId,
    overrides: data.overrides,
    version: 1,
    isActive: false,
    status: 'draft',
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId
  };
  
  await this.container.items.create(tenantPrompt);
  return tenantPrompt;
}
```

#### 16.4 API Routes for Tenant Admin

Add to `apps/api/src/routes/insights.routes.ts`:

```typescript
// ============================================
// Tenant Admin Configuration Routes
// ============================================

/**
 * Get tenant AI configuration
 * GET /api/insights/admin/config
 */
router.get('/admin/config', requireTenantAdmin, async (req, res) => {
  const { tenantId } = req.user;
  
  try {
    const config = await tenantAIConfigService.getConfig(tenantId);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update tenant AI configuration
 * PUT /api/insights/admin/config
 */
router.put('/admin/config', requireTenantAdmin, async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const updates = req.body;
  
  try {
    const config = await tenantAIConfigService.updateConfig(
      tenantId,
      updates,
      userId
    );
    res.json(config);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get budget status
 * GET /api/insights/admin/budget/status
 */
router.get('/admin/budget/status', requireTenantAdmin, async (req, res) => {
  const { tenantId } = req.user;
  
  try {
    const status = await tenantAIConfigService.checkBudget(tenantId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get usage snapshot
 * GET /api/insights/admin/usage
 */
router.get('/admin/usage', requireTenantAdmin, async (req, res) => {
  const { tenantId } = req.user;
  const { startDate, endDate } = req.query;
  
  try {
    const snapshot = await tenantAIConfigService.getUsageSnapshot(
      tenantId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List tenant prompts
 * GET /api/insights/admin/prompts
 */
router.get('/admin/prompts', requireTenantAdmin, async (req, res) => {
  const { tenantId } = req.user;
  const { insightType, status } = req.query;
  
  try {
    const prompts = await promptManagementService.listPrompts({
      tenantId,
      insightType: insightType as InsightType,
      status: status as any,
      category: 'tenant'
    });
    
    // Also get available system prompts for inheritance
    const systemPrompts = await promptManagementService.listPrompts({
      tenantId: 'SYSTEM',
      category: 'system',
      status: 'active'
    });
    
    res.json({
      tenantPrompts: prompts,
      systemPrompts,
      capabilities: {
        canCreate: true,
        canEdit: true,
        canActivate: true,
        canTest: true,
        maxActivePrompts: 10
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create tenant prompt
 * POST /api/insights/admin/prompts
 */
router.post('/admin/prompts', requireTenantAdmin, async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { systemPromptId, name, description, overrides } = req.body;
  
  try {
    const prompt = await promptManagementService.createTenantPrompt(
      tenantId,
      systemPromptId,
      { name, description, overrides },
      userId
    );
    res.status(201).json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Test tenant prompt
 * POST /api/insights/admin/prompts/:id/test
 */
router.post('/admin/prompts/:id/test', requireTenantAdmin, async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  const { testInputs, notes, rating } = req.body;
  
  try {
    const result = await promptManagementService.testPrompt(
      id,
      tenantId,
      testInputs,
      userId,
      notes,
      rating
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Activate tenant prompt
 * POST /api/insights/admin/prompts/:id/activate
 */
router.post('/admin/prompts/:id/activate', requireTenantAdmin, async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  
  try {
    const prompt = await promptManagementService.activatePrompt(id, tenantId, userId);
    res.json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Deactivate tenant prompt
 * POST /api/insights/admin/prompts/:id/deactivate
 */
router.post('/admin/prompts/:id/deactivate', requireTenantAdmin, async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { id } = req.params;
  
  try {
    const prompt = await promptManagementService.deactivatePrompt(id, tenantId, userId);
    res.json(prompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Middleware
function requireTenantAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isTenantAdmin && !req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Tenant admin access required' });
  }
  next();
}
```

---

---

### Step 16: Intent Pattern Management System

**Goal**: Enable Super Admins to improve intent classification through LLM-assisted pattern creation and continuous learning.

**Key Deliverables**:
- `PatternLearningService` for LLM-based pattern generation and analysis
- Database containers: `intentPatterns`, `patternSuggestions`, `patternAnalytics`
- API endpoints for pattern management, approval workflow, and analytics
- Integration with `IntentAnalyzerService` for runtime pattern loading

**Implementation**:
- Create LLM prompts for pattern generation from query samples
- Track accuracy metrics and identify underperforming patterns
- Analyze misclassifications to suggest improvements
- Manage approval workflow for auto-learned patterns

---

### Step 17: Web Search Integration

**Goal**: Enable AI to search the web for current information and ground responses in external sources with multi-provider support, intelligent caching, deduplication, and deep search capability.

**Key Components**:
1. **WebSearchService** - Multi-provider search with fallback and deduplication
2. **WebScraperService** - Deep search: scrape top 3 pages, extract content, generate embeddings
3. **Provider Adapters** - SerpAPI (primary), Bing Search (fallback), Google support
4. **Database** - Cosmos containers with Hierarchical Partition Keys (HPK)
5. **Caching** - Redis (hot) + Cosmos (persistent, 30-day TTL default)
6. **Vector Search** - Semantic search on scraped page embeddings
7. **Integration** - ContextAssemblerService (auto-trigger), GroundingService (citations)

**Database Structure**:
- `searchResults`: c_search shards with HPK [/tenantId, /queryHash, /id]
- `webPages`: c_webpages shards with HPK [/tenantId, /projectId, /sourceQuery]
- `searchProviders`: Provider config, credentials, health, costs
- `providerFallbackChains`: Priority ordering, routing rules, failover strategy

**API Endpoints** (12 total):
- User: `POST /api/v1/insights/search`, `GET /api/v1/insights/search/{shardId}`
- User: `POST /api/v1/insights/deep-search` (with async scraping and WebSocket updates)
- Super Admin: Provider management (list, update), fallback chain, health, usage

**Key Features**:
- Multi-provider fallback with exponential backoff (SerpAPI → Bing)
- **Deep search**: Async scraping of top 3 pages, clean text extraction
- **Vector embeddings**: 512-token semantic chunks with OpenAI embeddings
- Content deduplication via MD5 hashing
- Tenant-specific auto-trigger keywords
- Per-tenant domain whitelists/blacklists
- Provider health monitoring and cost tracking
- Budget limits and forecasting
- Source citations with provider attribution
- **Real-time progress**: WebSocket/SSE updates for deep search scraping

**Files to Create**:
- `apps/api/src/services/web-search.service.ts`
- `apps/api/src/services/web-scraper.service.ts` (NEW - deep search)
- `apps/api/src/services/content-chunking.service.ts` (NEW - semantic chunking)
- `apps/api/src/services/web-search/providers/serpapi.provider.ts` (NEW)
- `apps/api/src/services/web-search/providers/bing.provider.ts`
- `apps/api/src/services/web-search/providers/google.provider.ts`
- `apps/api/src/routes/search.routes.ts`

**Files to Update**:
- `apps/api/src/services/context-assembler.service.ts` - Auto-trigger web/deep search
- `apps/api/src/services/embedding.service.ts` - Add vector embedding generation
- `apps/api/src/services/grounding.service.ts` - Add web citations with embeddings
- Database migrations (add c_webpages container)

**Dependencies to Add**:
```json
{
  "axios": "^1.6.0",
  "cheerio": "^1.0.0-rc.12",
  "langchain": "^0.1.0",
  "openai": "^4.0.0"
}
```

---

## Step 18: Recurring Search Implementation

> **Prerequisites**: AI Insights Core (Steps 1-17), Web Search Integration, Notification System  
> **Estimated Time**: 2-3 weeks  
> **Priority**: HIGH (New Feature)

### Overview

Implement the recurring search system with AI-powered alert detection, allowing users to set up automated searches that run on a schedule and trigger intelligent alerts when significant changes are detected. This step integrates with the existing AI Insights pipeline, Web Search system, and introduces a global notification system.

### Database Setup

#### Step 18.1: Create Cosmos DB Containers

Create 6 new containers for recurring search data with Hierarchical Partition Keys (HPK).

**File**: `apps/api/src/scripts/migrations/create-recurring-search-containers.ts`

```typescript
import { CosmosClient } from '@azure/cosmos';
import { config } from '../config';

async function createRecurringSearchContainers() {
  const client = new CosmosClient({
    endpoint: config.cosmos.endpoint,
    key: config.cosmos.key,
  });

  const database = client.database(config.cosmos.database);

  // 1. recurringSearches container
  await database.containers.createIfNotExists({
    id: 'recurringSearches',
    partitionKey: {
      paths: ['/tenantId', '/userId', '/id'],
      version: 2, // HPK
    },
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/userId/?' },
        { path: '/status/?' },
        { path: '/searchType/?' },
        { path: '/schedule/frequency/?' },
        { path: '/nextExecutionAt/?' },
        { path: '/createdAt/?' },
      ],
      excludedPaths: [
        { path: '/filters/*' },
        { path: '/_etag/?' },
      ],
    },
  });

  // 2. searchExecutions container
  await database.containers.createIfNotExists({
    id: 'searchExecutions',
    partitionKey: {
      paths: ['/tenantId', '/searchId', '/id'],
      version: 2, // HPK
    },
    defaultTtl: 7776000, // 90 days
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/searchId/?' },
        { path: '/executedAt/?' },
        { path: '/status/?' },
        { path: '/alertsTriggered/?' },
      ],
      excludedPaths: [
        { path: '/results/*' },
        { path: '/_etag/?' },
      ],
    },
  });

  // 3. notifications container (global)
  await database.containers.createIfNotExists({
    id: 'notifications',
    partitionKey: {
      paths: ['/tenantId', '/userId', '/notificationId'],
      version: 2, // HPK
    },
    defaultTtl: 15552000, // 180 days
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/userId/?' },
        { path: '/type/?' },
        { path: '/isRead/?' },
        { path: '/createdAt/?' },
      ],
      excludedPaths: [
        { path: '/metadata/*' },
        { path: '/_etag/?' },
      ],
    },
  });

  // 4. suppressionRules container
  await database.containers.createIfNotExists({
    id: 'suppressionRules',
    partitionKey: {
      paths: ['/tenantId', '/searchId', '/id'],
      version: 2, // HPK
    },
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/searchId/?' },
        { path: '/pattern/?' },
        { path: '/isActive/?' },
      ],
      excludedPaths: [
        { path: '/_etag/?' },
      ],
    },
  });

  // 5. searchStatistics container
  await database.containers.createIfNotExists({
    id: 'searchStatistics',
    partitionKey: {
      paths: ['/tenantId', '/period', '/id'],
      version: 2, // HPK
    },
    defaultTtl: 31536000, // 365 days
    indexingPolicy: {
      automatic: true,
      indexingMode: 'consistent',
      includedPaths: [
        { path: '/tenantId/?' },
        { path: '/searchId/?' },
        { path: '/period/?' },
        { path: '/accuracy/?' },
      ],
      excludedPaths: [
        { path: '/_etag/?' },
      ],
    },
  });

  console.log('✅ All recurring search containers created successfully');
}

createRecurringSearchContainers().catch(console.error);
```

**Run Migration**:

```bash
ts-node apps/api/src/scripts/migrations/create-recurring-search-containers.ts
```

**Reference**: See `RECURRING-SEARCH-DATABASE.md` for complete schema details.

---

### Backend Services Implementation

#### Step 18.2: RecurringSearchService

Core service for managing recurring searches (CRUD operations, execution orchestration).

**File**: `apps/api/src/services/recurring-search/recurring-search.service.ts`

```typescript
import { Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { WebSearchService } from '../web-search/web-search.service';
import { RAGService } from '../rag.service';
import { AlertAnalysisService } from './alert-analysis.service';

export class RecurringSearchService {
  constructor(
    private container: Container,
    private webSearchService: WebSearchService,
    private ragService: RAGService,
    private alertAnalysisService: AlertAnalysisService
  ) {}

  async createRecurringSearch(
    tenantId: string,
    userId: string,
    data: any
  ): Promise<any> {
    // Validate quota
    await this.validateQuota(tenantId, userId);

    const search = {
      id: `rs_${uuidv4()}`,
      tenantId,
      userId,
      ...data,
      status: 'active',
      nextExecutionAt: this.calculateNextExecution(data.schedule),
      createdAt: new Date(),
      updatedAt: new Date(),
      statistics: {
        totalExecutions: 0,
        alertsTriggered: 0,
        falsePositives: 0,
        relevantAlerts: 0,
      },
    };

    await this.container.items.create(search);
    return search;
  }

  async executeSearch(searchId: string): Promise<void> {
    const search = await this.getSearchById(searchId);
    if (!search || search.status !== 'active') return;

    const executionId = `exec_${uuidv4()}`;
    const startTime = Date.now();

    try {
      // Perform search
      const results = await this.performSearch(search);

      // Run alert detection
      let alerts: any[] = [];
      if (search.alertCriteria.enableAlerts && results.length > 0) {
        alerts = await this.alertAnalysisService.analyzeSearchResults(
          search,
          results,
          executionId
        );
      }

      // Store execution record
      await this.storeExecution({
        id: executionId,
        tenantId: search.tenantId,
        searchId: search.id,
        executedAt: new Date(),
        status: 'completed',
        resultsCount: results.length,
        alertsTriggered: alerts.length,
        executionTime: Date.now() - startTime,
      });

      // Update next execution time
      await this.updateNextExecution(search);
    } catch (error) {
      console.error(`Error executing search ${searchId}:`, error);
      throw error;
    }
  }

  private async performSearch(search: any): Promise<any[]> {
    let ragResults: any[] = [];
    let webResults: any[] = [];

    if (search.dataSources.includes('rag')) {
      ragResults = await this.ragService.search({
        query: search.query,
        tenantId: search.tenantId,
        filters: search.filters,
        limit: 50,
      });
    }

    if (search.dataSources.includes('web')) {
      webResults = await this.webSearchService.search({
        query: search.query,
        tenantId: search.tenantId,
        limit: 20,
      });
    }

    return [...ragResults, ...webResults];
  }

  // Additional methods: getUserSearches, updateRecurringSearch, pauseSearch, resumeSearch, deleteSearch
}
```

**Reference**: See `RECURRING-SEARCH-SERVICES.md` for complete implementation (~500 lines).

---

#### Step 18.3: AlertAnalysisService

LLM-powered alert detection with delta analysis.

**File**: `apps/api/src/services/recurring-search/alert-analysis.service.ts`

```typescript
import { AIModelService } from '../ai/ai-model.service';

export class AlertAnalysisService {
  constructor(private aiModelService: AIModelService) {}

  async analyzeSearchResults(
    search: any,
    currentResults: any[],
    executionId: string
  ): Promise<any[]> {
    // Get previous results
    const previousResults = await this.getPreviousResults(search.id);

    if (!previousResults || previousResults.length === 0) {
      return []; // First execution, no delta
    }

    // Perform delta analysis with LLM
    const alerts = await this.performDeltaAnalysis(
      search,
      previousResults,
      currentResults
    );

    // Filter by confidence threshold
    return alerts.filter(
      (alert) => alert.confidenceScore >= (search.alertCriteria.confidenceThreshold || 0.7)
    );
  }

  private async performDeltaAnalysis(
    search: any,
    previousResults: any[],
    currentResults: any[]
  ): Promise<any[]> {
    const prompt = search.alertCriteria.detectionPrompt || this.getDefaultPrompt(search.searchType);

    const response = await this.aiModelService.generateCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: `
Previous Results: ${JSON.stringify(previousResults)}
Current Results: ${JSON.stringify(currentResults)}

Identify significant changes and return as JSON array of alerts.
          `,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(response.content);
    return analysis.alerts || [];
  }

  private getDefaultPrompt(searchType: string): string {
    const prompts = {
      sales_opportunity: `You are an expert sales analyst...`,
      risk_monitoring: `You are a risk assessment specialist...`,
      // Additional prompts...
    };
    return prompts[searchType] || 'Analyze for significant changes...';
  }
}
```

**Reference**: See `RECURRING-SEARCH-ALERTS.md` for complete delta analysis methodology.

---

#### Step 18.4: NotificationService

Global notification service supporting multiple channels.

**File**: `apps/api/src/services/recurring-search/notification.service.ts`

```typescript
export class NotificationService {
  async sendNotification(request: any): Promise<void> {
    // Get user preferences
    const preferences = await this.getUserPreferences(request.tenantId, request.userId);

    // Check digest mode
    if (preferences.digestMode && request.type === 'recurring_search_alert') {
      await this.queueForDigest(request);
      return;
    }

    // Send to each channel
    for (const channel of request.channels) {
      if (preferences.channels[channel]?.enabled) {
        await this.sendToChannel(channel, request);
      }
    }

    // Store in-app notification
    await this.storeInAppNotification(request);
  }

  private async sendToChannel(channel: string, request: any): Promise<void> {
    // Implementation per channel (email, webhook, push, etc.)
  }
}
```

**Reference**: See `NOTIFICATIONS.md` for complete notification system (6 channels).

---

### Azure Functions Setup

#### Step 18.5: Timer Trigger (Schedule Manager)

**File**: `apps/functions/recurring-search-scheduler/index.ts`

```typescript
import { AzureFunction, Context } from '@azure/functions';

const timerTrigger: AzureFunction = async function (context: Context): Promise<void> {
  context.log('Recurring Search Scheduler triggered');

  // Get searches due for execution
  const searches = await getSearchesDueForExecution(new Date());

  // Queue each for execution
  for (const search of searches) {
    await queueSearchExecution(search.id);
  }
};

export default timerTrigger;
```

#### Step 18.6: Queue Worker (Search Executor)

**File**: `apps/functions/recurring-search-executor/index.ts`

```typescript
import { AzureFunction, Context } from '@azure/functions';

const queueTrigger: AzureFunction = async function (context: Context, queueItem: any): Promise<void> {
  const searchId = queueItem.searchId;
  
  try {
    await recurringSearchService.executeSearch(searchId);
  } catch (error) {
    context.log.error('Search execution failed:', error);
    throw error; // Retry
  }
};

export default queueTrigger;
```

---

### API Routes

#### Step 18.7: REST Endpoints

**File**: `apps/api/src/routes/insights/recurring-searches.routes.ts`

```typescript
import { Router } from 'express';
import { requireUser } from '../../middleware/auth.middleware';

const router = Router();

// User endpoints (8)
router.post('/', requireUser, createRecurringSearch);
router.get('/', requireUser, listUserSearches);
router.get('/:id', requireUser, getSearchDetails);
router.patch('/:id', requireUser, updateSearch);
router.delete('/:id', requireUser, deleteSearch);
router.post('/:id/pause', requireUser, pauseSearch);
router.post('/:id/resume', requireUser, resumeSearch);
router.get('/:id/results', requireUser, getExecutionHistory);

export default router;
```

**Reference**: See `API.md` Section 15 for all 20 endpoints (User, Alert, Tenant Admin, Super Admin).

---

### Testing

#### Step 18.8: Service Tests

```typescript
describe('RecurringSearchService', () => {
  it('should create recurring search with valid data', async () => {
    const search = await service.createRecurringSearch('tenant1', 'user1', {
      name: 'Test Search',
      query: 'test query',
      searchType: 'sales_opportunity',
      dataSources: ['rag'],
      schedule: { frequency: 'daily', time: '09:00' },
      alertCriteria: { enableAlerts: true },
    });

    expect(search.id).toMatch(/^rs_/);
    expect(search.status).toBe('active');
  });

  it('should enforce quota limits', async () => {
    // Test quota validation
  });
});
```

---

### Migration Checklist

- [ ] **Step 18.1**: Run container creation migration
- [ ] **Step 18.2**: Implement RecurringSearchService
- [ ] **Step 18.3**: Implement AlertAnalysisService
- [ ] **Step 18.4**: Implement NotificationService
- [ ] **Step 18.5**: Deploy Timer Trigger Function
- [ ] **Step 18.6**: Deploy Queue Worker Function
- [ ] **Step 18.7**: Add API routes (20 endpoints)
- [ ] **Step 18.8**: Write service tests (80% coverage)
- [ ] **Step 18.9**: Add UI components (List, Create, Alerts, Stats, Config)
- [ ] **Step 18.10**: End-to-end testing

### Environment Variables

```bash
# Recurring Search
RECURRING_SEARCH_QUEUE_NAME=recurring-search-queue
RECURRING_SEARCH_SCHEDULER_INTERVAL=*/5 * * * *
RECURRING_SEARCH_DEFAULT_QUOTA=10

# Notifications
NOTIFICATION_DIGEST_ENABLED=true
NOTIFICATION_DIGEST_SCHEDULE=0 8 * * *
```

---

## Testing Strategy

### Unit Tests

Test individual services and functions in isolation.

**Location**: `apps/api/src/services/__tests__/`

```typescript
// Example: Context Assembly Service Test
describe('ContextAssemblyService', () => {
  let service: ContextAssemblyService;
  let mockCosmosService: jest.Mocked<CosmosService>;
  
  beforeEach(() => {
    mockCosmosService = createMockCosmosService();
    service = new ContextAssemblyService(mockCosmosService);
  });
  
  describe('assemble', () => {
    it('should respect tenant isolation', async () => {
      const context = await service.assemble({
        tenantId: 'tenant_A',
        templateId: 'template_1',
        scope: { projectId: 'proj_1' }
      });
      
      // Verify no shards from other tenants
      expect(context.shards.every(s => s.tenantId === 'tenant_A')).toBe(true);
    });
    
    it('should apply ACL filtering', async () => {
      const userId = 'user_123';
      const context = await service.assemble({
        tenantId: 'tenant_A',
        userId,
        scope: { projectId: 'proj_1' }
      });
      
      // Verify user has access to all returned shards
      for (const shard of context.shards) {
        expect(hasAccess(userId, shard.acl)).toBe(true);
      }
    });
    
    it('should limit results to maxResults', async () => {
      const context = await service.assemble({
        tenantId: 'tenant_A',
        maxResults: 5
      });
      
      expect(context.shards.length).toBeLessThanOrEqual(5);
    });
  });
});

// Example: Grounding Service Test
describe('GroundingService', () => {
  it('should generate citations for source shards', async () => {
    const response = 'Project Alpha has 5 critical risks.';
    const sources = [
      { id: 'shard_1', content: 'Project Alpha has 5 critical risks' }
    ];
    
    const grounded = await groundingService.ground(response, sources);
    
    expect(grounded.citations.length).toBeGreaterThan(0);
    expect(grounded.citations[0].shardId).toBe('shard_1');
  });
  
  it('should detect hallucinations', async () => {
    const response = 'Project Alpha has 10 critical risks.';
    const sources = [
      { id: 'shard_1', content: 'Project Alpha has 5 critical risks' }
    ];
    
    const grounded = await groundingService.ground(response, sources);
    
    expect(grounded.groundingMetadata.supportScore).toBeLessThan(0.7);
  });
});

// Example: Intent Classifier Test
describe('IntentAnalyzer', () => {
  it('should classify summary intent', async () => {
    const result = await intentAnalyzer.analyze({
      content: 'Summarize the project status',
      conversationHistory: []
    });
    
    expect(result.intent).toBe('summary');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
  
  it('should use conversation history for context', async () => {
    const result = await intentAnalyzer.analyze({
      content: 'What about the risks?',
      conversationHistory: [
        { role: 'user', content: 'Tell me about Project Alpha' },
        { role: 'assistant', content: 'Project Alpha is...' }
      ]
    });
    
    expect(result.scope?.projectId).toBe('proj_alpha');
  });
});
```

### Integration Tests

Test API endpoints and service interactions.

**Location**: `apps/api/src/routes/__tests__/`

```typescript
// Example: Chat API Integration Test
describe('POST /api/v1/insights/chat', () => {
  it('should create a new conversation', async () => {
    const response = await request(app)
      .post('/api/v1/insights/chat')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        content: 'What are the risks in Project Alpha?',
        scope: { projectId: 'proj_alpha' }
      });
    
    expect(response.status).toBe(200);
    expect(response.body.conversationId).toBeDefined();
    expect(response.body.messageId).toBeDefined();
  });
  
  it('should continue existing conversation', async () => {
    const conversationId = 'existing_conv_123';
    
    const response = await request(app)
      .post('/api/v1/insights/chat')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        conversationId,
        content: 'What about opportunities?'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.conversationId).toBe(conversationId);
  });
  
  it('should respect tenant isolation', async () => {
    const response = await request(app)
      .post('/api/v1/insights/chat')
      .set('Authorization', `Bearer ${tenantBToken}`)
      .send({
        conversationId: 'tenant_a_conversation',
        content: 'Continue'
      });
    
    expect(response.status).toBe(404);
  });
  
  it('should enforce rate limits', async () => {
    const requests = Array.from({ length: 61 }, (_, i) =>
      request(app)
        .post('/api/v1/insights/chat')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ content: `Message ${i}` })
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});

// Example: Grounding Integration Test
describe('AI Insights Grounding', () => {
  it('should generate grounded response with citations', async () => {
    const response = await request(app)
      .post('/api/v1/insights/chat')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        content: 'What are the risks in Project Alpha?',
        scope: { projectId: 'proj_alpha' }
      });
    
    expect(response.status).toBe(200);
    expect(response.body.content).toBeDefined();
    expect(response.body.citations.length).toBeGreaterThan(0);
    expect(response.body.groundingMetadata).toBeDefined();
    expect(response.body.groundingMetadata.supportScore).toBeGreaterThan(0.7);
  });
});
```

### E2E Tests

Test complete user workflows in the frontend.

**Location**: `apps/web/e2e/`

```typescript
// Example: Chat Interface E2E Test
import { test, expect } from '@playwright/test';

test.describe('AI Insights Chat', () => {
  test('should send message and receive streaming response', async ({ page }) => {
    await page.goto('/projects/proj_alpha');
    
    // Open AI chat
    await page.click('[data-testid="ai-chat-button"]');
    
    // Type message
    await page.fill('[data-testid="chat-input"]', 'What are the main risks?');
    await page.click('[data-testid="send-button"]');
    
    // Wait for response to start streaming
    await page.waitForSelector('[data-testid="assistant-message"]');
    
    // Verify response appears
    const response = await page.textContent('[data-testid="assistant-message"]');
    expect(response).toContain('risk');
    
    // Verify citations appear
    const citations = await page.locator('[data-testid="citation"]').count();
    expect(citations).toBeGreaterThan(0);
  });
  
  test('should show web search results when enabled', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="ai-chat-button"]');
    
    // Enable web search
    await page.click('[data-testid="settings-button"]');
    await page.check('[data-testid="web-search-toggle"]');
    
    // Ask question requiring web search
    await page.fill('[data-testid="chat-input"]', 'What are the latest trends in AI?');
    await page.click('[data-testid="send-button"]');
    
    // Verify web search indicator
    await page.waitForSelector('[data-testid="web-search-indicator"]');
    
    // Verify web citations
    const webCitations = await page.locator('[data-testid="citation"][data-source="web"]').count();
    expect(webCitations).toBeGreaterThan(0);
  });
  
  test('should handle conversation branching', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="ai-chat-button"]');
    
    // Send initial message
    await page.fill('[data-testid="chat-input"]', 'Analyze Project Alpha');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="assistant-message"]');
    
    // Branch from first message
    await page.hover('[data-testid="user-message"]:first-child');
    await page.click('[data-testid="branch-button"]');
    
    // Send different follow-up
    await page.fill('[data-testid="chat-input"]', 'What about opportunities?');
    await page.click('[data-testid="send-button"]');
    
    // Verify branch indicator
    await expect(page.locator('[data-testid="branch-indicator"]')).toBeVisible();
  });
});

// Example: Quick Insights E2E Test
test.describe('Quick Insights', () => {
  test('should show quick insights on shard hover', async ({ page }) => {
    await page.goto('/projects/proj_alpha/tasks/task_123');
    
    // Hover over task card
    await page.hover('[data-testid="task-card"]');
    
    // Wait for quick insight to appear
    await page.waitForSelector('[data-testid="quick-insight"]', { timeout: 3000 });
    
    // Verify insight content
    const insight = await page.textContent('[data-testid="quick-insight"]');
    expect(insight).toBeTruthy();
  });
});
```

### Load Testing

Test system performance under load using Artillery or k6.

**Location**: `tests/load/`

```yaml
# artillery-config.yml
config:
  target: 'https://api.castiel.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  processor: "./test-helpers.js"
  
scenarios:
  - name: "AI Insights Chat"
    flow:
      - post:
          url: "/api/v1/insights/chat"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TEST_TOKEN }}"
          json:
            conversationId: "{{ conversationId }}"
            content: "What are the top risks in Project Alpha?"
            scope:
              projectId: "proj_alpha"
      - think: 2  # Wait 2s between requests

  - name: "Quick Insights"
    flow:
      - post:
          url: "/api/v1/insights/quick"
          headers:
            Authorization: "Bearer {{ $processEnvironment.TEST_TOKEN }}"
          json:
            shardId: "{{ shardId }}"
            type: "summary"
      - think: 1
```

**Run Load Test**:
```bash
# Install Artillery
npm install -g artillery

# Run test
artillery run tests/load/artillery-config.yml --output report.json

# Generate HTML report
artillery report report.json
```

### Test Coverage

**Target Coverage**:
- Unit tests: >80% coverage
- Integration tests: All API endpoints
- E2E tests: Critical user flows

**Run Coverage**:
```bash
# Run all tests with coverage
pnpm test:coverage

# View coverage report
open coverage/index.html
```

---

## Deployment Checklist

### Pre-deployment

- [ ] All TypeScript types created
- [ ] All services implemented
- [ ] All routes registered
- [ ] All tests passing
- [ ] System templates seeded
- [ ] Default AI config seeded
- [ ] Environment variables configured

### Environment Variables

```env
# AI Provider
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT_NAME=

# AI Configuration
AI_CREDENTIAL_ENCRYPTION_KEY=
AI_DEFAULT_MODEL=gpt-4o
AI_DEFAULT_EMBEDDING_MODEL=text-embedding-3-small

# Rate Limits
AI_MAX_TOKENS_PER_REQUEST=8000
AI_MAX_REQUESTS_PER_MINUTE=60
AI_MAX_COST_PER_DAY=100
```

### Database Collections

- [ ] `conversations` collection created
- [ ] `contextTemplates` collection created
- [ ] `aiConfigs` collection created
- [ ] Indexes created

### Post-deployment

- [ ] Verify streaming works
- [ ] Verify RAG retrieval works
- [ ] Verify citations are generated
- [ ] Monitor error rates
- [ ] Monitor latency
- [ ] Monitor costs

---

## Related Documentation

- [AI Insights Overview](./README.md)
- [API Reference](./API.md)
- [Web Search Integration](./WEB-SEARCH.md)
- [Deep Web Search System](./WEB-SEARCH-DEEP-SEARCH.md) (NEW)
- [Recurring Search Overview](./RECURRING-SEARCH-OVERVIEW.md)
- [Recurring Search Database](./RECURRING-SEARCH-DATABASE.md)
- [Recurring Search Services](./RECURRING-SEARCH-SERVICES.md)
- [Context Assembly](./CONTEXT-ASSEMBLY.md)
- [Prompt Engineering](./PROMPT-ENGINEERING.md)
- [Grounding & Accuracy](./GROUNDING.md)
- [UI Specification](./UI-SPECIFICATION.md)
- [Advanced Features](./ADVANCED-FEATURES.md)











