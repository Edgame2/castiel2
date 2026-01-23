# AI Recommendation System

## Overview

The AI Recommendation System is a unified, extensible framework for generating AI-powered suggestions across the Castiel platform. It integrates with the existing prompt system and provides consistent approval workflows, rate limiting, and cost tracking.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Components                       │
├─────────────────────────────────────────────────────────────┤
│ • AIRecommendationModal (generic modal with multi-option)   │
│ • SchemaRecommendationRenderer (type-specific renderers)    │
│ • useAIRecommendation hook (API integration)                │
│ • SchemaBuilderWithAI (integration example)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       API Routes                             │
├─────────────────────────────────────────────────────────────┤
│ POST /api/v1/ai-recommendations/generate                    │
│ GET  /api/v1/ai-recommendations/types                       │
│ GET  /api/v1/ai-recommendations/rate-limit                  │
│ GET  /api/v1/ai-recommendations/costs                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  AIRecommendationService                     │
├─────────────────────────────────────────────────────────────┤
│ • Handler registry (strategy pattern)                       │
│ • Rate limiting (per-user, per-tenant)                      │
│ • Cost tracking and budget alerts                           │
│ • Standard response format enforcement                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Recommendation Handlers (Specialized)           │
├─────────────────────────────────────────────────────────────┤
│ • BaseRecommendationHandler (abstract)                      │
│   ├── SchemaRecommendationHandler                          │
│   ├── EmbeddingTemplateRecommendationHandler              │
│   ├── UISchemaRecommendationHandler (TODO)                │
│   ├── ComputedFieldRecommendationHandler (TODO)           │
│   └── ... (extensible)                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Supporting Services                         │
├─────────────────────────────────────────────────────────────┤
│ • PromptResolverService (tag-based prompt lookup)          │
│ • PromptRendererService (template variable substitution)   │
│ • AzureOpenAIService (chat completion API)                 │
│ • MonitoringService (telemetry and alerts)                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

- **Strategy Pattern**: Each recommendation type has its own handler
- **Template Method**: BaseRecommendationHandler defines common workflow
- **Dependency Injection**: Services passed to handlers via constructor
- **Tag-Based Routing**: Prompts tagged by recommendation type
- **Risk-Based Approval**: Auto-apply based on risk level + user preferences

## Supported Recommendation Types

| Type | Tag | Status | Description |
|------|-----|--------|-------------|
| `schemaRecommendation` | `schemaRecommendation` | ✅ Implemented | Suggest field types, validation rules, entire schemas |
| `embeddingTemplate` | `embeddingTemplate` | ✅ Implemented | Suggest field weights, preprocessing, model config |
| `uiSchemaRecommendation` | `uiSchemaRecommendation` | 🔄 TODO | Form layouts, field ordering, display config |
| `computedFieldRecommendation` | `computedFieldRecommendation` | 🔄 TODO | Generate formulas based on field descriptions |
| `searchQueryRecommendation` | `searchQueryRecommendation` | 🔄 TODO | Advanced search filters, saved searches |
| `validationRuleRecommendation` | `validationRuleRecommendation` | 🔄 TODO | Regex patterns, custom validators |
| `userIntentRecommendation` | `userIntentRecommendation` | 🔄 TODO | Classify intent, suggest actions |
| `promptGenerationRecommendation` | `promptGenerationRecommendation` | 🔄 TODO | Generate prompts for other recommendations |
| `projectImprovementRecommendation` | `projectImprovementRecommendation` | 🔄 TODO | Suggest project optimizations |

## Usage Examples

### Frontend: Schema Recommendations

