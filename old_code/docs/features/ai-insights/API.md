# AI Insights API Reference

## Overview

This document provides the complete API reference for the AI Insights system. All endpoints are prefixed with `/api/v1`.

> **Authentication**: All endpoints require Bearer token authentication.
> **Content-Type**: `application/json` unless otherwise specified.

---

## Table of Contents

1. [Chat API](#chat-api)
2. [Conversations API](#conversations-api)
3. [Quick Insights API](#quick-insights-api)
4. [Widget API](#widget-api)
5. [Configuration API](#configuration-api)
6. [Proactive Agents API](#proactive-agents-api)
7. [Feedback API](#feedback-api)
8. [Templates API](#templates-api)
9. [Models API](#models-api)
10. [Model Management API](#model-management-api)
11. [Cost & Usage API](#cost--usage-api)
12. [Prompt Management API](#prompt-management-api)
13. [Intent Pattern Management API](#intent-pattern-management-api-super-admin)
14. [Web Search API](#web-search-api)
15. [Recurring Search API](#recurring-search-api)
16. [Tenant Admin Configuration API](#tenant-admin-configuration-api)
17. [Streaming Protocol](#streaming-protocol)
18. [Error Responses](#error-responses)

---

## Chat API

### Send Message (Streaming)

Send a message and receive a streaming AI response.

```http
POST /api/v1/insights/chat
Content-Type: application/json
Accept: text/event-stream
```

**Request Body**:

```typescript
interface SendChatMessageRequest {
  // Conversation context
  conversationId?: string;           // Existing conversation (creates new if omitted)
  
  // Message content
  content: string;                   // User message
  contentType?: 'text' | 'markdown'; // Default: 'text'
  
  // Attachments
  attachments?: {
    type: 'file' | 'image' | 'document';
    url: string;
    name: string;
    mimeType: string;
  }[];
  
  // Context scope
  scope?: {
    shardId?: string;                // Focus on specific shard
    shardTypeId?: string;            // Focus on shard type
    projectId?: string;              // Project context
    companyId?: string;              // Company context
  };
  
  // AI configuration overrides
  assistantId?: string;              // Use specific assistant
  modelId?: string;                  // Override model
  templateId?: string;               // Override context template
  
  // Branching
  parentMessageId?: string;          // Create branch from message
  
  // Options
  options?: {
    temperature?: number;            // 0-2, default from config
    maxTokens?: number;              // Max response tokens
    includeReasoningSteps?: boolean; // Show chain-of-thought
    webSearchEnabled?: boolean;      // Allow web search
    toolsEnabled?: boolean;          // Allow tool calling
  };
}
```

**Response** (Server-Sent Events):

```typescript
// Event: message_start
interface MessageStartEvent {
  type: 'message_start';
  messageId: string;
  conversationId: string;
  model: string;
  timestamp: string;
}

// Event: content_delta
interface ContentDeltaEvent {
  type: 'content_delta';
  delta: string;                     // Text chunk
  index: number;                     // Chunk index
}

// Event: tool_use
interface ToolUseEvent {
  type: 'tool_use';
  toolCallId: string;
  name: string;
  arguments: Record<string, any>;
  status: 'running' | 'complete' | 'error';
  result?: any;
}

// Event: context_retrieved
interface ContextRetrievedEvent {
  type: 'context_retrieved';
  sources: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    score: number;
    highlight?: string;
  }[];
  totalChunks: number;
  totalTokens: number;
}

// Event: citation
interface CitationEvent {
  type: 'citation';
  citations: {
    id: string;
    text: string;
    sourceShardId: string;
    sourceShardName: string;
    confidence: number;
  }[];
}

// Event: message_complete
interface MessageCompleteEvent {
  type: 'message_complete';
  messageId: string;
  content: string;                   // Full response
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;                      // Estimated cost in USD
  latencyMs: number;
  groundingScore: number;            // 0-1 accuracy score
}

// Event: error
interface ErrorEvent {
  type: 'error';
  code: string;
  message: string;
  retryable: boolean;
}
```

**Example Request**:

```bash
curl -X POST https://api.castiel.io/api/v1/insights/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "conversationId": "conv_abc123",
    "content": "What are the main risks for Project Alpha?",
    "scope": {
      "projectId": "proj_xyz789"
    }
  }'
```

**Example Response Stream**:

```
event: message_start
data: {"type":"message_start","messageId":"msg_001","conversationId":"conv_abc123","model":"gpt-4o","timestamp":"2024-01-15T10:30:00Z"}

event: context_retrieved
data: {"type":"context_retrieved","sources":[{"shardId":"doc_001","shardName":"Risk Assessment Q4","shardTypeId":"c_document","score":0.92}],"totalChunks":5,"totalTokens":1200}

event: content_delta
data: {"type":"content_delta","delta":"Based on the project documentation, ","index":0}

event: content_delta
data: {"type":"content_delta","delta":"I've identified **3 main risks** for Project Alpha:\n\n","index":1}

event: citation
data: {"type":"citation","citations":[{"id":"cite_1","text":"Budget overrun risk of 15%","sourceShardId":"doc_001","sourceShardName":"Risk Assessment Q4","confidence":0.95}]}

event: message_complete
data: {"type":"message_complete","messageId":"msg_001","usage":{"promptTokens":1500,"completionTokens":350,"totalTokens":1850},"cost":0.0185,"latencyMs":2340,"groundingScore":0.91}
```

---

### Regenerate Message

Regenerate an AI response with different parameters.

```http
POST /api/v1/insights/chat/messages/{messageId}/regenerate
```

**Request Body**:

```typescript
interface RegenerateMessageRequest {
  modelId?: string;                  // Use different model
  temperature?: number;              // Different creativity
  createBranch?: boolean;            // Create new branch vs replace
  instructions?: string;             // Additional instructions
}
```

**Response**: Same streaming format as Send Message.

---

### Stop Generation

Stop an in-progress streaming response.

```http
POST /api/v1/insights/chat/messages/{messageId}/stop
```

**Response**:

```json
{
  "success": true,
  "messageId": "msg_001",
  "status": "cancelled",
  "partialContent": "Based on the project documentation, I've identified..."
}
```

---

## Conversations API

### List Conversations

```http
GET /api/v1/insights/conversations
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string[] | Filter by status: `active`, `archived`, `deleted` |
| `visibility` | string[] | Filter: `private`, `shared`, `public` |
| `assistantId` | string | Filter by assistant |
| `search` | string | Search in title/messages |
| `tags` | string[] | Filter by tags |
| `fromDate` | ISO date | Created after |
| `toDate` | ISO date | Created before |
| `limit` | number | Page size (default: 20, max: 100) |
| `offset` | number | Pagination offset |
| `orderBy` | string | `createdAt`, `updatedAt`, `lastActivityAt`, `messageCount` |
| `orderDir` | string | `asc` or `desc` |

**Response**:

```typescript
interface ConversationListResponse {
  conversations: ConversationSummary[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface ConversationSummary {
  id: string;
  title: string;
  summary?: string;
  status: 'active' | 'archived' | 'deleted';
  visibility: 'private' | 'shared' | 'public';
  
  assistantId?: string;
  assistantName?: string;
  
  messageCount: number;
  participantCount: number;
  
  lastMessage?: {
    content: string;
    role: 'user' | 'assistant';
    createdAt: string;
  };
  
  stats: {
    totalTokens: number;
    totalCost: number;
    averageRating?: number;
  };
  
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}
```

---

### Get Conversation

```http
GET /api/v1/insights/conversations/{conversationId}
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `includeMessages` | boolean | Include message history (default: true) |
| `messageLimit` | number | Max messages to return (default: 50) |
| `messageOffset` | number | Message pagination |
| `branchIndex` | number | Filter to specific branch |

**Response**:

```typescript
interface ConversationResponse {
  id: string;
  title: string;
  summary?: string;
  status: 'active' | 'archived' | 'deleted';
  visibility: 'private' | 'shared' | 'public';
  
  // AI Configuration
  assistant?: {
    id: string;
    name: string;
    description?: string;
  };
  template?: {
    id: string;
    name: string;
  };
  defaultModel?: {
    id: string;
    name: string;
  };
  
  // Participants
  participants: {
    userId: string;
    displayName: string;
    avatar?: string;
    role: 'owner' | 'participant' | 'viewer';
    isActive: boolean;
    joinedAt: string;
  }[];
  
  // Messages
  messages: ConversationMessageResponse[];
  totalMessages: number;
  hasMoreMessages: boolean;
  
  // Branches
  branches?: {
    id: string;
    name?: string;
    parentMessageId: string;
    branchIndex: number;
    messageCount: number;
    createdAt: string;
  }[];
  
  // Related shards
  relatedShards: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    shardTypeName: string;
  }[];
  
  // Stats
  stats: ConversationStats;
  
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface ConversationMessageResponse {
  id: string;
  parentId?: string;
  branchIndex: number;
  
  role: 'user' | 'assistant' | 'system' | 'tool';
  
  user?: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  
  model?: {
    id: string;
    name: string;
    provider: string;
  };
  
  content: string;
  contentType: 'text' | 'markdown' | 'code' | 'error';
  
  attachments?: {
    id: string;
    type: string;
    name: string;
    url: string;
    size: number;
  }[];
  
  toolCalls?: {
    id: string;
    name: string;
    arguments: Record<string, any>;
    status: string;
    result?: any;
    error?: string;
  }[];
  
  contextSources?: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    score: number;
    highlight?: string;
  }[];
  
  citations?: {
    id: string;
    text: string;
    sourceShardId: string;
    sourceShardName: string;
    confidence: number;
  }[];
  
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  latencyMs?: number;
  groundingScore?: number;
  
  feedback?: {
    rating?: number;
    thumbs?: 'up' | 'down';
    categories?: string[];
    comment?: string;
  };
  
  status: 'pending' | 'streaming' | 'complete' | 'error' | 'cancelled';
  errorMessage?: string;
  
  isRegenerated: boolean;
  regenerationCount: number;
  
  createdAt: string;
  updatedAt?: string;
}
```

---

### Create Conversation

```http
POST /api/v1/insights/conversations
```

**Request Body**:

```typescript
interface CreateConversationRequest {
  title?: string;
  visibility?: 'private' | 'shared' | 'public';
  
  assistantId?: string;
  templateId?: string;
  defaultModelId?: string;
  
  linkedShards?: string[];           // Related projects, companies, etc.
  tags?: string[];
  
  // Optional first message
  initialMessage?: {
    content: string;
    contentType?: 'text' | 'markdown';
    attachments?: AttachmentInput[];
  };
}
```

**Response**:

```json
{
  "id": "conv_abc123",
  "title": "New Conversation",
  "status": "active",
  "visibility": "private",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### Update Conversation

```http
PATCH /api/v1/insights/conversations/{conversationId}
```

**Request Body**:

```typescript
interface UpdateConversationRequest {
  title?: string;
  visibility?: 'private' | 'shared' | 'public';
  status?: 'active' | 'archived';
  assistantId?: string;
  templateId?: string;
  defaultModelId?: string;
  tags?: string[];
}
```

---

### Delete Conversation

```http
DELETE /api/v1/insights/conversations/{conversationId}
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `permanent` | boolean | Hard delete (default: false = soft delete) |

---

### Add Participant

```http
POST /api/v1/insights/conversations/{conversationId}/participants
```

**Request Body**:

```typescript
interface AddParticipantRequest {
  userId: string;
  role: 'participant' | 'viewer';
}
```

---

### Remove Participant

```http
DELETE /api/v1/insights/conversations/{conversationId}/participants/{userId}
```

---

## Quick Insights API

### Get Quick Insight

Generate a quick insight for a shard without starting a conversation.

```http
POST /api/v1/insights/quick
```

**Request Body**:

```typescript
interface QuickInsightRequest {
  // Target
  shardId: string;                   // Required: which shard
  
  // Insight type
  type: 
    | 'summary'                      // Brief overview
    | 'key_points'                   // Bullet points
    | 'risks'                        // Risk analysis
    | 'opportunities'                // Opportunity analysis
    | 'next_steps'                   // Recommended actions
    | 'comparison'                   // Compare with similar
    | 'trends'                       // Trend analysis
    | 'custom';                      // Custom prompt
  
  // For custom type
  customPrompt?: string;
  
  // Options
  options?: {
    format?: 'brief' | 'detailed' | 'bullets' | 'table';
    maxLength?: number;              // Max response tokens
    includeRelated?: boolean;        // Include related shards
    modelId?: string;                // Override model
  };
}
```

**Response**:

```typescript
interface QuickInsightResponse {
  id: string;
  shardId: string;
  type: string;
  
  // Generated content
  content: string;
  format: string;
  
  // Sources used
  sources: {
    shardId: string;
    shardName: string;
    shardTypeId: string;
    relevance: number;
  }[];
  
  // Confidence
  confidence: number;
  groundingScore: number;
  
  // Usage
  usage: TokenUsage;
  cost: number;
  latencyMs: number;
  
  // Suggested follow-ups
  suggestedQuestions: string[];
  
  // Actions
  suggestedActions?: {
    type: string;
    label: string;
    description: string;
    parameters: Record<string, any>;
  }[];
  
  createdAt: string;
  expiresAt?: string;                // For cached insights
}
```

---

### Get Suggested Questions

Get AI-generated suggested questions for a shard.

```http
GET /api/v1/insights/suggestions/{shardId}
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max suggestions (default: 5) |
| `context` | string | Additional context |

**Response**:

```json
{
  "shardId": "shard_123",
  "suggestions": [
    {
      "question": "What are the key risks for this project?",
      "category": "analysis",
      "priority": 1
    },
    {
      "question": "Summarize recent activity",
      "category": "summary",
      "priority": 2
    },
    {
      "question": "Who are the main stakeholders?",
      "category": "extraction",
      "priority": 3
    }
  ],
  "generatedAt": "2024-01-15T10:30:00Z"
}
```

---

## Widget API

### Get Widget Data

```http
GET /api/v1/insights/widgets/{widgetId}
```

**Response**:

```typescript
interface WidgetDataResponse {
  widgetId: string;
  type: 'summary' | 'metrics' | 'trends' | 'risks' | 'opportunities' | 'activity';
  
  // Widget configuration
  config: {
    title: string;
    scope: ContextScope;
    refreshInterval?: number;        // Seconds
    maxItems?: number;
  };
  
  // Generated data
  data: {
    content?: string;                // For text widgets
    items?: any[];                   // For list widgets
    metrics?: Record<string, number>;// For metric widgets
    chart?: ChartData;               // For chart widgets
  };
  
  // Metadata
  sources: SourceReference[];
  confidence: number;
  
  generatedAt: string;
  expiresAt: string;
  
  // Status
  status: 'fresh' | 'stale' | 'refreshing' | 'error';
  error?: string;
}
```

---

### Refresh Widget

```http
POST /api/v1/insights/widgets/{widgetId}/refresh
```

**Request Body**:

```typescript
interface RefreshWidgetRequest {
  force?: boolean;                   // Bypass cache
}
```

---

### Create Widget

```http
POST /api/v1/insights/widgets
```

**Request Body**:

```typescript
interface CreateWidgetRequest {
  dashboardId: string;
  type: WidgetType;
  title: string;
  
  scope: {
    shardId?: string;
    shardTypeId?: string;
    projectId?: string;
    companyId?: string;
  };
  
  config: {
    refreshInterval?: number;
    maxItems?: number;
    format?: string;
    customPrompt?: string;
  };
  
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}
```

---

## Configuration API

### Get User AI Configuration

Get the merged AI configuration for the current user.

```http
GET /api/v1/ai-config
```

**Response**:

```typescript
interface UserAIConfigResponse {
  // Resolved model
  defaultModel: {
    id: string;
    name: string;
    provider: string;
    source: 'system' | 'tenant' | 'user';
  };
  
  // Available models
  availableModels: {
    id: string;
    name: string;
    provider: string;
    capabilities: string[];
    isDefault: boolean;
  }[];
  
  // Assistants
  availableAssistants: {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
  }[];
  
  // Templates
  availableTemplates: {
    id: string;
    name: string;
    description?: string;
    category: string;
  }[];
  
  // Persona & style
  persona: PersonaConfig;
  style: StyleConfig;
  
  // Features
  features: {
    webSearchEnabled: boolean;
    toolsEnabled: boolean;
    streamingEnabled: boolean;
    reasoningStepsEnabled: boolean;
  };
  
  // Limits
  limits: {
    maxTokensPerRequest: number;
    maxRequestsPerMinute: number;
    maxCostPerDay: number;
  };
}
```

---

### Get System AI Configuration (Super Admin)

```http
GET /api/v1/ai-config/system
```

**Response**:

```typescript
interface SystemAIConfigResponse {
  id: string;
  
  // Default models by type
  defaultModels: {
    llm: string;
    embedding: string;
    imageGeneration?: string;
    textToSpeech?: string;
    speechToText?: string;
  };
  
  // Enabled providers
  enabledProviders: {
    providerId: string;
    providerName: string;
    isEnabled: boolean;
    models: string[];
  }[];
  
  // Global settings
  globalSettings: {
    maxTokensPerRequest: number;
    maxRequestsPerMinute: number;
    maxCostPerDay: number;
    allowTenantOverrides: boolean;
  };
  
  // Default persona
  defaultPersona: PersonaConfig;
  defaultStyle: StyleConfig;
  defaultSafety: SafetyConfig;
  
  // Features
  features: {
    webSearchEnabled: boolean;
    toolCallingEnabled: boolean;
    proactiveInsightsEnabled: boolean;
  };
  
  updatedAt: string;
  updatedBy: string;
}
```

---

### Update System AI Configuration (Super Admin)

```http
PUT /api/v1/ai-config/system
```

**Request Body**:

```typescript
interface UpdateSystemAIConfigRequest {
  defaultModels?: {
    llm?: string;
    embedding?: string;
    imageGeneration?: string;
    textToSpeech?: string;
    speechToText?: string;
  };
  
  enabledProviders?: {
    providerId: string;
    isEnabled: boolean;
    models?: string[];
  }[];
  
  globalSettings?: {
    maxTokensPerRequest?: number;
    maxRequestsPerMinute?: number;
    maxCostPerDay?: number;
    allowTenantOverrides?: boolean;
  };
  
  defaultPersona?: Partial<PersonaConfig>;
  defaultStyle?: Partial<StyleConfig>;
  defaultSafety?: Partial<SafetyConfig>;
  
  features?: {
    webSearchEnabled?: boolean;
    toolCallingEnabled?: boolean;
    proactiveInsightsEnabled?: boolean;
  };
}
```

---

### Get Tenant AI Configuration (Tenant Admin)

```http
GET /api/v1/ai-config/tenant/{tenantId}
```

---

### Update Tenant AI Configuration (Tenant Admin)

```http
PUT /api/v1/ai-config/tenant/{tenantId}
```

**Request Body**:

```typescript
interface UpdateTenantAIConfigRequest {
  // Override default model
  defaultModelId?: string;
  
  // Custom credentials (BYOK)
  credentials?: {
    providerId: string;
    apiKey: string;                  // Will be encrypted
    endpoint?: string;
    organizationId?: string;
  };
  
  // Tenant-specific settings
  settings?: {
    maxTokensPerRequest?: number;
    maxRequestsPerMinute?: number;
    maxCostPerDay?: number;
  };
  
  // Persona overrides
  persona?: Partial<PersonaConfig>;
  style?: Partial<StyleConfig>;
  
  // Domain knowledge
  domainKnowledge?: {
    industry?: string;
    terminology?: Record<string, string>;
    guidelines?: string[];
  };
}
```

---

## Proactive Agents API

### List Agents

```http
GET /api/v1/insights/agents
```

**Response**:

```typescript
interface AgentListResponse {
  agents: {
    id: string;
    name: string;
    description?: string;
    type: 'monitor' | 'scheduled' | 'event_triggered';
    status: 'active' | 'paused' | 'error';
    
    trigger: {
      type: string;
      config: Record<string, any>;
    };
    
    scope: ContextScope;
    
    stats: {
      lastRun?: string;
      totalRuns: number;
      insightsGenerated: number;
      errorsCount: number;
    };
    
    createdAt: string;
    updatedAt: string;
  }[];
  total: number;
}
```

---

### Create Agent

```http
POST /api/v1/insights/agents
```

**Request Body**:

```typescript
interface CreateAgentRequest {
  name: string;
  description?: string;
  
  type: 'monitor' | 'scheduled' | 'event_triggered';
  
  trigger: {
    // For scheduled
    schedule?: {
      cron?: string;
      interval?: number;             // Minutes
    };
    
    // For event_triggered
    events?: string[];               // Event types to listen
    
    // For monitor
    conditions?: {
      field: string;
      operator: string;
      value: any;
      threshold?: number;
    }[];
  };
  
  scope: {
    shardTypeIds?: string[];
    projectIds?: string[];
    companyIds?: string[];
    tags?: string[];
  };
  
  insightConfig: {
    type: InsightType;
    templateId?: string;
    modelId?: string;
    customPrompt?: string;
  };
  
  notification: {
    channels: ('email' | 'in_app' | 'webhook')[];
    recipients?: string[];           // User IDs or emails
    webhookUrl?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
  
  isActive?: boolean;
}
```

---

### Update Agent

```http
PUT /api/v1/insights/agents/{agentId}
```

---

### Delete Agent

```http
DELETE /api/v1/insights/agents/{agentId}
```

---

### Run Agent Manually

```http
POST /api/v1/insights/agents/{agentId}/run
```

---

### Pause/Resume Agent

```http
POST /api/v1/insights/agents/{agentId}/pause
POST /api/v1/insights/agents/{agentId}/resume
```

---

## Feedback API

### Submit Feedback

```http
POST /api/v1/insights/messages/{messageId}/feedback
```

**Request Body**:

```typescript
interface SubmitFeedbackRequest {
  // Rating
  rating?: number;                   // 1-5 stars
  thumbs?: 'up' | 'down';
  
  // Categories
  categories?: (
    | 'accurate'
    | 'helpful'
    | 'creative'
    | 'clear'
    | 'detailed'
    | 'concise'
    | 'inaccurate'
    | 'unhelpful'
    | 'confusing'
    | 'incomplete'
    | 'off_topic'
    | 'harmful'
  )[];
  
  // Comments
  comment?: string;
  
  // Actions
  regenerateRequested?: boolean;
  reportAsHarmful?: boolean;
}
```

**Response**:

```json
{
  "id": "feedback_123",
  "messageId": "msg_001",
  "status": "submitted",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### Get Feedback Analytics (Admin)

```http
GET /api/v1/insights/feedback/analytics
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `fromDate` | ISO date | Start date |
| `toDate` | ISO date | End date |
| `assistantId` | string | Filter by assistant |
| `modelId` | string | Filter by model |

**Response**:

```typescript
interface FeedbackAnalyticsResponse {
  period: {
    from: string;
    to: string;
  };
  
  summary: {
    totalFeedback: number;
    averageRating: number;
    thumbsUpPercentage: number;
    regenerationRate: number;
    harmfulReportRate: number;
  };
  
  categoryBreakdown: {
    category: string;
    count: number;
    percentage: number;
  }[];
  
  trendByDay: {
    date: string;
    averageRating: number;
    feedbackCount: number;
  }[];
  
  byModel: {
    modelId: string;
    modelName: string;
    averageRating: number;
    feedbackCount: number;
  }[];
  
  byAssistant: {
    assistantId: string;
    assistantName: string;
    averageRating: number;
    feedbackCount: number;
  }[];
}
```

---

## Templates API

### List Context Templates

```http
GET /api/v1/insights/templates
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category |
| `scope` | string | `system`, `tenant`, `user` |
| `search` | string | Search name/description |

**Response**:

```typescript
interface TemplateListResponse {
  templates: {
    id: string;
    name: string;
    description?: string;
    category: string;
    scope: 'system' | 'tenant' | 'user';
    isDefault: boolean;
    
    // Quick stats
    relationshipCount: number;
    fieldCount: number;
    maxTokens: number;
    
    usageCount: number;
    lastUsedAt?: string;
    
    createdAt: string;
    updatedAt: string;
  }[];
  total: number;
}
```

---

### Get Template

```http
GET /api/v1/insights/templates/{templateId}
```

**Response**: Full `c_contextTemplate` shard data.

---

### Create Template

```http
POST /api/v1/insights/templates
```

**Request Body**:

```typescript
interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: string;
  
  // Source selection
  sources: {
    // Primary source
    primary: {
      shardTypeId: string;
      fields: string[];
    };
    
    // Related sources
    relationships: {
      relationshipType: string;
      shardTypeId: string;
      fields: string[];
      depth?: number;
      limit?: number;
    }[];
  };
  
  // RAG configuration
  rag?: {
    enabled: boolean;
    maxChunks?: number;
    minScore?: number;
    shardTypeIds?: string[];
  };
  
  // Limits
  limits: {
    maxTokens: number;
    maxSources?: number;
  };
  
  // Output format
  outputFormat?: 'structured' | 'narrative' | 'list';
  
  tags?: string[];
}
```

---

### Update Template

```http
PUT /api/v1/insights/templates/{templateId}
```

---

### Delete Template

```http
DELETE /api/v1/insights/templates/{templateId}
```

---

## Models API

### List Available Models

```http
GET /api/v1/insights/models
```

**Response**:

```typescript
interface ModelListResponse {
  models: {
    id: string;
    name: string;
    provider: string;
    hoster: string;
    modelType: 'LLM' | 'EMBEDDING' | 'IMAGE_GENERATION' | 'TEXT_TO_SPEECH' | 'SPEECH_TO_TEXT' | 'MODERATION';
    
    capabilities: {
      supportsStreaming: boolean;
      supportsVision: boolean;
      supportsFunctionCalling: boolean;
      supportsJSON: boolean;
    };
    
    limits: {
      contextWindow: number;
      maxOutputTokens: number;
    };
    
    pricing: {
      inputPricePerMillion: number;
      outputPricePerMillion: number;
    };
    
    availability: {
      isActive: boolean;
      isDefault: boolean;
      allowTenantCustom: boolean;
    };
    
    tags: string[];
  }[];
}
```

---

### Get Model Details

```http
GET /api/v1/insights/models/{modelId}
```

---

## Model Management API

### List Available Models for Tenant

Get all AI models available to a tenant for insight generation (including tenant BYOK and system defaults).

```http
GET /api/v1/insights/models/available
Authorization: Bearer <token>
```

**Response**:

```typescript
interface AvailableModelsResponse {
  models: {
    connectionId: string;              // AI Connection ID
    modelId: string;                   // Model catalog ID
    name: string;                      // Connection display name
    model: {                           // Full model details
      id: string;
      name: string;
      modelIdentifier: string;         // e.g., "gpt-4o"
      provider: string;                // e.g., "openai"
      hoster: string;                  // e.g., "azure"
      type: 'LLM' | 'Embedding';
      status: 'active' | 'disabled';
      description: string;
      contextWindow: number;
      maxOutputs: number;
      pricing: {
        inputPricePerMillion: number;
        outputPricePerMillion: number;
      };
    };
    isDefault: boolean;                // Is this the default model?
    isTenantOwned: boolean;            // Tenant BYOK or system?
    capabilities: {
      streaming: boolean;
      vision: boolean;
      functions: boolean;
      jsonMode: boolean;
    };
    limits: {
      contextWindow: number;
      maxOutputs: number;
    };
    pricing: {
      inputPricePerMillion: number;
      outputPricePerMillion: number;
    };
  }[];
}
```

**Example Response**:

```json
{
  "models": [
    {
      "connectionId": "conn_tenant_gpt4",
      "modelId": "model_gpt4o",
      "name": "Our GPT-4o (BYOK)",
      "model": {
        "id": "model_gpt4o",
        "name": "GPT-4o",
        "modelIdentifier": "gpt-4o",
        "provider": "openai",
        "hoster": "azure",
        "type": "LLM",
        "status": "active",
        "description": "Most capable GPT-4 model",
        "contextWindow": 128000,
        "maxOutputs": 4096,
        "pricing": {
          "inputPricePerMillion": 5.0,
          "outputPricePerMillion": 15.0
        }
      },
      "isDefault": true,
      "isTenantOwned": true,
      "capabilities": {
        "streaming": true,
        "vision": true,
        "functions": true,
        "jsonMode": true
      },
      "limits": {
        "contextWindow": 128000,
        "maxOutputs": 4096
      },
      "pricing": {
        "inputPricePerMillion": 5.0,
        "outputPricePerMillion": 15.0
      }
    },
    {
      "connectionId": "conn_system_gpt35",
      "modelId": "model_gpt35turbo",
      "name": "GPT-3.5 Turbo (System)",
      "model": {
        "id": "model_gpt35turbo",
        "name": "GPT-3.5 Turbo",
        "modelIdentifier": "gpt-3.5-turbo",
        "provider": "openai",
        "hoster": "azure",
        "type": "LLM",
        "status": "active",
        "description": "Fast and cost-effective",
        "contextWindow": 16385,
        "maxOutputs": 4096,
        "pricing": {
          "inputPricePerMillion": 0.5,
          "outputPricePerMillion": 1.5
        }
      },
      "isDefault": false,
      "isTenantOwned": false,
      "capabilities": {
        "streaming": true,
        "vision": false,
        "functions": true,
        "jsonMode": true
      },
      "limits": {
        "contextWindow": 16385,
        "maxOutputs": 4096
      },
      "pricing": {
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 1.5
      }
    }
  ]
}
```

---

### Recommend Model for Requirements

Get the optimal model recommendation based on insight requirements.

```http
POST /api/v1/insights/models/recommend
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:

```typescript
interface ModelRecommendationRequest {
  insightType: 'summary' | 'analysis' | 'comparison' | 'recommendation' | 'prediction' | 'extraction' | 'search' | 'generation';
  contextTokens: number;             // Estimated context size
  requiresVision?: boolean;          // Needs image processing
  requiresFunctions?: boolean;       // Needs function calling
  requiresStreaming?: boolean;       // Needs streaming support
  requiresJSONMode?: boolean;        // Needs JSON mode
  maxCost?: number;                  // Maximum acceptable cost (USD)
  preferredProvider?: string;        // 'openai', 'anthropic', 'google'
}
```

**Response**:

```typescript
interface ModelRecommendationResponse {
  recommended: {
    connectionId: string;
    modelId: string;
    name: string;
    reason: string;                  // Why this model was selected
    estimatedCost: number;           // Estimated cost in USD
  };
  alternatives: {
    modelId: string;
    reason: string;
  }[];
}
```

**Example Request**:

```json
{
  "insightType": "analysis",
  "contextTokens": 8000,
  "requiresFunctions": true,
  "maxCost": 0.10
}
```

**Example Response**:

```json
{
  "recommended": {
    "connectionId": "conn_tenant_gpt4",
    "modelId": "model_gpt4o",
    "name": "GPT-4o",
    "reason": "Optimal for analysis with 8000 tokens",
    "estimatedCost": 0.055
  },
  "alternatives": [
    {
      "modelId": "model_claude3sonnet",
      "reason": "Claude 3 Sonnet"
    },
    {
      "modelId": "model_gpt4turbo",
      "reason": "GPT-4 Turbo"
    }
  ]
}
```

---

## Cost & Usage API

### Get Usage Statistics

Get AI usage and cost statistics for the tenant.

```http
GET /api/v1/insights/usage?from=<iso-date>&to=<iso-date>
Authorization: Bearer <token>
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | ISO 8601 date | No | Start date (default: beginning of current month) |
| `to` | ISO 8601 date | No | End date (default: now) |

**Response**:

```typescript
interface UsageStatsResponse {
  totalCost: number;                 // Total cost in USD
  totalTokens: number;               // Total tokens consumed
  insightCount: number;              // Number of insights generated
  
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
    insightType: string;
    cost: number;
    tokens: number;
    requests: number;
  }[];
  
  // Daily breakdown
  dailyBreakdown: {
    date: string;                    // ISO date
    cost: number;
    tokens: number;
    requests: number;
  }[];
  
  // Budget status (if configured)
  budget?: {
    limit: number;
    used: number;
    remaining: number;
    percentUsed: number;
  };
}
```

**Example Request**:

```bash
curl -X GET "https://api.castiel.io/api/v1/insights/usage?from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:

```json
{
  "totalCost": 45.67,
  "totalTokens": 2500000,
  "insightCount": 1234,
  "byModel": [
    {
      "modelId": "model_gpt4o",
      "modelName": "GPT-4o",
      "cost": 35.20,
      "tokens": 1800000,
      "requests": 890
    },
    {
      "modelId": "model_gpt35turbo",
      "modelName": "GPT-3.5 Turbo",
      "cost": 10.47,
      "tokens": 700000,
      "requests": 344
    }
  ],
  "byInsightType": [
    {
      "insightType": "summary",
      "cost": 12.30,
      "tokens": 650000,
      "requests": 456
    },
    {
      "insightType": "analysis",
      "cost": 28.90,
      "tokens": 1500000,
      "requests": 567
    },
    {
      "insightType": "recommendation",
      "cost": 4.47,
      "tokens": 350000,
      "requests": 211
    }
  ],
  "dailyBreakdown": [
    {
      "date": "2024-01-01",
      "cost": 1.45,
      "tokens": 75000,
      "requests": 38
    },
    {
      "date": "2024-01-02",
      "cost": 2.10,
      "tokens": 112000,
      "requests": 52
    }
  ],
  "budget": {
    "limit": 100.0,
    "used": 45.67,
    "remaining": 54.33,
    "percentUsed": 45.67
  }
}
```

---

### Check Budget

Check if tenant has sufficient budget for an estimated cost.

```http
POST /api/v1/insights/budget/check
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:

```typescript
interface BudgetCheckRequest {
  estimatedCost: number;             // Estimated cost in USD
}
```

**Response**:

```typescript
interface BudgetCheckResponse {
  hasCapacity: boolean;              // Can the request proceed?
  estimatedCost: number;             // The requested cost
}
```

**Example Request**:

```json
{
  "estimatedCost": 0.15
}
```

**Example Response**:

```json
{
  "hasCapacity": true,
  "estimatedCost": 0.15
}
```

---

## Streaming Protocol

### Server-Sent Events (SSE)

All streaming endpoints use SSE format:

```
event: <event_type>
data: <json_data>

event: <event_type>
data: <json_data>
```

### Event Types

| Event | Description |
|-------|-------------|
| `message_start` | Response generation started |
| `content_delta` | Text chunk received |
| `tool_use` | Tool/function call status |
| `context_retrieved` | RAG sources retrieved |
| `citation` | Citations extracted |
| `reasoning_step` | Chain-of-thought step (if enabled) |
| `message_complete` | Response complete |
| `error` | Error occurred |
| `done` | Stream ended |

### Connection Handling

```typescript
// Client-side example
const eventSource = new EventSource('/api/v1/insights/chat', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

eventSource.addEventListener('content_delta', (event) => {
  const data = JSON.parse(event.data);
  appendToUI(data.delta);
});

eventSource.addEventListener('message_complete', (event) => {
  const data = JSON.parse(event.data);
  showStats(data.usage, data.cost);
  eventSource.close();
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  showError(data.message);
  eventSource.close();
});
```

### Heartbeat

Server sends heartbeat every 15 seconds to keep connection alive:

```
: heartbeat
```

---

## Prompt Management API

> **Authorization**: Super Admin only

### List Prompts

Get all prompt templates with optional filtering.

```http
GET /api/v1/insights/prompts
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `tenantId` | string | Filter by tenant ID (or "SYSTEM") |
| `insightType` | string | Filter by insight type |
| `status` | string | Filter by status: `draft`, `testing`, `active`, `deprecated` |
| `category` | string | Filter by category: `system`, `tenant` |

**Response**:

```json
[
  {
    "id": "prompt_abc123",
    "tenantId": "SYSTEM",
    "name": "Dashboard Summary System Prompt",
    "description": "Default system prompt for dashboard summaries",
    "insightType": "summary",
    "category": "system",
    "template": "You are an AI assistant...\n\nDashboard: {{dashboardName}}...",
    "variables": [
      {
        "name": "dashboardName",
        "type": "string",
        "required": true,
        "description": "Name of the dashboard being analyzed"
      },
      {
        "name": "userQuery",
        "type": "string",
        "required": true,
        "description": "User question or request"
      },
      {
        "name": "context",
        "type": "string",
        "required": true,
        "description": "JSON context with dashboard data"
      }
    ],
    "modelRequirements": {
      "preferredModels": ["gpt-4o", "claude-3-5-sonnet"],
      "minContextWindow": 8000,
      "requiredCapabilities": ["json_mode"]
    },
    "version": 3,
    "isActive": true,
    "status": "active",
    "previousVersionId": "prompt_xyz789",
    "changeLog": "Improved handling of null data values",
    "testResults": [
      {
        "testId": "test_001",
        "testDate": "2024-01-15T10:30:00Z",
        "testedBy": "admin_user_123",
        "testInputs": {
          "dashboardName": "Sales Dashboard",
          "userQuery": "What are the trends?",
          "context": "{...}"
        },
        "generatedPrompt": "You are an AI assistant...",
        "modelUsed": "gpt-4o",
        "response": "Based on the sales data...",
        "tokenUsage": {
          "prompt": 850,
          "completion": 320,
          "total": 1170
        },
        "cost": 0.0234,
        "responseTime": 2340,
        "success": true,
        "rating": 5,
        "notes": "Excellent response quality"
      }
    ],
    "performanceMetrics": {
      "avgResponseTime": 2100,
      "avgTokenUsage": 1150,
      "avgCost": 0.0220,
      "successRate": 98.5,
      "userSatisfactionScore": 4.6
    },
    "createdAt": "2024-01-10T08:00:00Z",
    "createdBy": "admin_user_123",
    "updatedAt": "2024-01-15T09:00:00Z",
    "updatedBy": "admin_user_123",
    "activatedAt": "2024-01-15T10:00:00Z",
    "activatedBy": "admin_user_123"
  }
]
```

---

### Get Prompt

Get a specific prompt template by ID.

```http
GET /api/v1/insights/prompts/:id
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | Yes | Tenant ID (partition key) |

**Response**: Single `PromptTemplate` object (same structure as list).

---

### Create Prompt

Create a new prompt template.

```http
POST /api/v1/insights/prompts
```

**Request Body**:

```json
{
  "tenantId": "SYSTEM",
  "name": "Analysis System Prompt",
  "description": "Default prompt for data analysis insights",
  "insightType": "analysis",
  "category": "system",
  "template": "You are an AI analyst...\n\nData: {{data}}\nQuestion: {{question}}",
  "variables": [
    {
      "name": "data",
      "type": "string",
      "required": true,
      "description": "JSON data to analyze"
    },
    {
      "name": "question",
      "type": "string",
      "required": true,
      "description": "Analysis question"
    }
  ],
  "modelRequirements": {
    "preferredModels": ["gpt-4o"],
    "minContextWindow": 16000,
    "requiredCapabilities": ["json_mode", "function_calling"]
  },
  "status": "draft"
}
```

**Response**: Created `PromptTemplate` object (201 Created).

**Errors**:
- `400 VALIDATION_ERROR`: Invalid template syntax or missing required fields
- `403 FORBIDDEN`: Not a super admin

---

### Update Prompt

Update an existing prompt (creates new version).

```http
PUT /api/v1/insights/prompts/:id
```

**Request Body**:

```json
{
  "tenantId": "SYSTEM",
  "name": "Analysis System Prompt v2",
  "template": "You are an expert AI analyst...",
  "variables": [...],
  "changeLog": "Improved analysis depth and clarity",
  "status": "draft"
}
```

**Response**: New version of `PromptTemplate` (200 OK).

**Notes**:
- Creates a new version with incremented `version` number
- Original prompt remains unchanged
- New version starts as `draft` with `isActive: false`
- Links to previous version via `previousVersionId`

---

### Activate Prompt

Activate a specific prompt version.

```http
POST /api/v1/insights/prompts/:id/activate
```

**Request Body**:

```json
{
  "tenantId": "SYSTEM"
}
```

**Response**: Updated `PromptTemplate` with `isActive: true` and `status: "active"`.

**Notes**:
- Automatically deactivates all other versions of the same prompt (same `tenantId` + `insightType`)
- Sets `activatedAt` and `activatedBy` fields

---

### Deactivate Prompt

Deactivate a prompt version.

```http
POST /api/v1/insights/prompts/:id/deactivate
```

**Request Body**:

```json
{
  "tenantId": "SYSTEM"
}
```

**Response**: Updated `PromptTemplate` with `isActive: false` and `status: "deprecated"`.

---

### Test Prompt

Test a prompt with sample inputs and get AI response.

```http
POST /api/v1/insights/prompts/:id/test
```

**Request Body**:

```json
{
  "tenantId": "SYSTEM",
  "testInputs": {
    "dashboardName": "Sales Dashboard",
    "userQuery": "What are the top 3 products?",
    "context": "{\"products\": [{\"name\": \"Product A\", \"revenue\": 12500}, ...]}"
  },
  "notes": "Testing with Q4 sales data",
  "rating": 5
}
```

**Response**:

```json
{
  "testId": "test_abc123",
  "testDate": "2024-01-15T14:30:00Z",
  "testedBy": "admin_user_123",
  "testInputs": {
    "dashboardName": "Sales Dashboard",
    "userQuery": "What are the top 3 products?",
    "context": "{...}"
  },
  "generatedPrompt": "You are an AI assistant helping users understand their dashboard data.\n\nDashboard: Sales Dashboard\nUser Question: What are the top 3 products?\n...",
  "modelUsed": "gpt-4o",
  "response": "Based on the sales data, here are the top 3 products:\n\n1. **Product A** - $12,500 in revenue\n2. **Product B** - $9,800 in revenue\n3. **Product C** - $7,200 in revenue\n\nProduct A shows particularly strong performance...",
  "tokenUsage": {
    "prompt": 920,
    "completion": 180,
    "total": 1100
  },
  "cost": 0.0198,
  "responseTime": 1850,
  "success": true,
  "notes": "Testing with Q4 sales data",
  "rating": 5
}
```

**Notes**:
- Test result is automatically saved to the prompt's `testResults` array
- Uses tenant's AI connection (BYOK if available, system fallback otherwise)
- Renders template with provided inputs using Handlebars
- Tracks token usage and cost

**Errors**:
- `400 VALIDATION_ERROR`: Missing required variables or invalid inputs
- `500 GENERATION_ERROR`: AI generation failed

---

### Rollback Prompt

Rollback to the previous version of a prompt.

```http
POST /api/v1/insights/prompts/:id/rollback
```

**Request Body**:

```json
{
  "tenantId": "SYSTEM"
}
```

**Response**: Activated previous version of `PromptTemplate`.

**Notes**:
- Activates the version referenced in `previousVersionId`
- Deactivates current version
- Fails if no previous version exists

---

### Create A/B Test

Create an A/B test to compare two prompt versions.

```http
POST /api/v1/insights/prompts/ab-tests
```

**Request Body**:

```json
{
  "controlVersionId": "prompt_abc123",
  "variantVersionId": "prompt_xyz789",
  "tenantId": "SYSTEM",
  "name": "Summary Prompt - Clarity Improvement Test",
  "description": "Testing new prompt template that emphasizes clarity and actionable insights",
  "trafficSplit": {
    "control": 50,
    "variant": 50
  },
  "primaryMetric": "userSatisfaction",
  "targetImprovement": 10
}
```

**Response**:

```json
{
  "id": "abtest_123",
  "name": "Summary Prompt - Clarity Improvement Test",
  "description": "Testing new prompt template that emphasizes clarity and actionable insights",
  "status": "draft",
  "controlVersionId": "prompt_abc123",
  "variantVersionId": "prompt_xyz789",
  "trafficSplit": {
    "control": 50,
    "variant": 50
  },
  "successMetrics": {
    "primaryMetric": "userSatisfaction",
    "targetImprovement": 10
  }
}
```

**Notes**:
- Both prompt versions must exist and be for the same `insightType`
- A/B test info is saved to both prompt versions
- Test starts in `draft` status

---

### Start A/B Test

Start an A/B test.

```http
POST /api/v1/insights/prompts/ab-tests/:id/start
```

**Request Body**:

```json
{
  "controlVersionId": "prompt_abc123",
  "tenantId": "SYSTEM"
}
```

**Response**: Updated A/B test with `status: "running"` and `startDate`.

**Notes**:
- During active A/B test, InsightService randomly selects between control and variant based on `trafficSplit`
- Test results are collected in both prompt versions' `testResults` arrays
- Metrics are compared to determine winner

---

### Complete A/B Test

Mark an A/B test as complete and decide on winner.

```http
POST /api/v1/insights/prompts/ab-tests/:id/complete
```

**Request Body**:

```json
{
  "controlVersionId": "prompt_abc123",
  "tenantId": "SYSTEM",
  "decision": {
    "action": "promote_variant",
    "notes": "Variant shows 15% improvement in user satisfaction (4.2 → 4.8)"
  }
}
```

**Response**: Updated A/B test with `status: "completed"` and decision details.

**Possible Actions**:
- `promote_variant`: Activate variant, deactivate control
- `keep_control`: Keep control active, deprecate variant
- `continue_testing`: Extend test duration (returns to `running` status)

---

## Intent Pattern Management API (Super Admin)

> **Authorization**: Super Admin only

### List Intent Patterns

Get all intent classification patterns with performance metrics.

```http
GET /api/v1/insights/admin/intent-patterns
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `intentType` | string | Filter by intent type (summary, analysis, etc.) |
| `isActive` | boolean | Filter by active status |
| `minAccuracy` | number | Filter patterns with accuracy >= value |
| `sortBy` | string | Sort by: `accuracy`, `coverage`, `createdAt` |

**Response**:

```json
{
  "patterns": [
    {
      "id": "pattern_risk_001",
      "name": "Risk Analysis Detection",
      "description": "Identifies queries asking about risks, concerns, or threats",
      "intentType": "analysis",
      "subtype": "risk",
      "patterns": [
        "/risk|danger|concern|worry|threat|issue|problem/i",
        "/what could go wrong|red flags|warning signs/i",
        "/should I (be )?(worried|concerned)/i"
      ],
      "keywords": ["risk", "concern", "issue", "problem", "threat"],
      "priority": 8,
      "confidenceWeight": 1.2,
      "metrics": {
        "totalMatches": 1245,
        "accuracyRate": 0.92,
        "avgConfidence": 0.88,
        "lastMatched": "2025-12-04T10:30:00Z"
      },
      "source": "manual",
      "isActive": true,
      "createdAt": "2025-01-15T00:00:00Z",
      "updatedAt": "2025-11-20T14:30:00Z",
      "version": 3
    }
  ],
  "metrics": {
    "totalPatterns": 24,
    "activePatterns": 22,
    "avgAccuracy": 0.89,
    "totalClassifications": 5420,
    "misclassifications": {
      "total": 312,
      "topMisclassifiedQueries": [
        {
          "query": "Who owns this deal?",
          "predictedIntent": "search",
          "actualIntent": "extraction",
          "confidence": 0.75,
          "frequency": 12
        }
      ]
    }
  }
}
```

---

### Create Intent Pattern (Manual)

Create a new intent pattern manually.

```http
POST /api/v1/insights/admin/intent-patterns
```

**Request Body**:

```json
{
  "name": "Ownership Query Detection",
  "description": "Identifies queries asking about ownership or responsibility",
  "intentType": "extraction",
  "subtype": "owner",
  "patterns": [
    "/who (owns|is (handling|responsible|assigned))/i",
    "/which (rep|person|team) .* (owns|handles)/i"
  ],
  "keywords": ["who", "owns", "responsible", "handling", "assigned"],
  "priority": 7,
  "confidenceWeight": 1.0
}
```

**Response**: Created `IntentPattern` object (201 Created).

---

### Generate Pattern from Sample Queries (LLM-Assisted)

Let LLM analyze sample queries and suggest intent patterns.

```http
POST /api/v1/insights/admin/intent-patterns/suggest-from-samples
```

**Request Body**:

```json
{
  "samples": [
    "What are the risks in this deal?",
    "Should I be worried about Project Alpha?",
    "Any red flags in the Acme opportunity?",
    "What could go wrong with this account?",
    "Identify threats to closing this quarter"
  ],
  "targetIntent": "analysis",
  "targetSubtype": "risk"
}
```

**Response**:

```json
{
  "suggestedPatterns": [
    {
      "pattern": "/risk|danger|concern|worry|threat|red flag|warning/i",
      "confidence": 0.95,
      "reasoning": "Common risk-related keywords detected across 5/5 samples",
      "coverage": 5,
      "matches": [
        { "query": "What are the risks...", "matched": true },
        { "query": "Should I be worried...", "matched": true }
      ]
    },
    {
      "pattern": "/should (I|we) (be )?(worried|concerned)/i",
      "confidence": 0.88,
      "reasoning": "Anxiety-expressing pattern found in 2/5 samples",
      "coverage": 2
    }
  ],
  "keywords": ["risk", "worry", "threat", "red flag", "warning", "concern"],
  "explanation": "The samples indicate a risk analysis intent with focus on potential problems and threats. Suggested patterns cover explicit risk keywords, anxiety expressions, and problem anticipation language.",
  "recommendedAction": "Combine these patterns into one intent pattern with priority 8-9 for accurate risk detection."
}
```

---

### Generate Pattern from Natural Language Description (LLM-Assisted)

Describe an intent in natural language and let LLM generate patterns.

```http
POST /api/v1/insights/admin/intent-patterns/generate-from-description
```

**Request Body**:

```json
{
  "description": "Users asking to compare two or more deals, projects, or companies. They want to understand differences, similarities, or relative performance.",
  "examples": [
    "Compare Project Alpha and Project Beta",
    "How does this deal stack up against similar ones?",
    "Which project is performing better?"
  ]
}
```

**Response**:

```json
{
  "suggestedPattern": {
    "name": "Comparison Intent Detection",
    "description": "Generated from natural language description",
    "intentType": "comparison",
    "patterns": [
      "/compar(e|ison)|versus|vs\\.?|against|stack up|differ(ence|ent)|similar/i",
      "/how does .* (compare|stack|measure)/i",
      "/(which|what) (is|are) (better|worse|best|worst)/i"
    ],
    "keywords": ["compare", "versus", "vs", "difference", "similar", "better", "worse"],
    "priority": 7,
    "confidenceWeight": 1.0,
    "reasoning": "Comparison intents typically use explicit comparison language (compare, versus, vs) or relative evaluation (better, worse). Also includes phrases like 'stack up' or 'measure against'."
  },
  "testResults": {
    "matchedExamples": 3,
    "totalExamples": 3,
    "matchPercentage": 100
  }
}
```

---

### Analyze Pattern Gaps (LLM-Assisted)

Identify misclassification patterns and get LLM suggestions for missing patterns.

```http
POST /api/v1/insights/admin/intent-patterns/analyze-gaps
```

**Request Body**:

```json
{
  "timeRange": "last_30_days",
  "minMisclassifications": 5
}
```

**Response**:

```json
{
  "gaps": [
    {
      "misclassifiedQueries": [
        "Who owns this deal?",
        "Which rep is handling the Acme account?",
        "Who's responsible for Project Alpha?"
      ],
      "currentClassification": "search",
      "suggestedClassification": "extraction",
      "suggestedSubtype": "owner",
      "reasoning": "These queries ask for ownership/responsibility information, which is a specific type of extraction. Current 'search' classification is too broad.",
      "suggestedPattern": {
        "name": "Ownership Query Detection",
        "pattern": "/who (owns|is (handling|responsible|assigned|managing))/i",
        "keywords": ["who", "owns", "responsible", "handling"],
        "intentType": "extraction",
        "subtype": "owner",
        "priority": 7
      },
      "frequency": 12,
      "impact": "medium",
      "projectedImprovement": {
        "affectedQueries": 12,
        "currentAccuracy": 0.58,
        "projectedAccuracy": 0.94
      }
    },
    {
      "misclassifiedQueries": [
        "Show me projects ending this month",
        "List opportunities closing in Q4"
      ],
      "currentClassification": "summary",
      "suggestedClassification": "search",
      "suggestedSubtype": "filtered",
      "reasoning": "Time-bounded listing queries should be classified as filtered search, not summary.",
      "frequency": 8,
      "impact": "low"
    }
  ],
  "summary": {
    "totalGaps": 2,
    "affectedQueries": 20,
    "potentialAccuracyGain": 0.08
  }
}
```

---

### Optimize Existing Pattern (LLM-Assisted)

Get LLM suggestions to improve an existing pattern's coverage or precision.

```http
POST /api/v1/insights/admin/intent-patterns/:id/optimize
```

**Request Body**:

```json
{
  "optimizationGoal": "increase_coverage"
}
```

**Optimization Goals**:
- `increase_coverage`: Expand pattern to match more queries
- `improve_precision`: Narrow pattern to reduce false positives
- `balance`: Balance coverage and precision

**Response**:

```json
{
  "currentPattern": {
    "id": "pattern_risk_001",
    "pattern": "/risk|danger|concern/i",
    "metrics": {
      "accuracy": 0.85,
      "coverage": 320,
      "precision": 0.88,
      "recall": 0.72
    }
  },
  "suggestedOptimizations": [
    {
      "type": "expand_coverage",
      "newPattern": "/risk|danger|concern|threat|issue|problem|red flag|warning/i",
      "addedKeywords": ["threat", "issue", "problem", "red flag", "warning"],
      "projectedMetrics": {
        "accuracy": 0.87,
        "coverage": 450,
        "precision": 0.86,
        "recall": 0.89
      },
      "reasoning": "Adding 'threat', 'issue', 'problem', 'red flag', 'warning' will capture 130 additional queries while maintaining precision.",
      "examples": [
        "What issues do you see in this project? → NOW MATCHES",
        "Any warning signs in the client communication? → NOW MATCHES"
      ]
    },
    {
      "type": "improve_precision",
      "newPattern": "/risk|danger|concern|threat/i",
      "excludePatterns": ["/minor concern|small risk/i"],
      "projectedMetrics": {
        "accuracy": 0.91,
        "coverage": 280,
        "precision": 0.94,
        "recall": 0.70
      },
      "reasoning": "Narrowing to stronger risk keywords and excluding minimizing language improves precision but reduces coverage.",
      "removedMatches": [
        "There's a minor concern about the timeline → NO LONGER MATCHES (good)"
      ]
    }
  ],
  "recommendation": "For maximum value, implement the 'expand_coverage' optimization to capture 130 additional queries with minimal precision loss."
}
```

---

### Test Intent Pattern

Test a pattern against historical or sample queries.

```http
POST /api/v1/insights/admin/intent-patterns/test
```

**Request Body**:

```json
{
  "pattern": {
    "patterns": ["/who (owns|is handling)/i"],
    "keywords": ["who", "owns", "handling"],
    "intentType": "extraction",
    "subtype": "owner"
  },
  "testQueries": [
    "Who owns this deal?",
    "Which rep is handling Acme?",
    "What's the status of Project Alpha?",
    "Show me all opportunities"
  ]
}
```

**Response**:

```json
{
  "results": [
    {
      "query": "Who owns this deal?",
      "matched": true,
      "confidence": 0.92,
      "intentType": "extraction",
      "subtype": "owner"
    },
    {
      "query": "Which rep is handling Acme?",
      "matched": true,
      "confidence": 0.89,
      "intentType": "extraction",
      "subtype": "owner"
    },
    {
      "query": "What's the status of Project Alpha?",
      "matched": false,
      "confidence": 0.45,
      "intentType": null,
      "reason": "No pattern match"
    },
    {
      "query": "Show me all opportunities",
      "matched": false,
      "confidence": 0.38,
      "intentType": null,
      "reason": "No pattern match"
    }
  ],
  "summary": {
    "totalQueries": 4,
    "matchedQueries": 2,
    "matchRate": 0.50,
    "avgConfidence": 0.66
  }
}
```

---

### Get Performance Metrics

Get comprehensive performance metrics for all intent patterns.

```http
GET /api/v1/insights/admin/intent-patterns/metrics
```

**Response**:

```json
{
  "overview": {
    "totalPatterns": 24,
    "activePatterns": 22,
    "avgAccuracy": 0.89,
    "totalClassifications": 5420,
    "classifiedQueries": 5108,
    "unclassifiedQueries": 312
  },
  "topPerformingPatterns": [
    {
      "id": "pattern_summary_001",
      "name": "Summary Intent",
      "accuracy": 0.96,
      "coverage": 1245,
      "avgConfidence": 0.92
    }
  ],
  "lowPerformancePatterns": [
    {
      "id": "pattern_old_comparison",
      "name": "Old Comparison Pattern",
      "accuracy": 0.68,
      "issue": "low_accuracy",
      "suggestedAction": "Review and update pattern or consider deprecation"
    }
  ],
  "coverageByIntent": {
    "summary": { "queries": 1245, "coverage": 0.95 },
    "analysis": { "queries": 892, "coverage": 0.88 },
    "recommendation": { "queries": 654, "coverage": 0.82 },
    "comparison": { "queries": 423, "coverage": 0.79 }
  },
  "misclassificationAnalysis": {
    "totalMisclassifications": 312,
    "byIntentType": {
      "search": 78,
      "extraction": 56,
      "comparison": 42
    },
    "topMisclassifiedQueries": [
      {
        "query": "Who owns this deal?",
        "predictedIntent": "search",
        "actualIntent": "extraction",
        "confidence": 0.75,
        "frequency": 12
      }
    ]
  }
}
```

---

### Get Auto-Learning Insights

Get LLM-suggested pattern improvements from auto-learning system.

```http
GET /api/v1/insights/admin/intent-patterns/learning-insights
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by: `pending`, `approved`, `rejected` |
| `type` | string | Filter by: `new_pattern`, `pattern_improvement`, `pattern_deprecation` |

**Response**:

```json
{
  "insights": [
    {
      "id": "insight_001",
      "type": "new_pattern",
      "status": "pending",
      "suggestion": {
        "action": "Create new intent pattern for ownership queries",
        "pattern": {
          "name": "Ownership Query Detection",
          "intentType": "extraction",
          "subtype": "owner",
          "patterns": ["/who (owns|is handling)/i"],
          "keywords": ["who", "owns", "handling"],
          "priority": 7
        },
        "reasoning": "Detected 15 queries asking about ownership/responsibility that are being misclassified as general search. Creating a specific pattern will improve accuracy."
      },
      "evidence": {
        "sampleQueries": [
          "Who owns this deal?",
          "Which rep is handling Acme?"
        ],
        "frequency": 15,
        "userFeedback": 8,
        "currentAccuracy": 0.60,
        "projectedAccuracy": 0.93
      },
      "createdAt": "2025-12-03T10:00:00Z"
    }
  ],
  "summary": {
    "pendingInsights": 3,
    "potentialImpact": "Approving these insights could improve classification accuracy by 6%"
  }
}
```

---

### Approve Learning Insight

Approve an auto-learning suggestion and activate the pattern.

```http
POST /api/v1/insights/admin/intent-patterns/learning-insights/:id/approve
```

**Response**:

```json
{
  "pattern": {
    "id": "pattern_new_001",
    "name": "Ownership Query Detection",
    "isActive": true,
    "source": "auto_learned"
  },
  "message": "Pattern created and activated successfully"
}
```

---

### Reject Learning Insight

Reject an auto-learning suggestion.

```http
POST /api/v1/insights/admin/intent-patterns/learning-insights/:id/reject
```

**Request Body**:

```json
{
  "reason": "Pattern too narrow, doesn't cover enough cases"
}
```

**Response**: 200 OK

---

### Update Intent Pattern

Update an existing intent pattern.

```http
PATCH /api/v1/insights/admin/intent-patterns/:id
```

**Request Body** (partial update supported):

```json
{
  "patterns": [
    "/risk|danger|concern|threat|issue/i",
    "/what could go wrong/i"
  ],
  "keywords": ["risk", "concern", "threat", "issue"],
  "priority": 9
}
```

**Response**: Updated `IntentPattern` object (200 OK).

---

### Delete Intent Pattern

Delete an intent pattern (soft delete - archives for audit).

```http
DELETE /api/v1/insights/admin/intent-patterns/:id
```

**Response**: 204 No Content

---

## Web Search API

> **Authorization**: Users can request searches (rate limited); Super Admin manages providers; Tenant Admin configures behavior
> **Related Documentation**: [Web Search Integration](./WEB-SEARCH.md)

### Perform Search or Get Cached Result

Execute a web search with the configured providers or retrieve a previously cached result.

```http
POST /api/v1/insights/search
Content-Type: application/json
```

**Request Body**:

```typescript
interface SearchRequest {
  // Search parameters
  query: string;                      // Search query (required)
  intent?: string;                    // User intent (summary, research, comparison, etc)
  conversationId?: string;            // Link to conversation context
  explicit?: boolean;                 // True if user explicitly requested search (false = auto-triggered)
  
  // Search strategy
  maxResults?: number;                // Default: 10
  languages?: string[];               // ISO 639-1 codes (default: ["en"])
  safeSearch?: 'off' | 'moderate' | 'strict';  // Override tenant default
  
  // Domain filtering
  domainWhitelist?: string[];         // Only search these domains
  domainBlacklist?: string[];         // Exclude these domains
  
  // Caching
  skipCache?: boolean;                // Force fresh search (ignores cache)
  cacheTTL?: number;                  // Override default TTL in seconds
}
```

**Response** (200 OK):

```typescript
interface SearchResponse {
  shardId: string;                    // c_search shard ID
  query: string;                      // Normalized query
  results: SearchResult[];            // Array of search results
  
  // Metadata
  provider: string;                   // Which provider returned results (azure, bing, google)
  totalResults: number;               // Total matches available
  executionTime: number;              // Query time in ms
  cached: boolean;                    // Whether result was cached
  cachedAt?: string;                  // ISO 8601 timestamp
  expiresAt: string;                  // When cache entry expires
  
  // Deduplication info
  totalBeforeDedup: number;           // Results before deduplication
  duplicatesRemoved: number;          // Exact duplicates filtered
}

interface SearchResult {
  id: string;                         // Unique result ID
  title: string;                      // Page title
  url: string;                        // Full URL
  description: string;                // Summary snippet
  
  // Relevance & quality
  relevanceScore: number;             // 0-1 relevance score
  trustScore?: number;                // 0-1 domain trust score
  freshness?: string;                 // ISO 8601 publish date
  
  // Domain info
  domain: string;                     // Domain name
  faviconUrl?: string;                // Domain favicon
  
  // Related
  source: 'azure' | 'bing' | 'google';
  isAiGenerated?: boolean;            // Whether result is from AI model
}
```

**Status Codes**:

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid query or parameters |
| 429 | Rate limit exceeded (user search quota) |
| 503 | All providers unavailable |

**Example Request**:

```bash
curl -X POST https://api.castiel.ai/api/v1/insights/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "latest updates to Azure Cosmos DB",
    "intent": "research",
    "maxResults": 10,
    "safeSearch": "moderate"
  }'
```

---

### Get Cached Search Result

Retrieve a previously cached search result by shard ID without executing a new search.

```http
GET /api/v1/insights/search/{shardId}
```

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| shardId | string | The c_search shard ID |

**Response** (200 OK):

```typescript
interface SearchResponse {
  shardId: string;
  query: string;
  results: SearchResult[];
  provider: string;
  totalResults: number;
  executionTime: number;
  cached: boolean;
  cachedAt?: string;
  expiresAt: string;
  totalBeforeDedup: number;
  duplicatesRemoved: number;
}
```

**Status Codes**:

| Code | Description |
|------|-------------|
| 200 | Cached result found |
| 404 | Shard not found or expired |

---

## Web Search Provider Management (Super Admin)

### List All Search Providers

Get configured search providers and their status.

```http
GET /api/v1/admin/web-search/providers
```

**Response** (200 OK):

```typescript
interface ProvidersResponse {
  providers: ProviderConfig[];
  activeChain: string;                // Current fallback chain ID
}

interface ProviderConfig {
  id: string;                         // Provider ID (azure, bing, google)
  name: string;                       // Display name
  enabled: boolean;                   // Is provider active
  priority: number;                   // Position in fallback chain
  
  // Configuration
  apiKeyVaultSecretId: string;        // Key Vault secret reference
  region?: string;                    // For Azure AI Search
  endpoint?: string;                  // Provider endpoint
  
  // Health
  health: {
    status: 'healthy' | 'degraded' | 'down';
    lastCheck: string;                // ISO 8601 timestamp
    errorRate: number;                // 0-1 error rate
    avgLatency: number;               // Milliseconds
  };
  
  // Costs
  costPer1K: number;                  // Cost per 1000 requests
  monthlySpend: number;               // Current month spend
  monthlyLimit?: number;              // Budget cap
  
  // Statistics
  requestsMonth: number;              // This month
  cacheHitRate: number;               // 0-1
  avgRelevanceScore: number;          // 0-1
}
```

---

### Update Provider Configuration

Enable/disable provider or update its configuration.

```http
PATCH /api/v1/admin/web-search/providers/{providerId}
Content-Type: application/json
```

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| providerId | string | Provider ID (azure, bing, google) |

**Request Body**:

```typescript
interface UpdateProviderRequest {
  enabled?: boolean;                  // Enable/disable provider
  priority?: number;                  // Position in fallback chain
  
  // Configuration updates
  region?: string;                    // For Azure AI Search
  endpoint?: string;                  // Custom endpoint
  
  // Budget management
  monthlyLimit?: number;              // Set or remove budget cap
  
  // Advanced
  customHeaders?: Record<string, string>;
  retryStrategy?: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}
```

**Response** (200 OK):

```typescript
interface ProviderConfig {
  // ...same as list response
}
```

**Status Codes**:

| Code | Description |
|------|-------------|
| 200 | Updated successfully |
| 400 | Invalid configuration |
| 404 | Provider not found |
| 403 | Insufficient permissions |

---

### Get Provider Fallback Chain

Get the current fallback chain configuration.

```http
GET /api/v1/admin/web-search/fallback-chain
```

**Response** (200 OK):

```typescript
interface FallbackChainResponse {
  id: string;                         // Chain ID
  name: string;                       // Human readable name
  description?: string;               // Usage description
  priority: string[];                 // [provider1_id, provider2_id, ...]
  
  // Routing rules
  routingRules: {
    byQueryType?: Record<string, string[]>;  // Special routing for query types
    byTenantId?: Record<string, string[]>;   // Tenant-specific chains
    byLatency?: boolean;               // Smart routing based on latency
  };
  
  // Failover configuration
  failover: {
    enabled: boolean;
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear' | 'fixed';
  };
  
  // Health checking
  healthCheck: {
    interval: number;                 // Seconds
    timeout: number;                  // Seconds
  };
}
```

---

### Update Fallback Chain

Modify the provider fallback chain and routing strategy.

```http
PUT /api/v1/admin/web-search/fallback-chain
Content-Type: application/json
```

**Request Body**:

```typescript
interface UpdateFallbackChainRequest {
  priority?: string[];                // New provider order
  
  routingRules?: {
    byQueryType?: Record<string, string[]>;
    byTenantId?: Record<string, string[]>;
    byLatency?: boolean;
  };
  
  failover?: {
    enabled: boolean;
    maxRetries: number;
    backoffStrategy: 'exponential' | 'linear' | 'fixed';
  };
  
  healthCheck?: {
    interval: number;
    timeout: number;
  };
}
```

**Response** (200 OK):

```typescript
interface FallbackChainResponse {
  // ...updated chain configuration
}
```

---

### Get Provider Health Status

Check real-time health of all configured providers.

```http
GET /api/v1/admin/web-search/health
```

**Response** (200 OK):

```typescript
interface HealthResponse {
  timestamp: string;                  // ISO 8601
  overallStatus: 'healthy' | 'degraded' | 'down';
  
  providers: Array<{
    id: string;
    status: 'healthy' | 'degraded' | 'down';
    lastCheck: string;
    latency: {
      p50: number;                    // 50th percentile
      p95: number;                    // 95th percentile
      p99: number;                    // 99th percentile
    };
    errorRate: number;
    requestsLast1h: number;
    cacheHitRate: number;
  }>;
  
  diagnostics: {
    issue?: string;                   // If degraded/down
    recommendation?: string;
  };
}
```

---

### Get Search Usage & Analytics

Get aggregated search usage and cost analytics.

```http
GET /api/v1/admin/web-search/usage
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | 'day', 'week', 'month', 'quarter', 'year' |
| groupBy | string | 'provider', 'tenant', 'intent', 'domain' |
| sort | string | 'requests' or 'cost' |

**Response** (200 OK):

```typescript
interface UsageResponse {
  period: string;
  startDate: string;
  endDate: string;
  
  summary: {
    totalSearches: number;
    totalCost: number;
    totalUsers: number;
    totalTenants: number;
    cacheHitRate: number;
  };
  
  breakdown: Array<{
    id: string;                       // provider, tenant, intent, or domain
    name: string;
    searches: number;
    cost: number;
    avgRelevance: number;
    errorRate: number;
    percentOfTotal: number;
  }>;
  
  trends: {
    searchesByDay: Array<{ date: string; count: number }>;
    costByDay: Array<{ date: string; cost: number }>;
    topQueries: Array<{ query: string; count: number; intent: string }>;
  };
  
  costForecast: {
    projectedMonthly: number;
    projectedQuarterly: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
}
```

---

## Recurring Search API

> **Authorization**: See each endpoint for specific authorization requirements

### User Endpoints

#### Create Recurring Search

Create a new recurring search with custom alert criteria.

> **Authorization**: Authenticated User

```http
POST /api/v1/insights/recurring-searches
Content-Type: application/json
```

**Request Body**:

```typescript
interface CreateRecurringSearchRequest {
  // Basic configuration
  name: string;                      // Display name
  description?: string;              // Optional description
  
  // Search configuration
  query: string;                     // Natural language query
  searchType: 'sales_opportunity' | 'risk_monitoring' | 'competitor_tracking' | 'regulatory_compliance' | 'custom';
  dataSources: ('rag' | 'web' | 'hybrid')[];  // Data sources to query
  
  // Filters (optional)
  filters?: {
    shardTypes?: string[];           // Limit to shard types
    dateRange?: {
      from?: string;                 // ISO 8601
      to?: string;
    };
    tags?: string[];
    companies?: string[];
    projects?: string[];
  };
  
  // Scheduling
  schedule: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    time?: string;                   // HH:mm (for daily+), uses tenant timezone
    dayOfWeek?: number;              // 0-6 (for weekly)
    dayOfMonth?: number;             // 1-31 (for monthly+)
    timezone?: string;               // Override tenant timezone
  };
  
  // Alert configuration
  alertCriteria: {
    enableAlerts: boolean;
    detectionPrompt?: string;        // Custom LLM prompt for alert detection
    confidenceThreshold?: number;    // 0-1, default from tenant config
    volumeThreshold?: number;        // Minimum results to trigger alert
    sensitivityLevel?: 'low' | 'medium' | 'high';  // Default: 'medium'
  };
  
  // Sharing (optional)
  sharing?: {
    visibility: 'private' | 'team';  // Default: 'private'
    teamMembers?: string[];          // User IDs for team sharing
  };
}
```

**Response**:

```json
{
  "id": "rs_abc123",
  "tenantId": "tenant_xyz",
  "userId": "user_123",
  "name": "Enterprise Deal Monitoring",
  "description": "Track enterprise deals for changes in budget or timeline",
  "query": "enterprise deals with budget or timeline changes",
  "searchType": "sales_opportunity",
  "dataSources": ["rag", "web"],
  "filters": {
    "shardTypes": ["c_deal", "c_company"],
    "tags": ["enterprise"]
  },
  "schedule": {
    "frequency": "daily",
    "time": "09:00",
    "timezone": "America/New_York"
  },
  "alertCriteria": {
    "enableAlerts": true,
    "confidenceThreshold": 0.7,
    "sensitivityLevel": "medium"
  },
  "sharing": {
    "visibility": "team",
    "teamMembers": ["user_456", "user_789"]
  },
  "status": "active",
  "nextExecutionAt": "2025-01-21T09:00:00Z",
  "createdAt": "2025-01-20T10:30:00Z",
  "updatedAt": "2025-01-20T10:30:00Z",
  "statistics": {
    "totalExecutions": 0,
    "alertsTriggered": 0,
    "falsePositives": 0,
    "relevantAlerts": 0,
    "lastExecutedAt": null
  }
}
```

---

#### List User's Recurring Searches

Get all recurring searches created by or shared with the current user.

> **Authorization**: Authenticated User

```http
GET /api/v1/insights/recurring-searches?status=active&sortBy=nextExecution&limit=50&offset=0
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `active \| paused \| all` | Filter by status (default: `all`) |
| `searchType` | `string` | Filter by search type |
| `sortBy` | `name \| nextExecution \| createdAt \| alerts` | Sort field (default: `nextExecution`) |
| `order` | `asc \| desc` | Sort order (default: `asc`) |
| `limit` | `number` | Results per page (default: 50, max: 100) |
| `offset` | `number` | Pagination offset (default: 0) |

**Response**:

```json
{
  "searches": [
    {
      "id": "rs_abc123",
      "name": "Enterprise Deal Monitoring",
      "searchType": "sales_opportunity",
      "status": "active",
      "schedule": {
        "frequency": "daily",
        "time": "09:00"
      },
      "nextExecutionAt": "2025-01-21T09:00:00Z",
      "statistics": {
        "totalExecutions": 47,
        "alertsTriggered": 12,
        "lastExecutedAt": "2025-01-20T09:00:00Z"
      },
      "sharing": {
        "visibility": "team"
      },
      "createdAt": "2024-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### Get Recurring Search Details

Get complete details of a specific recurring search.

> **Authorization**: Authenticated User (must be owner or team member)

```http
GET /api/v1/insights/recurring-searches/{id}
```

**Response**: Same as Create response, with full details.

---

#### Update Recurring Search

Update an existing recurring search configuration.

> **Authorization**: Authenticated User (must be owner)

```http
PATCH /api/v1/insights/recurring-searches/{id}
Content-Type: application/json
```

**Request Body**: Partial update of `CreateRecurringSearchRequest` fields.

**Response**: Updated search object.

---

#### Delete Recurring Search

Permanently delete a recurring search.

> **Authorization**: Authenticated User (must be owner)

```http
DELETE /api/v1/insights/recurring-searches/{id}
```

**Response**:

```json
{
  "success": true,
  "message": "Recurring search deleted successfully"
}
```

---

#### Pause Recurring Search

Temporarily pause a recurring search (no new executions).

> **Authorization**: Authenticated User (must be owner)

```http
POST /api/v1/insights/recurring-searches/{id}/pause
```

**Response**:

```json
{
  "id": "rs_abc123",
  "status": "paused",
  "pausedAt": "2025-01-20T15:30:00Z"
}
```

---

#### Resume Recurring Search

Resume a paused recurring search.

> **Authorization**: Authenticated User (must be owner)

```http
POST /api/v1/insights/recurring-searches/{id}/resume
```

**Response**:

```json
{
  "id": "rs_abc123",
  "status": "active",
  "nextExecutionAt": "2025-01-21T09:00:00Z"
}
```

---

#### Get Execution History

Get execution history for a recurring search.

> **Authorization**: Authenticated User (must be owner or team member)

```http
GET /api/v1/insights/recurring-searches/{id}/results?limit=20&offset=0&alertsOnly=false
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | `number` | Results per page (default: 20, max: 100) |
| `offset` | `number` | Pagination offset |
| `alertsOnly` | `boolean` | Only show executions with alerts (default: `false`) |
| `startDate` | `string` | ISO 8601 date filter |
| `endDate` | `string` | ISO 8601 date filter |

**Response**:

```json
{
  "searchId": "rs_abc123",
  "executions": [
    {
      "id": "exec_xyz789",
      "executedAt": "2025-01-20T09:00:00Z",
      "status": "completed",
      "resultsCount": 23,
      "alertsTriggered": 2,
      "executionTime": 2347,
      "dataSourcesUsed": ["rag", "web"],
      "alerts": [
        {
          "id": "alert_456",
          "confidenceScore": 0.85,
          "summary": "Budget increased from $100K to $250K for Acme Corp enterprise deal",
          "createdAt": "2025-01-20T09:01:15Z"
        }
      ]
    }
  ],
  "pagination": {
    "total": 47,
    "limit": 20,
    "offset": 0
  }
}
```

---

### Alert Endpoints

#### List User's Alerts

Get all alerts for the current user's recurring searches.

> **Authorization**: Authenticated User

```http
GET /api/v1/insights/alerts?unreadOnly=true&sortBy=createdAt&limit=50&offset=0
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `searchId` | `string` | Filter by specific search |
| `unreadOnly` | `boolean` | Only unread alerts (default: `false`) |
| `minConfidence` | `number` | Minimum confidence score (0-1) |
| `sortBy` | `createdAt \| confidence` | Sort field (default: `createdAt`) |
| `order` | `asc \| desc` | Sort order (default: `desc`) |
| `limit` | `number` | Results per page (default: 50, max: 100) |
| `offset` | `number` | Pagination offset |

**Response**:

```json
{
  "alerts": [
    {
      "id": "alert_456",
      "searchId": "rs_abc123",
      "searchName": "Enterprise Deal Monitoring",
      "confidenceScore": 0.85,
      "summary": "Budget increased from $100K to $250K for Acme Corp enterprise deal",
      "keyChanges": [
        "Budget: $100K → $250K",
        "Timeline: Q2 → Q1 (moved earlier)"
      ],
      "affectedShards": [
        {
          "shardId": "deal_789",
          "shardType": "c_deal",
          "name": "Acme Corp - Enterprise License"
        }
      ],
      "isRead": false,
      "feedback": null,
      "createdAt": "2025-01-20T09:01:15Z"
    }
  ],
  "pagination": {
    "total": 34,
    "limit": 50,
    "offset": 0
  },
  "unreadCount": 12
}
```

---

#### Get Alert Details

Get complete details of a specific alert.

> **Authorization**: Authenticated User (must own the associated search)

```http
GET /api/v1/insights/alerts/{id}
```

**Response**:

```json
{
  "id": "alert_456",
  "searchId": "rs_abc123",
  "executionId": "exec_xyz789",
  "confidenceScore": 0.85,
  "summary": "Budget increased from $100K to $250K for Acme Corp enterprise deal",
  "detailedAnalysis": "The enterprise deal with Acme Corp shows significant positive momentum...",
  "keyChanges": [
    {
      "category": "budget",
      "before": "$100,000",
      "after": "$250,000",
      "changePercent": 150,
      "significance": "high"
    },
    {
      "category": "timeline",
      "before": "Q2 2025",
      "after": "Q1 2025",
      "significance": "medium"
    }
  ],
  "affectedShards": [
    {
      "shardId": "deal_789",
      "shardType": "c_deal",
      "name": "Acme Corp - Enterprise License",
      "url": "/deals/deal_789"
    }
  ],
  "evidence": [
    {
      "source": "Meeting Note - Jan 18, 2025",
      "snippet": "Client confirmed increased budget allocation...",
      "shardId": "note_123",
      "relevanceScore": 0.92
    }
  ],
  "isRead": false,
  "isSnoozed": false,
  "feedback": null,
  "createdAt": "2025-01-20T09:01:15Z",
  "notifiedAt": "2025-01-20T09:01:30Z"
}
```

---

#### Provide Alert Feedback

Mark an alert as relevant or irrelevant (helps improve learning system).

> **Authorization**: Authenticated User (must own the associated search)

```http
POST /api/v1/insights/alerts/{id}/feedback
Content-Type: application/json
```

**Request Body**:

```typescript
interface AlertFeedbackRequest {
  isRelevant: boolean;               // True = relevant, False = false positive
  reason?: string;                   // Optional explanation
  suppressSimilar?: boolean;         // Create suppression rule (default: false)
}
```

**Response**:

```json
{
  "alertId": "alert_456",
  "feedback": "relevant",
  "feedbackAt": "2025-01-20T15:45:00Z",
  "learningApplied": true,
  "message": "Thank you for your feedback. The system will learn from this."
}
```

---

#### Snooze Alert

Temporarily hide an alert from the dashboard.

> **Authorization**: Authenticated User (must own the associated search)

```http
POST /api/v1/insights/alerts/{id}/snooze
Content-Type: application/json
```

**Request Body**:

```typescript
interface SnoozeAlertRequest {
  duration: '1hour' | '1day' | '1week' | 'custom';
  until?: string;                    // ISO 8601 (required if duration = 'custom')
}
```

**Response**:

```json
{
  "alertId": "alert_456",
  "snoozedUntil": "2025-01-21T15:45:00Z",
  "message": "Alert snoozed until Jan 21, 2025 3:45 PM"
}
```

---

### Tenant Admin Endpoints

> **Authorization**: Tenant Admin (or Super Admin)

#### List All Tenant Recurring Searches

View all recurring searches in the tenant.

```http
GET /api/v1/admin/recurring-searches?userId=user_123&searchType=sales_opportunity&limit=100&offset=0
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | `string` | Filter by creator |
| `status` | `active \| paused \| all` | Filter by status |
| `searchType` | `string` | Filter by type |
| `sortBy` | `alerts \| executions \| createdAt` | Sort field |
| `limit` | `number` | Results per page |
| `offset` | `number` | Pagination offset |

**Response**: Similar to user list endpoint, but includes all searches in tenant.

---

#### Get Tenant Statistics

Get recurring search statistics for the tenant.

```http
GET /api/v1/admin/recurring-searches/stats?period=30d
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | `7d \| 30d \| 90d \| 1y` | Time period (default: `30d`) |

**Response**:

```json
{
  "tenantId": "tenant_xyz",
  "period": "30d",
  "summary": {
    "totalSearches": 45,
    "activeSearches": 38,
    "totalExecutions": 2340,
    "totalAlerts": 456,
    "alertAccuracy": 0.82,
    "falsePositiveRate": 0.18,
    "averageConfidence": 0.74
  },
  "bySearchType": {
    "sales_opportunity": {
      "count": 18,
      "alerts": 234,
      "accuracy": 0.85
    },
    "risk_monitoring": {
      "count": 12,
      "alerts": 156,
      "accuracy": 0.79
    }
  },
  "topSearches": [
    {
      "searchId": "rs_abc123",
      "name": "Enterprise Deal Monitoring",
      "owner": "John Doe",
      "alertsTriggered": 67,
      "accuracy": 0.91
    }
  ],
  "quotaUsage": {
    "limit": 50,
    "used": 45,
    "available": 5
  }
}
```

---

#### Update Tenant Configuration

Update recurring search configuration for the tenant.

```http
PATCH /api/v1/admin/recurring-searches/config
Content-Type: application/json
```

**Request Body**:

```typescript
interface TenantRecurringSearchConfigRequest {
  defaultConfidenceThreshold?: number;  // 0-1, default: 0.7
  enableDigestMode?: boolean;           // Default: false
  digestSchedule?: {
    frequency: 'daily' | 'weekly';
    time: string;                        // HH:mm
    dayOfWeek?: number;                  // For weekly
  };
  dataRetentionDays?: number;           // 30-180 days
  learningSystemEnabled?: boolean;      // Default: true
}
```

**Response**: Updated configuration object.

---

#### Get Tenant Analytics

Get detailed analytics on alert accuracy and learning system performance.

```http
GET /api/v1/admin/recurring-searches/analytics?period=30d
```

**Response**:

```json
{
  "period": "30d",
  "accuracy": {
    "overall": 0.82,
    "bySearchType": {
      "sales_opportunity": 0.85,
      "risk_monitoring": 0.79
    },
    "trend": {
      "current": 0.82,
      "previous": 0.76,
      "improvement": 0.06
    }
  },
  "falsePositives": {
    "total": 82,
    "rate": 0.18,
    "topPatterns": [
      {
        "pattern": "routine status updates",
        "occurrences": 23,
        "suppressed": true
      }
    ]
  },
  "learningSystem": {
    "feedbackReceived": 234,
    "promptRefinements": 12,
    "suppressionRulesCreated": 8,
    "averageConfidenceImprovement": 0.08
  }
}
```

---

#### View All Tenant Alerts

View all alerts across the tenant (for monitoring/support).

```http
GET /api/v1/admin/alerts?userId=user_123&minConfidence=0.8&limit=100&offset=0
```

**Query Parameters**: Similar to user alert list, plus:

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | `string` | Filter by user |
| `searchId` | `string` | Filter by search |

**Response**: Similar to user alert list, but includes all tenant alerts.

---

### Super Admin Endpoints

> **Authorization**: Super Admin only

#### Get Global Statistics

Get global recurring search statistics across all tenants.

```http
GET /api/v1/superadmin/recurring-searches/global-stats?period=30d
```

**Response**:

```json
{
  "period": "30d",
  "summary": {
    "totalTenants": 45,
    "totalSearches": 1234,
    "totalExecutions": 56780,
    "totalAlerts": 8901,
    "globalAccuracy": 0.81,
    "globalFalsePositiveRate": 0.19
  },
  "byTenant": [
    {
      "tenantId": "tenant_xyz",
      "tenantName": "Acme Corp",
      "searches": 45,
      "alerts": 456,
      "accuracy": 0.82,
      "quotaUsed": 45,
      "quotaLimit": 50
    }
  ],
  "learningSystemMetrics": {
    "totalFeedback": 12345,
    "promptRefinements": 234,
    "suppressionRules": 456,
    "averageAccuracyImprovement": 0.09
  }
}
```

---

#### Update Tenant Search Quota

Set or override the recurring search quota for a specific tenant.

```http
PATCH /api/v1/superadmin/tenants/{tenantId}/search-quota
Content-Type: application/json
```

**Request Body**:

```typescript
interface UpdateSearchQuotaRequest {
  quota: number;                     // Max searches (1-1000)
  reason?: string;                   // Optional reason for change
}
```

**Response**:

```json
{
  "tenantId": "tenant_xyz",
  "quota": 100,
  "previousQuota": 50,
  "updatedAt": "2025-01-20T16:00:00Z",
  "updatedBy": "superadmin_user_id"
}
```

---

#### Get Learning System Metrics

Get detailed metrics on the learning system's performance.

```http
GET /api/v1/superadmin/learning-system/metrics?period=30d
```

**Response**:

```json
{
  "period": "30d",
  "globalMetrics": {
    "feedbackReceived": 12345,
    "relevantFeedback": 10123,
    "falsePositiveFeedback": 2222,
    "promptRefinements": 234,
    "suppressionRulesCreated": 456,
    "averageConfidenceImprovement": 0.09
  },
  "bySearchType": {
    "sales_opportunity": {
      "accuracy": 0.85,
      "improvement": 0.08
    },
    "risk_monitoring": {
      "accuracy": 0.79,
      "improvement": 0.12
    }
  },
  "topPerformingTenants": [
    {
      "tenantId": "tenant_xyz",
      "accuracy": 0.91,
      "feedbackRate": 0.67
    }
  ]
}
```

---

## Tenant Admin Configuration API

> **Authorization**: Tenant Admin only (or Super Admin)

### Get Tenant AI Configuration

Get the complete AI configuration for a tenant, including model selection, budget limits, and feature flags.

```http
GET /api/v1/insights/admin/config
```

**Response**:

```json
{
  "id": "tenant_123",
  "tenantId": "tenant_123",
  "defaultModel": {
    "modelId": "gpt-4-turbo",
    "fallbackModelId": "gpt-35-turbo"
  },
  "budget": {
    "monthlyLimitUSD": 1000,
    "dailyLimitUSD": 50,
    "alertThresholds": [
      {
        "percentage": 50,
        "action": "email",
        "recipients": ["admin@company.com"]
      },
      {
        "percentage": 80,
        "action": "notification",
        "recipients": ["admin@company.com"]
      },
      {
        "percentage": 90,
        "action": "pause",
        "recipients": ["admin@company.com", "finance@company.com"]
      }
    ],
    "costPerInsight": {
      "max": 0.50,
      "target": 0.10
    },
    "currentMonth": {
      "spent": 247.58,
      "insightCount": 1768,
      "periodStart": "2024-12-01T00:00:00Z",
      "periodEnd": "2024-12-31T23:59:59Z"
    }
  },
  "quality": {
    "minConfidenceScore": 0.7,
    "requireCitations": true,
    "enableGrounding": true,
    "maxRetries": 3
  },
  "features": {
    "enableProactiveInsights": true,
    "enableMultiModal": false,
    "enableToolCalling": true,
    "enableSemanticCache": true,
    "enableConversationMemory": true
  },
  "privacy": {
    "dataRetentionDays": 90,
    "enableAuditLog": true,
    "allowCrossShardContext": false,
    "piiHandling": "redact",
    "enableExport": true
  },
  "prompts": {
    "allowCustomPrompts": true,
    "maxActivePrompts": 10,
    "requireApproval": false
  },
  "branding": {
    "assistantName": "Acme AI Assistant",
    "assistantAvatar": "https://cdn.acme.com/avatar.png",
    "welcomeMessage": "Hello! I'm your Acme AI Assistant. How can I help you today?",
    "primaryColor": "#4F46E5"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "createdBy": "system",
  "updatedAt": "2024-12-03T15:30:00Z",
  "updatedBy": "admin_user_456"
}
```

---

### Update Tenant AI Configuration

Update AI configuration for the tenant. Only provided fields will be updated (partial update supported).

```http
PUT /api/v1/insights/admin/config
```

**Request Body**:

```json
{
  "defaultModel": {
    "modelId": "gpt-4-turbo",
    "fallbackModelId": "gpt-35-turbo"
  },
  "budget": {
    "monthlyLimitUSD": 1500,
    "alertThresholds": [
      {
        "percentage": 80,
        "action": "email",
        "recipients": ["finance@company.com"]
      }
    ]
  },
  "features": {
    "enableProactiveInsights": false
  },
  "branding": {
    "assistantName": "Acme Sales Assistant",
    "primaryColor": "#10B981"
  }
}
```

**Response**: Updated `TenantAIConfiguration` object (200 OK).

**Errors**:
- `400 VALIDATION_ERROR`: Invalid configuration values
- `403 FORBIDDEN`: Not a tenant admin
- `404 NOT_FOUND`: Tenant not found

---

### Get Budget Status

Get current budget usage and alert status for the tenant.

```http
GET /api/v1/insights/admin/budget/status
```

**Response**:

```json
{
  "withinBudget": true,
  "currentSpend": 247.58,
  "monthlyLimit": 1000,
  "percentageUsed": 24.76,
  "alertLevel": null,
  "projectedEndOfMonth": 327.45,
  "daysRemaining": 28,
  "currentPace": "below_target",
  "insights": {
    "total": 1768,
    "avgCostPerInsight": 0.14
  }
}
```

**Alert Levels**:
- `null`: Under 80% usage
- `warning`: 80-89% usage
- `critical`: 90-99% usage
- `exceeded`: 100%+ usage (insights paused if configured)

---

### Get Usage Snapshot

Get detailed usage analytics for a specific time period.

```http
GET /api/v1/insights/admin/usage?startDate=2024-12-01&endDate=2024-12-04
```

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string (ISO 8601) | Yes | Start of period |
| `endDate` | string (ISO 8601) | Yes | End of period |

**Response**:

```json
{
  "tenantId": "tenant_123",
  "date": "2024-12-04T10:30:00Z",
  "totalSpend": 247.58,
  "insightCount": 1768,
  "byModel": [
    {
      "modelId": "gpt-4-turbo",
      "modelName": "GPT-4 Turbo",
      "insightCount": 1245,
      "spend": 187.24,
      "avgCostPerInsight": 0.15
    },
    {
      "modelId": "gpt-35-turbo",
      "modelName": "GPT-3.5 Turbo",
      "insightCount": 523,
      "spend": 60.34,
      "avgCostPerInsight": 0.12
    }
  ],
  "byInsightType": [
    {
      "insightType": "summary",
      "count": 856,
      "spend": 120.45
    },
    {
      "insightType": "analysis",
      "count": 542,
      "spend": 95.30
    },
    {
      "insightType": "recommendation",
      "count": 370,
      "spend": 31.83
    }
  ],
  "dailyBreakdown": [
    {
      "date": "2024-12-01",
      "spend": 82.50,
      "insightCount": 589
    },
    {
      "date": "2024-12-02",
      "spend": 78.32,
      "insightCount": 560
    },
    {
      "date": "2024-12-03",
      "spend": 86.76,
      "insightCount": 619
    }
  ]
}
```

---

### List Tenant Prompts

List custom prompts for the tenant and available system prompts for inheritance.

```http
GET /api/v1/insights/admin/prompts
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `insightType` | string | Filter by insight type |
| `status` | string | Filter by status: `draft`, `active`, `archived` |

**Response**:

```json
{
  "tenantPrompts": [
    {
      "id": "prompt_tenant_abc",
      "name": "Sales Summary Custom",
      "description": "Customized summary for sales team",
      "insightType": "summary",
      "category": "tenant",
      "tenantId": "tenant_123",
      "inheritFrom": "system_summary_001",
      "overrides": {
        "template": "Additionally, focus on revenue impact and customer interactions."
      },
      "version": 1,
      "isActive": true,
      "status": "active",
      "performanceMetrics": {
        "avgResponseTime": 2100,
        "avgTokenUsage": 1150,
        "avgCost": 0.14,
        "successRate": 98.5,
        "userSatisfactionScore": 4.6
      },
      "createdAt": "2024-11-15T10:00:00Z",
      "createdBy": "admin_user_456",
      "updatedAt": "2024-11-15T10:00:00Z",
      "updatedBy": "admin_user_456"
    }
  ],
  "systemPrompts": [
    {
      "id": "system_summary_001",
      "name": "Standard Summary Prompt",
      "description": "Default system prompt for summaries",
      "insightType": "summary",
      "category": "system",
      "status": "active",
      "version": 3
    },
    {
      "id": "system_analysis_001",
      "name": "Standard Analysis Prompt",
      "description": "Default system prompt for analysis",
      "insightType": "analysis",
      "category": "system",
      "status": "active",
      "version": 2
    }
  ],
  "capabilities": {
    "canCreate": true,
    "canEdit": true,
    "canActivate": true,
    "canTest": true,
    "maxActivePrompts": 10,
    "requiresSuperAdminApproval": false
  }
}
```

---

### Create Tenant Prompt

Create a custom prompt for the tenant that inherits from a system prompt.

```http
POST /api/v1/insights/admin/prompts
```

**Request Body**:

```json
{
  "systemPromptId": "system_summary_001",
  "name": "Sales Team Summary",
  "description": "Custom summary prompt for sales dashboards",
  "overrides": {
    "template": "Additionally, you specialize in sales analysis. When summarizing:\n- Focus on revenue impact and ROI\n- Highlight key customer interactions\n- Use sales terminology familiar to sales teams\n- Include actionable next steps for deals"
  }
}
```

**Response**:

```json
{
  "id": "prompt_tenant_xyz",
  "name": "Sales Team Summary",
  "description": "Custom summary prompt for sales dashboards",
  "insightType": "summary",
  "category": "tenant",
  "tenantId": "tenant_123",
  "inheritFrom": "system_summary_001",
  "overrides": {
    "template": "Additionally, you specialize in sales analysis..."
  },
  "template": "You are an AI assistant helping users understand their dashboard data...",
  "variables": [
    {
      "name": "dashboardName",
      "type": "string",
      "required": true,
      "description": "Name of the dashboard"
    }
  ],
  "version": 1,
  "isActive": false,
  "status": "draft",
  "createdAt": "2024-12-04T10:30:00Z",
  "createdBy": "admin_user_456"
}
```

**Notes**:
- Tenant prompts inherit the base template from the system prompt
- The `overrides.template` is appended to the system template
- All variables from the system prompt are inherited
- New prompt starts as `draft` with `isActive: false`

---

### Test Tenant Prompt

Test a tenant prompt with sample inputs before activating.

```http
POST /api/v1/insights/admin/prompts/:id/test
```

**Request Body**:

```json
{
  "testInputs": {
    "dashboardName": "Q4 Sales Dashboard",
    "userQuery": "What are the top performing deals?",
    "context": "{\"deals\": [{\"name\": \"Acme Corp\", \"value\": 125000, \"stage\": \"closing\"}, ...]}"
  },
  "notes": "Testing with Q4 sales data",
  "rating": 5
}
```

**Response**: Same as Super Admin prompt test (see [Test Prompt](#test-prompt)).

---

### Activate Tenant Prompt

Activate a tenant prompt version for use in production.

```http
POST /api/v1/insights/admin/prompts/:id/activate
```

**Response**:

```json
{
  "id": "prompt_tenant_xyz",
  "name": "Sales Team Summary",
  "isActive": true,
  "status": "active",
  "activatedAt": "2024-12-04T11:00:00Z",
  "activatedBy": "admin_user_456",
  "deactivatedPrompts": ["prompt_tenant_old_abc"]
}
```

**Notes**:
- Automatically deactivates other active prompts for the same `insightType`
- Only affects tenant-scoped prompts (doesn't touch system prompts)

---

### Deactivate Tenant Prompt

Deactivate a tenant prompt (fallback to system prompt).

```http
POST /api/v1/insights/admin/prompts/:id/deactivate
```

**Response**:

```json
{
  "id": "prompt_tenant_xyz",
  "name": "Sales Team Summary",
  "isActive": false,
  "status": "archived",
  "deprecatedAt": "2024-12-04T12:00:00Z",
  "deprecatedBy": "admin_user_456"
}
```

**Notes**:
- When no tenant prompt is active, system default will be used
- Prompt remains in database for audit purposes

---

## Error Responses

### Error Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    requestId: string;
    timestamp: string;
  };
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 402 | Cost/token quota exceeded |
| `MODEL_UNAVAILABLE` | 503 | AI model temporarily unavailable |
| `CONTEXT_TOO_LARGE` | 400 | Context exceeds model limit |
| `CONTENT_FILTERED` | 400 | Content blocked by safety filter |
| `GENERATION_ERROR` | 500 | AI generation failed |
| `STREAMING_ERROR` | 500 | Stream connection failed |
| `TIMEOUT` | 504 | Request timed out |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Example Error Response

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Daily token quota exceeded. Limit: 1,000,000 tokens.",
    "details": {
      "used": 1023456,
      "limit": 1000000,
      "resetsAt": "2024-01-16T00:00:00Z"
    },
    "requestId": "req_abc123xyz",
    "timestamp": "2024-01-15T23:45:00Z"
  }
}
```

---

## Rate Limits

### Default Limits

| Scope | Limit |
|-------|-------|
| Requests per minute | 60 |
| Tokens per minute | 100,000 |
| Tokens per day | 1,000,000 |
| Concurrent streams | 5 |
| Max message length | 32,000 chars |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705323600
X-TokenLimit-Remaining: 850000
X-TokenLimit-Reset: 1705363200
```

---

## Webhooks

### Insight Webhook Events

Configure webhooks to receive insight events:

| Event | Trigger |
|-------|---------|
| `insight.generated` | New insight created |
| `insight.feedback` | User submitted feedback |
| `agent.triggered` | Proactive agent ran |
| `agent.alert` | High-priority insight |
| `quota.warning` | 80% quota used |
| `quota.exceeded` | Quota limit reached |

### Webhook Payload

```typescript
interface InsightWebhookPayload {
  event: string;
  timestamp: string;
  tenantId: string;
  
  data: {
    insightId?: string;
    conversationId?: string;
    messageId?: string;
    agentId?: string;
    
    content?: string;
    summary?: string;
    priority?: string;
    
    metadata: Record<string, any>;
  };
  
  signature: string;                 // HMAC-SHA256
}
```

---

## SDK Examples

### TypeScript/JavaScript

```typescript
import { CastielInsights } from '@castiel/sdk';

const insights = new CastielInsights({
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id',
});

// Send message with streaming
const stream = await insights.chat.send({
  conversationId: 'conv_123',
  content: 'Analyze the risks for Project Alpha',
  scope: { projectId: 'proj_456' },
});

for await (const event of stream) {
  if (event.type === 'content_delta') {
    process.stdout.write(event.delta);
  }
}

// Quick insight
const insight = await insights.quick({
  shardId: 'shard_789',
  type: 'summary',
});

console.log(insight.content);
```

### Python

```python
from castiel import CastielInsights

insights = CastielInsights(
    api_key="your-api-key",
    tenant_id="your-tenant-id"
)

# Streaming chat
async for event in insights.chat.send(
    conversation_id="conv_123",
    content="Analyze the risks for Project Alpha",
    scope={"project_id": "proj_456"}
):
    if event.type == "content_delta":
        print(event.delta, end="")

# Quick insight
result = insights.quick(
    shard_id="shard_789",
    type="summary"
)
print(result.content)
```

---

## Related Documentation

- [AI Insights Overview](./README.md)
- [Context Assembly](./CONTEXT-ASSEMBLY.md)
- [Prompt Engineering](./PROMPT-ENGINEERING.md)
- [Grounding & Accuracy](./GROUNDING.md)
- [UI Specification](./UI-SPECIFICATION.md)











