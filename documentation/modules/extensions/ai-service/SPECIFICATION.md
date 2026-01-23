# AI Service Module Specification

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft  
**Module Category:** AI & Intelligence (Core)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Model Providers](#4-model-providers)
5. [Core Features](#5-core-features)
6. [API Endpoints](#6-api-endpoints)
7. [Configuration](#7-configuration)
8. [UI Views](#8-ui-views)
9. [Implementation Guidelines](#9-implementation-guidelines)

---

## 1. Overview

### 1.1 Purpose

The AI Service Module is the **centralized hub for all LLM operations** in Coder IDE. It provides a unified interface for other modules to interact with various AI model providers, handling completions, streaming, model routing, fallbacks, and rate limiting.

### 1.2 Key Responsibilities

- **LLM Completions**: Chat completions, text generation
- **Multi-Provider Support**: OpenAI, Anthropic, Azure OpenAI, Google Gemini, Ollama, Chutes
- **Context Management**: Handle context windows, truncation strategies
- **Model Routing**: Automatically select best model for task
- **Fallback Handling**: Retry with secondary model on failure
- **Request Caching**: Cache identical requests for efficiency
- **Streaming Support**: Real-time token streaming
- **Rate Limiting**: Per-organization/user limits

### 1.3 What This Module Does NOT Handle

| Concern | Handled By |
|---------|------------|
| Vector embeddings | Embeddings Module |
| Prompt templates | Prompt Management Module |
| Token/cost tracking | Usage Tracking Module |
| Secret storage | Secret Management Module |

### 1.4 Consumer Modules

| Module | Usage |
|--------|-------|
| **Planning** | Plan generation, refinement |
| **MCP Server** | AI-powered tool operations |
| **Knowledge Base** | Summarization, Q&A |
| **Agent System** | All agent LLM calls |
| **Code Generation** | Code completion, refactoring |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CONSUMER MODULES                                            │
│   Planning │ MCP Server │ Knowledge Base │ Agents │ Code Generation                     │
└─────────────────────────────────────────┬───────────────────────────────────────────────┘
                                          │ REST API / gRPC
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AI SERVICE                                               │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                            Request Handler                                       │   │
│  │  • Authentication   • Rate Limiting   • Request Validation   • Caching         │   │
│  └─────────────────────────────────────────┬───────────────────────────────────────┘   │
│                                            │                                            │
│  ┌─────────────────────────────────────────▼───────────────────────────────────────┐   │
│  │                           Model Router                                           │   │
│  │  • Model Selection   • Load Balancing   • Fallback Logic   • Context Mgmt       │   │
│  └─────────────────────────────────────────┬───────────────────────────────────────┘   │
│                                            │                                            │
│  ┌──────────┬──────────┬──────────┬────────┴────┬──────────┬──────────┐              │
│  │          │          │          │             │          │          │              │
│  ▼          ▼          ▼          ▼             ▼          ▼          ▼              │
│ ┌────────┐┌────────┐┌────────┐┌────────┐  ┌────────┐┌────────┐┌────────┐            │
│ │ OpenAI ││Anthropic││ Azure  ││ Gemini │  │ Ollama ││ Chutes ││ Custom │            │
│ │Provider││Provider ││Provider││Provider│  │Provider││Provider││Provider│            │
│ └────────┘└────────┘└────────┘└────────┘  └────────┘└────────┘└────────┘            │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │                                           │
                    ▼                                           ▼
           ┌───────────────┐                          ┌───────────────┐
           │    Secret     │                          │    Usage      │
           │  Management   │                          │   Tracking    │
           │  (API Keys)   │                          │   (Metrics)   │
           └───────────────┘                          └───────────────┘
```

### 2.2 Module Location

```
containers/
└── ai-service/
    ├── src/
    │   ├── index.ts                    # Entry point
    │   ├── server.ts                   # Fastify server
    │   │
    │   ├── routes/
    │   │   ├── completions.ts          # Completion endpoints
    │   │   ├── models.ts               # Model management
    │   │   ├── providers.ts            # Provider configuration
    │   │   └── health.ts               # Health checks
    │   │
    │   ├── services/
    │   │   ├── CompletionService.ts    # Core completion logic
    │   │   ├── ModelRouter.ts          # Model selection/routing
    │   │   ├── ContextManager.ts       # Context window handling
    │   │   ├── CacheService.ts         # Request caching
    │   │   └── RateLimiter.ts          # Rate limiting
    │   │
    │   ├── providers/
    │   │   ├── BaseProvider.ts         # Abstract provider interface
    │   │   ├── OpenAIProvider.ts       # OpenAI implementation
    │   │   ├── AnthropicProvider.ts    # Anthropic implementation
    │   │   ├── AzureOpenAIProvider.ts  # Azure OpenAI implementation
    │   │   ├── GeminiProvider.ts       # Google Gemini implementation
    │   │   ├── OllamaProvider.ts       # Ollama implementation
    │   │   ├── ChutesProvider.ts       # Chutes implementation
    │   │   └── ProviderFactory.ts      # Provider instantiation
    │   │
    │   ├── middleware/
    │   │   ├── auth.ts                 # Authentication
    │   │   ├── rateLimit.ts            # Rate limiting middleware
    │   │   └── logging.ts              # Request logging
    │   │
    │   └── types/
    │       ├── completion.types.ts     # Completion types
    │       ├── model.types.ts          # Model types
    │       └── provider.types.ts       # Provider types
    │
    ├── prisma/
    │   └── schema.prisma               # Database schema
    │
    ├── Dockerfile
    └── package.json
```

---

## 3. Data Models

### 3.1 Database Architecture

> **Shared Database**: All AI Service data resides in the shared Cosmos DB NoSQL database. The `ai` container stores all AI service-related documents.

### 3.2 Table Mapping

| Prisma Model | Database Table | Description |
|--------------|----------------|-------------|
| `AIModel` | `ai_models` | Available AI models |
| `AIProvider` | `ai_providers` | Provider configurations |
| `AIModelConfiguration` | `ai_model_configurations` | Org-level model settings |
| `AICompletionLog` | `ai_completion_logs` | Completion request logs |
| `AICache` | `ai_cache` | Cached responses |
| `AIRateLimit` | `ai_rate_limits` | Rate limit configurations |

### 3.3 Database Schema

```prisma
// ============================================================
// AI PROVIDERS
// ============================================================

model AIProvider {
  @@map("ai_providers")
  
  id                    String                @id @default(uuid())
  
  // Identification
  name                  String                @unique  // openai, anthropic, azure, gemini, ollama, chutes
  displayName           String
  description           String?
  
  // Configuration
  type                  AIProviderType
  baseUrl               String?               // For custom endpoints
  apiVersion            String?               // For Azure, etc.
  
  // Features
  supportsStreaming     Boolean               @default(true)
  supportsFunctions     Boolean               @default(false)
  supportsVision        Boolean               @default(false)
  maxContextWindow      Int?                  // Maximum tokens
  
  // Status
  isEnabled             Boolean               @default(true)
  isDefault             Boolean               @default(false)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  models                AIModel[]
  configurations        AIProviderConfiguration[]
}

enum AIProviderType {
  OPENAI
  ANTHROPIC
  AZURE_OPENAI
  GOOGLE_GEMINI
  OLLAMA
  CHUTES
  CUSTOM
}

// ============================================================
// AI MODELS
// ============================================================

model AIModel {
  @@map("ai_models")
  
  id                    String                @id @default(uuid())
  
  // Identification
  providerId            String
  provider              AIProvider            @relation(fields: [providerId], references: [id])
  
  name                  String                // gpt-4o, claude-3-opus, etc.
  displayName           String
  description           String?
  
  // Capabilities
  contextWindow         Int                   // Max tokens in context
  maxOutputTokens       Int?                  // Max output tokens
  
  // Pricing (per 1M tokens, stored in cents)
  inputPricePer1M       Int?                  // Input cost
  outputPricePer1M      Int?                  // Output cost
  
  // Capabilities flags
  supportsStreaming     Boolean               @default(true)
  supportsFunctions     Boolean               @default(false)
  supportsVision        Boolean               @default(false)
  supportsJson          Boolean               @default(false)
  
  // Categorization
  category              AIModelCategory       @default(GENERAL)
  tier                  AIModelTier           @default(STANDARD)
  
  // Status
  isEnabled             Boolean               @default(true)
  isDefault             Boolean               @default(false)
  deprecatedAt          DateTime?
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  configurations        AIModelConfiguration[]
  completionLogs        AICompletionLog[]
  routingRules          AIRoutingRule[]
  
  @@unique([providerId, name])
}

enum AIModelCategory {
  GENERAL               // General purpose
  CODE                  // Code-specialized
  REASONING             // Reasoning-focused
  FAST                  // Low latency
  VISION                // Vision capable
  EMBEDDING             // Embedding models (reference only)
}

enum AIModelTier {
  ECONOMY               // Cheapest, lower quality
  STANDARD              // Balanced
  PREMIUM               // Best quality, higher cost
}

// ============================================================
// PROVIDER CONFIGURATION (per organization)
// ============================================================

model AIProviderConfiguration {
  @@map("ai_provider_configurations")
  
  id                    String                @id @default(uuid())
  
  // Provider
  providerId            String
  provider              AIProvider            @relation(fields: [providerId], references: [id])
  
  // Scope
  scope                 ConfigScope           @default(ORGANIZATION)
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  
  // Authentication (reference to Secret Management)
  apiKeySecretId        String?               // Reference to secrets table
  
  // Custom endpoint (for Azure, Ollama, etc.)
  customBaseUrl         String?
  customApiVersion      String?
  
  // Settings
  isEnabled             Boolean               @default(true)
  priority              Int                   @default(0)  // Higher = preferred
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([providerId, scope, organizationId])
}

enum ConfigScope {
  GLOBAL                // Platform default
  ORGANIZATION          // Organization-specific
}

// ============================================================
// MODEL CONFIGURATION (per organization)
// ============================================================

model AIModelConfiguration {
  @@map("ai_model_configurations")
  
  id                    String                @id @default(uuid())
  
  // Model
  modelId               String
  model                 AIModel               @relation(fields: [modelId], references: [id])
  
  // Scope
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  userId                String?               // For user preferences
  user                  User?                 @relation(fields: [userId], references: [id])
  
  // Configuration
  isEnabled             Boolean               @default(true)
  isDefault             Boolean               @default(false)
  
  // Default parameters
  defaultTemperature    Float?
  defaultMaxTokens      Int?
  defaultTopP           Float?
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([modelId, organizationId, userId])
}

// ============================================================
// ROUTING RULES
// ============================================================

model AIRoutingRule {
  @@map("ai_routing_rules")
  
  id                    String                @id @default(uuid())
  
  // Scope
  scope                 ConfigScope           @default(GLOBAL)
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  
  // Rule definition
  name                  String
  description           String?
  
  // Matching criteria
  taskType              String?               // planning, code-gen, agent, etc.
  contextSizeMin        Int?                  // Min context tokens
  contextSizeMax        Int?                  // Max context tokens
  requiresVision        Boolean?
  requiresFunctions     Boolean?
  
  // Target model
  modelId               String
  model                 AIModel               @relation(fields: [modelId], references: [id])
  
  // Priority
  priority              Int                   @default(0)
  
  // Status
  isEnabled             Boolean               @default(true)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@index([scope, organizationId, isEnabled])
}

// ============================================================
// FALLBACK CONFIGURATION
// ============================================================

model AIFallbackChain {
  @@map("ai_fallback_chains")
  
  id                    String                @id @default(uuid())
  
  // Scope
  scope                 ConfigScope           @default(GLOBAL)
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  
  // Primary model
  primaryModelId        String
  
  // Fallback sequence (JSON array of model IDs in order)
  fallbackModelIds      String[]
  
  // Trigger conditions
  triggerOnError        Boolean               @default(true)
  triggerOnRateLimit    Boolean               @default(true)
  triggerOnTimeout      Boolean               @default(true)
  timeoutMs             Int                   @default(30000)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([primaryModelId, scope, organizationId])
}

// ============================================================
// RATE LIMITING
// ============================================================

model AIRateLimitConfig {
  @@map("ai_rate_limit_configs")
  
  id                    String                @id @default(uuid())
  
  // Scope
  scope                 RateLimitScope
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  userId                String?
  user                  User?                 @relation(fields: [userId], references: [id])
  
  // Limits
  requestsPerMinute     Int?
  requestsPerHour       Int?
  requestsPerDay        Int?
  tokensPerMinute       Int?
  tokensPerDay          Int?
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([scope, organizationId, userId])
}

enum RateLimitScope {
  GLOBAL
  ORGANIZATION
  USER
}

// ============================================================
// COMPLETION LOGS (for debugging, not usage tracking)
// ============================================================

model AICompletionLog {
  @@map("ai_completion_logs")
  
  id                    String                @id @default(uuid())
  
  // Context
  organizationId        String
  organization          Organization          @relation(fields: [organizationId], references: [id])
  userId                String
  user                  User                  @relation(fields: [userId], references: [id])
  
  // Request
  modelId               String
  model                 AIModel               @relation(fields: [modelId], references: [id])
  
  callerModule          String                // planning, agent, code-gen, etc.
  callerResourceId      String?               // Specific resource ID
  
  // Request details (sanitized, no PII)
  requestHash           String?               // Hash of request for caching
  messageCount          Int
  inputTokens           Int?
  
  // Response
  status                CompletionStatus
  outputTokens          Int?
  durationMs            Int?
  
  // Error (if any)
  errorCode             String?
  errorMessage          String?
  
  // Fallback info
  wasFailover           Boolean               @default(false)
  originalModelId       String?
  
  // Timestamps
  createdAt             DateTime              @default(now())
  
  @@index([organizationId, createdAt])
  @@index([modelId, createdAt])
  @@index([status, createdAt])
}

enum CompletionStatus {
  SUCCESS
  ERROR
  TIMEOUT
  RATE_LIMITED
  CANCELLED
}

// ============================================================
// REQUEST CACHE
// ============================================================

model AICache {
  @@map("ai_cache")
  
  id                    String                @id @default(uuid())
  
  // Cache key
  requestHash           String                @unique
  modelId               String
  
  // Cached response
  response              Json
  inputTokens           Int
  outputTokens          Int
  
  // TTL
  expiresAt             DateTime
  
  // Stats
  hitCount              Int                   @default(0)
  lastAccessedAt        DateTime              @default(now())
  
  // Timestamps
  createdAt             DateTime              @default(now())
  
  @@index([expiresAt])
  @@index([modelId])
}
```

---

## 4. Model Providers

### 4.1 Provider Interface

```typescript
interface AIProvider {
  // Identification
  readonly name: string;
  readonly type: AIProviderType;
  
  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  
  // Core operations
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  completeStream(request: CompletionRequest): AsyncIterable<StreamChunk>;
  
  // Model info
  listModels(): Promise<ModelInfo[]>;
  getModel(modelId: string): Promise<ModelInfo | null>;
}

interface CompletionRequest {
  model: string;
  messages: Message[];
  
  // Parameters
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  
  // Features
  stream?: boolean;
  functions?: FunctionDefinition[];
  functionCall?: 'auto' | 'none' | { name: string };
  responseFormat?: { type: 'json_object' | 'text' };
  
  // Context
  user?: string;  // User identifier for abuse detection
}

interface CompletionResponse {
  id: string;
  model: string;
  
  choices: Array<{
    index: number;
    message: Message;
    finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  }>;
  
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface StreamChunk {
  id: string;
  model: string;
  
  choices: Array<{
    index: number;
    delta: Partial<Message>;
    finishReason: string | null;
  }>;
}
```

### 4.2 Provider Implementations

#### OpenAI Provider

```typescript
class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly type = AIProviderType.OPENAI;
  
  private client: OpenAI;
  
  async initialize(config: ProviderConfig): Promise<void> {
    const apiKey = await this.secretService.getSecret(config.apiKeySecretId);
    this.client = new OpenAI({
      apiKey: apiKey.value,
      baseURL: config.baseUrl
    });
  }
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      // ... other params
    });
    
    return this.mapResponse(response);
  }
  
  async *completeStream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      ...this.mapRequest(request),
      stream: true
    });
    
    for await (const chunk of stream) {
      yield this.mapStreamChunk(chunk);
    }
  }
}
```

#### Anthropic Provider

```typescript
class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  readonly type = AIProviderType.ANTHROPIC;
  
  private client: Anthropic;
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Convert OpenAI-style messages to Anthropic format
    const { system, messages } = this.convertMessages(request.messages);
    
    const response = await this.client.messages.create({
      model: request.model,
      system,
      messages,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature
    });
    
    return this.mapResponse(response);
  }
}
```

#### Ollama Provider (Local Models)

```typescript
class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  readonly type = AIProviderType.OLLAMA;
  
  private baseUrl: string;
  
  async initialize(config: ProviderConfig): Promise<void> {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens
        }
      })
    });
    
    return this.mapResponse(await response.json());
  }
}
```

### 4.3 Default Models by Provider

| Provider | Models | Best For |
|----------|--------|----------|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, o1, o1-mini | General purpose, code |
| **Anthropic** | claude-3-5-sonnet, claude-3-opus, claude-3-haiku | Long context, analysis |
| **Azure OpenAI** | (same as OpenAI, deployed) | Enterprise, compliance |
| **Google Gemini** | gemini-1.5-pro, gemini-1.5-flash | Multimodal, large context |
| **Ollama** | llama3, codellama, mistral | Local/offline, privacy |
| **Chutes** | (various) | Custom deployments |

---

## 5. Core Features

### 5.1 Model Router

```typescript
class ModelRouter {
  /**
   * Select the best model for a given request
   */
  async selectModel(
    request: RoutingRequest,
    context: RoutingContext
  ): Promise<AIModel> {
    // 1. Get applicable routing rules
    const rules = await this.getRoutingRules(context.organizationId);
    
    // 2. Filter by matching criteria
    const matchingRules = rules.filter(rule => 
      this.matchesRule(rule, request)
    );
    
    // 3. Sort by priority
    matchingRules.sort((a, b) => b.priority - a.priority);
    
    // 4. Return first enabled model
    for (const rule of matchingRules) {
      const model = await this.getModel(rule.modelId);
      if (model && model.isEnabled) {
        return model;
      }
    }
    
    // 5. Fall back to default model
    return this.getDefaultModel(context.organizationId);
  }
  
