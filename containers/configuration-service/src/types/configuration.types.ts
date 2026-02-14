/**
 * Configuration Service types
 * Core data model for centralized configuration management
 */

export enum ConfigurationScope {
  GLOBAL = 'global', // Platform-wide (Super Admin)
  ORGANIZATION = 'organization', // Tenant-level (legacy name; scope is per tenantId)
  TEAM = 'team', // Team-level
  PROJECT = 'project', // Project-level
  ENVIRONMENT = 'environment', // Environment-specific
}

export enum ConfigurationValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array',
  OBJECT = 'object',
}

/**
 * Configuration Setting
 */
export interface ConfigurationSetting {
  id: string;
  tenantId: string; // Partition key
  key: string; // Configuration key (e.g., 'cosmosDb.endpoint', 'ai.azureOpenAI.apiKey')
  value: any; // Configuration value (can be string, number, boolean, object, array)
  valueType: ConfigurationValueType;
  scope: ConfigurationScope;
  organizationId?: string; // Legacy: may exist on existing Cosmos documents
  teamId?: string;
  projectId?: string;
  environmentId?: string;
  description?: string;
  isSecret: boolean; // Whether this value should be stored in secret management
  isEncrypted: boolean; // Whether the value is encrypted
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string; // Regex pattern
    enum?: any[]; // Allowed values
  };
  defaultValue?: any; // Default value if not set
  impact?: string; // Description of what this setting affects
  category?: string; // Category for grouping (e.g., 'server', 'database', 'ai')
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Configuration Group
 * Groups related configuration settings
 */
export interface ConfigurationGroup {
  id: string;
  tenantId: string; // Partition key
  name: string; // Group name (e.g., 'cosmosDb', 'ai', 'server')
  displayName: string; // Human-readable display name
  description?: string;
  category: string; // Category for grouping
  settings: string[]; // Array of configuration setting IDs
  scope: ConfigurationScope;
  organizationId?: string; // Legacy
  teamId?: string;
  projectId?: string;
  environmentId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Cosmos DB system fields
  _rid?: string;
  _self?: string;
  _etag?: string;
  _ts?: number;
}

/**
 * Create configuration setting input
 */
export interface CreateConfigurationSettingInput {
  tenantId: string;
  userId: string;
  key: string;
  value: any;
  valueType?: ConfigurationValueType;
  scope: ConfigurationScope;
  teamId?: string;
  projectId?: string;
  environmentId?: string;
  description?: string;
  isSecret?: boolean;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  defaultValue?: any;
  impact?: string;
  category?: string;
}

/**
 * Update configuration setting input
 */
export interface UpdateConfigurationSettingInput {
  value?: any;
  valueType?: ConfigurationValueType;
  description?: string;
  isSecret?: boolean;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  defaultValue?: any;
  impact?: string;
  category?: string;
}

/**
 * Bulk update configuration settings input
 */
export interface BulkUpdateConfigurationSettingsInput {
  tenantId: string;
  userId: string;
  settings: Array<{
    key: string;
    value: any;
    scope?: ConfigurationScope;
    teamId?: string;
    projectId?: string;
    environmentId?: string;
  }>;
}

/**
 * Get configuration value input
 */
export interface GetConfigurationValueInput {
  tenantId: string;
  key: string;
  scope?: ConfigurationScope;
  teamId?: string;
  projectId?: string;
  environmentId?: string;
}

