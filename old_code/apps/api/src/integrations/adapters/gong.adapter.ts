/**
 * Gong Integration Adapter
 * Connects to Gong API for call data, transcripts, and analytics
 */

import { createHmac } from 'crypto';
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

const GONG_API_BASE_URL = 'https://api.gong.io/v2';

// ============================================
// Gong API Types
// ============================================

interface GongCall {
  id: string;
  direction: 'Inbound' | 'Outbound';
  started: string;
  duration: number;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserId?: string;
  toUserName?: string;
  toUserEmail?: string;
  subject: string;
  outcome: string;
  context: {
    dealId?: string;
    dealName?: string;
    accountId?: string;
    accountName?: string;
  };
  media: Array<{
    type: 'Audio' | 'Video';
    url: string;
  }>;
  transcript?: {
    id: string;
    url: string;
  };
}

interface GongTranscript {
  id: string;
  callId: string;
  sentences: Array<{
    speakerId: string;
    speakerName: string;
    text: string;
    start: number;
    end: number;
  }>;
  topics: Array<{
    name: string;
    score: number;
  }>;
  keywords: Array<{
    word: string;
    count: number;
  }>;
}

interface GongUser {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  title: string;
  team: string;
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  createdAt: string;
}

interface GongDeal {
  id: string;
  name: string;
  amount: {
    amount: number;
    currencyCode: string;
  };
  stage: string;
  probability: number;
  expectedCloseDate: string;
  ownerId: string;
  ownerName: string;
  accountId: string;
  accountName: string;
  createdAt: string;
  updatedAt: string;
}

interface GongResponse<T> {
  records?: T[];
  requestId?: string;
  cursor?: string;
  hasMore?: boolean;
}

// ============================================
// Gong Adapter Implementation
// ============================================

/**
 * Gong Integration Adapter
 */
export class GongAdapter extends BaseIntegrationAdapter {
  private accessToken: string | null = null;
  private apiKey: string | null = null;
  private apiSecret: string | null = null;

  constructor(
    monitoring: IMonitoringProvider,
    connectionService: IntegrationConnectionService,
    tenantId: string,
    connectionId: string
  ) {
    super(monitoring, connectionService, 'gong', tenantId, connectionId);
  }

  /**
   * Get Gong integration definition
   */
  getDefinition(): IntegrationDefinition {
    return GONG_DEFINITION;
  }

  /**
   * Initialize with API credentials
   * Gong uses API key + secret for authentication
   */
  private async initialize(): Promise<void> {
    if (this.accessToken) { return; }

    const credentials = await this.connectionService.getDecryptedCredentials(
      this.connectionId,
      this.integrationId
    );

    // Gong requires both API key and secret for Basic Auth
    // Since ConnectionCredentials api_key type only supports apiKey, we use custom type
    if (credentials?.type === 'custom' && credentials.data?.apiKey && credentials.data?.apiSecret) {
      this.apiKey = credentials.data.apiKey;
      this.apiSecret = credentials.data.apiSecret;
      // Gong uses Basic Auth with API key:secret as username:password
      // Encode to base64 for Authorization header
      const authString = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
      this.accessToken = authString;
    } else if (credentials?.type === 'api_key') {
      // Fallback: try to get secret from connection metadata
      // This would require accessing connection repository, which is not directly available
      // For now, require custom credentials type
      throw new Error('Gong requires both API key and secret. Please use custom credentials type with apiKey and apiSecret in data field.');
    } else {
      throw new Error('Gong requires API key authentication with secret (use custom credentials type)');
    }
  }

