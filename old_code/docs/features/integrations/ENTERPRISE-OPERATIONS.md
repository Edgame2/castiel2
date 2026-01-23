# Enterprise Operations Guide

## Overview

This document provides enterprise-grade operational guidance for the integration system, covering security, reliability, scalability, operational excellence, and compliance.

---

## Table of Contents

1. [Security & Compliance](#security--compliance)
2. [Reliability & Resilience](#reliability--resilience)
3. [Scalability & Performance](#scalability--performance)
4. [Operational Excellence](#operational-excellence)
5. [Data Management](#data-management)

---

## Security & Compliance

### Credential Rotation Policy

#### Automatic Credential Rotation

**OAuth Tokens**:
- Tokens are automatically refreshed before expiration
- `TokenRefresher` function runs hourly to check for expiring tokens
- Refresh failures trigger alerts and disable integration

**Implementation**:
```typescript
// TokenRefresher function (runs hourly)
async function refreshExpiringTokens(): Promise<void> {
  const expiringTokens = await findTokensExpiringWithin(2 * 60 * 60 * 1000); // 2 hours
  
  for (const token of expiringTokens) {
    try {
      await refreshOAuthToken(token);
    } catch (error) {
      // Alert and disable integration
      await notifyAndDisable(token.integrationId);
    }
  }
}
```

#### Manual Credential Rotation

**API Keys**:
- Tenant admins can rotate API keys via UI
- Old keys are invalidated immediately
- New keys are tested before activation

**Process**:
1. Admin initiates rotation via UI
2. New credentials stored in Key Vault
3. Integration document updated with new `credentialSecretName`
4. Connection tested with new credentials
5. Old credentials marked as deprecated (kept for rollback)
6. Audit log entry created

#### Key Vault Secret Versioning

- Key Vault maintains version history for all secrets
- Previous versions can be restored if needed
- Version metadata includes rotation timestamp

### Access Control & RBAC

#### Role-Based Permissions Matrix

| Operation | Super Admin | Tenant Admin | User |
|-----------|-------------|--------------|------|
| View providers | ✅ All | ✅ Tenant-visible only | ❌ |
| Create provider | ✅ | ❌ | ❌ |
| Update provider | ✅ | ❌ | ❌ |
| Delete provider | ✅ | ❌ | ❌ |
| Change provider status | ✅ | ❌ | ❌ |
| Enable integration | ❌ | ✅ | ❌ |
| Configure integration | ❌ | ✅ | ❌ |
| Test connection | ✅ (system) | ✅ (tenant) | ❌ |
| Update credentials | ✅ (system) | ✅ (tenant) | ❌ |
| Activate/disable | ✅ (all) | ✅ (tenant) | ❌ |
| Search integrations | ❌ | ✅ | ✅ |
| Connect user integration | ❌ | ❌ | ✅ |

#### Data Access Scoping

**Tenant Isolation**:
- All queries filtered by `tenantId`
- Tenant admins can only access their tenant's data
- Super admins can access all tenants (for support)

**Data Access Control**:
- `allowedShardTypes` field restricts which shard types integration can access
- Enforced at adapter level
- Audit logged when access is denied

**User-Level Scoping**:
- User-scoped integrations filter results by user permissions
- User can only access their own data
- Enforced at adapter level

### Encryption & Secrets Management

#### Encryption at Rest

- Cosmos DB: Automatic encryption at rest (Azure managed keys)
- Key Vault: Hardware Security Modules (HSM) for key storage

#### Encryption in Transit

- All API calls use TLS 1.2+
- Key Vault access via HTTPS only
- Internal service communication via encrypted channels

#### Key Vault Access Policies

**Service Principal Permissions**:
- `Get` secrets: Read credentials
- `Set` secrets: Update credentials (for rotation)
- `List` secrets: Enumerate secrets (for management)

**Access Control**:
- Managed Identity for service access
- Role-Based Access Control (RBAC) for admin access
- Audit logging for all Key Vault access

#### Secret Naming Conventions

**Pattern**: `{scope}-{identifier}-{provider}-{type}`

**Examples**:
- `tenant-abc123-salesforce-sales-team-oauth`
- `tenant-abc123-user-user456-gmail-personal-oauth`
- `system-salesforce-oauth`

**Lifecycle**:
- Secrets created when integration is connected
- Secrets updated during credential rotation
- Secrets deleted when integration is disconnected
- Old versions retained for rollback (30 days)

### Compliance & Audit

#### GDPR Compliance

**Data Access**:
- Users can request access to their integration data
- Export functionality for user data
- Data portability support

**Data Deletion**:
- Right to be forgotten: Delete user's integration data
- Cascade deletion: Delete user-scoped connections
- Audit trail of deletions

**Data Processing**:
- Clear consent for data processing
- Purpose limitation: Data used only for integration purposes
- Data minimization: Only necessary data is processed

#### SOC2 Requirements

**Audit Trails**:
- All integration events are audited
- Audit logs retained for 7+ years
- Immutable audit logs (append-only)

**Access Logs**:
- All Key Vault access is logged
- All API access is logged
- Failed authentication attempts are logged

**Change Management**:
- All configuration changes are audited
- Change approval process for critical changes
- Rollback procedures documented

#### Data Retention Policies

**Integration Data**:
- Providers: Permanent (system catalog)
- Integrations: Permanent (tenant configuration)
- Connections: Permanent (credential references)

**Sync Data**:
- Sync executions: 30 days TTL
- Sync conflicts: 90 days TTL
- Sync history: 1 year (archived)

**Audit Logs**:
- Retention: 7+ years (for compliance)
- Archived after 1 year
- Immutable (cannot be modified or deleted)

---

## Reliability & Resilience

### Retry & Circuit Breaker Patterns

#### Exponential Backoff Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: number; // Default: 3
  initialDelayMs: number; // Default: 1000
  backoffMultiplier: number; // Default: 2
  maxDelayMs: number; // Default: 60000
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let delay = config.initialDelayMs;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === config.maxAttempts || !isRetryableError(error)) {
        throw error;
      }
      
      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }
}
```

#### Circuit Breaker Thresholds

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number; // Open circuit after N failures (default: 5)
  successThreshold: number; // Close circuit after N successes (default: 2)
  timeout: number; // Time to wait before attempting (default: 60000)
}

class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailureTime?: Date;
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.config.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

#### Dead Letter Queue Handling

Failed sync jobs are sent to dead letter queue:

```typescript
// Service Bus dead letter queue configuration
{
  maxDeliveryCount: 10,
  deadLetteringOnMessageExpiration: true,
  deadLetteringOnFilterEvaluationExceptions: true
}

// Process dead letter messages
async function processDeadLetterMessages(): Promise<void> {
  const deadLetterMessages = await serviceBusClient.receiveDeadLetterMessages();
  
  for (const message of deadLetterMessages) {
    // Log error
    await auditService.logError(message);
    
    // Notify admin
    await notifyAdmin({
      integrationId: message.integrationId,
      error: message.error,
      retryCount: message.deliveryCount
    });
    
    // Manual retry option
    await queueManualRetry(message);
  }
}
```

#### Retry Policies Per Integration Type

Different retry policies for different integration types:

```typescript
const retryPolicies = {
  salesforce: {
    maxAttempts: 5,
    initialDelayMs: 2000,
    backoffMultiplier: 2
  },
  slack: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 1.5
  },
  gmail: {
    maxAttempts: 4,
    initialDelayMs: 1500,
    backoffMultiplier: 2
  }
};
```

### Health Monitoring & Alerting

#### Health Check Endpoints

**Integration Health**:
```
GET /api/integrations/health
```

**Response**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  integrations: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  connections: {
    total: number;
    active: number;
    expired: number;
    error: number;
  };
  lastCheckedAt: Date;
}
```

#### Integration Health Status

**Healthy**:
- Connection status: `active`
- Last sync: Within expected interval
- No recent errors

**Degraded**:
- Connection status: `active` but slow
- Some sync failures (retryable)
- High latency

**Failed**:
- Connection status: `error` or `expired`
- Multiple sync failures
- Credentials invalid

#### Alerting Thresholds

**Error Rate**:
- Warning: > 5% error rate in last hour
- Critical: > 20% error rate in last hour

**Latency**:
- Warning: P95 latency > 5 seconds
- Critical: P95 latency > 10 seconds

**Connection Failures**:
- Warning: > 3 connection failures in last hour
- Critical: > 10 connection failures in last hour

#### Monitoring Dashboards

**Integration Dashboard**:
- Total integrations by status
- Connection health over time
- Sync success/failure rates
- Error rates by integration
- Latency percentiles

**Provider Dashboard**:
- Provider usage statistics
- Provider health metrics
- Provider error rates

### Rate Limiting & Throttling

#### Per-Provider Rate Limits

```typescript
const providerRateLimits = {
  salesforce: {
    requestsPerSecond: 25,
    requestsPerMinute: 1500,
    requestsPerDay: 100000
  },
  slack: {
    requestsPerSecond: 30,
    requestsPerMinute: 1800,
    requestsPerDay: 100000
  }
};
```

#### Per-Tenant Rate Limits

```typescript
const tenantRateLimits = {
  default: {
    requestsPerMinute: 100,
    requestsPerHour: 5000,
    requestsPerDay: 50000
  },
  premium: {
    requestsPerMinute: 500,
    requestsPerHour: 25000,
    requestsPerDay: 250000
  }
};
```

#### Rate Limit Queuing Strategy

When rate limit is exceeded:

1. **Queue Request**: Add to rate limit queue
2. **Wait**: Wait until rate limit window resets
3. **Retry**: Retry request when limit allows
4. **Timeout**: Fail if queued too long (5 minutes)

#### Rate Limit Alerts

- Alert when tenant approaches rate limit (80% threshold)
- Alert when rate limit exceeded
- Alert when queued requests exceed threshold

---

## Scalability & Performance

### Connection Pooling & Resource Management

#### Connection Pool Configuration

```typescript
const connectionPoolConfig = {
  maxConnections: 100, // Max connections per adapter
  minConnections: 10, // Min connections to maintain
  idleTimeout: 30000, // Close idle connections after 30s
  connectionTimeout: 10000, // Connection timeout
  keepAlive: true
};
```

#### Timeout Settings

```typescript
const timeoutSettings = {
  apiCall: 30000, // 30 seconds
  syncJob: 600000, // 10 minutes
  connectionTest: 10000, // 10 seconds
  searchQuery: 5000 // 5 seconds
};
```

#### Concurrent Request Limits

```typescript
const concurrencyLimits = {
  perTenant: 3, // Max concurrent syncs per tenant
  perIntegration: 1, // Max concurrent syncs per integration
  global: 50 // Max total concurrent syncs
};
```

#### Resource Cleanup Procedures

```typescript
// Cleanup idle connections
async function cleanupIdleConnections(): Promise<void> {
  const idleConnections = await findIdleConnections(30000);
  
  for (const connection of idleConnections) {
    await connection.close();
    await connectionPool.release(connection);
  }
}

// Cleanup expired tokens
async function cleanupExpiredTokens(): Promise<void> {
  const expiredTokens = await findExpiredTokens();
  
  for (const token of expiredTokens) {
    await markTokenAsExpired(token);
    await notifyAdmin(token);
  }
}
```

### Async Processing & Queuing

#### Service Bus Queue Configuration

```typescript
const queueConfig = {
  'sync-inbound-scheduled': {
    maxSizeInMegabytes: 5120,
    defaultMessageTimeToLive: 'P14D',
    maxDeliveryCount: 10,
    lockDuration: 'PT10M',
    requiresSession: false
  },
  'sync-outbound': {
    maxSizeInMegabytes: 5120,
    defaultMessageTimeToLive: 'P7D',
    maxDeliveryCount: 10,
    lockDuration: 'PT10M',
    requiresSession: true // Per-integration ordering
  }
};
```

#### Message Priority Handling

```typescript
enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3
}

// High priority for webhook events
await serviceBusClient.sendMessage('sync-inbound-webhook', message, {
  priority: MessagePriority.HIGH
});

// Normal priority for scheduled syncs
await serviceBusClient.sendMessage('sync-inbound-scheduled', message, {
  priority: MessagePriority.NORMAL
});
```

#### Batch Processing Strategies

```typescript
// Process records in batches
async function processBatch(
  records: any[],
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await processBatchRecords(batch);
    
    // Rate limiting: Wait between batches
    await sleep(1000);
  }
}
```

#### Queue Monitoring and Scaling

- Monitor queue depth
- Auto-scale workers based on queue depth
- Alert when queue depth exceeds threshold
- Monitor message processing rate

### Caching Strategy

#### Integration Metadata Caching

```typescript
// Cache provider definitions
const providerCache = new Map<string, IntegrationProviderDocument>();

async function getProvider(category: string, provider: string): Promise<IntegrationProviderDocument> {
  const cacheKey = `${category}:${provider}`;
  
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }
  
  const provider = await repository.findByCategoryAndProvider(category, provider);
  providerCache.set(cacheKey, provider);
  
  return provider;
}
```

#### Credential Caching (with TTL)

```typescript
// Cache credentials with short TTL (5 minutes)
const credentialCache = new Map<string, { credentials: Credentials; expiresAt: Date }>();

async function getCredentials(secretName: string): Promise<Credentials> {
  const cached = credentialCache.get(secretName);
  
  if (cached && cached.expiresAt > new Date()) {
    return cached.credentials;
  }
  
  const credentials = await keyVaultClient.getSecret(secretName);
  credentialCache.set(secretName, {
    credentials,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  });
  
  return credentials;
}
```

#### Rate Limit State Caching

```typescript
// Cache rate limit state in Redis
async function checkRateLimit(
  tenantId: string,
  provider: string
): Promise<boolean> {
  const key = `ratelimit:${tenantId}:${provider}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, 60); // 60 second window
  }
  
  const limit = await getRateLimit(tenantId, provider);
  return current <= limit;
}
```

#### Cache Invalidation Policies

- **Provider updates**: Invalidate provider cache
- **Credential updates**: Invalidate credential cache
- **Integration updates**: Invalidate integration cache
- **TTL-based expiration**: Automatic expiration based on TTL

---

## Operational Excellence

### Configuration Management

#### Environment-Specific Configurations

```typescript
const config = {
  development: {
    maxRecordsPerSync: 100,
    maxConcurrentSyncs: 1,
    syncTimeout: 300000 // 5 minutes
  },
  staging: {
    maxRecordsPerSync: 500,
    maxConcurrentSyncs: 2,
    syncTimeout: 600000 // 10 minutes
  },
  production: {
    maxRecordsPerSync: 1000,
    maxConcurrentSyncs: 3,
    syncTimeout: 600000 // 10 minutes
  }
};
```

#### Feature Flags for Integrations

```typescript
const featureFlags = {
  'integration-search': {
    enabled: true,
    enabledForTenants: ['tenant-123', 'tenant-456']
  },
  'user-scoping': {
    enabled: true,
    enabledForProviders: ['gmail', 'slack']
  }
};
```

#### A/B Testing Capabilities

```typescript
// A/B test different sync strategies
const syncStrategy = await getABTestVariant(tenantId, 'sync-strategy');

