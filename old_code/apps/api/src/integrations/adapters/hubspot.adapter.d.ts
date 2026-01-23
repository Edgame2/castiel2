/**
 * HubSpot Integration Adapter
 * Connects to HubSpot CRM API
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseIntegrationAdapter, FetchOptions, FetchResult, PushOptions, PushResult, WebhookEvent, IntegrationAdapterFactory } from '../base-adapter.js';
import { IntegrationConnectionService } from '../../services/integration-connection.service.js';
import { IntegrationDefinition, IntegrationEntity, SearchOptions, SearchResult } from '../../types/integration.types.js';
/**
 * HubSpot Integration Adapter
 */
export declare class HubSpotAdapter extends BaseIntegrationAdapter {
    private accessToken;
    constructor(monitoring: IMonitoringProvider, connectionService: IntegrationConnectionService, tenantId: string, connectionId: string);
    /**
     * Get HubSpot integration definition
     */
    getDefinition(): IntegrationDefinition;
    /**
     * Initialize with access token
     */
    private initialize;
    /**
     * Make authenticated request to HubSpot API
     */
    private makeHubSpotRequest;
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
     * Test HubSpot connection
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Fetch records from HubSpot
     */
    fetch(options: FetchOptions): Promise<FetchResult>;
    /**
     * Push record to HubSpot
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
     * Search across HubSpot entities
     */
    search(options: SearchOptions): Promise<SearchResult>;
    /**
     * Register webhook subscription for HubSpot
     */
    registerWebhook(events: string[], callbackUrl: string): Promise<{
        webhookId: string;
        secret?: string;
    }>;
    /**
     * Unregister webhook subscription
     */
    unregisterWebhook(webhookId: string): Promise<void>;
    /**
     * Verify webhook signature (HubSpot uses HMAC SHA256)
     */
    verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
    /**
     * Parse HubSpot webhook
     */
    parseWebhook(payload: any, _headers: Record<string, string>): WebhookEvent | null;
    private normalizeRecord;
    private buildDescription;
    private calculateRelevanceScore;
    private mapChangeType;
    private getSearchPropertiesForEntity;
}
export declare const HUBSPOT_DEFINITION: IntegrationDefinition;
export declare const hubspotAdapterFactory: IntegrationAdapterFactory;
//# sourceMappingURL=hubspot.adapter.d.ts.map