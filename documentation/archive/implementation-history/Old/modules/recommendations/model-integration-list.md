# Model Integration Module
## AI Model Provider Integration and Management

---

## OVERVIEW

**Location:** `src/core/models/`  
**Purpose:** Unified interface for multiple AI model providers with intelligent routing  
**Category:** AI & Intelligence

---

## CORE COMPONENTS (9)

### 1. Model Router
**File:** `ModelRouter.ts`

**Purpose:** Main orchestrator for model routing and selection

**Key Methods:**
```typescript
async generate(request: ModelRequest, selection?: ModelSelection): Promise<ModelResponse>
async stream(request: ModelRequest, onChunk: (chunk: StreamingChunk) => void, selection?: ModelSelection): Promise<void>
async selectProvider(selection: ModelSelection): Promise<IModelProvider>
```

**Responsibilities:**
- Route requests to appropriate provider
- Select optimal model for task
- Handle provider fallback
- Coordinate request lifecycle
- Manage streaming

---

### 2. Model Providers (4)

#### OpenAI Provider
**File:** `OpenAIProvider.ts`

**Models:**
- GPT-4, GPT-4 Turbo
- GPT-3.5 Turbo

**Features:**
- Function calling
- Structured output
- Long context (128K tokens)
- High quality generation

---

#### Ollama Provider
**File:** `OllamaProvider.ts`

**Models:**
- deepseek-coder
- llama2, llama3
- codellama
- Custom local models

**Features:**
- Local execution (no API costs)
- Privacy (no data leaves system)
- Customizable models
- No API key required

---

#### Anthropic Provider
**File:** `AnthropicProvider.ts`

**Models:**
- Claude 3 Opus
- Claude 3 Sonnet
- Claude 3 Haiku

**Features:**
- Very long context (200K tokens)
- High quality reasoning
- Safety features

---

#### Custom Local Provider
**File:** `CustomLocalProvider.ts`

**Purpose:** Support custom local model endpoints

**Features:**
- Flexible endpoint configuration
- Custom model integration
- Local inference support

---

### 3. Model Interface
**File:** `IModelProvider.ts`

**Interface Definition:**
```typescript
interface IModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>
  stream(request: ModelRequest, onChunk: (chunk: StreamingChunk) => void): Promise<void>
  isAvailable(): Promise<boolean>
  getModelInfo(): Promise<ModelInfo>
  listModels(): Promise<string[]>
}
```

---

### 4. Intelligent Model Selector
**File:** `IntelligentModelSelector.ts`

**Purpose:** Select optimal model for task

**Selection Factors:**
- Task type (code generation, explanation, planning, etc.)
- Context size requirements
- Cost considerations
- Performance requirements (speed vs quality)
- Model availability

**Selection Process:**
1. Classify task type
2. Check provider availability
3. Evaluate task requirements
4. Consider cost/performance trade-offs
5. Select optimal model
6. Apply fallback if needed

---

### 5. Model Registry
**File:** `ModelRegistry.ts`

**Purpose:** Central registry of available models

**Features:**
- Model registration
- Model metadata (context window, cost, capabilities)
- Model availability tracking
- Model versioning

**Model Info:**
```typescript
interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
  capabilities: ModelCapability[];
}
```

---

### 6. Task Classifier
**File:** `TaskClassifier.ts`

**Purpose:** Classify tasks for optimal model selection

**Task Types:**
- `code_generation` - Generate new code
- `code_explanation` - Explain existing code
- `code_review` - Review code quality
- `planning` - Create implementation plans
- `refactoring` - Refactor code
- `testing` - Generate tests
- `documentation` - Generate docs

**Classification Process:**
1. Analyze prompt
2. Detect keywords
3. Determine task type
4. Assess complexity

---

### 7. Budget Manager
**File:** `BudgetManager.ts`

**Purpose:** Track and limit API usage costs

**Features:**
- Cost estimation
- Budget tracking
- Budget limits (daily, monthly)
- Usage alerts
- Cost reporting

