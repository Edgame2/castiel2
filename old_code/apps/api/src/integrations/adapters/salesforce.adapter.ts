/**
 * Salesforce Integration Adapter
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import {
  BaseIntegrationAdapter,
  IntegrationConnectionService,
  IntegrationDefinition,
  IntegrationCategory,
  IntegrationEntity,
  SearchOptions,
  SearchResult,
  type SearchResultItem,
} from '@castiel/api-core';
import type {
  FetchOptions,
  FetchResult,
  PushOptions,
  PushResult,
  WebhookEvent,
  IntegrationAdapterFactory,
} from '../base-adapter.js';
import { adapterRegistry } from '../base-adapter.js';

/**
 * Salesforce API response for query
 */
interface SalesforceQueryResponse {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: Record<string, any>[];
}

/**
 * Salesforce Integration Adapter
 */
export class SalesforceAdapter extends BaseIntegrationAdapter {
  private instanceUrl: string = '';
  private apiVersion: string = 'v59.0';

  constructor(
    monitoring: IMonitoringProvider,
    connectionService: IntegrationConnectionService,
    tenantId: string,
    connectionId: string
  ) {
    super(monitoring, connectionService, 'salesforce', tenantId, connectionId);
  }

  /**
   * Get Salesforce integration definition
   */
  getDefinition(): IntegrationDefinition {
    return SALESFORCE_DEFINITION;
  }

  /**
   * Initialize with instance URL from connection
   */
  private async initialize(): Promise<void> {
    if (this.instanceUrl) {return;}

    // Get instance URL from connection credentials
    const credentials = await this.connectionService.getDecryptedCredentials(
      this.connectionId,
      this.integrationId
    );

    if (credentials?.type === 'oauth2') {
      // Instance URL is typically stored in token response
      // For now, use a default or get from settings
      this.instanceUrl = process.env.SALESFORCE_INSTANCE_URL || 'https://login.salesforce.com';
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
    await this.initialize();

    try {
      const result = await this.makeRequest<{
        user_id: string;
        organization_id?: string;
        email?: string;
        name?: string;
        given_name?: string;
        family_name?: string;
        nickname?: string;
      }>(`${this.instanceUrl}/services/oauth2/userinfo`);

      if (result.error || !result.data) {
        throw new Error(result.error || 'Failed to get user profile');
      }

      const profile = result.data;
      return {
        id: profile.user_id,
        email: profile.email,
        name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || profile.nickname,
        organizationId: profile.organization_id,
        givenName: profile.given_name,
        familyName: profile.family_name,
        nickname: profile.nickname,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'salesforce.getUserProfile',
        tenantId: this.tenantId,
      });
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Test Salesforce connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    await this.initialize();

    const result = await this.makeRequest<{ identity: string }>(
      `${this.instanceUrl}/services/oauth2/userinfo`
    );

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      details: {
        identity: result.data?.identity,
      },
    };
  }

