/**
 * Field Mapper Service
 * Applies field mappings from integration.syncConfig.entityMappings to transform external data to shard format
 * @module @coder/shared/services
 */
/**
 * Field mapping configuration
 * Supports both naming conventions for compatibility
 */
export interface FieldMapping {
    externalField?: string;
    shardField?: string;
    externalFieldName?: string;
    internalFieldName?: string;
    transform?: string;
    transformOptions?: Record<string, any>;
    defaultValue?: any;
    required?: boolean;
}
/**
 * Entity mapping configuration
 * Supports both naming conventions for compatibility
 */
export interface EntityMapping {
    externalEntity?: string;
    externalEntityName?: string;
    shardTypeId: string;
    shardTypeName?: string;
    fieldMappings: FieldMapping[];
    enabled?: boolean;
}
/**
 * Transform function interface
 */
export type TransformFunction = (value: any, options?: Record<string, any>) => any;
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Field Mapper Service
 * Transforms external integration data to internal shard format using field mappings
 */
export declare class FieldMapperService {
    private transformers;
    private customTransformers;
    constructor();
    /**
     * Register built-in transform functions
     */
    private registerBuiltInTransformers;
    /**
     * Register a transform function
     */
    registerTransformer(name: string, transformer: TransformFunction): void;
    /**
     * Register a custom transform function (per integration)
     */
    registerCustomTransformer(integrationId: string, name: string, transformer: TransformFunction): void;
    /**
     * Load custom transforms from integration config
     * Supports both code strings (compiled) and pre-compiled functions
     */
    loadCustomTransforms(integrationId: string, customTransforms?: Array<{
        name: string;
        code?: string;
        function?: TransformFunction;
    }>): void;
    /**
     * Compile JavaScript code string to transform function
     * SECURITY: Basic validation - in production, consider using VM2 or similar sandboxing
     */
    private compileTransform;
    /**
     * Unload custom transforms for an integration (cleanup)
     */
    unloadCustomTransforms(integrationId: string): void;
    /**
     * Map fields from external data to internal shard format
     * @param rawData - External data to map
     * @param entityMapping - Entity mapping configuration
     * @param integrationId - Optional integration ID for custom transform lookup
     */
    mapFields(rawData: Record<string, any>, entityMapping: EntityMapping, integrationId?: string): Record<string, any>;
    /**
     * Extract nested field from data (e.g., "Account.Industry" → data.Account.Industry)
     */
    extractNestedField(data: any, fieldPath: string): any;
    /**
     * Apply transform function to value
     */
    applyTransform(value: any, transformName: string, options?: Record<string, any>, integrationId?: string): any;
    /**
     * Validate mapped data against schema (if provided)
     */
    validateMappedData(data: Record<string, any>, _schema?: unknown): ValidationResult;
}
//# sourceMappingURL=FieldMapperService.d.ts.map