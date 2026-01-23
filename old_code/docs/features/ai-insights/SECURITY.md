# AI Insights Security

## Overview

AI Insights implements defense-in-depth security across multiple layers to protect sensitive data, ensure tenant isolation, and prevent unauthorized access.

## Data Protection

### 1. Tenant Isolation

All queries are strictly isolated by `tenantId`:

```typescript
// Context assembly only retrieves shards from same tenant
const context = await assembler.assemble({
  scope: {
    tenantId: user.tenantId,  // ✅ Enforced at query level
    projectId: 'proj_123'
  }
});

// Cosmos DB query uses partition key for isolation
const query = `
  SELECT * FROM c 
  WHERE c.tenantId = @tenantId 
  AND c.pk = @tenantId  -- Hierarchical partition key
`;
```

**Implementation**:
- Every Cosmos DB query includes `tenantId` in partition key
- Middleware validates `tenantId` matches JWT claim
- Cross-tenant queries are blocked at database level

### 2. User Permissions

Context assembly respects Access Control Lists (ACLs):

```typescript
// Filter shards by user permissions
const accessibleShards = shards.filter(shard => {
  return hasAccess(user, shard.acl);
});

// ACL structure
interface ACL {
  owner: string;
  readers: string[];
  writers: string[];
  inheritsFrom?: string;  // Parent shard ID
}
```

**Permission Checks**:
- All shard access filtered by user permissions
- Citations only shown for accessible shards
- Relationship traversal respects ACLs
- Admin users can override for support purposes

### 3. Sensitive Data Handling

#### PII Detection

```typescript
// Use Azure Content Safety API for PII detection
import { ContentSafetyClient } from '@azure/ai-content-safety';

const analyzer = new ContentSafetyClient(endpoint, credential);

// Scan user input
const result = await analyzer.analyzeText({
  text: userQuery,
  categories: ['PII', 'FinancialData', 'HealthInfo']
});

if (result.piiDetected) {
  // Redact or warn user
  logger.warn('PII detected in query', {
    userId: user.id,
    tenantId: user.tenantId,
    piiTypes: result.categories
  });
}
```

#### Data Redaction

```typescript
// Redact sensitive information in logs
const redactedQuery = redactPII(userQuery);

logger.info('AI Insights request', {
  userId: user.id,
  tenantId: user.tenantId,
  queryLength: userQuery.length,
  intent: classifiedIntent,
  // ❌ NEVER log: query, content, response
});
```

#### Data Retention

| Data Type | Retention Period | Configurable |
|-----------|-----------------|--------------|
| Conversations | 90 days (default) | Yes, per tenant |
| Web search results | 30 days | No |
| Application logs | 30 days | Yes, per environment |
| Audit logs | 7 years | No (compliance) |
| Context assembly cache | 1 hour | Yes, per template |

**Cleanup Jobs**:
```typescript
// Automated cleanup (Azure Function)
export async function cleanupExpiredData(context: Context): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  
  // Delete expired conversations
  await cosmosDb.container('c_conversation')
    .items.query({
      query: 'SELECT * FROM c WHERE c.lastMessageAt < @cutoff',
      parameters: [{ name: '@cutoff', value: cutoffDate.toISOString() }]
    })
    .fetchAll();
}
```

### 4. API Security

#### Authentication

```typescript
// All endpoints require JWT
import { verifyJWT } from '@castiel/azure-ad-b2c';

app.use('/api/v1/insights', async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = await verifyJWT(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Super admin endpoints require role check
app.post('/api/v1/insights/admin/*', (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

#### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Per-user rate limiting
const userLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,  // 60 requests per minute
  keyGenerator: (req) => req.user.id,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Per-tenant rate limiting
const tenantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,  // 1000 requests per minute per tenant
  keyGenerator: (req) => req.user.tenantId
});

// Super admin gets higher limits
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  keyGenerator: (req) => req.user.id,
  skip: (req) => req.user.role !== 'super_admin'
});

app.use('/api/v1/insights', userLimiter, tenantLimiter);
```

#### Input Validation

```typescript
import { z } from 'zod';

// Validate all inputs
const chatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string()
    .min(1, 'Content required')
    .max(4000, 'Content too long'),
  scope: z.object({
    tenantId: z.string().uuid(),
    projectId: z.string().uuid().optional(),
    shardIds: z.array(z.string().uuid()).max(10).optional()
  }),
  stream: z.boolean().optional()
});

app.post('/api/v1/insights/chat', async (req, res) => {
  try {
    const validated = chatRequestSchema.parse(req.body);
    // Process validated input
  } catch (error) {
    return res.status(400).json({ error: error.errors });
  }
});
```

### 5. Model Security

#### Prompt Injection Protection

```typescript
// Separate system and user messages
const messages = [
  {
    role: 'system',
    content: SYSTEM_PROMPT  // ✅ Controlled by us
  },
  {
    role: 'user',
    content: sanitizeUserInput(userQuery)  // ✅ Sanitized
  }
];

// Sanitization function
function sanitizeUserInput(input: string): string {
  // Remove code blocks that might contain instructions
  let sanitized = input.replace(/```[\s\S]*?```/g, '[code block removed]');
  
  // Remove potential system message injections
  sanitized = sanitized.replace(/\[SYSTEM\]|\[INST\]|\[\/INST\]/gi, '');
  
  // Limit length
  if (sanitized.length > 4000) {
    sanitized = sanitized.substring(0, 4000);
  }
  
  return sanitized;
}
```

#### Output Filtering

