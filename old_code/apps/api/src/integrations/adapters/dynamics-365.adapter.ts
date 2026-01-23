/**
 * Dynamics 365 Integration Adapter
 * Connects to Dynamics 365 CRM via OData API
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
} from '@castiel/api-core';
import {
  IntegrationDefinition,
  IntegrationCategory,
  IntegrationEntity,
  SearchOptions,
  SearchResult,
  SearchResultItem,
} from '../../types/integration.types.js';

// ============================================
// Dynamics 365 API Types
// ============================================

interface DynamicsODataResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
}

interface DynamicsEntity {
  [key: string]: any;
  '@odata.etag'?: string;
}

// ============================================
// Dynamics 365 Adapter Implementation
// ============================================

/**
 * Dynamics 365 Integration Adapter
 */
export class Dynamics365Adapter extends BaseIntegrationAdapter {
  private organizationUrl: string = '';
  private apiVersion: string = 'v9.2';

  constructor(
    monitoring: IMonitoringProvider,
    connectionService: IntegrationConnectionService,
    tenantId: string,
    connectionId: string
  ) {
    super(monitoring, connectionService, 'dynamics-365', tenantId, connectionId);
  }

  /**
   * Get Dynamics 365 integration definition
   */
  getDefinition(): IntegrationDefinition {
    return DYNAMICS_365_DEFINITION;
  }

