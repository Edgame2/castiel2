/**
 * Microsoft Graph Integration Adapter
 * Connects to Microsoft Graph API (Teams, OneDrive, Outlook, etc.)
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import {
  BaseIntegrationAdapter,
  FetchOptions,
  FetchResult,
  PushOptions,
  PushResult,
  WebhookEvent,
  IntegrationAdapterFactory,
  adapterRegistry,
  IntegrationConnectionService,
  type SSOTeam,
  type TeamSyncConfig,
} from '@castiel/api-core';
import {
  IntegrationDefinition,
  IntegrationCategory,
  IntegrationEntity,
  SearchOptions,
  SearchResult,
  SearchResultItem,
} from '../../types/integration.types.js';

const GRAPH_API_BASE_URL = 'https://graph.microsoft.com/v1.0';

// ============================================
// Microsoft Graph API Types
// ============================================

interface GraphResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
}


// ============================================
// Microsoft Graph Adapter Implementation
// ============================================

/**
 * Microsoft Graph Integration Adapter
 */
export class MicrosoftGraphAdapter extends BaseIntegrationAdapter {
  constructor(
    monitoring: IMonitoringProvider,
    connectionService: IntegrationConnectionService,
    tenantId: string,
    connectionId: string
  ) {
    super(monitoring, connectionService, 'microsoft-graph', tenantId, connectionId);
  }

  /**
   * Get Microsoft Graph integration definition
   */
  getDefinition(): IntegrationDefinition {
    return MICROSOFT_GRAPH_DEFINITION;
  }