if (syncStrategy === 'incremental') {
  await syncIncremental(integration);
} else {
  await syncFull(integration);
}
```

#### Configuration Versioning

- Configuration changes are versioned
- Rollback to previous configuration versions
- Configuration change audit logs

### Error Handling & Logging

#### Error Classification

**Retryable Errors**:
- Network timeouts
- Rate limit exceeded (temporary)
- Service unavailable (temporary)
- Connection timeout

**Non-Retryable Errors**:
- Invalid credentials
- Permission denied
- Resource not found
- Validation errors

```typescript
function isRetryableError(error: Error): boolean {
  const retryableCodes = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', '429', '503'];
  return retryableCodes.some(code => error.message.includes(code));
}
```

#### Structured Logging Format

```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context: {
    tenantId?: string;
    integrationId?: string;
    providerName?: string;
    userId?: string;
    operation: string;
    requestId: string;
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}
```

#### Error Correlation IDs

All errors include correlation IDs for tracking:

```typescript
const requestId = generateRequestId();

try {
  await operation();
} catch (error) {
  logger.error({
    message: 'Operation failed',
    requestId,
    error: {
      code: error.code,
      message: error.message
    }
  });
  
  throw new Error(`Operation failed (Request ID: ${requestId})`);
}
```

#### Error Notification Channels

- **Critical Errors**: Immediate notification to on-call engineer
- **Warning Errors**: Notification to team channel
- **Info Errors**: Logged for monitoring

### Testing & Validation

#### Connection Testing Procedures

1. **Basic Connectivity**: Test connection to external system
2. **Authentication**: Verify credentials are valid
3. **Authorization**: Verify permissions are sufficient
4. **Data Access**: Test reading sample data
5. **Performance**: Measure response time

#### Integration Smoke Tests

```typescript
async function smokeTestIntegration(integrationId: string): Promise<SmokeTestResult> {
  const integration = await getIntegration(integrationId);
  const adapter = await getAdapter(integration.providerName);
  
  const tests = [
    { name: 'Connection', test: () => adapter.testConnection() },
    { name: 'Fetch Records', test: () => adapter.fetchRecords({ entity: 'User', limit: 1 }) },
    { name: 'Search', test: () => adapter.search({ query: 'test', tenantId: integration.tenantId }) }
  ];
  
  const results = await Promise.allSettled(tests.map(t => t.test()));
  
  return {
    passed: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    details: results
  };
}
```

#### Data Validation Rules

```typescript
interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  validator: (value: any) => boolean;
  errorMessage: string;
}

