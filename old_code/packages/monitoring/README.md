# @castiel/monitoring

Monitoring abstraction layer for Castiel API services. Provides a provider-agnostic interface for tracking metrics, events, traces, exceptions, and dependencies.

## Features

- **Provider Flexibility**: Swap monitoring providers without changing application code
- **Decorator Support**: Automatic instrumentation with TypeScript decorators
- **Multiple Providers**: Azure Application Insights (default) and Mock (testing)
- **Type-Safe**: Full TypeScript support with comprehensive interfaces
- **Performance Tracking**: Built-in timer utilities for tracking operation duration
- **Dependency Tracking**: Monitor external service calls (Redis, Cosmos DB, APIs)

## Installation

```bash
pnpm add @castiel/monitoring
```

## Quick Start

### 1. Initialize Monitoring Service

```typescript
import { MonitoringService } from '@castiel/monitoring';

// Production (Azure Application Insights)
MonitoringService.initialize({
  enabled: true,
  provider: 'application-insights',
  instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
  samplingRate: 0.5, // Sample 50% of telemetry
});

// Development/Testing (Mock Provider)
MonitoringService.initialize({
  enabled: true,
  provider: 'mock',
});
```

### 2. Use Decorators for Automatic Tracking

```typescript
import { Monitor, TrackDependency, TrackExceptions } from '@castiel/monitoring';

class UserService {
  @Monitor('user.fetch') // Track execution time and success/failure
  async getUser(id: string) {
    return await db.users.findById(id);
  }

  @TrackDependency('Redis', 'cache-server') // Track external dependency calls
  async getCachedUser(id: string) {
    return await redis.get(`user:${id}`);
  }

  @TrackExceptions({ service: 'user-service' }) // Track exceptions with context
  async updateUser(id: string, data: any) {
    return await db.users.update(id, data);
  }
}
```

### 3. Manual Tracking

```typescript
import { MonitoringService, SeverityLevel } from '@castiel/monitoring';

const monitoring = MonitoringService.getInstance();

// Track custom metrics
monitoring.trackMetric('active.connections', 42, {
  region: 'us-east-1',
  service: 'main-api',
});

// Track events
monitoring.trackEvent('user.login', {
  userId: '12345',
  method: 'oauth',
});

// Track traces (logs)
monitoring.trackTrace('Cache miss for user', SeverityLevel.Warning, {
  userId: '12345',
  cacheKey: 'user:12345',
});

// Track exceptions
try {
  await riskyOperation();
} catch (error) {
  monitoring.trackException(error, { operation: 'riskyOperation' });
  throw error;
}

// Track HTTP requests
monitoring.trackRequest(
  'GET /api/users/:id',
  'https://api.castiel.com/users/12345',
  200,
  85, // duration in ms
  true // success
);

// Track dependency calls
monitoring.trackDependency(
  'CosmosDB.query',
  'Azure Cosmos DB',
  'castiel-db',
  125, // duration in ms
  true, // success
  undefined, // no error message
  { query: 'SELECT * FROM users WHERE id = @id' }
);
```

### 4. Timer Utilities

```typescript
const monitoring = MonitoringService.getInstance();

// Simple timer
const endTimer = monitoring.startTimer('database.query');
const result = await db.query(sql);
endTimer(); // Automatically tracks metric with duration

// With monitoring wrapper
import { withMonitoring } from '@castiel/monitoring';

const monitoredQuery = withMonitoring(
  async (sql: string) => db.query(sql),
  'database.query'
);

const result = await monitoredQuery('SELECT * FROM users');
```

## Configuration

### Environment Variables

For Azure Application Insights:

```env
# Required
APPINSIGHTS_INSTRUMENTATIONKEY=your-instrumentation-key

# Optional
MONITORING_ENABLED=true
MONITORING_PROVIDER=application-insights
MONITORING_SAMPLING_RATE=0.5
```

For Mock Provider (testing):

```env
MONITORING_ENABLED=true
MONITORING_PROVIDER=mock
```

### Service Integration Example

```typescript
// services/main-api/src/index.ts
import Fastify from 'fastify';
import { MonitoringService } from '@castiel/monitoring';

const monitoring = MonitoringService.initialize({
  enabled: process.env.MONITORING_ENABLED === 'true',
  provider: process.env.MONITORING_PROVIDER as 'application-insights' | 'mock',
  instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
  samplingRate: parseFloat(process.env.MONITORING_SAMPLING_RATE || '1.0'),
});

const fastify = Fastify();

// Track all HTTP requests
fastify.addHook('onRequest', async (request, reply) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  monitoring.trackRequest(
    `${request.method} ${request.routeOptions.url || request.url}`,
    request.url,
    reply.statusCode,
    duration,
    reply.statusCode < 400
  );
});

// Track exceptions
fastify.setErrorHandler((error, request, reply) => {
  monitoring.trackException(error, {
    method: request.method,
    url: request.url,
  });
  reply.status(500).send({ error: 'Internal Server Error' });
});

await fastify.listen({ port: 3000 });
```

