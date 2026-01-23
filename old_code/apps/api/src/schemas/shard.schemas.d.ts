/**
 * JSON schemas for shard request validation
 */
/**
 * Create shard request schema
 */
export declare const createShardSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            shardTypeId: {
                type: string;
                format: string;
            };
            structuredData: {
                type: string;
                additionalProperties: boolean;
            };
            unstructuredData: {
                type: string;
                properties: {
                    text: {
                        type: string;
                        maxLength: number;
                    };
                    files: {
                        type: string;
                        items: {
                            type: string;
                            required: string[];
                            properties: {
                                id: {
                                    type: string;
                                    format: string;
                                };
                                name: {
                                    type: string;
                                    maxLength: number;
                                };
                                url: {
                                    type: string;
                                    format: string;
                                };
                                mimeType: {
                                    type: string;
                                    maxLength: number;
                                };
                                size: {
                                    type: string;
                                    minimum: number;
                                };
                            };
                            additionalProperties: boolean;
                        };
                        maxItems: number;
                    };
                    rawData: {};
                };
                additionalProperties: boolean;
            };
            metadata: {
                type: string;
                properties: {
                    tags: {
                        type: string;
                        items: {
                            type: string;
                            maxLength: number;
                        };
                        maxItems: number;
                    };
                    category: {
                        type: string;
                        maxLength: number;
                    };
                    priority: {
                        type: string;
                        minimum: number;
                        maximum: number;
                    };
                    customFields: {
                        type: string;
                        additionalProperties: boolean;
                    };
                };
                additionalProperties: boolean;
            };
            parentShardId: {
                type: string;
                format: string;
            };
            acl: {
                type: string;
                items: {
                    type: string;
                    required: string[];
                    properties: {
                        userId: {
                            type: string;
                            format: string;
                        };
                        roleId: {
                            type: string;
                            format: string;
                        };
                        permissions: {
                            type: string;
                            items: {
                                type: string;
                                enum: string[];
                            };
                            minItems: number;
                        };
                        grantedBy: {
                            type: string;
                            format: string;
                        };
                        grantedAt: {
                            type: string;
                            format: string;
                        };
                    };
                    additionalProperties: boolean;
                };
            };
            status: {
                type: string;
                enum: string[];
            };
            source: {
                type: string;
                enum: string[];
                default: string;
            };
            sourceDetails: {
                type: string;
                properties: {
                    integrationName: {
                        type: string;
                        maxLength: number;
                    };
                    importJobId: {
                        type: string;
                        format: string;
                    };
                    originalId: {
                        type: string;
                        maxLength: number;
                    };
                    syncedAt: {
                        type: string;
                        format: string;
                    };
                };
                additionalProperties: boolean;
            };
        };
        additionalProperties: boolean;
    };
};
/**
 * Update shard request schema
 */
export declare const updateShardSchema: {
    body: {
        type: string;
        properties: {
            structuredData: {
                type: string;
                additionalProperties: boolean;
            };
            unstructuredData: {
                type: string;
                properties: {
                    text: {
                        type: string;
                        maxLength: number;
                    };
                    files: {
                        type: string;
                        items: {
                            type: string;
                            required: string[];
                            properties: {
                                id: {
                                    type: string;
                                    format: string;
                                };
                                name: {
                                    type: string;
                                    maxLength: number;
                                };
                                url: {
                                    type: string;
                                    format: string;
                                };
                                mimeType: {
                                    type: string;
                                    maxLength: number;
                                };
                                size: {
                                    type: string;
                                    minimum: number;
                                };
                            };
                            additionalProperties: boolean;
                        };
                        maxItems: number;
                    };
                    rawData: {};
                };
                additionalProperties: boolean;
            };
            metadata: {
                type: string;
                properties: {
                    tags: {
                        type: string;
                        items: {
                            type: string;
                            maxLength: number;
                        };
                        maxItems: number;
                    };
                    category: {
                        type: string;
                        maxLength: number;
                    };
                    priority: {
                        type: string;
                        minimum: number;
                        maximum: number;
                    };
                    customFields: {
                        type: string;
                        additionalProperties: boolean;
                    };
                };
                additionalProperties: boolean;
            };
            acl: {
                type: string;
                items: {
                    type: string;
                    required: string[];
                    properties: {
                        userId: {
                            type: string;
                            format: string;
                        };
                        roleId: {
                            type: string;
                            format: string;
                        };
                        permissions: {
                            type: string;
                            items: {
                                type: string;
                                enum: string[];
                            };
                            minItems: number;
                        };
                        grantedBy: {
                            type: string;
                            format: string;
                        };
                        grantedAt: {
                            type: string;
                            format: string;
                        };
                    };
                    additionalProperties: boolean;
                };
            };
            status: {
                type: string;
                enum: string[];
            };
        };
        additionalProperties: boolean;
    };
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                format: string;
            };
        };
    };
};
/**
 * Patch shard request schema (partial update)
 */
