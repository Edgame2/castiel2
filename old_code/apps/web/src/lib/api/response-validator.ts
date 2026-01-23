/**
 * API Response Validator
 * Validates API responses match expected contract types
 * Helps catch frontend-backend contract mismatches at runtime
 */

import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  expected: string;
  actual: string;
  message: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

/**
 * Validate API response structure
 * @param data - Response data to validate
 * @param expectedType - Expected type description or validator function
 * @param endpoint - API endpoint for error reporting
 * @returns Validation result
 */
export function validateResponse<T = unknown>(
  data: unknown,
  expectedType: string | ((data: unknown) => boolean),
  endpoint: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // If data is null or undefined, check if that's expected
  if (data === null || data === undefined) {
    if (typeof expectedType === 'string' && expectedType.includes('null')) {
      return { valid: true, errors: [], warnings: [] };
    }
    errors.push({
      path: 'root',
      expected: expectedType as string,
      actual: data === null ? 'null' : 'undefined',
      message: `Expected ${expectedType}, got ${data === null ? 'null' : 'undefined'}`,
    });
    return { valid: false, errors, warnings };
  }

  // If expectedType is a function, use it as validator
  if (typeof expectedType === 'function') {
    const isValid = expectedType(data);
    if (!isValid) {
      errors.push({
        path: 'root',
        expected: 'custom validator',
        actual: typeof data,
        message: 'Response failed custom validation',
      });
    }
    return { valid: isValid, errors, warnings };
  }

  // Type-based validation
  const typeChecks: Record<string, (value: unknown) => boolean> = {
    'object': (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
    'array': (v) => Array.isArray(v),
    'string': (v) => typeof v === 'string',
    'number': (v) => typeof v === 'number' && !isNaN(v),
    'boolean': (v) => typeof v === 'boolean',
    'null': (v) => v === null,
    'undefined': (v) => v === undefined,
  };

  // Check basic type
  const expectedTypeLower = expectedType.toLowerCase();
  if (typeChecks[expectedTypeLower]) {
    const isValid = typeChecks[expectedTypeLower](data);
    if (!isValid) {
      errors.push({
        path: 'root',
        expected: expectedType,
        actual: Array.isArray(data) ? 'array' : typeof data,
        message: `Expected ${expectedType}, got ${Array.isArray(data) ? 'array' : typeof data}`,
      });
    }
  }

  // Validate object structure if expected type is object
  if (expectedTypeLower === 'object' && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    // Basic object validation - can be extended with schema validation
    const obj = data as Record<string, unknown>;
    
    // Check for common API response patterns
    if (!('data' in obj) && !('items' in obj) && !('results' in obj)) {
      warnings.push({
        path: 'root',
        message: 'Response object does not follow common API response patterns (data/items/results)',
        suggestion: 'Consider wrapping response in a standard structure',
      });
    }
  }

  // Validate array structure if expected type is array
  if (expectedTypeLower === 'array' && Array.isArray(data)) {
    if (data.length === 0) {
      warnings.push({
        path: 'root',
        message: 'Response is an empty array',
        suggestion: 'Verify this is expected for this endpoint',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate response has required fields
 */
export function validateRequiredFields(
  data: unknown,
  requiredFields: string[],
  endpoint: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push({
      path: 'root',
      expected: 'object',
      actual: Array.isArray(data) ? 'array' : typeof data,
      message: 'Response must be an object to validate required fields',
    });
    return { valid: false, errors, warnings };
  }

  const obj = data as Record<string, unknown>;

  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined) {
      errors.push({
        path: field,
        expected: 'defined',
        actual: obj[field] === undefined ? 'undefined' : 'missing',
        message: `Required field '${field}' is missing or undefined`,
      });
    } else if (obj[field] === null) {
      warnings.push({
        path: field,
        message: `Required field '${field}' is null`,
        suggestion: 'Verify null is expected for this field',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate response structure matches expected schema
 */
export function validateResponseSchema<T = unknown>(
  data: unknown,
  schema: {
    type: 'object' | 'array' | 'string' | 'number' | 'boolean';
    required?: string[];
    properties?: Record<string, { type: string; required?: boolean }>;
  },
  endpoint: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate root type
  const typeValidators: Record<string, (v: unknown) => boolean> = {
    object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
    array: (v) => Array.isArray(v),
    string: (v) => typeof v === 'string',
    number: (v) => typeof v === 'number' && !isNaN(v),
    boolean: (v) => typeof v === 'boolean',
  };

  const typeValidator = typeValidators[schema.type];
  if (!typeValidator || !typeValidator(data)) {
    errors.push({
      path: 'root',
      expected: schema.type,
      actual: Array.isArray(data) ? 'array' : typeof data,
      message: `Expected ${schema.type}, got ${Array.isArray(data) ? 'array' : typeof data}`,
    });
    return { valid: false, errors, warnings };
  }

  // Validate object properties
  if (schema.type === 'object' && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in obj) || obj[field] === undefined) {
          errors.push({
            path: field,
            expected: 'defined',
            actual: 'undefined',
            message: `Required field '${field}' is missing`,
          });
        }
      }
    }

    // Validate property types
    if (schema.properties) {
      for (const [field, propSchema] of Object.entries(schema.properties)) {
        if (field in obj) {
          const value = obj[field];
          const propTypeValidator = typeValidators[propSchema.type];
          
          if (propTypeValidator && !propTypeValidator(value)) {
            errors.push({
              path: field,
              expected: propSchema.type,
              actual: Array.isArray(value) ? 'array' : typeof value,
              message: `Field '${field}' expected ${propSchema.type}, got ${Array.isArray(value) ? 'array' : typeof value}`,
            });
          }
        } else if (propSchema.required) {
          errors.push({
            path: field,
            expected: propSchema.type,
            actual: 'missing',
            message: `Required field '${field}' is missing`,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log validation errors to monitoring
 */
export function logValidationErrors(
  result: ValidationResult,
  endpoint: string,
  method: string
): void {
  if (!result.valid || result.errors.length > 0 || result.warnings.length > 0) {
    const errorDetails = {
      endpoint,
      method,
      errors: result.errors,
      warnings: result.warnings,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    };

    // Log to structured logging (development only for detailed logs)
    if (process.env.NODE_ENV === 'development') {
      trackTrace('[API Contract Validation]', 2, errorDetails);
      
      if (result.errors.length > 0) {
        trackTrace('[API Contract Errors]', 3, {
          endpoint,
          method,
          errors: result.errors,
        });
      }
      if (result.warnings.length > 0) {
        trackTrace('[API Contract Warnings]', 2, {
          endpoint,
          method,
          warnings: result.warnings,
        });
      }
    }

    // Track in monitoring
    if (result.errors.length > 0) {
      trackException(
        new Error(`API contract mismatch: ${endpoint}`),
        2, // Warning level
        {
          endpoint,
          method,
          errorCount: result.errors.length,
          errors: JSON.stringify(result.errors),
        }
      );
    }
  }
}

/**
 * Create a response validator for a specific endpoint
 */
export function createEndpointValidator<T = unknown>(
  endpoint: string,
  expectedType: string | ((data: unknown) => boolean),
  options?: {
    requiredFields?: string[];
    schema?: {
      type: 'object' | 'array' | 'string' | 'number' | 'boolean';
      required?: string[];
      properties?: Record<string, { type: string; required?: boolean }>;
    };
    enabled?: boolean;
  }
) {
  const enabled = options?.enabled ?? process.env.NODE_ENV === 'development';

  return (data: unknown, method: string = 'GET'): ValidationResult => {
    if (!enabled) {
      return { valid: true, errors: [], warnings: [] };
    }

    // Validate basic type
    const typeResult = validateResponse(data, expectedType, endpoint);
    
    // Validate required fields if specified
    let requiredFieldsResult: ValidationResult = { valid: true, errors: [], warnings: [] };
    if (options?.requiredFields && typeof data === 'object' && data !== null && !Array.isArray(data)) {
      requiredFieldsResult = validateRequiredFields(data, options.requiredFields, endpoint);
    }

    // Validate schema if specified
    let schemaResult: ValidationResult = { valid: true, errors: [], warnings: [] };
    if (options?.schema) {
      schemaResult = validateResponseSchema(data, options.schema, endpoint);
    }

    // Combine results
    const combinedResult: ValidationResult = {
      valid: typeResult.valid && requiredFieldsResult.valid && schemaResult.valid,
      errors: [...typeResult.errors, ...requiredFieldsResult.errors, ...schemaResult.errors],
      warnings: [...typeResult.warnings, ...requiredFieldsResult.warnings, ...schemaResult.warnings],
    };

    // Log if there are issues
    if (!combinedResult.valid || combinedResult.warnings.length > 0) {
      logValidationErrors(combinedResult, endpoint, method);
    }

    return combinedResult;
  };
}
