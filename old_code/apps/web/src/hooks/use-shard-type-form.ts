import { useForm, UseFormProps, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CreateShardTypeInput, UpdateShardTypeInput } from '@/types/api'
import { ShardTypeCategory, ShardTypeStatus } from '@/types/api'
import type { EmbeddingTemplate } from '@/lib/api/embedding-templates'

/**
 * Zod schema for shard type form validation
 * Enforces data integrity and provides type-safe validation
 */
export const shardTypeFormSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters')
        .regex(
            /^[a-z0-9_-]+$/,
            'Name must be lowercase letters, numbers, hyphens, and underscores only'
        ),
    displayName: z
        .string()
        .min(2, 'Display name must be at least 2 characters')
        .max(200, 'Display name must be less than 200 characters'),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    category: z.nativeEnum(ShardTypeCategory),
    schema: z.record(z.string(), z.any()).refine((val) => {
        // Basic JSON Schema validation
        return val && typeof val === 'object'
    }, { message: 'Schema must be a valid object' }),
    uiSchema: z.record(z.string(), z.any()).optional(),
    isGlobal: z.boolean(),
    parentShardTypeId: z.string().uuid().optional(),
    icon: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
    tags: z.array(z.string()),
    isCustom: z.boolean().optional(),
    isBuiltIn: z.boolean().optional(),
    embeddingTemplate: z.record(z.string(), z.any()).optional(),
})

export type ShardTypeFormValues = z.infer<typeof shardTypeFormSchema>

/**
 * Hook to manage shard type form state and validation
 * Combines React Hook Form with Zod validation
 * 
 * @example
 * ```tsx
 * const form = useShardTypeForm({
 *   defaultValues: existingShardType,
 *   mode: 'edit'
 * })
 * 
 * const handleSubmit = form.handleSubmit(async (data) => {
 *   await updateMutation.mutateAsync({ id, data })
 * })
 * ```
 */
export function useShardTypeForm(
    options?: {
        defaultValues?: Partial<CreateShardTypeInput | UpdateShardTypeInput>
    } & Omit<UseFormProps<ShardTypeFormValues>, 'resolver'>
) {
    const { defaultValues, ...formOptions } = options || {}

    return useForm<ShardTypeFormValues>({
        resolver: zodResolver(shardTypeFormSchema),
        defaultValues: {
            name: '',
            displayName: '',
            description: '',
            category: ShardTypeCategory.CUSTOM,
            schema: { type: 'object', properties: {}, required: [] },
            uiSchema: {},
            isGlobal: false,
            tags: [],
            icon: 'File',
            color: '#3b82f6',
            ...defaultValues,
        },
        mode: 'onChange', // Validate on change for better UX
        ...formOptions,
    })
}

/**
 * Hook to transform form values to API payload
 * Handles differences between form state and API requirements
 * 
 * @example
 * ```tsx
 * const { toCreateInput, toUpdateInput } = useShardTypeFormTransform()
 * 
 * const createPayload = toCreateInput(formValues)
 * const updatePayload = toUpdateInput(formValues)
 * ```
 */
export function useShardTypeFormTransform() {
    const toCreateInput = (
        values: ShardTypeFormValues
    ): CreateShardTypeInput => {
        return {
            name: values.name,
            displayName: values.displayName,
            description: values.description,
            category: values.category,
            schema: values.schema,
            uiSchema: values.uiSchema,
            isGlobal: values.isGlobal,
            parentShardTypeId: values.parentShardTypeId,
            icon: values.icon,
            color: values.color,
            tags: values.tags,
            isCustom: values.isCustom,
            isBuiltIn: values.isBuiltIn,
            embeddingTemplate: values.embeddingTemplate,
        } as CreateShardTypeInput
    }

    const toUpdateInput = (
        values: Partial<ShardTypeFormValues>
    ): UpdateShardTypeInput => {
        return {
            name: values.name,
            displayName: values.displayName,
            description: values.description,
            category: values.category,
            schema: values.schema,
            uiSchema: values.uiSchema,
            isGlobal: values.isGlobal,
            status: ShardTypeStatus.ACTIVE,
            icon: values.icon,
            color: values.color,
            tags: values.tags,
            parentShardTypeId: values.parentShardTypeId,
        }
    }

    return {
        toCreateInput,
        toUpdateInput,
    }
}

/**
 * Validation messages for common form errors
 */
export const shardTypeFormErrors = {
    nameRequired: 'Name is required',
    nameInvalid: 'Name must be lowercase with hyphens only',
    displayNameRequired: 'Display name is required',
    categoryRequired: 'Category is required',
    schemaRequired: 'Schema is required',
    schemaInvalid: 'Schema must be valid JSON Schema',
    colorInvalid: 'Color must be a valid hex color (e.g., #3b82f6)',
}
