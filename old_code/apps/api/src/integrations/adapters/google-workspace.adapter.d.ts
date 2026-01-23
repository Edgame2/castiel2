/**
 * Google Workspace Integration Adapter
 * Connects to Google Workspace APIs (Gmail, Calendar, Drive, Contacts, Tasks)
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { BaseIntegrationAdapter, FetchOptions, FetchResult, PushOptions, PushResult, WebhookEvent, IntegrationAdapterFactory } from '../base-adapter.js';
import { IntegrationConnectionService } from '../../services/integration-connection.service.js';
import { IntegrationDefinition, IntegrationEntity, SearchOptions, SearchResult } from '../../types/integration.types.js';
import type { SSOTeam, TeamSyncConfig } from '../../types/team.types.js';
/**
 * Google Workspace Integration Adapter
 */
export declare class GoogleWorkspaceAdapter extends BaseIntegrationAdapter {
    private gmailClient;
    private calendarClient;
    private driveClient;
    private peopleClient;
    private tasksClient;
    private adminClient;
    private oauth2Client;
    private userEmail;
    constructor(monitoring: IMonitoringProvider, connectionService: IntegrationConnectionService, tenantId: string, connectionId: string);
    /**
     * Initialize Google API clients
     */
    private initializeClients;
    /**
     * Get Google Workspace integration definition
     */
    getDefinition(): IntegrationDefinition;
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
     * Fetch teams/groups from Google Workspace
     */
    fetchTeams(config: TeamSyncConfig): Promise<SSOTeam[]>;
    /**
     * Test Google Workspace connection
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Fetch records from Google Workspace
     */
    fetch(options: FetchOptions): Promise<FetchResult>;
    /**
     * Fetch Gmail messages
     */
    private fetchGmailMessages;
    /**
     * Fetch Gmail threads
     */
    private fetchGmailThreads;
    /**
     * Fetch Calendar events
     */
    private fetchCalendarEvents;
    /**
     * Fetch Drive files
     */
    private fetchDriveFiles;
    /**
     * Fetch Contacts
     */
    private fetchContacts;
    /**
     * Fetch Tasks
     */
    private fetchTasks;
    /**
     * Search across Google Workspace services
     */
    search(options: SearchOptions): Promise<SearchResult>;
    /**
     * Calculate relevance score for a search result
     */
    private calculateRelevanceScore;
    /**
     * Extract highlighted text from record
     */
    private extractHighlights;
    /**
     * Push record to Google Workspace
     */
    push(data: Record<string, any>, options: PushOptions): Promise<PushResult>;
    /**
     * Push Gmail message (send email or update labels)
     */
    private pushGmailMessage;
    /**
     * Push Calendar event
     */
    private pushCalendarEvent;
    /**
     * Push Drive file
     */
    private pushDriveFile;
    /**
     * Push Contact
     */
    private pushContact;
    /**
     * Push Task
     */
    private pushTask;
    /**
     * Get entity schema
     */
    getEntitySchema(entityName: string): Promise<IntegrationEntity | null>;
    /**
     * List available entities
     */
    listEntities(): Promise<IntegrationEntity[]>;
    /**
     * Register webhook subscription for Google Workspace services
     * Supports Gmail (Pub/Sub), Calendar (Watch API), and Drive (Watch API)
     */
    registerWebhook(events: string[], callbackUrl: string, resource?: string): Promise<{
        webhookId: string;
        expirationDateTime?: Date;
        secret?: string;
    }>;
    /**
     * Unregister webhook subscription
     */
    unregisterWebhook(webhookId: string, resourceId?: string): Promise<void>;
    /**
     * Parse webhook payload
     */
    parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null;
    /**
     * Verify webhook signature (for Pub/Sub)
     */
    verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
    private normalizeGmailMessage;
    private normalizeGmailThread;
    private normalizeCalendarEvent;
    private normalizeDriveFile;
    private normalizeContact;
    private normalizeTask;
    private buildGmailRawMessage;
    private buildCalendarEventData;
    private buildContactData;
    private buildTaskData;
    private handleGoogleError;
}
/**
 * Google Workspace integration definition
 */
export declare const GOOGLE_WORKSPACE_DEFINITION: IntegrationDefinition;
/**
 * Google Workspace adapter factory
 */
export declare const googleWorkspaceAdapterFactory: IntegrationAdapterFactory;
//# sourceMappingURL=google-workspace.adapter.d.ts.map