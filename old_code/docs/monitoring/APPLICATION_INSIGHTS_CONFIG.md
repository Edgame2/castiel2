# Application Insights Configuration for AI Insights

## Overview

Application Insights is configured and integrated for comprehensive monitoring of AI Insights features. This document describes the configuration, custom metrics, and how they integrate with the Grafana dashboards.

## Configuration

### Backend (API)

Application Insights is initialized in `apps/api/src/index.ts`:

```typescript
const monitoring = MonitoringService.initialize({
  enabled: config.monitoring.enabled,
  provider: config.monitoring.provider,
  instrumentationKey: config.monitoring.instrumentationKey,
  samplingRate: config.monitoring.samplingRate,
});
```

### Environment Variables

Required environment variables:

```bash
# Enable monitoring
MONITORING_ENABLED=true

# Provider type
MONITORING_PROVIDER=application-insights

# Application Insights instrumentation key
APPINSIGHTS_INSTRUMENTATION_KEY=<your-instrumentation-key>

# Sampling rate (0.0 to 1.0)
MONITORING_SAMPLING_RATE=1.0
```

### Frontend (Web)

Application Insights is initialized in `apps/web/src/lib/monitoring/app-insights.ts`:

```typescript
const connectionString = env.NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING
```

Required environment variable:

```bash
NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING=<your-connection-string>
```

## Custom Metrics Tracked

The following custom metrics are tracked for AI Insights and are used by the Grafana dashboard:

### Cost Metrics

- **`ai_insights_cost`** - Total cost in USD per insight generation
  - Tracked in: `insight.service.ts` → `recordCostUsage()`
  - Properties: `tenantId`, `userId`, `provider`, `model`, `insightType`, `conversationId`

### Token Usage Metrics

- **`ai_insights_input_tokens`** - Input/prompt tokens used
  - Tracked in: `insight.service.ts` → `recordCostUsage()`
  - Properties: `tenantId`, `userId`, `provider`, `model`, `insightType`

- **`ai_insights_output_tokens`** - Output/completion tokens used
  - Tracked in: `insight.service.ts` → `recordCostUsage()`
  - Properties: `tenantId`, `userId`, `provider`, `model`, `insightType`

### Cache Performance Metrics

- **`ai_insights_cache_hit`** - Cache hits for embedding content hash cache
  - Tracked in:
    - `embedding-content-hash-cache.service.ts` → `getCached()` (single)
    - `embedding-content-hash-cache.service.ts` → `getCachedBatch()` (batch)
    - `shard-embedding.service.ts` → when cached embedding is used
  - Properties: `cacheType: 'embedding-content-hash'`, `shardId`, `chunkIndex` (optional), `batch` (optional)

- **`ai_insights_cache_miss`** - Cache misses for embedding content hash cache
  - Tracked in:
    - `embedding-content-hash-cache.service.ts` → `getCachedBatch()` (batch)
    - `shard-embedding.service.ts` → when embedding needs to be generated
  - Properties: `cacheType: 'embedding-content-hash'`, `shardId`, `batch` (optional)

## Events Tracked

In addition to custom metrics, the following events are tracked:

- `insight.generated` - Insight generation completed
- `insight.streamed` - Streaming insight generation completed
- `insight.cost-recorded` - Cost tracking completed
- `insight.conversation-auto-created` - Conversation auto-created
- `insight.conversation-summarized` - Conversation history summarized
- `insight.conversation-tokens-optimized` - Conversation tokens optimized
- `insight.model-selected` - AI model selected
- `insight.global-context.cache-hit` - Global context cache hit
- `embedding-cache.hit` - Embedding cache hit (single)
- `embedding-cache.batch-hit` - Embedding cache batch hit
- `shard-embedding.cache-hit` - Shard embedding cache hit
- `shard-embedding.skipped` - Shard embedding skipped

## Exceptions Tracked

All exceptions are automatically tracked with context:

- `insight.generate` - Generation errors
- `insight.generateStream` - Streaming generation errors
- `insight.recordCostUsage` - Cost tracking errors
- `insight.recordABTestMetric` - A/B test metric recording errors
- `insight.assembleContext` - Context assembly errors
- `insight.manageConversationTokens` - Token management errors
- `embedding-cache.get` - Cache retrieval errors
- `embedding-cache.getBatch` - Batch cache retrieval errors

## Integration with Grafana

The custom metrics tracked here are used by the Grafana dashboard (`docs/monitoring/grafana/ai-insights-dashboard.json`):

1. **Cost Tracking**: `ai_insights_cost` metric powers the "AI Cost (USD)" and "Cost by Model" panels
2. **Token Usage**: `ai_insights_input_tokens` and `ai_insights_output_tokens` power the "Token Usage" panel
3. **Cache Performance**: `ai_insights_cache_hit` and `ai_insights_cache_miss` power the "Cache Hit Rate" panel

## Verification

To verify Application Insights is working:

1. **Check Logs**: Look for `[Monitoring] Application Insights initialized` in API startup logs
2. **Check Metrics**: In Application Insights portal, navigate to **Metrics** → **Custom Metrics** and look for:
   - `ai_insights_cost`
   - `ai_insights_input_tokens`
   - `ai_insights_output_tokens`
   - `ai_insights_cache_hit`
   - `ai_insights_cache_miss`
3. **Check Events**: Navigate to **Logs** → **Custom Events** and filter for `insight.*` events
4. **Check Grafana**: Import the dashboard and verify panels show data

## Troubleshooting

### No Metrics Appearing

1. **Check Environment Variables**: Ensure `MONITORING_ENABLED=true` and `APPINSIGHTS_INSTRUMENTATION_KEY` is set
2. **Check Initialization**: Verify monitoring service initializes without errors
3. **Check Sampling Rate**: Ensure `MONITORING_SAMPLING_RATE` is not 0
4. **Check Network**: Verify the API can reach Application Insights endpoints

### Metrics Not Matching Dashboard

1. **Check Metric Names**: Ensure metric names match exactly (case-sensitive)
2. **Check Properties**: Verify custom properties are included in metric tracking
3. **Check Time Range**: Ensure data exists for the selected time range in Grafana

### High Sampling Rate Impacting Data

If sampling is enabled, metrics may be underreported. Adjust `MONITORING_SAMPLING_RATE`:
- `1.0` = 100% of metrics tracked (recommended for development)
- `0.5` = 50% of metrics tracked (recommended for production)
- `0.1` = 10% of metrics tracked (for high-volume production)

## Related Documentation

- [Grafana Dashboard Setup](./grafana/README.md)
- [AI Insights Monitoring Guide](../features/ai-insights/MONITORING.md)
- [Monitoring Package](../../packages/monitoring/README.md)

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Application Insights configuration fully documented

#### Implemented Features (✅)

- ✅ Application Insights integration
- ✅ Custom metrics tracking
- ✅ Event tracking
- ✅ Exception tracking
- ✅ Grafana integration

#### Known Limitations

- ⚠️ **Metrics Coverage** - Some metrics may not be tracked
  - **Recommendation:**
    1. Verify all metrics are tracked
    2. Add missing metrics
    3. Document metric coverage

- ⚠️ **Dashboard Integration** - Dashboard integration may need verification
  - **Recommendation:**
    1. Verify Grafana dashboard integration
    2. Test dashboard functionality
    3. Update dashboard configuration

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Monitoring Documentation](./INTEGRATION_MONITORING.md) - Monitoring setup
- [Alert Configuration](./ALERT_CONFIGURATION.md) - Alert setup









