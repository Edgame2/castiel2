/**
 * Zoom Integration Adapter
 * Connects to Zoom API for meeting data, recordings, and transcripts
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

const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';

// ============================================
// Zoom API Types
// ============================================

interface ZoomMeeting {
  id: string;
  uuid: string;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  join_url: string;
  start_url?: string;
  status: string;
  settings?: {
    recording?: boolean;
    auto_recording?: string;
  };
}

interface ZoomRecording {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  start_time: string;
  timezone: string;
  duration: number;
  total_size: number;
  recording_count: number;
  share_url: string;
  recording_files: Array<{
    id: string;
    meeting_id: string;
    recording_start: string;
    recording_end: string;
    file_type: string;
    file_size: number;
    play_url: string;
    download_url: string;
    status: string;
    recording_type: string;
  }>;
}

interface ZoomTranscript {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  transcript_url?: string;
}

interface ZoomUser {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  type: number;
  role_name: string;
  pmi: number;
  use_pmi: boolean;
  personal_meeting_url: string;
  timezone: string;
  verified: number;
  dept: string;
  created_at: string;
  last_login_time: string;
  language: string;
  phone_country: string;
  phone_number: string;
  status: string;
  job_title: string;
  location: string;
  login_types: number[];
  role_id: string;
  account_id: string;
  account_number: number;
  cluster: string;
  jid: string;
  group_ids: string[];
  im_group_ids: string[];
}

interface ZoomResponse<T> {
  page_count?: number;
  page_number?: number;
  page_size?: number;
  total_records?: number;
  next_page_token?: string;
  [key: string]: T | any;
}

// ============================================
// Zoom Adapter Implementation
// ============================================

/**
 * Zoom Integration Adapter
 */
export class ZoomAdapter extends BaseIntegrationAdapter {
  private accessToken: string | null = null;
  private accountId: string | null = null;

  constructor(
    monitoring: IMonitoringProvider,
    connectionService: IntegrationConnectionService,
    tenantId: string,
    connectionId: string
  ) {
    super(monitoring, connectionService, 'zoom', tenantId, connectionId);
  }

  /**
   * Get Zoom integration definition
   */
  getDefinition(): IntegrationDefinition {
    return ZOOM_DEFINITION;
  }

  /**
   * Initialize with access token
   */
  private async initialize(): Promise<void> {
    if (this.accessToken) { return; }

    const credentials = await this.connectionService.getDecryptedCredentials(
      this.connectionId,
      this.integrationId
    );

    if (credentials?.type === 'oauth2' && credentials.accessToken) {
      this.accessToken = credentials.accessToken;
      // Account ID may be stored in connection metadata (not in credentials type)
      // Will be retrieved from connection document if needed
      this.accountId = null;
    } else if (credentials?.type === 'custom' && credentials.data?.apiKey && credentials.data?.apiSecret) {
      // For server-to-server OAuth, we'd need to exchange credentials for token
      // For now, require OAuth2 flow
      throw new Error('Zoom requires OAuth2 authentication. API key authentication not supported.');
    } else {
      throw new Error('Zoom credentials not found or invalid');
    }
  }