export declare const patchShardSchema: {
    body: {
        type: string;
        properties: {
            structuredData: {
                type: string;
                additionalProperties: boolean;
            };
            unstructuredData: {
                type: string;
                properties: {
                    text: {
                        type: string;
                        maxLength: number;
                    };
                    files: {
                        type: string;
                        items: {
                            type: string;
                            required: string[];
                            properties: {
                                id: {
                                    type: string;
                                    format: string;
                                };
                                name: {
                                    type: string;
                                    maxLength: number;
                                };
                                url: {
                                    type: string;
                                    format: string;
                                };
                                mimeType: {
                                    type: string;
                                    maxLength: number;
                                };
                                size: {
                                    type: string;
                                    minimum: number;
                                };
                            };
                            additionalProperties: boolean;
                        };
                        maxItems: number;
                    };
                    rawData: {};
                };
                additionalProperties: boolean;
            };
            metadata: {
                type: string;
                properties: {
                    tags: {
                        type: string;
                        items: {
                            type: string;
                            maxLength: number;
                        };
                        maxItems: number;
                    };
                    category: {
                        type: string;
                        maxLength: number;
                    };
                    priority: {
                        type: string;
                        minimum: number;
                        maximum: number;
                    };
                    customFields: {
                        type: string;
                        additionalProperties: boolean;
                    };
                };
                additionalProperties: boolean;
            };
            status: {
                type: string;
                enum: string[];
            };
        };
        additionalProperties: boolean;
        minProperties: number;
    };
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                format: string;
            };
        };
    };
};
/**
 * Get shard request schema
 */
export declare const getShardSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                format: string;
            };
        };
    };
};
/**
 * Delete shard request schema
 */
export declare const deleteShardSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                format: string;
            };
        };
    };
    querystring: {
        type: string;
        properties: {
            hardDelete: {
                type: string;
                default: boolean;
            };
        };
    };
};
/**
 * List shards request schema
 */
export declare const listShardsSchema: {
    querystring: {
        type: string;
        properties: {
            shardTypeId: {
                type: string;
                format: string;
            };
            status: {
                type: string;
                enum: string[];
            };
            source: {
                type: string;
                enum: string[];
            };
            category: {
                type: string;
                maxLength: number;
            };
            tags: {
                type: string;
                items: {
                    type: string;
                    maxLength: number;
                };
            };
            createdAfter: {
                type: string;
                format: string;
            };
            createdBefore: {
                type: string;
                format: string;
            };
            updatedAfter: {
                type: string;
                format: string;
            };
            updatedBefore: {
                type: string;
                format: string;
            };
            lastActivityAfter: {
                type: string;
                format: string;
            };
            lastActivityBefore: {
                type: string;
                format: string;
            };
            archivedAfter: {
                type: string;
                format: string;
            };
            archivedBefore: {
                type: string;
                format: string;
            };
            limit: {
                type: string;
                minimum: number;
                maximum: number;
                default: number;
            };
            continuationToken: {
                type: string;
            };
            orderBy: {
                type: string;
                enum: string[];
                default: string;
            };
            orderDirection: {
                type: string;
                enum: string[];
                default: string;
            };
        };
    };
};
/**
 * Bulk create shards request schema
 */
