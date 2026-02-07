/**
 * Configuration Loader
 * Per ModuleImplementationGuide Section 4.4
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { LoggingConfig } from '../types/config.types';

let cachedConfig: LoggingConfig | null = null;

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (sourceValue !== undefined) {
      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }
  
  return result;
}

/**
 * Resolve environment variables in config values
 * Supports ${VAR:-default} syntax
 */
function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    // Match ${VAR:-default} or ${VAR}
    return obj.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      const [varName, defaultValue] = expression.split(':-');
      const envValue = process.env[varName];
      if (envValue !== undefined) {
        return envValue;
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      return match; // Return original if no value found
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, any> = {};
    for (const key in obj) {
      result[key] = resolveEnvVars(obj[key]);
    }
    return result;
  }
  
  return obj;
}

/**
 * Load and validate configuration
 */
export function loadConfig(): LoggingConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const env = process.env.NODE_ENV || 'development';
  
  // Resolve config directory - works in both dev (tsx) and production (compiled)
  // In dev: __dirname = src/config, config is at ../../config
  // In prod: __dirname = dist/config, config is at ../../config
  const configDir = join(__dirname, '../../config');
  
  // Load default config
  const defaultPath = join(configDir, 'default.yaml');
  if (!existsSync(defaultPath)) {
    throw new Error(`Default config not found: ${defaultPath}`);
  }
  
  const defaultConfig = parseYaml(readFileSync(defaultPath, 'utf8')) as LoggingConfig;
  
  // Load environment-specific overrides
  let envConfig: Partial<LoggingConfig> = {};
  const envPath = join(configDir, `${env}.yaml`);
  if (existsSync(envPath)) {
    envConfig = parseYaml(readFileSync(envPath, 'utf8')) as Partial<LoggingConfig>;
  }
  
  // Load schema for validation
  const schemaPath = join(configDir, 'schema.json');
  let schema: any;
  try {
    const schemaContent = readFileSync(schemaPath, 'utf8');
    schema = JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(`Failed to load schema from ${schemaPath}: ${error}`);
  }
  
  // Merge configs
  const config = deepMerge(defaultConfig, envConfig);
  
  // Resolve environment variables
  const resolved = resolveEnvVars(config) as LoggingConfig;
  
  // Convert port to number if string
  if (typeof resolved.server.port === 'string') {
    resolved.server.port = parseInt(resolved.server.port, 10);
  }
  
  // Coerce boolean env vars (YAML interpolation yields strings)
  if (resolved.application_insights && typeof resolved.application_insights.disable === 'string') {
    resolved.application_insights.disable = resolved.application_insights.disable === 'true';
  }
  if (resolved.metrics && typeof resolved.metrics.require_auth === 'string') {
    resolved.metrics.require_auth = resolved.metrics.require_auth === 'true';
  }
  
  // Validate against schema
  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  
  if (!validate(resolved)) {
    const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Invalid configuration: ${errors}`);
  }
  
  cachedConfig = resolved;
  return resolved;
}

/**
 * Get the current config (throws if not loaded)
 */
export function getConfig(): LoggingConfig {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

/**
 * Clear cached config (for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

