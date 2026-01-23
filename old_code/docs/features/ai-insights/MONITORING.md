# AI Insights Monitoring & Observability

## Overview

Comprehensive monitoring strategy for AI Insights, covering metrics, alerts, dashboards, and diagnostic tools.

## Key Metrics

### 1. Performance Metrics

```typescript
interface PerformanceMetrics {
  // Latency metrics (milliseconds)
  latency: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  
  // Operation-specific metrics
  operations: {
    contextAssembly: LatencyMetrics;
    webSearch: LatencyMetrics;
    intentClassification: LatencyMetrics;
    modelInference: LatencyMetrics;
    grounding: LatencyMetrics;
  };
  
  // Throughput
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

// Track performance
export function trackPerformance(
  operation: string,
  duration: number,
  metadata: Record<string, any>
): void {
  appInsights.trackMetric({
    name: `ai_insights_${operation}_duration`,
    value: duration,
    properties: metadata
  });
  
  // Log slow operations
  if (duration > getThreshold(operation)) {
    logger.warn('Slow operation detected', {
      operation,
      duration,
      threshold: getThreshold(operation),
      ...metadata
    });
  }
}

function getThreshold(operation: string): number {
  const thresholds: Record<string, number> = {
    chat: 3000,           // 3s
    quick_insight: 1500,  // 1.5s
    context_assembly: 500,
    web_search: 1000,
    intent_classification: 200
  };
  return thresholds[operation] || 1000;
}
```

### 2. Cost Metrics

```typescript
interface CostMetrics {
  // Total costs
  totalCost: number;
  projectedMonthlyCost: number;
  budgetUtilization: number;
  
  // Cost breakdown
  breakdown: {
    llmCosts: number;
    webSearchCosts: number;
    infraCosts: number;
  };
  
  // Per-tenant costs
  tenantCosts: Record<string, {
    cost: number;
    requests: number;
    avgCostPerRequest: number;
  }>;
  
  // Model usage
  modelUsage: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

// Track cost metrics
export function trackCost(
  tenantId: string,
  model: string,
  tokens: number,
  cost: number
): void {
  appInsights.trackMetric({
    name: 'ai_insights_cost',
    value: cost,
    properties: {
      tenantId,
      model,
      tokens
    }
  });
  
  // Update running totals
  redis.hincrbyfloat(`costs:${getCurrentMonth()}`, tenantId, cost);
  redis.hincrby(`tokens:${getCurrentMonth()}`, tenantId, tokens);
}
```

### 3. Quality Metrics

```typescript
interface QualityMetrics {
  // Grounding quality
  groundingQuality: {
    avgCitations: number;
    citationAccuracy: number;
    supportScore: number;
  };
  
  // Intent classification accuracy
  intentAccuracy: {
    correct: number;
    incorrect: number;
    accuracy: number;
  };
  
  // User satisfaction
  userSatisfaction: {
    thumbsUp: number;
    thumbsDown: number;
    avgRating: number;
  };
  
  // Error rates
  errors: {
    total: number;
    byType: Record<string, number>;
    errorRate: number;
  };
}

// Track quality metrics
export function trackQuality(
  conversationId: string,
  response: AIResponse
): void {
  appInsights.trackEvent({
    name: 'ai_insights_response_quality',
    properties: {
      conversationId,
      citationCount: response.citations.length,
      hasSupportScore: Boolean(response.groundingMetadata?.supportScore),
      intent: response.intent
    },
    measurements: {
      citationCount: response.citations.length,
      supportScore: response.groundingMetadata?.supportScore || 0
    }
  });
}
```

### 4. Resource Metrics

```typescript
interface ResourceMetrics {
  // Database metrics
  cosmosDB: {
    requestUnits: number;
    requestCharge: number;
    itemCount: number;
    storageSize: number;
  };
  
  // Cache metrics
  cache: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
  };
  
  // API metrics
  api: {
    activeConnections: number;
    queueDepth: number;
    errorRate: number;
  };
}

// Track cache performance
export function trackCacheHit(key: string, hit: boolean): void {
  const metricName = hit ? 'cache_hit' : 'cache_miss';
  
  appInsights.trackMetric({
    name: metricName,
    value: 1,
    properties: { cacheType: getCacheType(key) }
  });
}
```

