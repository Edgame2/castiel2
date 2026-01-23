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
  sourceField: string; // Source field path (supports dot notation and JSONPath)
  targetField: string; // Target field name
  mappingType: FieldMappingType;
  config?: FieldMappingConfig;
  required?: boolean;
  defaultValue?: any;
  skipIfEmpty?: boolean;
}

/**
 * Field mapping types
 */
export type FieldMappingType =
  | 'direct' // Direct field copy
  | 'default' // Use default value
  | 'composite' // Combine multiple fields
  | 'transform' // Apply transformation
  | 'conditional' // Conditional mapping
  | 'lookup'; // Lookup value from mapping table

/**
 * Field mapping configuration
 */
export interface FieldMappingConfig {
  // For composite mapping
  sourceFields?: string[];
  separator?: string;
  
  // For transform mapping
  transformType?: TransformType;
  transformConfig?: TransformConfig;
  
  // For conditional mapping
  conditions?: ConditionalMapping[];
  
  // For lookup mapping
  lookupTable?: Record<string, any>;
  lookupDefault?: any;
  
  // For default mapping
  value?: any;
}

/**
 * Transform types
 */
export type TransformType =
  | 'direct'
  | 'date'
  | 'datetime'
  | 'number'
  | 'boolean'
  | 'string'
  | 'concat'
  | 'split'
  | 'map'
  | 'template'
  | 'uppercase'
  | 'lowercase'
  | 'trim';

/**
 * Transform configuration
 */
export interface TransformConfig {
  format?: string; // For date/datetime
  timezone?: string; // For datetime
  fields?: string[]; // For concat
  delimiter?: string; // For split/concat
  mapping?: Record<string, any>; // For map
  template?: string; // For template
  default?: any; // Default value if transform fails
}

/**
 * Conditional mapping
 */
export interface ConditionalMapping {
  condition: string; // JSONPath expression or simple comparison
  value: any; // Value to use if condition is true
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
export class TransformService {
  constructor(private readonly monitoring?: IMonitoringProvider) {}

  /**
   * Apply field mappings to source data (forward mapping)
   */
  async applyMappings(
    sourceData: any,
    mappings: FieldMapping[]
  ): Promise<MappingResult> {
    const mapped: Record<string, any> = {};
    const errors: MappingError[] = [];
    const warnings: string[] = [];

    for (const mapping of mappings) {
      try {
        const value = await this.applyMapping(sourceData, mapping);
        
        // Check if value is empty and should be skipped
        if (mapping.skipIfEmpty && (value === null || value === undefined || value === '')) {
          continue;
        }

        // Check if required field is missing
        if (mapping.required && (value === null || value === undefined)) {
          errors.push({
            field: mapping.targetField,
            message: `Required field ${mapping.targetField} is missing`,
            sourceValue: this.extractValue(sourceData, mapping.sourceField),
          });
          continue;
        }

        // Use default value if value is null/undefined
        if ((value === null || value === undefined) && mapping.defaultValue !== undefined) {
          mapped[mapping.targetField] = mapping.defaultValue;
        } else {
          mapped[mapping.targetField] = value;
        }
      } catch (error) {
        errors.push({
          field: mapping.targetField,
          message: error instanceof Error ? error.message : String(error),
          sourceValue: this.extractValue(sourceData, mapping.sourceField),
        });
        
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          operation: 'transform.apply_mapping',
          field: mapping.targetField,
          mappingType: mapping.mappingType,
        });
      }
    }