  private matchesRule(rule: AIRoutingRule, request: RoutingRequest): boolean {
    if (rule.taskType && rule.taskType !== request.taskType) return false;
    if (rule.contextSizeMin && request.contextSize < rule.contextSizeMin) return false;
    if (rule.contextSizeMax && request.contextSize > rule.contextSizeMax) return false;
    if (rule.requiresVision && !request.hasImages) return false;
    if (rule.requiresFunctions && !request.usesFunctions) return false;
    return true;
  }
}

interface RoutingRequest {
  taskType: string;           // 'planning', 'code-gen', 'agent', etc.
  contextSize: number;        // Estimated tokens
  hasImages?: boolean;
  usesFunctions?: boolean;
  preferredModel?: string;    // Hint from caller
}
```

### 5.2 Fallback Handler

```typescript
class FallbackHandler {
  async executeWithFallback<T>(
    primaryModelId: string,
    operation: (model: AIModel) => Promise<T>,
    context: ExecutionContext
  ): Promise<T> {
    const chain = await this.getFallbackChain(primaryModelId, context.organizationId);
    const modelsToTry = [primaryModelId, ...chain.fallbackModelIds];
    
    let lastError: Error | null = null;
    
    for (const modelId of modelsToTry) {
      try {
        const model = await this.getModel(modelId);
        const result = await this.withTimeout(
          operation(model),
          chain.timeoutMs
        );
        
        // Log if this was a fallback
        if (modelId !== primaryModelId) {
          await this.logFallback(primaryModelId, modelId, lastError);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should try fallback
        if (!this.shouldFallback(error, chain)) {
          throw error;
        }
      }
    }
    
    throw new AllModelsFailedError(modelsToTry, lastError);
  }
  
  private shouldFallback(error: Error, chain: AIFallbackChain): boolean {
    if (error instanceof RateLimitError && chain.triggerOnRateLimit) return true;
    if (error instanceof TimeoutError && chain.triggerOnTimeout) return true;
    if (chain.triggerOnError) return true;
    return false;
  }
}
```

### 5.3 Context Manager

```typescript
class ContextManager {
  /**
   * Ensure messages fit within model's context window
   */
  truncateToFit(
    messages: Message[],
    model: AIModel,
    reserveTokens: number = 1000
  ): Message[] {
    const maxTokens = model.contextWindow - reserveTokens;
    let totalTokens = 0;
    const result: Message[] = [];
    
    // Always keep system message
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      totalTokens += this.countTokens(systemMessage.content);
      result.push(systemMessage);
    }
    