**Configuration:**
```typescript
interface BudgetConfig {
  dailyLimit: number;      // USD
  monthlyLimit: number;    // USD
  alertThreshold: number;  // 0-1 (0.8 = 80%)
  blockOnLimit: boolean;
}
```

**Operations:**
```typescript
async checkBudget(estimatedCost: number): Promise<boolean>
async trackUsage(cost: number): Promise<void>
async getCurrentUsage(): Promise<UsageStats>
async getRemainingBudget(): Promise<number>
```

---

### 8. Structured Output Enforcer
**File:** `StructuredOutputEnforcer.ts`

**Purpose:** Enforce structured output formats (JSON, XML)

**Features:**
- JSON schema enforcement
- XML format support
- Custom format templates
- Output validation
- Retry on invalid output

**Usage:**
```typescript
const schema = {
  type: 'object',
  properties: {
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' }
        }
      }
    }
  }
};

const response = await enforcer.enforce(request, schema);
// Guaranteed to match schema
```

---

### 9. Output Schema Validator
**File:** `OutputSchemaValidator.ts`

**Purpose:** Validate model outputs against schemas

**Features:**
- JSON schema validation
- Type checking
- Error reporting
- Retry logic for invalid outputs

---

## ADDITIONAL COMPONENTS (2)

### 10. Rate Limiter
**File:** `RateLimiter.ts`

**Purpose:** Manage API rate limits

**Features:**
- Request throttling
- Rate limit tracking
- Backoff strategies (linear, exponential)
- Queue management
- Per-provider limits

**Configuration:**
```typescript
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;        // Time window in ms
  strategy: 'linear' | 'exponential';
  maxRetries: number;
}
```

---

### 11. Model Config Manager
**File:** `ModelConfigManager.ts`

**Purpose:** Manage model configurations

**Configuration:**
```typescript
interface ModelConfig {
  providers: {
    openai: {
      apiKey: string;
      baseURL?: string;
      defaultModel: string;
    };
    ollama: {
      baseURL: string;
      defaultModel: string;
    };
    anthropic: {
      apiKey: string;
      defaultModel: string;
    };
  };
  defaultProvider: 'openai' | 'ollama' | 'anthropic';
  fallbackChain: string[];
}
```

---

## MODEL SELECTION

### Selection Modes

**Auto Selection:**
```typescript
const selection: ModelSelection = {
  provider: 'auto',      // Automatic provider selection
  modelId: undefined,    // Auto-select model
  fallback: true         // Enable fallback
};
```

**Specific Provider:**
```typescript
const selection: ModelSelection = {
  provider: 'openai',
  modelId: 'gpt-4',
  fallback: true
};
```

**Local Only:**
```typescript
const selection: ModelSelection = {
  provider: 'ollama',
  modelId: 'deepseek-coder:6.7b',
  fallback: false        // No fallback to cloud
};
```

---

## REQUEST/RESPONSE MODELS

### Model Request
```typescript
interface ModelRequest {
  prompt: string;
  modelId?: string;
  temperature?: number;       // 0-2
  maxTokens?: number;
  topP?: number;             // 0-1
  frequencyPenalty?: number; // -2 to 2
  presencePenalty?: number;  // -2 to 2
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
  finishReason?: 'stop' | 'length' | 'content_filter';
  metadata?: any;
}
```

### Streaming Chunk
```typescript
interface StreamingChunk {
  content: string;
  done: boolean;
  model?: string;
}
```

---

## FEATURES

### 1. Streaming Support

**All providers support streaming:**
```typescript
await router.stream(
  { prompt: 'Explain this code', modelId: 'gpt-4' },
  (chunk) => {
    process.stdout.write(chunk.content);
    if (chunk.done) {
      console.log('\nComplete!');
    }
  }
);
```

---

### 2. Fallback Chain

