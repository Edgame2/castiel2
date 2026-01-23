/**
 * External User IDs Validation Schemas
 */
import { z } from 'zod';
/**
 * External user ID status enum
 */
export const ExternalUserIdStatusSchema = z.enum(['active', 'invalid', 'pending']);
/**
 * External user ID metadata schema
 */
export const ExternalUserIdMetadataSchema = z.record(z.any()).optional();
/**
 * Create/Update external user ID request body
 */
export const CreateExternalUserIdSchema = z.object({
    integrationId: z.string().min(1, 'Integration ID is required'),
    externalUserId: z.string().min(1, 'External user ID is required'),
    integrationName: z.string().optional(),
    connectionId: z.string().optional(),
    metadata: ExternalUserIdMetadataSchema,
    status: ExternalUserIdStatusSchema.optional(),
});
/**
 * Update external user ID request body
 */
export const UpdateExternalUserIdSchema = z.object({
    externalUserId: z.string().min(1).optional(),
    integrationName: z.string().optional(),
    connectionId: z.string().optional(),
    metadata: ExternalUserIdMetadataSchema,
    status: ExternalUserIdStatusSchema.optional(),
});
/**
 * Get external user IDs schema
 */
export const getExternalUserIdsSchema = {
    description: 'Get all external user IDs for a user',
    tags: ['External User IDs', 'User Management'],
    params: {
        type: 'object',
        required: ['tenantId', 'userId'],
        properties: {
            tenantId: { type: 'string', minLength: 1 },
            userId: { type: 'string', minLength: 1 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                externalUserIds: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            integrationId: { type: 'string' },
                            externalUserId: { type: 'string' },
                            integrationName: { type: 'string' },
                            connectionId: { type: 'string' },
                            connectedAt: { type: 'string', format: 'date-time' },
                            lastSyncedAt: { type: 'string', format: 'date-time' },
                            status: { type: 'string', enum: ['active', 'invalid', 'pending'] },
                            metadata: { type: 'object' },
                        },
                        required: ['integrationId', 'externalUserId', 'connectedAt', 'status'],
                    },
                },
            },
        },
    },
};
/**
 * Create/Update external user ID schema
 */
export const createExternalUserIdSchema = {
    description: 'Create or update external user ID for a user',
    tags: ['External User IDs', 'User Management'],
    params: {
        type: 'object',
        required: ['tenantId', 'userId'],
        properties: {
            tenantId: { type: 'string', minLength: 1 },
            userId: { type: 'string', minLength: 1 },
        },
    },
    body: {
        type: 'object',
        required: ['integrationId', 'externalUserId'],
        properties: {
            integrationId: { type: 'string', minLength: 1 },
            externalUserId: { type: 'string', minLength: 1 },
            integrationName: { type: 'string' },
            connectionId: { type: 'string' },
            metadata: { type: 'object' },
            status: { type: 'string', enum: ['active', 'invalid', 'pending'] },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                integrationId: { type: 'string' },
                externalUserId: { type: 'string' },
                integrationName: { type: 'string' },
                connectionId: { type: 'string' },
                connectedAt: { type: 'string', format: 'date-time' },
                lastSyncedAt: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['active', 'invalid', 'pending'] },
                metadata: { type: 'object' },
            },
        },
    },
};
/**
 * Update external user ID schema
 */
export const updateExternalUserIdSchema = {
    description: 'Update external user ID and metadata',
    tags: ['External User IDs', 'User Management'],
    params: {
        type: 'object',
        required: ['tenantId', 'userId', 'integrationId'],
        properties: {
            tenantId: { type: 'string', minLength: 1 },
            userId: { type: 'string', minLength: 1 },
            integrationId: { type: 'string', minLength: 1 },
        },
    },
    body: {
        type: 'object',
        properties: {
            externalUserId: { type: 'string', minLength: 1 },
            integrationName: { type: 'string' },
            connectionId: { type: 'string' },
            metadata: { type: 'object' },
            status: { type: 'string', enum: ['active', 'invalid', 'pending'] },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                integrationId: { type: 'string' },
                externalUserId: { type: 'string' },
                integrationName: { type: 'string' },
                connectionId: { type: 'string' },
                connectedAt: { type: 'string', format: 'date-time' },
                lastSyncedAt: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['active', 'invalid', 'pending'] },
                metadata: { type: 'object' },
            },
        },
    },
};
/**
 * Delete external user ID schema
 */
export const deleteExternalUserIdSchema = {
    description: 'Remove external user ID',
    tags: ['External User IDs', 'User Management'],
    params: {
        type: 'object',
        required: ['tenantId', 'userId', 'integrationId'],
        properties: {
            tenantId: { type: 'string', minLength: 1 },
            userId: { type: 'string', minLength: 1 },
            integrationId: { type: 'string', minLength: 1 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' },
            },
        },
    },
};
/**
 * Sync external user ID schema
 */
export const syncExternalUserIdSchema = {
    description: 'Manually sync external user ID from integration',
    tags: ['External User IDs', 'User Management'],
    params: {
        type: 'object',
        required: ['tenantId', 'userId', 'integrationId'],
        properties: {
            tenantId: { type: 'string', minLength: 1 },
            userId: { type: 'string', minLength: 1 },
            integrationId: { type: 'string', minLength: 1 },
        },
    },
    response: {
        200: {
            type: 'object',
            properties: {
                integrationId: { type: 'string' },
                externalUserId: { type: 'string' },
                integrationName: { type: 'string' },
                connectionId: { type: 'string' },
                connectedAt: { type: 'string', format: 'date-time' },
                lastSyncedAt: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['active', 'invalid', 'pending'] },
                metadata: { type: 'object' },
            },
        },
    },
};
//# sourceMappingURL=external-user-ids.schemas.js.map