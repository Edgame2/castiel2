/**
 * HubSpot Integration Adapter
 * Connects to HubSpot CRM API
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

const HUBSPOT_API_BASE_URL = 'https://api.hubapi.com';

// ============================================
// HubSpot API Types
// ============================================

interface HubSpotResponse<T> {
  results: T[];
  paging?: {
    next?: {
      after: string;
    };
  };
}

interface HubSpotObject {
  id: string;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// HubSpot Adapter Implementation
// ============================================

/**
 * HubSpot Integration Adapter
 */
export class HubSpotAdapter extends BaseIntegrationAdapter {
  private accessToken: string | null = null;

  constructor(
    monitoring: IMonitoringProvider,
    connectionService: IntegrationConnectionService,
    tenantId: string,
    connectionId: string
  ) {
    super(monitoring, connectionService, 'hubspot', tenantId, connectionId);
  }

  /**
   * Get HubSpot integration definition
   */
  getDefinition(): IntegrationDefinition {
    return HUBSPOT_DEFINITION;
  }

  /**
   * Initialize with access token
   */
  private async initialize(): Promise<void> {
    if (this.accessToken) {return;}

    const credentials = await this.connectionService.getDecryptedCredentials(
      this.connectionId,
      this.integrationId
    );

    if (credentials?.type === 'oauth2' && credentials.accessToken) {
      this.accessToken = credentials.accessToken;
    } else if (credentials?.type === 'api_key' && credentials.apiKey) {
      this.accessToken = credentials.apiKey;
    } else {
      throw new Error('HubSpot credentials not found or invalid');
    }
  }

  /**
   * Make authenticated request to HubSpot API
   */
  private async makeHubSpotRequest<T>(
    url: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<{ data?: T; error?: string }> {
    await this.initialize();

    const fullUrl = url.startsWith('http') ? url : `${HUBSPOT_API_BASE_URL}${url}`;

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
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
      await this.initialize();

      // HubSpot uses /integrations/v1/me endpoint
      const result = await this.makeHubSpotRequest<{
        portalId: number;
        user: string;
        userId: number;
        email?: string;
        appId?: number;
      }>('/integrations/v1/me');

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to get user profile');
      }

      const profile = result.data;
      return {
        id: profile.userId.toString(),
        email: profile.email || profile.user,
        name: profile.user,
        portalId: profile.portalId,
        appId: profile.appId,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'hubspot.getUserProfile',
        tenantId: this.tenantId,
      });
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Test HubSpot connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const result = await this.makeHubSpotRequest<{ user: string }>('/integrations/v1/me');

