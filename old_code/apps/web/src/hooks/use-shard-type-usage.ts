import { useQuery } from '@tanstack/react-query'
import { shardTypeApi } from '@/lib/api/shard-types'
import { shardTypeKeys } from './use-shard-types'
import type { ShardTypeUsage } from '@/types/api'

/**
 * Hook to fetch usage statistics for a shard type
 * Shows how many shards are using this type
 * 
 * @example
 * ```tsx
 * const { data: usage } = useShardTypeUsage(shardTypeId)
 * console.log(`${usage.shardCount} shards using this type`)
 * ```
 */
export function useShardTypeUsage(id: string | undefined) {
    return useQuery<ShardTypeUsage>({
        queryKey: shardTypeKeys.usage(id || ''),
        queryFn: () => shardTypeApi.getUsage(id!),
        enabled: !!id,
        staleTime: 60 * 1000, // 1 minute
    })
}

/**
 * Hook to check if a shard type can be safely deleted
 * Returns boolean and count of dependent shards
 * 
 * @example
 * ```tsx
 * const { canDelete, shardCount } = useCanDeleteShardType(id)
 * 
 * if (!canDelete) {
 *   alert(`Cannot delete: ${shardCount} shards are using this type`)
 * }
 * ```
 */
export function useCanDeleteShardType(id: string | undefined) {
    const { data: usage, isLoading } = useShardTypeUsage(id)

    return {
        canDelete: usage ? usage.shardCount === 0 : true,
        shardCount: usage?.shardCount || usage?.usageCount || 0,
        isLoading,
        usage,
    }
}
