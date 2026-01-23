# AI Recommendation System - Quick Start Guide

## 🚀 Overview

The AI Recommendation System provides AI-powered suggestions across the Castiel platform with:
- ✅ Unified architecture for all recommendation types
- ✅ Multi-option recommendations with approval workflow
- ✅ Rate limiting and cost tracking
- ✅ Risk-based auto-apply
- ✅ Integration with prompt system

## 📋 Current Status

### ✅ Implemented (Phase 1)

**Backend:**
- `AIRecommendationService` (orchestrator)
- `SchemaRecommendationHandler`
- `EmbeddingTemplateRecommendationHandler`
- API routes (`/api/v1/ai-recommendations/*`)
- Rate limiting (per-user, per-tenant)
- Cost tracking and budget alerts
- Type definitions (`@castiel/shared-types`)

**Frontend:**
- `AIRecommendationModal` (generic modal)
- `SchemaRecommendationRenderer`
- `useAIRecommendation` hook
- `SchemaBuilderWithAI` (integration example)

**Documentation:**
- Architecture guide
- Example prompts
- This quick start guide

### 🔄 TODO (Phase 2)

- Create prompts in database (see `EXAMPLE_PROMPTS.md`)
- Implement remaining handlers (UISchema, ComputedField, SearchQuery, etc.)
- Add more integration points (inline suggestions, smart fill)
- Enhanced context enrichment (data samples, analytics)

## 🎯 How to Use

### For End Users

1. **Navigate to Shard Type Edit Page**
   ```
   /shard-types/{id}/edit
   ```

2. **Click "AI Suggestions" button** in Schema Definition section

3. **Review AI recommendations**
   - Up to 3 options with confidence scores
   - Risk level badges (low/medium/high)
   - Detailed reasoning for each option

4. **Apply or Regenerate**
   - Apply: Merges recommendation into schema
   - Regenerate: Gets new suggestions
   - Cancel: Closes modal without changes

### For Developers

#### Add AI Recommendations to New Feature

```tsx
import { AIRecommendationModal } from '@/components/ai-recommendation/ai-recommendation-modal';
import { useAIRecommendation } from '@/hooks/use-ai-recommendation';

function MyFeature() {
  const [showModal, setShowModal] = useState(false);
  const { generate } = useAIRecommendation<MyRecommendationType>();

  const handleGenerate = async () => {
    return await generate('myRecommendationType', {
      // Provide context
      tenantId: 'tenant-123',
      userId: 'user-456',
      // ... type-specific context
    });
  };

  const handleApply = async (recommendation: MyRecommendationType) => {
    // Apply recommendation to your feature
    console.log('Applying:', recommendation);
  };

  return (
    <>
      <Button onClick={() => setShowModal(true)}>
        <Sparkles /> Get AI Suggestions
      </Button>

      <AIRecommendationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        recommendationType="myRecommendationType"
        onGenerate={handleGenerate}
        onApply={handleApply}
        // Optional: custom renderer
        renderOption={(rec) => <MyCustomRenderer recommendation={rec} />}
      />
    </>
  );
}
```

#### Create New Recommendation Handler

1. **Create handler class** (extends `BaseRecommendationHandler`)
2. **Implement required methods** (`validate`, `parseAIResponse`)
3. **Register in `AIRecommendationService` constructor**
4. **Create prompts** with matching tags
5. **Create frontend renderer** (optional)

See `docs/features/ai-insights/AI_RECOMMENDATION_SYSTEM.md` for details.

## ⚙️ Configuration

### Environment Variables

```bash
# Azure OpenAI (required)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```

### Rate Limits (configurable)

```typescript
// In AIRecommendationService initialization
aiRecommendationService.configureRateLimits({
  perUser: {
    maxRequests: 20,
    windowMs: 3600000, // 1 hour
  },
  perTenant: {
    maxRequests: 100,
    windowMs: 3600000,
  },
  costTracking: {
    budgetPerTenant: 100, // USD
    alertThreshold: 80, // %
  },
});
```

## 🔍 Testing

### Test Schema Generation (cURL)

```bash
curl -X POST http://localhost:3001/api/v1/ai-recommendations/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "type": "schemaRecommendation",
    "context": {
      "shardType": {
        "id": "st-1",
        "name": "Invoice",
        "description": "Customer invoices with line items"
      }
    }
  }'
```

