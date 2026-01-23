import { apiClient } from './client'
import {
    ShardType,
    CreateShardTypeInput,
    UpdateShardTypeInput,
    ShardTypeUsage,
    SchemaValidationResult,
    ShardTypeListParams,
    PaginatedResponse,
    ShardTypeCategory,
} from '@/types/api'

/**
 * ShardType API Client
 * Handles all API operations for ShardTypes
 */
export const shardTypeApi = {
    /**
     * Get paginated list of shard types with filtering
     */
    list: async (params?: ShardTypeListParams): Promise<PaginatedResponse<ShardType>> => {
        const response = await apiClient.get<any>('/api/v1/shard-types', {
            params,
        })
        return {
            items: response.data.shardTypes,
            total: response.data.count, // Note: This is currently page count, not total count
            page: params?.page || 1,
            limit: params?.limit || 20,
            hasMore: !!response.data.continuationToken,
        }
    },

    /**
     * Get a single shard type by ID
     */
    get: async (id: string): Promise<ShardType> => {
        const response = await apiClient.get<ShardType>(`/api/v1/shard-types/${id}`)
        return response.data
    },

    /**
     * Create a new shard type
     */
    create: async (data: CreateShardTypeInput): Promise<ShardType> => {
        const response = await apiClient.post<ShardType>('/api/v1/shard-types', data)
        return response.data
    },

    /**
     * Update an existing shard type
     */
    update: async (id: string, data: UpdateShardTypeInput): Promise<ShardType> => {
        const response = await apiClient.put<ShardType>(`/api/v1/shard-types/${id}`, data)
        return response.data
    },

    /**
     * Delete a shard type
     */
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/api/v1/shard-types/${id}`)
    },

    /**
     * Get child types of a parent shard type
     */
    getChildren: async (id: string): Promise<ShardType[]> => {
        const response = await apiClient.get<{ children: ShardType[]; count: number }>(
            `/api/v1/shard-types/${id}/children`
        )
        return response.data.children
    },

    /**
     * Get usage statistics for a shard type
     */
    getUsage: async (id: string): Promise<ShardTypeUsage> => {
        const response = await apiClient.get<ShardTypeUsage>(`/api/v1/shard-types/${id}/usage`)
        return response.data
    },

    /**
     * Validate a JSON schema
     */
    validateSchema: async (
        schema: Record<string, unknown>,
        parentShardTypeId?: string
    ): Promise<SchemaValidationResult> => {
        const response = await apiClient.post<SchemaValidationResult>(
            '/api/v1/shard-types/validate-schema',
            {
                schema,
                parentShardTypeId,
            }
        )
        return response.data
    },

    /**
     * Get all global shard types
     */
    getGlobal: async (): Promise<ShardType[]> => {
        const response = await apiClient.get<any>('/api/v1/shard-types', {
            params: { isGlobal: true, limit: 1000 },
        })
        return response.data.shardTypes
    },

    /**
     * Get shard types by category
     */
    getByCategory: async (category: ShardTypeCategory): Promise<ShardType[]> => {
        const response = await apiClient.get<any>('/api/v1/shard-types', {
            params: { category, limit: 1000 },
        })
        return response.data.shardTypes
    },

    /**
     * Search shard types by tags
     */
    searchByTags: async (tags: string[]): Promise<ShardType[]> => {
        const response = await apiClient.get<any>('/api/v1/shard-types', {
            params: { tags: tags.join(','), limit: 1000 },
        })
        return response.data.shardTypes
    },

    /**
     * Clone a shard type with customizations
     */
    clone: async (
        id: string,
        customizations: {
            name?: string
            displayName?: string
            description?: string
            tenantId: string
            category?: ShardTypeCategory
            tags?: string[]
            icon?: string
            color?: string
        }
    ): Promise<ShardType> => {
        const response = await apiClient.post<ShardType>(
            `/api/v1/shard-types/${id}/clone`,
            customizations
        )
        return response.data
    },

    /**
     * Get shard type with resolved relationships
     */
    getWithRelationships: async (id: string): Promise<ShardType> => {
        const response = await apiClient.get<ShardType>(`/api/v1/shard-types/${id}/relationships`)
        return response.data
    },

    /**
     * Trigger manual enrichment for a shard type
     */
    triggerEnrichment: async (
        id: string,
        data?: { sampleData?: Record<string, unknown> }
    ): Promise<{ message: string; enrichmentId?: string }> => {
        const response = await apiClient.post<{ message: string; enrichmentId?: string }>(
            `/api/v1/shard-types/${id}/enrich`,
            data || {}
        )
        return response.data
    },

    /**
     * Get all cloneable shard types (templates)
     */
    getCloneable: async (): Promise<ShardType[]> => {
        const response = await apiClient.get<any>('/api/v1/shard-types', {
            params: { isTemplate: true, limit: 1000 },
        })
        return response.data.shardTypes
    },

    /**
     * Get shard types with enrichment enabled
     */
    getWithEnrichment: async (): Promise<ShardType[]> => {
        const response = await apiClient.get<any>('/api/v1/shard-types', {
            params: { hasEnrichment: true, limit: 1000 },
        })
        return response.data.shardTypes
    },
}

export default shardTypeApi
