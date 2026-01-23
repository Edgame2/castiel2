/**
 * Configuration Service
 * Phase 4.2: Configuration Management Overhaul
 * 
 * Centralized configuration management with schema-based validation,
 * environment-specific configs, and secret management integration.
 */

import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ServiceConfig } from '../config/env.js';
import {
  ConfigSchemaEntry,
  ConfigCategory,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigValidationWarning,
  ConfigChangeResult,
  ConfigChange,
  Environment,
  ConfigurationServiceOptions,
} from '../types/configuration.types.js';

/**
 * Default configuration service options
 */
const DEFAULT_OPTIONS: ConfigurationServiceOptions = {
  environment: (process.env.NODE_ENV as Environment) || 'development',
  validateOnLoad: true,
  failFastOnError: true,
  enableChangeDetection: false,
  secretManagerEnabled: false,
};

/**
 * Phase 4.2: Comprehensive configuration schema
 * Defines all configuration keys with validation rules
 */
const CONFIG_SCHEMA: ConfigSchemaEntry[] = [
  // Server Configuration
  {
    key: 'port',
    envVar: 'PORT',
    rule: {
      type: 'port',
      required: true,
      default: 3001,
      min: 1,
      max: 65535,
      description: 'Server port number',
      impact: 'Server will not start if invalid',
    },
    category: ConfigCategory.SERVER,
  },
  {
    key: 'host',
    envVar: 'HOST',
    rule: {
      type: 'string',
      required: false,
      default: '0.0.0.0',
      description: 'Server host address',
    },
    category: ConfigCategory.SERVER,
  },
  {
    key: 'nodeEnv',
    envVar: 'NODE_ENV',
    rule: {
      type: 'enum',
      required: false,
      default: 'development',
      enum: ['development', 'staging', 'production', 'testing'],
      description: 'Node.js environment',
      impact: 'Affects logging, error handling, and feature flags',
    },
    category: ConfigCategory.SERVER,
  },
  {
    key: 'logLevel',
    envVar: 'LOG_LEVEL',
    rule: {
      type: 'enum',
      required: false,
      default: 'info',
      enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
      description: 'Logging level',
    },
    category: ConfigCategory.SERVER,
  },

  // Database Configuration
  {
    key: 'cosmosDb.endpoint',
    envVar: 'COSMOS_DB_ENDPOINT',
    rule: {
      type: 'url',
      required: true,
      description: 'Cosmos DB endpoint URL',
      impact: 'Database operations will fail if invalid',
    },
    category: ConfigCategory.DATABASE,
  },
  {
    key: 'cosmosDb.key',
    envVar: 'COSMOS_DB_KEY',
    rule: {
      type: 'string',
      required: true,
      description: 'Cosmos DB access key',
      impact: 'Database operations will fail if invalid',
    },
    category: ConfigCategory.DATABASE,
    secret: true,
  },
  {
    key: 'cosmosDb.databaseId',
    envVar: 'COSMOS_DB_DATABASE_ID',
    rule: {
      type: 'string',
      required: false,
      default: 'castiel',
      description: 'Cosmos DB database ID',
    },
    category: ConfigCategory.DATABASE,
  },

  // Cache Configuration
  {
    key: 'redis.host',
    envVar: 'REDIS_HOST',
    rule: {
      type: 'string',
      required: true,
      description: 'Redis host address',
      impact: 'Caching and queue operations will fail if invalid',
      environmentSpecific: {
        development: 'localhost',
      },
    },
    category: ConfigCategory.CACHE,
  },
  {
    key: 'redis.port',
    envVar: 'REDIS_PORT',
    rule: {
      type: 'port',
      required: false,
      default: 6379,
      min: 1,
      max: 65535,
      description: 'Redis port number',
    },
    category: ConfigCategory.CACHE,
  },
  {
    key: 'redis.password',
    envVar: 'REDIS_PASSWORD',
    rule: {
      type: 'string',
      required: false,
      description: 'Redis password',
    },
    category: ConfigCategory.CACHE,
    secret: true,
  },

  // Authentication Configuration
  {
    key: 'jwt.accessTokenSecret',
    envVar: 'JWT_ACCESS_SECRET',
    rule: {
      type: 'string',
      required: true,
      description: 'JWT access token secret',
      impact: 'Token validation will fail if invalid',
    },
    category: ConfigCategory.AUTHENTICATION,
    secret: true,
  },
  {
    key: 'jwt.refreshTokenSecret',
    envVar: 'JWT_REFRESH_SECRET',
    rule: {
      type: 'string',
      required: true,
      description: 'JWT refresh token secret',
      impact: 'Token refresh will fail if invalid',
    },
    category: ConfigCategory.AUTHENTICATION,
    secret: true,
  },

  // AI Configuration
  {
    key: 'ai.azureOpenAI.endpoint',
    envVar: 'AZURE_OPENAI_ENDPOINT',
    rule: {
      type: 'url',
      required: false,
      description: 'Azure OpenAI endpoint URL',
      impact: 'AI features will be unavailable if invalid',
    },
    category: ConfigCategory.AI,
  },
  {
    key: 'ai.azureOpenAI.apiKey',
    envVar: 'AZURE_OPENAI_API_KEY',
    rule: {
      type: 'string',
      required: false,
      description: 'Azure OpenAI API key',
      impact: 'AI features will be unavailable if invalid',
    },
    category: ConfigCategory.AI,
    secret: true,
  },
];

