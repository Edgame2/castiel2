/**
 * JSON schemas for shard request validation
 */
/**
 * Source enum values
 */
const sourceEnumValues = ['ui', 'api', 'import', 'integration', 'system'];
/**
 * Status enum values
 */
const statusEnumValues = ['active', 'archived', 'deleted', 'draft'];
/**
 * Permission level enum values
 */
const permissionEnumValues = ['read', 'write', 'delete', 'admin'];
/**
 * Source details schema
 */
const sourceDetailsSchema = {
    type: 'object',
    properties: {
        integrationName: {
            type: 'string',
            maxLength: 100,
        },
        importJobId: {
            type: 'string',
            format: 'uuid',
        },
        originalId: {
            type: 'string',
            maxLength: 500,
        },
        syncedAt: {
            type: 'string',
            format: 'date-time',
        },
    },
    additionalProperties: false,
};
/**
 * Shard metadata schema
 */
const shardMetadataSchema = {
    type: 'object',
    properties: {
        tags: {
            type: 'array',
            items: {
                type: 'string',
                maxLength: 50,
            },
            maxItems: 20,
        },
        category: {
            type: 'string',
            maxLength: 100,
        },
        priority: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
        },
        customFields: {
            type: 'object',
            additionalProperties: true,
        },
    },
    additionalProperties: false,
};
/**
 * ACL entry schema
 */
const aclEntrySchema = {
    type: 'object',
    required: ['permissions', 'grantedBy', 'grantedAt'],
    properties: {
        userId: {
            type: 'string',
            format: 'uuid',
        },
        roleId: {
            type: 'string',
            format: 'uuid',
        },
        permissions: {
            type: 'array',
            items: {
                type: 'string',
                enum: permissionEnumValues,
            },
            minItems: 1,
        },
        grantedBy: {
            type: 'string',
            format: 'uuid',
        },
        grantedAt: {
            type: 'string',
            format: 'date-time',
        },
    },
    additionalProperties: false,
};
/**
 * Unstructured data schema
 */
const unstructuredDataSchema = {
    type: 'object',
    properties: {
        text: {
            type: 'string',
            maxLength: 1000000, // 1MB max
        },
        files: {
            type: 'array',
            items: {
                type: 'object',
                required: ['id', 'name', 'url', 'mimeType', 'size'],
                properties: {
                    id: {
                        type: 'string',
                        format: 'uuid',
                    },
                    name: {
                        type: 'string',
                        maxLength: 255,
                    },
                    url: {
                        type: 'string',
                        format: 'uri',
                    },
                    mimeType: {
                        type: 'string',
                        maxLength: 100,
                    },
                    size: {
                        type: 'integer',
                        minimum: 0,
                    },
                },
                additionalProperties: false,
            },
            maxItems: 50,
        },
        rawData: {
        // Any type allowed
        },
    },
    additionalProperties: false,
};
/**
 * Create shard request schema
 */
export const createShardSchema = {
    body: {
        type: 'object',
        required: ['shardTypeId', 'structuredData'],
        properties: {
            shardTypeId: {
                type: 'string',
                format: 'uuid',
            },
            structuredData: {
                type: 'object',
                additionalProperties: true,
            },
            unstructuredData: unstructuredDataSchema,
            metadata: shardMetadataSchema,
            parentShardId: {
                type: 'string',
                format: 'uuid',
            },
            acl: {
                type: 'array',
                items: aclEntrySchema,
            },
            status: {
                type: 'string',
                enum: statusEnumValues,
            },
            source: {
                type: 'string',
                enum: sourceEnumValues,
                default: 'api',
            },
            sourceDetails: sourceDetailsSchema,
        },
        additionalProperties: false,
    },
};
/**
 * Update shard request schema
 */
export const updateShardSchema = {
    body: {
        type: 'object',
        properties: {
            structuredData: {
                type: 'object',
                additionalProperties: true,
            },
            unstructuredData: unstructuredDataSchema,
            metadata: shardMetadataSchema,
            acl: {
                type: 'array',
                items: aclEntrySchema,
            },
            status: {
                type: 'string',
                enum: statusEnumValues,
            },
        },
        additionalProperties: false,
    },
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                format: 'uuid',
            },
        },
    },
};
/**
 * Patch shard request schema (partial update)
 */
export const patchShardSchema = {
    body: {
        type: 'object',
        properties: {
            structuredData: {
                type: 'object',
                additionalProperties: true,
            },
            unstructuredData: unstructuredDataSchema,
            metadata: shardMetadataSchema,
            status: {
                type: 'string',
                enum: statusEnumValues,
            },
        },
        additionalProperties: false,
        minProperties: 1,
    },
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                format: 'uuid',
            },
        },
    },
};
/**
 * Get shard request schema
 */
export const getShardSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                format: 'uuid',
            },
        },
    },
};
/**
 * Delete shard request schema
 */
