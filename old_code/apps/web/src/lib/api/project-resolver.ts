import apiClient from './client'
import type { Shard, InternalRelationship, ExternalRelationship } from '@/types/api'

// Project Resolver API types
export interface ProjectContextResponse {
  project: Shard
  linkedShards: Shard[]
  totalCount: number
  hasMore: boolean
  pagination?: {
    limit: number
    offset: number
  }
}

export interface ProjectContextParams {
  includeExternal?: boolean
  minConfidence?: number
  maxShards?: number
  limit?: number
  offset?: number
}

export interface AddInternalRelationshipsRequest {
  relationships: Array<{
    shardId: string
    shardTypeId?: string
    shardTypeName?: string
    shardName?: string
    metadata?: {
      confidence?: number
      source?: 'crm' | 'llm' | 'messaging' | 'manual'
      [key: string]: unknown
    }
  }>
}

export interface AddExternalRelationshipsRequest {
  relationships: Array<{
    system: string
    systemType: string
    externalId: string
    label?: string
    syncStatus?: 'synced' | 'pending' | 'error'
    syncDirection?: 'inbound' | 'outbound' | 'bidirectional'
    metadata?: Record<string, unknown>
  }>
}

export interface ProjectInsightsResponse {
  projectId: string
  insights: Array<{
    id: string
    shardTypeId: string
    structuredData: Record<string, unknown>
    provenance?: Array<{
      shardId: string
      shardTypeId: string
      shardName: string
      confidence?: number
    }>
    createdAt: string
    updatedAt: string
  }>
  totalCount: number
  filteredCount?: number
}

// Project Resolver API endpoints
export const projectResolverApi = {
  /**
   * Get project context - returns scoped shard set via relationship traversal
   */
  getProjectContext: async (
    projectId: string,
    params?: ProjectContextParams
  ): Promise<ProjectContextResponse> => {
    const response = await apiClient.get<ProjectContextResponse>(
      `/api/v1/projects/${projectId}/context`,
      { params }
    )
    return response.data
  },

  /**
   * Add internal relationships to a project
   */
  addInternalRelationships: async (
    projectId: string,
    data: AddInternalRelationshipsRequest
  ): Promise<{ message: string; relationshipCount: number }> => {
    const response = await apiClient.patch<{ message: string; relationshipCount: number }>(
      `/api/v1/projects/${projectId}/internal-relationships`,
      data
    )
    return response.data
  },

  /**
   * Add external relationships to a project
   */
  addExternalRelationships: async (
    projectId: string,
    data: AddExternalRelationshipsRequest
  ): Promise<{ message: string; relationshipCount: number }> => {
    const response = await apiClient.patch<{ message: string; relationshipCount: number }>(
      `/api/v1/projects/${projectId}/external-relationships`,
      data
    )
    return response.data
  },

  /**
   * Get insights with provenance for a project
   */
  getProjectInsights: async (projectId: string): Promise<ProjectInsightsResponse> => {
    const response = await apiClient.get<ProjectInsightsResponse>(
      `/api/v1/projects/${projectId}/insights`
    )
    return response.data
  },
}

export default projectResolverApi

