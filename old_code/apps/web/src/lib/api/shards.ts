import apiClient from './client'
import {
  Shard,
  CreateShardDto,
  UpdateShardDto,
  PaginatedResponse,
  ShardListResponse,
  ShardType,
} from '@/types/api'

// Shard API endpoints
export const shardApi = {
  /**
   * Get paginated list of shards
   */
  getShards: async (params?: {
    page?: number
    limit?: number
    search?: string
    shardTypeId?: string
    isPublic?: boolean
    managerId?: string
    teamMemberId?: string
  }): Promise<ShardListResponse> => {
    const response = await apiClient.get<ShardListResponse>('/api/v1/shards', { params })
    return response.data
  },

  /**
   * Get a single shard by ID
   */
  getShard: async (id: string): Promise<Shard> => {
    const response = await apiClient.get<Shard>(`/api/v1/shards/${id}`)
    return response.data
  },

  /**
   * Create a new shard
   */
  createShard: async (data: CreateShardDto): Promise<Shard> => {
    const response = await apiClient.post<Shard>('/api/v1/shards', data)
    return response.data
  },

  /**
   * Create a new shard with file attachments
   */
  createShardWithFiles: async (data: CreateShardDto, files: File[]): Promise<Shard> => {
    const formData = new FormData()

    // Add shard data as JSON
    formData.append('data', JSON.stringify(data))

    // Add files
    files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await apiClient.post<Shard>('/api/v1/shards', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Update an existing shard
   */
  updateShard: async (id: string, data: UpdateShardDto): Promise<Shard> => {
    const response = await apiClient.patch<Shard>(`/api/v1/shards/${id}`, data)
    return response.data
  },

  /**
   * Delete a shard
   */
  deleteShard: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/shards/${id}`)
  },

  /**
   * Search shards
   */
  searchShards: async (query: string, params?: { limit?: number }): Promise<Shard[]> => {
    const response = await apiClient.get<Shard[]>('/api/v1/shards/search', {
      params: { q: query, ...params },
    })
    return response.data
  },

  /**
   * Vector search shards with semantic similarity
   */
  vectorSearchShards: async (
    query: string,
    params?: {
      limit?: number
      shardTypeId?: string
      minScore?: number
    }
  ): Promise<PaginatedResponse<Shard & { score: number }>> => {
    const response = await apiClient.get<PaginatedResponse<Shard & { score: number }>>(
      '/api/v1/shards/vector-search',
      {
        params: { q: query, ...params },
      }
    )
    return response.data
  },
}

// Shard Type API endpoints
export const shardTypeApi = {
  /**
   * Get all shard types
   */
  getShardTypes: async (): Promise<ShardType[]> => {
    const response = await apiClient.get<{ shardTypes: ShardType[] }>('/api/v1/shard-types')
    return response.data.shardTypes
  },

  /**
   * Get a single shard type by ID
   */
  getShardType: async (id: string): Promise<ShardType> => {
    const response = await apiClient.get<ShardType>(`/api/v1/shard-types/${id}`)
    return response.data
  },

  /**
   * Create a new shard type
   */
  createShardType: async (data: Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShardType> => {
    const response = await apiClient.post<ShardType>('/api/v1/shard-types', data)
    return response.data
  },

  /**
   * Update a shard type
   */
  updateShardType: async (
    id: string,
    data: Partial<Omit<ShardType, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ShardType> => {
    const response = await apiClient.patch<ShardType>(`/api/v1/shard-types/${id}`, data)
    return response.data
  },

  /**
   * Delete a shard type
   */
  deleteShardType: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/shard-types/${id}`)
  },
}
