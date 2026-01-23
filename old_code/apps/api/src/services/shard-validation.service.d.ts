/**
 * Shard Validation Service
 *
 * Integrates field validation with shard operations.
 * Validates shard structured data against ShardType schemas.
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { FieldValidationService, ValidationResult } from './field-validation.service.js';
import { OptionListService } from './option-list.service.js';
/**
 * Validation mode
 */
export type ValidationMode = 'strict' | 'lenient' | 'skip';
/**
 * Validation options
 */
export interface ShardValidationOptions {
    /** Validation mode */
    mode?: ValidationMode;
    /** Whether this is a create operation */
    isCreate?: boolean;
    /** User roles for field-level permissions */
    userRoles?: string[];
    /** Skip specific validation types */
    skip?: {
        required?: boolean;
        format?: boolean;
        crossField?: boolean;
    };
}
/**
 * Shard Validation Service
 */
export declare class ShardValidationService {
    private shardTypeRepository;
    private fieldValidationService;
    private optionListService;
    private monitoring;
    private ajv;
    private schemaCache;
    private shardTypeCache;
    private readonly CACHE_TTL_MS;
    constructor(monitoring: IMonitoringProvider);
    /**
     * Initialize the service
     */
    initialize(): Promise<void>;
    /**
     * Validate shard structured data
     */
    validateShardData(structuredData: Record<string, unknown>, shardTypeId: string, tenantId: string, options?: ShardValidationOptions): Promise<ValidationResult>;
    /**
     * Validate with JSON Schema
     */
    private validateWithJSONSchema;
    /**
     * Validate with legacy FieldDefinition schema
     */
    private validateWithLegacySchema;
    /**
     * Validate legacy field type
     */
    private validateLegacyFieldType;
    /**
     * Validate legacy field constraints
     */
    private validateLegacyConstraints;
    /**
     * Get ShardType with caching
     */
    private getShardType;
    /**
     * Track validation metrics
     */
    private trackValidation;
    /**
     * Clear caches
     */
    clearCaches(): void;
    /**
     * Get the underlying FieldValidationService
     */
    getFieldValidationService(): FieldValidationService;
    /**
     * Get the underlying OptionListService
     */
    getOptionListService(): OptionListService;
}
export declare function getShardValidationService(monitoring: IMonitoringProvider): ShardValidationService;
//# sourceMappingURL=shard-validation.service.d.ts.map