  /**
   * Make authenticated request to Microsoft Graph API
   */
  private async makeGraphRequest<T>(
    url: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<{ data?: T; error?: string }> {
    const fullUrl = url.startsWith('http') ? url : `${GRAPH_API_BASE_URL}${url}`;
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const result = await this.makeRequest<T>(fullUrl, requestOptions);

    if (result.error) {
      return { error: result.error };
    }

    return { data: result.data };
  }

  /**
   * Get current authenticated user's profile
   */
  async getUserProfile(): Promise<{
    id: string;
    email?: string;
    name?: string;
    [key: string]: any;
  }> {
    try {
      const result = await this.makeGraphRequest<{
        id: string;
        mail?: string;
        userPrincipalName?: string;
        displayName?: string;
        givenName?: string;
        surname?: string;
      }>('/me');

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to get user profile');
      }

      const profile = result.data;
      return {
        id: profile.id,
        email: profile.mail || profile.userPrincipalName,
        name: profile.displayName || `${profile.givenName || ''} ${profile.surname || ''}`.trim(),
        displayName: profile.displayName,
        givenName: profile.givenName,
        surname: profile.surname,
        userPrincipalName: profile.userPrincipalName,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'microsoft-graph.getUserProfile',
          tenantId: this.tenantId,
        }
      );
      throw new Error(`Failed to get user profile: ${errorMessage}`);
    }
  }

  /**
   * Fetch teams/groups from Azure AD
   */
  async fetchTeams(config: TeamSyncConfig): Promise<SSOTeam[]> {
    try {
      const teams: SSOTeam[] = [];
      
      // Fetch all groups from Microsoft Graph
      // Note: This requires Group.Read.All or Directory.Read.All permissions
      let url = '/groups';
      let hasMore = true;
      
      while (hasMore) {
        const result = await this.makeGraphRequest<GraphResponse<{
          id: string;
          displayName: string;
          mailEnabled: boolean;
          securityEnabled: boolean;
          groupTypes: string[];
          owners?: { id: string; userPrincipalName?: string }[];
          '@odata.nextLink'?: string;
        }>>(url);

        if (result.error || !result.data) {
          this.monitoring.trackException(
            new Error(result.error || 'Failed to fetch groups'),
            { operation: 'microsoft-graph.fetchTeams', tenantId: this.tenantId }
          );
          break;
        }

        const groups = result.data.value;
        
        // Process each group
        for (const group of groups) {
          // Skip if it's a mail-enabled security group (not a team)
          // Only include Microsoft 365 groups or security groups
          if (group.mailEnabled && !group.groupTypes?.includes('Unified')) {
            continue;
          }

          // Fetch members for this group
          const membersResult = await this.makeGraphRequest<GraphResponse<{
            id: string;
            userPrincipalName?: string;
            mail?: string;
          }>>(`/groups/${group.id}/members`);

          const memberExternalIds: string[] = [];
          if (membersResult.data) {
            memberExternalIds.push(...membersResult.data.value.map(m => m.id));
          }

          // Get manager (first owner or null)
          let managerExternalId: string | undefined;
          if (group.owners && group.owners.length > 0) {
            managerExternalId = group.owners[0].id;
          }

          // Map group name using config if provided
          const nameMapping = config.teamNameMapping?.['displayName'] || 'displayName';
          const teamName = group[nameMapping as keyof typeof group] as string || group.displayName;

          teams.push({
            externalId: group.id,
            name: teamName,
            managerExternalId,
            memberExternalIds,
            metadata: {
              mailEnabled: group.mailEnabled,
              securityEnabled: group.securityEnabled,
              groupTypes: group.groupTypes,
            },
          });
        }

        // Check for next page
        hasMore = !!result.data['@odata.nextLink'];
        if (hasMore) {
          url = result.data['@odata.nextLink']!;
        }
      }

      return teams;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          operation: 'microsoft-graph.fetchTeams',
          tenantId: this.tenantId,
        }
      );
      throw new Error(`Failed to fetch teams from Microsoft Graph: ${errorMessage}`);
    }
  }

  /**
   * Test Microsoft Graph connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const result = await this.makeGraphRequest<{ displayName: string; mail: string }>('/me');

      if (result.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        details: {
          user: result.data?.displayName,
          email: result.data?.mail,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage || 'Connection test failed',
      };
    }
  }

  /**
   * Build OData query string from filters
   */
  private buildODataQuery(filters?: Record<string, any>): string {
    if (!filters) {return '';}

    const parts: string[] = [];

    // $filter - OData filter expression
    if (filters.$filter) {
      parts.push(`$filter=${encodeURIComponent(filters.$filter)}`);
    }

    // $select - Field selection
    if (filters.$select) {
      const select = Array.isArray(filters.$select) 
        ? filters.$select.join(',') 
        : filters.$select;
      parts.push(`$select=${encodeURIComponent(select)}`);
    }

    // $orderby - Sorting
    if (filters.$orderby) {
      const orderby = Array.isArray(filters.$orderby)
        ? filters.$orderby.join(',')
        : filters.$orderby;
      parts.push(`$orderby=${encodeURIComponent(orderby)}`);
    }

    // $expand - Related entities
    if (filters.$expand) {
      const expand = Array.isArray(filters.$expand)
        ? filters.$expand.join(',')
        : filters.$expand;
      parts.push(`$expand=${encodeURIComponent(expand)}`);
    }

    // $search - Full-text search
    if (filters.$search) {
      parts.push(`$search="${encodeURIComponent(filters.$search)}"`);
    }

    return parts.length > 0 ? parts.join('&') : '';
  }

  /**
   * Fetch records from Microsoft Graph with delta sync support
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    let url: string;
    const { entity, filters, limit, offset, incrementalSync, modifiedSince, externalUserId } = options;

    // Use externalUserId if provided, otherwise fall back to /me
    const userPath = externalUserId ? `/users/${externalUserId}` : '/me';

    // Build URL based on entity type
    switch (entity) {
      case 'onedrive_file':
      case 'onedrive_folder':
        // Use delta sync for incremental sync
        if (incrementalSync && filters?.deltaToken) {
          url = `${userPath}/drive/root/delta?token=${encodeURIComponent(filters.deltaToken)}`;
        } else if (incrementalSync) {
          url = `${userPath}/drive/root/delta`;
        } else {
          url = `${userPath}/drive/root/children`;
          if (filters?.folderId) {
            url = `${userPath}/drive/items/${filters.folderId}/children`;
          }
        }
        break;

      case 'teams_message':
        if (!filters?.channelId) {
          return { records: [], hasMore: false };
        }
        url = `/teams/${filters.teamId}/channels/${filters.channelId}/messages`;
        break;

      case 'teams_channel':
        if (!filters?.teamId) {
          return { records: [], hasMore: false };
        }
        url = `/teams/${filters.teamId}/channels`;
        break;

      case 'teams_team':
        url = `${userPath}/joinedTeams`;
        break;

      default:
        return { records: [], hasMore: false };
    }

    // Build OData query parameters
    const params: Record<string, any> = {};
    if (limit) {params.$top = limit;}
    if (offset) {params.$skip = offset;}

    // Add OData query builder filters
    const odataQuery = this.buildODataQuery(filters);
    if (odataQuery) {
      url += url.includes('?') ? `&${odataQuery}` : `?${odataQuery}`;
    }

    // Add modifiedSince filter if provided
    if (modifiedSince && !incrementalSync) {
      const filter = `lastModifiedDateTime ge ${modifiedSince.toISOString()}`;
      url += url.includes('?') ? `&$filter=${encodeURIComponent(filter)}` : `?$filter=${encodeURIComponent(filter)}`;
    }

    // Add standard query parameters
    const queryParams: string[] = [];
    if (limit && !url.includes('$top')) {
      queryParams.push(`$top=${limit}`);
    }
    if (offset && !url.includes('$skip')) {
      queryParams.push(`$skip=${offset}`);
    }
    if (queryParams.length > 0) {
      url += url.includes('?') ? `&${queryParams.join('&')}` : `?${queryParams.join('&')}`;
    }

    const result = await this.makeGraphRequest<GraphResponse<any>>(url);

    if (result.error) {
      this.monitoring.trackEvent('microsoft-graph.fetch.error', {
        entity,
        error: result.error,
      });
      return { records: [], hasMore: false };
    }

    const data = result.data!;
    const records = data.value.map(r => this.normalizeRecord(r, entity));

    // Extract delta token for incremental sync
    let deltaToken: string | undefined;
    const deltaLink = (data as any)['@odata.deltaLink'];
    if (incrementalSync && deltaLink) {
      try {
        const deltaUrl = new URL(deltaLink);
        deltaToken = deltaUrl.searchParams.get('token') || undefined;
      } catch (error) {
        // If deltaLink is not a valid URL, use it as-is
        deltaToken = deltaLink;
      }
    }

    return {
      records,
      total: records.length,
      hasMore: !!data['@odata.nextLink'] || !!deltaLink,
      cursor: data['@odata.nextLink'] || deltaToken,
      // Store delta token in metadata for next sync
      ...(deltaToken && { metadata: { deltaToken } }),
    };
  }

  /**
   * Push record to Microsoft Graph
   */
  async push(data: Record<string, any>, options: PushOptions): Promise<PushResult> {

    const { entity, operation } = options;
    let url: string;
    let method: string;

    switch (entity) {
      case 'onedrive_file':
      case 'onedrive_folder':
        if (operation === 'create') {
          url = data.parentId
            ? `/me/drive/items/${data.parentId}/children`
            : '/me/drive/root/children';
          method = 'POST';
        } else if (operation === 'update') {
          if (!data.id) {
            return { success: false, error: 'Id required for update' };
          }
          url = `/me/drive/items/${data.id}`;
          method = 'PATCH';
        } else if (operation === 'delete') {
          if (!data.id) {
            return { success: false, error: 'Id required for delete' };
          }
          url = `/me/drive/items/${data.id}`;
          method = 'DELETE';
        } else {
          return { success: false, error: `Unsupported operation: ${operation}` };
        }
        break;

      case 'teams_message':
        if (operation === 'create') {
          if (!data.channelId || !data.teamId) {
            return { success: false, error: 'teamId and channelId required' };
          }
          url = `/teams/${data.teamId}/channels/${data.channelId}/messages`;
          method = 'POST';
        } else {
          return { success: false, error: `Unsupported operation: ${operation}` };
        }
        break;

      default:
        return { success: false, error: `Unsupported entity: ${entity}` };
    }

    const result = await this.makeGraphRequest<any>(url, method as any, data);

    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      externalId: result.data?.id,
      details: result.data,
    };
  }

  /**
   * Get entity schema
   */
  async getEntitySchema(entityName: string): Promise<IntegrationEntity | null> {
    const entity = ENTITIES.find(e => e.name === entityName);
    return entity || null;
  }

  /**
   * List available entities
   */
  async listEntities(): Promise<IntegrationEntity[]> {
    return ENTITIES;
  }

  /**
   * Search across Microsoft Graph entities
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const startTime = Date.now();

    const { query, entities, limit = 20, offset = 0, externalUserId } = options;

    // Use externalUserId if provided, otherwise fall back to /me
    const userPath = externalUserId ? `/users/${externalUserId}` : '/me';

    const results: SearchResultItem[] = [];
    const entitiesToSearch = entities || ['onedrive_file', 'teams_message'];

    for (const entity of entitiesToSearch) {
      try {
        let searchUrl: string;

        switch (entity) {
          case 'onedrive_file':
            searchUrl = `${userPath}/drive/root/search(q='${encodeURIComponent(query)}')`;
            break;

          case 'teams_message':
            // Search in all teams the user is a member of
            searchUrl = `${userPath}/messages?$search="${encodeURIComponent(query)}"`;
            break;

          default:
            continue;
        }

        const result = await this.makeGraphRequest<GraphResponse<any>>(searchUrl);

        if (result.data) {
          const items: SearchResultItem[] = result.data.value.slice(0, limit).map((item: any) => ({
            id: item.id,
            entity,
            title: item.name || item.subject || item.body?.content?.substring(0, 100) || '',
            description: this.buildDescription(item, entity),
            url: item.webUrl || item.webLink,
            metadata: {
              created: item.createdDateTime,
              modified: item.lastModifiedDateTime,
            },
            score: this.calculateRelevanceScore(query, item, entity),
            integrationId: this.integrationId,
            integrationName: this.integrationId,
            providerName: 'Microsoft Graph',
          }));

          results.push(...items);
        }
      } catch (error: unknown) {
        this.monitoring.trackException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'microsoft-graph.search',
            entity,
          }
        );
      }
    }

    // Sort by relevance and limit
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total: results.length,
      took: Date.now() - startTime,
      hasMore: results.length > offset + limit,
    };
  }

  /**
   * Register webhook subscription for Microsoft Graph
   */
  async registerWebhook(
    events: string[],
    callbackUrl: string,
    resource: string = '/me/drive/root'
  ): Promise<{ webhookId: string; expirationDateTime: Date }> {
    // Microsoft Graph uses subscriptions API
    const subscription = {
      changeType: events.join(','), // e.g., 'created,updated,deleted'
      notificationUrl: callbackUrl,
      resource,
      expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      clientState: `castiel-${this.tenantId}-${Date.now()}`,
    };

    const result = await this.makeGraphRequest<{
      id: string;
      expirationDateTime: string;
    }>('/subscriptions', 'POST', subscription);

    if (result.error || !result.data) {
      throw new Error(`Failed to register webhook: ${result.error || 'Unknown error'}`);
    }

    return {
      webhookId: result.data.id,
      expirationDateTime: new Date(result.data.expirationDateTime),
    };
  }

  /**
   * Unregister webhook subscription
   */
  async unregisterWebhook(webhookId: string): Promise<void> {
    const result = await this.makeGraphRequest(`/subscriptions/${webhookId}`, 'DELETE');

    if (result.error) {
      throw new Error(`Failed to unregister webhook: ${result.error}`);
    }
  }

  /**
   * Parse Microsoft Graph webhook
   */
  parseWebhook(payload: any, _headers: Record<string, string>): WebhookEvent | null {
    // Microsoft Graph webhooks use subscription notifications
    if (payload.value && Array.isArray(payload.value)) {
      const notification = payload.value[0];
      return {
        type: notification.changeType || 'update',
        entity: notification.resource || 'unknown',
        externalId: notification.resourceData?.id || '',
        operation: this.mapChangeType(notification.changeType),
        data: notification.resourceData || {},
        timestamp: new Date(notification.clientState || Date.now()),
      };
    }

    return null;
  }

  // =====================
  // Private Helper Methods
  // =====================

  private normalizeRecord(record: any, entity: string): Record<string, any> {
    const normalized: Record<string, any> = {
      id: record.id,
      name: record.name || record.displayName || record.subject,
      created: record.createdDateTime,
      modified: record.lastModifiedDateTime,
    };

    // Entity-specific normalization
    switch (entity) {
      case 'onedrive_file':
      case 'onedrive_folder':
        normalized.webUrl = record.webUrl;
        normalized.size = record.size;
        normalized.folder = record.folder;
        normalized.file = record.file;
        break;

      case 'teams_message':
        normalized.body = record.body?.content;
        normalized.from = record.from;
        normalized.channelId = record.channelIdentity?.channelId;
        normalized.teamId = record.channelIdentity?.teamId;
        break;

      case 'teams_channel':
        normalized.description = record.description;
        normalized.membershipType = record.membershipType;
        break;

      case 'teams_team':
        normalized.description = record.description;
        break;
    }

    return normalized;
  }

  private buildDescription(item: any, entity: string): string {
    switch (entity) {
      case 'onedrive_file':
        return `${item.name} (${item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'Unknown size'})`;
      case 'teams_message':
        return item.body?.content?.substring(0, 200) || '';
      default:
        return '';
    }
  }

  private calculateRelevanceScore(query: string, record: any, _entity: string): number {
    const queryLower = query.toLowerCase();
    let score = 0.5;

    const name = record.name || record.displayName || record.subject || '';
    if (name.toLowerCase().includes(queryLower)) {
      score = 0.9;
    }

    if (record.body?.content?.toLowerCase().includes(queryLower)) {
      score = Math.max(score, 0.7);
    }

    return Math.min(score, 1.0);
  }

  private mapChangeType(changeType: string): 'create' | 'update' | 'delete' {
    if (changeType === 'created') {return 'create';}
    if (changeType === 'deleted') {return 'delete';}
    return 'update';
  }
}