  /**
   * Make authenticated request to Zoom API
   */
  private async makeZoomRequest<T>(
    url: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<{ data?: T; error?: string }> {
    await this.initialize();

    const fullUrl = url.startsWith('http') ? url : `${ZOOM_API_BASE_URL}${url}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
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
            : new Date(Date.now() + 60000); // Default 1 minute
          
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
        operation: 'zoom.request',
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
      const result = await this.makeZoomRequest<ZoomUser>('/users/me');

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to get user profile');
      }

      const user = result.data;
      return {
        id: user.id,
        email: user.email,
        name: user.display_name || `${user.first_name} ${user.last_name}`.trim(),
        firstName: user.first_name,
        lastName: user.last_name,
        accountId: user.account_id,
        roleName: user.role_name,
        timezone: user.timezone,
        verified: user.verified === 1,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'zoom.getUserProfile',
        tenantId: this.tenantId,
      });
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Test Zoom connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      const result = await this.makeZoomRequest<ZoomUser>('/users/me');

      if (result.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        details: {
          userId: result.data?.id,
          email: result.data?.email,
          accountId: result.data?.account_id,
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
   * Fetch records from Zoom
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    await this.initialize();

    const { entity, filters, limit = 30, offset = 0, modifiedSince } = options;

    let url = '';
    let records: any[] = [];

    switch (entity) {
      case 'meeting':
        url = '/users/me/meetings';
        if (modifiedSince) {
          url += `?from=${modifiedSince.toISOString().split('T')[0]}`;
        }
        if (limit) {
          url += url.includes('?') ? `&page_size=${limit}` : `?page_size=${limit}`;
        }
        if (offset) {
          url += url.includes('?') ? `&page_number=${Math.floor(offset / (limit || 30)) + 1}` : `?page_number=${Math.floor(offset / (limit || 30)) + 1}`;
        }
        
        const meetingsResult = await this.makeZoomRequest<ZoomResponse<ZoomMeeting[]>>(url);
        if (meetingsResult.data) {
          records = (meetingsResult.data.meetings || []) as any[];
        }
        break;

      case 'recording':
        url = '/users/me/recordings';
        if (modifiedSince) {
          url += `?from=${modifiedSince.toISOString().split('T')[0]}`;
        }
        if (limit) {
          url += url.includes('?') ? `&page_size=${limit}` : `?page_size=${limit}`;
        }
        if (offset) {
          url += url.includes('?') ? `&page_number=${Math.floor(offset / (limit || 30)) + 1}` : `?page_number=${Math.floor(offset / (limit || 30)) + 1}`;
        }
        
        const recordingsResult = await this.makeZoomRequest<ZoomResponse<ZoomRecording[]>>(url);
        if (recordingsResult.data) {
          records = (recordingsResult.data.meetings || []) as any[];
        }
        break;

      case 'user':
        url = '/users';
        if (limit) {
          url += `?page_size=${limit}`;
        }
        if (offset) {
          url += url.includes('?') ? `&page_number=${Math.floor(offset / (limit || 30)) + 1}` : `?page_number=${Math.floor(offset / (limit || 30)) + 1}`;
        }
        
        const usersResult = await this.makeZoomRequest<ZoomResponse<ZoomUser[]>>(url);
        if (usersResult.data) {
          records = (usersResult.data.users || []) as any[];
        }
        break;

      default:
        return { records: [], hasMore: false };
    }

    const normalizedRecords = records.map(r => this.normalizeRecord(r, entity));

    return {
      records: normalizedRecords,
      total: normalizedRecords.length,
      hasMore: records.length >= (limit || 30),
      nextOffset: records.length >= (limit || 30) ? offset + (limit || 30) : undefined,
    };
  }

  /**
   * Push record to Zoom (limited support - mainly for meeting creation)
   */
  async push(data: Record<string, any>, options: PushOptions): Promise<PushResult> {
    await this.initialize();

    const { entity, operation } = options;

    if (entity !== 'meeting') {
      return { success: false, error: `Push operation not supported for entity: ${entity}` };
    }

    if (operation !== 'create') {
      return { success: false, error: `Only 'create' operation supported for Zoom meetings` };
    }

    try {
      const meetingData = {
        topic: data.topic || data.name || 'Meeting',
        type: data.type || 2, // Scheduled meeting
        start_time: data.start_time || data.startTime,
        duration: data.duration || 60,
        timezone: data.timezone || 'UTC',
        settings: {
          host_video: data.host_video ?? true,
          participant_video: data.participant_video ?? true,
          join_before_host: data.join_before_host ?? false,
          mute_upon_entry: data.mute_upon_entry ?? false,
          watermark: data.watermark ?? false,
          use_pmi: data.use_pmi ?? false,
          approval_type: data.approval_type || 2,
          audio: data.audio || 'both',
          auto_recording: data.auto_recording || 'none',
          enforce_login: data.enforce_login ?? false,
        },
      };

      const result = await this.makeZoomRequest<ZoomMeeting>('/users/me/meetings', 'POST', meetingData);

      if (result.error) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        externalId: result.data?.id || result.data?.uuid,
        details: result.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create meeting',
      };
    }
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
   * Search across Zoom entities
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    await this.initialize();
    const startTime = Date.now();

    const { query, entities, limit = 20, offset = 0 } = options;
    const results: SearchResultItem[] = [];
    const entitiesToSearch = entities || ['meeting', 'recording', 'user'];

    for (const entity of entitiesToSearch) {
      try {
        let searchUrl = '';
        
        switch (entity) {
          case 'meeting':
            searchUrl = `/users/me/meetings?page_size=${limit}&search_key=${encodeURIComponent(query)}`;
            break;
          case 'recording':
            searchUrl = `/users/me/recordings?page_size=${limit}`;
            break;
          case 'user':
            searchUrl = `/users?page_size=${limit}&search_key=${encodeURIComponent(query)}`;
            break;
          default:
            continue;
        }

        const result = await this.makeZoomRequest<ZoomResponse<any[]>>(searchUrl);

        if (result.data) {
          const items = (result.data[entity === 'recording' ? 'meetings' : entity === 'meeting' ? 'meetings' : 'users'] || [])
            .slice(0, limit)
            .map((item: any) => ({
              id: item.id || item.uuid,
              entity,
              title: item.topic || item.display_name || item.name || '',
              description: this.buildDescription(item, entity),
              url: entity === 'meeting' 
                ? `https://zoom.us/j/${item.id}`
                : entity === 'recording'
                ? item.share_url || ''
                : '',
              metadata: {
                created: item.created_at || item.start_time,
                duration: item.duration,
              },
              score: this.calculateRelevanceScore(query, item, entity),
              integrationId: this.integrationId,
              integrationName: this.integrationId,
              providerName: 'Zoom',
            }));

          results.push(...items);
        }
      } catch (error: any) {
        this.monitoring.trackException(error, {
          operation: 'zoom.search',
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
   * Register webhook subscription for Zoom
   */
  async registerWebhook(
    events: string[],
    callbackUrl: string
  ): Promise<{ webhookId: string; expirationDateTime?: Date }> {
    await this.initialize();

    try {
      // Zoom webhook registration
      const webhookData = {
        event: events,
        endpoint_url: callbackUrl,
      };

      const result = await this.makeZoomRequest<{ id: string; expiration_time?: string }>(
        '/webhooks',
        'POST',
        webhookData
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        webhookId: result.data?.id || '',
        expirationDateTime: result.data?.expiration_time 
          ? new Date(result.data.expiration_time)
          : undefined,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'zoom.registerWebhook',
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

    const result = await this.makeZoomRequest(`/webhooks/${webhookId}`, 'DELETE');

    if (result.error) {
      throw new Error(result.error);
    }
  }

  /**
   * Parse Zoom webhook
   */
  parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null {
    // Zoom webhook payload structure
    if (payload.event && payload.payload) {
      const eventType = payload.event;
      const eventData = payload.payload.object || payload.payload;

      return {
        type: eventType,
        entity: this.mapEventToEntity(eventType),
        externalId: eventData.id || eventData.uuid || eventData.meeting_id || '',
        operation: this.mapEventToOperation(eventType),
        data: eventData,
        timestamp: new Date(payload.event_ts || Date.now()),
      };
    }

    return null;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Zoom webhook signature verification
    // Zoom uses HMAC-SHA256 with the webhook secret
    const hash = createHmac('sha256', secret).update(payload).digest('hex');
    return hash === signature;
  }

  // =====================
  // Private Helper Methods
  // =====================

  private normalizeRecord(record: any, entity: string): Record<string, any> {
    const normalized: Record<string, any> = {
      id: record.id || record.uuid,
      ...record,
    };

    // Standardize field names
    if (entity === 'meeting') {
      normalized.meetingId = record.id;
      normalized.meetingUuid = record.uuid;
      normalized.topic = record.topic;
      normalized.startTime = record.start_time;
      normalized.duration = record.duration;
    } else if (entity === 'recording') {
      normalized.recordingId = record.id;
      normalized.recordingUuid = record.uuid;
      normalized.topic = record.topic;
      normalized.startTime = record.start_time;
      normalized.duration = record.duration;
      normalized.recordingFiles = record.recording_files || [];
    } else if (entity === 'user') {
      normalized.userId = record.id;
      normalized.email = record.email;
      normalized.displayName = record.display_name;
      normalized.firstName = record.first_name;
      normalized.lastName = record.last_name;
    }

    return normalized;
  }

  private buildDescription(item: any, entity: string): string {
    switch (entity) {
      case 'meeting':
        return `${item.topic || 'Untitled Meeting'} - ${item.start_time || ''}`;
      case 'recording':
        return `${item.topic || 'Untitled Recording'} - ${item.duration || 0} minutes`;
      case 'user':
        return `${item.display_name || item.email || ''} - ${item.role_name || ''}`;
      default:
        return item.topic || item.name || item.display_name || '';
    }
  }

  private calculateRelevanceScore(query: string, record: any, entity: string): number {
    const queryLower = query.toLowerCase();
    let score = 0.5;

    if (entity === 'meeting' || entity === 'recording') {
      const topic = record.topic || '';
      if (topic.toLowerCase().includes(queryLower)) {
        score = 0.9;
      }
    } else if (entity === 'user') {
      const name = record.display_name || record.email || '';
      if (name.toLowerCase().includes(queryLower)) {
        score = 0.9;
      }
      if (record.email?.toLowerCase().includes(queryLower)) {
        score = Math.max(score, 0.8);
      }
    }

    return Math.min(score, 1.0);
  }

  private mapEventToEntity(eventType: string): string {
    if (eventType.includes('meeting')) { return 'meeting'; }
    if (eventType.includes('recording')) { return 'recording'; }
    if (eventType.includes('user')) { return 'user'; }
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

const MEETING_ENTITY: IntegrationEntity = {
  name: 'meeting',
  displayName: 'Meeting',
  description: 'Zoom meetings',
  fields: [
    { name: 'id', displayName: 'Meeting ID', type: 'string', required: true },
    { name: 'uuid', displayName: 'Meeting UUID', type: 'string', required: false },
    { name: 'topic', displayName: 'Topic', type: 'string', required: true },
    { name: 'start_time', displayName: 'Start Time', type: 'datetime', required: false },
    { name: 'duration', displayName: 'Duration (minutes)', type: 'number', required: false },
    { name: 'join_url', displayName: 'Join URL', type: 'string', required: false },
    { name: 'created_at', displayName: 'Created', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: true,
  supportsDelete: false,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'created_at',
};

const RECORDING_ENTITY: IntegrationEntity = {
  name: 'recording',
  displayName: 'Recording',
  description: 'Zoom meeting recordings',
  fields: [
    { name: 'id', displayName: 'Recording ID', type: 'string', required: true },
    { name: 'uuid', displayName: 'Recording UUID', type: 'string', required: false },
    { name: 'topic', displayName: 'Topic', type: 'string', required: true },
    { name: 'start_time', displayName: 'Start Time', type: 'datetime', required: false },
    { name: 'duration', displayName: 'Duration (minutes)', type: 'number', required: false },
    { name: 'share_url', displayName: 'Share URL', type: 'string', required: false },
    { name: 'recording_files', displayName: 'Recording Files', type: 'array', required: false },
  ],
  supportsPull: true,
  supportsPush: false,
  supportsDelete: false,
  supportsWebhook: true,
  idField: 'id',
  modifiedField: 'start_time',
};

const USER_ENTITY: IntegrationEntity = {
  name: 'user',
  displayName: 'User',
  description: 'Zoom users',
  fields: [
    { name: 'id', displayName: 'User ID', type: 'string', required: true },
    { name: 'email', displayName: 'Email', type: 'string', required: true },
    { name: 'display_name', displayName: 'Display Name', type: 'string', required: false },
    { name: 'first_name', displayName: 'First Name', type: 'string', required: false },
    { name: 'last_name', displayName: 'Last Name', type: 'string', required: false },
    { name: 'role_name', displayName: 'Role', type: 'string', required: false },
    { name: 'created_at', displayName: 'Created', type: 'datetime', required: false },
  ],
  supportsPull: true,
  supportsPush: false,
  supportsDelete: false,
  supportsWebhook: false,
  idField: 'id',
  modifiedField: 'created_at',
};

const ENTITIES: IntegrationEntity[] = [
  MEETING_ENTITY,
  RECORDING_ENTITY,
  USER_ENTITY,
];

// ============================================
// Integration Definition
// ============================================

export const ZOOM_DEFINITION: IntegrationDefinition = {
  id: 'zoom',
  name: 'zoom',
  displayName: 'Zoom',
  description: 'Integrate with Zoom: meetings, recordings, transcripts, and users',
  category: IntegrationCategory.COMMUNICATION,
  icon: 'video',
  color: '#2D8CFF',
  visibility: 'public',
  isPremium: false,
  capabilities: ['read', 'write', 'search', 'realtime'],
  supportedSyncDirections: ['pull', 'push'],
  supportsRealtime: true,
  supportsWebhooks: true,
  authType: 'oauth2',
  oauthConfig: {
    authorizationUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
    revokeUrl: 'https://zoom.us/oauth/revoke',
    scopes: [
      'meeting:read',
      'meeting:write',
      'recording:read',
      'user:read',
      'webinar:read',
      'webinar:write',
    ],
    clientIdEnvVar: 'ZOOM_CLIENT_ID',
    clientSecretEnvVar: 'ZOOM_CLIENT_SECRET',
    redirectUri: '/api/integrations/oauth/callback',
    pkce: true,
  },
  availableEntities: ENTITIES,
  connectionScope: 'tenant',
  status: 'active',
  version: '1.0.0',
  documentationUrl: 'https://marketplace.zoom.us/docs/api-reference/zoom-api',
  supportUrl: 'https://support.zoom.us',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// Factory & Registration
// ============================================

export const zoomAdapterFactory: IntegrationAdapterFactory = {
  create(monitoring, connectionService, tenantId, connectionId) {
    return new ZoomAdapter(monitoring, connectionService, tenantId, connectionId);
  },
};

// Register adapter
adapterRegistry.register('zoom', zoomAdapterFactory);
