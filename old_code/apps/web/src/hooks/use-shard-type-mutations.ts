import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query'
import { shardTypeApi } from '@/lib/api/shard-types'
import { shardTypeKeys } from './use-shard-types'
import type { ShardType, CreateShardTypeInput, UpdateShardTypeInput } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/api/client'

/**
 * Hook to create a new shard type
 * Includes automatic cache invalidation and success/error notifications
 * 
 * @example
 * ```tsx
 * const createMutation = useCreateShardType()
 * 
 * const handleSubmit = async (data: CreateShardTypeInput) => {
 *   await createMutation.mutateAsync(data)
 *   router.push('/shard-types')
 * }
 * ```
 */
export function useCreateShardType(
    options?: Omit<UseMutationOptions<ShardType, Error, CreateShardTypeInput>, 'mutationFn'>
) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateShardTypeInput) => shardTypeApi.create(data),
        onSuccess: (newShardType, variables) => {
            // Invalidate all list queries to fetch fresh data
            queryClient.invalidateQueries({ queryKey: shardTypeKeys.lists() })

            // Optionally set the query data for the new shard type
            queryClient.setQueryData(
                shardTypeKeys.detail(newShardType.id),
                newShardType
            )

            toast.success('Shard type created successfully', {
                description: `${newShardType.displayName} has been created`,
            })
        },
        onError: (error) => {
            const message = handleApiError(error)
            toast.error('Failed to create shard type', {
                description: typeof message === 'string' ? message : message.message || 'An error occurred',
            })
        },
        ...options,
    })
}

/**
 * Hook to update an existing shard type
 * Supports optimistic updates for better UX
 * 
 * @example
 * ```tsx
 * const updateMutation = useUpdateShardType()
 * 
 * const handleUpdate = async () => {
 *   await updateMutation.mutateAsync({
 *     id: shardTypeId,
 *     data: { displayName: 'New Name' }
 *   })
 * }
 * ```
 */
export function useUpdateShardType(
    options?: Omit<
        UseMutationOptions<
            ShardType,
            Error,
            { id: string; data: UpdateShardTypeInput },
            { previousShardType?: ShardType; id: string }
        >,
        'mutationFn'
    >
) {
    const queryClient = useQueryClient()

    return useMutation<
        ShardType,
        Error,
        { id: string; data: UpdateShardTypeInput },
        { previousShardType?: ShardType; id: string }
    >({
        mutationFn: ({ id, data }: { id: string; data: UpdateShardTypeInput }) =>
            shardTypeApi.update(id, data),
    onMutate: async ({ id, data }): Promise<{ previousShardType?: ShardType; id: string }> => {
            // Cancel any outgoing refetches to avoid overwriting optimistic update
            await queryClient.cancelQueries({ queryKey: shardTypeKeys.detail(id) })

            // Snapshot the previous value
            const previousShardType = queryClient.getQueryData<ShardType>(
                shardTypeKeys.detail(id)
            )

            // Optimistically update to the new value
            if (previousShardType) {
                queryClient.setQueryData<ShardType>(shardTypeKeys.detail(id), {
                    ...previousShardType,
                    ...data,
                    updatedAt: new Date().toISOString(),
                })
            }

            // Return context with snapshot
            return { previousShardType, id }
        },
        onSuccess: (updatedShardType, { id }) => {
            // Update the cache with the actual server response
            queryClient.setQueryData(shardTypeKeys.detail(id), updatedShardType)

            // Invalidate list queries to show updated data
            queryClient.invalidateQueries({ queryKey: shardTypeKeys.lists() })

            // Invalidate children if parent changed
            if (updatedShardType.parentShardTypeId) {
                queryClient.invalidateQueries({
                    queryKey: shardTypeKeys.children(updatedShardType.parentShardTypeId),
                })
            }

            toast.success('Shard type updated successfully', {
                description: `${updatedShardType.displayName} has been updated`,
            })
        },
        onError: (error, variables, context) => {
            // Rollback optimistic update on error
            if (context?.previousShardType) {
                queryClient.setQueryData(
                    shardTypeKeys.detail(context.id),
                    context.previousShardType
                )
            }

            const message = handleApiError(error)
            toast.error('Failed to update shard type', {
                description: typeof message === 'string' ? message : message.message || 'An error occurred',
            })
        },
        ...options,
    })
}

/**
 * Hook to delete a shard type
 * Includes confirmation and cache cleanup
 * 
 * @example
 * ```tsx
 * const deleteMutation = useDeleteShardType()
 * 
 * const handleDelete = async (id: string) => {
 *   if (confirm('Are you sure?')) {
 *     await deleteMutation.mutateAsync(id)
 *   }
 * }
 * ```
 */