    // Add messages from most recent, stop when limit reached
    const nonSystemMessages = messages
      .filter(m => m.role !== 'system')
      .reverse();
    
    for (const message of nonSystemMessages) {
      const tokens = this.countTokens(message.content);
      if (totalTokens + tokens > maxTokens) {
        break;
      }
      totalTokens += tokens;
      result.unshift(message);
    }
    
    return result;
  }
  
  /**
   * Estimate token count for a string
   */
  countTokens(text: string): number {
    // Use tiktoken for accurate counting, or estimate
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

### 5.4 Request Caching

```typescript
class CacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hour
  
  async getCachedResponse(
    request: CompletionRequest
  ): Promise<CompletionResponse | null> {
    const hash = this.hashRequest(request);
    
    const cached = await prisma.aICache.findUnique({
      where: { requestHash: hash }
    });
    
    if (!cached || cached.expiresAt < new Date()) {
      return null;
    }
    
    // Update stats
    await prisma.aICache.update({
      where: { id: cached.id },
      data: {
        hitCount: { increment: 1 },
        lastAccessedAt: new Date()
      }
    });
    
    return cached.response as CompletionResponse;
  }
  
  async cacheResponse(
    request: CompletionRequest,
    response: CompletionResponse,
    ttlSeconds?: number
  ): Promise<void> {
    const hash = this.hashRequest(request);
    const ttl = ttlSeconds || this.DEFAULT_TTL;
    
    await prisma.aICache.upsert({
      where: { requestHash: hash },
      create: {
        requestHash: hash,
        modelId: response.model,
        response: response as any,
        inputTokens: response.usage.promptTokens,
        outputTokens: response.usage.completionTokens,
        expiresAt: new Date(Date.now() + ttl * 1000)
      },
      update: {
        response: response as any,
        expiresAt: new Date(Date.now() + ttl * 1000)
      }
    });
  }
  
  private hashRequest(request: CompletionRequest): string {
    // Hash model + messages + key parameters
    const key = JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens
    });
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
```

### 5.5 Rate Limiter

```typescript
class RateLimiter {
  async checkLimit(
    organizationId: string,
    userId: string
  ): Promise<RateLimitResult> {
    // Check organization limit
    const orgLimit = await this.getLimit(RateLimitScope.ORGANIZATION, organizationId);
    if (orgLimit && !await this.isWithinLimit(orgLimit, `org:${organizationId}`)) {
      return { allowed: false, scope: 'organization', retryAfter: orgLimit.retryAfter };
    }
    
    // Check user limit
    const userLimit = await this.getLimit(RateLimitScope.USER, userId);
    if (userLimit && !await this.isWithinLimit(userLimit, `user:${userId}`)) {
      return { allowed: false, scope: 'user', retryAfter: userLimit.retryAfter };
    }
    
    return { allowed: true };
  }
  
  async recordUsage(
    organizationId: string,
    userId: string,
    tokens: number
  ): Promise<void> {
    // Increment counters in Redis
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const hour = Math.floor(now / 3600000);
    const day = Math.floor(now / 86400000);
    
    await Promise.all([
      this.redis.incr(`ratelimit:org:${organizationId}:req:${minute}`),
      this.redis.incrby(`ratelimit:org:${organizationId}:tokens:${minute}`, tokens),
      this.redis.incr(`ratelimit:user:${userId}:req:${minute}`),
      // Set expiry
      this.redis.expire(`ratelimit:org:${organizationId}:req:${minute}`, 120)
    ]);
  }
}
```

---

## 6. API Endpoints

### 6.1 Completion Endpoints

```typescript
// POST /api/ai/completions
// Create a completion
interface CreateCompletionRequest {
  model?: string;                    // Optional, uses routing if not specified
  messages: Message[];
  
  // Parameters
  temperature?: number;              // 0-2, default 1
  maxTokens?: number;                // Max output tokens
  topP?: number;                     // Nucleus sampling
  stop?: string[];                   // Stop sequences
  
  // Features
  stream?: boolean;                  // Enable streaming
  functions?: FunctionDefinition[];  // Function calling
  responseFormat?: ResponseFormat;   // JSON mode
  
  // Routing hints
  taskType?: string;                 // Helps model selection
  preferredModel?: string;           // Model preference
  
  // Caching
  useCache?: boolean;                // Enable response caching
  cacheTtl?: number;                 // Cache TTL in seconds
}

// Response (non-streaming)
interface CompletionResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage: Usage;
  cached: boolean;
}

// Response (streaming) - Server-Sent Events
// Content-Type: text/event-stream
// data: {"id":"...","choices":[{"delta":{"content":"Hello"}}]}
// data: {"id":"...","choices":[{"delta":{"content":" world"}}]}
// data: [DONE]
```

### 6.2 Model Endpoints

```typescript
// GET /api/ai/models
// List available models
interface ListModelsResponse {
  models: Array<{
    id: string;
    name: string;
    provider: string;
    contextWindow: number;
    capabilities: string[];
    tier: string;
    isDefault: boolean;
  }>;
}

// GET /api/ai/models/:id
// Get model details

// PUT /api/ai/models/:id/configure
// Configure model for organization (Org Admin)
interface ConfigureModelRequest {
  isEnabled?: boolean;
  isDefault?: boolean;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}
```

### 6.3 Provider Endpoints

```typescript
// GET /api/ai/providers
// List available providers

// POST /api/ai/providers/:id/configure
// Configure provider for organization (Org Admin)
interface ConfigureProviderRequest {
  apiKeySecretId: string;            // Reference to Secret Management
  customBaseUrl?: string;            // For Azure, Ollama, etc.
  isEnabled?: boolean;
  priority?: number;
}

// POST /api/ai/providers/:id/test
// Test provider configuration
interface TestProviderResponse {
  success: boolean;
  latencyMs: number;
  error?: string;
}
```

### 6.4 Routing Endpoints

```typescript
// GET /api/ai/routing/rules
// List routing rules

// POST /api/ai/routing/rules
// Create routing rule (Admin)
interface CreateRoutingRuleRequest {
  name: string;
  taskType?: string;
  contextSizeMin?: number;
  contextSizeMax?: number;
  requiresVision?: boolean;
  requiresFunctions?: boolean;
  modelId: string;
  priority: number;
}

// GET /api/ai/routing/fallbacks
// List fallback chains

// POST /api/ai/routing/fallbacks
// Create fallback chain
interface CreateFallbackChainRequest {
  primaryModelId: string;
  fallbackModelIds: string[];
  triggerOnError?: boolean;
  triggerOnRateLimit?: boolean;
  triggerOnTimeout?: boolean;
  timeoutMs?: number;
}
```

### 6.5 Endpoint Permission Matrix

| Endpoint | Super Admin | Org Admin | User |
|----------|-------------|-----------|------|
| `POST /api/ai/completions` | ✅ | ✅ | ✅ |
| `GET /api/ai/models` | ✅ | ✅ | ✅ |
| `PUT /api/ai/models/:id/configure` | ✅ | ✅ | ❌ |
| `GET /api/ai/providers` | ✅ | ✅ | ✅ |
| `POST /api/ai/providers/:id/configure` | ✅ | ✅ | ❌ |
| `POST /api/ai/routing/rules` (global) | ✅ | ❌ | ❌ |
| `POST /api/ai/routing/rules` (org) | ✅ | ✅ | ❌ |
| `GET /api/ai/admin/*` | ✅ | ❌ | ❌ |

---

## 7. Configuration

### 7.1 Environment Variables

```bash
# AI Service Configuration
AI_SERVICE_PORT=3001
AI_SERVICE_HOST=0.0.0.0

# Database
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;

# Redis (for rate limiting, caching)
REDIS_URL=redis://redis:6379

# RabbitMQ (for events)
RABBITMQ_URL=amqp://rabbitmq:5672

# Secret Management
SECRET_SERVICE_URL=http://secret-management:3000

# Usage Tracking
USAGE_TRACKING_URL=http://usage-tracking:3000

# Default timeouts
AI_DEFAULT_TIMEOUT_MS=30000
AI_STREAM_TIMEOUT_MS=120000

# Caching
AI_CACHE_ENABLED=true
AI_CACHE_DEFAULT_TTL=3600

# Rate limiting defaults
AI_RATE_LIMIT_REQUESTS_PER_MINUTE=60
AI_RATE_LIMIT_TOKENS_PER_MINUTE=100000
```

### 7.2 Default Model Configuration

```typescript
const defaultModels = [
  // OpenAI
  { provider: 'openai', name: 'gpt-4o', tier: 'PREMIUM', category: 'GENERAL', contextWindow: 128000 },
  { provider: 'openai', name: 'gpt-4o-mini', tier: 'STANDARD', category: 'GENERAL', contextWindow: 128000 },
  { provider: 'openai', name: 'o1', tier: 'PREMIUM', category: 'REASONING', contextWindow: 128000 },
  
  // Anthropic
  { provider: 'anthropic', name: 'claude-3-5-sonnet-20241022', tier: 'PREMIUM', category: 'GENERAL', contextWindow: 200000 },
  { provider: 'anthropic', name: 'claude-3-haiku-20240307', tier: 'ECONOMY', category: 'FAST', contextWindow: 200000 },
  
  // Google
  { provider: 'gemini', name: 'gemini-1.5-pro', tier: 'PREMIUM', category: 'GENERAL', contextWindow: 1000000 },
  { provider: 'gemini', name: 'gemini-1.5-flash', tier: 'STANDARD', category: 'FAST', contextWindow: 1000000 },
];

const defaultRoutingRules = [
  { taskType: 'planning', modelName: 'claude-3-5-sonnet-20241022', priority: 100 },
  { taskType: 'code-gen', modelName: 'gpt-4o', priority: 100 },
  { taskType: 'agent', modelName: 'gpt-4o', priority: 100 },
  { taskType: 'fast', modelName: 'gpt-4o-mini', priority: 100 },
];
```

---

## 8. UI Views

### 8.1 View Overview

```
src/renderer/
├── components/ai/
│   ├── ModelSelector/           # Model selection dropdown
│   ├── ProviderConfig/          # Provider configuration
│   ├── RoutingRules/            # Routing rule management
│   └── AIStatus/                # AI service status indicator
│
├── pages/ai/
│   ├── ModelsPage.tsx           # Model management (Admin)
│   ├── ProvidersPage.tsx        # Provider configuration (Admin)
│   └── RoutingPage.tsx          # Routing rules (Admin)
│
└── contexts/
    └── AIContext.tsx            # AI state management
```

### 8.2 Admin: Model Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AI Models                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Provider: [All ▼]    Tier: [All ▼]    Status: [Enabled ▼]                  │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ⭐ gpt-4o                                           OpenAI │ Premium    │ │
│ │    Context: 128K tokens │ Functions ✓ │ Vision ✓ │ JSON ✓              │ │
│ │    Default for: code-gen, agent                              [Configure] │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │    claude-3-5-sonnet                               Anthropic │ Premium   │ │
│ │    Context: 200K tokens │ Functions ✓ │ Vision ✓                        │ │
│ │    Default for: planning                                     [Configure] │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │    gpt-4o-mini                                      OpenAI │ Standard   │ │
│ │    Context: 128K tokens │ Functions ✓ │ Vision ✓ │ JSON ✓              │ │
│ │    Default for: fast tasks                                   [Configure] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Admin: Provider Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AI Providers                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🟢 OpenAI                                              ✓ Configured     │ │
│ │    API Key: sk-****...****                                              │ │
│ │    Models: gpt-4o, gpt-4o-mini, o1, o1-mini                            │ │
│ │    Priority: 1 (Primary)                        [Test] [Edit] [Disable] │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 🟢 Anthropic                                           ✓ Configured     │ │
│ │    API Key: sk-ant-****...****                                          │ │
│ │    Models: claude-3-5-sonnet, claude-3-opus, claude-3-haiku            │ │
│ │    Priority: 2 (Fallback)                       [Test] [Edit] [Disable] │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ ⚪ Ollama                                              Not Configured    │ │
│ │    Local models for offline use                                         │ │
│ │                                                              [Configure] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Guidelines

### 9.1 Implementation Phases

#### Phase 1: Core Infrastructure (Weeks 1-2)
- [ ] Database schema and migrations
- [ ] Provider interface and factory
- [ ] OpenAI provider implementation
- [ ] Basic completion endpoint

#### Phase 2: Multi-Provider Support (Weeks 3-4)
- [ ] Anthropic provider
- [ ] Azure OpenAI provider
- [ ] Google Gemini provider
- [ ] Ollama provider

#### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Model router implementation
- [ ] Fallback handling
- [ ] Context manager
- [ ] Streaming support

#### Phase 4: Operational Features (Weeks 7-8)
- [ ] Rate limiting
- [ ] Request caching
- [ ] Health checks
- [ ] Logging and monitoring

#### Phase 5: Admin UI (Weeks 9-10)
- [ ] Model management UI
- [ ] Provider configuration UI
- [ ] Routing rules UI

### 9.2 Dependencies

| Dependency | Purpose |
|------------|---------|
| `openai` | OpenAI API client |
| `@anthropic-ai/sdk` | Anthropic API client |
| `@google/generative-ai` | Google Gemini client |
| `tiktoken` | Token counting |
| `ioredis` | Redis for caching/rate limiting |

### 9.3 Events Published (RabbitMQ)

```typescript
type AIServiceEvent =
  | { type: 'ai.completion.started'; requestId: string; model: string; organizationId: string }
  | { type: 'ai.completion.completed'; requestId: string; model: string; tokensUsed: number; durationMs: number }
  | { type: 'ai.completion.failed'; requestId: string; model: string; error: string }
  | { type: 'ai.completion.fallback'; requestId: string; fromModel: string; toModel: string; reason: string }
  | { type: 'ai.ratelimit.exceeded'; organizationId: string; userId: string; scope: string }
  | { type: 'ai.provider.health.changed'; providerId: string; status: string };
```

---

## Summary

The AI Service Module provides a centralized, robust, and flexible system for all LLM operations in Coder IDE:

1. **Multi-Provider**: OpenAI, Anthropic, Azure, Gemini, Ollama, Chutes
2. **Smart Routing**: Automatic model selection based on task requirements
3. **Resilient**: Fallback chains, timeouts, error handling
4. **Efficient**: Request caching, rate limiting
5. **Streaming**: Real-time token streaming support
6. **Configurable**: Per-organization settings, model preferences

---

**Related Documents:**
- [Architecture](../architecture.md)
- [Secret Management](../Secret%20Management/todo.md)
- [Usage Tracking](../Usage%20Tracking/todo.md)
- [Prompt Management](../Prompt%20Management/todo.md)

