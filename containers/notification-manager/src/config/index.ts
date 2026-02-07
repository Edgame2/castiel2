/**
 * Configuration loader for Notification Manager module
 * Follows ModuleImplementationGuide Section 4.4
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require('js-yaml') as { load: (src: string) => unknown };
import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import { ModuleConfig } from './types';
import schema from '../../config/schema.json';

/**
 * Resolve environment variables in config values
 * Supports ${VAR:-default} syntax
 */
function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    // Match ${VAR:-default} pattern
    const envVarPattern = /\$\{([^:}]+)(?::-([^}]*))?\}/g;
    return obj.replace(envVarPattern, (match, varName, defaultValue) => {
      const value = process.env[varName];
      return value !== undefined ? value : (defaultValue || '');
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(resolveEnvVars);
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
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Load and validate configuration
 */
export function loadConfig(): ModuleConfig {
  const env = process.env.NODE_ENV || 'development';
  const configDir = join(process.cwd(), 'config');

  // Load default config
  const defaultConfigPath = join(configDir, 'default.yaml');
  let defaultConfig: any = {};
  
  try {
    const defaultConfigContent = readFileSync(defaultConfigPath, 'utf8');
    defaultConfig = yaml.load(defaultConfigContent) as ModuleConfig;
  } catch (error: any) {
    throw new Error(`Failed to load default config from ${defaultConfigPath}: ${error.message}`);
  }

  // Load environment-specific overrides if they exist
  let envConfig: any = {};
  try {
    const envConfigPath = join(configDir, `${env}.yaml`);
    const envConfigContent = readFileSync(envConfigPath, 'utf8');
    envConfig = yaml.load(envConfigContent) as Partial<ModuleConfig>;
  } catch (error: any) {
    // Environment-specific config is optional
    if (error.code !== 'ENOENT') {
      console.warn(`Warning: Failed to load ${env} config: ${error.message}`);
    }
  }

  // Merge configs (env config overrides default)
  const mergedConfig = deepMerge(defaultConfig, envConfig);

  // Resolve environment variables
  const resolved = resolveEnvVars(mergedConfig);

  // Coerce string env vars to boolean/number (YAML interpolation yields strings)
  function coerceTypes(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      if (obj === 'true') return true;
      if (obj === 'false') return false;
      const n = Number(obj);
      if (!Number.isNaN(n) && obj.trim() !== '') return n;
      return obj;
    }
    if (Array.isArray(obj)) return obj.map(coerceTypes);
    if (typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) out[k] = coerceTypes(v);
      return out;
    }
    return obj;
  }
  const coerced = coerceTypes(resolved);

  // Normalize port to number
  if (typeof coerced.server?.port === 'string') {
    coerced.server.port = parseInt(coerced.server.port, 10);
  }

  // Plan §8.5.2, §8.5.4: metrics with env METRICS_PATH, METRICS_REQUIRE_AUTH, METRICS_BEARER_TOKEN
  coerced.metrics = coerced.metrics ?? { path: '/metrics', require_auth: false, bearer_token: '' };
  if (typeof (coerced.metrics as any).require_auth === 'string') {
    (coerced.metrics as any).require_auth = (coerced.metrics as any).require_auth === 'true';
  }

  // Validate against schema
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  
  if (!validate(coerced)) {
    const errors = validate.errors?.map(err => 
      `${err.instancePath} ${err.message}`
    ).join(', ');
    throw new Error(`Invalid config: ${errors}`);
  }

  return coerced as unknown as ModuleConfig;
}

// Singleton config instance
let configInstance: ModuleConfig | null = null;

/**
 * Get the loaded configuration
 * Loads config on first call and caches it
 */
export function getConfig(): ModuleConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset config (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