### Test in Browser

1. Start dev server: `pnpm dev`
2. Login to application
3. Navigate to shard type edit page
4. Click "AI Suggestions" button
5. Check browser console for logs
6. Check API logs: `tail -f logs/api.log`

### Check Rate Limit

```bash
curl http://localhost:3001/api/v1/ai-recommendations/rate-limit \
  -H "Authorization: Bearer <token>"
```

### Check Costs

```bash
curl http://localhost:3001/api/v1/ai-recommendations/costs \
  -H "Authorization: Bearer <token>"
```

## 📊 Monitoring

### Application Insights Queries

**Recommendation usage by type:**
```kusto
customEvents
| where name == "aiRecommendation.generated"
| summarize count() by tostring(customDimensions.type)
```

**Average confidence by type:**
```kusto
customEvents
| where name == "aiRecommendation.generated"
| extend confidence = todouble(customDimensions.confidence)
| summarize avg(confidence) by tostring(customDimensions.type)
```

**Parse errors:**
```kusto
customEvents
| where name == "aiRecommendation.parseError"
| project timestamp, customDimensions
```

**Budget alerts:**
```kusto
customEvents
| where name == "aiRecommendation.budgetAlert"
| project timestamp, 
          tenantId = tostring(customDimensions.tenantId),
          percentUsed = todouble(customDimensions.percentUsed),
          monthlyTotal = todouble(customDimensions.monthlyTotal)
```

## 🛠️ Troubleshooting

### "No prompt found" Error

**Cause:** No prompt exists with the required tag.

**Fix:** Create prompts using examples in `EXAMPLE_PROMPTS.md`

```bash
# Via API or database seed script
```

### "Rate limit exceeded" Error

**Cause:** User or tenant exceeded rate limit.

**Fix:** Wait for reset window or increase limits:

```typescript
aiRecommendationService.configureRateLimits({
  perUser: { maxRequests: 50, windowMs: 3600000 }
});
```

### "Validation failed" Error

**Cause:** AI generated invalid recommendation.

**Fix:** Improve prompt with clearer instructions and examples.

### AI Returns Wrong Format

**Cause:** Prompt unclear or AI misunderstood.

**Fix:**
1. Check `aiRecommendation.parseError` events
2. Review AI response in logs
3. Update prompt with explicit format examples
4. Add validation examples to prompt

### High Costs

**Cause:** Too many requests or verbose prompts.

**Fix:**
1. Check cost tracking: `/api/v1/ai-recommendations/costs`
2. Identify high-usage users/tenants
3. Lower rate limits
4. Optimize prompts (reduce token usage)
5. Set budget alerts

## 📚 Additional Resources

- **Architecture Guide:** `docs/features/ai-insights/AI_RECOMMENDATION_SYSTEM.md`
- **Example Prompts:** `docs/features/ai-insights/EXAMPLE_PROMPTS.md`
- **Type Definitions:** `packages/shared-types/src/ai-recommendation.types.ts`
- **Backend Service:** `apps/api/src/services/ai-insights/ai-recommendation.service.ts`
- **Frontend Hook:** `apps/web/src/hooks/use-ai-recommendation.ts`

## 🎓 Next Steps

1. **Create Initial Prompts**
   - Schema recommendation
   - Embedding template

2. **Test with Real Users**
   - Gather feedback on recommendations
   - Adjust prompts based on quality

3. **Implement Remaining Types**
   - UI Schema
   - Computed Field
   - Search Query
   - Validation Rule
   - User Intent
   - Prompt Generation
   - Project Improvement

4. **Add More Integration Points**
   - Schema builder inline suggestions
   - Shard creation smart fill
   - Settings optimization
   - Global AI assistant sidebar

5. **Enhance Context**
   - Data samples
   - Usage analytics
   - Cross-tenant patterns

6. **User Feedback Loop**
   - Track applied vs rejected
   - A/B test different prompts
   - Continuous improvement

## 🤝 Support

- **Issues:** Create GitHub issue with `ai-recommendations` label
- **Questions:** Slack #ai-features channel
- **Docs:** `docs/features/ai-insights/`

---

**Status:** ✅ Phase 1 Complete  
**Version:** 1.0.0  
**Last Updated:** 2025-12-19