```tsx
import { AIRecommendationModal } from '@/components/ai-recommendation/ai-recommendation-modal';
import { SchemaRecommendationRenderer } from '@/components/ai-recommendation/renderers/schema-renderer';
import { useAIRecommendation } from '@/hooks/use-ai-recommendation';
import type { SchemaRecommendation } from '@castiel/shared-types';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);
  const { generate } = useAIRecommendation<SchemaRecommendation>();

  const handleGenerate = async () => {
    return await generate('schemaRecommendation', {
      shardType: {
        id: 'shard-type-id',
        name: 'Invoice',
        description: 'Customer invoices with line items',
      },
    });
  };

  const handleApply = async (recommendation: SchemaRecommendation) => {
    // Convert recommendation to JSON Schema and apply
    console.log('Applying:', recommendation);
  };

  return (
    <>
      <Button onClick={() => setShowModal(true)}>
        <Sparkles /> AI Suggestions
      </Button>

      <AIRecommendationModal<SchemaRecommendation>
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        recommendationType="schemaRecommendation"
        onGenerate={handleGenerate}
        onApply={handleApply}
        renderOption={(rec) => <SchemaRecommendationRenderer recommendation={rec} />}
      />
    </>
  );
}
```

### Backend: Creating a New Handler

```typescript
import { BaseRecommendationHandler } from './base-handler.js';
import type { UISchemaRecommendation, RecommendationOption } from '@castiel/shared-types';

export class UISchemaRecommendationHandler extends BaseRecommendationHandler<UISchemaRecommendation> {
  readonly type = 'uiSchemaRecommendation' as const;

  async validate(recommendation: UISchemaRecommendation) {
    const errors: string[] = [];
    
    // Add validation logic
    if (!recommendation.layout) {
      errors.push('Layout is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  shouldAutoApply(option: RecommendationOption<UISchemaRecommendation>) {
    // Low-risk UI changes can auto-apply
    return option.riskLevel === 'low';
  }

  protected parseAIResponse(response: string): RecommendationOption<UISchemaRecommendation>[] {
    // Parse AI response into structured format
    const parsed = JSON.parse(response);
    // ... normalize and return options
  }
}

// Register in AIRecommendationService constructor
const uiSchemaHandler = new UISchemaRecommendationHandler(
  this.azureOpenAI,
  this.promptResolver,
  this.promptRenderer,
  this.monitoring
);
this.handlers.set(uiSchemaHandler.type, uiSchemaHandler);
```

## Creating Prompts

Prompts must be tagged with the recommendation type and provide both system and user prompt templates.

### Example: Schema Recommendation Prompt

**Prompt Slug**: `system-schema-recommendation-v1`  
**Tags**: `schemaRecommendation`  
**Scope**: `system`

**System Prompt**:
```
You are an expert data architect helping design JSON Schema definitions.
Generate 2-3 schema options based on the shard type description.

Guidelines:
- Use appropriate field types (string, number, boolean, object, array, date)
- Add validation rules where sensible (patterns, min/max, required)
- Include helpful descriptions
- Consider relationships to other shard types
- Balance comprehensiveness with simplicity

Return JSON array with this format:
[
  {
    "recommendation": {
      "fields": [
        {
          "name": "fieldName",
          "type": "string",
          "required": true,
          "description": "...",
          "validation": { "pattern": "regex" }
        }
      ],
      "suggestedIndices": ["fieldName"],
      "suggestedRelationships": []
    },
    "confidence": 0.9,
    "reasoning": "Why this schema makes sense...",
    "riskLevel": "medium"
  }
]
```

**User Prompt Template**:
```
Shard Type: {{shardTypeName}}
Description: {{shardTypeDescription}}

{% if parentShardTypeName %}
Parent Type: {{parentShardTypeName}}
Parent Schema: {{parentSchema}}
{% endif %}

{% if relatedShardTypes %}
Related Types: {{relatedShardTypes}}
{% endif %}

Generate schema recommendations.
```

## Rate Limiting & Cost Tracking

### Default Configuration

```typescript
{
  perUser: {
    maxRequests: 20,
    windowMs: 3600000, // 1 hour
  },
  perTenant: {
    maxRequests: 100,
    windowMs: 3600000, // 1 hour
  },
  costTracking: {
    budgetPerTenant: 100, // $100/month
    alertThreshold: 80, // Alert at 80%
  },
}
```

### Check Rate Limit

```typescript
// Frontend
const { check } = useAIRecommendationRateLimit();
const status = await check();
console.log(status); // { user: {...}, tenant: {...} }

// Backend
const status = aiRecommendationService.getRateLimitStatus(tenantId, userId);
```

