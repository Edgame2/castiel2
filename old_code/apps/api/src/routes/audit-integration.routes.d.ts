/**
 * Audit & Enterprise Integration Routes
 * Audit logging, SSO, data warehouse, real-time streaming, webhooks, compliance
 */
import { AuditLogEntry, AuditQuery, AuditReport, AuditReportType, SSOConfig, DataWarehouseConnector, RealtimeStreamConfig, WebhookConfig, ComplianceSettings, IntegrationHealth, APIKey } from '../types/audit-integration.types';
import { AuditIntegrationService } from '../services/audit-integration.service';
export declare class AuditIntegrationController {
    private readonly auditService;
    constructor(auditService: AuditIntegrationService);
    /**
     * Query audit logs
     */
    queryAuditLogs(tenantId: string, query: AuditQuery): Promise<{
        entries: AuditLogEntry[];
        total: number;
    }>;
    /**
     * Get audit log entry
     */
    getAuditLog(tenantId: string, id: string): Promise<any>;
    /**
     * Generate audit report
     */
    generateAuditReport(tenantId: string, payload: {
        reportType: AuditReportType;
        startDate: string;
        endDate: string;
    }): Promise<AuditReport>;
    /**
     * Export audit logs
     */
    exportAuditLogs(tenantId: string, startDate: string, endDate: string): Promise<any>;
    /**
     * Get SSO configuration
     */
    getSSOConfig(tenantId: string): Promise<any>;
    /**
     * Update SSO configuration
     */
    updateSSOConfig(tenantId: string, config: Partial<SSOConfig>): Promise<SSOConfig>;
    /**
     * Test SSO connection
     */
    testSSOConnection(tenantId: string): Promise<any>;
    /**
     * Create data warehouse connector
     */
    createDWConnector(tenantId: string, connector: Partial<DataWarehouseConnector>): Promise<DataWarehouseConnector>;
    /**
     * List data warehouse connectors
     */
    listDWConnectors(tenantId: string): Promise<any>;
    /**
     * Sync data warehouse
     */
    syncDWConnector(tenantId: string, connectorId: string): Promise<any>;
    /**
     * Get sync history
     */
    getSyncHistory(tenantId: string, limit?: number): Promise<any>;
    /**
     * Create stream configuration
     */
    createStreamConfig(tenantId: string, config: Partial<RealtimeStreamConfig>): Promise<RealtimeStreamConfig>;
    /**
     * List stream configurations
     */
    listStreamConfigs(tenantId: string): Promise<any>;
    /**
     * Get stream metrics
     */
    getStreamMetrics(tenantId: string): Promise<any>;
    /**
     * Create webhook
     */
    createWebhook(tenantId: string, webhook: Partial<WebhookConfig>): Promise<WebhookConfig>;
    /**
     * List webhooks
     */
    listWebhooks(tenantId: string): Promise<any>;
    /**
     * Test webhook
     */
    testWebhook(tenantId: string, webhookId: string): Promise<any>;
    /**
     * Delete webhook
     */
    deleteWebhook(tenantId: string, webhookId: string): Promise<void>;
    /**
     * Generate API key
     */
    generateAPIKey(tenantId: string, payload: {
        name: string;
        permissions: any;
    }): Promise<APIKey>;
    /**
     * List API keys
     */
    listAPIKeys(tenantId: string): Promise<any>;
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
     * System health check
     */
    getSystemHealth(): Promise<any>;
}
//# sourceMappingURL=audit-integration.routes.d.ts.map