/**
 * Audit & Enterprise Integration Service
 * Audit logging, SSO, data warehouse connectors, real-time streaming, webhooks
 */
import { AuditLogEntry, AuditQuery, AuditReport, AuditReportType, SSOConfig, DataWarehouseConnector, SyncHistory, RealtimeStreamConfig, ComplianceSettings, WebhookConfig, APIKey, IntegrationHealth } from '../types/audit-integration.types';
import { CosmosDBService } from './cosmos-db.service';
import { CacheService } from './cache.service';
import { ProjectActivityService } from './project-activity.service';
export declare class AuditIntegrationService {
    private cosmosDB;
    private cache;
    private activityService;
    private readonly logger;
    private readonly AUDIT_CACHE_TTL;
    private readonly CONFIG_CACHE_TTL;
    constructor(cosmosDB: CosmosDBService, cache: CacheService, activityService: ProjectActivityService);
    /**
     * Log audit entry
     */
    logAudit(entry: Partial<AuditLogEntry>): Promise<AuditLogEntry>;
    /**
     * Query audit logs
     */
    queryAuditLogs(query: AuditQuery): Promise<{
        entries: AuditLogEntry[];
        total: number;
    }>;
    /**
     * Generate audit report
     */
    generateAuditReport(tenantId: string, reportType: AuditReportType, startDate: Date, endDate: Date): Promise<AuditReport>;
    /**
     * Create/update SSO configuration
     */
    updateSSOConfig(tenantId: string, config: Partial<SSOConfig>): Promise<SSOConfig>;
    /**
     * Get SSO configuration
     */
    getSSOConfig(tenantId: string): Promise<SSOConfig | null>;
    /**
     * Create data warehouse connector
     */
    createDataWarehouseConnector(tenantId: string, connector: Partial<DataWarehouseConnector>): Promise<DataWarehouseConnector>;
    /**
     * Sync data warehouse
     */
    syncDataWarehouse(tenantId: string, connectorId: string): Promise<SyncHistory>;
    /**
     * Create real-time stream configuration
     */
    createStreamConfig(tenantId: string, config: Partial<RealtimeStreamConfig>): Promise<RealtimeStreamConfig>;
    /**
     * Create webhook configuration
     */
    createWebhook(tenantId: string, webhook: Partial<WebhookConfig>): Promise<WebhookConfig>;
    /**
     * Trigger webhook
     */
    triggerWebhook(tenantId: string, webhookId: string, event: string, payload: any): Promise<void>;
    /**
     * Generate API key
     */
    generateAPIKey(tenantId: string, name: string, permissions: any): Promise<APIKey>;
    /**
     * Revoke API key
     */
    revokeAPIKey(tenantId: string, keyId: string): Promise<void>;
    /**
     * Get compliance settings
     */
    getComplianceSettings(tenantId: string): Promise<ComplianceSettings>;
    /**
     * Get integration health status
     */
    getIntegrationHealth(tenantId: string): Promise<IntegrationHealth[]>;
    /**
     * Encrypt secret
     */
    private encryptSecret;
    /**
     * Hash API key
     */
    private hashKey;
    /**
     * Generate random key
     */
    private generateRandomKey;
    /**
     * Get default compliance settings
     */
    private getDefaultComplianceSettings;
}
//# sourceMappingURL=audit-integration.service.d.ts.map