    return { mapped, errors, warnings };
  }

  /**
   * Apply reverse mappings (target → source)
   * Useful for push operations where we need to convert shard data back to integration format
   */
  async applyReverseMappings(
    targetData: any,
    mappings: FieldMapping[]
  ): Promise<MappingResult> {
    // Create reverse mappings (swap source and target)
    const reverseMappings: FieldMapping[] = mappings.map(m => ({
      ...m,
      sourceField: m.targetField,
      targetField: m.sourceField,
    }));

    return this.applyMappings(targetData, reverseMappings);
  }

  /**
   * Apply a single field mapping
   */
  private async applyMapping(sourceData: any, mapping: FieldMapping): Promise<any> {
    switch (mapping.mappingType) {
      case 'direct':
        return this.extractValue(sourceData, mapping.sourceField);

      case 'default':
        return mapping.config?.value ?? mapping.defaultValue;

      case 'composite':
        return this.applyCompositeMapping(sourceData, mapping.config);

      case 'transform':
        const sourceValue = this.extractValue(sourceData, mapping.sourceField);
        return this.applyTransform(sourceValue, mapping.config?.transformType, mapping.config?.transformConfig);

      case 'conditional':
        return this.applyConditionalMapping(sourceData, mapping.config);

      case 'lookup':
        return this.applyLookupMapping(sourceData, mapping.config);

      default:
        return this.extractValue(sourceData, mapping.sourceField);
    }
  }

  /**
   * Extract value from source data using field path
   * Supports dot notation and simple JSONPath
   */
  private extractValue(data: any, path: string): any {
    if (!path || path === '$') {
      return data;
    }

    // Remove leading $ or .
    const cleanPath = path.replace(/^[\$\.]+/, '');
    
    // Split by dots
    const parts = cleanPath.split('.');
    let value = data;

    for (const part of parts) {
      // Handle array access [0]
      if (part.includes('[') && part.includes(']')) {
        const bracketIndex = part.indexOf('[');
        const field = part.substring(0, bracketIndex);
        const indexStr = part.substring(bracketIndex + 1, part.indexOf(']'));
        const index = parseInt(indexStr, 10);
        
        if (field) {
          value = value?.[field];
        }
        // Validate index is valid and within bounds
        if (value && Array.isArray(value) && !isNaN(index) && index >= 0 && index < value.length) {
          value = value[index];
        } else {
          return undefined;
        }
      } else {
        value = value?.[part];
      }

      if (value === null || value === undefined) {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Apply composite mapping (combine multiple fields)
   */
  private applyCompositeMapping(sourceData: any, config?: FieldMappingConfig): string {
    if (!config?.sourceFields || config.sourceFields.length === 0) {
      return '';
    }

    const separator = config.separator || ' ';
    const values = config.sourceFields
      .map(field => this.extractValue(sourceData, field))
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(v => String(v));

    return values.join(separator);
  }

  /**
   * Apply conditional mapping
   */
  private applyConditionalMapping(sourceData: any, config?: FieldMappingConfig): any {
    if (!config?.conditions || config.conditions.length === 0) {
      return undefined;
    }

    for (const condition of config.conditions) {
      // Simple condition evaluation (can be extended)
      // For now, support simple equality checks
      if (this.evaluateCondition(sourceData, condition.condition)) {
        return condition.value;
      }
    }

    return undefined;
  }

  /**
   * Apply lookup mapping
   */
  private applyLookupMapping(sourceData: any, config?: FieldMappingConfig): any {
    if (!config?.lookupTable) {
      return config?.lookupDefault;
    }

    // Extract first field value for lookup
    const lookupKey = sourceData ? Object.values(sourceData)[0] : undefined;
    
    if (lookupKey === undefined || lookupKey === null) {
      return config?.lookupDefault;
    }

    return config.lookupTable[String(lookupKey)] ?? config?.lookupDefault;
  }

  /**
   * Apply transformation to a value
   */
  private applyTransform(
    value: any,
    transformType?: TransformType,
    transformConfig?: TransformConfig
  ): any {
    if (value === null || value === undefined) {
      return transformConfig?.default;
    }

    if (!transformType || transformType === 'direct') {
      return value;
    }

    try {
      switch (transformType) {
        case 'date':
          return this.transformDate(value, transformConfig);

        case 'datetime':
          return this.transformDateTime(value, transformConfig);

        case 'number':
          const num = Number(value);
          return isNaN(num) ? transformConfig?.default : num;

        case 'boolean':
          if (typeof value === 'boolean') {return value;}
          const truthyValues = ['true', '1', 'yes', 'on'];
          return truthyValues.includes(String(value).toLowerCase());

        case 'string':
          return String(value);

        case 'concat':
          return this.transformConcat(value, transformConfig);

        case 'split':
          const delimiter = transformConfig?.delimiter || ',';
          return String(value).split(delimiter).map(s => s.trim());

        case 'map':
          const mapping = transformConfig?.mapping || {};
          return mapping[String(value)] ?? transformConfig?.default ?? value;

        case 'template':
          return this.transformTemplate(value, transformConfig);

        case 'uppercase':
          return String(value).toUpperCase();

        case 'lowercase':
          return String(value).toLowerCase();

        case 'trim':
          return String(value).trim();

        default:
          return value;
      }
    } catch (error) {
      this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'transform.apply_transform',
        transformType,
      });
      return transformConfig?.default ?? value;
    }
  }

  /**
   * Transform date value
   */
  private transformDate(value: any, config?: TransformConfig): string {
    const date = value instanceof Date ? value : new Date(value);
    
    if (isNaN(date.getTime())) {
      return config?.default ?? value;
    }

    if (config?.format) {
      // Simple format support (can be extended with date-fns or similar)
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    return date.toISOString();
  }

  /**
   * Transform datetime value
   */
  private transformDateTime(value: any, config?: TransformConfig): string {
    const date = value instanceof Date ? value : new Date(value);
    
    if (isNaN(date.getTime())) {
      return config?.default ?? value;
    }

    // Apply timezone if specified
    if (config?.timezone) {
      // Simple timezone handling (can be extended with date-fns-tz)
      return date.toISOString();
    }

    return date.toISOString();
  }

  /**
   * Transform concat (combine multiple values)
   */
  private transformConcat(value: any, config?: TransformConfig): string {
    if (!config?.fields || config.fields.length === 0) {
      return String(value);
    }

    const delimiter = config.delimiter || '';
    const values = config.fields
      .map(field => this.extractValue(value, field))
      .filter(v => v !== null && v !== undefined)
      .map(v => String(v));

    return values.join(delimiter);
  }

  /**
   * Transform template (interpolate template string)
   */
  private transformTemplate(value: any, config?: TransformConfig): string {
    if (!config?.template) {
      return String(value);
    }

    // Simple template interpolation: {{field}} or ${field}
    let template = config.template;
    
    // Replace {{field}} patterns
    template = template.replace(/\{\{(\w+)\}\}/g, (match, field) => {
      return this.extractValue(value, field) ?? match;
    });

    // Replace ${field} patterns
    template = template.replace(/\$\{(\w+)\}/g, (match, field) => {
      return this.extractValue(value, field) ?? match;
    });

    return template;
  }

  /**
   * Evaluate condition (simple implementation)
   */
  private evaluateCondition(data: any, condition: string): boolean {
    // Simple condition evaluation
    // Supports: field == value, field != value, field > value, etc.
    // Can be extended with a proper expression evaluator
    
    try {
      // For now, support simple equality
      if (condition.includes('==')) {
        const [field, value] = condition.split('==').map(s => s.trim());
        const fieldValue = this.extractValue(data, field);
        return String(fieldValue) === value;
      }
      
      if (condition.includes('!=')) {
        const [field, value] = condition.split('!=').map(s => s.trim());
        const fieldValue = this.extractValue(data, field);
        return String(fieldValue) !== value;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Validate mappings configuration
   */
  validateMappings(mappings: FieldMapping[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const mapping of mappings) {
      if (!mapping.sourceField && mapping.mappingType !== 'default') {
        errors.push(`Mapping ${mapping.id || mapping.targetField}: sourceField is required`);
      }

      if (!mapping.targetField) {
        errors.push(`Mapping ${mapping.id || 'unknown'}: targetField is required`);
      }

      if (mapping.mappingType === 'composite' && (!mapping.config?.sourceFields || mapping.config.sourceFields.length === 0)) {
        errors.push(`Mapping ${mapping.id || mapping.targetField}: composite mapping requires sourceFields`);
      }

      if (mapping.mappingType === 'transform' && !mapping.config?.transformType) {
        errors.push(`Mapping ${mapping.id || mapping.targetField}: transform mapping requires transformType`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}









