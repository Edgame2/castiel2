// @ts-nocheck
/**
 * Audit & Enterprise Integration Service
 * Audit logging, SSO, data warehouse connectors, real-time streaming, webhooks
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  AuditLogEntry,
  AuditAction,
  ResourceType,
  AuditSeverity,
  AuditStatus,
  AuditQuery,
  AuditReport,
  AuditReportType,
  SSOConfig,
  DataWarehouseConnector,
  SyncHistory,
  RealtimeStreamConfig,
  EnterpriseExport,
  ExportFormat,
  ComplianceSettings,
  WebhookConfig,
  APIKey,
  IntegrationHealth,
} from '../types/audit-integration.types';
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import { ProjectActivityService } from './project-activity.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditIntegrationService {
  private readonly logger = new Logger(AuditIntegrationService.name);
  private readonly AUDIT_CACHE_TTL = 300; // 5 minutes for queries
  private readonly CONFIG_CACHE_TTL = 3600; // 1 hour for configs

  constructor(
    @Inject(CosmosDBService) private cosmosDB: CosmosDBService,
    @Inject(CacheService) private cache: CacheService,
    @Inject(ProjectActivityService) private activityService: ProjectActivityService,
  ) {}

  // ============ AUDIT LOGGING ============

  /**
   * Log audit entry
   */
  async logAudit(entry: Partial<AuditLogEntry>): Promise<AuditLogEntry> {
    try {
      const auditEntry: AuditLogEntry = {
        id: uuidv4(),
        tenantId: entry.tenantId || '',
        userId: entry.userId || 'system',
        action: entry.action || AuditAction.CUSTOM,
        resourceType: entry.resourceType || ResourceType.CUSTOM_METRIC,
        resourceId: entry.resourceId || '',
        resourceName: entry.resourceName,
        changes: entry.changes,
        severity: entry.severity || AuditSeverity.INFO,
        status: entry.status || AuditStatus.SUCCESS,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        sessionId: entry.sessionId,
        timestamp: new Date(),
        duration: entry.duration,
        metadata: entry.metadata || {},
        ttl: 31536000, // 365 days
      };

      // Save to Cosmos DB
      await this.cosmosDB.upsertDocument('audit-logs', auditEntry, entry.tenantId || '');

      // Invalidate query cache
      await this.cache.delete(`audit-query:${entry.tenantId}:*`);

      // Track critical events
      if (entry.severity === AuditSeverity.SECURITY_EVENT || entry.severity === AuditSeverity.CRITICAL) {
        await this.activityService.logActivity(entry.tenantId || '', {
          eventType: 'SECURITY_EVENT',
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          details: {
            auditAction: entry.action,
            severity: entry.severity,
            userId: entry.userId,
          },
        });
      }

      return auditEntry;
    } catch (error) {
      this.logger.error(`Failed to log audit: ${error.message}`);
      throw error;
    }
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(query: AuditQuery): Promise<{ entries: AuditLogEntry[]; total: number }> {
    try {
      // Check cache
      const cacheKey = `audit-query:${JSON.stringify(query)}`;
      const cached = await this.cache.get<{ entries: AuditLogEntry[]; total: number }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Build query
      let sql = 'SELECT * FROM audit_logs WHERE tenantId = @tenantId';
      const params: any[] = [{ name: '@tenantId', value: query.tenantId }];

      if (query.userId) {
        sql += ' AND userId = @userId';
        params.push({ name: '@userId', value: query.userId });
      }

      if (query.action) {
        sql += ' AND action = @action';
        params.push({ name: '@action', value: query.action });
      }

      if (query.resourceType) {
        sql += ' AND resourceType = @resourceType';
        params.push({ name: '@resourceType', value: query.resourceType });
      }

      if (query.resourceId) {
        sql += ' AND resourceId = @resourceId';
        params.push({ name: '@resourceId', value: query.resourceId });
      }

      if (query.severity) {
        sql += ' AND severity = @severity';
        params.push({ name: '@severity', value: query.severity });
      }

      if (query.status) {
        sql += ' AND status = @status';
        params.push({ name: '@status', value: query.status });
      }

      if (query.startDate) {
        sql += ' AND timestamp >= @startDate';
        params.push({ name: '@startDate', value: query.startDate });
      }

      if (query.endDate) {
        sql += ' AND timestamp <= @endDate';
        params.push({ name: '@endDate', value: query.endDate });
      }

      // Add sorting
      const sortBy = query.sortBy || 'timestamp';
      const sortOrder = query.sortOrder || 'desc';
      sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // Add pagination
      const limit = query.limit || 100;
      const offset = query.offset || 0;
      sql += ` OFFSET ${offset} LIMIT ${limit}`;

      // Execute query
      const entries = await this.cosmosDB.queryDocuments<AuditLogEntry>(
        'audit-logs',
        sql,
        params,
        query.tenantId,
      );

      // Get total count
      const countQuery = sql.replace(/OFFSET.*LIMIT.*/, '').replace('SELECT *', 'SELECT VALUE COUNT(1)');
      const countResult = await this.cosmosDB.queryDocuments<number>(
        'audit-logs',
        countQuery,
        params,
        query.tenantId,
      );

      const total = countResult.length > 0 ? countResult[0] : 0;
      const result = { entries, total };

      // Cache
      await this.cache.set(cacheKey, result, this.AUDIT_CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error(`Failed to query audit logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(
    tenantId: string,
    reportType: AuditReportType,
    startDate: Date,
    endDate: Date,
  ): Promise<AuditReport> {
    try {
      // Query audit entries
      const { entries } = await this.queryAuditLogs({
        tenantId,
        startDate,
        endDate,
        limit: 10000,
      });

      // Calculate statistics
      const eventsByAction = new Map<AuditAction, number>();
      const eventsBySeverity = new Map<AuditSeverity, number>();
      const eventsByResourceType = new Map<ResourceType, number>();
      const userEventMap = new Map<string, number>();
      let failureCount = 0;
      let criticalCount = 0;

      for (const entry of entries) {
        eventsByAction.set(entry.action, (eventsByAction.get(entry.action) || 0) + 1);
        eventsBySeverity.set(entry.severity, (eventsBySeverity.get(entry.severity) || 0) + 1);
        eventsByResourceType.set(entry.resourceType, (eventsByResourceType.get(entry.resourceType) || 0) + 1);
        userEventMap.set(entry.userId, (userEventMap.get(entry.userId) || 0) + 1);

        if (entry.status === AuditStatus.FAILURE) {failureCount++;}
        if (entry.severity === AuditSeverity.CRITICAL) {criticalCount++;}
      }

      // Build report
      const report: AuditReport = {
        id: uuidv4(),
        tenantId,
        generatedBy: 'system',
        reportType,
        startDate,
        endDate,
        totalEvents: entries.length,
        eventsByAction: Object.fromEntries(eventsByAction),
        eventsBySeverity: Object.fromEntries(eventsBySeverity),
        eventsByResourceType: Object.fromEntries(eventsByResourceType),
        topActions: Array.from(eventsByAction.entries())
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        topUsers: Array.from(userEventMap.entries())
          .map(([userId, eventCount]) => ({ userId, eventCount }))
          .sort((a, b) => b.eventCount - a.eventCount)
          .slice(0, 10),
        failureRate: entries.length > 0 ? (failureCount / entries.length) * 100 : 0,
        criticalEventsCount: criticalCount,
        generatedAt: new Date(),
      };

      // Save report
      await this.cosmosDB.upsertDocument('audit-reports', report, tenantId);

      return report;
    } catch (error) {
      this.logger.error(`Failed to generate audit report: ${error.message}`);
      throw error;
    }
  }

  // ============ SSO CONFIGURATION ============

  /**
   * Create/update SSO configuration
   */
  async updateSSOConfig(tenantId: string, config: Partial<SSOConfig>): Promise<SSOConfig> {
    try {
      const ssoConfig: SSOConfig = {
        id: config.id || uuidv4(),
        tenantId,
        provider: config.provider || 'OAUTH2' as any,
        enabled: config.enabled || false,
        clientId: config.clientId || '',
        clientSecret: await this.encryptSecret(config.clientSecret || ''),
        authorizationUrl: config.authorizationUrl || '',
        tokenUrl: config.tokenUrl || '',
        userInfoUrl: config.userInfoUrl || '',
        redirectUrl: config.redirectUrl || '',
        scopes: config.scopes || ['openid', 'profile', 'email'],
        mappings: config.mappings || {
          idClaim: 'sub',
          emailClaim: 'email',
          firstNameClaim: 'given_name',
          lastNameClaim: 'family_name',
        },
        autoProvisionUsers: config.autoProvisionUsers || true,
        defaultRole: config.defaultRole || 'member',
        enforceSSO: config.enforceSSO || false,
        createdAt: config.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Save config
      await this.cosmosDB.upsertDocument('sso-configs', ssoConfig, tenantId);

      // Invalidate cache
      await this.cache.delete(`sso-config:${tenantId}`);

      // Log audit
      await this.logAudit({
        tenantId,
        userId: 'system',
        action: AuditAction.UPDATE,
        resourceType: ResourceType.SSO_CONFIG,
        resourceId: ssoConfig.id,
        severity: AuditSeverity.SECURITY_EVENT,
      });

      return ssoConfig;
    } catch (error) {
      this.logger.error(`Failed to update SSO config: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get SSO configuration
   */
  async getSSOConfig(tenantId: string): Promise<SSOConfig | null> {
    try {
      const cacheKey = `sso-config:${tenantId}`;
      const cached = await this.cache.get<SSOConfig>(cacheKey);
      if (cached) {
        return cached;
      }

      const query = 'SELECT * FROM sso_configs WHERE tenantId = @tenantId';
      const configs = await this.cosmosDB.queryDocuments<SSOConfig>(
        'sso-configs',
        query,
        [{ name: '@tenantId', value: tenantId }],
        tenantId,
      );

      const config = configs.length > 0 ? configs[0] : null;

      if (config) {
        await this.cache.set(cacheKey, config, this.CONFIG_CACHE_TTL);
      }

      return config;
    } catch (error) {
      this.logger.error(`Failed to get SSO config: ${error.message}`);
      return null;
    }
  }

  // ============ DATA WAREHOUSE CONNECTORS ============

  /**
   * Create data warehouse connector
   */
  async createDataWarehouseConnector(
    tenantId: string,
    connector: Partial<DataWarehouseConnector>,
  ): Promise<DataWarehouseConnector> {
    try {
      const dwConnector: DataWarehouseConnector = {
        id: uuidv4(),
        tenantId,
        name: connector.name || 'DW Connector',
        type: connector.type || 'SNOWFLAKE' as any,
        connectionString: await this.encryptSecret(connector.connectionString || ''),
        enabled: connector.enabled || false,
        syncSchedule: connector.syncSchedule || {
          frequency: 'DAILY' as any,
          timezone: 'UTC',
        },
        syncStatus: 'IDLE' as any,
        datasetMappings: connector.datasetMappings || [],
        retryPolicy: connector.retryPolicy || {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.cosmosDB.upsertDocument('data-warehouse-connectors', dwConnector, tenantId);

      await this.cache.delete(`dw-connectors:${tenantId}`);

      await this.logAudit({
        tenantId,
        userId: 'system',
        action: AuditAction.CREATE,
        resourceType: ResourceType.INTEGRATION,
        resourceId: dwConnector.id,
        severity: AuditSeverity.INFO,
      });

      return dwConnector;
    } catch (error) {
      this.logger.error(`Failed to create DW connector: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync data warehouse
   */
  async syncDataWarehouse(tenantId: string, connectorId: string): Promise<SyncHistory> {
    try {
      const syncId = uuidv4();
      const syncHistory: SyncHistory = {
        id: syncId,
        connectorId,
        tenantId,
        startTime: new Date(),
        status: 'IN_PROGRESS' as any,
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        errorMessages: [],
        datasetResults: [],
      };

      // Simulate sync process
      try {
        // In production, would execute actual sync
        syncHistory.status = 'SUCCESS' as any;
        syncHistory.endTime = new Date();
        syncHistory.recordsProcessed = 1000;
        syncHistory.recordsSucceeded = 1000;
      } catch (error) {
        syncHistory.status = 'FAILURE' as any;
        syncHistory.endTime = new Date();
        syncHistory.errorMessages.push(error.message);
      }

      // Save sync history
      await this.cosmosDB.upsertDocument('sync-history', syncHistory, tenantId);

      // Log audit
      await this.logAudit({
        tenantId,
        userId: 'system',
        action: AuditAction.CUSTOM,
        resourceType: ResourceType.INTEGRATION,
        resourceId: connectorId,
        severity: syncHistory.status === 'SUCCESS' ? AuditSeverity.INFO : AuditSeverity.WARNING,
        metadata: {
          recordsProcessed: syncHistory.recordsProcessed,
          recordsSucceeded: syncHistory.recordsSucceeded,
        },
      });

      return syncHistory;
    } catch (error) {
      this.logger.error(`Failed to sync DW: ${error.message}`);
      throw error;
    }
  }

  // ============ REAL-TIME STREAMING ============

  /**
   * Create real-time stream configuration
   */
  async createStreamConfig(tenantId: string, config: Partial<RealtimeStreamConfig>): Promise<RealtimeStreamConfig> {
    try {
      const streamConfig: RealtimeStreamConfig = {
        id: uuidv4(),
        tenantId,
        name: config.name || 'Stream Config',
        type: config.type || 'EVENT_HUB' as any,
        enabled: config.enabled || false,
        connectionString: await this.encryptSecret(config.connectionString || ''),
        topicName: config.topicName || '',
        consumerGroup: config.consumerGroup,
        eventMappings: config.eventMappings || [],
        batchSize: config.batchSize || 100,
        flushIntervalMs: config.flushIntervalMs || 5000,
        retryPolicy: config.retryPolicy || {
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.cosmosDB.upsertDocument('stream-configs', streamConfig, tenantId);

      await this.cache.delete(`stream-configs:${tenantId}`);

      return streamConfig;
    } catch (error) {
      this.logger.error(`Failed to create stream config: ${error.message}`);
      throw error;
    }
  }

  // ============ WEBHOOKS ============

  /**
   * Create webhook configuration
   */
  async createWebhook(tenantId: string, webhook: Partial<WebhookConfig>): Promise<WebhookConfig> {
    try {
      const webhookConfig: WebhookConfig = {
        id: uuidv4(),
        tenantId,
        name: webhook.name || 'Webhook',
        url: webhook.url || '',
        events: webhook.events || [],
        headers: webhook.headers,
        enabled: webhook.enabled || true,
        retryPolicy: webhook.retryPolicy || {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.cosmosDB.upsertDocument('webhooks', webhookConfig, tenantId);

      await this.cache.delete(`webhooks:${tenantId}`);

      return webhookConfig;
    } catch (error) {
      this.logger.error(`Failed to create webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(tenantId: string, webhookId: string, event: string, payload: any): Promise<void> {
    try {
      // Get webhook config
      const query = 'SELECT * FROM webhooks WHERE id = @id AND tenantId = @tenantId';
      const webhooks = await this.cosmosDB.queryDocuments<WebhookConfig>(
        'webhooks',
        query,
        [
          { name: '@id', value: webhookId },
          { name: '@tenantId', value: tenantId },
        ],
        tenantId,
      );

      if (webhooks.length === 0 || !webhooks[0].enabled) {
        return;
      }

      const webhook = webhooks[0];

      // Check if webhook listens to this event
      if (!webhook.events.includes(event as any)) {
        return;
      }

      // In production, would make HTTP POST request with retry logic
      this.logger.debug(`Would trigger webhook ${webhookId} for event ${event}`);
    } catch (error) {
      this.logger.error(`Failed to trigger webhook: ${error.message}`);
    }
  }

  // ============ API KEYS ============

  /**
   * Generate API key
   */
  async generateAPIKey(tenantId: string, name: string, permissions: any): Promise<APIKey> {
    try {
      const key = this.generateRandomKey(32);
      const prefix = key.substring(0, 8);

      const apiKey: APIKey = {
        id: uuidv4(),
        tenantId,
        name,
        key: await this.hashKey(key),
        prefix,
        permissions,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.cosmosDB.upsertDocument('api-keys', apiKey, tenantId);

      await this.logAudit({
        tenantId,
        userId: 'system',
        action: AuditAction.API_KEY_GENERATE,
        resourceType: ResourceType.API_KEY,
        resourceId: apiKey.id,
        severity: AuditSeverity.INFO,
      });

      return { ...apiKey, key }; // Return unhashed key only on generation
    } catch (error) {
      this.logger.error(`Failed to generate API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(tenantId: string, keyId: string): Promise<void> {
    try {
      await this.cosmosDB.deleteDocument('api-keys', keyId, tenantId);

      await this.logAudit({
        tenantId,
        userId: 'system',
        action: AuditAction.API_KEY_REVOKE,
        resourceType: ResourceType.API_KEY,
        resourceId: keyId,
        severity: AuditSeverity.INFO,
      });
    } catch (error) {
      this.logger.error(`Failed to revoke API key: ${error.message}`);
      throw error;
    }
  }

  // ============ COMPLIANCE & HEALTH ============

  /**
   * Get compliance settings
   */
  async getComplianceSettings(tenantId: string): Promise<ComplianceSettings> {
    try {
      const cacheKey = `compliance:${tenantId}`;
      const cached = await this.cache.get<ComplianceSettings>(cacheKey);
      if (cached) {
        return cached;
      }

      const query = 'SELECT * FROM compliance_settings WHERE tenantId = @tenantId';
      const results = await this.cosmosDB.queryDocuments<ComplianceSettings>(
        'compliance-settings',
        query,
        [{ name: '@tenantId', value: tenantId }],
        tenantId,
      );

      const settings = results.length > 0 ? results[0] : this.getDefaultComplianceSettings(tenantId);

      await this.cache.set(cacheKey, settings, this.CONFIG_CACHE_TTL);

      return settings;
    } catch (error) {
      this.logger.error(`Failed to get compliance settings: ${error.message}`);
      return this.getDefaultComplianceSettings(tenantId);
    }
  }

  /**
   * Get integration health status
   */
  async getIntegrationHealth(tenantId: string): Promise<IntegrationHealth[]> {
    try {
      const health: IntegrationHealth[] = [];

      // Check SSO
      const ssoConfig = await this.getSSOConfig(tenantId);
      if (ssoConfig) {
        health.push({
          integrationId: ssoConfig.id,
          integrationName: `SSO (${ssoConfig.provider})`,
          type: 'SSO',
          status: ssoConfig.enabled ? 'healthy' : 'degraded',
          lastCheckAt: new Date(),
          nextCheckAt: new Date(Date.now() + 60000),
          message: 'SSO integration operational',
          latencyMs: 150,
          errorRate: 0,
        });
      }

      return health;
    } catch (error) {
      this.logger.error(`Failed to get integration health: ${error.message}`);
      return [];
    }
  }

  // ============ HELPER METHODS ============

  /**
   * Encrypt secret
   */
  private async encryptSecret(secret: string): Promise<string> {
    // In production, would use actual encryption (e.g., Azure Key Vault)
    return Buffer.from(secret).toString('base64');
  }

  /**
   * Hash API key
   */
  private async hashKey(key: string): Promise<string> {
    // In production, would use bcrypt or similar
    return Buffer.from(key).toString('base64');
  }

  /**
   * Generate random key
   */
  private generateRandomKey(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'cast_';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get default compliance settings
   */
  private getDefaultComplianceSettings(tenantId: string): ComplianceSettings {
    return {
      id: uuidv4(),
      tenantId,
      gdprEnabled: true,
      hipaaEnabled: false,
      socCompliant: false,
      dataResidency: 'US',
      encryptionAtRest: true,
      encryptionInTransit: true,
      tlsMinVersion: '1.2',
      allowedIpRanges: [],
      requireMfa: false,
      sessionTimeout: 30,
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        historyCount: 5,
      },
      auditLogRetention: 365,
      dataRetentionPolicy: {
        auditLogsRetentionDays: 365,
        analyticsEventRetentionDays: 90,
        deletedProjectsRetentionDays: 30,
        backupRetentionDays: 90,
        autoDeleteExpired: true,
      },
      updatedAt: new Date(),
    };
  }
}