export class ConfigurationService {
  private config: ServiceConfig | null = null;
  private previousConfig: ServiceConfig | null = null;
  private options: ConfigurationServiceOptions;
  private schema: Map<string, ConfigSchemaEntry> = new Map();

  constructor(
    private monitoring: IMonitoringProvider,
    options?: Partial<ConfigurationServiceOptions>
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Build schema map for quick lookup
    for (const entry of CONFIG_SCHEMA) {
      this.schema.set(entry.key, entry);
    }
  }

  /**
   * Phase 4.2: Load and validate configuration
   */
  async loadConfig(): Promise<ServiceConfig> {
    // Import existing config loader
    const { loadConfig } = await import('../config/env.js');
    const config = loadConfig();

    // Store previous config for change detection
    if (this.options.enableChangeDetection && this.config) {
      this.previousConfig = this.config;
    }

    this.config = config;

    // Validate if enabled
    if (this.options.validateOnLoad) {
      const validation = this.validateConfig(config);
      
      if (!validation.valid) {
        // Group errors by category for better readability
        const errorsByCategory = new Map<string, ConfigValidationError[]>();
        for (const error of validation.errors) {
          const category = error.category || 'UNKNOWN';
          if (!errorsByCategory.has(category)) {
            errorsByCategory.set(category, []);
          }
          errorsByCategory.get(category)!.push(error);
        }

        // Build detailed error message
        const errorDetails: string[] = [];
        errorDetails.push('Configuration validation failed:');
        errorDetails.push('');
        
        for (const [category, errors] of errorsByCategory.entries()) {
          errorDetails.push(`${category}:`);
          for (const error of errors) {
            const impact = this.schema.get(error.key)?.rule.impact || 'Unknown impact';
            errorDetails.push(`  - ${error.envVar || error.key}: ${error.message}`);
            errorDetails.push(`    Impact: ${impact}`);
            if (error.required) {
              errorDetails.push(`    Action: Set ${error.envVar || error.key} environment variable`);
            }
          }
          errorDetails.push('');
        }

        // Add summary
        const criticalErrors = validation.errors.filter(e => e.required);
        if (criticalErrors.length > 0) {
          errorDetails.push(`Summary: ${criticalErrors.length} critical configuration error(s) found.`);
          errorDetails.push('The application may not function correctly without these settings.');
        }

        const errorMessage = errorDetails.join('\n');
        
        this.monitoring.trackEvent('configuration.validation-failed', {
          errors: validation.errors.length,
          criticalErrors: criticalErrors.length,
          warnings: validation.warnings.length,
          environment: this.options.environment,
          categories: Array.from(errorsByCategory.keys()).join(','),
        });

        if (this.options.failFastOnError) {
          throw new Error(errorMessage);
        } else {
          // Log as exception with full details
          this.monitoring.trackException(new Error(errorMessage), {
            operation: 'configuration.load',
            criticalErrors: criticalErrors.length,
            totalErrors: validation.errors.length,
          });
          
          // Also log warnings for non-critical errors
          if (validation.errors.length > criticalErrors.length) {
            this.monitoring.trackEvent('configuration.non-critical-errors', {
              count: validation.errors.length - criticalErrors.length,
            });
          }
        }
      }

      // Log warnings with suggestions
      if (validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          this.monitoring.trackEvent('configuration.validation-warning', {
            key: warning.key,
            envVar: warning.envVar,
            message: warning.message,
            suggestion: warning.suggestion,
            category: warning.category,
          });
        }
        
        // Log summary of warnings
        this.monitoring.trackEvent('configuration.warnings-summary', {
          count: validation.warnings.length,
          environment: this.options.environment,
        });
      }
    }

