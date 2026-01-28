/**
 * Configuration loader for integration-processors module
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { log } from '../utils/logger';

export interface IntegrationProcessorsConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers: {
      suggested_links: string;
    };
  };
  jwt: { secret: string };
  services: { [key: string]: { url: string } };
  rabbitmq: {
    url: string;
    exchange: string;
    queues: { [key: string]: string };
  };
  consumer?: {
    type?: 'light' | 'heavy' | 'all';
  };
  mapping?: {
    queue_name?: string;
    prefetch?: number;
    prefetch_auto_adjust?: boolean;
    prefetch_min?: number;
    prefetch_max?: number;
    prefetch_adjustment_interval_ms?: number;
    prefetch_target_processing_time_ms?: number;
    prefetch_min_samples?: number;
    opportunity_batch_threshold?: number;
    opportunity_batch_timeout_ms?: number;
    opportunity_debounce_use_redis?: boolean;
    batch_concurrency?: number;
    config_cache_ttl?: number;
    config_cache_use_redis?: boolean;
    validation_strictness?: 'strict' | 'lenient' | 'audit';
    retry?: {
      max_retries?: number;
      initial_backoff_ms?: number;
      max_backoff_ms?: number;
      backoff_multiplier?: number;
    };
    circuit_breaker?: {
      enabled?: boolean;
      threshold?: number;
      timeout_ms?: number;
    };
    idempotency?: {
      enabled?: boolean;
      ttl_seconds?: number;
      use_redis?: boolean;
      fallback_to_memory?: boolean;
    };
  };
  metrics?: {
    path?: string;
    require_auth?: boolean;
    bearer_token?: string;
  };
  azure?: {
    blob_storage?: {
      connection_string?: string;
      containers?: { [key: string]: string };
    };
    cognitive_services?: {
      computer_vision?: {
        endpoint?: string;
        key?: string;
      };
      speech?: {
        endpoint?: string;
        key?: string;
      };
    };
  };
  features: { [key: string]: boolean };
}

let cachedConfig: IntegrationProcessorsConfig | null = null;

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

export function loadConfig(): IntegrationProcessorsConfig {
  if (cachedConfig) return cachedConfig;
  
  const env = process.env.NODE_ENV || 'development';
  const configDir = join(__dirname, '../../config');
  const defaultPath = join(configDir, 'default.yaml');
  
  if (!existsSync(defaultPath)) {
    throw new Error(`Default config not found: ${defaultPath}`);
  }
  
  const defaultConfig = parseYaml(readFileSync(defaultPath, 'utf8')) as IntegrationProcessorsConfig;
  let envConfig: Partial<IntegrationProcessorsConfig> = {};
  const envPath = join(configDir, `${env}.yaml`);
  if (existsSync(envPath)) {
    envConfig = parseYaml(readFileSync(envPath, 'utf8')) as Partial<IntegrationProcessorsConfig>;
  }
  
  const schemaPath = join(configDir, 'schema.json');
  let schema: any;
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to load schema: ${error}`);
  }
  
  const config = deepMerge(defaultConfig, envConfig);
  const resolved = resolveEnvVars(config) as IntegrationProcessorsConfig;
  
  // Override consumer type from environment variable
  if (process.env.CONSUMER_TYPE) {
    resolved.consumer = resolved.consumer || {};
    resolved.consumer.type = process.env.CONSUMER_TYPE as 'light' | 'heavy' | 'all';
  }
  
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
    log.warn('JWT_SECRET is using default value', { service: 'integration-processors' });
  }
  
  if (!resolved.rabbitmq.url) {
    log.warn('RABBITMQ_URL not configured. Event consumption will be disabled.', { service: 'integration-processors' });
  }
  
  cachedConfig = resolved;
  return resolved;
}

export function getConfig(): IntegrationProcessorsConfig {
  if (!cachedConfig) return loadConfig();
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