```typescript
import { ContentSafetyClient } from '@azure/ai-content-safety';

// Scan model output before returning to user
async function filterResponse(response: string): Promise<string> {
  const safety = new ContentSafetyClient(endpoint, credential);
  
  const result = await safety.analyzeText({
    text: response,
    categories: ['Hate', 'Violence', 'SelfHarm', 'Sexual']
  });
  
  if (result.severity >= 4) {  // High severity
    logger.error('Harmful content detected', {
      categories: result.categoriesAnalysis
    });
    
    return 'I apologize, but I cannot provide that response.';
  }
  
  return response;
}
```

#### Credential Protection

```typescript
// Never include credentials in model context
const sanitizedContext = context.map(shard => {
  const { connectionString, apiKey, secret, ...safe } = shard;
  return safe;
});

// Block credential generation
const CREDENTIAL_PATTERNS = [
  /password["\s:]+[\w!@#$%^&*]+/i,
  /api[_-]?key["\s:]+[\w-]+/i,
  /secret["\s:]+[\w-]+/i,
  /Bearer\s+[\w-]+/,
];

function detectCredentials(text: string): boolean {
  return CREDENTIAL_PATTERNS.some(pattern => pattern.test(text));
}
```

## Compliance

### GDPR (General Data Protection Regulation)

#### Right to Deletion

```typescript
// Delete all user data
export async function deleteUserData(userId: string): Promise<void> {
  // Delete conversations
  await cosmosDb.container('c_conversation')
    .items.query({
      query: 'SELECT * FROM c WHERE c.userId = @userId',
      parameters: [{ name: '@userId', value: userId }]
    })
    .fetchAll()
    .then(results => {
      results.resources.forEach(item => item.delete());
    });
  
  // Delete recurring searches
  await cosmosDb.container('c_recurringSearch')
    .items.query({
      query: 'SELECT * FROM c WHERE c.userId = @userId',
      parameters: [{ name: '@userId', value: userId }]
    })
    .fetchAll()
    .then(results => {
      results.resources.forEach(item => item.delete());
    });
  
  // Delete from cache
  await redis.del(`user:${userId}:*`);
}
```

#### Data Portability

```typescript
// Export user conversation history
export async function exportUserData(userId: string): Promise<object> {
  const conversations = await getConversations(userId);
  const recurringSearches = await getRecurringSearches(userId);
  
  return {
    exportDate: new Date().toISOString(),
    userId,
    conversations: conversations.map(conv => ({
      id: conv.id,
      createdAt: conv.createdAt,
      messages: conv.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    })),
    recurringSearches
  };
}
```

#### Consent Management

```typescript
// Explicit opt-in for AI features
interface UserConsent {
  userId: string;
  tenantId: string;
  aiInsightsEnabled: boolean;
  webSearchEnabled: boolean;
  dataRetentionDays: number;
  consentedAt: Date;
  version: string;  // Consent version
}

// Check consent before processing
app.post('/api/v1/insights/chat', async (req, res) => {
  const consent = await getConsent(req.user.id);
  
  if (!consent.aiInsightsEnabled) {
    return res.status(403).json({
      error: 'AI Insights not enabled',
      message: 'Please enable AI features in your settings'
    });
  }
  
  // Process request
});
```

### SOC 2 Compliance

#### Audit Logging

```typescript
// Log all AI operations
export function auditLog(event: AuditEvent): void {
  logger.info('AUDIT', {
    timestamp: new Date().toISOString(),
    userId: event.userId,
    tenantId: event.tenantId,
    action: event.action,
    resource: event.resource,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    result: event.result,
    // Store in separate audit table
    _type: 'audit'
  });
}

// Example usage
auditLog({
  userId: user.id,
  tenantId: user.tenantId,
  action: 'AI_INSIGHTS_QUERY',
  resource: `conversation:${conversationId}`,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  result: 'SUCCESS'
});
```

#### Encryption at Rest

```typescript
// Cosmos DB encryption
// Enabled by default for all Azure Cosmos DB accounts
// Uses Microsoft-managed keys or customer-managed keys (CMK)

// Key Vault integration for CMK
const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL;
const keyName = 'cosmos-db-encryption-key';

// Cosmos DB automatically encrypts all data at rest
// No code changes required
```

#### Encryption in Transit

```typescript
// Enforce TLS 1.3
import https from 'https';
import fs from 'fs';

const server = https.createServer({
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem'),
  minVersion: 'TLSv1.3',  // ✅ Enforce TLS 1.3
  ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256'
}, app);

server.listen(443);
```

## Security Checklist

### Development
- [ ] Use environment variables for secrets
- [ ] Never commit API keys or credentials
- [ ] Use Azure Key Vault for production secrets
- [ ] Enable TypeScript strict mode
- [ ] Use Zod for runtime validation
- [ ] Implement CSP headers

### Deployment
- [ ] Enable Azure DDoS Protection
- [ ] Configure Web Application Firewall (WAF)
- [ ] Enable Azure AD authentication
- [ ] Set up Azure Private Link
- [ ] Enable diagnostic logging
- [ ] Configure audit log retention

### Runtime
- [ ] Monitor for suspicious activity
- [ ] Set up alerts for failed auth attempts
- [ ] Regular security scanning
- [ ] Review audit logs weekly
- [ ] Test incident response plan
- [ ] Update dependencies monthly

## Incident Response

### Security Incident Procedure

1. **Detection**: Monitor alerts from Azure Security Center
2. **Containment**: Disable affected user/tenant immediately
3. **Investigation**: Review audit logs and diagnostics
4. **Remediation**: Patch vulnerability, rotate credentials
5. **Recovery**: Restore service, verify security
6. **Post-mortem**: Document incident, update procedures

### Contact Information

**Security Team**: security@castiel.com  
**Emergency**: +1-XXX-XXX-XXXX  
**Azure Support**: Open ticket in Azure Portal
