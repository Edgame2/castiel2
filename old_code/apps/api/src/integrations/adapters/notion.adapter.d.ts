/**
 * Notion Integration Adapter
 * Connects to Notion API for syncing databases, pages, and blocks
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseIntegrationAdapter, FetchOptions, FetchResult, PushOptions, PushResult, WebhookEvent, IntegrationAdapterFactory } from '../base-adapter.js';
import { IntegrationConnectionService } from '../../services/integration-connection.service.js';
import { IntegrationDefinition, IntegrationEntity, SearchOptions, SearchResult } from '../../types/integration.types.js';
/**
 * Notion Integration Adapter
 */
export declare class NotionAdapter extends BaseIntegrationAdapter {
    constructor(monitoring: IMonitoringProvider, connectionService: IntegrationConnectionService, tenantId: string, connectionId: string);
    /**
     * Get Notion integration definition
     */
    getDefinition(): IntegrationDefinition;
    /**
     * Make Notion API request with proper headers
     */
    protected makeNotionRequest<T = any>(endpoint: string, options?: RequestInit): Promise<{
        data?: T;
        error?: string;
        status: number;
    }>;
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
     * Test Notion connection
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Fetch records from Notion
     */
    fetch(options: FetchOptions): Promise<FetchResult>;
    /**
     * Fetch all databases accessible to the integration
     */
    private fetchDatabases;
    /**
     * Fetch all pages accessible to the integration
     */
    private fetchPages;
    /**
     * Fetch pages from a specific database
     */
    private fetchDatabasePages;
    /**
     * Fetch blocks (children) of a page or block
     */
    private fetchBlocks;
    /**
     * Push record to Notion
     */
    push(data: Record<string, any>, options: PushOptions): Promise<PushResult>;
    /**
     * Create or update a page
     */
    private pushPage;
    /**
     * Create a new page
     */
    private createPage;
    /**
     * Update an existing page
     */
    private updatePage;
    /**
     * Archive (soft delete) a page
     */
    private archivePage;
    /**
     * Create a page in a specific database
     */
    private pushPageToDatabase;
    /**
     * Push block operations
     */
    private pushBlock;
    /**
     * Append blocks to a page or block
     */
    private appendBlocks;
    /**
     * Update a block
     */
    private updateBlock;
    /**
     * Delete a block
     */
    private deleteBlock;
    /**
     * Create or update a database
     */
    private pushDatabase;
    /**
     * Create a database
     */
    private createDatabase;
    /**
     * Update a database
     */
    private updateDatabase;
    /**
     * Get entity schema - for databases, fetch the actual schema
     */
    getEntitySchema(entityName: string): Promise<IntegrationEntity | null>;
    /**
     * Get database schema from Notion
     */
    private getDatabaseSchema;
    /**
     * Search across Notion pages and databases
     */
    search(options: SearchOptions): Promise<SearchResult>;
    /**
     * Extract title from Notion object
     */
    private extractNotionTitle;
    /**
     * Extract description from Notion object
     */
    private extractNotionDescription;
    /**
     * Calculate relevance score for Notion search result
     */
    private calculateNotionRelevanceScore;
    /**
     * Extract highlighted text from Notion object
     */
    private extractNotionHighlights;
    /**
     * List available entities (databases accessible to the integration)
     */
    listEntities(): Promise<IntegrationEntity[]>;
    /**
     * Parse Notion webhook (not natively supported, but could be via polling or third-party)
     */
    parseWebhook(payload: any, _headers: Record<string, string>): WebhookEvent | null;
    /**
     * Build Notion filter from our filter format
     */
    private buildNotionFilter;
    /**
     * Convert our properties format to Notion properties
     */
    private convertToNotionProperties;
    /**
     * Convert a single property value to Notion format
     */
    private convertPropertyValue;
    /**
     * Convert database properties schema to Notion format
     */
    private convertToDatabaseProperties;
    /**
     * Convert our block format to Notion block
     */
    private convertToNotionBlock;
    /**
     * Normalize database record
     */
    private normalizeDatabaseRecord;
    /**
     * Normalize page record
     */
    private normalizePageRecord;
    /**
     * Normalize block record
     */
    private normalizeBlockRecord;
    /**
     * Extract plain text from rich text array
     */
    private extractPlainText;
    /**
     * Extract value from Notion property
     */
    private extractPropertyValue;
    /**
     * Extract formula result value
     */
    private extractFormulaValue;
    /**
     * Extract rollup result value
     */
    private extractRollupValue;
    /**
     * Map Notion property type to our type
     */
    private mapNotionPropertyType;
}
/**
 * Notion integration definition
 *
 * Credential Architecture:
 * - System OAuth App: clientId/clientSecret stored in Key Vault as system secrets
 *   (referenced via clientIdEnvVar/clientSecretEnvVar for the OAuth flow)
 * - Per-Tenant Tokens: access_token/refresh_token stored in Key Vault per tenant
 *   Pattern: tenant-{tenantId}-notion-oauth
 *
 * The IntegrationConnectionService handles all credential management:
 * - OAuth flow uses system app credentials
 * - Per-tenant tokens are stored/retrieved via Key Vault
 * - Token refresh is handled automatically
 */
export declare const NOTION_DEFINITION: IntegrationDefinition;
/**
 * Notion adapter factory
 */
export declare const notionAdapterFactory: IntegrationAdapterFactory;
//# sourceMappingURL=notion.adapter.d.ts.map