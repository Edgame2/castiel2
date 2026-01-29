/**
 * Shard Validator Service
 * Validates shard structuredData with configurable strictness levels
 * @module @coder/shared/services
 */
/**
 * Validation strictness level
 */
export type ValidationStrictness = 'strict' | 'lenient' | 'audit';
/**
 * Validation error
 */
export interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}
/**
 * Custom validator function
 */
export type ValidatorFunction = (value: any, structuredData?: any) => {
    valid: boolean;
    message: string;
};
/**
 * Validation configuration
 */
export interface ValidationConfig {
    strictness: ValidationStrictness;
    requiredFields?: string[];
    optionalFields?: string[];
    customValidators?: Record<string, ValidatorFunction>;
    shardTypeSchema?: {
        properties?: Record<string, any>;
        required?: string[];
    };
}
/**
 * Shard Validator
 * Validates shard structuredData before creation/update
 */
export declare class ShardValidator {
    private config;
    constructor(config: ValidationConfig);
    /**
     * Validate structuredData against configuration
     */
    validate(structuredData: any, _shardTypeName?: string): ValidationResult;
    /**
     * Determine validity based on strictness level
     */
    private determineValidity;
    /**
     * Get actual type of a value
     */
    private getActualType;
    /**
     * Check if actual type is compatible with expected type
     */
    private isTypeCompatible;
}
//# sourceMappingURL=ShardValidator.d.ts.map