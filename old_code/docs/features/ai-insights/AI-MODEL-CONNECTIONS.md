# AI Model Connections Integration

## Overview

This document details how AI Insights integrates with Castiel's AI Model Connections system to provide flexible, secure, and cost-effective AI model management.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Connection Flow](#connection-flow)
3. [Model Selection](#model-selection)
4. [Cost Tracking](#cost-tracking)
5. [Implementation Guide](#implementation-guide)
6. [Security](#security)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────────┐
│                      AI INSIGHTS SYSTEM                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐                                             │
│  │ InsightService │                                             │
│  └────────┬───────┘                                             │
│           │                                                     │
│           ├──────┐                                              │
│           │      ▼                                              │
│           │  ┌─────────────────────────┐                       │
│           │  │ AIModelSelectionService │                       │
│           │  └────────┬────────────────┘                       │
│           │           │                                         │
│           │           ├─► Tenant BYOK Check                    │
│           │           ├─► System Fallback                      │
│           │           ├─► Capability Validation                │
│           │           └─► Cost Estimation                      │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐      ┌──────────────────┐               │
│  │ AIConnectionSvc  │◄─────│ AIModelService   │               │
│  └────────┬─────────┘      └──────────────────┘               │
│           │                                                     │
│           ├──► Azure Key Vault (API Keys)                      │
│           └──► Cosmos DB (Connections & Models)                │
│                                                                  │
│  ┌────────────────────┐                                        │
│  │ AICostTrackingSvc  │                                        │
│  └────────┬───────────┘                                        │
│           │                                                     │
│           └──► Cosmos DB (aiCosts container)                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Request** → `InsightService.generate()` or `InsightService.generateStream()`
2. **Model Selection** → `AIModelSelectionService.selectOptimalModel()`
3. **Connection Retrieval** → `AIConnectionService.getConnectionWithCredentials()`
4. **Key Vault Access** → Retrieve API key from Azure Key Vault
5. **LLM Execution** → Call Azure OpenAI / Anthropic / etc. with credentials
6. **Cost Recording** → `AICostTrackingService.recordInsightCost()`

---

## Connection Flow

### 1. Tenant BYOK (Bring Your Own Key)

When a tenant wants to use their own API keys:

**Setup Flow**:

```typescript
// Admin creates connection via UI or API
POST /api/v1/admin/ai/connections
{
  "name": "Our GPT-4o Connection",
  "modelId": "model_gpt4o",
  "tenantId": "tenant_abc123",
  "apiKey": "sk-....",                    // ✅ Stored in Key Vault
  "endpoint": "https://my-azure-openai.openai.azure.com",
  "deploymentName": "gpt-4o-deployment",
  "isDefaultModel": true
}

// Backend:
// 1. AIConnectionService validates the connection
// 2. Tests the API key (optional health check)
// 3. Stores API key in Key Vault: "ai-connection-{connectionId}"
// 4. Stores connection metadata in Cosmos DB (without API key)
```

**Usage Flow**:

```typescript
// When generating insight:
const connection = await modelSelectionService.getConnectionForModel(
  'model_gpt4o',
  'tenant_abc123'
);

// Returns:
{
  connection: {
    id: 'conn_xyz',
    modelId: 'model_gpt4o',
    tenantId: 'tenant_abc123',
    endpoint: 'https://my-azure-openai.openai.azure.com',
    deploymentName: 'gpt-4o-deployment',
    // ... other metadata
  },
  credentials: {
    apiKey: 'sk-....'  // ✅ Retrieved from Key Vault
  }
}

// Use credentials to call LLM
await azureOpenAI.chat({
  endpoint: connection.connection.endpoint,
  apiKey: connection.credentials.apiKey,  // From Key Vault
  deploymentName: connection.connection.deploymentName,
  // ...
});
```

### 2. System Fallback

If tenant doesn't have a custom connection:

```typescript
// AIModelSelectionService checks tenant first
const tenantConnections = await aiConnectionService.listConnections({
  tenantId: 'tenant_abc123',
  modelId: 'model_gpt4o',
  status: 'active',
});

if (tenantConnections.connections.length === 0) {
  // Fall back to system connection
  const systemConnections = await aiConnectionService.listConnections({
    tenantId: 'system',
    modelId: 'model_gpt4o',
    status: 'active',
  });
  
  // Use system connection (tenant is billed internally)
}
```

### 3. Default Connection Resolution

```typescript
// Get default LLM for tenant
const defaultConnection = await modelSelectionService.getDefaultLLMConnection(
  'tenant_abc123'
);

// Priority:
// 1. Tenant's default LLM connection (isDefaultModel: true)
// 2. System's default LLM connection (isDefaultModel: true)
// 3. Error if none found
```

---

## Model Selection

### Selection Criteria

The `AIModelSelectionService` selects models based on:

1. **User Specification**: If `request.modelId` is provided, use that model
2. **Requirements Matching**:
   - **Context window**: Must fit prompt + expected output
   - **Capabilities**: Vision, functions, streaming, JSON mode
   - **Cost constraints**: Stay within `maxCost` if specified
   - **Provider preference**: Prefer specific provider if requested

3. **Insight Type Optimization**:
   - **Complex insights** (analysis, recommendation, prediction) → GPT-4o, Claude 3 Opus
   - **Simple insights** (summary, extraction) → GPT-3.5 Turbo, GPT-4o-mini

4. **Tenant Priority**: Always prefer tenant BYOK over system connections

### Selection Algorithm

```typescript
async selectOptimalModel(
  tenantId: string,
  requirements: ModelSelectionRequirements
): Promise<ModelSelectionResult> {
  // 1. Get all available connections (tenant + system)
  const allConnections = [
    ...await getConnectionsForTenant(tenantId),
    ...await getConnectionsForSystem()
  ];

  // 2. Filter by requirements
  let candidates = allConnections.filter(conn => {
    const model = getModel(conn.modelId);
    
    // Context window check
    if (requirements.contextTokens > conn.contextWindow) return false;
    
    // Capability checks
    if (requirements.requiresVision && !model.vision) return false;
    if (requirements.requiresFunctions && !model.functions) return false;
    if (requirements.requiresStreaming && !model.streaming) return false;
    if (requirements.requiresJSONMode && !model.jsonMode) return false;
    
    // Cost check
    if (requirements.maxCost) {
      const estimatedCost = estimateCost(model, requirements.contextTokens, 1000);
      if (estimatedCost > requirements.maxCost) return false;
    }
    
    // Provider preference
    if (requirements.preferredProvider &&
        model.provider !== requirements.preferredProvider) {
      return false;
    }
    
    return true;
  });

  // 3. Prefer tenant connections
  const tenantCandidates = candidates.filter(c => c.tenantId === tenantId);
  if (tenantCandidates.length > 0) {
    candidates = tenantCandidates;
  }

  // 4. Select best for insight type
  const selected = selectBestForInsightType(candidates, requirements.insightType);
  
  return selected;
}
```

### Model Selection Matrix

| Requirement | GPT-4o | GPT-4 Turbo | GPT-3.5 | Claude 3 Opus | Claude 3 Sonnet | Claude 3 Haiku |
|------------|--------|-------------|---------|---------------|-----------------|----------------|
| **Context Window** | 128k | 128k | 16k | 200k | 200k | 200k |
| **Streaming** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Vision** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Functions** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **JSON Mode** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Cost ($/1M input)** | $5 | $10 | $0.50 | $15 | $3 | $0.25 |
| **Cost ($/1M output)** | $15 | $30 | $1.50 | $75 | $15 | $1.25 |
| **Best For** | General | Complex | Simple | Complex | Medium | Simple |

---

## Cost Tracking

### Cost Recording Flow

Every insight generation triggers cost recording:

```typescript
// After LLM execution
const cost = await costTracking.recordInsightCost(
  tenantId,
  userId,
  connectionId,
  usage,  // { promptTokens, completionTokens, totalTokens }
  {
    conversationId: 'conv_123',
    insightType: 'analysis',
    shardId: 'shard_456',
    duration: 2340  // ms
  }
);
```

### Cost Calculation

```typescript
// Formula
const inputCost = (promptTokens / 1_000_000) * model.pricing.inputPricePerMillion;
const outputCost = (completionTokens / 1_000_000) * model.pricing.outputPricePerMillion;
const totalCost = inputCost + outputCost;
```

### Cost Data Structure

Stored in `aiCosts` Cosmos DB container:

```typescript
interface CostRecord {
  id: string;                        // Unique ID
  tenantId: string;
  userId: string;
  connectionId: string;              // Which connection was used
  modelId: string;                   // Which model
  
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  cost: {
    input: number;                   // Input cost in USD
    output: number;                  // Output cost in USD
    total: number;                   // Total cost in USD
  };
  
  metadata: {
    conversationId?: string;
    insightType: InsightType;
    shardId?: string;
    duration: number;                // Generation time in ms
  };
  
  timestamp: Date;                   // When cost was recorded
}
```

### Usage Analytics

Get tenant usage statistics:

```typescript
const usage = await costTracking.getTenantUsage('tenant_abc123', {
  from: new Date('2024-01-01'),
  to: new Date('2024-01-31')
});

// Returns:
{
  totalCost: 45.67,
  totalTokens: 2500000,
  insightCount: 1234,
  
  byModel: [
    { modelId: 'model_gpt4o', cost: 35.20, tokens: 1800000, requests: 890 },
    { modelId: 'model_gpt35', cost: 10.47, tokens: 700000, requests: 344 }
  ],
  
  byInsightType: [
    { insightType: 'summary', cost: 12.30, tokens: 650000, requests: 456 },
    { insightType: 'analysis', cost: 28.90, tokens: 1500000, requests: 567 }
  ],
  
  dailyBreakdown: [
    { date: '2024-01-01', cost: 1.45, tokens: 75000, requests: 38 },
    { date: '2024-01-02', cost: 2.10, tokens: 112000, requests: 52 }
  ],
  
  budget: {
    limit: 100.0,
    used: 45.67,
    remaining: 54.33,
    percentUsed: 45.67
  }
}
```

### Budget Management

Optional budget enforcement:

```typescript
// Before generating expensive insight
const hasCapacity = await costTracking.checkBudget(
  'tenant_abc123',
  estimatedCost  // e.g., 0.15
);

if (!hasCapacity) {
  throw new Error('Monthly budget exceeded');
}

// Proceed with generation
```

---

## Implementation Guide

### 1. Service Integration

**Update InsightService**:

```typescript
export class InsightService {
  constructor(
    // ... existing services
    private modelSelectionService: AIModelSelectionService,    // ✅ NEW
    private costTracking: AICostTrackingService,              // ✅ NEW
    private capabilityValidator: ModelCapabilityValidator,    // ✅ NEW
    private monitoring: IMonitoringProvider
  ) {}
  
  async generate(
    tenantId: string,
    userId: string,
    request: InsightRequest
  ): Promise<InsightResponse> {
    // ... analyze intent, assemble context
    
    // ✅ SELECT MODEL
    let connectionWithCreds: AIConnectionCredentials;
    
    if (request.modelId) {
      // User specified model
      connectionWithCreds = await this.modelSelectionService.getConnectionForModel(
        request.modelId,
        tenantId
      );
    } else {
      // Auto-select
      const result = await this.modelSelectionService.selectOptimalModel(
        tenantId,
        {
          insightType: intent.insightType,
          contextTokens: context.metadata.totalTokens,
          requiresStreaming: false,
        }
      );
      connectionWithCreds = result.connection;
    }
    
    // ✅ EXECUTE LLM
    const llmResponse = await this.executeLLM(
      connectionWithCreds,
      systemPrompt,
      userPrompt
    );
    
    // ✅ TRACK COST
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
    
    // Return response with cost
    return {
      content: grounded.groundedContent,
      // ...
      cost,
      model: connectionWithCreds.connection.modelId,
    };
  }
  
  private async executeLLM(
    connection: AIConnectionCredentials,
    systemPrompt: string,
    userPrompt: string
  ) {
    return this.azureOpenAI.chat({
      endpoint: connection.connection.endpoint,
      apiKey: connection.credentials.apiKey,  // ✅ From Key Vault
      deploymentName: connection.connection.deploymentName!,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    });
  }
}
```

### 2. API Routes

Add model management routes:

```typescript
// GET /insights/models/available
fastify.get('/insights/models/available', async (request, reply) => {
  const { tenantId } = request.user!;
  
  const models = await getAvailableModels(tenantId);
  
  return { models };
});

// POST /insights/models/recommend
fastify.post('/insights/models/recommend', async (request, reply) => {
  const { tenantId } = request.user!;
  const requirements = request.body;
  
  const result = await modelSelectionService.selectOptimalModel(
    tenantId,
    requirements
  );
  
  return { recommended: result };
});

// GET /insights/usage
fastify.get('/insights/usage', async (request, reply) => {
  const { tenantId } = request.user!;
  const { from, to } = request.query;
  
  const usage = await costTracking.getTenantUsage(tenantId, { from, to });
  
  return usage;
});
```

### 3. Frontend Integration

**Show available models**:

```typescript
const { data: models } = useQuery({
  queryKey: ['insights', 'models', 'available'],
  queryFn: () => api.insights.getAvailableModels(),
});

// Display in model selector dropdown
<Select>
  {models?.models.map(model => (
    <SelectItem key={model.connectionId} value={model.modelId}>
      {model.name} {model.isTenantOwned && '(Your Key)'}
      {model.isDefault && '⭐'}
    </SelectItem>
  ))}
</Select>
```

**Show cost in chat**:

```typescript
// After message complete
<div className="text-xs text-muted-foreground">
  Cost: ${response.cost.toFixed(4)} • 
  Tokens: {response.usage.totalTokens} •
  Model: {response.model}
</div>
```

**Usage dashboard**:

```typescript
const { data: usage } = useQuery({
  queryKey: ['insights', 'usage', fromDate, toDate],
  queryFn: () => api.insights.getUsage({ from: fromDate, to: toDate }),
});

<Card>
  <CardHeader>AI Usage This Month</CardHeader>
  <CardContent>
    <div>Total Cost: ${usage?.totalCost.toFixed(2)}</div>
    <div>Insights Generated: {usage?.insightCount}</div>
    <div>Budget Used: {usage?.budget?.percentUsed.toFixed(1)}%</div>
    
    <Chart data={usage?.dailyBreakdown} />
  </CardContent>
</Card>
```

---

## Security

### API Key Storage

- **Never store API keys in Cosmos DB**
- Always use Azure Key Vault
- Key format: `ai-connection-{connectionId}`
- Access via Managed Identity (no credentials in code)

### Access Control

```typescript
// Only tenant admins can manage connections
if (!request.user.roles.includes('tenant_admin')) {
  throw new ForbiddenError('Only admins can manage AI connections');
}

// System connections require super admin
if (connectionInput.tenantId === 'system' && !request.user.isSuperAdmin) {
  throw new ForbiddenError('Only super admins can manage system connections');
}
```

### Tenant Isolation

```typescript
// Always validate tenant ownership
const connection = await aiConnectionService.getConnection(connectionId);

if (connection.tenantId !== request.user.tenantId && 
    connection.tenantId !== 'system') {
  throw new ForbiddenError('Cannot access connection from another tenant');
}
```

---

## Best Practices

### For Tenants

1. **Set default connection**: Mark one LLM connection as default
2. **Monitor costs**: Review usage dashboard monthly
3. **Set budgets**: Configure monthly spend limits
4. **Test connections**: Verify API keys work before setting as default
5. **Rotate keys**: Update API keys periodically

### For Super Admins

1. **Maintain system fallbacks**: Always have system-wide defaults
2. **Monitor pricing**: Update model pricing when providers change rates
3. **Deprecate gracefully**: Mark deprecated models, suggest replacements
4. **Health checks**: Test system connections regularly
5. **Cost alerts**: Set up monitoring for unusual spending patterns

### For Developers

1. **Always track costs**: Every LLM call should record cost
2. **Estimate before execution**: Show users estimated cost
3. **Prefer tenant connections**: Check tenant BYOK first
4. **Handle fallbacks**: Gracefully fall back to system connections
5. **Log selections**: Track which models are selected and why

---

## Troubleshooting

### Connection Errors

**Problem**: "No connection available for model"

```typescript
// Check if model exists
const model = await aiModelService.getModel(modelId);
if (!model) {
  // Model doesn't exist in catalog
}

// Check if any active connections
const connections = await aiConnectionService.listConnections({
  modelId,
  status: 'active'
});
if (connections.connections.length === 0) {
  // No active connections for this model
  // Either create system connection or choose different model
}
```

**Problem**: "API key invalid"

```typescript
// Test connection before saving
try {
  await testConnection({
    endpoint: connectionInput.endpoint,
    apiKey: connectionInput.apiKey,
    deploymentName: connectionInput.deploymentName,
  });
} catch (error) {
  throw new ValidationError('API key is invalid or endpoint unreachable');
}
```

### Cost Tracking Issues

**Problem**: Costs not being recorded

```typescript
// Verify cost tracking service is initialized
if (!this.costTracking) {
  this.monitoring.trackEvent('cost-tracking.not-initialized');
  // Still complete the insight, but log warning
}

// Ensure container exists
try {
  await this.costTracking.recordInsightCost(/* ... */);
} catch (error) {
  // Log but don't fail the insight generation
  this.monitoring.trackException(error, {
    operation: 'cost-tracking.record-failed'
  });
}
```

### Model Selection Issues

**Problem**: "No model meets the requirements"

```typescript
// Relax requirements progressively
const requirements = {
  insightType: 'analysis',
  contextTokens: 150000,  // Very large
  requiresFunctions: true,
  maxCost: 0.01  // Very low
};

// Solution: Either increase context window or cost limit
// Or split into multiple smaller requests
```

---

## Summary

AI Model Connections integration provides:

✅ **Flexibility**: Tenant BYOK + system fallbacks  
✅ **Security**: Key Vault storage, tenant isolation  
✅ **Intelligence**: Automatic model selection  
✅ **Cost Control**: Tracking, budgets, estimation  
✅ **Scalability**: Supports multiple providers and models  

For additional details, see:
- `docs/guides/AI_IMPLEMENTATION_SUMMARY.md` - Full AI architecture
- `docs/shards/core-types/c_aimodel.md` - AI Model shard type
- `docs/features/ai-insights/IMPLEMENTATION-GUIDE.md` - Step-by-step implementation
