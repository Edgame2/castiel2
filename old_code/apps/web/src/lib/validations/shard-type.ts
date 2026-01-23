import { z } from 'zod'
import {
    ShardTypeCategory,
    ShardTypeStatus,
    FieldType,
    AutoPopulateType,
    RelationshipType,
    ValidationRuleType,
    EnrichmentType,
    EnrichmentFrequency,
    EnrichmentTriggerType,
} from '@/types/shard-types'

/**
 * Helper function to validate JSON Schema
 * Basic validation - checks if it's a valid object with required fields
 */
export function isValidJSONSchema(schema: unknown): boolean {
    if (typeof schema !== 'object' || schema === null) {
        return false
    }

    const schemaObj = schema as Record<string, unknown>

    // Must have at least type, $ref, or composition keywords
    if (
        !schemaObj.type &&
        !schemaObj.$ref &&
        !schemaObj.allOf &&
        !schemaObj.anyOf &&
        !schemaObj.oneOf
    ) {
        return false
    }

    return true
}

/**
 * Field Definition Schema
 * Validates individual field configurations
 */
export const fieldDefinitionSchema = z.object({
    type: z.nativeEnum(FieldType),
    label: z.string().optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    // Validation constraints
    minLength: z.number().min(0).optional(),
    maxLength: z.number().min(1).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    // Field options
    options: z
        .array(z.union([z.string(), z.object({ value: z.string(), label: z.string() })]))
        .optional(),
    targetShardType: z.string().optional(),
    currencyCode: z.string().length(3).optional(), // ISO 4217
    defaultValue: z.any().optional(),
    autoPopulate: z.nativeEnum(AutoPopulateType).optional(),
    permissions: z
        .object({
            read: z.array(z.string()).optional(),
            write: z.array(z.string()).optional(),
        })
        .optional(),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    uiWidget: z.string().optional(),
})

export type FieldDefinitionFormData = z.infer<typeof fieldDefinitionSchema>

/**
 * Relationship Definition Schema
 */
export const relationshipDefinitionSchema = z.object({
    name: z.string().min(1, 'Relationship name is required'),
    displayName: z.string().optional(),
    type: z.nativeEnum(RelationshipType),
    targetShardType: z.string().min(1, 'Target ShardType is required'),
    required: z.boolean().optional(),
    cascade: z.boolean().optional(),
})

export type RelationshipDefinitionFormData = z.infer<typeof relationshipDefinitionSchema>

/**
 * Validation Condition Schema
 */
export const validationConditionSchema = z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'exists']),
    value: z.any(),
})

/**
 * Validation Rule Schema
 */
export const validationRuleSchema = z.object({
    type: z.nativeEnum(ValidationRuleType),
    condition: validationConditionSchema.optional(),
    requiredFields: z.array(z.string()).optional(),
    errorMessage: z.string(),
    customValidator: z.string().optional(), // Function name or code
})

export type ValidationRuleFormData = z.infer<typeof validationRuleSchema>

/**
 * Workflow Configuration Schema
 */
export const workflowConfigurationSchema = z.object({
    statusField: z.string().min(1, 'Status field is required'),
    statuses: z.array(
        z.object({
            value: z.string(),
            label: z.string(),
            color: z.string().optional(),
            icon: z.string().optional(),
        })
    ),
    transitions: z.array(
        z.object({
            from: z.string(),
            to: z.string(),
            label: z.string().optional(),
            requiredRole: z.string().optional(),
            condition: validationConditionSchema.optional(),
        })
    ),
    defaultStatus: z.string(),
})

export type WorkflowConfigurationFormData = z.infer<typeof workflowConfigurationSchema>

/**
 * Enrichment Field Config Schema
 */
export const enrichmentFieldConfigSchema = z.object({
    fieldName: z.string().min(1, 'Field name is required'),
    enrichmentType: z.nativeEnum(EnrichmentType),
    prompt: z.string().optional(),
    sourceFields: z.array(z.string()).optional(),
    autoApply: z.boolean().optional().default(false),
    confidence: z.number().min(0).max(1).optional(),
})

export type EnrichmentFieldConfigFormData = z.infer<typeof enrichmentFieldConfigSchema>

/**
 * Enrichment Configuration Schema
 */
export const enrichmentConfigSchema = z.object({
    enabled: z.boolean(),
    fields: z.array(enrichmentFieldConfigSchema),
    frequency: z.nativeEnum(EnrichmentFrequency),
    triggers: z
        .array(
            z.object({
                type: z.nativeEnum(EnrichmentTriggerType),
                condition: validationConditionSchema.optional(),
                schedule: z.string().optional(), // Cron expression
            })
        )
        .optional(),
    provider: z
        .object({
            name: z.string(),
            model: z.string().optional(),
            temperature: z.number().min(0).max(2).optional(),
            maxTokens: z.number().min(1).optional(),
        })
        .optional(),
    budget: z
        .object({
            daily: z.number().min(0).optional(),
            monthly: z.number().min(0).optional(),
        })
        .optional(),
})

