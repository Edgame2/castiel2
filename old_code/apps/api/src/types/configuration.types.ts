/**
 * Configuration Management Types
 * Phase 4.2: Configuration Management Overhaul
 */

/**
 * Configuration value types
 */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'url' | 'email' | 'port' | 'duration' | 'enum';

/**
 * Configuration validation rule
 */
export interface ConfigValidationRule {
  type: ConfigValueType;
  required: boolean;
  default?: string | number | boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  description: string;
  impact?: string; // Impact of incorrect values
  environmentSpecific?: {
    development?: string | number | boolean;
    staging?: string | number | boolean;
    production?: string | number | boolean;
    testing?: string | number | boolean;
  };
}

/**
 * Configuration schema entry
 */
export interface ConfigSchemaEntry {
  key: string;
  envVar: string;
  rule: ConfigValidationRule;
  category: ConfigCategory;
  secret?: boolean; // Whether this is a secret (should use secret manager)
  secretManagerKey?: string; // Key in secret manager if applicable
}

/**
 * Configuration categories
 */
export enum ConfigCategory {
  SERVER = 'server',
  DATABASE = 'database',
  CACHE = 'cache',
  AUTHENTICATION = 'authentication',
  SECURITY = 'security',
  MONITORING = 'monitoring',
  INTEGRATION = 'integration',
  AI = 'ai',
  STORAGE = 'storage',
  EMAIL = 'email',
  FEATURE = 'feature',
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  key: string;
  envVar: string;
  message: string;
  category: ConfigCategory;
  required: boolean;
}

/**
 * Configuration validation warning
 */
export interface ConfigValidationWarning {
  key: string;
  envVar: string;
  message: string;
  category: ConfigCategory;
  suggestion?: string;
}

/**
 * Configuration change detection result
 */
export interface ConfigChangeResult {
  changed: boolean;
  changes: ConfigChange[];
}

/**
 * Configuration change
 */
export interface ConfigChange {
  key: string;
  envVar: string;
  oldValue?: string;
  newValue?: string;
  category: ConfigCategory;
  timestamp: Date;
}

/**
 * Environment-specific configuration
 */
export type Environment = 'development' | 'staging' | 'production' | 'testing';

/**
 * Configuration service options
 */
export interface ConfigurationServiceOptions {
  environment: Environment;
  validateOnLoad: boolean;
  failFastOnError: boolean;
  enableChangeDetection: boolean;
  secretManagerEnabled: boolean;
}
