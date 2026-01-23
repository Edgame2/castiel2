/**
 * ShardType types for Cosmos DB
 * ShardTypes define the structure and validation rules for Shards
 */
/**
 * ShardType status
 */
export var ShardTypeStatus;
(function (ShardTypeStatus) {
    ShardTypeStatus["ACTIVE"] = "active";
    ShardTypeStatus["DEPRECATED"] = "deprecated";
    ShardTypeStatus["DELETED"] = "deleted";
})(ShardTypeStatus || (ShardTypeStatus = {}));
/**
 * ShardType category for organization
 */
export var ShardTypeCategory;
(function (ShardTypeCategory) {
    ShardTypeCategory["DOCUMENT"] = "document";
    ShardTypeCategory["DATA"] = "data";
    ShardTypeCategory["MEDIA"] = "media";
    ShardTypeCategory["CONFIGURATION"] = "configuration";
    ShardTypeCategory["CUSTOM"] = "custom";
    ShardTypeCategory["SYSTEM"] = "system";
})(ShardTypeCategory || (ShardTypeCategory = {}));
/**
 * Helper to detect schema format
 */
export function detectSchemaFormat(schema) {
    if ('format' in schema && schema.format === 'rich') {
        return 'rich';
    }
    if ('$schema' in schema || ('type' in schema && schema.type === 'object')) {
        return 'jsonschema';
    }
    return 'legacy';
}
/**
 * Type guard for rich schema
 */
export function isRichSchema(schema) {
    return 'format' in schema && schema.format === 'rich';
}
/**
 * Type guard for legacy schema
 */
export function isLegacySchema(schema) {
    return !('format' in schema) && !('$schema' in schema) && !('type' in schema);
}
/**
 * Type guard for JSON schema
 */
export function isJSONSchema(schema) {
    return '$schema' in schema || ('type' in schema && !('format' in schema));
}
/**
 * Built-in ShardType names
 * System-provided types that are always available
 */
export const BUILT_IN_SHARD_TYPES = {
    DOCUMENT: 'document',
    NOTE: 'note',
    FILE: 'file',
    CONTACT: 'contact',
    TASK: 'task',
    EVENT: 'event',
    ARTICLE: 'article',
    PRODUCT: 'product',
};
/**
 * Helper to check if a ShardType name is built-in
 */
export function isBuiltInShardType(name) {
    return Object.values(BUILT_IN_SHARD_TYPES).includes(name);
}
/**
 * Helper to merge parent and child schemas
 * Deep merges properties and combines required arrays
 */
export function mergeSchemas(parentSchema, childSchema) {
    const merged = {
        ...parentSchema,
        ...childSchema,
    };
    // Merge properties
    if (parentSchema.properties || childSchema.properties) {
        merged.properties = {
            ...parentSchema.properties,
            ...childSchema.properties,
        };
    }
    // Merge required arrays
    if (parentSchema.required || childSchema.required) {
        const parentRequired = parentSchema.required || [];
        const childRequired = childSchema.required || [];
        merged.required = Array.from(new Set([...parentRequired, ...childRequired]));
    }
    // Child schema's allOf, anyOf, oneOf take precedence
    // But we can extend them if needed
    return merged;
}
//# sourceMappingURL=shard-type.types.js.map