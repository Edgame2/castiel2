/**
 * Configuration Management
 * 
 * Centralized configuration for the Secret Management Service.
 * Follows ModuleImplementationGuide Section 4.4 pattern:
 * - Loads YAML config files
 * - Supports environment variable interpolation
 * - Validates against JSON schema
 */

import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface Config {
  module: {
    name: string;
    version: string;
  };
  server: {
    port: number;
    host: string;
    env: string;
  };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers?: Record<string, string>;
  };
  database: {
    url: string;
  };
  encryption: {
    masterKey: string;
    algorithm: string;
    keyRotation: {
      enabled: boolean;
      intervalDays: number;
    };
  };
  service: {
    authToken: string;
  };
  rabbitmq: {
    url?: string;
    exchange: string;
  };
  logging: {
    serviceUrl?: string;
    enabled: boolean;
    level: string;
  };
  secrets: {
    defaultBackend: string;
    cache: {
      enabled: boolean;
      ttlSeconds: number;
      maxSize: number;
    };
    softDelete: {
      recoveryPeriodDays: number;
    };
    rotation: {
      defaultIntervalDays: number;
    };
    expiration: {
      notificationDays: number[];
    };
  };
  services: {
    user_management?: {
      url?: string;
    };
    logging?: {
      url?: string;
    };
    notification?: {
      url?: string;
    };
  };
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          (output as Record<string, any>)[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Resolve environment variables in config
 * Supports ${VAR} and ${VAR:-default} syntax
 */
function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    // Match ${VAR} or ${VAR:-default}
    return obj.replace(/\$\{([^}]+)\}/g, (match, expr) => {
      const [varName, defaultValue] = expr.split(':-');
      const value = process.env[varName];
      return value !== undefined ? value : (defaultValue || match);
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => resolveEnvVars(item));
  }
  
  if (obj && typeof obj === 'object') {
    const resolved: any = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveEnvVars(value);
    }
    return resolved;
  }
  
  return obj;
}

/**
 * Load configuration following ModuleImplementationGuide pattern
 * Priority: env vars > config files > defaults
 */
export function loadConfig(): Config {
  const env = process.env.NODE_ENV || 'development';
  
  // Resolve config directory - works in both dev (tsx) and production (compiled)
  // In dev: __dirname = src/config, config is at ../../config
  // In prod: __dirname = dist/config, config is at ../../config
  const configDir = join(__dirname, '../../config');
  
  // 1. Load default config
  const defaultConfigPath = join(configDir, 'default.yaml');
  let defaultConfig: any = {};
  try {
    const defaultContent = readFileSync(defaultConfigPath, 'utf8');
    defaultConfig = load(defaultContent) as any;
  } catch (error) {
    throw new Error(`Failed to load default config from ${defaultConfigPath}: ${error}`);
  }
  
  // 2. Load environment-specific overrides
  let envConfig: any = {};
  try {
    const envConfigPath = join(configDir, `${env}.yaml`);
    const envContent = readFileSync(envConfigPath, 'utf8');
    envConfig = load(envContent) as any;
  } catch (error) {
    // No env-specific config, use defaults only
    // This is expected for some environments
  }
  
  // 3. Merge configs (env overrides defaults)
  const merged = deepMerge(defaultConfig, envConfig);
  
  // 4. Resolve environment variables
  const resolved = resolveEnvVars(merged) as Record<string, any>;
  
  // Dev fallback: use 64-char masterKey when unset or wrong length (compose/local)
  const key = resolved.encryption?.masterKey;
  if (env === 'development' && (!key || typeof key !== 'string' || key.length !== 64)) {
    resolved.encryption = resolved.encryption || {};
    resolved.encryption.masterKey = '0'.repeat(64);
  }
  
  // 5. Validate against schema
  const schemaPath = join(configDir, 'schema.json');
  let schema: any;
  try {
    const schemaContent = readFileSync(schemaPath, 'utf8');
    schema = JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(`Failed to load schema from ${schemaPath}: ${error}`);
  }
  
  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  addFormats(ajv); // Add support for format validation (uri, email, date-time, etc.)
  const validate = ajv.compile(schema);
  if (!validate(resolved)) {
    const errors = validate.errors?.map(e => 
      `${e.instancePath || 'root'}: ${e.message}`
    ).join(', ') || 'Unknown validation error';
    throw new Error(`Invalid config: ${errors}`);
  }
  
  // 6. Additional runtime validations
  if (!resolved.encryption.masterKey) {
    throw new Error('SECRET_MASTER_KEY environment variable is required');
  }
  
  if (resolved.encryption.masterKey.length !== 64) {
    throw new Error('SECRET_MASTER_KEY must be 64 hex characters (32 bytes)');
  }
  
  if (!resolved.service.authToken) {
    throw new Error('SERVICE_AUTH_TOKEN environment variable is required');
  }
  
  // Ensure service URLs come from config (no hardcoded defaults)
  if (resolved.logging.serviceUrl && resolved.logging.serviceUrl.includes('localhost')) {
    // Warn but don't fail - might be intentional for local dev
    console.warn('Warning: Logging service URL contains localhost. Ensure this is intentional for local development.');
  }
  
  return resolved as Config;
}

/**
 * Get application configuration (singleton pattern)
 */
let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}
