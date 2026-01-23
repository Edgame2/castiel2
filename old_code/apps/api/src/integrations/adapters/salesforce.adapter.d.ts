/**
 * Salesforce Integration Adapter
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseIntegrationAdapter, FetchOptions, FetchResult, PushOptions, PushResult, WebhookEvent, IntegrationAdapterFactory } from '../base-adapter.js';
import { IntegrationConnectionService } from '../../services/integration-connection.service.js';
import { IntegrationDefinition, IntegrationEntity, SearchOptions, SearchResult } from '../../types/integration.types.js';
/**
 * Salesforce Integration Adapter
 */
export declare class SalesforceAdapter extends BaseIntegrationAdapter {
    private instanceUrl;
    private apiVersion;
    constructor(monitoring: IMonitoringProvider, connectionService: IntegrationConnectionService, tenantId: string, connectionId: string);
    /**
     * Get Salesforce integration definition
     */
    getDefinition(): IntegrationDefinition;
    /**
     * Initialize with instance URL from connection
     */
    private initialize;
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
     * Test Salesforce connection
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Fetch records from Salesforce using SOQL
     */
    fetch(options: FetchOptions): Promise<FetchResult>;
    /**
     * Push record to Salesforce
     */
    push(data: Record<string, any>, options: PushOptions): Promise<PushResult>;
    /**
     * Get entity schema from Salesforce describe
     */
    getEntitySchema(entityName: string): Promise<IntegrationEntity | null>;
    /**
     * List available Salesforce objects
     */
    listEntities(): Promise<IntegrationEntity[]>;
    /**
     * Search across Salesforce entities using SOSL (Salesforce Object Search Language)
     */
    search(options: SearchOptions): Promise<SearchResult>;
    /**
     * Get searchable fields for an entity
     */
    private getSearchFieldsForEntity;
    /**
     * Get title for an entity record
     */
    private getTitleForEntity;
    /**
     * Get description for an entity record
     */
    private getDescriptionForEntity;
    /**
     * Calculate relevance score for a search result
     */
    private calculateRelevanceScore;
    /**
     * Extract highlighted text from record
     */
    private extractHighlights;
    /**
     * Parse Salesforce webhook (Platform Event or Outbound Message)
     */
    parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null;
    /**
     * Escape SOQL string value to prevent injection
     */
    private escapeSOQLString;
    /**
     * Validate and sanitize field/entity names to prevent injection
     */
    private sanitizeIdentifier;
    /**
     * Build SOQL query from options
     */
    private buildSOQLQuery;
    /**
     * Normalize Salesforce record (remove attributes, etc.)
     */
    private normalizeRecord;
    /**
     * Map Salesforce field type to our type
     */
    private mapSalesforceType;
    /**
     * Map Salesforce change event type
     */
    private mapChangeType;
}
/**
 * Salesforce integration definition
 */
export declare const SALESFORCE_DEFINITION: IntegrationDefinition;
/**
 * Salesforce adapter factory
 */
export declare const salesforceAdapterFactory: IntegrationAdapterFactory;
//# sourceMappingURL=salesforce.adapter.d.ts.map