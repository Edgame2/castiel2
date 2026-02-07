/**
 * Configuration loader for integration-processors module
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { log } from '../utils/logger.js';

export interface IntegrationProcessorsConfig {
  module: { name: string; version: string };
  server: { port: number; host: string };
  cosmos_db: {
    endpoint: string;
    key: string;
    database_id: string;
    containers: {
      suggested_links: string;
      entity_linking_settings?: string;
      linking_rules?: string;
      processing_settings?: string;
    };
  };
  jwt: { secret: string };
  services: { [key: string]: { url: string } };
  rabbitmq: {
    url: string;
    exchange: string;
    queues: { [key: string]: string };
    dlq?: { alert_threshold?: number };
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
  const configDir = join(__dirname, '..', '..', 'config');
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

  // Coerce env-derived strings to schema types before validation
  const toNum = (v: unknown) => (typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : undefined);
  const toBool = (v: unknown): boolean | undefined => { if (v === true || v === 'true' || v === '1') return true; if (v === false || v === 'false' || v === '0') return false; return undefined; };
  if (resolved.mapping) {
    const m = resolved.mapping as Record<string, unknown>;
    if (m.prefetch !== undefined) m.prefetch = toNum(m.prefetch) ?? 20;
    if (m.prefetch_auto_adjust !== undefined) m.prefetch_auto_adjust = toBool(m.prefetch_auto_adjust) ?? true;
    if (m.prefetch_min !== undefined) m.prefetch_min = toNum(m.prefetch_min) ?? 1;
    if (m.prefetch_max !== undefined) m.prefetch_max = toNum(m.prefetch_max) ?? 100;
    if (m.prefetch_adjustment_interval_ms !== undefined) m.prefetch_adjustment_interval_ms = toNum(m.prefetch_adjustment_interval_ms) ?? 60000;
    if (m.prefetch_target_processing_time_ms !== undefined) m.prefetch_target_processing_time_ms = toNum(m.prefetch_target_processing_time_ms) ?? 1000;
    if (m.prefetch_min_samples !== undefined) m.prefetch_min_samples = toNum(m.prefetch_min_samples) ?? 10;
    if (m.opportunity_batch_threshold !== undefined) m.opportunity_batch_threshold = toNum(m.opportunity_batch_threshold) ?? 100;
    if (m.opportunity_batch_timeout_ms !== undefined) m.opportunity_batch_timeout_ms = toNum(m.opportunity_batch_timeout_ms) ?? 5000;
    if (m.batch_concurrency !== undefined) m.batch_concurrency = toNum(m.batch_concurrency) ?? 10;
    if (m.config_cache_ttl !== undefined) m.config_cache_ttl = toNum(m.config_cache_ttl) ?? 600;
    if (m.config_cache_use_redis !== undefined) m.config_cache_use_redis = toBool(m.config_cache_use_redis) ?? true;
    const retry = m.retry as Record<string, unknown> | undefined;
    if (retry) {
      if (retry.max_retries !== undefined) retry.max_retries = toNum(retry.max_retries) ?? 3;
      if (retry.initial_backoff_ms !== undefined) retry.initial_backoff_ms = toNum(retry.initial_backoff_ms) ?? 1000;
      if (retry.max_backoff_ms !== undefined) retry.max_backoff_ms = toNum(retry.max_backoff_ms) ?? 10000;
      if (retry.backoff_multiplier !== undefined) retry.backoff_multiplier = toNum(retry.backoff_multiplier) ?? 2;
    }
    const cb = m.circuit_breaker as Record<string, unknown> | undefined;
    if (cb) {
      if (cb.enabled !== undefined) cb.enabled = toBool(cb.enabled) ?? true;
      if (cb.threshold !== undefined) cb.threshold = toNum(cb.threshold) ?? 5;
      if (cb.timeout_ms !== undefined) cb.timeout_ms = toNum(cb.timeout_ms) ?? 60000;
    }
    const idem = m.idempotency as Record<string, unknown> | undefined;
    if (idem) {
      if (idem.enabled !== undefined) idem.enabled = toBool(idem.enabled) ?? true;
      if (idem.ttl_seconds !== undefined) idem.ttl_seconds = toNum(idem.ttl_seconds) ?? 86400;
      if (idem.use_redis !== undefined) idem.use_redis = toBool(idem.use_redis) ?? true;
      if (idem.fallback_to_memory !== undefined) idem.fallback_to_memory = toBool(idem.fallback_to_memory) ?? true;
    }
  }
  if (resolved.metrics && (resolved.metrics as Record<string, unknown>).require_auth !== undefined) {
    (resolved.metrics as Record<string, unknown>).require_auth = toBool((resolved.metrics as Record<string, unknown>).require_auth) ?? false;
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
