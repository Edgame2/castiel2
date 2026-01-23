# Secret Management Module Specification - Part 2

**Continued from Part 1**

---

## Table of Contents (Part 2)

8. [Lifecycle Management](#8-lifecycle-management)
9. [Integration Pattern](#9-integration-pattern)
10. [Audit & Compliance](#10-audit--compliance)
11. [Import/Export & Migration](#11-importexport--migration)
12. [API Endpoints](#12-api-endpoints)
13. [UI Views](#13-ui-views)
14. [Encryption & Security](#14-encryption--security)
15. [Implementation Guidelines](#15-implementation-guidelines)

---

## 8. Lifecycle Management

### 8.1 Expiration Management

```typescript
interface ExpirationConfig {
  enabled: boolean;
  expiresAt: Date;
  
  // Notifications
  notifyBeforeDays: number[];  // e.g., [30, 14, 7, 1]
  notificationRecipients: string[];  // User IDs or email addresses
}

class LifecycleManager {
  /**
   * Check for expiring secrets and send notifications
   * Run as scheduled job
   */
  async checkExpirations(): Promise<void> {
    const now = new Date();
    
    // Find secrets expiring within notification windows
    for (const days of [30, 14, 7, 1]) {
      const threshold = addDays(now, days);
      
      const expiringSecrets = await prisma.secret.findMany({
        where: {
          expiresAt: {
            gte: now,
            lte: threshold
          },
          deletedAt: null
        },
        include: {
          createdBy: true,
          organization: true
        }
      });
      
      for (const secret of expiringSecrets) {
        await this.sendExpirationNotification(secret, days);
        
        await this.auditLogger.log({
          eventType: 'SECRET_EXPIRING_SOON',
          secretId: secret.id,
          details: { daysUntilExpiration: days }
        });
      }
    }
    
    // Mark expired secrets
    await prisma.secret.updateMany({
      where: {
        expiresAt: { lt: now },
        deletedAt: null
      },
      data: {
        // Could add an 'expired' status field
      }
    });
  }
}
```

### 8.2 Automatic Rotation

```typescript
interface RotationConfig {
  enabled: boolean;
  intervalDays: number;
  
  // Rotation strategy
  strategy: RotationStrategy;
  
  // For automatic rotation
  rotationHandler?: string;  // Reference to rotation handler
}

type RotationStrategy = 
  | 'MANUAL'              // User must rotate manually
  | 'NOTIFY_ONLY'         // Notify when rotation due, user rotates
  | 'AUTOMATIC';          // Automatic rotation via handler

interface RotationHandler {
  // Called to generate new secret value
  rotate(currentValue: AnySecretValue): Promise<AnySecretValue>;
  
  // Called after rotation to update external systems
  postRotate?(newValue: AnySecretValue, oldValue: AnySecretValue): Promise<void>;
}

class RotationScheduler {
  /**
   * Check for secrets needing rotation
   * Run as scheduled job
   */
  async checkRotations(): Promise<void> {
    const now = new Date();
    
    const secretsNeedingRotation = await prisma.secret.findMany({
      where: {
        rotationEnabled: true,
        nextRotationAt: { lte: now },
        deletedAt: null
      }
    });
    
    for (const secret of secretsNeedingRotation) {
      try {
        if (secret.rotationStrategy === 'AUTOMATIC') {
          await this.performAutomaticRotation(secret);
        } else {
          await this.sendRotationReminder(secret);
        }
      } catch (error) {
        await this.handleRotationError(secret, error);
      }
    }
  }
  
  async rotateSecret(secretId: string, newValue: AnySecretValue): Promise<void> {
    const secret = await prisma.secret.findUnique({
      where: { id: secretId }
    });
    
    // 1. Create new version
    const newVersion = secret.currentVersion + 1;
    
    await prisma.$transaction(async (tx) => {
      // Store new version
      await tx.secretVersion.create({
        data: {
          secretId: secret.id,
          version: newVersion,
          encryptedValue: await this.encrypt(newValue),
          changeReason: 'Rotation'
        }
      });
      
      // Update secret
      await tx.secret.update({
        where: { id: secretId },
        data: {
          currentVersion: newVersion,
          lastRotatedAt: new Date(),
          nextRotationAt: addDays(new Date(), secret.rotationIntervalDays)
        }
      });
      
      // Mark old version as inactive (after grace period)
      // This allows existing sessions to continue working briefly
    });
    
    // Audit
    await this.auditLogger.log({
      eventType: 'SECRET_ROTATED',
      secretId,
      details: { newVersion }
    });
  }
}
```

### 8.3 Version Management

```typescript
class VersionManager {
  /**
   * Get version history for a secret
   */
  async getVersionHistory(secretId: string): Promise<SecretVersionInfo[]> {
    const versions = await prisma.secretVersion.findMany({
      where: { secretId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        isActive: true,
        changeReason: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true }
        }
      }
    });
    
    return versions.map(v => ({
      version: v.version,
      isActive: v.isActive,
      changeReason: v.changeReason,
      createdAt: v.createdAt,
      createdBy: v.createdBy
    }));
  }
  
  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(secretId: string, version: number): Promise<void> {
    const targetVersion = await prisma.secretVersion.findUnique({
      where: {
        secretId_version: { secretId, version }
      }
    });
    
    if (!targetVersion) {
      throw new NotFoundError(`Version ${version} not found`);
    }
    
    // Create new version with rolled-back value
    const currentSecret = await prisma.secret.findUnique({
      where: { id: secretId }
    });
    
    const newVersion = currentSecret.currentVersion + 1;
    
    await prisma.$transaction([
      prisma.secretVersion.create({
        data: {
          secretId,
          version: newVersion,
          encryptedValue: targetVersion.encryptedValue,
          encryptionKeyId: targetVersion.encryptionKeyId,
          changeReason: `Rollback to version ${version}`
        }
      }),
      prisma.secret.update({
        where: { id: secretId },
        data: { currentVersion: newVersion }
      })
    ]);
  }
  
  /**
   * Get retention policy - how many versions to keep
   */
  async cleanupOldVersions(secretId: string, keepVersions: number = 10): Promise<void> {
    const versions = await prisma.secretVersion.findMany({
      where: { secretId },
      orderBy: { version: 'desc' },
      skip: keepVersions
    });
    
    // Permanently delete old versions
    for (const version of versions) {
      await prisma.secretVersion.delete({
        where: { id: version.id }
      });
    }
  }
}
```

### 8.4 Soft Delete & Recovery

```typescript
class SoftDeleteManager {
  private readonly RECOVERY_PERIOD_DAYS = 30;
  
  /**
   * Soft delete a secret
   */
  async softDelete(secretId: string, userId: string): Promise<void> {
    const recoveryDeadline = addDays(new Date(), this.RECOVERY_PERIOD_DAYS);
    
    await prisma.secret.update({
      where: { id: secretId },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
        recoveryDeadline
      }
    });
    
    await this.auditLogger.log({
      eventType: 'SECRET_DELETED',
      secretId,
      actorId: userId,
      details: { recoveryDeadline }
    });
  }
  
  /**
   * Recover a soft-deleted secret
   */
  async recover(secretId: string, userId: string): Promise<void> {
    const secret = await prisma.secret.findUnique({
      where: { id: secretId }
    });
    
    if (!secret.deletedAt) {
      throw new BadRequestError('Secret is not deleted');
    }
    
    if (new Date() > secret.recoveryDeadline) {
      throw new BadRequestError('Recovery period has expired');
    }
    
    await prisma.secret.update({
      where: { id: secretId },
      data: {
        deletedAt: null,
        deletedById: null,
        recoveryDeadline: null
      }
    });
    
    await this.auditLogger.log({
      eventType: 'SECRET_RESTORED',
      secretId,
      actorId: userId
    });
  }
  
  /**
   * Permanently delete expired secrets
   * Run as scheduled job
   */
  async purgeExpiredSecrets(): Promise<void> {
    const expiredSecrets = await prisma.secret.findMany({
      where: {
        deletedAt: { not: null },
        recoveryDeadline: { lt: new Date() }
      }
    });
    
    for (const secret of expiredSecrets) {
      // Delete all versions
      await prisma.secretVersion.deleteMany({
        where: { secretId: secret.id }
      });
      
      // Delete the secret
      await prisma.secret.delete({
        where: { id: secret.id }
      });
      
      await this.auditLogger.log({
        eventType: 'SECRET_PERMANENTLY_DELETED',
        secretId: secret.id,
        actorId: 'SYSTEM'
      });
    }
  }
}
```

---

## 9. Integration Pattern

### 9.1 Secret Service API (Recommended Pattern)

```typescript
/**
 * SecretService - Main API for modules to consume secrets
 * 
 * BEST PRACTICES:
 * 1. Always use SecretService to retrieve secrets - never access storage directly
 * 2. Don't cache secret values in your module - use SecretService caching
 * 3. Use secret references (IDs) in configuration, resolve at runtime
 * 4. Handle SecretNotFoundError and SecretExpiredError gracefully
 * 5. Log secret usage through the provided tracking mechanism
 */
interface ISecretService {
  // ============================================================
  // SECRET RETRIEVAL
  // ============================================================
  
  /**
   * Get a secret value by ID
   * @param secretId - The secret's unique identifier
   * @param context - Execution context for access control
   * @returns Decrypted secret value
   * @throws SecretNotFoundError, AccessDeniedError, SecretExpiredError
   */
  getSecret(secretId: string, context: SecretContext): Promise<AnySecretValue>;
  
  /**
   * Get multiple secrets at once (batch operation)
   * More efficient than multiple getSecret calls
   */
  getSecrets(secretIds: string[], context: SecretContext): Promise<Map<string, AnySecretValue>>;
  
  /**
   * Get a secret, returning null if not found (no exception)
   */
  getSecretOrNull(secretId: string, context: SecretContext): Promise<AnySecretValue | null>;
  
  // ============================================================
  // SECRET DISCOVERY
  // ============================================================
  
  /**
   * List accessible secrets (metadata only, no values)
   */
  listSecrets(params: ListSecretsParams, context: SecretContext): Promise<SecretMetadata[]>;
  
  /**
   * Find secrets by criteria
   */
  findSecrets(criteria: SecretSearchCriteria, context: SecretContext): Promise<SecretMetadata[]>;
  
  // ============================================================
  // SECRET MANAGEMENT (Admin operations)
  // ============================================================
  
  createSecret(params: CreateSecretParams, context: SecretContext): Promise<Secret>;
  updateSecret(secretId: string, params: UpdateSecretParams, context: SecretContext): Promise<Secret>;
  deleteSecret(secretId: string, context: SecretContext): Promise<void>;
  rotateSecret(secretId: string, newValue: AnySecretValue, context: SecretContext): Promise<void>;
  
  // ============================================================
  // ACCESS MANAGEMENT
  // ============================================================
  
  grantAccess(params: GrantAccessParams, context: SecretContext): Promise<SecretAccessGrant>;
  revokeAccess(grantId: string, context: SecretContext): Promise<void>;
  listAccessGrants(secretId: string, context: SecretContext): Promise<SecretAccessGrant[]>;
}

interface SecretContext {
  userId: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  
  // Consumer identification (for tracking)
  consumerModule: string;       // e.g., "mcp-server", "llm-model"
  consumerResourceId?: string;  // e.g., specific MCP server ID
}
```

### 9.2 Consumer Module Integration Example

```typescript
// Example: MCP Server Module using Secret Management

class MCPServerService {
  constructor(private secretService: ISecretService) {}
  
  async executeToolWithAuth(
    serverId: string,
    toolName: string,
    params: Record<string, unknown>,
    executionContext: ExecutionContext
  ): Promise<ToolResult> {
    // 1. Get server configuration
    const server = await this.getServer(serverId);
    
    // 2. Resolve authentication secret (if configured)
    let authCredentials: AuthCredentials | undefined;
    
    if (server.authSecretId) {
      const secretContext: SecretContext = {
        userId: executionContext.userId,
        organizationId: executionContext.organizationId,
        consumerModule: 'mcp-server',
        consumerResourceId: serverId
      };
      
      try {
        const secretValue = await this.secretService.getSecret(
          server.authSecretId,
          secretContext
        );
        
        authCredentials = this.parseAuthCredentials(secretValue);
      } catch (error) {
        if (error instanceof SecretNotFoundError) {
          throw new MCPError('Authentication secret not found', 'AUTH_SECRET_MISSING');
        }
        if (error instanceof SecretExpiredError) {
          throw new MCPError('Authentication secret has expired', 'AUTH_SECRET_EXPIRED');
        }
        throw error;
      }
    }
    
    // 3. Execute tool with credentials
    return this.transport.executeTool(server, toolName, params, authCredentials);
  }
}

// Example: LLM Model Integration

class LLMModelService {
  constructor(private secretService: ISecretService) {}
  
  async getModelClient(
    modelConfig: LLMModelConfig,
    context: ExecutionContext
  ): Promise<LLMClient> {
    const secretContext: SecretContext = {
      userId: context.userId,
      organizationId: context.organizationId,
      consumerModule: 'llm-model',
      consumerResourceId: modelConfig.id
    };
    
    // Get API key from Secret Management
    const apiKeySecret = await this.secretService.getSecret(
      modelConfig.apiKeySecretId,
      secretContext
    ) as ApiKeySecret;
    
    // Create client with resolved API key
    return new OpenAIClient({
      apiKey: apiKeySecret.key,
      baseUrl: modelConfig.baseUrl
    });
  }
}
```

### 9.3 Secret Reference Pattern

```typescript
/**
 * Instead of storing secret values in configuration,
 * store references that are resolved at runtime
 */
interface SecretReference {
  type: 'SECRET_REF';
  secretId: string;
}

// Example: MCP Server configuration with secret reference
interface MCPServerConfig {
  id: string;
  name: string;
  endpoint: string;
  
  // Instead of storing the API key directly:
  // apiKey: string;  // ❌ Don't do this
  
  // Store a reference to the secret:
  authSecretId?: string;  // ✅ Reference to Secret Management
}

// Example: Environment configuration with secret references
interface EnvironmentConfig {
  id: string;
  name: string;
  variables: Record<string, string | SecretReference>;
}

// Resolution at runtime
class ConfigResolver {
  constructor(private secretService: ISecretService) {}
  
  async resolveConfig(
    config: EnvironmentConfig,
    context: SecretContext
  ): Promise<Record<string, string>> {
    const resolved: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(config.variables)) {
      if (typeof value === 'string') {
        resolved[key] = value;
      } else if (value.type === 'SECRET_REF') {
        const secret = await this.secretService.getSecret(
          value.secretId,
          context
        );
        resolved[key] = this.extractValue(secret);
      }
    }
    
    return resolved;
  }
}
```

### 9.4 Caching Strategy

```typescript
interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;           // Time-to-live
  maxSize: number;              // Max cached secrets
  refreshAhead: boolean;        // Refresh before expiry
  refreshAheadPercent: number;  // e.g., 75 = refresh at 75% of TTL
}

class SecretCache {
  private cache: LRUCache<string, CachedSecret>;
  
  constructor(private config: CacheConfig) {
    this.cache = new LRUCache({
      max: config.maxSize,
      ttl: config.ttlSeconds * 1000
    });
  }
  
  async getOrFetch(
    secretId: string,
    fetcher: () => Promise<AnySecretValue>
  ): Promise<AnySecretValue> {
    const cached = this.cache.get(secretId);
    
    if (cached) {
      // Check if we should refresh ahead
      if (this.config.refreshAhead && this.shouldRefreshAhead(cached)) {
        // Refresh in background, return cached value
        this.refreshInBackground(secretId, fetcher);
      }
      return cached.value;
    }
    
    // Fetch and cache
    const value = await fetcher();
    this.cache.set(secretId, {
      value,
      fetchedAt: Date.now()
    });
    
    return value;
  }
  
  invalidate(secretId: string): void {
    this.cache.delete(secretId);
  }
  
  invalidateAll(): void {
    this.cache.clear();
  }
}
```

---

## 10. Audit & Compliance

### 10.1 Audit Logging Implementation

```typescript
class SecretAuditLogger {
  /**
   * Log a secret operation
   * Secret values are NEVER logged
   */
  async log(params: AuditLogParams): Promise<void> {
    // Sanitize details to ensure no secret values
    const sanitizedDetails = this.sanitizeDetails(params.details);
    
    await prisma.secretAuditLog.create({
      data: {
        eventType: params.eventType,
        eventCategory: this.categorizeEvent(params.eventType),
        actorType: params.actorType || 'USER',
        actorId: params.actorId,
        actorName: params.actorName,
        organizationId: params.organizationId,
        teamId: params.teamId,
        projectId: params.projectId,
        secretId: params.secretId,
        secretName: params.secretName,
        secretScope: params.secretScope,
        action: params.action || params.eventType,
        details: sanitizedDetails,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
        outcome: params.outcome || 'SUCCESS',
        errorMessage: params.errorMessage
      }
    });
  }
  
  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(details || {})) {
      // Never log these fields
      const sensitiveFields = ['value', 'password', 'secret', 'key', 'token', 'credential'];
      
      if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

interface AuditLogParams {
  eventType: SecretAuditEventType;
  actorType?: ActorType;
  actorId: string;
  actorName?: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  secretId?: string;
  secretName?: string;
  secretScope?: SecretScope;
  action?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  outcome?: AuditOutcome;
  errorMessage?: string;
}
```

### 10.2 Compliance Reports

```typescript
interface ComplianceReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  
  // Summary
  summary: {
    totalSecrets: number;
    activeSecrets: number;
    expiredSecrets: number;
    expiringWithin30Days: number;
    rotationsDue: number;
    deletedSecrets: number;
  };
  
  // Access report
  accessReport: {
    totalAccesses: number;
    uniqueUsers: number;
    accessesByScope: Record<SecretScope, number>;
    accessesByModule: Record<string, number>;
    deniedAccesses: number;
  };
  
  // Security findings
  findings: ComplianceFinding[];
}

interface ComplianceFinding {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  description: string;
  affectedSecrets: string[];
  recommendation: string;
}

class ComplianceReporter {
  async generateReport(
    organizationId: string,
    period: { start: Date; end: Date }
  ): Promise<ComplianceReport> {
    // Gather data
    const secrets = await this.getSecretStats(organizationId, period);
    const accessLogs = await this.getAccessStats(organizationId, period);
    const findings = await this.analyzeCompliance(organizationId, period);
    
    return {
      generatedAt: new Date(),
      period,
      summary: secrets,
      accessReport: accessLogs,
      findings
    };
  }
  
  private async analyzeCompliance(
    organizationId: string,
    period: { start: Date; end: Date }
  ): Promise<ComplianceFinding[]> {
    const findings: ComplianceFinding[] = [];
    
    // Check for secrets without expiration
    const noExpiration = await prisma.secret.findMany({
      where: {
        organizationId,
        expiresAt: null,
        deletedAt: null
      }
    });
    
    if (noExpiration.length > 0) {
      findings.push({
        severity: 'MEDIUM',
        category: 'Lifecycle',
        description: `${noExpiration.length} secrets have no expiration date set`,
        affectedSecrets: noExpiration.map(s => s.id),
        recommendation: 'Set expiration dates for all secrets per security policy'
      });
    }
    
    // Check for secrets not rotated in 90+ days
    const staleSecrets = await prisma.secret.findMany({
      where: {
        organizationId,
        rotationEnabled: true,
        lastRotatedAt: { lt: subDays(new Date(), 90) },
        deletedAt: null
      }
    });
    
    if (staleSecrets.length > 0) {
      findings.push({
        severity: 'HIGH',
        category: 'Rotation',
        description: `${staleSecrets.length} secrets have not been rotated in 90+ days`,
        affectedSecrets: staleSecrets.map(s => s.id),
        recommendation: 'Rotate secrets according to rotation policy'
      });
    }
    
    // More compliance checks...
    
    return findings;
  }
}
```

---

## 11. Import/Export & Migration

### 11.1 Import Service

```typescript
interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

interface ImportError {
  index: number;
  name: string;
  error: string;
}

class ImportService {
  /**
   * Import secrets from .env file content
   */
  async importFromEnvFile(
    content: string,
    options: EnvImportOptions,
    context: SecretContext
  ): Promise<ImportResult> {
    const parsed = this.parseEnvFile(content);
    return this.importSecrets(parsed, options, context);
  }
  
  /**
   * Import secrets from JSON
   */
  async importFromJson(
    data: ImportSecretData[],
    options: ImportOptions,
    context: SecretContext
  ): Promise<ImportResult> {
    const result: ImportResult = {
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      try {
        // Check if secret exists
        const existing = await this.findExisting(item.name, context);
        
        if (existing && !options.overwrite) {
          result.skipped++;
          continue;
        }
        
        if (existing && options.overwrite) {
          await this.secretService.updateSecret(
            existing.id,
            { value: item.value },
            context
          );
        } else {
          await this.secretService.createSecret({
            name: item.name,
            type: item.type || 'GENERIC',
            value: item.value,
            scope: options.targetScope,
            description: item.description,
            tags: item.tags
          }, context);
        }
        
        result.imported++;
      } catch (error) {
        result.errors.push({
          index: i,
          name: item.name,
          error: error.message
        });
      }
    }
    
    // Audit log
    await this.auditLogger.log({
      eventType: 'SECRETS_IMPORTED',
      actorId: context.userId,
      details: {
        total: result.total,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length
      }
    });
    
    return result;
  }
  
  private parseEnvFile(content: string): ImportSecretData[] {
    const lines = content.split('\n');
    const secrets: ImportSecretData[] = [];
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) continue;
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, name, value] = match;
        secrets.push({
          name: name.trim(),
          value: { type: 'API_KEY', key: value.trim() },
          type: 'API_KEY'
        });
      }
    }
    
    return secrets;
  }
}

interface EnvImportOptions extends ImportOptions {
  prefix?: string;              // Add prefix to names
  stripPrefix?: string;         // Remove prefix from names
}

interface ImportOptions {
  targetScope: SecretScope;
  overwrite: boolean;
  dryRun?: boolean;
}
```

### 11.2 Export Service

```typescript
class ExportService {
  /**
   * Export secrets as JSON (metadata only, values optional)
   */
  async exportToJson(
    params: ExportParams,
    context: SecretContext
  ): Promise<ExportResult> {
    // Only admins can export
    await this.validateExportPermission(context);
    
    const secrets = await this.secretService.listSecrets({
      scope: params.scope,
      organizationId: context.organizationId
    }, context);
    
    const exported: ExportedSecret[] = [];
    
    for (const secret of secrets) {
      const exportedSecret: ExportedSecret = {
        name: secret.name,
        type: secret.type,
        description: secret.description,
        tags: secret.tags,
        scope: secret.scope
      };
      
      // Only include values if explicitly requested and permitted
      if (params.includeValues) {
        const value = await this.secretService.getSecret(secret.id, context);
        exportedSecret.value = value;
      }
      
      exported.push(exportedSecret);
    }
    
    // Audit log
    await this.auditLogger.log({
      eventType: 'SECRETS_EXPORTED',
      actorId: context.userId,
      details: {
        count: exported.length,
        includeValues: params.includeValues
      }
    });
    
    return {
      exportedAt: new Date(),
      secrets: exported
    };
  }
  
  /**
   * Export as .env file format
   */
  async exportToEnvFormat(
    params: ExportParams,
    context: SecretContext
  ): Promise<string> {
    const result = await this.exportToJson(
      { ...params, includeValues: true },
      context
    );
    
    const lines: string[] = [
      `# Exported from Coder IDE Secret Management`,
      `# Date: ${result.exportedAt.toISOString()}`,
      ''
    ];
    
    for (const secret of result.secrets) {
      if (secret.type === 'API_KEY' && secret.value) {
        lines.push(`${secret.name}=${(secret.value as ApiKeySecret).key}`);
      }
    }
    
    return lines.join('\n');
  }
}
```

### 11.3 Migration Service

```typescript
interface MigrationPlan {
  sourceBackend: StorageBackend;
  targetBackend: StorageBackend;
  secretCount: number;
  estimatedDuration: number;
}

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  errors: MigrationError[];
  duration: number;
}

class MigrationService {
  /**
   * Plan a migration between backends
   */
  async planMigration(
    sourceVaultId: string,
    targetVaultId: string
  ): Promise<MigrationPlan> {
    const sourceVault = await this.getVault(sourceVaultId);
    const targetVault = await this.getVault(targetVaultId);
    
    const secretCount = await prisma.secret.count({
      where: {
        storageBackend: sourceVault.backend,
        deletedAt: null
      }
    });
    
    return {
      sourceBackend: sourceVault.backend,
      targetBackend: targetVault.backend,
      secretCount,
      estimatedDuration: secretCount * 100  // ~100ms per secret
    };
  }
  
  /**
   * Execute migration
   */
  async executeMigration(
    sourceVaultId: string,
    targetVaultId: string,
    options: MigrationOptions
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      total: 0,
      migrated: 0,
      failed: 0,
      errors: [],
      duration: 0
    };
    
    const sourceBackend = await this.getBackend(sourceVaultId);
    const targetBackend = await this.getBackend(targetVaultId);
    
    const secrets = await prisma.secret.findMany({
      where: {
        storageBackend: sourceBackend.type,
        deletedAt: null
      }
    });
    
    result.total = secrets.length;
    
    for (const secret of secrets) {
      try {
        // 1. Retrieve from source
        const value = await sourceBackend.retrieveSecret({
          secretRef: secret.vaultSecretId || secret.id
        });
        
        // 2. Store in target
        const targetResult = await targetBackend.storeSecret({
          name: secret.name,
          value: value.value,
          metadata: secret.metadata as Record<string, string>,
          expiresAt: secret.expiresAt
        });
        
        // 3. Update database record
        await prisma.secret.update({
          where: { id: secret.id },
          data: {
            storageBackend: targetBackend.type,
            vaultSecretId: targetResult.secretRef,
            encryptedValue: null  // Clear local encryption if moving to vault
          }
        });
        
        // 4. Optionally delete from source
        if (options.deleteFromSource) {
          await sourceBackend.deleteSecret({
            secretRef: secret.vaultSecretId || secret.id
          });
        }
        
        result.migrated++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          secretId: secret.id,
          secretName: secret.name,
          error: error.message
        });
        
        if (!options.continueOnError) {
          break;
        }
      }
    }
    
    result.duration = Date.now() - startTime;
    
    // Audit log
    await this.auditLogger.log({
      eventType: 'SECRETS_MIGRATED',
      details: result
    });
    
    return result;
  }
}
```

---

## 12. API Endpoints

### 12.1 Secret CRUD Endpoints

```typescript
// ============================================================
// SECRET MANAGEMENT
// ============================================================

// POST /api/secrets
// Create a new secret
interface CreateSecretRequest {
  name: string;
  description?: string;
  type: SecretType;
  value: AnySecretValue;
  scope: SecretScope;
  
  // Scope target (based on scope)
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  
  // Lifecycle
  expiresAt?: string;         // ISO date
  rotationEnabled?: boolean;
  rotationIntervalDays?: number;
  
  // Metadata
  tags?: string[];
  metadata?: Record<string, string>;
  
  // Storage preference
  storageBackend?: StorageBackend;
}

// GET /api/secrets
// List secrets (metadata only)
interface ListSecretsParams {
  scope?: SecretScope;
  type?: SecretType;
  tags?: string[];
  search?: string;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

// GET /api/secrets/:id
// Get secret metadata (not value)

// GET /api/secrets/:id/value
// Get secret value (requires READ permission)

// PUT /api/secrets/:id
// Update secret metadata

// PUT /api/secrets/:id/value
// Update secret value (creates new version)
interface UpdateSecretValueRequest {
  value: AnySecretValue;
  changeReason?: string;
}

// DELETE /api/secrets/:id
// Soft delete secret

// POST /api/secrets/:id/restore
// Restore soft-deleted secret

// DELETE /api/secrets/:id/permanent
// Permanently delete secret

// ============================================================
// ROTATION & VERSIONING
// ============================================================

// POST /api/secrets/:id/rotate
// Rotate secret
interface RotateSecretRequest {
  newValue: AnySecretValue;
}

// GET /api/secrets/:id/versions
// Get version history

// GET /api/secrets/:id/versions/:version
// Get specific version value

// POST /api/secrets/:id/rollback
// Rollback to previous version
interface RollbackRequest {
  version: number;
}

// ============================================================
// ACCESS MANAGEMENT
// ============================================================

// GET /api/secrets/:id/access
// List access grants

// POST /api/secrets/:id/access
// Grant access
interface GrantAccessRequest {
  granteeType: 'USER' | 'TEAM' | 'ROLE';
  granteeId: string;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canGrant: boolean;
  expiresAt?: string;
}

// DELETE /api/secrets/:id/access/:grantId
// Revoke access

// ============================================================
// VAULT CONFIGURATION
// ============================================================

// GET /api/vaults
// List vault configurations

// POST /api/vaults
// Configure a vault
interface ConfigureVaultRequest {
  name: string;
  description?: string;
  backend: StorageBackend;
  scope: VaultScope;
  config: VaultConfig;        // Backend-specific config
  isDefault?: boolean;
}

// PUT /api/vaults/:id
// Update vault configuration

// DELETE /api/vaults/:id
// Delete vault configuration

// POST /api/vaults/:id/health
// Check vault health

// ============================================================
// IMPORT/EXPORT
// ============================================================

// POST /api/secrets/import/env
// Import from .env file
interface ImportEnvRequest {
  content: string;            // .env file content
  targetScope: SecretScope;
  overwrite?: boolean;
  prefix?: string;
}

// POST /api/secrets/import/json
// Import from JSON
interface ImportJsonRequest {
  secrets: ImportSecretData[];
  targetScope: SecretScope;
  overwrite?: boolean;
}

// GET /api/secrets/export
// Export secrets
interface ExportParams {
  scope?: SecretScope;
  format: 'json' | 'env';
  includeValues?: boolean;    // Requires admin permission
}

// POST /api/secrets/migrate
// Migrate between backends
interface MigrateRequest {
  sourceVaultId: string;
  targetVaultId: string;
  deleteFromSource?: boolean;
  continueOnError?: boolean;
}

// ============================================================
// AUDIT
// ============================================================

// GET /api/secrets/audit
// List audit logs
interface AuditLogsParams {
  secretId?: string;
  eventType?: SecretAuditEventType[];
  actorId?: string;
  outcome?: AuditOutcome[];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// GET /api/secrets/audit/:id
// Get audit log details

// GET /api/secrets/compliance/report
// Generate compliance report
interface ComplianceReportParams {
  startDate: string;
  endDate: string;
  format?: 'json' | 'pdf';
}
```

### 12.2 Endpoint Permission Matrix

| Endpoint | Super Admin | Org Admin | Team Lead | Project Admin | User |
|----------|-------------|-----------|-----------|---------------|------|
| `POST /api/secrets` (Global) | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/secrets` (Org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/secrets` (Team) | ✅ | ✅ | ✅ | ❌ | ❌ |
| `POST /api/secrets` (Project) | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /api/secrets` (User) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/secrets` | ✅ (all) | ✅ (org) | ✅ (team) | ✅ (proj) | ✅ (user) |
| `GET /api/secrets/:id/value` | ✅ | ✅ | Per grant | Per grant | Per grant |
| `PUT /api/secrets/:id` | ✅ | ✅ (org) | ✅ (team) | ✅ (proj) | ✅ (own) |
| `DELETE /api/secrets/:id` | ✅ | ✅ (org) | ✅ (team) | ✅ (proj) | ✅ (own) |
| `POST /api/vaults` (Global) | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/vaults` (Org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/secrets/import/*` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /api/secrets/export` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `GET /api/secrets/audit` | ✅ | ✅ (org) | ❌ | ❌ | ❌ |

---

## 13. UI Views

### 13.1 View Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Secret Management UI                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     Super Admin Views                                   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │   Global     │  │    Vault     │  │   Platform   │  │  Platform  │ │ │
│  │  │   Secrets    │  │   Config     │  │   Audit      │  │ Compliance │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    Org Admin Views                                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │Organization  │  │    Vault     │  │   Import/    │  │   Audit    │ │ │
│  │  │  Secrets     │  │   Config     │  │   Export     │  │    Logs    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     User Views                                          │ │
│  │  ┌──────────────┐  ┌──────────────┐                                   │ │
│  │  │   Personal   │  │  Accessible  │                                   │ │
│  │  │   Secrets    │  │   Secrets    │                                   │ │
│  │  └──────────────┘  └──────────────┘                                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Secret Manager View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Secret Management                                         [+ Create Secret] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Scope: [Organization ▼]  Type: [All ▼]  Search: [________________]         │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  🔑 GITHUB_TOKEN                                       API Key          │ │
│ │     GitHub Personal Access Token                                        │ │
│ │     Scope: Organization │ Expires: 2026-03-15 │ Last rotated: 30d ago  │ │
│ │     Tags: [github] [api]                                               │ │
│ │     [View] [Edit] [Rotate] [Delete]                                    │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │  🔐 AZURE_SERVICE_PRINCIPAL                           JSON Credential   │ │
│ │     Azure Service Principal credentials                                 │ │
│ │     Scope: Organization │ Expires: Never │ Last rotated: 90d ago ⚠️    │ │
│ │     Tags: [azure] [cloud]                                              │ │
│ │     [View] [Edit] [Rotate] [Delete]                                    │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │  🗄️ DATABASE_CONNECTION                              Connection String  │ │
│ │     Production database connection                                      │ │
│ │     Scope: Project │ Expires: 2026-06-01                               │ │
│ │     Tags: [database] [production]                                      │ │
│ │     [View] [Edit] [Rotate] [Delete]                                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                              [1] [2] [3] ... [Next →]                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.3 Create Secret Dialog

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Create Secret                                                         [✕]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Name*                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ OPENAI_API_KEY                                                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Description                                                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ OpenAI API key for LLM integration                                      │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Type*                              Scope*                                   │
│ ┌──────────────────────────┐      ┌──────────────────────────┐             │
│ │ API Key              ▼   │      │ Organization         ▼   │             │
│ └──────────────────────────┘      └──────────────────────────┘             │
│                                                                              │
│ Value*                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ sk-••••••••••••••••••••••••••••••••••                            [👁]  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─ Lifecycle ────────────────────────────────────────────────────────────┐  │
│ │                                                                         │  │
│ │ Expires:  ○ Never  ● On date: [2026-06-01    📅]                       │  │
│ │                                                                         │  │
│ │ Rotation: [✓] Enable automatic rotation reminder                        │  │
│ │           Interval: [90] days                                          │  │
│ │                                                                         │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ Tags                                                                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ [openai ✕] [llm ✕] [api ✕]  [+ Add tag]                                │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                              [Cancel]  [Create Secret]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.4 Vault Configuration View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Vault Configuration                                      [+ Add Vault]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🏢 Azure Key Vault (Default)                            ✅ Healthy      │ │
│ │    https://acme-prod.vault.azure.net                                    │ │
│ │    Scope: Organization │ Secrets: 45 │ Last check: 2 min ago           │ │
│ │    [Edit] [Test Connection] [Set as Default]                           │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 🔒 Local Encrypted Storage                              ✅ Healthy      │ │
│ │    Local development vault                                              │ │
│ │    Scope: Organization │ Secrets: 12                                    │ │
│ │    [Edit] [Migrate to Azure →]                                         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.5 Component Structure

```
src/renderer/components/secrets/
├── index.ts
├── SecretContext.tsx                # Secret state management
│
├── manager/
│   ├── SecretManager.tsx            # Main secret management view
│   ├── SecretList.tsx               # Secret listing
│   ├── SecretCard.tsx               # Secret card component
│   ├── SecretFilters.tsx            # Filter controls
│   └── SecretSearch.tsx             # Search component
│
├── forms/
│   ├── CreateSecretDialog.tsx       # Create secret modal
│   ├── EditSecretDialog.tsx         # Edit secret modal
│   ├── SecretValueInput.tsx         # Value input with masking
│   ├── SecretTypeSelector.tsx       # Type selection
│   └── ScopeSelector.tsx            # Scope selection
│
├── detail/
│   ├── SecretDetail.tsx             # Secret detail view
│   ├── SecretMetadata.tsx           # Metadata display
│   ├── SecretVersionHistory.tsx     # Version history
│   └── SecretAccessGrants.tsx       # Access grants list
│
├── vault/
│   ├── VaultConfig.tsx              # Vault configuration view
│   ├── VaultForm.tsx                # Add/edit vault form
│   ├── VaultCard.tsx                # Vault card component
│   └── VaultHealthStatus.tsx        # Health status display
│
├── import-export/
│   ├── ImportDialog.tsx             # Import secrets modal
│   ├── ExportDialog.tsx             # Export secrets modal
│   └── MigrationWizard.tsx          # Migration wizard
│
├── audit/
│   ├── AuditLogViewer.tsx           # Audit log list
│   ├── AuditFilters.tsx             # Filter controls
│   ├── AuditDetail.tsx              # Log detail view
│   └── ComplianceReport.tsx         # Compliance report
│
└── common/
    ├── SecretTypeBadge.tsx          # Type badge
    ├── ScopeBadge.tsx               # Scope badge
    ├── ExpirationBadge.tsx          # Expiration status
    └── MaskedValue.tsx              # Masked value display
```

---

## 14. Encryption & Security

### 14.1 Encryption Standards

```typescript
// AES-256-GCM for local storage
interface EncryptionConfig {
  algorithm: 'AES-256-GCM';
  keySize: 256;               // bits
  ivSize: 12;                 // bytes (96 bits)
  tagSize: 16;                // bytes (128 bits)
  encoding: 'base64';
}

interface EncryptedData {
  ciphertext: string;         // Base64 encoded
  iv: string;                 // Base64 encoded
  tag: string;                // Base64 encoded
  keyId: string;              // Reference to encryption key
}

class AESEncryptor implements Encryptor {
  async encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedData> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128
      },
      key,
      encoded
    );
    
    // Split ciphertext and tag
    const ctArray = new Uint8Array(ciphertext);
    const tag = ctArray.slice(-16);
    const ct = ctArray.slice(0, -16);
    
    return {
      ciphertext: this.toBase64(ct),
      iv: this.toBase64(iv),
      tag: this.toBase64(tag),
      keyId: key.id
    };
  }
  
  async decrypt(encrypted: EncryptedData, key: CryptoKey): Promise<string> {
    const iv = this.fromBase64(encrypted.iv);
    const ciphertext = this.fromBase64(encrypted.ciphertext);
    const tag = this.fromBase64(encrypted.tag);
    
    // Combine ciphertext and tag for decryption
    const combined = new Uint8Array([...ciphertext, ...tag]);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128
      },
      key,
      combined
    );
    
    return new TextDecoder().decode(decrypted);
  }
}
```

### 14.2 Key Management

```typescript
interface KeyManager {
  // Get current active key for encryption
  getCurrentKey(): Promise<EncryptionKey>;
  
  // Get specific key for decryption
  getKey(keyId: string): Promise<EncryptionKey>;
  
  // Rotate to new key
  rotateKey(): Promise<EncryptionKey>;
  
  // Re-encrypt all secrets with new key
  reEncryptSecrets(): Promise<void>;
}

class LocalKeyManager implements KeyManager {
  /**
   * Master key derivation from environment
   * Master key should be stored securely (e.g., in keytar, environment variable)
   */
  private async getMasterKey(): Promise<CryptoKey> {
    const masterKeyMaterial = process.env.SECRETS_MASTER_KEY;
    
    if (!masterKeyMaterial) {
      throw new Error('SECRETS_MASTER_KEY environment variable not set');
    }
    
    // Derive key from master key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterKeyMaterial),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('coder-ide-secrets'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  async rotateKey(): Promise<EncryptionKey> {
    // 1. Generate new key
    const newKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // 2. Encrypt new key with master key
    const masterKey = await this.getMasterKey();
    const exportedKey = await crypto.subtle.exportKey('raw', newKey);
    const encryptedKey = await this.encryptor.encrypt(
      this.toBase64(new Uint8Array(exportedKey)),
      masterKey
    );
    
    // 3. Store encrypted key
    const keyRecord = await prisma.encryptionKey.create({
      data: {
        keyId: generateUUID(),
        version: await this.getNextVersion(),
        encryptedKey: JSON.stringify(encryptedKey),
        status: 'ACTIVE'
      }
    });
    
    // 4. Mark previous key as rotating
    await prisma.encryptionKey.updateMany({
      where: {
        status: 'ACTIVE',
        id: { not: keyRecord.id }
      },
      data: { status: 'ROTATING' }
    });
    
    return keyRecord;
  }
}
```

### 14.3 Security Best Practices

```typescript
/**
 * Security guidelines for Secret Management
 */

// 1. Never log secret values
function logSecretAccess(secretId: string, userId: string): void {
  // ✅ Good: Log metadata only
  logger.info('Secret accessed', { secretId, userId, timestamp: new Date() });
  
  // ❌ Bad: Never log the value
  // logger.info('Secret value:', secretValue);
}

// 2. Clear sensitive data from memory
async function useSecret<T>(
  secretId: string,
  action: (value: string) => Promise<T>
): Promise<T> {
  let secretValue: string | undefined;
  
  try {
    secretValue = await getSecretValue(secretId);
    return await action(secretValue);
  } finally {
    // Clear from memory
    if (secretValue) {
      secretValue = undefined;
    }
  }
}

// 3. Validate input to prevent injection
function validateSecretName(name: string): void {
  const validPattern = /^[a-zA-Z][a-zA-Z0-9_-]{0,254}$/;
  if (!validPattern.test(name)) {
    throw new ValidationError('Invalid secret name format');
  }
}

// 4. Rate limit secret access
const secretAccessLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 100,                    // 100 requests per minute
  message: 'Too many secret access requests'
});

// 5. Require re-authentication for sensitive operations
async function performSensitiveOperation(
  operation: () => Promise<void>,
  context: SecretContext
): Promise<void> {
  // Require recent authentication
  const lastAuth = await getLastAuthTime(context.userId);
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  if (Date.now() - lastAuth.getTime() > maxAge) {
    throw new ReauthenticationRequiredError();
  }
  
  await operation();
}
```

---

## 15. Implementation Guidelines

### 15.1 Implementation Phases

#### Phase 1: Core Infrastructure (Weeks 1-3)
- [ ] Database schema and migrations
- [ ] Local encrypted backend implementation
- [ ] Basic SecretService API
- [ ] AES-256-GCM encryption implementation
- [ ] Key management basics

#### Phase 2: Access Control & Scoping (Weeks 4-5)
- [ ] Scope resolver implementation
- [ ] Access control implementation
- [ ] Permission checking
- [ ] Access grants

#### Phase 3: Lifecycle Management (Weeks 6-7)
- [ ] Expiration tracking and notifications
- [ ] Version management
- [ ] Soft delete and recovery
- [ ] Rotation scheduling

#### Phase 4: External Vault Integration (Weeks 8-10)
- [ ] Azure Key Vault backend
- [ ] AWS Secrets Manager backend (optional)
- [ ] HashiCorp Vault backend (optional)
- [ ] GCP Secret Manager backend (optional)

#### Phase 5: Import/Export & Migration (Weeks 11-12)
- [ ] .env file import
- [ ] JSON import/export
- [ ] Backend migration service

#### Phase 6: Audit & Compliance (Weeks 13-14)
- [ ] Comprehensive audit logging
- [ ] Compliance reports
- [ ] Audit log viewer UI

#### Phase 7: UI & Polish (Weeks 15-16)
- [ ] Super Admin views
- [ ] Org Admin views
- [ ] User views
- [ ] Testing and documentation

### 15.2 Dependencies

| Dependency | Purpose |
|------------|---------|
| `@azure/keyvault-secrets` | Azure Key Vault integration |
| `@aws-sdk/client-secrets-manager` | AWS Secrets Manager integration |
| `node-vault` | HashiCorp Vault integration |
| `@google-cloud/secret-manager` | GCP Secret Manager integration |
| `keytar` | Secure local credential storage |
| `zod` | Schema validation |

### 15.3 Error Handling

```typescript
// Secret-specific error types
class SecretError extends Error {
  constructor(message: string, public code: SecretErrorCode) {
    super(message);
  }
}

enum SecretErrorCode {
  SECRET_NOT_FOUND = 'SECRET_NOT_FOUND',
  SECRET_EXPIRED = 'SECRET_EXPIRED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_SECRET_TYPE = 'INVALID_SECRET_TYPE',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  VAULT_CONNECTION_FAILED = 'VAULT_CONNECTION_FAILED',
  VAULT_NOT_CONFIGURED = 'VAULT_NOT_CONFIGURED',
  ROTATION_FAILED = 'ROTATION_FAILED',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  MIGRATION_FAILED = 'MIGRATION_FAILED'
}
```

---

## 16. Summary

The Secret Management Module provides a comprehensive, secure, and auditable system for managing secrets across the Coder IDE platform. Key highlights:

1. **Centralized Management**: Single source of truth for all secrets
2. **Multi-Backend Support**: Azure Key Vault, AWS, HashiCorp, GCP, or local storage
3. **Hierarchical Scoping**: Global, Organization, Team, Project, and User levels
4. **Strong Encryption**: AES-256-GCM for local storage
5. **Complete Lifecycle**: Expiration, rotation, versioning, and soft delete
6. **Comprehensive Audit**: Full audit trail for compliance
7. **Easy Integration**: Clean API for consumer modules

---

**Related Documents:**
- [Part 1: Core Specification](./secret-management-specification-part1.md)
- [MCP Server Module](../MCP%20Server/mcp-server-specification-part1.md)
- [Module List](../Main/module-list.md)

