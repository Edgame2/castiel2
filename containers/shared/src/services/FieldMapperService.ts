/**
 * Field Mapper Service
 * Applies field mappings from integration.syncConfig.entityMappings to transform external data to shard format
 * @module @coder/shared/services
 */

// Simple logger (console-based for shared library)
const log = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(`[FieldMapperService] ${message}`, meta || '');
  },
  error: (message: string, error: any, meta?: Record<string, any>) => {
    console.error(`[FieldMapperService] ${message}`, { error: error instanceof Error ? error.message : String(error), ...meta });
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(`[FieldMapperService] ${message}`, meta || '');
  },
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[FieldMapperService] ${message}`, meta || '');
    }
  },
};

/**
 * Field mapping configuration
 * Supports both naming conventions for compatibility
 */
export interface FieldMapping {
  // Primary naming (from integration.types.ts)
  externalField?: string;
  shardField?: string;
  // Alternative naming (from UI/API plan)
  externalFieldName?: string;
  internalFieldName?: string;
  // Common fields
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
  // Primary naming (from integration.types.ts)
  externalEntity?: string;
  // Alternative naming (from UI/API plan)
  externalEntityName?: string;
  // Common fields
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
export class FieldMapperService {
  private transformers: Map<string, TransformFunction> = new Map();
  private customTransformers: Map<string, TransformFunction> = new Map();

  constructor() {
    this.registerBuiltInTransformers();
  }

  /**
   * Register built-in transform functions
   */
  private registerBuiltInTransformers(): void {
    // Date transforms
    this.registerTransformer('dateToISO', (value: any) => {
      if (!value) return undefined;
      if (value instanceof Date) return value.toISOString();
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    });

    this.registerTransformer('dateToUnix', (value: any) => {
      if (!value) return undefined;
      if (value instanceof Date) return Math.floor(value.getTime() / 1000);
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : Math.floor(date.getTime() / 1000);
    });

    // Number transforms
    this.registerTransformer('stringToNumber', (value: any) => {
      if (value === null || value === undefined || value === '') return undefined;
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    });

    this.registerTransformer('roundToDecimals', (value: any, options?: { decimals?: number }) => {
      if (value === null || value === undefined) return undefined;
      const num = Number(value);
      if (isNaN(num)) return undefined;
      const decimals = options?.decimals ?? 2;
      return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    });

    // String transforms
    this.registerTransformer('toLowerCase', (value: any) => {
      return typeof value === 'string' ? value.toLowerCase() : value;
    });

    this.registerTransformer('toUpperCase', (value: any) => {
      return typeof value === 'string' ? value.toUpperCase() : value;
    });

    this.registerTransformer('trim', (value: any) => {
      return typeof value === 'string' ? value.trim() : value;
    });

    // Array transforms
    this.registerTransformer('arrayToString', (value: any, options?: { separator?: string }) => {
      if (!Array.isArray(value)) return value;
      const separator = options?.separator ?? ', ';
      return value.join(separator);
    });

    this.registerTransformer('arrayFirst', (value: any) => {
      if (!Array.isArray(value) || value.length === 0) return undefined;
      return value[0];
    });

    // Boolean transforms
    this.registerTransformer('booleanToString', (value: any) => {
      if (typeof value === 'boolean') return value.toString();
      return value;
    });

    this.registerTransformer('booleanToYesNo', (value: any) => {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (value === 'true' || value === true || value === 1) return 'Yes';
      if (value === 'false' || value === false || value === 0) return 'No';
      return value;
    });

    // Null/Default transforms
    this.registerTransformer('nullToDefault', (value: any, options?: { default?: any }) => {
      if (value === null || value === undefined || value === '') {
        return options?.default ?? null;
      }
      return value;
    });

    // Document-specific transforms
    this.registerTransformer('parseMimeType', (value: any) => {
      if (typeof value !== 'string') return value;
      // Extract MIME type from content-type string (e.g., "application/pdf; charset=utf-8" → "application/pdf")
      const mimeType = value.split(';')[0].trim();
      return mimeType;
    });

    this.registerTransformer('detectDocumentType', (value: any) => {
      if (typeof value !== 'string') return 'other';
      const mimeType = value.toLowerCase();
      if (mimeType.includes('pdf')) return 'pdf';
      if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xlsx';
      if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'pptx';
      if (mimeType.includes('text/plain')) return 'txt';
      if (mimeType.includes('html')) return 'html';
      if (mimeType.includes('image')) return 'image';
      return 'other';
    });

    this.registerTransformer('parseFileSize', (value: any) => {
      if (typeof value === 'number') return value;
      if (typeof value !== 'string') return undefined;
      // Parse file size strings like "1.5MB", "500KB", "2GB" to bytes
      const match = value.match(/^([\d.]+)\s*(KB|MB|GB|TB|B)$/i);
      if (!match) return undefined;
      const size = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      const multipliers: Record<string, number> = {
        B: 1,
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024,
        TB: 1024 * 1024 * 1024 * 1024,
      };
      return Math.round(size * (multipliers[unit] || 1));
    });

    // Email-specific transforms
    this.registerTransformer('parseEmailAddress', (value: any) => {
      if (typeof value !== 'string') return value;
      // Extract email from "Name <email@example.com>" format
      const emailMatch = value.match(/<([^>]+)>/);
      if (emailMatch) return emailMatch[1];
      // If no angle brackets, assume entire string is email
      return value.trim();
    });

    this.registerTransformer('parseEmailList', (value: any, options?: { separator?: string }) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.map((v) => {
        if (typeof v === 'string') {
          const emailMatch = v.match(/<([^>]+)>/);
          return emailMatch ? emailMatch[1] : v.trim();
        }
        return v;
      });
      if (typeof value === 'string') {
        const separator = options?.separator ?? /[,;]/;
        return value.split(separator).map((email) => {
          const trimmed = email.trim();
          const emailMatch = trimmed.match(/<([^>]+)>/);
          return emailMatch ? emailMatch[1] : trimmed;
        }).filter((email) => email.length > 0);
      }
      return [];
    });

    this.registerTransformer('extractEmailDomain', (value: any) => {
      if (typeof value !== 'string') return undefined;
      const email = value.includes('<') ? value.match(/<([^>]+)>/)?.[1] || value : value;
      const domain = email.split('@')[1];
      return domain?.toLowerCase();
    });

    this.registerTransformer('isInternalEmail', (value: any, options?: { internalDomains?: string[] }) => {
      if (typeof value !== 'string') return false;
      const email = value.includes('<') ? value.match(/<([^>]+)>/)?.[1] || value : value;
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain) return false;
      const internalDomains = options?.internalDomains || ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'];
      return internalDomains.some((d) => domain.includes(d));
    });

    // Message-specific transforms
    this.registerTransformer('parseMentions', (value: any) => {
      if (typeof value !== 'string') return [];
      // Extract @mentions from text (e.g., "@user1 @user2" → ["user1", "user2"])
      const mentions = value.match(/@(\w+)/g);
      return mentions ? mentions.map((m) => m.substring(1)) : [];
    });

    this.registerTransformer('parseChannelType', (value: any) => {
      if (typeof value !== 'string') return 'unknown';
      const channelId = value.toLowerCase();
      if (channelId.includes('direct') || channelId.includes('dm')) return 'direct';
      if (channelId.includes('group')) return 'group';
      if (channelId.includes('public') || channelId.includes('channel')) return 'public';
      if (channelId.includes('private')) return 'private';
      return 'unknown';
    });

    // Meeting-specific transforms
    this.registerTransformer('parseParticipants', (value: any) => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value.map((p) => {
          if (typeof p === 'string') {
            // Parse "Name <email@example.com>" format
            const emailMatch = p.match(/<([^>]+)>/);
            const nameMatch = p.match(/^([^<]+)</);
            return {
              name: nameMatch ? nameMatch[1].trim() : p,
              email: emailMatch ? emailMatch[1] : undefined,
            };
          }
          return p;
        });
      }
      if (typeof value === 'string') {
        // Parse comma-separated list
        return value.split(',').map((p) => {
          const trimmed = p.trim();
          const emailMatch = trimmed.match(/<([^>]+)>/);
          const nameMatch = trimmed.match(/^([^<]+)</);
          return {
            name: nameMatch ? nameMatch[1].trim() : trimmed,
            email: emailMatch ? emailMatch[1] : undefined,
          };
        });
      }
      return [];
    });

    this.registerTransformer('parseDuration', (value: any, options?: { unit?: 'minutes' | 'seconds' | 'hours' }) => {
      if (typeof value === 'number') {
        // Assume value is already in the target unit
        return value;
      }
      if (typeof value !== 'string') return undefined;
      // Parse duration strings like "1h 30m", "90m", "5400s"
      const unit = options?.unit || 'minutes';
      let totalSeconds = 0;
      
      // Match hours, minutes, seconds
      const hourMatch = value.match(/(\d+)\s*h/i);
      const minuteMatch = value.match(/(\d+)\s*m/i);
      const secondMatch = value.match(/(\d+)\s*s/i);
      
      if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
      if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60;
      if (secondMatch) totalSeconds += parseInt(secondMatch[1]);
      
      // If no matches, try parsing as pure number
      if (totalSeconds === 0) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          // Assume it's already in the target unit
          if (unit === 'seconds') return num;
          if (unit === 'minutes') return num;
          if (unit === 'hours') return num;
        }
      }
      
      // Convert to target unit
      if (unit === 'seconds') return totalSeconds;
      if (unit === 'minutes') return totalSeconds / 60;
      if (unit === 'hours') return totalSeconds / 3600;
      return totalSeconds / 60; // Default to minutes
    });

    this.registerTransformer('classifyMeetingType', (value: any) => {
      if (typeof value !== 'string') return 'internal';
      const text = value.toLowerCase();
      if (text.includes('discovery') || text.includes('discover')) return 'discovery';
      if (text.includes('demo') || text.includes('demonstration')) return 'demo';
      if (text.includes('negotiation') || text.includes('negotiate')) return 'negotiation';
      if (text.includes('follow') || text.includes('follow-up')) return 'follow_up';
      if (text.includes('closing') || text.includes('close')) return 'closing';
      return 'internal';
    });

    // Calendar Event-specific transforms
    this.registerTransformer('parseRecurrenceRule', (value: any) => {
      if (typeof value !== 'string') return undefined;
      // Parse iCal RRULE format (basic support)
      // Full RRULE parsing would require a library, but we can extract basic info
      if (value.includes('FREQ=DAILY')) return { isRecurring: true, frequency: 'daily' };
      if (value.includes('FREQ=WEEKLY')) return { isRecurring: true, frequency: 'weekly' };
      if (value.includes('FREQ=MONTHLY')) return { isRecurring: true, frequency: 'monthly' };
      if (value.includes('FREQ=YEARLY')) return { isRecurring: true, frequency: 'yearly' };
      return { isRecurring: false };
    });

    this.registerTransformer('parseLocationType', (value: any) => {
      if (typeof value !== 'string') return 'in_person';
      const location = value.toLowerCase();
      if (location.includes('zoom') || location.includes('teams') || location.includes('meet') || location.includes('video')) {
        return 'online';
      }
      if (location.includes('phone') || location.includes('call')) {
        return 'phone';
      }
      return 'in_person';
    });

    this.registerTransformer('classifyEventType', (value: any) => {
      if (typeof value !== 'string') return 'other';
      const text = value.toLowerCase();
      if (text.includes('interview') || text.includes('screening')) return 'interview';
      if (text.includes('demo') || text.includes('demonstration') || text.includes('presentation')) return 'demo';
      if (text.includes('training') || text.includes('onboarding') || text.includes('workshop')) return 'training';
      if (text.includes('call') || text.includes('phone') || text.includes('conference call')) return 'call';
      if (text.includes('personal') || text.includes('private') || text.includes('vacation')) return 'personal';
      if (text.includes('meeting') || text.includes('sync') || text.includes('standup')) return 'meeting';
      return 'other';
    });

    // Array/Object transforms for multi-modal data
    this.registerTransformer('arrayToObject', (value: any, options?: { keyField?: string; valueField?: string }) => {
      if (!Array.isArray(value)) return value;
      const keyField = options?.keyField || 'id';
      const valueField = options?.valueField;
      const result: Record<string, any> = {};
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const key = item[keyField];
          if (key !== undefined) {
            result[key] = valueField ? item[valueField] : item;
          }
        }
      }
      return result;
    });

    this.registerTransformer('extractUrls', (value: any) => {
      if (typeof value !== 'string') return [];
      // Extract URLs from text
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = value.match(urlRegex);
      return matches || [];
    });
  }

  /**
   * Register a transform function
   */
  registerTransformer(name: string, transformer: TransformFunction): void {
    this.transformers.set(name, transformer);
  }

  /**
   * Register a custom transform function (per integration)
   */
  registerCustomTransformer(integrationId: string, name: string, transformer: TransformFunction): void {
    const key = `${integrationId}:${name}`;
    this.customTransformers.set(key, transformer);
  }

  /**
   * Load custom transforms from integration config
   * Supports both code strings (compiled) and pre-compiled functions
   */
  loadCustomTransforms(integrationId: string, customTransforms?: Array<{
    name: string;
    code?: string;
    function?: TransformFunction;
  }>): void {
    if (!customTransforms || customTransforms.length === 0) {
      return;
    }

    for (const customTransform of customTransforms) {
      try {
        let transformFn: TransformFunction;

        if (customTransform.function) {
          // Pre-compiled function provided
          transformFn = customTransform.function;
        } else if (customTransform.code) {
          // Compile JavaScript code to function
          transformFn = this.compileTransform(customTransform.code);
        } else {
          log.warn('Custom transform missing both code and function', {
            integrationId,
            transformName: customTransform.name,
            service: 'field-mapper',
          });
          continue;
        }

        // Register with prefixed name to avoid collisions
        this.registerCustomTransformer(integrationId, customTransform.name, transformFn);

        log.info('Registered custom transform', {
          integrationId,
          transformName: customTransform.name,
          service: 'field-mapper',
        });
      } catch (error: any) {
        log.error('Failed to load custom transform', error, {
          integrationId,
          transformName: customTransform.name,
          service: 'field-mapper',
        });
        // Continue loading other transforms even if one fails
      }
    }
  }

  /**
   * Compile JavaScript code string to transform function
   * SECURITY: Basic validation - in production, consider using VM2 or similar sandboxing
   */
  private compileTransform(code: string): TransformFunction {
    // Basic validation: check for dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s+/,
      /eval\s*\(/,
      /Function\s*\(/,
      /process\./,
      /global\./,
      /__dirname/,
      /__filename/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Transform code contains potentially dangerous pattern: ${pattern}`);
      }
    }

    // Compile code to function
    // Expected format: code should define a function named 'transform' or be a function expression
    try {
      // Wrap code to handle both function declarations and expressions
      // Expected formats:
      // 1. "function transform(value, options) { return value.toUpperCase(); }"
      // 2. "(value, options) => value.toUpperCase()"
      // 3. "value => value.trim()"
      const wrappedCode = `
        (function(value, options) {
          // Execute the code in this scope
          ${code}
          
          // Check if a function named 'transform' was defined
          if (typeof transform === 'function') {
            return transform(value, options);
          }
          
          // If no 'transform' function, assume the code itself is a function expression
          // Try to evaluate it as a function by wrapping in parentheses
          try {
            const codeAsFunction = (${code});
            if (typeof codeAsFunction === 'function') {
              return codeAsFunction(value, options);
            }
          } catch (e) {
            // If evaluation fails, code might be a function body without return
            // This is an error - code must be a function
          }
          
          // If we get here, the code didn't define a valid function
          throw new Error('Transform code must define a function named "transform" or be a function expression');
        })
      `;

      const compiledFn = new Function('value', 'options', wrappedCode) as TransformFunction;

      // Wrap in error handler
      return (value: any, options?: Record<string, any>) => {
        try {
          return compiledFn(value, options);
        } catch (error: any) {
          log.error('Transform execution failed', error, {
            value: String(value).substring(0, 100),
            service: 'field-mapper',
          });
          // Return original value on error (fail-safe)
          return value;
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to compile transform code: ${error.message}`);
    }
  }

  /**
   * Unload custom transforms for an integration (cleanup)
   */
  unloadCustomTransforms(integrationId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.customTransformers.keys()) {
      if (key.startsWith(`${integrationId}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.customTransformers.delete(key);
    }
    log.debug('Unloaded custom transforms', {
      integrationId,
      count: keysToDelete.length,
      service: 'field-mapper',
    });
  }

  /**
   * Map fields from external data to internal shard format
   * @param rawData - External data to map
   * @param entityMapping - Entity mapping configuration
   * @param integrationId - Optional integration ID for custom transform lookup
   */
  mapFields(
    rawData: Record<string, any>,
    entityMapping: EntityMapping,
    integrationId?: string
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const fieldMapping of entityMapping.fieldMappings) {
      try {
        // Get field names (support both naming conventions)
        const externalField = fieldMapping.externalFieldName || fieldMapping.externalField;
        const internalField = fieldMapping.internalFieldName || fieldMapping.shardField;

        if (!externalField || !internalField) {
          log.warn('Field mapping missing required field names', {
            fieldMapping,
            service: 'field-mapper',
          });
          continue;
        }

        // Extract value from external data (supports nested fields)
        let value = this.extractNestedField(rawData, externalField);

        // Apply default value if field is missing and required
        if (value === undefined || value === null) {
          if (fieldMapping.defaultValue !== undefined) {
            value = fieldMapping.defaultValue;
          } else if (fieldMapping.required) {
            // Required field is missing - log warning but continue
            log.warn('Required field missing in raw data', {
              externalField,
              internalField,
              service: 'field-mapper',
            });
            continue;
          } else {
            // Optional field missing - skip
            continue;
          }
        }

        // Apply transform if specified
        if (fieldMapping.transform) {
          value = this.applyTransform(
            value,
            fieldMapping.transform,
            fieldMapping.transformOptions,
            integrationId
          );
        }

        // Set internal field name
        result[internalField] = value;
      } catch (error: any) {
        const externalField = fieldMapping.externalFieldName || fieldMapping.externalField;
        const internalField = fieldMapping.internalFieldName || fieldMapping.shardField;
        log.error('Failed to map field', error, {
          externalField,
          internalField,
          service: 'field-mapper',
        });
        // Continue with partial mapping - don't fail entire record
      }
    }

    return result;
  }

  /**
   * Extract nested field from data (e.g., "Account.Industry" → data.Account.Industry)
   */
  extractNestedField(data: any, fieldPath: string): any {
    if (!data || !fieldPath) return undefined;

    const parts = fieldPath.split('.');
    let value = data;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }

    return value;
  }

  /**
   * Apply transform function to value
   */
  applyTransform(
    value: any,
    transformName: string,
    options?: Record<string, any>,
    integrationId?: string
  ): any {
    // Try custom transformer first (integration-specific)
    if (integrationId) {
      const customKey = `${integrationId}:${transformName}`;
      const customTransformer = this.customTransformers.get(customKey);
      if (customTransformer) {
        return customTransformer(value, options);
      }
    }

    // Try built-in transformer
    const transformer = this.transformers.get(transformName);
    if (transformer) {
      return transformer(value, options);
    }

    // Transform not found - log warning and return original value
    log.warn('Transform function not found', {
      transformName,
      integrationId,
      service: 'field-mapper',
    });
    return value;
  }

  /**
   * Validate mapped data against schema (if provided)
   */
  validateMappedData(
    data: Record<string, any>,
    _schema?: unknown
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!data || typeof data !== 'object') {
      errors.push('Mapped data must be an object');
      return { valid: false, errors, warnings };
    }

    // Schema validation would go here if schema is provided
    // For now, just return basic validation
    // TODO: Implement JSON Schema validation if schema is provided

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
