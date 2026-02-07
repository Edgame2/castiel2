/**
 * Configuration loader for utility_services module
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { log } from '../utils/logger';

export interface UtilityServicesConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
  containers: {
    imports: string;
    exports: string;
    migrations: string;
    notifications?: string;
    batches?: string;
    preferences?: string;
    templates?: string;
  };
  };
  jwt: { secret: string };
  services: { [key: string]: { url: string; timeout?: number } };
  rabbitmq: { url: string; exchange: string; queue: string; bindings: string[] };
  features: { [key: string]: boolean };
  notification?: {
    providers?: {
      inapp?: { exchange?: string };
      email?: { from_address?: string; from_name?: string; enabled?: boolean; provider?: string; secret_id?: string };
      [key: string]: unknown;
    };
    features?: { presence_aware?: boolean; [key: string]: unknown };
    defaults?: { rate_limit?: number; rate_limit_per_user?: number; rate_limit_per_org?: number; retry_max_attempts?: number; retry_delay_ms?: number; max_retry_delay_ms?: number; retry_attempts?: number; deduplication_ttl_seconds?: number; [key: string]: unknown };
  };
  app?: Record<string, unknown>;
  redis?: { url?: string; enabled?: boolean; [key: string]: unknown };
}

let cachedConfig: UtilityServicesConfig | null = null;

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    if (sourceValue !== undefined) {
      if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue) &&
          typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }
  return result;
}

function resolveEnvVars(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      const [varName, defaultValue] = expression.split(':-');
      return process.env[varName] || defaultValue || match;
    });
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, any> = {};
    for (const key in obj) result[key] = resolveEnvVars(obj[key]);
    return result;
  }
  return obj;
}

export function loadConfig(): UtilityServicesConfig {
  if (cachedConfig) return cachedConfig;
  
  const env = process.env.NODE_ENV || 'development';
  const configDir = join(__dirname, '../../config');
  const defaultPath = join(configDir, 'default.yaml');
  
  if (!existsSync(defaultPath)) {
    throw new Error(`Default config not found: ${defaultPath}`);
  }
  
  const defaultConfig = parseYaml(readFileSync(defaultPath, 'utf8')) as UtilityServicesConfig;
  let envConfig: Partial<UtilityServicesConfig> = {};
  const envPath = join(configDir, `${env}.yaml`);
  if (existsSync(envPath)) {
    envConfig = parseYaml(readFileSync(envPath, 'utf8')) as Partial<UtilityServicesConfig>;
  }
  
  const schemaPath = join(configDir, 'schema.json');
  let schema: any;
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to load schema: ${error}`);
  }
  
  const config = deepMerge(defaultConfig, envConfig);
  const resolved = resolveEnvVars(config) as UtilityServicesConfig;
  
  if (typeof resolved.server.port === 'string') {
    resolved.server.port = parseInt(resolved.server.port, 10);
  }
  
  const ajv = new Ajv({ allErrors: true, useDefaults: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  
  if (!validate(resolved)) {
    const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
    throw new Error(`Invalid configuration: ${errors}`);
  }
  
  if (!resolved.cosmos_db.endpoint || !resolved.cosmos_db.key) {
    throw new Error('COSMOS_DB_ENDPOINT and COSMOS_DB_KEY environment variables are required');
  }
  
  if (!resolved.jwt.secret || resolved.jwt.secret === 'change-me-in-production') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable must be set in production');
    }
    log.warn('JWT_SECRET is using default value', { service: 'utility_services' });
  }
  
  if (!resolved.rabbitmq.url) {
    log.warn('RABBITMQ_URL not configured. Event publishing will be disabled.', { service: 'utility_services' });
  }
  
  cachedConfig = resolved;
  return resolved;
}

export function getConfig(): UtilityServicesConfig {
  if (!cachedConfig) return loadConfig();
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