## API Reference

### MonitoringService

Factory for creating and managing monitoring provider instances.

```typescript
class MonitoringService {
  static initialize(config: MonitoringConfig): IMonitoringProvider;
  static getInstance(): IMonitoringProvider;
  static resetInstance(): void;
}
```

### IMonitoringProvider

Core interface implemented by all monitoring providers.

```typescript
interface IMonitoringProvider {
  trackMetric(name: string, value: number, properties?: CustomProperties): void;
  trackEvent(name: string, properties?: CustomProperties): void;
  trackTrace(message: string, severity?: SeverityLevel, properties?: CustomProperties): void;
  trackException(error: Error, properties?: CustomProperties): void;
  trackRequest(name: string, url: string, statusCode: number, duration: number, success: boolean): void;
  trackDependency(name: string, type: string, target: string, duration: number, success: boolean, resultCode?: string, properties?: CustomProperties): void;
  flush(): Promise<void>;
  startTimer(metricName: string): () => void;
}
```

### Decorators

#### @Monitor(metricName?: string)

Tracks method execution time and success/failure events.

```typescript
@Monitor('operation.name')
async myMethod() {
  // Automatically tracked
}
```

#### @TrackDependency(type: string, target: string)

Tracks external dependency calls.

```typescript
@TrackDependency('Redis', 'cache-server')
async cacheOperation() {
  // Dependency call tracked
}
```

#### @TrackExceptions(properties?: CustomProperties)

Tracks exceptions thrown by the method.

```typescript
@TrackExceptions({ service: 'auth' })
async riskyOperation() {
  // Exceptions tracked automatically
}
```

## Testing

The mock provider is designed for testing and includes helper methods:

```typescript
import { MockMonitoringProvider } from '@castiel/monitoring';

const mockMonitoring = new MockMonitoringProvider({ enabled: true, provider: 'mock' });

// Track some operations
mockMonitoring.trackMetric('test.metric', 42);
mockMonitoring.trackEvent('test.event');

// Assert tracked data
const metrics = mockMonitoring.getMetrics();
expect(metrics).toHaveLength(1);
expect(metrics[0].name).toBe('test.metric');
expect(metrics[0].value).toBe(42);

// Clear tracked data
mockMonitoring.clear();
```

## Architecture

```
@castiel/monitoring/
├── src/
│   ├── types.ts                 # Core interfaces and types
│   ├── service.ts               # MonitoringService factory and decorators
│   ├── providers/
│   │   ├── application-insights.ts  # Azure Application Insights provider
│   │   └── mock.ts              # Mock provider for testing
│   └── index.ts                 # Public exports
```

## Provider Comparison

| Feature | Application Insights | Mock Provider |
|---------|---------------------|---------------|
| Production Use | ✅ | ❌ |
| Testing | ❌ | ✅ |
| Real Telemetry | ✅ | ❌ (console logs) |
| Performance Overhead | Low | Minimal |
| Cost | Azure pricing | Free |
| Test Helpers | ❌ | ✅ (getMetrics, clear, etc.) |

## Adding New Providers

To add a new monitoring provider (e.g., Datadog, New Relic):

1. Create a new file in `src/providers/`
2. Implement the `IMonitoringProvider` interface
3. Add provider to `MonitoringService.initialize()` switch statement
4. Export from `src/index.ts`

```typescript
// src/providers/datadog.ts
export class DatadogProvider implements IMonitoringProvider {
  constructor(config: { enabled: boolean; apiKey: string }) {
    // Initialize Datadog SDK
  }

  trackMetric(name: string, value: number, properties?: CustomProperties) {
    // Implement with Datadog API
  }

  // ... implement other methods
}
```

## Best Practices

1. **Use Decorators**: Prefer decorators over manual tracking for consistent instrumentation
2. **Sampling**: In high-traffic environments, use sampling to reduce costs (0.1 - 0.5)
3. **Custom Properties**: Add context with custom properties for better debugging
4. **Flush on Shutdown**: Call `monitoring.flush()` before process exits
5. **Mock in Tests**: Use mock provider in unit/integration tests
6. **Error Boundaries**: Track exceptions at service boundaries for better error visibility

## License

MIT
