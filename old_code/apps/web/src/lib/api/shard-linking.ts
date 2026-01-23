import apiClient from './client'
import { LinkRelationshipType, CreateLinkInput, ShardLink } from '@/types/shard-linking'

export const shardLinkingApi = {
    /**
     * Create a link between two shards
     */
    createLink: async (data: CreateLinkInput): Promise<ShardLink> => {
        const response = await apiClient.post<ShardLink>('/api/v1/shards/links', data)
        return response.data
    },

    /**
     * Validate a link before creation
     */
    validateLink: async (params: {
        projectId: string
        fromShardId: string
        toShardId: string
        relationshipType: LinkRelationshipType
    }): Promise<{ isValid: boolean; errors: any[] }> => {
        const response = await apiClient.get<{ isValid: boolean; errors: any[] }>('/api/v1/shards/links/validate', {
            params,
        })
        return response.data
    },
}