  /**
   * Initialize with organization URL from connection
   */
  private async initialize(): Promise<void> {
    if (this.organizationUrl) {return;}

    const credentials = await this.connectionService.getDecryptedCredentials(
      this.connectionId,
      this.integrationId
    );

    if (credentials?.type === 'oauth2') {
      // Organization URL is typically stored in connection metadata or environment variable
      // ConnectionCredentials type doesn't include organizationUrl, so we use env var
      this.organizationUrl = process.env.DYNAMICS_365_ORG_URL || '';
      
      // If not in env, try to get from connection document metadata
      // This would require accessing the connection repository, which is not directly available
      // For now, organizationUrl must be set via environment variable
    }

    if (!this.organizationUrl) {
      throw new Error('Dynamics 365 organization URL not configured');
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

    return parts.length > 0 ? parts.join('&') : '';
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
      await this.initialize();

      // Dynamics 365 uses WhoAmI endpoint to get current user info
      const result = await this.makeDynamicsRequest<{
        UserId: string;
        BusinessUnitId: string;
        OrganizationId: string;
      }>('/WhoAmI');

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to get user profile');
      }

      const whoAmI = result.data;

      // Get user details from systemuser entity
      const userResult = await this.makeDynamicsRequest<DynamicsODataResponse<{
        systemuserid: string;
        fullname?: string;
        internalemailaddress?: string;
        domainname?: string;
      }>>(`/systemusers(${whoAmI.UserId})?$select=systemuserid,fullname,internalemailaddress,domainname`);

      if (userResult.error || !userResult.data?.value?.[0]) {
        // Fallback to just the UserId if we can't get full details
        return {
          id: whoAmI.UserId,
          businessUnitId: whoAmI.BusinessUnitId,
          organizationId: whoAmI.OrganizationId,
        };
      }

      const user = userResult.data.value[0];
      return {
        id: user.systemuserid,
        email: user.internalemailaddress || user.domainname,
        name: user.fullname,
        businessUnitId: whoAmI.BusinessUnitId,
        organizationId: whoAmI.OrganizationId,
        domainName: user.domainname,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'dynamics-365.getUserProfile',
        tenantId: this.tenantId,
      });
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Make authenticated request to Dynamics 365 API
   */
  private async makeDynamicsRequest<T>(
    url: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<{ data?: T; error?: string }> {
    await this.initialize();

    const fullUrl = url.startsWith('http') 
      ? url 
      : `${this.organizationUrl}/api/data/${this.apiVersion}${url}`;

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Prefer': 'return=representation',
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
   * Test Dynamics 365 connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const result = await this.makeDynamicsRequest<{ value: Array<{ name: string }> }>('/WhoAmI');

      if (result.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        details: {
          organization: this.organizationUrl,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Fetch records from Dynamics 365 with delta sync support
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    await this.initialize();

    const { entity, filters, limit, offset, incrementalSync, modifiedSince } = options;

    // Map entity names to Dynamics 365 entity set names
    const entitySetMap: Record<string, string> = {
      account: 'accounts',
      contact: 'contacts',
      opportunity: 'opportunities',
      lead: 'leads',
      case: 'incidents',
      task: 'tasks',
      appointment: 'appointments',
      email: 'emails',
    };

    const entitySetName = entitySetMap[entity] || entity;
    let url = `/${entitySetName}`;

    // Use delta sync for incremental sync
    if (incrementalSync && filters?.deltaToken) {
      url = `/${entitySetName}/Microsoft.Dynamics.CRM.GetChanges?token=${encodeURIComponent(filters.deltaToken)}`;
    } else if (incrementalSync) {
      url = `/${entitySetName}/Microsoft.Dynamics.CRM.GetChanges`;
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
      const filter = `modifiedon ge ${modifiedSince.toISOString()}`;
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

    const result = await this.makeDynamicsRequest<DynamicsODataResponse<DynamicsEntity>>(url);

    if (result.error) {
      this.monitoring.trackEvent('dynamics-365.fetch.error', {
        entity,
        error: result.error,
      });
      return { records: [], hasMore: false };
    }

    const data = result.data!;
    const records = data.value.map(r => this.normalizeRecord(r, entity));

    // Extract delta token for incremental sync
    let deltaToken: string | undefined;
    if (incrementalSync && data['@odata.deltaLink']) {
      const deltaLink = new URL(data['@odata.deltaLink']);
      deltaToken = deltaLink.searchParams.get('token') || undefined;
    }

    return {
      records,
      total: records.length,
      hasMore: !!data['@odata.nextLink'] || !!data['@odata.deltaLink'],
      cursor: data['@odata.nextLink'] || deltaToken,
      // Store delta token in metadata for next sync
      ...(deltaToken && { metadata: { deltaToken } }),
    };
  }

  /**
   * Push record to Dynamics 365
   */
  async push(data: Record<string, any>, options: PushOptions): Promise<PushResult> {
    await this.initialize();

    const { entity, operation } = options;

    // Map entity names to Dynamics 365 entity set names
    const entitySetMap: Record<string, string> = {
      account: 'accounts',
      contact: 'contacts',
      opportunity: 'opportunities',
      lead: 'leads',
      case: 'incidents',
      task: 'tasks',
      appointment: 'appointments',
      email: 'emails',
    };

    const entitySetName = entitySetMap[entity] || entity;
    let url: string;
    let method: string;

    // Extract ID from data (Dynamics uses entity name + 'id' format, e.g., accountid)
    const idField = `${entity}id`;
    const recordId = data[idField] || data.id;

    switch (operation) {
      case 'create':
        url = `/${entitySetName}`;
        method = 'POST';
        break;

      case 'update':
        if (!recordId) {
          return { success: false, error: `${idField} required for update` };
        }
        url = `/${entitySetName}(${recordId})`;
        method = 'PATCH';
        break;

      case 'upsert':
        // Upsert uses MERGE or PUT with key
        if (recordId) {
          url = `/${entitySetName}(${recordId})`;
          method = 'PATCH';
        } else {
          url = `/${entitySetName}`;
          method = 'POST';
        }
        break;

      case 'delete':
        if (!recordId) {
          return { success: false, error: `${idField} required for delete` };
        }
        url = `/${entitySetName}(${recordId})`;
        method = 'DELETE';
        break;

      default:
        return { success: false, error: `Unsupported operation: ${operation}` };
    }

    const result = await this.makeDynamicsRequest<any>(url, method as any, data);

    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      externalId: result.data?.[idField] || result.data?.id,
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
   * Search across Dynamics 365 entities
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    await this.initialize();
    const startTime = Date.now();

    const { query, entities, limit = 20, offset = 0 } = options;

    const results: SearchResultItem[] = [];
    const entitiesToSearch = entities || ['account', 'contact', 'opportunity'];

    for (const entity of entitiesToSearch) {
      try {
        const entitySetMap: Record<string, string> = {
          account: 'accounts',
          contact: 'contacts',
          opportunity: 'opportunities',
          lead: 'leads',
        };

        const entitySetName = entitySetMap[entity] || entity;
        const searchUrl = `/${entitySetName}?$filter=contains(name,'${encodeURIComponent(query)}') or contains(emailaddress1,'${encodeURIComponent(query)}')&$top=${limit}`;

        const result = await this.makeDynamicsRequest<DynamicsODataResponse<DynamicsEntity>>(searchUrl);

        if (result.data) {
          const items: SearchResultItem[] = result.data.value.slice(0, limit).map((item: any) => ({
            id: item[`${entity}id`] || item.id,
            entity,
            title: item.name || item.fullname || item.topic || '',
            description: this.buildDescription(item, entity),
            url: `${this.organizationUrl}/main.aspx?etn=${entitySetName}&id=${item[`${entity}id`] || item.id}`,
            metadata: {
              created: item.createdon,
              modified: item.modifiedon,
            },
            score: this.calculateRelevanceScore(query, item, entity),
            integrationId: this.integrationId,
            integrationName: this.integrationId,
            providerName: 'Dynamics 365',
          }));

          results.push(...items);
        }
      } catch (error: any) {
        this.monitoring.trackException(error, {
          operation: 'dynamics-365.search',
          entity,
        });
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
   * Register webhook subscription for Dynamics 365
   * Note: Dynamics 365 uses Azure Service Bus or webhooks for change notifications
   */
  async registerWebhook(
    events: string[],
    callbackUrl: string
  ): Promise<{ webhookId: string; expirationDateTime?: Date }> {
    // Dynamics 365 uses Azure Service Bus or webhooks
    // This is a placeholder - actual implementation depends on Dynamics 365 version
    // and whether using Service Bus or webhooks
    throw new Error('Webhook registration for Dynamics 365 requires Azure Service Bus configuration');
  }

  /**
   * Unregister webhook subscription
   */
  async unregisterWebhook(webhookId: string): Promise<void> {
    // Placeholder - implement based on webhook registration method
    throw new Error('Webhook unregistration for Dynamics 365 requires Azure Service Bus configuration');
  }

  /**
   * Parse Dynamics 365 webhook
   */
  parseWebhook(payload: any, _headers: Record<string, string>): WebhookEvent | null {
    // Dynamics 365 webhooks use Azure Service Bus messages
    if (payload.PluginExecutionContext && payload.PluginExecutionContext.InputParameters) {
      const context = payload.PluginExecutionContext;
      return {
        type: context.MessageName || 'unknown',
        entity: context.PrimaryEntityName || 'unknown',
        externalId: context.PrimaryEntityId || '',
        operation: this.mapChangeType(context.MessageName),
        data: context.InputParameters || {},
        timestamp: new Date(context.OperationCreatedOn || Date.now()),
      };
    }

    return null;
  }

  // =====================
  // Private Helper Methods
  // =====================

  private normalizeRecord(record: DynamicsEntity, entity: string): Record<string, any> {
    const normalized: Record<string, any> = {
      id: record[`${entity}id`] || record.id,
      ...record,
    };

    // Remove OData metadata
    delete normalized['@odata.etag'];
    delete normalized['@odata.id'];
    delete normalized['@odata.type'];

    return normalized;
  }

  private buildDescription(item: any, entity: string): string {
    switch (entity) {
      case 'account':
        return item.name || '';
      case 'contact':
        return `${item.firstname || ''} ${item.lastname || ''} - ${item.emailaddress1 || ''}`.trim();
      case 'opportunity':
        return `${item.name || item.topic || ''} - ${item.estimatedvalue || ''}`.trim();
      default:
        return item.name || item.topic || '';
    }
  }

  private calculateRelevanceScore(query: string, record: any, _entity: string): number {
    const queryLower = query.toLowerCase();
    let score = 0.5;

    const name = record.name || record.fullname || record.topic || '';
    if (name.toLowerCase().includes(queryLower)) {
      score = 0.9;
    }

    if (record.emailaddress1?.toLowerCase().includes(queryLower)) {
      score = Math.max(score, 0.8);
    }

    return Math.min(score, 1.0);
  }

  private mapChangeType(messageName: string): 'create' | 'update' | 'delete' {
    if (messageName === 'Create') {return 'create';}
    if (messageName === 'Delete') {return 'delete';}
    return 'update';
  }
}

// ============================================
// Entity Definitions
// ============================================

const ACCOUNT_ENTITY: IntegrationEntity = {
  name: 'account',
  displayName: 'Account',
  description: 'Dynamics 365 accounts (companies)',
  fields: [
    { name: 'accountid', displayName: 'Account ID', type: 'string', required: true },
    { name: 'name', displayName: 'Name', type: 'string', required: true },
    { name: 'emailaddress1', displayName: 'Email', type: 'string', required: false },
    { name: 'telephone1', displayName: 'Phone', type: 'string', required: false },
    { name: 'websiteurl', displayName: 'Website', type: 'string', required: false },
    { name: 'createdon', displayName: 'Created', type: 'datetime', required: false },
    { name: 'modifiedon', displayName: 'Modified', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'accountid',
  modifiedField: 'modifiedon',
};

const CONTACT_ENTITY: IntegrationEntity = {
  name: 'contact',
  displayName: 'Contact',
  description: 'Dynamics 365 contacts',
  fields: [
    { name: 'contactid', displayName: 'Contact ID', type: 'string', required: true },
    { name: 'firstname', displayName: 'First Name', type: 'string', required: false },
    { name: 'lastname', displayName: 'Last Name', type: 'string', required: true },
    { name: 'emailaddress1', displayName: 'Email', type: 'string', required: false },
    { name: 'telephone1', displayName: 'Phone', type: 'string', required: false },
    { name: 'createdon', displayName: 'Created', type: 'datetime', required: false },
    { name: 'modifiedon', displayName: 'Modified', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'contactid',
  modifiedField: 'modifiedon',
};

const OPPORTUNITY_ENTITY: IntegrationEntity = {
  name: 'opportunity',
  displayName: 'Opportunity',
  description: 'Dynamics 365 opportunities (deals)',
  fields: [
    { name: 'opportunityid', displayName: 'Opportunity ID', type: 'string', required: true },
    { name: 'name', displayName: 'Name', type: 'string', required: true },
    { name: 'estimatedvalue', displayName: 'Estimated Value', type: 'number', required: false },
    { name: 'closeprobability', displayName: 'Close Probability', type: 'number', required: false },
    { name: 'estimatedclosedate', displayName: 'Estimated Close Date', type: 'datetime', required: false },
    { name: 'createdon', displayName: 'Created', type: 'datetime', required: false },
    { name: 'modifiedon', displayName: 'Modified', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'opportunityid',
  modifiedField: 'modifiedon',
};

const ENTITIES: IntegrationEntity[] = [
  ACCOUNT_ENTITY,
  CONTACT_ENTITY,
  OPPORTUNITY_ENTITY,
];

// ============================================
// Integration Definition
// ============================================

export const DYNAMICS_365_DEFINITION: IntegrationDefinition = {
  id: 'dynamics-365',
  name: 'dynamics_365',
  displayName: 'Dynamics 365',
  description: 'Integrate with Dynamics 365 CRM: accounts, contacts, opportunities, and more',
  category: IntegrationCategory.CRM,
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
      'https://graph.microsoft.com/.default',
      'https://yourorg.crm.dynamics.com/.default',
    ],
    clientIdEnvVar: 'DYNAMICS_365_CLIENT_ID',
    clientSecretEnvVar: 'DYNAMICS_365_CLIENT_SECRET',
    redirectUri: '/api/integrations/oauth/callback',
    pkce: true,
    additionalParams: {
      resource: 'https://yourorg.crm.dynamics.com',
    },
  },
  availableEntities: ENTITIES,
  connectionScope: 'tenant',
  status: 'active',
  version: '1.0.0',
  documentationUrl: 'https://docs.microsoft.com/en-us/dynamics365/customerengagement/on-premises/developer/overview',
  supportUrl: 'https://docs.microsoft.com/en-us/dynamics365/customerengagement/on-premises/developer/overview',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// Factory & Registration
// ============================================

export const dynamics365AdapterFactory: IntegrationAdapterFactory = {
  create(monitoring, connectionService, tenantId, connectionId) {
    return new Dynamics365Adapter(monitoring, connectionService, tenantId, connectionId);
  },
};

// Register adapter
adapterRegistry.register('dynamics-365', dynamics365AdapterFactory);






