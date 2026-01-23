import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { shardTypeApi } from '@/lib/api/shard-types'
import type { ShardType, ShardTypeListParams, PaginatedResponse } from '@/types/api'
import { ShardTypeCategory, ShardTypeStatus } from '@/types/api'

/**
 * Query keys factory for ShardTypes
 * Provides consistent query key structure for caching
 */
export const shardTypeKeys = {
    all: ['shardTypes'] as const,
    lists: () => [...shardTypeKeys.all, 'list'] as const,
    list: (params?: ShardTypeListParams) => [...shardTypeKeys.lists(), params] as const,
    details: () => [...shardTypeKeys.all, 'detail'] as const,
    detail: (id: string) => [...shardTypeKeys.details(), id] as const,
    global: () => [...shardTypeKeys.all, 'global'] as const,
    category: (category: string) => [...shardTypeKeys.all, 'category', category] as const,
    children: (id: string) => [...shardTypeKeys.detail(id), 'children'] as const,
    usage: (id: string) => [...shardTypeKeys.detail(id), 'usage'] as const,
}

/**
 * Hook to fetch paginated list of shard types with filtering
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useShardTypes({
 *   category: 'document',
 *   status: 'active',
 *   page: 1,
 *   limit: 20
 * })
 * ```
 */
export function useShardTypes(
    params?: ShardTypeListParams,
    options?: Omit<UseQueryOptions<PaginatedResponse<ShardType>>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: shardTypeKeys.list(params),
        queryFn: () => shardTypeApi.list(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    })
}

/**
 * Hook to fetch a single shard type by ID
 * 
 * @example
 * ```tsx
 * const { data: shardType, isLoading } = useShardType(id)
 * ```
 */
export function useShardType(
    id: string | undefined,
    options?: Omit<UseQueryOptions<ShardType>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: shardTypeKeys.detail(id || ''),
        queryFn: () => shardTypeApi.get(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    })
}

/**
 * Hook to fetch all global/shared shard types
 * These are shard types available across all tenants
 * 
 * @example
 * ```tsx
 * const { data: globalTypes } = useGlobalShardTypes()
 * ```
 */
export function useGlobalShardTypes(
    options?: Omit<UseQueryOptions<PaginatedResponse<ShardType>>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: shardTypeKeys.global(),
        queryFn: () => shardTypeApi.list({ isGlobal: true, limit: 100 }),
        staleTime: 10 * 60 * 1000, // 10 minutes (global types change less frequently)
        ...options,
    })
}

/**
 * Hook to fetch shard types filtered by category
 * 
 * @example
 * ```tsx
 * const { data } = useShardTypesByCategory('document')
 * ```
 */
export function useShardTypesByCategory(
    category: ShardTypeCategory | string,
    options?: Omit<UseQueryOptions<PaginatedResponse<ShardType>>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: shardTypeKeys.category(category),
        queryFn: () => shardTypeApi.list({ category: category as ShardTypeCategory, limit: 100 }),
        staleTime: 5 * 60 * 1000,
        ...options,
    })
}

/**
 * Hook to fetch child shard types of a parent
 * Useful for displaying inheritance hierarchies
 * 
 * @example
 * ```tsx
 * const { data: children } = useShardTypeChildren(parentId)
 * ```
 */
export function useShardTypeChildren(
    parentId: string | undefined,
    options?: Omit<UseQueryOptions<ShardType[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: shardTypeKeys.children(parentId || ''),
        queryFn: () => shardTypeApi.getChildren(parentId!),
        enabled: !!parentId,
        staleTime: 5 * 60 * 1000,
        ...options,
    })
}

/**
 * Hook to fetch active shard types only
 * Commonly used in dropdowns and selectors
 * 
 * @example
 * ```tsx
 * const { data: activeTypes } = useActiveShardTypes()
 * ```
 */
export function useActiveShardTypes(
    options?: Omit<UseQueryOptions<PaginatedResponse<ShardType>>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: shardTypeKeys.list({ status: ShardTypeStatus.ACTIVE }),
        queryFn: () => shardTypeApi.list({ status: ShardTypeStatus.ACTIVE, limit: 100 }),
        staleTime: 5 * 60 * 1000,
        ...options,
    })
}

/**
 * Hook to fetch tenant-specific (non-global) shard types
 * 
 * @example
 * ```tsx
 * const { data: myTypes } = useTenantShardTypes()
 * ```
 */
export function useTenantShardTypes(
    options?: Omit<UseQueryOptions<PaginatedResponse<ShardType>>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: shardTypeKeys.list({ isGlobal: false }),
        queryFn: () => shardTypeApi.list({ isGlobal: false, limit: 100 }),
        staleTime: 5 * 60 * 1000,
        ...options,
    })
}

/**
 * Hook to fetch cloneable shard types (templates)
 */
export function useCloneableShardTypes(
    options?: Omit<UseQueryOptions<ShardType[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: [...shardTypeKeys.all, 'cloneable'],
        queryFn: () => shardTypeApi.getCloneable(),
        staleTime: 10 * 60 * 1000,
        ...options,
    })
}

/**
 * Hook to fetch shard types with enrichment enabled
 */
export function useEnrichmentEnabledTypes(
    options?: Omit<UseQueryOptions<ShardType[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: [...shardTypeKeys.all, 'enrichment'],
        queryFn: () => shardTypeApi.getWithEnrichment(),
        staleTime: 5 * 60 * 1000,
        ...options,
    })
}

/**
 * Hook to fetch shard type with resolved relationships
 */
export function useShardTypeWithRelationships(
    id: string | undefined,
    options?: Omit<UseQueryOptions<ShardType>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: [...shardTypeKeys.detail(id || ''), 'relationships'],
        queryFn: () => shardTypeApi.getWithRelationships(id!),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        ...options,
    })
}

/**
 * Hook to fetch usage statistics for a shard type
 */
export function useShardTypeUsage(
    id: string | undefined,
    options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
    return useQuery({
        queryKey: shardTypeKeys.usage(id || ''),
        queryFn: () => shardTypeApi.getUsage(id!),
        enabled: !!id,
        staleTime: 1 * 60 * 1000, // 1 minute (usage changes frequently)
        ...options,
    })
}
