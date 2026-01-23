/**
 * Dynamics 365 Integration Adapter
 * Connects to Dynamics 365 CRM via OData API
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseIntegrationAdapter, FetchOptions, FetchResult, PushOptions, PushResult, WebhookEvent, IntegrationAdapterFactory } from '../base-adapter.js';
import { IntegrationConnectionService } from '../../services/integration-connection.service.js';
import { IntegrationDefinition, IntegrationEntity, SearchOptions, SearchResult } from '../../types/integration.types.js';
/**
 * Dynamics 365 Integration Adapter
 */
export declare class Dynamics365Adapter extends BaseIntegrationAdapter {
    private organizationUrl;
    private apiVersion;
    constructor(monitoring: IMonitoringProvider, connectionService: IntegrationConnectionService, tenantId: string, connectionId: string);
    /**
     * Get Dynamics 365 integration definition
     */
    getDefinition(): IntegrationDefinition;
    /**
     * Initialize with organization URL from connection
     */
    private initialize;
    /**
     * Build OData query string from filters
     */
    private buildODataQuery;
    /**
     * Get current authenticated user's profile
     */
    getUserProfile(): Promise<{
        id: string;
        email?: string;
        name?: string;
        [key: string]: any;
    }>;
    /**
     * Make authenticated request to Dynamics 365 API
     */
    private makeDynamicsRequest;
    /**
     * Test Dynamics 365 connection
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Fetch records from Dynamics 365 with delta sync support
     */
    fetch(options: FetchOptions): Promise<FetchResult>;
    /**
     * Push record to Dynamics 365
     */
    push(data: Record<string, any>, options: PushOptions): Promise<PushResult>;
    /**
     * Get entity schema
     */
    getEntitySchema(entityName: string): Promise<IntegrationEntity | null>;
    /**
     * List available entities
     */
    listEntities(): Promise<IntegrationEntity[]>;
    /**
     * Search across Dynamics 365 entities
     */
    search(options: SearchOptions): Promise<SearchResult>;
    /**
     * Register webhook subscription for Dynamics 365
     * Note: Dynamics 365 uses Azure Service Bus or webhooks for change notifications
     */
    registerWebhook(events: string[], callbackUrl: string): Promise<{
        webhookId: string;
        expirationDateTime?: Date;
    }>;
    /**
     * Unregister webhook subscription
     */
    unregisterWebhook(webhookId: string): Promise<void>;
    /**
     * Parse Dynamics 365 webhook
     */
    parseWebhook(payload: any, _headers: Record<string, string>): WebhookEvent | null;
    private normalizeRecord;
    private buildDescription;
    private calculateRelevanceScore;
    private mapChangeType;
}
export declare const DYNAMICS_365_DEFINITION: IntegrationDefinition;
export declare const dynamics365AdapterFactory: IntegrationAdapterFactory;
//# sourceMappingURL=dynamics-365.adapter.d.ts.map