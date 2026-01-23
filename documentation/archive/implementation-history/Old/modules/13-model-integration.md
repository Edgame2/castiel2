# Model Integration Module

**Category:** AI & Intelligence  
**Location:** `src/core/models/`  
**Last Updated:** 2025-01-27

---

## Overview

The Model Integration Module provides a unified interface for integrating with multiple AI model providers (OpenAI, Ollama, Anthropic, etc.). It handles model routing, provider selection, request/response management, and advanced features like structured output and rate limiting.

## Purpose

- Unified model provider abstraction
- Multi-provider support (OpenAI, Ollama, Anthropic, Custom)
- Intelligent model selection
- Request/response handling
- Streaming support
- Rate limiting and budget management
- Structured output enforcement

---

## Key Components

### 1. Model Router (`ModelRouter.ts`)

**Location:** `src/core/models/ModelRouter.ts`

**Purpose:** Main model routing and orchestration

**Responsibilities:**
- Route requests to appropriate provider
- Select optimal model
- Handle provider fallback
- Manage request lifecycle

**Key Methods:**
```typescript
async generate(request: ModelRequest, selection?: ModelSelection): Promise<ModelResponse>
async stream(request: ModelRequest, onChunk: (chunk: StreamingChunk) => void, selection?: ModelSelection): Promise<void>
async selectProvider(selection: ModelSelection): Promise<IModelProvider>
```

### 2. Model Providers

#### OpenAI Provider (`OpenAIProvider.ts`)

**Location:** `src/core/models/OpenAIProvider.ts`

**Purpose:** OpenAI API integration

**Features:**
- GPT-4, GPT-3.5 support
- Streaming support
- Function calling
- Structured output

**Configuration:**
```typescript
const provider = new OpenAIProvider(apiKey, baseURL, defaultModel);
```

#### Ollama Provider (`OllamaProvider.ts`)

**Location:** `src/core/models/OllamaProvider.ts`

**Purpose:** Local Ollama integration

**Features:**
- Local model support
- Streaming support
- Custom models
- No API key required

**Configuration:**
```typescript
const provider = new OllamaProvider(baseURL, defaultModel);
```

#### Anthropic Provider (`AnthropicProvider.ts`)

**Location:** `src/core/models/AnthropicProvider.ts`

**Purpose:** Anthropic Claude integration

**Features:**
- Claude models
- Streaming support
- Long context windows

#### Custom Local Provider (`CustomLocalProvider.ts`)

**Location:** `src/core/models/CustomLocalProvider.ts`

**Purpose:** Custom local model integration

**Features:**
- Custom model endpoints
- Flexible configuration
- Local inference

### 3. Model Interface (`IModelProvider.ts`)

**Location:** `src/core/models/IModelProvider.ts`

**Purpose:** Provider interface definition

**Interface:**
```typescript
interface IModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>
  stream(request: ModelRequest, onChunk: (chunk: StreamingChunk) => void): Promise<void>
  isAvailable(): Promise<boolean>
  getModelInfo(): Promise<ModelInfo>
  listModels(): Promise<string[]>
}
```

### 4. Intelligent Model Selector (`IntelligentModelSelector.ts`)

**Location:** `src/core/models/IntelligentModelSelector.ts`

**Purpose:** Select optimal model for task

**Selection Factors:**
- Task type
- Context size
- Cost considerations
- Performance requirements
- Model availability

### 5. Model Registry (`ModelRegistry.ts`)

**Location:** `src/core/models/ModelRegistry.ts`

**Purpose:** Register and manage models

**Features:**
- Model registration
- Model metadata
- Model capabilities
- Model availability

### 6. Task Classifier (`TaskClassifier.ts`)

**Location:** `src/core/models/TaskClassifier.ts`

**Purpose:** Classify tasks for model selection

**Task Types:**
- Code generation
- Code explanation
- Code review
- Planning
- Refactoring
- Testing

### 7. Budget Manager (`BudgetManager.ts`)

**Location:** `src/core/models/BudgetManager.ts`

**Purpose:** Manage API usage budgets

**Features:**
- Budget tracking
- Cost estimation
- Budget limits
- Usage alerts

### 8. Structured Output Enforcer (`StructuredOutputEnforcer.ts`)

**Location:** `src/core/models/StructuredOutputEnforcer.ts`

**Purpose:** Enforce structured output formats

**Features:**
- JSON schema validation
- XML format support
- Custom formats
- Output validation

