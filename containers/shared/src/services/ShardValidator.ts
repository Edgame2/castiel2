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
export class ShardValidator {
  constructor(private config: ValidationConfig) {}

  /**
   * Validate structuredData against configuration
   */
  validate(structuredData: any, _shardTypeName?: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields check
    if (this.config.requiredFields && this.config.requiredFields.length > 0) {
      for (const field of this.config.requiredFields) {
        if (structuredData[field] == null || structuredData[field] === '') {
          errors.push({
            field,
            message: `Required field '${field}' is missing or empty`,
            severity: 'error',
          });
        }
      }
    }

    // Schema-based required fields (if shardTypeSchema provided)
    if (this.config.shardTypeSchema?.required) {
      for (const field of this.config.shardTypeSchema.required) {
        if (structuredData[field] == null || structuredData[field] === '') {
          // Only add if not already in errors (avoid duplicates)
          if (!errors.some(e => e.field === field)) {
            errors.push({
              field,
              message: `Required field '${field}' is missing or empty`,
              severity: 'error',
            });
          }
        }
      }
    }

    // Data type validation (if schema provided)
    if (this.config.shardTypeSchema?.properties) {
      for (const [field, value] of Object.entries(structuredData)) {
        if (value == null) continue; // Skip null/undefined values

        const fieldSchema = this.config.shardTypeSchema.properties[field];
        if (!fieldSchema) continue; // Skip unknown fields

        const expectedType = fieldSchema.type;
        if (!expectedType) continue;

        const actualType = this.getActualType(value);

        if (!this.isTypeCompatible(expectedType, actualType)) {
          warnings.push({
            field,
            message: `Expected type '${expectedType}', got '${actualType}'`,
            severity: 'warning',
          });
        }

        // Additional validations based on schema
        if (fieldSchema.format === 'date-time' && typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            warnings.push({
              field,
              message: `Field '${field}' must be a valid ISO date-time string`,
              severity: 'warning',
            });
          }
        }

        if (fieldSchema.type === 'number') {
          if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
            warnings.push({
              field,
              message: `Field '${field}' is less than minimum value (${fieldSchema.minimum})`,
              severity: 'warning',
            });
          }
          if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
            warnings.push({
              field,
              message: `Field '${field}' is greater than maximum value (${fieldSchema.maximum})`,
              severity: 'warning',
            });
          }
        }

        if (fieldSchema.type === 'string') {
          const strSchema = fieldSchema as { minLength?: number; maxLength?: number; enum?: unknown[] };
          const strVal = typeof value === 'string' ? value : String(value);
          if (strSchema.minLength !== undefined && strVal.length < strSchema.minLength) {
            warnings.push({
              field,
              message: `Field '${field}' is shorter than minimum length (${strSchema.minLength})`,
              severity: 'warning',
            });
          }
          if (strSchema.maxLength !== undefined && strVal.length > strSchema.maxLength) {
            warnings.push({
              field,
              message: `Field '${field}' is longer than maximum length (${strSchema.maxLength})`,
              severity: 'warning',
            });
          }
          if (strSchema.enum && !strSchema.enum.includes(value)) {
            warnings.push({
              field,
              message: `Field '${field}' must be one of: ${fieldSchema.enum.join(', ')}`,
              severity: 'warning',
            });
          }
        }
      }
    }

    // Custom validators
    if (this.config.customValidators) {
      for (const [field, validator] of Object.entries(this.config.customValidators)) {
        const value = structuredData[field];
        if (value == null) continue; // Skip null/undefined values

        try {
          const result = validator(value, structuredData);
          if (!result.valid) {
            warnings.push({
              field,
              message: result.message,
              severity: 'warning',
            });
          }
        } catch (error) {
          warnings.push({
            field,
            message: `Custom validator failed: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'warning',
          });
        }
      }
    }

    // Determine if valid based on strictness
    const isValid = this.determineValidity(errors, warnings);

    return {
      valid: isValid,
      errors,
      warnings,
    };
  }

  /**
   * Determine validity based on strictness level
   */
  private determineValidity(errors: ValidationError[], warnings: ValidationError[]): boolean {
    switch (this.config.strictness) {
      case 'strict':
        // Reject if any errors OR warnings
        return errors.length === 0 && warnings.length === 0;

      case 'lenient':
        // Reject only if critical errors (not warnings)
        return errors.length === 0;

      case 'audit':
        // Never reject, just log
        return true;

      default:
        // Default to lenient
        return errors.length === 0;
    }
  }

  /**
   * Get actual type of a value
   */
  private getActualType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    return typeof value;
  }

  /**
   * Check if actual type is compatible with expected type
   */
  private isTypeCompatible(expectedType: string, actualType: string): boolean {
    // Handle special cases
    if (expectedType === 'string' && actualType === 'string') return true;
    if (expectedType === 'number' && actualType === 'number') return true;
    if (expectedType === 'boolean' && actualType === 'boolean') return true;
    if (expectedType === 'array' && actualType === 'array') return true;
    if (expectedType === 'object' && actualType === 'object') return (actualType as string) !== 'array';
    if (expectedType === 'null' && actualType === 'null') return true;

    // Date strings are compatible with date-time format
    if (expectedType === 'string' && actualType === 'date') return true;

    return false;
  }
}