      if (result.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        details: {
          user: result.data?.user,
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
   * Fetch records from HubSpot
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    await this.initialize();

    const { entity, filters, limit, offset } = options;

    // Map entity names to HubSpot object types
    const objectTypeMap: Record<string, string> = {
      contact: 'contacts',
      company: 'companies',
      deal: 'deals',
      ticket: 'tickets',
      product: 'products',
      line_item: 'line_items',
    };

    const objectType = objectTypeMap[entity] || entity;
    let url = `/crm/v3/objects/${objectType}`;

    // Build query parameters
    const params: Record<string, any> = {};
    if (limit) {params.limit = limit;}
    if (offset) {params.after = offset;}

      // Add property filters
      if (filters) {
        const properties: string[] = [];
        for (const [key] of Object.entries(filters)) {
          if (key !== 'after' && key !== 'limit') {
            properties.push(key);
          }
        }
      if (properties.length > 0) {
        params.properties = properties.join(',');
      }
    }

    const queryString = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const result = await this.makeHubSpotRequest<HubSpotResponse<HubSpotObject>>(url);

    if (result.error) {
      this.monitoring.trackEvent('hubspot.fetch.error', {
        entity,
        error: result.error,
      });
      return { records: [], hasMore: false };
    }

    const data = result.data!;
    const records = data.results.map(r => this.normalizeRecord(r, entity));

    return {
      records,
      total: records.length,
      hasMore: !!data.paging?.next,
      cursor: data.paging?.next?.after,
    };
  }

  /**
   * Push record to HubSpot
   */
  async push(data: Record<string, any>, options: PushOptions): Promise<PushResult> {
    await this.initialize();

    const { entity, operation } = options;

    // Map entity names to HubSpot object types
    const objectTypeMap: Record<string, string> = {
      contact: 'contacts',
      company: 'companies',
      deal: 'deals',
      ticket: 'tickets',
      product: 'products',
      line_item: 'line_items',
    };

    const objectType = objectTypeMap[entity] || entity;
    let url: string;
    let method: string;
    let body: any;

    // Extract properties from data
    const { id, ...properties } = data;
    const payload = {
      properties,
    };

    switch (operation) {
      case 'create':
        url = `/crm/v3/objects/${objectType}`;
        method = 'POST';
        body = payload;
        break;

      case 'update':
        if (!id) {
          return { success: false, error: 'Id required for update' };
        }
        url = `/crm/v3/objects/${objectType}/${id}`;
        method = 'PATCH';
        body = payload;
        break;

      case 'upsert':
        url = `/crm/v3/objects/${objectType}/${id || 'create'}`;
        method = 'PATCH';
        body = payload;
        break;

      case 'delete':
        if (!id) {
          return { success: false, error: 'Id required for delete' };
        }
        url = `/crm/v3/objects/${objectType}/${id}`;
        method = 'DELETE';
        break;

      default:
        return { success: false, error: `Unsupported operation: ${operation}` };
    }

    const result = await this.makeHubSpotRequest<any>(url, method as any, body);

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
   * Search across HubSpot entities
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    await this.initialize();
    const startTime = Date.now();

    const { query, entities, limit = 20, offset = 0 } = options;

    const results: SearchResultItem[] = [];
    const entitiesToSearch = entities || ['contact', 'company', 'deal'];

    for (const entity of entitiesToSearch) {
      try {
        const objectTypeMap: Record<string, string> = {
          contact: 'contacts',
          company: 'companies',
          deal: 'deals',
          ticket: 'tickets',
        };

        const objectType = objectTypeMap[entity] || entity;
        const searchUrl = `/crm/v3/objects/${objectType}/search`;

        const searchBody = {
          query,
          limit,
          properties: this.getSearchPropertiesForEntity(entity),
        };

        const result = await this.makeHubSpotRequest<HubSpotResponse<HubSpotObject>>(
          searchUrl,
          'POST',
          searchBody
        );

        if (result.data) {
          const items: SearchResultItem[] = result.data.results.slice(0, limit).map((item: any) => {
            const name = item.properties?.name || item.properties?.firstname || item.properties?.dealname || '';
            return {
              id: item.id,
              entity,
              title: name,
              description: this.buildDescription(item, entity),
              url: `https://app.hubspot.com/${objectType}/${item.id}`,
              metadata: {
                created: item.createdAt,
                modified: item.updatedAt,
              },
              score: this.calculateRelevanceScore(query, item, entity),
              integrationId: this.integrationId,
              integrationName: this.integrationId,
              providerName: 'HubSpot',
            };
          });

          results.push(...items);
        }
      } catch (error: any) {
        this.monitoring.trackException(error, {
          operation: 'hubspot.search',
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
   * Register webhook subscription for HubSpot
   */
  async registerWebhook(
    events: string[],
    callbackUrl: string
  ): Promise<{ webhookId: string; secret?: string }> {
    await this.initialize();

    // HubSpot uses webhooks API v3
    const subscription = {
      eventType: events, // e.g., ['contact.creation', 'contact.propertyChange']
      propertyName: null, // Can specify specific property to watch
      active: true,
    };

    // Create webhook subscription
    const result = await this.makeHubSpotRequest<{
      subscriptionId: number;
      portalId: number;
    }>('/webhooks/v3/subscriptions', 'POST', subscription);

    if (result.error || !result.data) {
      throw new Error(`Failed to register webhook: ${result.error || 'Unknown error'}`);
    }

    // Update webhook URL (separate call)
    await this.makeHubSpotRequest(
      `/webhooks/v3/subscriptions/${result.data.subscriptionId}`,
      'PATCH',
      { eventUrl: callbackUrl }
    );

    return {
      webhookId: String(result.data.subscriptionId),
      // HubSpot doesn't provide a secret in the response, but we can generate one
      secret: undefined,
    };
  }

  /**
   * Unregister webhook subscription
   */
  async unregisterWebhook(webhookId: string): Promise<void> {
    await this.initialize();

    const result = await this.makeHubSpotRequest(`/webhooks/v3/subscriptions/${webhookId}`, 'DELETE');

    if (result.error) {
      throw new Error(`Failed to unregister webhook: ${result.error}`);
    }
  }

  /**
   * Verify webhook signature (HubSpot uses HMAC SHA256)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Parse HubSpot webhook
   */
  parseWebhook(payload: any, _headers: Record<string, string>): WebhookEvent | null {
    // HubSpot webhooks use subscription notifications
    if (payload.subscriptionId && payload.eventId) {
      const event = payload.events?.[0];
      if (event) {
        return {
          type: event.subscriptionType || 'unknown',
          entity: event.objectType || 'unknown',
          externalId: event.objectId || '',
          operation: this.mapChangeType(event.eventType),
          data: event.properties || {},
          timestamp: new Date(event.occurredAt || Date.now()),
        };
      }
    }

    return null;
  }

  // =====================
  // Private Helper Methods
  // =====================

  private normalizeRecord(record: HubSpotObject, _entity: string): Record<string, any> {
    return {
      id: record.id,
      ...record.properties,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private buildDescription(item: any, entity: string): string {
    const props = item.properties || {};
    switch (entity) {
      case 'contact':
        return `${props.firstname || ''} ${props.lastname || ''} - ${props.email || ''}`.trim();
      case 'company':
        return props.domain || props.name || '';
      case 'deal':
        return `${props.dealname || ''} - ${props.amount || ''}`.trim();
      default:
        return props.name || props.title || '';
    }
  }

  private calculateRelevanceScore(query: string, record: any, _entity: string): number {
    const queryLower = query.toLowerCase();
    let score = 0.5;

    const props = record.properties || {};
    const name = props.name || props.firstname || props.dealname || '';
    if (name.toLowerCase().includes(queryLower)) {
      score = 0.9;
    }

    if (props.email?.toLowerCase().includes(queryLower)) {
      score = Math.max(score, 0.8);
    }

    return Math.min(score, 1.0);
  }

  private mapChangeType(eventType: string): 'create' | 'update' | 'delete' {
    if (eventType === 'contact.creation' || eventType === 'company.creation' || eventType === 'deal.creation') {
      return 'create';
    }
    if (eventType === 'contact.deletion' || eventType === 'company.deletion' || eventType === 'deal.deletion') {
      return 'delete';
    }
    return 'update';
  }

  private getSearchPropertiesForEntity(entity: string): string[] {
    const propertyMap: Record<string, string[]> = {
      contact: ['firstname', 'lastname', 'email', 'phone', 'company'],
      company: ['name', 'domain', 'industry', 'city'],
      deal: ['dealname', 'amount', 'dealstage', 'pipeline'],
      ticket: ['subject', 'content', 'priority', 'status'],
    };

    return propertyMap[entity] || ['name'];
  }
}

// ============================================
// Entity Definitions
// ============================================

const CONTACT_ENTITY: IntegrationEntity = {
  name: 'contact',
  displayName: 'Contact',
  description: 'HubSpot contacts',
  fields: [
    { name: 'id', displayName: 'ID', type: 'string', required: true },
    { name: 'firstname', displayName: 'First Name', type: 'string', required: false },
    { name: 'lastname', displayName: 'Last Name', type: 'string', required: false },
    { name: 'email', displayName: 'Email', type: 'string', required: false },
    { name: 'phone', displayName: 'Phone', type: 'string', required: false },
    { name: 'company', displayName: 'Company', type: 'string', required: false },
    { name: 'createdAt', displayName: 'Created', type: 'datetime', required: false },
    { name: 'updatedAt', displayName: 'Updated', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'updatedAt',
};

const COMPANY_ENTITY: IntegrationEntity = {
  name: 'company',
  displayName: 'Company',
  description: 'HubSpot companies',
  fields: [
    { name: 'id', displayName: 'ID', type: 'string', required: true },
    { name: 'name', displayName: 'Name', type: 'string', required: true },
    { name: 'domain', displayName: 'Domain', type: 'string', required: false },
    { name: 'industry', displayName: 'Industry', type: 'string', required: false },
    { name: 'city', displayName: 'City', type: 'string', required: false },
    { name: 'createdAt', displayName: 'Created', type: 'datetime', required: false },
    { name: 'updatedAt', displayName: 'Updated', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'updatedAt',
};

const DEAL_ENTITY: IntegrationEntity = {
  name: 'deal',
  displayName: 'Deal',
  description: 'HubSpot deals',
  fields: [
    { name: 'id', displayName: 'ID', type: 'string', required: true },
    { name: 'dealname', displayName: 'Deal Name', type: 'string', required: true },
    { name: 'amount', displayName: 'Amount', type: 'number', required: false },
    { name: 'dealstage', displayName: 'Deal Stage', type: 'string', required: false },
    { name: 'pipeline', displayName: 'Pipeline', type: 'string', required: false },
    { name: 'createdAt', displayName: 'Created', type: 'datetime', required: false },
    { name: 'updatedAt', displayName: 'Updated', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'updatedAt',
};

const TICKET_ENTITY: IntegrationEntity = {
  name: 'ticket',
  displayName: 'Ticket',
  description: 'HubSpot tickets',
  fields: [
    { name: 'id', displayName: 'ID', type: 'string', required: true },
    { name: 'subject', displayName: 'Subject', type: 'string', required: true },
    { name: 'content', displayName: 'Content', type: 'string', required: false },
    { name: 'priority', displayName: 'Priority', type: 'string', required: false },
    { name: 'status', displayName: 'Status', type: 'string', required: false },
    { name: 'createdAt', displayName: 'Created', type: 'datetime', required: false },
    { name: 'updatedAt', displayName: 'Updated', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: true,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'updatedAt',
};

const ENTITIES: IntegrationEntity[] = [CONTACT_ENTITY, COMPANY_ENTITY, DEAL_ENTITY, TICKET_ENTITY];

// ============================================
// Integration Definition
// ============================================

export const HUBSPOT_DEFINITION: IntegrationDefinition = {
  id: 'hubspot',
  name: 'hubspot',
  displayName: 'HubSpot',
  description: 'Integrate with HubSpot CRM: contacts, companies, deals, and tickets',
  category: IntegrationCategory.CRM,
  icon: 'hubspot',
  color: '#FF7A59',
  visibility: 'public',
  isPremium: false,
  capabilities: ['read', 'write', 'delete', 'search'],
  supportedSyncDirections: ['pull', 'push', 'bidirectional'],
  supportsRealtime: true,
  supportsWebhooks: true,
  authType: 'oauth2',
  oauthConfig: {
    authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    revokeUrl: 'https://api.hubapi.com/oauth/v1/revoke',
    scopes: [
      'contacts',
      'content',
      'files',
      'forms',
      'tickets',
      'timeline',
    ],
    clientIdEnvVar: 'HUBSPOT_CLIENT_ID',
    clientSecretEnvVar: 'HUBSPOT_CLIENT_SECRET',
    redirectUri: '/api/integrations/oauth/callback',
    pkce: false,
  },
  availableEntities: ENTITIES,
  connectionScope: 'tenant',
  status: 'active',
  version: '1.0.0',
  documentationUrl: 'https://developers.hubspot.com/docs/api/overview',
  supportUrl: 'https://developers.hubspot.com/support',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// Factory & Registration
// ============================================

export const hubspotAdapterFactory: IntegrationAdapterFactory = {
  create(monitoring, connectionService, tenantId, connectionId) {
    return new HubSpotAdapter(monitoring, connectionService, tenantId, connectionId);
  },
};

// Register adapter
adapterRegistry.register('hubspot', hubspotAdapterFactory);