**Automatic fallback on failure:**
```typescript
// Config: openai → ollama → fail
try {
  return await openAIProvider.generate(request);
} catch (error) {
  if (error.isRateLimit || error.isNetwork) {
    console.warn('OpenAI failed, falling back to Ollama');
    return await ollamaProvider.generate(request);
  }
  throw error;
}
```

---

### 3. Rate Limiting

**Automatic rate limit handling:**
- Request queuing
- Exponential backoff
- Retry logic
- Provider switching on limit

---

### 4. Budget Management

**Cost tracking and limits:**
```typescript
// Before request
const canProceed = await budgetManager.checkBudget(estimatedCost);

if (!canProceed) {
  throw new Error('Budget limit reached');
}

// After request
await budgetManager.trackUsage(actualCost);
```

---

### 5. Structured Output

**Guaranteed JSON output:**
```typescript
const response = await enforcer.enforce(
  { prompt: 'Generate a plan' },
  planSchema
);

// response.content is guaranteed to be valid JSON
// matching planSchema
```

---

## ERROR HANDLING

### Error Types

**Provider Errors:**
- `NetworkError` - Connection failures → Retry with backoff
- `RateLimitError` - Rate limit hit → Queue/fallback
- `AuthenticationError` - Invalid API key → Fail fast
- `ModelError` - Model unavailable → Fallback
- `ValidationError` - Invalid request → Fix and retry

### Fallback Strategy

1. Try primary provider
2. On failure, check error type
3. If retryable, retry with backoff
4. If not retryable or retries exhausted, try fallback provider
5. Repeat until success or all providers exhausted

---

## USAGE EXAMPLES

### Basic Generation
```typescript
const router = new ModelRouter(configManager);

const response = await router.generate({
  prompt: 'Write a Python function to sort a list',
  modelId: 'gpt-4',
  temperature: 0.7,
});

console.log(response.content);
```

### Auto Provider Selection
```typescript
const response = await router.generate(
  { prompt: 'Explain this code' },
  { provider: 'auto', fallback: true }
);
```

### Streaming with Progress
```typescript
let accumulated = '';

await router.stream(
  { prompt: 'Generate a React component' },
  (chunk) => {
    accumulated += chunk.content;
    updateUI(accumulated);
  }
);
```

---

## INTEGRATION POINTS

### Used By:

1. **Planning Module** - Plan generation
2. **Execution Module** - Code generation
3. **Agents Module** - Agent operations
4. **Intent Module** - Intent inference

### Uses:

1. **Context Aggregation** - Project context
2. **Config Manager** - Model configuration

---

## IPC CHANNELS

**Channels:**
- `model:generate` - Generate response
- `model:stream` - Stream response
- `model:list-models` - List available models
- `model:get-config` - Get configuration
- `model:set-config` - Update configuration

---

## NO API ENDPOINTS

The Model Integration module has **no HTTP API endpoints** - it operates locally via IPC.

---

## SUMMARY

### Core Components: 9
1. Model Router (orchestrator)
2-5. Providers (OpenAI, Ollama, Anthropic, Custom)
6. Model Interface
7. Intelligent Model Selector
8. Model Registry
9. Task Classifier
10. Budget Manager
11. Structured Output Enforcer

### Additional: 2
- Rate Limiter
- Model Config Manager

### Providers: 4
- OpenAI (GPT-4, GPT-3.5)
- Ollama (local models)
- Anthropic (Claude 3)
- Custom (flexible endpoints)

### Features:
- **Multi-Provider:** Support for 4+ providers
- **Intelligent Selection:** Task-based model selection
- **Streaming:** Real-time response streaming
- **Fallback:** Automatic provider fallback chain
- **Rate Limiting:** Request throttling and queuing
- **Budget Management:** Cost tracking and limits
- **Structured Output:** JSON schema enforcement
- **Local Support:** Privacy-focused local models

### Selection Factors: 5
- Task type
- Context size
- Cost
- Performance
- Availability

### IPC Channels: 5
(generate, stream, list-models, get-config, set-config)

### No API Endpoints (local processing via IPC)