  /**
   * Fetch records from Salesforce using SOQL
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    await this.initialize();

    // Build SOQL query
    const soql = this.buildSOQLQuery(options);

    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/query?q=${encodeURIComponent(soql)}`;
    const result = await this.makeRequest<SalesforceQueryResponse>(url);

    if (result.error) {
      this.monitoring.trackEvent('salesforce.fetch.error', {
        entity: options.entity,
        error: result.error,
      });
      return { records: [], hasMore: false };
    }

    const data = result.data!;

    return {
      records: data.records.map(r => this.normalizeRecord(r)),
      total: data.totalSize,
      hasMore: !data.done,
      cursor: data.nextRecordsUrl,
    };
  }

  /**
   * Push record to Salesforce
   */
  async push(data: Record<string, any>, options: PushOptions): Promise<PushResult> {
    await this.initialize();

    const { entity, operation } = options;
    let url: string;
    let method: string;
    let body: string | undefined;

    switch (operation) {
      case 'create':
        url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${entity}`;
        method = 'POST';
        body = JSON.stringify(data);
        break;

      case 'update':
        if (!data.Id) {
          return { success: false, error: 'Id required for update' };
        }
        url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${entity}/${data.Id}`;
        method = 'PATCH';
        const { Id, ...updateData } = data;
        body = JSON.stringify(updateData);
        break;

      case 'upsert':
        if (!data.Id) {
          // Create new
          url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${entity}`;
          method = 'POST';
          body = JSON.stringify(data);
        } else {
          // Update existing
          url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${entity}/${data.Id}`;
          method = 'PATCH';
          const { Id: id, ...upsertData } = data;
          body = JSON.stringify(upsertData);
        }
        break;

      case 'delete':
        if (!data.Id) {
          return { success: false, error: 'Id required for delete' };
        }
        url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${entity}/${data.Id}`;
        method = 'DELETE';
        break;

      default:
        return { success: false, error: `Unknown operation: ${operation}` };
    }

    const result = await this.makeRequest(url, { method, body });

    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      externalId: result.data?.id || data.Id,
    };
  }

  /**
   * Get entity schema from Salesforce describe
   */
  async getEntitySchema(entityName: string): Promise<IntegrationEntity | null> {
    await this.initialize();

    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${entityName}/describe`;
    const result = await this.makeRequest<any>(url);

    if (result.error) {
      return null;
    }

    const describe = result.data;

    return {
      name: describe.name,
      displayName: describe.label,
      description: describe.labelPlural,
      fields: describe.fields.map((f: any) => ({
        name: f.name,
        displayName: f.label,
        type: this.mapSalesforceType(f.type),
        required: !f.nillable && !f.defaultedOnCreate,
        readOnly: !f.updateable && !f.createable,
        description: f.inlineHelpText,
      })),
      supportsPull: true,
      supportsPush: describe.createable || describe.updateable,
      supportsDelete: describe.deletable,
      supportsWebhook: true,
      idField: 'Id',
      modifiedField: 'LastModifiedDate',
    };
  }

  /**
   * List available Salesforce objects
   */
  async listEntities(): Promise<IntegrationEntity[]> {
    await this.initialize();

    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects`;
    const result = await this.makeRequest<{ sobjects: any[] }>(url);

    if (result.error || !result.data) {
      return [];
    }

    // Return commonly used objects
    const commonObjects = ['Account', 'Contact', 'Lead', 'Opportunity', 'Task', 'Event', 'Case'];

    return result.data.sobjects
      .filter(obj => commonObjects.includes(obj.name) || obj.custom)
      .map(obj => ({
        name: obj.name,
        displayName: obj.label,
        description: obj.labelPlural,
        fields: [],
        supportsPull: obj.queryable,
        supportsPush: obj.createable || obj.updateable,
        supportsDelete: obj.deletable,
        supportsWebhook: obj.triggerable,
        idField: 'Id',
        modifiedField: 'LastModifiedDate',
      }));
  }

  /**
   * Search across Salesforce entities using SOSL (Salesforce Object Search Language)
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    await this.initialize();
    const startTime = Date.now();

    const { query, entities, limit = 20, offset = 0, filters, userId, externalUserId } = options;

    // Build SOSL query
    // Format: FIND {searchTerm} IN ALL FIELDS RETURNING Entity1(Field1, Field2), Entity2(Field1, Field2)
    const searchTerm = query.replace(/'/g, "\\'"); // Escape single quotes
    const entitiesToSearch = entities || ['Account', 'Contact', 'Lead', 'Opportunity', 'Case'];
    
    // Build RETURNING clause with common fields
    const returningClause = entitiesToSearch.map(entity => {
      const fields = this.getSearchFieldsForEntity(entity);
      return `${entity}(${fields.join(', ')})`;
    }).join(', ');

    const soslQuery = `FIND {${searchTerm}} IN ALL FIELDS RETURNING ${returningClause} LIMIT ${limit * 2} OFFSET ${offset}`;

    // Execute SOSL query
    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/search/?q=${encodeURIComponent(soslQuery)}`;
    const result = await this.makeRequest<{ searchRecords: any[] }>(url);

    if (result.error || !result.data) {
      return {
        results: [],
        total: 0,
        took: Date.now() - startTime,
        hasMore: false,
      };
    }

    // Transform Salesforce results to SearchResultItem
    const searchResults: SearchResultItem[] = [];
    const searchRecords = result.data.searchRecords || [];

    for (const record of searchRecords) {
      const entityType = record.attributes?.type || 'Unknown';
      const title = this.getTitleForEntity(entityType, record);
      const description = this.getDescriptionForEntity(entityType, record);
      const url = `${this.instanceUrl}/${record.Id}`;

      // Calculate relevance score (simple: based on field matches)
      const score = this.calculateRelevanceScore(query, record, entityType);

      // Extract highlights (fields that match the query)
      const highlights = this.extractHighlights(query, record, entityType);

      searchResults.push({
        id: record.Id,
        entity: entityType,
        title,
        description,
        url,
        score,
        highlights,
        metadata: {
          ...record,
          providerName: 'salesforce',
        },
        integrationId: this.integrationId,
        integrationName: '', // Will be set by search service
        providerName: 'salesforce',
      });
    }

    // Apply user scoping if externalUserId is provided
    // Filter by OwnerId to only return records owned by the external user
    let filteredResults = searchResults;
    if (externalUserId) {
      filteredResults = searchResults.filter(record => {
        // Check if record has OwnerId field and it matches externalUserId
        const ownerId = record.metadata?.OwnerId;
        return ownerId === externalUserId;
      });
      
      // Limit to requested limit after filtering
      filteredResults = filteredResults.slice(0, limit);
    }

    return {
      results: filteredResults,
      total: filteredResults.length,
      took: Date.now() - startTime,
      hasMore: searchRecords.length === limit, // Simple pagination check
    };
  }

  /**
   * Get searchable fields for an entity
   */
  private getSearchFieldsForEntity(entity: string): string[] {
    const commonFields = ['Id', 'Name'];
    const entityFields: Record<string, string[]> = {
      Account: ['Id', 'Name', 'Type', 'Industry', 'BillingCity', 'BillingState'],
      Contact: ['Id', 'Name', 'Email', 'Phone', 'Title', 'AccountId'],
      Lead: ['Id', 'Name', 'Email', 'Phone', 'Company', 'Status'],
      Opportunity: ['Id', 'Name', 'StageName', 'Amount', 'CloseDate', 'AccountId'],
      Case: ['Id', 'Subject', 'Status', 'Priority', 'CaseNumber'],
    };

    return entityFields[entity] || commonFields;
  }

  /**
   * Get title for an entity record
   */
  private getTitleForEntity(entity: string, record: any): string {
    const titleFields: Record<string, string> = {
      Account: 'Name',
      Contact: 'Name',
      Lead: 'Name',
      Opportunity: 'Name',
      Case: 'Subject',
    };

    const field = titleFields[entity] || 'Name';
    return record[field] || record.Id || 'Untitled';
  }

  /**
   * Get description for an entity record
   */
  private getDescriptionForEntity(entity: string, record: any): string {
    const descFields: Record<string, string[]> = {
      Account: ['Type', 'Industry', 'BillingCity'],
      Contact: ['Email', 'Phone', 'Title'],
      Lead: ['Company', 'Status', 'Email'],
      Opportunity: ['StageName', 'Amount', 'CloseDate'],
      Case: ['Status', 'Priority', 'CaseNumber'],
    };

    const fields = descFields[entity] || [];
    const parts = fields
      .map(field => {
        const value = record[field];
        if (value === null || value === undefined) {return null;}
        return `${field}: ${value}`;
      })
      .filter(Boolean);

    return parts.join(' • ') || '';
  }

  /**
   * Calculate relevance score for a search result
   */
  private calculateRelevanceScore(query: string, record: any, entity: string): number {
    const queryLower = query.toLowerCase();
    let score = 0.5; // Base score

    // Check if query matches Name/Title field (highest relevance)
    const nameField = entity === 'Case' ? 'Subject' : 'Name';
    if (record[nameField]?.toLowerCase().includes(queryLower)) {
      score = 0.9;
    }

    // Check if query matches other fields
    Object.values(record).forEach((value: any) => {
      if (typeof value === 'string' && value.toLowerCase().includes(queryLower)) {
        score = Math.max(score, 0.7);
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Extract highlighted text from record
   */
  private extractHighlights(query: string, record: any, entity: string): string[] {
    const queryLower = query.toLowerCase();
    const highlights: string[] = [];

    Object.entries(record).forEach(([key, value]) => {
      if (typeof value === 'string' && value.toLowerCase().includes(queryLower)) {
        // Extract context around the match
        const index = value.toLowerCase().indexOf(queryLower);
        const start = Math.max(0, index - 20);
        const end = Math.min(value.length, index + query.length + 20);
        highlights.push(value.substring(start, end));
      }
    });

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  /**
   * Parse Salesforce webhook (Platform Event or Outbound Message)
   */
  parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null {
    // Handle Platform Events
    if (payload.data?.event?.replayId) {
      return {
        type: payload.data.event.type,
        entity: payload.data.sobject?.type || 'Unknown',
        externalId: payload.data.sobject?.Id || '',
        operation: this.mapChangeType(payload.data.event.type),
        data: payload.data.sobject || {},
        timestamp: new Date(payload.data.event.createdDate),
      };
    }

    // Handle Outbound Messages
    if (payload.soapenv?.Body?.notifications) {
      const notification = payload.soapenv.Body.notifications.Notification;
      return {
        type: 'outbound_message',
        entity: notification.sObject?.type || 'Unknown',
        externalId: notification.sObject?.Id || '',
        operation: 'update',
        data: notification.sObject || {},
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Escape SOQL string value to prevent injection
   */
  private escapeSOQLString(value: string): string {
    // Escape single quotes by doubling them (SOQL standard)
    return value.replace(/'/g, "''");
  }

  /**
   * Validate and sanitize field/entity names to prevent injection
   */
  private sanitizeIdentifier(identifier: string): string {
    // Only allow alphanumeric, underscore, and dot characters
    // This prevents injection through field names
    if (!/^[a-zA-Z0-9_.]+$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return identifier;
  }

  /**
   * Build SOQL query from options
   */
  private buildSOQLQuery(options: FetchOptions): string {
    const { entity, fields, filters, limit, offset, orderBy, orderDirection, modifiedSince, externalUserId } = options;

    // Validate and sanitize entity name
    const sanitizedEntity = this.sanitizeIdentifier(entity || '');

    // Select fields - validate each field name
    const selectFields = fields?.length
      ? fields.map(f => this.sanitizeIdentifier(f)).join(', ')
      : 'Id, Name, CreatedDate, LastModifiedDate';

    let query = `SELECT ${selectFields} FROM ${sanitizedEntity}`;

    // WHERE clauses
    const whereClauses: string[] = [];

    // Add OwnerId filter if externalUserId is provided (for user-scoped data)
    if (externalUserId) {
      // Validate externalUserId format (Salesforce IDs are 15 or 18 alphanumeric characters)
      if (!/^[a-zA-Z0-9]{15,18}$/.test(externalUserId)) {
        throw new Error('Invalid externalUserId format');
      }
      // Check if entity supports OwnerId field (most Salesforce objects do)
      const ownerIdEntities = ['Account', 'Contact', 'Lead', 'Opportunity', 'Case', 'Task', 'Event', 'Campaign'];
      if (ownerIdEntities.includes(sanitizedEntity)) {
        whereClauses.push(`OwnerId = '${externalUserId}'`);
      }
    }

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        // Skip externalUserId if it's in filters (we handle it above)
        if (key === 'externalUserId') {continue;}
        
        // Validate field name
        const sanitizedKey = this.sanitizeIdentifier(key);
        
        if (typeof value === 'string') {
          // Properly escape string values
          const escapedValue = this.escapeSOQLString(value);
          whereClauses.push(`${sanitizedKey} = '${escapedValue}'`);
        } else if (typeof value === 'boolean') {
          whereClauses.push(`${sanitizedKey} = ${value}`);
        } else if (typeof value === 'number') {
          // Validate number is finite and not NaN
          if (!isFinite(value)) {
            throw new Error(`Invalid number value for field ${key}`);
          }
          whereClauses.push(`${sanitizedKey} = ${value}`);
        } else if (value === null) {
          whereClauses.push(`${sanitizedKey} = null`);
        }
      }
    }

    if (modifiedSince) {
      // ISO date strings are safe in SOQL
      whereClauses.push(`LastModifiedDate > ${modifiedSince.toISOString()}`);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // ORDER BY - validate field name
    if (orderBy) {
      const sanitizedOrderBy = this.sanitizeIdentifier(orderBy);
      const sanitizedDirection = (orderDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
      query += ` ORDER BY ${sanitizedOrderBy} ${sanitizedDirection}`;
    }

    // LIMIT and OFFSET - validate numeric values
    if (limit !== undefined) {
      const limitNum = Number(limit);
      if (!isFinite(limitNum) || limitNum < 1 || limitNum > 2000) {
        throw new Error('Invalid limit value (must be between 1 and 2000)');
      }
      query += ` LIMIT ${limitNum}`;
    }
    if (offset !== undefined) {
      const offsetNum = Number(offset);
      if (!isFinite(offsetNum) || offsetNum < 0) {
        throw new Error('Invalid offset value (must be non-negative)');
      }
      query += ` OFFSET ${offsetNum}`;
    }

    return query;
  }

  /**
   * Normalize Salesforce record (remove attributes, etc.)
   */
  private normalizeRecord(record: Record<string, any>): Record<string, any> {
    const { attributes, ...data } = record;
    return data;
  }

  /**
   * Map Salesforce field type to our type
   */
  private mapSalesforceType(sfType: string): 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'array' | 'object' {
    switch (sfType.toLowerCase()) {
      case 'boolean':
        return 'boolean';
      case 'int':
      case 'double':
      case 'currency':
      case 'percent':
        return 'number';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime';
      case 'multipicklist':
        return 'array';
      case 'address':
      case 'location':
        return 'object';
      default:
        return 'string';
    }
  }

  /**
   * Map Salesforce change event type
   */
  private mapChangeType(eventType: string): 'create' | 'update' | 'delete' {
    if (eventType.includes('CREATE')) {return 'create';}
    if (eventType.includes('DELETE')) {return 'delete';}
    return 'update';
  }
}

/**
 * Salesforce integration definition
 */
export const SALESFORCE_DEFINITION: IntegrationDefinition = {
  id: 'salesforce',
  name: 'salesforce',
  displayName: 'Salesforce',
  description: 'Connect to Salesforce CRM to sync contacts, accounts, opportunities, and more.',
  category: IntegrationCategory.CRM,
  icon: 'salesforce',
  color: '#00A1E0',
  visibility: 'public',
  isPremium: false,
  capabilities: ['read', 'write', 'delete', 'search', 'realtime', 'bulk'],
  supportedSyncDirections: ['pull', 'push', 'bidirectional'],
  supportsRealtime: true,
  supportsWebhooks: true,
  authType: 'oauth2',
  oauthConfig: {
    authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
    scopes: ['api', 'refresh_token', 'offline_access'],
    clientIdEnvVar: 'SALESFORCE_CLIENT_ID',
    clientSecretEnvVar: 'SALESFORCE_CLIENT_SECRET',
    redirectUri: process.env.API_BASE_URL + '/api/integrations/oauth/callback',
    pkce: false,
  },
  availableEntities: [
    {
      name: 'Contact',
      displayName: 'Contact',
      description: 'Salesforce Contacts',
      fields: [],
      supportsPull: true,
      supportsPush: true,
      supportsDelete: true,
      supportsWebhook: true,
      idField: 'Id',
      modifiedField: 'LastModifiedDate',
    },
    {
      name: 'Account',
      displayName: 'Account',
      description: 'Salesforce Accounts (Companies)',
      fields: [],
      supportsPull: true,
      supportsPush: true,
      supportsDelete: true,
      supportsWebhook: true,
      idField: 'Id',
      modifiedField: 'LastModifiedDate',
    },
    {
      name: 'Opportunity',
      displayName: 'Opportunity',
      description: 'Salesforce Opportunities (Deals)',
      fields: [],
      supportsPull: true,
      supportsPush: true,
      supportsDelete: true,
      supportsWebhook: true,
      idField: 'Id',
      modifiedField: 'LastModifiedDate',
    },
    {
      name: 'Lead',
      displayName: 'Lead',
      description: 'Salesforce Leads',
      fields: [],
      supportsPull: true,
      supportsPush: true,
      supportsDelete: true,
      supportsWebhook: true,
      idField: 'Id',
      modifiedField: 'LastModifiedDate',
    },
  ],
  connectionScope: 'tenant',
  status: 'active',
  version: '1.0.0',
  documentationUrl: 'https://developer.salesforce.com/docs',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Salesforce adapter factory
 */
export const salesforceAdapterFactory: IntegrationAdapterFactory = {
  create(monitoring, connectionService, tenantId, connectionId) {
    return new SalesforceAdapter(monitoring, connectionService, tenantId, connectionId);
  },
};

// Register adapter
adapterRegistry.register('salesforce', salesforceAdapterFactory);