### Monitor Costs

```typescript
// Frontend
const { fetch } = useAIRecommendationCosts();
const costs = await fetch(startDate, endDate);
console.log(costs.monthlyTotal); // $12.34

// Backend
const monthlyTotal = aiRecommendationService.getMonthlyTotal(tenantId);
```

## Risk Levels & Auto-Apply

| Risk Level | Auto-Apply? | Examples |
|------------|-------------|----------|
| **Low** | Yes (if user prefers) | Validation rules, search filters, UI ordering |
| **Medium** | No | Computed formulas, schema fields |
| **High** | No | Entire schemas, workflow changes |

Users can enable auto-apply for low-risk recommendations in preferences:

```typescript
{
  userPreferences: {
    autoApplyLowRisk: true,
  }
}
```

## Response Format

All recommendations follow this standard format:

```typescript
{
  type: 'schemaRecommendation',
  options: [
    {
      recommendation: { /* actual content */ },
      confidence: 0.85,
      reasoning: 'Selected based on...',
      riskLevel: 'medium',
      editable: true
    },
    // ... more options
  ],
  metadata: {
    model: 'gpt-4o',
    tokens: { prompt: 500, completion: 300, total: 800 },
    processingTime: 1.2,
    promptUsed: 'system-schema-recommendation-v1',
    temperature: 0.3,
    timestamp: '2025-12-19T...'
  },
  suggestedNextAction: {
    type: 'embeddingTemplate',
    context: { shardType: {...} },
    message: 'Generate embedding template for better search?'
  }
}
```

## Error Handling

### Frontend

```typescript
const { generate, error } = useAIRecommendation();

try {
  await generate('schemaRecommendation', context);
} catch (err) {
  // Rate limit: 429 status
  // Validation: 400 status
  // Server: 500 status
  toast.error(err.message);
}
```

### Backend

```typescript
// Errors are caught in routes and returned as JSON
{
  error: 'Rate limit exceeded for user. Resets at 2025-12-19T15:00:00Z'
}
```

## Integration Points

### Current

- ✅ Shard Type Edit Page → Schema Builder

### Planned

- 🔄 Schema Builder → "Suggest Next Field" inline button
- 🔄 Shard Creation Form → "Smart Fill" pre-populate fields
- 🔄 Settings Panel → "Optimize Configuration"
- 🔄 Search Interface → "Advanced Query Builder"
- 🔄 Global AI Assistant Sidebar

## Testing

### Test Schema Generation

```bash
curl -X POST http://localhost:3001/api/v1/ai-recommendations/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type": "schemaRecommendation",
    "context": {
      "tenantId": "tenant-123",
      "userId": "user-456",
      "shardType": {
        "id": "st-1",
        "name": "Invoice",
        "description": "Customer invoices"
      }
    },
    "options": {
      "maxOptions": 3,
      "temperature": 0.3
    }
  }'
```

### Check Supported Types

```bash
curl http://localhost:3001/api/v1/ai-recommendations/types \
  -H "Authorization: Bearer <token>"
```

## Monitoring & Metrics

All recommendations generate telemetry events:

- `aiRecommendation.generated` - Success
- `aiRecommendation.noPromptFound` - Missing prompt
- `aiRecommendation.parseError` - AI response parsing failed
- `aiRecommendation.validationFailed` - Validation errors
- `aiRecommendation.budgetAlert` - Budget threshold exceeded

Track in Application Insights:

```kusto
customEvents
| where name == "aiRecommendation.generated"
| summarize count() by tostring(customDimensions.type)
```

## Next Steps

1. **Create Prompts**: Add prompts for `schemaRecommendation` and `embeddingTemplate` tags
2. **Implement Remaining Handlers**: UISchema, ComputedField, SearchQuery, etc.
3. **Add More Integration Points**: Schema builder inline suggestions, smart fill
4. **Enhanced Context Enrichment**: Data samples, usage analytics
5. **User Feedback Loop**: Track applied vs rejected recommendations
6. **A/B Testing**: Compare AI-generated vs manual schemas

## API Reference

See full API documentation at `/docs/api/ai-recommendations.md`.