const validationRules: ValidationRule[] = [
  {
    field: 'name',
    type: 'required',
    validator: (v) => v && v.length > 0,
    errorMessage: 'Name is required'
  },
  {
    field: 'credentialSecretName',
    type: 'format',
    validator: (v) => /^tenant-\w+-\w+-\w+-\w+$/.test(v),
    errorMessage: 'Invalid secret name format'
  }
];
```

#### Schema Validation

```typescript
import { z } from 'zod';

const IntegrationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  providerName: z.string(),
  name: z.string().min(1),
  searchEnabled: z.boolean().optional(),
  allowedShardTypes: z.array(z.string()).optional()
});

function validateIntegration(data: any): IntegrationDocument {
  return IntegrationSchema.parse(data);
}
```

### Documentation & Runbooks

#### Troubleshooting Guides

**Common Issues**:

1. **Connection Failures**:
   - Check credentials in Key Vault
   - Verify external system is accessible
   - Check network connectivity
   - Review connection test results

2. **Sync Failures**:
   - Check adapter logs
   - Verify entity mappings
   - Check data access permissions
   - Review sync execution history

3. **Search Not Working**:
   - Verify search is enabled for integration
   - Check searchable entities configuration
   - Review adapter search implementation
   - Check user scoping configuration

#### Common Error Scenarios

**Error**: "Credentials expired"
- **Solution**: Refresh OAuth tokens or update API keys
- **Prevention**: Enable automatic token refresh

**Error**: "Rate limit exceeded"
- **Solution**: Wait for rate limit window to reset
- **Prevention**: Implement rate limit queuing

**Error**: "Connection timeout"
- **Solution**: Check network connectivity, increase timeout
- **Prevention**: Monitor connection health

#### Operational Runbooks

**Runbook**: "Integration Connection Failure"

1. Identify affected integration
2. Check connection status in `integrations` container
3. Review connection test results
4. Check Key Vault for credential issues
5. Test connection manually
6. Update credentials if needed
7. Re-enable integration
8. Monitor for recurrence

**Runbook**: "Sync Task Failure"

1. Identify failed sync task
2. Review sync execution logs
3. Check adapter error messages
4. Verify entity mappings
5. Check data access permissions
6. Retry sync task
7. Investigate root cause
8. Update configuration if needed

#### Incident Response Procedures

**Severity Levels**:

- **P0 - Critical**: All integrations down, data loss
- **P1 - High**: Major integration down, significant impact
- **P2 - Medium**: Minor integration issues, limited impact
- **P3 - Low**: Non-critical issues, no user impact

**Response Times**:
- P0: Immediate response (< 15 minutes)
- P1: Response within 1 hour
- P2: Response within 4 hours
- P3: Response within 24 hours

---

## Data Management

### Data Quality & Validation

#### Data Validation Rules Per Integration

```typescript
const validationRules = {
  salesforce: {
    account: {
      name: { required: true, maxLength: 255 },
      industry: { enum: ['Technology', 'Finance', 'Healthcare'] }
    },
    contact: {
      email: { required: true, format: 'email' },
      phone: { format: 'phone' }
    }
  }
};
```

#### Schema Evolution Handling

```typescript
// Handle schema changes gracefully
async function handleSchemaEvolution(
  integration: IntegrationDocument,
  data: any
): Promise<any> {
  const currentSchema = integration.entityMappings;
  const newSchema = await getLatestSchema(integration.providerName);
  
  if (hasSchemaChanged(currentSchema, newSchema)) {
    // Migrate data to new schema
    return migrateData(data, currentSchema, newSchema);
  }
  
  return data;
}
```

#### Data Transformation Pipelines

```typescript
// Transform external data to Castiel format
async function transformData(
  externalData: any,
  mapping: EntityMapping
): Promise<any> {
  const transformed: any = {};
  
  for (const fieldMapping of mapping.fieldMappings) {
    const externalValue = getNestedValue(externalData, fieldMapping.externalField);
    const transformedValue = applyTransform(externalValue, fieldMapping.transform);
    setNestedValue(transformed, fieldMapping.shardField, transformedValue);
  }
  
  return transformed;
}
```

#### Data Quality Metrics

```typescript
interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  validationErrors: {
    field: string;
    error: string;
    count: number;
  }[];
  completeness: number; // Percentage of required fields filled
  accuracy: number; // Percentage of records matching validation rules
}
```

### Conflict Resolution

#### Bidirectional Sync Conflict Resolution

**Conflict Detection**:
- Compare `lastModifiedDate` from both systems
- Compare record versions/ETags
- Detect concurrent modifications

**Resolution Strategies**:

1. **Newest Wins**: Most recent modification wins
2. **Source Wins**: External system always wins
3. **Target Wins**: Castiel always wins
4. **Manual**: Flag for manual resolution
5. **Merge**: Attempt to merge changes

```typescript
async function resolveConflict(
  conflict: ConflictRecord,
  strategy: ConflictResolutionMode
): Promise<void> {
  switch (strategy) {
    case 'newest_wins':
      const newest = conflict.shardVersion.lastModified > conflict.externalVersion.lastModified
        ? conflict.shardVersion
        : conflict.externalVersion;
      await applyVersion(newest);
      break;
      
    case 'manual':
      await flagForManualResolution(conflict);
      break;
      
    // ... other strategies
  }
}
```

#### Conflict Notification

```typescript
// Notify admin of conflicts requiring manual resolution
async function notifyConflict(conflict: ConflictRecord): Promise<void> {
  await notificationService.createSystemNotification({
    tenantId: conflict.tenantId,
    targetType: 'all_tenant',
    type: 'warning',
    name: 'Sync Conflict Detected',
    content: `A conflict was detected for ${conflict.entityType} "${conflict.title}". Manual resolution required.`,
    link: `/integrations/${conflict.integrationId}/conflicts/${conflict.id}`,
    metadata: {
      source: 'integration_system',
      relatedId: conflict.integrationId,
      conflictId: conflict.id
    }
  });
}
```

#### Conflict Audit Trail

All conflict resolutions are audited:

```typescript
await auditService.logIntegrationEvent({
  eventType: 'integration.conflict.resolved',
  tenantId: conflict.tenantId,
  actor: { type: 'tenant_admin', userId },
  target: { type: 'conflict', conflictId: conflict.id },
  action: {
    operation: 'resolve',
    strategy: resolutionStrategy
  },
  result: { success: true },
  metadata: {
    conflictId: conflict.id,
    resolutionStrategy,
    resolvedData: finalData
  }
});
```

### Data Retention & Lifecycle

#### Sync History Retention (TTL)

**Container**: `sync-executions`

**TTL**: 30 days

```typescript
{
  id: 'sync-executions',
  partitionKey: '/tenantId',
  defaultTtl: 60 * 60 * 24 * 30 // 30 days
}
```

#### Audit Log Retention

**Retention**: 7+ years (for compliance)

**Archival**: After 1 year, move to cold storage

**Immutable**: Cannot be modified or deleted

#### Data Archival Policies

**Archived Data**:
- Sync executions older than 1 year
- Audit logs older than 1 year
- Conflict records older than 90 days (if resolved)

**Archival Process**:
1. Export data to Azure Blob Storage
2. Compress and encrypt
3. Update metadata in Cosmos DB
4. Delete from active container (after verification)

#### Data Deletion Procedures

**User Data Deletion (GDPR)**:
1. Identify all user's integration data
2. Delete user-scoped connections
3. Delete user's search history
4. Anonymize audit logs (if required)
5. Confirm deletion completion

**Integration Deletion**:
1. Disable integration
2. Stop all sync tasks
3. Delete connection credentials from Key Vault
4. Delete integration document
5. Archive sync history (optional)
6. Confirm deletion completion

---

## Related Documentation

- [Container Architecture](./CONTAINER-ARCHITECTURE.md) - Integration container structure
- [Configuration](./CONFIGURATION.md) - Integration configuration
- [Audit Logging](./AUDIT.md) - Audit log integration
- [Credentials Management](./CREDENTIALS.md) - Credential security

---

**Last Updated**: January 2025  
**Version**: 1.0.0