export type EnrichmentConfigFormData = z.infer<typeof enrichmentConfigSchema>

/**
 * Field Group Schema
 */
export const fieldGroupSchema = z.object({
    name: z.string().min(1, 'Group name is required'),
    displayName: z.string().optional(),
    fields: z.array(z.string()).min(1, 'At least one field is required'),
    collapsible: z.boolean().optional().default(false),
    collapsed: z.boolean().optional().default(false),
    order: z.number().optional(),
})

export type FieldGroupFormData = z.infer<typeof fieldGroupSchema>

/**
 * Display Configuration Schema
 */
export const displayConfigurationSchema = z.object({
    titleField: z.string().min(1, 'Title field is required'),
    subtitleField: z.string().optional(),
    iconField: z.string().optional(),
    searchableFields: z.array(z.string()),
    sortableFields: z.array(z.string()),
    defaultSortField: z.string().optional(),
    defaultSortOrder: z.enum(['asc', 'desc']).optional(),
})

export type DisplayConfigurationFormData = z.infer<typeof displayConfigurationSchema>

/**
 * Clone ShardType Customizations Schema
 */
export const cloneShardTypeSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name must be less than 100 characters')
        .regex(/^[a-z0-9_-]+$/, 'Name must contain only lowercase letters, numbers, hyphens, and underscores')
        .optional(),
    displayName: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    tenantId: z.string().min(1, 'Tenant ID is required'),
    category: z.nativeEnum(ShardTypeCategory).optional(),
    tags: z.array(z.string()).optional(),
    icon: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export type CloneShardTypeFormData = z.infer<typeof cloneShardTypeSchema>

/**
 * Validation schema for creating a new ShardType
 */
export const createShardTypeSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name must be less than 100 characters')
        .regex(
            /^[a-z0-9_-]+$/,
            'Name must contain only lowercase letters, numbers, hyphens, and underscores'
        ),
    displayName: z
        .string()
        .min(1, 'Display name is required')
        .max(200, 'Display name must be less than 200 characters'),
    description: z
        .string()
        .max(1000, 'Description must be less than 1000 characters')
        .optional(),
    category: z.nativeEnum(ShardTypeCategory),
    // Enhanced schema with structured fields
    schema: z.union([
        // Legacy JSONSchema format (for backward compatibility)
        z.record(z.string(), z.any()).refine(isValidJSONSchema, {
            message: 'Invalid JSON Schema format',
        }),
        // New structured format
        z.object({
            fields: z.record(z.string(), fieldDefinitionSchema),
            allowUnstructuredData: z.boolean().optional(),
        }),
    ]),
    uiSchema: z.record(z.string(), z.any()).optional(),
    icon: z.string().optional(),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF5733)')
        .optional(),
    tags: z.array(z.string()).optional().default([]),
    parentShardTypeId: z.string().uuid('Invalid parent ShardType ID').optional(),
    isGlobal: z.boolean().default(false),
    // New enhanced fields
    relationships: z.array(relationshipDefinitionSchema).optional(),
    validationRules: z.array(validationRuleSchema).optional(),
    workflow: workflowConfigurationSchema.optional(),
    enrichment: enrichmentConfigSchema.optional(),
    fieldGroups: z.array(fieldGroupSchema).optional(),
    display: displayConfigurationSchema.optional(),
    isTemplate: z.boolean().optional().default(false),
})

export type CreateShardTypeFormData = z.infer<typeof createShardTypeSchema>

/**
 * Validation schema for updating an existing ShardType
 */
export const updateShardTypeSchema = createShardTypeSchema.partial().extend({
    status: z.nativeEnum(ShardTypeStatus).optional(),
    isActive: z.boolean().optional(),
})

export type UpdateShardTypeFormData = z.infer<typeof updateShardTypeSchema>

/**
 * Validation schema for ShardType filters
 */
export const shardTypeFilterSchema = z.object({
    search: z.string().optional(),
    category: z.nativeEnum(ShardTypeCategory).optional(),
    status: z.nativeEnum(ShardTypeStatus).optional(),
    isGlobal: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    page: z.number().min(1).optional().default(1),
    limit: z.number().min(1).max(100).optional().default(20),
})

export type ShardTypeFilterFormData = z.infer<typeof shardTypeFilterSchema>

/**
 * Validation schema for schema validation request
 */
export const validateSchemaRequestSchema = z.object({
    schema: z.record(z.string(), z.any()).refine(isValidJSONSchema, {
        message: 'Invalid JSON Schema format',
    }),
    parentShardTypeId: z.string().uuid().optional(),
})

export type ValidateSchemaRequest = z.infer<typeof validateSchemaRequestSchema>