## Application Insights Setup

### 1. Initialize Application Insights

```typescript
// apps/api/src/config/app-insights.ts
import { TelemetryClient } from 'applicationinsights';
import * as appInsights from 'applicationinsights';

// Initialize
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true, true)
  .setAutoCollectExceptions(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectConsole(true, true)
  .setUseDiskRetryCaching(true)
  .setSendLiveMetrics(true)
  .start();

export const telemetryClient = appInsights.defaultClient;

// Add custom properties to all telemetry
telemetryClient.context.tags[telemetryClient.context.keys.cloudRole] = 'ai-insights-api';
telemetryClient.context.tags[telemetryClient.context.keys.cloudRoleInstance] = process.env.HOSTNAME || 'local';

// Track AI operations
export function trackAIOperation(
  operation: string,
  startTime: number,
  metadata: Record<string, any>
): void {
  const duration = Date.now() - startTime;
  
  telemetryClient.trackDependency({
    target: 'OpenAI',
    name: operation,
    data: JSON.stringify(metadata),
    duration,
    resultCode: metadata.statusCode || 200,
    success: !metadata.error,
    dependencyTypeName: 'AI'
  });
  
  telemetryClient.trackMetric({
    name: `ai_insights_${operation}`,
    value: duration,
    properties: metadata
  });
}
```

### 2. Custom Dimensions

```typescript
// Add context to all telemetry
export function enrichTelemetry(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const user = req.user;
  
  if (user) {
    telemetryClient.context.tags[telemetryClient.context.keys.userId] = user.id;
    telemetryClient.context.tags['tenant_id'] = user.tenantId;
    telemetryClient.context.tags['user_role'] = user.role;
  }
  
  next();
}

app.use(enrichTelemetry);
```

## Alerting Rules

### 1. Performance Alerts

```typescript
// Define alert thresholds
const alertThresholds = {
  // Latency alerts
  p95Latency: {
    warning: 3000,   // 3s
    critical: 5000   // 5s
  },
  
  // Error rate alerts
  errorRate: {
    warning: 0.05,   // 5%
    critical: 0.10   // 10%
  },
  
  // Cost alerts
  costUtilization: {
    warning: 0.75,   // 75% of budget
    critical: 0.90   // 90% of budget
  },
  
  // Cache hit rate
  cacheHitRate: {
    warning: 0.50,   // Below 50%
    critical: 0.30   // Below 30%
  }
};

// Check thresholds
export async function checkAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const metrics = await getMetrics();
  
  // Check P95 latency
  if (metrics.latency.p95 > alertThresholds.p95Latency.critical) {
    alerts.push({
      severity: 'critical',
      type: 'performance',
      message: `P95 latency is ${metrics.latency.p95}ms (threshold: ${alertThresholds.p95Latency.critical}ms)`,
      metric: 'p95_latency',
      value: metrics.latency.p95
    });
  }
  
  // Check error rate
  const errorRate = metrics.errors.total / metrics.throughput.requestsPerHour;
  if (errorRate > alertThresholds.errorRate.critical) {
    alerts.push({
      severity: 'critical',
      type: 'reliability',
      message: `Error rate is ${(errorRate * 100).toFixed(2)}% (threshold: ${alertThresholds.errorRate.critical * 100}%)`,
      metric: 'error_rate',
      value: errorRate
    });
  }
  
  return alerts;
}
```

### 2. Azure Monitor Alerts

```typescript
// Create alerts using Azure Monitor
// Configure in Azure Portal or via Terraform

// Example: High latency alert
resource "azurerm_monitor_metric_alert" "high_latency" {
  name                = "ai-insights-high-latency"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_application_insights.main.id]
  
  criteria {
    metric_namespace = "Azure.ApplicationInsights"
    metric_name      = "ai_insights_chat_duration"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 3000
  }
  
  window_size = "PT5M"  // 5 minutes
  frequency   = "PT1M"  // Check every minute
  
  action {
    action_group_id = azurerm_monitor_action_group.ops_team.id
  }
}

// Example: Error rate alert
resource "azurerm_monitor_metric_alert" "high_error_rate" {
  name                = "ai-insights-high-error-rate"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_application_insights.main.id]
  
  criteria {
    metric_namespace = "Azure.ApplicationInsights"
    metric_name      = "requests/failed"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 50
  }
  
  window_size = "PT5M"
  frequency   = "PT1M"
  
  action {
    action_group_id = azurerm_monitor_action_group.ops_team.id
  }
}
```

