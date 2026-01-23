import apiClient from './client'

// Phase 2 Audit Trail API types
export type AuditTrailEventType =
  | 'create'
  | 'update'
  | 'delete'
  | 'read'
  | 'redacted_access'
  | 'relationship_add'
  | 'relationship_remove'

export interface AuditTrailLog {
  id: string
  eventType: AuditTrailEventType
  targetShardId: string
  targetShardTypeId: string
  userId: string
  action: string
  changes?: Array<{
    field: string
    oldValue: unknown
    newValue: unknown
  }>
  metadata?: {
    ipAddress?: string
    userAgent?: string
    [key: string]: unknown
  }
  createdAt: string
}

export interface AuditTrailResponse {
  logs: AuditTrailLog[]
  count: number
}

export interface AuditTrailShardResponse {
  shardId: string
  logs: AuditTrailLog[]
  count: number
}

export interface AuditTrailQueryParams {
  targetShardId?: string
  eventType?: AuditTrailEventType
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
}

// Phase 2 Audit Trail API endpoints
export const phase2AuditTrailApi = {
  /**
   * Query audit logs for shards
   */
  getAuditTrail: async (params?: AuditTrailQueryParams): Promise<AuditTrailResponse> => {
    const response = await apiClient.get<AuditTrailResponse>('/api/v1/audit-trail', {
      params,
    })
    return response.data
  },

  /**
   * Get audit logs for a specific shard
   */
  getShardAuditTrail: async (
    shardId: string,
    params?: Omit<AuditTrailQueryParams, 'targetShardId'>
  ): Promise<AuditTrailShardResponse> => {
    const response = await apiClient.get<AuditTrailShardResponse>(
      `/api/v1/audit-trail/shard/${shardId}`,
      { params }
    )
    return response.data
  },
}

export default phase2AuditTrailApi