// ============================================
// Entity Definitions
// ============================================

const ONEDRIVE_FILE_ENTITY: IntegrationEntity = {
  name: 'onedrive_file',
  displayName: 'OneDrive File',
  description: 'Files stored in OneDrive',
  fields: [
    { name: 'id', displayName: 'ID', type: 'string', required: true },
    { name: 'name', displayName: 'Name', type: 'string', required: true },
    { name: 'webUrl', displayName: 'Web URL', type: 'string', required: false },
    { name: 'size', displayName: 'Size', type: 'number', required: false },
    { name: 'createdDateTime', displayName: 'Created', type: 'datetime', required: false },
    { name: 'lastModifiedDateTime', displayName: 'Modified', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'lastModifiedDateTime',
};

const ONEDRIVE_FOLDER_ENTITY: IntegrationEntity = {
  name: 'onedrive_folder',
  displayName: 'OneDrive Folder',
  description: 'Folders in OneDrive',
  fields: [
    { name: 'id', displayName: 'ID', type: 'string', required: true },
    { name: 'name', displayName: 'Name', type: 'string', required: true },
    { name: 'webUrl', displayName: 'Web URL', type: 'string', required: false },
    { name: 'createdDateTime', displayName: 'Created', type: 'datetime', required: false },
    { name: 'lastModifiedDateTime', displayName: 'Modified', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'lastModifiedDateTime',
};

const TEAMS_MESSAGE_ENTITY: IntegrationEntity = {
  name: 'teams_message',
  displayName: 'Teams Message',
  description: 'Messages in Microsoft Teams channels',
  fields: [
    { name: 'id', displayName: 'ID', type: 'string', required: true },
    { name: 'body', displayName: 'Body', type: 'string', required: true },
    { name: 'createdDateTime', displayName: 'Created', type: 'datetime', required: false },
    { name: 'from', displayName: 'From', type: 'object', required: false },
    { name: 'channelId', displayName: 'Channel ID', type: 'string', required: false },
    { name: 'teamId', displayName: 'Team ID', type: 'string', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: false,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'lastModifiedDateTime',
};

const TEAMS_CHANNEL_ENTITY: IntegrationEntity = {
  name: 'teams_channel',
  displayName: 'Teams Channel',
  description: 'Channels in Microsoft Teams',
  fields: [
    { name: 'id', displayName: 'ID', type: 'string', required: true },
    { name: 'displayName', displayName: 'Name', type: 'string', required: true },
    { name: 'description', displayName: 'Description', type: 'string', required: false },
    { name: 'createdDateTime', displayName: 'Created', type: 'datetime', required: false },
    { name: 'teamId', displayName: 'Team ID', type: 'string', required: true },
  ],
  supportsPull: true,
  supportsPush: false,
  supportsDelete: false,
  supportsWebhook: false,
  idField: 'id',
  modifiedField: 'createdDateTime',
};

const TEAMS_TEAM_ENTITY: IntegrationEntity = {
  name: 'teams_team',
  displayName: 'Teams Team',
  description: 'Microsoft Teams teams',
  fields: [
    { name: 'id', displayName: 'ID', type: 'string', required: true },
    { name: 'displayName', displayName: 'Name', type: 'string', required: true },
    { name: 'description', displayName: 'Description', type: 'string', required: false },
    { name: 'createdDateTime', displayName: 'Created', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: false,
  supportsDelete: false,
  supportsWebhook: false,
  idField: 'id',
  modifiedField: 'createdDateTime',
};

const ENTITIES: IntegrationEntity[] = [
  ONEDRIVE_FILE_ENTITY,
  ONEDRIVE_FOLDER_ENTITY,
  TEAMS_MESSAGE_ENTITY,
  TEAMS_CHANNEL_ENTITY,
  TEAMS_TEAM_ENTITY,
];

// ============================================
// Integration Definition
// ============================================

export const MICROSOFT_GRAPH_DEFINITION: IntegrationDefinition = {
  id: 'microsoft-graph',
  name: 'microsoft_graph',
  displayName: 'Microsoft Graph',
  description: 'Integrate with Microsoft 365 services: Teams, OneDrive, Outlook, and more',
  category: IntegrationCategory.COMMUNICATION,
  icon: 'microsoft',
  color: '#0078D4',
  visibility: 'public',
  isPremium: false,
  capabilities: ['read', 'write', 'delete', 'search', 'realtime'],
  supportedSyncDirections: ['pull', 'push', 'bidirectional'],
  supportsRealtime: true,
  supportsWebhooks: true,
  authType: 'oauth2',
  oauthConfig: {
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    revokeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
    scopes: [
      'https://graph.microsoft.com/Files.Read',
      'https://graph.microsoft.com/Files.ReadWrite',
      'https://graph.microsoft.com/Sites.Read.All',
      'https://graph.microsoft.com/Team.ReadBasic.All',
      'https://graph.microsoft.com/Channel.ReadBasic.All',
      'https://graph.microsoft.com/Chat.Read',
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Calendars.Read',
      'https://graph.microsoft.com/User.Read',
    ],
    clientIdEnvVar: 'MICROSOFT_GRAPH_CLIENT_ID',
    clientSecretEnvVar: 'MICROSOFT_GRAPH_CLIENT_SECRET',
    redirectUri: '/api/integrations/oauth/callback',
    pkce: true,
    additionalParams: {
      response_mode: 'query',
    },
  },
  availableEntities: ENTITIES,
  connectionScope: 'tenant',
  status: 'active',
  version: '1.0.0',
  documentationUrl: 'https://docs.microsoft.com/en-us/graph/overview',
  supportUrl: 'https://docs.microsoft.com/en-us/graph/overview',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// Factory & Registration
// ============================================

export const microsoftGraphAdapterFactory: IntegrationAdapterFactory = {
  create(monitoring, connectionService, tenantId, connectionId) {
    return new MicrosoftGraphAdapter(monitoring, connectionService, tenantId, connectionId);
  },
};

// Register adapter
adapterRegistry.register('microsoft-graph', microsoftGraphAdapterFactory);

