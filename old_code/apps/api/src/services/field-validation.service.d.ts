/**
 * Field Validation Service
 *
 * Validates shard structured data against RichFieldDefinition schemas.
 * Supports all rich field types with comprehensive validation rules.
 */
import type { RichFieldDefinition, SelectOption } from '@castiel/shared-types';
import type { RichSchema, ShardTypeSchema } from '../types/shard-type.types.js';
/**
 * Validation error for a single field
 */
export interface FieldValidationError {
    field: string;
    message: string;
    code: string;
    value?: unknown;
    constraint?: unknown;
}
/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: FieldValidationError[];
}
/**
 * Validation context for cross-field validation
 */
export interface ValidationContext {
    tenantId: string;
    shardTypeId: string;
    shardId?: string;
    allData: Record<string, unknown>;
    userRoles?: string[];
    isCreate?: boolean;
}
/**
 * Option list provider interface for resolving option references
 */
export interface OptionListProvider {
    getOptions(optionsRef: string, tenantId: string): Promise<SelectOption[]>;
}
export declare class FieldValidationService {
    private optionListProvider?;
    constructor(optionListProvider?: OptionListProvider);
    /**
     * Set the option list provider for resolving option references
     */
    setOptionListProvider(provider: OptionListProvider): void;
    /**
     * Validate data against a rich schema
     */
    validateSchema(data: Record<string, unknown>, schema: ShardTypeSchema, context: ValidationContext): Promise<ValidationResult>;
    /**
     * Validate data against a rich schema definition
     */
    validateRichSchema(data: Record<string, unknown>, schema: RichSchema, context: ValidationContext): Promise<ValidationResult>;
    /**
     * Validate a single field
     */
    validateField(fieldDef: RichFieldDefinition, value: unknown, context: ValidationContext): Promise<FieldValidationError[]>;
    private validateTextField;
    private validateTextareaField;
    private validateRichTextField;
    private validateSelectField;
    private validateMultiselectField;
    private getOptions;
    private validateDateField;
    private validateDateTimeField;
    private validateDateRangeField;
    private resolveDate;
    private validateIntegerField;
    private validateFloatField;
    private validateCurrencyField;
    private validatePercentageField;
    private validateBooleanField;
    private validateEmailField;
    private validateUrlField;
    private validatePhoneField;
    private validateUserRefField;
    private validateShardRefField;
    private validateFileField;
    private validateSingleFile;
    private validateImageField;
    private validateSingleImage;
    private validateCrossFieldRules;
    private validateRule;
    private isEmpty;
}
export declare const fieldValidationService: FieldValidationService;
//# sourceMappingURL=field-validation.service.d.ts.map