export const deleteShardSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                format: 'uuid',
            },
        },
    },
    querystring: {
        type: 'object',
        properties: {
            hardDelete: {
                type: 'boolean',
                default: false,
            },
        },
    },
};
/**
 * List shards request schema
 */
export const listShardsSchema = {
    querystring: {
        type: 'object',
        properties: {
            shardTypeId: {
                type: 'string',
                format: 'uuid',
            },
            status: {
                type: 'string',
                enum: statusEnumValues,
            },
            source: {
                type: 'string',
                enum: sourceEnumValues,
            },
            category: {
                type: 'string',
                maxLength: 100,
            },
            tags: {
                type: 'array',
                items: {
                    type: 'string',
                    maxLength: 50,
                },
            },
            createdAfter: {
                type: 'string',
                format: 'date-time',
            },
            createdBefore: {
                type: 'string',
                format: 'date-time',
            },
            updatedAfter: {
                type: 'string',
                format: 'date-time',
            },
            updatedBefore: {
                type: 'string',
                format: 'date-time',
            },
            lastActivityAfter: {
                type: 'string',
                format: 'date-time',
            },
            lastActivityBefore: {
                type: 'string',
                format: 'date-time',
            },
            archivedAfter: {
                type: 'string',
                format: 'date-time',
            },
            archivedBefore: {
                type: 'string',
                format: 'date-time',
            },
            limit: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 50,
            },
            continuationToken: {
                type: 'string',
            },
            orderBy: {
                type: 'string',
                enum: ['createdAt', 'updatedAt', 'lastActivityAt'],
                default: 'createdAt',
            },
            orderDirection: {
                type: 'string',
                enum: ['asc', 'desc'],
                default: 'desc',
            },
        },
    },
};
/**
 * Bulk create shards request schema
 */
export const bulkCreateShardsSchema = {
    body: {
        type: 'object',
        required: ['shards'],
        properties: {
            shards: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['shardTypeId', 'structuredData'],
                    properties: {
                        shardTypeId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        structuredData: {
                            type: 'object',
                            additionalProperties: true,
                        },
                        unstructuredData: unstructuredDataSchema,
                        metadata: shardMetadataSchema,
                        parentShardId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        source: {
                            type: 'string',
                            enum: sourceEnumValues,
                        },
                        sourceDetails: sourceDetailsSchema,
                    },
                    additionalProperties: false,
                },
                minItems: 1,
                maxItems: 100,
            },
            options: {
                type: 'object',
                properties: {
                    skipValidation: {
                        type: 'boolean',
                        default: false,
                    },
                    skipEnrichment: {
                        type: 'boolean',
                        default: false,
                    },
                    skipEvents: {
                        type: 'boolean',
                        default: false,
                    },
                    transactional: {
                        type: 'boolean',
                        default: false,
                    },
                    onError: {
                        type: 'string',
                        enum: ['continue', 'abort'],
                        default: 'continue',
                    },
                },
                additionalProperties: false,
            },
        },
        additionalProperties: false,
    },
};
/**
 * Bulk update shards request schema
 */
export const bulkUpdateShardsSchema = {
    body: {
        type: 'object',
        required: ['updates'],
        properties: {
            updates: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                        },
                        structuredData: {
                            type: 'object',
                            additionalProperties: true,
                        },
                        metadata: shardMetadataSchema,
                        status: {
                            type: 'string',
                            enum: statusEnumValues,
                        },
                    },
                    additionalProperties: false,
                },
                minItems: 1,
                maxItems: 100,
            },
            options: {
                type: 'object',
                properties: {
                    skipValidation: {
                        type: 'boolean',
                        default: false,
                    },
                    createRevision: {
                        type: 'boolean',
                        default: true,
                    },
                },
                additionalProperties: false,
            },
        },
        additionalProperties: false,
    },
};
/**
 * Bulk delete shards request schema
 */
export const bulkDeleteShardsSchema = {
    body: {
        type: 'object',
        required: ['shardIds'],
        properties: {
            shardIds: {
                type: 'array',
                items: {
                    type: 'string',
                    format: 'uuid',
                },
                minItems: 1,
                maxItems: 100,
            },
            options: {
                type: 'object',
                properties: {
                    hardDelete: {
                        type: 'boolean',
                        default: false,
                    },
                    skipEvents: {
                        type: 'boolean',
                        default: false,
                    },
                },
                additionalProperties: false,
            },
        },
        additionalProperties: false,
    },
};
/**
 * Restore shard request schema
 */
export const restoreShardSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                format: 'uuid',
            },
        },
    },
};
/**
 * Update last activity request schema
 */
export const updateActivitySchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                format: 'uuid',
            },
        },
    },
    body: {
        type: 'object',
        properties: {
            activityType: {
                type: 'string',
                enum: ['view', 'edit', 'relationship_change', 'comment', 'share'],
            },
        },
        additionalProperties: false,
    },
};
//# sourceMappingURL=shard.schemas.js.map