/**
 * Microsoft Graph Integration Adapter
 * Connects to Microsoft Graph API (Teams, OneDrive, Outlook, etc.)
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseIntegrationAdapter, FetchOptions, FetchResult, PushOptions, PushResult, WebhookEvent, IntegrationAdapterFactory } from '../base-adapter.js';
import { IntegrationConnectionService } from '../../services/integration-connection.service.js';
import { IntegrationDefinition, IntegrationEntity, SearchOptions, SearchResult } from '../../types/integration.types.js';
import type { SSOTeam, TeamSyncConfig } from '../../types/team.types.js';
/**
 * Microsoft Graph Integration Adapter
 */
export declare class MicrosoftGraphAdapter extends BaseIntegrationAdapter {
    constructor(monitoring: IMonitoringProvider, connectionService: IntegrationConnectionService, tenantId: string, connectionId: string);
    /**
     * Get Microsoft Graph integration definition
     */
    getDefinition(): IntegrationDefinition;
    /**
     * Make authenticated request to Microsoft Graph API
     */
    private makeGraphRequest;
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
     * Fetch teams/groups from Azure AD
     */
    fetchTeams(config: TeamSyncConfig): Promise<SSOTeam[]>;
    /**
     * Test Microsoft Graph connection
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Build OData query string from filters
     */
    private buildODataQuery;
    /**
     * Fetch records from Microsoft Graph with delta sync support
     */
    fetch(options: FetchOptions): Promise<FetchResult>;
    /**
     * Push record to Microsoft Graph
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
     * Search across Microsoft Graph entities
     */
    search(options: SearchOptions): Promise<SearchResult>;
    /**
     * Register webhook subscription for Microsoft Graph
     */
    registerWebhook(events: string[], callbackUrl: string, resource?: string): Promise<{
        webhookId: string;
        expirationDateTime: Date;
    }>;
    /**
     * Unregister webhook subscription
     */
    unregisterWebhook(webhookId: string): Promise<void>;
    /**
     * Parse Microsoft Graph webhook
     */
    parseWebhook(payload: any, _headers: Record<string, string>): WebhookEvent | null;
    private normalizeRecord;
    private buildDescription;
    private calculateRelevanceScore;
    private mapChangeType;
}
export declare const MICROSOFT_GRAPH_DEFINITION: IntegrationDefinition;
export declare const microsoftGraphAdapterFactory: IntegrationAdapterFactory;
//# sourceMappingURL=microsoft-graph.adapter.d.ts.map