  /**
   * Make authenticated request to Gong API
   */
  private async makeGongRequest<T>(
    url: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<{ data?: T; error?: string }> {
    await this.initialize();

    const fullUrl = url.startsWith('http') ? url : `${GONG_API_BASE_URL}${url}`;

    const headers: Record<string, string> = {
      'Authorization': `Basic ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(fullUrl, requestOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const resetAt = retryAfter 
            ? new Date(Date.now() + parseInt(retryAfter) * 1000)
            : new Date(Date.now() + 60000);
          
          if (this.onRateLimitHit) {
            await this.onRateLimitHit(resetAt);
          }
        }

        return { error: errorMessage };
      }

      const data = await response.json();
      return { data };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'gong.request',
        url,
        method,
        tenantId: this.tenantId,
      });
      return { error: error.message || 'Request failed' };
    }
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
      // Gong doesn't have a /me endpoint, so we get users and find the API key owner
      // For now, return a placeholder - in practice, you'd need to track which user the API key belongs to
      const result = await this.makeGongRequest<GongResponse<GongUser>>('/users');

      if (result.error || !result.data?.records || result.data.records.length === 0) {
        throw new Error(result.error || 'Failed to get user profile');
      }

      // Return first user as profile (in practice, you'd match API key to user)
      const user = result.data.records[0];
      return {
        id: user.id,
        email: user.emailAddress,
        name: `${user.firstName} ${user.lastName}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        title: user.title,
        team: user.team,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'gong.getUserProfile',
        tenantId: this.tenantId,
      });
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Test Gong connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const result = await this.makeGongRequest<GongResponse<GongUser>>('/users?limit=1');

      if (result.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        details: {
          apiVersion: 'v2',
          authenticated: true,
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
   * Fetch records from Gong
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    await this.initialize();

    const { entity, filters, limit = 100, offset = 0, modifiedSince, incrementalSync } = options;
    // Get cursor from filters if provided (for incremental sync)
    const cursor = filters?.cursor as string | undefined;

    let url = '';
    let records: any[] = [];

    switch (entity) {
      case 'call':
        url = '/calls';
        if (cursor && incrementalSync) {
          url += `?cursor=${encodeURIComponent(cursor)}`;
        } else {
          url += `?limit=${limit}`;
          if (offset) {
            url += `&offset=${offset}`;
          }
        }
        if (modifiedSince) {
          url += url.includes('?') ? `&fromDateTime=${modifiedSince.toISOString()}` : `?fromDateTime=${modifiedSince.toISOString()}`;
        }
        
        const callsResult = await this.makeGongRequest<GongResponse<GongCall>>(url);
        if (callsResult.data?.records) {
          records = callsResult.data.records;
        }
        break;

      case 'transcript':
        // Transcripts are fetched by call ID
        if (filters?.callId) {
          url = `/calls/${filters.callId}/transcript`;
          const transcriptResult = await this.makeGongRequest<GongTranscript>(url);
          if (transcriptResult.data) {
            records = [transcriptResult.data];
          }
        } else {
          // Fetch calls first, then get transcripts
          const callsUrl = `/calls?limit=${limit}`;
          const callsResult = await this.makeGongRequest<GongResponse<GongCall>>(callsUrl);
          if (callsResult.data?.records) {
            // Get transcripts for each call (limited to avoid too many requests)
            const callIds = callsResult.data.records.slice(0, 10).map(c => c.id);
            for (const callId of callIds) {
              try {
                const transcriptResult = await this.makeGongRequest<GongTranscript>(`/calls/${callId}/transcript`);
                if (transcriptResult.data) {
                  records.push(transcriptResult.data);
                }
              } catch (err) {
                // Skip if transcript not available
              }
            }
          }
        }
        break;

      case 'user':
        url = '/users';
        if (limit) {
          url += `?limit=${limit}`;
        }
        if (offset) {
          url += url.includes('?') ? `&offset=${offset}` : `?offset=${offset}`;
        }
        
        const usersResult = await this.makeGongRequest<GongResponse<GongUser>>(url);
        if (usersResult.data?.records) {
          records = usersResult.data.records;
        }
        break;

      case 'deal':
        url = '/deals';
        if (limit) {
          url += `?limit=${limit}`;
        }
        if (offset) {
          url += url.includes('?') ? `&offset=${offset}` : `?offset=${offset}`;
        }
        if (modifiedSince) {
          url += url.includes('?') ? `&fromDateTime=${modifiedSince.toISOString()}` : `?fromDateTime=${modifiedSince.toISOString()}`;
        }
        
        const dealsResult = await this.makeGongRequest<GongResponse<GongDeal>>(url);
        if (dealsResult.data?.records) {
          records = dealsResult.data.records;
        }
        break;

      default:
        return { records: [], hasMore: false };
    }

    const normalizedRecords = records.map(r => this.normalizeRecord(r, entity));
    const response = entity === 'call' 
      ? await this.makeGongRequest<GongResponse<any>>(url)
      : null;

    return {
      records: normalizedRecords,
      total: normalizedRecords.length,
      hasMore: response?.data?.hasMore || records.length >= limit,
      cursor: response?.data?.cursor,
      nextOffset: records.length >= limit ? offset + limit : undefined,
    };
  }

  /**
   * Push record to Gong (limited support - Gong is primarily read-only)
   */
  async push(data: Record<string, any>, options: PushOptions): Promise<PushResult> {
    // Gong API is primarily read-only
    // Most write operations require special permissions or are not available via API
    return {
      success: false,
      error: `Push operations not supported for Gong entity: ${options.entity}. Gong API is primarily read-only.`,
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
   * Search across Gong entities
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    await this.initialize();
    const startTime = Date.now();

    const { query, entities, limit = 20, offset = 0 } = options;
    const results: SearchResultItem[] = [];
    const entitiesToSearch = entities || ['call', 'user', 'deal'];

    for (const entity of entitiesToSearch) {
      try {
        let searchUrl = '';
        
        switch (entity) {
          case 'call':
            // Gong search uses query parameter
            searchUrl = `/calls?limit=${limit}&query=${encodeURIComponent(query)}`;
            break;
          case 'user':
            searchUrl = `/users?limit=${limit}`;
            // Filter client-side by email/name
            break;
          case 'deal':
            searchUrl = `/deals?limit=${limit}`;
            // Filter client-side by name
            break;
          default:
            continue;
        }

        const result = await this.makeGongRequest<GongResponse<any>>(searchUrl);

        if (result.data?.records) {
          const items = result.data.records
            .filter((item: any) => {
              // Client-side filtering for entities without server-side search
              if (entity === 'user') {
                const searchLower = query.toLowerCase();
                return (
                  item.emailAddress?.toLowerCase().includes(searchLower) ||
                  item.firstName?.toLowerCase().includes(searchLower) ||
                  item.lastName?.toLowerCase().includes(searchLower)
                );
              }
              if (entity === 'deal') {
                return item.name?.toLowerCase().includes(query.toLowerCase());
              }
              return true; // Calls already filtered by API
            })
            .slice(0, limit)
            .map((item: any) => ({
              id: item.id,
              entity,
              title: this.getSearchTitle(item, entity),
              description: this.buildDescription(item, entity),
              url: this.getSearchUrl(item, entity),
              metadata: {
                created: item.started || item.createdAt,
                duration: item.duration,
              },
              score: this.calculateRelevanceScore(query, item, entity),
              integrationId: this.integrationId,
              integrationName: this.integrationId,
              providerName: 'Gong',
            }));

          results.push(...items);
        }
      } catch (error: any) {
        this.monitoring.trackException(error, {
          operation: 'gong.search',
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
   * Register webhook subscription for Gong
   */
  async registerWebhook(
    events: string[],
    callbackUrl: string
  ): Promise<{ webhookId: string; expirationDateTime?: Date }> {
    await this.initialize();

    try {
      // Gong webhook registration
      const webhookData = {
        filter: {
          events: events,
        },
        targetUrl: callbackUrl,
      };

      const result = await this.makeGongRequest<{ id: string; expirationTime?: string }>(
        '/webhooks',
        'POST',
        webhookData
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        webhookId: result.data?.id || '',
        expirationDateTime: result.data?.expirationTime 
          ? new Date(result.data.expirationTime)
          : undefined,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'gong.registerWebhook',
        tenantId: this.tenantId,
      });
      throw error;
    }
  }

  /**
   * Unregister webhook subscription
   */
  async unregisterWebhook(webhookId: string): Promise<void> {
    await this.initialize();

    const result = await this.makeGongRequest(`/webhooks/${webhookId}`, 'DELETE');

    if (result.error) {
      throw new Error(result.error);
    }
  }

  /**
   * Parse Gong webhook
   */
  parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null {
    // Gong webhook payload structure
    if (payload.type && payload.data) {
      const eventType = payload.type;
      const eventData = payload.data;

      return {
        type: eventType,
        entity: this.mapEventToEntity(eventType),
        externalId: eventData.id || eventData.callId || '',
        operation: this.mapEventToOperation(eventType),
        data: eventData,
        timestamp: new Date(payload.timestamp || Date.now()),
      };
    }

    return null;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Gong webhook signature verification
    // Gong uses HMAC-SHA256 with the webhook secret
    const hash = createHmac('sha256', secret).update(payload).digest('hex');
    return hash === signature;
  }

  // =====================
  // Private Helper Methods
  // =====================

  private normalizeRecord(record: any, entity: string): Record<string, any> {
    const normalized: Record<string, any> = {
      id: record.id,
      ...record,
    };

    // Standardize field names
    if (entity === 'call') {
      normalized.callId = record.id;
      normalized.subject = record.subject;
      normalized.direction = record.direction;
      normalized.started = record.started;
      normalized.duration = record.duration;
      normalized.outcome = record.outcome;
    } else if (entity === 'transcript') {
      normalized.transcriptId = record.id;
      normalized.callId = record.callId;
      normalized.sentences = record.sentences || [];
      normalized.topics = record.topics || [];
      normalized.keywords = record.keywords || [];
    } else if (entity === 'user') {
      normalized.userId = record.id;
      normalized.email = record.emailAddress;
      normalized.firstName = record.firstName;
      normalized.lastName = record.lastName;
      normalized.title = record.title;
      normalized.team = record.team;
    } else if (entity === 'deal') {
      normalized.dealId = record.id;
      normalized.name = record.name;
      normalized.amount = record.amount?.amount;
      normalized.currency = record.amount?.currencyCode;
      normalized.stage = record.stage;
      normalized.probability = record.probability;
      normalized.expectedCloseDate = record.expectedCloseDate;
    }

    return normalized;
  }

  private buildDescription(item: any, entity: string): string {
    switch (entity) {
      case 'call':
        return `${item.subject || 'Call'} - ${item.direction || ''} - ${item.duration || 0} min`;
      case 'transcript':
        return `Transcript for call ${item.callId} - ${item.sentences?.length || 0} sentences`;
      case 'user':
        return `${item.firstName || ''} ${item.lastName || ''} - ${item.emailAddress || ''} - ${item.title || ''}`.trim();
      case 'deal':
        return `${item.name || 'Deal'} - ${item.amount?.amount || 0} ${item.amount?.currencyCode || ''} - ${item.stage || ''}`;
      default:
        return item.name || item.subject || item.id || '';
    }
  }

  private getSearchTitle(item: any, entity: string): string {
    switch (entity) {
      case 'call':
        return item.subject || 'Untitled Call';
      case 'user':
        return `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.emailAddress || '';
      case 'deal':
        return item.name || 'Untitled Deal';
      default:
        return item.name || item.subject || item.id || '';
    }
  }

  private getSearchUrl(item: any, entity: string): string {
    // Gong web app URLs (if available)
    switch (entity) {
      case 'call':
        return `https://app.gong.io/calls/${item.id}`;
      case 'user':
        return `https://app.gong.io/users/${item.id}`;
      case 'deal':
        return `https://app.gong.io/deals/${item.id}`;
      default:
        return '';
    }
  }

  private calculateRelevanceScore(query: string, record: any, entity: string): number {
    const queryLower = query.toLowerCase();
    let score = 0.5;

    if (entity === 'call') {
      const subject = record.subject || '';
      if (subject.toLowerCase().includes(queryLower)) {
        score = 0.9;
      }
    } else if (entity === 'user') {
      const name = `${record.firstName || ''} ${record.lastName || ''}`.trim();
      if (name.toLowerCase().includes(queryLower)) {
        score = 0.9;
      }
      if (record.emailAddress?.toLowerCase().includes(queryLower)) {
        score = Math.max(score, 0.8);
      }
    } else if (entity === 'deal') {
      const name = record.name || '';
      if (name.toLowerCase().includes(queryLower)) {
        score = 0.9;
      }
    }

    return Math.min(score, 1.0);
  }

  private mapEventToEntity(eventType: string): string {
    if (eventType.includes('call')) { return 'call'; }
    if (eventType.includes('transcript')) { return 'transcript'; }
    if (eventType.includes('user')) { return 'user'; }
    if (eventType.includes('deal')) { return 'deal'; }
    return 'unknown';
  }

  private mapEventToOperation(eventType: string): 'create' | 'update' | 'delete' {
    if (eventType.includes('created') || eventType.includes('started')) { return 'create'; }
    if (eventType.includes('deleted') || eventType.includes('ended')) { return 'delete'; }
    return 'update';
  }
}

// ============================================
// Entity Definitions
// ============================================

const CALL_ENTITY: IntegrationEntity = {
  name: 'call',
  displayName: 'Call',
  description: 'Gong calls',
  fields: [
    { name: 'id', displayName: 'Call ID', type: 'string', required: true },
    { name: 'subject', displayName: 'Subject', type: 'string', required: false },
    { name: 'direction', displayName: 'Direction', type: 'string', required: false },
    { name: 'started', displayName: 'Started', type: 'datetime', required: false },
    { name: 'duration', displayName: 'Duration (seconds)', type: 'number', required: false },
    { name: 'outcome', displayName: 'Outcome', type: 'string', required: false },
    { name: 'fromUserEmail', displayName: 'From Email', type: 'string', required: false },
    { name: 'toUserEmail', displayName: 'To Email', type: 'string', required: false },
  ],
  supportsPull: true,
  supportsPush: false,
  supportsDelete: false,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'started',
};

const TRANSCRIPT_ENTITY: IntegrationEntity = {
  name: 'transcript',
  displayName: 'Transcript',
  description: 'Gong call transcripts',
  fields: [
    { name: 'id', displayName: 'Transcript ID', type: 'string', required: true },
    { name: 'callId', displayName: 'Call ID', type: 'string', required: true },
    { name: 'sentences', displayName: 'Sentences', type: 'array', required: false },
    { name: 'topics', displayName: 'Topics', type: 'array', required: false },
    { name: 'keywords', displayName: 'Keywords', type: 'array', required: false },
  ],
  supportsPull: true,
  supportsPush: false,
  supportsDelete: false,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'id',
};

const USER_ENTITY: IntegrationEntity = {
  name: 'user',
  displayName: 'User',
  description: 'Gong users',
  fields: [
    { name: 'id', displayName: 'User ID', type: 'string', required: true },
    { name: 'emailAddress', displayName: 'Email', type: 'string', required: true },
    { name: 'firstName', displayName: 'First Name', type: 'string', required: false },
    { name: 'lastName', displayName: 'Last Name', type: 'string', required: false },
    { name: 'title', displayName: 'Title', type: 'string', required: false },
    { name: 'team', displayName: 'Team', type: 'string', required: false },
    { name: 'createdAt', displayName: 'Created', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: false,
  supportsDelete: false,
  supportsWebhook: false,
  idField: 'id',
  modifiedField: 'createdAt',
};

const DEAL_ENTITY: IntegrationEntity = {
  name: 'deal',
  displayName: 'Deal',
  description: 'Gong deals',
  fields: [
    { name: 'id', displayName: 'Deal ID', type: 'string', required: true },
    { name: 'name', displayName: 'Name', type: 'string', required: true },
    { name: 'amount', displayName: 'Amount', type: 'object', required: false },
    { name: 'stage', displayName: 'Stage', type: 'string', required: false },
    { name: 'probability', displayName: 'Probability', type: 'number', required: false },
    { name: 'expectedCloseDate', displayName: 'Expected Close Date', type: 'datetime', required: false },
    { name: 'ownerName', displayName: 'Owner', type: 'string', required: false },
    { name: 'accountName', displayName: 'Account', type: 'string', required: false },
    { name: 'createdAt', displayName: 'Created', type: 'datetime', required: false },
    { name: 'updatedAt', displayName: 'Updated', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: false,
  supportsDelete: false,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'updatedAt',
};

const ENTITIES: IntegrationEntity[] = [
  CALL_ENTITY,
  TRANSCRIPT_ENTITY,
  USER_ENTITY,
  DEAL_ENTITY,
];

// ============================================
// Integration Definition
// ============================================

export const GONG_DEFINITION: IntegrationDefinition = {
  id: 'gong',
  name: 'gong',
  displayName: 'Gong',
  description: 'Integrate with Gong: calls, transcripts, deals, and analytics',
  category: IntegrationCategory.COMMUNICATION,
  icon: 'phone',
  color: '#00A3FF',
  visibility: 'public',
  isPremium: true,
  capabilities: ['read', 'search', 'realtime'],
  supportedSyncDirections: ['pull'],
  supportsRealtime: true,
  supportsWebhooks: true,
  authType: 'api_key',
  oauthConfig: undefined, // Gong uses API key authentication
  availableEntities: ENTITIES,
  connectionScope: 'tenant',
  status: 'active',
  version: '1.0.0',
  documentationUrl: 'https://developers.gong.io/reference',
  supportUrl: 'https://support.gong.io',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// Factory & Registration
// ============================================

export const gongAdapterFactory: IntegrationAdapterFactory = {
  create(monitoring, connectionService, tenantId, connectionId) {
    return new GongAdapter(monitoring, connectionService, tenantId, connectionId);
  },
};

// Register adapter
adapterRegistry.register('gong', gongAdapterFactory);
