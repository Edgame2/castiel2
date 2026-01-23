/**
 * Transform Service
 *
 * Centralized service for field mapping and transformation operations.
 * Handles:
 * - Forward mapping (source → target)
 * - Reverse mapping (target → source)
 * - Data transformations (date, number, concat, etc.)
 */
import type { IMonitoringProvider } from '@castiel/monitoring';
/**
 * Field mapping configuration
 */
export interface FieldMapping {
    id?: string;
    sourceField: string;
    targetField: string;
    mappingType: FieldMappingType;
    config?: FieldMappingConfig;
    required?: boolean;
    defaultValue?: any;
    skipIfEmpty?: boolean;
}
/**
 * Field mapping types
 */
export type FieldMappingType = 'direct' | 'default' | 'composite' | 'transform' | 'conditional' | 'lookup';
/**
 * Field mapping configuration
 */
export interface FieldMappingConfig {
    sourceFields?: string[];
    separator?: string;
    transformType?: TransformType;
    transformConfig?: TransformConfig;
    conditions?: ConditionalMapping[];
    lookupTable?: Record<string, any>;
    lookupDefault?: any;
    value?: any;
}
/**
 * Transform types
 */
export type TransformType = 'direct' | 'date' | 'datetime' | 'number' | 'boolean' | 'string' | 'concat' | 'split' | 'map' | 'template' | 'uppercase' | 'lowercase' | 'trim';
/**
 * Transform configuration
 */
export interface TransformConfig {
    format?: string;
    timezone?: string;
    fields?: string[];
    delimiter?: string;
    mapping?: Record<string, any>;
    template?: string;
    default?: any;
}
/**
 * Conditional mapping
 */
export interface ConditionalMapping {
    condition: string;
    value: any;
}
/**
 * Mapping result
 */
export interface MappingResult {
    mapped: Record<string, any>;
    errors: MappingError[];
    warnings: string[];
}
/**
 * Mapping error
 */
export interface MappingError {
    field: string;
    message: string;
    sourceValue?: any;
}
/**
 * Transform Service
 */
export declare class TransformService {
    private readonly monitoring?;
    constructor(monitoring?: IMonitoringProvider | undefined);
    /**
     * Apply field mappings to source data (forward mapping)
     */
    applyMappings(sourceData: any, mappings: FieldMapping[]): Promise<MappingResult>;
    /**
     * Apply reverse mappings (target → source)
     * Useful for push operations where we need to convert shard data back to integration format
     */
    applyReverseMappings(targetData: any, mappings: FieldMapping[]): Promise<MappingResult>;
    /**
     * Apply a single field mapping
     */
    private applyMapping;
    /**
     * Extract value from source data using field path
     * Supports dot notation and simple JSONPath
     */
    private extractValue;
    /**
     * Apply composite mapping (combine multiple fields)
     */
    private applyCompositeMapping;
    /**
     * Apply conditional mapping
     */
    private applyConditionalMapping;
    /**
     * Apply lookup mapping
     */
    private applyLookupMapping;
    /**
     * Apply transformation to a value
     */
    private applyTransform;
    /**
     * Transform date value
     */
    private transformDate;
    /**
     * Transform datetime value
     */
    private transformDateTime;
    /**
     * Transform concat (combine multiple values)
     */
    private transformConcat;
    /**
     * Transform template (interpolate template string)
     */
    private transformTemplate;
    /**
     * Evaluate condition (simple implementation)
     */
    private evaluateCondition;
    /**
     * Validate mappings configuration
     */
    validateMappings(mappings: FieldMapping[]): {
        valid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=transform.service.d.ts.map