export function useDeleteShardType(
    options?: Omit<
        UseMutationOptions<void, Error, string, { shardType?: ShardType; id: string }>,
        'mutationFn'
    >
) {
    const queryClient = useQueryClient()

    return useMutation<void, Error, string, { shardType?: ShardType; id: string }>({
        mutationFn: (id: string) => shardTypeApi.delete(id),
    onMutate: async (id): Promise<{ shardType?: ShardType; id: string }> => {
            // Cancel queries for this shard type
            await queryClient.cancelQueries({ queryKey: shardTypeKeys.detail(id) })

            // Get the shard type for the success message
            const shardType = queryClient.getQueryData<ShardType>(
                shardTypeKeys.detail(id)
            )

            return { shardType, id }
        },
        onSuccess: (_, id, context) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: shardTypeKeys.detail(id) })

            // Invalidate all lists
            queryClient.invalidateQueries({ queryKey: shardTypeKeys.lists() })

            // Invalidate children queries if it had a parent
            const shardType = context?.shardType
            if (shardType?.parentShardTypeId) {
                queryClient.invalidateQueries({
                    queryKey: shardTypeKeys.children(shardType.parentShardTypeId),
                })
            }

            toast.success('Shard type deleted successfully', {
                description: context?.shardType
                    ? `${context.shardType.displayName} has been deleted`
                    : 'The shard type has been deleted',
            })
        },
        onError: (error) => {
            const message = handleApiError(error)
            toast.error('Failed to delete shard type', {
                description: typeof message === 'string' ? message : message.message || 'An error occurred',
            })
        },
        ...options,
    })
}

/**
 * Hook to clone/duplicate a shard type
 * Creates a copy with a new name
 * 
 * @example
 * ```tsx
 * const cloneMutation = useCloneShardType()
 * 
 * const handleClone = async (id: string) => {
 *   const cloned = await cloneMutation.mutateAsync(id)
 *   router.push(`/shard-types/${cloned.id}/edit`)
 * }
 * ```
 */
export function useCloneShardType(
    options?: Omit<UseMutationOptions<ShardType, Error, string>, 'mutationFn'>
) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            // Fetch the original shard type
            const original = await shardTypeApi.get(id)

            // Create a cloned version
            const cloneData: CreateShardTypeInput = {
                name: `${original.name}-copy`,
                displayName: `${original.displayName} (Copy)`,
                description: original.description,
                category: original.category,
                schema: original.schema,
                uiSchema: original.uiSchema,
                icon: original.icon,
                color: original.color,
                tags: original.tags,
                parentShardTypeId: original.parentShardTypeId,
                isGlobal: false, // Clones are never global by default
            }

            return shardTypeApi.create(cloneData)
        },
        onSuccess: (clonedShardType) => {
            queryClient.invalidateQueries({ queryKey: shardTypeKeys.lists() })
            queryClient.setQueryData(
                shardTypeKeys.detail(clonedShardType.id),
                clonedShardType
            )

            toast.success('Shard type cloned successfully', {
                description: `Created ${clonedShardType.displayName}`,
                action: {
                    label: 'View',
                    onClick: () => {
                        window.location.href = `/shard-types/${clonedShardType.id}`
                    },
                },
            })
        },
        onError: (error) => {
            const message = handleApiError(error)
            toast.error('Failed to clone shard type', {
                description: typeof message === 'string' ? message : message.message || 'An error occurred',
            })
        },
        ...options,
    })
}

/**
 * Hook for batch operations on shard types
 * Useful for bulk delete or update operations
 * 
 * @example
 * ```tsx
 * const batchDelete = useBatchDeleteShardTypes()
 * 
 * const handleBatchDelete = async (ids: string[]) => {
 *   await batchDelete.mutateAsync(ids)
 * }
 * ```
 */
export function useBatchDeleteShardTypes(
    options?: Omit<UseMutationOptions<void, Error, string[]>, 'mutationFn'>
) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (ids: string[]) => {
            // Delete in parallel
            await Promise.all(ids.map((id) => shardTypeApi.delete(id)))
        },
        onSuccess: (_, ids) => {
            // Remove all from cache
            ids.forEach((id) => {
                queryClient.removeQueries({ queryKey: shardTypeKeys.detail(id) })
            })

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: shardTypeKeys.lists() })

            toast.success(`${ids.length} shard types deleted successfully`)
        },
        onError: (error) => {
            const message = handleApiError(error)
            toast.error('Failed to delete shard types', {
                description: typeof message === 'string' ? message : message.message || 'An error occurred',
            })
        },
        ...options,
    })
}