export declare const bulkCreateShardsSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            shards: {
                type: string;
                items: {
                    type: string;
                    required: string[];
                    properties: {
                        shardTypeId: {
                            type: string;
                            format: string;
                        };
                        structuredData: {
                            type: string;
                            additionalProperties: boolean;
                        };
                        unstructuredData: {
                            type: string;
                            properties: {
                                text: {
                                    type: string;
                                    maxLength: number;
                                };
                                files: {
                                    type: string;
                                    items: {
                                        type: string;
                                        required: string[];
                                        properties: {
                                            id: {
                                                type: string;
                                                format: string;
                                            };
                                            name: {
                                                type: string;
                                                maxLength: number;
                                            };
                                            url: {
                                                type: string;
                                                format: string;
                                            };
                                            mimeType: {
                                                type: string;
                                                maxLength: number;
                                            };
                                            size: {
                                                type: string;
                                                minimum: number;
                                            };
                                        };
                                        additionalProperties: boolean;
                                    };
                                    maxItems: number;
                                };
                                rawData: {};
                            };
                            additionalProperties: boolean;
                        };
                        metadata: {
                            type: string;
                            properties: {
                                tags: {
                                    type: string;
                                    items: {
                                        type: string;
                                        maxLength: number;
                                    };
                                    maxItems: number;
                                };
                                category: {
                                    type: string;
                                    maxLength: number;
                                };
                                priority: {
                                    type: string;
                                    minimum: number;
                                    maximum: number;
                                };
                                customFields: {
                                    type: string;
                                    additionalProperties: boolean;
                                };
                            };
                            additionalProperties: boolean;
                        };
                        parentShardId: {
                            type: string;
                            format: string;
                        };
                        source: {
                            type: string;
                            enum: string[];
                        };
                        sourceDetails: {
                            type: string;
                            properties: {
                                integrationName: {
                                    type: string;
                                    maxLength: number;
                                };
                                importJobId: {
                                    type: string;
                                    format: string;
                                };
                                originalId: {
                                    type: string;
                                    maxLength: number;
                                };
                                syncedAt: {
                                    type: string;
                                    format: string;
                                };
                            };
                            additionalProperties: boolean;
                        };
                    };
                    additionalProperties: boolean;
                };
                minItems: number;
                maxItems: number;
            };
            options: {
                type: string;
                properties: {
                    skipValidation: {
                        type: string;
                        default: boolean;
                    };
                    skipEnrichment: {
                        type: string;
                        default: boolean;
                    };
                    skipEvents: {
                        type: string;
                        default: boolean;
                    };
                    transactional: {
                        type: string;
                        default: boolean;
                    };
                    onError: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                };
                additionalProperties: boolean;
            };
        };
        additionalProperties: boolean;
    };
};
/**
 * Bulk update shards request schema
 */
export declare const bulkUpdateShardsSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            updates: {
                type: string;
                items: {
                    type: string;
                    required: string[];
                    properties: {
                        id: {
                            type: string;
                            format: string;
                        };
                        structuredData: {
                            type: string;
                            additionalProperties: boolean;
                        };
                        metadata: {
                            type: string;
                            properties: {
                                tags: {
                                    type: string;
                                    items: {
                                        type: string;
                                        maxLength: number;
                                    };
                                    maxItems: number;
                                };
                                category: {
                                    type: string;
                                    maxLength: number;
                                };
                                priority: {
                                    type: string;
                                    minimum: number;
                                    maximum: number;
                                };
                                customFields: {
                                    type: string;
                                    additionalProperties: boolean;
                                };
                            };
                            additionalProperties: boolean;
                        };
                        status: {
                            type: string;
                            enum: string[];
                        };
                    };
                    additionalProperties: boolean;
                };
                minItems: number;
                maxItems: number;
            };
            options: {
                type: string;
                properties: {
                    skipValidation: {
                        type: string;
                        default: boolean;
                    };
                    createRevision: {
                        type: string;
                        default: boolean;
                    };
                };
                additionalProperties: boolean;
            };
        };
        additionalProperties: boolean;
    };
};
/**
 * Bulk delete shards request schema
 */
export declare const bulkDeleteShardsSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            shardIds: {
                type: string;
                items: {
                    type: string;
                    format: string;
                };
                minItems: number;
                maxItems: number;
            };
            options: {
                type: string;
                properties: {
                    hardDelete: {
                        type: string;
                        default: boolean;
                    };
                    skipEvents: {
                        type: string;
                        default: boolean;
                    };
                };
                additionalProperties: boolean;
            };
        };
        additionalProperties: boolean;
    };
};
/**
 * Restore shard request schema
 */
export declare const restoreShardSchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                format: string;
            };
        };
    };
};
/**
 * Update last activity request schema
 */
export declare const updateActivitySchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
                format: string;
            };
        };
    };
    body: {
        type: string;
        properties: {
            activityType: {
                type: string;
                enum: string[];
            };
        };
        additionalProperties: boolean;
    };
};
//# sourceMappingURL=shard.schemas.d.ts.map