## Dashboards

### 1. Application Insights Workbook

```json
{
  "version": "Notebook/1.0",
  "items": [
    {
      "type": 1,
      "content": {
        "json": "# AI Insights Monitoring Dashboard\n\nReal-time metrics for AI Insights operations"
      }
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "customMetrics\n| where name startswith 'ai_insights_'\n| where timestamp > ago(1h)\n| summarize \n    P50 = percentile(value, 50),\n    P95 = percentile(value, 95),\n    P99 = percentile(value, 99),\n    Max = max(value)\n  by name\n| order by P95 desc",
        "size": 0,
        "title": "Latency Metrics (Last Hour)",
        "queryType": 0,
        "resourceType": "microsoft.insights/components"
      }
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "customMetrics\n| where name == 'ai_insights_cost'\n| where timestamp > ago(30d)\n| extend tenantId = tostring(customDimensions.tenantId)\n| summarize TotalCost = sum(value) by tenantId\n| order by TotalCost desc\n| take 10",
        "size": 0,
        "title": "Top 10 Tenants by Cost (Last 30 Days)",
        "queryType": 0,
        "resourceType": "microsoft.insights/components",
        "visualization": "barchart"
      }
    },
    {
      "type": 3,
      "content": {
        "version": "KqlItem/1.0",
        "query": "requests\n| where url contains '/api/v1/insights/'\n| where timestamp > ago(24h)\n| summarize \n    Total = count(),\n    Success = countif(success == true),\n    Failed = countif(success == false)\n| extend ErrorRate = (Failed * 100.0) / Total",
        "size": 0,
        "title": "Request Success Rate (Last 24 Hours)",
        "queryType": 0,
        "resourceType": "microsoft.insights/components"
      }
    }
  ]
}
```

### 2. Grafana Dashboard

```typescript
// If using Grafana with Application Insights data source
export const grafanaDashboard = {
  title: 'AI Insights Monitoring',
  panels: [
    {
      title: 'Request Rate',
      targets: [{
        query: `
          customMetrics
          | where name == 'ai_insights_request'
          | summarize count() by bin(timestamp, 5m)
        `
      }],
      type: 'graph'
    },
    {
      title: 'P95 Latency by Operation',
      targets: [{
        query: `
          customMetrics
          | where name startswith 'ai_insights_'
          | summarize P95 = percentile(value, 95) by name, bin(timestamp, 5m)
        `
      }],
      type: 'graph'
    },
    {
      title: 'Cost Breakdown',
      targets: [{
        query: `
          customMetrics
          | where name == 'ai_insights_cost'
          | extend model = tostring(customDimensions.model)
          | summarize TotalCost = sum(value) by model
        `
      }],
      type: 'piechart'
    }
  ]
};
```

## Diagnostic Tools

### 1. Health Check Endpoint

```typescript
// Health check endpoint
app.get('/api/health/ai-insights', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      cosmosDB: await checkCosmosDB(),
      redis: await checkRedis(),
      openAI: await checkOpenAI(),
      webSearch: await checkWebSearch()
    }
  };
  
  // Determine overall status
  const hasFailure = Object.values(health.checks).some(c => c.status === 'unhealthy');
  if (hasFailure) {
    health.status = 'unhealthy';
    return res.status(503).json(health);
  }
  
  return res.json(health);
});

async function checkCosmosDB(): Promise<HealthCheck> {
  try {
    const start = Date.now();
    await cosmosDb.database('castiel').read();
    const duration = Date.now() - start;
    
    return {
      status: duration < 1000 ? 'healthy' : 'degraded',
      latency: duration,
      message: `Connected in ${duration}ms`
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkOpenAI(): Promise<HealthCheck> {
  try {
    const start = Date.now();
    await openai.models.list();
    const duration = Date.now() - start;
    
    return {
      status: duration < 2000 ? 'healthy' : 'degraded',
      latency: duration
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}
```