    this.monitoring.trackEvent('configuration.loaded', {
      environment: this.options.environment,
      validated: this.options.validateOnLoad,
    });

    return config;
  }

  /**
   * Phase 4.2: Get current configuration
   */
  getConfig(): ServiceConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Phase 4.2: Get a configuration value by key (supports nested keys like 'cosmosDb.endpoint')
   * @param key - Configuration key (supports dot notation for nested values)
   * @param defaultValue - Optional default value if key is not found
   * @returns Configuration value or default
   */
  getValue<T = any>(key: string, defaultValue?: T): T | undefined {
    if (!this.config) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    
    const value = this.getNestedValue(this.config, key);
    return value !== undefined ? (value as T) : defaultValue;
  }

  /**
   * Phase 4.2: Get a required configuration value (throws if missing)
   * @param key - Configuration key (supports dot notation for nested values)
   * @returns Configuration value
   * @throws Error if value is missing
   */
  getRequiredValue<T = any>(key: string): T {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    
    const value = this.getNestedValue(this.config, key);
    if (value === undefined || value === null) {
      const schemaEntry = this.schema.get(key);
      const envVar = schemaEntry?.envVar || key.toUpperCase().replace(/\./g, '_');
      throw new Error(`Required configuration missing: ${key} (env: ${envVar})`);
    }
    
    return value as T;
  }

  /**
   * Phase 4.2: Validate configuration against schema
   */
  validateConfig(config: ServiceConfig): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationWarning[] = [];

    for (const entry of CONFIG_SCHEMA) {
      const value = this.getNestedValue(config, entry.key);
      const envValue = process.env[entry.envVar];

      // Check required fields
      if (entry.rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          key: entry.key,
          envVar: entry.envVar,
          message: `Required configuration missing: ${entry.rule.description}`,
          category: entry.category,
          required: true,
        });
        continue;
      }

      // Skip validation if value is not set and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Type validation
      const typeError = this.validateType(value, entry.rule);
      if (typeError) {
        errors.push({
          key: entry.key,
          envVar: entry.envVar,
          message: typeError,
          category: entry.category,
          required: entry.rule.required,
        });
        continue;
      }

      // Range validation for numbers
      if (entry.rule.type === 'number' || entry.rule.type === 'port') {
        const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : NaN);
        if (!isNaN(numValue) && entry.rule.min !== undefined && numValue < entry.rule.min) {
          errors.push({
            key: entry.key,
            envVar: entry.envVar,
            message: `Value ${numValue} is below minimum ${entry.rule.min}`,
            category: entry.category,
            required: entry.rule.required,
          });
        }
        if (entry.rule.max !== undefined && numValue > entry.rule.max) {
          errors.push({
            key: entry.key,
            envVar: entry.envVar,
            message: `Value ${numValue} is above maximum ${entry.rule.max}`,
            category: entry.category,
            required: entry.rule.required,
          });
        }
      }

      // Pattern validation for strings
      if (entry.rule.pattern && typeof value === 'string' && !entry.rule.pattern.test(value)) {
        errors.push({
          key: entry.key,
          envVar: entry.envVar,
          message: `Value does not match required pattern`,
          category: entry.category,
          required: entry.rule.required,
        });
      }

      // Enum validation
      if (entry.rule.enum && !entry.rule.enum.includes(String(value))) {
        errors.push({
          key: entry.key,
          envVar: entry.envVar,
          message: `Value must be one of: ${entry.rule.enum.join(', ')}`,
          category: entry.category,
          required: entry.rule.required,
        });
      }

      // Secret management warning
      if (entry.secret && !this.options.secretManagerEnabled && envValue) {
        warnings.push({
          key: entry.key,
          envVar: entry.envVar,
          message: 'Secret value should be stored in secret manager',
          category: entry.category,
          suggestion: 'Enable secret manager integration',
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
   * Phase 4.2: Detect configuration changes
   */
  detectChanges(): ConfigChangeResult {
    if (!this.config || !this.previousConfig) {
      return { changed: false, changes: [] };
    }

    const changes: ConfigChange[] = [];

    for (const entry of CONFIG_SCHEMA) {
      const oldValue = this.getNestedValue(this.previousConfig, entry.key);
      const newValue = this.getNestedValue(this.config, entry.key);

      if (oldValue !== newValue) {
        changes.push({
          key: entry.key,
          envVar: entry.envVar,
          oldValue: entry.secret ? '[REDACTED]' : String(oldValue ?? ''),
          newValue: entry.secret ? '[REDACTED]' : String(newValue ?? ''),
          category: entry.category,
          timestamp: new Date(),
        });
      }
    }

    if (changes.length > 0) {
      this.monitoring.trackEvent('configuration.changed', {
        changes: changes.length,
        categories: [...new Set(changes.map(c => String(c.category)))].join(','),
      });
    }

    return {
      changed: changes.length > 0,
      changes,
    };
  }

  /**
   * Phase 4.2: Get configuration schema entry
   */
  getSchemaEntry(key: string): ConfigSchemaEntry | undefined {
    return this.schema.get(key);
  }

  /**
   * Phase 4.2: Get all schema entries for a category
   */
  getSchemaByCategory(category: ConfigCategory): ConfigSchemaEntry[] {
    return CONFIG_SCHEMA.filter(entry => entry.category === category);
  }

  /**
   * Phase 4.2: Validate type
   */
  private validateType(value: unknown, rule: ConfigSchemaEntry['rule']): string | null {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `Expected string, got ${typeof value}`;
        }
        break;
      case 'number':
      case 'port':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return `Expected number, got ${typeof value}`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return `Expected boolean, got ${typeof value}`;
        }
        break;
      case 'url':
        if (typeof value === 'string') {
          try {
            new URL(value);
          } catch {
            return `Invalid URL format: ${value}`;
          }
        } else {
          return `Expected URL string, got ${typeof value}`;
        }
        break;
      case 'email':
        if (typeof value === 'string') {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(value)) {
            return `Invalid email format: ${value}`;
          }
        } else {
          return `Expected email string, got ${typeof value}`;
        }
        break;
      case 'enum':
        if (rule.enum && !rule.enum.includes(String(value))) {
          return `Value must be one of: ${rule.enum.join(', ')}`;
        }
        break;
    }
    return null;
  }

  /**
   * Phase 4.2: Get nested value from object
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split('.');
    let current: any = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
}
