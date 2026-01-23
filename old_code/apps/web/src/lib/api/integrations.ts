/**
 * Integration API Client
 * Client functions for integration endpoints
 */

import apiClient from './client';
import type {
  IntegrationProviderDocument,
  IntegrationDocument,
  IntegrationSearchResult,
} from '@/types/integration';
import { createEndpointValidator } from './response-validator';

// Conversion Schema Types (matching backend types)
export interface ConversionSchema {
  id: string;
  tenantIntegrationId: string;
  tenantId: string;
  name: string;
  description?: string;
  source: {
    entity: string;
    provider?: string;
  };
  target: {
    shardTypeId: string;
    shardTypeName?: string;
  };
  fieldMappings: Array<{
    id?: string;
    sourceField: string;
    targetField: string;
    transformation?: {
      type: string;
      config?: Record<string, unknown>;
    };
  }>;
  relationshipMappings?: Array<{
    sourceRelationship: string;
    targetShardTypeId: string;
    mapping: Record<string, string>;
  }>;
  preserveRelationships: boolean;
  deduplication: {
    enabled: boolean;
    strategy?: string;
    fields?: string[];
    compositeFields?: string[];
  };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionSchemaListResponse {
  schemas: ConversionSchema[];
  total: number;
  hasMore: boolean;
}

export const integrationApi = {
  // ============================================================================
  // Provider Endpoints (Super Admin)
  // ============================================================================

  /**
   * Create integration provider
   */
  createProvider: async (data: any): Promise<IntegrationProviderDocument> => {
    const response = await apiClient.post<IntegrationProviderDocument>(
      '/api/admin/integrations',
      data
    );
    return response.data;
  },

  /**
   * List integration providers
   */
  listProviders: async (params?: {
    category?: string;
    status?: string;
    audience?: string;
    supportsSearch?: boolean;
    supportsNotifications?: boolean;
    requiresUserScoping?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ providers: IntegrationProviderDocument[]; total: number; hasMore: boolean }> => {
    const response = await apiClient.get<{ providers: IntegrationProviderDocument[]; total: number; hasMore: boolean }>(
      '/api/admin/integrations',
      { params }
    );
    return response.data;
  },

  /**
   * Get integration provider
   */
  getProvider: async (category: string, id: string): Promise<IntegrationProviderDocument> => {
    const response = await apiClient.get<IntegrationProviderDocument>(
      `/api/admin/integrations/${category}/${id}`
    );
    return response.data;
  },

  /**
   * Get integration provider by provider name (searches across all categories)
   */
  getProviderByName: async (providerName: string): Promise<IntegrationProviderDocument> => {
    const response = await apiClient.get<IntegrationProviderDocument>(
      `/api/admin/integrations/by-name/${providerName}`
    );
    return response.data;
  },

  /**
   * Update integration provider
   */
  updateProvider: async (category: string, id: string, data: any): Promise<IntegrationProviderDocument> => {
    const response = await apiClient.patch<IntegrationProviderDocument>(
      `/api/admin/integrations/${category}/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete integration provider
   */
  deleteProvider: async (category: string, id: string): Promise<void> => {
    await apiClient.delete(`/api/admin/integrations/${category}/${id}`);
  },

  /**
   * Change provider status
   */
  changeProviderStatus: async (
    category: string,
    id: string,
    status: 'active' | 'beta' | 'deprecated' | 'disabled'
  ): Promise<IntegrationProviderDocument> => {
    const response = await apiClient.patch<IntegrationProviderDocument>(
      `/api/admin/integrations/${category}/${id}/status`,
      { status }
    );
    return response.data;
  },

  /**
   * Change provider audience
   */
  changeProviderAudience: async (
    category: string,
    id: string,
    audience: 'system' | 'tenant'
  ): Promise<IntegrationProviderDocument> => {
    const response = await apiClient.patch<IntegrationProviderDocument>(
      `/api/admin/integrations/${category}/${id}/audience`,
      { audience }
    );
    return response.data;
  },

  // ============================================================================
  // Integration Endpoints (Tenant Admin)
  // ============================================================================

  /**
   * List integrations
   */
  listIntegrations: async (params?: {
    providerName?: string;
    status?: string;
    searchEnabled?: boolean;
    userScoped?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ integrations: IntegrationDocument[]; total: number; hasMore: boolean }> => {
    const response = await apiClient.get<{ integrations: IntegrationDocument[]; total: number; hasMore: boolean }>(
      '/api/integrations',
      { params }
    );
    return response.data;
  },

  /**
   * Create integration instance
   */
  createIntegration: async (data: any): Promise<IntegrationDocument> => {
    const response = await apiClient.post<IntegrationDocument>(
      '/api/integrations',
      data
    );
    return response.data;
  },

  /**
   * Get integration
   */
  getIntegration: async (id: string): Promise<IntegrationDocument> => {
    const response = await apiClient.get<IntegrationDocument>(
      `/api/integrations/${id}`
    );
    return response.data;
  },

  /**
   * Update integration
   */
  updateIntegration: async (id: string, data: any): Promise<IntegrationDocument> => {
    const response = await apiClient.patch<IntegrationDocument>(
      `/api/integrations/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete integration
   */
  deleteIntegration: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/integrations/${id}`);
  },

  /**
   * Activate integration
   */
  activateIntegration: async (id: string): Promise<IntegrationDocument> => {
    const response = await apiClient.post<IntegrationDocument>(
      `/api/integrations/${id}/activate`
    );
    return response.data;
  },

  /**
   * Deactivate integration
   */
  deactivateIntegration: async (id: string): Promise<IntegrationDocument> => {
    const response = await apiClient.post<IntegrationDocument>(
      `/api/integrations/${id}/deactivate`
    );
    return response.data;
  },

  /**
   * Test connection
   */
  testConnection: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const response = await apiClient.post<{ success: boolean; error?: string }>(
      `/api/integrations/${id}/test-connection`
    );
    return response.data;
  },

  /**
   * Update data access
   */
  updateDataAccess: async (id: string, allowedShardTypes: string[]): Promise<IntegrationDocument> => {
    const response = await apiClient.patch<IntegrationDocument>(
      `/api/integrations/${id}/data-access`,
      { allowedShardTypes }
    );
    return response.data;
  },

  /**
   * Update search configuration
   */
  updateSearchConfig: async (id: string, config: any): Promise<IntegrationDocument> => {
    const response = await apiClient.patch<IntegrationDocument>(
      `/api/integrations/${id}/search-config`,
      config
    );
    return response.data;
  },

  // ============================================================================
  // Search Endpoints
  // ============================================================================

  /**
   * Global search
   */
  search: async (data: {
    query: string;
    entities?: string[];
    filters?: any;
    limit?: number;
    offset?: number;
    integrationIds?: string[];
  }): Promise<IntegrationSearchResult> => {
    const response = await apiClient.post<IntegrationSearchResult>(
      '/api/integrations/search',
      data
    );
    return response.data;
  },

  /**
   * Search single integration
   */
  searchIntegration: async (
    id: string,
    query: string,
    params?: {
      entities?: string[];
      filters?: any;
      limit?: number;
      offset?: number;
    }
  ): Promise<IntegrationSearchResult> => {
    const response = await apiClient.post<IntegrationSearchResult>(
      `/api/integrations/${id}/search`,
      {
        query,
        entities: params?.entities,
        filters: params?.filters,
        limit: params?.limit,
        offset: params?.offset,
      }
    );
    return response.data;
  },

  /**
   * Get searchable integrations for tenant
   */
  getSearchableIntegrations: async (): Promise<{ integrations: IntegrationDocument[] }> => {
    const response = await apiClient.get<{ integrations: IntegrationDocument[] }>(
      '/api/integrations/searchable'
    );
    return response.data;
  },

  /**
   * Start OAuth authorization flow
   */
  startOAuth: async (id: string, returnUrl?: string): Promise<{ authorizationUrl: string; state: string }> => {
    const response = await apiClient.post<{ authorizationUrl: string; state: string }>(
      `/api/integrations/${id}/oauth/authorize`,
      { returnUrl }
    );
    return response.data;
  },

  /**
   * Handle OAuth callback (typically called by OAuth provider redirect)
   */
  handleOAuthCallback: async (id: string, code: string, state: string): Promise<{ success: boolean; returnUrl?: string }> => {
    const response = await apiClient.get<{ success: boolean; returnUrl?: string }>(
      `/api/integrations/${id}/oauth/callback`,
      { params: { code, state } }
    );
    return response.data;
  },

  // ============================================================================
  // Sync Task Endpoints
  // ============================================================================

  /**
   * Create sync task
   */
  createSyncTask: async (integrationId: string, data: any): Promise<any> => {
    const response = await apiClient.post<any>(
      `/api/v1/integrations/${integrationId}/sync-tasks`,
      data
    );
    return response.data;
  },

  /**
   * List sync tasks for an integration
   */
  listSyncTasks: async (
    integrationId: string,
    params?: {
      status?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ tasks: any[]; total: number; hasMore: boolean }> => {
    const response = await apiClient.get<{ tasks: any[]; total: number; hasMore: boolean }>(
      `/api/v1/integrations/${integrationId}/sync-tasks`,
      { params }
    );
    return response.data;
  },

  /**
   * Get sync task
   */
  getSyncTask: async (integrationId: string, taskId: string): Promise<any> => {
    const response = await apiClient.get<any>(
      `/api/v1/integrations/${integrationId}/sync-tasks/${taskId}`
    );
    return response.data;
  },

  /**
   * Update sync task
   */
  updateSyncTask: async (integrationId: string, taskId: string, data: any): Promise<any> => {
    const response = await apiClient.patch<any>(
      `/api/v1/integrations/${integrationId}/sync-tasks/${taskId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete sync task
   */
  deleteSyncTask: async (integrationId: string, taskId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/integrations/${integrationId}/sync-tasks/${taskId}`);
  },

  /**
   * Trigger sync task execution
   */
  triggerSyncTask: async (integrationId: string, taskId: string): Promise<any> => {
    const response = await apiClient.post<any>(
      `/api/v1/integrations/${integrationId}/sync-tasks/${taskId}/trigger`
    );
    return response.data;
  },

  // ============================================================================
  // Conversion Schema Endpoints
  // ============================================================================

  /**
   * Create conversion schema
   */
  createConversionSchema: async (integrationId: string, data: {
    name: string;
    description?: string;
    source: { entity: string; provider?: string };
    target: { shardTypeId: string; shardTypeName?: string };
    fieldMappings: Array<{
      sourceField: string;
      targetField: string;
      transformation?: { type: string; config?: Record<string, unknown> };
    }>;
    relationshipMappings?: Array<{
      sourceRelationship: string;
      targetShardTypeId: string;
      mapping: Record<string, string>;
    }>;
    preserveRelationships?: boolean;
    deduplication: {
      enabled: boolean;
      strategy?: string;
      fields?: string[];
      compositeFields?: string[];
    };
    isActive?: boolean;
  }): Promise<ConversionSchema> => {
    const endpoint = `/api/v1/integrations/${integrationId}/conversion-schemas`;
    const validator = createEndpointValidator<ConversionSchema>(endpoint, 'object', {
      schema: {
        type: 'object',
        required: ['id', 'tenantIntegrationId', 'tenantId', 'name', 'source', 'target', 'fieldMappings', 'deduplication', 'isActive', 'createdBy', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', required: true },
          tenantIntegrationId: { type: 'string', required: true },
          tenantId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          source: { type: 'object', required: true },
          target: { type: 'object', required: true },
          fieldMappings: { type: 'array', required: true },
          deduplication: { type: 'object', required: true },
          isActive: { type: 'boolean', required: true },
        },
      },
    });

    const response = await apiClient.post<ConversionSchema>(endpoint, data);
    
    // Validate response
    validator(response.data, 'POST');
    
    return response.data;
  },

  /**
   * List conversion schemas for an integration
   */
  listConversionSchemas: async (
    integrationId: string,
    params?: {
      limit?: number;
      offset?: number;
      isActive?: boolean;
    }
  ): Promise<ConversionSchemaListResponse> => {
    const endpoint = `/api/v1/integrations/${integrationId}/conversion-schemas`;
    const validator = createEndpointValidator<ConversionSchemaListResponse>(endpoint, 'object', {
      schema: {
        type: 'object',
        required: ['schemas', 'total', 'hasMore'],
        properties: {
          schemas: { type: 'array', required: true },
          total: { type: 'number', required: true },
          hasMore: { type: 'boolean', required: true },
        },
      },
    });

    const response = await apiClient.get<ConversionSchemaListResponse>(endpoint, { params });
    
    // Validate response
    validator(response.data, 'GET');
    
    return response.data;
  },

  /**
   * Get conversion schema
   */
  getConversionSchema: async (integrationId: string, schemaId: string): Promise<ConversionSchema> => {
    const endpoint = `/api/v1/integrations/${integrationId}/conversion-schemas/${schemaId}`;
    const validator = createEndpointValidator<ConversionSchema>(endpoint, 'object', {
      schema: {
        type: 'object',
        required: ['id', 'tenantIntegrationId', 'tenantId', 'name', 'source', 'target', 'fieldMappings', 'deduplication', 'isActive'],
        properties: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: true },
          source: { type: 'object', required: true },
          target: { type: 'object', required: true },
        },
      },
    });

    const response = await apiClient.get<ConversionSchema>(endpoint);
    
    // Validate response
    validator(response.data, 'GET');
    
    return response.data;
  },

  /**
   * Update conversion schema
   */
  updateConversionSchema: async (
    integrationId: string,
    schemaId: string,
    data: Partial<{
      name: string;
      description?: string;
      source?: { entity: string; provider?: string };
      target?: { shardTypeId: string; shardTypeName?: string };
      fieldMappings?: Array<{
        sourceField: string;
        targetField: string;
        transformation?: { type: string; config?: Record<string, unknown> };
      }>;
      relationshipMappings?: Array<{
        sourceRelationship: string;
        targetShardTypeId: string;
        mapping: Record<string, string>;
      }>;
      preserveRelationships?: boolean;
      deduplication?: {
        enabled: boolean;
        strategy?: string;
        fields?: string[];
        compositeFields?: string[];
      };
      isActive?: boolean;
    }>
  ): Promise<ConversionSchema> => {
    const endpoint = `/api/v1/integrations/${integrationId}/conversion-schemas/${schemaId}`;
    const validator = createEndpointValidator<ConversionSchema>(endpoint, 'object', {
      schema: {
        type: 'object',
        required: ['id', 'name', 'source', 'target'],
        properties: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: true },
        },
      },
    });

    const response = await apiClient.patch<ConversionSchema>(endpoint, data);
    
    // Validate response
    validator(response.data, 'PATCH');
    
    return response.data;
  },

  /**
   * Delete conversion schema
   */
  deleteConversionSchema: async (integrationId: string, schemaId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/integrations/${integrationId}/conversion-schemas/${schemaId}`);
  },

  /**
   * Test conversion schema with sample data
   */
  testConversionSchema: async (
    integrationId: string,
    schemaId: string,
    sampleData: Record<string, unknown>
  ): Promise<{
    success: boolean;
    output?: Record<string, unknown>;
    errors?: Array<{ field: string; message: string }>;
    warnings?: Array<{ field: string; message: string }>;
  }> => {
    const endpoint = `/api/v1/integrations/${integrationId}/conversion-schemas/${schemaId}/test`;
    const validator = createEndpointValidator(endpoint, 'object', {
      schema: {
        type: 'object',
        required: ['success'],
        properties: {
          success: { type: 'boolean', required: true },
          output: { type: 'object' },
          errors: { type: 'array' },
          warnings: { type: 'array' },
        },
      },
    });

    const response = await apiClient.post<{
      success: boolean;
      output?: Record<string, unknown>;
      errors?: Array<{ field: string; message: string }>;
      warnings?: Array<{ field: string; message: string }>;
    }>(endpoint, { sampleData });
    
    // Validate response
    validator(response.data, 'POST');
    
    return response.data;
  },
};







