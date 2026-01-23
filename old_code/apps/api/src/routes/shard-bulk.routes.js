/**
 * Shard Bulk Operations Routes
 *
 * Routes for bulk shard operations
 */
const bulkCreateSchema = {
    body: {
        type: 'object',
        required: ['shards'],
        properties: {
            shards: {
                type: 'array',
                maxItems: 100,
                items: {
                    type: 'object',
                    required: ['shardTypeId', 'structuredData'],
                    properties: {
                        shardTypeId: { type: 'string' },
                        structuredData: { type: 'object' },
                        unstructuredData: { type: 'object' },
                        metadata: { type: 'object' },
                        parentShardId: { type: 'string' },
                    },
                },
            },
            options: {
                type: 'object',
                properties: {
                    skipValidation: { type: 'boolean' },
                    skipEnrichment: { type: 'boolean' },
                    skipEvents: { type: 'boolean' },
                    transactional: { type: 'boolean' },
                    onError: { type: 'string', enum: ['continue', 'abort'] },
                },
            },
        },
    },
};
const bulkUpdateSchema = {
    body: {
        type: 'object',
        required: ['updates'],
        properties: {
            updates: {
                type: 'array',
                maxItems: 100,
                items: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: { type: 'string' },
                        structuredData: { type: 'object' },
                        unstructuredData: { type: 'object' },
                        metadata: { type: 'object' },
                        status: { type: 'string', enum: ['active', 'archived', 'draft'] },
                    },
                },
            },
            options: {
                type: 'object',
                properties: {
                    skipValidation: { type: 'boolean' },
                    createRevision: { type: 'boolean' },
                    skipEvents: { type: 'boolean' },
                    onError: { type: 'string', enum: ['continue', 'abort'] },
                },
            },
        },
    },
};
const bulkDeleteSchema = {
    body: {
        type: 'object',
        required: ['shardIds'],
        properties: {
            shardIds: {
                type: 'array',
                maxItems: 100,
                items: { type: 'string' },
            },
            options: {
                type: 'object',
                properties: {
                    hardDelete: { type: 'boolean' },
                    skipEvents: { type: 'boolean' },
                    onError: { type: 'string', enum: ['continue', 'abort'] },
                },
            },
        },
    },
};
const bulkRestoreSchema = {
    body: {
        type: 'object',
        required: ['shardIds'],
        properties: {
            shardIds: {
                type: 'array',
                maxItems: 100,
                items: { type: 'string' },
            },
            options: {
                type: 'object',
                properties: {
                    skipEvents: { type: 'boolean' },
                },
            },
        },
    },
};
const restoreShardSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' },
        },
    },
};
const bulkStatusChangeSchema = {
    body: {
        type: 'object',
        required: ['shardIds', 'status'],
        properties: {
            shardIds: {
                type: 'array',
                maxItems: 100,
                items: { type: 'string' },
            },
            status: {
                type: 'string',
                enum: ['active', 'archived', 'draft', 'deleted'],
            },
            options: {
                type: 'object',
                properties: {
                    skipEvents: { type: 'boolean' },
                    onError: { type: 'string', enum: ['continue', 'abort'] },
                },
            },
        },
    },
};
const bulkTagOperationSchema = {
    body: {
        type: 'object',
        required: ['shardIds', 'operation', 'tags'],
        properties: {
            shardIds: {
                type: 'array',
                maxItems: 100,
                items: { type: 'string' },
            },
            operation: {
                type: 'string',
                enum: ['add', 'remove', 'set'],
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
            },
            options: {
                type: 'object',
                properties: {
                    skipEvents: { type: 'boolean' },
                    onError: { type: 'string', enum: ['continue', 'abort'] },
                },
            },
        },
    },
};
const bulkExportSchema = {
    body: {
        type: 'object',
        properties: {
            shardIds: {
                type: 'array',
                maxItems: 1000,
                items: { type: 'string' },
            },
            shardTypeId: { type: 'string' },
            status: { type: 'string', enum: ['active', 'archived', 'draft', 'deleted'] },
            limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
            format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
            includeMetadata: { type: 'boolean', default: true },
            fields: {
                type: 'array',
                items: { type: 'string' },
            },
        },
    },
};
export function registerShardBulkRoutes(server, bulkController) {
    // Bulk create
    server.post('/api/v1/shards/bulk', { schema: bulkCreateSchema }, bulkController.bulkCreate);
    // Bulk update
    server.patch('/api/v1/shards/bulk', { schema: bulkUpdateSchema }, bulkController.bulkUpdate);
    // Bulk delete
    server.delete('/api/v1/shards/bulk', { schema: bulkDeleteSchema }, bulkController.bulkDelete);
    // Bulk restore
    server.post('/api/v1/shards/bulk/restore', { schema: bulkRestoreSchema }, bulkController.bulkRestore);
    // Single shard restore
    server.post('/api/v1/shards/:id/restore', { schema: restoreShardSchema }, bulkController.restoreShard);
    // Bulk status change
    server.post('/api/v1/shards/bulk/status', { schema: bulkStatusChangeSchema }, bulkController.bulkStatusChange);
    // Bulk tag operations
    server.post('/api/v1/shards/bulk/tags', { schema: bulkTagOperationSchema }, bulkController.bulkTagOperation);
    // Bulk export
    server.post('/api/v1/shards/bulk/export', { schema: bulkExportSchema }, bulkController.bulkExport);
}
//# sourceMappingURL=shard-bulk.routes.js.map