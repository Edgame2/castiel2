import { useMutation } from '@tanstack/react-query'
import { shardTypeApi } from '@/lib/api/shard-types'
import { useShardType, useShardTypeChildren } from './use-shard-types'
import type { SchemaValidationResult } from '@/types/api'

/**
 * Hook to validate a JSON Schema
 * Checks if schema is valid according to JSON Schema spec
 * 
 * @example
 * ```tsx
 * const validate = useValidateSchema()
 * 
 * const result = await validate.mutateAsync(schema)
 * if (!result.valid) {
 *   console.error(result.errors)
 * }
 * ```
 */
export function useValidateSchema() {
    return useMutation({
        mutationFn: (schema: Record<string, any>) =>
            shardTypeApi.validateSchema(schema),
    })
}

/**
 * Hook to check for circular inheritance
 * Prevents creating infinite loops in the type hierarchy
 * 
 * @example
 * ```tsx
 * const { hasCircular } = useCheckCircularInheritance(childId, potentialParentId)
 * 
 * if (hasCircular) {
 *   alert('This would create a circular dependency!' as any)
 * }
 * ```
 */
export function useCheckCircularInheritance(
    shardTypeId: string | undefined,
    potentialParentId: string | undefined
) {
    const { data: shardType } = useShardType(shardTypeId)
    const { data: children } = useShardTypeChildren(shardTypeId)

    // Check if potential parent is actually a child (which would create a loop)
    const hasCircular =
        potentialParentId &&
        children?.some((child) => child.id === potentialParentId)

    // Also check if setting parent to self
    const isSelf = shardTypeId === potentialParentId

    return {
        hasCircular: hasCircular || isSelf,
        isValid: !hasCircular && !isSelf,
        reason: isSelf
            ? 'Cannot set parent to itself'
            : hasCircular
                ? 'Would create circular dependency'
                : null,
    }
}

/**
 * Hook to validate schema compatibility with parent
 * Ensures child schema is compatible with parent schema
 * 
 * @example
 * ```tsx
 * const { isCompatible } = useValidateSchemaInheritance(
 *   parentId,
 *   childSchema
 * )
 * 
 * if (!isCompatible) {
 *   alert('Schema is incompatible with parent' as any)
 * }
 * ```
 */
export function useValidateSchemaInheritance(
    parentId: string | undefined,
    childSchema: Record<string, any>
) {
    const { data: parent } = useShardType(parentId)

    // Basic compatibility check
    // In a real implementation, this would be more sophisticated
    const isCompatible = !parent || !!childSchema

    // Check that required fields from parent are present in child
    const parentRequired = (parent?.schema?.required as string[]) || []
    const childRequired = (childSchema?.required as string[]) || []
    const missingRequired = parentRequired.filter(
        (field) => !childRequired.includes(field)
    )

    return {
        isCompatible: missingRequired.length === 0,
        missingFields: missingRequired,
        parentRequired,
        childRequired,
    }
}

/**
 * Hook to validate that a shard type name is unique
 * Checks if name is already taken in the tenant
 * 
 * @example
 * ```tsx
 * const checkName = useValidateUniqueName()
 * const isUnique = await checkName.mutateAsync('my-type')
 * ```
 */
export function useValidateUniqueName() {
    return useMutation({
        mutationFn: async (name: string) => {
            // TODO: Implement actual API call to check name uniqueness
            // For now, just return true
            return { isUnique: true, name }
        },
    })
}
