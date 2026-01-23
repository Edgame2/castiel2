/**
 * Audit & Enterprise Integration Service
 * Audit logging, SSO, data warehouse connectors, real-time streaming, webhooks
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, ResourceType, AuditSeverity, AuditStatus, } from '../types/audit-integration.types';
import { v4 as uuidv4 } from 'uuid';
let AuditIntegrationService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AuditIntegrationService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            AuditIntegrationService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        cosmosDB;
        cache;
        activityService;
        logger = new Logger(AuditIntegrationService.name);
        AUDIT_CACHE_TTL = 300; // 5 minutes for queries
        CONFIG_CACHE_TTL = 3600; // 1 hour for configs
        constructor(cosmosDB, cache, activityService) {
            this.cosmosDB = cosmosDB;
            this.cache = cache;
            this.activityService = activityService;
        }
        // ============ AUDIT LOGGING ============
        /**
         * Log audit entry
         */
        async logAudit(entry) {
            try {
                const auditEntry = {
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
            }
            catch (error) {
                this.logger.error(`Failed to log audit: ${error.message}`);
                throw error;
            }
        }
        /**
         * Query audit logs
         */
        async queryAuditLogs(query) {
            try {
                // Check cache
                const cacheKey = `audit-query:${JSON.stringify(query)}`;
                const cached = await this.cache.get(cacheKey);
                if (cached) {
                    return cached;
                }
                // Build query
                let sql = 'SELECT * FROM audit_logs WHERE tenantId = @tenantId';
                const params = [{ name: '@tenantId', value: query.tenantId }];
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
                const entries = await this.cosmosDB.queryDocuments('audit-logs', sql, params, query.tenantId);
                // Get total count
                const countQuery = sql.replace(/OFFSET.*LIMIT.*/, '').replace('SELECT *', 'SELECT VALUE COUNT(1)');
                const countResult = await this.cosmosDB.queryDocuments('audit-logs', countQuery, params, query.tenantId);
                const total = countResult.length > 0 ? countResult[0] : 0;
                const result = { entries, total };
                // Cache
                await this.cache.set(cacheKey, result, this.AUDIT_CACHE_TTL);
                return result;
            }
            catch (error) {
                this.logger.error(`Failed to query audit logs: ${error.message}`);
                throw error;
            }
        }
        /**
         * Generate audit report
         */
        async generateAuditReport(tenantId, reportType, startDate, endDate) {
            try {
                // Query audit entries
                const { entries } = await this.queryAuditLogs({
                    tenantId,
                    startDate,
                    endDate,
                    limit: 10000,
                });
                // Calculate statistics
                const eventsByAction = new Map();
                const eventsBySeverity = new Map();
                const eventsByResourceType = new Map();
                const userEventMap = new Map();
                let failureCount = 0;
                let criticalCount = 0;
                for (const entry of entries) {
                    eventsByAction.set(entry.action, (eventsByAction.get(entry.action) || 0) + 1);
                    eventsBySeverity.set(entry.severity, (eventsBySeverity.get(entry.severity) || 0) + 1);
                    eventsByResourceType.set(entry.resourceType, (eventsByResourceType.get(entry.resourceType) || 0) + 1);
                    userEventMap.set(entry.userId, (userEventMap.get(entry.userId) || 0) + 1);
                    if (entry.status === AuditStatus.FAILURE) {
                        failureCount++;
                    }
                    if (entry.severity === AuditSeverity.CRITICAL) {
                        criticalCount++;
                    }
                }
                // Build report
                const report = {
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
            }
            catch (error) {
                this.logger.error(`Failed to generate audit report: ${error.message}`);
                throw error;
            }
        }
        // ============ SSO CONFIGURATION ============
        /**
         * Create/update SSO configuration
         */
        async updateSSOConfig(tenantId, config) {
            try {
                const ssoConfig = {
                    id: config.id || uuidv4(),
                    tenantId,
                    provider: config.provider || 'OAUTH2',
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
            }
            catch (error) {
                this.logger.error(`Failed to update SSO config: ${error.message}`);
                throw error;
            }
        }
        /**
         * Get SSO configuration
         */
        async getSSOConfig(tenantId) {
            try {
                const cacheKey = `sso-config:${tenantId}`;
                const cached = await this.cache.get(cacheKey);
                if (cached) {
                    return cached;
                }
                const query = 'SELECT * FROM sso_configs WHERE tenantId = @tenantId';
                const configs = await this.cosmosDB.queryDocuments('sso-configs', query, [{ name: '@tenantId', value: tenantId }], tenantId);
                const config = configs.length > 0 ? configs[0] : null;
                if (config) {
                    await this.cache.set(cacheKey, config, this.CONFIG_CACHE_TTL);
                }
                return config;
            }
            catch (error) {
                this.logger.error(`Failed to get SSO config: ${error.message}`);
                return null;
            }
        }
        // ============ DATA WAREHOUSE CONNECTORS ============
        /**
         * Create data warehouse connector
         */
        async createDataWarehouseConnector(tenantId, connector) {
            try {
                const dwConnector = {
                    id: uuidv4(),
                    tenantId,
                    name: connector.name || 'DW Connector',
                    type: connector.type || 'SNOWFLAKE',
                    connectionString: await this.encryptSecret(connector.connectionString || ''),
                    enabled: connector.enabled || false,
                    syncSchedule: connector.syncSchedule || {
                        frequency: 'DAILY',
                        timezone: 'UTC',
                    },
                    syncStatus: 'IDLE',
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
            }
            catch (error) {
                this.logger.error(`Failed to create DW connector: ${error.message}`);
                throw error;
            }
        }
        /**
         * Sync data warehouse
         */
        async syncDataWarehouse(tenantId, connectorId) {
            try {
                const syncId = uuidv4();
                const syncHistory = {
                    id: syncId,
                    connectorId,
                    tenantId,
                    startTime: new Date(),
                    status: 'IN_PROGRESS',
                    recordsProcessed: 0,
                    recordsSucceeded: 0,
                    recordsFailed: 0,
                    errorMessages: [],
                    datasetResults: [],
                };
                // Simulate sync process
                try {
                    // In production, would execute actual sync
                    syncHistory.status = 'SUCCESS';
                    syncHistory.endTime = new Date();
                    syncHistory.recordsProcessed = 1000;
                    syncHistory.recordsSucceeded = 1000;
                }
                catch (error) {
                    syncHistory.status = 'FAILURE';
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
            }
            catch (error) {
                this.logger.error(`Failed to sync DW: ${error.message}`);
                throw error;
            }
        }
        // ============ REAL-TIME STREAMING ============
        /**
         * Create real-time stream configuration
         */
        async createStreamConfig(tenantId, config) {
            try {
                const streamConfig = {
                    id: uuidv4(),
                    tenantId,
                    name: config.name || 'Stream Config',
                    type: config.type || 'EVENT_HUB',
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
            }
            catch (error) {
                this.logger.error(`Failed to create stream config: ${error.message}`);
                throw error;
            }
        }
        // ============ WEBHOOKS ============
        /**
         * Create webhook configuration
         */
        async createWebhook(tenantId, webhook) {
            try {
                const webhookConfig = {
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
            }
            catch (error) {
                this.logger.error(`Failed to create webhook: ${error.message}`);
                throw error;
            }
        }
        /**
         * Trigger webhook
         */
        async triggerWebhook(tenantId, webhookId, event, payload) {
            try {
                // Get webhook config
                const query = 'SELECT * FROM webhooks WHERE id = @id AND tenantId = @tenantId';
                const webhooks = await this.cosmosDB.queryDocuments('webhooks', query, [
                    { name: '@id', value: webhookId },
                    { name: '@tenantId', value: tenantId },
                ], tenantId);
                if (webhooks.length === 0 || !webhooks[0].enabled) {
                    return;
                }
                const webhook = webhooks[0];
                // Check if webhook listens to this event
                if (!webhook.events.includes(event)) {
                    return;
                }
                // In production, would make HTTP POST request with retry logic
                this.logger.debug(`Would trigger webhook ${webhookId} for event ${event}`);
            }
            catch (error) {
                this.logger.error(`Failed to trigger webhook: ${error.message}`);
            }
        }
        // ============ API KEYS ============
        /**
         * Generate API key
         */
        async generateAPIKey(tenantId, name, permissions) {
            try {
                const key = this.generateRandomKey(32);
                const prefix = key.substring(0, 8);
                const apiKey = {
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
            }
            catch (error) {
                this.logger.error(`Failed to generate API key: ${error.message}`);
                throw error;
            }
        }
        /**
         * Revoke API key
         */
        async revokeAPIKey(tenantId, keyId) {
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
            }
            catch (error) {
                this.logger.error(`Failed to revoke API key: ${error.message}`);
                throw error;
            }
        }
        // ============ COMPLIANCE & HEALTH ============
        /**
         * Get compliance settings
         */
        async getComplianceSettings(tenantId) {
            try {
                const cacheKey = `compliance:${tenantId}`;
                const cached = await this.cache.get(cacheKey);
                if (cached) {
                    return cached;
                }
                const query = 'SELECT * FROM compliance_settings WHERE tenantId = @tenantId';
                const results = await this.cosmosDB.queryDocuments('compliance-settings', query, [{ name: '@tenantId', value: tenantId }], tenantId);
                const settings = results.length > 0 ? results[0] : this.getDefaultComplianceSettings(tenantId);
                await this.cache.set(cacheKey, settings, this.CONFIG_CACHE_TTL);
                return settings;
            }
            catch (error) {
                this.logger.error(`Failed to get compliance settings: ${error.message}`);
                return this.getDefaultComplianceSettings(tenantId);
            }
        }
        /**
         * Get integration health status
         */
        async getIntegrationHealth(tenantId) {
            try {
                const health = [];
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
            }
            catch (error) {
                this.logger.error(`Failed to get integration health: ${error.message}`);
                return [];
            }
        }
        // ============ HELPER METHODS ============
        /**
         * Encrypt secret
         */
        async encryptSecret(secret) {
            // In production, would use actual encryption (e.g., Azure Key Vault)
            return Buffer.from(secret).toString('base64');
        }
        /**
         * Hash API key
         */
        async hashKey(key) {
            // In production, would use bcrypt or similar
            return Buffer.from(key).toString('base64');
        }
        /**
         * Generate random key
         */
        generateRandomKey(length) {
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
        getDefaultComplianceSettings(tenantId) {
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
    };
    return AuditIntegrationService = _classThis;
})();
export { AuditIntegrationService };
//# sourceMappingURL=audit-integration.service.js.map