### 9. Output Schema Validator (`OutputSchemaValidator.ts`)

**Location:** `src/core/models/OutputSchemaValidator.ts`

**Purpose:** Validate output against schemas

**Features:**
- Schema validation
- Type checking
- Error reporting
- Retry logic

---

## Model Selection

### Selection Modes

**Auto Selection:**
```typescript
const selection: ModelSelection = {
  provider: 'auto',
  modelId: undefined,
  fallback: true,
};
```

**Specific Provider:**
```typescript
const selection: ModelSelection = {
  provider: 'openai',
  modelId: 'gpt-4',
  fallback: true,
};
```

**Local Only:**
```typescript
const selection: ModelSelection = {
  provider: 'ollama',
  modelId: 'deepseek-coder:6.7b',
  fallback: false,
};
```

### Selection Logic

1. Check provider availability
2. Evaluate task requirements
3. Consider cost/performance trade-offs
4. Select optimal model
5. Fallback if needed

---

## Request/Response

### Model Request

```typescript
interface ModelRequest {
  prompt: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  systemPrompt?: string;
  context?: any;
}
```

### Model Response

```typescript
interface ModelResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  metadata?: any;
}
```

### Streaming

```typescript
await router.stream(request, (chunk: StreamingChunk) => {
  console.log(chunk.content);
  if (chunk.done) {
    console.log('Stream complete');
  }
});
```

---

## Provider Features

### OpenAI

**Models:**
- GPT-4
- GPT-4 Turbo
- GPT-3.5 Turbo

**Features:**
- Function calling
- Structured output
- Long context
- High quality

### Ollama

**Models:**
- deepseek-coder
- llama2
- codellama
- Custom models

**Features:**
- Local execution
- No API costs
- Privacy
- Customizable

### Anthropic

**Models:**
- Claude 3 Opus
- Claude 3 Sonnet
- Claude 3 Haiku

**Features:**
- Long context
- High quality
- Safety features

---

## Rate Limiting

### Rate Limiter (`RateLimiter.ts`)

**Purpose:** Manage API rate limits

**Features:**
- Request throttling
- Rate limit tracking
- Backoff strategies
- Queue management

**Configuration:**
```typescript
const rateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  strategy: 'exponential-backoff',
});
```

---

## Budget Management

### Budget Tracking

```typescript
const budgetManager = new BudgetManager({
  dailyLimit: 100, // $100/day
  monthlyLimit: 2000, // $2000/month
  alertThreshold: 0.8, // Alert at 80%
});

// Track usage
await budgetManager.trackUsage(cost);

// Check budget
const canProceed = await budgetManager.checkBudget(estimatedCost);
```

---

## Structured Output

### JSON Schema

```typescript
const schema = {
  type: 'object',
  properties: {
    plan: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  },
};

const enforcer = new StructuredOutputEnforcer({
  format: 'json',
  schema: schema,
});

const response = await enforcer.enforce(request, schema);
```

---

## Error Handling

### Provider Errors

- Network errors → Retry with backoff
- Rate limit errors → Queue and retry
- Authentication errors → Fail fast
- Model errors → Fallback to alternative

### Fallback Strategy

```typescript
try {
  return await openAIProvider.generate(request);
} catch (error) {
  if (error.isRateLimit && selection.fallback) {
    console.warn('OpenAI rate limited, using Ollama');
    return await ollamaProvider.generate(request);
  }
  throw error;
}
```

---

## Usage Examples

### Basic Generation

```typescript
const router = new ModelRouter(configManager);

const response = await router.generate({
  prompt: 'Generate a React component',
  modelId: 'gpt-4',
});

console.log(response.content);
```

### Streaming

```typescript
await router.stream(
  {
    prompt: 'Explain this code',
    modelId: 'gpt-4',
  },
  (chunk) => {
    process.stdout.write(chunk.content);
  }
);
```

### Auto Selection

```typescript
const response = await router.generate(
  {
    prompt: 'Write a function',
  },
  {
    provider: 'auto',
    fallback: true,
  }
);
```

---

## Related Modules

- **Planning Module** - Uses models for plan generation
- **Execution Module** - Uses models for code generation
- **Agents Module** - Uses models for agent operations
- **Context Aggregation Module** - Provides context for models

---

## Summary

The Model Integration Module provides a comprehensive, unified interface for AI model integration in Coder IDE. With support for multiple providers, intelligent model selection, streaming, rate limiting, and structured output, it enables reliable and efficient AI-powered features throughout the application.