### 2. Diagnostic Logging

```typescript
// Enable detailed diagnostics
export class DiagnosticLogger {
  async logRequest(
    request: ChatRequest,
    response: AIResponse,
    timing: TimingInfo
  ): Promise<void> {
    const diagnostics = {
      requestId: request.id,
      userId: request.userId,
      tenantId: request.tenantId,
      
      // Timing breakdown
      timing: {
        total: timing.total,
        contextAssembly: timing.contextAssembly,
        webSearch: timing.webSearch,
        intentClassification: timing.intentClassification,
        modelInference: timing.modelInference,
        grounding: timing.grounding
      },
      
      // Context info
      context: {
        shardCount: response.context.length,
        tokenCount: this.estimateTokens(response.context),
        sources: response.context.map(s => s.type)
      },
      
      // Model info
      model: {
        name: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cost: this.calculateCost(response.usage, response.model)
      },
      
      // Quality metrics
      quality: {
        citationCount: response.citations.length,
        supportScore: response.groundingMetadata?.supportScore,
        intentConfidence: response.intentClassification.confidence
      }
    };
    
    // Log to Application Insights
    telemetryClient.trackEvent({
      name: 'ai_insights_diagnostics',
      properties: diagnostics
    });
    
    // Log slow requests
    if (timing.total > 5000) {
      logger.warn('Slow AI Insights request', diagnostics);
    }
  }
}
```

### 3. Trace Correlation

```typescript
// Correlate traces across services
export class TraceCorrelation {
  createCorrelationId(): string {
    return `ai-insights-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async trackOperation(
    correlationId: string,
    operation: string,
    fn: () => Promise<any>
  ): Promise<any> {
    const start = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      telemetryClient.trackDependency({
        target: operation,
        name: operation,
        duration,
        success: true,
        properties: { correlationId }
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      telemetryClient.trackDependency({
        target: operation,
        name: operation,
        duration,
        success: false,
        properties: { correlationId, error: error.message }
      });
      
      throw error;
    }
  }
}

// Usage
const correlationId = tracer.createCorrelationId();

const context = await tracer.trackOperation(
  correlationId,
  'context-assembly',
  () => assembler.assemble(request)
);

const response = await tracer.trackOperation(
  correlationId,
  'model-inference',
  () => chat.send(request)
);
```

## Monitoring Checklist

### Daily
- [ ] Check error rates
- [ ] Review slow operation alerts
- [ ] Monitor cost trends
- [ ] Check cache hit rates

### Weekly
- [ ] Review P95/P99 latency trends
- [ ] Analyze cost by tenant
- [ ] Review quality metrics
- [ ] Check for failed alerts

### Monthly
- [ ] Capacity planning review
- [ ] Cost optimization analysis
- [ ] Performance trend analysis
- [ ] Security audit review

## Useful Kusto Queries

### Request Volume by Hour
```kusto
requests
| where url contains '/api/v1/insights/'
| where timestamp > ago(24h)
| summarize RequestCount = count() by bin(timestamp, 1h)
| render timechart
```

### Error Analysis
```kusto
exceptions
| where operation_Name contains 'ai-insights'
| where timestamp > ago(24h)
| summarize Count = count() by type, outerMessage
| order by Count desc
```

### Slow Operations
```kusto
customMetrics
| where name startswith 'ai_insights_'
| where timestamp > ago(1h)
| where value > 3000  // >3s
| project timestamp, name, value, customDimensions
| order by value desc
```

### Cost Tracking
```kusto
customMetrics
| where name == 'ai_insights_cost'
| where timestamp > ago(30d)
| extend tenantId = tostring(customDimensions.tenantId)
| summarize TotalCost = sum(value), RequestCount = count() by tenantId
| extend AvgCostPerRequest = TotalCost / RequestCount
| order by TotalCost desc
```
