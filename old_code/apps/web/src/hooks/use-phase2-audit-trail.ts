import { useQuery } from '@tanstack/react-query'
import {
  phase2AuditTrailApi,
  AuditTrailQueryParams,
  AuditTrailEventType,
} from '@/lib/api/phase2-audit-trail'

// Query keys
export const phase2AuditTrailKeys = {
  all: ['phase2-audit-trail'] as const,
  list: (params?: AuditTrailQueryParams) =>
    [...phase2AuditTrailKeys.all, 'list', params] as const,
  shard: (shardId: string, params?: Omit<AuditTrailQueryParams, 'targetShardId'>) =>
    [...phase2AuditTrailKeys.all, 'shard', shardId, params] as const,
}

/**
 * Hook to query audit logs for shards
 */
export function usePhase2AuditTrail(
  params?: AuditTrailQueryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: phase2AuditTrailKeys.list(params),
    queryFn: () => phase2AuditTrailApi.getAuditTrail(params),
    enabled: options?.enabled !== false,
  })
}

/**
 * Hook to get audit logs for a specific shard
 */
export function useShardAuditTrail(
  shardId: string,
  params?: Omit<AuditTrailQueryParams, 'targetShardId'>,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: phase2AuditTrailKeys.shard(shardId, params),
    queryFn: () => phase2AuditTrailApi.getShardAuditTrail(shardId, params),
    enabled: options?.enabled !== false && !!shardId,
  })
}

// Re-export types for convenience
export type { AuditTrailEventType, AuditTrailQueryParams } from '@/lib/api/phase2-audit-trail'






