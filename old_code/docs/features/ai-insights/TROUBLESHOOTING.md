# AI Insights Troubleshooting

## Common Issues

### 1. Slow Response Times
**Symptoms**: Insights taking >5s to respond

**Causes**:
- Context assembly retrieving too many shards
- LLM model overload
- Web search timeout

**Solutions**:
- Review context template `maxResults`
- Check model routing rules
- Enable response streaming
- Review Application Insights diagnostics

**Diagnostic Steps**:
```typescript
// Check response time breakdown
const diagnostics = response.diagnostics;
console.log({
  contextAssemblyTime: diagnostics.contextAssemblyDuration,
  modelResponseTime: diagnostics.modelResponseDuration,
  webSearchTime: diagnostics.webSearchDuration,
  totalTime: diagnostics.totalDuration
});
```

### 2. Poor Grounding Quality
**Symptoms**: Citations missing or incorrect

**Causes**:
- Insufficient context provided
- Embedding quality issues
- Search relevance threshold too high

**Solutions**:
- Expand context template scope
- Verify embeddings are up-to-date
- Lower `minRelevanceScore` in context templates

**Example Fix**:
```typescript
// Adjust context template
const template = {
  maxResults: 20,  // Increase from 10
  minRelevanceScore: 0.6,  // Lower from 0.7
  includeRelationships: true  // Enable for more context
};
```

### 3. Intent Misclassification
**Symptoms**: Wrong assistant triggered or intent detected

**Causes**:
- Ambiguous user query
- Missing intent patterns
- Pattern priority conflicts

**Solutions**:
- Use LLM-assisted pattern analysis (`/analyze-gaps`)
- Add more specific patterns
- Review pattern priority ordering

**Debug Intent**:
```typescript
// Test intent classification
const result = await intentClassifier.classify({
  content: "What are the risks?",
  conversationHistory: []
});

console.log({
  detectedIntent: result.intent,
  confidence: result.confidence,
  matchedPattern: result.pattern,
  suggestedAssistant: result.assistantId
});
```

### 4. Web Search Errors
**Symptoms**: Search provider failures, 429 errors

**Causes**:
- API quota exceeded
- Provider unavailable
- Invalid API credentials

**Solutions**:
- Check provider health dashboard
- Verify Azure Key Vault secrets
- Enable fallback providers
- Increase rate limits

**Error Handling**:
```typescript
try {
  const results = await webSearch.search(query);
} catch (error) {
  if (error.statusCode === 429) {
    // Try fallback provider
    const fallbackResults = await fallbackSearch.search(query);
  } else if (error.statusCode === 401) {
    // Invalid credentials - check Key Vault
    logger.error('Web search auth failed', { provider: error.provider });
  }
}
```

### 5. Recurring Search Not Triggering
**Symptoms**: Scheduled searches not executing

**Causes**:
- Cron expression invalid
- User permissions changed
- Search configuration disabled

**Solutions**:
- Validate cron with `cron-validator`
- Check user still has access to scope
- Verify `isActive` flag in `c_recurringSearch`

**Validation**:
```typescript
import cron from 'cron-validator';

// Validate cron expression
if (!cron.isValidCron(schedule)) {
  throw new Error('Invalid cron expression');
}

// Check if search is active
const search = await getRecurringSearch(id);
if (!search.isActive) {
  logger.warn('Recurring search is disabled', { id });
}

// Verify user permissions
const hasAccess = await checkUserAccess(userId, scope);
if (!hasAccess) {
  logger.warn('User lost access to scope', { userId, scope });
}
```

### 6. High Costs
**Symptoms**: Unexpected AI model costs

**Causes**:
- Large context windows
- Expensive model selection
- Excessive web searches

**Solutions**:
- Review model routing rules
- Enable cost tracking alerts
- Optimize context assembly
- Cache frequent queries

**Cost Optimization**:
```typescript
// Use cheaper models for simple tasks
const routingRules = [
  {
    condition: 'intent === "summary"',
    model: 'gpt-4o-mini',  // Cheaper option
    maxTokens: 500
  },
  {
    condition: 'intent === "analysis"',
    model: 'gpt-4o',  // Premium when needed
    maxTokens: 2000
  }
];

// Cache expensive operations
const cacheKey = `context:${templateId}:${hash(scope)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

## Error Messages Reference

### `CONTEXT_ASSEMBLY_FAILED`
**Cause**: Failed to retrieve or assemble context from shards
**Solution**: Check Cosmos DB connectivity, verify partition key setup

### `INTENT_CLASSIFICATION_TIMEOUT`
**Cause**: LLM took too long to classify intent
**Solution**: Reduce conversation history size, use faster model

### `WEB_SEARCH_QUOTA_EXCEEDED`
**Cause**: Hit API rate limit for web search provider
**Solution**: Upgrade provider plan or enable fallback provider

### `GROUNDING_VERIFICATION_FAILED`
**Cause**: Unable to verify citations against source shards
**Solution**: Check shard IDs in citations, verify shard access permissions

### `MODEL_CONTENT_FILTER_TRIGGERED`
**Cause**: Azure Content Safety blocked harmful content
**Solution**: Review query/response content, adjust safety settings

## Performance Benchmarks

### Expected Response Times
| Operation | Target | Warning | Critical |
|-----------|--------|---------|----------|
| Chat message | <2s | 3s | 5s |
| Quick insight | <1s | 2s | 3s |
| Context assembly | <500ms | 1s | 2s |
| Web search | <1s | 2s | 3s |
| Intent classification | <200ms | 500ms | 1s |

### Resource Limits
| Resource | Default | Maximum |
|----------|---------|---------|
| Context size | 10 shards | 50 shards |
| Web search results | 10 | 50 |
| Conversation history | 20 messages | 100 messages |
| Query length | 4000 chars | 8000 chars |
| Concurrent requests/user | 5 | 20 |

## Diagnostic Tools

### Enable Detailed Logging
```typescript
// In apps/api/src/config/logger.ts
export const logger = createLogger({
  level: 'debug',  // Enable detailed logs
  enableDiagnostics: true,
  logAIOperations: true
});
```

### Check System Health
```bash
# Run health check script
cd /Users/edouard.gamelin/Documents/Perso/CASTIEL/castiel
pnpm run health-check

# Check specific service
curl http://localhost:3001/api/health/ai-insights
```

### Monitor with Application Insights
```typescript
// Query for slow requests
const slowRequests = await appInsights.query(`
  requests
  | where name == "POST /api/v1/insights/chat"
  | where duration > 5000
  | project timestamp, duration, customDimensions
  | order by duration desc
`);
```

## Getting Help

### Log Collection
When reporting issues, include:
1. Request ID from response headers
2. Tenant ID and user ID
3. Query that caused the issue
4. Full error message and stack trace
5. Application Insights correlation ID

### Support Channels
- GitHub Issues: Technical bugs
- Internal Slack: #ai-insights-support
- Documentation: This troubleshooting guide

### Known Issues
Check [GitHub Issues](https://github.com/Edgame2/castiel/issues) for:
- Active bugs
- Feature requests
- Planned improvements
